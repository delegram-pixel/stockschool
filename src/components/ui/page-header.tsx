import { cn } from "@/lib/utils";

/**
 * The editorial page header.
 *
 * Every page in the product opens the same way: a small teal eyebrow naming the
 * section, a large serif headline carrying the *argument* of the page, a lede
 * that says what the reader is about to look at, and a slot for whatever
 * qualifies the data.
 *
 * It is a shared component rather than four copies of the same markup because
 * the rhythm here is the product's voice. The spacing between eyebrow and
 * headline, the measure of the lede, the point at which the header stops and the
 * content starts — those are the things that make seven pages read as one
 * publication. Copies drift; the fifth page always ends up two pixels off.
 *
 * The headline is an `h1` and there is exactly one per page. `title` may be a
 * node so a headline can carry an emphasised phrase in italic serif, which is
 * the one typographic liberty this design takes.
 */

export function PageHeader({
  eyebrow,
  title,
  lede,
  aside,
  children,
  divider = true,
  className,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  /** Right-aligned slot, typically a `ProvenanceBadge`. */
  aside?: React.ReactNode;
  /** Full-width slot below the lede, typically a notice. */
  children?: React.ReactNode;
  /**
   * Whether to close the header with a hairline.
   *
   * A prop rather than a `className` override because `cn` is a plain join: it
   * does not resolve Tailwind conflicts, so `border-b-0` passed in from outside
   * would win only if it happened to land later in the generated stylesheet.
   * That is a coin flip, and a page whose divider appears or disappears
   * depending on stylesheet order is not a thing to debug twice.
   */
  divider?: boolean;
  className?: string;
}) {
  return (
    <header className={cn(divider && "border-b border-line pb-10", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <p className="eyebrow">{eyebrow}</p>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>

      <h1 className="mt-5 max-w-4xl text-display text-ink">{title}</h1>

      {lede && (
        <div className="mt-5 max-w-2xl text-[1.0625rem] leading-relaxed text-ink-muted [&_a]:text-teal-strong [&_a]:underline [&_a]:underline-offset-[3px]">
          {lede}
        </div>
      )}

      {children && <div className="mt-8">{children}</div>}
    </header>
  );
}

/**
 * A section heading inside a page.
 *
 * Distinct from `PageHeader` in kind, not just size: these break a long page
 * into named parts and appear in the document outline. `h2` by default, with the
 * level exposed because the on-chain lab nests one inside another and a heading
 * level is a structural claim, not a font size.
 */
export function SectionHeading({
  children,
  level = 2,
  eyebrow,
  aside,
  className,
}: {
  children: React.ReactNode;
  level?: 2 | 3;
  eyebrow?: string;
  aside?: React.ReactNode;
  className?: string;
}) {
  const Tag = level === 2 ? "h2" : "h3";

  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-2", className)}>
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <Tag
          className={cn(
            "text-title text-ink",
            level === 3 && "text-heading tracking-[-0.011em]",
          )}
        >
          {children}
        </Tag>
      </div>
      {aside && <div className="shrink-0 pb-1">{aside}</div>}
    </div>
  );
}
