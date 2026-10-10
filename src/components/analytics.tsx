"use client";

import { Analytics } from "@vercel/analytics/next";

/**
 * Page-view analytics.
 *
 * This is a client component for one reason, and it is worth naming because the
 * error it prevents is not obvious: `beforeSend` is a **function**, and a
 * function cannot be passed from a server component to a client one. React
 * will not serialise it across the boundary, and the build fails at prerender
 * with `Functions cannot be passed directly to Client Components unless you
 * explicitly expose it by marking it with "use server"`.
 *
 * So `layout.tsx` stays a server component and hands the work down to here.
 * The alternative — marking the filter `"use server"` — would be wrong: that
 * turns it into a network round trip to the server on every page view, to
 * decide something the browser already knows.
 *
 * Vercel Analytics is cookieless and carries no cross-site identifier, which is
 * the only reason it is in this product at all. StockSchool tells learners in
 * three separate places that what they write stays on their device, and that
 * promise is not worth trading for a funnel chart. This counts which pages get
 * opened, and nothing else.
 *
 * `beforeSend` guards one specific URL. The On-Chain Lab lives at
 * `/onchain/[address]`, and the address a learner pastes there may well be their
 * own wallet — public on-chain data, but still theirs, and not something to hand
 * to a third party just because they looked up their own balance. The path is
 * collapsed to the route pattern before the event leaves the browser, so the
 * visit is still counted and the address is not. Anything that does not match is
 * returned untouched, by reference.
 */
export function SiteAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        const collapsed = event.url.replace(/\/onchain\/[^/?#]+/, "/onchain/[address]");
        return collapsed === event.url ? event : { ...event, url: collapsed };
      }}
    />
  );
}
