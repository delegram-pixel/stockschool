import { parseMarketStatus } from "./normalize";
import type { MarketStatus } from "@/types";

/**
 * The two "underlying" endpoints return free-form objects, and we have only been
 * able to verify part of what is in them.
 *
 * **Verified on 2026-10-11 by calling the live API and reading the body:**
 *
 * ```text
 * GET /build/api/v1/dex/market/rwa/underlying-market
 *       ?binanceChainId=56&tokenContractAddress=0x2494…
 * → { platformId, assetType, statusInfo: { openState, marketStatus, reasonCode, … } }
 * ```
 *
 * **Not verified:** whether either endpoint reports market capitalisation,
 * trading volume, shares outstanding, or a company description. We never captured
 * a complete body from `underlying-profile` at all, and the market body we did
 * capture was read for the `statusInfo` block specifically.
 *
 * So this module does not assert those fields exist. It scans each payload for a
 * list of plausible spellings — the same tolerance strategy `schemas.ts` already
 * uses for the list endpoint — and returns `null` for anything it does not find.
 * Callers omit an absent row rather than printing a zero, which is the rule the
 * whole product runs on: **a number on screen is a number upstream sent, or it is
 * not on screen.**
 *
 * The cost of being wrong here is a missing row, not a wrong number. That is the
 * only direction of error worth accepting in a product that teaches people to
 * read prices.
 */

export type MarketSession = {
  status: MarketStatus;
  /** Upstream's own code for why the session is not in regular trading. */
  reasonCode: string | null;
  /** Issuer platform, when stated. Also read by `detectProvider`. */
  platformId: string | null;
  /** Upstream's asset classification, kept verbatim — we do not interpret it. */
  assetType: string | null;
};

export type UnderlyingMarket = {
  session: MarketSession;
  /** Decimal strings, not numbers — they are formatted at the edge. */
  marketCap: string | null;
  volume24h: string | null;
  sharesOutstanding: string | null;
};

export type CompanyProfile = {
  sector: string | null;
  industry: string | null;
  description: string | null;
  website: string | null;
  country: string | null;
};

/**
 * Candidates for each fundamental, most-likely first.
 *
 * Ordering within a group matters: the first key that yields a usable value wins,
 * so a more specific spelling (`marketCapUsd`) should precede a more generic one
 * (`marketCap`) only when it is genuinely more likely to be the real one.
 */
const KEYS = {
  marketCap: ["marketCap", "marketCapUsd", "marketCapitalization", "mktCap", "totalMarketValue"],
  volume24h: ["volume24h", "volume24H", "volume", "turnover24h", "dailyVolume"],
  sharesOutstanding: [
    "sharesOutstanding",
    "totalShares",
    "shares",
    "outstandingShares",
    "circulatingSupply",
  ],
  sector: ["sector", "gicsSector"],
  industry: ["industry", "gicsIndustry", "industryName"],
  description: [
    "description",
    "companyDescription",
    "businessSummary",
    "about",
    "profile",
    "summary",
    "introduction",
  ],
  website: ["website", "websiteUrl", "homepage", "url", "officialWebsite"],
  country: ["country", "countryCode", "headquarters", "hqCountry"],
} as const;

/** Read one field, trying each candidate spelling in order. */
function pick(
  source: Record<string, unknown>,
  candidates: readonly string[],
): unknown {
  for (const key of candidates) {
    const value = source[key];
    const text = asText(value);
    if (text !== null) return value;
  }
  return null;
}

/**
 * A decimal string, or null.
 *
 * Deliberately not `Number(value) > 0`: upstream could legitimately report a zero
 * volume, and treating that as "absent" would hide a real fact. Only unparseable
 * or empty input becomes null.
 */
function asDecimalString(value: unknown): string | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : null;
  }
  const text = asText(value);
  if (text === null) return null;
  // Reject anything a decimal parser would read as a different number than it
  // looks — "1,234", "$5", "1.2B" are all display strings, not values.
  return /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(text) ? text : null;
}

function asText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return null;
  const text = String(value).trim();
  return text === "" || text === "null" || text === "undefined" ? null : text;
}

/** Unwrap `{ data: … }` so both envelope shapes reach the same reader. */
function unwrap(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  const inner = record.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    return inner as Record<string, unknown>;
  }
  return record;
}

/**
 * `statusInfo` is the one structure in these payloads we have actually seen, so
 * it is read by name rather than by candidate scan. `marketStatus` sits inside
 * it — reading the top level returned "unknown" on the very endpoint whose job
 * is to report the session.
 */
function readSession(source: Record<string, unknown>): MarketSession {
  const statusInfo =
    source.statusInfo && typeof source.statusInfo === "object" && !Array.isArray(source.statusInfo)
      ? (source.statusInfo as Record<string, unknown>)
      : {};

  return {
    status: parseMarketStatus(statusInfo.marketStatus ?? source.marketStatus ?? source.status),
    reasonCode: asText(statusInfo.reasonCode ?? source.reasonCode),
    platformId: asText(source.platformId),
    assetType: asText(source.assetType),
  };
}

export function readUnderlyingMarket(payload: unknown): UnderlyingMarket | null {
  const source = unwrap(payload);
  if (!source) return null;

  return {
    session: readSession(source),
    marketCap: asDecimalString(pick(source, KEYS.marketCap)),
    volume24h: asDecimalString(pick(source, KEYS.volume24h)),
    sharesOutstanding: asDecimalString(pick(source, KEYS.sharesOutstanding)),
  };
}

export function readCompanyProfile(payload: unknown): CompanyProfile | null {
  const source = unwrap(payload);
  if (!source) return null;

  const profile: CompanyProfile = {
    sector: asText(pick(source, KEYS.sector)),
    industry: asText(pick(source, KEYS.industry)),
    description: asText(pick(source, KEYS.description)),
    website: asText(pick(source, KEYS.website)),
    country: asText(pick(source, KEYS.country)),
  };

  // A profile object where every candidate missed is not a profile. Returning
  // null lets the caller skip the section entirely instead of rendering a
  // heading over five em-dashes.
  const found = Object.values(profile).some((value) => value !== null);
  return found ? profile : null;
}
