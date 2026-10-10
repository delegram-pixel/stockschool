import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, ExternalLink } from "lucide-react";
import { ContractRow } from "@/components/stocks/asset-card";
import { AssetMark, ProviderChip, providerLabel } from "@/components/stocks/asset-mark";
import { Derivation } from "@/components/stocks/derivation";
import { FeedNotice } from "@/components/stocks/feed-notice";
import { PricePair } from "@/components/stocks/price-pair";
import { Card, Eyebrow } from "@/components/ui/card";
import { PageHeader, SectionHeading } from "@/components/ui/page-header";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import { explorerUrl } from "@/lib/blockchain/token-reader";
import {
  comparePrices,
  describeDifference,
  isNotableDifference,
} from "@/lib/calculations/price-difference";
import { formatQuantity } from "@/lib/calculations/money";
import { getAssetBySymbol } from "@/server/services/asset-service";
import type { TokenizedStock } from "@/types";

/**
 * One tokenized stock, in full.
 *
 * The page answers a question in the order a curious learner would ask it:
 *
 *   1. **What is it?** — the issuer, the company it tracks, the token symbol.
 *   2. **What does it cost?** — both prices, at display size.
 *   3. **Why do they differ?** — the neutral explanation, then the arithmetic
 *      shown step by step, so the number is inspectable rather than asserted.
 *   4. **Can I check all of this myself?** — the contract address, the block
 *      explorer, and a link into the on-chain lab to read the contract directly.
 *
 * Step 4 is the one that matters most and is most often missing from products
 * like this. A learner who has been told a token tracks NVIDIA has learned a
 * claim; a learner who has opened the contract on BscScan has verified one.
 */

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}): Promise<Metadata> {
  const { symbol } = await params;
  const lookup = await getAssetBySymbol(symbol);

  if (!lookup) {
    return { title: `No tokenized stock matching “${symbol}”` };
  }

  const { asset } = lookup;
  const name = asset.companyName ?? asset.name;

  return {
    title: `${name} (${asset.symbol}) — prices and on-chain contract`,
    description: `The on-chain price and reference price of ${name}, the difference between them, and the contract address on ${asset.chainName ?? "chain"}.`,
  };
}

