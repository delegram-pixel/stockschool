"use client";

import { useEffect, useState } from "react";
import { formatAbsoluteTime, formatRelativeTime } from "@/lib/calculations/money";

/**
 * A timestamp that reads as relative ("2 minutes ago") without breaking
 * hydration.
 *
 * Rendering a relative string on the server is a hydration error waiting to
 * happen: the server computes it at request time, the client recomputes it
 * milliseconds later, and the two rarely agree on the exact wording. So the
 * first paint uses an absolute, deterministic string, and the relative form
 * takes over after mount.
 *
 * `suppressHydrationWarning` is not used here — the absolute-first approach
 * means there is genuinely nothing to suppress.
 */
export function RelativeTime({
  iso,
  className,
  prefix,
}: {
  iso: string | null;
  className?: string;
  prefix?: string;
}) {
  const [relative, setRelative] = useState<string | null>(null);

  useEffect(() => {
    if (!iso) return;

    const update = () => setRelative(formatRelativeTime(iso));
    update();

    // Re-render on a slow cadence. This is a freshness label, not a
    // stopwatch — a tick every 30s is plenty and keeps idle tabs cheap.
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, [iso]);

  if (!iso) {
    return (
      <span className={className} data-numeric>
        Time not reported
      </span>
    );
  }

  const absolute = formatAbsoluteTime(iso);

  return (
    <time dateTime={iso} className={className} title={absolute} data-numeric>
      {prefix}
      {relative ?? absolute}
    </time>
  );
}
