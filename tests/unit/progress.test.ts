import { describe, expect, it } from "vitest";
import {
  PROGRESS_VERSION,
  beginLesson,
  completeLesson,
  computePathStates,
  emptyProgress,
  parseProgressStore,
  recordMission,
  recordQuizScore,
  summarisePathStates,
} from "@/lib/learning/progress";
import type { PathLesson, ProgressStore } from "@/lib/learning/progress";

/**
 * Progress and unlocking.
 *
 * The rules being pinned here are small and load-bearing:
 *  - nothing may gate the first lesson, because a login wall or a lock before
 *    lesson 01 is the fastest way to lose a beginner;
 *  - progress never moves backwards, because a device that has been offline must
 *    not be able to undo what a newer one recorded;
 *  - a malformed store is rejected wholesale rather than partially trusted.
 */

function lesson(overrides: Partial<PathLesson> = {}): PathLesson {
  return {
    slug: "01-what-is-a-stock",
    number: "01",
    title: "What is a stock?",
    description: "Ownership, in pieces.",
    objective: "Explain what a share is.",
    difficulty: "beginner",
    estimatedMinutes: 8,
    order: 1,
    prerequisites: [],
    questionCount: 3,
    missionsTotal: 0,
    ...overrides,
  };
}

const THREE: PathLesson[] = [
  lesson(),
  lesson({
    slug: "02-what-is-a-token",
    number: "02",
    title: "What is a token?",
    order: 2,
    prerequisites: ["01-what-is-a-stock"],
    missionsTotal: 1,
  }),
  lesson({
    slug: "03-the-tokenized-stock",
    number: "03",
    title: "The tokenized stock",
    order: 3,
    prerequisites: ["02-what-is-a-token"],
    missionsTotal: 2,
  }),
];

// -----------------------------------------------------------------------------

describe("parseProgressStore", () => {
  it("returns null for values that are not a store", () => {
    for (const value of [null, undefined, 42, "progress", [], true]) {
      expect(parseProgressStore(value)).toBeNull();
    }
  });

  it("returns null when the version is not a number", () => {
    expect(parseProgressStore({ version: "1", lessons: {} })).toBeNull();
  });

  it("rejects an array standing in for the lesson map", () => {
    // `typeof [] === "object"`, which is how this check gets skipped.
    expect(parseProgressStore({ version: 1, lessons: [] })).toBeNull();
  });

  it("accepts an older version rather than discarding the learner's work", () => {
    const parsed = parseProgressStore({
      version: 0,
      lessons: { "01-what-is-a-stock": { status: "completed" } },
    });
    expect(parsed?.version).toBe(PROGRESS_VERSION);
    expect(parsed?.lessons["01-what-is-a-stock"]?.status).toBe("completed");
  });

  it("skips one unrecognisable lesson instead of sinking the whole store", () => {
    const parsed = parseProgressStore({
      version: 1,
      lessons: {
        good: { status: "completed", bestScorePct: 80 },
        bad: { status: "nonsense" },
        alsoBad: null,
      },
    });

    expect(Object.keys(parsed!.lessons)).toEqual(["good"]);
    expect(parsed!.lessons.good?.bestScorePct).toBe(80);
  });

  it("normalises missing optional fields rather than inventing values", () => {
    const parsed = parseProgressStore({ version: 1, lessons: { a: { status: "in-progress" } } });
    const record = parsed!.lessons.a!;
    expect(record.bestScorePct).toBeNull();
    expect(record.completedAt).toBeNull();
    expect(record.lastSectionId).toBeNull();
    expect(record.missions).toEqual({});
  });

  it("rejects a non-finite best score, which JSON can carry as null", () => {
    const parsed = parseProgressStore({
      version: 1,
      lessons: { a: { status: "completed", bestScorePct: Number.NaN } },
    });
    expect(parsed!.lessons.a?.bestScorePct).toBeNull();
  });

  it("keeps well-formed mission records and drops malformed ones", () => {
    const parsed = parseProgressStore({
      version: 1,
      lessons: {
        a: {
          status: "in-progress",
          missions: {
            m1: { completed: true, completedAt: "2026-10-09T10:00:00.000Z", attempts: 2 },
            m2: "not an object",
          },
        },
      },
    });
    const missions = parsed!.lessons.a!.missions;
    expect(missions.m1).toEqual({
      completed: true,
      completedAt: "2026-10-09T10:00:00.000Z",
      attempts: 2,
    });
    expect(missions.m2).toBeUndefined();
  });

  it("round-trips its own output", () => {
    const store = emptyProgress();
    expect(parseProgressStore(JSON.parse(JSON.stringify(store)))).toEqual(store);
  });
});

// -----------------------------------------------------------------------------

