import { request, type UpstreamResult } from "./client";
import {
  extractList,
  extractObject,
  rawRwaToken,
  type RawRwaToken,
} from "./schemas";

/**
 * Thin, typed wrappers around each Binance Web3 API endpoint we use.
 *
 * These do exactly three things: build the query, call `request`, and validate
 * the payload. No normalisation happens here — that is `normalize.ts`'s job, so
 * the two concerns can be tested independently.
 *
 * Endpoint coverage (8 of the documented set, per hackathon scoring §5):
 *   RWA Data : /dex/market/rwa/{tokens,search,price,underlying-profile,underlying-market}
 *   Trading  : /dex/aggregator/quote
 *   Wallet   : /wallet/token-balances
 *   Tx       : /tx/simulate
 */

/** BNB Smart Chain. Most tokenized equities settle here. */
export const DEFAULT_CHAIN_ID = Number(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID ?? 56);

export const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  56: "BNB Smart Chain",
  8453: "Base",
};

/** `CT_501` is Solana and is not numeric — kept as a label only. */
export const CHAIN_LABELS: Record<string, string> = {
  "56": "BNB Smart Chain",
  "1": "Ethereum",
  "8453": "Base",
  CT_501: "Solana",
};

// -----------------------------------------------------------------------------
// RWA Data
// -----------------------------------------------------------------------------

/** List every tokenized equity the API knows about on a chain. */
export async function fetchRwaTokens(
  chainId: number = DEFAULT_CHAIN_ID,
): Promise<UpstreamResult<RawRwaToken[]>> {
  const result = await request("/api/v1/dex/market/rwa/tokens", {
    label: "rwa/tokens",
    query: { chainId },
  });
  if (!result.ok) return result;

  // The list endpoint may paginate. If a `total` exceeds what we received we
  // still return what we have — a partial list beats an empty explorer — but
  // the caller can surface the truncation.
  const raw = extractList(result.data.data);
  const parsed = raw.map((item) => rawRwaToken.safeParse(item));
  const good = parsed.filter((p) => p.success).map((p) => p.data);

  return {
    ok: true,
    data: { ...result.data, data: good },
  };
}

/** Search tokenized equities by ticker or company name. */
export async function searchRwa(
  keyword: string,
  chainId: number = DEFAULT_CHAIN_ID,
): Promise<UpstreamResult<RawRwaToken[]>> {
  const result = await request("/api/v1/dex/market/rwa/search", {
    label: "rwa/search",
    query: { keyword, chainId },
  });
  if (!result.ok) return result;

  const raw = extractList(result.data.data);
  const good = raw
    .map((item) => rawRwaToken.safeParse(item))
    .filter((p) => p.success)
    .map((p) => p.data);

  return { ok: true, data: { ...result.data, data: good } };
}

/**
 * Price for one symbol. Returns both the on-chain and reference price when
 * upstream provides them — this is the pair the whole "Find the Premium"
 * mission is built on.
 */
export async function fetchRwaPrice(
  symbol: string,
  chainId: number = DEFAULT_CHAIN_ID,
): Promise<UpstreamResult<RawRwaToken | null>> {
  const result = await request("/api/v1/dex/market/rwa/price", {
    label: "rwa/price",
    query: { symbol, chainId },
    // Prices are the one thing worth refreshing often.
    revalidate: 30,
  });
  if (!result.ok) return result;

  const object = extractObject(result.data.data);
  const parsed = rawRwaToken.safeParse(object ?? {});
  return { ok: true, data: { ...result.data, data: parsed.success ? parsed.data : null } };
}

/** Company profile for the underlying equity: sector, industry, description. */
export async function fetchUnderlyingProfile(
  symbol: string,
): Promise<UpstreamResult<Record<string, unknown> | null>> {
  const result = await request("/api/v1/dex/market/rwa/underlying-profile", {
    label: "rwa/underlying-profile",
    query: { symbol },
    // Company metadata changes rarely; cache it hard.
    revalidate: 3600,
  });
  if (!result.ok) return result;

  const object = extractObject(result.data.data);
  return {
    ok: true,
    data: {
      ...result.data,
      data: object && typeof object === "object" ? (object as Record<string, unknown>) : null,
    },
  };
}

/** Fundamentals for the underlying equity: market cap, volume, session state. */
export async function fetchUnderlyingMarket(
  symbol: string,
): Promise<UpstreamResult<Record<string, unknown> | null>> {
  const result = await request("/api/v1/dex/market/rwa/underlying-market", {
    label: "rwa/underlying-market",
    query: { symbol },
    revalidate: 120,
  });
  if (!result.ok) return result;

  const object = extractObject(result.data.data);
  return {
    ok: true,
    data: {
      ...result.data,
      data: object && typeof object === "object" ? (object as Record<string, unknown>) : null,
    },
  };
}

