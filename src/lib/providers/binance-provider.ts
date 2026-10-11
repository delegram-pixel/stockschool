import {
  fetchRwaPrices,
  fetchRwaTokens,
  fetchUnderlyingMarket,
  fetchUnderlyingProfile,
  searchRwa,
  DEFAULT_CHAIN_ID,
} from "@/lib/binance/endpoints";
import { isConfigured, CACHE_TTL_SECONDS } from "@/lib/binance/client";
import { normalizeToken, normalizeTokens, parseMarketStatus } from "@/lib/binance/normalize";
import { makeProvenance, type TokenizedStockProvider } from "./index";
import type { DataProvenance, PriceData, ProviderId, Result, TokenizedStock } from "@/types";

/**
 * Binance Web3 API implementation of `TokenizedStockProvider`.
 *
 * This is the only file that knows the RWA response shape. Everything above it
 * speaks in `TokenizedStock`.
 */
export class BinanceRwaProvider implements TokenizedStockProvider {
  readonly id: ProviderId = "bstocks";
  readonly label = "Binance Web3 RWA";

  constructor(private readonly chainId: number = DEFAULT_CHAIN_ID) {}

  isConfigured(): boolean {
    return isConfigured();
  }

  async getAssets(): Promise<Result<TokenizedStock[]>> {
    const result = await fetchRwaTokens(this.chainId);
    if (!result.ok) return { ok: false, error: result.error };

    const provenance = provenanceFrom(result.data.fetchedAt);
    return { ok: true, data: normalizeTokens(result.data.data, provenance) };
  }

  async search(keyword: string): Promise<Result<TokenizedStock[]>> {
    const result = await searchRwa(keyword, this.chainId);
    if (!result.ok) return { ok: false, error: result.error };

    const provenance = provenanceFrom(result.data.fetchedAt);
    return { ok: true, data: normalizeTokens(result.data.data, provenance) };
  }

  async getAsset(symbol: string): Promise<Result<TokenizedStock | null>> {
    // Prefer the list endpoint and filter locally: it is one request instead of
    // two, and it means a symbol we already have cached costs nothing.
    const all = await this.getAssets();
    if (!all.ok) return all;

    const target = symbol.trim().toUpperCase();
    const match =
      all.data.find((a) => a.symbol.toUpperCase() === target) ??
      all.data.find((a) => a.underlyingSymbol?.toUpperCase() === target) ??
      null;

    return { ok: true, data: match };
  }

  async getPrice(symbol: string): Promise<Result<PriceData | null>> {
    // The price endpoint takes contract ADDRESSES, not tickers — the parameter
    // is literally `tokenContractAddresses`. So resolve the symbol to an
    // address first. `getAssets` is cached, so this lookup is normally free.
    //
    // The old version passed the symbol straight through, which upstream
    // rejected with `40001 Parameter binanceChainId is required`; no price was
    // ever fetched and the Explore page never showed a live number.
    const asset = await this.getAsset(symbol);
    if (!asset.ok) return asset;
    if (!asset.data?.contractAddress) return { ok: true, data: null };

    const result = await fetchRwaPrices([asset.data.contractAddress], this.chainId);
    if (!result.ok) return { ok: false, error: result.error };

    const raw = result.data.data[0];
    if (!raw) return { ok: true, data: null };

    const provenance = provenanceFrom(result.data.fetchedAt);
    const normalized = normalizeToken(raw, provenance);
    if (!normalized) return { ok: true, data: null };

    return {
      ok: true,
      data: {
        price: normalized.price,
        referencePrice: normalized.referencePrice,
        currency: "USD",
        // The session state lives at `statusInfo.marketStatus` on the market
        // endpoint, so check the nested path before the flat one.
        marketStatus: parseMarketStatus(
          raw.statusInfo?.marketStatus ?? raw.marketStatus ?? raw.status,
        ),
        provenance: normalized.provenance,
      },
    };
  }

  async getUnderlyingProfile(symbol: string): Promise<Result<Record<string, unknown> | null>> {
    // Same resolution as `getPrice`: this endpoint needs a contract address and
    // a chain id, and takes both as `tokenContractAddress` / `binanceChainId`.
    const asset = await this.getAsset(symbol);
    if (!asset.ok) return asset;
    if (!asset.data?.contractAddress) return { ok: true, data: null };

    const result = await fetchUnderlyingProfile(asset.data.contractAddress, this.chainId);
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true, data: result.data.data };
  }

  async getUnderlyingMarket(symbol: string): Promise<Result<Record<string, unknown> | null>> {
    const asset = await this.getAsset(symbol);
    if (!asset.ok) return asset;
    if (!asset.data?.contractAddress) return { ok: true, data: null };

    const result = await fetchUnderlyingMarket(asset.data.contractAddress, this.chainId);
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true, data: result.data.data };
  }
}

/**
 * Stamp a live response.
 *
 * `stale` compares the *fetch* time against the configured TTL. We cannot know
 * the upstream's own publication delay, and pretending otherwise would be a
 * fabricated precision — so we report what we can defend: how long ago we
 * successfully read it.
 */
function provenanceFrom(fetchedAt: string): DataProvenance {
  const ageSeconds = (Date.now() - new Date(fetchedAt).getTime()) / 1000;
  return makeProvenance("live", fetchedAt, {
    stale: ageSeconds > CACHE_TTL_SECONDS,
  });
}
