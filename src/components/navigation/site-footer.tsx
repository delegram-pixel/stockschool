import Link from "next/link";
import { FOOTER_NAV } from "./nav-config";

/**
 * The site footer.
 *
 * Carries the disclosures that legally and ethically have to be somewhere
 * persistent: this is an educational tool, the simulator is simulated, prices
 * may be sample data, and nothing here is advice. Putting them in the footer
 * means they are on every page without shouting at the learner mid-lesson.
 */
export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-surface-muted">
      <div className="container-page py-14">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="max-w-sm">
            <p className="font-display text-xl font-semibold tracking-[-0.02em] text-ink">
              StockSchool
            </p>
            <p className="mt-3 text-[0.875rem] leading-relaxed text-ink-muted">
              An interactive introduction to tokenized stocks on BNB Smart Chain. Built for the
              BNB Hack: Tokenized Stocks Edition.
            </p>
          </div>

          {FOOTER_NAV.map((group) => (
            <nav key={group.heading} aria-label={group.heading}>
              <p className="eyebrow">{group.heading}</p>
              <ul className="mt-4 space-y-2.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-[0.875rem] text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 space-y-3 border-t border-line pt-8">
          <p className="text-[0.8125rem] font-semibold text-ink">
            Not investment advice. Not a broker. Not a trading venue.
          </p>
          <p className="max-w-3xl text-[0.8125rem] leading-relaxed text-ink-muted">
            StockSchool is an educational tool. Nothing in this application is a recommendation to
            buy, sell or hold any asset, and nothing here should be used to make a financial
            decision. The simulator uses simulated capital and places no orders — no real
            transaction is ever submitted to any blockchain. Prices may be sample data, and where
            they are live they may be delayed, incomplete, or drawn from thin markets. Tokenized
            stocks carry issuer, custody and regulatory risks that this course describes but cannot
            assess for you.
          </p>
          <p className="max-w-3xl text-[0.8125rem] leading-relaxed text-ink-muted">
            Market data is sourced from the Binance Web3 API. On-chain contract data is read
            directly from public BNB Smart Chain RPC endpoints. This application never asks for,
            stores, or transmits a private key or seed phrase, and it cannot move funds.
          </p>
        </div>
      </div>
    </footer>
  );
}
