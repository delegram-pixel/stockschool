"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Decimal, formatCurrency, formatPercent, formatSignedCurrency, toDecimal } from "@/lib/calculations/money";
import { comparePrices, describeDifference } from "@/lib/calculations/price-difference";
import { PAINT, Readout, Segmented, Slider, Stage, WidgetNote } from "./parts";
import type { WidgetProps } from "./types";

/**
 * Two prices for one asset, on one axis.
 *
 * The whole subject lives in this gap, so the widget is built to make the gap's
 * *size* legible rather than merely its direction. The default scale is a fixed
 * ±5% window around the reference price, which means a 0.3% difference really
 * does look like a hairline — the alternative, auto-scaling to the difference,
 * would render every gap as the same impressive width and teach the opposite of
 * the truth.
 *
 * The "close-up" scale is there for the cases where a hairline is the point.
 * Both scales label their range on the axis, so neither can mislead.
 *
 * The what-if slider is opt-in and says so on the label at all times. It exists
 * because the relationship between two prices is much easier to feel by moving
 * one than by reading a percentage — and because a learner who has watched the
 * gap respond to a 2% nudge is far less likely to read a 2% real gap as free
 * money.
 */

type Scale = "market" | "closeup";

const PLOT = { x0: 46, x1: 674, axisY: 190, top: 54 } as const;

