import type { Lesson } from "@/lib/learning/types";

export const liquidityAndDepth: Lesson = {
  id: "lesson-06",
  slug: "liquidity-and-depth",
  number: "06",
  title: "Liquidity & Depth",
  description:
    "Why the price you see is rarely the price you get, and what a thin market does to a trade.",
  objective:
    "By the end of this lesson you can explain what liquidity is, why larger trades move the price further, and why a quoted price is only valid for a certain size.",
  difficulty: "beginner",
  estimatedMinutes: 8,
  order: 6,
  prerequisites: ["wallets-and-transactions"],

  sections: [
    {
      id: "s1-the-quoted-price",
      type: "text",
      heading: "The quote is not a promise",
      blocks: [
        {
          kind: "p",
          text: "When you see a price on a screen, it looks like a property of the asset. It is not. It is the price of the *next small trade*. The moment you want to trade a meaningful amount, the price you actually get will be a little different — usually worse.",
        },
        {
          kind: "p",
          text: "The gap between the price you were shown and the price you actually received has a name: **slippage**. It is not a fee, and nobody takes it. It is the market moving under you because your own order is big enough to move it.",
        },
        {
          kind: "callout",
          tone: "key",
          title: "Liquidity, defined plainly",
          text: "Liquidity is how much you can trade before the price moves against you. A liquid market absorbs a large order quietly. A thin market lurches.",
        },
      ],
    },

    {
      id: "s2-widget",
      type: "interactive",
      heading: "Where the price actually comes from",
      intro:
        "On a traditional exchange, buyers and sellers post orders and a matching engine pairs them up. On-chain there is usually no engine at all — there is a pool holding two assets, and a formula decides the price. This figure is that formula: three pools of different sizes, the same trade against each, and the one number that explains why your average price is never the price you were shown.",
      widget: "liquidity-depth",
      alt: "An interactive constant-product pool. Switching between a deep, a typical and a thin pool, and dragging the order size, redraws the reserve curve and reports the mid price before the trade, the average price actually received, the resulting price impact, and the mid price afterwards.",
    },

    {
      id: "s3-what-you-are-seeing",
      type: "text",
      heading: "Reading the pool",
      blocks: [
        {
          kind: "p",
          text: "An on-chain pool holds a quantity of each of two assets — call them a **quote reserve** and a **base reserve**. Its rule is one line of arithmetic: the two reserves multiplied together must stay at the same number. Buying pushes one reserve up, so the other must come down, and that is the entire mechanism by which your own trade moves the price.",
        },
        {
          kind: "terms",
          items: [
            {
              term: "Mid price",
              definition:
                "One reserve divided by the other. This is the headline number — the price of the very next tiny trade, and nothing more.",
            },
            {
              term: "Reserves",
              definition:
                "How much of each asset the pool is actually holding. The mid price is these two numbers divided; change either and the price changes.",
            },
            {
              term: "Depth",
              definition:
                "How much buying pressure it takes to move the price by a given percentage. Depth is the honest measure of liquidity — and it is a property of the pool, not of the asset.",
            },
            {
              term: "Price impact",
              definition:
                "How far your own trade moved the mid price. It is caused entirely by you, and it is still there after you close the tab.",
            },
            {
              term: "Slippage",
              definition:
                "The gap between the mid price you were shown and the average price you actually got. Price impact is the cause; slippage is what you feel.",
            },
          ],
        },
        {
          kind: "callout",
          tone: "info",
          title: "The rule of thumb",
          text: "For small trades the impact is roughly your order size as a fraction of the pool — put 1% of the pool in and you move the price about 1%. It does not stay linear. Double your size and the impact roughly quadruples, which is why a trade that looks slightly too big is often far too big.",
        },
        {
          kind: "callout",
          tone: "warning",
          title: "There is no order book to look at",
          text: "With a pool there is no list of resting orders to inspect, no bid and no ask. That does not make the market unknowable — it makes it *calculable*. If you know the two reserves, you can work out exactly what your trade will cost before you send it, which is more than a screenshot of an order book usually tells you.",
        },
      ],
    },

    {
      id: "s4-why-it-matters-here",
      type: "text",
      heading: "Why this matters for tokenized stocks",
      blocks: [
        {
          kind: "p",
          text: "A tokenized stock can have a perfectly respectable reference price from a deep, liquid, regulated exchange — and an on-chain market that is a shallow pool with a few thousand dollars in it. The reference price is real. So is the pool. They are just answering different questions.",
        },
        {
          kind: "list",
          items: [
            "**A convincing price does not imply a tradeable market.** The headline number can come from the deep side while the side you can actually trade is thin.",
            "**Thin markets produce noisy prices**, which is a large part of why the on-chain price drifts away from the reference outside trading hours.",
            "**A large gap on a thin pool is not an opportunity** — it is a measurement of how little it would take to close it, which is usually less than the cost of trying.",
          ],
        },
      ],
    },

    {
      id: "s5-quiz",
      type: "quiz",
      heading: "Check yourself",
      quiz: {
        id: "quiz-06",
        title: "Liquidity & Depth",
        questions: [
          {
            id: "q1",
            kind: "multiple-choice",
            prompt: "You are quoted a price from a pool and trade a much larger amount than usual. What should you expect?",
            options: [
              { id: "a", text: "Exactly the quoted price, since a quote is a commitment" },
              { id: "b", text: "A worse average price, because your own trade shifts the pool's reserves as it fills" },
              { id: "c", text: "A better price, because large orders get discounts" },
              { id: "d", text: "The trade will be rejected" },
            ],
            answer: "b",
            explanation:
              "A quote is valid for a size, not for any size. Your trade pushes one reserve up and the other down, so the price deteriorates while you are still trading. You average out at something worse than the number you were shown, and that difference is slippage.",
          },
          {
            id: "q2",
            kind: "numeric",
            prompt:
              "A pool holds 1,000,000 USDT and 10,000 TOKEN, so one TOKEN is quoted at $100. You buy with 10,000 USDT. What is your average price per TOKEN, in dollars?",
            answer: "101",
            tolerance: "0.5",
            unit: "USD",
            explanation:
              "You put in 10,000 USDT — 1% of the pool's USDT reserve. The reserves must still multiply to the same constant, so the pool ends up holding roughly 99 fewer TOKEN, and 10,000 ÷ 99.01 is about $101.00. You were quoted $100 and paid $101: a 1% order moved the price about 1%, and you wore the whole of it.",
          },
          {
            id: "q3",
            kind: "true-false",
            prompt: "Doubling the size of your order in the same pool roughly doubles the price impact.",
            answer: false,
            explanation:
              "It roughly quadruples it. Price impact grows faster than order size — close to the square for small trades, and worse than that as the order gets large relative to the pool. This is why the difference between a slightly oversized trade and a badly oversized one is much bigger than it sounds.",
          },
          {
            id: "q4",
            kind: "scenario",
            prompt: "What is the most reasonable conclusion?",
            scenario:
              "A tokenized stock shows a reference price of $187.40 from a major exchange. Its on-chain pool holds roughly $4,000 of liquidity. The on-chain price is $191.10.",
            options: [
              { id: "a", text: "The token is overpriced and should be shorted" },
              { id: "b", text: "The reference price must be wrong" },
              {
                id: "c",
                text: "The pool is thin enough that a modest trade would move its price substantially, so the $3.70 gap is largely a reflection of that fragility",
              },
              { id: "d", text: "The two prices will never converge" },
            ],
            answer: "c",
            explanation:
              "A $4,000 pool is shallow. The gap is real but it is describing the pool's fragility rather than a mispricing worth acting on — and a trade large enough to exploit it would move the price as it went.",
          },
        ],
      },
    },

    {
      id: "s6-reflection",
      type: "reflection",
      heading: "Before you move on",
      prompt:
        "In your own words, why is 'the price' an incomplete piece of information without knowing how much you want to trade?",
      placeholder: "Because price is only meaningful for a size. Once the order is large relative to…",
    },
  ],
};
