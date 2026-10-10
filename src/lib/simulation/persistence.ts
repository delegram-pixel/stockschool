import { isDecimalString } from "@/lib/calculations/money";
import type { ProviderId } from "@/types";
import type { Portfolio, SimPosition, SimTransaction } from "./engine";

/**
 * Reading a portfolio back out of storage.
 *
 * Kept out of `engine.ts` on purpose. The engine is pure arithmetic over a
 * `Portfolio` it is handed and trusts completely — that is what makes it
 * testable without a browser. This file is the opposite kind of code: it assumes
 * the bytes are hostile, because `localStorage` on a shared origin is.
 *
 * **Validation is all-or-nothing**, and that is the interesting decision. A
 * lenient parser that dropped one malformed transaction would look forgiving and
 * be dangerous: `computeRealisedGain` replays the entire transaction history to
 * reconstruct the cost basis that applied at each sale, so a missing row does
 * not lose one line of a table — it silently changes the arithmetic on every
 * later row and produces a fabricated profit figure that is internally
 * consistent and completely wrong. Refusing the whole portfolio costs the
 * learner their simulated positions; accepting a damaged one costs them the
 * truth. We take the first, and the storage layer clears the bad key so the next
 * visit starts clean.
 */

const PROVIDERS = new Set<ProviderId>(["bstocks", "ondo", "xstocks", "unknown"]);

export function parsePortfolio(value: unknown): Portfolio | null {
  if (!isRecord(value)) return null;

  const id = readString(value.id);
  const name = readString(value.name);
  const baseCurrency = readString(value.baseCurrency);
  const initialCashBalance = readDecimalString(value.initialCashBalance);
  const cashBalance = readDecimalString(value.cashBalance);
  const updatedAt = readString(value.updatedAt);

  if (
    id === null ||
    name === null ||
    baseCurrency === null ||
    initialCashBalance === null ||
    cashBalance === null ||
    updatedAt === null
  ) {
    return null;
  }

  if (!Array.isArray(value.positions) || !Array.isArray(value.transactions)) return null;

  const positions: SimPosition[] = [];
  for (const raw of value.positions) {
    const position = parsePosition(raw);
    if (!position) return null;
    positions.push(position);
  }

  const transactions: SimTransaction[] = [];
  for (const raw of value.transactions) {
    const transaction = parseTransaction(raw);
    if (!transaction) return null;
    transactions.push(transaction);
  }

  return { id, name, baseCurrency, initialCashBalance, cashBalance, positions, transactions, updatedAt };
}

function parsePosition(value: unknown): SimPosition | null {
  if (!isRecord(value)) return null;

  const assetId = readString(value.assetId);
  const symbol = readString(value.symbol);
  const name = readString(value.name);
  const provider = readProvider(value.provider);
  const quantity = readDecimalString(value.quantity);
  const averageCost = readDecimalString(value.averageCost);

  if (
    assetId === null ||
    symbol === null ||
    name === null ||
    provider === null ||
    quantity === null ||
    averageCost === null
  ) {
    return null;
  }

  return { assetId, symbol, name, provider, quantity, averageCost };
}

function parseTransaction(value: unknown): SimTransaction | null {
  if (!isRecord(value)) return null;

  const id = readString(value.id);
  const assetId = readString(value.assetId);
  const symbol = readString(value.symbol);
  const action = value.action === "buy" || value.action === "sell" ? value.action : null;
  const quantity = readDecimalString(value.quantity);
  const price = readDecimalString(value.price);
  const grossAmount = readDecimalString(value.grossAmount);
  const feeAmount = readDecimalString(value.feeAmount);
  const currency = readString(value.currency);
  const priceSource =
    value.priceSource === "onchain" || value.priceSource === "reference"
      ? value.priceSource
      : null;
  const priceTimestamp =
    value.priceTimestamp === null || value.priceTimestamp === undefined
      ? null
      : readString(value.priceTimestamp);
  const createdAt = readString(value.createdAt);

  if (
    id === null ||
    assetId === null ||
    symbol === null ||
    action === null ||
    quantity === null ||
    price === null ||
    grossAmount === null ||
    feeAmount === null ||
    currency === null ||
    priceSource === null ||
    createdAt === null
  ) {
    return null;
  }

  // A `priceTimestamp` that is present but unreadable is a rejection, not a
  // silent null — the field exists precisely to keep the trade explainable
  // after the fact, so quietly discarding it would defeat its purpose.
  if (value.priceTimestamp !== null && value.priceTimestamp !== undefined && priceTimestamp === null) {
    return null;
  }

  return {
    id,
    assetId,
    symbol,
    action,
    quantity,
    price,
    grossAmount,
    feeAmount,
    currency,
    priceSource,
    priceTimestamp,
    createdAt,
  };
}

// -----------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Read a field that must be a decimal string.
 *
 * Delegates the numeric question to `isDecimalString` in the money module rather
 * than re-implementing it, so "is this a number we can do arithmetic on" has one
 * answer across the codebase. A JSON round trip cannot preserve a `Decimal`
 * instance, so decimal strings are what storage holds and what the engine reads.
 */
function readDecimalString(value: unknown): string | null {
  return typeof value === "string" && isDecimalString(value) ? value : null;
}

function readProvider(value: unknown): ProviderId | null {
  return typeof value === "string" && PROVIDERS.has(value as ProviderId)
    ? (value as ProviderId)
    : null;
}
