"use client";

import { useEffect, useState } from "react";
import { CircleAlert, Check, Play, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Segmented, Stage, WidgetNote } from "./parts";
import type { WidgetProps } from "./types";

/**
 * The life of a transaction, stage by stage.
 *
 * Most people meet a transaction as a spinner followed by a green tick. The
 * spinner hides the only part worth understanding: between "signed" and
 * "included" there is a queue that nobody controls, and between "included" and
 * "succeeded" there is a distinction that costs real money to get wrong.
 *
 * So this widget refuses to compress the middle. Five stages, each one
 * selectable, each one saying what is happening, who is doing it, and what can
 * go wrong — plus a replay that walks the whole thing at roughly real speed so
 * the waiting is visible rather than implied.
 *
 * The revert switch is the sharp end. A learner who has watched a transaction
 * fail, and seen the gas leave anyway, will never again confuse "it went
 * through" with "it worked".
 */

type StageSpec = {
  id: string;
  title: string;
  summary: string;
  what: string;
  who: string;
  explorer: string;
  risk: string;
};

const STAGES: StageSpec[] = [
  {
    id: "sign",
    title: "You sign it",
    summary: "Your wallet turns an intention into something unforgeable",
    what:
      "Your wallet assembles a transaction — who it is to, how much, what data, how much gas, and which nonce it should use — and signs it with your private key. The signature proves the transaction came from your address without revealing the key. It happens entirely on your device.",
    who: "Your wallet. Nothing has been sent anywhere.",
    explorer: "Nothing. An unsigned transaction has never left your computer.",
    risk:
      "A signature you did not read is how people lose money. The approval screen is the last moment you can say no, and after the signature there is no undo.",
  },
  {
    id: "broadcast",
    title: "It is broadcast",
    summary: "A node takes it and passes it on",
    what:
      "The signed transaction is handed to an RPC node, which checks the signature, checks the nonce, and gossips it to the rest of the network. From here it is a candidate — real, and not yet agreed.",
    who: "Any node on the network. Yours is just the first to hear it.",
    explorer: "Often still nothing, though the hash exists now and some explorers will show it as pending.",
    risk:
      "The node can drop it — if it is under load, or if the gas price is below its minimum, your transaction simply does not propagate. Nothing was lost, and nothing happened.",
  },
  {
    id: "pending",
    title: "It waits in the queue",
    summary: "Validators pick what to include, and they are not obliged to pick you",
    what:
      "Unincluded transactions sit in a pool. Validators choose which to include, generally preferring the ones that pay the most per unit of gas. On BNB Chain this is usually seconds; on a congested chain it can be hours, and the wait is not something you can appeal.",
    who: "Validators, in whatever order suits them.",
    explorer: "A pending entry against the hash your wallet showed you.",
    risk:
      "A stuck transaction is nearly always a fee problem rather than a lost one. It stays pending until it is included or replaced by another transaction using the same nonce.",
  },
  {
    id: "included",
    title: "It is included in a block",
    summary: "The state changes — or it reverts, and you pay anyway",
    what:
      "A validator puts your transaction into a block. If it executed successfully, the balances move. If it reverted, the state changes are rolled back exactly as if it had never run — but the gas is still consumed, because the work was still done.",
    who: "One validator, and then every node that validates the block.",
    explorer: "A permanent record: block number, timestamp, gas used, and a status.",
    risk:
      "Two different questions get collapsed into the word 'confirmed'. Included: it is in a block. Succeeded: the block says the execution did not revert. Only the second one means anything happened.",
  },
  {
    id: "settled",
    title: "It gets harder to undo",
    summary: "Confirmations are a convention, not a switch",
    what:
      "Every block built on top of yours makes rewriting the chain more expensive, until rewriting it costs more than it would gain. At that point everyone treats the transaction as settled. There is no flag on the chain that says 'final' — confirmation depth is a number people agree on.",
    who: "Every validator that builds on top of the block.",
    explorer: "A confirmation count that keeps climbing.",
    risk:
      "Issuers, bridges and exchanges each choose their own depth before crediting a deposit. One confirmation may be enough for a shop and nowhere near enough for a transfer of size.",
  },
];

const DWELL_MS = [900, 900, 2400, 1400, 1100];

