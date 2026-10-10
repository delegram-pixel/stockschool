import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Binance Web3 API request signing.
 *
 * The scheme is documented as:
 *
 *   preHash   = timestamp + method + requestPath + body
 *   signature = Base64( HMAC-SHA256( preHash, secretKey ) )
 *
 * `requestPath` MUST include the `/build` prefix and MUST include the query
 * string. Getting this wrong produces `40102 Invalid signature`, whose message
 * gives no hint about the prefix — which is the single most expensive
 * debugging trap in this API. See DX_NOTES.md for the full write-up.
 *
 * Three rules that this module exists to enforce, because each one cost real
 * debugging time:
 *
 *  1. `requestPath` starts with `/build`, not `/api`.
 *  2. The query string is part of the signed payload, in the exact order it
 *     will be transmitted. Serialise once, sign that, send that.
 *  3. For a GET the body is the empty string — not `"{}"`, not `"null"`.
 *     A JSON-stringified empty object silently invalidates the signature.
 */

export type SignableRequest = {
  method: "GET" | "POST" | "DELETE" | "PUT";
  /**
   * Path including the `/build` prefix and the query string,
   * e.g. `/build/api/v1/dex/market/rwa/price?chainId=56&symbol=NVDA`
   */
  requestPath: string;
  /** Raw request body, serialised exactly once. Empty string for GET. */
  body?: string;
  /** ISO 8601 with milliseconds, e.g. `2026-05-11T10:08:57.715Z`. */
  timestamp: string;
};

/** The exact string that gets hashed. Exported so tests can assert on it. */
export function buildPreHash({ method, requestPath, body = "", timestamp }: SignableRequest): string {
  return `${timestamp}${method.toUpperCase()}${requestPath}${body}`;
}

/** Base64 HMAC-SHA256 over the pre-hash. */
export function signPreHash(preHash: string, secretKey: string): string {
  return createHmac("sha256", secretKey).update(preHash, "utf8").digest("base64");
}

/**
 * ISO 8601 with exactly three fractional digits, which is the format the API
 * accepts. `Date#toISOString()` already does this — we just avoid the local
 * variants that drop milliseconds (`toJSON` on some runtimes) or emit an
 * offset (`toLocaleString`).
 */
export function isoTimestamp(now: Date = new Date()): string {
  return now.toISOString();
}

/**
 * Guards against the two most common causes of `40102` before the request
 * leaves the process. Throwing here turns a 200ms round-trip and a cryptic
 * upstream error into an immediate, actionable local failure.
 */
export function assertSignable(req: SignableRequest): void {
  if (!req.requestPath.startsWith("/build/")) {
    throw new Error(
      `Refusing to sign: requestPath must start with "/build" (got "${req.requestPath}"). ` +
        `This is the #1 cause of 40102 Invalid signature.`,
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(req.timestamp)) {
    throw new Error(
      `Refusing to sign: timestamp must be ISO 8601 with milliseconds and a Z suffix (got "${req.timestamp}").`,
    );
  }
  if (req.method === "GET" && req.body !== undefined && req.body !== "") {
    throw new Error(`Refusing to sign: GET requests must have an empty body, got "${req.body}".`);
  }
}

/**
 * Constant-time comparison, used by the signature self-test endpoint so that
 * a debugging helper cannot itself become a timing oracle.
 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Serialise query parameters deterministically.
 *
 * Callers must build the URL from the *result* of this function so the signed
 * path and the transmitted path cannot drift apart. `undefined` and `null`
 * values are dropped rather than rendered as "undefined".
 */
export function buildQuery(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.append(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}
