import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Card, Eyebrow } from "@/components/ui/card";
import { PageHeader, SectionHeading } from "@/components/ui/page-header";
import { AddressForm } from "@/components/onchain/address-form";
import { getAssetFeed } from "@/server/services/asset-service";
import { DEFAULT_CHAIN, rpcMode, supportedChains } from "@/lib/blockchain/token-reader";

/**
 * The On-Chain Lab, entry point.
 *
 * The fourth and final step of Learn → Explore → Simulate → Understand
 * On-Chain. Everything before this page is us telling the learner something;
 * this is the page where they check. That asymmetry is the reason it exists,
 * and the reason it is allowed to be plainer than the rest of the product — a
 * verification tool that editorialises is not a verification tool.
 *
 * The example contracts come from the live feed rather than being hard-coded, so
 * the tokens offered here are ones the learner has just seen a price for. A
 * hard-coded address would go stale the moment an issuer redeployed, and worse,
 * it would be *our* address rather than one they can trace back to a card on the
 * Explore page.
 */

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Read a token contract",
  description:
    "Inspect any BEP-20 or ERC-20 token contract directly: name, symbol, decimals and total supply, read over public JSON-RPC. Read-only — no wallet required.",
};

export default async function OnChainLabPage() {
  const feed = await getAssetFeed();

  // Only tokens that actually name a contract, and only a handful: this is a
  // doorway, not a second explorer.
  const examples = feed.assets
    .filter((asset) => asset.contractAddress !== null)
    .slice(0, 6);

  const chains = supportedChains();
  const mode = rpcMode();

  return (
    <div className="container-page py-14 md:py-20">
      <PageHeader
        eyebrow="On-chain lab"
        title={
          <>
            Everything else here is our word for it.{" "}
            <em className="font-normal italic text-teal-strong">This page is not.</em>
          </>
        }
        lede={
          <>
            Read a token contract yourself. Give us an address — or paste the block explorer link
            you are already looking at — and we will ask the network for its name, symbol, decimals
            and total supply, then show you the answers and explain exactly how far they get you.
          </>
        }
      />

      <div className="mt-10 max-w-3xl">
        <AddressForm chains={chains} defaultChainId={DEFAULT_CHAIN} />
      </div>

      {examples.length > 0 && (
        <div className="mt-12 border-t border-line pt-8">
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-subtle">
            Or start from one of these
          </p>
          <p className="mt-2 max-w-2xl text-[0.875rem] leading-relaxed text-ink-muted">
            Contracts for tokens currently in the feed. These are real mainnet addresses — opening
            one runs a genuine read against the live network.
          </p>

          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {examples.map((asset) => (
              <li key={asset.id}>
                <Link
                  href={`/onchain/${asset.contractAddress}`}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3.5 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-line-strong"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[0.875rem] font-medium text-ink">
                      {asset.companyName ?? asset.name}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-[0.6875rem] text-ink-subtle">
                      {asset.contractAddress}
                    </span>
                  </span>
                  <ArrowRight
                    aria-hidden
                    className="h-4 w-4 shrink-0 text-ink-subtle transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-teal"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-16 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <Card padding="lg">
          <Eyebrow>Why this is safe to try</Eyebrow>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-muted">
            A read is a question. Asking a contract what it is called cannot change anything about
            it, and it needs no wallet, no signature and no permission from anyone. Every call this
            page makes is one of four standard view functions, and there is no code in this product
            that could send a transaction even if you asked it to.
          </p>
          <ul className="mt-5 space-y-2.5">
            {[
              "No wallet connection, ever.",
              "No private keys, no seed phrases, nothing to lose.",
              "No transaction is built, signed or broadcast.",
            ].map((item) => (
              <li key={item} className="flex gap-2.5 text-[0.875rem] leading-relaxed text-ink">
                <ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card padding="lg">
          <Eyebrow>Where the answers come from</Eyebrow>
          <dl className="mt-4 divide-y divide-line-faint">
            <Row label="Endpoint">
              {mode === "dedicated"
                ? "A dedicated RPC node, configured for this deployment"
                : "Public BNB Chain RPC endpoints, with automatic failover"}
            </Row>
            <Row label="Networks">
              {chains.map((chain) => chain.name).join(", ")}
            </Row>
            <Row label="Caching">Contract reads are held for 30 seconds</Row>
          </dl>
          {mode === "public" && (
            <p className="mt-5 border-t border-line pt-4 text-[0.8125rem] leading-relaxed text-ink-muted">
              We are using shared public nodes, which are rate-limited. If a read fails under load,
              setting <span className="font-mono text-[0.75rem]">BSC_RPC_URL</span> to your own
              endpoint fixes it — the page tells you when a failure was caused by this rather than
              by the contract.
            </p>
          )}
        </Card>
      </div>

      <SectionHeading className="mt-16" eyebrow="The step after this one">
        Keep going
      </SectionHeading>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/learn/investigate-the-blockchain"
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-ink px-5 text-[0.875rem] font-medium text-ink-inverse transition-opacity hover:opacity-90"
        >
          Lesson 8 — Investigate the blockchain
          <ArrowRight aria-hidden className="h-4 w-4" />
        </Link>
        <Link
          href="/explore"
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-line px-5 text-[0.875rem] font-medium text-ink transition-colors hover:border-line-strong"
        >
          Back to the feed
        </Link>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3">
      <dt className="font-mono text-[0.75rem] text-ink-subtle">{label}</dt>
      <dd className="max-w-[22rem] text-right text-[0.8125rem] leading-relaxed text-ink">
        {children}
      </dd>
    </div>
  );
}
