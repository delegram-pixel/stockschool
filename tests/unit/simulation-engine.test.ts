import { describe, expect, it } from "vitest";
import { Decimal } from "@/lib/calculations/money";
import {
  STARTING_CASH,
  computeRealisedGain,
  createPortfolio,
  describeConcentration,
  executeBuy,
  executeSell,
  validateBuy,
  validateSell,
  valuePortfolio,
} from "@/lib/simulation/engine";
import type { OrderError, OrderRequest, OrderResult, Portfolio } from "@/lib/simulation/engine";

/**
 * The simulation engine.
 *
 * These are the assertions that decide whether a learner's arithmetic adds up.
 * If `executeBuy` gets the weighted average wrong, or `valuePortfolio` counts a
 * position twice, nothing crashes — the product simply shows a wrong number
 * about the learner's own money with total confidence, which is the worst
 * failure mode available to this app.
 *
 * Everything here runs without a DOM, a clock or a network, because the engine
 * takes all three as arguments.
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

function expectOk(result: OrderResult): Extract<OrderResult, { ok: true }> {
  if (!result.ok) {
    throw new Error(`expected success, got ${result.error.code}: ${result.error.message}`);
  }
  return result;
}

function expectErr(result: OrderResult): OrderError {
  if (result.ok) throw new Error("expected a failure, got a successful order");
  return result.error;
}

/** A portfolio holding `quantity` of one asset at `averageCost`, no history. */
function holding(quantity: string, averageCost: string, cash = "1000"): Portfolio {
  return {
    ...createPortfolio("test", BUY_TIME),
    cashBalance: cash,
    positions: [
      {
        assetId: "nvda-bstock",
        symbol: "NVDA",
        name: "NVIDIA bStock",
        provider: "bstocks",
        quantity,
        averageCost,
      },
    ],
  };
}

// -----------------------------------------------------------------------------

describe("createPortfolio", () => {
  it("starts at the fixed simulated balance with nothing held", () => {
    const portfolio = createPortfolio();
    expect(portfolio.cashBalance).toBe(STARTING_CASH);
    expect(portfolio.initialCashBalance).toBe(STARTING_CASH);
    expect(portfolio.positions).toEqual([]);
    expect(portfolio.transactions).toEqual([]);
  });

  it("starts in dollars", () => {
    expect(createPortfolio().baseCurrency).toBe("USD");
  });
});

// -----------------------------------------------------------------------------

describe("validateBuy", () => {
  it("rejects a non-positive quantity", () => {
    expect(validateBuy(createPortfolio(), order({ quantity: "0" }))?.code).toBe("INVALID_QUANTITY");
    expect(validateBuy(createPortfolio(), order({ quantity: "-5" }))?.code).toBe("INVALID_QUANTITY");
    expect(validateBuy(createPortfolio(), order({ quantity: "abc" }))?.code).toBe("INVALID_QUANTITY");
  });

  it("reports a missing price as unavailable rather than as a bad quantity", () => {
    expect(validateBuy(createPortfolio(), order({ price: "" }))?.code).toBe("PRICE_UNAVAILABLE");
    expect(validateBuy(createPortfolio(), order({ price: "0" }))?.code).toBe("PRICE_UNAVAILABLE");
  });

  it("checks the inputs before the balance", () => {
    // Someone who typed "-5" with no cash at all should be told about the
    // negative number. Telling them they cannot afford a negative purchase is
    // technically true and completely useless.
    const broke: Portfolio = { ...createPortfolio(), cashBalance: "0" };
    expect(validateBuy(broke, order({ quantity: "-5", price: "100" }))?.code).toBe(
      "INVALID_QUANTITY",
    );
  });

  it("rejects a purchase costing more than the cash balance", () => {
    const small: Portfolio = { ...createPortfolio(), cashBalance: "50" };
    expect(validateBuy(small, order({ quantity: "1", price: "100" }))?.code).toBe(
      "INSUFFICIENT_CASH",
    );
  });

  it("counts the fee towards the cost", () => {
    const exact: Portfolio = { ...createPortfolio(), cashBalance: "100" };
    expect(validateBuy(exact, order({ quantity: "1", price: "100", fee: "0.01" }))?.code).toBe(
      "INSUFFICIENT_CASH",
    );
    expect(validateBuy(exact, order({ quantity: "1", price: "100" }))).toBeNull();
  });

  it("rejects a negative fee", () => {
    expect(validateBuy(createPortfolio(), order({ fee: "-1" }))?.code).toBe("INVALID_PRICE");
  });

  it("phrases the insufficient-cash message with the actual numbers", () => {
    const small: Portfolio = { ...createPortfolio(), cashBalance: "50" };
    const error = validateBuy(small, order({ quantity: "1", price: "100" }));
    expect(error?.message).toContain("$100.00");
    expect(error?.message).toContain("$50.00");
  });
});

