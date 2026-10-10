# StockSchool — Product Requirements Document (PRD)

**Product name:** StockSchool
**Product type:** Interactive financial education platform
**Primary ecosystem:** BNB Chain
**Target audience:** Beginners learning about tokenized stocks and blockchain
**Document status:** MVP specification

## 1. Product Overview

StockSchool is an interactive learning platform that teaches beginners how tokenized stocks work through practical lessons, real tokenized-stock data, learning missions, portfolio simulations, and blockchain exploration.

Rather than relying on static articles, the application allows users to learn a concept, explore a real asset, experiment with hypothetical scenarios, and inspect relevant on-chain information.

**Core experience: Learn → Explore → Simulate → Understand On-Chain.**

## 2. Problem Statement

Tokenized stocks connect traditional financial assets with blockchain infrastructure. Beginners may struggle to understand:

* What a tokenized stock represents.
* How tokenized stocks differ from traditional shares.
* Why token prices can differ from reference prices.
* How blockchain availability differs from traditional market hours.
* How token issuers and token structures differ.
* What wallets, smart contracts, gas fees, and transactions do.
* How to investigate a tokenized asset on a blockchain.

StockSchool addresses these problems by connecting beginner-friendly explanations to real tokenized-stock infrastructure.

## 3. Product Vision

Make tokenized stocks understandable through hands-on learning.

A successful user should be able to explain tokenized stocks in their own words, interpret relevant asset data, calculate a price difference, create a hypothetical portfolio, and understand basic on-chain information.

## 4. Product Objectives

1. Teach tokenized-stock fundamentals interactively.
2. Integrate at least one qualifying ecosystem: bStocks, Ondo, or xStocks.
3. Display authentic asset information from verified data sources.
4. Explain the relationship between reference prices and on-chain prices.
5. Let users experiment with a virtual portfolio without risking real money.
6. Explain blockchain assets and transactions through a read-only educational experience.
7. Track learning progress and encourage lesson completion.

## 5. Target Users

### Primary: Blockchain Beginners

People who understand basic financial concepts but have limited blockchain knowledge.

### Secondary: Finance Learners

People interested in tokenized assets who want to understand how their infrastructure works.

### Tertiary: Web3 Users

Existing blockchain users who want to learn about tokenized stocks and the differences between providers.

## 6. Core Product Modules

### 6.1 Learning Centre

Provide structured lessons with explanations, visualizations, examples, missions, and quizzes.

Initial curriculum:

1. Understanding traditional stocks.
2. Understanding blockchain tokens.
3. What tokenized stocks are.
4. How tokenized stocks work on BNB Chain.
5. Understanding reference and on-chain prices.
6. Understanding market hours and availability.
7. Wallets, smart contracts, and transactions.
8. Liquidity and price differences.
9. Building a hypothetical portfolio.
10. Investigating a token on-chain.

Each lesson should include a title, description, difficulty, estimated duration, content sections, and completion criteria.

### 6.2 Tokenized-Stock Explorer

Allow users to browse and search supported tokenized-stock assets.

Each asset page should display available information such as:

* Company and asset name.
* Token symbol.
* Provider or issuer.
* Network.
* Token contract address.
* On-chain price.
* Reference price.
* Price difference and percentage.
* Market status.
* Last update time.
* Blockchain explorer link.

Only display fields supported by the underlying data source. Clearly identify unavailable information.

### 6.3 Interactive Learning Missions

Missions turn concepts into practical activities.

Examples:

**Find the Premium:** Calculate the difference between a reference price and an on-chain price.

**Investigate an Asset:** Find a token's network, symbol, and contract address.

**Understand the Transaction:** Identify the sender, recipient, transaction status, and transaction hash.

**Compare Token Structures:** Learn how two tokenized representations may differ in issuer, rights, availability, and economic structure.

Provide immediate feedback and an explanation after each completed mission.

### 6.4 Portfolio Simulator

Provide a hypothetical starting balance of $10,000.

Users can simulate purchases and sales using supported asset prices.

Features:

* Virtual cash balance.
* Simulated buy and sell actions.
* Holdings and quantities.
* Entry prices.
* Current valuation using the selected pricing methodology.
* Hypothetical profit and loss.
* Allocation charts.
* Transaction history.
* Concentration and diversification explanations.

The simulator must never execute real trades. All simulated activity must be clearly labelled.

