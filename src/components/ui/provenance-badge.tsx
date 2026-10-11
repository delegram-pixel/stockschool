import { Dot, type BadgeTone } from "./badge";
import { RelativeTime } from "./relative-time";
import { cn } from "@/lib/utils";
import { provenanceLabel, provenanceTone } from "@/lib/provenance";
import type { DataProvenance } from "@/types";

/**
 * The provenance badge.
 *
 * This component exists because of FR-14: *mock data is never presented as live
 * data*. It is intentionally not optional and not a prop a caller can hide — if
 * a surface shows an external number, it shows where that number came from.
 *
 * The three states map to three unmistakably different visual treatments:
 *   live    — teal dot, "Live data"
 *   cached  — amber dot, "Cached data"
 *   sample  — grey dot, "Sample data"
 *
 * Colour alone never carries the meaning: the label always says the word.
 */

const TONE_STYLES: Record<ReturnType<typeof provenanceTone>, { dot: BadgeTone; className: string }> = {
  live: { dot: "accent", className: "text-teal-strong" },
  cached: { dot: "caution", className: "text-warning" },
  sample: { dot: "neutral", className: "text-ink-muted" },
};

export function ProvenanceBadge({
  provenance,
  className,
  showTime = true,
}: {
  provenance: DataProvenance;
  className?: string;
  showTime?: boolean;
}) {
  const tone = provenanceTone(provenance);
  const style = TONE_STYLES[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[0.75rem] font-medium",
        style.className,
        className,
      )}
    >
      <Dot tone={style.dot} pulse={tone === "live"} />
      <span>{provenanceLabel(provenance)}</span>
      {showTime && provenance.updatedAt && (
        <>
          <span aria-hidden className="text-ink-subtle">
            ·
          </span>
          <RelativeTime iso={provenance.updatedAt} className="text-ink-muted" />
        </>
      )}
    </span>
  );
}

/**
 * A full-width notice for when data is not what it appears to be.
 *
 * Deliberately distinct from `ProvenanceBadge`: a badge qualifies a number,
 * this explains a situation. It only renders for non-live sources, and the
 * copy always states the *consequence* — what the learner should not conclude —
 * rather than just naming the state.
 */
export function ProvenanceNotice({
  provenance,
  reason,
  className,
}: {
  provenance: DataProvenance;
  /** Shown when data is sample because something failed. */
  reason?: string | null;
  className?: string;
}) {
  if (provenance.source === "live" && !provenance.stale) return null;

  const isSample = provenance.source === "mock";

  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-[0.8125rem] leading-relaxed",
        isSample
          ? "border-line bg-surface-muted text-ink-muted"
          : "border-warning/25 bg-warning-soft text-warning",
        className,
      )}
    >
      <span aria-hidden className="mt-1.5">
        <Dot tone={isSample ? "neutral" : "caution"} />
      </span>
      <div className="space-y-1">
        <p className="font-semibold text-ink">
          {isSample
            ? "You are looking at sample data"
            : provenance.stale
              ? "This data is out of date"
              : "This data is cached"}
        </p>
        <p>
          {isSample
            ? reason ??
              "No market data provider is configured, so every price on this page is an illustrative placeholder. Nothing here reflects a real market."
            : provenance.stale
              ? "The most recent refresh did not succeed, so these values may no longer reflect the market. Treat them as historical."
              : "These values come from a recent successful fetch but are not being refreshed live."}
        </p>
        {isSample && !reason && (
          // `!reason` is the whole condition, and it is easy to get wrong.
          //
          // A reason is supplied exactly when credentials *were* configured and
          // the call then failed. In that state these two names are already set,
          // so printing them instructs the reader to do what they have just
          // done — and the sentence above, which is the actual diagnosis, reads
          // as a generic complaint rather than the answer. Worse, it sends them
          // looking for a configuration problem when the fault is upstream.
          //
          // With no reason at all, the banner is true: nothing is configured.
          //
          // These names are load-bearing copy either way: they are the only
          // instruction a reader gets, and they must match `isConfigured()` in
          // `src/lib/binance/client.ts` exactly. A wrong name here fails
          // silently — the app just keeps rendering this same banner, with no
          // error to explain why nothing changed.
          <p className="text-ink-subtle">
            Set <code className="font-mono text-[0.75rem]">BINANCE_WEB3_API_KEY</code> and{" "}
            <code className="font-mono text-[0.75rem]">BINANCE_WEB3_API_SECRET</code> to switch to
            live data. The page will not change in any other way.
          </p>
        )}
      </div>
    </div>
  );
}
