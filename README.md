# StockSchool

**Learn tokenized stocks on BNB Smart Chain by looking at real ones.**

An interactive course for people who have never owned a tokenized equity. Eight
lessons, a live explorer built on the Binance Web3 API, a virtual portfolio that
never places a real trade, and an On-Chain Lab that reads a contract and shows you
what it actually says.

> **Educational only. Not investment advice.** Every number produced by the
> simulator is hypothetical, and the app says so on every screen where one
> appears.

---

## Overview

Tokenized stocks are a genuinely new instrument, and almost all the writing about
them is either a marketing page or a trading terminal. Neither teaches anything.
Someone who has heard "tokenized Apple" and wants to know what that *is* has
nowhere to start.

StockSchool is that starting point, built as a course you move through:
**Learn → Explore → Simulate → Understand On-Chain**. The teaching method is the
product's whole idea: rather than explaining the on-chain/reference price gap in
prose, it shows you a real one, then hands you the tools to check it yourself.

Two rules shape everything:

1. **Nothing is ever presented as something it is not.** Every piece of external
   data carries provenance — live, cached, or sample — and the label is always
   visible. Sample data is never dressed up as live.
2. **Nothing here touches your money.** The simulator is a spreadsheet with good
   manners. The On-Chain Lab performs read-only contract calls. No wallet
   connection, no private keys, no seed phrases, no transactions.

---

## Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router, React Server Components) · React 19 |
| Language | TypeScript, `strict` + `noUncheckedIndexedAccess` |
| Styling | Tailwind CSS v4 (CSS-first `@theme`) |
| Data | Binance Web3 API (6 endpoints, HMAC-SHA256 signed) |
| Database | PostgreSQL + Prisma (Neon-compatible) |
| Chain reads | `viem` (read-only `eth_call`) |
| Numeric | `decimal.js` — never float, anywhere near money |
| Validation | `zod` at every trust boundary |
| UI | `lucide-react`, `motion` |
| Tests | Vitest + React Testing Library · Playwright |

---

## Quick Start

**Requires Node ≥ 20.11** and **Yarn 1.22** (pinned via `packageManager`).

```bash
# 1. Install
yarn install

# 2. Configure
cp .env.example .env
#    Edit .env — see "Configuration" below.

# 3. Run
yarn dev
#    → http://localhost:3000
```

`npm install && npm run dev` works too; yarn is pinned only so the lockfile stays
consistent.

### Configuration

Everything has a working default except the two secrets.

| Variable | Required | What it does |
| --- | --- | --- |
| `BINANCE_WEB3_API_KEY` | for live data | Binance Web3 API key. **Server-only.** |
| `BINANCE_WEB3_API_SECRET` | for live data | Signing secret. **Server-only.** |
| `DATABASE_URL` | no | Postgres connection. Absent → progress falls back to `localStorage`. |
| `BINANCE_WEB3_BASE_PATH` | no | Default `/build`. **See the warning below.** |
| `NEXT_PUBLIC_DEFAULT_CHAIN_ID` | no | Default `56` (BSC). |
| `BSC_RPC_URL` | no | Dedicated RPC for on-chain reads. Blank → public BSC dataseed. |