export default async function StockPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const lookup = await getAssetBySymbol(symbol);
  if (!lookup) notFound();

  const { asset, mode, degradation, unconfigured } = lookup;
  const comparison = comparePrices(asset.price, asset.referencePrice);
  const notable = isNotableDifference(comparison);
  const contractHref =
    asset.contractAddress && asset.chainId !== null
      ? explorerUrl(asset.chainId, "address", asset.contractAddress)
      : null;

  return (
    <div className="container-page py-10 md:py-14">
      <Link
        href="/explore"
        className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
        All tokenized stocks
      </Link>

      <PageHeader
        divider={false}
        className="mt-8"
        eyebrow={asset.sector ?? "Tokenized stock"}
        title={asset.companyName ?? asset.name}
        aside={<ProvenanceBadge provenance={asset.provenance} />}
        lede={
          <>
            <span className="font-mono text-[0.9375rem] text-ink">{asset.symbol}</span>
            {asset.underlyingSymbol && asset.underlyingSymbol !== asset.symbol && (
              <> · tracks {asset.underlyingSymbol}</>
            )}{" "}
            · issued by {providerLabel(asset.provider)}
            {asset.chainName && <> · {asset.chainName}</>}
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <AssetMark asset={asset} size="lg" />
          <ProviderChip provider={asset.provider} />
          {asset.marketStatus !== "open" && asset.marketStatus !== "unknown" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-muted px-2.5 py-1 text-[0.75rem] font-medium capitalize text-ink-muted">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-warning" />
              {asset.marketStatus === "pre"
                ? "Pre-market"
                : asset.marketStatus === "post"
                  ? "After hours"
                  : "Underlying market closed"}
            </span>
          )}
        </div>

        {mode !== "live" && (
          <FeedNotice
            feed={{
              assets: [],
              provenance: asset.provenance,
              mode,
              degradation,
              unconfigured,
            }}
          />
        )}
      </PageHeader>

      {/* The two-column body: the observation on the left, the working on the
          right. On a wide screen the derivation stays in view while the reader
          scrolls the numbers, which is the whole point of showing it. */}
      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <Card padding="lg" className="bg-surface">
            <Eyebrow>The two prices</Eyebrow>
            <div className="mt-6">
              <PricePair asset={asset} size="lg" />
            </div>
          </Card>

          <div className="mt-8 space-y-4">
            <p className="text-[1.0625rem] leading-relaxed text-ink">
              {describeDifference(comparison)}
            </p>

            {notable && (
              <div className="rounded-xl border border-line bg-surface-muted px-4 py-3.5 text-[0.875rem] leading-relaxed text-ink-muted">
                <p className="font-semibold text-ink">A gap this size is worth pausing on.</p>
                <p className="mt-1">
                  On a tokenized stock the two prices are held together by arbitrage: anyone who
                  spots a gap can buy on the cheaper side and sell on the dearer one, and doing so
                  pushes the prices back together. That mechanism is weaker when the underlying
                  market is closed, when the pool is thin, or when few people are watching. A wide
                  gap is evidence of one of those conditions — not a signal to trade into it.
                </p>
              </div>
            )}
          </div>

          <section className="mt-14">
            <SectionHeading eyebrow="What we know" level={2}>
              The facts behind the number
            </SectionHeading>
            <Facts asset={asset} contractHref={contractHref} />
          </section>

          <section className="mt-14">
            <SectionHeading eyebrow="Verify it yourself" level={2}>
              Don&rsquo;t take our word for it
            </SectionHeading>
            <p className="mt-4 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-muted">
              Everything on this page is either a number the market data API returned or a fact the
              contract itself reports. Both can be checked from here. Reading a contract costs
              nothing and requires no wallet — it is a question asked of a public node, and anyone
              can ask it.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/onchain/${asset.contractAddress ?? ""}`}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-[0.8125rem] font-medium text-ink transition-colors hover:border-ink hover:bg-surface-muted"
              >
                Read this contract
                <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
              </Link>

              {contractHref && (
                <a
                  href={contractHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-[0.8125rem] font-medium text-ink transition-colors hover:border-ink hover:bg-surface-muted"
                >
                  Open in block explorer
                  <ExternalLink aria-hidden className="h-3.5 w-3.5" />
                </a>
              )}

              <Link
                href="/api/stocks"
                className="inline-flex h-10 items-center gap-2 rounded-lg px-4 font-mono text-[0.75rem] text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
              >
                /api/stocks
              </Link>
            </div>
          </section>
        </div>

        {/* ---------------------------------------------------------------- */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <Card padding="lg" className="bg-surface-muted">
            <Eyebrow>Show the working</Eyebrow>
            <h2 className="mt-3 font-display text-[1.125rem] font-semibold tracking-[-0.012em] text-ink">
              Where the percentage comes from
            </h2>
            <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-muted">
              Four lines of arithmetic. Nothing is hidden behind a formula you have to trust.
            </p>

            <div className="mt-6">
              <Derivation comparison={comparison} />
            </div>
          </Card>

          <RelatedLessons />
        </aside>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------

/**
 * The facts table.
 *
 * A `dl`, not a table: these are name/value pairs, and pairing them in a
 * definition list means a screen reader announces "Token symbol, NVDAB" as one
 * unit rather than making the listener track a column header across a grid.
 *
 * Rows with no value are omitted rather than shown empty. "Token ratio —" reads
 * as a missing feature; leaving the row out reads as a fact the issuer does not
 * disclose, which is what it is.
 */
function Facts({ asset, contractHref }: { asset: TokenizedStock; contractHref: string | null }) {
  const rows: { label: string; value: React.ReactNode }[] = [];

  if (asset.underlyingSymbol) {
    rows.push({
      label: "Underlying ticker",
      value: <span className="font-mono">{asset.underlyingSymbol}</span>,
    });
  }
  rows.push({ label: "Token symbol", value: <span className="font-mono">{asset.symbol}</span> });
  rows.push({ label: "Issuer", value: providerLabel(asset.provider) });
  if (asset.chainName) rows.push({ label: "Network", value: asset.chainName });
  if (asset.sector) rows.push({ label: "Sector", value: asset.sector });
  if (asset.tokenRatio) {
    rows.push({
      label: "Token ratio",
      value: <span className="font-mono">{formatQuantity(asset.tokenRatio)}</span>,
    });
  }

  rows.push({
    label: "Contract",
    value: asset.contractAddress ? (
      <ContractRow address={asset.contractAddress} explorerHref={contractHref} />
    ) : (
      <span className="text-ink-subtle">Not listed</span>
    ),
  });

  return (
    <dl className="mt-6 divide-y divide-line border-y border-line">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-wrap items-baseline gap-x-6 gap-y-1 py-3.5">
          <dt className="w-40 shrink-0 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ink-subtle">
            {row.label}
          </dt>
          <dd className="min-w-0 flex-1 text-[0.9375rem] text-ink">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The lessons that explain this page.
 *
 * Three, in the order the ideas build: what a tokenized stock *is*, why the two
 * prices separate, and why the gap can persist. Linking them from the asset page
 * is what closes the loop between Explore and Learn — the learner arrived here
 * curious about a number and leaves with the syllabus that explains it.
 */
function RelatedLessons() {
  const related = [
    {
      slug: "the-tokenized-stock",
      number: "03",
      title: "The tokenized stock",
      why: "What these tokens are, and why they have two prices at all.",
    },
    {
      slug: "market-hours",
      number: "04",
      title: "Market hours",
      why: "Why the gap widens at night and at weekends.",
    },
    {
      slug: "liquidity-and-depth",
      number: "06",
      title: "Liquidity and depth",
      why: "Why a thin pool lets a small trade move the price.",
    },
  ];

  return (
    <div className="mt-10">
      <Eyebrow>Go deeper</Eyebrow>
      <ul className="mt-4 space-y-1">
        {related.map((lesson) => (
          <li key={lesson.slug}>
            <Link
              href={`/learn/${lesson.slug}`}
              className="group flex gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-muted"
            >
              <span className="mt-0.5 font-mono text-[0.6875rem] font-semibold text-teal">
                {lesson.number}
              </span>
              <span className="min-w-0">
                <span className="block text-[0.875rem] font-semibold text-ink">
                  {lesson.title}
                </span>
                <span className="mt-0.5 block text-[0.8125rem] leading-snug text-ink-muted">
                  {lesson.why}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
