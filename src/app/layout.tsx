import type { Metadata, Viewport } from "next";
import { Fraunces, JetBrains_Mono, Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SiteHeader } from "@/components/navigation/site-header";
import { SiteFooter } from "@/components/navigation/site-footer";
import { ProgressProvider } from "@/components/providers/progress-provider";
import { SimulationProvider } from "@/components/providers/simulation-provider";
import "./globals.css";

/**
 * Typefaces.
 *
 * Fraunces is a variable serif with an optical-size axis and a "wonk" axis. It
 * carries the editorial voice — headlines, lesson prose emphasis — and we pin
 * the axes rather than taking the defaults so the letterforms stay calm rather
 * than quirky. Manrope does all interface work. JetBrains Mono is reserved
 * exclusively for on-chain identifiers.
 *
 * `display: "swap"` on all three: the warm canvas already has a defined
 * background, so a flash of fallback text is far less jarring than a blank
 * page waiting on a font.
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
});

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: {
    default: "StockSchool — Learn tokenized stocks on BNB Smart Chain",
    template: "%s · StockSchool",
  },
  description:
    "An interactive course on tokenized stocks: what a share is, what a token is, why on-chain and reference prices differ, and how to read a contract yourself. Educational only — not investment advice.",
  applicationName: "StockSchool",
  keywords: [
    "tokenized stocks",
    "BNB Smart Chain",
    "BSC",
    "RWA",
    "learn crypto",
    "blockchain education",
  ],
  authors: [{ name: "StockSchool" }],
  openGraph: {
    title: "StockSchool — Learn tokenized stocks on BNB Smart Chain",
    description:
      "Learn, explore, simulate, and read the chain for yourself. An interactive introduction to tokenized equities.",
    type: "website",
    siteName: "StockSchool",
  },
  twitter: {
    card: "summary_large_image",
    title: "StockSchool",
    description: "Learn tokenized stocks on BNB Smart Chain — by looking at real ones.",
  },
  // The product's whole value is what it renders, so let crawlers index it —
  // but keep the framing explicitly educational.
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Matches --color-canvas in each theme so the browser chrome does not clash
  // with the page on mobile Safari and Chrome Android.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f5" },
    { media: "(prefers-color-scheme: dark)", color: "#14171a" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${manrope.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-canvas text-ink antialiased">
        {/* Keyboard users should be able to skip the nav — it is six links deep. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-teal focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ink-inverse"
        >
          Skip to content
        </a>

        {/* Both providers live at the root, so navigating between a lesson, the
            explorer and the simulator never remounts them. The simulated
            portfolio in particular must not be re-read from storage on every
            route change: a remount mid-draft would be invisible, but a remount
            between placing an order and seeing the result would look like the
            order was lost. */}
        <ProgressProvider>
          <SimulationProvider>
            <SiteHeader />
            <main id="main" className="min-h-[60vh]">
              {children}
            </main>
            <SiteFooter />
          </SimulationProvider>
        </ProgressProvider>

        {/*
          Page-view analytics, last in the body so it never delays the content
          above it.

          Cookieless and free of cross-site identifiers, which is the only
          reason it is here at all: this product tells learners in three separate
          places that what they write stays on their device, and that promise is
          not worth trading for a funnel chart. It counts which lessons get
          opened, and nothing else.

          `beforeSend` exists for one specific URL. The On-Chain Lab lives at
          `/onchain/[address]`, and the address a learner pastes there may well
          be their own wallet — public on-chain data, but still theirs, and not
          something to hand to a third party just because they looked up their
          own balance. The path is collapsed to the route pattern before it
          leaves the browser, so the visit is still counted and the address is
          not. If you would rather keep this file minimal, the block is
          removable without touching anything else.

          Left on the default mode, which reports from production deployments
          rather than from `next dev`.
        */}
        <Analytics
          beforeSend={(event) => {
            const collapsed = event.url.replace(/\/onchain\/[^/?#]+/, "/onchain/[address]");
            return collapsed === event.url ? event : { ...event, url: collapsed };
          }}
        />
      </body>
    </html>
  );
}