describe("computePathStates", () => {
  it("unlocks the first lesson for a brand-new learner", () => {
    const states = computePathStates(THREE, emptyProgress());
    expect(states[0]?.locked).toBe(false);
    expect(states[0]?.isNext).toBe(true);
  });

  it("locks a lesson whose prerequisite is unfinished", () => {
    const states = computePathStates(THREE, emptyProgress());
    expect(states[1]?.locked).toBe(true);
    expect(states[2]?.locked).toBe(true);
  });

  it("names the prerequisite that is blocking", () => {
    const states = computePathStates(THREE, emptyProgress());
    expect(states[1]?.lockedReason).toContain("What is a stock?");
  });

  it("unlocks the next lesson once the one before is complete", () => {
    const store = completeLesson(emptyProgress(), "01-what-is-a-stock");
    const states = computePathStates(THREE, store);

    expect(states[1]?.locked).toBe(false);
    expect(states[1]?.isNext).toBe(true);
    // The third still depends on the second.
    expect(states[2]?.locked).toBe(true);
  });

  it("never hides a locked lesson", () => {
    // Locking is a signal about reading order, not a door.
    const states = computePathStates(THREE, emptyProgress());
    expect(states).toHaveLength(3);
  });

  it("orders by the lesson's own order field, not by array position", () => {
    const shuffled = [THREE[2]!, THREE[0]!, THREE[1]!];
    const states = computePathStates(shuffled, emptyProgress());
    expect(states.map((s) => s.lesson.number)).toEqual(["01", "02", "03"]);
  });

  it("reports mission progress from the stored records", () => {
    let store = emptyProgress();
    store = recordMission(store, "02-what-is-a-token", "find-the-premium", true);
    store = recordMission(store, "02-what-is-a-token", "other-mission", false);

    const states = computePathStates(THREE, store);
    const second = states.find((s) => s.lesson.slug === "02-what-is-a-token");
    expect(second?.missionsCompleted).toBe(1);
    expect(second?.missionsTotal).toBe(1);
  });

  it("assigns 'next' to exactly one lesson", () => {
    const states = computePathStates(THREE, emptyProgress());
    expect(states.filter((s) => s.isNext)).toHaveLength(1);
  });
});

// -----------------------------------------------------------------------------

describe("beginLesson", () => {
  const at = new Date("2026-10-09T10:00:00.000Z");

  it("marks a new lesson in progress and records where the learner was", () => {
    const store = beginLesson(emptyProgress(), "01-what-is-a-stock", "section-2", at);
    const record = store.lessons["01-what-is-a-stock"]!;
    expect(record.status).toBe("in-progress");
    expect(record.lastSectionId).toBe("section-2");
    expect(record.updatedAt).toBe(at.toISOString());
  });

  it("does not demote a completed lesson when it is reopened", () => {
    // Revising must not cost the learner their completion.
    const completed = completeLesson(emptyProgress(), "01-what-is-a-stock", at);
    const reopened = beginLesson(completed, "01-what-is-a-stock", "section-9", at);

    expect(reopened.lessons["01-what-is-a-stock"]?.status).toBe("completed");
    expect(reopened.lessons["01-what-is-a-stock"]?.lastSectionId).toBe("section-9");
  });

  it("leaves other lessons alone", () => {
    const store = beginLesson(emptyProgress(), "01-what-is-a-stock", null, at);
    expect(Object.keys(store.lessons)).toEqual(["01-what-is-a-stock"]);
  });
});

describe("recordQuizScore", () => {
  const at = new Date("2026-10-09T10:00:00.000Z");

  it("stores the score and moves the lesson into progress", () => {
    const store = recordQuizScore(emptyProgress(), "01-what-is-a-stock", 80, at);
    expect(store.lessons["01-what-is-a-stock"]?.bestScorePct).toBe(80);
    expect(store.lessons["01-what-is-a-stock"]?.status).toBe("in-progress");
  });

  it("keeps the best score when a learner retakes a quiz", () => {
    // Someone revising should never watch their recorded result go down.
    let store = recordQuizScore(emptyProgress(), "01-what-is-a-stock", 90, at);
    store = recordQuizScore(store, "01-what-is-a-stock", 40, at);
    expect(store.lessons["01-what-is-a-stock"]?.bestScorePct).toBe(90);
  });

  it("raises the best score when the retake is better", () => {
    let store = recordQuizScore(emptyProgress(), "01-what-is-a-stock", 40, at);
    store = recordQuizScore(store, "01-what-is-a-stock", 95, at);
    expect(store.lessons["01-what-is-a-stock"]?.bestScorePct).toBe(95);
  });

  it("does not un-complete a finished lesson", () => {
    let store = completeLesson(emptyProgress(), "01-what-is-a-stock", at);
    store = recordQuizScore(store, "01-what-is-a-stock", 10, at);
    expect(store.lessons["01-what-is-a-stock"]?.status).toBe("completed");
  });
});

