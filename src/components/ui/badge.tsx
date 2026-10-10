import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Badges and pills.
 *
 * Every tone is a *semantic* choice, not a decorative one. `positive` and
 * `negative` are reserved for numbers that carry direction — a price move, a
 * gain. They are never used to make something look appealing, because in a
 * product about financial data a green pill starts to read as a recommendation.
 */

export type BadgeTone =
  | "neutral"
  | "accent"
  | "positive"
  | "negative"
  | "caution"
  | "info";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-ink/[0.05] text-ink-muted border-transparent",
  accent: "bg-teal-soft text-teal-strong border-transparent",
  positive: "bg-success-soft text-success border-transparent",
  negative: "bg-danger-soft text-danger border-transparent",
  caution: "bg-warning-soft text-warning border-transparent",
  info: "bg-info-soft text-info border-transparent",
};

export function Badge({
  tone = "neutral",
  children,
  className,
  mono = false,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  /** Use for anything a learner might need to copy or compare character by character. */
  mono?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.75rem] font-medium leading-5 tracking-[-0.005em]",
        TONES[tone],
        mono && "font-mono text-[0.6875rem] tracking-[0.02em]",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** A small dot, for status without a full badge. */
export function Dot({ tone = "neutral", pulse = false }: { tone?: BadgeTone; pulse?: boolean }) {
  const colors: Record<BadgeTone, string> = {
    neutral: "bg-ink-muted",
    accent: "bg-teal",
    positive: "bg-success",
    negative: "bg-danger",
    caution: "bg-warning",
    info: "bg-info",
  };

  return (
    <span className="relative inline-flex h-2 w-2 shrink-0">
      {pulse && (
        <span
          aria-hidden
          className={cn("absolute inset-0 rounded-full opacity-60 animate-pulse-ring", colors[tone])}
        />
      )}
      <span className={cn("relative h-2 w-2 rounded-full", colors[tone])} />
    </span>
  );
}