Get keys at the [Binance Web3 Developer Portal](https://web3.binance.com/en/dev-portal).
Registering your hackathon email raises the rate limits.

**⚠️ The `/build` prefix.** The signed request path must start with `/build`. This
is the #1 cause of `40102 Invalid signature`, and the error message does not
mention it. `BINANCE_WEB3_BASE_PATH` defaults correctly — if you change it, change
it back.

### Running without API keys

**The app is designed to run with no credentials at all.** With an empty
`.env`, every market surface falls back to clearly-labelled SAMPLE DATA: a
`Sample data` badge on each figure, no freshness timestamps, and a notice
explaining that the numbers are illustrative. Nothing crashes and nothing lies.

This is deliberate. It is also how the app is meant to be reviewed — the fallback
path is a real code path, not a broken one.

### With a database

```bash
yarn db:push      # quick sync, or:
yarn db:migrate   # tracked migration
```

With `DATABASE_URL` set, lesson progress is **additionally mirrored** to Postgres,
so it survives a cleared browser or a second device. The browser stays the source
of truth and the mirror is monotonic — writes can only move a learner forward, so
out-of-order syncs from a sleeping laptop cannot un-complete a lesson. See
[`ARCHITECTURE.md` § Persistence](./ARCHITECTURE.md#6-persistence).

The **simulator is browser-only by design** — a simulated portfolio does not
follow you to a second device, and the UI says so with a "device only" badge.
Nothing is lost silently.

### Commands

```bash
yarn dev            # development server
yarn build          # prisma generate && next build
yarn lint           # eslint
yarn typecheck      # prisma generate && tsc --noEmit
yarn test           # vitest
yarn test:e2e       # playwright
yarn probe          # sign and call the Binance Web3 API directly
yarn db:studio      # browse the database
```

---

## Binance Web3 API Endpoints Used

**Six endpoints across two API groups**, every one verified against the live API
on 2026-10-11 by signing requests directly and reading the responses. The
requirement is three.

### RWA Data — five

| Endpoint | Where it lands |
| --- | --- |
| `GET /api/v1/dex/market/rwa/tokens` | The catalogue. Populates Explore, and backs every symbol lookup on the site |
| `GET /api/v1/dex/market/rwa/price` | The price pair on `/stocks/[symbol]` — refreshes the pair the catalogue reported |
| `GET /api/v1/dex/market/rwa/underlying-market` | Session state and fundamentals on `/stocks/[symbol]` |
| `GET /api/v1/dex/market/rwa/underlying-profile` | The "what the underlying business does" section on `/stocks/[symbol]` |
| `GET /api/v1/dex/market/rwa/search` | Asked by the explorer's search when the local catalogue has no match |

The detail page calls three of these concurrently, each independent — so a missing
company profile costs you the company section and nothing else. See
[`ARCHITECTURE.md`](./ARCHITECTURE.md).

Three of these take **contract addresses**, not tickers, and all five take
`binanceChainId` — not `chainId`. Both facts cost us an evening; see
[`DX_NOTES.md`](./DX_NOTES.md).

### Trading

| Endpoint | Where it lands |
| --- | --- |
| `GET /api/v1/dex/aggregator/quote` | **Integrated and verified, not yet surfaced.** A typed wrapper exists and has been called successfully; no screen consumes it yet, because it requires a `userWalletAddress` and this product never connects a wallet. See the note below. |

`fetchSwapQuote` is the one place in the codebase where the API's shape and the
product's promise pull against each other. The parameter is required, the product
forbids wallets, and the honest resolution is to make the caller supply an address
explicitly rather than invent one — which is what the signature does. It stays
unwired until there is a screen that can show a learner what address is being
used and why. Calling it "used" in the meantime would be the kind of claim this
whole repository is built to avoid.

### Two endpoints this README used to list, which do not exist

An earlier revision claimed eight endpoints across three API groups. Two of them
were never part of the API. Both return:

```text
404 {"msg":"No static resource build/api/v1/wallet/token-balances."}
404 {"msg":"No static resource build/api/v1/tx/simulate."}
```

`No static resource` is Spring's unmatched-route message, which is how you tell a
wrong path from a wrong parameter — no combination of query strings would have
made either work. They have been deleted from the client rather than left in
place to fail quietly, and the claim is corrected here rather than left standing.

The ground they were meant to cover — reading balances, dry-running a call — is
covered by the On-Chain Lab instead, which reads contracts over public BSC
JSON-RPC with no credentials at all. For a product whose entire premise is that
you should be able to check things yourself, that is the better answer anyway.

**Deliberately not used:** any endpoint that constructs or broadcasts a signed
transaction. StockSchool's simulator must never execute a real trade, so the
product stays read-and-simulate and takes the lower endpoint count on purpose.

**Chains:** BNB Smart Chain (`56`) is verified end to end. Ethereum (`1`) and
Base (`8453`) are plumbed through the same client but have not been exercised,
and Solana (`CT_501`) is configured but untested. We would rather say that than
imply coverage we have not checked.

### Authentication

```text
preHash   = timestamp + method + requestPath + body     // requestPath starts with /build
signature = Base64( HMAC-SHA256( preHash, secretKey ) )
```

Headers: `X-OC-APIKEY`, `X-OC-TIMESTAMP`, `X-OC-SIGN`. Implemented in
`src/lib/binance/signature.ts`, which refuses to sign a malformed request rather
than letting it fail upstream. The full write-up, including the traps, is in
[`DX_NOTES.md`](./DX_NOTES.md).

---

## What is in it

| Route | What it does |
| --- | --- |
| `/` | Landing page — what the product is, and the one idea behind it |
| `/learn` | The learning path: eight lessons, progress spine, what to do next |
| `/learn/[slug]` | A lesson — prose, diagrams, interactive widgets, quiz, missions |
| `/explore` | Browse tokenized stocks; on-chain vs reference price side by side |
| `/stocks/[symbol]` | One asset in depth: both prices, the spread, company data |
| `/simulate` | Virtual portfolio — trade ticket, holdings, history, disclosure |
| `/onchain` | Read a contract for yourself: address in, verified facts out |
| `/progress` | Everything you have done, and what it adds up to |

### The eight lessons

01 What is a stock? · 02 What is a token? · 03 The tokenized stock · 04 Market
hours · 05 Wallets and transactions · 06 Liquidity and depth · 07 Build a
portfolio · 08 Investigate the blockchain

### The interactive widgets

Seven, all built from one shared kit (`src/components/learning/widgets/parts.tsx`)
so they read as one product: price comparison, tokenization flow, transaction
flow, wallet anatomy, market hours, liquidity depth, allocation lab.

---

## Architecture

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the reasoning. The short version:

- **Server components render prose; only progress-aware leaves are client
  components.** Lessons ship as text, not as a bundle containing the whole course.
- **Money is `Decimal`, never `number`.** Enforced at the type boundary.
- **Provenance is a required field, not an option.** Anything from outside carries
  where it came from.
- **Every external shape is validated with Zod** before it reaches application
  code, so an upstream change is a handled error rather than a wrong number.

---

## Accessibility

- Every rendered foreground/background pair is held to **WCAG 2.2 AA (4.5:1)** in
  both light and dark themes, and `tests/unit/design-tokens.test.ts` fails the
  build if a token drifts past the threshold. The pair table names the call site
  for each row, so a failure points at a screen rather than at a hex value.
- Colour never carries meaning alone — every status has a word next to it.
- Focus is visible on every control; `prefers-reduced-motion` is respected.
- A skip link precedes the navigation.

---

## Project status

**Verified in this repository:**

- The signing scheme, against a known-answer pre-hash and one test per documented
  failure mode (`tests/unit/binance-signature.test.ts`).
- The palette's contrast, both themes (`tests/unit/design-tokens.test.ts`).
- Financial maths, simulation, scoring, progress, provenance, token maths
  (`tests/unit/`).

**Verified against the live API** on 2026-10-11, by signing requests by hand and
reading the responses: the paths, the parameter names, the authentication headers,
and which of the endpoints in the brief actually exist. That exercise is what
[`DX_NOTES.md`](./DX_NOTES.md) is made of, and it is the reason the endpoint table
above says six rather than eight.

The script that did it is committed as `scripts/probe-binance.mjs` (`yarn probe`),
so none of the above has to be taken on trust — run it against your own key and
compare. It is dependency-free on purpose: a probe that needs an install before it
can tell you whether the API is reachable misses the point of a probe.

**Not yet measured:** latency, call volume, and rate-limit behaviour. The live
calls were made one at a time while diagnosing, which establishes a contract and
says nothing about performance. [`DX_NOTES.md`](./DX_NOTES.md) §6 marks those
cells rather than filling them in.

One caveat worth stating plainly, since it is the more useful thing to know: the
on-chain half of the product — the On-Chain Lab, and every contract read behind it
— goes over public BSC JSON-RPC and needs no API credentials at all. It works
whether or not the market data service is reachable, which on some networks it
intermittently is not (§5.8).

---

## Demo

- **Deployed app:** _[add live URL]_
- **Demo video (≤ 4 min):** _[add public link — test it in incognito]_
- **Screenshot:**

  _[add `docs/screenshot-explore.png` — the Explore page with the on-chain vs
  reference price pair visible. That single screen communicates the product
  faster than a paragraph.]_

---

## License

MIT. See [`LICENSE`](./LICENSE).

---

<!-- =====================================================================
     MAINTAINER CHECKLIST — delete this section before submitting.
     =====================================================================

     [ ] yarn install   (no lockfile committed yet — run this first, and commit
                        the yarn.lock it generates)
     [ ] yarn typecheck
     [ ] yarn lint
     [ ] yarn test
     [ ] yarn build
     [ ] Fill in the three Demo links above
     [ ] Fill in the [TEAM] table in DX_NOTES.md §6 from a real keyed session
     [ ] Confirm .env is NOT tracked:  git status --porcelain | grep .env
     [ ] Confirm no console.log left:  grep -rn "console\." src/
     [ ] git init && commit
     ===================================================================== -->
