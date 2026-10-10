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

**Our honest position on live testing.** The integration is complete: a signed
server-only client, eight typed endpoint wrappers, response validation, and a
provenance model that labels every byte with where it came from. The signing
scheme is pinned by a unit-test suite written per-mistake rather than
per-function. **We have not been issued API credentials, so we have never made a
live call, and we report no latency, no call counts, and no upstream behaviour we
did not observe.** Two dozen `[TEAM]` cells below are marked for exactly that,
and they need a single sitting with a key to fill.

That caveat is the honest one, and it is also the more useful report: what
follows is what it is actually like to *implement* against this API from the
documentation alone, which is the experience a hackathon team has on day one.

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

**Eight endpoints** across all three API groups, against a requirement of three.
Paths are as the hackathon brief writes them in §5; the signed request path
carries the additional `/build` prefix (see §3).

### RWA Data — five of five available

| # | Endpoint | Where it is called | What it teaches |
| --- | --- | --- | --- |
| 1 | `GET /api/v1/dex/market/rwa/tokens` | `src/lib/binance/endpoints.ts:45` | The catalogue. Populates Explore. |
| 2 | `GET /api/v1/dex/market/rwa/search` | `src/lib/binance/endpoints.ts:68` | Find a stock by ticker or company name. |
| 3 | `GET /api/v1/dex/market/rwa/price` | `src/lib/binance/endpoints.ts:92` | **The key call.** Returns on-chain *and* reference price — the premium the whole course is about. Cached 30s. `[CODE]` |
| 4 | `GET /api/v1/dex/market/rwa/underlying-profile` | `src/lib/binance/endpoints.ts:110` | Company behind the token: sector, industry, description. Cached 1h. |
| 5 | `GET /api/v1/dex/market/rwa/underlying-market` | `src/lib/binance/endpoints.ts:132` | Fundamentals: market cap, volume, session state. Powers the "market hours" lesson. |

### Trading — one of two

| # | Endpoint | Where it is called | What it is for |
| --- | --- | --- | --- |
| 6 | `GET /api/v1/dex/aggregator/quote` | `src/lib/binance/endpoints.ts:171` | "What would this swap cost, and what is the route?" Powers the slippage lesson. **Never executed.** |

### Wallet & Transaction — two of three

| # | Endpoint | Where it is called | What it is for |
| --- | --- | --- | --- |
| 7 | `GET /api/v1/wallet/token-balances` | `src/lib/binance/endpoints.ts:218` | Read-only holdings. No wallet connection, no signature, no key. |
| 8 | `POST /api/v1/tx/simulate` | `src/lib/binance/endpoints.ts:262` | Dry-run a transaction so a learner can see what the chain *would* say. |

### Two endpoints we deliberately did not use

- **`GET /api/v1/dex/swap`** (build swap transaction) and
  **`POST /api/v1/tx/broadcast`** (send transaction).

This is a scope decision, and we would rather state it than have it read as an
oversight. StockSchool's simulator must **never execute a real trade** — that is
a hard requirement in our own PRD, and it is what makes the product safe to hand
to someone who has never owned a token. Endpoints that construct and broadcast
signed transactions are the two that would let a learner lose money by
misclicking a teaching tool. The product stays read-and-simulate, and we took the
lower endpoint count rather than the higher one.

Supporting chains: BSC (56, default), Ethereum (1), Base (8453), and Solana
labelled `CT_501`. `[CODE]` — `src/lib/binance/endpoints.ts:24-38`.

---

## 3. Authentication — and the trap

The scheme, exactly as documented:

```
preHash   = timestamp + method + requestPath + body
signature = Base64( HMAC-SHA256( preHash, secretKey ) )
```

Headers on every request: `X-OC-APIKEY`, `X-OC-TIMESTAMP`, `X-OC-SIGN`.

### A complete, checkable pre-hash `[CODE]`

This is a real assertion from `tests/unit/binance-signature.test.ts:26-34`, not an
illustration:

