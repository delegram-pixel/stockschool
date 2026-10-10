"use client";

import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Check, TriangleAlert } from "lucide-react";
import { Segmented } from "@/components/learning/widgets/parts";
import { Button } from "@/components/ui/button";
import { Card, Eyebrow } from "@/components/ui/card";
import { comparePrices } from "@/lib/calculations/price-difference";
import { Decimal, formatCurrency, formatPercent, toDecimal } from "@/lib/calculations/money";
import { cn } from "@/lib/utils";
import { useSimulation } from "@/components/providers/simulation-provider";
import type { OrderRequest } from "@/lib/simulation/engine";
import type { TokenizedStock } from "@/types";

/**
 * The trade ticket.
 *
 * This is where the course stops being reading and becomes practice, so the
 * ticket is built to teach rather than to imitate a brokerage. Three choices do
 * that work:
 *
 *  1. **You choose which price to trade at.** A real venue would not offer this.
 *     Here it is the whole point: execute the same order against the on-chain
 *     price and against the reference price, and the difference in what you pay
 *     is the premium, felt rather than explained. Lesson 03's diagram becomes a
 *     number in your own cash balance.
 *
 *  2. **The percentage buttons.** 25 / 50 / Max is not decoration — position
 *     sizing is the first genuinely hard decision a new investor faces, and
 *     having the max computed for you makes the arithmetic someone else's
 *     problem while keeping the *judgement* yours.
 *
 *  3. **The forecast line.** "Cash after" is shown before the order, not after.
 *     A beginner learning what a trade costs should see the consequence while
 *     they can still change their mind.
 *
 * Errors come back from `executeBuy`/`executeSell` and are rendered verbatim.
 * Those messages are written for beginners in the engine, and re-wording them
 * here would be a second place for the same idea to drift.
 */

type Side = "buy" | "sell";
type PriceSource = "onchain" | "reference";

/**
 * What the ticket is currently pointed at.
 *
 * Lifted into the workspace rather than held here, so that clicking "Sell" on a
 * row in the holdings table can aim the ticket at that asset. An imperative
 * "prefill" call would need a ref into this component's internals and would
 * leave the two out of sync the moment either one re-rendered; a shared piece of
 * state is the honest description of what is going on — the holdings table and
 * the ticket are two views of one draft order.
 */
export type TradeDraft = {
  assetId: string;
  side: Side;
};

