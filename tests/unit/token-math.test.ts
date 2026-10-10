import { describe, expect, it } from "vitest";
import { Decimal } from "@/lib/calculations/money";
import { describeRatio, scaleSupply } from "@/lib/blockchain/token-math";

/**
 * The decimals trap.
 *
 * `totalSupply()` returns an integer in the token's smallest unit. The whole
 * reason this function exists is that the wrong answer here is not obviously
 * wrong — it is off by a factor of 10^decimals and looks entirely plausible.
 *
 * So the tests below pin two things: the conversion is exact, and a contract that
 * does not answer both halves produces `null` rather than a confident guess.
 */

/** Compare as numbers, so a test never accidentally asserts on padding. */
function value(supply: { tokens: string }): string {
  return new Decimal(supply.tokens).toString();
}

describe("scaleSupply", () => {
  it("refuses to guess when the contract did not report both halves", () => {
    // The expensive failure: assuming 18 because it is the common case.
    expect(scaleSupply(null, 18)).toBeNull();
    expect(scaleSupply("1000000000000000000000", null)).toBeNull();
    expect(scaleSupply(null, null)).toBeNull();
  });

  it("converts an 18-decimal supply", () => {
    const scaled = scaleSupply("1000000000000000000000", 18);
    expect(scaled).not.toBeNull();
    expect(value(scaled!)).toBe("1000");
    expect(scaled?.decimals).toBe(18);
  });

  it("converts a 6-decimal supply", () => {
    // USDC-style. A function that hard-coded 18 would report 0.000001 here.
    expect(value(scaleSupply("1000000000", 6)!)).toBe("1000");
  });

  it("handles a token with no decimals at all", () => {
    const scaled = scaleSupply("42", 0);
    expect(scaled?.tokens).toBe("42");
    expect(value(scaled!)).toBe("42");
  });

  it("returns the raw figure exactly as the contract gave it", () => {
    // The raw value is shown beside the conversion so a learner can see the
    // division. Normalising it would break that pairing.
    const scaled = scaleSupply("0001000000000000000000", 18);
    expect(scaled?.raw).toBe("0001000000000000000000");
    expect(value(scaled!)).toBe("1");
  });

  it("treats a zero supply as zero, not as missing", () => {
    const scaled = scaleSupply("0", 18);
    expect(scaled).not.toBeNull();
    expect(value(scaled!)).toBe("0");
  });

  it("rejects a raw supply that is not a number", () => {
    expect(scaleSupply("", 18)).toBeNull();
    expect(scaleSupply("a lot", 18)).toBeNull();
    expect(scaleSupply("1e21", 18)).toBeNull();
    expect(scaleSupply("1,000", 18)).toBeNull();
  });

  it("rejects a negative supply, which no token has", () => {
    expect(scaleSupply("-1000000000000000000", 18)).toBeNull();
  });

  it("rejects a decimals() value that is not a whole number of places", () => {
    // A fractional or negative decimal count is not a token we can describe,
    // and rounding it would silently change the answer.
    expect(scaleSupply("1000", -1)).toBeNull();
    expect(scaleSupply("1000", 18.5)).toBeNull();
    expect(scaleSupply("1000", Number.NaN)).toBeNull();
  });

  it("rejects an absurd decimals() rather than trusting it", () => {
    expect(scaleSupply("1000", 78)).toBeNull();
  });

  it("keeps full precision in the converted figure", () => {
    // 1 wei of an 18-decimal token is 1e-18, and it must survive. The padded
    // form is deliberate: the explainer prints this string beside the words
    // "to the last decimal", so trailing zeros are information, not noise.
    expect(value(scaleSupply("1", 18)!)).toBe("1e-18");
    expect(scaleSupply("1", 18)!.tokens).toBe("0.000000000000000001");
  });

  it("does not lose a supply large enough to matter", () => {
    // A trillion tokens with 18 decimals: 30 digits, well past a float's
    // exact-integer range, which is why this is Decimal arithmetic.
    expect(value(scaleSupply("1000000000000000000000000000000", 18)!)).toBe("1000000000000");
  });

  it("stops at 18 decimal places when the token has more", () => {
    // Nothing renders 53 decimal places usefully, and the raw figure is on
    // screen next to it for anyone who wants the exact value.
    const scaled = scaleSupply("1000000000000000000000000", 77);
    expect(scaled?.decimals).toBe(77);
    expect(value(scaled!)).toBe("0");
    expect(scaled?.tokens).toBe("0." + "0".repeat(18));
  });
});

describe("describeRatio", () => {
  it("returns null when the issuer disclosed nothing", () => {
    expect(describeRatio(null)).toBeNull();
    expect(describeRatio("")).toBeNull();
    expect(describeRatio("   ")).toBeNull();
  });

  it("trims without reformatting", () => {
    expect(describeRatio("  1 token = 0.1 share  ")).toBe("1 token = 0.1 share");
  });

  it("passes the issuer's own wording through", () => {
    // Canonicalising "1 token = 0.1 share" risks inverting it to "1 share per
    // token" for a ratio that means the opposite. Show what they wrote.
    expect(describeRatio("1:1")).toBe("1:1");
    expect(describeRatio("Each token is backed by one share")).toBe(
      "Each token is backed by one share",
    );
  });
});
