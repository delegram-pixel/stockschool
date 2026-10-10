"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ExternalLink, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, Eyebrow } from "@/components/ui/card";
import { RelativeTime } from "@/components/ui/relative-time";
import { useProgress } from "@/components/providers/progress-provider";
import { DEFAULT_PASS_MARK_PCT } from "@/lib/learning/scoring";
import { computePathStates, summarisePathStates } from "@/lib/learning/progress";
import type { PathLesson, PathStateView } from "@/lib/learning/progress";
import { cn } from "@/lib/utils";

/**
 * The record — as distinct from the plan.
 *
 * `/learn` answers *what do I do next*: a spine, a continue card, and eight
 * cards ordered by when to read them. This page answers a different question —
 * *what have I actually done* — and putting both on one page would make each
 * worse. So there is no continue card here and no narrative ordering; there is a
 * table, a set of scores, and an honest account of where the data lives.
 *
 * It is a client component because progress lives in the learner's browser and
 * nowhere else until they have a session. The lessons arrive as the trimmed
 * `PathLesson` projection: titles, numbers and counts, no prose. The unlock
 * state is computed here, from the same pure functions the path view uses, so
 * the two can never disagree about whether a lesson is complete.
 */

export function ProgressDashboard({ items }: { items: PathLesson[] }) {
  const { store, hydrated, resetProgress } = useProgress();

  const states = useMemo(() => computePathStates(items, store), [items, store]);
  const summary = useMemo(() => summarisePathStates(states), [states]);

  const attempted = states
    .filter((state) => state.bestScorePct !== null)
    .sort((a, b) => a.lesson.order - b.lesson.order);

  const started = states.filter((state) => state.status !== "not-started");

  return (
    <div className="space-y-10">
      <SummaryBand summary={summary} hydrated={hydrated} hasRecord={started.length > 0} />

      <ScoreRecord attempted={attempted} hydrated={hydrated} />

      <FullRecord states={states} hydrated={hydrated} />

      <WhereThisLives onReset={resetProgress} hasRecord={hydrated && started.length > 0} />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------

function SummaryBand({
  summary,
  hydrated,
  hasRecord,
}: {
  summary: ReturnType<typeof summarisePathStates>;
  hydrated: boolean;
  hasRecord: boolean;
}) {
  return (
    <Card padding="lg">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <div>
          <Eyebrow>Lessons completed</Eyebrow>
          <p
            className="mt-3 font-display text-[2.75rem] font-semibold leading-none tracking-[-0.03em] text-ink"
            data-numeric
          >
            {hydrated ? summary.lessonsCompleted : "—"}
            <span className="text-ink-subtle"> / {summary.lessonsTotal}</span>
          </p>
          <p className="mt-2 text-[0.8125rem] text-ink-muted">
            {hydrated && !hasRecord
              ? "Nothing recorded yet — the first lesson takes about ten minutes."
              : hydrated
                ? `${summary.lessonsStarted} opened, ${summary.lockedCount} still marked “later”.`
                : "Reading your saved progress…"}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-x-10 gap-y-5 sm:grid-cols-3">
          <Stat
            label="Missions"
            value={hydrated ? `${summary.missionsCompleted}/${summary.missionsTotal}` : "—"}
            note="hands-on exercises passed"
          />
          <Stat
            label="Average quiz"
            value={
              hydrated && summary.averageQuizScorePct !== null
                ? `${Math.round(summary.averageQuizScorePct)}%`
                : "—"
            }
            note={
              hydrated && summary.averageQuizScorePct !== null
                ? `across ${summary.lessonsStarted} attempted`
                : "no quiz attempted yet"
            }
          />
          <Stat
            label="Still to read"
            value={hydrated ? String(summary.lessonsTotal - summary.lessonsCompleted) : "—"}
            note="lessons left in the course"
          />
        </dl>
      </div>
    </Card>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="border-l border-line pl-4">
      <dt className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-subtle">
        {label}
      </dt>
      <dd className="mt-2 font-mono text-[1.0625rem] tabular-nums text-ink">{value}</dd>
      <p className="mt-1.5 max-w-40 text-[0.75rem] leading-snug text-ink-muted">{note}</p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Scores
// -----------------------------------------------------------------------------

/**
 * Best quiz score per lesson, as bars.
 *
 * The pass mark is drawn on every track rather than being explained once in
 * prose. A number with a line through it at 70% answers "was that good?" at a
 * glance, and it keeps the answer honest: the bar never colour-codes pass
 * green and fail red, because a quiz in a classroom is not a verdict. Filled
 * portion is teal regardless; the marker does the work.
 */
function ScoreRecord({
  attempted,
  hydrated,
}: {
  attempted: PathStateView[];
  hydrated: boolean;
}) {
  return (
    <Card padding="lg">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <Eyebrow>Quiz record</Eyebrow>
        <p className="text-[0.75rem] text-ink-subtle">
          Best attempt per lesson · pass mark {DEFAULT_PASS_MARK_PCT}%
        </p>
      </div>

      {!hydrated ? (
        <p className="mt-4 text-[0.9375rem] text-ink-muted">Reading your saved progress…</p>
      ) : attempted.length === 0 ? (
        <p className="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-ink-muted">
          No quiz attempted yet. Every lesson except the first has one, and a wrong answer costs
          nothing — each question explains itself afterwards, which is where most of the learning
          happens.
        </p>
      ) : (
        <ul className="mt-6 space-y-5">
          {attempted.map((state) => (
            <ScoreBar key={state.lesson.slug} state={state} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function ScoreBar({ state }: { state: PathStateView }) {
  const score = state.bestScorePct ?? 0;
  const passed = score >= DEFAULT_PASS_MARK_PCT;

  return (
    <li>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Link
          href={`/learn/${state.lesson.slug}`}
          className="text-[0.875rem] font-medium text-ink underline decoration-transparent underline-offset-[3px] transition-colors hover:decoration-teal-line"
        >
          <span className="font-mono text-[0.8125rem] text-ink-subtle">{state.lesson.number}</span>{" "}
          {state.lesson.title}
        </Link>
        <span className="font-mono text-[0.875rem] tabular-nums text-ink">
          {Math.round(score)}%
          <span className="ml-2 text-[0.75rem] text-ink-subtle">
            {passed ? "at or above the pass mark" : "below the pass mark"}
          </span>
        </span>
      </div>

      <div className="relative mt-2 h-2 rounded-full bg-surface-muted">
        <span
          className="block h-full rounded-full bg-teal"
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
        {/* The pass mark. Drawn over the fill so it reads as a threshold the bar
            crosses rather than a second data series. */}
        <span
          aria-hidden
          className="absolute -inset-y-0.75 w-px bg-ink/35"
          style={{ left: `${DEFAULT_PASS_MARK_PCT}%` }}
        />
      </div>
    </li>
  );
}

// -----------------------------------------------------------------------------
// The full record
// -----------------------------------------------------------------------------

/**
 * Status pills.
 *
 * Deliberately *not* using the `positive`/`negative` badge tones. Those are
 * reserved for numbers that carry direction — a price move, a gain — and the
 * badge component's own header says they must never be used to make something
 * look agreeable. A finished lesson is a state, not a profit, so it takes the
 * teal accent the rest of the progress surfaces already use. The consequence is
 * that "completed" and "in progress" differ by tint rather than by greenness,
 * which is the correct amount of ceremony for a checkbox.
 */
const STATUS_COPY: Record<
  PathStateView["status"],
  { label: string; tone: "accent" | "info" | "neutral" }
> = {
  completed: { label: "Completed", tone: "accent" },
  "in-progress": { label: "In progress", tone: "info" },
  "not-started": { label: "Not started", tone: "neutral" },
};

function FullRecord({ states, hydrated }: { states: PathStateView[]; hydrated: boolean }) {
  return (
    <Card padding="none">
      <div className="px-6 pt-6">
        <Eyebrow>Every lesson</Eyebrow>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-176 border-collapse text-[0.875rem]">
          <caption className="sr-only">
            Completion status, best quiz score and mission count for each lesson
          </caption>
          <thead>
            <tr className="border-y border-line text-left">
              <Th>Lesson</Th>
              <Th>Status</Th>
              <Th align="right">Best quiz</Th>
              <Th align="right">Missions</Th>
              <Th>Completed</Th>
              <Th>Last touched</Th>
            </tr>
          </thead>
          <tbody>
            {states.map((state) => {
              const record = state.lesson;
              const copy = STATUS_COPY[state.status];

              return (
                <tr
                  key={record.slug}
                  className="border-b border-line-faint last:border-b-0 hover:bg-surface-muted/60"
                >
                  <td className="px-6 py-3.5">
                    <Link
                      href={`/learn/${record.slug}`}
                      className="group inline-flex items-baseline gap-2.5 text-ink"
                    >
                      <span className="font-mono text-[0.75rem] text-ink-subtle">
                        {record.number}
                      </span>
                      <span className="font-medium underline decoration-transparent underline-offset-[3px] transition-colors group-hover:decoration-teal-line">
                        {record.title}
                      </span>
                      <ArrowRight
                        aria-hidden
                        className="h-3 w-3 translate-y-px text-ink-subtle opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </Link>
                  </td>

                  <td className="px-6 py-3.5">
                    <Badge tone={hydrated ? copy.tone : "neutral"}>
                      {hydrated ? (
                        <>
                          {state.status === "completed" && <Check aria-hidden className="h-3 w-3" />}
                          {copy.label}
                        </>
                      ) : (
                        "—"
                      )}
                    </Badge>
                  </td>

                  <td className="px-6 py-3.5 text-right font-mono tabular-nums text-ink">
                    {hydrated && state.bestScorePct !== null
                      ? `${Math.round(state.bestScorePct)}%`
                      : "—"}
                  </td>

                  <td className="px-6 py-3.5 text-right font-mono tabular-nums text-ink-muted">
                    {record.missionsTotal === 0
                      ? "—"
                      : hydrated
                        ? `${state.missionsCompleted}/${record.missionsTotal}`
                        : `–/${record.missionsTotal}`}
                  </td>

                  <td className="px-6 py-3.5 text-[0.8125rem] text-ink-muted">
                    <CompletionTime slug={record.slug} hydrated={hydrated} />
                  </td>

                  <td className="px-6 py-3.5 text-[0.8125rem] text-ink-subtle">
                    <TouchedTime slug={record.slug} hydrated={hydrated} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/**
 * The two timestamps.
 *
 * Pulled out into their own components so the `useProgress` store is read where
 * it is used rather than threaded down as four more props through a table cell.
 * Both render an em-dash until hydration, for the reason the provider documents:
 * the server has no idea what is in this browser, and a date that appears and
 * then corrects itself is worse than a dash that fills in.
 */
function CompletionTime({ slug, hydrated }: { slug: string; hydrated: boolean }) {
  const { store } = useProgress();
  const iso = store.lessons[slug]?.completedAt ?? null;

  if (!hydrated) return <>—</>;
  if (iso === null) return <span className="text-ink-subtle">Not yet</span>;

  return <RelativeTime iso={iso} />;
}

function TouchedTime({ slug, hydrated }: { slug: string; hydrated: boolean }) {
  const { store } = useProgress();
  const iso = store.lessons[slug]?.updatedAt ?? null;

  if (!hydrated || iso === null) return <>—</>;
  return <RelativeTime iso={iso} />;
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap px-6 py-2.5 font-mono text-[0.625rem] font-medium uppercase tracking-[0.12em] text-ink-subtle",
        align === "right" && "text-right",
      )}
    >
      {children}
    </th>
  );
}

// -----------------------------------------------------------------------------
// Provenance of the record itself
// -----------------------------------------------------------------------------

/**
 * Where this page's numbers come from, and how to destroy them.
 *
 * Almost every product hides this. Here it is the point: the course spends eight
 * lessons teaching a learner to check where a claim came from, and then this
 * page tells them where *its own* claims came from — a browser key, mirrored to
 * a database only if a session cookie exists, and never behind an account.
 *
 * "Start over" is a real, reachable button. A learning record you cannot delete
 * is not yours, and the request the button makes is the only `DELETE` in the
 * product — everything else only ever adds.
 */
function WhereThisLives({
  onReset,
  hasRecord,
}: {
  onReset: () => void;
  hasRecord: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <Card padding="lg">
      <Eyebrow>Where this record lives</Eyebrow>

      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <div className="space-y-3 text-[0.875rem] leading-relaxed text-ink-muted">
          <p>
            Your progress is stored in this browser, under a key called{" "}
            <span className="font-mono text-[0.8125rem] text-ink">stockschool:progress:v1</span>. If
            this deployment has a database configured, a copy is mirrored to it so the same
            progress follows the session cookie to another device — but it is a mirror, not the
            source. Clearing your browser data clears this page.
          </p>
          <p>
            There is no account, no email and no password. Nothing here is shared with anyone, and
            no third party receives it.
          </p>
        </div>

        <div className="rounded-xl border border-line bg-surface-muted p-5">
          <p className="text-[0.875rem] font-medium text-ink">Forget everything</p>
          <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-muted">
            Deletes every completion, score and mission record. The lessons themselves are
            unaffected and nothing is lost that cannot be earned again.
          </p>

          {!confirming ? (
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              disabled={!hasRecord}
              onClick={() => setConfirming(true)}
            >
              <TriangleAlert aria-hidden className="h-3.5 w-3.5" />
              {hasRecord ? "Start over" : "Nothing recorded yet"}
            </Button>
          ) : (
            <div
              role="group"
              aria-label="Confirm deleting progress"
              className="mt-4 rounded-lg border border-warning/25 bg-warning-soft px-3.5 py-3"
            >
              <p className="text-[0.8125rem] text-ink">
                This cannot be undone. Delete your saved progress?
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    onReset();
                    setConfirming(false);
                  }}
                >
                  Delete it
                </Button>
                <Button variant="quiet" size="sm" onClick={() => setConfirming(false)}>
                  Keep it
                </Button>
              </div>
            </div>
          )}

          <a
            href="/api/progress"
            className="mt-4 inline-flex items-center gap-1.5 text-[0.75rem] text-ink-subtle underline decoration-line-strong underline-offset-2 transition-colors hover:text-ink-muted"
          >
            See what the server holds
            <ExternalLink aria-hidden className="h-3 w-3" />
          </a>
        </div>
      </div>
    </Card>
  );
}
