# Binance Web3 API — Developer Experience Notes

**Status:** raw material for the Developer Experience Report (25% of score, mandatory).
**Deadline:** 2026-10-11 12:00 UTC.
**Form:** https://docs.google.com/forms/d/e/1FAIpQLSfBkyWAYZ5JjzzUXRHlRgi7TjAIPUCkxPtV81eJgyBmGfrJiQ/viewform

This file is not the report. The report is an 8-page Google Form. This file is the
evidence behind it, kept in the repository so every claim in the form is one a
judge can verify by opening a file and reading it.

---

## Read this before pasting anything into the form

The form's own template suggests lines like *"Total API calls made: ~15,000 over
6 weeks"* and *"Took 2 hours to understand the /build prefix."* Those are examples
of the **kind** of specificity judges want. They are not our numbers, and writing
them down would be inventing measurements we never took.

So this file is split by what backs each claim:

| Marker | Meaning |
| --- | --- |
| **`[CODE]`** | Verifiable right now by opening the named file. Safe to submit as-is. |
| **`[DOC]`** | A reading of Binance's or the hackathon's own documentation. Quote it and it stands. |
| **`[TEAM]`** | Only the team can supply this, from a real session with credentials. **Fill in or delete — never guess.** |

**Our honest position on live testing.** The integration was written entirely
from the documentation, because we did not have credentials for most of the
build. It compiled, it type-checked, and 329 unit tests passed against it — and
then the first live call failed on **every endpoint we tried**. Not one of the
six worked. The cause was never the signing scheme, which was right on the first
attempt; it was parameter and field **names**, every one of which we had inferred
from the endpoint paths, and every one of which was wrong. §5.2 is that account
in full, and it is the most useful thing in this document.

So this report has two halves, and they are worth keeping apart:

- **Verified against the live API on 2026-10-11** — endpoint behaviour, response
  shapes, the three distinct failure modes, and the raw bodies, reproduced below.
  This is the bulk of §2, §3 and §5.
- **Not yet established** — latency distributions, call volumes, rate-limit
  behaviour. We have made a few dozen calls in a single session, which is enough
  to pin down a contract and nowhere near enough to characterise performance.
  Those cells in §6 are marked `[TEAM]` and left blank rather than estimated.

The earlier draft of this file said we had never made a live call and reported no
upstream behaviour at all. That is no longer true, and the difference between the
two versions is itself the finding: *nothing about the documentation we read
predicted that all six endpoints would fail.*

---

## 1. What we built

StockSchool teaches beginners how tokenized equities work on BNB Smart Chain, by
having them look at real ones. Four motions: **Learn** (eight lessons with
interactive widgets), **Explore** (browse tokenized stocks and compare on-chain
against reference prices), **Simulate** (a virtual portfolio — never a real
trade), and **Understand On-Chain** (read a contract directly and see for
yourself).

The API is load-bearing rather than decorative: the product's central teaching
moment is the **gap between the on-chain price and the reference price**, which
only exists because `/rwa/price` returns both. Remove the API and the course has
nothing to teach with.

---

## 2. Endpoints used

**Six endpoints** across two API groups, against a requirement of three. Every
one below was called successfully on **2026-10-11** and its response read; the
transcripts are the raw API output, not summaries. Paths are as the hackathon
brief writes them in §5; the signed request path carries the additional `/build`
prefix (see §3).

The two groups are RWA Data and Trading. There is no Wallet group and no
Transaction group in this API — see §2.3, which is the part of this section
worth reading.

### 2.1 RWA Data — five

| # | Endpoint | Called from | What it teaches |
| --- | --- | --- | --- |
| 1 | `GET /api/v1/dex/market/rwa/tokens` | `fetchRwaTokens` | The catalogue. Populates Explore. |
| 2 | `GET /api/v1/dex/market/rwa/search` | `searchRwa` | Find a stock by ticker or company name. |
| 3 | `GET /api/v1/dex/market/rwa/price` | `fetchRwaPrices` | **The key call.** Returns on-chain *and* reference price — the premium the whole course is about. Cached 30s. `[CODE]` |
| 4 | `GET /api/v1/dex/market/rwa/underlying-market` | `fetchUnderlyingMarket` | Fundamentals and session state. Powers the "market hours" lesson. |
| 5 | `GET /api/v1/dex/market/rwa/underlying-profile` | `fetchUnderlyingProfile` | Company behind the token: sector, industry, description. Cached 1h. |

