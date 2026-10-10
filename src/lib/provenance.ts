import type { DataProvenance } from "@/types";

/**
 * Provenance rules, in one place so they can be tested rather than remembered.
 *
 * The PRD's hardest constraint is FR-14: *mock data is never presented as live
 * data*. That is easy to say and easy to violate one `if` at a time, so the
 * rule lives here as a small set of checkable predicates.
 */

/** Labels the UI is allowed to render for each provenance source. */
export function provenanceLabel(provenance: DataProvenance): string {
  switch (provenance.source) {
    case "live":
      return provenance.stale ? "Live data (cached)" : "Live data";
    case "cached":
      return "Cached data";
    case "mock":
      return "Sample data";
  }
}

/** Tailwind classes for the provenance badge, keyed to trust level. */
export function provenanceTone(provenance: DataProvenance): "live" | "cached" | "sample" {
  if (provenance.source === "mock") return "sample";
  if (provenance.stale || provenance.source === "cached") return "cached";
  return "live";
}

/**
 * Whether this data may be described as live *without qualification*.
 *
 * Note the strictness: a stale live response is not unqualified live data. The
 * UI must show "cached" or a last-updated time alongside it.
 */
export function isUnqualifiedLive(provenance: DataProvenance): boolean {
  return provenance.source === "live" && !provenance.stale;
}

/**
 * The invariant, as an assertion.
 *
 * The real-world way sample data gets mistaken for live data is not a wrong
 * `source` field — it is a *timestamp*. Every freshness indicator in the
 * product renders from `updatedAt`, so a mock record carrying a fresh
 * timestamp would display "Updated 3 seconds ago" to the user no matter what
 * `source` says. That is the failure this guards.
 *
 * So the rule is: mock provenance must have a null `updatedAt` and must map to
 * the "Sample data" label. Both are checkable, and both can actually fail if
 * someone later wires sample records through the live normaliser.
 */
export function assertNotPresentedAsLive(provenance: DataProvenance, context: string): void {
  if (provenance.source !== "mock") return;

  if (provenance.updatedAt !== null) {
    throw new Error(
      `Provenance violation in ${context}: sample data carries a timestamp (${provenance.updatedAt}). ` +
        `A non-null updatedAt renders as a live freshness indicator ("Updated N seconds ago"), ` +
        `which presents sample data as live. Keep it null.`,
    );
  }

  if (provenanceLabel(provenance) !== "Sample data") {
    throw new Error(
      `Provenance violation in ${context}: sample data is labelled "${provenanceLabel(provenance)}".`,
    );
  }
}

/**
 * Human sentence for a freshness indicator.
 *
 * Deliberately never says "real-time" — we do not have the upstream guarantees
 * to make that claim, and the TRD forbids implying them.
 */
export function freshnessSentence(provenance: DataProvenance): string {
  if (provenance.source === "mock") {
    return "Illustrative values, not live market data.";
  }
  if (!provenance.updatedAt) {
    return "Update time not reported by the source.";
  }

  const then = new Date(provenance.updatedAt);
  const seconds = Math.round((Date.now() - then.getTime()) / 1000);

  if (seconds < 10) return "Updated just now.";
  if (seconds < 60) return `Updated ${seconds} seconds ago.`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Updated ${minutes} minute${minutes === 1 ? "" : "s"} ago.`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last successful update ${hours} hour${hours === 1 ? "" : "s"} ago.`;

  return "Data may be out of date.";
}
