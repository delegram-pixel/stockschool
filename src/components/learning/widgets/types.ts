import type { TokenizedStock } from "@/types";

/**
 * The contract every interactive widget implements.
 *
 * Widgets receive the normalised asset feed rather than fetching anything
 * themselves. That keeps them pure, keeps the data-fetching story in one place
 * (the page), and means a widget can be rendered in a test with two lines of
 * fixture instead of a mocked network.
 */
export type WidgetProps = {
  /** Normalised assets from the live or sample feed. May be empty. */
  assets: TokenizedStock[];
  /** Per-lesson configuration. Lessons may only pass serialisable values. */
  config?: Record<string, unknown>;
};
