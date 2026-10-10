# StockSchool — Database Schema and Data Model

## 1. Purpose

Define how StockSchool stores user learning progress, quiz attempts, missions, and simulated portfolios.

The schema must separate persistent application data from external tokenized-stock data.

External asset prices and provider metadata should not automatically be stored permanently in the database. Cache them according to provider requirements and application needs.

## 2. Database Technology

* PostgreSQL.
* Prisma ORM.
* TypeScript.
* Decimal-safe numeric types for financial values.

Use `Decimal` for financial calculations and database fields. Do not use floating-point database columns for prices, quantities, or balances.

## 3. Data Ownership

The database contains three categories of information:

### A. Learning content

Lessons, lesson sections, quizzes, and missions.

For the initial MVP, static lesson content can live in version-controlled TypeScript or JSON files rather than the database.

### B. User activity

Learning progress, quiz attempts, mission completions, and simulator state.

Persist this information locally for anonymous users and in PostgreSQL for authenticated users when account support is implemented.

### C. External asset data

Tokenized-stock information, pricing, and blockchain data.

The official provider or blockchain is the source of truth. Use a normalized provider layer and an appropriate cache instead of assuming the database owns the authoritative asset information.

## 4. Entity Relationship Overview

```text
User
 ├── LessonProgress
 ├── QuizAttempt
 ├── MissionProgress
 └── SimulationPortfolio
       ├── SimulationPosition
       └── SimulationTransaction

Lesson
 ├── LessonProgress
 ├── Quiz
 │    └── QuizAttempt
 └── Mission
      └── MissionProgress

SimulationPortfolio
 ├── SimulationPosition
 └── SimulationTransaction
```

## 5. User

Represents an authenticated application user.

Fields:

* `id`: UUID primary key.
* `email`: Unique email, if collected.
* `displayName`: Optional display name.
* `createdAt`: Account creation timestamp.
* `updatedAt`: Last update timestamp.

Requirements:

* Use the chosen authentication provider's supported integration.
* Do not store passwords directly when authentication is managed externally.
* Do not require a user record for anonymous exploration.
* Ensure users can only access their own private records.

## 6. Lesson

Represents a learning module.

Fields:

* `id`: Unique identifier.
* `slug`: Unique URL identifier.
* `title`: Lesson title.
* `description`: Short summary.
* `difficulty`: Beginner or intermediate.
* `estimatedMinutes`: Estimated completion duration.
* `order`: Position in the learning path.
* `published`: Whether the lesson is available.
* `createdAt`: Creation timestamp.
* `updatedAt`: Last update timestamp.

For the MVP, lesson content may be stored in version-controlled files, while the database tracks identifiers and progress if needed.

Avoid maintaining the same lesson content in two separate sources of truth.

## 7. LessonProgress

Tracks an individual user's progress through a lesson.

Fields:

* `id`: UUID.
* `userId`: User reference.
* `lessonId`: Lesson reference.
* `status`: Not started, in progress, or completed.
* `currentSection`: Current section identifier, if applicable.
* `completedAt`: Optional completion timestamp.
* `createdAt`: Creation timestamp.
* `updatedAt`: Last update timestamp.

Constraints:

* Unique combination of `userId` and `lessonId`.
* Completion timestamps should be set consistently.
* Reopening a completed lesson should not create duplicate progress records.

For anonymous users, use a local representation of this model and optionally migrate it after account creation.

## 8. QuizAttempt

Stores a quiz submission and its result.

Fields:

* `id`: UUID.
* `userId`: User reference.
* `lessonId`: Lesson reference.
* `quizId`: Identifier from the lesson content.
* `score`: Numeric score.
* `totalQuestions`: Number of questions.
* `answers`: JSON representation of submitted answer identifiers.
* `completedAt`: Submission timestamp.

Requirements:

* Validate submissions on the server when persisted.
* Do not trust client-supplied scores without validating the answers.
* Avoid storing unnecessary personal information.

## 9. MissionProgress

Tracks completion of learning missions.

Fields:

* `id`: UUID.
* `userId`: User reference.
* `missionId`: Identifier from lesson content.
* `lessonId`: Related lesson identifier.
* `status`: Not started, in progress, or completed.
* `result`: Optional JSON containing non-sensitive result metadata.
* `completedAt`: Optional completion timestamp.
* `createdAt`: Creation timestamp.
* `updatedAt`: Last update timestamp.

Constraints:

* Prevent duplicate completion records for the same user and mission.
* Validate completion conditions according to the mission type.

## 10. SimulationPortfolio

Represents a virtual portfolio.

Fields:

* `id`: UUID.
* `userId`: User reference.
* `name`: Portfolio name.
* `baseCurrency`: Initially USD.
* `initialCashBalance`: Starting virtual cash.
* `cashBalance`: Current virtual cash balance.
* `createdAt`: Creation timestamp.
* `updatedAt`: Last update timestamp.

