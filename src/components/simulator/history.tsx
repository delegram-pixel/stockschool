"use client";

import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Card, Eyebrow } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency, formatQuantity, formatSignedCurrency } from "@/lib/calculations/money";
import { computeRealisedGain } from "@/lib/simulation/engine";
import type { Portfolio, SimTransaction } from "@/lib/simulation/engine";

/**
 * The trade log, and what it adds up to.
 *
 * Every row here is a decision the learner made, which makes this the only panel
 * in the product that is entirely theirs. Two things follow from that:
 *
 *  1. **It never claims to be a record of the chain.** These are simulated
 *     fills. There is no transaction hash to link to, and inventing one would
 *     turn a practice exercise into a fabricated receipt. The panel says so once,
 *     in `SimulationDisclosure`'s voice, rather than on every row.
 *
 *  2. **It keeps the price source.** `priceSource` is stored on every
 *     transaction and shown here, because the single most interesting thing a
 *     learner can do in this simulator is place the *same order twice* — once
 *     against the reference price and once against the on-chain price — and then
 *     read the difference off their own history. A log that dropped the source
 *     would erase exactly the lesson the ticket was built to teach.
 *
 * The rows are ordered newest-first, which is the opposite of the array. The
 * array is append-only because that is what makes the cost-basis replay in
 * `computeRealisedGain` correct; the display order is a separate, presentational
 * decision.
 */

export function TransactionLog({ portfolio }: { portfolio: Portfolio }) {
  const transactions = [...portfolio.transactions].reverse();
  const realised = computeRealisedGain(portfolio);
  const sells = portfolio.transactions.filter((tx) => tx.action === "sell").length;

  if (transactions.length === 0) {
    return (
      <Card padding="lg">
        <Eyebrow>Trade history</Eyebrow>
        <p className="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-ink-muted">
          No simulated orders yet. Every one you place is recorded here — with the price you
          traded at and which of the two prices it came from, so you can look back and see what
          the choice cost.
        </p>
      </Card>
    );
  }

  return (
    <Card padding="none">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-6 pt-6">
        <Eyebrow>Trade history</Eyebrow>
        <p className="text-[0.75rem] text-ink-subtle">
          {transactions.length} simulated {transactions.length === 1 ? "order" : "orders"} · kept in
          this browser
        </p>
      </div>

      <ol className="mt-4">
        {transactions.map((transaction) => (
          <LogRow key={transaction.id} transaction={transaction} />
        ))}
      </ol>

      {sells > 0 && (
        // Only shown once there is a sale to explain. Before that, "realised gain
        // $0.00" is a statistic about nothing, and a beginner reads a number
        // that is present as a number that means something.
        <div className="border-t border-line px-6 py-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <div>
              <p className="text-[0.875rem] font-medium text-ink">
                Realised result on closed units
              </p>
              <p className="mt-0.5 max-w-lg text-[0.75rem] leading-relaxed text-ink-muted">
                Sale price minus the average cost of the units sold, at the time of each sale.
                This is a hypothetical figure from a sandbox — no money moved.
              </p>
            </div>
            <p
              className={cn(
                "font-mono text-[1.25rem] tabular-nums",
                realised.isPositive()
                  ? "text-teal-strong"
                  : realised.isNegative()
                    ? "text-warning"
                    : "text-ink-muted",
              )}
              data-numeric
            >
              {formatSignedCurrency(realised)}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

function LogRow({ transaction }: { transaction: SimTransaction }) {
  const isBuy = transaction.action === "buy";

  return (
    <li className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5 border-b border-line-faint px-6 py-3.5 last:border-b-0 hover:bg-surface-muted/60">
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold",
          isBuy ? "bg-teal-soft text-teal-strong" : "bg-sky text-sky-ink",
        )}
      >
        {isBuy ? (
          <ArrowDownLeft aria-hidden className="h-3 w-3" />
        ) : (
          <ArrowUpRight aria-hidden className="h-3 w-3" />
        )}
        {isBuy ? "Buy" : "Sell"}
      </span>

      <span className="font-mono text-[0.8125rem] tabular-nums text-ink">
        {formatQuantity(transaction.quantity, 6)}
        <span className="ml-1 font-sans font-semibold">{transaction.symbol}</span>
      </span>

      <span className="font-mono text-[0.8125rem] tabular-nums text-ink-muted">
        @ {formatCurrency(transaction.price)}
      </span>

      <span
        className="font-mono text-[0.625rem] uppercase tracking-widest text-ink-subtle"
        // The title spells out what the label means, because "on-chain" and
        // "reference" are two words this course defines and a two-word chip
        // cannot carry the definition.
        title={
          transaction.priceSource === "onchain"
            ? "Filled at the price in the BNB Chain liquidity pool"
            : "Filled at the last traded price of the underlying share"
        }
      >
        {transaction.priceSource === "onchain" ? "on-chain" : "reference"}
      </span>

      <span className="ml-auto flex shrink-0 items-baseline gap-4">
        <span className="font-mono text-[0.8125rem] tabular-nums text-ink">
          {formatCurrency(transaction.grossAmount)}
        </span>
        <time
          dateTime={transaction.createdAt}
          className="w-32 text-right text-[0.75rem] text-ink-subtle"
        >
          {statementTime(transaction.createdAt)}
        </time>
      </span>
    </li>
  );
}

/**
 * A statement timestamp: short, sortable-looking, and unambiguous about the hour.
 *
 * Not `RelativeTime` — "3 minutes ago" is the right register for a *price*, which
 * goes stale, and the wrong one for a *trade*, which does not. A learner
 * comparing two fills they made a minute apart needs to see which came first.
 */
function statementTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
