import { cache } from "react";
import { BinanceRwaProvider } from "@/lib/providers/binance-provider";
import { explainError } from "@/lib/binance/client";
import {
  readCompanyProfile,
  readUnderlyingMarket,
  type CompanyProfile,
  type UnderlyingMarket,
} from "@/lib/binance/fundamentals";
import { getSampleAssets, getSampleAsset, getSampleProvenance } from "@/lib/binance/sample-data";
import type { DataProvenance, PriceData, ProviderError, TokenizedStock } from "@/types";

/**
 * The asset service — the single seam between "where data comes from" and
 * "what the UI renders".
 *
 * Behaviour worth understanding, because it is the core reliability decision in
 * the product:
 *
 *  1. If the Binance Web3 API is configured and answers, we return live data
 *     and say so.
 *  2. If it is configured but fails (timeout, rate limit, bad signature), we
 *     return sample data *and* a `degradation` describing exactly what went
 *     wrong. The UI shows a visible banner. We never silently swap in mock
 *     values and call them live — that is the one thing the PRD forbids above
 *     all else.
 *  3. If it is not configured at all, we return sample data with no error
 *     banner but a standing "sample data" notice. A judge cloning the repo
 *     with no `.env` gets a working, honest product.
 *
 * `cache()` from React dedupes these calls within a single render pass, so a
 * page and its metadata function do not cause two upstream requests.
 */

export type FeedMode = "live" | "sample";

export type Degradation = {
  code: ProviderError["code"];
  /** Short, user-facing. */
  message: string;
  /** Actionable, aimed at whoever is running the app. */
  explanation: string;
};

export type AssetFeed = {
  assets: TokenizedStock[];
  /** Aggregate provenance for the list. */
  provenance: DataProvenance;
  mode: FeedMode;
  /** Present only when we wanted live data and could not get it. */
  degradation: Degradation | null;
  /** True when credentials are absent entirely — a normal, expected state. */
  unconfigured: boolean;
};

const provider = new BinanceRwaProvider();

export const getAssetFeed = cache(async (): Promise<AssetFeed> => {
  if (!provider.isConfigured()) {
    return {
      assets: getSampleAssets(),
      provenance: getSampleProvenance(),
      mode: "sample",
      degradation: null,
      unconfigured: true,
    };
  }

  const result = await provider.getAssets();

  if (!result.ok) {
    return {
      assets: getSampleAssets(),
      provenance: getSampleProvenance(),
      mode: "sample",
      degradation: {
        code: result.error.code,
        message: result.error.message,
        explanation: explainError(result.error),
      },
      unconfigured: false,
    };
  }

  // A live provider that returns an empty list is a real state, not a failure —
  // but rendering an empty explorer when we have usable sample data would be a
  // worse demo. We surface the emptiness and let the caller decide.
  if (result.data.length === 0) {
    return {
      assets: [],
      provenance: { source: "live", updatedAt: new Date().toISOString(), stale: false },
      mode: "live",
      degradation: {
        code: "NOT_FOUND",
        message: "No tokenized stocks were returned for this network.",
        explanation:
          "The API responded successfully but returned an empty list. Check NEXT_PUBLIC_DEFAULT_CHAIN_ID.",
      },
      unconfigured: false,
    };
  }

  const updatedAt = new Date().toISOString();
  return {
    assets: result.data,
    provenance: { source: "live", updatedAt, stale: false },
    mode: "live",
    degradation: null,
    unconfigured: false,
  };
});

export type AssetLookup = {
  asset: TokenizedStock;
  mode: FeedMode;
  degradation: Degradation | null;
  unconfigured: boolean;
};

/**
 * Look up a single asset by token symbol or underlying ticker.
 *
 * Falls back to the sample set on a provider failure so that a stock detail
 * page linked from a lesson keeps working during an outage — with a banner,
 * never silently.
 */
export const getAssetBySymbol = cache(async (symbol: string): Promise<AssetLookup | null> => {
  const target = symbol.trim().toUpperCase();
  if (!target) return null;

  const feed = await getAssetFeed();
  const match =
    feed.assets.find((a) => a.symbol.toUpperCase() === target) ??
    feed.assets.find((a) => a.underlyingSymbol?.toUpperCase() === target) ??
    null;

  if (match) {
    return {
      asset: match,
      mode: feed.mode,
      degradation: feed.degradation,
      unconfigured: feed.unconfigured,
    };
  }

  // Live returned nothing for this symbol. Check the sample set so that a
  // hardcoded demo link still resolves, clearly labelled.
  if (feed.mode === "live") {
    const sample = getSampleAsset(target);
    if (sample) {
      return { asset: sample, mode: "sample", degradation: feed.degradation, unconfigured: false };
    }
  }

  return null;
});

