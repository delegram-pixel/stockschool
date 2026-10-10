# StockSchool — Technical Requirements Document (TRD)

## 1. Purpose

Define the technical architecture, libraries, integrations, data handling, security requirements, and testing strategy for StockSchool.

The implementation must prioritize reliability, beginner-friendly UX, data correctness, and maintainable code.

## 2. Technology Stack

### Frontend and application framework

* Next.js using the App Router.
* React.
* TypeScript with strict mode.
* Tailwind CSS.
* shadcn/ui for appropriate accessible UI primitives.
* Lucide React for icons.
* Framer Motion for selective interface animations.

### Data and validation

* TanStack Query for client-side server-data fetching and caching where needed.
* Zod for runtime input and external response validation.
* Decimal.js or an equivalent decimal-safe library for financial calculations.

### Blockchain

* viem for EVM-compatible blockchain reads and utilities.
* wagmi if wallet connection is required.
* A verified BNB Smart Chain RPC provider.
* Official blockchain explorers for contract and transaction links.

### Persistence

* PostgreSQL.
* Prisma ORM.
* Local storage for anonymous learning progress and simulator persistence where appropriate.

### Testing and quality

* Vitest for unit tests.
* React Testing Library for component tests.
* Playwright for end-to-end tests.
* ESLint and Prettier.

### Package management

Use **Yarn**, not npm. Keep the repository consistent with the Yarn version selected at project setup.

## 3. Application Architecture

Use a modular Next.js application with clear boundaries between presentation, domain logic, data access, and provider integrations.

Suggested structure:

```text
stockschool/
├── public/
│   ├── images/
│   └── icons/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── learn/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   ├── explore/page.tsx
│   │   ├── stocks/[symbol]/page.tsx
│   │   ├── simulate/page.tsx
│   │   ├── onchain/page.tsx
│   │   ├── onchain/[address]/page.tsx
│   │   ├── progress/page.tsx
│   │   └── api/
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── learning/
│   │   ├── stocks/
│   │   ├── simulator/
│   │   └── onchain/
│   ├── content/
│   │   └── lessons/
│   ├── lib/
│   │   ├── validation/
│   │   ├── calculations/
│   │   ├── blockchain/
│   │   └── utils/
│   ├── server/
│   │   ├── providers/
│   │   ├── services/
│   │   └── repositories/
│   └── types/
├── tests/
├── .env.example
├── ARCHITECTURE.md
└── README.md
```

Adapt the structure where justified, but keep provider calls and financial calculations out of presentation components.

## 4. Tokenized-Stock Integration

At least one of bStocks, Ondo, or xStocks must be central to the product.

Before implementation:

1. Identify the exact official data/API source to use.
2. Verify supported endpoints and authentication requirements.
3. Confirm which assets are available on BNB Smart Chain.
4. Verify the availability of prices, reference prices, market status, contract addresses, and update timestamps.
5. Document missing or unsupported fields.
6. Confirm applicable access limits and caching rules.

Do not invent endpoints or assume that all providers expose identical data.

### Provider abstraction

Implement a normalized interface:

```typescript
interface TokenizedStockProvider {
  getAssets(): Promise<TokenizedStock[]>;
  getAsset(symbol: string): Promise<TokenizedStock | null>;
  getPrice(symbol: string): Promise<PriceData | null>;
}
```

Add methods for market status or on-chain information only when their data sources are verified.

Implement the first provider fully before adding additional providers.

### Normalized asset model

```typescript
type TokenizedStock = {
  id: string;
  provider: string;
  name: string;
  companyName?: string;
  symbol: string;
  underlyingSymbol?: string;
  chainId?: number;
  contractAddress?: string;
  price?: string;
  referencePrice?: string;
  updatedAt?: string;
};
```

Use decimal strings for financial values at provider and domain boundaries. Convert to a decimal-safe representation for calculations.

## 5. Data Freshness and Reliability

Every live-data response should carry provenance metadata.

```typescript
type DataProvenance = {
  source: "live" | "cached" | "mock";
  updatedAt: string | null;
  stale: boolean;
};
```

Requirements:

* Do not label cached responses as real-time without qualification.
* Show the last successful update where appropriate.
* Define caching based on the actual provider's update frequency and rate limits.
* Handle provider timeouts and rate limits.
* Validate external responses using Zod.
* Avoid replacing failed live data with mock values without explicit labelling.
* Never derive a market status from a price alone.

## 6. Price Calculations

Where both prices are valid and use comparable units:

**Absolute difference**

`onChainPrice - referencePrice`

**Percentage difference**

`((onChainPrice - referencePrice) / referencePrice) × 100`

Validate that the reference price is positive and both prices represent comparable assets, currencies, and timestamps.

Use decimal-safe arithmetic. Round values only for display.

Display unavailable when a valid calculation cannot be made.

Do not describe the difference as an executable arbitrage opportunity.

## 7. Learning Engine

Lessons should be content-driven and rendered through reusable components.

Suggested lesson section types:

