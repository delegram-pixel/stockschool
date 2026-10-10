import { cn } from "@/lib/utils";
import type { PriceComparison } from "@/lib/calculations/price-difference";
import { explainComparison } from "@/lib/calculations/price-difference";

/**
 * The working, shown.
 *
 * `explainComparison` is the single source of truth for how this number is
 * derived — it is the same function lesson 03's mission uses to mark a learner's
 * own arithmetic. But it returns strings shaped for a `<pre>`: step headings,
 * then their arithmetic indented by three spaces.
 *
 * This component does not re-derive anything. It *parses* those strings back
 * into the structure they were written to express — heading, sum, conclusion —
 * and lays them out as a proper list. That keeps one definition of the
 * arithmetic while giving the page real typography instead of a monospace block.
 *
 * The coupling is deliberate and narrow: if the string format in
 * `price-difference.ts` ever changes, this parse is the one thing that has to
 * change with it, and it lives in one place rather than being spread across the
 * pages that show the working.
 */

type DerivationLine =
  | { kind: "step"; text: string }
  | { kind: "sum"; text: string }
  | { kind: "conclusion"; text: string };

const STEP = /^Step\s+\d+\s+—\s+/;
const INDENTED = /^\s{3,}/;

function parse(lines: string[]): DerivationLine[] {
  return lines.map((raw) => {
    if (STEP.test(raw)) {
      // Drop the "Step N — " prefix: the list already numbers the items, and
      // printing both gives you "1. Step 1 — Find the gap".
      return { kind: "step", text: raw.replace(STEP, "") };
    }
    if (INDENTED.test(raw)) {
      return { kind: "sum", text: raw.trim() };
    }
    return { kind: "conclusion", text: raw };
  });
}

export function Derivation({
  comparison,
  className,
}: {
  comparison: PriceComparison | null;
  className?: string;
}) {
  const parsed = parse(explainComparison(comparison));

  // Without a comparison there is no arithmetic to show, and the single-line
  // explanation should read as prose rather than as a one-item list.
  if (!comparison) {
    return (
      <p className={cn("text-[0.9375rem] leading-relaxed text-ink-muted", className)}>
        {parsed[0]?.text}
      </p>
    );
  }

  const steps = group(parsed);

  return (
    <ol className={cn("space-y-5", className)}>
      {steps.map((step, index) => (
        <li key={index} className="flex gap-4">
          <span
            aria-hidden
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-soft font-mono text-[0.6875rem] font-semibold text-teal-strong"
          >
            {index + 1}
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[0.9375rem] leading-relaxed text-ink">{step.text}</p>

            {step.sums.length > 0 && (
              <div className="mt-2.5 space-y-1 rounded-lg border border-line bg-surface-muted px-3.5 py-2.5">
                {step.sums.map((sum, sumIndex) => (
                  <p
                    key={sumIndex}
                    className="font-mono text-[0.8125rem] tabular-nums text-ink-muted [overflow-wrap:anywhere]"
                  >
                    {sum}
                  </p>
                ))}
              </div>
            )}
          </div>
        </li>
      ))}

      {conclusionOf(parsed) && (
        <li className="flex gap-4 border-t border-line pt-5">
          <span aria-hidden className="mt-0.5 h-6 w-6 shrink-0" />
          <p className="font-display text-[1.0625rem] font-semibold leading-snug tracking-[-0.011em] text-ink">
            {conclusionOf(parsed)}
          </p>
        </li>
      )}
    </ol>
  );
}

/** Fold each step heading together with the arithmetic that follows it. */
function group(lines: DerivationLine[]): { text: string; sums: string[] }[] {
  const steps: { text: string; sums: string[] }[] = [];

  for (const line of lines) {
    if (line.kind === "step") {
      steps.push({ text: line.text, sums: [] });
      continue;
    }
    if (line.kind === "sum") {
      // A sum with no preceding heading is impossible with today's format, but
      // appending it to a synthetic step beats dropping it silently.
      if (steps.length === 0) steps.push({ text: "Working", sums: [] });
      steps[steps.length - 1]!.sums.push(line.text);
    }
  }

  return steps;
}

function conclusionOf(lines: DerivationLine[]): string | null {
  const last = lines[lines.length - 1];
  return last && last.kind === "conclusion" ? last.text : null;
}
