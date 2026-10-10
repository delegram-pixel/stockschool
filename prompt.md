# STOCKSCHOOL — SENIOR SOFTWARE ENGINEERING BUILD PROMPT

You are the lead senior software engineer responsible for designing and implementing **StockSchool**, a production-quality interactive learning platform for tokenized stocks on BNB Smart Chain.

You are not building a static educational website.

You are building a modern interactive product where education, real tokenized-stock infrastructure, data visualization, simulation and blockchain exploration work together.

---

# 1. PRODUCT VISION

StockSchool helps beginners understand tokenized stocks through:

```text
LEARN
   ↓
EXPLORE
   ↓
SIMULATE
   ↓
UNDERSTAND ON-CHAIN
```

The product must make blockchain concepts understandable without assuming that the user already knows:

* blockchain
* wallets
* smart contracts
* tokens
* DEXs
* gas
* market infrastructure
* tokenized securities

The application should feel like a combination of:

* premium education product
* interactive fintech application
* visual learning laboratory

It must NOT feel like a generic crypto dashboard.

---

# 2. CRITICAL HACKATHON REQUIREMENT

At least one of these must be central to the application:

* bStocks
* Ondo
* xStocks

Do not treat the provider as an isolated "API integration page."

The tokenized-stock infrastructure must directly power the learning experience.

The same real asset should be usable as:

```text
Learning example
      ↓
Explorer asset
      ↓
Simulation asset
      ↓
On-chain investigation
```

Current BNB Chain hackathon infrastructure includes RWA Data, Market, Trading, Transaction, Wallet and DeFi APIs.

Research the current official documentation before implementing provider-specific API calls.

Do not invent endpoints.

Do not assume undocumented API behavior.

---

# 3. IMPORTANT DEVELOPMENT RULE

Use **Yarn**, not npm.

All documentation, scripts and setup instructions must use Yarn.

Examples:

```bash
yarn install
yarn dev
yarn build
yarn lint
yarn test
```

Do not generate:

```bash
npm install
npm run
```

---

# 4. TECHNOLOGY STACK

Use a modern TypeScript-first stack.

Recommended architecture:

### Frontend

* Next.js
* React
* TypeScript
* App Router
* Tailwind CSS
* shadcn/ui where appropriate
* Lucide icons
* Framer Motion only where motion improves UX

### Data

* TanStack Query where client-side server data caching is appropriate
* Zod for runtime validation

### Charts

Use a maintained React-compatible charting library.

Prefer a lightweight implementation that works well with responsive layouts.

### Blockchain

Use:

* wagmi
* viem

Do not use raw:

```typescript
window.ethereum
```

as the application's primary wallet abstraction.

### Persistence

Use PostgreSQL + Prisma if persistent user progress is required.

Keep the database architecture modular.

### Authentication

Authentication is optional for the first anonymous learning experience.

Users should be able to explore the product without creating an account.

If persistent progress requires authentication, implement authentication without blocking the initial learning experience.

---

# 5. ARCHITECTURE

Use a clean architecture.

Suggested structure:

```text
src/
  app/
    page.tsx

    learn/
      page.tsx
      [slug]/
        page.tsx

    explore/
      page.tsx

    stocks/
      [symbol]/
        page.tsx

    simulate/
      page.tsx

    onchain/
      page.tsx
      [address]/
        page.tsx

    progress/
      page.tsx

  components/
    ui/
    learning/
    stocks/
    charts/
    simulator/
    onchain/
    navigation/

  lib/
    api/
    blockchain/
    providers/
    validation/
    simulation/
    learning/

  server/
    services/
    repositories/

  types/

  content/
    lessons/
```

Adjust this structure when necessary, but maintain clear boundaries.

---

# 6. PROVIDER ABSTRACTION

Never hard-code the entire application around one tokenized-stock provider.

Create a normalized internal model.

Example:

