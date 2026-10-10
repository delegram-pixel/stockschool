"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Decimal, formatCurrency, formatPercent, toDecimal } from "@/lib/calculations/money";
import { comparePrices, explainComparison } from "@/lib/calculations/price-difference";
import { truncateAddress } from "@/lib/binance/normalize";
import type { Mission } from "@/lib/learning/types";
import type { TokenizedStock } from "@/types";

/**
 * Missions — the hands-on half of each lesson.
 *
 * Every mission is checked against *real* data from the feed the lesson page
 * was rendered with, not against a hardcoded answer key. That is why the
 * `assetSymbol: "auto"` convention exists: the mission resolves whichever asset
 * actually has both prices, so the exercise works whichever provider is
 * configured and degrades honestly to sample data when none is.
 *
 * Numerical answers are compared with `Decimal` against the tolerance the
 * lesson author set — never with floating-point equality, and never with a
 * strict string match that would fail a learner who wrote "2.50" for "2.5".
 */
export function MissionBlock({
  mission,
  assets,
  completed,
  onCompleted,
}: {
  mission: Mission;
  assets: TokenizedStock[];
  completed: boolean;
  onCompleted: () => void;
}) {
  return (
    <div className="not-prose">
      <div
        className={cn(
          "overflow-hidden rounded-2xl border bg-surface",
          completed ? "border-success/35" : "border-teal-line",
        )}
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-teal-soft/50 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.13em] text-teal-strong">
              Mission
            </span>
            <span className="font-display text-[1.0625rem] font-semibold tracking-[-0.01em] text-ink">
              {mission.title}
            </span>
          </div>
          {completed && (
            <Badge tone="positive">
              <Check className="h-3 w-3" aria-hidden />
              Completed
            </Badge>
          )}
        </header>

        <div className="px-5 py-6 sm:px-6">
          <p className="max-w-prose text-[1rem] leading-relaxed text-ink-muted">{mission.brief}</p>

          <div className="mt-6">
            <MissionBody
              mission={mission}
              assets={assets}
              onCompleted={onCompleted}
              completed={completed}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MissionBody({
  mission,
  assets,
  onCompleted,
  completed,
}: {
  mission: Mission;
  assets: TokenizedStock[];
  onCompleted: () => void;
  completed: boolean;
}) {
  switch (mission.kind) {
    case "price-difference":
      return (
        <PriceDifferenceMission
          mission={mission}
          assets={assets}
          onCompleted={onCompleted}
          completed={completed}
        />
      );
    case "asset-investigation":
      return (
        <AssetInvestigationMission
          mission={mission}
          assets={assets}
          onCompleted={onCompleted}
          completed={completed}
        />
      );
    case "transaction-reading":
      return <TransactionReadingMission mission={mission} onCompleted={onCompleted} completed={completed} />;
    case "structure-compare":
      return (
        <StructureCompareMission
          mission={mission}
          assets={assets}
          onCompleted={onCompleted}
          completed={completed}
        />
      );
    case "portfolio-allocation":
      return <PortfolioAllocationMission mission={mission} onCompleted={onCompleted} completed={completed} />;
  }
}

// -----------------------------------------------------------------------------
// 1. Price difference — measure the gap yourself
// -----------------------------------------------------------------------------

function PriceDifferenceMission({
  mission,
  assets,
  onCompleted,
  completed,
}: {
  mission: Extract<Mission, { kind: "price-difference" }>;
  assets: TokenizedStock[];
  onCompleted: () => void;
  completed: boolean;
}) {
  const [answer, setAnswer] = useState("");
  const [state, setState] = useState<"idle" | "correct" | "close" | "wrong">("idle");
  const [showWorking, setShowWorking] = useState(false);

  const asset = useMemo(
    () => resolveAsset(mission.assetSymbol, assets),
    [mission.assetSymbol, assets],
  );
  const comparison = asset ? comparePrices(asset.price, asset.referencePrice) : null;

  if (!asset || !comparison) {
    return (
      <UnavailableMission
        reason="This mission needs an asset with both an on-chain price and a reference price. None is available in the current feed."
        href="/explore"
        linkLabel="Open Explore"
      />
    );
  }

  const target =
    mission.answerKind === "percent"
      ? comparison.raw.percent.abs()
      : comparison.raw.absolute.abs();

  function check() {
    const given = toDecimal(answer);
    if (given === null) return;

    const tolerance = toDecimal(mission.tolerance) ?? new Decimal(0);
    const delta = given.minus(target).abs();

    if (delta.lessThanOrEqualTo(tolerance)) {
      setState("correct");
      onCompleted();
    } else if (delta.lessThanOrEqualTo(tolerance.times(5))) {
      setState("close");
    } else {
      setState("wrong");
    }
    setShowWorking(true);
  }

  return (
    <div className="space-y-5">
      <AssetPricePanel asset={asset} />

      <div className="rounded-xl border border-line bg-surface-muted p-4">
        <p className="text-[0.875rem] font-medium text-ink">
          {mission.answerKind === "percent"
            ? "How far is the on-chain price from the reference price, as a percentage? Enter a positive number."
            : "What is the absolute difference between the two prices, in dollars? Enter a positive number."}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={answer}
              disabled={completed || state === "correct"}
              onChange={(event) => {
                const next = event.target.value;
                if (next === "" || /^\d*\.?\d*$/.test(next)) {
                  setAnswer(next);
                  setState("idle");
                }
              }}
              placeholder={mission.answerKind === "percent" ? "0.00" : "0.00"}
              aria-label={
                mission.answerKind === "percent" ? "Percentage difference" : "Dollar difference"
              }
              className="h-11 w-32 rounded-xl border border-line-strong bg-surface px-3.5 font-mono text-[0.9375rem] tabular-nums text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/45"
            />
            <span className="text-[0.9375rem] text-ink-muted">
              {mission.answerKind === "percent" ? "%" : "USD"}
            </span>
          </div>

          <Button
            onClick={check}
            disabled={answer === "" || completed || state === "correct"}
            size="md"
          >
            Check
          </Button>

          <button
            type="button"
            onClick={() => setShowWorking((value) => !value)}
            className="inline-flex items-center gap-1.5 text-[0.8125rem] text-ink-muted underline-offset-4 hover:text-ink hover:underline"
          >
            <Lightbulb className="h-3.5 w-3.5" aria-hidden />
            {showWorking ? "Hide the working" : "Show the working"}
          </button>
        </div>

        {state !== "idle" && (
          <p
            role="status"
            className={cn(
              "mt-4 text-[0.9375rem] leading-relaxed",
              state === "correct"
                ? "text-success"
                : state === "close"
                  ? "text-warning"
                  : "text-danger",
            )}
          >
            {state === "correct"
              ? mission.successMessage
              : state === "close"
                ? "You are very close — check your rounding and whether you divided by the reference price or the on-chain price. The working is below."
                : "That is some way off. Open the working below and compare it against what you calculated — the usual slip is dividing by the wrong price."}
          </p>
        )}

        {showWorking && (
          <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface p-4">
            <pre className="font-mono text-[0.75rem] leading-relaxed text-ink-muted">
              {explainComparison(comparison).join("\n")}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 2. Asset investigation — find the facts yourself
// -----------------------------------------------------------------------------

function AssetInvestigationMission({
  mission,
  assets,
  onCompleted,
  completed,
}: {
  mission: Extract<Mission, { kind: "asset-investigation" }>;
  assets: TokenizedStock[];
  onCompleted: () => void;
  completed: boolean;
}) {
  const asset = useMemo(
    () => resolveAsset(mission.assetSymbol, assets),
    [mission.assetSymbol, assets],
  );
  const [values, setValues] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);

  if (!asset) {
    return (
      <UnavailableMission
        reason="This mission needs a real asset from the current feed, and none is available."
        href="/explore"
        linkLabel="Open Explore"
      />
    );
  }

  const expected: Record<string, string> = {
    symbol: asset.symbol,
    network: asset.chainName ?? "",
    contractAddress: asset.contractAddress ?? "",
  };

  const results = mission.fields.map((field) => ({
    field,
    correct: matches(values[field.key] ?? "", expected[field.key] ?? "", field.match),
  }));
  const allCorrect = results.every((r) => r.correct);

  function check() {
    setChecked(true);
    if (results.every((r) => r.correct)) onCompleted();
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-line bg-surface-muted p-4">
        <p className="text-[0.875rem] leading-relaxed text-ink-muted">
          Open{" "}
          <Link
            href={`/stocks/${asset.symbol}`}
            className="font-medium text-teal-strong underline underline-offset-2"
          >
            the {asset.symbol} asset page
          </Link>{" "}
          and its On-Chain tab, then record what you find. Values are compared ignoring case and
          surrounding whitespace.
        </p>
      </div>

      <ul className="space-y-4">
        {mission.fields.map((field, index) => {
          const result = results[index]!;
          return (
            <li key={field.key}>
              <label className="block">
                <span className="text-[0.9375rem] font-medium text-ink">{field.label}</span>
                <span className="mt-1 block text-[0.8125rem] leading-relaxed text-ink-muted">
                  {field.hint}
                </span>
                <input
                  type="text"
                  value={values[field.key] ?? ""}
                  disabled={completed}
                  onChange={(event) => {
                    setValues((current) => ({ ...current, [field.key]: event.target.value }));
                    setChecked(false);
                  }}
                  placeholder={field.match === "address" ? "0x…" : ""}
                  className={cn(
                    "mt-2 h-11 w-full rounded-xl border bg-surface px-3.5 text-[0.9375rem] text-ink",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/45",
                    field.match === "address" && "font-mono text-[0.8125rem]",
                    checked && !result.correct
                      ? "border-danger/50"
                      : completed
                        ? "border-success/40"
                        : "border-line-strong",
                  )}
                />
              </label>

              {checked && !result.correct && !completed && (
                <p className="mt-1.5 text-[0.8125rem] text-danger">
                  Not what the app shows. Look again at the On-Chain panel — the value is there in
                  full.
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={check} disabled={completed || allCorrect}>
          Check my answers
        </Button>
        {checked && allCorrect && (
          <p role="status" className="text-[0.9375rem] text-success">
            {mission.successMessage}
          </p>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 3. Transaction reading — no data needed, just the example
// -----------------------------------------------------------------------------

function TransactionReadingMission({
  mission,
  onCompleted,
  completed,
}: {
  mission: Extract<Mission, { kind: "transaction-reading" }>;
  onCompleted: () => void;
  completed: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = mission.questions.every((q) => answers[q.id] !== undefined);
  const correctCount = mission.questions.filter((q) => answers[q.id] === q.answer).length;

  function submit() {
    setSubmitted(true);
    if (correctCount === mission.questions.length) onCompleted();
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-line bg-surface-muted p-4">
        <p className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-[0.13em] text-ink-subtle">
          Example transaction — illustrative, not a real hash
        </p>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Field label="Hash" value={truncateAddress(mission.example.hash, 10, 8)} mono />
          <Field label="From" value={truncateAddress(mission.example.from)} mono />
          <Field label="To" value={truncateAddress(mission.example.to)} mono />
          <Field label="Value" value={mission.example.value} mono />
          <Field label="Status" value={mission.example.status} />
          <Field label="Block" value={mission.example.block} mono />
        </dl>
      </div>

      <ol className="space-y-5">
        {mission.questions.map((question, index) => {
          const correct = submitted && answers[question.id] === question.answer;
          return (
            <li key={question.id}>
              <p className="text-[0.9375rem] font-medium text-ink">
                <span className="mr-2 font-mono text-[0.75rem] text-ink-subtle">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {question.prompt}
              </p>
              <ul className="mt-3 space-y-2">
                {question.options.map((option) => {
                  const selected = answers[question.id] === option.id;
                  const isAnswer = submitted && option.id === question.answer;
                  const isWrong = submitted && selected && option.id !== question.answer;

                  return (
                    <li key={option.id}>
                      <button
                        type="button"
                        disabled={completed}
                        onClick={() => {
                          setAnswers((current) => ({ ...current, [question.id]: option.id }));
                          setSubmitted(false);
                        }}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                          isAnswer
                            ? "border-success/40 bg-success-soft"
                            : isWrong
                              ? "border-danger/40 bg-danger-soft"
                              : selected
                                ? "border-teal-line bg-teal-soft"
                                : "border-line hover:border-line-strong hover:bg-ink/2",
                        )}
                      >
                        <span className="text-[0.9375rem] leading-relaxed text-ink">
                          {option.text}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {/* Same rule as the quiz: every question gets its explanation, right
                  or wrong. Marking an answer without saying why turns a lesson
                  about reading a transaction into a guessing game — and this is
                  the one mission where the reasoning *is* the skill. */}
              {submitted && (
                <p
                  className={cn(
                    "mt-3 text-[0.875rem] leading-relaxed",
                    correct ? "text-success" : "text-ink-muted",
                  )}
                >
                  {question.explanation}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={submit} disabled={!allAnswered || completed || submitted}>
          Check my answers
        </Button>
        {submitted && (
          <p
            role="status"
            className={cn(
              "text-[0.9375rem]",
              correctCount === mission.questions.length ? "text-success" : "text-ink-muted",
            )}
          >
            {correctCount === mission.questions.length
              ? mission.successMessage
              : `${correctCount} of ${mission.questions.length} correct. The right answers are marked — change your selection to try again.`}
          </p>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 4. Structure compare — two assets, reasoning questions
// -----------------------------------------------------------------------------

function StructureCompareMission({
  mission,
  assets,
  onCompleted,
  completed,
}: {
  mission: Extract<Mission, { kind: "structure-compare" }>;
  assets: TokenizedStock[];
  onCompleted: () => void;
  completed: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const a = useMemo(() => resolveAsset(mission.symbolA, assets), [mission.symbolA, assets]);
  const b = useMemo(() => resolveAsset(mission.symbolB, assets), [mission.symbolB, assets]);

  const allAnswered = mission.questions.every((q) => answers[q.id] !== undefined);
  const allCorrect = mission.questions.every((q) => answers[q.id] === q.answer);

  function submit() {
    setSubmitted(true);
    if (allCorrect) onCompleted();
  }

  return (
    <div className="space-y-5">
      {(a || b) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[a, b].filter(Boolean).map((asset) => (
            <AssetStructurePanel key={asset!.id} asset={asset!} />
          ))}
        </div>
      )}

      <ol className="space-y-6">
        {mission.questions.map((question) => {
          const correct = submitted && answers[question.id] === question.answer;
          return (
            <li key={question.id}>
              <p className="text-[0.9375rem] font-medium text-ink">{question.prompt}</p>
              <ul className="mt-3 space-y-2">
                {question.options.map((option) => {
                  const selected = answers[question.id] === option.id;
                  const isAnswer = submitted && option.id === question.answer;
                  const isWrong = submitted && selected && option.id !== question.answer;
                  return (
                    <li key={option.id}>
                      <button
                        type="button"
                        disabled={completed}
                        onClick={() => {
                          setAnswers((current) => ({ ...current, [question.id]: option.id }));
                          setSubmitted(false);
                        }}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                          isAnswer
                            ? "border-success/40 bg-success-soft"
                            : isWrong
                              ? "border-danger/40 bg-danger-soft"
                              : selected
                                ? "border-teal-line bg-teal-soft"
                                : "border-line hover:border-line-strong hover:bg-ink/2",
                        )}
                      >
                        <span className="text-[0.9375rem] leading-relaxed text-ink">
                          {option.text}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {submitted && (
                <p
                  className={cn(
                    "mt-3 text-[0.875rem] leading-relaxed",
                    correct ? "text-success" : "text-ink-muted",
                  )}
                >
                  {question.explanation}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={submit} disabled={!allAnswered || completed || submitted}>
          Check my answers
        </Button>
        {submitted && allCorrect && (
          <p role="status" className="text-[0.9375rem] text-success">
            {mission.successMessage}
          </p>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 5. Portfolio allocation — hands off to the simulator
// -----------------------------------------------------------------------------

function PortfolioAllocationMission({
  mission,
  onCompleted,
  completed,
}: {
  mission: Extract<Mission, { kind: "portfolio-allocation" }>;
  onCompleted: () => void;
  completed: boolean;
}) {
  const total = mission.targets.reduce((sum, t) => sum + t.percent, 0);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-line bg-surface-muted p-4">
        <p className="text-[0.875rem] leading-relaxed text-ink-muted">
          Build this allocation in the simulator. Your positions are checked as you trade, so there
          is nothing to type here — the mission completes when the portfolio matches.
        </p>

        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {mission.targets.map((target) => (
            <li
              key={target.symbol}
              className="flex items-center justify-between rounded-lg border border-line bg-surface px-3.5 py-2.5"
            >
              <span className="font-mono text-[0.8125rem] text-ink">{target.symbol}</span>
              <span className="font-mono text-[0.8125rem] tabular-nums text-ink-muted">
                {target.percent}%
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-3 text-[0.75rem] text-ink-subtle">
          Total {total}% · within {mission.tolerancePercent} percentage points counts as a match
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button as="link" href="/simulate" variant={completed ? "secondary" : "primary"}>
          Open the simulator
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
        {!completed && (
          <button
            type="button"
            onClick={onCompleted}
            className="text-[0.8125rem] text-ink-muted underline-offset-4 hover:text-ink hover:underline"
          >
            Mark as done without opening the simulator
          </button>
        )}
        {completed && (
          <p role="status" className="text-[0.9375rem] text-success">
            {mission.successMessage}
          </p>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Shared pieces
// -----------------------------------------------------------------------------

function AssetPricePanel({ asset }: { asset: TokenizedStock }) {
  const comparison = comparePrices(asset.price, asset.referencePrice);

  return (
    <div className="rounded-xl border border-line bg-surface-muted p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-[1.0625rem] font-semibold tracking-[-0.01em] text-ink">
            {asset.underlyingSymbol ?? asset.symbol}
          </p>
          <p className="text-[0.8125rem] text-ink-muted">{asset.companyName ?? asset.name}</p>
        </div>
        <Link
          href={`/stocks/${asset.symbol}`}
          className="shrink-0 text-[0.8125rem] font-medium text-teal-strong underline underline-offset-2"
        >
          Full page
        </Link>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <dt className="text-[0.6875rem] uppercase tracking-[0.1em] text-ink-subtle">On-chain</dt>
          <dd className="mt-0.5 font-mono text-[1.0625rem] tabular-nums text-ink">
            {formatCurrency(asset.price)}
          </dd>
        </div>
        <div>
          <dt className="text-[0.6875rem] uppercase tracking-[0.1em] text-ink-subtle">Reference</dt>
          <dd className="mt-0.5 font-mono text-[1.0625rem] tabular-nums text-ink-muted">
            {formatCurrency(asset.referencePrice)}
          </dd>
        </div>
      </dl>

      {comparison && (
        <p className="mt-3 text-[0.75rem] text-ink-subtle">
          Gap: {formatCurrency(comparison.raw.absolute.abs().toFixed(2))} ·{" "}
          {formatPercent(comparison.raw.percent.abs().toFixed(4))}
        </p>
      )}
    </div>
  );
}

function AssetStructurePanel({ asset }: { asset: TokenizedStock }) {
  return (
    <div className="rounded-xl border border-line bg-surface-muted p-4">
      <p className="font-display text-[1rem] font-semibold tracking-[-0.01em] text-ink">
        {asset.underlyingSymbol ?? asset.symbol}
      </p>
      <dl className="mt-3 space-y-2 text-[0.8125rem]">
        <div className="flex justify-between gap-3">
          <dt className="text-ink-subtle">Token symbol</dt>
          <dd className="font-mono text-ink">{asset.symbol}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-subtle">Network</dt>
          <dd className="text-ink">{asset.chainName ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-subtle">Contract</dt>
          <dd className="font-mono text-[0.75rem] text-ink">
            {asset.contractAddress ? truncateAddress(asset.contractAddress) : "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-subtle">Issuer</dt>
          <dd className="capitalize text-ink">{asset.provider}</dd>
        </div>
      </dl>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-[0.75rem] uppercase tracking-[0.1em] text-ink-subtle">{label}</dt>
      <dd
        className={cn(
          "truncate text-[0.875rem] text-ink",
          mono && "font-mono text-[0.8125rem]",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function UnavailableMission({
  reason,
  href,
  linkLabel,
}: {
  reason: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface-muted p-5">
      <p className="text-[0.9375rem] leading-relaxed text-ink-muted">{reason}</p>
      <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-subtle">
        This is an honest gap rather than a broken exercise — the mission needs a real asset to
        work against, and inventing one would defeat its purpose.
      </p>
      <div className="mt-4">
        <Button as="link" href={href} variant="secondary" size="sm">
          {linkLabel}
        </Button>
      </div>
    </div>
  );
}

/**
 * Resolve a mission's asset.
 *
 * `"auto"` picks the first asset that actually has both prices, so the mission
 * is answerable rather than merely present. A named symbol matches the token
 * symbol first and the underlying ticker second, matching the lookup rules the
 * asset service uses.
 */
function resolveAsset(
  symbol: string | "auto",
  assets: TokenizedStock[],
): TokenizedStock | null {
  if (symbol === "auto") {
    return (
      assets.find((asset) => asset.price !== null && asset.referencePrice !== null) ??
      assets[0] ??
      null
    );
  }

  const target = symbol.toUpperCase();
  return (
    assets.find((asset) => asset.symbol.toUpperCase() === target) ??
    assets.find((asset) => asset.underlyingSymbol?.toUpperCase() === target) ??
    null
  );
}

/**
 * Compare a learner's entry against the expected value.
 *
 * Both modes are case-insensitive after trimming, and that is intentional even
 * for `"exact"`: `symbol()` on a contract might return `AAPLB` or `aaplb`, and
 * EIP-55 checksums make the same address legitimately appear in two casings.
 * Failing a learner over capitalisation teaches them nothing about the subject.
 * The `mode` field is kept because a future field may genuinely need to
 * distinguish a checksummed address from a name — it does not today.
 */
function matches(given: string, expected: string, _mode: "exact" | "address"): boolean {
  const a = given.trim();
  const b = expected.trim();
  if (b === "") return false;
  return a.toLowerCase() === b.toLowerCase();
}
