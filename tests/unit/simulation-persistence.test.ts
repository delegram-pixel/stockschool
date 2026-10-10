import { describe, expect, it } from "vitest";
import { createPortfolio, executeBuy, executeSell } from "@/lib/simulation/engine";
import type { OrderRequest, Portfolio } from "@/lib/simulation/engine";
import { parsePortfolio } from "@/lib/simulation/persistence";

/**
 * Reading a portfolio back out of storage.
 *
 * The decision under test is that validation is **all-or-nothing**. Dropping one
 * malformed row would look forgiving and be dangerous: `computeRealisedGain`
 * replays the whole transaction history to rebuild the cost basis that applied at
 * each sale, so a missing row does not lose a line of a table — it silently
 * changes the arithmetic on every later row and produces a fabricated profit
 * figure that is internally consistent and completely wrong.
 *
 * Refusing the whole portfolio costs the learner their simulated positions.
 * Accepting a damaged one costs them the truth.
 */

const BUY_TIME = new Date("2026-10-09T10:00:00.000Z");
const SELL_TIME = new Date("2026-10-09T11:00:00.000Z");

function order(overrides: Partial<OrderRequest> = {}): OrderRequest {
  return {
    assetId: "nvda-bstock",
    symbol: "NVDA",
    name: "NVIDIA bStock",
    provider: "bstocks",
    quantity: "1",
    price: "100",
    priceSource: "onchain",
    ...overrides,
  };
}

/** A valid portfolio as JSON, which is the only form storage ever sees. */
function stored(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...JSON.parse(JSON.stringify(createPortfolio("local", BUY_TIME))), ...overrides };
}

/** A valid transaction object, taken from the engine rather than hand-written. */
function storedTransaction(): Record<string, unknown> {
  const result = executeBuy(createPortfolio("local", BUY_TIME), order(), BUY_TIME);
  if (!result.ok) throw new Error("fixture failed to produce a transaction");
  return JSON.parse(JSON.stringify(result.transaction));
}

function storedPosition(): Record<string, unknown> {
  const result = executeBuy(createPortfolio("local", BUY_TIME), order(), BUY_TIME);
  if (!result.ok) throw new Error("fixture failed to produce a position");
  return JSON.parse(JSON.stringify(result.portfolio.positions[0]));
}

// -----------------------------------------------------------------------------

describe("parsePortfolio", () => {
  it("returns null for values that are not an object", () => {
    for (const value of [null, undefined, 42, "portfolio", true, []]) {
      expect(parsePortfolio(value)).toBeNull();
    }
  });

  it("accepts an empty portfolio", () => {
    const parsed = parsePortfolio(stored());
    expect(parsed).not.toBeNull();
    expect(parsed?.positions).toEqual([]);
    expect(parsed?.transactions).toEqual([]);
  });

  it("round-trips everything the engine produces", () => {
    // The strongest statement available: whatever `executeBuy` writes is exactly
    // what comes back, field for field, after a JSON round trip.
    const result = executeBuy(createPortfolio("local", BUY_TIME), order({ quantity: "10" }), BUY_TIME);
    if (!result.ok) throw new Error("fixture failed");
    const original: Portfolio = result.portfolio;

    expect(parsePortfolio(JSON.parse(JSON.stringify(original)))).toEqual(original);
  });

  it("round-trips a portfolio with history, including a realised sale", () => {
    const bought = executeBuy(createPortfolio("local", BUY_TIME), order({ quantity: "10" }), BUY_TIME);
    if (!bought.ok) throw new Error("fixture failed");
    const sold = executeSell(bought.portfolio, order({ quantity: "4", price: "150" }), SELL_TIME);
    if (!sold.ok) throw new Error("fixture failed");

    const original: Portfolio = sold.portfolio;
    expect(original.transactions).toHaveLength(2);
    expect(parsePortfolio(JSON.parse(JSON.stringify(original)))).toEqual(original);
  });
});

