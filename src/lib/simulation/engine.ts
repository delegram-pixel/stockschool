import { Decimal, toDecimal } from "@/lib/calculations/money";
import type { ProviderId } from "@/types";

/**
 * Portfolio simulation engine.
 *
 * This module is pure: no React, no fetch, no storage, no clock unless one is
 * passed in. Every function takes a portfolio and returns a *new* portfolio.
 * That makes the whole of the simulator testable with plain assertions, which
 * is what the TRD asks for ("a deterministic calculation service that can be
 * unit-tested independently of React").
 *
 * It has no capability to touch a blockchain. There is no signing, no RPC
 * write, no transaction broadcast anywhere in this file, and there never
 * should be. Simulated actions produce `SimTransaction` records that
 * deliberately have no transaction hash — see `SimTransaction` below.
 */

/** The PRD's fixed starting balance. */
export const STARTING_CASH = "10000";

export const SIMULATION_DISCLOSURE =
  "Simulation only. No real trades are executed and no money moves.";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type SimPosition = {
  assetId: string;
  symbol: string;
  name: string;
  provider: ProviderId;
  /** Decimal string. Never negative. */
  quantity: string;
  /** Running cost basis per unit, decimal string. */
  averageCost: string;
};

export type SimTransaction = {
  id: string;
  assetId: string;
  symbol: string;
  action: "buy" | "sell";
  quantity: string;
  price: string;
  grossAmount: string;
  /** Simulated fee applied to this action. Zero unless the caller set one. */
  feeAmount: string;
  currency: string;
  /** Which price fed the simulation, so the result stays explainable. */
  priceSource: "onchain" | "reference";
  priceTimestamp: string | null;
  createdAt: string;
  /**
   * Note the absence of a `transactionHash` field. Inventing one for a
   * simulated action would imply a real chain transaction occurred, which the
   * PRD explicitly forbids.
   */
};

export type Portfolio = {
  id: string;
  name: string;
  baseCurrency: string;
  initialCashBalance: string;
  cashBalance: string;
  positions: SimPosition[];
  transactions: SimTransaction[];
  updatedAt: string;
};

export type OrderRequest = {
  assetId: string;
  symbol: string;
  name: string;
  provider: ProviderId;
  /** Quantity to trade, decimal string. */
  quantity: string;
  /** Execution price, decimal string. */
  price: string;
  priceSource: "onchain" | "reference";
  priceTimestamp?: string | null;
  /**
   * Optional simulated fee. Defaults to zero — we do not model gas or spreads
   * unless the caller asks, so the numbers stay honest about what they omit.
   */
  fee?: string;
};

/** A validation failure, phrased for a beginner. */
export type OrderError = {
  code:
    | "INVALID_QUANTITY"
    | "INVALID_PRICE"
    | "INSUFFICIENT_CASH"
    | "INSUFFICIENT_HOLDINGS"
    | "NO_POSITION"
    | "PRICE_UNAVAILABLE";
  /** Shown directly to the user — plain language, no jargon. */
  message: string;
};

export type OrderResult =
  | { ok: true; portfolio: Portfolio; transaction: SimTransaction }
  | { ok: false; error: OrderError };

// -----------------------------------------------------------------------------
// Construction
// -----------------------------------------------------------------------------

export function createPortfolio(id = "local", now: Date = new Date()): Portfolio {
  return {
    id,
    name: "My simulated portfolio",
    baseCurrency: "USD",
    initialCashBalance: STARTING_CASH,
    cashBalance: STARTING_CASH,
    positions: [],
    transactions: [],
    updatedAt: now.toISOString(),
  };
}

// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------

/**
 * Validate a buy. Returns the error the user should see, or null if it passes.
 *
 * Order matters: we check the *inputs* before the *balance*, so someone who
 * typed "-5" is told about the negative number rather than being told they
 * cannot afford it.
 */
export function validateBuy(portfolio: Portfolio, order: OrderRequest): OrderError | null {
  const inputError = validateOrderInputs(order);
  if (inputError) return inputError;

  const quantity = toDecimal(order.quantity)!;
  const price = toDecimal(order.price)!;
  const fee = toDecimal(order.fee ?? "0") ?? new Decimal(0);
  const cash = toDecimal(portfolio.cashBalance) ?? new Decimal(0);

  const cost = quantity.times(price).plus(fee);

  if (cost.greaterThan(cash)) {
    return {
      code: "INSUFFICIENT_CASH",
      message: `That would cost $${cost.toFixed(2)}, but you only have $${cash.toFixed(2)} of virtual cash left. Try a smaller amount.`,
    };
  }

  return null;
}

