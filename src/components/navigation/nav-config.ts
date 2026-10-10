/**
 * The application's primary navigation.
 *
 * Ordered to match the learning journey rather than alphabetically or by
 * implementation convenience: Learn → Explore → Simulate → On-Chain. A learner
 * moving left to right across the header is moving through the product in the
 * order it is meant to be used.
 */

export type NavItem = {
  href: string;
  label: string;
  /** Shown in the mobile sheet and on the landing page, never in the bar. */
  description: string;
};

export const PRIMARY_NAV: NavItem[] = [
  {
    href: "/learn",
    label: "Learn",
    description: "Eight short lessons, from what a share is to reading a contract.",
  },
  {
    href: "/explore",
    label: "Explore",
    description: "Real tokenized stocks with their on-chain and reference prices side by side.",
  },
  {
    href: "/simulate",
    label: "Simulate",
    description: "Practise with simulated capital. Nothing here touches a real market.",
  },
  {
    href: "/onchain",
    label: "On-Chain",
    description: "Read a live contract yourself — address, supply, decimals and all.",
  },
];

export const SECONDARY_NAV: NavItem[] = [
  {
    href: "/progress",
    label: "Progress",
    description: "What you have completed, and what to do next.",
  },
];

export const FOOTER_NAV: Array<{ heading: string; items: NavItem[] }> = [
  {
    heading: "The course",
    items: [
      { href: "/learn", label: "All lessons", description: "The full curriculum." },
      { href: "/progress", label: "Your progress", description: "Completion and scores." },
    ],
  },
  {
    heading: "The labs",
    items: [
      { href: "/explore", label: "Explore assets", description: "Live and sample data." },
      { href: "/simulate", label: "Simulator", description: "Simulated trading only." },
      { href: "/onchain", label: "On-chain reader", description: "Read-only contract inspection." },
    ],
  },
];

/** True when `href` is the section the user is currently in. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
