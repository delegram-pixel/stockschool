"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff, Lock, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Segmented, Stage, WidgetNote } from "./parts";
import type { WidgetProps } from "./types";

/**
 * The three strings, and which one you may hand over.
 *
 * This widget exists because the failure mode it teaches is not exotic. People
 * paste a seed phrase into a support form, or into a "wallet validation" page,
 * because nobody ever showed them the difference between the string that is
 * safe to publish and the string that *is* the money.
 *
 * So the layout is deliberately blunt: the address and the two secrets sit
 * side by side at the same size, each with what it can do and what happens when
 * it leaks. Then the derivation chain underneath shows why the leak is total —
 * every key you own is reachable from the one phrase, and none of the arrows
 * run backwards.
 *
 * Every value on screen is fabricated for display. Nothing here performs real
 * key derivation, and the widget says so rather than letting a learner wonder.
 */

const EXAMPLE_PHRASE =
  "ridge canyon lantern velvet orbit marble thistle quartz pelican meadow anchor drift";

/**
 * A deterministic, non-cryptographic stand-in for a derived value.
 *
 * This is an FNV-1a-style accumulator, chosen because it produces a stable
 * string that *looks* derived and is identical on every render — not because it
 * resembles key derivation in any way. It has no cryptographic properties and
 * nothing in this product treats its output as a key.
 */
function pseudoHex(input: string, length: number): string {
  let h = 2166136261;
  let out = "";

  for (let i = 0; i < length; i++) {
    h ^= input.charCodeAt(i % input.length) + i * 7;
    h = Math.imul(h, 16777619) >>> 0;
    out += "0123456789abcdef".charAt(h % 16);
  }

  return out;
}

const ADDRESS = `0x${pseudoHex("address-0", 40)}`;

type Row = {
  id: string;
  label: string;
  value: (index: number) => string;
  secret: boolean;
  can: string;
  leaks: string;
};

const ROWS: Row[] = [
  {
    id: "address",
    label: "Public address",
    value: () => ADDRESS,
    secret: false,
    can: "Receive tokens. Appear on a block explorer. Be shared in a job application.",
    leaks:
      "Nothing. It is a destination, not a credential — publishing it lets people send you things, which is the point of it.",
  },
  {
    id: "key",
    label: "Private key",
    value: (index) => `0x${pseudoHex(`key-${index}`, 64)}`,
    secret: true,
    can: "Sign transactions from one address. Whoever holds it controls everything at that address, permanently.",
    leaks:
      "That account is gone. Not frozen, not recoverable, not disputable — anyone holding the key can move everything out, and the chain has no concept of a rightful owner.",
  },
  {
    id: "seed",
    label: "Seed phrase",
    value: () => EXAMPLE_PHRASE,
    secret: true,
    can: "Regenerate every private key your wallet has ever made, in order, on any device.",
    leaks:
      "Everything is gone. The phrase is not one account — it is the root of the tree, so a single leak compromises every address you have ever derived from it, including ones you have not used yet.",
  },
];

