"use client";

import Link from "next/link";
import { ArrowRight, Check, Clock, ListChecks, Lock, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProgress } from "@/components/providers/progress-provider";
import {
  computePathStates,
  summarisePathStates,
  type PathLesson,
  type PathStateView,
} from "@/lib/learning/progress";
import { cn } from "@/lib/utils";

/**
 * The learning path.
 *
 * This is the page that has to answer one question in under a second: *what do
 * I do next?* So it leads with a spine — one segment per lesson, filled as they
 * are completed and clickable — then a single continue card, and only then the
 * full list. Everything else on the page is available, and none of it is
 * competing to be read first.
 *
 * The client/server split is deliberate: the lessons are trimmed to a
 * `PathLesson` projection on the server (see `progress.ts`), and the unlock
 * state is computed *here*, in the browser, because that is where progress
 * lives. Sending the whole curriculum across the boundary to render eight
 * cards would ship every paragraph of the course to the client.
 */

export function LearningPath({ items }: { items: PathLesson[] }) {
  const { store, hydrated } = useProgress();

  const states = computePathStates(items, store);
  const summary = summarisePathStates(states);
  const next = states.find((state) => state.isNext) ?? null;

  return (
    <div className="space-y-10">
      {/* --- Spine + header -------------------------------------------------- */}
      <div className="rounded-2xl border border-line bg-surface px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <p className="eyebrow">Your progress</p>
            <p className="mt-2 font-display text-[2rem] font-semibold leading-none tracking-[-0.02em] text-ink">
              {hydrated ? (
                <>
                  {summary.lessonsCompleted}
                  <span className="text-ink-subtle"> / {summary.lessonsTotal}</span>
                </>
              ) : (
                <span className="text-ink-subtle">— / {summary.lessonsTotal}</span>
              )}
            </p>
            <p className="mt-1.5 text-[0.8125rem] text-ink-muted">lessons completed</p>
          </div>

          <dl className="flex flex-wrap gap-x-8 gap-y-3">
            <Stat
              label="Missions"
              value={hydrated ? `${summary.missionsCompleted}/${summary.missionsTotal}` : "—"}
            />
            <Stat
              label="Average quiz"
              value={
                hydrated && summary.averageQuizScorePct !== null
                  ? `${Math.round(summary.averageQuizScorePct)}%`
                  : "—"
              }
            />
            <Stat label="Still to read" value={hydrated ? String(summary.lessonsTotal - summary.lessonsCompleted) : "—"} />
          </dl>
        </div>

        <Spine states={states} hydrated={hydrated} />
      </div>

      {/* --- Continue -------------------------------------------------------- */}
      {hydrated && next && (
        <div className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-teal-line bg-teal-soft/50 px-5 py-5 sm:px-7">
          <div className="min-w-0">
            <p className="eyebrow">
              {next.status === "in-progress" ? "Pick up where you left off" : "Start here"}
            </p>
            <p className="mt-1.5 font-display text-[1.375rem] font-semibold tracking-[-0.015em] text-ink">
              <span className="font-mono text-[1.0625rem] text-ink-muted">{next.lesson.number}</span>{" "}
              {next.lesson.title}
            </p>
            <p className="mt-1 max-w-prose text-[0.875rem] leading-relaxed text-ink-muted">
              {next.lesson.description}
            </p>
          </div>
          <Button as="link" href={`/learn/${next.lesson.slug}`} size="lg">
            {next.status === "in-progress" ? "Continue" : "Begin"}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      )}

      {hydrated && !next && (
        <div className="rounded-2xl border border-success/30 bg-success-soft/60 px-5 py-5 sm:px-7">
          <p className="font-display text-[1.25rem] font-semibold tracking-[-0.015em] text-ink">
            You have been through all {summary.lessonsTotal} lessons.
          </p>
          <p className="mt-1.5 max-w-prose text-[0.875rem] leading-relaxed text-ink-muted">
            Nothing is finished, exactly — the assets on the Explore page keep changing, and the
            lessons about prices are worth re-reading when they do. The On-Chain Lab is where to go
            next: it reads live contracts, and everything it shows is real.
          </p>
        </div>
      )}

      {/* --- The cards ------------------------------------------------------- */}
      <ol className="space-y-4">
        {states.map((state) => (
          <LessonCard key={state.lesson.slug} state={state} hydrated={hydrated} />
        ))}
      </ol>

      <p className="mx-auto max-w-prose text-center text-[0.8125rem] leading-relaxed text-ink-subtle">
        The order is a suggestion. Every lesson opens when you click it — the locks you see are
        notes about what a lesson assumes, not doors, because a locked page teaches nobody anything.
      </p>
    </div>
  );
}

// -----------------------------------------------------------------------------

/**
 * One segment per lesson: a filled bar for a finished lesson, a half-tone bar
 * for one in progress, an outline for one not yet started. Each is a link, so
 * the spine doubles as navigation — it is the fastest way back to a lesson you
 * half-read, which is the single most common thing a returning learner wants.
 */
