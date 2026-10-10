import type { Lesson } from "@/lib/learning/types";

export const investigateTheBlockchain: Lesson = {
  id: "lesson-08",
  slug: "investigate-the-blockchain",
  number: "08",
  title: "Investigate the Blockchain",
  description:
    "Use everything you have learned to examine a real contract, and learn to tell evidence from marketing.",
  objective:
    "By the end of this lesson you can look up a token contract yourself, verify its basic properties, and state clearly which of your conclusions are evidence and which are assumptions.",
  difficulty: "intermediate",
  estimatedMinutes: 12,
  order: 8,
  prerequisites: ["build-a-portfolio"],

  sections: [
    {
      id: "s1-what-you-can-verify",
      type: "text",
      heading: "The short list of things you can check yourself",
      blocks: [
        {
          kind: "p",
          text: "Over seven lessons you have built up a set of things that are genuinely verifiable. It is a shorter list than people expect, and knowing exactly where it ends is the point of this lesson.",
        },
        {
          kind: "list",
          items: [
            "**That a contract exists** at a given address on a given chain — you can read its bytecode.",
            "**What it calls itself** — `name()`, `symbol()` and `decimals()`, read directly from the contract.",
            "**How much of it exists** — `totalSupply()`, read from the contract.",
            "**That its bytecode matches** what the issuer published, if a verified source is available.",
          ],
        },
        {
          kind: "callout",
          tone: "warning",
          title: "Where verification stops",
          text: "Nothing on-chain tells you that the issuer holds the underlying shares, that the token is redeemable, that it will keep tracking the price, or that the issuer will still exist next year. Those are promises made off-chain, and no amount of reading a contract can confirm them.",
        },
      ],
    },

    {
      id: "s2-mission-investigate",
      type: "mission",
      heading: "Mission: investigate a real contract",
      mission: {
        id: "mission-08-investigate",
        kind: "asset-investigation",
        title: "Find the facts on-chain",
        brief:
          "Open any asset, then open its On-Chain page. Read the contract directly and record what you find. Enter exactly what the contract reports — not what the asset's name suggests.",
        assetSymbol: "auto",
        fields: [
          {
            key: "symbol",
            label: "What symbol does the contract report?",
            hint: "This is the value returned by symbol() — the contract's own answer, which may differ from the display ticker.",
            match: "exact",
          },
          {
            key: "network",
            label: "Which network is the contract deployed on?",
            hint: "The chain you read it from. The same issuer may deploy on several chains, and each deployment is a separate contract.",
            match: "exact",
          },
          {
            key: "contractAddress",
            label: "What is the contract address?",
            hint: "Copy it from the On-Chain page. This is the one identifier you can verify without trusting anyone.",
            match: "address",
          },
        ],
        successMessage:
          "You just verified a token contract yourself. Notice which of those three facts required trusting the issuer: none of them. That is the whole value of the exercise.",
      },
    },

    {
      id: "s3-structure",
      type: "text",
      heading: "The same ticker is not the same asset",
      blocks: [
        {
          kind: "p",
          text: "Two tokens can share a symbol and be entirely unrelated. They can be deployed on different chains, by different issuers, under different terms, with different supply. If you only ever look at the ticker, you cannot tell them apart.",
        },
        {
          kind: "callout",
          tone: "key",
          title: "The identity rule",
          text: "An asset is identified by its contract address and chain — never by its symbol. Symbols are labels chosen by whoever deployed the contract. Addresses are where the balances actually are.",
        },
      ],
    },

    {
      id: "s4-mission-compare",
      type: "mission",
      heading: "Mission: compare two structures",
      mission: {
        id: "mission-08-compare",
        kind: "structure-compare",
        title: "Compare two assets honestly",
        brief:
          "Pick two assets from the Explore page and open both. Compare their structures — not their prices — and answer using only what the app shows you.",
        symbolA: "AAPL",
        symbolB: "TSLA",
        questions: [
          {
            id: "c1",
            prompt: "You want to be certain two assets are the same underlying share. What settles it?",
            options: [
              { id: "a", text: "They share the same ticker" },
              { id: "b", text: "They have the same price" },
              { id: "c", text: "They share the same contract address on the same chain" },
              { id: "d", text: "They have the same name" },
            ],
            answer: "c",
            explanation:
              "Only the contract address plus chain identifies an asset. Tickers, names and prices can all coincide or diverge without meaning anything about identity.",
          },
          {
            id: "c2",
            prompt: "The same issuer deploys a token on BNB Smart Chain and on Base. How should you think about the two?",
            options: [
              { id: "a", text: "They are the same token, so any address works" },
              { id: "b", text: "They are separate contracts with separate balances — holding on one chain does not give you a balance on the other" },
              { id: "c", text: "The Base one is a backup copy" },
              { id: "d", text: "They share a single balance across both chains" },
            ],
            answer: "b",
            explanation:
              "Each deployment is its own contract with its own ledger. Moving between them is a bridge operation, not a lookup. Confusing the two is how people send tokens into a place they cannot retrieve them from.",
          },
          {
            id: "c3",
            prompt: "You find two tokens with the same symbol on the same chain, at different addresses. What is the correct conclusion?",
            options: [
              { id: "a", text: "One of them is a fake, and you can tell which by the price" },
              { id: "b", text: "They are two distinct contracts that happen to share a label; you must determine which issuer you intend to deal with" },
              { id: "c", text: "They are the same asset at two addresses" },
              { id: "d", text: "The older address is always the legitimate one" },
            ],
            answer: "b",
            explanation:
              "Symbols are unregulated free text. Two contracts sharing one is unremarkable. Determining which is the one you mean requires going to the issuer's own documentation — the app cannot decide that for you, and neither can a price.",
          },
        ],
        successMessage:
          "That is the discipline this whole course has been building toward: separate what you have verified from what you have been told, and act only on the first.",
      },
    },

    {
      id: "s5-quiz",
      type: "quiz",
      heading: "Final check",
      quiz: {
        id: "quiz-08",
        title: "Investigate the Blockchain",
        questions: [
          {
            id: "q1",
            kind: "multiple-choice",
            prompt: "What uniquely identifies a tokenized asset?",
            options: [
              { id: "a", text: "Its symbol" },
              { id: "b", text: "Its name and logo" },
              { id: "c", text: "Its contract address on a specific chain" },
              { id: "d", text: "Its current price" },
            ],
            answer: "c",
            explanation:
              "Everything else is a label someone chose. The address plus the chain is where the balances are, and it is the only identifier that cannot be duplicated by deploying another contract.",
          },
          {
            id: "q2",
            kind: "true-false",
            prompt: "Reading a contract's totalSupply() confirms that the issuer holds a matching number of real shares.",
            answer: false,
            explanation:
              "totalSupply tells you how many tokens the contract issued. Whether anything backs them is an off-chain claim about a custody arrangement. These are entirely different questions, and only the first is readable.",
          },
          {
            id: "q3",
            kind: "scenario",
            prompt: "What is the right response?",
            scenario:
              "You find a token whose symbol matches a well-known company. The contract works, has a plausible supply, and the issuer's website looks professional.",
            options: [
              { id: "a", text: "It is legitimate — the contract works and the site is professional" },
              { id: "b", text: "Working code and a polished website are both cheap to produce; you still need to establish who the issuer is and what they claim" },
              { id: "c", text: "The symbol matching proves it is the real thing" },
              { id: "d", text: "A plausible supply is strong evidence of backing" },
            ],
            answer: "b",
            explanation:
              "Deploying a contract costs almost nothing and websites are inexpensive. Neither is evidence of backing. The verification you did proves the code works — which was never in doubt, and was never the question.",
          },
          {
            id: "q4",
            kind: "multiple-choice",
            prompt: "Which of these can you confirm by reading the blockchain alone?",
            options: [
              { id: "a", text: "That the token will keep tracking the share price" },
              { id: "b", text: "That the issuer will honour redemptions" },
              { id: "c", text: "The contract's address, symbol, decimals and total supply" },
              { id: "d", text: "That the underlying shares are held in custody" },
            ],
            answer: "c",
            explanation:
              "Those four are contract facts, readable by anyone. The rest are issuer promises — reasonable things to rely on, perhaps, but not things you have verified, and the difference should stay visible in your thinking.",
          },
          {
            id: "q5",
            kind: "multiple-choice",
            prompt: "What is the most useful habit this course has tried to build?",
            options: [
              { id: "a", text: "Checking prices frequently" },
              { id: "b", text: "Separating what you have verified from what you have been told" },
              { id: "c", text: "Preferring assets with well-known tickers" },
              { id: "d", text: "Trading only when the market is open" },
            ],
            answer: "b",
            explanation:
              "Everything else in the course is downstream of this. Prices, contracts, issuers and terms are all just material for the same question: what do I actually know here, and what am I taking on faith?",
          },
        ],
      },
    },

    {
      id: "s6-closing",
      type: "text",
      heading: "Where you have arrived",
      blocks: [
        {
          kind: "p",
          text: "You started with a sentence about owning shares in Apple. You can now read a smart contract, explain why two prices for the same asset can disagree, trace a transaction through its five stages, measure slippage, describe your own allocation honestly, and state precisely where verification stops.",
        },
        {
          kind: "quote",
          text: "None of that tells you what to buy. It tells you what you are looking at — which is the part that can actually be taught.",
        },
        {
          kind: "callout",
          tone: "tip",
          title: "What to do next",
          text: "Open the Explore page and look at a real asset end to end: its prices, its contract, its issuer. Then revisit any lesson whose quiz you did not pass. The material rewards a second pass — the ideas connect more tightly once you have seen all eight.",
        },
      ],
    },

    {
      id: "s7-reflection",
      type: "reflection",
      heading: "Last one",
      prompt:
        "Write down two things you verified yourself during this course, and one thing you are still taking on trust. Being able to draw that line is the skill.",
      placeholder: "I verified… and I am still trusting…",
    },
  ],
};
