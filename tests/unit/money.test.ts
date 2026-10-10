import { describe, expect, it } from "vitest";
import {
  Decimal,
  formatCompact,
  formatCurrency,
  formatPercent,
  formatQuantity,
  formatRelativeTime,
  formatSignedCurrency,
  isDecimalString,
  requireDecimal,
  toDecimal,
} from "@/lib/calculations/money";

/**
 * The money module is the one place rounding happens, so it is the one place
 * where a regression is invisible until a learner's arithmetic stops adding up.
 * These tests pin the behaviour at the boundary — decimal strings in, formatted
 * strings out — rather than testing `decimal.js` itself.
 */

describe("toDecimal", () => {
  it("parses decimal strings", () => {
    expect(toDecimal("3.5")?.toString()).toBe("3.5");
    expect(toDecimal("10000")?.toString()).toBe("10000");
  });

  it("returns null for absent values rather than throwing", () => {
    expect(toDecimal(null)).toBeNull();
    expect(toDecimal(undefined)).toBeNull();
    expect(toDecimal("")).toBeNull();
    // The string forms of null are what a careless JSON round trip produces,
    // and they are the ones most likely to be mistaken for a number.
    expect(toDecimal("null")).toBeNull();
    expect(toDecimal("undefined")).toBeNull();
  });

  it("returns null for values that are not finite", () => {
    expect(toDecimal("abc")).toBeNull();
    expect(toDecimal(Number.POSITIVE_INFINITY)).toBeNull();
    expect(toDecimal(Number.NaN)).toBeNull();
  });

  it("passes Decimal instances through unchanged", () => {
    const d = new Decimal("7.25");
    expect(toDecimal(d)).toBe(d);
  });
});

describe("requireDecimal", () => {
  it("throws with the context in the message", () => {
    expect(() => requireDecimal("", "cash balance")).toThrow(/cash balance/);
  });

  it("returns the value when it is usable", () => {
    expect(requireDecimal("12", "quantity").toString()).toBe("12");
  });
});

describe("isDecimalString", () => {
  it("accepts exactly the notation this codebase writes", () => {
    for (const value of ["0", "10000", "-5", "+2", "3.5", ".5", "5.", "-0.00000001"]) {
      expect(isDecimalString(value), value).toBe(true);
    }
  });

  it("rejects everything else", () => {
    const rejected = [
      "",
      " ",
      "null",
      "undefined",
      "NaN",
      "Infinity",
      // Exponential and hexadecimal notation: decimal.js understands both, which
      // is exactly why this predicate exists separately from toDecimal.
      "1e5",
      "0x10",
      // A lone dot, and multiple dots.
      ".",
      "1.2.3",
      // Separators and currency symbols are formatting, not value.
      "1,000",
      "$10",
      "10%",
      " 10",
      "10 ",
    ];
    for (const value of rejected) {
      expect(isDecimalString(value), JSON.stringify(value)).toBe(false);
    }
  });

  it("agrees with toDecimal on everything it accepts", () => {
    // The predicate and the parser must never disagree: storage decides what to
    // keep with one and what to compute with the other.
    for (const value of ["0", "-5", "3.5", ".5", "5."]) {
      expect(isDecimalString(value)).toBe(toDecimal(value) !== null);
    }
  });
});

describe("formatCurrency", () => {
  it("formats with two decimals and a thousands separator", () => {
    expect(formatCurrency("10000")).toBe("$10,000.00");
    expect(formatCurrency("1234.5")).toBe("$1,234.50");
  });

  it("uses an em-dash for unavailable values", () => {
    expect(formatCurrency(null)).toBe("—");
    expect(formatCurrency("not a number")).toBe("—");
  });

  it("honours a custom placeholder", () => {
    expect(formatCurrency(null, { placeholder: "unavailable" })).toBe("unavailable");
  });
});

describe("formatPercent", () => {
  it("marks the sign on a signed quantity and leaves zero unsigned", () => {
    expect(formatPercent("2")).toBe("+2.00%");
    expect(formatPercent("-0.31")).toBe("−0.31%");
    expect(formatPercent("0")).toBe("0.00%");
  });

  it("omits the plus for a magnitude, but still shows a negative sign", () => {
    // `signed: false` is used where the direction is already stated by the
    // surrounding copy ("3.20% below"), so only the minus carries information.
    expect(formatPercent("3.2", { signed: false })).toBe("3.20%");
    expect(formatPercent("-3.2", { signed: false })).toBe("−3.20%");
  });

  it("uses the typographic minus, matching formatSignedCurrency", () => {
    // These two render on the same line in the price pair. An ASCII hyphen in
    // one and U+2212 in the other is a visible mismatch.
    expect(formatPercent("-1")).toContain("−");
    expect(formatSignedCurrency("-1")).toContain("−");
    expect(formatPercent("-1")).not.toContain("-");
  });
});

describe("formatSignedCurrency", () => {
  it("prefixes the direction and drops it at zero", () => {
    expect(formatSignedCurrency("3.6")).toBe("+$3.60");
    expect(formatSignedCurrency("-3.6")).toBe("−$3.60");
    expect(formatSignedCurrency("0")).toBe("$0.00");
  });

  it("uses an em-dash for unavailable values", () => {
    expect(formatSignedCurrency(null)).toBe("—");
  });
});

describe("formatQuantity", () => {
  it("trims trailing zeros instead of padding to a fixed width", () => {
    expect(formatQuantity("3")).toBe("3");
    expect(formatQuantity("3.500000")).toBe("3.5");
    expect(formatQuantity("0.000001")).toBe("0.000001");
  });

  it("truncates below the display precision rather than showing scientific notation", () => {
    // A dust-sized simulated holding must not render as "1e-8".
    expect(formatQuantity("0.00000001")).toBe("0");
  });

  it("renders zero as a zero, not as an empty string", () => {
    // The naive trailing-zero strip turns "0.000000" into "".
    expect(formatQuantity("0")).toBe("0");
  });

  it("rounds down, so it never overstates a holding", () => {
    expect(formatQuantity("1.9999999")).toBe("1.999999");
  });

  it("uses an em-dash for unavailable values", () => {
    expect(formatQuantity(null)).toBe("—");
  });
});

describe("formatCompact", () => {
  it("abbreviates large figures", () => {
    expect(formatCompact("1240000000")).toBe("1.24B");
  });

  it("can carry a currency", () => {
    expect(formatCompact("1240000000", { currency: "USD" })).toBe("$1.24B");
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-10-09T12:00:00.000Z");

  it("reports recent times as 'just now' rather than counting seconds", () => {
    expect(formatRelativeTime("2026-10-09T11:59:55.000Z", now)).toBe("just now");
  });

  it("steps up through seconds, minutes, hours and days", () => {
    expect(formatRelativeTime("2026-10-09T11:59:30.000Z", now)).toBe("30 seconds ago");
    expect(formatRelativeTime("2026-10-09T11:58:00.000Z", now)).toBe("2 minutes ago");
    expect(formatRelativeTime("2026-10-09T11:00:00.000Z", now)).toBe("1 hour ago");
    expect(formatRelativeTime("2026-10-08T12:00:00.000Z", now)).toBe("1 day ago");
  });

  it("treats a future timestamp as 'just now' instead of a negative age", () => {
    expect(formatRelativeTime("2026-10-09T12:00:30.000Z", now)).toBe("just now");
  });

  it("says 'unknown' for a missing or unparseable value", () => {
    expect(formatRelativeTime(null, now)).toBe("unknown");
    expect(formatRelativeTime("not a date", now)).toBe("unknown");
  });
});
