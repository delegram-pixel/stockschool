import { lessonMissions, lessonQuestionCount, type Difficulty, type Lesson } from "./types";

/**
 * Learning progress model and the unlocking rules.
 *
 * Kept free of React and storage so that the exact same code computes progress
 * in the browser (localStorage), on the server (Postgres), and in tests.
 */

export const PROGRESS_VERSION = 1;

export type LessonCompletion = "not-started" | "in-progress" | "completed";

export type MissionRecord = {
  completed: boolean;
  completedAt: string | null;
  attempts: number;
};

export type LessonProgressRecord = {
  slug: string;
  status: LessonCompletion;
  /** Best quiz score as a percentage, or null if no quiz attempted. */
  bestScorePct: number | null;
  completedAt: string | null;
  /** Section the learner was last on, so "resume" lands in the right place. */
  lastSectionId: string | null;
  missions: Record<string, MissionRecord>;
  updatedAt: string;
};

export type ProgressStore = {
  version: number;
  lessons: Record<string, LessonProgressRecord>;
};

export function emptyProgress(): ProgressStore {
  return { version: PROGRESS_VERSION, lessons: {} };
}

/**
 * Validate a stored or transmitted progress object.
 *
 * This lives here, next to the model, rather than inside the provider, because
 * the same check has to run on both sides of the wire: the browser parses what
 * it finds in localStorage, and the route handler parses what a browser sends
 * it. One parser means a payload cannot be acceptable to one and not the other.
 *
 * Returns null for anything that is not recognisably ours. A record without a
 * recognisable status is skipped rather than sinking the whole store — losing
 * one lesson's progress is recoverable, losing all of it is not.
 *
 * An older `version` is accepted rather than rejected: discarding a learner's
 * progress because we bumped an integer would be indefensible. Any future
 * migration belongs in this function.
 */
export function parseProgressStore(value: unknown): ProgressStore | null {
  if (typeof value !== "object" || value === null) return null;

  const candidate = value as { version?: unknown; lessons?: unknown };
  if (typeof candidate.version !== "number") return null;
  if (typeof candidate.lessons !== "object" || candidate.lessons === null) return null;
  if (Array.isArray(candidate.lessons)) return null;

  const lessons: ProgressStore["lessons"] = {};

  for (const [slug, raw] of Object.entries(candidate.lessons as Record<string, unknown>)) {
    if (typeof raw !== "object" || raw === null) continue;
    const record = raw as Record<string, unknown>;

    const status = record.status;
    if (status !== "not-started" && status !== "in-progress" && status !== "completed") continue;

    lessons[slug] = {
      slug,
      status,
      bestScorePct:
        typeof record.bestScorePct === "number" && Number.isFinite(record.bestScorePct)
          ? record.bestScorePct
          : null,
      completedAt: typeof record.completedAt === "string" ? record.completedAt : null,
      lastSectionId: typeof record.lastSectionId === "string" ? record.lastSectionId : null,
      missions: parseMissions(record.missions),
      updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : new Date().toISOString(),
    };
  }

  return { version: PROGRESS_VERSION, lessons };
}

function parseMissions(value: unknown): ProgressStore["lessons"][string]["missions"] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};

  const missions: ProgressStore["lessons"][string]["missions"] = {};

  for (const [id, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw !== "object" || raw === null) continue;
    const record = raw as Record<string, unknown>;
    missions[id] = {
      completed: record.completed === true,
      completedAt: typeof record.completedAt === "string" ? record.completedAt : null,
      attempts: typeof record.attempts === "number" ? record.attempts : 0,
    };
  }

  return missions;
}

/**
 * How far along a lesson is, as a number, so states can be compared.
 *
 * The mirror in `progress-repository.ts` uses this to refuse to move a lesson
 * backwards: a device that has been offline for a week must not be able to undo
 * what a newer one recorded.
 */
export function completionRank(status: LessonCompletion): number {
  return status === "completed" ? 2 : status === "in-progress" ? 1 : 0;
}

/** The later of two completion states. */
export function furthestCompletion(
  a: LessonCompletion,
  b: LessonCompletion,
): LessonCompletion {
  return completionRank(a) >= completionRank(b) ? a : b;
}

/**
 * The shape the learning path actually needs.
 *
 * A `Lesson` carries every paragraph, quiz and widget config in the curriculum.
 * The path view needs eight cards, and it computes their lock state in the
 * browser, where the progress lives — so sending whole `Lesson` objects across
 * the server/client boundary would ship the entire course as client data to
 * render a list of titles. This is the trimmed projection instead: enough to
 * draw a card and decide whether it is unlocked, and nothing more.
 */
export type PathLesson = {
  slug: string;
  number: string;
  title: string;
  description: string;
  objective: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  order: number;
  prerequisites: string[];
  questionCount: number;
  missionsTotal: number;
};

export function toPathLesson(lesson: Lesson): PathLesson {
  return {
    slug: lesson.slug,
    number: lesson.number,
    title: lesson.title,
    description: lesson.description,
    objective: lesson.objective,
    difficulty: lesson.difficulty,
    estimatedMinutes: lesson.estimatedMinutes,
    order: lesson.order,
    prerequisites: lesson.prerequisites,
    questionCount: lessonQuestionCount(lesson),
    missionsTotal: lessonMissions(lesson).length,
  };
}

