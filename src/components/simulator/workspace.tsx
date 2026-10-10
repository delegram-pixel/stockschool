"use client";

import { useCallback, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Eyebrow } from "@/components/ui/card";
import { Skeleton, LoadingAnnouncement } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent, formatSignedCurrency } from "@/lib/calculations/money";
import { useSimulation } from "@/components/providers/simulation-provider";
import { STARTING_CASH, valuePortfolio } from "@/lib/simulation/engine";
import type { PortfolioValuation } from "@/lib/simulation/engine";
import type { TokenizedStock } from "@/types";
import { SimulationDisclosure } from "./disclosure";
import { AllocationPanel, HoldingsTable } from "./holdings";
import { TransactionLog } from "./history";
import { TradeTicket } from "./trade-ticket";
import type { TradeDraft } from "./trade-ticket";

/**
 * The simulator workspace.
 *
 * One client component owns the whole instrument panel, and it exists for one
 * reason: the trade ticket and the holdings table are two views of a single
 * draft order. Clicking "Sell" on a NVDA row has to *aim* the ticket at NVDA,
 * and that is only expressible if some component above both of them holds the
 * draft. Splitting them into sibling client islands would need a ref, an effect,
 * and a story about what happens when the feed refreshes mid-draft.
 *
 * Everything it renders below the fold is a leaf that takes what it needs as a
 * prop. `assets` arrives from the server and is never re-fetched here; the
 * portfolio arrives from `SimulationProvider`, which is the only thing in the
 * product that mutates it.
 *
 * ### Why the hydration gate
 *
 * The portfolio lives in `localStorage`, so the server has no idea what it
 * contains. Rendering it before the first client effect would paint
 * "$10,000.00 · no positions" and then snap to the learner's real portfolio a
 * frame later — and for anyone who has been practising for ten minutes, the
 * flash is a wrong number stated confidently about their own money. So the
 * whole panel waits for `hydrated` and holds skeletons, which is honest: we do
 * not know yet, and we say so.
 */

export function SimulatorWorkspace({ assets }: { assets: TokenizedStock[] }) {
  const { portfolio, hydrated, reset } = useSimulation();

  const [draft, setDraft] = useState<TradeDraft>({
    // Empty rather than a real id: the ticket falls back to the first tradable
    // asset itself, and it knows better than this component which assets those
    // are. Naming one here would be a second, drifting source of that truth.
    assetId: "",
    side: "buy",
  });

  /**
   * The price map, keyed by asset id.
   *
   * The on-chain price, never the reference price. A portfolio is valued at what
   * you could sell it for on the venue you would actually sell it on, and the
   * reference price is the *underlying share's* price on an exchange this
   * portfolio cannot reach. Valuing at the reference would quietly show every
   * holder of a discounted token a profit they could not realise.
   */
  const prices = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const asset of assets) map[asset.id] = asset.price;
    return map;
  }, [assets]);

  const valuation = useMemo(() => valuePortfolio(portfolio, prices), [portfolio, prices]);

  /**
   * Aim the ticket at an asset and take the learner to it.
   *
   * `scrollIntoView()` with no behaviour argument on purpose: the global
   * `scroll-behavior: smooth` in `globals.css` supplies the animation and is
   * switched off under `prefers-reduced-motion`. Passing `{ behavior: "smooth" }`
   * here would override that media query and animate anyway, which is the
   * classic way a scroll turns into a vestibular problem.
   */
  const aimTicketAt = useCallback((assetId: string, side: TradeDraft["side"]) => {
    setDraft({ assetId, side });
    document.getElementById("trade-ticket")?.scrollIntoView();
  }, []);

  if (!hydrated) return <WorkspaceSkeleton />;

  return (
    <div className="space-y-8">
      <SimulationDisclosure />

      <PortfolioSummary valuation={valuation} onReset={reset} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-8">
          <HoldingsTable
            valuation={valuation}
            onSell={(assetId) => aimTicketAt(assetId, "sell")}
          />
          <TransactionLog portfolio={portfolio} />
        </div>

        <div className="space-y-8 lg:sticky lg:top-28">
          <TradeTicket assets={assets} draft={draft} onDraftChange={setDraft} />
          <AllocationPanel valuation={valuation} />
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------

/**
 * The four figures that answer "how am I doing".
 *
 * The headline is total value against the $10,000 everyone starts with, because
 * that is the number a beginner checks first and the only one with a meaningful
 * baseline behind it. The rows beneath separate it into the two things that
 * actually explain it — cash you have not spent, and positions whose value moves
 * — which is the distinction the whole lesson is built on. A learner who only
 * ever sees the total has been handed a scoreboard instead of an account.
 */
function PortfolioSummary({
  valuation,
  onReset,
}: {
  valuation: PortfolioValuation;
  onReset: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  const returnTone = valuation.totalReturn.isPositive()
    ? "text-teal-strong"
    : valuation.totalReturn.isNegative()
      ? "text-warning"
      : "text-ink-muted";

  return (
    <Card padding="lg">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-6">
        <div>
          <Eyebrow>Total value</Eyebrow>
          <p
            className="mt-3 font-display text-[2.75rem] font-semibold leading-none tracking-[-0.03em] text-ink"
            data-numeric
          >
            {formatCurrency(valuation.totalValue)}
          </p>
          <p className={cn("mt-2.5 font-mono text-[0.875rem] tabular-nums", returnTone)}>
            {formatSignedCurrency(valuation.totalReturn)}{" "}
            <span className="text-ink-subtle">
              ({formatPercent(valuation.totalReturnPercent)} since you started)
            </span>
          </p>
        </div>

        <ResetControl confirming={confirming} onConfirmingChange={setConfirming} onReset={onReset} />
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-line pt-6 lg:grid-cols-4">
        <Figure
          label="Cash"
          value={formatCurrency(valuation.cash)}
          note="unspent, and earning nothing"
        />
        <Figure
          label="Positions"
          value={formatCurrency(valuation.holdingsValue)}
          note={
            valuation.hasUnpricedHoldings
              ? "excludes positions with no price"
              : "valued at the on-chain price"
          }
        />
        <Figure
          label="Unrealised"
          value={
            valuation.unrealisedGainPercent === null
              ? formatSignedCurrency(valuation.unrealisedGain)
              : `${formatSignedCurrency(valuation.unrealisedGain)} (${formatPercent(
                  valuation.unrealisedGainPercent,
                )})`
          }
          note="on paper — you have not sold anything"
          tone={valuation.unrealisedGain.isNegative() ? "warning" : "neutral"}
        />
        <Figure
          label="Positions held"
          value={String(valuation.holdings.length)}
          note={valuation.holdings.length === 1 ? "one asset" : "distinct assets"}
        />
      </dl>
    </Card>
  );
}

function Figure({
  label,
  value,
  note,
  tone = "neutral",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "neutral" | "warning";
}) {
  return (
    <div className="border-l border-line pl-4">
      <dt className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-subtle">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-2 font-mono text-[1.0625rem] tabular-nums",
          tone === "warning" ? "text-warning" : "text-ink",
        )}
      >
        {value}
      </dd>
      <p className="mt-1.5 text-[0.75rem] leading-snug text-ink-muted">{note}</p>
    </div>
  );
}