Rules:

* Virtual balances must never be interpreted as real money.
* Each portfolio must be associated with one user.
* All mutations must validate cash and holdings.
* Use database transactions for related state changes.
* Avoid storing derived portfolio value as the authoritative source of truth.

## 11. SimulationPosition

Represents a simulated holding in a portfolio.

Fields:

* `id`: UUID.
* `portfolioId`: Portfolio reference.
* `provider`: Provider identifier.
* `assetId`: Normalized asset identifier.
* `symbol`: Asset symbol at the time the position was created.
* `quantity`: Decimal quantity.
* `averageCost`: Decimal average cost per unit.
* `createdAt`: Creation timestamp.
* `updatedAt`: Last update timestamp.

Constraints:

* Unique combination of `portfolioId` and `assetId` where appropriate.
* Quantity cannot be negative.
* Average cost must be validated.
* Fully closed positions may be retained for history or removed from active holdings according to the chosen model.

Current market value should be calculated from an explicitly selected price source rather than treated as permanent position data.

## 12. SimulationTransaction

Stores every simulated portfolio action.

Fields:

* `id`: UUID.
* `portfolioId`: Portfolio reference.
* `assetId`: Normalized asset identifier.
* `symbol`: Asset symbol.
* `action`: Buy or sell.
* `quantity`: Decimal quantity.
* `price`: Decimal execution price used by the simulation.
* `grossAmount`: Decimal transaction amount.
* `feeAmount`: Optional simulated fee.
* `currency`: Transaction currency.
* `priceSource`: Source used for the simulated price.
* `priceTimestamp`: Timestamp of the price used.
* `createdAt`: Transaction timestamp.

Rules:

* These are simulation records, not blockchain transactions.
* Never invent a real transaction hash for a simulated action.
* Use a database transaction to update the portfolio and insert the simulation record together.
* Validate that a sell cannot exceed the available simulated holding.
* Define how average cost and realized hypothetical P/L are calculated.

## 13. Optional Cached Asset Data

Only add persistent caching if required by the chosen provider's usage rules and the application architecture.

A possible `AssetCache` model could contain:

* `id`.
* `provider`.
* `externalAssetId`.
* `normalizedAssetData`.
* `sourceUpdatedAt`.
* `fetchedAt`.
* `expiresAt`.

Do not use cached values as if they were guaranteed current.

Respect provider caching and attribution requirements.

## 14. Data Types and Precision

Use:

* UUIDs for database record identifiers.
* Timestamps for temporal records.
* Enums for constrained status values.
* JSON only for flexible structured content that does not require relational querying.
* Decimal database columns for balances, quantities, prices, and fees.

Choose decimal precision based on actual provider values, token decimals, and simulator requirements. Do not assume every asset uses the same precision.

## 15. Indexes and Constraints

Recommended indexes:

* Unique user email, if collected.
* Unique lesson slug.
* Unique `(userId, lessonId)` for lesson progress.
* Unique `(userId, missionId)` for mission progress.
* Index `portfolioId` on positions and transactions.
* Index transaction creation time.
* Index `assetId` on simulation records.

Use foreign keys and appropriate deletion policies.

Avoid cascading deletion that unintentionally destroys required financial simulation history without an explicit product decision.

## 16. Data Consistency

When a simulated transaction occurs:

1. Validate the request.
2. Retrieve the portfolio and current simulated holdings.
3. Validate available cash or quantity.
4. Calculate amounts using decimal-safe arithmetic.
5. Update cash and holdings.
6. Insert the transaction record.
7. Commit all related changes atomically.

If any step fails, roll back the operation.

## 17. Privacy and Retention

* Store only necessary user information.
* Restrict records by authenticated user.
* Avoid logging private user data unnecessarily.
* Define account deletion and associated data-retention behavior.
* Do not store wallet private keys or seed phrases.
* Do not treat public blockchain addresses as proof of a user's identity.

## 18. MVP Schema Scope

Implement only what the MVP needs:

* User, if authentication is enabled.
* LessonProgress.
* QuizAttempt.
* MissionProgress.
* SimulationPortfolio.
* SimulationPosition.
* SimulationTransaction.

Keep static lessons in version-controlled content files unless there is a specific requirement for database-managed lesson editing.

## 19. Schema Acceptance Criteria

The schema is accepted when:

* Relationships are valid.
* Constraints prevent duplicate progress records.
* Decimal-safe financial fields are used.
* Simulated transactions are distinguishable from blockchain transactions.
* Portfolio changes are atomic.
* Users cannot access other users' private records.
* Prisma migrations work from a clean database.
* Seed data, if provided, is clearly identified as educational sample content.