All five take `binanceChainId`. Three of them take a **contract address**, not a
ticker, despite the price endpoint being the only one whose name suggests it.
Getting both of those wrong is the subject of §5.2, which we consider the most
valuable finding in this document.

### 2.2 Trading — one

| # | Endpoint | Called from | What it is for |
| --- | --- | --- | --- |
| 6 | `GET /api/v1/dex/aggregator/quote` | `fetchSwapQuote` | "What would this swap cost, and what is the route?" Powers the slippage lesson. **Never executed.** |

This one additionally requires `userWalletAddress`, which is awkward for a
product whose central promise is that no wallet is ever connected. See §5.7.

### 2.3 Two endpoints that do not exist, and how we found out

Our first draft of this document claimed **eight endpoints across three groups**.
Two of them were invented. Both return:

```text
GET  /build/api/v1/wallet/token-balances
→ 404 {"timestamp":1791675833987,"msg":"No static resource build/api/v1/wallet/token-balances.","data":"","code":404}

POST /build/api/v1/tx/simulate
→ 404 {"timestamp":1791675834707,"msg":"No static resource build/api/v1/tx/simulate.","data":"","code":404}
```

`No static resource` is Spring's unmatched-route message. That distinction
matters and is worth internalising: a wrong **path** produces this, while a wrong
**parameter** produces `HTTP 200` with `code: 40001` and a message naming the
missing parameter. Those two failure modes look nothing alike once you know to
tell them apart, and neither is described in the brief.

We are reporting this rather than quietly deleting it because the underlying
mistake is the one this whole document is about: we wrote a client against the
*shape* of an API we had not called. The brief listed paths but no parameters and
no host, so the parameters were inferred — and inference is where all of this
went wrong. §5.2 is the full account.

The ground those two endpoints were meant to cover is covered by the On-Chain Lab
instead, over public BSC JSON-RPC (`src/lib/blockchain/token-reader.ts`). That
path needs no credentials, is not subject to API key policy, and keeps working
when this API is unreachable — which, on our network, it sometimes is (§5.8).

### 2.4 Deliberately not used

Any endpoint that **constructs or broadcasts a signed transaction**.

This is a scope decision, and we would rather state it than have it read as an
oversight. StockSchool's simulator must **never execute a real trade** — a hard
requirement in our own PRD, and the thing that makes the product safe to hand to
someone who has never owned a token. Endpoints that build and broadcast signed
transactions are exactly the ones that would let a learner lose money by
misclicking a teaching tool. The product stays read-and-simulate, and we took the
lower endpoint count on purpose.

Supporting chains: BSC (56) is verified end to end. Ethereum (1) and Base (8453)
are plumbed through the same client but have not been exercised; Solana
(`CT_501`) is configured but untested. We would rather say that than imply
coverage we have not checked. `[CODE]` — `src/lib/chains.ts`.

---

## 3. Authentication — and the trap

The scheme, exactly as documented:

```
preHash   = timestamp + method + requestPath + body
signature = Base64( HMAC-SHA256( preHash, secretKey ) )
```

Headers on every request: `X-OC-APIKEY`, `X-OC-TIMESTAMP`, `X-OC-SIGN`.

### A complete, checkable pre-hash `[CODE]`

