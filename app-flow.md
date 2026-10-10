# StockSchool — Application Flow

## 1. Purpose

Define how users navigate StockSchool, discover its learning content, explore tokenized stocks, simulate portfolios, and investigate blockchain information.

## 2. Main Navigation

Desktop navigation:

* Home
* Learn
* Explore Stocks
* Simulator
* On-Chain Lab
* Progress

A persistent primary CTA should encourage users to start or continue learning.

On mobile, use a compact navigation pattern that keeps the primary modules accessible without overcrowding the screen.

## 3. Application Sitemap

```text
StockSchool
│
├── Home
│   ├── Start Learning
│   ├── Explore Stocks
│   └── How StockSchool Works
│
├── Learn
│   ├── Learning Path
│   ├── Lesson Detail
│   │   ├── Explanation
│   │   ├── Interactive Example
│   │   ├── Mission
│   │   ├── Quiz
│   │   └── Completion
│   └── Lesson Results
│
├── Explore Stocks
│   ├── Asset List
│   ├── Search and Filters
│   └── Asset Detail
│       ├── Overview
│       ├── Pricing
│       ├── Provider Information
│       ├── Blockchain Information
│       └── Related Lessons
│
├── Simulator
│   ├── Virtual Portfolio
│   ├── Add Simulated Position
│   ├── Sell Simulated Position
│   ├── Allocation
│   └── Transaction History
│
├── On-Chain Lab
│   ├── Search Asset or Address
│   ├── Token Information
│   ├── Contract Information
│   └── Transaction Explorer
│
└── Progress
    ├── Overall Progress
    ├── Completed Lessons
    ├── Quiz Results
    └── Completed Missions
```

## 4. First-Time User Flow

### Step 1: Landing Page

The user arrives at the homepage.

The page explains what StockSchool does and offers two primary actions:

* Start Learning.
* Explore Stocks.

### Step 2: Introduction

Selecting Start Learning opens the introductory lesson.

Explain the difference between a traditional stock, a blockchain token, and a tokenized-stock representation.

### Step 3: Interactive Lesson

The user interacts with a visual explanation rather than reading a long article.

Show a short explanation, an interactive element, and a knowledge check.

### Step 4: Lesson Completion

Display the user's result and provide two next steps:

* Continue to the next lesson.
* Explore a real tokenized stock.

### Step 5: Real Asset Exploration

Open the asset explorer and select an asset supported by the integrated provider.

Display available data, source, update time, and relevant educational explanations.

### Step 6: Price Mission

The user compares an on-chain price with its reference price, when both are available.

Ask the user to interpret or calculate the difference.

Explain that a price difference does not automatically represent a profitable trade.

### Step 7: Simulator

The user allocates virtual funds to hypothetical holdings.

Display portfolio allocation, simulated positions, and hypothetical performance.

### Step 8: On-Chain Lab

The user opens an asset's contract information or a verified example transaction.

Explain the technical details in plain language.

### Step 9: Progress

The user reviews lessons, quizzes, and missions completed.

Offer a clear next step in the learning path.

## 5. Learning Lesson Flow

```text
Open Learning Path
        |
        v
Select Available Lesson
        |
        v
Read / Explore Concept
        |
        v
Interact with Example
        |
        v
Complete Mission
        |
        v
Take Quiz
        |
        v
Evaluate Result
        |
        v
Mark Lesson Complete
        |
        v
Update Progress
        |
        v
Continue or Explore Asset
```

### Rules

* A lesson can have prerequisites.
* Locked lessons should explain what is required to unlock them.
* Users should be able to revisit completed lessons.
* Quiz feedback should explain the answer rather than only showing right or wrong.
* Progress must not be lost when navigating between lessons.
* Avoid forcing account creation before the first lesson.

## 6. Asset Explorer Flow

```text
Open Explore
      |
      v
Load Supported Assets
      |
      v
Search / Filter / Sort
      |
      v
Select Asset
      |
      v
Open Asset Detail
      |
      ├── View Pricing
      ├── View Provider
      ├── View Network
      ├── Open Explorer
      ├── Open Related Lesson
      └── Open On-Chain Lab
```

### Explorer states

**Loading:** Display skeleton cards or rows.

**Loaded:** Display available normalized asset data.

**Empty:** Explain that no assets match the search or filters.

**Provider error:** Explain that asset data is temporarily unavailable.

**Stale data:** Show the last successful update time.

## 7. Simulator Flow

```text
Open Simulator
       |
       v
Initialize Virtual Balance
       |
       v
Browse Supported Assets
       |
       v
Select Asset
       |
       v
Enter Simulated Amount
       |
       v
Validate Virtual Cash / Holdings
       |
       v
Review Simulation
       |
       v
Confirm Simulated Action
       |
       v
Update Virtual Portfolio
       |
       v
Show Updated Allocation and History
```

### Buy simulation

Validate that:

* The amount is positive.
* The selected price is valid.
* The virtual cash balance is sufficient.
* The quantity is valid.

### Sell simulation

Validate that:

* The amount is positive.
* The user has sufficient simulated holdings.
* The selected price is valid.

### Result

Update holdings, cash, portfolio valuation, and transaction history consistently.

No wallet signature or blockchain transaction should be required for simulated actions.

## 8. On-Chain Lab Flow

```text
Open On-Chain Lab
       |
       v
Select Asset or Enter Address
       |
       v
Validate Address / Network
       |
       v
Query Supported Blockchain Data
       |
       v
Display Verified Information
       |
       ├── Explain Token Properties
       ├── Explain Contract Address
       ├── Explain Network
       ├── Explain Transaction
       └── Open Official Explorer
```

If the address cannot be verified, do not present it as an official token contract.

If data is unavailable, explain the limitation and offer a safe alternative such as opening a verified example.

## 9. Progress Flow

```text
User Completes Activity
          |
          v
Validate Completion
          |
          v
Record Progress
          |
          v
Update Lesson Status
          |
          v
Update Overall Progress
          |
          v
Display Next Recommended Step
```

Anonymous progress should be stored locally where appropriate.

Authenticated progress, if implemented, should be saved through a server-side persistence layer.

## 10. Error and Recovery Flows

### Data provider unavailable

* Preserve the rest of the application.
* Show a clear error or stale-data message.
* Do not fabricate live prices.
* Allow users to continue static educational lessons.

### No wallet installed

* Keep the learning and explorer experiences available.
* Explain that wallet connection is optional.

### Invalid address

* Explain the input error.
* Do not initiate a blockchain request until validation succeeds.

### Invalid simulator action

* Explain why the action cannot proceed.
* Preserve the existing portfolio state.

### Progress persistence failure

* Preserve local progress when possible.
* Inform the user if synchronization failed.

## 11. Recommended User Journey for the Hackathon Demo

1. Open the homepage.
2. Start an interactive lesson.
3. Demonstrate a tokenization visualization.
4. Open a real supported tokenized stock.
5. Explain its reference and on-chain prices.
6. Complete a price-related mission.
7. Build a virtual portfolio.
8. Inspect token information in the On-Chain Lab.
9. Return to progress and show completed activities.

## 12. Flow Design Principles

* Keep the next action obvious.
* Avoid dead ends.
* Allow exploration outside the prescribed learning path.
* Explain technical concepts at the point where they become relevant.
* Preserve progress across navigation.
* Do not require a wallet for basic education.
* Keep simulation actions separate from real blockchain interactions.
* Give users meaningful recovery options when external services fail.