function Spine({ states, hydrated }: { states: PathStateView[]; hydrated: boolean }) {
  return (
    <ol className="mt-6 grid grid-cols-8 gap-1.5" aria-label="Lessons">
      {states.map((state) => {
        const done = hydrated && state.status === "completed";
        const started = hydrated && state.status === "in-progress";

        return (
          <li key={state.lesson.slug}>
            <Link
              href={`/learn/${state.lesson.slug}`}
              aria-label={`Lesson ${state.lesson.number}: ${state.lesson.title}${
                done ? " — completed" : started ? " — in progress" : ""
              }`}
              className={cn(
                "group flex h-14 flex-col justify-end rounded-lg border px-2 pb-2 transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/45",
                done
                  ? "border-teal bg-teal hover:bg-teal-strong"
                  : started
                    ? "border-teal-line bg-teal-soft hover:border-teal"
                    : state.locked
                      ? "border-line border-dashed bg-transparent hover:border-line-strong"
                      : "border-line bg-surface-muted hover:border-line-strong",
                state.isNext && "ring-2 ring-teal/25",
              )}
            >
              <span
                className={cn(
                  "font-mono text-[0.6875rem] tabular-nums",
                  done ? "text-ink-inverse" : started ? "text-teal-strong" : "text-ink-subtle",
                )}
              >
                {state.lesson.number}
              </span>
              <span
                aria-hidden
                className={cn(
                  "mt-1 h-0.5 rounded-full",
                  done ? "bg-ink-inverse/70" : started ? "bg-teal" : "bg-line-strong",
                )}
              />
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

function LessonCard({ state, hydrated }: { state: PathStateView; hydrated: boolean }) {
  const { lesson } = state;
  const done = hydrated && state.status === "completed";
  const started = hydrated && state.status === "in-progress";
  const isNext = hydrated && state.isNext;

  return (
    <li>
      <Link
        href={`/learn/${lesson.slug}`}
        className={cn(
          "group block rounded-2xl border transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/45",
          isNext
            ? "border-teal-line bg-teal-soft/30 hover:border-teal"
            : "border-line bg-surface hover:border-line-strong",
          !hydrated && "border-line bg-surface",
        )}
      >
        <article className="grid gap-4 px-5 py-6 sm:grid-cols-[5rem_minmax(0,1fr)] sm:gap-7 sm:px-7">
          {/* The numeral, set in the display face at the size a chapter number
              deserves. It is the fastest way to find a lesson you half-remember. */}
          <div className="flex items-center gap-4 sm:block">
            <span
              className={cn(
                "font-display text-[2.5rem] font-semibold leading-none tracking-[-0.03em] tabular-nums",
                done ? "text-teal" : isNext ? "text-ink" : "text-ink-subtle",
              )}
            >
              {lesson.number}
            </span>
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ink-subtle sm:hidden">
              {lesson.estimatedMinutes} min
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-[1.25rem] font-semibold tracking-[-0.015em] text-ink">
                {lesson.title}
              </h2>

              {done && (
                <Badge tone="positive">
                  <Check className="h-3 w-3" aria-hidden />
                  Completed
                </Badge>
              )}
              {started && <Badge tone="accent">In progress</Badge>}
              {isNext && !started && <Badge tone="accent">Start here</Badge>}
              {state.locked && (
                <Badge tone="neutral">
                  <Lock className="h-3 w-3" aria-hidden />
                  Later
                </Badge>
              )}
              {state.bestScorePct !== null && hydrated && (
                <Badge tone="neutral" mono>
                  best {Math.round(state.bestScorePct)}%
                </Badge>
              )}
            </div>

            <p className="mt-2 max-w-prose text-[0.9375rem] leading-relaxed text-ink-muted">
              {lesson.description}
            </p>

            {/* The objective in the display italic — the one line that says what
                the lesson is *for*, set apart from what it is about. */}
            <p className="mt-3 flex gap-2 font-display text-[0.9375rem] italic leading-relaxed text-ink-subtle">
              <Target className="mt-1 h-3.5 w-3.5 shrink-0 not-italic" aria-hidden />
              {lesson.objective}
            </p>

            {state.lockedReason && (
              <p className="mt-2 text-[0.8125rem] text-ink-subtle">{state.lockedReason}</p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[0.75rem] text-ink-subtle">
              <span className="inline-flex items-center gap-1.5 capitalize">
                {lesson.difficulty}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {lesson.estimatedMinutes} min
              </span>
              {lesson.questionCount > 0 && (
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <ListChecks className="h-3.5 w-3.5" aria-hidden />
                  {lesson.questionCount} questions
                </span>
              )}
              {lesson.missionsTotal > 0 && (
                <span className="tabular-nums">
                  {hydrated ? `${state.missionsCompleted}/${lesson.missionsTotal}` : lesson.missionsTotal}{" "}
                  {lesson.missionsTotal === 1 ? "mission" : "missions"}
                </span>
              )}
              <span className="ml-auto inline-flex items-center gap-1 text-ink-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                Open
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            </div>
          </div>
        </article>
      </Link>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-ink-subtle">{label}</dt>
      <dd className="mt-1 font-mono text-[1.0625rem] tabular-nums text-ink">{value}</dd>
    </div>
  );
}
