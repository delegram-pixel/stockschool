# Architecture

Why the code is shaped this way. Each section states the decision, the reason, and
what it costs — a decision without a stated cost is usually one that has not been
thought about.

---

## 1. Layering

```text
src/app/**            routes, layouts, metadata          (server by default)
src/components/**     presentation                        (client only where needed)
src/server/services   the application seam                (server only)
src/lib/providers     translate a vendor into our types   (server only)
src/lib/binance       the vendor's wire protocol          (server only)
src/lib/{calculations,learning,simulation,blockchain}    pure domain logic
src/types             the shared vocabulary
```

Dependencies point **downward only**. Nothing in `lib/` imports from
`components/`, and no component talks to the Binance client directly. The rule
exists so a vendor change is a change in one layer rather than a search across
the codebase.

`src/lib/binance/*` is the only place that knows Binance exists — the URL shapes,
the signature, the header names, the response envelopes. `src/lib/providers/*`
turns a Binance payload into a `TokenizedStock` and nothing above it can tell
which vendor produced the record.

---

## 2. The data seam

`src/server/services/asset-service.ts` is the single seam between "where data
comes from" and "what the UI renders". Every page reads assets through it. It has
exactly three outcomes, and the third one is the reason the product is reviewable:

| Situation | What is returned | What the user sees |
| --- | --- | --- |
| Credentials present, upstream answers | live data | "Live data" badge, freshness time |
| Credentials present, upstream fails | sample data **+ a `degradation`** | Sample data badge **and** a banner naming the failure |
| Credentials absent | sample data, no error | A standing "sample data" notice |

The middle row is the important one. A provider outage degrades into labelled
sample data with an explanation, never into a silent substitution. Substituting
mock values under a "live" label is the single thing the PRD forbids above all
else, so the failure path is designed to be *visible* rather than graceful.

`unconfigured` is modelled as a distinct state from `degradation`, because they
are genuinely different: one is a misconfiguration to fix, the other is a normal
way to run the app. A judge who clones the repository with no `.env` gets the
third row — a complete, honest product.

`cache()` from React wraps each entry point. Requests are deduplicated within a
render pass, so a page component and its `generateMetadata` do not cause two
upstream calls for the same asset.

### Why the service returns a `Result` instead of throwing

`src/lib/binance/client.ts` returns `Result<T>` (`{ ok: true, data } | { ok: false,
error }`). A thrown exception has to be caught somewhere and the catch site rarely
knows what the user should be told. A returned value forces the caller to decide,
and the compiler enforces it. Nothing in the data path throws.

---

## 3. Provenance

Every externally-sourced object carries a `DataProvenance`:

```ts
type DataProvenance = {
  source: "live" | "cached" | "mock";
  updatedAt: string | null;   // of the underlying data, not our fetch
  stale: boolean;
  note?: string;
};
```

It is a **required field, not an optional one**. An optional field gets omitted
under deadline pressure; a required field has to be supplied at construction.

The rules live in `src/lib/provenance.ts` as checkable predicates rather than as
conventions, because "never present mock as live" is easy to state and easy to
violate one `if` at a time. The sharpest of them:

```ts
assertNotPresentedAsLive(provenance, context)
```

It asserts that mock provenance carries a **null `updatedAt`**. The reasoning is
worth recording: the realistic way sample data gets mistaken for live data is not
a wrong `source` field — it is a *timestamp*. Every freshness indicator renders
from `updatedAt`, so a sample record carrying a fresh timestamp displays "Updated
3 seconds ago" no matter what `source` says. The label and the timestamp have to
agree, so both are asserted.

`freshnessSentence()` deliberately never says "real-time". We do not have the
upstream guarantees to make that claim, so the vocabulary does not contain it.

### A known limitation, stated plainly

`updatedAt` is documented as the timestamp *of the underlying data*, and
`asset-service.ts` populates it from `new Date()` — our fetch time. Those are not
the same thing, and the gap is not our bug to fix: the price responses we model do
not carry a source-generated market timestamp we can rely on.

So a price the upstream computed minutes ago can render as "Updated 3 seconds
ago". The indicator is measuring our cache, not the market. `freshnessSentence()`
falls back to *"Update time not reported by the source."* when no timestamp
exists, and that is the honest floor. The fix belongs upstream — see
`DX_NOTES.md` §5.4 — but the discrepancy between the type's comment and the
service's behaviour is recorded here rather than quietly left for someone to
discover.

