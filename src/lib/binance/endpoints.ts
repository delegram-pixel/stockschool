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
 * Endpoint coverage — six endpoints, verified against the live API on
 * 2026-10-11 by signing requests directly and reading the responses.
 *
 * Two endpoints this file used to carry are NOT part of this API. Both return
 * `404 {"msg":"No static resource build/…"}` — a Spring "no such route"
 * message, which is how you can tell a wrong path from a wrong parameter:
 *
 *   /wallet/token-balances   → 404
 *   /tx/simulate             → 404
 *
 * They were removed rather than left in place to fail quietly. The wallet and
 * transaction groups this product's README advertised do not exist here; the
 * On-Chain Lab covers that ground over public BSC JSON-RPC instead, which
 * needs no credentials at all.
 *
 *   RWA Data : /dex/market/rwa/tokens, /search, /price, /underlying-market
 *   Trading  : /dex/aggregator/quote — needs `userWalletAddress` for Ondo RFQ
 *
 * One trap worth naming: every endpoint here takes `binanceChainId`, not
 * `chainId`. The wrong spelling returns HTTP 200 with `code: 40001` and the
 * message "Parameter binanceChainId is required" — a success status carrying a
 * failure body, which is why the client's envelope check matters.
 */

/**
 * Chain identity is defined in `@/lib/chains` and re-exported here so existing
 * callers keep working. New code should import it from `@/lib/chains`
 * directly.
 *
 * It moved because this module imports `./client`, so anything reachable from
 * here is reachable from the signing layer — and from `node:crypto`.
 */
import { CHAIN_LABELS, CHAIN_NAMES, DEFAULT_CHAIN_ID } from "@/lib/chains";

export { CHAIN_LABELS, CHAIN_NAMES, DEFAULT_CHAIN_ID };

// -----------------------------------------------------------------------------
// RWA Data
// -----------------------------------------------------------------------------

/** List every tokenized equity the API knows about on a chain. */
export async function fetchRwaTokens(
  chainId: number = DEFAULT_CHAIN_ID,
): Promise<UpstreamResult<RawRwaToken[]>> {
  const result = await request("/api/v1/dex/market/rwa/tokens", {
    label: "rwa/tokens",
    // The parameter is `binanceChainId`, not `chainId` — every other RWA
    // endpoint rejects the shorter spelling with a 40001. This one is the
    // exception: it ignores the chain filter entirely and returns the same
    // payload for `?binanceChainId=56`, `?chainId=56` and a bare `?`. It is
    // sent anyway so the call matches the documented contract, but do not
    // read the returned list as having been filtered by chain.
    query: { binanceChainId: chainId },
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
    query: { keyword, binanceChainId: chainId },
  });
  if (!result.ok) return result;

  // Search returns *companies*, not tokens. Each item looks like:
  //
  //   { ticker: "TSLA", companyName: "Tesla, Inc.",
  //     assets: [ { tokenSymbol: "TSLAon", tokenContractAddress: "0x2494…" } ] }
  //
  // and the tokens live one level down inside `assets`. This function used to
  // parse the top-level items as tokens, which meant every result failed
  // `rawRwaToken` validation (there is no `tokenContractAddress` on a company)
  // and search returned an empty list while reporting success. Flatten first.
  //
  // The `[item]` fallback keeps the older flat shape working, in case the
  // endpoint ever returns it again.
  const raw = extractList(result.data.data).flatMap((item) => {
    const assets = (item as { assets?: unknown }).assets;
    return Array.isArray(assets) ? assets : [item];
  });

  const good = raw
    .map((item) => rawRwaToken.safeParse(item))
    .filter((p) => p.success)
    .map((p) => p.data);

  return { ok: true, data: { ...result.data, data: good } };
}

/**
 * Prices for one or more contracts. Returns both the on-chain and reference
 * price when upstream provides them — this is the pair the whole "Find the
 * Premium" mission is built on.
 *
 * Three things were wrong with this call. The parameter is
 * `tokenContractAddresses` — plural, and addresses, not tickers — and the chain
 * parameter is `binanceChainId`. The old version sent `{ symbol, chainId }`, so
 * every call returned `40001 Parameter binanceChainId is required` while
 * carrying HTTP 200. No price was ever fetched.
 *
 * Addresses are comma-joined because that is how upstream takes several in one
 * request, which is the reason the parameter is plural in the first place.
 */
