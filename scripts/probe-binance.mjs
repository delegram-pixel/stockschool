#!/usr/bin/env node
/**
 * Binance Web3 API probe.
 *
 * A standalone, dependency-free client that signs a request and prints the raw
 * response. It exists because of the finding in `DX_NOTES.md` §5.2: our
 * integration was written from the documentation, compiled cleanly, passed its
 * tests, and then failed on **every endpoint** the first time it was pointed at
 * the live API. The cause was never the signature — it was parameter names we had
 * inferred from the endpoint paths.
 *
 * The lesson was that when the documentation does not pin a contract down, you
 * stop reading your own code and start reading the wire. This file is how we did
 * that, kept in the repository so anyone can repeat it.
 *
 * Usage:
 *
 *   node scripts/probe-binance.mjs                 # every endpoint
 *   node scripts/probe-binance.mjs price           # one, by name
 *   node scripts/probe-binance.mjs --full          # do not truncate bodies
 *
 * Credentials are read from the environment, falling back to `.env` in the repo
 * root. The secret is never printed.
 *
 * ── Before you run this ──────────────────────────────────────────────────────
 * Check that the host resolves at all. `DX_NOTES.md` §5.8 documents an
 * afternoon lost to a network whose resolver intermittently refused this domain
 * and produced `fetch failed` — an error that names neither DNS nor the host:
 *
 *   getent ahosts web3.binance.com        # should print addresses
 *   curl -sS -o /dev/null -w '%{http_code}\n' \
 *        https://web3.binance.com/build/api/v1/dex/market/rwa/tokens
 *
 * No addresses means the problem is the network, not the code, and no amount of
 * signature debugging will fix it.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, existsSync } from "node:fs";
import { createHmac } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------

loadDotEnv(resolve(REPO_ROOT, ".env"));

const KEY = process.env.BINANCE_WEB3_API_KEY?.trim();
const SECRET = process.env.BINANCE_WEB3_API_SECRET?.trim();
const BASE = (process.env.BINANCE_WEB3_BASE_URL ?? "https://web3.binance.com").replace(/\/+$/, "");

// The `/build` prefix is mandatory and is included in the signed string. It is
// the single most expensive omission in this API: the documented formula looks
// correct without it, and the only feedback is `40102 Invalid signature`.
const PREFIX = process.env.BINANCE_WEB3_BASE_PATH ?? "/build";

const args = process.argv.slice(2);
const FULL = args.includes("--full");
const only = args.filter((a) => !a.startsWith("--"));

if (!KEY || !SECRET) {
  console.error(
    "No credentials.\n" +
      "  Set BINANCE_WEB3_API_KEY and BINANCE_WEB3_API_SECRET, or put them in .env\n" +
      "  at the repository root. Get keys at https://web3.binance.com/en/dev-portal",
  );
  process.exit(1);
}

// -----------------------------------------------------------------------------
// The request
// -----------------------------------------------------------------------------

/**
 * preHash   = timestamp + method + requestPath + body
 * signature = Base64( HMAC-SHA256( preHash, secretKey ) )
 *
 * The GET body is the empty string — not `"{}"`, not `"null"`, and not the
 * string `"undefined"`, which is what `JSON.stringify(undefined)` gives you.
 */
async function call(name, endpoint, query = {}, { method = "GET", body } = {}) {
  const qs = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const requestPath = `${PREFIX}${endpoint}${qs ? `?${qs}` : ""}`;
  const rawBody = method === "GET" || body === undefined ? "" : JSON.stringify(body);
  const timestamp = new Date().toISOString();
  const signature = createHmac("sha256", SECRET)
    .update(`${timestamp}${method}${requestPath}${rawBody}`, "utf8")
    .digest("base64");

  console.log(`\n${"─".repeat(78)}\n${name}  →  ${method} ${requestPath}`);

  try {
    const res = await fetch(`${BASE}${requestPath}`, {
      method,
      headers: {
        "X-OC-APIKEY": KEY,
        "X-OC-TIMESTAMP": timestamp,
        "X-OC-SIGN": signature,
        Accept: "application/json",
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      body: method === "POST" ? rawBody : undefined,
      signal: AbortSignal.timeout(15_000),
    });

    const text = await res.text();
    console.log(`HTTP ${res.status} ${res.statusText}  (${text.length} bytes)`);

    // Read the body even on a 4xx/5xx. Upstream puts its real message there, and
    // the status alone has never once been enough to diagnose anything.
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.log(text.slice(0, 500));
      return;
    }

    // Two failure modes look nothing alike, and telling them apart is the whole
    // skill. Worth naming in the output rather than leaving to the reader:
    if (res.status === 404 || /No static resource/i.test(text)) {
      console.log("→ WRONG PATH. Spring could not match the route.");
    } else if (parsed && Number(parsed.code) !== 0 && Number(parsed.code) !== 200) {
      console.log(`→ HTTP 200 carrying a failure body. code=${parsed.code} ${parsed.msg ?? ""}`);
    }

    console.log(FULL ? JSON.stringify(parsed, null, 2) : truncate(JSON.stringify(parsed, null, 2)));
  } catch (error) {
    // `fetch` reports every transport failure as the same three words —
    // "TypeError: fetch failed" — and puts the actual cause one or two levels
    // down in `error.cause`, sometimes inside an `AggregateError.errors[]` when
    // more than one address was attempted. Reading only `error.message` is how
    // you end up calling a DNS failure a network failure, which is what the first
    // version of this script did.
    const detail = diagnose(error);
    const blob = `${error.message} ${detail.join(" ")}`;

    const hint =
      /EAI_AGAIN|ENOTFOUND|EAI_FAIL|ENODATA|SERVFAIL|getaddrinfo/i.test(blob)
        ? "DNS — the host did not resolve. See the pre-flight note at the top of this file."
        : /ECONNREFUSED|ECONNRESET|ETIMEDOUT|EHOSTUNREACH|ENETUNREACH/i.test(blob)
          ? "the connection, not the name — the host resolved, so this is not DNS"
          : error.name === "TimeoutError"
            ? "timed out"
            : "network";

    console.log(`✗ ${error.name}: ${error.message}   [${hint}]`);
    if (detail.length > 0) console.log(`  cause: ${detail.join("  ·  ")}`);
  }
}

