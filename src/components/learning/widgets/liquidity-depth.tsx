"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Decimal, formatCurrency, formatPercent, formatQuantity } from "@/lib/calculations/money";
import { PAINT, Readout, Segmented, Slider, Stage, WidgetNote } from "./parts";
import type { WidgetProps } from "./types";

/**
 * What "liquidity" actually costs you.
 *
 * Liquidity is one of those words that sounds like a property of an asset and is
 * really a property of a *pool* — and the amount of it decides how much your own
 * order moves the price against you. So this widget is built around one
 * comparison: the same trade, three differently-sized pools, all quoting the
 * same price before you touch them.
 *
 * The curve is a constant-product pool drawn honestly: reserves on both axes,
 * the trade as a chord rather than a slide along the curve, and the two points
 * labelled. Learners who have seen the chord will never again read a "price" as
 * a thing that is simply true.
 *
 * Every figure here is an illustrative pool, and the widget says so on its face.
 * None of it is a quote for a real asset, and none of it is a forecast.
 */

const POOLS = [
  { id: "deep", label: "Deep", quote: "5000000", base: "50000", note: "A large, well-funded pool" },
  { id: "typical", label: "Typical", quote: "500000", base: "5000", note: "A mid-sized token pool" },
  { id: "thin", label: "Thin", quote: "50000", base: "500", note: "A newly listed pool" },
] as const;

type PoolId = (typeof POOLS)[number]["id"];
type Side = "buy" | "sell";

/** The slider's endpoints, as a percentage of the pool's own reserves. */
const P_MIN = 0.05;
const P_MAX = 40;
const toPercent = (t: number) => P_MIN * Math.pow(P_MAX / P_MIN, t / 100);

const PLOT = { x0: 52, y0: 18, w: 520, h: 232 } as const;