export function TransactionFlow(_props: WidgetProps) {
  const [selected, setSelected] = useState(0);
  const [reverted, setReverted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [reached, setReached] = useState(4); // How far the replay has walked.

  // The replay walks the rail one stage at a time, dwelling longest in the
  // queue — which is the stage the whole widget exists to slow down.
  useEffect(() => {
    if (!playing) return;

    if (reached >= STAGES.length - 1) {
      setPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      setReached((r) => Math.min(STAGES.length - 1, r + 1));
      setSelected((s) => Math.min(STAGES.length - 1, s + 1));
    }, DWELL_MS[reached] ?? 1000);

    return () => clearTimeout(timer);
  }, [playing, reached]);

  function replay() {
    setReached(0);
    setSelected(0);
    setPlaying(true);
  }

  const active = STAGES[selected]!;
  const failed = reverted && selected >= 3;

  return (
    <div className="space-y-5">
      {/* --- Status bar ----------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={failed ? "negative" : reached >= STAGES.length - 1 ? "positive" : "info"}>
            {failed ? (
              <>
                <CircleAlert className="h-3 w-3" aria-hidden />
                Reverted
              </>
            ) : reached >= STAGES.length - 1 ? (
              <>
                <Check className="h-3 w-3" aria-hidden />
                Settled
              </>
            ) : playing ? (
              "In flight"
            ) : (
              "Ready"
            )}
          </Badge>
          <span className="font-mono text-[0.75rem] tabular-nums text-ink-subtle">
            stage {selected + 1} of {STAGES.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            label="Outcome"
            value={reverted ? "reverted" : "success"}
            onChange={(value) => setReverted(value === "reverted")}
            options={[
              { id: "success", label: "Succeeds" },
              { id: "reverted", label: "Reverts" },
            ]}
          />
          <Button variant="secondary" size="sm" onClick={replay} disabled={playing}>
            {playing ? (
              <>
                <RotateCcw className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Replaying
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" aria-hidden />
                Replay
              </>
            )}
          </Button>
        </div>
      </div>

      {/* --- The rail ------------------------------------------------------- */}
      <Stage tone="plain" className="px-4 py-4 sm:px-6 sm:py-5">
        <ol className="space-y-0">
          {STAGES.map((stage, index) => {
            const isActive = index === selected;
            const isReached = index <= reached;
            const isFailurePoint = reverted && index >= 3;
            const isLast = index === STAGES.length - 1;

            return (
              <li
                key={stage.id}
                className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-4 sm:gap-5"
              >
                {/* Rail column. Stretching the connector to `flex-1` rather than
                    giving it a fixed height means it always reaches the next
                    node, whether or not the panel below is open. */}
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 font-mono text-[0.75rem] tabular-nums transition-colors duration-200",
                      isReached
                        ? isFailurePoint
                          ? "border-danger bg-danger text-ink-inverse"
                          : "border-teal bg-teal text-ink-inverse"
                        : "border-line-strong bg-surface text-ink-subtle",
                    )}
                    aria-hidden
                  >
                    {isFailurePoint ? (
                      <CircleAlert className="h-4 w-4" />
                    ) : isLast && isReached ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      String(index + 1).padStart(2, "0")
                    )}
                  </span>

                  {!isLast && (
                    <span
                      aria-hidden
                      className="mt-1 w-px flex-1 transition-colors duration-500"
                      style={{
                        background:
                          index < reached
                            ? failed
                              ? "var(--color-danger)"
                              : "var(--color-teal)"
                            : "var(--color-line-strong)",
                      }}
                    />
                  )}
                </div>

                {/* Content column. */}
                <div className={cn(!isLast && "pb-5")}>
                  <button
                    type="button"
                    onClick={() => setSelected(index)}
                    aria-expanded={isActive}
                    className={cn(
                      "-mx-3 -mt-1 flex w-full items-start gap-4 rounded-lg px-3 py-1 text-left transition-colors duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/45",
                      isActive ? "bg-teal-soft/60" : "hover:bg-ink/3",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-[1.0625rem] font-semibold tracking-[-0.01em] text-ink">
                        {stage.title}
                      </span>
                      <span className="mt-0.5 block text-[0.875rem] leading-relaxed text-ink-muted">
                        {stage.summary}
                      </span>
                    </span>
                  </button>

                  {isActive && (
                    <div className="mt-3 animate-rise rounded-xl border border-line bg-surface px-5 py-4">
                      <p className="max-w-prose text-[0.9375rem] leading-relaxed text-ink">
                        {stage.what}
                      </p>

                      <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                        <Detail label="Who is doing this" value={stage.who} />
                        <Detail
                          label="What the explorer shows"
                          value={
                            index === 3 && reverted
                              ? "A permanent record — with a status of Failed, and gas used."
                              : stage.explorer
                          }
                        />
                      </dl>

                      <div
                        className={cn(
                          "mt-4 rounded-lg border px-4 py-3",
                          index === 3 && reverted
                            ? "border-danger/30 bg-danger-soft"
                            : "border-warning/25 bg-warning-soft",
                        )}
                      >
                        <p
                          className={cn(
                            "text-[0.6875rem] font-semibold uppercase tracking-[0.12em]",
                            index === 3 && reverted ? "text-danger" : "text-warning",
                          )}
                        >
                          {index === 3 && reverted ? "What went wrong" : "Where this goes wrong"}
                        </p>
                        <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink">
                          {index === 3 && reverted
                            ? "The transaction was included in a block and executed, and the execution reverted — so every state change was rolled back and the balances are exactly where they were. The gas was not rolled back. It was spent doing work that was then discarded, and that is true of every failed transaction you will ever send."
                            : stage.risk}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </Stage>

      <WidgetNote>
        No wallet, no key and no chain connection is involved in this figure — it is a diagram you
        click through. Reading a real transaction on BNB Chain is done from the On-Chain page, and
        that page only ever reads.
      </WidgetNote>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.6875rem] uppercase tracking-[0.1em] text-ink-subtle">{label}</dt>
      <dd className="mt-1 text-[0.875rem] leading-relaxed text-ink-muted">{value}</dd>
    </div>
  );
}
