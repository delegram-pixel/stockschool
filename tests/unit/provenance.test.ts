import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertNotPresentedAsLive,
  freshnessSentence,
  isUnqualifiedLive,
  provenanceLabel,
  provenanceTone,
} from "@/lib/provenance";
import type { DataProvenance } from "@/types";

/**
 * FR-14: sample data is never presented as live data.
 *
 * The failure this file guards against is not a wrong `source` field — it is a
 * *timestamp*. Every freshness indicator in the product renders from `updatedAt`,
 * so a sample record carrying a fresh timestamp would say "Updated 3 seconds
 * ago" regardless of what `source` says. These are the checks that make that
 * impossible to ship by accident.
 */

const NOW = new Date("2026-10-09T12:00:00.000Z");

function provenance(overrides: Partial<DataProvenance> = {}): DataProvenance {
  return { source: "live", updatedAt: "2026-10-09T11:59:30.000Z", stale: false, ...overrides };
}

afterEach(() => {
  vi.useRealTimers();
});

// -----------------------------------------------------------------------------

describe("provenanceLabel", () => {
  it("calls fresh live data live", () => {
    expect(provenanceLabel(provenance())).toBe("Live data");
  });

  it("qualifies a stale live response rather than letting it pass as fresh", () => {
    expect(provenanceLabel(provenance({ stale: true }))).toBe("Live data (cached)");
  });

  it("never uses the word 'live' for cached or sample data", () => {
    // The four labels are the entire vocabulary the UI has. If "live" leaks into
    // one of these, the constraint is broken in the only place it is visible.
    expect(provenanceLabel(provenance({ source: "cached" }))).toBe("Cached data");
    expect(provenanceLabel(provenance({ source: "mock", updatedAt: null }))).toBe("Sample data");
  });
});

describe("provenanceTone", () => {
  it("maps each source to its trust level", () => {
    expect(provenanceTone(provenance())).toBe("live");
    expect(provenanceTone(provenance({ source: "cached" }))).toBe("cached");
    expect(provenanceTone(provenance({ source: "mock", updatedAt: null }))).toBe("sample");
  });

  it("treats a stale live response as cached, because that is how it reads", () => {
    expect(provenanceTone(provenance({ stale: true }))).toBe("cached");
  });

  it("keeps sample data at sample even if it is somehow marked stale", () => {
    // `stale` describes a live response that aged out. On a sample record it is
    // meaningless, and it must not be able to upgrade the trust level.
    expect(provenanceTone(provenance({ source: "mock", updatedAt: null, stale: true }))).toBe(
      "sample",
    );
  });
});

describe("isUnqualifiedLive", () => {
  it("is true only for fresh live data", () => {
    expect(isUnqualifiedLive(provenance())).toBe(true);
  });

  it("is false for everything the UI would have to qualify", () => {
    expect(isUnqualifiedLive(provenance({ stale: true }))).toBe(false);
    expect(isUnqualifiedLive(provenance({ source: "cached" }))).toBe(false);
    expect(isUnqualifiedLive(provenance({ source: "mock", updatedAt: null }))).toBe(false);
  });
});

// -----------------------------------------------------------------------------

