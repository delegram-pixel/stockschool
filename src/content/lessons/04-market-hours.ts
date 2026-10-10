import type { Lesson } from "@/lib/learning/types";

export const marketHours: Lesson = {
  id: "lesson-04",
  slug: "market-hours",
  number: "04",
  title: "Market Hours",
  description:
    "Why a blockchain never closes, why a stock exchange does, and what happens in the gap between them.",
  objective:
    "By the end of this lesson you can explain what a market state is, why the reference price freezes, and how to read a price you see at an unusual hour.",
  difficulty: "beginner",
  estimatedMinutes: 7,
  order: 4,
  prerequisites: ["the-tokenized-stock"],

  sections: [
    {
      id: "s1-two-clocks",
      type: "text",
      heading: "Two clocks, running at different speeds",
      blocks: [
        {
          kind: "p",
          text: "A blockchain does not have opening hours. Blocks are produced around the clock, every day of the year. If a contract is deployed and a pool has liquidity, a token can be swapped at 4am on Christmas Day.",
        },
        {
          kind: "p",
          text: "A stock exchange is a building full of obligations. It opens and closes on a schedule, pauses for holidays, and sometimes halts trading entirely for a single company. During those hours, nobody can trade the real share — so no new reference price is produced.",
        },
        {
          kind: "callout",
          tone: "key",
          title: "The consequence",
          text: "When the traditional market is closed, the reference price does not fall or rise. It simply stops. It is the last agreement between a buyer and a seller, replayed until a new one replaces it.",
        },
      ],
    },

    {
      id: "s2-widget",
      type: "interactive",
      heading: "Your clock, not New York's",
      intro:
        "Almost every market-hours chart on the internet is drawn in New York time, which is exactly the version someone in Lagos, Lisbon or Lahore cannot use. This one reads your browser's timezone and re-plots the trading day into your own hours — then lets you drag the marker forward to watch the session state change underneath it.",
      widget: "market-hours",
      alt: "An interactive 24-hour timeline drawn in the reader's local timezone, banded into regular trading session, extended hours and closed periods, with a draggable marker showing the current time, the equivalent time in New York, and the timezone offset between them.",
    },

    {
      id: "s3-the-states",
      type: "text",
      heading: "The states you will see",
      blocks: [
        {
          kind: "terms",
          items: [
            {
              term: "Open",
              definition:
                "The traditional market is trading. Reference prices update continuously and the two prices usually track each other closely.",
            },
            {
              term: "Closed",
              definition:
                "The traditional market has stopped for the day or the weekend. The reference price is frozen at its last value, and the on-chain market carries on alone.",
            },
            {
              term: "Pre-market / after-hours",
              definition:
                "Limited trading outside core hours. Prices move, but on much thinner volume, so they are noisier and less representative.",
            },
            {
              term: "Unknown",
              definition:
                "The honest answer. If we cannot determine the state from the data we have, we say so rather than guessing. You will see this state in the app, and it is deliberate.",
            },
          ],
        },
        {
          kind: "callout",
          tone: "info",
          title: "Why 'unknown' is a feature",
          text: "It is tempting to infer 'the market is open because a price exists'. But a price always exists — it is the last one. Inferring an open market from the presence of a number is how apps end up confidently wrong at 2am. This app reports what it actually knows.",
        },
      ],
    },

    {
      id: "s4-what-it-means-for-you",
      type: "text",
      heading: "What this means when you look at a price",
      blocks: [
        {
          kind: "p",
          text: "Whenever you see a tokenized stock price, ask two questions before you read anything into it: *which price is this*, and *is the market it comes from actually trading right now*?",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "If it is mid-week and mid-session, both prices are live and a small gap is meaningful.",
            "If the traditional market is closed, the reference is stale by construction and any gap measures elapsed time as much as sentiment.",
            "If the on-chain market is thin, the on-chain price may have been set by a single small trade.",
          ],
        },
        {
          kind: "quote",
          text: "A stale price is not a wrong price. It is a price from a specific moment that has not been replaced yet.",
        },
      ],
    },

    {
      id: "s5-quiz",
      type: "quiz",
      heading: "Check yourself",
      quiz: {
        id: "quiz-04",
        title: "Market Hours",
        questions: [
          {
            id: "q1",
            kind: "true-false",
            prompt: "A blockchain stops processing transactions when the stock market closes.",
            answer: false,
            explanation:
              "Blockchains have no closing bell. Blocks keep being produced through weekends, holidays and nights. What stops is the traditional market's production of new reference prices — not the chain.",
          },
          {
            id: "q2",
            kind: "multiple-choice",
            prompt: "The traditional market just closed. What happens to the reference price?",
            options: [
              { id: "a", text: "It drops to zero until the market reopens" },
              { id: "b", text: "It stays at its last value until a new trade replaces it" },
              { id: "c", text: "It continues updating from the on-chain price" },
              { id: "d", text: "It switches to an average of the day" },
            ],
            answer: "b",
            explanation:
              "A price only changes when a trade happens. No trading means no new agreements, so the last one simply stands. The on-chain market may move on without it.",
          },
          {
            id: "q3",
            kind: "scenario",
            prompt: "What is the most defensible reading?",
            scenario:
              "It is Saturday afternoon. The on-chain price of a tokenized stock is 2.3% higher than the reference price, and the reference price is identical to Friday's close.",
            options: [
              { id: "a", text: "The token is overvalued by 2.3%" },
              { id: "b", text: "The reference is stale because the market is closed; the gap largely reflects on-chain movement since Friday's close" },
              { id: "c", text: "There is a guaranteed profit available" },
              { id: "d", text: "The data is broken" },
            ],
            answer: "b",
            explanation:
              "The reference has not moved since Friday because nothing has traded. The gap is real, but it measures elapsed time and weekend on-chain activity, not a mispricing you can act on.",
          },
          {
            id: "q4",
            kind: "multiple-choice",
            prompt: "Why does the app sometimes report the market state as 'unknown'?",
            options: [
              { id: "a", text: "Because the data feed is always incomplete" },
              { id: "b", text: "Because a price existing does not prove the market is trading, and guessing would be worse than saying so" },
              { id: "c", text: "Because market hours differ by country and we do not track them" },
              { id: "d", text: "Because the state is not important" },
            ],
            answer: "b",
            explanation:
              "Reported data does not always include an explicit hours flag. Inferring 'open' from the presence of a price is the exact mistake that makes an app confidently wrong overnight, so we decline to infer.",
          },
        ],
      },
    },

    {
      id: "s6-reflection",
      type: "reflection",
      heading: "Before you move on",
      prompt:
        "You look at an asset at 11pm on a Tuesday and the reference price has not moved in six hours. What would you want to check before drawing a conclusion?",
      placeholder: "First I would check whether the market is… because a price that has not moved might just be…",
    },
  ],
};
