import { Check, Eye, TriangleAlert } from "lucide-react";
import { Card, Eyebrow, Section } from "@/components/ui/card";
import { AddressChip } from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";
import { formatCompact } from "@/lib/calculations/money";
import type { OnChainToken } from "@/types";
import { scaleSupply } from "@/lib/blockchain/token-math";

/**
 * What a contract read actually shows you.
 *
 * The On-Chain Lab's whole purpose is the last step of the course — *verify it
 * yourself* — and the temptation is to render the four properties and stop. That
 * would be a mistake, because the interesting lesson is not what `name()`
 * returned; it is **what that does and does not prove**. A contract that says it
 * is called "NVIDIA bStock" has told you its own name. It has not told you it
 * holds any NVIDIA, and no amount of re-reading it will settle that question.
 *
 * So every result is presented in two halves: the claim, and the boundary of the
 * claim. A learner who internalises that distinction is better equipped than one
 * who has merely seen a block explorer.
 */

export function ContractFacts({
  token,
  explorerHref,
}: {
  token: OnChainToken;
  explorerHref: string | null;
}) {
  return (
    <Card padding="lg">
      <Eyebrow>Read from the contract</Eyebrow>

      <div className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="font-display text-[1.75rem] font-semibold leading-tight tracking-[-0.02em] text-ink">
          {token.name ?? "Unnamed token"}
        </h2>
        {token.symbol && (
          <span className="rounded-md bg-surface-muted px-2 py-0.5 font-mono text-[0.8125rem] font-semibold text-ink-muted">
            {token.symbol}
          </span>
        )}
      </div>

      <div className="mt-4">
        <AddressChip
          value={token.address}
          label="contract address"
          href={explorerHref}
          display={token.address}
        />
      </div>

      <dl className="mt-7 divide-y divide-line-faint border-t border-line">
        <Fact label="name()" value={token.name} />
        <Fact label="symbol()" value={token.symbol} />
        <Fact
          label="decimals()"
          value={token.decimals === null ? null : String(token.decimals)}
          note="how many decimal places the contract stores internally"
        />
        <Fact
          label="totalSupply()"
          value={token.totalSupply === null ? null : token.totalSupply}
          note="raw units, before the decimal shift — see below"
          mono
        />
        <Fact label="Network" value={`${token.chainName} (chain ${token.chainId})`} />
        <Fact label="Read at block" value={token.blockNumber} mono />
      </dl>

      <p className="mt-5 text-[0.75rem] leading-relaxed text-ink-subtle">
        Each line above was a separate call to the contract over a public JSON-RPC
        endpoint, made from our server. A property that shows a dash is one this contract did not
        answer — which is itself a fact about the contract, not a failure of the page.
      </p>
    </Card>
  );
}

function Fact({
  label,
  value,
  note,
  mono = false,
}: {
  label: string;
  value: string | null;
  note?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3">
      <dt className="font-mono text-[0.75rem] text-ink-subtle">{label}</dt>
      <dd className="text-right">
        {value === null ? (
          <span className="text-[0.8125rem] text-ink-subtle">not answered</span>
        ) : (
          <span className={cn("text-[0.875rem] text-ink", mono && "font-mono tabular-nums")}>
            {value}
          </span>
        )}
        {note && <span className="mt-0.5 block text-[0.6875rem] text-ink-subtle">{note}</span>}
      </dd>
    </div>
  );
}

// -----------------------------------------------------------------------------

/**
 * The decimals trap, worked through with this contract's own numbers.
 *
 * `totalSupply()` does not return a number of tokens. It returns an integer in
 * the smallest unit the contract can represent, and the only way to read it is
 * to divide by 10^decimals. Every newcomer gets this wrong once; the lab's job
 * is to make sure it happens here rather than in a position-sizing decision.
 *
 * Shown as an actual division with the learner's own contract in it, because
 * "remember to divide by ten to the power of decimals" is a sentence people
 * nod at and do not absorb.
 */
