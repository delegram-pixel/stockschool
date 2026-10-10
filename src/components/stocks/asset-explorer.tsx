"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { comparePrices } from "@/lib/calculations/price-difference";
import { formatPercent } from "@/lib/calculations/money";
import { cn } from "@/lib/utils";
import type { TokenizedStock } from "@/types";
import { AssetCard } from "./asset-card";

/**
 * The explorer: filter, sort, and read the feed.
 *
 * A client component rather than a server one, for one reason: filtering has to
 * feel instant. Every asset in the feed is already on the page — the server
 * rendered it — so a round trip per keystroke would buy nothing and cost the
 * learner the sense that the grid is *theirs* to sift. The data crossing the
 * boundary is the normalised `TokenizedStock[]`, which is a few hundred bytes
 * per row; the lesson prose that could never be shipped this way is not here.
 *
 * Note what is *not* client state: `assets` is a prop. The provider, the
 * provenance and the degradation story were all resolved on the server and are
 * not re-derived here, so the client cannot disagree with the server about
 * whether these numbers are live.
 */

type SortKey = "gap" | "name" | "price";

const SORT_LABELS: Record<SortKey, string> = {
  gap: "Widest gap",
  name: "A–Z",
  price: "Highest price",
};

/**
 * The comparison for one asset, or null when the pair is incomplete.
 *
 * Returns the decimal *string*. The only consumer that needs a number is the
 * sort comparator, and it says so at the point of use — keeping the string in
 * the data means the displayed figure is never the rounded one.
 */
function gapOf(asset: TokenizedStock): string | null {
  const comparison = comparePrices(asset.price, asset.referencePrice);
  return comparison ? comparison.difference.percent : null;
}