export function WalletAnatomy(_props: WidgetProps) {
  const [revealed, setRevealed] = useState(false);
  const [index, setIndex] = useState(0);

  const chain = useMemo(
    () => [
      {
        step: "Seed phrase",
        detail: "12 or 24 words, drawn from a fixed list of 2,048",
        operation: "BIP-39",
        value: revealed ? EXAMPLE_PHRASE : "•••• •••• •••• •••• •••• ••••",
        secret: true,
      },
      {
        step: "Seed",
        detail: "A 512-bit number derived from those words",
        operation: "BIP-32",
        value: `0x${pseudoHex("seed", 16)}…`,
        secret: true,
      },
      {
        step: "Private key",
        detail: "One per account, at a numbered position in the tree",
        operation: `m/44'/60'/0'/0/${index}`,
        value: `0x${pseudoHex(`key-${index}`, 40)}…`,
        secret: true,
      },
      {
        step: "Public key",
        detail: "A point on a curve, computed from the private key",
        operation: "ECDSA secp256k1",
        value: `0x${pseudoHex(`pub-${index}`, 32)}…`,
        secret: false,
      },
      {
        step: "Address",
        detail: "The last 20 bytes of a hash of the public key",
        operation: "Keccak-256",
        value: index === 0 ? ADDRESS : `0x${pseudoHex(`address-${index}`, 40)}`,
        secret: false,
      },
    ],
    [revealed, index],
  );

  return (
    <div className="space-y-5">
      {/* --- The rule, stated first ----------------------------------------- */}
      <div className="flex gap-3 rounded-xl border border-danger/30 bg-danger-soft px-5 py-4">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden />
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-danger">
            The rule that has no exceptions
          </p>
          <p className="mt-1.5 max-w-prose text-[0.9375rem] leading-relaxed text-ink">
            StockSchool will never ask you for a private key or a seed phrase. Neither will any
            legitimate wallet, exchange, support agent, airdrop, or page that has detected a problem
            with your account. Anyone who asks is trying to take everything you have, and the
            request itself is the only evidence you need.
          </p>
        </div>
      </div>

      {/* --- The three strings ---------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.6875rem] uppercase tracking-widest text-ink-subtle">
          Three strings, one of which is safe
        </p>
        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          aria-pressed={revealed}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[0.8125rem] font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/45",
            revealed ? "bg-danger-soft text-danger" : "bg-surface text-ink-muted hover:text-ink",
          )}
        >
          {revealed ? <EyeOff className="h-3.5 w-3.5" aria-hidden /> : <Eye className="h-3.5 w-3.5" aria-hidden />}
          {revealed ? "Hide the example secrets" : "Reveal the example secrets"}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {ROWS.map((row) => {
          const hidden = row.secret && !revealed;
          return (
            <div
              key={row.id}
              className={cn(
                "flex flex-col rounded-xl border px-5 py-4",
                row.secret ? "border-danger/25 bg-surface" : "border-success/30 bg-success-soft/40",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-display text-[1.0625rem] font-semibold tracking-[-0.01em] text-ink">
                  {row.label}
                </p>
                {row.secret ? (
                  <Badge tone="negative">
                    <Lock className="h-3 w-3" aria-hidden />
                    Never share
                  </Badge>
                ) : (
                  <Badge tone="positive">Safe to share</Badge>
                )}
              </div>

              <p
                className={cn(
                  "mt-3 min-h-16 break-all rounded-lg border border-line px-3 py-2.5 font-mono text-[0.75rem] leading-relaxed",
                  hidden ? "select-none bg-surface-sunken text-ink-subtle" : "bg-surface-muted text-ink",
                )}
                aria-hidden={hidden}
              >
                {hidden ? "•".repeat(48) : row.value(index)}
              </p>

              <dl className="mt-4 flex-1 space-y-3">
                <div>
                  <dt className="text-[0.6875rem] uppercase tracking-widest text-ink-subtle">
                    What it can do
                  </dt>
                  <dd className="mt-1 text-[0.875rem] leading-relaxed text-ink-muted">{row.can}</dd>
                </div>
                <div>
                  <dt
                    className={cn(
                      "text-[0.6875rem] uppercase tracking-widest",
                      row.secret ? "text-danger" : "text-ink-subtle",
                    )}
                  >
                    If it leaks
                  </dt>
                  <dd className="mt-1 text-[0.875rem] leading-relaxed text-ink-muted">
                    {row.leaks}
                  </dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>

      {/* --- The derivation chain ------------------------------------------- */}
      <Stage tone="grid" className="px-5 py-6 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[0.6875rem] uppercase tracking-[0.13em] text-ink-subtle">
              How they relate
            </p>
            <p className="mt-1 font-display text-[1.1875rem] font-semibold tracking-[-0.015em] text-ink">
              Every arrow runs one way
            </p>
          </div>

          <div>
            <p className="mb-2 text-[0.6875rem] uppercase tracking-widest text-ink-subtle">
              Account
            </p>
            <Segmented
              label="Account index"
              value={String(index)}
              onChange={(value) => setIndex(Number(value))}
              options={[0, 1, 2, 3].map((i) => ({ id: String(i), label: i === 0 ? "First" : `#${i}` }))}
            />
          </div>
        </div>

        <ol className="mt-6 space-y-0">
          {chain.map((link, i) => (
            <li key={link.step}>
              <div
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-lg border px-4 py-3",
                  link.secret ? "border-line bg-surface" : "border-success/25 bg-surface",
                )}
              >
                <div className="min-w-0">
                  <p className="text-[0.875rem] font-medium text-ink">{link.step}</p>
                  <p className="mt-0.5 text-[0.75rem] text-ink-muted">{link.detail}</p>
                  <p className="mt-1.5 truncate font-mono text-[0.75rem] text-ink-subtle">
                    {link.value}
                  </p>
                </div>
                <Badge tone={link.secret ? "negative" : "positive"}>
                  {link.secret ? "Secret" : "Public"}
                </Badge>
              </div>

              {i < chain.length - 1 && (
                <div className="flex items-center gap-3 py-1.5 pl-4">
                  <span
                    aria-hidden
                    className="h-6 w-px"
                    style={{ background: "var(--color-line-strong)" }}
                  />
                  <span className="font-mono text-[0.6875rem] tracking-[0.08em] text-ink-subtle">
                    {chain[i + 1]?.operation} ↓ one way
                  </span>
                </div>
              )}
            </li>
          ))}
        </ol>

        <p className="mt-6 max-w-prose text-[0.9375rem] leading-relaxed text-ink-muted">
          You can walk down this chain and never walk back up it. Working out a private key from an
          address is the discrete-logarithm problem, and working out the seed from one private key
          is no easier. That asymmetry is not a feature bolted onto the security model — it{" "}
          <em className="font-display italic">is</em> the security model.
        </p>

        <div className="mt-5 flex gap-3 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
          <p className="text-[0.875rem] leading-relaxed text-ink">
            And it has a consequence people discover too late: <strong>there is no password
            reset.</strong> Nobody can restore a lost phrase, reverse a theft, or freeze an address
            on your behalf. The absence of a recovery path is the same property that makes the
            address yours.
          </p>
        </div>
      </Stage>

      <WidgetNote tone="caution">
        Every value above is fabricated for display. Nothing here performs real key derivation, and
        the strings are not keys — do not use them, and do not treat any of them as an example of
        what a real phrase looks like beyond its shape.
      </WidgetNote>
    </div>
  );
}