export function DecimalsExplainer({ token }: { token: OnChainToken }) {
  const scaled = scaleSupply(token.totalSupply, token.decimals);

  return (
    <Card padding="lg">
      <Eyebrow>The decimals trap</Eyebrow>

      {scaled === null ? (
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-muted">
          This contract did not answer both <span className="font-mono text-[0.875rem]">decimals()</span>{" "}
          and <span className="font-mono text-[0.875rem]">totalSupply()</span>, so the supply cannot
          be worked out. That is worth noticing: a token whose decimals you cannot read is a token
          whose amounts you cannot interpret, and every balance you ever see for it will be in units
          you have to guess at. We do not guess — assuming the usual 18 would give a number that
          looks precise and could be wrong by a factor of a trillion.
        </p>
      ) : (
        <>
          <p className="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-ink-muted">
            The supply below is the raw number the contract returned. It is <em>not</em> a number of
            tokens — it is a count of the smallest indivisible unit. Divide by ten to the power of{" "}
            <span className="font-mono text-ink-muted">decimals</span> and the real figure appears.
          </p>

          <div className="mt-6 space-y-3 font-mono text-[0.8125rem]">
            <Step
              label="totalSupply() returned"
              value={groupDigits(scaled.raw)}
              note="raw units"
            />
            <Step
              label={`÷ 10^${scaled.decimals}`}
              value={`÷ ${groupDigits("1" + "0".repeat(scaled.decimals))}`}
              note={`this contract stores ${scaled.decimals} decimal places`}
            />
            <div className="border-t border-line pt-3">
              <Step
                label="Actual supply"
                value={formatCompact(scaled.tokens)}
                note={`${scaled.tokens} tokens, to the last decimal`}
                emphasis
              />
            </div>
          </div>

          <p className="mt-5 text-[0.75rem] leading-relaxed text-ink-subtle">
            Nothing here was rounded before the division, and nothing after it either — the exact
            figure is on the last line, and the compact one above it is only for reading.
          </p>
        </>
      )}
    </Card>
  );
}

function Step({
  label,
  value,
  note,
  emphasis = false,
}: {
  label: string;
  value: string;
  note: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
      <span className="text-ink-subtle">{label}</span>
      <span className="text-right">
        <span
          className={cn(
            "block tabular-nums break-all",
            emphasis ? "text-[1.25rem] font-semibold text-teal-strong" : "text-ink",
          )}
        >
          {value}
        </span>
        <span className="mt-0.5 block font-sans text-[0.6875rem] text-ink-subtle">{note}</span>
      </span>
    </div>
  );
}

/** Thousands separators for a long digit string, without going near a float. */
function groupDigits(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// -----------------------------------------------------------------------------

/**
 * The claim, and the boundary of the claim.
 *
 * Two columns, deliberately given equal weight. A verification panel that only
 * listed what was proven would be teaching credulity with extra steps — the
 * whole reason this course asks a learner to read a contract is so they learn
 * how far that gets them, and the honest answer is: to the edge of what the
 * contract says about itself.
 */
export function VerificationBoundary({ token }: { token: OnChainToken }) {
  const proved = [
    `A contract exists at ${short(token.address)} and it responded to calls.`,
    token.name
      ? `It describes itself as “${token.name}”.`
      : "It did not provide a name.",
    token.decimals !== null
      ? `It stores amounts with ${token.decimals} decimal places.`
      : "It did not disclose its decimal places.",
  ];

  const notProved = [
    "That the issuer actually holds the shares this token is meant to track.",
    "That you could redeem the token for a share — that depends on the issuer's terms, not the contract.",
    "That the price you see elsewhere is a fair one, or that anyone will trade with you at it.",
  ];

  return (
    <Section className="grid gap-6 md:grid-cols-2">
      <div className="rounded-xl border border-teal-line bg-teal-soft/50 p-5">
        <p className="flex items-center gap-2 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-teal-strong">
          <Check aria-hidden className="h-3.5 w-3.5" />
          What you just verified
        </p>
        <ul className="mt-4 space-y-2.5">
          {proved.map((item) => (
            <li key={item} className="flex gap-2.5 text-[0.875rem] leading-relaxed text-ink">
              <Eye aria-hidden className="mt-1 h-3.5 w-3.5 shrink-0 text-teal" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-warning/25 bg-warning-soft/60 p-5">
        <p className="flex items-center gap-2 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-warning">
          <TriangleAlert aria-hidden className="h-3.5 w-3.5" />
          What you have not
        </p>
        <ul className="mt-4 space-y-2.5">
          {notProved.map((item) => (
            <li key={item} className="flex gap-2.5 text-[0.875rem] leading-relaxed text-ink">
              <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-warning/60" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-warning/20 pt-3 text-[0.75rem] leading-relaxed text-ink-muted">
          Reading the chain is how you check the parts that are checkable. Knowing which parts
          those are is the skill.
        </p>
      </div>
    </Section>
  );
}

function short(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}
