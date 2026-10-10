import { Decimal, isDecimalString, toDecimal } from "@/lib/calculations/money";

/**
 * Token supply arithmetic.
 *
 * `totalSupply()` returns an integer in the token's *smallest unit*, not in
 * tokens. A contract that reports `1000000000000000000000` with `decimals() = 18`
 * has a supply of 1,000 — and this is the single most common thing a newcomer
 * misreads on a block explorer. The On-Chain Lab exists partly to make that
 * concrete, so the conversion lives here as a named, testable function rather
 * than as an inline division in a page.
 *
 * Both halves of the pair are returned by the caller's two reads, and a contract
 * is free to be missing either one. When it is, this returns null: guessing 18
 * decimals because that is the common case would produce a number that looks
 * authoritative and is wrong by a factor of a trillion.
 */

export type ScaledSupply = {
  /** Human supply: raw ÷ 10^decimals. Decimal string, unrounded. */
  tokens: string;
  /** The raw integer as the contract returned it. */
  raw: string;
  decimals: number;
};

export function scaleSupply(
  rawSupply: string | null,
  decimals: number | null,
): ScaledSupply | null {
  if (rawSupply === null || decimals === null) return null;

  // A negative or fractional `decimals()` is not a token we can describe.
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 77) return null;

  // A raw `uint256` out of an ABI is always plain digits, so anything else —
  // exponential notation, a thousands separator, an empty string — means the
  // value is not the shape we think it is. This matters because `toDecimal` is
  // deliberately liberal and would parse `1e21` into a perfectly plausible,
  // perfectly wrong supply. `isDecimalString` is the strict counterpart, and
  // the same rule the storage layer holds its own bytes to.
  if (!isDecimalString(rawSupply)) return null;

  const raw = toDecimal(rawSupply);
  if (raw === null || raw.isNegative()) return null;

  const tokens = raw.div(new Decimal(10).pow(decimals));

  return { tokens: tokens.toFixed(decimals > 0 ? Math.min(decimals, 18) : 0), raw: rawSupply, decimals };
}

/**
 * How much of the underlying share one token stands for, as prose.
 *
 * Issuers that disclose a ratio express it in whatever way is legible for the
 * asset — "1 token = 0.1 share", "1:1" — and the raw string in the feed is
 * whatever the provider sent. Rather than reformatting it into a canonical shape
 * (which risks turning a ratio that means "1 token per share" into "1 share per
 * token"), the raw disclosure is shown as the issuer wrote it, with a fixed
 * explanation of what the number *is*.
 */
export function describeRatio(raw: string | null): string | null {
  if (raw === null || raw.trim() === "") return null;
  return raw.trim();
}
