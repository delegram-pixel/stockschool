"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PAINT, Readout, Stage, WidgetNote } from "./parts";

/**
 * The chain of custody, drawn.
 *
 * The single hardest thing to convey about a tokenized stock is that the token
 * is the *fourth* link in a chain, not a replacement for the first three. So
 * this widget draws all four links at once, always, and walks a cursor along
 * them — you never see one step without the others in frame.
 *
 * The corporate-action switch is the payoff. A 2-for-1 split doubles every
 * quantity in the chain and halves the unit price, leaving total value exactly
 * where it was. Learners who expect "number goes up" get to watch the number go
 * up and the value not move at all.
 */

type Party = {
  id: string;
  eyebrow: string;
  title: string;
  lines: string[];
  chipLabel: string;
  /** Quantity shown in the chip, before and after the split. */
  chip: [string, string];
};

const PARTIES: Party[] = [
  {
    id: "register",
    eyebrow: "Company register",
    title: "The issuing company",
    lines: ["One share exists, recorded in", "a name that is not yours."],
    chipLabel: "shares on register",
    chip: ["1", "2"],
  },
  {
    id: "custodian",
    eyebrow: "Custody account",
    title: "The custodian",
    lines: ["A regulated intermediary holds", "the real share in safekeeping."],
    chipLabel: "shares in custody",
    chip: ["1", "2"],
  },
  {
    id: "issuer",
    eyebrow: "Smart contract",
    title: "The issuer's token",
    lines: ["A contract on BNB Chain mints", "one token against one share."],
    chipLabel: "tokens minted",
    chip: ["1", "2"],
  },
  {
    id: "you",
    eyebrow: "Wallet",
    title: "You",
    lines: ["The token sits at an address you", "control. The share still does not."],
    chipLabel: "your balance",
    chip: ["1", "2"],
  },
];

const STEPS = [
  {
    title: "A share is recorded in someone else's name",
    body:
      "Every share a company has ever issued is an entry in a register. When you buy through a broker, the register usually records the broker's nominee — not you. What you own is a contractual claim on that nominee.",
  },
  {
    title: "A custodian holds the real share",
    body:
      "To tokenize anything, someone has to actually hold the underlying asset. A regulated custodian keeps the share in a segregated account, and that holding is what everything downstream is a claim on.",
  },
  {
    title: "An issuer mints a token against it",
    body:
      "The issuer deploys a contract and mints tokens at a fixed ratio — usually one token per share. The contract's own supply is now a public record you can read without asking anyone's permission.",
  },
  {
    title: "The token reaches your wallet",
    body:
      "A token transfer moves the claim, not the share. The register above has not changed, the custodian's account has not changed, and the company has never heard of you — but your balance is real and the transfer settled in seconds.",
  },
] as const;

