import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import { Card, Eyebrow, Section } from "@/components/ui/card";
import { PageHeader, SectionHeading } from "@/components/ui/page-header";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import { AddressChip } from "@/components/ui/copy-button";
import {
  ContractFacts,
  DecimalsExplainer,
  VerificationBoundary,
} from "@/components/onchain/contract-facts";
import { getAssetFeed } from "@/server/services/asset-service";
import {
  SUPPORTED_CHAINS,
  explorerUrl,
  readToken,
} from "@/lib/blockchain/token-reader";
import type { SupportedChainId } from "@/lib/blockchain/token-reader";
import type { ProviderErrorCode } from "@/types";

/**
 * The On-Chain Lab, reading a real contract.
 *
 * This is the fourth step of the course and the one that changes its character.
 * Learn, Explore and Simulate all run on data *we* assembled; this page runs on
 * data the learner fetched, from a contract they named, and the answer is not
 * ours to shape. It is the only page in the product where the interesting part
 * is what a third party says when asked directly.
 *
 * It is therefore also the page that must never overstate. The read is real, the
 * block number is real, and the panel underneath says plainly which claims
 * remain unverified — see `VerificationBoundary`.
 *
 * Freshness: revalidated every 30 seconds. A token's `name` and `decimals` are
 * effectively immutable, but `totalSupply` is not, and neither is the block
 * number we report, so a longer cache would put a stale height under a page
 * whose entire promise is "as of right now". The absolute timestamp is shown
 * rather than hidden.
 */

export const revalidate = 30;

/** Resolve `?chain=` against the chains we actually support. */
function parseChainId(raw: string | string[] | undefined): SupportedChainId {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed in SUPPORTED_CHAINS) {
    return parsed as SupportedChainId;
  }
  // Falling back to BNB Smart Chain rather than erroring: the default network is
  // the one the course is about, and a stray query parameter should not produce
  // a dead page. The rendered chain name makes the substitution visible.
  return 56;
}

function firstParam(raw: string | string[] | undefined): string {
  return (Array.isArray(raw) ? raw[0] : raw) ?? "";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ address: string }>;
}): Promise<Metadata> {
  const { address } = await params;
  return {
    title: `Contract ${truncate(address)}`,
    description:
      "Read a token contract directly from BNB Smart Chain: name, symbol, decimals and total supply, fetched over public JSON-RPC.",
    // A page whose content is one contract read is not a search result worth
    // returning for anything; the lab landing page is the entry point.
    robots: { index: false, follow: true },
  };
}

export default async function ContractPage({
  params,
  searchParams,
}: {
  params: Promise<{ address: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ address }, query] = await Promise.all([params, searchParams]);
  const chainId = parseChainId(query.chain);

  const result = await readToken(decodeURIComponent(address), chainId);

  if (!result.ok) {
    // An invalid address is the one failure that is a 404 rather than a panel:
    // there is no page here, and saying so is more accurate than rendering an
    // error inside a page that should not exist.
    if (result.error.code === "INVALID_RESPONSE") notFound();
    return <ReadFailure message={result.error.message} code={result.error.code} chainId={chainId} />;
  }

  const token = result.data;
  const href = explorerUrl(token.chainId, "address", token.address);

  // Is this contract one of the tokens in our own feed? If so, the learner can
  // cross from "what the contract says" to "what it is worth", which is the
  // whole arc of the course in one click.
  const feed = await getAssetFeed();
  const known = feed.assets.find(
    (asset) => asset.contractAddress?.toLowerCase() === token.address.toLowerCase(),
  );

  return (
    <div className="container-page py-14 md:py-20">
      <Link
        href="/onchain"
        className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
        On-Chain Lab
      </Link>

      <PageHeader
        className="mt-6"
        eyebrow="On-chain lab"
        title={
          <>
            What the contract says,{" "}
            <em className="font-normal italic text-teal-strong">in its own words</em>.
          </>
        }
        lede={
          <>
            We asked {token.chainName} directly about this address and are showing you the answers
            unedited. Nothing on this page came from a market data feed.
          </>
        }
        aside={<ProvenanceBadge provenance={token.provenance} />}
      />

      <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start">
        <ContractFacts token={token} explorerHref={href} />

        <div className="space-y-8 lg:sticky lg:top-28">
          {known && (
            <Card padding="lg">
              <Eyebrow>We recognise this contract</Eyebrow>
              <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-muted">
                This address is {known.companyName ?? known.name} in our own feed. You can see what
                the market currently thinks it is worth — and how far that sits from the underlying
                share.
              </p>
              <Link
                href={`/stocks/${known.symbol}`}
                className="mt-5 inline-flex items-center gap-1.5 text-[0.875rem] font-medium text-teal-strong underline decoration-teal-line underline-offset-[3px] hover:decoration-teal"
              >
                Open {known.symbol} and compare both prices
                <ArrowRight aria-hidden className="h-3.5 w-3.5" />
              </Link>
            </Card>
          )}

          {href && (
            <Card padding="lg">
              <Eyebrow>Check it yourself</Eyebrow>
              <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-muted">
                Everything on this page can be confirmed without us. A block explorer runs the same
                reads from a different computer — if the two ever disagree, believe the explorer.
              </p>
              <div className="mt-5">
                <AddressChip
                  value={token.address}
                  label="contract address"
                  href={href}
                  display={`View on ${explorerName(token.chainId)}`}
                />
              </div>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-[0.8125rem] text-ink-muted underline decoration-line-strong underline-offset-2 transition-colors hover:text-ink"
              >
                Opens in a new tab
                <ExternalLink aria-hidden className="h-3 w-3" />
              </a>
            </Card>
          )}
        </div>
      </div>

      <Section>
        <DecimalsExplainer token={token} />
      </Section>

      <Section>
        <SectionHeading eyebrow="The limits of a contract read">
          Verified, and not verified
        </SectionHeading>
        <p className="mt-4 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-muted">
          This is the part almost every guide skips. Reading a contract proves what the contract
          says. It cannot prove that the thing it describes is true, and confusing the two is how
          people end up trusting a token because it has a convincing name.
        </p>
        <div className="mt-8">
          <VerificationBoundary token={token} />
        </div>
      </Section>

      <p className="mt-4 border-t border-line pt-6 text-[0.875rem] text-ink-muted">
        Lesson 8,{" "}
        <Link
          href="/learn/investigate-the-blockchain"
          className="font-medium text-teal-strong underline underline-offset-[3px] decoration-teal-line hover:decoration-teal"
        >
          Investigate the blockchain
        </Link>
        , walks through this page step by step with a contract of its own.
      </p>
    </div>
  );
}

