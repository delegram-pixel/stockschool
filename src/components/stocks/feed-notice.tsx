import { AlertTriangle, Info } from "lucide-react";
import { ProvenanceNotice } from "@/components/ui/provenance-badge";
import { cn } from "@/lib/utils";
import type { AssetFeed } from "@/server/services/asset-service";

/**
 * The banner above the feed.
 *
 * `ProvenanceNotice` already covers the case where the data is *not* live. This
 * component exists for the case it does not: a feed that **is** live by
 * provenance but still carries a `degradation` — which happens when the API
 * answers successfully and returns nothing. That is a real, reachable state, and
 * without this branch the page would render a confident "Live data" badge over
 * an empty grid and explain nothing.
 *
 * So the rule is: a degradation is always shown, whatever the provenance says.
 * The provenance badge qualifies the numbers; the degradation explains the
 * situation. When they disagree, the situation wins — a learner staring at an
 * empty page needs the reason more than the label.
 */
export function FeedNotice({ feed, className }: { feed: AssetFeed; className?: string }) {
  const { degradation } = feed;

  // The ordinary case: not live, so `ProvenanceNotice` owns the message and
  // folds the failure reason into its explanation.
  if (feed.provenance.source !== "live" || feed.provenance.stale) {
    return (
      <ProvenanceNotice
        provenance={feed.provenance}
        reason={degradation ? `${degradation.message} ${degradation.explanation}` : null}
        className={className}
      />
    );
  }

  // Live provenance, but something still went wrong. Only reachable when the
  // provider succeeded with an empty list.
  if (degradation) {
    return (
      <Notice
        tone="warning"
        icon={<AlertTriangle aria-hidden className="h-4 w-4" />}
        title={degradation.message}
        className={className}
      >
        {degradation.explanation}
      </Notice>
    );
  }

  return null;
}

/**
 * A standing note about what live mode means.
 *
 * Deliberately not a warning. When credentials are configured and working there
 * is nothing to be alarmed about — but there *is* something worth saying: this
 * page is showing real numbers from a real API, and the learner can check that
 * claim rather than take it. The endpoint is named so the sentence is
 * verifiable, which is the difference between a reassurance and a boast.
 */
export function LiveFeedNote({ className }: { className?: string }) {
  return (
    <Notice
      tone="info"
      icon={<Info aria-hidden className="h-4 w-4" />}
      title="Live market data"
      className={className}
    >
      Prices come from the Binance Web3 API. Every number on this page is also
      available as JSON at{" "}
      <code className="font-mono text-[0.75rem] text-ink">/api/stocks</code>, so you can check it
      against the source yourself.
    </Notice>
  );
}

const TONE_STYLES = {
  warning: { box: "border-warning/25 bg-warning-soft", tint: "text-warning" },
  // Teal rather than the semantic "info" blue, so this note sits in the same
  // colour family as the live provenance dot it is describing.
  info: { box: "border-line bg-surface-muted", tint: "text-teal" },
} as const;

function Notice({
  tone,
  icon,
  title,
  children,
  className,
}: {
  tone: keyof typeof TONE_STYLES;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const styles = TONE_STYLES[tone];

  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-[0.8125rem] leading-relaxed",
        styles.box,
        className,
      )}
    >
      <span className={cn("mt-0.5 shrink-0", styles.tint)}>{icon}</span>
      <div className="space-y-1">
        <p className="font-semibold text-ink">{title}</p>
        <p className="text-ink-muted">{children}</p>
      </div>
    </div>
  );
}
