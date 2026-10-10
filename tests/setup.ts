import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

/**
 * Test environment setup.
 *
 * jsdom implements most of the DOM but not the parts a browser would bring in
 * from the outside world, and the components in this product use three of them.
 * Each stub below is here because a specific component would otherwise throw
 * during render, and each is deliberately a no-op rather than a fake with
 * behaviour — if a test needs to assert on scrolling or media queries, it should
 * say so explicitly in that test rather than inherit a plausible default.
 */

// React Testing Library does not unmount between test files on its own when
// globals are enabled, and a leaked subtree makes the *next* test's queries
// ambiguous rather than failing loudly.
afterEach(() => {
  cleanup();
});

// `scrollIntoView` does not exist in jsdom. The trade ticket calls it to bring
// itself into view when a learner clicks "Buy" on a holding, which is correct
// browser behaviour and untestable here.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

// `matchMedia` is used by the motion-reduction helper. jsdom has no media query
// engine, so every query reports "no match" — which is the same answer a browser
// gives when the user has expressed no preference, so it is the honest default.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  })) as unknown as typeof window.matchMedia;
}

// `ResizeObserver` is used by the responsive widget frames. Nothing in a unit
// test depends on an observed size, so the callback simply never fires.
if (!("ResizeObserver" in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
