# StockSchool — Design Brief

## 1. Design Objective

Design a modern, interactive learning product that makes tokenized stocks understandable to beginners.

StockSchool should combine the clarity of an excellent educational platform with the credibility of a financial-data product.

The interface must communicate complex ideas without looking overly technical, childish, or like a traditional crypto trading terminal.

## 2. Brand Personality

StockSchool should feel:

* Clear.
* Approachable.
* Intelligent.
* Interactive.
* Trustworthy.
* Curious.
* Modern.

It should encourage users to explore and learn rather than pressure them to trade.

## 3. Primary Design Direction

### Interactive Learning Lab

Use a light-first interface with warm neutral surfaces, confident typography, restrained accent colors, and visual explanations.

The product should feel like a learning environment where financial concepts can be explored safely.

Avoid repeating the previous project's dark, terminal-inspired Web3 aesthetic.

## 4. Color Direction

Recommended starting palette:

| Role                 | Color                    |
| -------------------- | ------------------------ |
| Main background      | Warm off-white `#F8F8F4` |
| Primary surface      | White `#FFFFFF`          |
| Main text            | Deep charcoal `#20251F`  |
| Secondary text       | Muted gray `#66716A`     |
| Primary accent       | Teal `#147D72`           |
| Secondary accent     | Soft sky blue `#DCEAF5`  |
| Supporting highlight | Pale yellow `#F4E8B6`    |
| Borders              | Soft gray `#E3E7E1`      |

These are initial design tokens, not mandatory final values. Refine them after reviewing the complete interface.

Use semantic colors for success, warning, danger, and informational states. Never rely on color alone to communicate meaning.

## 5. Typography

Use a highly readable sans-serif typeface for the interface.

Recommended direction:

* **Primary:** Manrope or Geist Sans.
* **Optional editorial accent:** Source Serif 4 for selected marketing or educational headings.
* **Numbers:** Use consistent tabular numerals for prices, percentages, and portfolio figures.

Typography hierarchy:

1. Large, confident homepage headline.
2. Clear page titles.
3. Concise supporting descriptions.
4. Readable lesson content.
5. Compact but legible metadata.

Avoid using monospace typography throughout the interface. Reserve it for addresses, transaction hashes, and technical identifiers where useful.

## 6. Layout and Spacing

Use a consistent spacing system based on small, reusable increments.

Recommended characteristics:

* Generous whitespace.
* Clear page sections.
* Consistent card padding.
* Readable content widths.
* Strong separation between educational content and financial data.
* Responsive layouts that do not overflow.

Use rounded corners consistently, but avoid making every element look like a floating pill.

## 7. Homepage Design

### Hero

Suggested headline:

**Understand stocks. Explore blockchain. Learn by doing.**

Supporting text:

"Discover how tokenized stocks work through interactive lessons, real BNB Chain data, virtual portfolios, and on-chain exploration."

Primary CTA: **Start Learning**

Secondary CTA: **Explore Stocks**

The hero should include a purposeful visual explanation, not a generic crypto illustration.

Possible visual: an interactive flow connecting a traditional asset, a tokenized representation, and blockchain information.

### Supporting sections

1. How StockSchool works.
2. Featured interactive lesson.
3. Supported tokenized-stock explorer preview.
4. Example price comparison.
5. Portfolio simulator preview.
6. Learning path preview.
7. Final call to action.

Keep the page focused. Avoid filling it with unnecessary marketing sections.

## 8. Application Shell

### Desktop

Use a clean navigation bar with the StockSchool logo and links to:

* Learn.
* Explore.
* Simulator.
* On-Chain Lab.
* Progress.

Highlight the current section clearly.

### Mobile

Use a compact navigation layout suitable for small screens.

Keep the primary learning action easy to find. Do not force a wide desktop navigation bar onto mobile.

## 9. Learning Centre

The learning centre should resemble a guided curriculum.

Each lesson card can display:

* Lesson number.
* Title.
* Short description.
* Estimated duration.
* Difficulty.
* Completion state.
* Lock state, if prerequisites apply.

Use a visible learning path to help users understand what comes next.

Do not use progress bars or badges merely for decoration.

## 10. Lesson Page

Recommended layout:

* Lesson title and objective.
* Progress indicator.
* Main educational content.
* Interactive visualization.
* Mission or exercise.
* Quiz.
* Completion feedback.
* Previous and next lesson navigation.

