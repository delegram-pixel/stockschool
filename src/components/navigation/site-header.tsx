"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIMARY_NAV, SECONDARY_NAV, isActivePath } from "./nav-config";

/**
 * The site header.
 *
 * A client component for three reasons: it needs the current path to mark the
 * active section, it owns the mobile sheet's open state, and it reacts to
 * scroll so the bar can gain a border once it leaves the top of the page.
 *
 * The mobile sheet locks body scroll while open and closes on route change —
 * without the second part, tapping a link leaves the sheet covering the page
 * you just navigated to.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close on navigation. The pathname is the signal, so this also covers
  // back/forward and any programmatic navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock the page behind the sheet, and restore whatever the body had before.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Escape closes the sheet — expected of anything that covers the screen.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 bg-canvas/85 backdrop-blur-md transition-[border-color,box-shadow] duration-200",
        scrolled ? "border-b border-line" : "border-b border-transparent",
      )}
    >
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="group flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/45"
          aria-label="StockSchool home"
        >
          <Wordmark />
          <span className="font-display text-[1.0625rem] font-semibold tracking-[-0.02em] text-ink">
            StockSchool
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {PRIMARY_NAV.map((item) => (
            <HeaderLink key={item.href} item={item} active={isActivePath(pathname, item.href)} />
          ))}
          <span aria-hidden className="mx-1.5 h-5 w-px bg-line" />
          {SECONDARY_NAV.map((item) => (
            <HeaderLink key={item.href} item={item} active={isActivePath(pathname, item.href)} />
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line text-ink-muted transition-colors hover:text-ink md:hidden"
        >
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </div>

      {open && <MobileSheet pathname={pathname} onNavigate={() => setOpen(false)} />}
    </header>
  );
}

function HeaderLink({
  item,
  active,
}: {
  item: { href: string; label: string };
  active: boolean;
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative rounded-lg px-3 py-2 text-[0.875rem] font-medium transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/45",
        active ? "text-ink" : "text-ink-muted hover:text-ink",
      )}
    >
      {item.label}
      {/* A short underline rather than a filled pill: the editorial layout
          should not look like a dashboard of tabs. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-teal transition-opacity duration-200",
          active ? "opacity-100" : "opacity-0",
        )}
      />
    </Link>
  );
}

function MobileSheet({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div
      id="mobile-nav"
      className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto border-t border-line bg-canvas md:hidden"
    >
      <nav aria-label="Mobile" className="container-page py-6">
        <ul className="space-y-1">
          {[...PRIMARY_NAV, ...SECONDARY_NAV].map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "block rounded-xl px-4 py-3.5 transition-colors",
                    active ? "bg-teal-soft" : "hover:bg-ink/[0.03]",
                  )}
                >
                  <span
                    className={cn(
                      "block font-display text-lg font-semibold tracking-[-0.015em]",
                      active ? "text-teal-strong" : "text-ink",
                    )}
                  >
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-[0.8125rem] leading-snug text-ink-muted">
                    {item.description}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

/**
 * The mark: a filled square with a corner turned, echoing a token contract —
 * a bounded thing with one edge deliberately cut away.
 *
 * Inline SVG rather than an image file so it inherits `currentColor` and stays
 * crisp at any density with no extra request.
 */
function Wordmark() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 26 26"
      fill="none"
      aria-hidden
      className="shrink-0 text-teal"
    >
      <rect x="1" y="1" width="24" height="24" rx="7" fill="currentColor" opacity="0.12" />
      <rect
        x="1"
        y="1"
        width="24"
        height="24"
        rx="7"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.5"
      />
      <path
        d="M8 17.5V8.5h6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="17" cy="17.5" r="2.25" fill="currentColor" />
    </svg>
  );
}
