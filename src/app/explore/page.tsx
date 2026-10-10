import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FeedNotice, LiveFeedNote } from "@/components/stocks/feed-notice";
import { AssetExplorer } from "@/components/stocks/asset-explorer";
import { PageHeader } from "@/components/ui/page-header";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import { getAssetFeed } from "@/server/services/asset-service";

/**
 * Explore — every tokenized stock we can see, with both of its prices.
 *
 * This is the "Explore" step of Learn → Explore → Simulate → Understand
 * On-Chain, and it is the page that turns lesson 03's idea into something a
 * learner can touch. It renders on the server so the grid is in the HTML: the
 * page is readable, linkable and indexable before a byte of JavaScript arrives,
 * and the client component that filters it takes over only once it is on screen.
 *
 * Freshness: the page is statically served and revalidated every 60 seconds, and
 * the upstream Binance fetch carries the same TTL, so a price here is at most
 * about a minute old. The `updatedAt` the badges show is the moment we assembled
 * the response — the API's payload does not carry a per-quote timestamp we could
 * attribute instead. That is a real limitation and it is written down in
 * DX_NOTES.md rather than papered over with a suspiciously precise clock.
 */

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Explore tokenized stocks",
  description:
    "Every tokenized stock on BNB Smart Chain with its on-chain price and its reference price side by side, and the difference between them explained.",
};

export default async function ExplorePage() {
  const feed = await getAssetFeed();

  return (
    <div className="container-page py-14 md:py-20">
      <PageHeader
        eyebrow="Explore"
        title={
          <>
            Two prices for the same share,{" "}
            <em className="font-normal italic text-teal-strong">side by side</em>.
          </>
        }
        lede={
          <>
            A tokenized stock is quoted twice: once by the exchange that trades the underlying
            company, and once by the pool on BNB Smart Chain that trades the token. They are usually
            close. They are never guaranteed to be equal, and the gap between them is the single
            most useful thing to understand about this market. Open any token to see both numbers
            — and the working behind the difference.
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

      <div className="mt-12">
        {feed.assets.length > 0 ? (
          <AssetExplorer assets={feed.assets} />
        ) : (
          <EmptyFeed />
        )}
      </div>

      <p className="mt-14 border-t border-line pt-6 text-[0.875rem] text-ink-muted">
        New to this?{" "}
        <Link
          href="/learn/the-tokenized-stock"
          className="font-medium text-teal-strong underline underline-offset-[3px] decoration-teal-line hover:decoration-teal"
        >
          Lesson 3 — The tokenized stock
        </Link>{" "}
        builds the whole idea from the ground up, including why the two prices disagree.
      </p>
    </div>
  );
}

/**
 * The feed is live and genuinely empty.
 *
 * Reachable when the API answers correctly and lists nothing for the configured
 * network, which is why it says so plainly instead of showing the usual
 * "no results" copy — that copy would imply the learner had filtered something
 * out, when in fact there was never anything to filter.
 */
function EmptyFeed() {
  return (
    <div className="grid-paper rounded-2xl border border-line px-6 py-20 text-center">
      <p className="font-display text-[1.375rem] font-semibold tracking-[-0.015em] text-ink">
        The feed returned no tokenized stocks
      </p>
      <p className="mx-auto mt-3 max-w-lg text-[0.9375rem] leading-relaxed text-ink-muted">
        The market data API answered successfully but listed nothing for this network. That is a
        fact about the feed, not a problem with your search.
      </p>
      <Link
        href="/onchain"
        className="mt-6 inline-flex items-center gap-1.5 text-[0.875rem] font-medium text-teal-strong underline underline-offset-[3px] decoration-teal-line hover:decoration-teal"
      >
        Read a contract directly instead
        <ArrowRight aria-hidden className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
