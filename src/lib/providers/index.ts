import {
  ProviderError,
  type DataProvenance,
  type MarketStatus,
  type OnChainToken,
  type PriceData,
  type ProviderId,
  type Result,
  type TokenizedStock,
} from "@/types";

/**
 * The provider contract.
 *
 * Every tokenized-equity data source is reached through this interface, so the
 * UI never learns whether it is talking to Binance Web3 RWA, Ondo or xStocks.
 * Adding a provider means implementing this file and registering it — no
 * component changes.
 *
 * Methods that a given provider cannot support must return
 * `{ ok: false, error: ProviderError("NOT_CONFIGURED") }` rather than
 * fabricating a plausible value. "We cannot answer that" is a valid, honest
 * answer and the UI has copy for it.
 */
export interface TokenizedStockProvider {
  /** Stable identifier, used for filtering and provenance strings. */
  readonly id: ProviderId;
  /** Human-facing issuer name. */
  readonly label: string;

  /** True when the credentials/transport this provider needs are present. */
  isConfigured(): boolean;

  /** Every asset this provider can describe. */
  getAssets(): Promise<Result<TokenizedStock[]>>;

  /** One asset by token symbol or underlying ticker. */
  getAsset(symbol: string): Promise<Result<TokenizedStock | null>>;

  /** Free-text search across symbol and company name. */
  search(keyword: string): Promise<Result<TokenizedStock[]>>;

  /** Price + reference price + market status for one symbol. */
  getPrice(symbol: string): Promise<Result<PriceData | null>>;

  /** Company profile for the underlying equity, when the provider exposes it. */
  getUnderlyingProfile(symbol: string): Promise<Result<Record<string, unknown> | null>>;

  /** Fundamentals for the underlying equity, when the provider exposes them. */
  getUnderlyingMarket(symbol: string): Promise<Result<Record<string, unknown> | null>>;
}

/**
 * The on-chain read surface.
 *
 * Kept separate from the market-data provider because the source of truth is
 * different: a provider tells us what a token *is*, the chain tells us what the
 * contract *says*. Conflating them would make it easy to accidentally present
 * a provider's cached metadata as a verified on-chain read.
 */
export interface OnChainReader {
  readonly chainId: number;
  readonly chainName: string;

  isConfigured(): boolean;

  /** Read name/symbol/decimals/totalSupply straight from the contract. */
  readToken(address: string): Promise<Result<OnChainToken>>;

  /** Read-only balance lookup. Never signs, never connects a wallet. */
  readBalances(address: string): Promise<Result<Array<{ symbol: string; address: string; balance: string }>>>;

  /** Dry-run a call against current state, to teach what a revert looks like. */
  simulate(input: {
    from: string;
    to: string;
    data?: string;
    value?: string;
  }): Promise<Result<{ success: boolean | null; gasUsed: string | null; revertReason: string | null } | null>>;
}

/** A provider that has no backing transport, used as a safe default. */
export function unconfiguredProvider(id: ProviderId, label: string): TokenizedStockProvider {
  const fail = async <T>(): Promise<Result<T>> => ({
    ok: false,
    error: new ProviderError("NOT_CONFIGURED", `${label} is not configured.`),
  });

  return {
    id,
    label,
    isConfigured: () => false,
    getAssets: fail,
    getAsset: fail,
    search: fail,
    getPrice: fail,
    getUnderlyingProfile: fail,
    getUnderlyingMarket: fail,
  };
}

/** Provenance helper so every provider stamps its output the same way. */
export function makeProvenance(
  source: DataProvenance["source"],
  updatedAt: string | null,
  options: { stale?: boolean; note?: string } = {},
): DataProvenance {
  return {
    source,
    updatedAt,
    stale: options.stale ?? source !== "live",
    ...(options.note ? { note: options.note } : {}),
  };
}

/** Market status labels for the UI. Never inferred from price presence. */
export function marketStatusLabel(status: MarketStatus): string {
  switch (status) {
    case "open":
      return "Market open";
    case "closed":
      return "Market closed";
    case "pre":
      return "Pre-market";
    case "post":
      return "After-hours";
    default:
      return "Market status unavailable";
  }
}
