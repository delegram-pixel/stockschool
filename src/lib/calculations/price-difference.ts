import { Decimal, toDecimal, type Numeric } from "./money";
import type { PriceDifference } from "@/types";

/**
 * Reference price ⇄ on-chain price comparison.
 *
 *   absolute difference = onChainPrice − referencePrice
 *   percentage          = (onChainPrice − referencePrice) / referencePrice × 100
 *
 * Two rules from the TRD that the shape of this API enforces:
 *
 *  1. A comparison is only produced when *both* prices are present, positive
 *     and comparable. Otherwise we return null and the UI says "unavailable" —
 *     we never show a 0% difference for missing data, because 0% is a claim.
 *  2. Nothing here is described as an arbitrage. The output is a *premium* or
 *     a *discount* — a measured gap, not an opportunity. `describeDifference`
 *     produces the neutral copy the UI uses.
 */

export type PriceComparison = {
  difference: PriceDifference;
  /** The raw decimals, for callers that need to chart them. */
  raw: {
    onChain: Decimal;
    reference: Decimal;
    absolute: Decimal;
    percent: Decimal;
  };
};

/**
 * Compare two prices. Returns null when a mathematically meaningful comparison
 * cannot be made.
 *
 * Guards:
 *  - either price missing or unparseable → null
 *  - either price zero or negative → null (a percentage against a zero
 *    reference is undefined, and a negative reference price is nonsense)
 *  - reference price below a cent → null (percentage explodes; not meaningful)
 */
export function comparePrices(
  onChainPrice: Numeric | null | undefined,
  referencePrice: Numeric | null | undefined,
): PriceComparison | null {
  const onChain = toDecimal(onChainPrice);
  const reference = toDecimal(referencePrice);

  if (onChain === null || reference === null) return null;
  // The docblock above says "zero or negative → null", and this is the test that
  // actually means that. `isPositive()` is a *sign* test and zero carries a
  // positive sign, so it would wave a zero through — and a zero on-chain price
  // then renders as "trading 100% below its reference price", a confident
  // statement about a number we do not have.
  if (!onChain.greaterThan(0) || !reference.greaterThan(0)) return null;

  // Below half a cent the percentage becomes noise rather than information.
  if (reference.lessThan(new Decimal("0.005"))) return null;

  const absolute = onChain.minus(reference);
  const percent = absolute.div(reference).times(100);

  const direction: PriceDifference["direction"] = absolute.isZero()
    ? "parity"
    : absolute.isPositive()
      ? "premium"
      : "discount";

  return {
    difference: {
      // Kept at full precision internally; rounded only by the formatter.
      absolute: absolute.toFixed(8),
      percent: percent.toFixed(6),
      direction,
    },
    raw: { onChain, reference, absolute, percent },
  };
}

/**
 * Neutral, non-advisory copy for a comparison.
 *
 * The wording is deliberately careful. "Trading above its reference price" is a
 * description; "an arbitrage opportunity" is investment advice this product is
 * forbidden from giving (PRD §13.6).
 */
export function describeDifference(comparison: PriceComparison | null): string {
  if (!comparison) {
    return "A comparison is not available because we do not have both prices for this asset.";
  }

  const { direction } = comparison.difference;
  const magnitude = Math.abs(comparison.raw.percent.toNumber()).toFixed(2);

  switch (direction) {
    case "parity":
      return "The on-chain price and the reference price are currently equal.";
    case "premium":
      return `The token is trading about ${magnitude}% above its reference price. This gap usually reflects demand on the on-chain market, thin liquidity, or a difference in the timing of the two quotes.`;
    case "discount":
      return `The token is trading about ${magnitude}% below its reference price. This gap usually reflects selling pressure on the on-chain market, thin liquidity, or a difference in the timing of the two quotes.`;
  }
}

/**
 * Whether a difference is large enough to be worth explaining.
 *
 * Used to decide if a lesson should call attention to the gap. 0.5% is a
 * judgement call: below it, ordinary quote timing and rounding dominate.
 */
export function isNotableDifference(
  comparison: PriceComparison | null,
  thresholdPercent = 0.5,
): boolean {
  if (!comparison) return false;
  return comparison.raw.percent.abs().greaterThanOrEqualTo(thresholdPercent);
}

/**
 * A worked, step-by-step derivation of the percentage.
 *
 * The "Find the Premium" mission shows its working, so the arithmetic is
 * inspectable rather than a black box that produces a number.
 */
export function explainComparison(comparison: PriceComparison | null): string[] {
  if (!comparison) {
    return ["We need both an on-chain price and a reference price to show the working."];
  }

  const { onChain, reference, absolute, percent } = comparison.raw;

  return [
    `Step 1 — Find the gap: on-chain price − reference price.`,
    `   $${onChain.toFixed(2)} − $${reference.toFixed(2)} = $${absolute.toFixed(2)}`,
    `Step 2 — Express the gap as a share of the reference price.`,
    `   $${absolute.abs().toFixed(2)} ÷ $${reference.toFixed(2)} = ${percent.div(100).abs().toFixed(4)}`,
    `Step 3 — Convert to a percentage.`,
    `   ${percent.div(100).abs().toFixed(4)} × 100 = ${percent.abs().toFixed(2)}%`,
    `${
      comparison.difference.direction === "parity"
        ? "The token is trading at parity with its reference price."
        : `The token is trading ${
            comparison.difference.direction === "premium" ? "above" : "below"
          } its reference price by ${percent.abs().toFixed(2)}%.`
    }`,
  ];
}