```
timestamp   : 2026-10-09T12:00:00.000Z
method      : GET
requestPath : /build/api/v1/dex/market/rwa/price?chainId=56&symbol=NVDA
body        : (empty — a GET has no body)

preHash     : 2026-10-09T12:00:00.000ZGET/build/api/v1/dex/market/rwa/price?chainId=56&symbol=NVDA
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

### 5.2 The response shape is not fully pinned by the documentation

**Severity: high, and the most concrete thing in this report.** `[CODE]`

We could not write our parsers against a documented schema, because we could not
establish one with confidence. The evidence is in our own code — these are the
defensive fallback chains we ended up writing, each one a guess at which key name
upstream actually uses:

```ts
// src/lib/binance/endpoints.ts
object.toAmount   ?? object.outAmount   ?? object.amountOut      // :193
r.symbol          ?? r.tokenSymbol                               // :233
r.address         ?? r.contractAddress  ?? r.tokenAddress         // :234
r.balance         ?? r.amount           ?? r.value                // :239
object.gasUsed    ?? object.gas                                   // :293
object.revertReason ?? object.reason    ?? object.errorMessage     // :294
```

That is not defensive programming for its own sake; it is six places where we
could not determine the contract. `object.success ?? object.simulateSuccess ??
object.status` for `tx/simulate` is three candidate names for *whether the
simulation succeeded*, which is the one field that endpoint exists to return.

The consequence is that we cannot distinguish "we parsed it correctly" from "one
of our guesses happened to hit." A silent wrong guess produces a wrong number in
an educational product, which is worse than a crash — a crash is at least honest.

**Suggestion.** Publish a JSON Schema or OpenAPI fragment per endpoint. This does
not need to be generated or maintained by hand — a captured example response per
endpoint would be enough for a client to pin the shape, and it would remove
essentially all of section 5.2. Second-best: stable field names across endpoints
(`tokenAddress` in one place and `address` in another, with `contractAddress` as a
third spelling of the same concept within one endpoint, is expensive for a client
to absorb).

### 5.3 No batch price endpoint, so a watchlist is an N+1

**Severity: medium.** `[DOC]` `/rwa/price` takes one `symbol`. A learner's
watchlist of N stocks is therefore N requests, and so is any page that wants to
show a priced list. There is no documented bulk form.

Our own mitigation was to lean on `/rwa/tokens` returning the catalogue in one
call and to cache `/rwa/price` at 30 seconds (`endpoints.ts:99`), which is enough
for a teaching product with a handful of assets. It would not be enough for the
dashboard-shaped products this API is presumably meant to enable, where the
natural page is "my twenty holdings, priced, every few seconds."

**Suggestion.** `POST /api/v1/dex/market/rwa/price-batch` accepting up to ~100
symbols and returning an array. Order-of-magnitude fewer calls, and it makes the
rate limit a non-issue for exactly the use case the API is for.

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
error taxonomy. `codeToErrorCode()` in `client.ts:207-211` is our guess, and it
should not have to be a guess.

---

## 6. Metrics

`[TEAM]` — **every cell here needs a real session with credentials.** They are
left blank rather than estimated, because an invented number in a DX report is
worse than a missing one: the whole 25% is scored on evidence that you actually
built with the API.

| Metric | Value |
| --- | --- |
| Total API calls made during the build | _fill in_ |
| Median latency, `/rwa/tokens` | _fill in_ |
| Median latency, `/rwa/price` | _fill in_ |
| Median latency, `/tx/simulate` | _fill in_ |
| Largest single response (bytes) | _fill in_ |
| How many RWA tokens the list returned | _fill in_ — the brief's own example claims 709; we have never confirmed it |
| Rate limits actually encountered | _fill in_ — and whether registration raised them |
| Time from key issuance to first successful signed call | _fill in_ — **this is the single most valuable number in the report**, because it is the one that measures the 40102 problem |
| Time from first call to a complete integration | _fill in_ |
| Most-used endpoint | _fill in_ |
| Did any endpoint behave differently from its documentation? | _fill in_ — with the exact response |

---

## 7. Specific suggestions, ranked by leverage

1. **Put the `/build` prefix in the error body for `40102`.** The service already
   reconstructs the signed path to verify it, so it knows whether the path it
   received began with `/build`. One conditional string in an error response
   removes the most-documented failure mode in this API.
2. **Return the expected request path on any signature failure.** Generalises #1
   to all six causes and costs nothing at verification time.
3. **Publish an example response per endpoint** (JSON Schema, OpenAPI, or just a
   captured fixture). This alone would have removed six fallback chains and one
   three-name guess from a small client.
4. **Add `priceUpdatedAt` to price and market responses.** Unlocks freshness-aware
   clients, which is most of them.
5. **Add a batch price endpoint.** Makes a priced watchlist one request instead of
   N.
6. **Publish the business error-code table**, and state explicitly whether a
   non-zero `code` can accompany HTTP 200. We assume it can; we would rather not
   assume.
7. **Make `chainId` a string everywhere**, or move Solana to its own parameter.
8. **Add a copy-pasteable, complete, working signed request to the auth docs** —
   a `curl` with real header values and the pre-hash printed on the line above it.
   The existing formula block is correct and still took careful reading; a worked
   example removes the interpretation step entirely.
9. **Call out `X-OC-APIKEY`** (no hyphen between `API` and `KEY`) explicitly.
10. **Say what the `/build` path segment is for.** We still do not know whether it
    denotes an environment, an API generation, or a gateway. Knowing would tell us
    whether it can ever change.

---

## 8. Overall assessment

**7 / 10, provisional pending live access.**

The authentication scheme is well-designed and the underlying primitives are
sound — a stateless HMAC over a documented concatenation, with a timestamp format
the language already produces and a small, orthogonal header set. The RWA
namespace is coherent, and returning the on-chain price alongside the reference
price is a genuinely good API decision: it is what makes a product like this one
possible at all, and it is the reason our whole course has something to teach.

What holds it below 9 is diagnosability. The API's failure modes are
under-specified relative to its success modes: one error code covers six
mistakes, the response shape is not pinned well enough to parse without guesses,
and the freshness of a price is not expressed. Every one of those is a small
documentation or response-shape change rather than a redesign — suggestions 1, 3
and 4 are each under a day's work and would together move this to a 9.

We would build on it again. The 40102 problem is real and famous, but it is a
one-time cost per team, and it is the kind of cost that a single error-message
change eliminates permanently.

---

## 9. Repository references

Everything marked `[CODE]` above:

| Claim | File |
| --- | --- |
| Signing scheme, `assertSignable` guard, query serialisation | `src/lib/binance/signature.ts` |
| Signed client, `/build` prefix, dual success signalling, error mapping | `src/lib/binance/client.ts` |
| The eight endpoint wrappers, caching policy, response-shape fallbacks | `src/lib/binance/endpoints.ts` |
| Known-answer pre-hash, one test per failure mode | `tests/unit/binance-signature.test.ts` |
| Provenance model, "never real-time", missing-timestamp fallback | `src/lib/provenance.ts` |
| Environment contract, `/build` documented as mandatory | `.env.example` |
| Persistence design, why simulated transactions have no tx hash | `prisma/schema.prisma` |