describe("recordMission", () => {
  const at = new Date("2026-10-09T10:00:00.000Z");

  it("records a first completion with a timestamp", () => {
    const store = recordMission(emptyProgress(), "02-what-is-a-token", "m1", true, at);
    const mission = store.lessons["02-what-is-a-token"]!.missions.m1!;
    expect(mission.completed).toBe(true);
    expect(mission.completedAt).toBe(at.toISOString());
    expect(mission.attempts).toBe(1);
  });

  it("counts an unsuccessful attempt without marking it complete", () => {
    const store = recordMission(emptyProgress(), "02-what-is-a-token", "m1", false, at);
    const mission = store.lessons["02-what-is-a-token"]!.missions.m1!;
    expect(mission.completed).toBe(false);
    expect(mission.completedAt).toBeNull();
    expect(mission.attempts).toBe(1);
  });

  it("keeps completion sticky and preserves the original completion time", () => {
    const later = new Date("2026-10-09T12:00:00.000Z");
    let store = recordMission(emptyProgress(), "02-what-is-a-token", "m1", true, at);
    store = recordMission(store, "02-what-is-a-token", "m1", false, later);

    const mission = store.lessons["02-what-is-a-token"]!.missions.m1!;
    expect(mission.completed).toBe(true);
    expect(mission.completedAt).toBe(at.toISOString());
    expect(mission.attempts).toBe(2);
  });

  it("tracks missions independently within a lesson", () => {
    let store = recordMission(emptyProgress(), "02-what-is-a-token", "m1", true, at);
    store = recordMission(store, "02-what-is-a-token", "m2", true, at);
    expect(Object.keys(store.lessons["02-what-is-a-token"]!.missions).sort()).toEqual(["m1", "m2"]);
  });
});

describe("completeLesson", () => {
  const at = new Date("2026-10-09T10:00:00.000Z");
  const later = new Date("2026-10-09T12:00:00.000Z");

  it("marks the lesson completed and stamps the time", () => {
    const store = completeLesson(emptyProgress(), "01-what-is-a-stock", at);
    const record = store.lessons["01-what-is-a-stock"]!;
    expect(record.status).toBe("completed");
    expect(record.completedAt).toBe(at.toISOString());
  });

  it("preserves the original completion date when revisited", () => {
    let store = completeLesson(emptyProgress(), "01-what-is-a-stock", at);
    store = completeLesson(store, "01-what-is-a-stock", later);
    expect(store.lessons["01-what-is-a-stock"]?.completedAt).toBe(at.toISOString());
  });

  it("does not lose a quiz score recorded before completion", () => {
    let store = recordQuizScore(emptyProgress(), "01-what-is-a-stock", 88, at);
    store = completeLesson(store, "01-what-is-a-stock", later);
    expect(store.lessons["01-what-is-a-stock"]?.bestScorePct).toBe(88);
  });
});

// -----------------------------------------------------------------------------

describe("summarisePathStates", () => {
  it("counts nothing for a fresh learner", () => {
    const summary = summarisePathStates(computePathStates(THREE, emptyProgress()));
    expect(summary.lessonsCompleted).toBe(0);
    expect(summary.lessonsStarted).toBe(0);
    expect(summary.lessonsTotal).toBe(3);
    expect(summary.percentComplete).toBe(0);
    expect(summary.averageQuizScorePct).toBeNull();
    expect(summary.nextLessonSlug).toBe("01-what-is-a-stock");
  });

  it("distinguishes started from completed", () => {
    const store = recordQuizScore(emptyProgress(), "01-what-is-a-stock", 50);
    const summary = summarisePathStates(computePathStates(THREE, store));
    expect(summary.lessonsStarted).toBe(1);
    expect(summary.lessonsCompleted).toBe(0);
  });

  it("averages the best score per attempted lesson, not per attempt", () => {
    let store = recordQuizScore(emptyProgress(), "01-what-is-a-stock", 60);
    store = recordQuizScore(store, "01-what-is-a-stock", 80);
    const summary = summarisePathStates(computePathStates(THREE, store));
    // Best is 80, so the mean of one lesson is 80 — not (60 + 80) / 2.
    expect(summary.averageQuizScorePct).toBe(80);
  });

  it("totals missions across lessons", () => {
    let store = recordMission(emptyProgress(), "02-what-is-a-token", "m1", true);
    store = recordMission(store, "03-the-tokenized-stock", "m1", true);
    const summary = summarisePathStates(computePathStates(THREE, store));

    expect(summary.missionsCompleted).toBe(2);
    expect(summary.missionsTotal).toBe(3);
  });

  it("reports no next lesson once the path is finished", () => {
    let store: ProgressStore = emptyProgress();
    for (const item of THREE) store = completeLesson(store, item.slug);

    const summary = summarisePathStates(computePathStates(THREE, store));
    expect(summary.lessonsCompleted).toBe(3);
    expect(summary.percentComplete).toBe(100);
    expect(summary.nextLessonSlug).toBeNull();
    expect(summary.lockedCount).toBe(0);
  });
});
