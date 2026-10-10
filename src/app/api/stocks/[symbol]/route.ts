import { NextResponse } from "next/server";
import { CACHE_TTL_SECONDS } from "@/lib/binance/client";
import { getAssetBySymbol } from "@/server/services/asset-service";

/**
 * One asset, by token symbol or underlying ticker.
 *
 * Accepts either "NVDA" or "NVDAB" and resolves both, because a learner reading
 * lesson 03 will type the ticker they know and the token symbol is the one the
 * contract carries. Being pedantic about which one is "correct" would only teach
 * them that the app is fussy.
 *
 * A symbol the feed does not have is a 404 with a message that says what was
 * searched for — not an empty success. `mode` and `provenance` travel with the
 * asset for the same reason they do on the list endpoint.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  const lookup = await getAssetBySymbol(symbol);

  if (!lookup) {
    return NextResponse.json(
      {
        error: `No tokenized stock matching "${symbol}" is available right now.`,
        symbol,
      },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      mode: lookup.mode,
      unconfigured: lookup.unconfigured,
      degradation: lookup.degradation,
      asset: lookup.asset,
    },
    {
      headers: {
        "Cache-Control":
          lookup.mode === "live"
            ? `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS * 2}`
            : "no-store",
      },
    },
  );
}
