import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CompareColumn, TextBlock } from "@/lib/learning/types";

/**
 * Renders the tiny inline syntax used in lesson prose:
 *
 *   **bold**   *emphasis*   `code`   [label](url)
 *
 * This is deliberately not a markdown parser. Lesson content is first-party and
 * authored by us, but it is still *content*, and the moment prose can become
 * HTML the app grows an injection surface for no real benefit. Producing React
 * elements — never `dangerouslySetInnerHTML` — means a stray angle bracket in a
 * lesson is a typo rather than a vulnerability.
 *
 * The tokenizer is a single pass with one alternation. Nested formatting is not
 * supported, which is a real limitation and a deliberate one: lesson prose that
 * needs bold-inside-italic should be rewritten, not accommodated.
 */

const INLINE_PATTERN = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

export function renderInline(text: string): ReactNode[] {
  const parts = text.split(INLINE_PATTERN);

  return parts.map((part, index) => {
    if (part === "") return null;

    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }

    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }

    const link = parseLink(part);
    if (link) {
      const isInternal = link.href.startsWith("/");

      return isInternal ? (
        <Link key={index} href={link.href}>
          {link.label}
        </Link>
      ) : (
        <a key={index} href={link.href} target="_blank" rel="noopener noreferrer">
          {link.label}
        </a>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

function parseLink(part: string): { label: string; href: string } | null {
  if (!part.startsWith("[") || !part.endsWith(")")) return null;

  const split = part.indexOf("](");
  if (split === -1) return null;

  const label = part.slice(1, split);
  const href = part.slice(split + 2, -1);

  if (!label || !href) return null;
  return { label, href };
}

// -----------------------------------------------------------------------------

export function TextBlocks({ blocks }: { blocks: TextBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </>
  );
}

function Block({ block }: { block: TextBlock }) {
  switch (block.kind) {
    case "p":
      return <p>{renderInline(block.text)}</p>;

    case "list":
      return block.ordered ? (
        <ol>
          {block.items.map((item, index) => (
            <li key={index}>{renderInline(item)}</li>
          ))}
        </ol>
      ) : (
        <ul>
          {block.items.map((item, index) => (
            <li key={index}>{renderInline(item)}</li>
          ))}
        </ul>
      );

    case "callout":
      return <Callout tone={block.tone} title={block.title} text={block.text} />;

    case "terms":
      return (
        <dl className="not-prose my-7 divide-y divide-line border-y border-line">
          {block.items.map((item) => (
            <div key={item.term} className="grid gap-1 py-4 sm:grid-cols-[minmax(0,9rem)_1fr] sm:gap-6">
              <dt className="font-mono text-[0.8125rem] font-medium tracking-[0.01em] text-teal-strong">
                {item.term}
              </dt>
              <dd className="text-[0.9375rem] leading-relaxed text-ink-muted">
                {renderInline(item.definition)}
              </dd>
            </div>
          ))}
        </dl>
      );

    case "compare":
      return (
        <div className="not-prose my-8 grid gap-4 sm:grid-cols-2">
          <CompareColumnView column={block.left} />
          <CompareColumnView column={block.right} />
        </div>
      );

    case "quote":
      return (
        <blockquote className="not-prose my-8 border-l-2 border-teal pl-5">
          <p className="font-display text-[1.1875rem] leading-relaxed tracking-[-0.01em] text-ink italic">
            {renderInline(block.text)}
          </p>
          {block.attribution && (
            <footer className="mt-2 text-[0.8125rem] text-ink-subtle">— {block.attribution}</footer>
          )}
        </blockquote>
      );
  }
}

const CALLOUT_TONES = {
  info: {
    wrapper: "border-info/25 bg-info-soft",
    label: "text-info",
    defaultTitle: "Worth knowing",
  },
  warning: {
    wrapper: "border-warning/30 bg-warning-soft",
    label: "text-warning",
    defaultTitle: "Watch out",
  },
  tip: {
    wrapper: "border-teal-line bg-teal-soft",
    label: "text-teal-strong",
    defaultTitle: "Try this",
  },
  key: {
    wrapper: "border-teal-line bg-surface-muted",
    label: "text-teal-strong",
    defaultTitle: "Key idea",
  },
} as const;

function Callout({
  tone,
  title,
  text,
}: {
  tone: keyof typeof CALLOUT_TONES;
  title?: string;
  text: string;
}) {
  const styles = CALLOUT_TONES[tone];

  return (
    <aside className={cn("not-prose my-7 rounded-xl border px-5 py-4", styles.wrapper)}>
      <p className={cn("text-[0.6875rem] font-semibold uppercase tracking-[0.13em]", styles.label)}>
        {title ?? styles.defaultTitle}
      </p>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink">{renderInline(text)}</p>
    </aside>
  );
}

function CompareColumnView({ column }: { column: CompareColumn }) {
  const accent = column.tone === "accent";

  return (
    <div
      className={cn(
        "rounded-xl border p-5",
        accent ? "border-teal-line bg-teal-soft" : "border-line bg-surface",
      )}
    >
      <p
        className={cn(
          "font-display text-[1.0625rem] font-semibold tracking-[-0.01em]",
          accent ? "text-teal-strong" : "text-ink",
        )}
      >
        {column.title}
      </p>
      {column.subtitle && (
        <p className="mt-1 text-[0.8125rem] text-ink-muted">{column.subtitle}</p>
      )}
      <ul className="mt-4 space-y-2.5">
        {column.points.map((point, index) => (
          <li key={index} className="flex gap-2.5 text-[0.9375rem] leading-relaxed text-ink-muted">
            <span
              aria-hidden
              className={cn(
                "mt-2 h-1.5 w-1.5 shrink-0 rounded-full",
                accent ? "bg-teal" : "bg-ink-subtle",
              )}
            />
            <span>{renderInline(point)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
