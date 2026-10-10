import Decimal from "decimal.js";

/**
 * Decimal-safe money arithmetic.
 *
 * Every financial value in this product is a *decimal string* at the boundary
 * and a `Decimal` in the middle. JavaScript numbers appear only at the very
 * end, if at all, and never in an accumulator.
 *
 * Why this matters concretely: a learner who buys 3 units at $182.40 and sells
 * at $183.60 should see exactly $3.60 of hypothetical profit, not $3.5999999.
 * A trading simulator that cannot add up destroys the product's credibility
 * faster than any missing feature.
 *
 * Configured once, globally. 28 significant digits is plenty for equity
 * prices and leaves headroom for the division in percentage calculations.
 */
Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -15,
  toExpPos: 30,
});

export { Decimal };

/**
 * A trap worth naming once, here, because everything imports `Decimal` from
 * this module.
 *
 * `decimal.js`'s `isPositive()` and `isNegative()` are **sign** tests, not
 * magnitude ones. Zero carries a positive sign and `-0` a negative one, so
 * `new Decimal(0).isPositive()` is `true` and `new Decimal(-0).isNegative()` is
 * `true`. Code that reads `isPositive()` as "greater than zero" therefore lets
 * zero through — and where that value is a divisor, it divides by zero and
 * produces `NaN`, which then renders as a confident, wrong number on a screen
 * about the learner's own money.
 *
 * So: `greaterThan(0)` when "greater than zero" is what you mean, and
 * `isZero()` / `isNegative()` when the sign genuinely is the question.
 */

/** Anything we can safely turn into a Decimal. */
export type Numeric = string | number | Decimal;

/**
 * Parse a value into a Decimal.
 *
 * Returns null rather than throwing for absent or unparseable input, because
 * "this asset has no reference price" is a normal state in this product, not
 * an exception. Callers branch on null and render "unavailable".
 */
export function toDecimal(value: Numeric | null | undefined): Decimal | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Decimal) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "" || trimmed === "null" || trimmed === "undefined") return null;
  }
  try {
    const d = new Decimal(value);
    return d.isFinite() ? d : null;
  } catch {
    return null;
  }
}

/** Strict variant for places where a missing value is a programming error. */
export function requireDecimal(value: Numeric, context: string): Decimal {
  const d = toDecimal(value);
  if (d === null) throw new Error(`Expected a numeric value for ${context}, received ${String(value)}`);
  return d;
}

/**
 * Is this string a number we can do arithmetic on?
 *
 * The predicate form of `toDecimal`, for the places that need to *validate*
 * rather than convert — chiefly reading a portfolio back out of `localStorage`,
 * where the question is "did we write this, or did something else?" and the
 * answer has to be a yes or no rather than a value.
 *
 * Note this is deliberately *stricter* than `toDecimal`, which is why it cannot
 * simply be `toDecimal(value) !== null`. `decimal.js` — reasonably — understands
 * far more notations than we ever write: exponential form (`1e5`), hexadecimal
 * (`0x10`), a lone `.`. Everything this codebase writes to storage comes from
 * `Decimal#toFixed`, which produces plain decimal notation and nothing else, so
 * the accepted set is exactly that. Anything outside it is a sign that the bytes
 * are not ours.
 *
 * `Number.isFinite(Number(x))` is the wrong test, and the one people reach for:
 * it accepts `""` (as 0), `"  "`, `"0x10"` and `"1e5"` alike.
 */
const DECIMAL_STRING = /^[+-]?(\d+(\.\d*)?|\.\d+)$/;

export function isDecimalString(value: string): boolean {
  if (value.length === 0 || !DECIMAL_STRING.test(value)) return false;
  // Still round-trip through `toDecimal`, because the regex cannot know whether
  // a value overflows the configured precision. `toDecimal` returns null for
  // non-finite results, and that check has to happen somewhere.
  return toDecimal(value) !== null;
}

// -----------------------------------------------------------------------------
// Formatting — the ONLY place rounding happens
// -----------------------------------------------------------------------------

/** `$1,234.56`. Returns an em-dash placeholder for unavailable values. */
export function formatCurrency(
  value: Numeric | null | undefined,
  options: { currency?: string; decimals?: number; placeholder?: string } = {},
): string {
  const { currency = "USD", decimals = 2, placeholder = "—" } = options;
  const d = toDecimal(value);
  if (d === null) return placeholder;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(d.toNumber());
}

/**
 * `+2.00%` / `−0.31%`. Sign is always explicit for a signed quantity.
 *
 * The minus is U+2212 MINUS SIGN, not the ASCII hyphen that `Intl` emits for
 * negative numbers. This is not typographic fussiness: `formatSignedCurrency`
 * already renders a typographic minus, and the two functions appear on the same
 * line in the price pair — a hyphen in one and a true minus in the other is
 * visible once you have seen it and impossible to unsee. Since the sign has to
 * be built by hand anyway to get `signDisplay: "exceptZero"` behaviour on a
 * magnitude, emitting the right glyph costs nothing.
 */
export function formatPercent(
  value: Numeric | null | undefined,
  options: { decimals?: number; signed?: boolean; placeholder?: string } = {},
): string {
  const { decimals = 2, signed = true, placeholder = "—" } = options;
  const d = toDecimal(value);
  if (d === null) return placeholder;

  // Format the magnitude and prepend the sign ourselves. `Intl`'s own
  // `signDisplay` would give an ASCII hyphen and cannot be told otherwise.
  const magnitude = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(d.abs().toNumber());

  const sign = d.isNegative() ? "−" : signed && !d.isZero() ? "+" : "";
  return `${sign}${magnitude}%`;
}

/** Plain signed amount for a price difference: `+$3.60`. */
export function formatSignedCurrency(
  value: Numeric | null | undefined,
  options: { currency?: string; decimals?: number; placeholder?: string } = {},
): string {
  const { currency = "USD", decimals = 2, placeholder = "—" } = options;
  const d = toDecimal(value);
  if (d === null) return placeholder;

  const sign = d.isNegative() ? "−" : d.isZero() ? "" : "+";
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(d.abs().toNumber());

  return `${sign}${amount}`;
}

/** Quantities: up to 6 dp, trailing zeros trimmed. `3` not `3.000000`. */
export function formatQuantity(value: Numeric | null | undefined, maxDecimals = 6): string {
  const d = toDecimal(value);
  if (d === null) return "—";
  const fixed = d.toFixed(maxDecimals, Decimal.ROUND_DOWN);
  return fixed.replace(/\.?0+$/, "") || "0";
}

/** Compact display for large figures: `$1.24B`. Used in secondary contexts only. */
export function formatCompact(value: Numeric | null | undefined, options: { currency?: string } = {}): string {
  const d = toDecimal(value);
  if (d === null) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
    ...(options.currency ? { style: "currency" as const, currency: options.currency } : {}),
  }).format(d.toNumber());
}

// -----------------------------------------------------------------------------
// Relative time — used by every freshness indicator
// -----------------------------------------------------------------------------

/**
 * "32 seconds ago". Deliberately coarse: precision past the first unit adds
 * noise without adding trust.
 */
export function formatRelativeTime(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "unknown";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "unknown";

  const seconds = Math.round((now.getTime() - then.getTime()) / 1000);

  if (seconds < 0) return "just now";
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds} seconds ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;

  return then.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Absolute timestamp for tooltips, where exactness matters. */
export function formatAbsoluteTime(iso: string | null | undefined): string {
  if (!iso) return "Unavailable";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unavailable";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}
