import type { Lesson } from "@/lib/learning/types";

export const buildAPortfolio: Lesson = {
  id: "lesson-07",
  slug: "build-a-portfolio",
  number: "07",
  title: "Build a Portfolio",
  description:
    "Put the concepts to work — allocate simulated capital and see what your choices actually imply.",
  objective:
    "By the end of this lesson you can explain what concentration means, why position size matters more than picking, and how to read your own allocation honestly.",
  difficulty: "intermediate",
  estimatedMinutes: 10,
  order: 7,
  prerequisites: ["liquidity-and-depth"],

  sections: [
    {
      id: "s1-the-honest-preamble",
      type: "text",
      heading: "First, what this lesson is not",
      blocks: [
        {
          kind: "p",
          text: "This is not investment advice, and it is not a strategy. Nobody — including this app — knows which of these assets will do well. What you are about to do is **practise making decisions explicit**, which is a skill entirely separate from being right.",
        },
        {
          kind: "callout",
          tone: "warning",
          title: "The simulator's contract with you",
          text: "Everything in the simulator is simulated. No real trades are placed, no real money moves, and no transaction is submitted to any blockchain. Performance in the simulator tells you nothing about future results — its only job is to make your reasoning visible to you.",
        },
      ],
    },

    {
      id: "s2-allocation",
      type: "interactive",
      heading: "Allocate across assets",
      intro:
        "You have 10,000 in simulated capital. Spread it across the assets below. There is no correct answer — but there are allocations you can explain and allocations you cannot. Three things in the panel do the work: the ring, which always shows the true shape of what you built; a single concentration number that reads 100 for one holding and 25 for four equal ones; and a stress test asking what happens if your largest holding halves. That last one is arithmetic you can check by hand. It is not a forecast, and this product does not make those.",
      widget: "allocation-lab",
      alt: "An interactive allocation tool with a slider per asset for assigning percentages of a simulated 10,000 portfolio, drawing the result as a donut chart, and reporting the number of holdings, a 0-to-100 concentration score, and what the total would become if the largest holding halved.",
    },

    {
      id: "s3-concentration",
      type: "text",
      heading: "Concentration, and why it is the thing to watch",
      blocks: [
        {
          kind: "p",
          text: "Most beginners obsess over *which* assets to hold. The more consequential decision is usually *how much of each* — because a portfolio where one position is 60% of everything behaves very differently from one where nothing exceeds 20%, even when both hold the same assets.",
        },
        {
          kind: "terms",
          items: [
            {
              term: "Position size",
              definition:
                "What fraction of the total a single holding represents. This is the number that determines how much a single bad outcome costs you.",
            },
            {
              term: "Concentration",
              definition:
                "How much of the portfolio sits in its largest holdings. High concentration means fewer things have to go wrong — but each one hurts more.",
            },
            {
              term: "Diversification",
              definition:
                "Spreading across holdings that do not all move together. It does not remove risk; it changes which risks you are exposed to.",
            },
          ],
        },
        {
          kind: "compare",
          left: {
            title: "Concentrated",
            subtitle: "Few positions, large sizes",
            points: [
              "Easier to follow — you can track each holding closely",
              "A single bad outcome dominates your result",
              "Requires conviction you may not actually have",
            ],
          },
          right: {
            title: "Spread",
            subtitle: "Many positions, smaller sizes",
            tone: "accent",
            points: [
              "No single outcome can dominate",
              "Harder to follow, and easier to hold things you do not understand",
              "Can hide a lack of conviction behind activity",
            ],
          },
        },
        {
          kind: "callout",
          tone: "key",
          title: "Neither is correct",
          text: "The point is not that one column is right. The point is that you should know which one you chose, and why. Most bad outcomes come from not having decided.",
        },
      ],
    },

    {
      id: "s4-mission",
      type: "mission",
      heading: "Mission: build a deliberate allocation",
      mission: {
        id: "mission-07-allocation",
        kind: "portfolio-allocation",
        title: "Build an allocation you can defend",
        brief:
          "In the simulator, build a portfolio matching the target below within a few percentage points. The target is arbitrary — the exercise is in hitting it deliberately rather than drifting into it.",
        targets: [
          { symbol: "AAPL", percent: 25 },
          { symbol: "NVDA", percent: 25 },
          { symbol: "MSFT", percent: 25 },
          { symbol: "TSLA", percent: 25 },
        ],
        tolerancePercent: 3,
        successMessage:
          "You built an equal-weight allocation to within a few points. Boring, deliberate, and explainable — which is exactly the point. Now change one to 40% and watch how much more of your result depends on that single choice.",
      },
    },

    {
      id: "s5-quiz",
      type: "quiz",
      heading: "Check yourself",
      quiz: {
        id: "quiz-07",
        title: "Build a Portfolio",
        questions: [
          {
            id: "q1",
            kind: "multiple-choice",
            prompt: "Which decision usually has the larger effect on a portfolio's outcome?",
            options: [
              { id: "a", text: "Which single asset you pick" },
              { id: "b", text: "How much of the portfolio each holding represents" },
              { id: "c", text: "The order in which you buy them" },
              { id: "d", text: "The day of the week you trade" },
            ],
            answer: "b",
            explanation:
              "Position sizing compounds across every holding. A portfolio with one 60% position is dominated by that position's fate regardless of how good the other picks were.",
          },
          {
            id: "q2",
            kind: "numeric",
            prompt:
              "A portfolio holds four positions of 4,000; 3,000; 2,000 and 1,000. What percentage is the largest position?",
            answer: "40",
            tolerance: "0.1",
            unit: "%",
            explanation:
              "Total is 10,000, and the largest is 4,000, which is 40%. Worth noting: the largest holding here is larger than the two smallest combined.",
          },
          {
            id: "q3",
            kind: "true-false",
            prompt: "Diversifying across many holdings removes risk from a portfolio.",
            answer: false,
            explanation:
              "It changes which risks you carry. Spreading reduces the impact of any single holding failing, but the whole market can still fall — and holdings that move together provide far less protection than the count suggests.",
          },
          {
            id: "q4",
            kind: "scenario",
            prompt: "What is the most useful observation?",
            scenario:
              "Someone holds twelve tokenized stocks. Eight of them are large technology companies. They describe the portfolio as 'well diversified'.",
            options: [
              { id: "a", text: "Correct — twelve holdings is diversified" },
              { id: "b", text: "The count is misleading: eight holdings in one sector tend to move together, so the effective concentration is higher than twelve suggests" },
              { id: "c", text: "Twelve is too many and should be reduced" },
              { id: "d", text: "Diversification only applies to bonds" },
            ],
            answer: "b",
            explanation:
              "Diversification is about how independently holdings behave, not how many there are. A dozen positions exposed to the same driver is much closer to one position than it looks.",
          },
          {
            id: "q5",
            kind: "true-false",
            prompt: "A portfolio that performed well in the simulator is evidence that it will perform well in reality.",
            answer: false,
            explanation:
              "The simulator runs on sample or delayed data with no real execution, no slippage beyond what we model, and no market impact from other participants. It exists to make your reasoning visible, not to predict anything.",
          },
        ],
      },
    },

    {
      id: "s6-reflection",
      type: "reflection",
      heading: "Before you move on",
      prompt:
        "Describe the allocation you built and give the honest reason for your largest position. If the reason is 'it felt right', say that — that is a real answer, and worth noticing.",
      placeholder: "My largest position was… because…",
    },
  ],
};
