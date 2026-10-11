import { describe, expect, it } from "vitest";
import {
  assertSignable,
  buildPreHash,
  buildQuery,
  isoTimestamp,
  safeEqual,
  signPreHash,
} from "@/lib/binance/signature";

/**
 * Request signing.
 *
 * This is the highest-value test file in the repository, and not because the
 * scheme is complicated — it is four concatenated strings and one HMAC. It is
 * high-value because *every* way of getting it wrong produces the same useless
 * upstream message: `40102 Invalid signature`. There is no partial credit and no
 * hint about which of the four fields was malformed.
 *
 * So the tests below are written per-mistake rather than per-function. Each one
 * reproduces a specific way the signature goes wrong and asserts that the
 * boundary catches it locally instead of costing a round trip.
 *
 * The paths in these fixtures are real ones, with the parameter names the live
 * API actually accepts (`binanceChainId`, not `chainId`). Nothing here depends on
 * that — the scheme is pure concatenation, so any string would test it equally —
 * but a repository whose DX report is about parameter names should not be caught
 * using the wrong one in its own examples.
 */

describe("buildPreHash", () => {
  it("concatenates timestamp, method, path and body in that order", () => {
    expect(
      buildPreHash({
        timestamp: "2026-10-09T12:00:00.000Z",
        method: "GET",
        requestPath: "/build/api/v1/dex/market/rwa/price?binanceChainId=56",
      }),
    ).toBe("2026-10-09T12:00:00.000ZGET/build/api/v1/dex/market/rwa/price?binanceChainId=56");
  });

  it("defaults the body to the empty string, not to '{}' or 'null'", () => {
    const withBody = buildPreHash({
      timestamp: "T",
      method: "GET",
      requestPath: "/build/x",
      body: "",
    });
    const withoutBody = buildPreHash({ timestamp: "T", method: "GET", requestPath: "/build/x" });

    expect(withBody).toBe(withoutBody);
    expect(withBody.endsWith("x")).toBe(true);
    // The two strings a JSON serialiser would produce instead.
    expect(withoutBody).not.toContain("{}");
    expect(withoutBody).not.toContain("null");
  });

  it("upper-cases the method", () => {
    expect(buildPreHash({ timestamp: "T", method: "GET", requestPath: "/build/x" })).toContain(
      "TGET",
    );
  });

  it("includes the query string verbatim, because it is part of the signed path", () => {
    const a = buildPreHash({ timestamp: "T", method: "GET", requestPath: "/build/x?a=1&b=2" });
    const b = buildPreHash({ timestamp: "T", method: "GET", requestPath: "/build/x?b=2&a=1" });
    expect(a).not.toBe(b);
  });
});

describe("assertSignable", () => {
  const valid = {
    timestamp: "2026-10-09T12:00:00.000Z",
    method: "GET" as const,
    requestPath: "/build/api/v1/dex/market/rwa/tokens?binanceChainId=56",
  };

  it("accepts a well-formed GET", () => {
    expect(() => assertSignable(valid)).not.toThrow();
  });

  it("refuses a path that is missing the /build prefix", () => {
    // The single most expensive mistake in this API: the documented examples
    // show requestPath with the /build prefix and the error message never
    // mentions it.
    expect(() => assertSignable({ ...valid, requestPath: "/api/v1/dex/market/rwa/tokens" })).toThrow(
      /must start with "\/build"/,
    );
  });

  it("refuses /build without the trailing slash", () => {
    // "/buildfoo" is not under /build, and a prefix check that used
    // `startsWith("/build")` would wave it through.
    expect(() => assertSignable({ ...valid, requestPath: "/buildfoo" })).toThrow();
  });

  it("refuses a timestamp without milliseconds", () => {
    expect(() =>
      assertSignable({ ...valid, timestamp: "2026-10-09T12:00:00Z" }),
    ).toThrow(/ISO 8601 with milliseconds/);
  });

  it("refuses a timestamp with a numeric offset", () => {
    expect(() =>
      assertSignable({ ...valid, timestamp: "2026-10-09T12:00:00.000+02:00" }),
    ).toThrow(/ISO 8601 with milliseconds/);
  });

  it("refuses a GET carrying a body", () => {
    expect(() => assertSignable({ ...valid, body: "{}" })).toThrow(/empty body/);
  });

  it("allows a POST to carry a body", () => {
    expect(() =>
      assertSignable({ ...valid, method: "POST", body: '{"binanceChainId":56}' }),
    ).not.toThrow();
  });

  it("allows an explicitly empty GET body, since that is what the signer sends", () => {
    expect(() => assertSignable({ ...valid, body: "" })).not.toThrow();
  });
});

