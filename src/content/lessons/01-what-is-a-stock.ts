import type { Lesson } from "@/lib/learning/types";

export const whatIsAStock: Lesson = {
  id: "lesson-01",
  slug: "what-is-a-stock",
  number: "01",
  title: "The Stock",
  description: "What you actually own when you own a share, and who decides what it is worth.",
  objective:
    "By the end of this lesson you can explain what a share represents, why a share price moves, and what a stock exchange actually does.",
  difficulty: "beginner",
  estimatedMinutes: 6,
  order: 1,
  prerequisites: [],

  sections: [
    {
      id: "s1-opening",
      type: "text",
      heading: "Start with something you already know",
      blocks: [
        {
          kind: "p",
          text: "You have probably heard someone say they *own shares in Apple*. That sentence hides a surprisingly precise idea. A share is not a voucher, a receipt, or a promise. It is a **legal claim on a real business** — a slice of everything that company owns, and a claim on the money it will earn in the future.",
        },
        {
          kind: "p",
          text: "Imagine a bakery. To raise money for a second oven, the owner splits the business into 1,000 equal pieces and sells 400 of them. Each buyer now owns 0.1% of the bakery: a claim on the oven, on the flour, and on every loaf sold from that day forward. That is the entire idea behind a stock. Everything else is scale and paperwork.",
        },
        {
          kind: "terms",
          items: [
            {
              term: "Share",
              definition:
                "A single unit of ownership in a company. Own one share out of a million, and you own one-millionth of the business.",
            },
            {
              term: "Equity",
              definition:
                "Another word for this ownership. Saying you hold equity in a company means the same thing as saying you hold shares.",
            },
            {
              term: "Ticker",
              definition:
                "The short code a market uses to identify a company, like AAPL for Apple or NVDA for NVIDIA. It is a nickname, not a separate asset.",
            },
          ],
        },
      ],
    },

    {
      id: "s2-who-sets-price",
      type: "text",
      heading: "Who decides what a share is worth?",
      blocks: [
        {
          kind: "p",
          text: "Nobody sets a share price. It emerges. At any moment there are people willing to sell at some price and people willing to buy at some price. Where those two groups overlap, a trade happens — and the price of that trade becomes **the price** everyone quotes.",
        },
        {
          kind: "p",
          text: "This matters because it means a share price is not a measurement of a company's true value. It is the *most recent agreement between a buyer and a seller*. If the next buyer is more eager than the last, the price ticks up even though nothing about the company changed.",
        },
        {
          kind: "callout",
          tone: "key",
          title: "The idea this whole course builds on",
          text: "A price is an agreement at a moment in time, not a fact about a company. Hold onto that — it explains almost everything that follows about tokenized stocks.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "A company sells shares to raise money (this is what a stock exchange listing is for).",
            "Those shares then trade between investors, second-hand, without the company being involved.",
            "Every trade is a fresh agreement, and the last one is the price you see quoted.",
          ],
        },
      ],
    },

    {
      id: "s3-the-hours",
      type: "text",
      heading: "The part that will matter later",
      blocks: [
        {
          kind: "p",
          text: "Traditional shares trade on an exchange during fixed opening hours, and are cleared by institutions in the middle of it. A share of Apple is not really *yours* in any portable, physical sense — it is a line in a database run by a chain of intermediaries you will never meet.",
        },
        {
          kind: "compare",
          left: {
            title: "What you think it works like",
            subtitle: "The mental model most people start with",
            points: [
              "You buy a share, and now you own it",
              "You can do whatever you like with it",
              "You can sell it whenever you want",
              "The price is a fact about the company",
            ],
          },
          right: {
            title: "What it actually works like",
            subtitle: "The model this course will build",
            tone: "accent",
            points: [
              "You own a claim, recorded by a chain of intermediaries",
              "Moving it requires those intermediaries to agree",
              "You can trade only while the market is open",
              "The price is the last agreement between two parties",
            ],
          },
        },
        {
          kind: "callout",
          tone: "tip",
          title: "Why this is worth knowing",
          text: "Almost every strange thing about tokenized stocks — 24-hour trading, price gaps at weekends, on-chain settlement — is a consequence of the four lines on the right.",
        },
      ],
    },

    {
      id: "s4-quiz",
      type: "quiz",
      heading: "Check yourself",
      quiz: {
        id: "quiz-01",
        title: "The Stock",
        questions: [
          {
            id: "q1",
            kind: "multiple-choice",
            prompt: "What does owning one share of a company represent?",
            options: [
              { id: "a", text: "A loan you made to the company" },
              { id: "b", text: "A proportional ownership claim on the business" },
              { id: "c", text: "A guarantee that the share price will rise" },
              { id: "d", text: "A right to a fixed yearly payment" },
            ],
            answer: "b",
            explanation:
              "A share is an ownership claim. A loan would be a bond, a fixed payment would be a dividend policy rather than ownership itself, and nothing about a share guarantees a price.",
          },
          {
            id: "q2",
            kind: "true-false",
            prompt: "A share price reflects the company's true underlying value at all times.",
            answer: false,
            explanation:
              "A price is the last agreement between one buyer and one seller. It reflects what those two people thought at that moment — which is often right, sometimes wrong, and always incomplete.",
          },
          {
            id: "q3",
            kind: "multiple-choice",
            prompt: "The bakery example splits the business into 1,000 pieces and you buy 100. What do you own?",
            options: [
              { id: "a", text: "10% of the bakery" },
              { id: "b", text: "1% of the bakery" },
              { id: "c", text: "100 loaves per day" },
              { id: "d", text: "Nothing until the bakery is sold" },
            ],
            answer: "a",
            explanation:
              "100 of 1,000 pieces is one tenth, so 10%. Notice the ownership is proportional: it scales with the business rather than being a fixed amount of bread.",
          },
          {
            id: "q4",
            kind: "scenario",
            prompt: "What has most likely happened here?",
            scenario:
              "On Monday a company announces strong earnings. Nothing else changes. Over the following hour the share price rises 4%.",
            options: [
              { id: "a", text: "The company's bank account grew by 4%" },
              { id: "b", text: "Buyers became more eager relative to sellers, so trades started clearing at higher prices" },
              { id: "c", text: "Each share now represents a slightly larger slice of the company" },
              { id: "d", text: "The exchange adjusted the official value" },
            ],
            answer: "b",
            explanation:
              "Nothing about the company's structure changed in that hour — the same shares represent the same ownership. What changed was the balance of eagerness between buyers and sellers, and the price is where they met.",
          },
        ],
      },
    },

    {
      id: "s5-reflection",
      type: "reflection",
      heading: "Before you move on",
      prompt:
        "In your own words, why is a share price not the same thing as a company's value? Write a sentence or two — you will use this idea constantly from here.",
      placeholder: "A price is an agreement between two people, whereas value is…",
    },
  ],
};
