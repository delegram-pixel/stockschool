import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The palette, held to the standard the stylesheet claims.
 *
 * `globals.css` opens by promising that every foreground/background pair which
 * actually renders is checked against WCAG 2.2 AA. That promise is only worth
 * anything if something enforces it, because the failure mode here is silent: a
 * colour that fails contrast looks fine to whoever chose it, on their monitor,
 * and looks unreadable to somebody else on theirs.
 *
 * Two things are checked, and they catch different mistakes.
 *
 * 1. **The token set.** Three blocks define the palette — `@theme` and two dark
 *    blocks — and nothing about CSS forces them to agree. A token added to one
 *    and forgotten in another renders in light-mode colours on a dark page, and
 *    a token defined in `@media (prefers-color-scheme: dark)` but not in
 *    `[data-theme="dark"]` renders only for readers who never touch the switch.
 *    That second bug was real and shipped once.
 *
 * 2. **The pairs.** A curated table of what the components actually put on top
 *    of what, with a `where` for each row, so a failure names the place to look
 *    rather than just a colour. It is curated rather than generated because a
 *    generated table cannot tell a pair that renders from one that would be a
 *    mistake — `warning` on `surface-sunken` passes and means nothing.
 *
 * The audit that produced this file found four failing pairs and one whole
 * light-mode rule that only broke in dark mode (`text-white` on a fill that
 * inverts). All five are fixed; the rows below are what keeps them fixed.
 */

/**
 * Paths are built from the working directory, not from `import.meta.url`.
 *
 * Resolving against `import.meta.url` does not survive this environment: under
 * Vitest's jsdom environment the URL that comes out reaches `fs` with a scheme
 * Node will not read, and the file dies at import time with `TypeError: The URL
 * must be of scheme file` — before a single assertion runs, which is why it
 * reports as a failed suite rather than a failed test. Vitest's working
 * directory is the project root, which is the directory these paths were being
 * computed against in the first place.
 */
const ROOT = process.cwd();
const STYLESHEET = join(ROOT, "src/app/globals.css");

/** Text, including the 12px mono captions, is held to the AA threshold. */
const MIN_TEXT_CONTRAST = 4.5;

type Rgb = [number, number, number];

// -----------------------------------------------------------------------------
// Reading the stylesheet
// -----------------------------------------------------------------------------

/**
 * Comments are removed before anything is parsed.
 *
 * Not tidiness: the comments in `globals.css` quote hex values and token names
 * in order to explain why they changed, and `button.tsx` talks *about*
 * `text-white` in order to explain why it is banned. A guard that fires on its
 * own explanation is not a guard.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ");
}

/** The contents of the first block opened after `marker`, brace-matched. */
function extractBlock(css: string, marker: string): string {
  const start = css.indexOf(marker);
  if (start === -1) throw new Error(`globals.css no longer contains \`${marker}\``);

  const open = css.indexOf("{", start);
  if (open === -1) throw new Error(`\`${marker}\` has no opening brace`);

  let depth = 0;
  for (let index = open; index < css.length; index += 1) {
    const character = css[index];
    if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, index);
    }
  }
  throw new Error(`\`${marker}\` is never closed`);
}

/** Every `--token: value;` declaration, in order, duplicates included. */
function declarations(block: string): Array<[string, string]> {
  const pattern = /(--[a-zA-Z0-9-]+):\s*([^;]+);/g;
  const found: Array<[string, string]> = [];

  // `exec` in a loop rather than `matchAll`, which needs a newer lib target
  // than the tsconfig asks for.
  let match = pattern.exec(block);
  while (match !== null) {
    found.push([match[1]!, match[2]!.trim()]);
    match = pattern.exec(block);
  }
  return found;
}

/**
 * A declaration list as a lookup, plus the duplicate check.
 *
 * `new Map` keeps the last write for a repeated key, so comparing its size
 * against the raw declaration count is how a token defined twice — where the
 * winner depends on source order — gets caught.
 */
function tokenMap(block: string): Map<string, string> {
  return new Map(declarations(block));
}

