# StockSchool — Implementation Plan

## 1. Objective

Build StockSchool in controlled phases, validating the core experience and external integration before expanding functionality.

The priority is a polished, functional MVP that demonstrates the relationship between interactive education and real tokenized-stock infrastructure.

## 2. Development Principles

* Use Yarn for package management.
* Build reusable components.
* Keep provider integration separate from UI components.
* Verify external API capabilities before depending on them.
* Avoid building unnecessary infrastructure.
* Keep the learning experience usable without a wallet.
* Test financial calculations independently.
* Keep simulated activity separate from real blockchain activity.

## 3. Phase 0 — Repository and Integration Validation

**Objective:** Confirm the development environment and the core integration path.

Tasks:

1. Review the existing repository.
2. Inspect existing code before changing or replacing files.
3. Confirm the Node.js and Yarn versions.
4. Confirm the hackathon's current requirements.
5. Identify the primary provider: bStocks, Ondo, or xStocks.
6. Read the current official API and integration documentation.
7. Verify supported BNB Chain assets and available fields.
8. Confirm access requirements, rate limits, and caching rules.
9. Document environment variables.
10. Create a short architecture decision record.

Deliverables:

* Verified provider choice.
* Initial architecture.
* Working repository setup.
* Integration notes.
* Environment-variable template.

**Exit criteria:** The team knows how it will obtain authentic asset data and which product features that data supports.

## 4. Phase 1 — Project Foundation

**Objective:** Establish a maintainable application foundation.

Tasks:

1. Initialize or configure Next.js with the App Router.
2. Configure TypeScript strict mode.
3. Configure Tailwind CSS.
4. Set up shadcn/ui where appropriate.
5. Establish design tokens.
6. Configure ESLint and formatting.
7. Set up Vitest.
8. Set up Playwright.
9. Establish route structure.
10. Build the responsive application shell.
11. Create shared navigation and layout components.
12. Add error boundaries and not-found handling.

Deliverables:

* Running application.
* Responsive navigation.
* Shared design system.
* Configured test and lint tools.
* Initial README.

**Exit criteria:** The app runs locally and has a stable structure for subsequent features.

## 5. Phase 2 — Landing Page and Design System

**Objective:** Establish StockSchool's visual identity.

Tasks:

1. Implement the homepage hero.
2. Build the product explanation section.
3. Build the learning-path preview.
4. Build an asset explorer preview.
5. Build the simulator preview.
6. Establish typography and color tokens.
7. Implement responsive layouts.
8. Add subtle, purposeful animations.
9. Check keyboard accessibility and reduced-motion behavior.
10. Test common mobile and desktop widths.

Deliverables:

* Completed landing page.
* Reusable UI primitives.
* Responsive layouts.
* Consistent visual identity.

**Exit criteria:** A first-time visitor can understand the product and navigate to its primary experiences.

## 6. Phase 3 — Learning Engine

**Objective:** Deliver a useful learning experience before adding complex interactions.

Tasks:

1. Define lesson and section types.
2. Create a content-driven lesson renderer.
3. Build the learning-path page.
4. Build lesson detail pages.
5. Implement reusable interactive components.
6. Implement quizzes and scoring.
7. Implement missions.
8. Implement lesson prerequisites.
9. Add completion feedback.
10. Add progress tracking.
11. Create at least five polished lessons.
12. Test lesson navigation and progress persistence.

Suggested initial lessons:

* What is a stock?
* What is a blockchain token?
* What is a tokenized stock?
* Why can on-chain and reference prices differ?
* How wallets and blockchain transactions work.

Deliverables:

* Learning path.
* Lesson renderer.
* Quiz system.
* Mission system.
* Initial lesson content.
* Progress interface.

**Exit criteria:** Users can complete lessons, answer quizzes, receive feedback, and resume learning.

## 7. Phase 4 — Real Tokenized-Stock Integration

**Objective:** Make authentic tokenized-stock infrastructure central to the application.

Tasks:

1. Implement the provider interface.
2. Build the selected provider adapter.
3. Validate external responses with Zod.
4. Normalize asset metadata.
5. Implement server-side data access.
6. Implement caching according to provider rules.
7. Add freshness metadata.
8. Implement loading, empty, stale, and error states.
9. Build the stock explorer.
10. Add search and supported filters.
11. Build asset detail pages.
12. Add reference/on-chain price comparison where supported.
13. Add market status where supported.
14. Add verified contract and explorer information.
15. Link assets to relevant lessons.
16. Add integration tests.

Deliverables:

* Working provider integration.
* Normalized asset service.
* Stock explorer.
* Stock detail pages.
* Data provenance and freshness indicators.

**Exit criteria:** At least one qualifying ecosystem is demonstrably integrated, and its real data supports the core learning experience.

## 8. Phase 5 — Learning Missions

**Objective:** Connect lessons directly to real asset data.

Tasks:

1. Implement the price-difference mission.
2. Implement the asset-investigation mission.
3. Implement a token-structure comparison lesson where verified data supports it.
4. Add answer validation.
5. Add explanations and feedback.
6. Track mission completion.
7. Add missions to the learning path.
8. Test correct and incorrect answers.

Deliverables:

* Reusable mission framework.
* At least three missions.
* Persistent or locally stored completion states.

**Exit criteria:** Users can learn a concept, apply it to an asset, and receive meaningful feedback.

## 9. Phase 6 — Portfolio Simulator

**Objective:** Let users experiment with hypothetical portfolios.

Tasks:

