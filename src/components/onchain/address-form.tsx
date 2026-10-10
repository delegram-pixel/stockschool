"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The address box for the On-Chain Lab.
 *
 * A client component for exactly one reason: it navigates. Everything it shows
 * is static, and the read it triggers happens on the server, so no chain
 * request, no RPC URL and no viem code ever reaches the browser. A learner
 * inspecting a contract should not be handed a wallet-shaped bundle in order to
 * do it.
 *
 * **It accepts a block-explorer URL as well as a bare address**, which is the
 * small detail that makes this usable. Nobody copies a 42-character hex string;
 * they copy the BscScan tab they are looking at. `extractAddress` pulls the
 * address out of whatever was pasted, so both work and neither needs explaining.
 */

/** Any 0x-prefixed 20-byte hex string, anywhere in the input. */
const ADDRESS_IN_TEXT = /0x[a-fA-F0-9]{40}/;

export function extractAddress(input: string): string | null {
  const match = ADDRESS_IN_TEXT.exec(input.trim());
  return match ? match[0] : null;
}

export function AddressForm({
  chains,
  defaultChainId,
  className,
}: {
  chains: { chainId: number; name: string }[];
  defaultChainId: number;
  className?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [chainId, setChainId] = useState(defaultChainId);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function submit(event: React.FormEvent) {
    event.preventDefault();

    const address = extractAddress(value);
    if (!address) {
      setError(
        "We could not find a contract address in that. It should be 42 characters and start with 0x — or paste the block explorer link and we will pick it out.",
      );
      return;
    }

    setError(null);
    setPending(true);
    // Chain is only carried in the query when it is not the default, so the
    // common case produces the canonical URL.
    router.push(
      chainId === defaultChainId
        ? `/onchain/${address}`
        : `/onchain/${address}?chain=${chainId}`,
    );
  }

  return (
    <form onSubmit={submit} className={cn("not-prose", className)} noValidate>
      <label
        htmlFor="contract-address"
        className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ink-subtle"
      >
        Contract address
      </label>

      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
          />
          <input
            id="contract-address"
            name="address"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              if (error) setError(null);
            }}
            // Not `type="url"`: it accepts an address too, and a browser
            // validation bubble on a perfectly good hex string would be wrong.
            type="text"
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="none"
            placeholder="0x… or https://bscscan.com/token/0x…"
            aria-invalid={error !== null}
            aria-describedby={error ? "contract-address-error" : "contract-address-hint"}
            className={cn(
              "h-12 w-full rounded-lg border bg-surface pl-10 pr-3 font-mono text-[0.8125rem] text-ink",
              "placeholder:font-sans placeholder:text-[0.875rem] placeholder:text-ink-subtle",
              "transition-colors focus:outline-none",
              error
                ? "border-danger/50 focus:border-danger"
                : "border-line hover:border-line-strong focus:border-teal",
            )}
          />
        </div>

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Reading…" : "Read contract"}
          <ArrowRight aria-hidden className="h-4 w-4" />
        </Button>
      </div>

      {chains.length > 1 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Network">
          <span className="mr-1 text-[0.75rem] text-ink-subtle">Network</span>
          {chains.map((chain) => (
            <button
              key={chain.chainId}
              type="button"
              onClick={() => setChainId(chain.chainId)}
              aria-pressed={chainId === chain.chainId}
              className={cn(
                "rounded-full px-3 py-1 text-[0.75rem] font-medium transition-colors",
                chainId === chain.chainId
                  ? "bg-ink text-ink-inverse"
                  : "bg-surface-muted text-ink-muted hover:bg-surface-sunken hover:text-ink",
              )}
            >
              {chain.name}
            </button>
          ))}
        </div>
      )}

      {error ? (
        <p id="contract-address-error" role="alert" className="mt-2.5 text-[0.8125rem] text-danger">
          {error}
        </p>
      ) : (
        <p id="contract-address-hint" className="mt-2.5 text-[0.75rem] text-ink-subtle">
          We only ever <em className="not-italic font-medium text-ink-muted">read</em> from a
          contract. No wallet, no signature, nothing written.
        </p>
      )}
    </form>
  );
}