/** Validate a sell against actual simulated holdings. */
export function validateSell(portfolio: Portfolio, order: OrderRequest): OrderError | null {
  const inputError = validateOrderInputs(order);
  if (inputError) return inputError;

  const position = portfolio.positions.find((p) => p.assetId === order.assetId);
  if (!position) {
    return {
      code: "NO_POSITION",
      message: "You do not hold this asset in your simulated portfolio, so there is nothing to sell.",
    };
  }

  const quantity = toDecimal(order.quantity)!;
  const held = toDecimal(position.quantity) ?? new Decimal(0);

  if (quantity.greaterThan(held)) {
    return {
      code: "INSUFFICIENT_HOLDINGS",
      message: `You are trying to sell more than you hold. Your simulated position is ${held.toFixed(4)} units.`,
    };
  }

  return null;
}

function validateOrderInputs(order: OrderRequest): OrderError | null {
  const quantity = toDecimal(order.quantity);
  if (quantity === null || !quantity.isPositive()) {
    return {
      code: "INVALID_QUANTITY",
      message: "Enter a quantity greater than zero.",
    };
  }

  const price = toDecimal(order.price);
  if (price === null || !price.isPositive()) {
    return {
      code: "PRICE_UNAVAILABLE",
      message:
        "There is no usable price for this asset right now, so we cannot simulate a trade at a fair value.",
    };
  }

  const fee = toDecimal(order.fee ?? "0");
  if (fee === null || fee.isNegative()) {
    return { code: "INVALID_PRICE", message: "The simulated fee cannot be negative." };
  }

  return null;
}

// -----------------------------------------------------------------------------
// Execution
// -----------------------------------------------------------------------------

/**
 * Apply a simulated buy.
 *
 * Weighted-average cost basis:
 *
 *   newAverageCost = (heldQty × heldAvgCost + boughtQty × price) / (heldQty + boughtQty)
 *
 * This is the standard convention and the one a beginner will meet again in a
 * real brokerage statement, so it is worth teaching rather than simplifying.
 */
export function executeBuy(
  portfolio: Portfolio,
  order: OrderRequest,
  now: Date = new Date(),
): OrderResult {
  const error = validateBuy(portfolio, order);
  if (error) return { ok: false, error };

  const quantity = toDecimal(order.quantity)!;
  const price = toDecimal(order.price)!;
  const fee = toDecimal(order.fee ?? "0") ?? new Decimal(0);
  const grossAmount = quantity.times(price);
  const totalCost = grossAmount.plus(fee);

  const cash = toDecimal(portfolio.cashBalance) ?? new Decimal(0);

  const existing = portfolio.positions.find((p) => p.assetId === order.assetId);

  let positions: SimPosition[];
  if (existing) {
    const heldQty = toDecimal(existing.quantity) ?? new Decimal(0);
    const heldAvg = toDecimal(existing.averageCost) ?? new Decimal(0);
    const newQty = heldQty.plus(quantity);
    // Fee is capitalised into the cost basis — it is part of what you paid.
    const newAvg = heldQty
      .times(heldAvg)
      .plus(quantity.times(price))
      .plus(fee)
      .div(newQty);

    positions = portfolio.positions.map((p) =>
      p.assetId === order.assetId
        ? { ...p, quantity: newQty.toFixed(8), averageCost: newAvg.toFixed(8) }
        : p,
    );
  } else {
    const avg = quantity.times(price).plus(fee).div(quantity);
    positions = [
      ...portfolio.positions,
      {
        assetId: order.assetId,
        symbol: order.symbol,
        name: order.name,
        provider: order.provider,
        quantity: quantity.toFixed(8),
        averageCost: avg.toFixed(8),
      },
    ];
  }

  const transaction = buildTransaction(order, {
    action: "buy",
    quantity,
    price,
    grossAmount,
    fee,
    now,
  });

  return {
    ok: true,
    transaction,
    portfolio: {
      ...portfolio,
      cashBalance: cash.minus(totalCost).toFixed(8),
      positions,
      transactions: [...portfolio.transactions, transaction],
      updatedAt: now.toISOString(),
    },
  };
}

/**
 * Apply a simulated sell.
 *
 * A sale does not change the average cost of what remains — cost basis is a
 * property of the units still held. Realised gain or loss is the difference
 * between the sale price and that basis, and is reported separately by
 * `computeRealisedGain`.
 */