export function PriceComparison({ assets }: WidgetProps) {
  // Only assets with both prices are useful here. An asset with one price is
  // not a comparison, it is a row with an em-dash in it.
  const comparable = useMemo(
    () => assets.filter((asset) => asset.price !== null && asset.referencePrice !== null),
    [assets],
  );

  const [symbol, setSymbol] = useState<string | null>(null);
  const [scale, setScale] = useState<Scale>("market");
  const [shift, setShift] = useState(0);
  const [hypothetical, setHypothetical] = useState(false);

  const selected =
    comparable.find((asset) => asset.symbol === symbol) ?? comparable[0] ?? null;

  if (!selected) {
    return (
      <Stage tone="grid" className="px-6 py-14 text-center">
        <p className="font-display text-[1.0625rem] font-semibold text-ink">
          No comparison available right now
        </p>
        <p className="mx-auto mt-2 max-w-md text-[0.875rem] leading-relaxed text-ink-muted">
          This figure needs an asset with both an on-chain price and a reference price. None of the
          assets currently loaded have both, so we are showing nothing rather than inventing a
          number.
        </p>
      </Stage>
    );
  }

  const reference = toDecimal(selected.referencePrice)!;
  const onChain = toDecimal(selected.price)!;
  // The slider is a *hypothetical* nudge, applied on top of the real quote.
  const plotted = hypothetical ? onChain.times(new Decimal(1).plus(new Decimal(shift).div(100))) : onChain;

  const comparison = comparePrices(plotted.toString(), reference.toString());
  const gapPercent = comparison ? comparison.raw.percent : null;

  // --- Axis domain ---------------------------------------------------------
  // "market" is always ±5% of the reference, so the visual width of the gap is
  // proportional to the real size of the gap. "closeup" fits the actual spread.
  const half = reference.times("0.05");
  const spread = plotted.minus(reference).abs();
  const closeupHalf = Decimal.max(spread.times("1.5"), reference.times("0.001"));

  const lo = scale === "market" ? reference.minus(half) : reference.minus(closeupHalf);
  const hi = scale === "market" ? reference.plus(half) : reference.plus(closeupHalf);
  const domain = hi.minus(lo).toNumber() || 1;

  function x(price: Decimal): number {
    const t = price.minus(lo).toNumber() / domain;
    return PLOT.x0 + t * (PLOT.x1 - PLOT.x0);
  }

  const xRef = x(reference);
  const xRaw = x(plotted);
  const xChain = Math.min(Math.max(xRaw, PLOT.x0), PLOT.x1);
  const clipped = Math.abs(xRaw - xChain) > 0.5;

  const bandLeft = Math.min(xRef, xChain);
  const bandWidth = Math.max(Math.abs(xRef - xChain), 1);

  const stemTopFor = (which: "ref" | "chain") => (which === "ref" ? PLOT.top + 46 : PLOT.top);

  const anchor = (px: number) => (px < PLOT.x0 + 90 ? "start" : px > PLOT.x1 - 90 ? "end" : "middle");
  const labelX = (px: number) => (px < PLOT.x0 + 90 ? PLOT.x0 : px > PLOT.x1 - 90 ? PLOT.x1 : px);

  const direction = comparison?.difference.direction ?? "parity";

  return (
    <div className="space-y-5">
      {/* --- Which asset ---------------------------------------------------- */}
      {comparable.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[0.75rem] uppercase tracking-[0.1em] text-ink-subtle">Asset</span>
          <Segmented
            label="Choose an asset to compare"
            value={selected.symbol}
            onChange={(value) => {
              setSymbol(value);
              setShift(0);
            }}
            options={comparable.map((asset) => ({
              id: asset.symbol,
              label: asset.underlyingSymbol ?? asset.symbol,
            }))}
          />
        </div>
      )}

      {/* --- The axis ------------------------------------------------------- */}
      <Stage tone="grid" className="p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-display text-[1.0625rem] font-semibold tracking-[-0.01em] text-ink">
              {selected.companyName ?? selected.name}
            </p>
            <p className="truncate font-mono text-[0.75rem] text-ink-subtle">
              {selected.symbol}
              {selected.chainName ? ` · ${selected.chainName}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hypothetical && shift !== 0 && <Badge tone="info">Hypothetical</Badge>}
            <Badge
              tone={
                direction === "parity" ? "neutral" : direction === "premium" ? "caution" : "accent"
              }
            >
              {direction === "parity"
                ? "At parity"
                : `${formatPercent(gapPercent)} ${direction === "premium" ? "above" : "below"}`}
            </Badge>
          </div>
        </div>

        <svg
          viewBox="0 0 720 236"
          className="h-auto w-full"
          role="img"
          aria-label={`On-chain price ${formatCurrency(plotted.toString())} against a reference price of ${formatCurrency(reference.toString())}${
            gapPercent ? `, a difference of ${formatPercent(gapPercent)}` : ""
          }.`}
        >
          {/* The gap band. Nothing else in the drawing is coloured, so the eye
              goes straight to the distance between the two stems. */}
          <rect
            x={bandLeft}
            y={PLOT.top}
            width={bandWidth}
            height={PLOT.axisY - PLOT.top}
            style={{ fill: PAINT.tealSoft, opacity: 0.75 }}
          />

          {/* Reference stem — dashed, because it is the number we did not
              observe: it is reported by the equity market, not by the chain. */}
          <line
            x1={xRef}
            y1={PLOT.axisY}
            x2={xRef}
            y2={stemTopFor("ref")}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            style={{ stroke: PAINT.muted }}
          />
          <circle cx={xRef} cy={stemTopFor("ref")} r={3.5} style={{ fill: PAINT.muted }} />
          <text
            x={labelX(xRef)}
            y={stemTopFor("ref") - 12}
            textAnchor={anchor(xRef)}
            fontSize="10"
            letterSpacing="0.11em"
            style={{ fill: PAINT.muted, fontFamily: "var(--font-sans)", fontWeight: 700 }}
          >
            REFERENCE
          </text>
          <text
            x={labelX(xRef)}
            y={stemTopFor("ref") - 26}
            textAnchor={anchor(xRef)}
            fontSize="15"
            style={{ fill: PAINT.ink, fontFamily: "var(--font-mono)" }}
          >
            {formatCurrency(reference.toString())}
          </text>

          {/* On-chain stem — solid and teal: this is the number you can verify
              yourself, by reading the pool. */}
          <line
            x1={xChain}
            y1={PLOT.axisY}
            x2={xChain}
            y2={stemTopFor("chain")}
            strokeWidth={2.25}
            style={{ stroke: PAINT.teal }}
          />
          <circle cx={xChain} cy={stemTopFor("chain")} r={4.5} style={{ fill: PAINT.teal }} />
          <text
            x={labelX(xChain)}
            y={stemTopFor("chain") - 12}
            textAnchor={anchor(xChain)}
            fontSize="10"
            letterSpacing="0.11em"
            style={{ fill: PAINT.tealStrong, fontFamily: "var(--font-sans)", fontWeight: 700 }}
          >
            ON-CHAIN{clipped ? " ▸" : ""}
          </text>
          <text
            x={labelX(xChain)}
            y={stemTopFor("chain") - 26}
            textAnchor={anchor(xChain)}
            fontSize="15"
            style={{ fill: PAINT.tealStrong, fontFamily: "var(--font-mono)" }}
          >
            {formatCurrency(plotted.toString())}
          </text>

          {/* The gap, measured between the stems. */}
          {gapPercent !== null && Math.abs(gapPercent.toNumber()) >= 0.05 && (
            <>
              <line
                x1={bandLeft}
                y1={PLOT.top + 22}
                x2={bandLeft + bandWidth}
                y2={PLOT.top + 22}
                strokeWidth={1}
                style={{ stroke: PAINT.teal }}
              />
              <text
                x={bandLeft + bandWidth / 2}
                y={PLOT.top + 16}
                textAnchor="middle"
                fontSize="12"
                style={{ fill: PAINT.tealStrong, fontFamily: "var(--font-mono)", fontWeight: 500 }}
              >
                {formatPercent(gapPercent)}
              </text>
            </>
          )}

          {/* Axis */}
          <line
            x1={PLOT.x0}
            y1={PLOT.axisY}
            x2={PLOT.x1}
            y2={PLOT.axisY}
            strokeWidth={1}
            style={{ stroke: PAINT.lineStrong }}
          />
          {[lo, lo.plus(hi.minus(lo).div(2)), hi].map((tick, i) => (
            <g key={i}>
              <line
                x1={x(tick)}
                y1={PLOT.axisY}
                x2={x(tick)}
                y2={PLOT.axisY + 5}
                strokeWidth={1}
                style={{ stroke: PAINT.lineStrong }}
              />
              <text
                x={x(tick)}
                y={PLOT.axisY + 20}
                textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}
                fontSize="11"
                style={{ fill: PAINT.subtle, fontFamily: "var(--font-mono)" }}
              >
                {formatCurrency(tick.toString())}
              </text>
            </g>
          ))}
          <text
            x={(PLOT.x0 + PLOT.x1) / 2}
            y={PLOT.axisY + 38}
            textAnchor="middle"
            fontSize="10"
            letterSpacing="0.1em"
            style={{ fill: PAINT.subtle, fontFamily: "var(--font-sans)" }}
          >
            PRICE PER UNIT · {scale === "market" ? "±5% WINDOW" : "FITTED TO THE GAP"}
          </text>
        </svg>
      </Stage>

      {/* --- Controls ------------------------------------------------------- */}
      <div className="grid gap-5 rounded-xl border border-line bg-surface px-5 py-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-[0.75rem] uppercase tracking-[0.1em] text-ink-subtle">
            Axis range
          </p>
          <Segmented
            label="Axis range"
            value={scale}
            onChange={setScale}
            options={[
              { id: "market", label: "±5% window", hint: "Shows the gap at true scale" },
              { id: "closeup", label: "Close-up", hint: "Fits the axis to the gap" },
            ]}
          />
        </div>

        <div>
          <label className="flex cursor-pointer items-center gap-2.5 text-[0.875rem] text-ink">
            <input
              type="checkbox"
              checked={hypothetical}
              onChange={(event) => {
                setHypothetical(event.target.checked);
                if (!event.target.checked) setShift(0);
              }}
              className="h-4 w-4 accent-(--color-teal)"
            />
            What if the on-chain price moved?
          </label>
          {hypothetical ? (
            <div className="mt-3">
              <Slider
                id="pc-shift"
                label="Nudge the on-chain price"
                min={-10}
                max={10}
                step={0.1}
                value={shift}
                onChange={setShift}
                display={`${shift >= 0 ? "+" : ""}${shift.toFixed(1)}%`}
              />
              {shift !== 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => setShift(0)}
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                  Back to the real quote
                </Button>
              )}
            </div>
          ) : (
            <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-subtle">
              Both markers show real quotes. Switch this on to drag the on-chain price and watch the
              gap respond.
            </p>
          )}
        </div>
      </div>

      {/* --- Numbers -------------------------------------------------------- */}
      <Readout
        columns={4}
        items={[
          {
            label: "On-chain",
            value: formatCurrency(plotted.toString()),
            hint: "What the DEX pool is quoting",
          },
          {
            label: "Reference",
            value: formatCurrency(reference.toString()),
            hint: "What the equity market last reported",
          },
          {
            label: "Difference",
            value: comparison
              ? formatSignedCurrency(comparison.raw.absolute.toString())
              : "—",
          },
          {
            label: "As a share",
            value: formatPercent(gapPercent),
            emphasis: true,
          },
        ]}
      />

      <p className="max-w-prose text-[0.9375rem] leading-relaxed text-ink-muted">
        {describeDifference(comparison)}
      </p>

      <WidgetNote>
        Reported prices, not a tradable quote. Nothing on this page places an order, and a gap
        between two prices is a description of the market — not a suggestion about what to do with
        it.
      </WidgetNote>
    </div>
  );
}