/**
 * Reset, in two steps.
 *
 * A destructive button that wipes a learner's entire practice history sits one
 * click away from a panel they will be clicking constantly, so it asks. An
 * inline confirmation rather than `window.confirm` because the native dialog
 * cannot be styled, blocks the whole page, and on some browsers can be
 * suppressed entirely — a confirmation that might not appear is not a
 * confirmation.
 */
function ResetControl({
  confirming,
  onConfirmingChange,
  onReset,
}: {
  confirming: boolean;
  onConfirmingChange: (next: boolean) => void;
  onReset: () => void;
}) {
  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => onConfirmingChange(true)}>
        <RotateCcw aria-hidden className="h-3.5 w-3.5" />
        Reset portfolio
      </Button>
    );
  }

  return (
    <div
      role="group"
      aria-label="Confirm reset"
      className="flex flex-wrap items-center gap-2 rounded-xl border border-warning/25 bg-warning-soft px-3 py-2.5"
    >
      <p className="text-[0.8125rem] text-ink">
        Start over with {formatCurrency(STARTING_CASH)}? This erases every simulated trade.
      </p>
      <div className="flex gap-1.5">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            onReset();
            onConfirmingChange(false);
          }}
        >
          Erase
        </Button>
        <Button variant="quiet" size="sm" onClick={() => onConfirmingChange(false)}>
          Keep
        </Button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------

/**
 * What the panel looks like before we know anything.
 *
 * Deliberately shaped like the real thing — the same card, the same figure
 * positions — so the swap is a fill-in rather than a re-layout. A centred
 * spinner would collapse all of this to zero height and shove the page up and
 * down as it resolved.
 */
function WorkspaceSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true">
      <LoadingAnnouncement label="Loading your simulated portfolio from this browser" />

      <Card padding="lg">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-4 h-11 w-64" />
        <Skeleton className="mt-3 h-4 w-48" />
        <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-line pt-6 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="border-l border-line pl-4">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="mt-2.5 h-5 w-24" />
              <Skeleton className="mt-2 h-3 w-28" />
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card padding="lg">
          <Skeleton className="h-3 w-20" />
          <div className="mt-5 space-y-4">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        </Card>
        <Card padding="lg">
          <Skeleton className="h-3 w-20" />
          <div className="mt-5 space-y-3">
            {[0, 1, 2, 3, 4].map((index) => (
              <Skeleton key={index} className="h-11 w-full" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
