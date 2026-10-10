import type { RawRwaToken } from "./schemas";
import { CHAIN_LABELS, DEFAULT_CHAIN_ID } from "@/lib/chains";
import type { DataProvenance, MarketStatus, ProviderId, TokenizedStock } from "@/types";

/**
 * Translate a permissive upstream record into our normalised `TokenizedStock`.
 *
 * Rules this function obeys, all of them from the PRD:
 *  - A field we do not have is `null`, never `0`, never `""`, never invented.
 *  - Market status is only reported when upstream actually states it. We never
 *    infer "open" from the presence of a price (TRD §5).
 *  - Every record carries provenance, so the UI can label it honestly.
 */

/** Known issuer fingerprints. Extend as more providers are plugged in. */
const PROVIDER_SIGNATURES: Array<{ id: ProviderId; test: RegExp; label: string }> = [
  { id: "bstocks", test: /\bbstocks?\b|bstock/i, label: "bStocks" },
  { id: "ondo", test: /\bondo\b|ondo\s*finance/i, label: "Ondo" },
  { id: "xstocks", test: /\bxstocks?\b|xstock/i, label: "xStocks" },
];

export function detectProvider(raw: RawRwaToken): ProviderId {
  const haystack = [
    asString((raw as Record<string, unknown>).provider),
    asString((raw as Record<string, unknown>).issuer),
    asString((raw as Record<string, unknown>).platform),
    raw.name,
    raw.tokenName,
    raw.symbol,
  ]
    .filter(Boolean)
    .join(" ");

  for (const signature of PROVIDER_SIGNATURES) {
    if (signature.test.test(haystack)) return signature.id;
  }
  return "unknown";
}

export function providerLabel(provider: ProviderId): string {
  switch (provider) {
    case "bstocks":
      return "bStocks";
    case "ondo":
      return "Ondo";
    case "xstocks":
      return "xStocks";
    default:
      return "Unattributed";
  }
}

/**
 * Normalise one raw record. Returns null when the record lacks the two things
 * an asset cannot exist without: a symbol and a display name. Everything else
 * has a sensible empty representation.
 */
export function normalizeToken(
  raw: RawRwaToken,
  provenance: DataProvenance,
): TokenizedStock | null {
  const symbol = firstString(raw.symbol, raw.tokenSymbol);
  const name = firstString(raw.name, raw.tokenName, symbol);

  if (!symbol || !name) return null;

  const chainId = raw.chainId ?? numberOrNull(raw.chain) ?? DEFAULT_CHAIN_ID;
  const contractAddress = firstString(raw.contractAddress, raw.tokenAddress, raw.address);

  return {
    id: `${detectProvider(raw)}:${symbol.toLowerCase()}`,
    provider: detectProvider(raw),
    name,
    companyName: firstString(raw.companyName, raw.underlyingName) ?? null,
    symbol,
    underlyingSymbol: firstString(
      raw.underlyingSymbol,
      raw.underlying,
      raw.underlyingTicker,
      raw.stockSymbol,
    ),
    chainId,
    chainName: chainId !== null ? (CHAIN_LABELS[String(chainId)] ?? `Chain ${chainId}`) : null,
    // Only accept a well-formed EVM address. A truncated or malformed address
    // is worse than none, because it looks clickable.
    contractAddress: isEvmAddress(contractAddress) ? contractAddress : null,
    price: firstString(raw.onchainPrice, raw.onChainPrice, raw.price),
    referencePrice: firstString(raw.referencePrice, raw.underlyingPrice),
    marketStatus: parseMarketStatus(raw.marketStatus ?? raw.status),
    sector: firstString(raw.sector, raw.industry),
    logoUrl: firstString(raw.logoUrl, raw.iconUrl, raw.imageUrl),
    tokenRatio: firstString(raw.tokenRatio, raw.ratio),
    provenance: {
      ...provenance,
      updatedAt: normalizeTimestamp(raw.updatedAt ?? raw.updateTime ?? raw.timestamp) ?? provenance.updatedAt,
    },
  };
}

export function normalizeTokens(
  raw: RawRwaToken[],
  provenance: DataProvenance,
): TokenizedStock[] {
  const seen = new Set<string>();
  const out: TokenizedStock[] = [];

  for (const record of raw) {
    const token = normalizeToken(record, provenance);
    if (!token) continue;
    // Deduplicate on symbol+chain — the list endpoint can repeat entries when
    // an asset is deployed on several chains.
    const key = `${token.symbol.toUpperCase()}@${token.chainId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(token);
  }

  return out.sort((a, b) => a.symbol.localeCompare(b.symbol));
}

/**
 * Map upstream status strings onto our closed set.
 *
 * Anything unrecognised becomes "unknown" — we would rather say "we don't
 * know" than guess that the Nasdaq is open.
 */
export function parseMarketStatus(value: unknown): MarketStatus {
  const s = asString(value)?.toLowerCase().trim();
  if (!s) return "unknown";
  if (["open", "trading", "regular", "1", "true"].includes(s)) return "open";
  if (["closed", "close", "halted", "0", "false"].includes(s)) return "closed";
  if (["pre", "pre-market", "premarket", "before"].includes(s)) return "pre";
  if (["post", "post-market", "aftermarket", "after"].includes(s)) return "post";
  return "unknown";
}

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

export function isEvmAddress(value: unknown): value is string {
  return typeof value === "string" && EVM_ADDRESS.test(value);
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    const s = asString(value);
    if (s) return s;
  }
  return null;
}

function asString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === "" || s === "null" || s === "undefined" ? null : s;
}

function numberOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Upstream timestamps arrive as ISO strings, Unix seconds, or Unix
 * milliseconds — often indistinguishable at a glance. The magnitude tells us
 * which: anything below 1e12 is seconds.
 */
function normalizeTimestamp(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  const ms = n < 1e12 ? n * 1000 : n;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