/** Derived view state for one lesson, used by the path and the lesson page. */
export type LessonState = {
  lesson: PathLesson;
  status: LessonCompletion;
  /** True when prerequisites are unmet. */
  locked: boolean;
  /** Plain-language explanation of what is blocking, when locked. */
  lockedReason: string | null;
  bestScorePct: number | null;
  missionsCompleted: number;
  missionsTotal: number;
  /** True when the lesson is the natural next thing to do. */
  isNext: boolean;
};

/**
 * A computed lesson state with its `lesson` narrowed to whatever the caller
 * passed in. The path view holds `PathStateView`; the lesson page holds a state
 * whose `lesson` is a full `Lesson`.
 */
export type PathStateView = Omit<LessonState, "lesson"> & { lesson: PathLesson };

/**
 * The same state where `lesson` is a whole `Lesson` — the lesson page's view,
 * named in the docblock above but never actually declared until now.
 *
 * It is deliberately *not* `LessonState`. A full `Lesson` is not a `PathLesson`:
 * the projection adds `questionCount` and `missionsTotal`, which are computed
 * from the section list rather than stored on the lesson. So a state carrying a
 * `Lesson` cannot be a `LessonState`, and the two have to be separate types.
 */
export type FullLessonState = Omit<LessonState, "lesson"> & { lesson: Lesson };

/**
 * The least a state must expose to be rolled up: everything but the lesson
 * itself, plus its slug — the one field the summary needs, to name what is next.
 *
 * Stated separately so `summarisePathStates` accepts both views. It is generic
 * over the lesson only where it has to be; everywhere else it wants the slug.
 */
export type SummarisableState = Omit<LessonState, "lesson"> & { lesson: { slug: string } };

/**
 * Compute the state of the whole learning path.
 *
 * The rule: a lesson unlocks when every prerequisite is completed. The first
 * lesson has no prerequisites, so a brand-new learner always has somewhere to
 * start — the app-flow document is explicit that nothing may gate the first
 * lesson, and the PRD forbids a login wall before it.
 *
 * Note what "locked" does *not* do: it never hides a lesson and never stops
 * anyone opening it. It is a signal about reading order, and the lesson page
 * turns it into a notice rather than a door. Locking here is bookkeeping, not
 * enforcement.
 *
 * Generic over the item type so the path view can pass its trimmed projection
 * and the lesson page can pass real `Lesson` objects, with the unlock rule
 * written exactly once.
 */
export function computePathStates<T extends PathLesson>(
  items: T[],
  store: ProgressStore,
): Array<Omit<LessonState, "lesson"> & { lesson: T }> {
  const ordered = [...items].sort((a, b) => a.order - b.order);
  const completedSlugs = new Set(
    Object.values(store.lessons)
      .filter((record) => record.status === "completed")
      .map((record) => record.slug),
  );

  let nextAssigned = false;

  return ordered.map((lesson) => {
    const record = store.lessons[lesson.slug];

    const missing = lesson.prerequisites.filter((slug) => !completedSlugs.has(slug));
    const locked = missing.length > 0;

    const status: LessonCompletion = record?.status ?? "not-started";

    // The "next" lesson is the first unlocked, not-yet-completed one.
    const isNext = !locked && status !== "completed" && !nextAssigned;
    if (isNext) nextAssigned = true;

    const missions = record?.missions ?? {};
    const missionsCompleted = Object.values(missions).filter((m) => m.completed).length;

    return {
      lesson,
      status,
      locked,
      lockedReason: locked
        ? `Finish ${formatList(missing.map((slug) => titleFor(items, slug)))} first.`
        : null,
      bestScorePct: record?.bestScorePct ?? null,
      missionsCompleted,
      missionsTotal: lesson.missionsTotal,
      isNext,
    };
  });
}

export function computeLessonStates(lessons: Lesson[], store: ProgressStore): FullLessonState[] {
  const states = computePathStates(lessons.map(toPathLesson), store);
  // `computePathStates` sorts by `order`, so the state at index i is not
  // necessarily `lessons[i]` — match them back by slug rather than by position.
  const bySlug = new Map(lessons.map((lesson) => [lesson.slug, lesson]));

  return states.flatMap((state) => {
    const lesson = bySlug.get(state.lesson.slug);
    return lesson ? [{ ...state, lesson }] : [];
  });
}

/** Aggregate progress for the Progress page and the header meter. */
export type OverallProgress = {
  lessonsCompleted: number;
  lessonsStarted: number;
  lessonsTotal: number;
  /** Percentage of lessons completed, 0–100, rounded to a whole number. */
  percentComplete: number;
  missionsCompleted: number;
  missionsTotal: number;
  /** Mean of the best score per attempted quiz, or null when none attempted. */
  averageQuizScorePct: number | null;
  /** Slug of the next lesson to take, or null when the path is finished. */
  nextLessonSlug: string | null;
  /** Lessons still locked and what unlocks them. */
  lockedCount: number;
};

