/**
 * The learning content model.
 *
 * Lessons are *data*. A lesson page is a renderer that walks a section list —
 * which means adding a lesson is adding a file, never editing a component, and
 * the whole curriculum can be unit-tested without a DOM.
 */

export type Difficulty = "beginner" | "intermediate";

// -----------------------------------------------------------------------------
// Prose
// -----------------------------------------------------------------------------

/**
 * A block of taught content.
 *
 * `text` supports a deliberately tiny inline syntax, expanded by
 * `renderInline` in the lesson renderer:
 *   **bold**   `code`   [label](url)   *emphasis*
 * Anything richer would tempt us into a markdown dependency and an XSS surface
 * for content that is currently all first-party.
 */
export type TextBlock =
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[]; ordered?: boolean }
  | { kind: "callout"; tone: "info" | "warning" | "tip" | "key"; title?: string; text: string }
  | { kind: "terms"; items: Array<{ term: string; definition: string }> }
  | { kind: "compare"; left: CompareColumn; right: CompareColumn }
  | { kind: "quote"; text: string; attribution?: string };

export type CompareColumn = {
  title: string;
  subtitle?: string;
  points: string[];
  tone?: "neutral" | "accent";
};

// -----------------------------------------------------------------------------
// Interactive widgets
// -----------------------------------------------------------------------------

/**
 * Interactive components are referenced by key, not imported by lessons, so
 * content stays serialisable and the renderer controls lazy-loading.
 */
export type WidgetKey =
  | "tokenization-flow"
  | "price-comparison"
  | "market-hours"
  | "transaction-flow"
  | "allocation-lab"
  | "liquidity-depth"
  | "wallet-anatomy";

// -----------------------------------------------------------------------------
// Quizzes
// -----------------------------------------------------------------------------

export type QuizQuestion =
  | {
      id: string;
      kind: "multiple-choice";
      prompt: string;
      options: Array<{ id: string; text: string }>;
      /** Option id that is correct. */
      answer: string;
      /** Always shown after answering — teaches rather than grades. */
      explanation: string;
    }
  | {
      id: string;
      kind: "true-false";
      prompt: string;
      answer: boolean;
      explanation: string;
    }
  | {
      id: string;
      kind: "numeric";
      prompt: string;
      /** Accepted value, as a decimal string. Compared with a tolerance. */
      answer: string;
      /** Absolute tolerance for floating-point-ish user input. */
      tolerance: string;
      unit?: string;
      explanation: string;
    }
  | {
      id: string;
      kind: "scenario";
      prompt: string;
      scenario: string;
      options: Array<{ id: string; text: string }>;
      answer: string;
      explanation: string;
    };

export type Quiz = {
  id: string;
  title: string;
  /** Pass mark as a percentage. 70 by default — see scoring.ts. */
  passMarkPct?: number;
  questions: QuizQuestion[];
};

// -----------------------------------------------------------------------------
// Missions
// -----------------------------------------------------------------------------

/**
 * Missions are hands-on tasks, usually against a real asset.
 *
 * `assetSymbol: "auto"` means the renderer picks the first asset in the live
 * feed that actually has both prices — so the mission works whichever provider
 * is configured, and degrades honestly when none is.
 */
export type Mission =
  | {
      id: string;
      kind: "price-difference";
      title: string;
      brief: string;
      assetSymbol: string | "auto";
      /** What the learner must produce. */
      answerKind: "percent" | "absolute";
      tolerance: string;
      successMessage: string;
    }
  | {
      id: string;
      kind: "asset-investigation";
      title: string;
      brief: string;
      assetSymbol: string | "auto";
      /** Fields the learner must find on the asset page and enter. */
      fields: Array<{
        key: "symbol" | "network" | "contractAddress";
        label: string;
        hint: string;
        /** Normalised comparison so casing/whitespace does not fail a learner. */
        match: "exact" | "address";
      }>;
      successMessage: string;
    }
  | {
      id: string;
      kind: "transaction-reading";
      title: string;
      brief: string;
      /** A worked example transaction. Clearly labelled as an example. */
      example: {
        hash: string;
        from: string;
        to: string;
        value: string;
        status: "success" | "failed";
        block: string;
      };
      questions: Array<{
        id: string;
        prompt: string;
        options: Array<{ id: string; text: string }>;
        answer: string;
        /** Shown after answering, for the same reason a quiz question has one. */
        explanation: string;
      }>;
      successMessage: string;
    }
  | {
      id: string;
      kind: "structure-compare";
      title: string;
      brief: string;
      symbolA: string;
      symbolB: string;
      questions: Array<{
        id: string;
        prompt: string;
        options: Array<{ id: string; text: string }>;
        answer: string;
        explanation: string;
      }>;
      successMessage: string;
    }
  | {
      id: string;
      kind: "portfolio-allocation";
      title: string;
      brief: string;
      /** Target allocation percentages that must sum to 100. */
      targets: Array<{ symbol: string; percent: number }>;
      tolerancePercent: number;
      successMessage: string;
    };

// -----------------------------------------------------------------------------
// Sections and lessons
// -----------------------------------------------------------------------------

export type LessonSection =
  | { id: string; type: "text"; heading?: string; blocks: TextBlock[] }
  | {
      id: string;
      type: "diagram";
      heading?: string;
      caption?: string;
      widget: WidgetKey;
      /** Short alt text — required, because these carry real meaning. */
      alt: string;
      config?: Record<string, unknown>;
    }
  | {
      id: string;
      type: "interactive";
      heading?: string;
      intro?: string;
      widget: WidgetKey;
      alt: string;
      config?: Record<string, unknown>;
    }
  | {
      id: string;
      type: "example";
      heading?: string;
      blocks: TextBlock[];
      widget?: WidgetKey;
      widgetAlt?: string;
    }
  | { id: string; type: "mission"; heading?: string; mission: Mission }
  | { id: string; type: "quiz"; heading?: string; quiz: Quiz }
  | { id: string; type: "reflection"; heading?: string; prompt: string; placeholder?: string };

export type Lesson = {
  id: string;
  slug: string;
  /** Two-digit numeral shown on the learning path, e.g. "03". */
  number: string;
  title: string;
  /** One line, used on cards and in navigation. */
  description: string;
  /** The learning objective, stated to the learner. */
  objective: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  order: number;
  /** Slugs that must be completed first. */
  prerequisites: string[];
  /** Lesson slugs whose assets are worth linking from this one. */
  relatedAssets?: string[];
  sections: LessonSection[];
};

/** Convenience: the quizzes in a lesson, in order. */
export function lessonQuizzes(lesson: Lesson): Quiz[] {
  return lesson.sections.flatMap((s) => (s.type === "quiz" ? [s.quiz] : []));
}

/** Convenience: the missions in a lesson, in order. */
export function lessonMissions(lesson: Lesson): Mission[] {
  return lesson.sections.flatMap((s) => (s.type === "mission" ? [s.mission] : []));
}

/** Total questions across every quiz in a lesson. */
export function lessonQuestionCount(lesson: Lesson): number {
  return lessonQuizzes(lesson).reduce((sum, quiz) => sum + quiz.questions.length, 0);
}