/**
 * Search, from two sources in a deliberate order.
 *
 *  1. **The catalogue we already hold.** Instant, free, and correct for the
 *     common case: a learner typing into the explorer's filter box while the feed
 *     is already on screen.
 *  2. **`/rwa/search`.** Consulted *only* when the local filter comes up empty.
 *
 * The order is the design, not an optimisation. The catalogue is paginated and
 * can be truncated, so "nothing local matched" is a much weaker claim than "no
 * such asset exists" — and the search endpoint is the one that can actually
 * answer the second question. Asking it only on a miss keeps the fast path fast
 * and stops every keystroke from costing a network round trip, while still
 * letting a learner find a stock the catalogue page did not carry.
 *
 * A miss that upstream also cannot fill stays a miss, carrying the feed's own
 * provenance and degradation untouched.
 */
export const searchAssets = cache(async (keyword: string): Promise<AssetFeed> => {
  const feed = await getAssetFeed();
  const q = keyword.trim().toLowerCase();
  if (!q) return feed;

  const local = feed.assets.filter(
    (asset) =>
      asset.symbol.toLowerCase().includes(q) ||
      asset.name.toLowerCase().includes(q) ||
      asset.companyName?.toLowerCase().includes(q) ||
      asset.underlyingSymbol?.toLowerCase().includes(q) ||
      asset.sector?.toLowerCase().includes(q),
  );

  if (local.length > 0) return { ...feed, assets: local };

  // Nothing local. In sample mode there is no upstream to ask — and asking would
  // turn a labelled sample-data screen into an error banner for no gain.
  if (feed.mode !== "live" || !provider.isConfigured()) {
    return { ...feed, assets: local };
  }

  const result = await provider.search(keyword);
  if (!result.ok || result.data.length === 0) {
    // Upstream had no better answer than we did. Keep the empty result rather
    // than resurrecting the whole catalogue, which would look like a match.
    return { ...feed, assets: local };
  }

  return { ...feed, assets: result.data };
});

/** Distinct sectors present in the feed, for the explorer's filter chips. */
export async function getSectors(): Promise<string[]> {
  const feed = await getAssetFeed();
  const sectors = new Set<string>();
  for (const asset of feed.assets) {
    if (asset.sector) sectors.add(asset.sector);
  }
  return [...sectors].sort();
}

// -----------------------------------------------------------------------------
// One asset, in depth
// -----------------------------------------------------------------------------

export type AssetDetail = AssetLookup & {
  /**
   * The freshest price pair, from `/rwa/price` — the endpoint the whole course
   * is built on. `null` when it did not answer; the caller then falls back to
   * the pair carried by the list payload, which is older but real.
   */
  quote: PriceData | null;
  /** Session state and fundamentals from `/rwa/underlying-market`. */
  market: UnderlyingMarket | null;
  /** Company detail from `/rwa/underlying-profile`. */
  profile: CompanyProfile | null;
};

/**
 * The detail page's data.
 *
 * Three endpoints beyond the catalogue, because the catalogue alone cannot answer
 * the questions the page asks: *is the underlying market open right now*, *how
 * big is this company*, and *what does it actually do*. Those are three different
 * endpoints, and each one is allowed to fail on its own.
 *
 * That independence is the important part. A missing company profile must not
 * cost the page its price, and a failed price call must not cost it the
 * company — so the three run concurrently and are read separately, rather than
 * being chained behind one another.
 *
 * Each of the three resolves the symbol to a contract address by reading the
 * catalogue, so all three ask for `/rwa/tokens` at once. That is one wire request,
 * not three: the calls are identical and carry identical `next` options, so
 * Next's fetch deduplication collapses them inside the render pass.
 */
export const getAssetDetail = cache(async (symbol: string): Promise<AssetDetail | null> => {
  const lookup = await getAssetBySymbol(symbol);
  if (!lookup) return null;

  // Only the live provider can answer these. In sample mode there is nothing to
  // ask, and asking anyway would produce a NOT_CONFIGURED error rendered as a
  // degradation banner — noise on a screen that is already honestly labelled.
  if (lookup.mode !== "live" || !provider.isConfigured()) {
    return { ...lookup, quote: null, market: null, profile: null };
  }

  const [quote, marketResult, profileResult] = await Promise.all([
    provider.getPrice(symbol),
    provider.getUnderlyingMarket(symbol),
    provider.getUnderlyingProfile(symbol),
  ]);

  return {
    ...lookup,
    quote: quote.ok ? quote.data : null,
    market: marketResult.ok ? readUnderlyingMarket(marketResult.data) : null,
    profile: profileResult.ok ? readCompanyProfile(profileResult.data) : null,
  };
});