```typescript
type TokenizedStock = {
  id: string
  provider: "bstocks" | "ondo" | "xstocks"
  name: string
  companyName: string
  symbol: string
  underlyingSymbol?: string
  blockchain: string
  contractAddress?: string
  price?: number
  referencePrice?: number
  priceDifference?: number
  priceDifferencePercent?: number
  marketStatus?: MarketStatus
  sector?: string
  updatedAt: string
}
```

Create provider interfaces.

```typescript
interface TokenizedStockProvider {
  getAssets(): Promise<TokenizedStock[]>
  getAsset(symbol: string): Promise<TokenizedStock | null>
  getPrice(symbol: string): Promise<PriceData>
  getMarketStatus(symbol: string): Promise<MarketStatus>
}
```

Implement the first provider using the current official BNB Chain API/documentation.

Keep other providers pluggable.

---

# 7. DATA INTEGRITY

Never fake live data.

Never display:

```text
Live
```

if the application is actually showing mock data.

Every externally sourced data object should have freshness information.

Example:

```typescript
type DataStatus = {
  source: "live" | "cached" | "mock"
  updatedAt: string
  stale: boolean
}
```

UI should communicate stale data.

Example:

```text
Updated 32 seconds ago
```

or:

```text
Live data temporarily unavailable
Showing last successful update
```

---

# 8. LEARNING ENGINE

Lessons should be data-driven rather than hard-coded into individual page components.

Create a content model.

Example:

```typescript
type Lesson = {
  id: string
  slug: string
  title: string
  description: string
  difficulty: "beginner" | "intermediate"
  estimatedMinutes: number
  order: number
  sections: LessonSection[]
}
```

Possible section types:

```typescript
"text"
"diagram"
"interactive"
"example"
"mission"
"quiz"
"reflection"
```

---

# 9. INTERACTIVE LEARNING COMPONENTS

Build reusable components.

At minimum:

### TokenExplainer

Visually explain:

```text
Traditional asset
      ↓
Tokenization
      ↓
Blockchain token
```

---

### PriceComparison

Display:

```text
Reference Price
$180.00

On-chain Price
$183.60

Difference
+$3.60

Premium
+2.00%
```

Allow users to interact with the numbers.

---

### MarketHoursTimeline

Visually compare traditional market availability with blockchain/on-chain availability.

Do not make blanket claims that every tokenized stock is available 24/7.

Use provider-specific market status where appropriate.

---

### PortfolioSimulator

Allow users to:

* select assets
* allocate virtual capital
* simulate buys/sells
* inspect allocation
* inspect hypothetical P/L
* inspect transaction history

---

### TransactionExplorer

Explain:

```text
Wallet
↓
Transaction
↓
Smart Contract
↓
Token transfer
↓
Confirmation
```

Use real transaction data when available.

---

# 10. QUIZ SYSTEM

Create reusable quiz components.

Supported question types:

```text
multiple-choice
true-false
numeric
scenario
```

Example:

```text
Why might the on-chain price differ from a reference price?

A. Market conditions/liquidity
B. The blockchain changes the company's value
C. Tokens cannot have prices
D. Gas fees are always the cause
```

Questions should teach rather than simply test memorization.

---

# 11. LEARNING MISSIONS

Missions should make the product feel interactive.

Example:

## Mission: Find the Premium

Give the learner real data.

```text
Reference:
$180

On-chain:
$183.60
```

Ask them to calculate the difference.

Then explain the result.

---

# 12. STOCK EXPLORER

Build:

```text
/explore
```

Features:

* Search
* Sort
* Sector filtering
* Provider filtering
* Asset type filtering
* Market status
* Price
* Reference price
* Price difference

Asset cards should be visually simple.

Example:

```text
NVIDIA

NVDAB
bStocks

$182.40

Reference
$181.95

+0.25%

BNB Chain
```

Do not use red/green color as the only semantic indicator.

---

# 13. STOCK DETAIL PAGE

Build:

```text
/stocks/[symbol]
```

Sections:

### Overview

Asset identity.

### Price

On-chain vs reference.

### Provider

Who issued/provides the tokenized representation.

### Market

Market status and relevant timing.

### Blockchain

Network and contract information.

### Learn