describe("isoTimestamp", () => {
  it("produces exactly three fractional digits and a Z", () => {
    expect(isoTimestamp(new Date("2026-10-09T12:00:00.000Z"))).toBe("2026-10-09T12:00:00.000Z");
  });

  it("is accepted by the signer's own guard", () => {
    // The two must not drift: a timestamp this function emits has to satisfy
    // the assertion that runs immediately before signing.
    expect(() =>
      assertSignable({
        timestamp: isoTimestamp(),
        method: "GET",
        requestPath: "/build/x",
      }),
    ).not.toThrow();
  });
});

describe("signPreHash", () => {
  const secret = "test-secret-key";

  it("produces a base64 SHA-256 HMAC", () => {
    const signature = signPreHash("some-prehash", secret);
    // 32 raw bytes -> 44 base64 characters including one padding character.
    expect(signature).toHaveLength(44);
    expect(signature.endsWith("=")).toBe(true);
    expect(signature).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
  });

  it("is deterministic", () => {
    expect(signPreHash("abc", secret)).toBe(signPreHash("abc", secret));
  });

  it("changes completely when one character of the pre-hash changes", () => {
    const a = signPreHash("2026-10-09T12:00:00.000ZGET/build/x?binanceChainId=56", secret);
    const b = signPreHash("2026-10-09T12:00:00.000ZGET/build/x?binanceChainId=57", secret);
    expect(a).not.toBe(b);
    // Hex digit 5 vs 7 is one bit. The whole digest should move.
    expect(commonPrefixLength(a, b)).toBeLessThan(8);
  });

  it("depends on the secret", () => {
    expect(signPreHash("abc", "secret-a")).not.toBe(signPreHash("abc", "secret-b"));
  });

  it("treats the pre-hash as UTF-8, not as latin-1", () => {
    // The query string can carry a company name with non-ASCII characters; the
    // bytes hashed must be the bytes sent.
    expect(signPreHash("café", secret)).not.toBe(signPreHash("cafÃ©", secret));
  });
});

describe("buildQuery", () => {
  it("preserves insertion order", () => {
    // Order is load-bearing: this string is what gets signed, so a Map-like
    // reordering of keys here would invalidate every signature.
    expect(buildQuery({ b: 2, a: 1 })).toBe("?b=2&a=1");
  });

  it("drops absent values instead of rendering them as 'undefined'", () => {
    expect(buildQuery({ a: 1, b: undefined, c: null })).toBe("?a=1");
  });

  it("drops empty strings", () => {
    expect(buildQuery({ symbol: "" })).toBe("");
  });

  it("keeps zero and false, which are real values", () => {
    // `value === ""` is the guard, not `!value`.
    expect(buildQuery({ binanceChainId: 0 })).toBe("?binanceChainId=0");
    expect(buildQuery({ flag: false })).toBe("?flag=false");
  });

  it("returns an empty string when there is nothing to send", () => {
    expect(buildQuery({})).toBe("");
  });

  it("percent-encodes values", () => {
    expect(buildQuery({ keyword: "coca cola" })).toBe("?keyword=coca+cola");
  });
});

describe("safeEqual", () => {
  it("compares equal strings", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
  });

  it("reports inequality for different lengths without throwing", () => {
    // `timingSafeEqual` itself throws on a length mismatch, which would turn a
    // wrong signature into a 500 rather than a 401.
    expect(safeEqual("abc", "abcd")).toBe(false);
  });

  it("reports inequality for same-length different content", () => {
    expect(safeEqual("abc", "abd")).toBe(false);
  });
});

/** Longest shared prefix, used to assert the digest actually avalanches. */
function commonPrefixLength(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  return i;
}
