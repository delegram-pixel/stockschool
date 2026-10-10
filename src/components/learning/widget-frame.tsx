"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import type { WidgetKey } from "@/lib/learning/types";
import type { TokenizedStock } from "@/types";
import { WIDGETS } from "./widgets";

/**
 * The chrome around every interactive figure.
 *
 * Two jobs, and the second one is the reason this file exists:
 *
 * 1. **Consistency.** A learner meets seven of these across the path. They
 *    should all announce themselves the same way, so the *figure* is never the
 *    thing being learned — only what it shows.
 * 2. **A description that is not a label.** `alt` is required on every diagram
 *    and interactive section in the content model, and it is the only thing a
 *    screen-reader user gets to know what a figure conveys. So it is rendered as
 *    a real description wired up with `aria-describedby`, not as a `title`
 *    attribute and not as a decorative `aria-label` — the widgets are
 *    *interactive*, so the wrapper must not claim to be an image.
 *
 * The visible caption is a separate field on purpose. A caption is editorial —
 * it tells the learner what to notice. The description is structural. Lessons
 * that have one usually want both, and collapsing them would force every
 * description to read like a caption.
 */

export type WidgetFrameProps = {
  widget: WidgetKey;
  assets: TokenizedStock[];
  config?: Record<string, unknown>;
  heading?: string;
  /** Visible caption. Diagrams use it to say what to look at. */
  caption?: string;
  /** The accessible description. Always rendered; never decorative. */
  alt: string;
  /** Lead-in above an interactive figure. */
  intro?: string;
  variant?: "diagram" | "interactive";
  /** Section numeral, e.g. "02.1". Shown as the figure's eyebrow. */
  marker?: string;
};

export function WidgetFrame({
  widget,
  assets,
  config,
  heading,
  caption,
  alt,
  intro,
  variant = "interactive",
  marker,
}: WidgetFrameProps) {
  const headingId = useId();
  const altId = useId();

  const Widget = WIDGETS[widget];
  const isDiagram = variant === "diagram";

  return (
    <figure
      className="not-prose my-10"
      aria-labelledby={heading ? headingId : undefined}
      aria-describedby={altId}
    >
      {/* --- Header ---------------------------------------------------------- */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span
          className={cn(
            "font-mono text-[0.6875rem] font-medium uppercase tracking-[0.14em]",
            isDiagram ? "text-ink-subtle" : "text-teal-strong",
          )}
        >
          {marker ? `${marker} · ` : ""}
          {isDiagram ? "Figure" : "Interactive"}
        </span>
        {heading && (
          <h2
            id={headingId}
            className="font-display text-[1.25rem] font-semibold tracking-[-0.015em] text-ink sm:text-[1.375rem]"
          >
            {heading}
          </h2>
        )}
      </div>

      {intro && (
        <p className="mt-3 max-w-prose text-[1.0625rem] leading-relaxed text-ink-muted">
          {intro}
        </p>
      )}

      {/* --- The widget ------------------------------------------------------ */}
      <div
        className={cn(
          "mt-5",
          isDiagram
            ? "rounded-xl"
            : // Interactive figures sit on a raised card with a warm edge, so it
              // is obvious at a glance which parts of a lesson respond to touch.
              "rounded-2xl border border-line bg-canvas p-4 shadow-[0_1px_2px_rgba(27,33,29,0.04)] sm:p-5",
        )}
      >
        <Widget assets={assets} config={config} />
      </div>

      {/* The description, for assistive technology only. Visually it would
          duplicate the caption on the diagrams that have one, and on the
          interactives it would narrate what the learner is already looking at. */}
      <p id={altId} className="sr-only">
        {alt}
      </p>

      {/* --- Caption --------------------------------------------------------- */}
      {caption && (
        <figcaption className="mt-4 max-w-prose border-t border-line pt-3 text-[0.8125rem] leading-relaxed text-ink-muted">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
