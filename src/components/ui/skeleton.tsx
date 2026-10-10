import { cn } from "@/lib/utils";

/**
 * Loading placeholders.
 *
 * Skeletons here are shaped like the thing they replace — a price skeleton is
 * the width of a price, a card skeleton has the same padding as a card. A
 * generic grey block tells the learner "something is happening"; a shaped one
 * tells them *what* is about to appear, which makes the wait feel shorter and
 * stops the layout from jumping when data lands.
 */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-md bg-surface-muted",
        "after:absolute after:inset-0 after:animate-[ss-shimmer_1.6s_infinite]",
        "after:bg-gradient-to-r after:from-transparent after:via-white/45 after:to-transparent",
        "motion-reduce:after:hidden",
        className,
      )}
    />
  );
}

/** A skeleton shaped like a line of body text. */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={cn("h-3.5", index === lines - 1 ? "w-2/5" : index % 2 ? "w-11/12" : "w-full")}
        />
      ))}
    </div>
  );
}

/** A skeleton shaped like a market price row. */
export function SkeletonPrice({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-baseline gap-3", className)}>
      <Skeleton className="h-9 w-32" />
      <Skeleton className="h-5 w-16" />
    </div>
  );
}

/**
 * Announced to assistive technology while content loads.
 *
 * Visually hidden, because the shaped skeletons above already say "loading" to
 * anyone who can see them — but a screen reader gets nothing from a grey box.
 */
export function LoadingAnnouncement({ label = "Loading" }: { label?: string }) {
  return (
    <span role="status" aria-live="polite" className="sr-only">
      {label}
    </span>
  );
}