// -----------------------------------------------------------------------------

/**
 * The read failed, and the failure is the lesson.
 *
 * Every branch here is a *real* state of a real read, not a generic error page,
 * and each one tells the learner what it means rather than apologising. The
 * distinction between "there is no contract at that address" and "the network
 * could not be reached" is exactly the kind of thing this course exists to make
 * legible.
 */
const GUIDANCE: Record<ProviderErrorCode, { title: string; detail: string }> = {
  NOT_FOUND: {
    title: "Nothing to read there",
    detail:
      "An address can be perfectly valid and still have no token contract at it. This is the most common result when an address is copied from a different network — the same address almost always has different contents on each chain.",
  },
  UNAUTHORIZED: {
    title: "The RPC endpoint refused us",
    detail:
      "The configured node rejected the request. If you are running this deployment yourself, check the RPC credentials in the environment.",
  },
  RATE_LIMITED: {
    title: "Too many reads from this server",
    detail:
      "Public RPC endpoints are shared and rate-limited. Waiting a few seconds and trying again usually works; setting a dedicated `BSC_RPC_URL` removes the problem entirely.",
  },
  TIMEOUT: {
    title: "The network did not answer in time",
    detail:
      "The request went out and nothing came back before we gave up. This is a fact about the connection, not about the contract.",
  },
  UPSTREAM_ERROR: {
    title: "Could not reach the network",
    detail:
      "Every configured RPC endpoint failed. The page cannot tell you anything about this contract right now, and would rather say so than guess.",
  },
  INVALID_RESPONSE: {
    title: "That is not a contract address",
    detail:
      "An EVM address is 42 characters long and begins with 0x. Anything else cannot be looked up.",
  },
  NOT_CONFIGURED: {
    title: "No RPC endpoint is configured",
    detail:
      "This deployment has no blockchain endpoint set. Add `BSC_RPC_URL` to the environment and the lab will start working.",
  },
};

function ReadFailure({
  message,
  code,
  chainId,
}: {
  message: string;
  code: ProviderErrorCode;
  chainId: SupportedChainId;
}) {
  const guidance = GUIDANCE[code];
  const chain = SUPPORTED_CHAINS[chainId];

  return (
    <div className="container-page py-14 md:py-20">
      <Link
        href="/onchain"
        className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
        On-Chain Lab
      </Link>

      <PageHeader
        className="mt-6"
        eyebrow="On-chain lab"
        title={guidance.title}
        lede={message}
        divider={false}
      />

      <div className="mt-10 max-w-2xl rounded-2xl border border-line bg-surface-muted p-6 sm:p-8">
        <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-subtle">
          What it means
        </p>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-muted">{guidance.detail}</p>
        <p className="mt-4 font-mono text-[0.75rem] text-ink-subtle">
          code {code} · {chain.name}
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/onchain"
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-ink px-5 text-[0.875rem] font-medium text-ink-inverse transition-opacity hover:opacity-90"
        >
          Try a different address
        </Link>
        <Link
          href="/explore"
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-line px-5 text-[0.875rem] font-medium text-ink transition-colors hover:border-line-strong"
        >
          Browse the feed instead
        </Link>
      </div>
    </div>
  );
}

function explorerName(chainId: number): string {
  const entry = SUPPORTED_CHAINS[chainId as SupportedChainId];
  if (!entry) return "the explorer";
  return entry.explorer.replace("https://", "");
}

function truncate(address: string): string {
  return address.length > 14 ? `${address.slice(0, 8)}…${address.slice(-4)}` : address;
}