// -----------------------------------------------------------------------------
// Trading
// -----------------------------------------------------------------------------

export type SwapQuote = {
  /** Expected output amount in the destination token's smallest unit. */
  toAmount: string | null;
  /** Price impact as a percentage string, when upstream reports it. */
  priceImpactPercent: string | null;
  /** Route description for teaching "how a swap actually resolves". */
  route: string[];
  /** Human-readable gas estimate, purely educational in this product. */
  estimatedGas: string | null;
};

/**
 * A swap quote. StockSchool never *executes* a swap — this powers the
 * "what would this cost on-chain?" panel and the slippage lesson.
 */
export async function fetchSwapQuote(params: {
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  chainId?: number;
}): Promise<UpstreamResult<SwapQuote | null>> {
  const result = await request("/api/v1/dex/aggregator/quote", {
    label: "aggregator/quote",
    query: {
      chainId: params.chainId ?? DEFAULT_CHAIN_ID,
      fromTokenAddress: params.fromTokenAddress,
      toTokenAddress: params.toTokenAddress,
      amount: params.amount,
    },
    revalidate: 15,
  });
  if (!result.ok) return result;

  const object = extractObject(result.data.data) as Record<string, unknown> | null;
  if (!object) return { ok: true, data: { ...result.data, data: null } };

  const quote: SwapQuote = {
    toAmount: str(object.toAmount ?? object.outAmount ?? object.amountOut),
    priceImpactPercent: str(object.priceImpactPercent ?? object.priceImpact),
    route: Array.isArray(object.route)
      ? (object.route as unknown[]).map((r) =>
          typeof r === "string" ? r : String((r as Record<string, unknown>)?.name ?? "hop"),
        )
      : [],
    estimatedGas: str(object.estimatedGas ?? object.gas),
  };

  return { ok: true, data: { ...result.data, data: quote } };
}

// -----------------------------------------------------------------------------
// Wallet & transactions
// -----------------------------------------------------------------------------

export type WalletBalance = {
  symbol: string;
  address: string;
  balance: string;
  decimals: number | null;
};

/** Read-only holdings lookup. Never requires a signature or a connected wallet. */
export async function fetchWalletTokenBalances(
  address: string,
  chainId: number = DEFAULT_CHAIN_ID,
): Promise<UpstreamResult<WalletBalance[]>> {
  const result = await request("/api/v1/wallet/token-balances", {
    label: "wallet/token-balances",
    query: { address, chainId },
    revalidate: 15,
  });
  if (!result.ok) return result;

  const raw = extractList(result.data.data);
  const balances: WalletBalance[] = raw
    .map((item) => {
      const r = item as Record<string, unknown>;
      const symbol = str(r.symbol ?? r.tokenSymbol);
      const addr = str(r.address ?? r.contractAddress ?? r.tokenAddress);
      if (!symbol || !addr) return null;
      return {
        symbol,
        address: addr,
        balance: str(r.balance ?? r.amount ?? r.value) ?? "0",
        decimals: num(r.decimals),
      };
    })
    .filter((b): b is WalletBalance => b !== null);

  return { ok: true, data: { ...result.data, data: balances } };
}

export type SimulationOutcome = {
  /** Whether the hypothetical transaction would succeed. */
  success: boolean | null;
  /** Gas the transaction would consume. Educational, not billed. */
  gasUsed: string | null;
  /** Upstream's revert reason, if the call would fail. */
  revertReason: string | null;
};

/**
 * Dry-run a transaction. Paired with the wallet balance endpoint, this is how
 * the On-Chain Lab explains "this is what the chain would say" without ever
 * asking the user to sign anything.
 */
export async function simulateTransaction(payload: {
  chainId?: number;
  from: string;
  to: string;
  data?: string;
  value?: string;
}): Promise<UpstreamResult<SimulationOutcome | null>> {
  const result = await request("/api/v1/tx/simulate", {
    label: "tx/simulate",
    method: "POST",
    revalidate: 0,
    body: {
      chainId: payload.chainId ?? DEFAULT_CHAIN_ID,
      from: payload.from,
      to: payload.to,
      data: payload.data ?? "0x",
      value: payload.value ?? "0",
    },
  });
  if (!result.ok) return result;

  const object = extractObject(result.data.data) as Record<string, unknown> | null;
  if (!object) return { ok: true, data: { ...result.data, data: null } };

  const success = object.success ?? object.simulateSuccess ?? object.status;
  return {
    ok: true,
    data: {
      ...result.data,
      data: {
        success: typeof success === "boolean" ? success : str(success) === "success" ? true : null,
        gasUsed: str(object.gasUsed ?? object.gas),
        revertReason: str(object.revertReason ?? object.reason ?? object.errorMessage),
      },
    },
  };
}

// -----------------------------------------------------------------------------
// helpers
// -----------------------------------------------------------------------------

function str(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

function num(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
