"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared furniture for the interactive widgets.
 *
 * Every widget on the course is built from these four pieces, which is why
 * seven quite different teaching tools still read as one product: the same
 * stage, the same readout grid, the same slider, the same segmented control.
 *
 * The visual rule throughout is that *numbers live in monospace and words live
 * in sans*. A learner scanning a widget should be able to tell at a glance which
 * parts are measured and which parts are explanation.
 */

/**
 * SVG paint, by CSS variable.
 *
 * Widgets style SVG with inline `style` rather than Tailwind's `fill-*` /
 * `stroke-*` utilities. Both would work, but inline variables make the dark
 * theme automatic without a `dark:` variant on every mark, and a diagram is
 * exactly the place where a missed variant produces an invisible line rather
 * than an ugly one.
 */
export const PAINT = {
  ink: "var(--color-ink)",
  muted: "var(--color-ink-muted)",
  subtle: "var(--color-ink-subtle)",
  inverse: "var(--color-ink-inverse)",
  teal: "var(--color-teal)",
  tealStrong: "var(--color-teal-strong)",
  tealSoft: "var(--color-teal-soft)",
  tealLine: "var(--color-teal-line)",
  sky: "var(--color-sky)",
  skyInk: "var(--color-sky-ink)",
  sun: "var(--color-sun)",
  sunInk: "var(--color-sun-ink)",
  surface: "var(--color-surface)",
  surfaceMuted: "var(--color-surface-muted)",
  surfaceSunken: "var(--color-surface-sunken)",
  line: "var(--color-line)",
  lineStrong: "var(--color-line-strong)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
  info: "var(--color-info)",
} as const;

/** The drawing surface. Widgets put SVG or HTML in here; nothing else. */
export function Stage({
  children,
  className,
  tone = "muted",
}: {
  children: ReactNode;
  className?: string;
  tone?: "muted" | "plain" | "grid";
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-line",
        tone === "plain" ? "bg-surface" : "bg-surface-muted",
        className,
      )}
    >
      {tone === "grid" && (
        <div
          aria-hidden
          className="grid-paper pointer-events-none absolute inset-0 opacity-70"
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

/** A labelled numeric output. The workhorse of every readout panel. */
export function Readout({
  items,
  columns = 2,
}: {
  items: Array<{ label: string; value: ReactNode; hint?: string; emphasis?: boolean }>;
  columns?: 2 | 3 | 4;
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-6 gap-y-4",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-3",
        columns === 4 && "grid-cols-2 sm:grid-cols-4",
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-[0.6875rem] uppercase tracking-[0.1em] text-ink-subtle">
            {item.label}
          </dt>
          <dd
            className={cn(
              "mt-1 font-mono tabular-nums",
              item.emphasis
                ? "text-[1.125rem] font-medium text-ink"
                : "text-[0.9375rem] text-ink",
            )}
          >
            {item.value}
          </dd>
          {item.hint && (
            <p className="mt-1 text-[0.75rem] leading-snug text-ink-subtle">{item.hint}</p>
          )}
        </div>
      ))}
    </dl>
  );
}

/** A range input with a label and a live value on the same line. */
export function Slider({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  display,
  hint,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  display: string;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-[0.875rem] font-medium text-ink">
          {label}
        </label>
        <output
          htmlFor={id}
          className="font-mono text-[0.875rem] tabular-nums text-teal-strong"
        >
          {display}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line-strong accent-(--color-teal)"
      />
      {hint && <p className="mt-1.5 text-[0.75rem] leading-snug text-ink-subtle">{hint}</p>}
    </div>
  );
}

/** A segmented control. Used wherever there are two to four exclusive modes. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<{ id: T; label: string; hint?: string }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            title={option.hint}
            className={cn(
              "rounded-lg px-3 py-1.5 text-[0.8125rem] font-medium transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/45",
              active
                ? "bg-teal text-ink-inverse shadow-[0_1px_2px_rgba(27,33,29,0.16)]"
                : "bg-surface text-ink-muted hover:bg-ink/4 hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** A small key for colours or marks used in a drawing. */
export function Legend({
  items,
}: {
  items: Array<{ swatch: string; label: string; dashed?: boolean }>;
}) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2 text-[0.75rem] text-ink-muted">
          <span
            aria-hidden
            className={cn("h-2.5 w-2.5 shrink-0 rounded-[3px]", item.swatch)}
            style={
              item.dashed
                ? { background: "transparent", border: "1.5px dashed var(--color-teal-line)" }
                : undefined
            }
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/** Explanatory note pinned to the bottom of a widget. */
export function WidgetNote({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "caution";
}) {
  return (
    <p
      className={cn(
        "text-[0.75rem] leading-relaxed",
        tone === "caution" ? "text-warning" : "text-ink-subtle",
      )}
    >
      {children}
    </p>
  );
}
