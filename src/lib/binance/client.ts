import {
  assertSignable,
  buildPreHash,
  buildQuery,
  isoTimestamp,
  signPreHash,
} from "./signature";
import { rawErrorBody } from "./schemas";
import { ProviderError, type Result } from "@/types";

/**
 * Signed, server-only client for the Binance Web3 API.
 *
 * NEVER import this from a Client Component. It reads BINANCE_WEB3_API_SECRET,
 * which must not exist in the browser bundle. All callers go through
 * `src/server/services/*`, which are server components or route handlers.
 *
 * Why a hand-rolled client instead of a generated SDK: the signing scheme is
 * four lines, and pinning the pre-hash construction in our own code is what
 * makes the DX report's "spent two hours on the /build prefix" story
 * reproducible by anyone reading the repo.
 */

// The fallback is the same host the portal lives on, because that is where the
// API lives too. It used to read `https://api.web3.binance.com`, a host that
// appears in no documentation and does not resolve — so any deployment that
// forgot to set BINANCE_WEB3_BASE_URL would have failed with a DNS error that
// reads exactly like a credentials problem. A wrong default is worse than no
// default: it fails in a way that sends you looking in the wrong place.
const BASE_URL = (process.env.BINANCE_WEB3_BASE_URL ?? "https://web3.binance.com").replace(
  /\/+$/,
  "",
);

/** The `/build` prefix. Swapping this is the whole point of the constant. */
const BASE_PATH = process.env.BINANCE_WEB3_BASE_PATH ?? "/build";

const TIMEOUT_MS = Number(process.env.BINANCE_WEB3_TIMEOUT_MS ?? 8000);

export const CACHE_TTL_SECONDS = Number(process.env.BINANCE_WEB3_CACHE_TTL_SECONDS ?? 60);

/** True when credentials are present. Callers check this to choose fallbacks. */
export function isConfigured(): boolean {
  return Boolean(process.env.BINANCE_WEB3_API_KEY && process.env.BINANCE_WEB3_API_SECRET);
}

type RequestOptions = {
  /** Query params. Serialised deterministically by `buildQuery`. */
  query?: Record<string, string | number | boolean | undefined | null>;
  method?: "GET" | "POST";
  body?: unknown;
  /** Next.js fetch cache lifetime in seconds. Defaults to the configured TTL. */
  revalidate?: number;
  /** Correlation id used in logs only. */
  label: string;
};

export type UpstreamResult<T> = Result<{ data: T; fetchedAt: string; fromCache: boolean }>;

/**
 * Perform one signed request.
 *
 * Returns a `Result` rather than throwing, so a provider outage degrades into
 * a labelled fallback instead of a 500. Callers still need to check `ok`.
 */