On desktop, a compact lesson outline can appear beside the content.

On mobile, keep navigation accessible without squeezing the main lesson content.

### Interactive components

Examples:

* A tokenization diagram.
* A price-comparison calculator.
* A market-hours timeline.
* A wallet-to-transaction flow.
* A portfolio allocation exercise.

Each interactive component must teach a concept rather than exist solely for visual effect.

## 11. Tokenized-Stock Explorer

Design a clean, readable asset discovery experience.

Include:

* Search field.
* Provider filter.
* Sector filter where supported.
* Sort options.
* Asset cards or a responsive table.
* Clear loading and error states.

Each asset card should prioritize:

1. Company or asset identity.
2. Token symbol and provider.
3. Price, when available.
4. Reference price, when available.
5. Difference percentage, when calculable.
6. Network and data freshness.

Avoid overwhelming beginners with too many technical details at once.

## 12. Asset Detail Page

Organize the page into understandable sections:

* Overview.
* Price comparison.
* Provider information.
* Network and contract information.
* Data source and freshness.
* Related lessons.
* On-chain investigation.

Use explanatory labels such as "Reference price" and "On-chain price."

Do not imply that a reference price is necessarily an executable trading price.

## 13. Portfolio Simulator

The simulator should feel like a safe educational workspace.

Display:

* Virtual balance.
* Portfolio value.
* Hypothetical profit or loss.
* Holdings.
* Asset allocation.
* Simulated transaction history.

Make the simulation status prominent.

Example label:

**SIMULATION — No real trades are executed.**

Use clear forms for hypothetical buy and sell actions.

Explain errors in plain language, such as insufficient virtual cash or insufficient simulated holdings.

## 14. On-Chain Lab

This section can introduce slightly more technical visual elements while preserving the overall design language.

Display information in grouped sections:

* Token identity.
* Network.
* Contract address.
* Token properties.
* Transaction details.
* Explorer link.

Use copy controls for technical identifiers where appropriate.

Provide a short explanation beside unfamiliar terms.

Keep addresses and hashes readable and provide truncation only when the full value can still be accessed.

## 15. Charts and Data Visualization

Charts should teach users how to interpret information.

Use:

* Clear labels.
* Useful tooltips.
* Accessible contrast.
* Meaningful axes.
* Responsive sizing.
* Empty and unavailable states.

Never create charts using invented live market values.

Where demonstration data is necessary, label it as illustrative.

## 16. Motion and Interaction

Use subtle animation for:

* Lesson progression.
* Interactive diagrams.
* Quiz feedback.
* Portfolio allocation changes.
* Loading transitions.
* Completion states.

Avoid excessive motion, perpetual floating elements, and decorative animation that distracts from learning.

Respect reduced-motion preferences.

## 17. Accessibility

Target WCAG 2.2 AA principles.

Include:

* Keyboard navigation.
* Visible focus indicators.
* Semantic HTML.
* Accessible forms.
* Appropriate color contrast.
* Screen-reader-friendly chart summaries.
* Reduced-motion support.
* Error messages connected to relevant inputs.

## 18. Responsive Breakpoints

Test the design at:

* 320px.
* 375px.
* 390px.
* 768px.
* 1024px.
* 1440px and above.

Ensure tables, charts, navigation, and interactive exercises work without horizontal overflow.

## 19. Design Quality Standard

The finished interface must not resemble a generic dashboard template.

Avoid:

* Excessive gradients.
* Overuse of glassmorphism.
* Dense cards everywhere.
* Unnecessary charts.
* Generic AI-generated illustrations unrelated to the product.
* Crypto trading terminal layouts.
* Excessive decorative badges.
* Fake activity or fabricated live data.

Every visual element should support comprehension, navigation, or learning.

## 20. Design Deliverables

Produce:

1. Color and typography tokens.
2. Desktop application shell.
3. Mobile application shell.
4. Homepage.
5. Learning path.
6. Lesson detail page.
7. Stock explorer.
8. Stock detail page.
9. Portfolio simulator.
10. On-Chain Lab.
11. Progress page.
12. Loading, empty, error, and stale-data states.

The final design should make StockSchool feel like an approachable learning product powered by real financial and blockchain infrastructure.
