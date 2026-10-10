"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * "On this page" — the lesson's outline, marking where you are.
 *
 * A lesson is long by design: prose, figures, a quiz and a mission in one
 * scroll. Without an outline the only way back to a section is to remember it,
 * which nobody does. The marker is driven by an `IntersectionObserver` rather
 * than by scroll position, because section heights vary by an order of magnitude
 * and any arithmetic over `scrollY` is wrong the moment a figure loads.
 *
 * The placement of the observer's root margin does the real work: a band across
 * the upper third of the viewport, below the sticky header. A section becomes
 * current when its heading enters that band, which is where a reader's eye
 * actually is — not when the section first peeks in from the bottom.
 */

export type TocItem = {
  id: string;
  label: string;
  /** The printed section numeral, when the content gives us one. */
  marker?: string;
};

export function LessonToc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState<string | null>(items[0]?.id ?? null);

  useEffect(() => {
    const elements = items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => element !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entering = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        const first = entering[0];
        if (first) setActive(first.target.id);
      },
      { rootMargin: "-88px 0px -62% 0px", threshold: 0 },
    );

    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [items]);

  if (items.length < 3) return null;

  return (
    <nav aria-label="On this page" className="not-prose">
      <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-ink-subtle">
        On this page
      </p>

      <ol className="mt-4 space-y-px border-l border-line">
        {items.map((item) => {
          const current = item.id === active;

          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={current ? "location" : undefined}
                className={cn(
                  "-ml-px flex gap-2.5 border-l-2 py-1.5 pl-3.5 pr-2 text-[0.8125rem] leading-snug transition-colors duration-150",
                  current
                    ? "border-teal font-medium text-ink"
                    : "border-transparent text-ink-muted hover:border-line-strong hover:text-ink",
                )}
              >
                {item.marker && (
                  <span
                    className={cn(
                      "shrink-0 font-mono text-[0.6875rem] tabular-nums leading-5",
                      current ? "text-teal" : "text-ink-subtle",
                    )}
                  >
                    {item.marker}
                  </span>
                )}
                <span className="min-w-0">{item.label}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