export function computeOverallProgress(
  lessons: Lesson[],
  store: ProgressStore,
): OverallProgress {
  return summarisePathStates(computePathStates(lessons.map(toPathLesson), store));
}

/**
 * Roll a set of path states up into the numbers the Progress page and the
 * header meter show. Takes states rather than lessons so the same summariser
 * serves the server-rendered path and the client-rendered header.
 */
export function summarisePathStates(states: readonly SummarisableState[]): OverallProgress {
  const lessonsCompleted = states.filter((s) => s.status === "completed").length;
  const lessonsStarted = states.filter((s) => s.status !== "not-started").length;
  const missionsCompleted = states.reduce((sum, s) => sum + s.missionsCompleted, 0);
  const missionsTotal = states.reduce((sum, s) => sum + s.missionsTotal, 0);

  const scores = states
    .map((s) => s.bestScorePct)
    .filter((score): score is number => score !== null);
  const averageQuizScorePct =
    scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  const next = states.find((s) => s.isNext);

  return {
    lessonsCompleted,
    lessonsStarted,
    lessonsTotal: states.length,
    percentComplete:
      states.length === 0 ? 0 : Math.round((lessonsCompleted / states.length) * 100),
    missionsCompleted,
    missionsTotal,
    averageQuizScorePct,
    nextLessonSlug: next?.lesson.slug ?? null,
    lockedCount: states.filter((s) => s.locked).length,
  };
}

// -----------------------------------------------------------------------------
// Mutations — all pure, all returning a new store
// -----------------------------------------------------------------------------

export function beginLesson(store: ProgressStore, slug: string, sectionId: string | null, now = new Date()): ProgressStore {
  const existing = store.lessons[slug];
  // Re-opening a completed lesson must not demote it. The background schema is
  // explicit about this: no duplicate or regressed progress rows.
  if (existing?.status === "completed") {
    return {
      ...store,
      lessons: {
        ...store.lessons,
        [slug]: { ...existing, lastSectionId: sectionId, updatedAt: now.toISOString() },
      },
    };
  }

  return {
    ...store,
    lessons: {
      ...store.lessons,
      [slug]: {
        slug,
        status: "in-progress",
        bestScorePct: existing?.bestScorePct ?? null,
        completedAt: null,
        lastSectionId: sectionId,
        missions: existing?.missions ?? {},
        updatedAt: now.toISOString(),
      },
    },
  };
}

export function recordQuizScore(
  store: ProgressStore,
  slug: string,
  scorePct: number,
  now = new Date(),
): ProgressStore {
  const existing = store.lessons[slug];
  // Keep the *best* score. A learner re-taking a quiz to revise should never
  // watch their recorded result go down.
  const best =
    existing?.bestScorePct === null || existing?.bestScorePct === undefined
      ? scorePct
      : Math.max(existing.bestScorePct, scorePct);

  return {
    ...store,
    lessons: {
      ...store.lessons,
      [slug]: {
        slug,
        status: existing?.status === "completed" ? "completed" : "in-progress",
        bestScorePct: best,
        completedAt: existing?.completedAt ?? null,
        lastSectionId: existing?.lastSectionId ?? null,
        missions: existing?.missions ?? {},
        updatedAt: now.toISOString(),
      },
    },
  };
}

export function recordMission(
  store: ProgressStore,
  slug: string,
  missionId: string,
  completed: boolean,
  now = new Date(),
): ProgressStore {
  const existing = store.lessons[slug];
  const previous = existing?.missions[missionId];

  return {
    ...store,
    lessons: {
      ...store.lessons,
      [slug]: {
        slug,
        status: existing?.status ?? "in-progress",
        bestScorePct: existing?.bestScorePct ?? null,
        completedAt: existing?.completedAt ?? null,
        lastSectionId: existing?.lastSectionId ?? null,
        missions: {
          ...(existing?.missions ?? {}),
          [missionId]: {
            // Completion is sticky: once earned, it stays earned.
            completed: Boolean(previous?.completed) || completed,
            completedAt: previous?.completedAt ?? (completed ? now.toISOString() : null),
            attempts: (previous?.attempts ?? 0) + 1,
          },
        },
        updatedAt: now.toISOString(),
      },
    },
  };
}

export function completeLesson(store: ProgressStore, slug: string, now = new Date()): ProgressStore {
  const existing = store.lessons[slug];
  return {
    ...store,
    lessons: {
      ...store.lessons,
      [slug]: {
        slug,
        status: "completed",
        bestScorePct: existing?.bestScorePct ?? null,
        // Preserve the original completion date if the lesson is revisited.
        completedAt: existing?.completedAt ?? now.toISOString(),
        lastSectionId: existing?.lastSectionId ?? null,
        missions: existing?.missions ?? {},
        updatedAt: now.toISOString(),
      },
    },
  };
}

// -----------------------------------------------------------------------------

function titleFor(lessons: readonly { slug: string; title: string }[], slug: string): string {
  return lessons.find((l) => l.slug === slug)?.title ?? slug;
}

/** "A", "A and B", "A, B and C" — an Oxford-comma-free list for the UI. */
function formatList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
