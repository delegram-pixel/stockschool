import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The server/client boundary, enforced.
 *
 * `yarn build` caught this once, late: `mission.tsx` — a `"use client"`
 * component — imported `truncateAddress` from `@/lib/binance/normalize`, and
 * that module reaches `./endpoints` → `./client` → `./signature` → `node:crypto`.
 * Webpack will not bundle a Node builtin for the browser, so it stopped the
 * build with `UnhandledSchemeError` after several minutes of work, naming a
 * helper whose only sin was being filed in the wrong directory.
 *
 * The rule underneath is one sentence: **the server may import anything; the
 * browser may not reach a Node builtin.** That is mechanical, so it belongs in a
 * test that runs in milliseconds rather than in a build that does not.
 *
 * Three assertions, each precise enough that a failure is a real defect and
 * never a matter of taste:
 *
 *   1. No client module may *transitively* reach a Node builtin. This is exactly
 *      what webpack errors on, so it is the one that would have caught the
 *      original bug on the commit that introduced it.
 *   2. No client module may transitively reach the signing layer —
 *      `binance/client.ts` or `binance/signature.ts`. Those two files handle the
 *      API credentials, and an HMAC secret in a browser bundle is a **leak**,
 *      not a build error: nothing would fail, and it would ship.
 *   3. No client module may import from `@/server/*`. That directory is
 *      server-only by name and by intent.
 *
 * Type-only imports are excluded throughout, deliberately. `import type` is
 * erased by the compiler, so it cannot pull anything into a bundle, and several
 * files here lean on that on purpose — a client component describing the shape
 * of a server response should not be forced to redeclare it.
 *
 * Paths are built from `process.cwd()` rather than `import.meta.url`: under
 * Vitest's jsdom environment `import.meta.url` is not a `file:` URL, so
 * `new URL(..., import.meta.url)` cannot be read by `node:fs`. See
 * `design-tokens.test.ts`, which learned this the same way.
 */

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const SERVER_DIR = join(SRC, "server");

/** The two modules that read `BINANCE_API_KEY` / `BINANCE_API_SECRET`. */
const SIGNING_LAYER = [
  join(SRC, "lib/binance/client.ts"),
  join(SRC, "lib/binance/signature.ts"),
];

const RESOLUTION_SUFFIXES = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

/** Modules Node provides. Importing any of these from the browser fails a build. */
const NODE_BUILTINS = new Set([
  "assert",
  "async_hooks",
  "buffer",
  "child_process",
  "cluster",
  "console",
  "constants",
  "crypto",
  "dgram",
  "diagnostics_channel",
  "dns",
  "domain",
  "events",
  "fs",
  "http",
  "http2",
  "https",
  "inspector",
  "module",
  "net",
  "os",
  "path",
  "perf_hooks",
  "process",
  "punycode",
  "querystring",
  "readline",
  "repl",
  "stream",
  "string_decoder",
  "sys",
  "timers",
  "tls",
  "trace_events",
  "tty",
  "url",
  "util",
  "v8",
  "vm",
  "wasi",
  "worker_threads",
  "zlib",
]);

// -----------------------------------------------------------------------------
// Reading the source tree
// -----------------------------------------------------------------------------

