import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SIMULATION_DISCLOSURE } from "@/lib/simulation/engine";

/**
 * The simulation disclosure.
 *
 * The PRD requires it and the requirement is easy to satisfy badly — a line of
 * grey 11px text in a footer that nobody reads. That would be technically
 * compliant and practically dishonest, because the whole risk of a trading
 * simulator is a beginner mistaking it for the real thing. So the disclosure is:
 *
 *  - **Persistent.** It is not dismissible and not a toast. It sits above the
 *    workspace on every visit.
 *  - **Specific about what is not real.** "No real trades are executed and no
 *    money moves" says what to conclude, where "simulated" alone asks the reader
 *    to work it out.
 *  - **Calm, not alarming.** A red warning banner would read as an error state.
 *    This is the product working exactly as intended, so it looks like a
 *    considered note rather than a fault.
 */

export function SimulationDisclosure({ className }: { className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-3 rounded-xl border border-teal-line bg-teal-soft/60 px-4 py-3.5",
        className,
      )}
    >
      <ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-teal-strong" />
      <div className="space-y-1 text-[0.8125rem] leading-relaxed">
        <p className="font-semibold text-ink">This is a sandbox, not a broker</p>
        <p className="text-ink-muted">
          {SIMULATION_DISCLOSURE} The prices are real market data; everything you do with them
          happens only on this page, and only for you.
        </p>
      </div>
    </div>
  );
}

/**
 * The short form, for headers and cards where the full note would be noise.
 *
 * Both forms exist so the disclosure can appear wherever a number from the
 * simulation is shown, without any of those places becoming a wall of text.
 */
export function SimulatedBadge({ className }: { className?: string }) {
  return (
    <Badge tone="info" className={className}>
      Simulated
    </Badge>
  );
}
