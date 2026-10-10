import type { Lesson } from "@/lib/learning/types";

export const theTokenizedStock: Lesson = {
  id: "lesson-03",
  slug: "the-tokenized-stock",
  number: "03",
  title: "The Tokenized Stock",
  description:
    "The central idea of this course: a claim on a real share, represented by a token on a blockchain.",
  objective:
    "By the end of this lesson you can describe how a tokenized stock is structured, what you are actually holding, and what you are not.",
  difficulty: "beginner",
  estimatedMinutes: 9,
  order: 3,
  prerequisites: ["what-is-a-token"],

  sections: [
    {
      id: "s1-putting-them-together",
      type: "text",
      heading: "Two ideas, joined",
      blocks: [
        {
          kind: "p",
          text: "You now have both halves. A **share** is a claim on a real business, recorded by intermediaries, tradeable only while a market is open. A **token** is an entry in a smart contract, readable by anyone, transferable at any hour, on a network that never closes.",
        },
        {
          kind: "p",
          text: "A **tokenized stock** is what you get when someone joins them: a token whose value is intended to track the price of a real share, issued by a company that holds — or arranges access to — the underlying shares.",
        },
        {
          kind: "callout",
          tone: "key",
          title: "The structural fact to hold onto",
          text: "The token is not the share. The token is a *claim* on a share, issued by a specific company, under specific terms. Everything that can go right or wrong about a tokenized stock follows from that sentence.",
        },
      ],
    },

    {
      id: "s2-anatomy",
      type: "text",
      heading: "Anatomy of a tokenized stock",
      blocks: [
        {
          kind: "p",
          text: "Strip away the branding and every tokenized stock has the same five parts. Once you can name them, you can evaluate any issuer you meet.",
        },
        {
          kind: "terms",
          items: [
            {
              term: "The underlying",
              definition:
                "The real share the token tracks — a specific company, a specific share class, on a specific exchange. Not 'Apple-ish exposure': an actual instrument.",
            },
            {
              term: "The issuer",
              definition:
                "The company that created the token and holds or arranges the underlying. This is the party whose promises you are relying on.",
            },
            {
              term: "The token contract",
              definition:
                "The on-chain address where balances live. This is the part you can verify yourself, without trusting anyone.",
            },
            {
              term: "The chain",
              definition:
                "Which network the contract is deployed on — here, BNB Smart Chain. The same issuer may deploy on several chains, and each is a separate contract.",
            },
            {
              term: "The terms",
              definition:
                "What the token entitles you to: redemption, dividends, voting, or none of the above. This is where tokenized stocks differ most from each other.",
            },
          ],
        },
        {
          kind: "callout",
          tone: "info",
          title: "Why the app shows the contract address so prominently",
          text: "Of those five parts, only the contract address is something you can verify without trusting anybody. The issuer's name is a claim; the address is a fact. That asymmetry is the whole reason the On-Chain Lab exists.",
        },
      ],
    },

    {
      id: "s3-two-prices",
      type: "interactive",
      heading: "The two prices",
      intro:
        "Here is the idea that makes tokenized stocks genuinely interesting rather than just convenient. A tokenized stock has *two* prices at once, and they are set by two completely different processes. Pick an asset, then switch the axis between the market view — a fixed ±5% window, so the width of the gap on screen is proportional to its real size — and a close-up that fits the actual spread. The what-if nudge is opt-in, and it exists to show you that a two-percent gap is not two percent of free money.",
      widget: "price-comparison",
      alt: "An interactive comparison plotting a reference share price and an on-chain token price on a shared axis, with a switchable scale, an optional hypothetical nudge to the on-chain price, and the difference between the two shown as both an absolute amount and a percentage.",
    },

    {
      id: "s4-why-two-prices",
      type: "text",
      heading: "Why two prices can disagree",
      blocks: [
        {
          kind: "p",
          text: "The **reference price** comes from the traditional market: the last trade of the real share on a real exchange. The **on-chain price** comes from a pool of tokens being swapped on a blockchain, at any hour, by whoever happens to be trading.",
        },
        {
          kind: "p",
          text: "These two processes are only loosely connected. They are joined by arbitrage — people who notice a gap and trade to close it, profiting along the way. When arbitrage works smoothly the two prices sit close together. When it cannot work, they drift apart.",
        },
        {
          kind: "list",
          items: [
            "**When the traditional market is closed**, the reference price is frozen at yesterday's close while the on-chain price keeps moving. The gap you see is mostly time, not opportunity.",
            "**When few people are trading the token**, the on-chain price can move a lot on a small trade. Thin markets make noisy prices.",
            "**When it is expensive or slow to move between the two**, arbitrage is discouraged and gaps persist longer.",
          ],
        },
        {
          kind: "callout",
          tone: "warning",
          title: "What a price gap is not",
          text: "A gap between the two prices is not a free lunch, and this course will never call it one. Closing that gap requires the ability to actually trade both legs, at size, at the right moment — which is a specialist business, not a beginner's opportunity. Treat a gap as *information about the market*, never as an instruction.",
        },
      ],
    },

    {
      id: "s5-mission",
      type: "mission",
      heading: "Mission: measure a real gap",
      mission: {
        id: "mission-03-gap",
        kind: "price-difference",
        title: "Measure the difference yourself",
        brief:
          "Open a real asset and work out how far the on-chain price sits from the reference price. You do not need to decide whether it matters — you only need to measure it accurately.",
        assetSymbol: "auto",
        answerKind: "percent",
        tolerance: "0.05",
        successMessage:
          "That is exactly the calculation. You just did by hand what the Explore page does for every asset — and now you know what the number means, which is the part that matters.",
      },
    },

    {
      id: "s6-what-you-hold",
      type: "text",
      heading: "What you are holding — and what you are not",
      blocks: [
        {
          kind: "compare",
          left: {
            title: "What a token usually gives you",
            subtitle: "Varies by issuer — check the terms",
            points: [
              "Price exposure to the underlying share",
              "The ability to transfer it at any hour",
              "The ability to see the contract and its supply for yourself",
              "Potentially: redemption, dividends, or voting",
            ],
          },
          right: {
            title: "What it usually does not give you",
            subtitle: "Do not assume any of these",
            points: [
              "A shareholder register entry in the company itself",
              "The voting rights of a direct shareholder",
              "A guarantee that the issuer holds one share per token",
              "Protection if the issuer fails",
            ],
          },
        },
        {
          kind: "quote",
          text: "A tokenized stock is a claim on a share, made by a company, at an address you can read. Trust the readable part; ask hard questions about the rest.",
        },
      ],
    },

    {
      id: "s7-quiz",
      type: "quiz",
      heading: "Check yourself",
      quiz: {
        id: "quiz-03",
        title: "The Tokenized Stock",
        questions: [
          {
            id: "q1",
            kind: "multiple-choice",
            prompt: "A tokenized stock is best described as which of these?",
            options: [
              { id: "a", text: "The underlying share, moved onto a blockchain" },
              { id: "b", text: "A claim on an underlying share, issued by a company as a token" },
              { id: "c", text: "A derivative that pays out if the share rises" },
              { id: "d", text: "A share certificate stored as a file" },
            ],
            answer: "b",
            explanation:
              "The underlying share stays where it was. What moves on-chain is a claim on it, created and administered by an issuer. That distinction is the difference between understanding the product and being surprised by it.",
          },
          {
            id: "q2",
            kind: "scenario",
            prompt: "What most likely explains this?",
            scenario:
              "It is 3am on a Sunday. The on-chain price of a tokenized stock is 1.9% above the reference price shown next to it, and the reference price has not changed in fourteen hours.",
            options: [
              { id: "a", text: "The reference price is broken" },
              { id: "b", text: "The traditional market is closed, so the reference is frozen at the last close while the on-chain market keeps trading" },
              { id: "c", text: "Someone is manipulating the token" },
              { id: "d", text: "The two prices are actually unrelated" },
            ],
            answer: "b",
            explanation:
              "A reference price that has not moved in fourteen hours is not malfunctioning — it is a market that is closed. The on-chain market has no closing bell, so it is free to drift. The gap is mostly the passage of time.",
          },
          {
            id: "q3",
            kind: "true-false",
            prompt:
              "If the on-chain price is below the reference price, you can reliably buy the token and sell the real share for a guaranteed profit.",
            answer: false,
            explanation:
              "That is an arbitrage, and it requires access to both legs, at size, with the costs and timing that entails. For a learner the gap is a measurement, not an opportunity. If closing it were easy, it would already be closed.",
          },
          {
            id: "q4",
            kind: "multiple-choice",
            prompt: "Which part of a tokenized stock can you verify entirely on your own, without trusting the issuer?",
            options: [
              { id: "a", text: "That the issuer holds the underlying shares" },
              { id: "b", text: "That the token will keep tracking the share price" },
              { id: "c", text: "The contract's address, supply, decimals and balances" },
              { id: "d", text: "That the token carries voting rights" },
            ],
            answer: "c",
            explanation:
              "Contract facts are readable by anyone with an internet connection. Issuer promises — backing, redemption, tracking — are claims you must evaluate or take on faith. Knowing which is which is most of the skill.",
          },
          {
            id: "q5",
            kind: "multiple-choice",
            prompt: "Why do the two prices usually sit close together?",
            options: [
              { id: "a", text: "Because an exchange sets both of them" },
              { id: "b", text: "Because arbitrageurs trade the gap away" },
              { id: "c", text: "Because the issuer pins the on-chain price" },
              { id: "d", text: "Because the blockchain copies prices from the stock market" },
            ],
            answer: "b",
            explanation:
              "Nothing enforces the relationship directly. The prices converge because people profit by pushing them together — and they diverge exactly when that activity becomes difficult, expensive, or impossible.",
          },
        ],
      },
    },

    {
      id: "s8-reflection",
      type: "reflection",
      heading: "Before you move on",
      prompt:
        "Name one thing about a tokenized stock that you can check yourself in this app, and one thing you would have to take on trust. Be specific.",
      placeholder: "I can check the contract's… but I would have to trust the issuer's…",
    },
  ],
};