---

## 4. The server/client boundary

**Server components render prose. Only progress-aware leaves are client
components.**

A lesson is thousands of words of content plus a handful of interactive widgets.
If the lesson component were a client component, every paragraph of the course
would ship to the browser as part of the JavaScript bundle. So the split is drawn
at the leaf: the lesson body renders on the server, and the things that need
`localStorage` — the quiz, the mission, the completion control, the progress
spine — are client components embedded in it.

The consequence to be aware of: **server components cannot pass functions or
class instances across the boundary.** Progress state also lives in the browser,
so a server component cannot know whether a lesson is complete — which is exactly
the information a lesson *card* wants in order to render its state.

The resolution is a deliberate projection. `toPathLesson()` in
`src/lib/learning/progress.ts` trims a full lesson to a `PathLesson`: the fields
the path needs, and no prose. The server sends that projection, and the client
computes unlock state from it. Eight lesson cards therefore cost a few hundred
bytes each instead of a few hundred kilobytes.

This is the pattern to reach for whenever a client component wants "just one
field" from a server object: project it on the server, and let the projection's
type be the contract.

---

## 5. Money

**`Decimal`, never `number`, anywhere near a price.**

IEEE-754 binary floating point cannot represent `0.1` exactly, so
`0.1 + 0.2 !== 0.3`. In a teaching product whose central exhibit is the *gap*
between two prices, that error is not cosmetic — it is the lesson. A spread of
`0.0000000000000004%` rendering as parity, or a simulated P/L that drifts with
the order of operations, would teach the wrong thing.

So:

- `src/lib/calculations/money.ts` owns all arithmetic. Values cross boundaries as
  **decimal strings**, and are parsed into `Decimal` only to be operated on.
- The database stores `DECIMAL(p, s)`, never `FLOAT`.
- A `null` price means *"not provided"* and is never coerced to `0`. Zero is a
  real price; absence is not. This distinction is load-bearing for the price-gap
  display, which must not compute a spread against a missing value.

`number` is still used where it is genuinely safe — counts, indices, pixel
values, percentages already rounded for display.

---

## 6. Persistence

**The browser is the source of truth. The database is a mirror, and only for
progress.**

That is not the usual shape, and it is the one the product needs. The PRD requires
that a learner starts immediately with no sign-up, so identity is a cookie and the
first write always lands in `localStorage`. The database is then an *additive* copy
that survives a cleared browser or a second device. Nothing renders from the
database that could not be rendered without it — which is why the whole product
works with no `DATABASE_URL` at all.

### The mirror is monotonic

Every write in `progress-repository.ts` can only move a learner forward: status
merges by taking the furthest, a quiz score by the higher, a completion date by the
earlier, a mission attempt count by the larger.

That rule is not fussiness. The sync fires on every progress mutation from every
device and every tab, so payloads arrive out of order almost by construction — a
laptop that was asleep for a week will happily POST a store in which lesson 04 was
never finished, *after* the phone that finished it. Last-write-wins would silently
un-complete the lesson. Taking the maximum is the only merge that cannot lose
something a learner earned.

Forgetting therefore needs its own verb — `DELETE /api/progress`, fired by
`resetProgress` — because it is the one operation the repository must never be able
to perform by accident.

**Identity without a login wall.** A `User` row is created on first visit keyed by
an opaque `sessionKey` from an httpOnly cookie, with `email` left null. Two
requests can race to create it, so the create is allowed to fail and the lookup
repeated — losing that race is normal, not exceptional. When real authentication
arrives, you claim the existing row by setting `email`: no data migration, and no
learner loses their progress by signing up.

**Content lives in version control, not the database.** `LessonProgress` stores
*state* keyed by `lessonSlug`; the lesson's words live in `src/content/lessons/`.
One source of truth for the material, and a lesson is edited in a pull request
rather than an UPDATE.

**Quiz scores are re-validated on the server.** `QuizAttempt` is the authoritative
record, and `POST /api/quiz` is the only thing that writes it. A client-supplied
score is not evidence of anything, so `recordQuizAttempt()` never sees one — it
receives a percentage the server recomputed from the learner's raw answers.
`LessonProgress.bestScorePct` is a denormalised copy for fast display, and the
attempts remain the source of truth. Answering a quiz starts a lesson but does not
finish it; finishing is the learner's own call.