export function LiquidityDepth(_props: WidgetProps) {
  const [poolId, setPoolId] = useState<PoolId>("typical");
  const [side, setSide] = useState<Side>("buy");
  const [t, setT] = useState(42);

  const pool = POOLS.find((p) => p.id === poolId) ?? POOLS[1];
  const sizePct = toPercent(t);

  const model = useMemo(() => {
    const Q0 = new Decimal(pool.quote);
    const B0 = new Decimal(pool.base);
    const k = Q0.times(B0);
    const midBefore = Q0.div(B0);

    const fraction = new Decimal(sizePct).div(100);

    let amountIn: Decimal;
    let amountOut: Decimal;
    let unit: string;
    let newQ: Decimal;
    let newB: Decimal;

    if (side === "buy") {
      amountIn = Q0.times(fraction);
      newQ = Q0.plus(amountIn);
      newB = k.div(newQ);
      amountOut = B0.minus(newB);
      unit = "USDT";
    } else {
      amountIn = B0.times(fraction);
      newB = B0.plus(amountIn);
      newQ = k.div(newB);
      amountOut = Q0.minus(newQ);
      unit = "TOKEN";
    }

    const execution = amountOut.isZero() ? midBefore : amountIn.div(amountOut);
    const midAfter = newQ.div(newB);
    const impact = execution.div(midBefore).minus(1).times(100);

    // Cost of trading at the execution price instead of at the mid. In both
    // directions the pool sells to you above the mid and buys from you below
    // it, so this is a cost either way — which is the whole point of the panel.
    const slippageCost =
      side === "buy"
        ? amountIn.minus(amountOut.times(midBefore))
        : amountIn.times(midBefore).minus(amountOut);

    return {
      Q0,
      B0,
      k,
      midBefore,
      midAfter,
      amountIn,
      amountOut,
      unit,
      execution,
      impact,
      impactAbs: impact.abs(),
      slippageCost: slippageCost.abs(),
      newQ,
      newB,
    };
  }, [pool, side, sizePct]);

  // --- Curve geometry --------------------------------------------------------
  // Plain numbers from here down: this is drawing, not accounting. The money
  // arithmetic above is all Decimal.
  const Q0n = model.Q0.toNumber();
  const B0n = model.B0.toNumber();
  const kn = model.k.toNumber();

  const scale = { lo: 0.45, hi: 2.0 };
  const px = (q: number) => PLOT.x0 + ((q / Q0n - scale.lo) / (scale.hi - scale.lo)) * PLOT.w;
  const py = (b: number) => PLOT.y0 + (1 - (b / B0n - scale.lo) / (scale.hi - scale.lo)) * PLOT.h;

  const curve = (() => {
    const points: string[] = [];
    // Only sample where the curve stays inside the visible box.
    const qLo = Q0n / scale.hi;
    const qHi = Q0n / scale.lo;
    for (let i = 0; i <= 120; i++) {
      const q = qLo + ((qHi - qLo) * i) / 120;
      const b = kn / q;
      points.push(`${i === 0 ? "M" : "L"} ${px(q).toFixed(2)} ${py(b).toFixed(2)}`);
    }
    return points.join(" ");
  })();

  const before = { x: px(Q0n), y: py(B0n) };
  const after = { x: px(model.newQ.toNumber()), y: py(model.newB.toNumber()) };

  // How much of the quote reserve it takes to move the mid price by N%.
  const depth = [1, 5, 10].map((pct) => ({
    pct,
    quote: model.Q0.times(new Decimal(1 + pct / 100).sqrt().minus(1)),
  }));

  const severe = model.impact.abs().greaterThan(5);
  const notable = model.impact.abs().greaterThan(0.5);

  return (
    <div className="space-y-5">
      {/* --- Controls ------------------------------------------------------- */}
      <div className="grid gap-5 rounded-xl border border-line bg-surface px-5 py-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-[0.6875rem] uppercase tracking-widest text-ink-subtle">
            Pool depth
          </p>
          <Segmented
            label="Pool depth"
            value={poolId}
            onChange={(value) => setPoolId(value as PoolId)}
            options={POOLS.map((p) => ({ id: p.id, label: p.label, hint: p.note }))}
          />
          <p className="mt-2 font-mono text-[0.75rem] text-ink-subtle">
            {formatCurrency(pool.quote, { decimals: 0, placeholder: "—" })} +{" "}
            {formatQuantity(pool.base)} TOKEN
          </p>
        </div>

        <div>
          <p className="mb-2 text-[0.6875rem] uppercase tracking-widest text-ink-subtle">
            Your order
          </p>
          <Segmented
            label="Order side"
            value={side}
            onChange={(value) => setSide(value as Side)}
            options={[
              { id: "buy", label: "Buy TOKEN" },
              { id: "sell", label: "Sell TOKEN" },
            ]}
          />
          <div className="mt-3">
            <Slider
              id="liq-size"
              label="Order size"
              min={0}
              max={100}
              step={0.5}
              value={t}
              onChange={setT}
              display={`${sizePct.toFixed(2)}% of the pool`}
              hint={`${side === "buy" ? "Paying" : "Selling"} ${formatQuantity(model.amountIn)} ${model.unit}`}
            />
          </div>
        </div>
      </div>

      {/* --- The curve ------------------------------------------------------ */}
      <Stage tone="grid" className="p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-[1.0625rem] font-semibold tracking-[-0.01em] text-ink">
              The reserve curve
            </p>
            <p className="text-[0.8125rem] text-ink-muted">
              Every point on this line is a possible state of the pool
            </p>
          </div>
          <Badge tone={severe ? "negative" : notable ? "caution" : "positive"}>
            {formatPercent(model.impactAbs, { signed: false })} price impact
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <svg
            viewBox="0 0 620 320"
            className="h-auto w-full min-w-lg"
            role="img"
            aria-label={`An illustrative constant-product pool. Trading ${formatQuantity(model.amountIn)} ${model.unit} moves the price from ${formatCurrency(model.midBefore.toString())} to ${formatCurrency(model.midAfter.toString())}, a price impact of ${formatPercent(model.impactAbs, { signed: false })}.`}
          >
            <defs>
              <marker id="liq-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" style={{ fill: PAINT.teal }} />
              </marker>
            </defs>

            {/* Axes */}
            <line x1={PLOT.x0} y1={PLOT.y0 + PLOT.h} x2={PLOT.x0 + PLOT.w} y2={PLOT.y0 + PLOT.h} strokeWidth={1} style={{ stroke: PAINT.lineStrong }} />
            <line x1={PLOT.x0} y1={PLOT.y0} x2={PLOT.x0} y2={PLOT.y0 + PLOT.h} strokeWidth={1} style={{ stroke: PAINT.lineStrong }} />

            {/* Guides at the starting reserves. */}
            <line x1={before.x} y1={before.y} x2={before.x} y2={PLOT.y0 + PLOT.h} strokeWidth={1} strokeDasharray="3 4" style={{ stroke: PAINT.line }} />
            <line x1={PLOT.x0} y1={before.y} x2={before.x} y2={before.y} strokeWidth={1} strokeDasharray="3 4" style={{ stroke: PAINT.line }} />

            {/* The curve. */}
            <path d={curve} fill="none" strokeWidth={2} style={{ stroke: PAINT.tealLine }} />

            {/* The trade, as a chord — not a slide along the curve. */}
            <line
              x1={before.x}
              y1={before.y}
              x2={after.x}
              y2={after.y}
              strokeWidth={2}
              markerEnd="url(#liq-arrow)"
              style={{ stroke: PAINT.teal }}
            />

            {/* Before */}
            <circle cx={before.x} cy={before.y} r={5.5} style={{ fill: PAINT.surface, stroke: PAINT.muted, strokeWidth: 2 }} />
            <text x={before.x + 12} y={before.y - 10} fontSize="10" letterSpacing="0.1em" style={{ fill: PAINT.muted, fontFamily: "var(--font-sans)", fontWeight: 700 }}>
              BEFORE
            </text>

            {/* After */}
            <circle cx={after.x} cy={after.y} r={6} style={{ fill: PAINT.teal }} />
            <text
              x={after.x + 12}
              y={after.y + 16}
              fontSize="10"
              letterSpacing="0.1em"
              style={{ fill: PAINT.tealStrong, fontFamily: "var(--font-sans)", fontWeight: 700 }}
            >
              AFTER
            </text>

            {/* Axis labels */}
            <text x={PLOT.x0 + PLOT.w} y={PLOT.y0 + PLOT.h + 22} textAnchor="end" fontSize="10" letterSpacing="0.1em" style={{ fill: PAINT.subtle, fontFamily: "var(--font-sans)" }}>
              USDT RESERVE →
            </text>
            <text x={PLOT.x0 - 34} y={PLOT.y0 + 4} fontSize="10" letterSpacing="0.1em" style={{ fill: PAINT.subtle, fontFamily: "var(--font-sans)" }}>
              ↑ TOKEN
            </text>
            <text x={PLOT.x0 - 34} y={PLOT.y0 + 18} fontSize="10" letterSpacing="0.1em" style={{ fill: PAINT.subtle, fontFamily: "var(--font-sans)" }}>
              RESERVE
            </text>

            <text x={PLOT.x0 + PLOT.w / 2} y={PLOT.y0 + PLOT.h + 44} textAnchor="middle" fontSize="11" style={{ fill: PAINT.subtle, fontFamily: "var(--font-mono)" }}>
              reserves always multiply to the same constant
            </text>
          </svg>
        </div>
      </Stage>

      {/* --- Numbers -------------------------------------------------------- */}
      <Readout
        columns={4}
        items={[
          {
            label: "Mid before",
            value: formatCurrency(model.midBefore.toString()),
            hint: "Reserves divided",
          },
          {
            label: "Your average price",
            value: formatCurrency(model.execution.toString()),
            hint: "What you actually paid or received",
          },
          {
            label: "Price impact",
            value: formatPercent(model.impactAbs, { signed: false }),
            emphasis: true,
          },
          {
            label: "Mid after",
            value: formatCurrency(model.midAfter.toString()),
            hint: "Your own trade moved it",
          },
        ]}
      />

      <div
        className={cn(
          "rounded-xl border px-5 py-4",
          severe ? "border-danger/30 bg-danger-soft" : notable ? "border-warning/25 bg-warning-soft" : "border-line bg-surface-muted",
        )}
      >
        <p
          className={cn(
            "text-[0.6875rem] font-semibold uppercase tracking-[0.12em]",
            severe ? "text-danger" : notable ? "text-warning" : "text-ink-subtle",
          )}
        >
          What the depth costs you
        </p>
        <p className="mt-1.5 max-w-prose text-[0.9375rem] leading-relaxed text-ink">
          You {side === "buy" ? "paid" : "received"}{" "}
          <span className="font-mono tabular-nums">
            {formatQuantity(model.amountIn)} {model.unit}
          </span>{" "}
          and {side === "buy" ? "received" : "gave up"}{" "}
          <span className="font-mono tabular-nums">
            {formatQuantity(model.amountOut)} {side === "buy" ? "TOKEN" : "USDT"}
          </span>
          . At the mid price that would have been{" "}
          <span className="font-mono tabular-nums">
            {formatCurrency(
              (side === "buy"
                ? model.amountOut.times(model.midBefore)
                : model.amountIn.times(model.midBefore)
              ).toString(),
            )}
          </span>{" "}
          — so the difference,{" "}
          <span className="font-mono tabular-nums">{formatCurrency(model.slippageCost.toString())}</span>,
          is what the pool charged for the privilege of trading at this size.{" "}
          {severe
            ? "In a pool this thin, an order this size is most of the market. The price you got is not the price you saw."
            : notable
              ? "Note that the impact scales with the square of your size relative to the pool, so doubling the order roughly quadruples the cost."
              : "In a pool this deep, your order barely registers. That is what liquidity buys — and it is rented, not owned."}
        </p>
      </div>

      {/* --- Depth table ---------------------------------------------------- */}
      <div className="rounded-xl border border-line bg-surface px-5 py-4">
        <p className="text-[0.6875rem] uppercase tracking-widest text-ink-subtle">
          How much it takes to move this pool
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {depth.map((row) => (
            <div key={row.pct} className="rounded-lg border border-line bg-surface-muted px-4 py-3">
              <p className="text-[0.75rem] text-ink-muted">To move the price {row.pct}%</p>
              <p className="mt-1 font-mono text-[1rem] tabular-nums text-ink">
                {formatCurrency(row.quote.toString(), { decimals: 0 })}
              </p>
              <p className="mt-0.5 text-[0.6875rem] text-ink-subtle">of buying pressure</p>
            </div>
          ))}
        </div>
        <p className="mt-3 max-w-prose text-[0.8125rem] leading-relaxed text-ink-subtle">
          Depth is measured in the local currency of the pool. The same 10,000 USDT order is a
          rounding error in one pool and a market-moving event in another — which is why a price
          without a size attached to it is only half a fact.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-teal-line bg-teal-soft/60 px-5 py-4">
        <p className="max-w-prose text-[0.875rem] leading-relaxed text-ink">
          You can check whether any of this is true on a real asset. The Explore page shows the
          on-chain price next to the reference price, for tokens that are actually deployed.
        </p>
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 text-[0.875rem] font-medium text-teal-strong underline-offset-4 hover:underline"
        >
          Compare real assets
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      <WidgetNote tone="caution">
        An illustrative constant-product pool, drawn to show a mechanism. It is not a quote, not a
        real pool, and not a prediction of what any token would cost to trade. Real pools have fees,
        multiple assets and behaviour this model ignores.
      </WidgetNote>
    </div>
  );
}
