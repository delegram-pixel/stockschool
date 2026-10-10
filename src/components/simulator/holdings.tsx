"use client";

import { Card, Eyebrow } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Decimal, formatCurrency, formatPercent, formatQuantity } from "@/lib/calculations/money";
import type { Holding, PortfolioValuation } from "@/lib/simulation/engine";
import { describeConcentration } from "@/lib/simulation/engine";

/**
 * What you hold, and how it is spread.
 *
 * Two panels that belong together because they answer the same question from
 * different angles: the table says *what*, the allocation bar says *how much of
 * your money each one is*. A beginner who only ever sees the table learns a list
 * of tickers; the bar is what turns that list into a portfolio, and the
 * concentration read underneath is the first piece of genuine investment
 * literacy the course offers.
 *
 * The gain/loss colouring follows the same rule as the rest of the product:
 * teal and a warm amber, never green and red. Red-for-loss is a casino
 * convention, and this is a classroom.
 */

// -----------------------------------------------------------------------------
// Holdings
// -----------------------------------------------------------------------------

export function HoldingsTable({
  valuation,
  onSell,
}: {
  valuation: PortfolioValuation;
  onSell: (assetId: string) => void;
}) {
  if (valuation.holdings.length === 0) {
    return (
      <Card padding="lg">
        <Eyebrow>Holdings</Eyebrow>
        <p className="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-ink-muted">
          Nothing in the portfolio yet. Place a simulated buy and it will appear here, with the
          running cost basis and the hypothetical gain beside it.
        </p>
      </Card>
    );
  }

  return (
    <Card padding="none">
      <div className="flex items-center justify-between gap-4 px-6 pt-6">
        <Eyebrow>Holdings</Eyebrow>
        {valuation.hasUnpricedHoldings && (
          <span className="text-[0.75rem] text-warning">
            Some positions have no price and are excluded from the totals
          </span>
        )}
      </div>

      {/* A real table, with a scroll container. The alternative — collapsing the
          rows into cards on a narrow screen — hides the column relationships,
          and the whole lesson here is comparing one column across rows. */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-[0.875rem]">
          <caption className="sr-only">
            Simulated holdings with quantity, average cost, current price and hypothetical gain
          </caption>
          <thead>
            <tr className="border-y border-line text-left">
              <Th>Asset</Th>
              <Th align="right">Quantity</Th>
              <Th align="right">Avg cost</Th>
              <Th align="right">Price</Th>
              <Th align="right">Value</Th>
              <Th align="right">Unrealised</Th>
              {/* "Of holdings", not "Share": the engine's `allocationPercent`
                  divides by *invested* value, while the allocation panel below
                  divides by the whole portfolio including cash. Two honest
                  numbers with different denominators, so they cannot both be
                  called "Share". */}
              <Th align="right">Of holdings</Th>
              <Th align="right">
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {valuation.holdings.map((holding) => (
              <HoldingRow key={holding.position.assetId} holding={holding} onSell={onSell} />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function HoldingRow({
  holding,
  onSell,
}: {
  holding: Holding;
  onSell: (assetId: string) => void;
}) {
  const { position, unrealisedGain, unrealisedGainPercent } = holding;
  const gainTone = !unrealisedGain || unrealisedGain.isZero()
    ? "text-ink-muted"
    : unrealisedGain.isPositive()
      ? "text-teal-strong"
      : "text-warning";

  return (
    <tr className="border-b border-line-faint last:border-b-0 hover:bg-surface-muted/60">
      <td className="px-6 py-3.5">
        <span className="block font-medium text-ink">{position.name}</span>
        <span className="font-mono text-[0.75rem] text-ink-subtle">{position.symbol}</span>
      </td>

      <Td mono>{formatQuantity(position.quantity, 4)}</Td>
      <Td mono>{formatCurrency(position.averageCost)}</Td>
      <Td mono>
        {holding.price ? (
          formatCurrency(holding.price)
        ) : (
          // Not a dash: a missing quote is the reason the row is excluded from
          // the totals, and saying so is more useful than a glyph.
          <span className="text-[0.75rem] text-ink-subtle">no price</span>
        )}
      </Td>
      <Td mono>{formatCurrency(holding.marketValue)}</Td>

      <Td mono className={gainTone}>
        {unrealisedGain ? (
          <>
            <span className="block">
              {unrealisedGain.isPositive() ? "+" : unrealisedGain.isNegative() ? "−" : ""}
              {formatCurrency(unrealisedGain.abs())}
            </span>
            {unrealisedGainPercent && (
              <span className="block text-[0.75rem]">
                {formatPercent(unrealisedGainPercent, { decimals: 2, signed: false })}
              </span>
            )}
          </>
        ) : (
          "—"
        )}
      </Td>

      <Td mono>{formatPercent(holding.allocationPercent, { decimals: 0, signed: false })}</Td>

      <td className="px-6 py-3.5 text-right">
        <button
          type="button"
          onClick={() => onSell(position.assetId)}
          className="rounded-lg px-2.5 py-1 text-[0.75rem] font-medium text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
        >
          Sell
        </button>
      </td>
    </tr>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap px-6 py-2.5 font-mono text-[0.625rem] font-medium uppercase tracking-[0.12em] text-ink-subtle",
        align === "right" && "text-right",
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  mono = false,
  className,
}: {
  children: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <td
      data-numeric={mono ? "" : undefined}
      className={cn(
        "whitespace-nowrap px-6 py-3.5 text-right text-ink",
        mono && "font-mono",
        className,
      )}
    >
      {children}
    </td>
  );
}

// -----------------------------------------------------------------------------
// Allocation
// -----------------------------------------------------------------------------

/**
 * A fixed palette for allocation segments.
 *
 * Deliberately a short, ordered list of *hues* rather than a generated gradient:
 * positions must be distinguishable at a glance, and an interpolated ramp
 * produces four near-identical teals that no one can tell apart. The tokens live
 * in `globals.css` because a slice of a chart is a *category* — reusing a
 * semantic colour like `warning` for one would make an ordinary diversification
 * read as an alert, and a raw hex here would be the only untested colour in the
 * product.
 *
 * Cash is always the last segment and always neutral, because it is the one
 * slice that is not an investment.
 */
const SEGMENT_COLOURS = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
  "bg-chart-6",
] as const;

export function AllocationPanel({ valuation }: { valuation: PortfolioValuation }) {
  const concentration = describeConcentration(valuation);

  /*
   * Cash is part of the picture. A learner who has put 90% of their virtual
   * money into one stock and is shown a bar that says "100% NVDA" has been told
   * the truth about their holdings and a lie about their portfolio.
   *
   * The weights below are computed here against *this* denominator — cash plus
   * every valued slice — rather than taken from `holding.allocationPercent`,
   * which divides by invested value alone. Mixing the two would give a bar whose
   * segments add up to more than its own width, and the flexbox shrink that
   * would quietly paper over it is not a thing to rely on. One denominator,
   * stated: the portfolio as we can best value it.
   */
  const slices = valuation.holdings.map((holding, index) => ({
    key: holding.position.assetId,
    label: holding.position.symbol,
    // An unpriced position falls back to its cost basis — the caveat banner
    // above the table is what tells the reader that slice is an estimate.
    value: holding.marketValue ?? holding.costBasis,
    colour: SEGMENT_COLOURS[index % SEGMENT_COLOURS.length]!,
  }));

  const denominator = slices.reduce((sum, slice) => sum.plus(slice.value), valuation.cash);

  const segments = [
    ...slices.map((slice) => ({
      ...slice,
      weight: denominator.isPositive() ? slice.value.div(denominator).times(100) : null,
    })),
    {
      key: "__cash__",
      label: "Cash",
      value: valuation.cash,
      colour: "bg-line-strong",
      weight: denominator.isPositive() ? valuation.cash.div(denominator).times(100) : null,
    },
  ].filter((segment): segment is typeof segment & { weight: Decimal } => segment.weight !== null);

  return (
    <Card padding="lg">
      <Eyebrow>How it&rsquo;s spread</Eyebrow>

      {segments.length === 0 ? (
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-muted">
          {concentration.detail}
        </p>
      ) : (
        <>
          {/* One bar, proportional widths. `role="img"` with a label because the
              bar is a chart: the legend below carries the numbers, and a screen
              reader gets the summary sentence rather than eight unlabelled
              percentages. */}
          <div
            role="img"
            aria-label={`Allocation: ${segments
              .map((segment) => `${segment.label} ${segment.weight.toFixed(0)}%`)
              .join(", ")}`}
            className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-surface-muted"
          >
            {segments.map((segment) => (
              <span
                key={segment.key}
                className={cn(
                  "h-full border-l border-canvas first:border-l-0",
                  segment.colour,
                )}
                // The hairline between slices is a `border-l` rather than a gap,
                // because Tailwind's preflight sets `box-sizing: border-box`:
                // the border is drawn *inside* the declared width, so the widths
                // keep summing to exactly 100% and stay proportional.
                style={{ width: `${segment.weight.toNumber()}%` }}
              />
            ))}
          </div>

          <ul className="mt-5 space-y-2.5">
            {segments.map((segment) => (
              <li key={segment.key} className="flex items-center gap-3 text-[0.8125rem]">
                <span
                  aria-hidden
                  className={cn("h-2.5 w-2.5 shrink-0 rounded-[3px]", segment.colour)}
                />
                <span className="min-w-0 flex-1 truncate font-medium text-ink">
                  {segment.label}
                </span>
                <span className="font-mono tabular-nums text-ink-muted">
                  {formatCurrency(segment.value)}
                </span>
                <span className="w-12 shrink-0 text-right font-mono tabular-nums text-ink-subtle">
                  {formatPercent(segment.weight, { decimals: 0, signed: false })}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-6 border-t border-line pt-5">
        <p
          className={cn(
            "text-[0.875rem] font-semibold",
            concentration.level === "concentrated" ? "text-warning" : "text-ink",
          )}
        >
          {concentration.headline}
        </p>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-muted">
          {concentration.detail}
        </p>
      </div>
    </Card>
  );
}