**A simulated transaction has no transaction hash.** `SimulationTransaction`
deliberately has no `transactionHash` column. Inventing a hash would imply a real
chain transaction occurred. What it records instead is `priceSource`
(`"onchain" | "reference"`) and `priceTimestamp`, so a hypothetical result stays
explainable after the fact — which is the whole pedagogical point of keeping the
history at all.

### The simulator is deliberately not mirrored

The `SimulationPortfolio`, `SimulationPosition` and `SimulationTransaction` models
exist in the schema, and no code writes to them yet. That is an asymmetry, so the
reason is stated here rather than left to be discovered.

Progress is mirrored because a quiz score needs a server to be *authoritative* —
the client cannot be trusted with its own grade. A simulated trade has no such
requirement: it is a personal scratchpad whose arithmetic is recomputed locally
from a transaction log the learner can see and reset. Nothing is protected by
storing it server-side, and the models exist for the same reason `LessonProgress`
did — so the data model has a home before the feature that needs it.

The consequence is real and worth naming: **a simulated portfolio does not follow a
learner to a second device, and clearing the browser loses it.** The simulator says
so at the point of use.

### When `DATABASE_URL` is not set

`src/lib/storage/local.ts` persists to `localStorage` and the UI shows a "device
only" badge. Nothing crashes and nothing is lost silently. This is the state a
judge clones into, and it is a complete product rather than a degraded one.

### The hydration rule

Progress lives in the browser, so the server cannot render it. Rendering `0 / 8`
on the server and `3 / 8` on the client is a hydration mismatch, and React will
complain.

The rule: **render an absolute or empty value on first paint, and the real value
after mount**, gated on a `hydrated` flag from the provider. So the progress
headline renders `— / 8` until hydration, then `3 / 8`. It is a deliberate visual
trade — a brief em-dash is better than a mismatch — and it is applied uniformly
rather than per-component, which is why `hydrated` is threaded through the
progress-aware leaves.

---

## 7. Styling

### Tokens live in exactly one file

Every colour, font, radius, shadow and easing is a CSS custom property in
`src/app/globals.css` under `@theme`. No component defines a colour. Tailwind v4
is CSS-first: `@theme` *generates* the utility classes, so `--color-teal` is what
makes `bg-teal` exist.

Three blocks define the palette: `@theme`, a `prefers-color-scheme` media block
guarded by `:root:not([data-theme="light"])`, and `:root[data-theme="dark"]`. The
two dark blocks must stay **identical in token names and values**, because
`data-theme="dark"` is the switch a reader actually flips — a value living only in
the media query renders for people who never touch the switch and is missing for
everyone who does. That bug shipped once; a test now prevents it.

### Contrast is enforced, not asserted

`tests/unit/design-tokens.test.ts` computes WCAG 2.2 relative luminance from the
stylesheet itself and fails the build if any rendered pair drops below 4.5:1 in
either theme. Each row in the table names the call site it exists for, so a
failure points at a screen rather than at a hex value.

Two consequences worth knowing, because both were found this way:

1. **`--color-ink-subtle` is the tier that pins the palette.** It is the lightest
   ink in use, and it renders on `surface-sunken`, which is the darkest surface a
   caption ever sits on. That pair is the binding constraint on the whole light
   theme.
2. **A hard-coded `white` cannot follow a theme switch.** `text-white` on
   `bg-teal` reads at 5.5:1 in light mode and 2.6:1 in dark, where the fill lifts
   to a bright teal. Both look deliberate; only one is legible. Filled controls
   therefore use `text-ink-inverse`, which is near-white in light mode and
   near-black in dark. A source-level tripwire fails the test suite if a bare
   `white` or `black` utility appears in `src/`.

### `cn` is a plain join, and that matters

```ts
// src/lib/utils.ts
export function cn(...classes) { return classes.filter(Boolean).join(" "); }
```

There is **no `tailwind-merge`**. So `cn("p-4", "p-6")` emits both classes and the
winner is decided by generated-stylesheet order — a coin flip, not a rule.

This is a real constraint, and it is handled structurally rather than by
convention: **conflicting utilities are never passed to `cn` together.** Where a
component needs to switch behaviour that a `className` override would naturally
express, it takes a **prop** instead. `PageHeader`'s `divider` prop is the worked
example, and its docblock says why — a page whose divider appears or disappears
depending on stylesheet order is not a thing to debug twice.

---

## 8. Validation and errors

