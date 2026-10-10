import Link from "next/link";
import { ArrowRight, BookOpen, Compass, FlaskConical, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, Eyebrow, Rule } from "@/components/ui/card";
import { ProvenanceNotice } from "@/components/ui/provenance-badge";
import { AddressChip } from "@/components/ui/copy-button";
import { lessons, totalEstimatedMinutes } from "@/content/lessons";
import { getAssetFeed } from "@/server/services/asset-service";
import { formatCurrency, formatPercent } from "@/lib/calculations/money";
import { comparePrices } from "@/lib/calculations/price-difference";
import { truncateAddress } from "@/lib/binance/normalize";

export const revalidate = 60;

const PILLARS = [
  {
    step: "01",
    icon: BookOpen,
    title: "Learn",
    body:
      "Eight short lessons that assume you know nothing. Not a glossary — a sequence, where each idea is built on the last one.",
    href: "/learn",
    cta: "Start the course",
  },
  {
    step: "02",
    icon: Compass,
    title: "Explore",
    body:
      "Real tokenized stocks, with the on-chain price and the underlying reference price shown side by side. Including when they disagree.",
    href: "/explore",
    cta: "Browse assets",
  },
  {
    step: "03",
    icon: FlaskConical,
    title: "Simulate",
    body:
      "Trade with simulated capital and watch what your choices actually imply. No wallet, no orders, nothing that touches a real market.",
    href: "/simulate",
    cta: "Open the simulator",
  },
  {
    step: "04",
    icon: ScanSearch,
    title: "Verify",
    body:
      "Read a live contract yourself — address, supply, decimals, bytecode. The one part of this whole subject you never have to take on trust.",
    href: "/onchain",
    cta: "Read the chain",
  },
] as const;