const CSS = stripComments(readFileSync(STYLESHEET, "utf8"));
const THEME_BLOCK = extractBlock(CSS, "@theme");
const DARK_MEDIA_BLOCK = extractBlock(CSS, "@media (prefers-color-scheme: dark)");
const DARK_MEDIA = extractBlock(DARK_MEDIA_BLOCK, ':root:not([data-theme="light"])');
const DARK_EXPLICIT = extractBlock(CSS, ':root[data-theme="dark"]');

function colourTokens(block: string): Map<string, string> {
  const colours = new Map<string, string>();
  for (const [name, value] of tokenMap(block)) {
    if (name.startsWith("--color-")) colours.set(name.slice("--color-".length), value);
  }
  return colours;
}

const THEME = colourTokens(THEME_BLOCK);

const THEMES = {
  light: THEME,
  dark: colourTokens(DARK_MEDIA),
} as const;

// -----------------------------------------------------------------------------
// WCAG 2.2 relative luminance
// -----------------------------------------------------------------------------

function parseHex(value: string): Rgb {
  const hex = value.trim().replace(/^#/, "");
  const expanded =
    hex.length === 3
      ? hex
          .split("")
          .map((character) => character + character)
          .join("")
      : hex;

  if (!/^[0-9a-f]{6}$/i.test(expanded)) {
    throw new Error(`expected a six-digit hex colour, got \`${value}\``);
  }
  return [
    parseInt(expanded.slice(0, 2), 16),
    parseInt(expanded.slice(2, 4), 16),
    parseInt(expanded.slice(4, 6), 16),
  ];
}

/** The sRGB transfer function, then the coefficient-weighted sum. */
function luminance(rgb: Rgb): number {
  const [red, green, blue] = rgb.map((channel) => {
    const ratio = channel / 255;
    return ratio <= 0.04045 ? ratio / 12.92 : Math.pow((ratio + 0.055) / 1.055, 2.4);
  }) as Rgb;

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/**
 * Alpha compositing, done in sRGB space.
 *
 * A browser composites `bg-ink/[0.05]` on the gamma-encoded channels, not on
 * linear light, so the same has to happen here or the result is measurably
 * wrong — by enough, on a light canvas, to move a pair across the threshold.
 */
function composite(over: Rgb, alpha: number, under: Rgb): Rgb {
  return over.map((channel, index) =>
    Math.round(alpha * channel + (1 - alpha) * under[index]!),
  ) as Rgb;
}

function contrast(foreground: Rgb, background: Rgb): number {
  const front = luminance(foreground);
  const back = luminance(background);
  const [lighter, darker] = front > back ? [front, back] : [back, front];
  return (lighter + 0.05) / (darker + 0.05);
}

// -----------------------------------------------------------------------------
// What actually renders on what
// -----------------------------------------------------------------------------

type Pair = {
  fg: string;
  bg: string;
  /** Lay `token` over `bg` at `alpha` before painting `fg`. */
  wash?: { token: string; alpha: number };
  /** The call site this row exists for. */
  where: string;
};

const PAIRS: Pair[] = [
  // --- Body ink, on each of the three surfaces it lands on ------------------
  { fg: "ink", bg: "canvas", where: "all body copy" },
  { fg: "ink", bg: "surface", where: "card and widget headings" },
  { fg: "ink", bg: "surface-muted", where: "inline prose panels" },

  // --- Muted ink ------------------------------------------------------------
  { fg: "ink-muted", bg: "canvas", where: "page ledes, provenance badges" },
  { fg: "ink-muted", bg: "surface", where: "card metadata" },
  { fg: "ink-muted", bg: "surface-muted", where: "definition lists in missions" },
  { fg: "ink-muted", bg: "surface-sunken", where: "hidden rows in the wallet diagram" },

  // --- Subtle ink. The binding tier: this is what pins the palette. ---------
  { fg: "ink-subtle", bg: "canvas", where: "section captions, tickers" },
  { fg: "ink-subtle", bg: "surface", where: "contract addresses on cards" },
  { fg: "ink-subtle", bg: "surface-muted", where: "the darkest surface a caption sits on" },
  { fg: "ink-subtle", bg: "surface-sunken", where: "the hidden wallet row label" },

  // --- Tinted chips: the foreground sits on a wash of itself ----------------
  {
    fg: "ink-muted",
    bg: "canvas",
    wash: { token: "ink", alpha: 0.05 },
    where: "the neutral badge",
  },
  {
    fg: "ink-muted",
    bg: "surface",
    wash: { token: "ink", alpha: 0.06 },
    where: "the unverified-issuer mark",
  },

  // --- Teal -----------------------------------------------------------------
  { fg: "teal", bg: "canvas", where: "the section eyebrow" },
  { fg: "teal", bg: "surface", where: "teal marks inside cards" },
  { fg: "teal-strong", bg: "canvas", where: "links in prose and ledes" },
  { fg: "teal-strong", bg: "teal-soft", where: "the quiet button, and ::selection" },
  { fg: "teal-strong", bg: "surface-muted", where: "the key-idea callout label" },

  // --- Teal panels ----------------------------------------------------------
  // `bg-teal-soft` is used at full strength by the tip callout and the quiet
  // button, and at 50% and 30% by the two cards on the learning path. The
  // translucent variants composite toward the surface beneath them, which is
  // lighter, so the full-strength pair is the binding case for the solid ones
  // and the washes below cover the two that are actually translucent.
  { fg: "ink", bg: "teal-soft", where: "the tip callout body" },
  {
    fg: "ink",
    bg: "canvas",
    wash: { token: "teal-soft", alpha: 0.5 },
    where: "the continue card heading",
  },
  {
    fg: "ink-muted",
    bg: "canvas",
    wash: { token: "teal-soft", alpha: 0.5 },
    where: "the continue card description",
  },
  {
    fg: "ink-subtle",
    bg: "surface",
    wash: { token: "teal-soft", alpha: 0.3 },
    where: "the next-lesson card's captions",
  },

  // --- Type on a filled control --------------------------------------------
  // These five are the reason `ink-inverse` exists. A literal `white` passes in
  // light mode and fails every one of them in dark mode, where the fills lift.
  { fg: "ink-inverse", bg: "teal", where: "the primary button" },
  { fg: "ink-inverse", bg: "teal-strong", where: "the primary button, hovered" },
  { fg: "ink-inverse", bg: "success", where: "the completed-lesson tick" },
  { fg: "ink-inverse", bg: "danger", where: "the failed-transaction node" },
  { fg: "ink-inverse", bg: "ink", where: "the dark pill button" },

  // --- Semantic badges: a colour on its own soft fill ----------------------
  { fg: "success", bg: "success-soft", where: "the positive badge" },
  { fg: "warning", bg: "warning-soft", where: "the caution badge" },
  { fg: "danger", bg: "danger-soft", where: "the negative badge" },
  { fg: "info", bg: "info-soft", where: "the info badge and callout" },

  // --- The same four colours as plain text ---------------------------------
  { fg: "success", bg: "surface-muted", where: "a correct answer verdict" },
  { fg: "warning", bg: "surface-muted", where: "a near-miss verdict" },
  { fg: "danger", bg: "surface-muted", where: "an incorrect answer verdict" },
  { fg: "info", bg: "surface-muted", where: "a contextual note" },
  { fg: "warning", bg: "canvas", where: "the cached provenance badge" },

  // --- Issuer tints: a colour as text on a 10% wash of itself ---------------
  // Verified against both backgrounds the mark actually sits on — the card is
  // `bg-surface`, the detail-page header is on the canvas. It is *not* checked
  // against `surface-muted`, where the bStock tint drops to 4.30 and fails, so
  // an issuer mark belongs on `surface` or `canvas` and nowhere else.
  {
    fg: "provider-bstocks",
    bg: "surface",
    wash: { token: "provider-bstocks", alpha: 0.1 },
    where: "the bStock mark on a card",
  },
  {
    fg: "provider-ondo",
    bg: "surface",
    wash: { token: "provider-ondo", alpha: 0.1 },
    where: "the Ondo mark on a card",
  },
  {
    fg: "provider-xstocks",
    bg: "surface",
    wash: { token: "provider-xstocks", alpha: 0.1 },
    where: "the xStocks mark on a card",
  },
  {
    fg: "provider-bstocks",
    bg: "canvas",
    wash: { token: "provider-bstocks", alpha: 0.1 },
    where: "the bStock mark on the detail header",
  },
  {
    fg: "provider-ondo",
    bg: "canvas",
    wash: { token: "provider-ondo", alpha: 0.1 },
    where: "the Ondo mark on the detail header",
  },
  {
    fg: "provider-xstocks",
    bg: "canvas",
    wash: { token: "provider-xstocks", alpha: 0.1 },
    where: "the xStocks mark on the detail header",
  },

  // --- Reserved accents ----------------------------------------------------
  // `sky` and `sun` are the one pair that is neither teal nor semantic: a calm
  // note and a warm note. Nothing draws with them yet — they are defined in the
  // palette and exposed on `PAINT` in widgets/parts.tsx, and no widget has
  // reached for them. Asserting the pairing now means the first one that does
  // starts from a pair that already clears AA, rather than finding out in
  // review. If you are that widget, move the row up into the rendered list and
  // give it a real `where`.
  { fg: "sky-ink", bg: "sky", where: "a reserved calm-note pairing" },
  { fg: "sun-ink", bg: "sun", where: "a reserved warm-note pairing" },
];

function ratioOf(pair: Pair, tokens: Map<string, string>): number {
  const foreground = tokens.get(pair.fg);
  const background = tokens.get(pair.bg);
  if (foreground === undefined) throw new Error(`no \`--color-${pair.fg}\` in this theme`);
  if (background === undefined) throw new Error(`no \`--color-${pair.bg}\` in this theme`);

  const back = parseHex(background);
  if (!pair.wash) return contrast(parseHex(foreground), back);

  const beneath = tokens.get(pair.wash.token);
  if (beneath === undefined) throw new Error(`no \`--color-${pair.wash.token}\` in this theme`);

  return contrast(parseHex(foreground), composite(parseHex(beneath), pair.wash.alpha, back));
}

function describePair(pair: Pair): string {
  const wash = pair.wash
    ? ` over ${pair.wash.token}/${Math.round(pair.wash.alpha * 100)}%`
    : "";
  return `${pair.fg} on ${pair.bg}${wash} — ${pair.where}`;
}

// -----------------------------------------------------------------------------
// The token set
// -----------------------------------------------------------------------------

describe("the palette is defined once and overridden twice", () => {
  it("names the same colour tokens in @theme and in both dark blocks", () => {
    const names = [...THEME.keys()].sort();
    expect([...colourTokens(DARK_MEDIA).keys()].sort()).toEqual(names);
    expect([...colourTokens(DARK_EXPLICIT).keys()].sort()).toEqual(names);
  });

  it("gives the two dark blocks identical values", () => {
    // This is the bug the explicit block exists to avoid, and it is one
    // copy-paste away at all times. `data-theme="dark"` is the switch a reader
    // actually flips, so a value only present in the media query reaches
    // readers who never touch it and misses everyone who does.
    expect(colourTokens(DARK_EXPLICIT)).toEqual(colourTokens(DARK_MEDIA));
  });

  it("defines no colour token twice", () => {
    for (const [label, block] of [
      ["@theme", THEME_BLOCK],
      ["the dark media block", DARK_MEDIA],
      ["the explicit dark block", DARK_EXPLICIT],
    ] as const) {
      expect(declarations(block).length, `${label} defines a token twice`).toBe(
        tokenMap(block).size,
      );
    }
  });

  it("defines every colour as a plain six-digit hex", () => {
    // Named colours and `rgb()` both parse, but only hex is what the rest of
    // this file — and anyone auditing the palette by hand — expects to find.
    for (const [name, value] of THEME) {
      expect(() => parseHex(value), `--color-${name} is ${value}`).not.toThrow();
    }
  });
});

// -----------------------------------------------------------------------------
// The pairs
// -----------------------------------------------------------------------------

describe("every pair that renders", () => {
  for (const mode of ["light", "dark"] as const) {
    describe(`in the ${mode} theme`, () => {
      const tokens = THEMES[mode];

      for (const pair of PAIRS) {
        it(describePair(pair), () => {
          const ratio = ratioOf(pair, tokens);
          expect(
            ratio,
            `${mode}: ${describePair(pair)} measures ${ratio.toFixed(2)}:1`,
          ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
        });
      }
    });
  }
});

// -----------------------------------------------------------------------------
// Tokens with no measured pair
// -----------------------------------------------------------------------------

/**
 * The colour tokens deliberately left out of the table above, each with the
 * reason. The test at the bottom of this file fails if a token is in neither
 * this list nor the pair table, so a new colour has to be classified rather
 * than quietly inheriting nobody's attention.
 */
const UNCOVERED: Record<string, string> = {
  line: "Hairline rules and card borders. Decoration, never a control boundary.",
  "line-strong":
    "The stronger rule, and the border on secondary buttons — which also carry a fill and a text label, so 1.4.11 does not apply.",
  "line-faint":
    "The faintest rule, used inside cards. Purely decorative.",
  "teal-line":
    "The underline beneath prose links and the dashed stroke in diagrams. The link's own text carries the contrast.",
  "chart-1": "Categorical fill in the allocation bar, identified by a labelled legend.",
  "chart-2": "Categorical fill in the allocation bar, identified by a labelled legend.",
  "chart-3": "Categorical fill in the allocation bar, identified by a labelled legend.",
  "chart-4": "Categorical fill in the allocation bar, identified by a labelled legend.",
  "chart-5": "Categorical fill in the allocation bar, identified by a labelled legend.",
  "chart-6": "Categorical fill in the allocation bar, identified by a labelled legend.",
};

describe("tokens without a measured pair", () => {
  it("accounts for every colour in the palette", () => {
    // The point of this file in one assertion. Adding `--color-teal-bright`
    // without deciding what it sits on now fails here rather than shipping.
    const measured = new Set<string>();
    for (const pair of PAIRS) {
      measured.add(pair.fg);
      measured.add(pair.bg);
      if (pair.wash) measured.add(pair.wash.token);
    }

    const unaccounted = [...THEME.keys()].filter(
      (token) => !measured.has(token) && !(token in UNCOVERED),
    );
    expect(unaccounted, "no pair and no reason recorded for these tokens").toEqual([]);
  });

  it("keeps no stale entry in the uncovered list", () => {
    const stale = Object.keys(UNCOVERED).filter((token) => !THEME.has(token));
    expect(stale, "these are exempted but no longer exist").toEqual([]);
  });
});

// -----------------------------------------------------------------------------
// A source guard, for the one mistake the pair table cannot see
// -----------------------------------------------------------------------------

/**
 * A hard-coded `white` or `black` is invisible to a token audit and wrong in
 * exactly one theme.
 *
 * `text-white` on `bg-teal` reads at 5.5:1 in light mode and 2.6:1 in dark,
 * where the fill lifts to a bright teal. Both look deliberate; only one is
 * legible. The palette already has the right answer — `--color-ink-inverse`
 * flips from near-white to near-black between themes — so this checks that
 * nobody reaches past it. Five such call sites were found and fixed; this is
 * what stops the sixth.
 *
 * `via-white` is excluded, and the exclusion is deliberate rather than
 * incidental: the only use is the shimmer sweep across a skeleton card, which
 * is `aria-hidden`, carries no text, and is *meant* to be a light band in both
 * themes.
 */
const HARD_CODED = /\b(?:bg|text|border|ring|fill|stroke|decoration|from|to|outline)-(?:white|black)(?:\/\d+)?\b/;

function sourceFiles(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const child = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...sourceFiles(child));
    else if (/\.tsx?$/.test(entry.name)) found.push(child);
  }
  return found;
}

describe("no hard-coded white or black in the interface", () => {
  it("uses `ink-inverse` rather than the `white` keyword", () => {
    const offenders = sourceFiles(join(ROOT, "src"))
      .filter((file) => HARD_CODED.test(stripComments(readFileSync(file, "utf8"))))
      .map((file) => relative(ROOT, file));

    expect(offenders, "`white` cannot follow a token through the theme switch").toEqual([]);
  });
});