**Zod at every trust boundary.** Anything arriving from outside — an API
response, a URL parameter, a request body — is parsed, never cast. A changed
upstream shape becomes a handled `INVALID_RESPONSE` rather than a wrong number
rendered confidently.

`endpoints.ts` validates each RWA record with `rawRwaToken.safeParse` and keeps
only the successes, so one malformed record in a list of 700 does not discard the
other 699.

**Errors are structured and user-safe.** `ProviderError` carries a stable `code`,
an optional upstream `detail` for server logs only, and a `message` written for a
person. Raw upstream text never reaches the UI — `messageForStatus()` deliberately
says what the user can *do* ("Too many requests right now. Showing the last known
data.") rather than what broke.

`explainError()` turns a code into something actionable for whoever is running the
app, and is surfaced in the DX self-test panel. It is where the `/build` hint
lives, at the moment it is needed.

---

## 9. Security

The constraints, and the mechanism that enforces each:

| Constraint | Mechanism |
| --- | --- |
| Secrets never reach the browser | `BINANCE_WEB3_API_KEY` / `_SECRET` are unprefixed and read only in `src/lib/binance/client.ts`, which is server-only. Nothing `NEXT_PUBLIC_*` is secret. |
| No wallet keys or seed phrases | The product never asks for one. There is no code path that accepts one. |
| No real trades | `/dex/swap` and `/tx/broadcast` are not called. The simulator is arithmetic. |
| Chain interaction is read-only | `src/lib/blockchain/token-reader.ts` performs `eth_call` reads only — `name`, `symbol`, `decimals`, `totalSupply`. |
| Signatures are not a timing oracle | `safeEqual()` uses `timingSafeEqual` with a length check first, since `timingSafeEqual` throws on a length mismatch — which would turn a wrong signature into a 500 rather than a 401. |
| Baseline transport hardening | `next.config.ts` sets `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`. |

`assertSignable()` is also a security control, not just a DX one: it refuses to
sign a malformed request rather than transmitting a request whose signature is
wrong, so a bug cannot become a stream of authentication failures against a rate
limited endpoint.

`.env` is gitignored; only `.env.example` is committed, with empty values.

---

## 10. Testing

| Layer | Tool | What it covers |
| --- | --- | --- |
| Unit | Vitest + RTL | Money, signing, simulation, scoring, progress, token maths, provenance, design tokens |
| End-to-end | Playwright | The critical journey, desktop and mobile Chromium |

The unit tests are written **per mistake rather than per function** where a
function has a single opaque failure mode. The signing suite is the model: six
different errors all produce `40102 Invalid signature`, so there is one test per
way of getting it wrong — a missing `/build`, a `/buildfoo` that a naive prefix
check would wave through, a timestamp without milliseconds, a timestamp with a
`+02:00` offset, a GET with a body. Each test names the mistake it prevents.

The design-token test reads `globals.css` as text rather than importing it, so it
fails on the real stylesheet rather than on a build artefact.

---

## 11. Trade-offs we accepted

Recorded because a design document that lists only strengths is not a design
document.

- **The database is a mirror, not the source of truth.** Progress lives in
  `localStorage` first and reaches Postgres second, so the two can disagree for as
  long as a sync takes. Accepted because it is what makes the app work with no
  `.env`, which is worth more than the disagreement costs — and the monotonic merge
  in §6 makes convergence the only possible outcome.
- **A simulated portfolio does not leave the browser.** The schema models exist;
  nothing writes to them. Accepted because no part of a simulated trade needs a
  server to be authoritative, and the alternative is a networked write path behind
  a screen the learner is told is a scratchpad.
- **`ink-subtle` is a third grey tier.** It exists because two tiers could not
  serve both "quiet caption on canvas" and "caption on a sunken surface" at AA.
  Three greys is one more than the design wants; the alternative was a pair that
  fails contrast, which is not a trade.
- **No `tailwind-merge`.** Keeps `cn` trivial and the bundle small, at the cost of
  the structural discipline in §7. The `divider`-style prop pattern is the tax.
- **`updatedAt` measures our fetch, not the market.** Documented in §3 and
  reported upstream. It is the honest option available, not the correct one.
- **No batch pricing.** A priced watchlist is N requests. Acceptable for a
  teaching product with a handful of assets; recorded in `DX_NOTES.md` §5.3 as the
  limitation it is.
- **`chainId` is sometimes a string.** Solana's `CT_501` is not numeric, so the
  type cannot be `number` throughout.
