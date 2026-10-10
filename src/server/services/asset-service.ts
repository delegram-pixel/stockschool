import { cache } from "react";
import { BinanceRwaProvider } from "@/lib/providers/binance-provider";
import { explainError } from "@/lib/binance/client";
import { getSampleAssets, getSampleAsset, getSampleProvenance } from "@/lib/binance/sample-data";
import type { DataProvenance, ProviderError, TokenizedStock } from "@/types";

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

/** Search across the current feed. Used by the explorer's client filter. */
export const searchAssets = cache(async (keyword: string): Promise<AssetFeed> => {
  const feed = await getAssetFeed();
  const q = keyword.trim().toLowerCase();
  if (!q) return feed;

  return {
    ...feed,
    assets: feed.assets.filter(
      (asset) =>
        asset.symbol.toLowerCase().includes(q) ||
        asset.name.toLowerCase().includes(q) ||
        asset.companyName?.toLowerCase().includes(q) ||
        asset.underlyingSymbol?.toLowerCase().includes(q) ||
        asset.sector?.toLowerCase().includes(q),
    ),
  };
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
