import { cn } from "@/lib/utils";
import { comparePrices } from "@/lib/calculations/price-difference";
import { formatCurrency, formatPercent, toDecimal } from "@/lib/calculations/money";
import type { TokenizedStock } from "@/types";

/**
 * The two prices, and the gap between them.
 *
 * This is the central fact of a tokenized stock — lesson 03 builds a whole
 * lesson around it — so it gets a component rather than two lines of text in a
 * card. The three parts are deliberate:
 *
 *  1. **The pair.** Reference price on the left, on-chain price on the right,
 *     each labelled with *where the number comes from*, not just what it is.
 *     "Reference price" and "On-chain price" are the two processes; calling them
 *     "price" and "price" would teach nothing.
 *
 *  2. **The meter.** A track with the reference pinned at the centre. The
 *     on-chain price sits left or right of it, so the width of the offset is
 *     proportional to the real size of the gap. The window is ±5% and clamps
 *     beyond it — a 40% gap and a 400% gap look the same, because the point is
 *     direction and rough magnitude, not precision. When it clamps the label
 *     says so.
 *
 *  3. **The words.** Always "above" or "below", never a bare sign. Colour is a
 *     second signal, never the only one — and note which colours: teal and blue,
 *     not green and red. A premium is not good news and a discount is not bad
 *     news, and a product that paints one green has started giving advice.
 *
 * The comparison itself comes from `comparePrices`, which returns null rather
 * than zero when both prices are not available. Null renders as "not comparable"
 * here. We never print 0.00% for missing data, because 0.00% is a claim.
 */

/** How far the meter reaches before it clamps. ±5% of the reference price. */
const WINDOW_PERCENT = 5;

