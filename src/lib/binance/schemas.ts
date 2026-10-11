import { z } from "zod";

/**
 * Runtime validation for Binance Web3 API responses.
 *
 * Why these schemas are deliberately *loose*
 * ------------------------------------------
 * The RWA endpoints are young and the field names are not fully pinned down in
 * public documentation. A strict schema would reject a valid response because
 * upstream renamed `contractAddress` to `tokenAddress` overnight — and the
 * failure mode would be an empty explorer with no explanation.
 *
 * So we validate the *envelope* strictly (`responseEnvelope`) and parse the
 * payload permissively: unknown keys are kept, known keys are optional, and
 * every field is coerced to the type we need. Anything that survives parsing
 * but lacks an essential field is dropped by the normaliser with a logged
 * reason, rather than blowing up the whole list.
 *
 * This is a deliberate trade: we would rather show 12 of 14 assets with a
 * warning than show zero assets.
 */

/** Upstream may send numbers as strings (prices especially). Accept both. */
const numericish = z.union([z.string(), z.number()]);

/** Anything we can turn into a decimal string, or null. */
export const decimalish = numericish
  .nullish()
  .transform((v) => {
    if (v === null || v === undefined) return null;
    const s = typeof v === "string" ? v.trim() : String(v);
    if (s === "" || s === "null" || s === "undefined") return null;
    // Reject things that are not finite numbers once parsed.
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    return s;
  });

/** Chain ids arrive as numbers, strings, or not at all. */
export const chainIdish = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v) => {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  });

/**
 * Some endpoints wrap payloads in `{ code, msg, data }`, others return the
 * array bare. This normalises both into `{ data }`.
 */
export const responseEnvelope = z
  .object({
    code: numericish.optional(),
    msg: z.string().optional(),
    message: z.string().optional(),
  })
  .passthrough();

/** One tokenized-equity record. Every field optional — see note above. */
export const rawRwaToken = z
  .object({
    symbol: z.string().optional(),
    tokenSymbol: z.string().optional(),
    name: z.string().optional(),
    tokenName: z.string().optional(),
    // The underlying equity ticker has turned up under all of these.
    underlyingSymbol: z.string().optional(),
    underlying: z.string().optional(),
    underlyingTicker: z.string().optional(),
    stockSymbol: z.string().optional(),
    companyName: z.string().optional(),
    underlyingName: z.string().optional(),
    sector: z.string().optional(),
    industry: z.string().optional(),
    chainId: chainIdish.optional(),
    chain: z.union([z.string(), z.number()]).optional(),
    // The chain field upstream actually sends. Every RWA endpoint takes
    // `binanceChainId` as its parameter name, and every response echoes it
    // back under the same name — so this, not `chainId`, is the one that
    // carries data. `chainId` is kept for older shapes.
    binanceChainId: chainIdish.optional(),
    contractAddress: z.string().optional(),
    tokenAddress: z.string().optional(),
    address: z.string().optional(),
    // The contract field upstream actually sends. Its absence from this list
    // was the single most damaging bug in the integration: `normalizeToken`
    // looked for `contractAddress`/`tokenAddress`/`address`, found none of
    // them, and set `contractAddress: null` on every asset — so the On-Chain
    // Lab had no real addresses to offer and every explorer link was dead.
    tokenContractAddress: z.string().optional(),
    // Which issuer platform the token belongs to ("bstock", "ondo"). This is
    // the authoritative provider signal and is more reliable than guessing
    // from the token's display name.
    platformId: z.string().optional(),
    assetType: numericish.optional(),
    // Market session state arrives nested under `statusInfo` on
    // `underlying-market`, not at the top level.
    statusInfo: z
      .object({
        openState: z.union([z.boolean(), z.string()]).optional(),
        marketStatus: z.string().optional(),
        reasonCode: z.string().optional(),
      })
      .passthrough()
      .optional(),
    price: decimalish.optional(),
    onchainPrice: decimalish.optional(),
    onChainPrice: decimalish.optional(),
    referencePrice: decimalish.optional(),
    underlyingPrice: decimalish.optional(),
    marketStatus: z.string().optional(),
    status: z.string().optional(),
    logoUrl: z.string().optional(),
    iconUrl: z.string().optional(),
    imageUrl: z.string().optional(),
    tokenRatio: decimalish.optional(),
    ratio: decimalish.optional(),
    updatedAt: z.string().optional(),
    updateTime: numericish.optional(),
    timestamp: numericish.optional(),
  })
  .passthrough();

export const rawRwaTokenList = z.array(rawRwaToken);

export type RawRwaToken = z.infer<typeof rawRwaToken>;

/**
 * Pull the first array out of a response, wherever the API decided to bury it.
 *
 * Tolerance here is the difference between an explorer that works against a
 * slightly-changed upstream and one that renders "no assets found" during a
 * live demo.
 */
export function extractList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["data", "list", "tokens", "items", "result", "rows", "records"]) {
      const value = record[key];
      if (Array.isArray(value)) return value;
      // One more level: { data: { list: [...] } }
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const nested = value as Record<string, unknown>;
        for (const nestedKey of ["list", "tokens", "items", "rows", "records"]) {
          if (Array.isArray(nested[nestedKey])) return nested[nestedKey] as unknown[];
        }
      }
    }
  }
  return [];
}

/** Extract a single object payload, for the detail endpoints. */
export function extractObject(payload: unknown): unknown {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const record = payload as Record<string, unknown>;
    if (record.data !== undefined) return record.data;
    return payload;
  }
  return null;
}

/** Upstream error bodies. Used to map onto our own error codes. */
export const rawErrorBody = z
  .object({
    code: numericish.optional(),
    msg: z.string().optional(),
    message: z.string().optional(),
    error: z.string().optional(),
  })
  .passthrough();
