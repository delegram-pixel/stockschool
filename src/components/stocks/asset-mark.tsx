import { cn } from "@/lib/utils";
import type { ProviderId, TokenizedStock } from "@/types";

/**
 * The provider mark and monogram.
 *
 * Asset cards want a small square of identity in the top-left, and the obvious
 * move — `<img src={asset.logoUrl}>` — is the wrong one here. `logoUrl` is null
 * for most issuer tokens, and where it is present it is a hotlinked third-party
 * image that may or may not load. A grid where half the tiles are broken images
 * reads as a broken product, and it would make the layout depend on a remote
 * server we do not control.
 *
 * So the mark is *generated*: a two-letter monogram from the underlying ticker,
 * tinted with the issuer's identity colour. It is deterministic, it always
 * renders, it works offline, and it teaches something the logo would not — the
 * tint says *which issuer minted this token*, and the letters say *which company
 * it tracks*. Two facts, no network request.
 */

const PROVIDER_LABEL: Record<ProviderId, string> = {
  bstocks: "Binance bStocks",
  ondo: "Ondo",
  xstocks: "xStocks",
  unknown: "Unverified issuer",
};

const PROVIDER_TINT: Record<ProviderId, string> = {
  bstocks: "bg-provider-bstocks/10 text-provider-bstocks",
  ondo: "bg-provider-ondo/10 text-provider-ondo",
  xstocks: "bg-provider-xstocks/10 text-provider-xstocks",
  unknown: "bg-ink/6 text-ink-muted",
};

export function providerLabel(provider: ProviderId): string {
  return PROVIDER_LABEL[provider];
}

/**
 * Two letters standing in for the company.
 *
 * Prefers the underlying ticker over the token symbol, because "NVDA" gives
 * "NV" and "NVDAB" gives "NV" too — but a hypothetical token whose symbol has
 * been suffixed twice would otherwise produce a monogram that drifts. The
 * underlying is the stable thing.
 */
export function monogramFor(asset: TokenizedStock): string {
  const source = asset.underlyingSymbol?.trim() || asset.symbol.trim();
  return source.slice(0, 2).toUpperCase() || "··";
}

export function AssetMark({
  asset,
  size = "md",
  className,
}: {
  asset: TokenizedStock;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg font-sans font-bold tracking-[-0.02em]",
        size === "lg"
          ? "h-12 w-12 text-[1.0625rem]"
          : size === "sm"
            ? "h-8 w-8 text-[0.6875rem]"
            : "h-10 w-10 text-[0.8125rem]",
        PROVIDER_TINT[asset.provider],
        className,
      )}
    >
      {monogramFor(asset)}
    </span>
  );
}

/**
 * The issuer's name as a chip.
 *
 * Worth its own component because the tint is a *claim*: it asserts which issuer
 * minted the token, and `provider === "unknown"` means the feed could not
 * identify one. Rendering an unknown issuer in the same teal as a confirmed
 * bStock would quietly launder a missing fact into a fact, so "unknown" gets its
 * own neutral treatment and its own wording.
 */
export function ProviderChip({
  provider,
  className,
}: {
  provider: ProviderId;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold",
        PROVIDER_TINT[provider],
        className,
      )}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {PROVIDER_LABEL[provider]}
    </span>
  );
}