describe("validateSell", () => {
  it("refuses to sell an asset that is not held", () => {
    expect(validateSell(createPortfolio(), order())?.code).toBe("NO_POSITION");
  });

  it("refuses to sell more than is held", () => {
    expect(validateSell(holding("3", "100"), order({ quantity: "4" }))?.code).toBe(
      "INSUFFICIENT_HOLDINGS",
    );
  });

  it("allows selling the entire position", () => {
    expect(validateSell(holding("3", "100"), order({ quantity: "3" }))).toBeNull();
  });
});

// -----------------------------------------------------------------------------

describe("executeBuy", () => {
  it("debits cash by quantity times price", () => {
    const result = expectOk(executeBuy(createPortfolio(), order({ quantity: "3", price: "100" }), BUY_TIME));
    expect(new Decimal(result.portfolio.cashBalance).toString()).toBe("9700");
  });

  it("opens a position at the purchase price", () => {
    const result = expectOk(executeBuy(createPortfolio(), order({ quantity: "3", price: "100" }), BUY_TIME));
    expect(result.portfolio.positions).toHaveLength(1);
    expect(result.portfolio.positions[0]?.quantity).toBe("3.00000000");
    expect(new Decimal(result.portfolio.positions[0]!.averageCost).toString()).toBe("100");
  });

  it("computes a weighted average across two purchases", () => {
    const first = expectOk(executeBuy(createPortfolio(), order({ quantity: "3", price: "100" }), BUY_TIME));
    const second = expectOk(executeBuy(first.portfolio, order({ quantity: "1", price: "200" }), BUY_TIME));

    expect(second.portfolio.positions).toHaveLength(1);
    expect(new Decimal(second.portfolio.positions[0]!.quantity).toString()).toBe("4");
    // (3 × 100 + 1 × 200) / 4
    expect(new Decimal(second.portfolio.positions[0]!.averageCost).toString()).toBe("125");
  });

  it("capitalises the fee into the cost basis", () => {
    // A fee is part of what you paid, so it belongs in the basis and therefore
    // in the gain calculation later. Burying it would make every future
    // unrealised gain slightly too good.
    const result = expectOk(
      executeBuy(createPortfolio(), order({ quantity: "1", price: "100", fee: "5" }), BUY_TIME),
    );
    expect(new Decimal(result.portfolio.positions[0]!.averageCost).toString()).toBe("105");
    expect(new Decimal(result.portfolio.cashBalance).toString()).toBe("9895");
  });

  it("records the transaction with the price source that fed it", () => {
    const result = expectOk(
      executeBuy(createPortfolio(), order({ quantity: "1", price: "100", priceSource: "reference" }), BUY_TIME),
    );
    expect(result.transaction.priceSource).toBe("reference");
    expect(result.transaction.action).toBe("buy");
  });

  it("never invents a transaction hash", () => {
    // A hash on a simulated fill would assert a chain transaction that did not
    // happen. The PRD forbids it, and this is where that promise is kept.
    const result = expectOk(executeBuy(createPortfolio(), order(), BUY_TIME));
    expect(Object.keys(result.transaction)).not.toContain("transactionHash");
    expect(Object.keys(result.transaction)).not.toContain("hash");
  });

  it("leaves the input portfolio untouched", () => {
    const before = createPortfolio();
    const snapshot = JSON.stringify(before);
    executeBuy(before, order(), BUY_TIME);
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it("returns the error rather than throwing when validation fails", () => {
    const broke: Portfolio = { ...createPortfolio(), cashBalance: "1" };
    expect(expectErr(executeBuy(broke, order({ quantity: "1", price: "100" }), BUY_TIME)).code).toBe(
      "INSUFFICIENT_CASH",
    );
  });

  it("appends to the transaction history", () => {
    const first = expectOk(executeBuy(createPortfolio(), order({ quantity: "1" }), BUY_TIME));
    const second = expectOk(executeBuy(first.portfolio, order({ quantity: "1" }), BUY_TIME));
    expect(second.portfolio.transactions).toHaveLength(2);
  });
});

describe("executeSell", () => {
  it("credits cash by quantity times price", () => {
    const result = expectOk(executeSell(holding("10", "100", "0"), order({ quantity: "10", price: "120" }), SELL_TIME));
    expect(new Decimal(result.portfolio.cashBalance).toString()).toBe("1200");
  });

  it("subtracts the fee from the proceeds", () => {
    const result = expectOk(
      executeSell(holding("10", "100", "0"), order({ quantity: "10", price: "120", fee: "5" }), SELL_TIME),
    );
    expect(new Decimal(result.portfolio.cashBalance).toString()).toBe("1195");
  });

  it("does not change the cost basis of what remains", () => {
    // Cost basis is a property of the units still held. A sale realises a gain
    // against the basis; it does not rewrite it.
    const result = expectOk(executeSell(holding("10", "125"), order({ quantity: "4", price: "200" }), SELL_TIME));
    expect(new Decimal(result.portfolio.positions[0]!.quantity).toString()).toBe("6");
    expect(new Decimal(result.portfolio.positions[0]!.averageCost).toString()).toBe("125");
  });

  it("drops the position row when it is fully closed", () => {
    const result = expectOk(executeSell(holding("10", "100"), order({ quantity: "10", price: "120" }), SELL_TIME));
    expect(result.portfolio.positions).toEqual([]);
  });

  it("keeps the closed position's story in the history", () => {
    const result = expectOk(executeSell(holding("10", "100"), order({ quantity: "10", price: "120" }), SELL_TIME));
    expect(result.portfolio.transactions).toHaveLength(1);
    expect(result.transaction.action).toBe("sell");
  });

  it("does not change cash when validation fails", () => {
    const portfolio = holding("1", "100", "500");
    const result = executeSell(portfolio, order({ quantity: "5" }), SELL_TIME);
    expect(expectErr(result).code).toBe("INSUFFICIENT_HOLDINGS");
    expect(portfolio.cashBalance).toBe("500");
  });
});

// -----------------------------------------------------------------------------

describe("valuePortfolio", () => {
  it("adds market value to cash for the total", () => {
    const portfolio = expectOk(executeBuy(createPortfolio(), order({ quantity: "10", price: "100" }), BUY_TIME)).portfolio;
    const valuation = valuePortfolio(portfolio, { "nvda-bstock": "120" });

    expect(valuation.cash.toString()).toBe("9000");
    expect(valuation.holdingsValue.toString()).toBe("1200");
    expect(valuation.totalValue.toString()).toBe("10200");
  });

  it("reports an unrealised gain against cost basis", () => {
    const portfolio = expectOk(executeBuy(createPortfolio(), order({ quantity: "10", price: "100" }), BUY_TIME)).portfolio;
    const valuation = valuePortfolio(portfolio, { "nvda-bstock": "120" });

    expect(valuation.unrealisedGain.toString()).toBe("200");
    expect(valuation.unrealisedGainPercent?.toString()).toBe("20");
    expect(valuation.totalReturn.toString()).toBe("200");
    expect(valuation.totalReturnPercent.toString()).toBe("2");
  });

  it("lists an unpriced position rather than hiding it", () => {
    // Dropping it would make the totals look complete when they are not.
    const portfolio = expectOk(executeBuy(createPortfolio(), order({ quantity: "10", price: "100" }), BUY_TIME)).portfolio;
    const valuation = valuePortfolio(portfolio, {});

    expect(valuation.holdings).toHaveLength(1);
    expect(valuation.holdings[0]?.marketValue).toBeNull();
    expect(valuation.hasUnpricedHoldings).toBe(true);
    expect(valuation.holdingsValue.toString()).toBe("0");
  });

  it("sums allocation percentages to 100 across priced and unpriced holdings", () => {
    const first = expectOk(executeBuy(createPortfolio(), order({ quantity: "10", price: "100" }), BUY_TIME)).portfolio;
    const second = expectOk(
      executeBuy(first, order({ assetId: "tsla-bstock", symbol: "TSLA", quantity: "10", price: "100" }), BUY_TIME),
    ).portfolio;

    // One priced, one not: the denominator still has to include both, or the
    // allocation panel's segments would sum past 100% and rely on flex shrink.
    const valuation = valuePortfolio(second, { "nvda-bstock": "200" });
    expect(valuation.hasUnpricedHoldings).toBe(true);

    const total = valuation.holdings.reduce(
      (sum, holding) => sum.plus(holding.allocationPercent ?? 0),
      new Decimal(0),
    );
    expect(total.toNumber()).toBeCloseTo(100, 6);
  });

  it("orders holdings by size, largest first", () => {
    const first = expectOk(executeBuy(createPortfolio(), order({ quantity: "1", price: "100" }), BUY_TIME)).portfolio;
    const second = expectOk(
      executeBuy(first, order({ assetId: "tsla-bstock", symbol: "TSLA", quantity: "10", price: "100" }), BUY_TIME),
    ).portfolio;

    const valuation = valuePortfolio(second, { "nvda-bstock": "100", "tsla-bstock": "100" });
    expect(valuation.holdings[0]?.position.symbol).toBe("TSLA");
  });

  it("reports a loss as a negative number rather than as an absolute one", () => {
    const portfolio = expectOk(executeBuy(createPortfolio(), order({ quantity: "10", price: "100" }), BUY_TIME)).portfolio;
    const valuation = valuePortfolio(portfolio, { "nvda-bstock": "80" });

    expect(valuation.unrealisedGain.toString()).toBe("-200");
    expect(valuation.unrealisedGainPercent?.toString()).toBe("-20");
  });

  it("handles an empty portfolio without dividing by zero", () => {
    const valuation = valuePortfolio(createPortfolio(), {});
    expect(valuation.totalValue.toString()).toBe(STARTING_CASH);
    expect(valuation.totalReturnPercent.toString()).toBe("0");
    expect(valuation.unrealisedGainPercent).toBeNull();
    expect(valuation.holdings).toEqual([]);
  });
});

// -----------------------------------------------------------------------------

describe("computeRealisedGain", () => {
  it("is zero before anything is sold", () => {
    const portfolio = expectOk(executeBuy(createPortfolio(), order({ quantity: "10", price: "100" }), BUY_TIME)).portfolio;
    expect(computeRealisedGain(portfolio).toString()).toBe("0");
  });

  it("measures the sale against the basis that applied at the time", () => {
    const bought = expectOk(executeBuy(createPortfolio(), order({ quantity: "10", price: "100" }), BUY_TIME)).portfolio;
    const sold = expectOk(executeSell(bought, order({ quantity: "10", price: "120" }), SELL_TIME)).portfolio;
    expect(computeRealisedGain(sold).toString()).toBe("200");
  });

  it("uses the weighted average across earlier purchases", () => {
    // Buy 10 @ 100, buy 10 @ 200 (basis 150), sell 5 @ 200 → 5 × 50.
    const one = expectOk(executeBuy(createPortfolio(), order({ quantity: "10", price: "100" }), BUY_TIME)).portfolio;
    const two = expectOk(executeBuy(one, order({ quantity: "10", price: "200" }), BUY_TIME)).portfolio;
    const three = expectOk(executeSell(two, order({ quantity: "5", price: "200" }), SELL_TIME)).portfolio;

    expect(computeRealisedGain(three).toString()).toBe("250");
  });

  it("accumulates across several sales", () => {
    const one = expectOk(executeBuy(createPortfolio(), order({ quantity: "10", price: "100" }), BUY_TIME)).portfolio;
    const two = expectOk(executeSell(one, order({ quantity: "4", price: "150" }), SELL_TIME)).portfolio;
    const three = expectOk(executeSell(two, order({ quantity: "3", price: "50" }), SELL_TIME)).portfolio;

    // 4 × 50 = 200, then 3 × (50 − 100) = −150.
    expect(computeRealisedGain(three).toString()).toBe("50");
  });

  it("keeps separate assets' bases apart", () => {
    const one = expectOk(executeBuy(createPortfolio(), order({ quantity: "10", price: "100" }), BUY_TIME)).portfolio;
    const two = expectOk(
      executeBuy(one, order({ assetId: "tsla-bstock", symbol: "TSLA", quantity: "10", price: "300" }), BUY_TIME),
    ).portfolio;
    const three = expectOk(
      executeSell(two, order({ assetId: "tsla-bstock", symbol: "TSLA", quantity: "10", price: "320" }), SELL_TIME),
    ).portfolio;

    expect(computeRealisedGain(three).toString()).toBe("200");
  });
});

// -----------------------------------------------------------------------------

describe("describeConcentration", () => {
  it("says so when there is nothing to describe", () => {
    expect(describeConcentration(valuePortfolio(createPortfolio(), {})).level).toBe("empty");
  });

  it("calls a single holding concentrated", () => {
    const portfolio = expectOk(executeBuy(createPortfolio(), order({ quantity: "10", price: "100" }), BUY_TIME)).portfolio;
    expect(describeConcentration(valuePortfolio(portfolio, { "nvda-bstock": "100" })).level).toBe(
      "concentrated",
    );
  });

  it("calls a dominant-but-not-total holding moderate", () => {
    // 5 vs 5 at the same price is 50%, which clears the diversified threshold
    // (35%) without reaching the concentrated one (60%).
    const one = expectOk(executeBuy(createPortfolio(), order({ quantity: "5", price: "100" }), BUY_TIME)).portfolio;
    const two = expectOk(
      executeBuy(one, order({ assetId: "tsla-bstock", symbol: "TSLA", quantity: "5", price: "100" }), BUY_TIME),
    ).portfolio;

    const valuation = valuePortfolio(two, { "nvda-bstock": "100", "tsla-bstock": "100" });
    expect(describeConcentration(valuation).level).toBe("moderate");
  });

  it("calls three equal holdings spread out", () => {
    let portfolio = createPortfolio();
    for (const symbol of ["NVDA", "TSLA", "AAPL"]) {
      portfolio = expectOk(
        executeBuy(portfolio, order({ assetId: `${symbol}-b`, symbol, quantity: "1", price: "100" }), BUY_TIME),
      ).portfolio;
    }

    const prices = { "NVDA-b": "100", "TSLA-b": "100", "AAPL-b": "100" };
    const description = describeConcentration(valuePortfolio(portfolio, prices));
    expect(description.level).toBe("diversified");
    expect(description.headline).toBeTruthy();
  });

  it("states the number it is reacting to", () => {
    const portfolio = expectOk(executeBuy(createPortfolio(), order({ quantity: "10", price: "100" }), BUY_TIME)).portfolio;
    const description = describeConcentration(valuePortfolio(portfolio, { "nvda-bstock": "100" }));
    expect(description.detail).toContain("100%");
  });
});