export function TokenizationFlow() {
  const [step, setStep] = useState(0);
  const [split, setSplit] = useState(false);

  const active = STEPS[step]!;
  const q: 0 | 1 = split ? 1 : 0;
  const price = split ? "50.00" : "100.00";

  return (
    <div className="space-y-5">
      {/* --- Controls ------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            disabled={step === STEPS.length - 1}
          >
            Next
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Button>
          <span className="ml-1 font-mono text-[0.75rem] tabular-nums text-ink-subtle">
            {step + 1} / {STEPS.length}
          </span>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-[0.8125rem] text-ink-muted">
          <input
            type="checkbox"
            checked={split}
            onChange={(event) => setSplit(event.target.checked)}
            className="h-4 w-4 accent-(--color-teal)"
          />
          Apply a 2-for-1 split
        </label>
      </div>

      {/* --- The diagram ---------------------------------------------------- */}
      <Stage tone="grid" className="p-4 sm:p-6">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <svg
            viewBox="0 0 920 176"
            className="h-auto w-full min-w-176"
            role="img"
            aria-label={`Chain of custody: the company register, a custodian, the issuer's token contract, and your wallet. Step ${step + 1} of 4 is highlighted.`}
          >
            <defs>
              <marker
                id="tflow-arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" style={{ fill: PAINT.tealLine }} />
              </marker>
              <marker
                id="tflow-arrow-active"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6.5"
                markerHeight="6.5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" style={{ fill: PAINT.teal }} />
              </marker>
            </defs>

            {/* Connectors first, so the boxes sit on top of them. */}
            {[0, 1, 2].map((i) => {
              const x1 = i * 240 + 202;
              const x2 = (i + 1) * 240 - 8;
              const live = step > i;
              return (
                <g key={i}>
                  <line
                    x1={x1}
                    y1={82}
                    x2={x2}
                    y2={82}
                    strokeWidth={live ? 1.75 : 1.25}
                    strokeDasharray={live ? undefined : "4 4"}
                    markerEnd={`url(#${live ? "tflow-arrow-active" : "tflow-arrow"})`}
                    style={{ stroke: live ? PAINT.teal : PAINT.lineStrong }}
                  />
                  <text
                    x={i * 240 + 220}
                    y={162}
                    textAnchor="middle"
                    fontSize="9.5"
                    letterSpacing="0.08em"
                    style={{ fill: live ? PAINT.tealStrong : PAINT.subtle, fontFamily: "var(--font-mono)" }}
                  >
                    {["CUSTODY", "1 : 1", "TRANSFER"][i]}
                  </text>
                </g>
              );
            })}

            {PARTIES.map((party, i) => {
              const isActive = i === step;
              const reached = i <= step;

              return (
                <g key={party.id}>
                  <rect
                    x={i * 240}
                    y={24}
                    width={200}
                    height={116}
                    rx={14}
                    strokeWidth={isActive ? 1.75 : 1}
                    style={{
                      fill: isActive ? PAINT.surface : PAINT.surfaceMuted,
                      stroke: isActive ? PAINT.teal : PAINT.line,
                    }}
                  />

                  <text
                    x={i * 240 + 16}
                    y={16}
                    fontSize="9.5"
                    letterSpacing="0.13em"
                    style={{
                      fill: reached ? PAINT.tealStrong : PAINT.subtle,
                      fontFamily: "var(--font-sans)",
                      fontWeight: 700,
                    }}
                  >
                    {party.eyebrow.toUpperCase()}
                  </text>

                  <text
                    x={i * 240 + 16}
                    y={52}
                    fontSize="15"
                    style={{
                      fill: PAINT.ink,
                      fontFamily: "var(--font-display)",
                      fontWeight: 600,
                    }}
                  >
                    {party.title}
                  </text>

                  {party.lines.map((line, li) => (
                    <text
                      key={li}
                      x={i * 240 + 16}
                      y={74 + li * 17}
                      fontSize="11.5"
                      style={{ fill: PAINT.muted, fontFamily: "var(--font-sans)" }}
                    >
                      {line}
                    </text>
                  ))}

                  <rect
                    x={i * 240 + 12}
                    y={106}
                    width={176}
                    height={24}
                    rx={7}
                    style={{ fill: isActive ? PAINT.tealSoft : PAINT.surfaceSunken }}
                  />
                  <text
                    x={i * 240 + 21}
                    y={122}
                    fontSize="10"
                    style={{ fill: PAINT.muted, fontFamily: "var(--font-sans)" }}
                  >
                    {party.chipLabel}
                  </text>
                  <text
                    x={i * 240 + 179}
                    y={122}
                    textAnchor="end"
                    fontSize="11.5"
                    style={{
                      fill: isActive ? PAINT.tealStrong : PAINT.ink,
                      fontFamily: "var(--font-mono)",
                      fontWeight: 500,
                    }}
                  >
                    {party.chip[q]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <p className="mt-2 text-center text-[0.6875rem] text-ink-subtle sm:hidden">
          Scroll the diagram sideways to follow the whole chain →
        </p>
      </Stage>

      {/* --- Step narration ------------------------------------------------- */}
      <div className="rounded-xl border border-line bg-surface px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="accent">Step {step + 1}</Badge>
          <h4 className="font-display text-[1.0625rem] font-semibold tracking-[-0.01em] text-ink">
            {active.title}
          </h4>
        </div>
        <p className="mt-3 max-w-prose text-[0.9375rem] leading-relaxed text-ink-muted">
          {active.body}
        </p>
      </div>

      {/* --- What the split does -------------------------------------------- */}
      <div
        className={cn(
          "rounded-xl border px-5 py-4 transition-colors",
          split ? "border-teal-line bg-teal-soft/60" : "border-line bg-surface-muted",
        )}
      >
        <Readout
          columns={4}
          items={[
            { label: "Shares on register", value: split ? "2" : "1" },
            { label: "Tokens in existence", value: split ? "2" : "1" },
            { label: "Price per token", value: `$${price}` },
            {
              label: "Your total value",
              value: "$100.00",
              emphasis: true,
              hint: split ? "Two units at half the price" : "One unit at full price",
            },
          ]}
        />
        <p className="mt-4 text-[0.875rem] leading-relaxed text-ink-muted">
          {split
            ? "Every quantity in the chain doubled and the unit price halved. Your total value did not move — a split changes how the same thing is counted, not what it is worth."
            : "Switch on the split and watch the whole chain at once. The interesting part is the column that refuses to change."}
        </p>
      </div>

      <WidgetNote tone="caution">
        Illustrative figures, not a quote for any asset. The quantities are chosen to make the
        ratio visible; a real issuer&rsquo;s terms, custody arrangements and redemption rights are
        set out in its own documentation, and they differ from issuer to issuer.
      </WidgetNote>
    </div>
  );
}