export async function fetchRwaPrices(
  contractAddresses: string[],
  chainId: number = DEFAULT_CHAIN_ID,
): Promise<UpstreamResult<RawRwaToken[]>> {
  const result = await request("/api/v1/dex/market/rwa/price", {
    label: "rwa/price",
    query: {
      binanceChainId: chainId,
      tokenContractAddresses: contractAddresses.join(","),
    },
    // Prices are the one thing worth refreshing often.
    revalidate: 30,
  });
  if (!result.ok) return result;

  // A plural parameter probably returns a list, but a single address has not
  // been observed and may come back bare. Accept both rather than guess: an
  // empty list would read as "this asset has no price", which is a different
  // and much worse claim than "we could not parse the response".
  const list = extractList(result.data.data);
  const candidates = list.length > 0 ? list : [extractObject(result.data.data)];
  const good = candidates
    .filter((item) => item !== null && item !== undefined)
    .map((item) => rawRwaToken.safeParse(item))
    .filter((p) => p.success)
    .map((p) => p.data);

  return { ok: true, data: { ...result.data, data: good } };
}

/** Company profile for the underlying equity: sector, industry, description. */
export async function fetchUnderlyingProfile(
  contractAddress: string,
  chainId: number = DEFAULT_CHAIN_ID,
): Promise<UpstreamResult<Record<string, unknown> | null>> {
  const result = await request("/api/v1/dex/market/rwa/underlying-profile", {
    label: "rwa/underlying-profile",
    // Needs BOTH parameters, and the identifier is an address. Sending only
    // `symbol` produced `40001 Parameter binanceChainId is required`; sending
    // only `binanceChainId` produced `40001 Parameter tokenContractAddress is
    // required`. The API names the next missing parameter each time, so this
    // took two round trips to discover.
    query: { binanceChainId: chainId, tokenContractAddress: contractAddress },
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
  contractAddress: string,
  chainId: number = DEFAULT_CHAIN_ID,
): Promise<UpstreamResult<Record<string, unknown> | null>> {
  const result = await request("/api/v1/dex/market/rwa/underlying-market", {
    label: "rwa/underlying-market",
    // Verified working: `?binanceChainId=56&tokenContractAddress=0x2494…`
    // returns `{ platformId, assetType, statusInfo: { openState, marketStatus,
    // reasonCode, … } }`. Note the session state is nested — `normalizeToken`
    // has to read `statusInfo.marketStatus`, not `marketStatus`.
    query: { binanceChainId: chainId, tokenContractAddress: contractAddress },
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
  /**
   * Required, despite reading like an optional extra. Upstream routes some
   * pairs through Ondo RFQ, and those refuse to quote without a wallet:
   * `"userWalletAddress is required for RFQ (Ondo) quote"`.
   *
   * This is the one genuinely awkward corner of the API for this product,
   * because the whole design is that no wallet is ever connected. The caller
   * must pass an address, and the honest thing to do is treat it as a stated
   * placeholder the learner can see — not to invent a wallet silently.
   */
  userWalletAddress: string;
  chainId?: number;
}): Promise<UpstreamResult<SwapQuote | null>> {
  const result = await request("/api/v1/dex/aggregator/quote", {
    label: "aggregator/quote",
    query: {
      binanceChainId: params.chainId ?? DEFAULT_CHAIN_ID,
      fromTokenAddress: params.fromTokenAddress,
      toTokenAddress: params.toTokenAddress,
      amount: params.amount,
      userWalletAddress: params.userWalletAddress,
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
// Wallet & transactions — REMOVED (routes do not exist)
// -----------------------------------------------------------------------------
//
// This file used to export `fetchWalletTokenBalances` and `simulateTransaction`
// against `/api/v1/wallet/token-balances` and `/api/v1/tx/simulate`. Neither
// route exists. Both answer:
//
//   404 {"msg":"No static resource build/api/v1/wallet/token-balances."}
//   404 {"msg":"No static resource build/api/v1/tx/simulate."}
//
// "No static resource" is Spring's unmatched-route message, which is how you
// tell a wrong path from a wrong parameter. No query string would have made
// these work.
//
// This product never needed them. The On-Chain Lab reads name, symbol,
// decimals and totalSupply over public BSC JSON-RPC
// (`src/lib/blockchain/token-reader.ts`) — no credentials, no key policy, and
// it keeps working when this API is unreachable. Removing these deletes two
// probes that could only ever return 404.
//
// README and the hackathon notes must be corrected to match: this integration
// covers six endpoints across two API groups (RWA Data, Trading), not eight
// across three.

// -----------------------------------------------------------------------------
// helpers
// -----------------------------------------------------------------------------

function str(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}
