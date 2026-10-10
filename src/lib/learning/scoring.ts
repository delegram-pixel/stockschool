import { Decimal, toDecimal } from "@/lib/calculations/money";
import type { Quiz, QuizQuestion } from "./types";

/**
 * Quiz scoring.
 *
 * Pure functions, no I/O, so the same logic runs in the browser for instant
 * feedback and on the server when a score is persisted. The server must never
 * trust a client-supplied score — it re-runs `scoreQuiz` against the lesson
 * definition it holds.
 */

export const DEFAULT_PASS_MARK_PCT = 70;

export type AnswerMap = Record<string, string | boolean | number>;

export type QuestionResult = {
  questionId: string;
  correct: boolean;
  /** What the learner gave, normalised to a string for storage. */
  given: string;
  /** The correct answer, for the explanation panel. */
  expected: string;
  explanation: string;
};

export type QuizResult = {
  quizId: string;
  score: number;
  total: number;
  scorePct: number;
  passed: boolean;
  results: QuestionResult[];
};

/**
 * Score a submission.
 *
 * Unanswered questions count as incorrect rather than being skipped, so the
 * denominator is always the full quiz — a learner cannot raise their percentage
 * by leaving the hard ones blank.
 */
export function scoreQuiz(quiz: Quiz, answers: AnswerMap): QuizResult {
  const results = quiz.questions.map((question) => scoreQuestion(question, answers[question.id]));
  const score = results.filter((r) => r.correct).length;
  const total = quiz.questions.length;
  const scorePct = total === 0 ? 0 : (score / total) * 100;
  const passMark = quiz.passMarkPct ?? DEFAULT_PASS_MARK_PCT;

  return {
    quizId: quiz.id,
    score,
    total,
    scorePct,
    passed: scorePct >= passMark,
    results,
  };
}

export function scoreQuestion(question: QuizQuestion, given: unknown): QuestionResult {
  const base = { questionId: question.id, explanation: question.explanation };

  switch (question.kind) {
    case "multiple-choice":
    case "scenario": {
      const value = typeof given === "string" ? given : "";
      return { ...base, correct: value === question.answer, given: value, expected: question.answer };
    }

    case "true-false": {
      // Accept the string forms too, since form controls yield strings.
      const value =
        typeof given === "boolean"
          ? given
          : given === "true"
            ? true
            : given === "false"
              ? false
              : null;
      return {
        ...base,
        correct: value === question.answer,
        given: value === null ? "" : String(value),
        expected: String(question.answer),
      };
    }

    case "numeric": {
      const actual = toDecimal(typeof given === "number" || typeof given === "string" ? given : null);
      const expected = toDecimal(question.answer);
      const tolerance = toDecimal(question.tolerance) ?? new Decimal(0);

      if (actual === null || expected === null) {
        return { ...base, correct: false, given: "", expected: question.answer };
      }

      // A learner who types "2" when the answer is "2.00" is correct. The
      // tolerance exists for rounding, not for vagueness — the lesson author
      // sets it deliberately per question.
      const correct = actual.minus(expected).abs().lessThanOrEqualTo(tolerance);

      return { ...base, correct, given: actual.toString(), expected: question.answer };
    }
  }
}

/** Feedback copy for a completed quiz. Never purely "wrong". */
export function quizFeedback(result: QuizResult): { headline: string; detail: string; tone: "success" | "partial" | "retry" } {
  const pct = Math.round(result.scorePct);

  if (result.passed && result.score === result.total) {
    return {
      headline: "Every question correct",
      detail: "You have this concept. Move on to the next lesson, or open a real asset and see it in practice.",
      tone: "success",
    };
  }

  if (result.passed) {
    return {
      headline: `${result.score} of ${result.total} correct — passed`,
      detail: `That is ${pct}%. Read the explanations below for the ones you missed; they are the interesting part.`,
      tone: "success",
    };
  }

  return {
    headline: `${result.score} of ${result.total} correct`,
    detail: `That is ${pct}%. Go through the explanations below and try again — nothing is locked and there is no penalty for a second attempt.`,
    tone: pct >= 50 ? "partial" : "retry",
  };
}