describe("assertNotPresentedAsLive", () => {
  it("lets live and cached records through", () => {
    expect(() => assertNotPresentedAsLive(provenance(), "explore")).not.toThrow();
    expect(() =>
      assertNotPresentedAsLive(provenance({ source: "cached" }), "explore"),
    ).not.toThrow();
    expect(() =>
      assertNotPresentedAsLive(provenance({ stale: true }), "explore"),
    ).not.toThrow();
  });

  it("lets a correctly-formed sample record through", () => {
    const sample = provenance({ source: "mock", updatedAt: null, note: "No API key configured." });
    expect(() => assertNotPresentedAsLive(sample, "explore")).not.toThrow();
  });

  it("throws when sample data carries a timestamp", () => {
    // This is the actual bug being prevented: the source says "mock", but the
    // UI reads `updatedAt` and renders a live freshness indicator anyway.
    const lying = provenance({ source: "mock", updatedAt: "2026-10-09T12:00:00.000Z" });
    expect(() => assertNotPresentedAsLive(lying, "explore")).toThrow(/sample data carries a timestamp/);
  });

  it("names the context and the offending timestamp in the message", () => {
    const lying = provenance({ source: "mock", updatedAt: "2026-10-09T12:00:00.000Z" });
    expect(() => assertNotPresentedAsLive(lying, "home/price-pair")).toThrow(
      /home\/price-pair/,
    );
    expect(() => assertNotPresentedAsLive(lying, "home")).toThrow(/2026-10-09T12:00:00.000Z/);
  });

  it("has a second guard that no input can reach today", () => {
    // `provenanceLabel` returns "Sample data" for every mock record, so the
    // mislabelling branch is currently unreachable. It is kept as a tripwire:
    // if a future label ever makes a mock read as anything else, it fires.
    // The assertion below is the observable form of that — a correctly-formed
    // sample record always satisfies the whole contract.
    const sample = provenance({ source: "mock", updatedAt: null });
    expect(provenanceLabel(sample)).toBe("Sample data");
    expect(() => assertNotPresentedAsLive(sample, "test")).not.toThrow();
  });
});

// -----------------------------------------------------------------------------

describe("freshnessSentence", () => {
  it("says plainly that sample values are not market data", () => {
    expect(freshnessSentence(provenance({ source: "mock", updatedAt: null }))).toBe(
      "Illustrative values, not live market data.",
    );
  });

  it("admits when the source did not report a time", () => {
    expect(freshnessSentence(provenance({ updatedAt: null }))).toBe(
      "Update time not reported by the source.",
    );
    expect(freshnessSentence(provenance({ source: "cached", updatedAt: null }))).toBe(
      "Update time not reported by the source.",
    );
  });

  it("steps up through the time units", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    const secondsAgo = (n: number) =>
      new Date(NOW.getTime() - n * 1000).toISOString();

    expect(freshnessSentence(provenance({ updatedAt: secondsAgo(3) }))).toBe("Updated just now.");
    expect(freshnessSentence(provenance({ updatedAt: secondsAgo(30) }))).toBe(
      "Updated 30 seconds ago.",
    );
    expect(freshnessSentence(provenance({ updatedAt: secondsAgo(60) }))).toBe(
      "Updated 1 minute ago.",
    );
    expect(freshnessSentence(provenance({ updatedAt: secondsAgo(120) }))).toBe(
      "Updated 2 minutes ago.",
    );
    expect(freshnessSentence(provenance({ updatedAt: secondsAgo(3600) }))).toBe(
      "Last successful update 1 hour ago.",
    );
    expect(freshnessSentence(provenance({ updatedAt: secondsAgo(10800) }))).toBe(
      "Last successful update 3 hours ago.",
    );
  });

  it("stops implying freshness after a day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(freshnessSentence(provenance({ updatedAt: "2026-10-07T12:00:00.000Z" }))).toBe(
      "Data may be out of date.",
    );
  });

  it("never claims to be real-time", () => {
    // We do not have the upstream guarantees to make that claim, and the TRD
    // forbids implying them. The sample sentence is exempt from the "live"
    // check below — it exists precisely to say the data is *not* live — but
    // nothing that renders real data may use the word at all.
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    const realData = [
      provenance({ updatedAt: null }),
      provenance({ updatedAt: NOW.toISOString() }),
      provenance({ updatedAt: "2026-10-09T11:00:00.000Z" }),
      provenance({ updatedAt: "2026-10-01T00:00:00.000Z" }),
      provenance({ source: "cached", updatedAt: null }),
    ];

    for (const item of realData) {
      expect(freshnessSentence(item).toLowerCase()).not.toContain("real-time");
      expect(freshnessSentence(item).toLowerCase()).not.toContain("live");
    }

    // The one sentence allowed to use the word, and it negates it.
    const sample = freshnessSentence(provenance({ source: "mock", updatedAt: null }));
    expect(sample).toBe("Illustrative values, not live market data.");
  });
});