export function PricePair({
  asset,
  size = "md",
  className,
}: {
  asset: TokenizedStock;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const comparison = comparePrices(asset.price, asset.referencePrice);
  // Kept as the decimal string the comparison produced. `formatPercent` parses
  // it with `Decimal` itself, so the only reason to call `Number` here would be
  // to introduce a float into a money path.
  const delta = comparison?.difference.percent ?? null;

  // Direction drives every visual choice below, and is computed once.
  const direction = comparison?.difference.direction ?? null;

  const valueClass = cn(
    "font-mono tabular-nums tracking-[-0.01em] text-ink",
    size === "lg" ? "text-[1.375rem]" : size === "sm" ? "text-[0.875rem]" : "text-[1.0625rem]",
  );

  return (
    <div className={cn("not-prose", className)}>
      <div className="flex items-stretch gap-4">
        <Figure
          label="Reference"
          hint="the last trade on the real exchange"
          value={asset.referencePrice}
          valueClass={valueClass}
          size={size}
        />

        {/* The connector. A thin rule with the gap written across it, so the
            two prices read as one comparison rather than as two statistics. */}
        <div className="flex flex-col items-center justify-center gap-1.5 pt-4">
          <span
            aria-hidden
            className={cn(
              "block h-px w-6",
              direction === "premium"
                ? "bg-teal/45"
                : direction === "discount"
                  ? "bg-info/45"
                  : "bg-line-strong",
            )}
          />
          <span
            className={cn(
              "whitespace-nowrap font-mono text-[0.6875rem] tabular-nums",
              direction === "premium"
                ? "text-teal-strong"
                : direction === "discount"
                  ? "text-info"
                  : "text-ink-subtle",
            )}
          >
            {delta === null ? "—" : formatPercent(delta, { decimals: 2 })}
          </span>
        </div>

        <Figure
          label="On-chain"
          hint="the price in the BNB Chain pool"
          value={asset.price}
          valueClass={valueClass}
          size={size}
        />
      </div>

      <GapMeter
        percent={delta}
        direction={direction}
        referencePrice={asset.referencePrice}
        className="mt-3.5"
      />
    </div>
  );
}

/**
 * One side of the pair.
 *
 * The label sits above the number and the provenance hint below it, so a reader
 * scanning down a grid of cards always hits the same three layers in the same
 * order — which is what makes twelve of these comparable at a glance.
 */
function Figure({
  label,
  hint,
  value,
  valueClass,
  size,
}: {
  label: string;
  hint: string;
  value: string | null;
  valueClass: string;
  size: "sm" | "md" | "lg";
}) {
  return (
    <div className="min-w-0 flex-1">
      <p className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-ink-subtle">
        {label}
      </p>
      <p className={cn(valueClass, "mt-1 truncate")} title={value ?? "Not available"}>
        {formatCurrency(value)}
      </p>
      {size !== "sm" && <p className="mt-1 text-[0.6875rem] leading-snug text-ink-subtle">{hint}</p>}
    </div>
  );
}

/**
 * The gap, drawn.
 *
 * The track is a fixed ±5% window with a tick at the centre for the reference
 * price. Anything beyond the window is pinned to the edge and labelled
 * "beyond ±5%" rather than silently drawn short — a clamped bar that still
 * looked precise would be a small lie, and this product does not tell those.
 */
export function GapMeter({
  percent,
  direction,
  referencePrice,
  className,
}: {
  /** The decimal string from `comparePrices`, unrounded. */
  percent: string | null;
  direction: "premium" | "discount" | "parity" | null;
  /** Only used for the accessible description. */
  referencePrice: string | null;
  className?: string;
}) {
  if (percent === null || direction === null) {
    return (
      <p className={cn("font-mono text-[0.6875rem] text-ink-subtle", className)}>
        No comparable pair — both prices are needed to measure the gap.
      </p>
    );
  }

  // The one place a float is correct. This number is a *pixel coordinate*, not a
  // money value: it decides how far to the right of centre a dot is drawn, and
  // the display is 1.5px tall. The label below uses the exact decimal string.
  const asNumber = Number(percent);
  const clamped = Math.max(-WINDOW_PERCENT, Math.min(WINDOW_PERCENT, asNumber));
  const beyond = Math.abs(asNumber) > WINDOW_PERCENT;
  // Half the track is the window, so 5% sits at the far edge.
  const offset = (clamped / WINDOW_PERCENT) * 48;

  const above = direction === "premium";
  const atParity = direction === "parity";

  // The magnitude, not the signed value: the sentence already says "above" or
  // "below", so printing "-1.24% below the reference" would say it twice and
  // contradict itself. `signed: false` suppresses a leading "+" but still lets a
  // minus through, which is why the absolute value has to be taken here rather
  // than left to the formatter.
  const magnitude = toDecimal(percent)?.abs() ?? null;

  return (
    <div className={className}>
      <div className="relative h-1.5 rounded-full bg-ink/6">
        <span aria-hidden className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-line-strong" />

        {atParity ? (
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-canvas bg-ink-muted"
          />
        ) : (
          <span
            aria-hidden
            className={cn(
              "absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-canvas",
              above ? "bg-teal" : "bg-info",
            )}
            style={{ left: `calc(50% + ${offset}% - 6px)` }}
          />
        )}
      </div>

      <p className="mt-1.5 font-mono text-[0.6875rem] text-ink-subtle">
        {atParity ? (
          <>At the reference price ({formatCurrency(referencePrice)})</>
        ) : (
          <>
            {formatPercent(magnitude, { decimals: 2, signed: false })}{" "}
            {above ? "above" : "below"} the reference of {formatCurrency(referencePrice)}
            {beyond && <span className="text-ink-muted"> · beyond ±5%</span>}
          </>
        )}
      </p>
    </div>
  );
}

/**
 * The gap as a single word, for tables and badges.
 *
 * Exported separately from the meter because the Explore table wants the verdict
 * without the drawing, and duplicating the threshold logic in two places is how
 * two surfaces start disagreeing.
 */
export function gapVerdict(asset: TokenizedStock): {
  label: string;
  tone: "accent" | "info" | "neutral";
} {
  const comparison = comparePrices(asset.price, asset.referencePrice);
  if (!comparison) return { label: "Not comparable", tone: "neutral" };

  switch (comparison.difference.direction) {
    case "premium":
      return { label: "Above reference", tone: "accent" };
    case "discount":
      return { label: "Below reference", tone: "info" };
    case "parity":
      return { label: "At reference", tone: "neutral" };
  }
}