function sourceFiles(directory: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      out.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Is this a client module?
 *
 * The directive has to be the first statement, but it may sit below a licence
 * header or a file docblock — which in this codebase it very often does — so
 * comments are stripped before the check rather than the check being anchored
 * to byte zero.
 */
function isClientModule(source: string): boolean {
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");
  return /^[\s;]*["']use client["']\s*;?/.test(withoutComments);
}

type Edge = { specifier: string; typeOnly: boolean };

/** True when every named specifier is `type`-prefixed, e.g. `{ type A, type B }`. */
function bracedClauseIsTypeOnly(clause: string): boolean {
  const braced = /\{([\s\S]*)\}/.exec(clause);
  if (!braced || braced[1] === undefined) return false; // default / namespace import — a value
  const parts = braced[1]
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 && parts.every((part) => part === "type" || part.startsWith("type "));
}

/**
 * Every module this file pulls in, as a value.
 *
 * The clause pattern excludes quotes and semicolons so that a non-greedy match
 * cannot run from one statement's `import` to a later statement's `from` — a
 * side-effect import (`import "./styles.css"`) has no `from` at all, and would
 * otherwise be swallowed into the next real import.
 */
function edgesOf(source: string): Edge[] {
  const edges: Edge[] = [];

  const staticImport = /\bimport\s+(type\s+)?([^;"']*?)\s+from\s*["']([^"']+)["']/g;
  const reExport = /\bexport\s+(type\s+)?([^;"']*?)\s+from\s*["']([^"']+)["']/g;
  const sideEffect = /\bimport\s*["']([^"']+)["']/g;
  const dynamicImport = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;

  for (const match of source.matchAll(staticImport)) {
    const typeOnly = Boolean(match[1]) || bracedClauseIsTypeOnly(match[2] ?? "");
    if (match[3]) edges.push({ specifier: match[3], typeOnly });
  }
  for (const match of source.matchAll(reExport)) {
    const typeOnly = Boolean(match[1]) || bracedClauseIsTypeOnly(match[2] ?? "");
    if (match[3]) edges.push({ specifier: match[3], typeOnly });
  }
  for (const match of source.matchAll(sideEffect)) {
    if (match[1]) edges.push({ specifier: match[1], typeOnly: false });
  }
  for (const match of source.matchAll(dynamicImport)) {
    if (match[1]) edges.push({ specifier: match[1], typeOnly: false });
  }

  return edges;
}

type Resolution =
  | { kind: "local"; file: string }
  | { kind: "external"; specifier: string };

/**
 * Resolve an import specifier to a file in this repo, or report it as external.
 *
 * A local specifier that does not resolve to a file — an aliased path we do not
 * understand, an asset — is reported as `null` and skipped by the caller rather
 * than guessed at. A boundary test that invents edges is worse than none: it
 * fails on code that is fine.
 */
function resolveSpecifier(specifier: string, fromFile: string): Resolution | null {
  let base: string;
  if (specifier.startsWith("@/")) base = join(SRC, specifier.slice(2));
  else if (specifier.startsWith(".")) base = resolve(dirname(fromFile), specifier);
  else return { kind: "external", specifier };

  for (const suffix of RESOLUTION_SUFFIXES) {
    const candidate = base + suffix;
    try {
      if (statSync(candidate).isFile()) return { kind: "local", file: candidate };
    } catch {
      // Not this suffix; keep probing.
    }
  }
  return null;
}

/** The builtin a specifier names, if it names one. `node:crypto` and `crypto` both count. */
function builtinOf(specifier: string): string | null {
  if (specifier.startsWith("node:")) return specifier.slice("node:".length).split("/")[0] ?? specifier;
  const head = specifier.split("/")[0] ?? "";
  return NODE_BUILTINS.has(head) ? head : null;
}

const show = (file: string) => relative(ROOT, file);

/**
 * Everything a module pulls into the bundle, transitively: the files it reaches
 * and the external specifiers it asks for. Local specifiers that do not resolve
 * are dropped, so an unfamiliar alias can never manufacture a violation.
 */
function reachableFrom(entry: string): { files: Set<string>; externals: Map<string, string[]> } {
  const files = new Set<string>();
  const externals = new Map<string, string[]>();
  const queue: Array<{ file: string; path: string[] }> = [{ file: entry, path: [entry] }];
  const seen = new Set<string>([entry]);

  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) break;
    files.add(node.file);

    for (const edge of edgesOf(readFileSync(node.file, "utf8"))) {
      // Erased by the compiler, so it cannot reach a bundle.
      if (edge.typeOnly) continue;

      const resolution = resolveSpecifier(edge.specifier, node.file);

      if (resolution === null) continue;

      if (resolution.kind === "external") {
        if (!externals.has(edge.specifier)) {
          externals.set(edge.specifier, [...node.path, edge.specifier]);
        }
        continue;
      }

      if (seen.has(resolution.file)) continue;
      seen.add(resolution.file);
      queue.push({ file: resolution.file, path: [...node.path, resolution.file] });
    }
  }

  return { files, externals };
}

// -----------------------------------------------------------------------------

const ALL_FILES = sourceFiles(SRC);
const CLIENT_MODULES = ALL_FILES.filter((file) => isClientModule(readFileSync(file, "utf8")));

describe("server/client boundary", () => {
  // A boundary test that scans nothing passes for the wrong reason, and would
  // keep passing after a refactor moved every component out of `src/`.
  it("finds the modules it is supposed to be checking", () => {
    expect(ALL_FILES.length).toBeGreaterThan(50);
    expect(CLIENT_MODULES.length).toBeGreaterThan(10);
  });

  it("no client module reaches a Node builtin", () => {
    const violations: string[] = [];

    for (const entry of CLIENT_MODULES) {
      const { externals } = reachableFrom(entry);
      for (const [specifier, chain] of externals) {
        const builtin = builtinOf(specifier);
        if (builtin === null) continue;
        violations.push(
          `${show(entry)}\n  reaches the Node builtin "${specifier}" via:\n` +
            chain.map((step) => `    → ${show(step)}`).join("\n"),
        );
      }
    }

    expect(
      violations.join("\n\n"),
      "A client component would pull a Node builtin into the browser bundle. " +
        "Webpack refuses this and stops the build. Move the shared value out of " +
        "the server-only module — the way `@/lib/chains` was extracted from " +
        "`binance/endpoints.ts` — or import it inside a server component and pass " +
        "it down as a prop.",
    ).toBe("");
  });

  it("no client module reaches the Binance signing layer", () => {
    const violations: string[] = [];

    for (const entry of CLIENT_MODULES) {
      const { files } = reachableFrom(entry);
      for (const target of SIGNING_LAYER) {
        if (!files.has(target)) continue;
        violations.push(`${show(entry)} reaches ${show(target)}`);
      }
    }

    expect(
      violations.join("\n"),
      "A client component can reach the module that reads BINANCE_API_SECRET. " +
        "Nothing would fail at build time — the credential handling would simply " +
        "ship to the browser. This is a leak, not a warning.",
    ).toBe("");
  });

  it("no client module imports from @/server", () => {
    const violations: string[] = [];

    for (const entry of CLIENT_MODULES) {
      for (const edge of edgesOf(readFileSync(entry, "utf8"))) {
        if (edge.typeOnly) continue;
        const resolution = resolveSpecifier(edge.specifier, entry);
        if (resolution?.kind !== "local") continue;
        if (!resolution.file.startsWith(SERVER_DIR)) continue;
        violations.push(`${show(entry)} imports ${show(resolution.file)}`);
      }
    }

    expect(
      violations.join("\n"),
      "`src/server/` is server-only. A client component must receive this data " +
        "as props from a server component, or fetch it from a route handler.",
    ).toBe("");
  });
});
