/**
 * Small shared helpers.
 *
 * `cn` deliberately avoids a dependency: every className in this codebase is
 * authored by us and composed in one place, so a plain join is enough. If we
 * ever accept classNames from callers who might pass conflicting Tailwind
 * utilities, that is the moment to reach for a merge library — not before.
 */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

/**
 * Clamp a number into a range. Used by the interactive widgets, which are full
 * of sliders and would otherwise produce out-of-range values on odd input.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Turn a slug into a Title Case label, for breadcrumbs and fallbacks. */
export function titleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Stable id for aria-labelledby / aria-describedby wiring. */
export function slugifyForId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Truncate a contract address for display, while the full value stays available
 * via `title` and the copy control beside it.
 *
 * Lives here rather than in `binance/normalize.ts`, where it started: it is a
 * pure display helper with nothing to do with the API, and a client component
 * needing it should not have to import the signed-request layer to get it.
 */
export function truncateAddress(address: string, lead = 6, tail = 4): string {
  if (address.length <= lead + tail + 2) return address;
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}
