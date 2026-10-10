import type { Lesson } from "@/lib/learning/types";

export const whatIsAToken: Lesson = {
  id: "lesson-02",
  slug: "what-is-a-token",
  number: "02",
  title: "The Token",
  description: "A token is a rulebook with a balance sheet attached. Here is what that means.",
  objective:
    "By the end of this lesson you can explain what a blockchain token is, what a smart contract does, and why the same standard lets thousands of different assets exist on one network.",
  difficulty: "beginner",
  estimatedMinutes: 7,
  order: 2,
  prerequisites: ["what-is-a-stock"],

  sections: [
    {
      id: "s1-from-shares-to-tokens",
      type: "text",
      heading: "A different kind of record",
      blocks: [
        {
          kind: "p",
          text: "In the last lesson you saw that owning a share means a chain of intermediaries has written your name in a database. A **token** replaces that chain with a single piece of software that anybody can read, and that nobody can quietly edit.",
        },
        {
          kind: "p",
          text: "That software is called a **smart contract**. It is a small program that lives at a permanent address on a blockchain. It holds data — most importantly, a list of which addresses own how much — and it defines the rules for changing that data. When people say *a token*, they usually mean the balance sheet this contract maintains.",
        },
        {
          kind: "callout",
          tone: "key",
          title: "The one-sentence version",
          text: "A token is not a file and not a coin. It is an entry in a smart contract's ledger, and the contract decides who may change that entry and how.",
        },
      ],
    },

    {
      id: "s2-diagram-flow",
      type: "diagram",
      heading: "Where a token actually lives",
      widget: "tokenization-flow",
      alt: "A diagram showing a real-world asset, an issuer, a smart contract on BNB Smart Chain, and a wallet holding a token balance, with arrows showing the order in which value and records move.",
      caption:
        "Read it left to right. The real asset never moves to the blockchain — only the record of who holds a claim on it does.",
    },

    {
      id: "s3-what-the-contract-holds",
      type: "text",
      heading: "Inside the contract",
      blocks: [
        {
          kind: "p",
          text: "Almost every token contract answers the same handful of questions. If you learn these four, you can read the on-chain page of any asset in this app — and any asset anywhere else, on any chain.",
        },
        {
          kind: "terms",
          items: [
            {
              term: "name()",
              definition:
                "The long, human-readable name. For example: a company name followed by a share class.",
            },
            {
              term: "symbol()",
              definition:
                "The short ticker. This is what you see in a wallet, and what people say out loud.",
            },
            {
              term: "decimals()",
              definition:
                "How many decimal places the contract stores internally. This one trips everybody up — see below.",
            },
            {
              term: "totalSupply()",
              definition:
                "How many units exist in total. Divide it by nothing and you have the whole issuance.",
            },
          ],
        },
        {
          kind: "callout",
          tone: "warning",
          title: "Decimals are not a display preference",
          text: "A contract stores whole numbers. If decimals() returns 18, then a balance of 1000000000000000000 means one token. Reading a raw balance without dividing by 10^decimals is the single most common way to misread a token — and it makes a balance look a quintillion times too large.",
        },
      ],
    },

    {
      id: "s4-reading-a-balance",
      type: "example",
      heading: "Reading a raw balance",
      blocks: [
        {
          kind: "p",
          text: "Every balance a contract hands back to you is a **whole number**, and it is almost never the number you are meant to read. The conversion is one division, but it is the step almost everybody skips the first time.",
        },
        {
          kind: "p",
          text: "Take a token whose `decimals()` returns `18`. You ask for a balance and the contract answers `4250000000000000000`. To turn that into tokens, divide by 10^18 — which is the same as moving the decimal point eighteen places to the left:",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "`decimals()` → `18`, so the divisor is `1000000000000000000`.",
            "`balanceOf()` → `4250000000000000000`.",
            "`4250000000000000000 / 1000000000000000000` → **`4.25` tokens**.",
            "A wallet shows you `4.25`. The contract never stored that number — it stored the first one.",
          ],
        },
        {
          kind: "p",
          text: "Now do it again for a token with `decimals()` of `6`, the way a dollar stablecoin usually is. A raw balance of `1500000` is `1500000 / 10^6`, or **`1.5` tokens** — a far smaller raw number than the example above, and a smaller balance too.",
        },
        {
          kind: "callout",
          tone: "warning",
          title: "Which is why raw numbers cannot be compared",
          text: "Two raw balances of 1000000 mean completely different things depending on decimals(). One is a millionth of a token; the other is a whole token. Never compare, sum or sort raw balances without first scaling each one by its own contract's decimals() — they are numbers written in different units, like inches and centimetres.",
        },
      ],
    },

    {
      id: "s5-one-standard",
      type: "text",
      heading: "Why thousands of assets can share one network",
      blocks: [
        {
          kind: "p",
          text: "BNB Smart Chain does not know what a stock is. It knows how to run contracts. What makes tokens interchangeable — a wallet can display any of them, an exchange can list any of them — is that they follow a **shared standard**.",
        },
        {
          kind: "p",
          text: "On EVM chains like BNB Smart Chain that standard is usually **ERC-20**: a fixed list of function names and events that a contract must implement. Because the interface is fixed, one wallet can hold a tokenized stock, a stablecoin, and a governance token without knowing anything about any of them.",
        },
        {
          kind: "list",
          items: [
            "**The standard defines the interface**, not the asset. Two ERC-20 tokens can represent completely different things.",
            "**The standard does not define value.** A token is worth what someone will trade for it, exactly like a share.",
            "**The standard does not define legitimacy.** Anyone can deploy an ERC-20 in a minute. A contract existing proves nothing about what backs it.",
          ],
        },
        {
          kind: "callout",
          tone: "warning",
          title: "The trap in that third line",
          text: "Because deploying a token is trivial, the existence of a contract called something like a famous ticker is not evidence of anything. This is why the app always shows you *who issued* an asset and *what the contract address is*, rather than trusting a name.",
        },
      ],
    },

    {
      id: "s6-quiz",
      type: "quiz",
      heading: "Check yourself",
      quiz: {
        id: "quiz-02",
        title: "The Token",
        questions: [
          {
            id: "q1",
            kind: "multiple-choice",
            prompt: "Where does a token balance actually live?",
            options: [
              { id: "a", text: "In your wallet application, on your device" },
              { id: "b", text: "In a smart contract on the blockchain" },
              { id: "c", text: "On the issuer's private server" },
              { id: "d", text: "In the token's logo file" },
            ],
            answer: "b",
            explanation:
              "Your wallet is a viewer. It reads balances from contracts and shows them to you. Delete the app and reinstall it with the same key and every balance reappears, because the record was never on your device.",
          },
          {
            id: "q2",
            kind: "numeric",
            prompt:
              "A contract reports decimals() = 18 and a raw balance of 2500000000000000000. How many whole tokens does that address hold?",
            answer: "2.5",
            tolerance: "0.0001",
            unit: "tokens",
            explanation:
              "Divide by 10^18, which means moving the decimal point 18 places left. 2500000000000000000 becomes 2.5. Getting this wrong by a factor of a quintillion is a rite of passage — now it is behind you.",
          },
          {
            id: "q3",
            kind: "true-false",
            prompt: "If a token contract exists and is working, the token must represent something real.",
            answer: false,
            explanation:
              "Anyone can deploy a contract in under a minute at negligible cost. A functioning contract tells you the code works. It tells you nothing about whether anything backs the token — that is a question for the issuer and the documentation.",
          },
          {
            id: "q4",
            kind: "multiple-choice",
            prompt: "Why can a single wallet display a tokenized stock and a stablecoin without special code for either?",
            options: [
              { id: "a", text: "Because both are issued by the same company" },
              { id: "b", text: "Because they both follow a shared token standard with a fixed interface" },
              { id: "c", text: "Because the wallet downloads a plugin per asset" },
              { id: "d", text: "Because the blockchain stores the price of each" },
            ],
            answer: "b",
            explanation:
              "The ERC-20 interface is a fixed list of functions. A wallet that can call balanceOf, symbol and decimals on one contract can call them on any contract that implements the standard.",
          },
        ],
      },
    },

    {
      id: "s7-reflection",
      type: "reflection",
      heading: "Before you move on",
      prompt:
        "A friend tells you they found a token with a familiar ticker and it must be the real thing because 'the contract is live and it works'. What would you tell them?",
      placeholder: "Working code proves the code works. It does not prove…",
    },
  ],
};
