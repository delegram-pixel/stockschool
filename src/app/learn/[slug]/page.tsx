import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Database, Signal } from "lucide-react";
import { adjacentLessons, getLesson, lessonSlugs } from "@/content/lessons";
import { lessonMissions, lessonQuestionCount } from "@/lib/learning/types";
import { getAssetFeed } from "@/server/services/asset-service";
import { LessonRenderer, sectionMarker } from "@/components/learning/lesson-renderer";
import { LessonStatus, LessonTracker } from "@/components/learning/sections";
import { LessonNav, PrerequisiteNotice } from "@/components/learning/lesson-nav";
import { LessonToc, type TocItem } from "@/components/learning/lesson-toc";

/**
 * A single lesson.
 *
 * This page is a server component and the renderer under it is too: the prose
 * — which is the overwhelming majority of the bytes — is rendered to HTML on the
 * server, and only the progress-aware leaves (quiz, mission, reflection, status,
 * nav) ship as client components. The curriculum is never sent to the browser
 * as data.
 *
 * The one thing fetched here is the asset feed, because a lesson's mission asks
 * the learner to look something up on a real asset. If that feed is sample data,
 * the lesson says so on its face rather than letting a fabricated price pass for
 * a real one.
 */

export function generateStaticParams() {
  return lessonSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lesson = getLesson(slug);
  if (!lesson) return { title: "Lesson not found" };

  return {
    title: `${lesson.number} · ${lesson.title}`,
    description: lesson.description,
  };
}

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lesson = getLesson(slug);
  if (!lesson) notFound();

  const { previous, next } = adjacentLessons(lesson.slug);
  const feed = await getAssetFeed();

  const missions = lessonMissions(lesson);
  const questionCount = lessonQuestionCount(lesson);

  const prerequisites = lesson.prerequisites
    .map((slug) => getLesson(slug))
    .filter((found): found is NonNullable<typeof found> => found !== null)
    .map((found) => ({ slug: found.slug, number: found.number, title: found.title }));

  // Only sections with a heading go in the outline. A figure without one is
  // part of the argument around it, not a destination.
  const toc: TocItem[] = lesson.sections.flatMap((section): TocItem[] => {
    const heading = "heading" in section ? section.heading : undefined;
    if (!heading) return [];

    const marker = sectionMarker(lesson.number, section.id);
    const item: TocItem = { id: section.id, label: heading };
    if (marker) item.marker = marker;
    return [item];
  });

  return (
    <div className="container-page py-12 sm:py-16">
      {/* --- Header ---------------------------------------------------------- */}
      <header className="mx-auto max-w-3xl">
        <Link
          href="/learn"
          className="inline-flex items-center gap-1.5 text-[0.8125rem] text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          All lessons
        </Link>

        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[0.6875rem] uppercase tracking-[0.13em] text-ink-subtle">
          <span className="text-teal">Lesson {lesson.number}</span>
          <span className="capitalize">{lesson.difficulty}</span>
          <span className="inline-flex items-center gap-1.5 normal-case tracking-normal">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {lesson.estimatedMinutes} min
          </span>
        </div>

        <h1 className="mt-3 text-title text-ink">{lesson.title}</h1>

        <p className="mt-5 max-w-prose text-lg leading-relaxed text-ink-muted">
          {lesson.description}
        </p>

        <div className="mt-7">
          <LessonStatus
            lessonSlug={lesson.slug}
            questionCount={questionCount}
            missionsTotal={missions.length}
          />
        </div>

        {/* The objective, set as a promise rather than as a summary. */}
        <div className="mt-8 rounded-2xl border border-line bg-surface px-5 py-5 sm:px-6">
          <p className="eyebrow">By the end of this lesson</p>
          <p className="mt-2.5 max-w-prose font-display text-[1.0625rem] leading-relaxed text-ink">
            {lesson.objective}
          </p>
        </div>

        <div className="mt-8">
          <PrerequisiteNotice prerequisites={prerequisites} />
        </div>

        {missions.length > 0 && (
          <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-ink-muted">
            {feed.mode === "live" ? (
              <>
                <Signal className="h-3.5 w-3.5 shrink-0 text-teal" aria-hidden />
                The mission in this lesson looks at live asset data.
              </>
            ) : (
              <>
                <Database className="h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
                The mission in this lesson uses clearly-labelled sample data
                {feed.unconfigured
                  ? " — no Binance Web3 API credentials are configured on this deployment."
                  : " — the live feed could not be reached, and every value below is marked as sample data."}
              </>
            )}
          </p>
        )}
      </header>

      {/* --- Body ------------------------------------------------------------ */}
      <div className="mx-auto mt-12 grid max-w-6xl gap-x-14 gap-y-10 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <article className="mx-auto w-full max-w-3xl lg:mx-0">
          <LessonTracker lessonSlug={lesson.slug} />
          <LessonRenderer lesson={lesson} assets={feed.assets} />

          <LessonNav
            lessonSlug={lesson.slug}
            lessonNumber={lesson.number}
            missionsTotal={missions.length}
            questionCount={questionCount}
            previous={previous ? { slug: previous.slug, number: previous.number, title: previous.title } : null}
            next={next ? { slug: next.slug, number: next.number, title: next.title } : null}
          />
        </article>

        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <LessonToc items={toc} />
          </div>
        </aside>
      </div>
    </div>
  );
}