export function AssetExplorer({ assets }: { assets: TokenizedStock[] }) {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("gap");

  const sectors = useMemo(() => {
    const found = new Set<string>();
    for (const asset of assets) if (asset.sector) found.add(asset.sector);
    return [...found].sort();
  }, [assets]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = assets.filter((asset) => {
      if (sector && asset.sector !== sector) return false;
      if (!q) return true;
      return (
        asset.symbol.toLowerCase().includes(q) ||
        asset.name.toLowerCase().includes(q) ||
        (asset.companyName?.toLowerCase().includes(q) ?? false) ||
        (asset.underlyingSymbol?.toLowerCase().includes(q) ?? false) ||
        (asset.sector?.toLowerCase().includes(q) ?? false)
      );
    });

    return [...filtered].sort(comparatorFor(sort));
  }, [assets, query, sector, sort]);

  const stats = useMemo(() => summarise(assets), [assets]);
  const filteredStats = useMemo(() => summarise(visible), [visible]);
  const isFiltered = query.trim() !== "" || sector !== null;

  return (
    <div>
      {/*
        The stat band.
        ------------------------------------------------------------------
        Four derived facts about the feed, set at display size. This is the
        editorial lede: instead of a grid that happens to contain prices, the
        page opens by telling you *what is true of the market today* — how many
        tokens are trading away from their reference, and which one is furthest.
        It updates with the filter, so narrowing to "Technology" tells you
        something about Technology rather than about the whole feed.
      */}
      <StatBand stats={isFiltered ? filteredStats : stats} />

      <div className="mt-10 flex flex-col gap-4 border-y border-line py-4 lg:flex-row lg:items-center lg:justify-between">
        <SearchField value={query} onChange={setQuery} />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          {sectors.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by sector">
              <Chip active={sector === null} onClick={() => setSector(null)}>
                All
              </Chip>
              {sectors.map((name) => (
                <Chip
                  key={name}
                  active={sector === name}
                  onClick={() => setSector(sector === name ? null : name)}
                >
                  {name}
                </Chip>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5" role="group" aria-label="Sort assets">
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <Chip key={key} active={sort === key} onClick={() => setSort(key)}>
                {SORT_LABELS[key]}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      {/* Announced, not shown: a screen reader hears the result count change as
          the learner types, which is the only feedback the visual grid gives
          through motion. */}
      <p aria-live="polite" className="sr-only">
        {visible.length} {visible.length === 1 ? "asset" : "assets"} shown
      </p>

      {visible.length > 0 ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((asset, index) => (
            <AssetCard key={asset.id} asset={asset} priority={index < 3} />
          ))}
        </div>
      ) : (
        <EmptyState
          query={query}
          sector={sector}
          onClear={() => {
            setQuery("");
            setSector(null);
          }}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Derived facts
// -----------------------------------------------------------------------------

type FeedStats = {
  total: number;
  above: number;
  below: number;
  atParity: number;
  incomparable: number;
  widest: { symbol: string; percent: string; direction: "premium" | "discount" } | null;
};

/**
 * Summarise a set of assets.
 *
 * `widest` keeps the signed percent, so "the biggest gap is a discount" survives
 * to the label. Ranking uses `Number` — this is choosing which of twelve rows to
 * feature, not computing a value anyone will act on — while the figure that gets
 * *displayed* stays the untouched decimal string.
 */
function summarise(assets: TokenizedStock[]): FeedStats {
  let above = 0;
  let below = 0;
  let atParity = 0;
  let incomparable = 0;
  let widest: FeedStats["widest"] = null;

  for (const asset of assets) {
    const percent = gapOf(asset);
    const comparison = comparePrices(asset.price, asset.referencePrice);

    if (percent === null || !comparison) {
      incomparable += 1;
      continue;
    }

    switch (comparison.difference.direction) {
      case "premium":
        above += 1;
        break;
      case "discount":
        below += 1;
        break;
      default:
        atParity += 1;
    }

    if (widest === null || Math.abs(Number(percent)) > Math.abs(Number(widest.percent))) {
      widest = {
        symbol: asset.underlyingSymbol ?? asset.symbol,
        percent,
        direction:
          comparison.difference.direction === "premium" ? "premium" : "discount",
      };
    }
  }

  return { total: assets.length, above, below, atParity, incomparable, widest };
}

function StatBand({ stats }: { stats: FeedStats }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
      <Stat
        label="Tokenized stocks"
        value={String(stats.total)}
        note={stats.incomparable > 0 ? `${stats.incomparable} without a full price pair` : "all priceable"}
      />
      <Stat
        label="Above reference"
        value={String(stats.above)}
        note="trading at a premium on-chain"
        tone="accent"
      />
      <Stat
        label="Below reference"
        value={String(stats.below)}
        note="trading at a discount on-chain"
        tone="info"
      />
      <Stat
        label="Widest gap"
        value={stats.widest ? formatPercent(stats.widest.percent, { decimals: 2 }) : "—"}
        note={stats.widest ? `on ${stats.widest.symbol}` : "no comparable pairs"}
        tone={stats.widest?.direction === "premium" ? "accent" : stats.widest ? "info" : "neutral"}
      />
    </dl>
  );
}

function Stat({
  label,
  value,
  note,
  tone = "neutral",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "neutral" | "accent" | "info";
}) {
  return (
    <div className="border-l border-line pl-4">
      <dt className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-subtle">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-2 font-display text-[2rem] font-semibold leading-none tracking-[-0.03em]",
          tone === "accent" ? "text-teal-strong" : tone === "info" ? "text-info" : "text-ink",
        )}
        data-numeric
      >
        {value}
      </dd>
      <p className="mt-2 text-[0.75rem] leading-snug text-ink-muted">{note}</p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Controls
// -----------------------------------------------------------------------------

function SearchField({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  return (
    <div className="relative w-full lg:max-w-xs">
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search ticker, company or sector…"
        aria-label="Search tokenized stocks"
        // The native clear affordance is styled inconsistently across browsers
        // and sits on top of our own button, so the browser's is turned off and
        // ours is drawn instead.
        className={cn(
          "h-10 w-full rounded-full border border-line bg-surface pl-9 pr-9 text-[0.875rem] text-ink",
          "placeholder:text-ink-subtle transition-colors duration-200",
          "hover:border-line-strong focus:border-teal focus:outline-none",
          "[&::-webkit-search-cancel-button]:appearance-none",
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-subtle transition-colors hover:bg-surface-muted hover:text-ink"
        >
          <X aria-hidden className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-3 py-1.5 text-[0.75rem] font-medium transition-colors duration-200",
        active
          ? "bg-ink text-ink-inverse"
          : "bg-surface-muted text-ink-muted hover:bg-surface-sunken hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

// -----------------------------------------------------------------------------

function EmptyState({
  query,
  sector,
  onClear,
}: {
  query: string;
  sector: string | null;
  onClear: () => void;
}) {
  const what = query.trim() ? `“${query.trim()}”` : `the ${sector} sector`;

  return (
    <div className="grid-paper mt-8 rounded-2xl border border-line px-6 py-16 text-center">
      <p className="font-display text-[1.375rem] font-semibold tracking-[-0.015em] text-ink">
        Nothing matches {what}
      </p>
      <p className="mx-auto mt-3 max-w-md text-[0.9375rem] leading-relaxed text-ink-muted">
        The feed only carries the tokens the issuer has made available on this network. Not every
        listed company has a tokenized version yet — that gap is part of what this course is about.
      </p>
      <div className="mt-6 flex justify-center">
        <Button variant="secondary" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      </div>
    </div>
  );
}

/**
 * Sorting, kept as one function so the grid and any future table cannot drift.
 *
 * Nulls sort last under every strategy rather than being coerced to zero: an
 * asset with no on-chain price has no rank among priced assets, and treating it
 * as the cheapest thing in the feed would be a quiet fabrication.
 */
function comparatorFor(sort: SortKey): (a: TokenizedStock, b: TokenizedStock) => number {
  return (a, b) => {
    switch (sort) {
      case "name": {
        const left = (a.companyName ?? a.name).toLowerCase();
        const right = (b.companyName ?? b.name).toLowerCase();
        return left.localeCompare(right);
      }

      case "price": {
        const left = toNumber(a.price);
        const right = toNumber(b.price);
        if (left === null && right === null) return 0;
        if (left === null) return 1;
        if (right === null) return -1;
        return right - left;
      }

      case "gap": {
        const left = gapOf(a);
        const right = gapOf(b);
        if (left === null && right === null) return 0;
        if (left === null) return 1;
        if (right === null) return -1;
        // Magnitude decides the order; the sign is the label's business.
        return Math.abs(Number(right)) - Math.abs(Number(left));
      }
    }
  };
}

function toNumber(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
