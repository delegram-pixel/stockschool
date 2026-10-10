/**
 * Normalised domain types.
 *
 * Everything the UI renders passes through here. Provider-specific shapes
 * (Binance Web3 RWA payloads, on-chain reads) are translated at the edge in
 * `src/lib/providers/*` and never leak into components — see ARCHITECTURE.md.
 */

/** Providers whose tokenized equities we can normalise. */
export type ProviderId = "bstocks" | "ondo" | "xstocks" | "unknown";

/**
 * Where a value came from and whether we should trust it as current.
 *
 * This is deliberately attached to *every* externally-sourced object. The PRD
 * forbids showing "live" over mock data, so the UI branches on `source` rather
 * than assuming freshness.
 */
export type DataProvenance = {
  source: "live" | "cached" | "mock";
  /** ISO timestamp of the *underlying* data, not of our fetch. Null if unknown. */
  updatedAt: string | null;
  /** True when the data exceeded the provider's expected refresh window. */
  stale: boolean;
  /** Human-facing note, e.g. why we fell back to sample data. */
  note?: string;
};

/** Market session state, only ever from a provider that actually reports it. */
export type MarketStatus = "open" | "closed" | "pre" | "post" | "unknown";

/** A price reading for a single asset. */
export type PriceData = {
  /** On-chain / DEX price in USD, as a decimal string. */
  price: string | null;
  /** Reference (underlying equity) price in USD, as a decimal string. */
  referencePrice: string | null;
  currency: string;
  marketStatus: MarketStatus;
  provenance: DataProvenance;
};

/** A tokenized equity, normalised across providers. */
export type TokenizedStock = {
  id: string;
  provider: ProviderId;
  /** Display name of the token, e.g. "NVIDIA bStock". */
  name: string;
  /** Name of the underlying company, e.g. "NVIDIA Corporation". */
  companyName: string | null;
  /** Tradable token symbol, e.g. "NVDAB". */
  symbol: string;
  /** Ticker of the underlying equity, e.g. "NVDA". */
  underlyingSymbol: string | null;
  /** EVM chain id, or null when the asset is not EVM. */
  chainId: number | null;
  chainName: string | null;
  contractAddress: string | null;
  /** Decimal string. Null means "not provided", never "zero". */
  price: string | null;
  referencePrice: string | null;
  marketStatus: MarketStatus;
  sector: string | null;
  logoUrl: string | null;
  /** Share of the company the token represents, when the issuer discloses it. */
  tokenRatio: string | null;
  provenance: DataProvenance;
};

/** Result of comparing an on-chain price with its reference price. */
export type PriceDifference = {
  absolute: string;
  percent: string;
  direction: "premium" | "discount" | "parity";
};

/** Result wrapper so callers can distinguish "empty" from "failed". */
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: ProviderError };

export type ProviderErrorCode =
  | "NOT_CONFIGURED"
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "UPSTREAM_ERROR"
  | "INVALID_RESPONSE"
  | "NOT_FOUND";

/** A structured, user-safe error. Raw upstream text never reaches the UI. */
export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly status?: number;
  /** Upstream detail, for server logs only. Never rendered. */
  readonly detail?: string;

  constructor(
    code: ProviderErrorCode,
    message: string,
    options?: { status?: number; detail?: string; cause?: unknown },
  ) {
    super(message, { cause: options?.cause });
    this.name = "ProviderError";
    this.code = code;
    this.status = options?.status;
    this.detail = options?.detail;
  }
}

/** On-chain token facts read directly from a contract. */
export type OnChainToken = {
  address: string;
  chainId: number;
  chainName: string;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  totalSupply: string | null;
  /** Which rung of the fallback ladder produced this: "rpc" or "wallet-api". */
  readVia: "rpc" | "wallet-api";
  /** Latest block at read time, so the user can see the point-in-time context. */
  blockNumber: string | null;
  provenance: DataProvenance;
};
