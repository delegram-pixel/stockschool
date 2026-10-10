import { NextResponse, type NextRequest } from "next/server";
import { CACHE_TTL_SECONDS } from "@/lib/binance/client";
import { getAssetFeed, searchAssets } from "@/server/services/asset-service";

/**
 * The asset feed as JSON.
 *
 * The Explore page renders the same feed on the server, so this endpoint is not
 * there to make the page work — it is there so the data is *reachable*, which is
 * the difference between a product and a screenshot. Anything the UI shows can
 * be fetched, inspected and checked against the API's own documentation.
 *
 * The envelope is deliberately verbose. It carries `mode` and `provenance`
 * alongside the assets so that a caller cannot look at a price without also
 * seeing where it came from. `provenance.source === "mock"` means the numbers
 * are illustrative, and any consumer that ignores that is doing so on purpose.
 *
 * `?q=` filters, matching the explorer's search exactly — same service call, so
 * the endpoint and the UI cannot disagree about what "nvda" matches.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  const feed = query ? await searchAssets(query) : await getAssetFeed();

  return NextResponse.json(
    {
      mode: feed.mode,
      unconfigured: feed.unconfigured,
      degradation: feed.degradation,
      provenance: feed.provenance,
      count: feed.assets.length,
      assets: feed.assets,
    },
    {
      headers: {
        // Live prices may be cached for as long as the client considers them
        // fresh. Sample data is never cached: it must not outlive the moment
        // someone adds credentials and the same URL starts returning real
        // numbers.
        "Cache-Control":
          feed.mode === "live"
            ? `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS * 2}`
            : "no-store",
      },
    },
  );
}
