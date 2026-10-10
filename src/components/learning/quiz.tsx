"use client";

import { useMemo, useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { quizFeedback, scoreQuiz, type AnswerMap, type QuizResult } from "@/lib/learning/scoring";
import type { Quiz, QuizQuestion } from "@/lib/learning/types";

/**
 * The quiz.
 *
 * Three behaviours that matter more than the styling:
 *
 * 1. **Answers are revealed only after submitting.** Showing correctness per
 *    question as you go turns the quiz into a guessing game with a scoreboard.
 * 2. **Every question gets an explanation, right or wrong.** The explanation is
 *    the teaching moment — a learner who got it right for the wrong reason
 *    should find that out here.
 * 3. **Retrying is free and unlimited.** No lockout, no penalty, no "you have
 *    used 1 of 2 attempts". The recorded score is the *best* one (handled in
 *    `progress.ts`), so a revision attempt can never lower a learner's result.
 */
export function QuizBlock({
  quiz,
  onScored,
  onSubmitted,
  bestScorePct,
}: {
  quiz: Quiz;
  /** Called once per submission with the percentage. Wired to progress. */
  onScored?: (scorePct: number) => void;
  /**
   * Called once per submission with the raw answers and the marked paper.
   *
   * Kept separate from `onScored` because the two have different jobs: the score
   * updates local progress, while the answers go to the server, which re-marks
   * them against its own copy of the curriculum. This component stays free of
   * `fetch` so it can still be rendered from a fixture in a test.
   */
  onSubmitted?: (submission: { answers: AnswerMap; result: QuizResult }) => void;
  /** Previously recorded best, shown so the learner can see their history. */
  bestScorePct?: number | null;
}) {
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [result, setResult] = useState<QuizResult | null>(null);

  const answeredCount = useMemo(
    () => quiz.questions.filter((q) => answers[q.id] !== undefined).length,
    [answers, quiz.questions],
  );

  const allAnswered = answeredCount === quiz.questions.length;

  function setAnswer(questionId: string, value: string | boolean | number) {
    if (result) return; // Frozen once submitted; retry resets it.
    setAnswers((current) => ({ ...current, [questionId]: value }));
  }

  function submit() {
    const scored = scoreQuiz(quiz, answers);
    setResult(scored);
    onScored?.(scored.scorePct);
    onSubmitted?.({ answers, result: scored });
  }

  function retry() {
    setAnswers({});
    setResult(null);
  }

  const feedback = result ? quizFeedback(result) : null;

  return (
    <div className="not-prose">
      <div className="rounded-2xl border border-line bg-surface">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h3 className="font-display text-[1.125rem] font-semibold tracking-[-0.015em] text-ink">
              {quiz.title}
            </h3>
            <p className="mt-0.5 text-[0.8125rem] text-ink-muted">
              {quiz.questions.length} question{quiz.questions.length === 1 ? "" : "s"} ·{" "}
              {quiz.passMarkPct ?? 70}% to pass
            </p>
          </div>

          {bestScorePct !== null && bestScorePct !== undefined && !result && (
            <span className="font-mono text-[0.75rem] text-ink-subtle">
              Best so far: {Math.round(bestScorePct)}%
            </span>
          )}
        </header>

        <ol className="divide-y divide-line">
          {quiz.questions.map((question, index) => (
            <li key={question.id} className="px-5 py-6 sm:px-6">
              <QuestionView
                question={question}
                index={index}
                value={answers[question.id]}
                onChange={(value) => setAnswer(question.id, value)}
                result={result?.results.find((r) => r.questionId === question.id) ?? null}
                locked={result !== null}
              />
            </li>
          ))}
        </ol>

        <footer className="border-t border-line px-5 py-5 sm:px-6">
          {!result ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-[0.8125rem] text-ink-muted" role="status" aria-live="polite">
                {allAnswered
                  ? "All questions answered. Ready when you are."
                  : `${answeredCount} of ${quiz.questions.length} answered`}
              </p>
              <Button onClick={submit} disabled={!allAnswered}>
                Check my answers
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "font-display text-[1.125rem] font-semibold tracking-[-0.015em]",
                    feedback?.tone === "success"
                      ? "text-success"
                      : feedback?.tone === "partial"
                        ? "text-warning"
                        : "text-danger",
                  )}
                  role="status"
                >
                  {feedback?.headline}
                </p>
                <p className="mt-1 max-w-prose text-[0.875rem] leading-relaxed text-ink-muted">
                  {feedback?.detail}
                </p>
              </div>
              <Button variant="secondary" onClick={retry}>
                <RotateCcw className="h-4 w-4" aria-hidden />
                Try again
              </Button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------

function QuestionView({
  question,
  index,
  value,
  onChange,
  result,
  locked,
}: {
  question: QuizQuestion;
  index: number;
  value: string | boolean | number | undefined;
  onChange: (value: string | boolean | number) => void;
  result: { correct: boolean; given: string; expected: string; explanation: string } | null;
  locked: boolean;
}) {
  const numeric = question.kind === "numeric";

  return (
    <div>
      <div className="flex gap-3">
        <span className="mt-0.5 font-mono text-[0.75rem] text-ink-subtle tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          {/* A scenario is a question with a short situation attached, so it
              reads as a vignette above the prompt rather than as an aside. */}
          {question.kind === "scenario" && (
            <div className="mb-4 rounded-xl border border-line bg-surface-muted px-4 py-3.5">
              <p className="text-[0.9375rem] leading-relaxed text-ink">{question.scenario}</p>
            </div>
          )}

          <p className="text-[1.0625rem] font-medium leading-snug text-ink">{question.prompt}</p>

          <div className="mt-4">
            {question.kind === "numeric" ? (
              <NumericInput
                value={typeof value === "string" ? value : ""}
                onChange={onChange}
                unit={question.unit}
                locked={locked}
                correct={result?.correct ?? null}
              />
            ) : question.kind === "true-false" ? (
              <OptionList
                name={question.id}
                options={[
                  { id: "true", text: "True" },
                  { id: "false", text: "False" },
                ]}
                selected={typeof value === "boolean" ? String(value) : typeof value === "string" ? value : ""}
                onSelect={(id) => onChange(id === "true")}
                correctId={result ? String(question.answer) : null}
                locked={locked}
              />
            ) : (
              <OptionList
                name={question.id}
                options={question.options}
                selected={typeof value === "string" ? value : ""}
                onSelect={onChange}
                correctId={result ? question.answer : null}
                locked={locked}
              />
            )}
          </div>

          {result && (
            <div
              className={cn(
                "mt-4 flex gap-3 rounded-xl border px-4 py-3.5",
                result.correct ? "border-success/25 bg-success-soft" : "border-danger/25 bg-danger-soft",
              )}
            >
              <span aria-hidden className="mt-0.5">
                {result.correct ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <X className="h-4 w-4 text-danger" />
                )}
              </span>
              <div>
                <p
                  className={cn(
                    "text-[0.8125rem] font-semibold",
                    result.correct ? "text-success" : "text-danger",
                  )}
                >
                  {result.correct ? "Correct" : "Not quite"}
                </p>
                <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink">
                  {result.explanation}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OptionList({
  name,
  options,
  selected,
  onSelect,
  correctId,
  locked,
}: {
  name: string;
  options: Array<{ id: string; text: string }>;
  selected: string;
  onSelect: (id: string) => void;
  correctId: string | null;
  locked: boolean;
}) {
  return (
    <ul className="space-y-2">
      {options.map((option) => {
        const isSelected = selected === option.id;
        const isCorrect = correctId === option.id;
        // After submitting we mark the correct option regardless of what was
        // chosen, so the learner sees the answer rather than only their error.
        const isWrongPick = correctId !== null && isSelected && !isCorrect;

        return (
          <li key={option.id}>
            <label
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors duration-150",
                "has-focus-visible:ring-2 has-focus-visible:ring-teal/45",
                locked && "cursor-default",
                isCorrect
                  ? "border-success/40 bg-success-soft"
                  : isWrongPick
                    ? "border-danger/40 bg-danger-soft"
                    : isSelected
                      ? "border-teal-line bg-teal-soft"
                      : "border-line hover:border-line-strong hover:bg-ink/2",
              )}
            >
              <input
                type="radio"
                // Grouped by *question*, not by the shape of the option list.
                // Radio groups are document-wide, so two questions that happen
                // to offer a/b/c/d would otherwise share one group and clear
                // each other's selection. `name` is the question id.
                name={name}
                value={option.id}
                checked={isSelected}
                disabled={locked}
                onChange={() => onSelect(option.id)}
                className="mt-1 h-4 w-4 shrink-0 accent-(--color-teal)"
              />
              <span className="text-[0.9375rem] leading-relaxed text-ink">{option.text}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function NumericInput({
  value,
  onChange,
  unit,
  locked,
  correct,
}: {
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  locked: boolean;
  correct: boolean | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          disabled={locked}
          onChange={(event) => {
            // Accept only something that could become a number, so the learner
            // is not left guessing why their answer was rejected.
            const next = event.target.value;
            if (next === "" || /^-?\d*\.?\d*$/.test(next)) onChange(next);
          }}
          placeholder="Your answer"
          aria-label={unit ? `Your answer in ${unit}` : "Your answer"}
          className={cn(
            "h-11 w-44 rounded-xl border bg-surface px-3.5 font-mono text-[0.9375rem] tabular-nums text-ink",
            "placeholder:font-sans placeholder:text-ink-subtle",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/45",
            correct === null
              ? "border-line-strong"
              : correct
                ? "border-success/50"
                : "border-danger/50",
          )}
        />
        {unit && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.8125rem] text-ink-subtle">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