* Text.
* Diagram.
* Interactive example.
* Price comparison.
* Timeline.
* Mission.
* Quiz.
* Reflection.

Lesson content should be separated from page layout.

The system must support lesson prerequisites, completion states, quiz scoring, and progress updates.

## 8. Portfolio Simulator

The simulator must remain entirely virtual.

Domain requirements:

* Virtual cash balance.
* Simulated holdings.
* Simulated buy/sell transactions.
* Transaction history.
* Cost basis.
* Portfolio valuation.
* Hypothetical profit/loss.
* Asset allocation.

Validate each action against available virtual cash or holdings.

Prevent negative quantities and invalid prices.

Use a deterministic calculation service that can be unit-tested independently of React.

Never execute a real blockchain trade as part of simulator actions.

## 9. Blockchain Reads

Use viem to read supported token contract information and query verified blockchain data.

Requirements:

* Configure the correct BNB Chain network and chain ID.
* Verify contract addresses against trusted provider or official sources.
* Validate addresses before querying.
* Handle unavailable RPC services.
* Use appropriate timeouts and caching.
* Clearly identify the source and block context of blockchain information where available.
* Link to the correct network's explorer.
* Do not assume all tokens implement the same ERC-20 functionality.

Wallet connection is optional for the MVP. The primary learning experience must work without a wallet.

## 10. API and Server Boundaries

Provider requests that require secrets must run on the server.

Internal endpoints may include:

```text
GET /api/stocks
GET /api/stocks/[symbol]
GET /api/market/[symbol]
GET /api/onchain/[address]
GET /api/progress
POST /api/progress
GET /api/simulation
POST /api/simulation/transactions
```

These are proposed internal routes, not claims about external provider endpoints.

Requirements:

* Validate path and query parameters.
* Validate request bodies.
* Return consistent error responses.
* Apply rate limiting to sensitive or expensive endpoints.
* Avoid exposing provider credentials.
* Keep internal API contracts independent of external providers.

## 11. Authentication and Persistence

Anonymous access must be supported.

Persist anonymous progress and simulation data locally when appropriate.

If authenticated persistence is implemented:

* Associate records with the authenticated user.
* Enforce authorization server-side.
* Validate all writes.
* Prevent one user from reading another user's data.
* Define behavior for migrating anonymous progress to an account.

Do not require authentication merely to browse lessons or assets.

## 12. Security Requirements

* Keep secrets in server-side environment variables.
* Never expose private credentials through `NEXT_PUBLIC_*`.
* Validate all external API data.
* Sanitize and validate user-controlled input.
* Use secure authentication patterns if accounts are added.
* Apply appropriate security headers.
* Avoid logging sensitive credentials or authentication tokens.
* Restrict contract interaction to verified read operations in the initial MVP.
* Do not store wallet private keys or seed phrases.
* Do not imply that an explorer link guarantees the legitimacy of an asset.

## 13. UI and Accessibility Requirements

* Responsive desktop, tablet, and mobile layouts.
* Semantic HTML.
* Keyboard-accessible interactions.
* Visible focus states.
* Appropriate contrast.
* Accessible chart descriptions.
* Reduced-motion support.
* Loading, empty, error, and stale-data states.
* Clear separation between real data and simulation results.

Target WCAG 2.2 AA principles.

## 14. Performance Requirements

* Use Server Components by default.
* Add Client Components only where interaction requires them.
* Cache external data according to provider constraints.
* Avoid unnecessary repeated requests.
* Lazy-load heavy interactive components where appropriate.
* Prevent large charts from blocking initial page rendering.
* Avoid unnecessary dependencies.

## 15. Testing Requirements

### Unit tests

Test:

* Price difference calculations.
* Percentage calculations.
* Portfolio valuation.
* Cash and holdings validation.
* Buy/sell simulation.
* Quiz scoring.
* Lesson prerequisite rules.
* External response validation.

### Integration tests

Test:

* Provider adapters.
* Server routes.
* Database repositories where applicable.
* Progress persistence.
* Simulator transaction processing.

### End-to-end tests

Test the critical flow:

Landing → Lesson → Mission → Explore → Asset detail → Simulator → On-Chain Lab → Progress.

Include provider failure and empty-data scenarios.

## 16. Required Environment Documentation

Create `.env.example` with descriptive placeholders for all required variables.

Document which variables are server-only and which are safe for client use.

Never commit real credentials.

## 17. Build and Verification Commands

Use Yarn scripts consistently:

```bash
yarn install
yarn dev
yarn lint
yarn typecheck
yarn test
yarn build
yarn test:e2e
```

Define the scripts in `package.json` and ensure they correspond to actual configured tools.

## 18. Definition of Done

The technical implementation is complete when:

* The application builds successfully.
* Type checking and linting pass.
* The selected official provider is integrated.
* Live data and simulated data are distinguishable.
* Core financial calculations have unit tests.
* The simulator cannot initiate real trades.
* On-chain information uses verified network configuration.
* Critical routes are responsive and accessible.
* Error and stale-data states work.
* Documentation covers setup, environment variables, architecture, integration, and testing.