export default async function HomePage() {
  const feed = await getAssetFeed();

  // The hero shows real rows rather than an abstract illustration. Three is the
  // most that stays legible at this size, and we only take assets that actually
  // have both prices — a hero full of em-dashes would undersell the product.
  const featured = feed.assets
    .filter((asset) => asset.price !== null && asset.referencePrice !== null)
    .slice(0, 3);

  return (
    <>
      {/* ===================================================================
          Hero
          =================================================================== */}
      <section className="relative overflow-hidden border-b border-line">
        {/* Graph paper, faded out downward, so the top of the page has texture
            without competing with the type. */}
        <div
          aria-hidden
          className="grid-paper pointer-events-none absolute inset-0 opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
        />

        <div className="container-page relative py-20 sm:py-28 lg:py-32">
          <div className="grid items-start gap-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-20">
            <div className="animate-rise">
              <Eyebrow>BNB Hack · Tokenized Stocks Edition</Eyebrow>

              <h1 className="mt-6 font-display text-display-xl font-semibold text-ink">
                A stock is a claim.
                <br />
                A token is a{" "}
                <em className="not-italic text-teal [font-variation-settings:'WONK'_1]">
                  record
                </em>
                .
                <br />
                <span className="text-ink-muted">Together they get strange.</span>
              </h1>

              <p className="mt-8 max-w-xl text-[1.0625rem] leading-relaxed text-ink-muted">
                StockSchool teaches tokenized stocks by making you look at real ones. You will read
                a live contract on BNB Smart Chain, explain why two prices for the same asset
                disagree, and learn exactly where verification stops and trust begins.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Button as="link" href="/learn" size="lg">
                  Start with Lesson 01
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
                <Button as="link" href="/explore" variant="secondary" size="lg">
                  Look at real assets
                </Button>
              </div>

              <dl className="mt-12 flex flex-wrap gap-x-10 gap-y-5">
                <Stat label="Lessons" value={String(lessons.length)} />
                <Stat label="Reading time" value={`${totalEstimatedMinutes} min`} />
                <Stat label="Wallets required" value="None" />
                <Stat label="Private keys requested" value="Never" />
              </dl>
            </div>

            {/* --- The price pair, rendered from the live feed ---------------- */}
            <div className="animate-rise [animation-delay:120ms]">
              <PricePairPreview
                assets={featured}
                mode={feed.mode}
                degradation={feed.degradation}
                unconfigured={feed.unconfigured}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          The four pillars
          =================================================================== */}
      <section className="container-page py-20 sm:py-24">
        <div className="max-w-2xl">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-4 font-display text-display font-semibold text-ink">
            Four things, in the order that makes them make sense.
          </h2>
          <p className="mt-5 text-[1.0625rem] leading-relaxed text-ink-muted">
            Most explanations of tokenized stocks start with the token. This one starts with the
            share — because until you know what a share is, a tokenized share is just a word.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar) => (
            <Card key={pillar.step} className="flex flex-col" padding="lg">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[0.75rem] tracking-[0.08em] text-ink-subtle">
                  {pillar.step}
                </span>
                <pillar.icon className="h-5 w-5 text-teal" aria-hidden />
              </div>

              <h3 className="mt-6 font-display text-heading font-semibold text-ink">
                {pillar.title}
              </h3>
              <p className="mt-3 flex-1 text-[0.9375rem] leading-relaxed text-ink-muted">
                {pillar.body}
              </p>

              <Link
                href={pillar.href}
                className="mt-6 inline-flex items-center gap-1.5 text-[0.875rem] font-medium text-teal-strong underline-offset-4 hover:underline"
              >
                {pillar.cta}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <div className="container-page">
        <Rule />
      </div>

      {/* ===================================================================
          Curriculum
          =================================================================== */}
      <section className="container-page py-20 sm:py-24">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Eyebrow>The curriculum</Eyebrow>
            <h2 className="mt-4 font-display text-display font-semibold text-ink">
              Eight lessons. One idea at a time.
            </h2>
            <p className="mt-5 text-[1.0625rem] leading-relaxed text-ink-muted">
              Each lesson ends with a quiz that explains its answers, and most contain a hands-on
              mission against a real asset. Nothing is locked behind an account — the whole course
              is open from the first page load.
            </p>
            <div className="mt-8">
              <Button as="link" href="/learn" variant="secondary">
                See the full path
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>

          <ol className="divide-y divide-line border-y border-line">
            {lessons.map((lesson) => (
              <li key={lesson.slug}>
                <Link
                  href={`/learn/${lesson.slug}`}
                  className="group flex items-start gap-5 py-5 transition-colors hover:bg-ink/[0.02]"
                >
                  <span className="mt-0.5 font-mono text-[0.8125rem] text-ink-subtle tabular-nums">
                    {lesson.number}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-[1.25rem] font-semibold tracking-[-0.015em] text-ink group-hover:text-teal-strong">
                      {lesson.title}
                    </span>
                    <span className="mt-1 block text-[0.9375rem] leading-relaxed text-ink-muted">
                      {lesson.description}
                    </span>
                  </span>
                  <span className="mt-1 shrink-0 font-mono text-[0.75rem] text-ink-subtle">
                    {lesson.estimatedMinutes} min
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ===================================================================
          The honesty section
          =================================================================== */}
      <section className="border-y border-line bg-surface-muted">
        <div className="container-page py-20 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow className="justify-center">Where the line is</Eyebrow>
            <h2 className="mt-4 font-display text-display font-semibold text-ink">
              This course will never tell you what to buy.
            </h2>
            <p className="mt-5 text-[1.0625rem] leading-relaxed text-ink-muted">
              Everything here is built to make you harder to mislead — which is a different product
              from one that makes you feel confident.
            </p>
          </div>

          <div className="mx-auto mt-14 grid max-w-4xl gap-6 sm:grid-cols-2">
            <Card padding="lg" className="border-line-strong">
              <p className="eyebrow">What this is</p>
              <ul className="mt-4 space-y-3 text-[0.9375rem] leading-relaxed text-ink-muted">
                {[
                  "An educational tool that explains a real financial product",
                  "A read-only window into live BNB Smart Chain contracts",
                  "A simulator that runs entirely on simulated capital",
                  "Honest about which numbers are live and which are samples",
                ].map((line) => (
                  <li key={line} className="flex gap-3">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                    {line}
                  </li>
                ))}
              </ul>
            </Card>

            <Card padding="lg" className="border-line-strong">
              <p className="eyebrow text-danger [color:var(--color-danger)]">What this is not</p>
              <ul className="mt-4 space-y-3 text-[0.9375rem] leading-relaxed text-ink-muted">
                {[
                  "Investment advice, or a recommendation of any kind",
                  "A broker, an exchange, or a place to hold funds",
                  "A wallet — it will never ask for a key or seed phrase",
                  "A promise that any number here is complete or timely",
                ].map((line) => (
                  <li key={line} className="flex gap-3">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
                    {line}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* ===================================================================
          Closing CTA
          =================================================================== */}
      <section className="container-page py-24 text-center sm:py-28">
        <h2 className="mx-auto max-w-2xl font-display text-display font-semibold text-ink">
          You already know what a share is. Let&rsquo;s find out what it becomes.
        </h2>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Button as="link" href="/learn/what-is-a-stock" size="lg">
            Begin Lesson 01
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
          <Button as="link" href="/onchain" variant="secondary" size="lg">
            Skip ahead and read a contract
          </Button>
        </div>
      </section>
    </>
  );
}

// -----------------------------------------------------------------------------

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ink-subtle">
        {label}
      </dt>
      <dd className="mt-1 font-display text-[1.5rem] font-semibold tracking-[-0.02em] text-ink">
        {value}
      </dd>
    </div>
  );
}

/**
 * The hero's right-hand panel: real assets, both prices, and the gap.
 *
 * This is the product's central idea rendered as an object rather than
 * described in prose. When sample data is in use the panel says so directly on
 * the card — the hero is the most-read surface in the app, and a claim of
 * liveness there would be the worst possible place to be loose with the truth.
 */
function PricePairPreview({
  assets,
  mode,
  degradation,
  unconfigured,
}: {
  assets: Awaited<ReturnType<typeof getAssetFeed>>["assets"];
  mode: "live" | "sample";
  degradation: { message: string; explanation: string } | null;
  unconfigured: boolean;
}) {
  return (
    <div className="relative">
      {/* A soft teal wash behind the card, giving the panel depth without a
          heavy shadow — the editorial look should feel printed, not floating. */}
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-teal-soft/70 via-sky/40 to-transparent blur-2xl"
      />

      <Card padding="none" className="overflow-hidden shadow-[var(--shadow-overlay)]">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="font-display text-[0.9375rem] font-semibold text-ink">
              Two prices, one asset
            </span>
          </div>
          <Badge tone={mode === "live" ? "accent" : "neutral"}>
            {mode === "live" ? "Live" : "Sample"}
          </Badge>
        </div>

        {assets.length === 0 ? (
          <div className="px-5 py-10 text-center text-[0.875rem] text-ink-muted">
            No assets with both prices available right now.
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {assets.map((asset) => {
              const comparison = comparePrices(asset.price, asset.referencePrice);
              return (
                <li key={asset.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate font-display text-[1.0625rem] font-semibold tracking-[-0.01em] text-ink">
                        {asset.underlyingSymbol ?? asset.symbol}
                      </p>
                      <p className="truncate text-[0.8125rem] text-ink-muted">
                        {asset.companyName ?? asset.name}
                      </p>
                    </div>

                    {comparison && (
                      <Badge tone={comparison.difference.direction === "parity" ? "neutral" : "info"}>
                        {comparison.difference.direction === "parity"
                          ? "At parity"
                          : `${formatPercent(comparison.difference.percent)} ${
                              comparison.difference.direction === "premium" ? "above" : "below"
                            }`}
                      </Badge>
                    )}
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-[0.6875rem] uppercase tracking-[0.1em] text-ink-subtle">
                        On-chain
                      </dt>
                      <dd className="mt-0.5 font-mono text-[0.9375rem] tabular-nums text-ink">
                        {formatCurrency(asset.price)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[0.6875rem] uppercase tracking-[0.1em] text-ink-subtle">
                        Reference
                      </dt>
                      <dd className="mt-0.5 font-mono text-[0.9375rem] tabular-nums text-ink-muted">
                        {formatCurrency(asset.referencePrice)}
                      </dd>
                    </div>
                  </dl>

                  {asset.contractAddress && (
                    <div className="mt-3">
                      <AddressChip
                        value={asset.contractAddress}
                        display={truncateAddress(asset.contractAddress)}
                        label={`${asset.symbol} contract address`}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="border-t border-line px-5 py-3">
          <p className="text-[0.75rem] leading-relaxed text-ink-subtle">
            The on-chain price comes from a DEX pool. The reference price comes from the underlying
            equity market. Nothing forces them to agree.
          </p>
        </div>
      </Card>

      {mode === "sample" && (
        <div className="mt-5">
          <ProvenanceNotice
            provenance={{ source: "mock", updatedAt: null, stale: false }}
            reason={
              degradation
                ? `${degradation.message} ${degradation.explanation}`
                : unconfigured
                  ? undefined
                  : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
