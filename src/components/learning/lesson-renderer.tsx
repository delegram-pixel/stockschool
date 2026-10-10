import type { Lesson, LessonSection } from "@/lib/learning/types";
import type { TokenizedStock } from "@/types";
import { cn } from "@/lib/utils";
import { TextBlocks } from "./text-blocks";
import { WidgetFrame } from "./widget-frame";
import { MissionSection, QuizSection, ReflectionSection } from "./sections";

/**
 * The lesson renderer.
 *
 * A lesson is data — a list of typed sections — and this walks it. Adding a
 * lesson is adding a file; adding a *kind* of section is adding a case here and
 * a member to the `LessonSection` union, and the compiler will point at every
 * place that needs updating. Nothing about a lesson's content lives in a
 * component, which is why the curriculum can be tested without a DOM.
 *
 * This is a server component, and stays one. The sections that need progress
 * (quiz, mission, reflection) are thin client wrappers in `sections.tsx`, so
 * the prose — the bulk of every page — is rendered on the server and shipped as
 * HTML rather than as a component tree.
 *
 * One invariant to keep when editing: `.lesson-prose` wraps *prose*. It styles
 * bare `p`, `ul` and `li`, which is right for paragraphs and wrong for anything
 * that draws its own structure. Components escape it with a `not-prose` marker
 * (see the rules in `globals.css`), so a section's prose and its components are
 * siblings, never nested.
 */

export function LessonRenderer({
  lesson,
  assets,
}: {
  lesson: Lesson;
  assets: TokenizedStock[];
}) {
  return (
    <>
      {lesson.sections.map((section) => (
        <Section key={section.id} lesson={lesson} section={section} assets={assets} />
      ))}
    </>
  );
}

function Section({
  lesson,
  section,
  assets,
}: {
  lesson: Lesson;
  section: LessonSection;
  assets: TokenizedStock[];
}) {
  const marker = sectionMarker(lesson.number, section.id);

  switch (section.type) {
    case "text":
      return (
        <section id={section.id} className="my-12 scroll-mt-28">
          {section.heading && <Heading marker={marker} title={section.heading} />}
          <div className="lesson-prose">
            <TextBlocks blocks={section.blocks} />
          </div>
        </section>
      );

    case "diagram":
      return (
        <section id={section.id} className="scroll-mt-28">
          <WidgetFrame
            variant="diagram"
            widget={section.widget}
            assets={assets}
            config={section.config}
            heading={section.heading}
            caption={section.caption}
            alt={section.alt}
            marker={marker}
          />
        </section>
      );

    case "interactive":
      return (
        <section id={section.id} className="scroll-mt-28">
          <WidgetFrame
            variant="interactive"
            widget={section.widget}
            assets={assets}
            config={section.config}
            heading={section.heading}
            intro={section.intro}
            alt={section.alt}
            marker={marker}
          />
        </section>
      );

    case "example":
      return (
        <section id={section.id} className="my-12 scroll-mt-28">
          {section.heading && <Heading marker={marker} title={section.heading} />}

          {/* A worked example is set slightly apart — tinted, indented, and
              labelled — because it is a case being walked through rather than
              another paragraph of the argument. */}
          <div className="rounded-2xl border border-line bg-surface-muted px-5 py-6 sm:px-7">
            <p className="eyebrow">Worked example</p>
            <div className="lesson-prose mt-4">
              <TextBlocks blocks={section.blocks} />
            </div>
          </div>

          {section.widget && (
            <WidgetFrame
              variant="diagram"
              widget={section.widget}
              assets={assets}
              alt={section.widgetAlt ?? `A figure illustrating ${section.heading ?? "this example"}.`}
              marker={marker}
            />
          )}
        </section>
      );

    case "mission":
      return (
        <MissionSection
          id={section.id}
          lessonSlug={lesson.slug}
          mission={section.mission}
          assets={assets}
          heading={section.heading}
        />
      );

    case "quiz":
      return (
        <QuizSection
          id={section.id}
          lessonSlug={lesson.slug}
          quiz={section.quiz}
          heading={section.heading}
        />
      );

    case "reflection":
      return (
        <ReflectionSection
          id={section.id}
          lessonSlug={lesson.slug}
          sectionId={section.id}
          heading={section.heading}
          prompt={section.prompt}
          placeholder={section.placeholder}
        />
      );
  }
}

/**
 * A section's numeral, when the content gives us one to use.
 *
 * Section ids are authored as `s3-the-two-prices`, where the number is the
 * author's own count of the lesson's ideas — which is not the same as the
 * position in the array, because quizzes, missions and reflections sit between
 * them and are not "ideas". Reading the numeral out of the id keeps the
 * printed numbers stable and meaningful; a section without one simply gets no
 * numeral rather than a plausible-looking wrong one.
 */
export function sectionMarker(lessonNumber: string, id: string): string | undefined {
  const match = /^s(\d+)(?:-|$)/.exec(id);
  const part = match?.[1];
  if (!part) return undefined;
  return `${lessonNumber}.${part}`;
}

function Heading({ marker, title }: { marker?: string; title: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      {marker && (
        <span className="font-mono text-[0.75rem] tabular-nums text-ink-subtle">{marker}</span>
      )}
      <h2
        className={cn(
          "font-display text-[1.5rem] font-semibold leading-tight tracking-[-0.02em] text-ink",
          "sm:text-[1.625rem]",
        )}
      >
        {title}
      </h2>
    </div>
  );
}
