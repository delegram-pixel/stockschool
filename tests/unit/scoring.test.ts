import { describe, expect, it } from "vitest";
import { DEFAULT_PASS_MARK_PCT, quizFeedback, scoreQuestion, scoreQuiz } from "@/lib/learning/scoring";
import type { Quiz } from "@/lib/learning/types";

/**
 * Quiz scoring.
 *
 * Two properties matter more than the arithmetic. First, **unanswered questions
 * count as wrong**, so the denominator is always the whole quiz and a learner
 * cannot raise their percentage by leaving the hard ones blank. Second, a wrong
 * answer is never simply "wrong" — every question carries an explanation, and
 * `quizFeedback` is what decides whether the learner sees a verdict or a nudge.
 */

const quiz: Quiz = {
  id: "quiz-01",
  title: "What is a share?",
  questions: [
    {
      id: "q1",
      kind: "multiple-choice",
      prompt: "What does a share represent?",
      options: [
        { id: "a", text: "A loan to a company" },
        { id: "b", text: "Part-ownership of a company" },
      ],
      answer: "b",
      explanation: "A share is a unit of ownership, which is why its value moves with the business.",
    },
    {
      id: "q2",
      kind: "true-false",
      prompt: "A tokenized stock is the same legal instrument as a share.",
      answer: false,
      explanation: "It is a claim on a share held by an issuer. The legal wrapper differs.",
    },
    {
      id: "q3",
      kind: "numeric",
      prompt: "A token trades at $102 and the share at $100. What is the premium, in percent?",
      answer: "2",
      tolerance: "0.05",
      unit: "%",
      explanation: "102 ÷ 100 − 1 = 2%.",
    },
  ],
};

describe("scoreQuestion", () => {
  it("marks a multiple-choice answer by option id", () => {
    const question = quiz.questions[0]!;
    expect(scoreQuestion(question, "b").correct).toBe(true);
    expect(scoreQuestion(question, "a").correct).toBe(false);
  });

  it("treats a missing multiple-choice answer as incorrect, not as an error", () => {
    const result = scoreQuestion(quiz.questions[0]!, undefined);
    expect(result.correct).toBe(false);
    expect(result.given).toBe("");
  });

  it("accepts true/false as a boolean or as the string a form control yields", () => {
    const question = quiz.questions[1]!;
    expect(scoreQuestion(question, false).correct).toBe(true);
    expect(scoreQuestion(question, "false").correct).toBe(true);
    expect(scoreQuestion(question, true).correct).toBe(false);
    expect(scoreQuestion(question, "true").correct).toBe(false);
  });

  it("accepts a numeric answer within the stated tolerance", () => {
    const question = quiz.questions[2]!;
    expect(scoreQuestion(question, "2").correct).toBe(true);
    expect(scoreQuestion(question, 2).correct).toBe(true);
    expect(scoreQuestion(question, "2.04").correct).toBe(true);
    expect(scoreQuestion(question, "1.96").correct).toBe(true);
  });

  it("rejects a numeric answer outside the tolerance", () => {
    expect(scoreQuestion(quiz.questions[2]!, "2.2").correct).toBe(false);
    expect(scoreQuestion(quiz.questions[2]!, "20").correct).toBe(false);
  });

  it("does not treat an unparseable numeric answer as zero", () => {
    // "zero" is not 0. A learner who typed words should be told they were
    // wrong, not quietly credited with the nearest number.
    expect(scoreQuestion(quiz.questions[2]!, "about two").correct).toBe(false);
    expect(scoreQuestion(quiz.questions[2]!, "").correct).toBe(false);
  });

  it("carries the explanation through for every question", () => {
    for (const question of quiz.questions) {
      expect(scoreQuestion(question, undefined).explanation).toBe(question.explanation);
    }
  });
});

describe("scoreQuiz", () => {
  it("counts correct answers over the whole quiz", () => {
    const result = scoreQuiz(quiz, { q1: "b", q2: false, q3: "2" });
    expect(result.score).toBe(3);
    expect(result.total).toBe(3);
    expect(result.scorePct).toBe(100);
    expect(result.passed).toBe(true);
  });

  it("keeps unanswered questions in the denominator", () => {
    // Answering one of three correctly is 33%, not 100% of what was attempted.
    const result = scoreQuiz(quiz, { q1: "b" });
    expect(result.score).toBe(1);
    expect(result.total).toBe(3);
    expect(result.scorePct).toBeCloseTo(33.333, 2);
    expect(result.passed).toBe(false);
  });

  it("uses the default pass mark", () => {
    expect(DEFAULT_PASS_MARK_PCT).toBe(70);
    // Two of three is 66.67%, which is below 70.
    expect(scoreQuiz(quiz, { q1: "b", q2: false }).passed).toBe(false);
  });

  it("honours a quiz-specific pass mark", () => {
    const lenient: Quiz = { ...quiz, passMarkPct: 60 };
    expect(scoreQuiz(lenient, { q1: "b", q2: false }).passed).toBe(true);
  });

  it("scores an empty quiz as zero rather than dividing by zero", () => {
    const empty: Quiz = { id: "empty", title: "Empty", questions: [] };
    const result = scoreQuiz(empty, {});
    expect(result.scorePct).toBe(0);
    expect(result.total).toBe(0);
  });

  it("returns a per-question result for every question", () => {
    const result = scoreQuiz(quiz, { q1: "b" });
    expect(result.results.map((r) => r.questionId)).toEqual(["q1", "q2", "q3"]);
  });
});

describe("quizFeedback", () => {
  it("celebrates a perfect score differently from a pass", () => {
    const perfect = quizFeedback(scoreQuiz(quiz, { q1: "b", q2: false, q3: "2" }));
    expect(perfect.tone).toBe("success");
    expect(perfect.headline).toMatch(/every question/i);
  });

  it("calls a pass a pass and still points at the explanations", () => {
    const four: Quiz = {
      ...quiz,
      questions: [...quiz.questions, {
        id: "q4",
        kind: "true-false",
        prompt: "extra",
        answer: true,
        explanation: "extra",
      }],
    };
    const result = quizFeedback(scoreQuiz(four, { q1: "b", q2: false, q3: "2" }));
    expect(result.tone).toBe("success");
    expect(result.detail).toMatch(/explanation/i);
  });

  it("distinguishes a near miss from a collapse", () => {
    // Below the pass mark on two of three still means half the material landed.
    expect(quizFeedback(scoreQuiz(quiz, { q1: "b" })).tone).toBe("retry");
    const half: Quiz = {
      ...quiz,
      questions: [
        ...quiz.questions,
        { id: "q4", kind: "true-false", prompt: "extra", answer: true, explanation: "extra" },
      ],
    };
    expect(quizFeedback(scoreQuiz(half, { q1: "b", q2: false })).tone).toBe("partial");
  });

  it("never punishes a retry", () => {
    const result = quizFeedback(scoreQuiz(quiz, {}));
    expect(result.detail).toMatch(/try again|second attempt/i);
    expect(result.tone).toBe("retry");
  });
});
