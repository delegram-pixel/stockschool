"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProgress } from "@/components/providers/progress-provider";
import { cn } from "@/lib/utils";

/**
 * The bottom of a lesson: what you have done, and where to go next.
 *
 * The product decision worth stating is that **nothing here is a gate**.
 * Prerequisites produce a notice, not a wall — a learner who wants to read
 * lesson 05 first can. That is not laxness: a locked door with no key teaches
 * nothing, and the person most likely to hit one is the person least equipped
 * to work out why. The path page shows the intended order; this page tells the
 * truth about what is optional.
 *
 * Completion is likewise unpunished. A learner can finish a lesson with a 40%
 * quiz score and unstarted missions, because the alternative — holding the path
 * hostage to a score — turns learning into a toll booth.
 */

type Neighbour = { slug: string; number: string; title: string };

export function PrerequisiteNotice({
  prerequisites,
}: {
  prerequisites: Neighbour[];
}) {
  const { store, hydrated } = useProgress();
  if (!hydrated || prerequisites.length === 0) return null;

  const unfinished = prerequisites.filter(
    (p) => store.lessons[p.slug]?.status !== "completed",
  );
  if (unfinished.length === 0) return null;

  return (
    <div className="not-prose mb-10 flex gap-3 rounded-xl border border-info/25 bg-info-soft px-5 py-4">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden />
      <div>
        <p className="text-[0.8125rem] font-medium text-ink">
          This lesson assumes{" "}
          {unfinished.map((p, i) => (
            <span key={p.slug}>
              {i > 0 && (i === unfinished.length - 1 ? " and " : ", ")}
              <Link
                href={`/learn/${p.slug}`}
                className="font-mono text-[0.8125rem] text-info underline-offset-4 hover:underline"
              >
                {p.number} {p.title}
              </Link>
            </span>
          ))}
          , which you have not finished.
        </p>
        <p className="mt-1.5 max-w-prose text-[0.8125rem] leading-relaxed text-ink-muted">
          Nothing here is locked — read on if you like, and come back later. The ideas do build on
          each other, so it will read better in order.
        </p>
      </div>
    </div>
  );
}

export function LessonNav({
  lessonSlug,
  lessonNumber,
  missionsTotal,
  questionCount,
  previous,
  next,
}: {
  lessonSlug: string;
  lessonNumber: string;
  missionsTotal: number;
  questionCount: number;
  previous: Neighbour | null;
  next: Neighbour | null;
}) {
  const { store, hydrated, completeLesson } = useProgress();

  const record = store.lessons[lessonSlug];
  const status = record?.status ?? "not-started";
  const missionsDone = Object.values(record?.missions ?? {}).filter((m) => m.completed).length;
  const quizAttempted = record?.bestScorePct !== null && record?.bestScorePct !== undefined;
  const complete = status === "completed";

  return (
    <div className="not-prose mt-16 space-y-8">
      {/* --- Completion ------------------------------------------------------ */}
      <div
        className={cn(
          "rounded-2xl border px-5 py-6 sm:px-7",
          complete ? "border-success/30 bg-success-soft/50" : "border-line bg-surface",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-ink-subtle">
              Lesson {lessonNumber}
            </p>
            <h2 className="mt-1.5 font-display text-[1.375rem] font-semibold tracking-[-0.015em] text-ink">
              {complete ? "You have finished this lesson" : "Finishing up"}
            </h2>

            {/* The evidence, stated plainly — and deliberately not framed as a
                requirement. Each line is "here is what you did", never "here is
                what you must do". */}
            <ul className="mt-4 space-y-1.5 text-[0.875rem] text-ink-muted">
              {questionCount > 0 && (
                <li className="flex items-center gap-2">
                  <Mark done={quizAttempted} />
                  {quizAttempted
                    ? `Best quiz score: ${Math.round(record?.bestScorePct ?? 0)}%`
                    : "You have not tried the quiz yet"}
                </li>
              )}
              {missionsTotal > 0 && (
                <li className="flex items-center gap-2">
                  <Mark done={missionsDone === missionsTotal} />
                  Missions completed: {missionsDone} of {missionsTotal}
                </li>
              )}
              <li className="flex items-center gap-2">
                <Mark done={complete} />
                {complete ? "Marked as complete" : "Not marked as complete yet"}
              </li>
            </ul>

            {!complete && (
              <p className="mt-4 max-w-prose text-[0.8125rem] leading-relaxed text-ink-subtle">
                None of the above is required. There is no score to pass and no mission you must
                finish — mark the lesson complete whenever you have had enough of it.
              </p>
            )}
          </div>

          <div className="flex flex-col items-start gap-3">
            {hydrated && !complete && (
              <Button onClick={() => completeLesson(lessonSlug)}>
                <Check className="h-4 w-4" aria-hidden />
                Mark as complete
              </Button>
            )}
            {complete && (
              <Badge tone="positive">
                <Check className="h-3 w-3" aria-hidden />
                Completed
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* --- Prev / next ----------------------------------------------------- */}
      <nav aria-label="Lesson navigation" className="grid gap-4 sm:grid-cols-2">
        {previous ? (
          <LessonLink neighbour={previous} direction="previous" />
        ) : (
          <div className="hidden sm:block" />
        )}
        {next ? <LessonLink neighbour={next} direction="next" /> : <div className="hidden sm:block" />}
      </nav>

      <div className="flex justify-center">
        <Link
          href="/learn"
          className="text-[0.875rem] text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          All lessons
        </Link>
      </div>
    </div>
  );
}

function LessonLink({
  neighbour,
  direction,
}: {
  neighbour: Neighbour;
  direction: "previous" | "next";
}) {
  const isNext = direction === "next";

  return (
    <Link
      href={`/learn/${neighbour.slug}`}
      className={cn(
        "group flex flex-col gap-1 rounded-xl border border-line px-5 py-4 transition-colors duration-150",
        "hover:border-line-strong hover:bg-surface",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/45",
        isNext && "sm:text-right",
      )}
    >
      <span
        className={cn(
          "flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-subtle",
          isNext && "sm:justify-end",
        )}
      >
        {!isNext && <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" aria-hidden />}
        {isNext ? "Next lesson" : "Previous lesson"}
        {isNext && <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden />}
      </span>
      <span className="font-display text-[1.0625rem] font-semibold tracking-[-0.01em] text-ink">
        <span className="font-mono text-[0.875rem] text-ink-subtle">{neighbour.number}</span>{" "}
        {neighbour.title}
      </span>
    </Link>
  );
}

function Mark({ done }: { done: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid h-4 w-4 shrink-0 place-items-center rounded-full border",
        done ? "border-success bg-success text-ink-inverse" : "border-line-strong",
      )}
    >
      {done && <Check className="h-2.5 w-2.5" />}
    </span>
  );
}