// -----------------------------------------------------------------------------

describe("parsePortfolio required fields", () => {
  it.each(["id", "name", "baseCurrency", "initialCashBalance", "cashBalance", "updatedAt"])(
    "rejects a portfolio with no %s",
    (field) => {
      expect(parsePortfolio(stored({ [field]: undefined }))).toBeNull();
      expect(parsePortfolio(stored({ [field]: "" }))).toBeNull();
      expect(parsePortfolio(stored({ [field]: 42 }))).toBeNull();
    },
  );

  it("rejects a balance that is not a decimal string", () => {
    // Formatting is not value. "$10,000.00" is what the UI renders, and it must
    // never be mistaken for something the engine can do arithmetic on.
    for (const cashBalance of ["$10000", "10,000", "10k", "1e4", " ", "null"]) {
      expect(parsePortfolio(stored({ cashBalance })), cashBalance).toBeNull();
    }
  });

  it("accepts the decimal notation the codebase actually writes", () => {
    for (const cashBalance of ["0", "10000", "10000.50", "-5"]) {
      expect(parsePortfolio(stored({ cashBalance })), cashBalance).not.toBeNull();
    }
  });

  it("requires both collections to be arrays", () => {
    expect(parsePortfolio(stored({ positions: undefined }))).toBeNull();
    expect(parsePortfolio(stored({ positions: {} }))).toBeNull();
    expect(parsePortfolio(stored({ transactions: undefined }))).toBeNull();
    expect(parsePortfolio(stored({ transactions: "none" }))).toBeNull();
  });
});

// -----------------------------------------------------------------------------

describe("parsePortfolio is all-or-nothing", () => {
  it("refuses the whole portfolio when one position is malformed", () => {
    // The point of the file. One bad row does not cost one row.
    const positions = [storedPosition(), { ...storedPosition(), quantity: "three" }];
    expect(parsePortfolio(stored({ positions }))).toBeNull();
  });

  it("refuses the whole portfolio when one transaction is malformed", () => {
    const transactions = [storedTransaction(), { ...storedTransaction(), price: "" }];
    expect(parsePortfolio(stored({ transactions }))).toBeNull();
  });

  it("validates shape, not coherence — and that is the honest limit", () => {
    // A portfolio whose positions and transactions disagree is structurally
    // valid and parses. The parser cannot know whether a position's history was
    // truncated or simply never written, and it does not pretend to. What it can
    // do — and the reason it is strict — is refuse a *malformed* row, which is
    // what tampering and a half-finished write actually produce.
    const incoherent = stored({
      cashBalance: "0",
      positions: [storedPosition()],
      transactions: [],
    });
    expect(parsePortfolio(incoherent)?.transactions).toEqual([]);
  });

  it("rejects a position entry that is not an object", () => {
    expect(parsePortfolio(stored({ positions: [null] }))).toBeNull();
    expect(parsePortfolio(stored({ positions: ["NVDA"] }))).toBeNull();
    expect(parsePortfolio(stored({ positions: [[]] }))).toBeNull();
  });

  it("rejects a transaction entry that is not an object", () => {
    expect(parsePortfolio(stored({ transactions: [null] }))).toBeNull();
    expect(parsePortfolio(stored({ transactions: [7] }))).toBeNull();
  });
});

// -----------------------------------------------------------------------------

