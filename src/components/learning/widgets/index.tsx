"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { WidgetKey } from "@/lib/learning/types";
import type { WidgetProps } from "./types";

/**
 * The widget registry.
 *
 * Lessons name a widget by key — they never import one. That indirection buys
 * three things that matter here:
 *
 * 1. **Lazy loading per widget.** A learner reading lesson 01 does not download
 *    the AMM curve maths or the key-derivation chain. Each widget becomes its
 *    own chunk, fetched when a page that actually shows it is opened.
 * 2. **Content stays serialisable.** A lesson is plain data, so it can be
 *    unit-tested, diffed and eventually served from a database without dragging
 *    React components along with it.
 * 3. **Exhaustiveness is checked by the compiler.** The map is typed as
 *    `Record<WidgetKey, …>`, so adding a key to the `WidgetKey` union without
 *    adding a component here is a type error rather than a blank space on a
 *    page — which is exactly the kind of failure nobody notices in review.
 *
 * `ssr` is left on deliberately. Every widget renders something truthful from
 * its initial state on the server (the ones that depend on the reader's clock
 * or storage gate themselves behind a mount check), so the first paint contains
 * real content instead of a spinner.
 */

export const WIDGETS: Record<WidgetKey, ComponentType<WidgetProps>> = {
  "tokenization-flow": dynamic(() => import("./tokenization-flow").then((m) => m.TokenizationFlow), {
    loading: () => <WidgetSkeleton rows={2} />,
  }),
  "price-comparison": dynamic(() => import("./price-comparison").then((m) => m.PriceComparison), {
    loading: () => <WidgetSkeleton rows={4} />,
  }),
  "market-hours": dynamic(() => import("./market-hours").then((m) => m.MarketHours), {
    loading: () => <WidgetSkeleton rows={3} />,
  }),
  "transaction-flow": dynamic(() => import("./transaction-flow").then((m) => m.TransactionFlow), {
    loading: () => <WidgetSkeleton rows={1} />,
  }),
  "allocation-lab": dynamic(() => import("./allocation-lab").then((m) => m.AllocationLab), {
    loading: () => <WidgetSkeleton rows={3} />,
  }),
  "liquidity-depth": dynamic(() => import("./liquidity-depth").then((m) => m.LiquidityDepth), {
    loading: () => <WidgetSkeleton rows={4} />,
  }),
  "wallet-anatomy": dynamic(() => import("./wallet-anatomy").then((m) => m.WalletAnatomy), {
    loading: () => <WidgetSkeleton rows={3} />,
  }),
};

/**
 * The placeholder shown while a widget's chunk is in flight.
 *
 * It is shaped like the thing that is coming rather than like a generic
 * spinner, so the page does not jump when the widget lands. `rows` controls the
 * height of the readout strip underneath, which is the part that differs most
 * between widgets.
 */
function WidgetSkeleton({ rows }: { rows: number }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-6" aria-hidden>
      <div className="animate-pulse space-y-4">
        <div className="h-3.5 w-44 rounded-full bg-ink/8" />
        <div className="h-40 rounded-lg bg-ink/5" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: Math.min(Math.max(rows, 1) * 2, 4) }, (_, i) => (
            <div key={i} className="h-12 rounded-lg bg-ink/5" />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading the interactive figure…</span>
    </div>
  );
}