This is a real assertion from `tests/unit/binance-signature.test.ts` ("concatenates
timestamp, method, path and body in that order"), not an illustration:

```
timestamp   : 2026-10-09T12:00:00.000Z
method      : GET
requestPath : /build/api/v1/dex/market/rwa/price?binanceChainId=56
body        : (empty — a GET has no body)

preHash     : 2026-10-09T12:00:00.000ZGET/build/api/v1/dex/market/rwa/price?binanceChainId=56
```

Four things in that string are each independently capable of producing
`40102 Invalid signature`, and the error says nothing about which one is wrong:
the `.000` milliseconds, the upper-cased method, the `/build` prefix, and the
query string being *inside* the signed payload in transmission order.

### The trap we want to report honestly

We are not going to claim two hours of debugging we did not spend. What we can
document is the thing that would have cost them, and it is a **documentation
structure** problem rather than a code problem.

The hackathon brief contains two different spellings of the same path:

- **§5, "Required APIs Used"** lists the endpoints as `/api/v1/dex/market/rwa/...`
- **§5, "Authentication"**, forty lines below, states `requestPath MUST start with /build`
- **§2's report template** lists them again without the prefix

So the natural workflow — copy the endpoint from the endpoint list, paste it into
your signer — produces a signature over `/api/v1/...` for a request transmitted
to `/build/api/v1/...`. The server correctly rejects it. The message is
`40102 Invalid signature`, and it does not mention the prefix, the path, or the
expected path. `[DOC]`

This is worth a paragraph in the report because it is not really a documentation
*omission* — the requirement is stated. It is a documented requirement in one
section and contradicted by the copy-pasteable examples in two others, which is a
harder failure mode to spot, because the reader has already read the rule and
believes they are following it.

**How we handled it `[CODE]`.** Rather than rely on care, we made the mistake
impossible to ship. `assertSignable()` in `src/lib/binance/signature.ts:64-79`
refuses to sign anything whose path does not start with `/build/`, and it throws
before the request leaves the process. Two details in that guard are deliberate:

- It requires `/build/` **with the trailing slash**, so a path like `/buildfoo`
  cannot slip through a naive `startsWith("/build")` check
  (`binance-signature.test.ts:85-89`).
- It also rejects a GET body that is not the empty string, because
  `JSON.stringify({})` is `"{}"` and hashing that instead of `""` invalidates the
  signature just as thoroughly — this is the second-most-common cause and it is
  silently wrong rather than obviously wrong.

The result is that the prefix can only be wrong in one place, and `client.ts:82`
builds the signed path and the transmitted URL from the **same variable**, so
they cannot drift apart.

### Two smaller header observations `[DOC]`

- The header is `X-OC-APIKEY` — no hyphen between `API` and `KEY`. Writing
  `X-OC-API-KEY` is the obvious guess and gets a generic failure. Worth an
  explicit callout in the auth docs.
- The `X-OC-` prefix appears nowhere in the Web3 API branding, so it reads as a
  different product's header when you first meet it.

---

## 4. What worked smoothly

Honest version, at the contract level rather than the runtime level:

1. **The pre-hash formula is simple enough to implement from the document alone,
   with no SDK.** Four concatenated strings and one HMAC. We wrote the signer in
   about thirty lines and never needed a library. For an API with a bespoke auth
   scheme, that is a genuinely good outcome. `[CODE]`
2. **The required header set is small and orthogonal** — three headers, no OAuth
   dance, no token refresh, no signing session. Stateless per request.
3. **The timestamp format is the one JavaScript already produces.**
   `new Date().toISOString()` gives ISO 8601 with exactly three fractional digits
   and a `Z`, which is what the API accepts. `[CODE]` — `signature.ts:55-57`. Many
   APIs want a second-precision Unix integer, which is one conversion and one
   timezone bug away from a failure; this one accepts the format the language
   hands you.
4. **The endpoint naming is predictable.** Once you have seen
   `/dex/market/rwa/price`, you can guess `/dex/market/rwa/tokens` and
   `/dex/market/rwa/search` correctly. The RWA group reads as a designed
   namespace rather than an accretion of routes.
5. **The error codes are at least named and stable** (40101/40102/40103 read as
   an auth family, 429 as rate limiting). They are not *informative*, but they are
   *consistent*, and that is what makes a lookup table possible.
6. **[TEAM]** — what actually worked on the first live call. Replace this item.

---

## 5. What was frustrating

### 5.1 `40102 Invalid signature` names the symptom, never the cause

**Severity: high.** One error code covers at least six distinct mistakes: missing
`/build`, wrong timestamp precision, a timezone offset instead of `Z`, a
double-serialised body, a JSON `{}` where an empty string was required, and
parameter order in the signed query string. All six produce the same string and
the same HTTP status. There is no partial credit and no hint. `[DOC]`

The cost is not the fix, it is the search: the failure is upstream, so every
candidate cause has a network round trip between the hypothesis and the answer,
and the debugging loop is slow exactly when you are least sure.

**Suggestion.** Return the expected request path in the error body, or a
`requestPath` echo, and log which field failed to match. Even
`"signature mismatch: signed path did not match request path"` would collapse the
usual hour into a minute. A minimal version: since the service already
reconstructs the pre-hash to verify it, it knows whether the path it received
begins with `/build` — say so. Given that this failure mode is documented by
Binance itself as the #1 cause, an error body that does not mention the prefix is
the single highest-leverage documentation change available.

**Our mitigation `[CODE]`.** We accepted that we cannot fix upstream and made the
error unreachable locally instead. Every one of the six mistakes above has its own
named assertion in `assertSignable()`, and `tests/unit/binance-signature.test.ts`
has a test **per mistake** rather than per function — including one for a
timestamp with a `+02:00` offset and one for `/buildfoo`.

### 5.2 The parameter names and field names are undocumented, and every guess we made was wrong

**Severity: critical. This is the finding that cost us the most time, and the one
we would most want a future integrator to read first.** `[CODE]`

The brief gives endpoint *paths*. It gives no host, and it gives not a single
parameter name. So the parameters had to be inferred — and inference is where all
of this went wrong. Not the signing, not the transport, not the rate limits. The
names.

Every item below was discovered by calling the API and reading the reply.

**Parameter names.** The chain parameter is `binanceChainId`. We sent `chainId`,
on four endpoints. Every one returned `HTTP 200` with:

```json
{"code":40001,"msg":"Parameter binanceChainId is required","data":null,"timestamp":1791675831937,"success":false}
```

**Field names.** The contract address field is `tokenContractAddress`. Our schema
accepted `contractAddress`, `tokenAddress` and `address` — three plausible
guesses, none of them right. Because the schema was deliberately permissive and
every field optional, this failed **silently**: `normalizeToken` set
`contractAddress: null` on every asset, and the app rendered a full token
catalogue in which no token had an address. Nothing threw. Nothing logged. The
On-Chain Lab — a page whose entire purpose is reading contracts — had none to
offer.

This is the failure mode we would most want to warn about, because it is
invisible from the outside. A wrong key name in a permissive parser does not look
like a bug; it looks like an API that returns nulls.

**Nesting.** `search` returns *companies*, not tokens:

```json
{"ticker":"TSLA","companyName":"Tesla, Inc.","assets":[
  {"platformId":"ondo","binanceChainId":"56",
   "tokenContractAddress":"0x2494b603319d4d9f9715c9f4496d9e0364b59d93",
   "tokenSymbol":"TSLAon","assetType":1}]}
```

We parsed the top-level items as tokens. Every result then failed validation
(there is no `tokenContractAddress` on a company), so search returned an **empty
list while reporting success**. `underlying-market` nests the same way: the
session state is at `statusInfo.marketStatus`, not `marketStatus`.

**Three failure modes that look nothing alike, and none of which is documented:**

| What is wrong | What the API returns |
| --- | --- |
| Wrong **path** | `404` · `{"msg":"No static resource build/…"}` |
| Wrong **parameter** | `HTTP 200` · `{"code":40001,"msg":"Parameter X is required"}` |
| Wrong **value** | `HTTP 200` · `{"code":0,"msg":"success"}` — with nothing filtered |

The third row is the dangerous one. `?tabId=3` returned all 46 bStocks: the filter
was ignored, and the response was byte-indistinguishable from a correct one. We
shipped a filter that did nothing, for as long as we did, because the API does not
distinguish "filtered to nothing" from "ignored your filter".

**And requirements arrive one at a time.** `underlying-profile` answered
`Parameter binanceChainId is required`. We supplied that. It then answered
`Parameter tokenContractAddress is required`. Two round trips to learn one
endpoint's signature.

**Suggestions, ranked by leverage.**

1. **Publish the parameter names per endpoint.** This single change removes most
   of this section. The paths are documented; the parameters are the missing half.
2. **Return a non-200 status for parameter errors.** `40001` arriving with
   `HTTP 200` defeats every HTTP-level error handler and forces every client to
   parse the body to detect failure. Our own client does exactly that, and it is
   the only reason these errors surfaced at all.
3. **Reject unknown parameters, or state that you ignored them.** A silently
   ignored filter is worse than an error, because it produces a plausible wrong
   answer.
4. **Name every missing parameter in one response**, not the first one found.
5. **Capture one example response per endpoint.** It need not be generated or
   maintained — one real capture each would let a client pin the shape, and would
   have caught the `tokenContractAddress` problem before we shipped it.

### 5.3 There *is* a batch price endpoint — we reported it missing because we could not discover it

**Severity: medium, and this one is our mistake, not theirs.** `[DOC]`

An earlier draft of this document requested
`POST /api/v1/dex/market/rwa/price-batch`, on the grounds that `/rwa/price` takes
a single symbol and a priced list of N holdings is therefore N requests.

That was wrong, and we are leaving the retraction in rather than deleting it. The
parameter is **`tokenContractAddresses`** — plural — and it takes a
comma-separated list:

```text
GET /build/api/v1/dex/market/rwa/price
      ?binanceChainId=56
      &tokenContractAddresses=0x2494b603319d4d9f9715c9f4496d9e0364b59d93,0x7c26a12f20507e2cee22ceebed9e88fda47f866c
→ {"code":0,"msg":"success","data":[…]}
```

The batching we asked for already exists. We could not find it, and the reason is
the same one as §5.2: there is no parameter list anywhere. We inferred the
parameter was `symbol` from the endpoint's own name, and once a client is built
around a guessed name the real one becomes invisible — you send `?symbol=…`, get
`Parameter binanceChainId is required`, fix *that*, get
`Parameter tokenContractAddresses is required`, and only then learn the truth.
The correct name was two errors deep, behind two others we had also invented.

The only thing that found it was abandoning the code and signing requests by hand.
That exercise is committed, so it can be repeated:
`yarn probe` (`scripts/probe-binance.mjs`) signs and calls all six endpoints and
prints the raw bodies, untruncated with `--full`. It is dependency-free — plain
`node`, no install — because the moment you most need to know whether the API is
reachable is the moment you least want to be debugging a package manager first.

A documented "we asked for this and it already existed" is more useful to the next
integrator than a tidy report, because it is evidence of how the discovery problem
actually presents itself. The surviving suggestion is therefore §5.2's first one,
and it is now load-bearing: **publish the parameter names.** Had
`tokenContractAddresses` appeared anywhere in the documentation, this section
would not exist — and neither would most of §5.2.

### 5.4 Price responses carry no market timestamp we can rely on

**Severity: medium-high *for this product*, low for others.** `[CODE]`

The provenance model is the backbone of StockSchool: FR-14 says sample data must
never be presented as live, and the mechanism is that every record carries an
`updatedAt` which drives the freshness indicator ("Updated 12 seconds ago").

What `updatedAt` actually holds is **our fetch time**, not the market's time,
because we could not establish that the price response includes a
source-generated timestamp we could trust. So a price the upstream computed
minutes ago can render as "Updated 3 seconds ago" — the indicator is measuring
our cache, not the market.

We handled this the only honest way available: `freshnessSentence()` in
`src/lib/provenance.ts:77-98` refuses the word "real-time", and falls back to
*"Update time not reported by the source."* when no timestamp exists. But from
the user's seat, "Updated 3 seconds ago" is a claim about the price, and we would
rather not be making it on the API's behalf.

**Suggestion.** Include an explicit `priceUpdatedAt` (or `sourceTimestamp`) on
price and market responses, distinct from any request or cache field. This is
small, and it unlocks the whole class of freshness-aware products — which is most
of them, for tokenized equities, where the on-chain/reference gap is a function
of *time*.

### 5.5 `chainId` is a number for three chains and a string for the fourth

**Severity: low, but the type lie propagates.** `[DOC]` `[CODE]`

BSC is `56`, Ethereum is `1`, Base is `8453` — and Solana is `CT_501`. A single
parameter that is sometimes a numeric chain ID and sometimes an opaque string
cannot be typed as `number`, so every signature in a client becomes
`number | string`, and the type system stops helping at exactly the boundary
where you want it most.

**Suggestion.** Either accept `CT_501` as a separate `chain` parameter, or
document `chainId` as a string throughout. A stable, always-string type would let
clients keep strict typing.

### 5.6 Success is signalled twice, and the two can disagree

**Severity: low, but a real correctness trap.** `[CODE]`

We found we could not trust the HTTP status alone. The API can return **HTTP 200
with a non-zero business code** in the body envelope. A client that checks
`if (response.ok)` — the standard, reasonable thing to write — treats a failed
call as a success and proceeds to read fields that are not there.

Our handler is `client.ts:169-182`: after a 200, we inspect the envelope and treat
a non-zero `code` as an upstream error. Every other HTTP client does this
correctly by accident; here it has to be deliberate.

**Suggestion.** This is a design observation rather than a complaint — dual
signalling is common in exchange APIs and often deliberate. But the error codes do
need a published table. We had to infer that 40101/40102/40103 form the auth
family from their numeric proximity, which is not a robust way to learn an API's
error taxonomy. `codeToErrorCode()` in `client.ts` is our guess, and it should not
have to be a guess.

### 5.7 The quote endpoint needs a wallet address, which this product does not have

**Severity: high for any read-only or educational client.** `[CODE]`

`/dex/aggregator/quote` takes a `userWalletAddress`. Omit it and upstream answers:

```text
HTTP 200
{"code":40001,"msg":"userWalletAddress is required for RFQ (Ondo) quote"}
```

Some pairs route through Ondo's RFQ system, and an RFQ is a quote *to a
counterparty*, so a wallet is arguably meaningful there. The problem is not the
requirement — it is that it is **conditional and undocumented**. The failure
appears only for the pairs that happen to route that way, so a client that works
for one token pair fails for the next one, on a parameter it had no way to know
existed. That is the same discovery problem as §5.2, with a shorter fuse: you find
out in front of whoever you are demoing to.

For StockSchool this is a real design conflict rather than an inconvenience. The
product's central safety claim is that **no wallet is ever connected** — it is what
makes a trading-adjacent teaching tool safe to hand to someone who has never owned
a token, and it is a hard requirement in our own PRD. We cannot satisfy the API
and that promise at once without either inventing an address or asking the learner
for one.

We took the honest third option: `fetchSwapQuote` takes `userWalletAddress` as a
**required** parameter (`endpoints.ts`) with the reason written at the call site,
so that nobody later "simplifies" it into a hardcoded constant. The rule we hold
is that any address used is one the learner can see and was told about — never a
silently generated one.

**Suggestion.** Document `userWalletAddress` as required on this endpoint, and say
which routes need it and why. Better: support a `quoteOnly` / zero-address form for
purely informational quotes. Analytics, education and read-only clients cannot have
a wallet by definition, and they are a large share of who calls a *quote* endpoint
rather than a *swap* endpoint.

### 5.8 The API is not reachable from every network, and the failure looks like our bug

**Severity: high, and entirely outside the code.** `[TEAM]`

During the build, `web3.binance.com` intermittently failed to resolve from our
development network — an ISP router at `192.168.1.1` running the resolver. The
behaviour, observed repeatedly:

```text
$ getent ahosts web3.binance.com
   (no output — no A records returned)

$ curl https://web3.binance.com/build/api/v1/dex/market/rwa/tokens
   curl: (6) Could not resolve host: web3.binance.com

# Meanwhile, from the same machine, seconds apart:
$ node -e 'fetch(...)'      →  fetch failed / getaddrinfo EAI_AGAIN
```

Straight after a resolver flush, a loop of 20 lookups returned 20 successes —
because systemd-resolved was answering from cache. Fresh queries failed. That
detail matters more than it looks: **the cache made the problem look
intermittent when it was not**, and it made a clean diagnostic run possible while
every real request was still dying.

Why this belongs in a DX report rather than in our bug tracker: from inside the
code, this is indistinguishable from an authentication failure, a timeout, or a
malformed request. It produces `fetch failed` — a message that names neither DNS
nor the host. We lost real time treating a network fault as an application fault,
and the first two fixes we attempted were in the wrong file.

**Suggestion.** The API's own error surface cannot fix a resolver. What would
help is documentation: a **connectivity pre-flight** alongside the auth docs —
the exact `host`/`dig`/`curl` commands to run before writing any code, and what a
good answer looks like. If reachability from some regions is a known condition,
saying so would save every affected team the same afternoon. A secondary measure
that costs nothing: make sure `EAI_AGAIN` and `ENOTFOUND` are distinguishable in
any reference client, because "the host does not resolve" and "the host refused
you" call for completely different responses and currently arrive looking the
same.

---

## 6. Metrics

`[TEAM]` — **the timing and volume cells need a measured session.** We have made
live calls and read their responses; that is what §2 and §3 are made of. But we
made them one at a time, by hand, while working out why nothing worked — which
measures correctness and not performance. Latency and volume are left blank rather
than estimated: an invented number in a DX report is worse than a missing one,
because the whole 25% is scored on evidence that you actually built with the API.

Two rows are **not** blank, because §5 supports them.

| Metric | Value |
| --- | --- |
| Total API calls made during the build | _fill in_ |
| Median latency, `/rwa/tokens` | _fill in_ |
| Median latency, `/rwa/price` | _fill in_ |
| Median latency, `/rwa/underlying-market` | _fill in_ |
| Largest single response (bytes) | _fill in_ |
| How many RWA tokens the list returned | _fill in_ — the brief's own example claims 709; we have never confirmed it |
| Rate limits actually encountered | _fill in_ — and whether registration raised them |
| Time from key issuance to first successful signed call | _fill in_ — **the most valuable number in the report**, because it is the one figure that captures the whole discovery problem at once, signing trap and parameter trap together |
| Time from first call to a complete integration | _fill in_ |
| Most-used endpoint | `/rwa/tokens`. It backs the catalogue, and every symbol-addressed call resolves through it first. `[CODE]` |
| Did any endpoint behave differently from its documentation? | **Yes — every one of them.** §5.2 has the detail: the chain parameter is `binanceChainId`, the identifiers are contract addresses rather than tickers, `/rwa/tokens` ignores the chain filter it accepts, and `/rwa/search` returns companies with the assets nested inside. Raw bodies in §2. |

Note there is no `/tx/simulate` row, though earlier drafts of this file had one.
The route does not exist (§2.3). Measuring it was never possible.

---

## 7. Specific suggestions, ranked by leverage

1. **Put the `/build` prefix in the error body for `40102`.** The service already
   reconstructs the signed path to verify it, so it knows whether the path it
   received began with `/build`. One conditional string in an error response
   removes the most-documented failure mode in this API.
2. **Return the expected request path on any signature failure.** Generalises #1
   to all six causes and costs nothing at verification time.
3. **Publish the parameter names and the identifier type for every endpoint.**
   This is the one we would rank first if the list were ordered by how much time
   it would have saved us. Every parameter name we sent was wrong, and every one
   of them failed *silently or misleadingly* — `chainId` is not a synonym for
   `binanceChainId`, `symbol` is not a synonym for `tokenContractAddresses`, and
   the error that eventually revealed this arrived with HTTP 200. A table of
   `endpoint → parameters → type` would have prevented essentially all of §5.2.
4. **Publish an example response per endpoint** (JSON Schema, OpenAPI, or just a
   captured fixture). This alone would have removed six fallback chains and a
   three-name guess from a small client.
5. **Add `priceUpdatedAt` to price and market responses.** Unlocks freshness-aware
   clients, which is most of them.
6. **Publish the business error-code table**, and state explicitly whether a
   non-zero `code` can accompany HTTP 200. We assume it can; we would rather not
   assume.
7. **Make the chain parameter a string everywhere**, or move Solana to its own
   parameter. `56` and `CT_501` cannot share one typed field.
8. **Add a copy-pasteable, complete, working signed request to the auth docs** —
   a `curl` with real header values and the pre-hash printed on the line above it.
   The existing formula block is correct and still took careful reading; a worked
   example removes the interpretation step entirely.
9. **Call out `X-OC-APIKEY`** (no hyphen between `API` and `KEY`) explicitly.
10. **Say what the `/build` path segment is for.** We still do not know whether it
    denotes an environment, an API generation, or a gateway. Knowing would tell us
    whether it can ever change.

**A suggestion we are withdrawing.** Earlier drafts of this list asked for a batch
price endpoint, on the reasoning that a priced list of N holdings must cost N
requests. That endpoint already exists: `/rwa/price` takes
`tokenContractAddresses`, comma-joined. We are leaving the withdrawal here rather
than quietly deleting it, because the reason we got it wrong is the reason this
whole report exists — we could not find the parameter list, so we assumed the
shape and then argued from the assumption. See §5.3.

---

## 8. Overall assessment

**7 / 10.**

This was provisionally a 7 pending live access, and live access confirmed the
score rather than moving it — but it moved *which half* the deduction is for. The
part we could not test without a key was the signing scheme, and that turned out
to be exactly as sound as it read: our implementation was correct on the first
attempt and has never once returned a `40102`. The part we assumed would be
straightforward — what the endpoints actually accept and return — is where
everything went wrong, in the way §5.2 describes.

The authentication scheme is well-designed and the underlying primitives are
sound — a stateless HMAC over a documented concatenation, with a timestamp format
the language already produces and a small, orthogonal header set. The RWA
namespace is coherent, and returning the on-chain price alongside the reference
price is a genuinely good API decision: it is what makes a product like this one
possible at all, and it is the reason our whole course has something to teach.

What holds it below 9 is diagnosability. The API's failure modes are
under-specified relative to its success modes: one error code covers six
mistakes, the response shape is not pinned well enough to parse without guessing,
and the freshness of a price is not expressed. Every one of those is a small
documentation or response-shape change rather than a redesign — suggestions 1, 3
and 4 are each under a day's work and would together move this to a 9.

We would build on it again, and that is not a polite closing line. The primitives
are right, the namespace is coherent, and the price endpoint returns the exact
pair of numbers a product like ours exists to explain. What is missing is
documentation depth, and that is the cheapest class of problem there is: three
tables and a directory of captured response fixtures would take this from a 7 to a
9 without a line of service code changing.

---

## 9. Repository references

Everything marked `[CODE]` above:

| Claim | File |
| --- | --- |
| Signing scheme, `assertSignable` guard, query serialisation | `src/lib/binance/signature.ts` |
| Signed client, `/build` prefix, dual success signalling, error mapping | `src/lib/binance/client.ts` |
| The six endpoint wrappers, `binanceChainId`, caching policy, response-shape fallbacks | `src/lib/binance/endpoints.ts` |
| Which upstream field names we verified, and which we scan for | `src/lib/binance/schemas.ts` |
| Reading the two free-form "underlying" payloads, and what is unverified about them | `src/lib/binance/fundamentals.ts` |
| The seam where a provider failure becomes a labelled fallback | `src/server/services/asset-service.ts` |
| Known-answer pre-hash, one test per failure mode | `tests/unit/binance-signature.test.ts` |
| Provenance model, "never real-time", missing-timestamp fallback | `src/lib/provenance.ts` |
| Environment contract, `/build` documented as mandatory | `.env.example` |
| Persistence design, why simulated transactions have no tx hash | `prisma/schema.prisma` |
