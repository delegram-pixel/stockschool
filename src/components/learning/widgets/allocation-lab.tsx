"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Decimal } from "@/lib/calculations/money";
import { Readout, Segmented, Slider, Stage, WidgetNote } from "./parts";
import type { WidgetProps } from "./types";

/**
 * The allocation lab.
 *
 * Its job is to convert a word people use loosely — "diversified" — into a
 * number they can watch move. Three things do that work:
 *
 * 1. **A donut that always shows the true shape.** Percentages summing to 118
 *    still draw a full ring, because the ring describes *proportions*. Hiding
 *    the overflow inside a normalised ring would be the dishonest option, so the
 *    overflow is called out in the total instead, with a button to fix it.
 *
 * 2. **Concentration as a single figure.** The Herfindahl index is one number
 *    where 100 is a single holding and 25 is four equal ones. It gives the
 *    learner something to move that is not a percentage they already understand.
 *
 * 3. **A stress test, not a forecast.** Asking what a holding halving would do
 *    to the total is arithmetic the learner can verify by hand. Asking what a
 *    holding *will* do would be a prediction, and this product does not make
 *    those.
 */

const SLICE_PAINT = [
  "var(--color-teal)",
  "var(--color-sky-ink)",
  "var(--color-sun-ink)",
  "var(--color-info)",
  "var(--color-success)",
  "var(--color-warning)",
] as const;

/** Used only when the feed has nothing to offer — never presented as real. */
const ILLUSTRATIVE = ["AAPL", "NVDA", "MSFT", "TSLA"] as const;
const ILLUSTRATIVE_NAMES: Record<string, string> = {
  AAPL: "Apple",
  NVDA: "NVIDIA",
  MSFT: "Microsoft",
  TSLA: "Tesla",
};