Link directly to lessons explaining concepts relevant to this asset.

### On-chain

Link to the On-Chain Lab.

This page should connect the entire product together.

---

# 14. SIMULATOR

Route:

```text
/simulate
```

The user starts with virtual capital.

Example:

```text
$10,000 virtual balance
```

Do not imply that this is real money.

The simulator should support:

```text
BUY
SELL
HOLD
```

as simulation actions.

Store:

```text
timestamp
asset
action
quantity
price
virtual value
```

Calculate:

```text
portfolio value
cost basis
hypothetical P/L
allocation
```

Use precise arithmetic.

Do not use JavaScript floating point arithmetic for financial calculations where avoidable.

Use decimal-safe arithmetic.

---

# 15. ON-CHAIN LAB

Route:

```text
/onchain
```

Purpose:

Teach blockchain concepts using actual tokenized-stock infrastructure.

Allow users to enter/search:

```text
asset
symbol
contract address
```

Display:

```text
Token name
Symbol
Network
Contract address
Decimals
Total supply where available
Explorer
```

Explain each property in beginner-friendly language.

Example:

```text
Contract Address

Think of this as the blockchain address
where the token's smart-contract logic lives.
```

Keep the experience primarily educational and read-only.

Do not build a real-money trading workflow into the educational MVP.

---

# 16. WALLET EXPERIENCE

If wallet connection is included, it should be used primarily for:

* network identification
* address display
* read-only blockchain exploration
* educational transaction context

Use:

```text
wagmi
+
viem
```

Handle:

```text
disconnected
connecting
connected
wrong network
switching
error
```

Never assume a wallet exists.

---

# 17. ERROR STATES

Every major data-dependent component must have:

### Loading

Skeleton UI.

### Empty

Meaningful empty state.

### Error

Human-readable explanation.

### Stale

Show the last update time.

Do not expose raw API errors to users.

---

# 18. DESIGN SYSTEM

Do NOT copy the previous project's visual language.

StockSchool should have its own visual identity.

Use a modern educational-fintech direction.

Recommended characteristics:

```text
Light-first
Warm neutral background
Strong single accent
Large typography
Generous whitespace
Rounded cards
Editorial hierarchy
Interactive diagrams
Subtle animations
Clear charts
```

Avoid:

```text
Neon crypto UI
Terminal aesthetic
Overly dark dashboards
Excessive gradients
Excessive glassmorphism
```

---

# 19. TYPOGRAPHY

Choose typography appropriate for an educational product.

Possible direction:

```text
Primary UI:
Geist / Inter / Manrope / Plus Jakarta Sans

Editorial accent:
Optional serif display font
```

Do not automatically use the typography from the previous project.

Make typography hierarchy obvious.

Example:

```text
Eyebrow
↓
Large heading
↓
Supporting explanation
↓
Interactive content
```

---

# 20. COLOR SYSTEM

Do not blindly choose purple/black.

Create a semantic design system.

Example tokens:

```text
background
surface
surface-muted
foreground
muted
border
primary
primary-foreground
success
warning
danger
info
```

Use color sparingly.

Charts must remain understandable without color alone.

---

# 21. ANIMATION

Use motion to explain interactions.

Good examples:

* Token moving into blockchain
* Progress completion
* Portfolio allocation changes
* Price comparison transitions
* Lesson progression

Avoid:

* constant floating elements
* excessive page transitions
* distracting animations

Respect:

```css
prefers-reduced-motion
```

---

# 22. RESPONSIVENESS

Design mobile-first.

Test:

```text
320px
375px
390px
768px
1024px
1440px+
```

Avoid horizontal overflow.

Interactive charts must remain usable on mobile.

---

# 23. PERFORMANCE

Use:

* Server Components where appropriate
* Dynamic imports for heavy interactive components
* Image optimization
* Proper caching
* API response caching
* Minimal client-side JavaScript
* Streaming/loading states where useful

Do not make the entire application a Client Component.

---

# 24. SECURITY

Never put private credentials in:

```text
NEXT_PUBLIC_*
```