describe("parsePosition", () => {
  it.each(["assetId", "symbol", "name", "provider", "quantity", "averageCost"])(
    "rejects a position with no %s",
    (field) => {
      expect(parsePortfolio(stored({ positions: [{ ...storedPosition(), [field]: "" }] }))).toBeNull();
      expect(
        parsePortfolio(stored({ positions: [{ ...storedPosition(), [field]: undefined }] })),
      ).toBeNull();
    },
  );

  it("rejects a quantity that is not a decimal string", () => {
    expect(
      parsePortfolio(stored({ positions: [{ ...storedPosition(), quantity: "10 shares" }] })),
    ).toBeNull();
  });

  it("accepts every provider in the vocabulary, and the unknown fallback", () => {
    for (const provider of ["bstocks", "ondo", "xstocks", "unknown"]) {
      expect(
        parsePortfolio(stored({ positions: [{ ...storedPosition(), provider }] })),
        provider,
      ).not.toBeNull();
    }
  });

  it("rejects a provider outside the vocabulary rather than trusting the string", () => {
    // A provider id reaches UI copy and tone selection. An unrecognised one is
    // worth refusing rather than coercing to "unknown", which would hide it.
    expect(
      parsePortfolio(stored({ positions: [{ ...storedPosition(), provider: "backed" }] })),
    ).toBeNull();
  });
});

// -----------------------------------------------------------------------------

describe("parseTransaction", () => {
  it("accepts a transaction with a null price timestamp", () => {
    const transaction = { ...storedTransaction(), priceTimestamp: null };
    expect(parsePortfolio(stored({ transactions: [transaction] }))?.transactions[0]?.priceTimestamp).toBeNull();
  });

  it("accepts a transaction with the field absent entirely", () => {
    const transaction = storedTransaction();
    delete transaction.priceTimestamp;
    expect(parsePortfolio(stored({ transactions: [transaction] }))).not.toBeNull();
  });

  it("keeps a price timestamp that is present, because it explains the trade", () => {
    const transaction = { ...storedTransaction(), priceTimestamp: "2026-10-09T09:59:00.000Z" };
    expect(
      parsePortfolio(stored({ transactions: [transaction] }))?.transactions[0]?.priceTimestamp,
    ).toBe("2026-10-09T09:59:00.000Z");
  });

  it("rejects a price timestamp that is present but unreadable", () => {
    // Not a silent null: the field exists precisely to keep the trade
    // explainable afterwards, so quietly discarding it defeats its purpose.
    for (const priceTimestamp of ["", 0, {}, new Date("2026-10-09T09:59:00.000Z")]) {
      expect(
        parsePortfolio(stored({ transactions: [{ ...storedTransaction(), priceTimestamp }] })),
      ).toBeNull();
    }
  });

  it("rejects an action that is neither a buy nor a sell", () => {
    for (const action of ["transfer", "BUY", "", null]) {
      expect(
        parsePortfolio(stored({ transactions: [{ ...storedTransaction(), action }] })),
      ).toBeNull();
    }
  });

  it("rejects an unknown price source", () => {
    // `priceSource` is what keeps a simulated fill explainable. Guessing at it
    // would let a stale reference price masquerade as an on-chain one.
    for (const priceSource of ["oracle", "", null, 1]) {
      expect(
        parsePortfolio(stored({ transactions: [{ ...storedTransaction(), priceSource }] })),
      ).toBeNull();
    }
  });

  it.each([
    "id",
    "assetId",
    "symbol",
    "quantity",
    "price",
    "grossAmount",
    "feeAmount",
    "currency",
    "createdAt",
  ])("rejects a transaction with no %s", (field) => {
    expect(
      parsePortfolio(stored({ transactions: [{ ...storedTransaction(), [field]: "" }] })),
    ).toBeNull();
  });

  it("cannot round-trip a transaction hash back into storage", () => {
    // The engine never writes one, and this parser never reads one, so a hash
    // injected into localStorage is dropped rather than displayed. A hash on a
    // simulated fill would assert a chain transaction that did not happen.
    const withHash = { ...storedTransaction(), transactionHash: "0xdeadbeef" };
    const parsed = parsePortfolio(stored({ transactions: [withHash] }));

    expect(parsed).not.toBeNull();
    expect(Object.keys(parsed!.transactions[0]!)).not.toContain("transactionHash");
    expect(JSON.stringify(parsed)).not.toContain("0xdeadbeef");
  });
});
