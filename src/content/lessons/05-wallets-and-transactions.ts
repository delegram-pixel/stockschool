import type { Lesson } from "@/lib/learning/types";

export const walletsAndTransactions: Lesson = {
  id: "lesson-05",
  slug: "wallets-and-transactions",
  number: "05",
  title: "Wallets & Transactions",
  description:
    "What a wallet really is, how a transaction moves, and how to read one on a block explorer.",
  objective:
    "By the end of this lesson you can explain the difference between an address and a key, trace the lifecycle of a transaction, and read a real transaction correctly.",
  difficulty: "beginner",
  estimatedMinutes: 9,
  order: 5,
  prerequisites: ["market-hours"],

  sections: [
    {
      id: "s1-what-a-wallet-is",
      type: "text",
      heading: "A wallet holds no tokens",
      blocks: [
        {
          kind: "p",
          text: "This is the single most useful correction in the whole course. **A wallet does not contain tokens.** It never has. Balances live in contracts on the blockchain, and they always did.",
        },
        {
          kind: "p",
          text: "What a wallet actually holds is a **private key** — a very large number. From that number, mathematics derives a **public address**. The key is what proves you are allowed to move the balances that sit at that address. The wallet app is a viewer plus a signing tool.",
        },
        {
          kind: "compare",
          left: {
            title: "The wallet application",
            subtitle: "What you download and open",
            points: [
              "Displays balances read from contracts",
              "Stores your private key (or a seed phrase that regenerates it)",
              "Builds and signs transactions when you ask it to",
              "Replaceable — install it anywhere with the same key",
            ],
          },
          right: {
            title: "The address",
            subtitle: "What identifies you on-chain",
            points: [
              "A public string anyone can look up on an explorer",
              "Where token balances are recorded in each contract",
              "Safe to share — it is how people send you things",
              "Derived from the key, but the key cannot be derived from it",
            ],
          },
        },
        {
          kind: "callout",
          tone: "warning",
          title: "The rule that has no exceptions",
          text: "Anyone who has your private key or seed phrase can move everything at that address. There is no support line, no chargeback, and no undo. No legitimate service will ever ask you for it. This app will never ask for it either — there is nowhere in the code that could even receive one.",
        },
      ],
    },

    {
      id: "s2-three-strings",
      type: "interactive",
      heading: "Three strings, three different things",
      intro:
        "A wallet shows you long strings of characters that all look equally arbitrary, and only one of them is safe to paste into a chat window. The figure below lays them out side by side, and traces the one-way path from the phrase you write on paper to the address people send to.",
      widget: "wallet-anatomy",
      alt: "An interactive comparison of three wallet strings — a public address, a private key, and a seed phrase — each with what it is safe to do with it and what happens if it leaks, above a five-link derivation chain running one way from seed phrase through seed, private key and public key to address, with a control for switching the derived account index.",
    },

    {
      id: "s3-lifecycle",
      type: "interactive",
      heading: "The life of a transaction",
      intro:
        "A transaction is not instant, and it is not a single event. Step through the five stages below — this is the sequence every swap in the simulator is modelling.",
      widget: "transaction-flow",
      alt: "An interactive five-stage walkthrough of a transaction — you sign it, it is broadcast, it waits in a queue, it is included in a block, and it becomes progressively harder to undo — each with what is happening, who is doing it, and what can go wrong.",
    },

    {
      id: "s4-the-stages",
      type: "text",
      heading: "Each stage, and what can go wrong",
      blocks: [
        {
          kind: "terms",
          items: [
            {
              term: "Built",
              definition:
                "The wallet assembles an instruction: what to call, with what arguments, and how much to pay in gas. Nothing has happened yet and nothing is public.",
            },
            {
              term: "Signed",
              definition:
                "The private key signs the instruction. This proves the request came from the address's owner. Still nothing has happened on-chain.",
            },
            {
              term: "Broadcast",
              definition:
                "The signed transaction is sent to the network and sits in a pool with everyone else's. It is now public but not yet final. It can still fail or be dropped.",
            },
            {
              term: "Included",
              definition:
                "A validator picks it up and puts it in a block. The state has changed. The transaction now has a hash, and a result: success or failure.",
            },
            {
              term: "Confirmed",
              definition:
                "More blocks are built on top. Reversing the transaction would now require rewriting the chain, which becomes impractical quickly. This is what 'settled' means.",
            },
          ],
        },
        {
          kind: "callout",
          tone: "info",
          title: "A failed transaction still costs gas",
          text: "This surprises everyone once. If a transaction reverts — the contract rejects it — the network still did the work of executing it, and you still pay for that work. A failed transaction is a real transaction that changed nothing except your balance.",
        },
      ],
    },

    {
      id: "s5-reading-a-transaction",
      type: "example",
      heading: "Reading a transaction",
      blocks: [
        {
          kind: "p",
          text: "Here is a worked example. Every field on this card is one you will meet on any block explorer, and every one of them is worth understanding before you trust a number on a screen.",
        },
        {
          kind: "terms",
          items: [
            {
              term: "Hash",
              definition:
                "The transaction's unique fingerprint. It is how you look a transaction up, and how you prove which one you mean. It is not secret.",
            },
            {
              term: "From / To",
              definition:
                "The address that signed it, and the contract or address it called. Note that 'To' is often a contract, not a person.",
            },
            {
              term: "Value",
              definition:
                "How much of the chain's native currency moved. A token transfer usually shows zero here — the token movement is recorded inside the contract, not in this field. That trips up nearly everyone.",
            },
            {
              term: "Status",
              definition:
                "Success or failed. A failed transaction is permanent and visible forever, and it still consumed gas.",
            },
            {
              term: "Block",
              definition:
                "Where in the chain's history this landed. Lower numbers are older — which is how you order events.",
            },
          ],
        },
        {
          kind: "callout",
          tone: "key",
          title: "The zero-value trap",
          text: "A transaction that moved 5,000 tokens can show a native value of 0. The native value field only covers the chain's own currency. Token movements are events emitted by the contract, recorded separately. Reading only the value field will make you think nothing happened.",
        },
      ],
    },

    {
      id: "s6-mission",
      type: "mission",
      heading: "Mission: read a transaction",
      mission: {
        id: "mission-05-tx",
        kind: "transaction-reading",
        title: "Read a transaction correctly",
        brief:
          "Below is an example transaction. Answer the questions using only the fields shown — no outside knowledge, no guessing at intent.",
        example: {
          hash: "0x7f2c9a41e6b8d05c3a1f7e92b4d6081c5a3e7f0b9d2c4a6e8f1b3d5c7a9e0f24",
          from: "0x8Ba1f109551bD432803012645Ac136ddd64DBA72",
          to: "0x55d398326f99059fF775485246999027B3197955",
          value: "0 BNB",
          status: "success",
          block: "43,218,907",
        },
        questions: [
          {
            id: "tx1",
            prompt: "The native value is 0 BNB. What can you conclude?",
            options: [
              { id: "a", text: "Nothing happened" },
              { id: "b", text: "No native currency moved — but tokens may still have moved inside the contract" },
              { id: "c", text: "The transaction failed" },
              { id: "d", text: "The transaction is still pending" },
            ],
            answer: "b",
            explanation:
              "Status is success, so something happened. The value field covers only the chain's native currency. Token transfers are recorded as contract events, not in this field.",
          },
          {
            id: "tx2",
            prompt: "What does the 'To' field tell you here?",
            options: [
              { id: "a", text: "The person who received the tokens" },
              { id: "b", text: "The contract that was called" },
              { id: "c", text: "The validator who included the block" },
              { id: "d", text: "The wallet software used" },
            ],
            answer: "b",
            explanation:
              "When 'To' is a contract, the transaction is an instruction to that contract. Who ultimately received tokens is a separate question, answered by the events the contract emitted.",
          },
          {
            id: "tx3",
            prompt: "A second transaction appears at block 43,218,905. Which happened first?",
            options: [
              { id: "a", text: "The example transaction, because it has a higher block" },
              { id: "b", text: "The second transaction, because it has a lower block number" },
              { id: "c", text: "They happened at the same time" },
              { id: "d", text: "Block numbers do not indicate order" },
            ],
            answer: "b",
            explanation:
              "Block numbers increase with time. Lower means earlier. Ordering events by block number — and by position within the block — is how you establish what caused what.",
          },
        ],
        successMessage:
          "You can read a transaction. That is more than most people who have been buying tokens for years can say, and it is the difference between using a block explorer and being able to audit one.",
      },
    },

    {
      id: "s7-quiz",
      type: "quiz",
      heading: "Check yourself",
      quiz: {
        id: "quiz-05",
        title: "Wallets & Transactions",
        questions: [
          {
            id: "q1",
            kind: "multiple-choice",
            prompt: "Where are your token balances stored?",
            options: [
              { id: "a", text: "In your wallet app's local database" },
              { id: "b", text: "In the token's smart contract, keyed by your address" },
              { id: "c", text: "On the issuer's servers" },
              { id: "d", text: "In the seed phrase itself" },
            ],
            answer: "b",
            explanation:
              "Balances live in contracts. Your wallet is a viewer that reads them and a signer that authorises changes. Reinstall the app with the same key and every balance reappears.",
          },
          {
            id: "q2",
            kind: "multiple-choice",
            prompt: "What is the difference between an address and a private key?",
            options: [
              { id: "a", text: "They are two names for the same thing" },
              { id: "b", text: "An address is public and safe to share; the key proves ownership and must never be shared" },
              { id: "c", text: "The address is secret and the key is public" },
              { id: "d", text: "The key is derived from the address" },
            ],
            answer: "b",
            explanation:
              "The key is the secret that derives the address — not the reverse. Sharing an address is normal. Sharing a key or seed phrase hands over everything at that address, permanently.",
          },
          {
            id: "q3",
            kind: "true-false",
            prompt: "If a transaction fails, you are not charged gas.",
            answer: false,
            explanation:
              "The network executed the transaction and it reverted. The work was done and must be paid for. A failed transaction costs gas and changes nothing else.",
          },
          {
            id: "q4",
            kind: "multiple-choice",
            prompt: "At which stage does a transaction first become public?",
            options: [
              { id: "a", text: "Built" },
              { id: "b", text: "Signed" },
              { id: "c", text: "Broadcast" },
              { id: "d", text: "Confirmed" },
            ],
            answer: "c",
            explanation:
              "Building and signing happen locally and privately. Broadcasting puts it into the public pool. It becomes final — and irreversible — only once a block includes it.",
          },
          {
            id: "q5",
            kind: "true-false",
            prompt: "This app can access your wallet's private key if you enter a contract address.",
            answer: false,
            explanation:
              "There is no code path in this application that accepts, stores, or transmits a private key or seed phrase. The on-chain page performs public read-only calls to a node. This is a structural property of the codebase, not a policy.",
          },
        ],
      },
    },

    {
      id: "s8-reflection",
      type: "reflection",
      heading: "Before you move on",
      prompt:
        "Explain to someone who has never used a blockchain why losing a seed phrase is different from forgetting a password.",
      placeholder: "A password can be reset because… but a seed phrase is the thing itself, so…",
    },
  ],
};
