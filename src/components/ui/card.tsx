import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Surfaces.
 *
 * The Editorial Lab look depends on restraint here: one border colour, one
 * radius scale, one shadow. Cards are quiet containers — if a card needs to
 * shout, it is usually a callout or a stat, not a card.
 */

type CardProps = ComponentProps<"div"> & {
  /** `raised` lifts on hover — only for cards that are themselves links. */
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
};

const PADDING = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
} as const;

export function Card({
  interactive = false,
  padding = "md",
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-surface",
        PADDING[padding],
        interactive &&
          "transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_8px_28px_-16px_rgba(27,33,29,0.28)]",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * The small uppercase label that opens a section.
 *
 * Tracked-out and diminutive so it reads as a marker rather than a heading —
 * it should never compete with the serif display type it sits above.
 */
export function Eyebrow({
  children,
  className,
  as: Tag = "p",
}: {
  children: ReactNode;
  className?: string;
  as?: "p" | "span" | "h2" | "div";
}) {
  return (
    <Tag
      className={cn(
        "text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-teal",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/**
 * A horizontal hairline that fades at both ends.
 *
 * Used to separate sections without the hard-edged look of a full-width
 * border, which tends to slice an editorial layout in half.
 */
export function Rule({ className }: { className?: string }) {
  return <div aria-hidden className={cn("rule-fade h-px w-full", className)} />;
}

/** A page section with consistent vertical rhythm. */
export function Section({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("py-12 sm:py-16", className)}>
      {children}
    </section>
  );
}