const RADIUS = 62;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function AllocationLab({ assets, config }: WidgetProps) {
  // Prefer the live feed so the names on the sliders are real assets the
  // learner has already met. Fall back to a fixed illustrative set, and say so.
  const configured = Array.isArray(config?.symbols)
    ? (config.symbols as unknown[]).filter((s): s is string => typeof s === "string")
    : null;

  const { symbols, names, illustrative } = useMemo(() => {
    if (configured && configured.length >= 2) {
      const label = new Map(assets.map((a) => [a.symbol, a.companyName ?? a.name]));
      return {
        symbols: configured,
        names: Object.fromEntries(configured.map((s) => [s, label.get(s) ?? s])),
        illustrative: false,
      };
    }

    const live = assets.slice(0, 6);
    if (live.length >= 2) {
      return {
        symbols: live.map((a) => a.underlyingSymbol ?? a.symbol),
        names: Object.fromEntries(
          live.map((a) => [a.underlyingSymbol ?? a.symbol, a.companyName ?? a.name]),
        ),
        illustrative: false,
      };
    }

    return {
      symbols: [...ILLUSTRATIVE],
      names: ILLUSTRATIVE_NAMES,
      illustrative: true,
    };
  }, [assets, configured]);

  // An equal split is the default, with the rounding remainder spread over the
  // first few names so the totals start at exactly 100.
  const equalSplit = useMemo(() => {
    const n = symbols.length;
    const base = Math.floor(100 / n);
    const remainder = 100 - base * n;
    return symbols.map((_, i) => base + (i < remainder ? 1 : 0));
  }, [symbols]);

  const [overrides, setOverrides] = useState<Record<string, number>>({});

  const weights = useMemo(
    () => symbols.map((symbol, i) => overrides[symbol] ?? equalSplit[i] ?? 0),
    [symbols, overrides, equalSplit],
  );

  const total = weights.reduce((sum, w) => sum + w, 0);
  const safeTotal = total === 0 ? 1 : total;

  const largestIndex = weights.reduce((best, w, i) => (w > (weights[best] ?? 0) ? i : best), 0);
  const largestSymbol = symbols[largestIndex] ?? "";
  const holdings = weights.filter((w) => w > 0).length;

  // Herfindahl–Hirschman index over the *shape*, so it stays meaningful while
  // the percentages do not yet sum to 100.
  const hhi = concentrationIndex(weights);

  const [shockIndex, setShockIndex] = useState<number | null>(null);
  const shock = shockIndex ?? largestIndex;
  const shockWeight = weights[shock] ?? 0;
  const portfolioHit = (shockWeight / safeTotal) * 50;

  const overAllocated = total > 100;
  const underAllocated = total < 100;

  function fixToHundred() {
    if (total === 0) {
      setOverrides(Object.fromEntries(symbols.map((s, i) => [s, equalSplit[i] ?? 0])));
      return;
    }
    const scaled = weights.map((w) => Math.round((w / total) * 100));
    const drift = 100 - scaled.reduce((a, b) => a + b, 0);
    if (drift !== 0 && scaled.length > 0) {
      const target = scaled.indexOf(Math.max(...scaled));
      scaled[target] = (scaled[target] ?? 0) + drift;
    }
    setOverrides(Object.fromEntries(symbols.map((s, i) => [s, Math.max(0, scaled[i] ?? 0)])));
  }

  // --- Donut geometry --------------------------------------------------------
  let cursor = 0;
  const arcs = weights.map((w, i) => {
    const fraction = w / safeTotal;
    const length = fraction * CIRCUMFERENCE;
    const arc = { offset: -cursor * CIRCUMFERENCE, length, paint: SLICE_PAINT[i % SLICE_PAINT.length]! };
    cursor += fraction;
    return arc;
  });

  return (
    <div className="space-y-5">
      {/* --- Header --------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={total === 100 ? "positive" : overAllocated ? "negative" : "caution"}>
            {total === 100
              ? "Fully allocated"
              : overAllocated
                ? `Over by ${total - 100} points`
                : `${100 - total} points unallocated`}
          </Badge>
          {illustrative && <Badge tone="neutral">Illustrative names</Badge>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setOverrides(Object.fromEntries(symbols.map((s, i) => [s, equalSplit[i] ?? 0])))
            }
          >
            Equal weight
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={fixToHundred}
            disabled={total === 100}
          >
            <Wand2 className="h-3.5 w-3.5" aria-hidden />
            Fix to 100
          </Button>
        </div>
      </div>

      {/* --- Donut + readouts ---------------------------------------------- */}
      <Stage tone="grid" className="px-5 py-6 sm:px-7">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
          <div className="mx-auto">
            <svg
              viewBox="0 0 180 180"
              className="h-52 w-52"
              role="img"
              aria-label={`Allocation: ${symbols
                .map((s, i) => `${s} ${Math.round((weights[i]! / safeTotal) * 100)}%`)
                .join(", ")}`}
            >
              <circle
                cx="90"
                cy="90"
                r={RADIUS}
                fill="none"
                strokeWidth="24"
                style={{ stroke: "var(--color-surface-sunken)" }}
              />
              <g transform="rotate(-90 90 90)">
                {arcs.map((arc, i) => (
                  <circle
                    key={symbols[i]}
                    cx="90"
                    cy="90"
                    r={RADIUS}
                    fill="none"
                    strokeWidth="24"
                    strokeDasharray={`${arc.length} ${CIRCUMFERENCE - arc.length}`}
                    strokeDashoffset={arc.offset}
                    style={{ stroke: arc.paint, transition: "stroke-dasharray 220ms ease, stroke-dashoffset 220ms ease" }}
                  />
                ))}
              </g>

              {/* The centre states the one number worth reading at a glance. */}
              <text
                x="90"
                y="84"
                textAnchor="middle"
                fontSize="10"
                letterSpacing="0.12em"
                style={{ fill: "var(--color-ink-subtle)", fontFamily: "var(--font-sans)", fontWeight: 700 }}
              >
                HOLDINGS
              </text>
              <text
                x="90"
                y="110"
                textAnchor="middle"
                fontSize="28"
                style={{ fill: "var(--color-ink)", fontFamily: "var(--font-display)", fontWeight: 600 }}
              >
                {holdings}
              </text>
            </svg>
          </div>

          <div className="space-y-5">
            <Readout
              columns={2}
              items={[
                {
                  label: "Total allocated",
                  value: `${total}%`,
                  emphasis: true,
                  hint:
                    total === 100
                      ? "Every point has somewhere to go"
                      : overAllocated
                        ? "More than 100 points assigned"
                        : "Some points are still in cash",
                },
                {
                  label: "Concentration",
                  value: hhi.toFixed(0),
                  hint: "100 = one holding · 25 = four equal ones",
                },
                {
                  label: "Largest holding",
                  value: largestSymbol || "—",
                  hint: `${Math.round(((weights[largestIndex] ?? 0) / safeTotal) * 100)}% of the total`,
                },
                {
                  label: "A 50% fall in that one name",
                  value: `−${portfolioHit.toFixed(1)}%`,
                  hint: "Arithmetic, not a forecast",
                },
              ]}
            />

            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {symbols.map((symbol, i) => (
                <li key={symbol} className="flex items-center gap-2 text-[0.8125rem] text-ink-muted">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                    style={{ background: SLICE_PAINT[i % SLICE_PAINT.length] }}
                  />
                  <span className="font-mono text-[0.75rem] text-ink">{symbol}</span>
                  <span className="tabular-nums">{Math.round((weights[i]! / safeTotal) * 100)}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Stage>

      {/* --- Sliders -------------------------------------------------------- */}
      <div className="grid gap-5 rounded-xl border border-line bg-surface px-5 py-5 sm:grid-cols-2">
        {symbols.map((symbol, i) => (
          <Slider
            key={symbol}
            id={`alloc-${symbol}`}
            label={names[symbol] ? `${symbol} — ${names[symbol]}` : symbol}
            min={0}
            max={100}
            step={1}
            value={weights[i] ?? 0}
            onChange={(value) => setOverrides((current) => ({ ...current, [symbol]: value }))}
            display={`${weights[i] ?? 0}%`}
          />
        ))}
      </div>

      {/* --- Stress test ---------------------------------------------------- */}
      <div className="rounded-xl border border-line bg-surface-muted px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[0.6875rem] uppercase tracking-[0.13em] text-ink-subtle">
              Stress test
            </p>
            <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-muted">
              Which holding are you imagining halves?
            </p>
          </div>
          <Segmented
            label="Which holding halves"
            value={String(shock)}
            onChange={(value) => setShockIndex(Number(value))}
            options={symbols.map((symbol, i) => ({ id: String(i), label: symbol }))}
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Mini label="That holding" value={`${Math.round((shockWeight / safeTotal) * 100)}%`} />
          <Mini label="Its value falls by" value="50%" />
          <Mini
            label="Your total falls by"
            value={`${portfolioHit.toFixed(1)}%`}
            emphasis
          />
        </div>

        <p className="mt-4 max-w-prose text-[0.875rem] leading-relaxed text-ink-muted">
          {holdings <= 1
            ? "With a single holding, the portfolio does whatever that one name does. That is not a strategy, it is a single point of failure wearing a portfolio's clothes."
            : `Because ${symbols[shock]} is ${Math.round((shockWeight / safeTotal) * 100)}% of the total, half of it disappearing takes ${portfolioHit.toFixed(1)}% off the whole thing. Change the sliders and watch that second number move — it is the only honest way to feel what concentration costs.`}
        </p>
      </div>

      {/* --- Hand-off ------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-teal-line bg-teal-soft/60 px-5 py-4">
        <p className="max-w-prose text-[0.875rem] leading-relaxed text-ink">
          Want to see what these weights would have cost to build? The simulator prices the whole
          basket with simulated capital — no wallet, no order, nothing that touches a market.
        </p>
        <Button as="link" href="/simulate" variant="quiet" size="sm">
          Open the simulator
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      <WidgetNote tone="caution">
        An exercise in arithmetic, not a recommendation. Nothing here is advice about what to hold,
        and no weighting is endorsed — the point is to make the consequences of a choice visible
        before you make one.
      </WidgetNote>
    </div>
  );
}

// -----------------------------------------------------------------------------

/**
 * The Herfindahl–Hirschman index of an allocation, on a 0–100 scale.
 *
 * 100 means everything in one name; 25 means four equal names; it falls towards
 * zero as the basket spreads out. Computed over the *proportions*, so it stays
 * meaningful even while the sliders do not yet sum to 100.
 *
 * Decimal rather than float, for the same reason as everything else here: a
 * figure this product shows a learner should not depend on binary rounding.
 */
export function concentrationIndex(weights: number[]): number {
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total === 0) return 0;

  const sumSquares = weights.reduce(
    (sum, w) => sum.plus(new Decimal(w).div(total).pow(2)),
    new Decimal(0),
  );

  return sumSquares.times(100).toDecimalPlaces(2).toNumber();
}

function Mini({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface px-4 py-3">
      <p className="text-[0.6875rem] uppercase tracking-widest text-ink-subtle">{label}</p>
      <p
        className={cn(
          "mt-1 font-mono tabular-nums",
          emphasis ? "text-[1.25rem] font-medium text-teal-strong" : "text-[0.9375rem] text-ink",
        )}
      >
        {value}
      </p>
    </div>
  );
}