export function TradeTicket({
  assets,
  draft,
  onDraftChange,
}: {
  assets: TokenizedStock[];
  draft: TradeDraft;
  onDraftChange: (next: TradeDraft) => void;
}) {
  const { portfolio, buy, sell, hydrated } = useSimulation();

  const tradable = useMemo(() => assets.filter((asset) => asset.price || asset.referencePrice), [assets]);

  const [source, setSource] = useState<PriceSource>("onchain");
  const [quantity, setQuantity] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  // Fall back to the first tradable asset when the draft has never been aimed
  // at anything, or points at an asset that has since left the feed.
  const asset =
    tradable.find((candidate) => candidate.id === draft.assetId) ?? tradable[0] ?? null;
  const side = draft.side;

  const setAssetId = (assetId: string) => onDraftChange({ assetId, side });
  const setSide = (next: Side) => onDraftChange({ assetId: draft.assetId, side: next });

  const price = asset ? (source === "onchain" ? asset.price : asset.referencePrice) : null;
  const priceDecimal = toDecimal(price);

  const position = asset ? portfolio.positions.find((p) => p.assetId === asset.id) : undefined;
  const heldQuantity = toDecimal(position?.quantity ?? "0") ?? new Decimal(0);
  const cash = toDecimal(portfolio.cashBalance) ?? new Decimal(0);

  const comparison = asset ? comparePrices(asset.price, asset.referencePrice) : null;

  // The forecast. Recomputed on every keystroke, but cheap: two multiplications.
  const quantityDecimal = toDecimal(quantity);
  const gross =
    priceDecimal && quantityDecimal && quantityDecimal.isPositive()
      ? priceDecimal.times(quantityDecimal)
      : null;

  const cashAfter = gross
    ? side === "buy"
      ? cash.minus(gross)
      : cash.plus(gross)
    : cash;

  // The other price, so the learner can see what the same order would have cost
  // on the other side of the gap without having to switch and retype.
  const otherPrice = asset ? (source === "onchain" ? asset.referencePrice : asset.price) : null;
  const otherGross =
    toDecimal(otherPrice) && quantityDecimal && quantityDecimal.isPositive()
      ? toDecimal(otherPrice)!.times(quantityDecimal)
      : null;
  const priceImpact = gross && otherGross ? gross.minus(otherGross) : null;

  const canSubmit =
    hydrated && asset !== null && priceDecimal !== null && quantityDecimal !== null && quantityDecimal.isPositive();

  function applyFraction(fraction: number) {
    if (!priceDecimal || !priceDecimal.isPositive()) return;

    const available = side === "buy" ? cash : heldQuantity;
    const target = available.times(fraction);

    // Selling is limited by units held, buying by cash divided by price.
    const units = side === "buy" ? target.div(priceDecimal) : target;

    // Rounded *down* to six places. Rounding up would let "Max" produce an order
    // that costs a fraction more than the cash available, and being told you
    // cannot afford the amount the button just calculated for you is a
    // maddening way to learn about floating point.
    setQuantity(trim(units.toDecimalPlaces(6, Decimal.ROUND_DOWN)));
  }

  function submit() {
    if (!asset || !price) return;

    const order: OrderRequest = {
      assetId: asset.id,
      symbol: asset.symbol,
      name: asset.companyName ?? asset.name,
      provider: asset.provider,
      quantity,
      price,
      priceSource: source,
      priceTimestamp: asset.provenance.updatedAt,
    };

    const result = side === "buy" ? buy(order) : sell(order);

    if (result.ok) {
      setFeedback({
        ok: true,
        text: `${side === "buy" ? "Bought" : "Sold"} ${trim(toDecimal(result.transaction.quantity)!)} ${asset.symbol} at ${formatCurrency(result.transaction.price)}. Nothing left this page.`,
      });
      setQuantity("");
    } else {
      setFeedback({ ok: false, text: result.error.message });
    }
  }

  if (tradable.length === 0) {
    return (
      <Card padding="lg">
        <Eyebrow>Trade ticket</Eyebrow>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-muted">
          No asset in the current feed has a usable price, so there is nothing to practise with
          right now. That is a fact about the data, not about your portfolio.
        </p>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="scroll-mt-28" id="trade-ticket">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Eyebrow>Trade ticket</Eyebrow>
        <Segmented<Side>
          label="Order side"
          value={side}
          onChange={(next) => {
            setSide(next);
            setFeedback(null);
          }}
          options={[
            { id: "buy", label: "Buy" },
            { id: "sell", label: "Sell" },
          ]}
        />
      </div>

      {/* --- Asset ---------------------------------------------------------- */}
      <div className="mt-6">
        <label
          htmlFor="ticket-asset"
          className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ink-subtle"
        >
          Asset
        </label>
        <select
          id="ticket-asset"
          value={asset?.id ?? ""}
          onChange={(event) => {
            setAssetId(event.target.value);
            setFeedback(null);
          }}
          className="mt-2 h-11 w-full rounded-lg border border-line bg-surface px-3 text-[0.9375rem] text-ink transition-colors hover:border-line-strong focus:border-teal focus:outline-none"
        >
          {tradable.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.companyName ?? candidate.name} ({candidate.symbol})
              {candidate.price ? ` — ${formatCurrency(candidate.price)}` : " — no on-chain price"}
            </option>
          ))}
        </select>
      </div>

      {/* --- Price source --------------------------------------------------- */}
      <div className="mt-5">
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ink-subtle">
          Trade at which price?
        </p>
        <div className="mt-2">
          <Segmented<PriceSource>
            label="Price source"
            value={source}
            onChange={(next) => {
              setSource(next);
              setFeedback(null);
            }}
            options={[
              {
                id: "onchain",
                label: asset?.price ? `On-chain ${formatCurrency(asset.price)}` : "On-chain — unavailable",
                hint: "The price in the BNB Chain liquidity pool.",
              },
              {
                id: "reference",
                label: asset?.referencePrice
                  ? `Reference ${formatCurrency(asset.referencePrice)}`
                  : "Reference — unavailable",
                hint: "The last traded price of the underlying share on its exchange.",
              },
            ]}
          />
        </div>

        {comparison && comparison.difference.direction !== "parity" && (
          <p className="mt-2.5 text-[0.75rem] leading-snug text-ink-muted">
            The two prices differ by{" "}
            <span className="font-mono text-ink">
              {/* The decimal *string* goes straight to the formatter, which parses
                  it with `Decimal`. Routing it through `Number` first would put a
                  float in the middle of a money path for no gain. */}
              {formatPercent(comparison.difference.percent, { decimals: 2 })}
            </span>
            . Switch between them and place the same order twice — the change in your cash balance
            is that gap, in dollars.
          </p>
        )}
        {!comparison && (
          <p className="mt-2.5 text-[0.75rem] leading-snug text-ink-subtle">
            Only one of the two prices is available, so the gap cannot be measured.
          </p>
        )}
      </div>

      {/* --- Quantity ------------------------------------------------------- */}
      <div className="mt-5">
        <label
          htmlFor="ticket-quantity"
          className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ink-subtle"
        >
          Quantity
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            id="ticket-quantity"
            // `type="text"` with `inputMode="decimal"` rather than `type="number"`:
            // a number input silently discards partially-typed values like "1."
            // and reports an empty string for them, which would clear the field
            // mid-keystroke.
            type="text"
            inputMode="decimal"
            value={quantity}
            onChange={(event) => {
              setQuantity(event.target.value);
              setFeedback(null);
            }}
            placeholder="0.00"
            className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 font-mono text-[0.9375rem] tabular-nums text-ink transition-colors placeholder:text-ink-subtle hover:border-line-strong focus:border-teal focus:outline-none"
          />

          <div className="flex gap-1.5">
            {[0.25, 0.5, 1].map((fraction) => (
              <button
                key={fraction}
                type="button"
                onClick={() => applyFraction(fraction)}
                className="h-11 rounded-lg bg-surface-muted px-3 text-[0.75rem] font-medium text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
              >
                {fraction === 1 ? "Max" : `${fraction * 100}%`}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-2 text-[0.75rem] text-ink-subtle">
          {side === "buy" ? (
            <>
              Max available:{" "}
              <span className="font-mono text-ink-muted">{formatCurrency(cash.toFixed(2))}</span> of
              virtual cash
            </>
          ) : (
            <>
              Holding:{" "}
              <span className="font-mono text-ink-muted">
                {heldQuantity.isPositive()
                  ? `${trim(heldQuantity)} ${asset?.symbol ?? ""}`
                  : "nothing yet"}
              </span>
            </>
          )}
        </p>
      </div>

      {/* --- Forecast ------------------------------------------------------- */}
      <div className="mt-6 space-y-2 border-t border-line pt-5 text-[0.875rem]">
        <ForecastRow
          label={side === "buy" ? "Estimated cost" : "Estimated proceeds"}
          value={formatCurrency(gross ? gross.toFixed(2) : null)}
          emphasis
        />
        <ForecastRow
          label="Cash after this order"
          value={formatCurrency(cashAfter.toFixed(2))}
        />
        {priceImpact && !priceImpact.isZero() && (
          <ForecastRow
            label={`Versus the ${source === "onchain" ? "reference" : "on-chain"} price`}
            value={
              <>
                {priceImpact.isPositive() ? "+" : "−"}
                {formatCurrency(priceImpact.abs().toFixed(2))}{" "}
                <span className="text-ink-subtle">
                  {priceImpact.isPositive() ? "more" : "less"}
                </span>
              </>
            }
            tone={priceImpact.isPositive() ? "caution" : "accent"}
          />
        )}
      </div>

      <div className="mt-5">
        <Button
          variant={side === "buy" ? "primary" : "secondary"}
          className="w-full"
          disabled={!canSubmit}
          onClick={submit}
        >
          {side === "buy" ? (
            <ArrowDownLeft aria-hidden className="h-4 w-4" />
          ) : (
            <ArrowUpRight aria-hidden className="h-4 w-4" />
          )}
          {side === "buy" ? "Buy" : "Sell"} {quantity || "…"} {asset?.symbol ?? ""} — simulated
        </Button>
      </div>

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "mt-4 flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-[0.8125rem] leading-relaxed",
            feedback.ok
              ? "bg-success-soft text-ink-muted"
              : "bg-warning-soft text-ink-muted",
          )}
        >
          {feedback.ok ? (
            <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          ) : (
            <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}
    </Card>
  );
}

function ForecastRow({
  label,
  value,
  emphasis = false,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  emphasis?: boolean;
  tone?: "neutral" | "accent" | "caution";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-ink-muted">{label}</span>
      <span
        className={cn(
          "font-mono tabular-nums",
          emphasis ? "text-[1.0625rem] font-semibold text-ink" : "text-ink",
          tone === "accent" && "text-teal-strong",
          tone === "caution" && "text-warning",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Render a `Decimal` for an input field.
 *
 * `toString()` on a Decimal that came from division produces things like
 * `69.9755080` with trailing zeros, and a quantity field showing
 * "3.50000000" looks like a mistake. Trailing zeros go; nothing else does,
 * because a quantity field that silently rounds what the learner is about to
 * trade is worse than one that is ugly.
 */
function trim(value: Decimal): string {
  const fixed = value.toFixed(8);
  return fixed.includes(".") ? fixed.replace(/\.?0+$/, "") : fixed;
}
