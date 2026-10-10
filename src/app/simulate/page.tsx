import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { FeedNotice, LiveFeedNote } from "@/components/stocks/feed-notice";
import { SimulatorWorkspace } from "@/components/simulator/workspace";
import { PageHeader } from "@/components/ui/page-header";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import { getAssetFeed } from "@/server/services/asset-service";
import { formatCurrency } from "@/lib/calculations/money";
import { STARTING_CASH } from "@/lib/simulation/engine";

/**
 * Simulate — the third step, and the one that makes the course stick.
 *
 * Reading about a premium and placing an order into one are different kinds of
 * knowing, and this page is the difference. Everything the learner does here
 * happens in their own browser: no wallet is connected, no key is held, no
 * request is made to a chain, and the trade ticket has no code path that could
 * broadcast anything. That is not a limitation of the MVP — it is the design,
 * and the page says so before the instrument rather than in a footnote.
 *
 * The asset list still comes from the server, so the prices the simulator fills
 * against are the same normalised objects the Explore page renders, resolved the
 * same way, with the same provenance. A simulator that quietly used different
 * numbers from the ones the learner just read would be teaching a different
 * market.
 *
 * Freshness is the Explore page's problem and it solves it the same way: 60s
 * ISR, 60s upstream TTL, and the provenance badge carries the honest timestamp.
 */

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Simulate a portfolio",
  description: `Practise buying and selling tokenized stocks with ${formatCurrency(STARTING_CASH)} of virtual money. No wallet, no keys, no real trades.`,
};

export default async function SimulatePage() {
  const feed = await getAssetFeed();

  return (
    <div className="container-page py-14 md:py-20">
      <PageHeader
        eyebrow="Simulate"
        title={
          <>
            Your first trade, somewhere it{" "}
            <em className="font-normal italic text-teal-strong">
              cannot cost you anything
            </em>
            .
          </>
        }
        lede={
          <>
            You start with {formatCurrency(STARTING_CASH)} of virtual money and every tokenized
            stock in the feed. Buy at the on-chain price, buy at the reference price, sell, and
            watch what the difference does to your balance. Nothing here touches a wallet or a
            blockchain — the portfolio lives in this browser and nowhere else.
          </>
        }
        aside={<ProvenanceBadge provenance={feed.provenance} />}
      >
        {feed.mode === "live" && !feed.degradation ? (
          <LiveFeedNote />
        ) : (
          <FeedNotice feed={feed} />
        )}
      </PageHeader>

      <ScopeNote />

      <div className="mt-10">
        <SimulatorWorkspace assets={feed.assets} />
      </div>

      <p className="mt-16 border-t border-line pt-6 text-[0.875rem] text-ink-muted">
        Want to know why the two prices differ before you trade on them?{" "}
        <Link
          href="/learn/the-tokenized-stock"
          className="font-medium text-teal-strong underline underline-offset-[3px] decoration-teal-line hover:decoration-teal"
        >
          Lesson 3 — The tokenized stock
        </Link>{" "}
        works through it, and{" "}
        <Link
          href="/learn/build-a-portfolio"
          className="font-medium text-teal-strong underline underline-offset-[3px] decoration-teal-line hover:decoration-teal"
        >
          Lesson 7
        </Link>{" "}
        covers what position sizing actually means.
      </p>
    </div>
  );
}

/**
 * What this simulator does not do.
 *
 * Stated up front, in three lines, for two reasons. The honest one: a learner
 * who assumes fees, gas and slippage were modelled will carry a false precision
 * out of the sandbox and into the market. The other: this product must never
 * imply that results here predict anything about real ones, and naming the
 * omissions is the most direct way to refuse that implication.
 */
function ScopeNote() {
  const limits = [
    "No wallet, no keys, no signatures — nothing here can move a real asset.",
    "No fees, gas or slippage are modelled, so simulated fills are flattering.",
    "Past simulated results say nothing about future real ones.",
  ];

  return (
    <div className="mt-10 rounded-xl border border-line bg-surface-muted px-5 py-4">
      <p className="flex items-center gap-2 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-muted">
        <ShieldCheck aria-hidden className="h-3.5 w-3.5 text-teal" />
        What this does not do
      </p>
      <ul className="mt-3.5 grid gap-3 sm:grid-cols-3 sm:gap-6">
        {limits.map((limit) => (
          <li
            key={limit}
            className="border-l border-teal-line pl-3 text-[0.8125rem] leading-relaxed text-ink-muted"
          >
            {limit}
          </li>
        ))}
      </ul>
    </div>
  );
}
