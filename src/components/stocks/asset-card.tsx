import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AddressChip } from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";
import type { MarketStatus, TokenizedStock } from "@/types";
import { AssetMark, ProviderChip } from "./asset-mark";
import { PricePair } from "./price-pair";

/**
 * One tokenized stock, as a card in the explorer grid.
 *
 * The card is a link, and the whole surface is the target — a small "view
 * details" affordance in the corner would be the only clickable thing on a card
 * whose entire purpose is to be clicked. The arrow in the top-right is a
 * *signal*, not a control, and it is `aria-hidden` so a screen reader announces
 * one link with a real name rather than a name plus an arrow.
 *
 * The information order is the teaching order: *who issued this token* (the
 * mark, tinted by issuer), *what company it tracks* (the name), *what it costs
 * on both sides* (the price pair), and only then the bookkeeping (sector,
 * contract). A learner who reads only the top third of every card still learns
 * the taxonomy; the numbers are for the second look.
 *
 * `marketStatus` gets a chip only when it is *not* open. A closed underlying
 * market is exactly when a tokenized stock's on-chain price drifts away from the
 * reference — the arbitrage mechanism that normally keeps them together is
 * asleep — so it is the single most explanatory piece of context on the card.
 * Printing "Market open" on every card would spend that attention for nothing.
 */

const MARKET_STATUS_COPY: Record<MarketStatus, { label: string; title: string } | null> = {
  open: null,
  closed: {
    label: "Market closed",
    title:
      "The underlying exchange is closed. On-chain prices can drift from the reference price while no one is arbitraging the gap.",
  },
  pre: {
    label: "Pre-market",
    title: "The underlying exchange is in pre-market trading, so the reference price may be thin.",
  },
  post: {
    label: "After hours",
    title:
      "The underlying exchange is in after-hours trading, so the reference price may be thin.",
  },
  unknown: null,
};

export function AssetCard({
  asset,
  className,
  priority = false,
}: {
  asset: TokenizedStock;
  className?: string;
  /** Reserved for the first row of a grid, where the mark should not fade in. */
  priority?: boolean;
}) {
  const status = MARKET_STATUS_COPY[asset.marketStatus];

  return (
    <Link
      href={`/stocks/${asset.symbol}`}
      className={cn(
        "group relative flex flex-col rounded-2xl border border-line bg-surface p-5",
        "shadow-card transition-[box-shadow,transform,border-color] duration-300 ease-[var(--ease-out-soft)]",
        "hover:-translate-y-0.5 hover:border-line-strong hover:shadow-raised",
        "focus-visible:-translate-y-0.5 focus-visible:shadow-raised",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <AssetMark asset={asset} />

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-[1.0625rem] font-semibold leading-tight tracking-[-0.012em] text-ink">
            {asset.companyName ?? asset.name}
          </h3>
          <p className="mt-0.5 flex items-center gap-2 font-mono text-[0.75rem] text-ink-muted">
            <span>{asset.symbol}</span>
            {asset.underlyingSymbol && asset.underlyingSymbol !== asset.symbol && (
              <>
                <span aria-hidden className="text-ink-subtle">
                  ·
                </span>
                <span className="text-ink-subtle">tracks {asset.underlyingSymbol}</span>
              </>
            )}
          </p>
        </div>

        <ArrowUpRight
          aria-hidden
          className="mt-1 h-4 w-4 shrink-0 text-ink-subtle transition-colors duration-300 group-hover:text-teal"
        />
      </div>

      {/* `flex-1` on the middle block is what lets `mt-auto` on the footer do
          its job: on a row of cards with different amounts of metadata, the
          bodies stretch and every footer rule lands on the same baseline. The
          `mb-4` is the floor for the gap — `mt-auto` alone collapses to zero the
          moment the content is tall enough to fill the card. */}
      <div className="mb-4 mt-5 flex-1">
        <PricePair asset={asset} />

        {(status || asset.sector) && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {status && (
              <span
                title={status.title}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-muted px-2 py-0.5 text-[0.6875rem] font-medium text-ink-muted"
              >
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-warning" />
                {status.label}
              </span>
            )}
            {asset.sector && (
              <span className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-subtle">
                {asset.sector}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line-faint pt-3.5">
        <ProviderChip provider={asset.provider} />
        {asset.contractAddress ? (
          // The card is one big link, so the address chip must not become a
          // second one — otherwise a click on the address navigates somewhere
          // the learner did not ask for. Nested interactive elements inside an
          // anchor are also invalid HTML. So the card shows the address as
          // text; copying and exploring live on the detail page.
          <span
            className="truncate font-mono text-[0.6875rem] text-ink-subtle"
            title={asset.contractAddress}
          >
            {shortAddress(asset.contractAddress)}
          </span>
        ) : (
          <span className="font-mono text-[0.6875rem] text-ink-subtle">no contract listed</span>
        )}
      </div>
    </Link>
  );
}

/**
 * `0x1a2b…9f0e` — long enough to recognise, short enough to fit.
 *
 * Exported because the detail page and the on-chain lab must abbreviate the same
 * way, and two different ellipsis styles for the same address is the kind of
 * detail that makes a product feel assembled rather than designed.
 */
export function shortAddress(address: string, lead = 6, tail = 4): string {
  if (address.length <= lead + tail + 1) return address;
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}

/**
 * The address, at full length, in the form a learner can act on.
 *
 * `AddressChip` already handles the copy button and the monospace truncation;
 * this wrapper only supplies the explorer link, because *where* the address
 * should be verified depends on the chain and only the detail page knows it.
 */
export function ContractRow({
  address,
  explorerHref,
  className,
}: {
  address: string | null;
  explorerHref: string | null;
  className?: string;
}) {
  if (!address) {
    return (
      <p className={cn("font-mono text-[0.8125rem] text-ink-subtle", className)}>
        This asset does not list a contract address.
      </p>
    );
  }

  return (
    <AddressChip
      value={address}
      label="Contract"
      display={shortAddress(address, 10, 6)}
      href={explorerHref ?? undefined}
      className={className}
    />
  );
}