Server-only secrets must remain server-side.

Validate:

* API responses
* route parameters
* query parameters
* user input
* simulation actions

Use Zod.

Add appropriate security headers.

Do not trust client-side calculations for persistent data.

---

# 25. DATABASE

If authentication/progress persistence is implemented, use Prisma.

Suggested entities:

```text
User

Lesson

LessonProgress

QuizAttempt

MissionProgress

SimulationPortfolio

SimulationTransaction
```

Keep schema normalized.

Do not create unnecessary database tables for static educational content.

---

# 26. API DESIGN

Create internal API/service boundaries.

Example:

```text
/api/stocks
/api/stocks/[symbol]
/api/market/[symbol]
/api/progress
/api/simulation
```

Do not expose provider-specific implementation details directly to UI components.

The UI should communicate with normalized application services.

---

# 27. TESTING

Implement tests at multiple levels.

### Unit

Test:

* premium calculations
* portfolio calculations
* allocation calculations
* lesson unlocking
* quiz scoring
* validation

### Integration

Test:

* provider adapter
* API routes
* database services

### E2E

Test the primary journey:

```text
Landing
→ Learn
→ Lesson
→ Mission
→ Explore
→ Stock detail
→ Simulator
→ On-chain Lab
```

Use Playwright for E2E if appropriate.

---

# 28. FINANCIAL CALCULATION EXAMPLE

Do not do:

```typescript
0.1 + 0.2
```

for important monetary calculations.

Use a decimal-safe approach.

Example:

```typescript
import Decimal from "decimal.js"
```

Then:

```typescript
const premium = new Decimal(onChainPrice)
  .minus(referencePrice)
  .div(referencePrice)
  .times(100)
```

Round only at presentation boundaries.

---

# 29. DOCUMENTATION

Create:

```text
README.md
ARCHITECTURE.md
CONTRIBUTING.md
.env.example
```

README must contain:

* Product overview
* Features
* Tech stack
* Installation
* Yarn commands
* Environment variables
* Development
* Testing
* Build
* Deployment
* Architecture
* API integration
* Known limitations

---

# 30. ENVIRONMENT VARIABLES

Create:

```text
.env.example
```

Never commit secrets.

Clearly distinguish:

```text
NEXT_PUBLIC_*
SERVER_ONLY_*
```

Document every variable.

---

# 31. GIT WORKFLOW

Use conventional commits.

Examples:

```text
feat: add interactive lesson engine
feat: add tokenized stock explorer
feat: add portfolio simulator
fix: handle stale market data
refactor: introduce provider abstraction
test: add portfolio calculation tests
docs: update API integration guide
do not include ai watermark
```

Keep commits focused.

---

# 32. DEVELOPMENT PHASES

Do NOT attempt to build the entire product blindly in one giant implementation.

Work in phases.

## Phase 1 — Foundation

Implement:

* Next.js
* TypeScript
* Tailwind
* design system
* layout
* navigation
* responsive shell
* linting
* formatting
* testing setup

---

## Phase 2 — Learning Experience

Implement:

* lesson model
* lesson listing
* lesson detail
* progress UI
* interactive lesson components
* quizzes
* missions

Create at least 5 polished lessons.

---

## Phase 3 — Real Tokenized Stock Data

Implement:

* provider abstraction
* official API integration
* normalized asset model
* stock explorer
* stock detail page
* price/reference price
* market status
* freshness indicators

This is a critical phase.

Do not use mock data when the official API can provide the required information.

---

## Phase 4 — Simulator

Implement:

* virtual balance
* simulated transactions
* portfolio
* allocation
* P/L
* transaction history
* charts

Clearly mark the simulator as educational.

---

## Phase 5 — On-Chain Lab

Implement:

* BNB Chain information
* contract inspection
* explorer links
* transaction explanation
* read-only wallet integration if useful
* blockchain educational components

---

## Phase 6 — Polish

Improve:

* accessibility
* loading states
* error states
* animations
* mobile layout
* empty states
* typography
* performance

---

## Phase 7 — Testing

Run:

