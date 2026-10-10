/**
 * Chain identity, deliberately outside `src/lib/binance/`.
 *
 * These constants used to live in `binance/endpoints.ts`, which imports
 * `./client` → `./signature` → `node:crypto`. That made a label lookup —
 * `CHAIN_LABELS["56"]` — pull the entire signed-request stack with it. On the
 * server that is invisible; from a `"use client"` component it is a hard build
 * failure, because webpack will not bundle `node:crypto` for the browser.
 *
 * Nothing in this file knows about Binance and nothing here imports anything.
 * That is the whole point: it is safe from either side of the RSC boundary, and
 * it has to stay that way.
 */

/** BNB Smart Chain. Most tokenized equities settle here. */
export const DEFAULT_CHAIN_ID = Number(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID ?? 56);

export const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  56: "BNB Smart Chain",
  8453: "Base",
};

/** `CT_501` is Solana and is not numeric — kept as a label only. */
export const CHAIN_LABELS: Record<string, string> = {
  "56": "BNB Smart Chain",
  "1": "Ethereum",
  "8453": "Base",
  CT_501: "Solana",
};