### 6.5 On-Chain Lab

Provide a beginner-friendly interface for inspecting real tokenized-stock contracts and blockchain information.

Features may include:

* Network identification.
* Contract address.
* Token name and symbol.
* Decimals and total supply, when available.
* Explorer links.
* Example transactions.
* Transaction hash and status.
* Beginner-friendly explanations of blockchain concepts.

Use verified on-chain data where possible. Keep the initial experience read-only.

### 6.6 Learning Progress

Track:

* Lessons completed.
* Current lesson.
* Quiz attempts and scores.
* Missions completed.
* Overall progress.
* Achievement milestones.

Users should be able to begin learning without creating an account. Persist progress locally for anonymous users and support account-based persistence when authentication is implemented.

## 7. Primary User Journey

1. User visits the landing page.
2. User selects Start Learning.
3. User completes an introductory lesson.
4. User learns how tokenization works through an interactive visualization.
5. User explores a real tokenized-stock asset.
6. User compares reference and on-chain prices where supported.
7. User completes a learning mission.
8. User builds a hypothetical portfolio.
9. User investigates an asset in the On-Chain Lab.
10. User reviews learning progress.

## 8. Functional Requirements

* **FR-01:** Users can access the landing page and primary product modules.
* **FR-02:** Users can browse lessons and open individual lesson pages.
* **FR-03:** Lessons support interactive content, quizzes, and missions.
* **FR-04:** The application integrates at least one qualifying tokenized-stock ecosystem.
* **FR-05:** Users can search and inspect supported assets.
* **FR-06:** The application calculates price differences correctly when both prices are valid.
* **FR-07:** Users can complete missions and receive feedback.
* **FR-08:** Users can create and update a virtual portfolio.
* **FR-09:** Simulated transactions update holdings and virtual cash consistently.
* **FR-10:** Users can inspect supported on-chain asset information.
* **FR-11:** Users can view learning progress.
* **FR-12:** Loading, empty, error, and stale-data states are handled.
* **FR-13:** The interface works across desktop, tablet, and mobile.
* **FR-14:** Mock data is never presented as live data.
* **FR-15:** The application does not initiate real-money trades.

## 9. Non-Functional Requirements

* Responsive and accessible interface.
* Type-safe application code.
* Secure handling of API credentials.
* Validated external API responses.
* Reliable financial arithmetic.
* Reusable provider integrations.
* Clear error handling.
* Reasonable loading performance.
* Automated tests for important calculations and user journeys.
* Maintainable documentation.

## 10. MVP Scope

The MVP includes:

* Landing page.
* Learning centre with at least five polished interactive lessons.
* Quiz and mission system.
* Real tokenized-stock data integration.
* Asset explorer and asset detail pages.
* Price comparison where data supports it.
* Virtual portfolio simulator.
* Read-only On-Chain Lab.
* Learning progress tracking.
* Responsive design.
* Testing and documentation.

## 11. Out of Scope

Unless the hackathon explicitly requires otherwise, the MVP excludes:

* Real-money trading.
* Custody of assets.
* Investment recommendations.
* Real portfolio management.
* Automated trading.
* Complex DeFi strategies.
* Community-created lessons.
* AI tutoring.
* Social feeds and leaderboards.

## 12. Success Metrics

Evaluate the product using:

* Lesson completion rate.
* Mission completion rate.
* Number of assets explored.
* Simulator usage.
* On-Chain Lab usage.
* Percentage of users completing the core journey.
* Successful loading of supported provider data.

**Primary success metric:** The percentage of users who complete Learn → Explore → Simulate → Understand On-Chain.

## 13. Product Principles

1. Teach before overwhelming.
2. Use real infrastructure rather than disconnected examples.
3. Clearly distinguish live data, cached data, and simulations.
4. Explain unfamiliar terms in plain language.
5. Make blockchain exploration useful without requiring wallet connection.
6. Never imply that simulated performance predicts future returns.
7. Keep the product educational rather than turning it into a trading terminal.

## 14. MVP Acceptance Criteria

The MVP is accepted when a user can complete a lesson, inspect an asset backed by the selected integration, complete a learning mission, simulate a portfolio, inspect available on-chain information, and review learning progress.

All critical flows must work on mobile and desktop, with no fabricated live data or unlabelled simulated financial results.