```bash
yarn lint
yarn test
yarn build
yarn test:e2e
```

Fix all blocking issues.

---

# 33. LANDING PAGE EXPERIENCE

The first viewport should communicate the product immediately.

Suggested copy:

```text
Learn stocks.
Understand blockchain.
See what happens on-chain.

StockSchool turns tokenized stocks into an interactive learning experience.

[Start Learning]
[Explore Stocks]
```

Do not make the landing page overly promotional.

The product should demonstrate itself quickly.

---

# 34. LEARNING PAGE

Design:

```text
Your learning path

01
The Stock

02
The Token

03
The Tokenized Stock

04
Prices On-Chain

05
Market Hours

06
Wallets & Transactions

07
Build a Portfolio

08
Investigate the Blockchain
```

Show:

* progress
* estimated time
* difficulty
* completion

---

# 35. "WOW" MOMENT

The strongest product moment should be:

```text
Learn concept
      ↓
See real asset
      ↓
Interact with real data
      ↓
Simulate scenario
      ↓
Inspect actual blockchain information
```

A judge should immediately understand why this is more than an educational website.

---

# 36. HACKATHON DEMO

Optimize the application around this flow:

### 00:00

Landing page.

### 00:20

Start lesson.

### 00:45

Interactive tokenization explanation.

### 01:10

Open real tokenized stock.

### 01:30

Show live/current data.

### 01:50

Explain reference vs on-chain price.

### 02:10

Complete learning mission.

### 02:30

Build virtual portfolio.

### 03:00

Open On-Chain Lab.

### 03:30

Inspect real blockchain information.

### 03:50

Return to learning progress.

End with:

```text
Learn it.
Explore it.
Simulate it.
Understand it on-chain.
```

---

# 37. IMPORTANT PRODUCT RULES

Never:

* fabricate live market data
* fabricate blockchain transactions
* call mock data live
* make investment recommendations
* imply simulated performance predicts future results
* expose private API keys
* hard-code provider-specific assumptions throughout the application
* make the entire UI dependent on wallet connection
* make blockchain knowledge a prerequisite for using the application

Always:

* explain unfamiliar concepts
* show data provenance where useful
* show freshness
* distinguish simulation from reality
* handle provider/API failures
* make the experience beginner-friendly
* keep the provider layer replaceable
* use real infrastructure where available

---

# 38. DEFINITION OF DONE

StockSchool is considered MVP-complete when:

```text
[ ] Project installs with Yarn
[ ] Development server runs
[ ] Production build succeeds
[ ] Landing page complete
[ ] Responsive navigation complete
[ ] Learn section complete
[ ] At least 5 interactive lessons
[ ] Quiz system works
[ ] Learning missions work
[ ] Progress tracking works
[ ] Real tokenized-stock provider integrated
[ ] Stock explorer works
[ ] Stock detail page works
[ ] Reference/on-chain price comparison works where data supports it
[ ] Market status works where data supports it
[ ] Virtual portfolio simulator works
[ ] Hypothetical P/L works
[ ] On-chain lab works
[ ] Contract information displayed
[ ] Explorer links work
[ ] Loading states implemented
[ ] Error states implemented
[ ] Stale data states implemented
[ ] Mobile responsive
[ ] Accessibility reviewed
[ ] Unit tests pass
[ ] E2E critical flow passes
[ ] Lint passes
[ ] Production build passes
[ ] README complete
[ ] .env.example complete
[ ] No secrets committed
```

---

# 39. ENGINEERING PRINCIPLE

Build this like a real product that happens to be entering a hackathon.

Do not optimize for the fastest possible prototype at the expense of architecture.

At the same time, do not over-engineer features that are unnecessary for the MVP.

Prioritize:

```text
Product clarity
>
Learning experience
>
Real infrastructure
>
Data correctness
>
UX polish
>
Architecture
>
Extra features
```

The final product should make a beginner say:

> "I finally understand what tokenized stocks are."

And make a technical judge say:

> "This isn't just a course website. The blockchain infrastructure is actually part of the product."