export async function request<T = unknown>(
  endpoint: string,
  options: RequestOptions,
): Promise<UpstreamResult<T>> {
  const { query, method = "GET", body, revalidate = CACHE_TTL_SECONDS, label } = options;

  const apiKey = process.env.BINANCE_WEB3_API_KEY;
  const apiSecret = process.env.BINANCE_WEB3_API_SECRET;

  if (!apiKey || !apiSecret) {
    return {
      ok: false,
      error: new ProviderError(
        "NOT_CONFIGURED",
        "Binance Web3 API credentials are not configured.",
        { detail: "BINANCE_WEB3_API_KEY / BINANCE_WEB3_API_SECRET are unset." },
      ),
    };
  }

  // Path is built in exactly two pieces and both are used verbatim: the signed
  // string and the transmitted URL are the same variable. They cannot drift.
  const requestPath = `${BASE_PATH}${endpoint}${buildQuery(query ?? {})}`;

  // A GET body must be the empty string. `JSON.stringify(undefined)` is
  // `undefined`, which would render "undefined" into the pre-hash — so we
  // short-circuit rather than rely on the default.
  const rawBody = method === "GET" || body === undefined ? "" : JSON.stringify(body);

  const timestamp = isoTimestamp();

  try {
    assertSignable({ method, requestPath, body: rawBody, timestamp });
  } catch (error) {
    return {
      ok: false,
      error: new ProviderError("UPSTREAM_ERROR", "Refused to sign an invalid request.", {
        detail: error instanceof Error ? error.message : String(error),
        cause: error,
      }),
    };
  }

  const signature = signPreHash(buildPreHash({ method, requestPath, body: rawBody, timestamp }), apiSecret);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${requestPath}`, {
      method,
      headers: {
        "X-OC-APIKEY": apiKey,
        "X-OC-TIMESTAMP": timestamp,
        "X-OC-SIGN": signature,
        Accept: "application/json",
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      body: method === "POST" ? rawBody : undefined,
      signal: controller.signal,
      next: { revalidate },
    });
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      error: new ProviderError(
        aborted ? "TIMEOUT" : "UPSTREAM_ERROR",
        aborted
          ? "The market data service took too long to respond."
          : "Could not reach the market data service.",
        { detail: `${label}: ${error instanceof Error ? error.message : String(error)}`, cause: error },
      ),
    };
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    // Read the body for the log, but never surface it to the user verbatim.
    const text = await response.text().catch(() => "");
    const parsed = rawErrorBody.safeParse(safeJson(text));
    const upstreamMsg = parsed.success
      ? (parsed.data.msg ?? parsed.data.message ?? parsed.data.error ?? "")
      : "";

    return {
      ok: false,
      error: new ProviderError(mapStatus(response.status), messageForStatus(response.status), {
        status: response.status,
        detail: `${label}: HTTP ${response.status} ${upstreamMsg || text.slice(0, 300)}`,
      }),
    };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    return {
      ok: false,
      error: new ProviderError("INVALID_RESPONSE", "The market data service returned a malformed response.", {
        detail: `${label}: response was not valid JSON`,
        cause: error,
      }),
    };
  }

  // Binance sometimes returns HTTP 200 with a non-zero business code. Treat
  // that as an upstream error rather than silently returning an empty list.
  const envelope = payload as { code?: string | number } | null;
  if (envelope && typeof envelope === "object" && "code" in envelope) {
    const code = Number(envelope.code);
    if (Number.isFinite(code) && code !== 0 && code !== 200) {
      return {
        ok: false,
        error: new ProviderError(codeToErrorCode(code), messageForStatus(200), {
          detail: `${label}: business code ${code}`,
        }),
      };
    }
  }

  return { ok: true, data: { data: payload as T, fetchedAt: new Date().toISOString(), fromCache: false } };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function mapStatus(status: number) {
  if (status === 401 || status === 403) return "UNAUTHORIZED" as const;
  if (status === 404) return "NOT_FOUND" as const;
  if (status === 429) return "RATE_LIMITED" as const;
  if (status === 408 || status === 504) return "TIMEOUT" as const;
  return "UPSTREAM_ERROR" as const;
}

/**
 * 40102 is the signature error. We name it explicitly because it is the one
 * that wastes peoples' afternoons — the message upstream gives is generic.
 */
function codeToErrorCode(code: number) {
  if (code === 40101 || code === 40102 || code === 40103) return "UNAUTHORIZED" as const;
  if (code === 42900 || code === 429) return "RATE_LIMITED" as const;
  return "UPSTREAM_ERROR" as const;
}

/** User-facing copy. Deliberately says what the user can do, not what broke. */
function messageForStatus(status: number): string {
  if (status === 401 || status === 403) return "Market data is temporarily unavailable.";
  if (status === 404) return "That asset was not found.";
  if (status === 429) return "Too many requests right now. Showing the last known data.";
  if (status >= 500) return "The market data service is having trouble.";
  return "Market data is temporarily unavailable.";
}

/** Human-readable code, surfaced in the DX self-test panel. */
export function explainError(error: ProviderError): string {
  switch (error.code) {
    case "NOT_CONFIGURED":
      return "No API credentials. Copy .env.example to .env and add your Binance Web3 API key and secret.";
    case "UNAUTHORIZED":
      return "Signature rejected. Check that the signed request path starts with /build and that the timestamp is ISO 8601 with milliseconds.";
    case "RATE_LIMITED":
      return "Rate limited. Registering your hackathon email with Binance raises these limits.";
    case "TIMEOUT":
      return "Upstream timed out. Showing cached data where available.";
    case "NOT_FOUND":
      return "The upstream service has no record of this asset.";
    case "INVALID_RESPONSE":
      return "Upstream returned something we could not parse. This usually means the response shape changed.";
    default:
      return "Upstream error. Details are in the server log.";
  }
}