/**
 * Flatten a nested `fetch` failure into the codes and messages underneath it.
 *
 * Bounded and cycle-safe: the chain is normally two deep, but `AggregateError`
 * can repeat a cause per address and nothing here is worth an infinite loop.
 */
function diagnose(error) {
  const seen = new Set();
  const parts = [];

  const walk = (node, depth) => {
    if (!node || typeof node !== "object" || depth > 4 || seen.has(node)) return;
    seen.add(node);
    if (node.code) parts.push(String(node.code));
    if (node.errno) parts.push(String(node.errno));
    if (node.syscall) parts.push(`${node.syscall}()`);
    if (node.message && node.message !== error.message) parts.push(node.message);
    if (Array.isArray(node.errors)) for (const inner of node.errors) walk(inner, depth + 1);
    walk(node.cause, depth + 1);
  };

  walk(error, 0);
  return [...new Set(parts)];
}

function truncate(text, limit = 1200) {
  return text.length <= limit ? text : `${text.slice(0, limit)}\n  … (${text.length - limit} more bytes; pass --full)`;
}

// -----------------------------------------------------------------------------
// Pre-flight
// -----------------------------------------------------------------------------

console.log(`host:   ${BASE}`);
console.log(`prefix: ${PREFIX}`);
console.log(`key:    ${KEY.slice(0, 8)}…  (secret withheld)`);

console.log(`\n${"═".repeat(78)}\nEndpoints\n${"═".repeat(78)}`);

// The parameters below are the ones the live API actually accepts, established
// by getting them wrong first. Two of them are the entire subject of §5.2:
//
//   binanceChainId          not `chainId`
//   tokenContractAddresses  not `symbol`, and plural because it takes a list
//
// Run `git log -p DX_NOTES.md` for the argument; the short version is that every
// wrong spelling here returns HTTP 200 with `code: 40001`, so a client that only
// checks `response.ok` reads a failure as a success.
const PROBES = {
  tokens: () =>
    call("RWA tokens — the catalogue", "/api/v1/dex/market/rwa/tokens", { binanceChainId: 56 }),

  search: () =>
    call("RWA search — returns COMPANIES with assets nested inside", "/api/v1/dex/market/rwa/search", {
      keyword: "TSLA",
      binanceChainId: 56,
    }),

  price: () =>
    call(
      "RWA price — takes ADDRESSES, plural, comma-joined",
      "/api/v1/dex/market/rwa/price",
      { binanceChainId: 56, tokenContractAddresses: SAMPLE_CONTRACT },
    ),

  market: () =>
    call(
      "RWA underlying-market — session state lives at statusInfo.marketStatus",
      "/api/v1/dex/market/rwa/underlying-market",
      { binanceChainId: 56, tokenContractAddress: SAMPLE_CONTRACT },
    ),

  profile: () =>
    call("RWA underlying-profile — needs BOTH parameters", "/api/v1/dex/market/rwa/underlying-profile", {
      binanceChainId: 56,
      tokenContractAddress: SAMPLE_CONTRACT,
    }),

  quote: () =>
    call(
      "Aggregator quote — needs userWalletAddress for Ondo RFQ pairs",
      "/api/v1/dex/aggregator/quote",
      {
        binanceChainId: 56,
        fromTokenAddress: "0x55d398326f99059fF775485246999027B3197955", // USDT on BSC
        toTokenAddress: SAMPLE_CONTRACT,
        amount: "1000000000000000000",
        userWalletAddress: "0x0000000000000000000000000000000000000001",
      },
    ),

  missing: () =>
    call("NOT PART OF THIS API — kept to show what a wrong path looks like", "/api/v1/tx/simulate", {}, {
      method: "POST",
      body: { chainId: 56, from: "0x0", to: "0x0", data: "0x", value: "0" },
    }),
};

// A real BSC tokenized-equity contract, used as the sample identifier.
const SAMPLE_CONTRACT = "0x2494b603319d4d9f9715c9f4496d9e0364b59d93";

const selected = only.length > 0 ? only : Object.keys(PROBES);
for (const name of selected) {
  const probe = PROBES[name];
  if (!probe) {
    console.error(`\nUnknown probe "${name}". Available: ${Object.keys(PROBES).join(", ")}`);
    continue;
  }
  await probe();
}

console.log(`\n${"═".repeat(78)}\nDone.\n`);

// -----------------------------------------------------------------------------

/**
 * Minimal `.env` reader.
 *
 * Deliberately not `dotenv`: this script exists to be run against a repository
 * someone just cloned, and a probe that needs an install before it can tell you
 * whether the API is reachable misses the point.
 *
 * Existing environment variables win, so `BINANCE_WEB3_API_KEY=… node scripts/…`
 * works without touching the file.
 */
function loadDotEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const name = trimmed.slice(0, eq).trim();
    if (process.env[name] !== undefined) continue;
    // Strip one layer of surrounding quotes, which .env files often carry.
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[name] = value;
  }
}
