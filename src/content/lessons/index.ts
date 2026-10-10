import type { Lesson, Quiz } from "@/lib/learning/types";
import { lessonQuizzes } from "@/lib/learning/types";

import { whatIsAStock } from "./01-what-is-a-stock";
import { whatIsAToken } from "./02-what-is-a-token";
import { theTokenizedStock } from "./03-the-tokenized-stock";
import { marketHours } from "./04-market-hours";
import { walletsAndTransactions } from "./05-wallets-and-transactions";
import { liquidityAndDepth } from "./06-liquidity-and-depth";
import { buildAPortfolio } from "./07-build-a-portfolio";
import { investigateTheBlockchain } from "./08-investigate-the-blockchain";

/**
 * The curriculum, in teaching order.
 *
 * The path is deliberately linear: each lesson assumes the one before it, and
 * `prerequisites` encodes that so the learning path can lock and unlock
 * correctly. Adding a lesson means adding a file and one line here — the
 * renderer, the path view, the progress maths and the tests all read this list.
 */
export const lessons: Lesson[] = [
  whatIsAStock,
  whatIsAToken,
  theTokenizedStock,
  marketHours,
  walletsAndTransactions,
  liquidityAndDepth,
  buildAPortfolio,
  investigateTheBlockchain,
];

// Fail loudly at import time rather than shipping a path with a broken link.
// These are authoring errors, and a build is the right place to catch them.
assertCurriculumIsSound(lessons);

export function getLesson(slug: string): Lesson | undefined {
  return lessons.find((lesson) => lesson.slug === slug);
}

export function getLessonByNumber(number: string): Lesson | undefined {
  return lessons.find((lesson) => lesson.number === number);
}

/** The lesson before/after a given slug, for prev/next navigation. */
export function adjacentLessons(slug: string): {
  previous: Lesson | null;
  next: Lesson | null;
} {
  const ordered = [...lessons].sort((a, b) => a.order - b.order);
  const index = ordered.findIndex((lesson) => lesson.slug === slug);
  if (index === -1) return { previous: null, next: null };

  return {
    previous: ordered[index - 1] ?? null,
    next: ordered[index + 1] ?? null,
  };
}

export const lessonSlugs = lessons.map((lesson) => lesson.slug);

/**
 * Locate a quiz anywhere in the curriculum.
 *
 * The server holds the quiz definitions, which is the whole reason a submitted
 * quiz carries raw answers rather than a score: `POST /api/quiz` looks the quiz
 * up here and marks it itself. A client that sends a percentage is told what it
 * actually got, not what it claimed.
 */
export function findQuiz(quizId: string): { lesson: Lesson; quiz: Quiz } | undefined {
  for (const lesson of lessons) {
    const quiz = lessonQuizzes(lesson).find((candidate) => candidate.id === quizId);
    if (quiz) return { lesson, quiz };
  }
  return undefined;
}

export const totalEstimatedMinutes = lessons.reduce(
  (sum, lesson) => sum + lesson.estimatedMinutes,
  0,
);

function assertCurriculumIsSound(list: Lesson[]): void {
  const slugs = new Set<string>();
  const orders = new Set<number>();

  for (const lesson of list) {
    if (slugs.has(lesson.slug)) {
      throw new Error(`Duplicate lesson slug: ${lesson.slug}`);
    }
    slugs.add(lesson.slug);

    if (orders.has(lesson.order)) {
      throw new Error(`Duplicate lesson order ${lesson.order} (${lesson.slug})`);
    }
    orders.add(lesson.order);

    for (const prerequisite of lesson.prerequisites) {
      if (!list.some((l) => l.slug === prerequisite)) {
        throw new Error(
          `Lesson "${lesson.slug}" lists unknown prerequisite "${prerequisite}"`,
        );
      }
    }

    // A prerequisite cycle would make a lesson permanently unopenable, and the
    // learning path would show a locked card with no way through.
    if (lesson.prerequisites.includes(lesson.slug)) {
      throw new Error(`Lesson "${lesson.slug}" lists itself as a prerequisite`);
    }
  }

  assertNoPrerequisiteCycles(list);
}

function assertNoPrerequisiteCycles(list: Lesson[]): void {
  const bySlug = new Map(list.map((lesson) => [lesson.slug, lesson]));
  const settled = new Set<string>();

  for (const lesson of list) {
    const path: string[] = [];
    let current: Lesson | undefined = lesson;

    while (current) {
      if (settled.has(current.slug)) break;
      if (path.includes(current.slug)) {
        throw new Error(
          `Prerequisite cycle: ${[...path, current.slug].join(" → ")}`,
        );
      }
      path.push(current.slug);

      // Annotated deliberately. `current` is reassigned from this value two
      // lines down, so letting TypeScript infer it makes the variable's type
      // depend on its own next assignment — TS7022. The annotation breaks the
      // cycle, and `string | undefined` is what `noUncheckedIndexedAccess`
      // already says `prerequisites[0]` is.
      const firstPrerequisite: string | undefined = current.prerequisites[0];
      current = firstPrerequisite ? bySlug.get(firstPrerequisite) : undefined;
    }

    for (const slug of path) settled.add(slug);
  }
}