1. Implement the virtual starting balance.
2. Implement simulated buy actions.
3. Implement simulated sell actions.
4. Validate available cash and holdings.
5. Implement decimal-safe calculations.
6. Calculate cost basis and hypothetical P/L.
7. Build holdings and allocation views.
8. Build transaction history.
9. Add educational explanations.
10. Persist anonymous simulator state locally.
11. Add database persistence if authenticated accounts are included.
12. Test calculation edge cases.

Deliverables:

* Functional virtual portfolio.
* Simulated transaction history.
* Allocation visualization.
* Hypothetical performance calculations.
* Clear simulation disclosures.

**Exit criteria:** Users can create and modify a portfolio without executing real trades, and the calculations remain consistent.

## 10. Phase 7 — On-Chain Lab

**Objective:** Make blockchain information understandable to beginners.

Tasks:

1. Configure BNB Chain RPC access.
2. Configure viem for supported network reads.
3. Verify contract addresses.
4. Implement contract-information retrieval.
5. Build the asset/address search flow.
6. Display available token properties.
7. Link to the appropriate blockchain explorer.
8. Explain technical fields in plain language.
9. Implement transaction investigation using verified data.
10. Add RPC failure handling.
11. Test address validation and unsupported contracts.

Deliverables:

* On-Chain Lab.
* Contract information view.
* Explorer links.
* Beginner-friendly technical explanations.

**Exit criteria:** Users can inspect supported blockchain information without connecting a wallet or signing a transaction.

## 11. Phase 8 — Progress and Persistence

**Objective:** Make the learning journey coherent across sessions.

Tasks:

1. Finalize progress data models.
2. Persist lesson completion.
3. Persist quiz results.
4. Persist mission completion.
5. Persist simulator state.
6. Add optional authentication if required.
7. Add account-scoped authorization.
8. Implement local-progress migration if accounts are introduced.
9. Handle synchronization errors.
10. Test data ownership and recovery.

Deliverables:

* Consistent progress tracking.
* Persistence strategy.
* Optional authenticated synchronization.

**Exit criteria:** Users can review completed activities and resume their learning experience.

## 12. Phase 9 — Testing and Quality Assurance

**Objective:** Verify that the core application works reliably.

Tasks:

1. Test financial calculations.
2. Test simulator validation.
3. Test lesson and mission logic.
4. Test provider response validation.
5. Test API error states.
6. Test persistence and authorization.
7. Test mobile navigation.
8. Run accessibility checks.
9. Run the primary Playwright journey.
10. Test provider outages.
11. Verify that mock data is labelled.
12. Verify no real trading occurs in the simulator.

Required checks:

```bash
yarn lint
yarn typecheck
yarn test
yarn build
yarn test:e2e
```

Deliverables:

* Passing automated tests.
* Fixed blocking bugs.
* Documented known limitations.

**Exit criteria:** The critical user journey passes, and no known blocking issue prevents the MVP from being demonstrated.

## 13. Phase 10 — Deployment and Demo Preparation

**Objective:** Prepare a reliable hackathon demonstration.

Tasks:

1. Configure production environment variables.
2. Deploy the application.
3. Verify the provider integration in production.
4. Verify data freshness and error states.
5. Test all primary routes.
6. Check mobile responsiveness.
7. Prepare demo assets and sample scenarios.
8. Document setup and architecture.
9. Prepare a concise demonstration script.
10. Record known limitations honestly.

Deliverables:

* Deployed application.
* Working demonstration.
* Complete README.
* Environment setup guide.
* Architecture documentation.
* Demo script.

**Exit criteria:** A judge can navigate the product and see the core Learn → Explore → Simulate → On-Chain journey.

## 14. Suggested Priority

### P0 — Essential

* Repository foundation.
* Landing page.
* Interactive lessons.
* One verified tokenized-stock provider.
* Stock explorer.
* Price comparison where supported.
* Learning missions.
* Virtual portfolio simulator.
* Read-only On-Chain Lab.
* Responsive UI.
* Core tests.

### P1 — Important

* Persistent progress.
* Additional lessons.
* Additional asset filters.
* More advanced visualizations.
* Optional authentication.
* Additional provider support.

### P2 — Future

* AI tutor.
* Community missions.
* Leaderboards.
* Historical market replay.
* Advanced learning analytics.
* Additional RWA categories.

## 15. Recommended Development Order

Build a working vertical slice early:

1. Landing page.
2. One interactive lesson.
3. One verified real tokenized-stock asset.
4. One price-comparison mission.
5. One simulator interaction.
6. One on-chain investigation.
7. Progress tracking.

Once this end-to-end experience works, expand the curriculum and polish the rest of the application.

This is safer than completing every page independently before verifying the product's core experience.

## 16. Final Definition of Done

StockSchool is ready for its MVP demonstration when:

* The application installs and runs with Yarn.
* The landing page explains the product clearly.
* At least five interactive lessons are available.
* Quizzes and missions work.
* At least one qualifying tokenized-stock integration is functional.
* The explorer uses authentic provider data.
* Price comparisons are calculated correctly where supported.
* The simulator supports hypothetical portfolio changes.
* On-chain information comes from verified sources.
* Progress tracking works.
* Loading, error, empty, and stale-data states are handled.
* The application works on mobile and desktop.
* Critical tests pass.
* No private credentials are exposed.
* The simulator cannot execute real trades.
* Documentation explains setup, architecture, and limitations.

**Final product goal:** Deliver an application where a beginner can learn a concept, investigate a real tokenized stock, experiment with a hypothetical portfolio, and understand what the blockchain information means.
