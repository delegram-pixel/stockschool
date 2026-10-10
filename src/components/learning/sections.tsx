"use client";

import { useEffect } from "react";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useProgress } from "@/components/providers/progress-provider";
import { cn } from "@/lib/utils";
import type { AnswerMap } from "@/lib/learning/scoring";
import type { Mission, Quiz } from "@/lib/learning/types";
import type { TokenizedStock } from "@/types";
import { MissionBlock } from "./mission";
import { QuizBlock } from "./quiz";
import { ReflectionBlock } from "./reflection";

/**
 * The progress-aware sections.
 *
 * Everything in this file exists for one reason: the lesson renderer is a
 * *server* component, and progress lives in `localStorage` behind a context.
 * Rather than turn the whole renderer into a client component — which would
 * pull every lesson's prose into the client bundle — the interactive sections
 * are isolated here and the renderer stays a pure function of its content.
 *
 * The split also keeps the wiring honest. Each wrapper does exactly one thing:
 * read the slice of progress its child needs, and write back through the
 * provider's mutation. `QuizBlock` and `MissionBlock` remain pure components
 * that could be rendered from a fixture in a test with no provider at all.
 */

// -----------------------------------------------------------------------------
// Lesson lifecycle
// -----------------------------------------------------------------------------

/**
 * Marks the lesson as started. Renders nothing.
 *
 * Opening a lesson is the only signal a learner gives that they have begun, so
 * this fires on mount rather than waiting for them to answer something. Note
 * that `beginLesson` refuses to demote a completed lesson — revisiting lesson
 * 03 does not un-complete it.
 */
export function LessonTracker({ lessonSlug }: { lessonSlug: string }) {
  const { beginLesson, hydrated } = useProgress();

  useEffect(() => {
    if (!hydrated) return;
    beginLesson(lessonSlug, null);
  }, [hydrated, lessonSlug, beginLesson]);

  return null;
}

/**
 * The lesson's own status, shown in the page header.
 *
 * Renders nothing until progress has hydrated, because the server cannot know
 * it and a placeholder that flips from "Not started" to "Completed" one frame
 * later is worse than a beat of empty space.
 */
export function LessonStatus({
  lessonSlug,
  questionCount,
  missionsTotal,
}: {
  lessonSlug: string;
  questionCount: number;
  missionsTotal: number;
}) {
  const { store, hydrated } = useProgress();
  if (!hydrated) return null;

  const record = store.lessons[lessonSlug];
  const status = record?.status ?? "not-started";
  const missionsDone = Object.values(record?.missions ?? {}).filter((m) => m.completed).length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge
        tone={status === "completed" ? "positive" : status === "in-progress" ? "accent" : "neutral"}
      >
        {status === "completed" && <Check className="h-3 w-3" aria-hidden />}
        {status === "completed" ? "Completed" : status === "in-progress" ? "In progress" : "Not started"}
      </Badge>

      {record?.bestScorePct !== null && record?.bestScorePct !== undefined && questionCount > 0 && (
        <Badge tone="neutral" mono>
          best {Math.round(record.bestScorePct)}%
        </Badge>
      )}

      {missionsTotal > 0 && (
        <Badge tone={missionsDone === missionsTotal ? "positive" : "neutral"} mono>
          {missionsDone}/{missionsTotal} missions
        </Badge>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Interactive sections
// -----------------------------------------------------------------------------

export function QuizSection({
  id,
  lessonSlug,
  quiz,
  heading,
}: {
  id: string;
  lessonSlug: string;
  quiz: Quiz;
  heading?: string;
}) {
  const { store, recordQuizScore } = useProgress();

  return (
    <Wrap id={id} heading={heading} label="Check yourself">
      <QuizBlock
        quiz={quiz}
        bestScorePct={store.lessons[lessonSlug]?.bestScorePct ?? null}
        onScored={(scorePct) => recordQuizScore(lessonSlug, scorePct)}
        onSubmitted={({ answers }) => submitQuizAttempt(quiz.id, answers)}
      />
    </Wrap>
  );
}

/**
 * Send raw answers to the server, which marks them again against its own copy of
 * the curriculum and keeps the result as a `QuizAttempt`.
 *
 * Fire-and-forget, like the progress mirror: the learner already has their marked
 * paper on screen from the local `scoreQuiz` call, and the two cannot disagree
 * because they are the same function over the same content. A failed POST costs
 * an audit row, not a result. Not awaited, so submitting never waits on a
 * database.
 */
function submitQuizAttempt(quizId: string, answers: AnswerMap): void {
  void fetch("/api/quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quizId, answers }),
    signal: AbortSignal.timeout(4000),
  }).catch(() => {
    /* The attempt log is a nice-to-have; the local score is the answer. */
  });
}

export function MissionSection({
  id,
  lessonSlug,
  mission,
  assets,
  heading,
}: {
  id: string;
  lessonSlug: string;
  mission: Mission;
  assets: TokenizedStock[];
  heading?: string;
}) {
  const { store, recordMission } = useProgress();
  const completed = store.lessons[lessonSlug]?.missions[mission.id]?.completed ?? false;

  return (
    <Wrap id={id} heading={heading}>
      <MissionBlock
        mission={mission}
        assets={assets}
        completed={completed}
        onCompleted={() => recordMission(lessonSlug, mission.id, true)}
      />
    </Wrap>
  );
}

export function ReflectionSection({
  id,
  lessonSlug,
  sectionId,
  heading,
  prompt,
  placeholder,
}: {
  id: string;
  lessonSlug: string;
  sectionId: string;
  heading?: string;
  prompt: string;
  placeholder?: string;
}) {
  return (
    <Wrap id={id} heading={heading} label="In your own words">
      <ReflectionBlock
        lessonSlug={lessonSlug}
        sectionId={sectionId}
        prompt={prompt}
        placeholder={placeholder}
      />
    </Wrap>
  );
}

// -----------------------------------------------------------------------------

/**
 * The heading a section carries into the page, plus its eyebrow.
 *
 * Sections are `<section>` elements with an accessible name so that the
 * document outline of a long lesson is navigable by heading. `label` is for the
 * sections whose *kind* is worth announcing — a quiz reads differently from
 * prose, and a learner skimming should be able to see that without reading.
 */
function Wrap({
  id,
  heading,
  label,
  children,
}: {
  id: string;
  heading?: string;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn("my-12 scroll-mt-28", !heading && !label && "my-8")}>
      {(heading || label) && (
        <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {label && (
            <span className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-ink-subtle">
              {label}
            </span>
          )}
          {heading && (
            <h2 className="font-display text-[1.375rem] font-semibold tracking-[-0.015em] text-ink">
              {heading}
            </h2>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