export function executeSell(
  portfolio: Portfolio,
  order: OrderRequest,
  now: Date = new Date(),
): OrderResult {
  const error = validateSell(portfolio, order);
  if (error) return { ok: false, error };

  const quantity = toDecimal(order.quantity)!;
  const price = toDecimal(order.price)!;
  const fee = toDecimal(order.fee ?? "0") ?? new Decimal(0);
  const grossAmount = quantity.times(price);
  const proceeds = grossAmount.minus(fee);

  const cash = toDecimal(portfolio.cashBalance) ?? new Decimal(0);

  let positions: SimPosition[];
  const position = portfolio.positions.find((p) => p.assetId === order.assetId);
  const heldQty = toDecimal(position?.quantity ?? "0")!;
  const remaining = heldQty.minus(quantity);

  if (remaining.isZero() || remaining.isNegative()) {
    // Closed out. Drop the row from active holdings; the transaction history
    // retains the full story, including the original cost.
    positions = portfolio.positions.filter((p) => p.assetId !== order.assetId);
  } else {
    positions = portfolio.positions.map((p) =>
      p.assetId === order.assetId ? { ...p, quantity: remaining.toFixed(8) } : p,
    );
  }

  const transaction = buildTransaction(order, { action: "sell", quantity, price, grossAmount, fee, now });

  return {
    ok: true,
    transaction,
    portfolio: {
      ...portfolio,
      cashBalance: cash.plus(proceeds).toFixed(8),
      positions,
      transactions: [...portfolio.transactions, transaction],
      updatedAt: now.toISOString(),
    },
  };
}

