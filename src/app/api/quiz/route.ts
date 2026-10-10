import { NextResponse, type NextRequest } from "next/server";
import { findQuiz } from "@/content/lessons";
import { scoreQuiz, type AnswerMap } from "@/lib/learning/scoring";
import { resolveSession, withSession } from "@/server/session-cookie";
import { recordQuizAttempt } from "@/server/services/progress-repository";

/**
 * Quiz submission.
 *
 * `prisma/schema.prisma` says of `QuizAttempt`: *"Answers are re-validated on
 * the server against the lesson definition — a client-supplied score is never
 * trusted."* This route is where that sentence is kept. The request carries the
 * learner's raw answers and nothing else; the quiz is looked up in the
 * curriculum, marked here, and the number that gets stored is the one this
 * process computed.
 *
 * The browser marks the same answers with the same `scoreQuiz` function for
 * instant feedback — that is not a second implementation but the same one, which
 * is why the two can never disagree. What the round trip buys is a record that
 * is worth something: an immutable attempt log with a score that could not have
 * been typed into a console.
 *
 * Like every other endpoint here, it never fails the learner. A missing database
 * means the attempt is not persisted, and the response still carries the marked
 * paper, because the marking is the useful part.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = resolveSession(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return withSession(
      NextResponse.json({ error: "Expected a JSON body." }, { status: 400 }),
      session,
    );
  }

  const parsed = parseSubmission(body);
  if (!parsed) {
    return withSession(
      NextResponse.json({ error: "Expected { quizId, answers }." }, { status: 400 }),
      session,
    );
  }

  const found = findQuiz(parsed.quizId);
  if (!found) {
    return withSession(
      NextResponse.json({ error: `No quiz named "${parsed.quizId}".` }, { status: 404 }),
      session,
    );
  }

  const result = scoreQuiz(found.quiz, parsed.answers);

  const outcome = await recordQuizAttempt(session.key, {
    lessonSlug: found.lesson.slug,
    quizId: found.quiz.id,
    score: result.score,
    total: result.total,
    scorePct: result.scorePct,
    answers: result.results.map((row) => ({
      questionId: row.questionId,
      answer: row.given,
      correct: row.correct,
    })),
  });

  return withSession(
    NextResponse.json({
      persisted: outcome.ok,
      lessonSlug: found.lesson.slug,
      quizId: found.quiz.id,
      score: result.score,
      total: result.total,
      scorePct: result.scorePct,
      passed: result.passed,
    }),
    session,
  );
}

/**
 * Accept only what a quiz submission is.
 *
 * Answers are normalised to `string | boolean | number` because that is what
 * `scoreQuiz` understands, and anything else — a nested object, an array, a
 * `null` — is dropped rather than coerced. A dropped answer scores as
 * unanswered, which is the same treatment it would get from a learner who left
 * the field blank.
 */
function parseSubmission(body: unknown): { quizId: string; answers: AnswerMap } | null {
  if (typeof body !== "object" || body === null) return null;

  const candidate = body as { quizId?: unknown; answers?: unknown };
  if (typeof candidate.quizId !== "string" || !candidate.quizId) return null;
  if (typeof candidate.answers !== "object" || candidate.answers === null) return null;
  if (Array.isArray(candidate.answers)) return null;

  const answers: AnswerMap = {};

  for (const [questionId, raw] of Object.entries(candidate.answers as Record<string, unknown>)) {
    if (typeof raw === "string" || typeof raw === "boolean" || typeof raw === "number") {
      // Numbers must be finite, or a NaN would sail into the comparison.
      if (typeof raw === "number" && !Number.isFinite(raw)) continue;
      answers[questionId] = raw;
    }
  }

  return { quizId: candidate.quizId, answers };
}