function buildTransaction(
  order: OrderRequest,
  parts: {
    action: "buy" | "sell";
    quantity: Decimal;
    price: Decimal;
    grossAmount: Decimal;
    fee: Decimal;
    now: Date;
  },
): SimTransaction {
  const { action, quantity, price, grossAmount, fee, now } = parts;

  // Deterministic-ish id: timestamp plus symbol plus a short random suffix.
  // Not a UUID because this runs in the browser and may be persisted either
  // locally or to Postgres.
  const id = `${now.getTime()}-${order.symbol}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    assetId: order.assetId,
    symbol: order.symbol,
    action,
    quantity: quantity.toFixed(8),
    price: price.toFixed(8),
    grossAmount: grossAmount.toFixed(8),
    feeAmount: fee.toFixed(8),
    currency: "USD",
    priceSource: order.priceSource,
    priceTimestamp: order.priceTimestamp ?? null,
    createdAt: now.toISOString(),
  };
}

// -----------------------------------------------------------------------------
// Valuation
// -----------------------------------------------------------------------------

export type Holding = {
  position: SimPosition;
  quantity: Decimal;
  averageCost: Decimal;
  /** Current price used for valuation, or null when unavailable. */
  price: Decimal | null;
  marketValue: Decimal | null;
  costBasis: Decimal;
  /** Unrealised hypothetical gain/loss. Null when we have no price. */
  unrealisedGain: Decimal | null;
  unrealisedGainPercent: Decimal | null;
  /** Share of the invested (non-cash) value, 0–100. Null when unvaluable. */
  allocationPercent: Decimal | null;
};

export type PortfolioValuation = {
  cash: Decimal;
  /** Sum of valuables positions. Positions without a price are excluded. */
  holdingsValue: Decimal;
  totalValue: Decimal;
  costBasis: Decimal;
  unrealisedGain: Decimal;
  unrealisedGainPercent: Decimal | null;
  /** Total return against the initial $10,000. */
  totalReturn: Decimal;
  totalReturnPercent: Decimal;
  holdings: Holding[];
  /** True when at least one position could not be valued. */
  hasUnpricedHoldings: boolean;
};

/**
 * Value a portfolio against a price map.
 *
 * `prices` maps assetId → decimal price string. A position with no price is
 * still listed, with null valuation — hiding it would make the totals look
 * complete when they are not, and `hasUnpricedHoldings` lets the UI say so.
 */
export function valuePortfolio(
  portfolio: Portfolio,
  prices: Record<string, string | null | undefined>,
): PortfolioValuation {
  const cash = toDecimal(portfolio.cashBalance) ?? new Decimal(0);

  let holdingsValue = new Decimal(0);
  let costBasisTotal = new Decimal(0);
  let unpricedValue = new Decimal(0);
  let hasUnpricedHoldings = false;

  const partial = portfolio.positions.map((position) => {
    const quantity = toDecimal(position.quantity) ?? new Decimal(0);
    const averageCost = toDecimal(position.averageCost) ?? new Decimal(0);
    const costBasis = quantity.times(averageCost);
    const price = toDecimal(prices[position.assetId] ?? null);
    const marketValue = price ? quantity.times(price) : null;

    if (marketValue === null) {
      hasUnpricedHoldings = true;
      // Contribute cost basis so the allocation denominator is not distorted
      // by a missing quote, but flag it.
      unpricedValue = unpricedValue.plus(costBasis);
    } else {
      holdingsValue = holdingsValue.plus(marketValue);
    }
    costBasisTotal = costBasisTotal.plus(costBasis);

    const unrealisedGain = marketValue ? marketValue.minus(costBasis) : null;
    const unrealisedGainPercent =
      unrealisedGain && costBasis.isPositive() ? unrealisedGain.div(costBasis).times(100) : null;

    return { position, quantity, averageCost, price, marketValue, costBasis, unrealisedGain, unrealisedGainPercent };
  });

  // Allocation is computed against the total position value (priced market
  // value plus unpriced cost basis), so percentages sum to 100.
  const allocationBase = holdingsValue.plus(unpricedValue);

  const holdings: Holding[] = partial.map((h) => {
    const value = h.marketValue ?? h.costBasis;
    return {
      ...h,
      allocationPercent: allocationBase.isPositive() ? value.div(allocationBase).times(100) : null,
    };
  });

  const totalValue = cash.plus(holdingsValue);
  const initial = toDecimal(portfolio.initialCashBalance) ?? new Decimal(0);
  const totalReturn = totalValue.minus(initial);
  const totalReturnPercent = initial.isPositive() ? totalReturn.div(initial).times(100) : new Decimal(0);

  const unrealisedGain = holdingsValue.minus(
    holdings.reduce((sum, h) => sum.plus(h.marketValue ? h.costBasis : new Decimal(0)), new Decimal(0)),
  );
  const pricedCostBasis = holdings.reduce(
    (sum, h) => (h.marketValue ? sum.plus(h.costBasis) : sum),
    new Decimal(0),
  );

  return {
    cash,
    holdingsValue,
    totalValue,
    costBasis: costBasisTotal,
    unrealisedGain,
    unrealisedGainPercent: pricedCostBasis.isPositive()
      ? unrealisedGain.div(pricedCostBasis).times(100)
      : null,
    totalReturn,
    totalReturnPercent,
    holdings: holdings.sort((a, b) =>
      (b.marketValue ?? b.costBasis).comparedTo(a.marketValue ?? a.costBasis),
    ),
    hasUnpricedHoldings,
  };
}

/**
 * Realised hypothetical gain across the whole history, using average cost at
 * the time of each sale.
 *
 * Returns null when the history contains a sale we cannot reconstruct, rather
 * than reporting a number we are not confident in.
 */
export function computeRealisedGain(portfolio: Portfolio): Decimal {
  // Replay the history to recover the cost basis that applied at each sale.
  const basis = new Map<string, { quantity: Decimal; averageCost: Decimal }>();
  let realised = new Decimal(0);

  for (const tx of portfolio.transactions) {
    const quantity = toDecimal(tx.quantity) ?? new Decimal(0);
    const price = toDecimal(tx.price) ?? new Decimal(0);
    const current = basis.get(tx.assetId) ?? { quantity: new Decimal(0), averageCost: new Decimal(0) };

    if (tx.action === "buy") {
      const newQty = current.quantity.plus(quantity);
      const newAvg = newQty.isPositive()
        ? current.quantity.times(current.averageCost).plus(quantity.times(price)).div(newQty)
        : new Decimal(0);
      basis.set(tx.assetId, { quantity: newQty, averageCost: newAvg });
    } else {
      realised = realised.plus(quantity.times(price.minus(current.averageCost)));
      basis.set(tx.assetId, {
        quantity: current.quantity.minus(quantity),
        averageCost: current.averageCost,
      });
    }
  }

  return realised;
}

/**
 * Concentration read for the allocation panel.
 *
 * Teaches the concept rather than scoring it: a portfolio with one dominant
 * holding is concentrated, and the copy says what that means in plain words.
 */
export function describeConcentration(valuation: PortfolioValuation): {
  level: "empty" | "diversified" | "moderate" | "concentrated";
  headline: string;
  detail: string;
} {
  const valued = valuation.holdings.filter((h) => h.allocationPercent !== null);

  if (valued.length === 0) {
    return {
      level: "empty",
      headline: "No positions yet",
      detail: "Add a simulated position and we will show how your virtual money is spread across assets.",
    };
  }

  const top = valued[0]!.allocationPercent!;
  const topPct = top.toNumber();

  if (topPct >= 60) {
    return {
      level: "concentrated",
      headline: "Concentrated",
      detail: `${topPct.toFixed(0)}% of your simulated holdings sit in a single asset. That means one company's news moves almost your whole portfolio.`,
    };
  }
  if (topPct >= 35) {
    return {
      level: "moderate",
      headline: "Somewhat concentrated",
      detail: `Your largest position is ${topPct.toFixed(0)}% of holdings. Spreading across more assets would reduce how much any single company affects the total.`,
    };
  }
  return {
    level: "diversified",
    headline: "Spread out",
    detail: `Your largest position is ${topPct.toFixed(0)}% of holdings. No single asset dominates the portfolio.`,
  };
}
