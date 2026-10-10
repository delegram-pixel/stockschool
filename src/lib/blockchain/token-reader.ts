import { createPublicClient, fallback, http, isAddress, getAddress, type PublicClient } from "viem";
import { bsc, mainnet, base } from "viem/chains";
import { makeProvenance } from "@/lib/providers";
import { ProviderError, type OnChainToken, type Result } from "@/types";

/**
 * Read-only BNB Chain contract inspection.
 *
 * Everything here is a *read*. There is no wallet, no signer, no private key
 * and no `eth_sendRawTransaction` anywhere in this module — by construction, not
 * by discipline. A learner can inspect a real token contract without owning a
 * wallet, which is the PRD's position in §13.5 and app-flow §8.
 *
 * Deliberately tolerant about what a contract implements: the TRD warns not to
 * assume every token is a plain ERC-20. Stock token contracts vary, and some
 * proxy through an implementation address. So each property is read
 * independently and a failure on one does not sink the others — a token with no
 * `name()` still shows its address, symbol and decimals.
 */

/** Minimal ABIs. Only the read functions we actually call. */
const ERC20_ABI = [
  { name: "name", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

/**
 * Public fallback endpoints.
 *
 * These are rate-limited and not suitable for a busy production deployment —
 * `.env.example` recommends a dedicated provider. They exist so the On-Chain
 * Lab works out of the box with zero configuration, which matters when a judge
 * clones the repo.
 */
const PUBLIC_BSC_RPCS = [
  "https://bsc-dataseed.bnbchain.org",
  "https://bsc-dataseed1.defibit.io",
  "https://bsc-dataseed1.ninicoin.io",
  "https://binance.llamarpc.com",
];

export const SUPPORTED_CHAINS = {
  56: { chain: bsc, name: "BNB Smart Chain", explorer: "https://bscscan.com" },
  1: { chain: mainnet, name: "Ethereum", explorer: "https://etherscan.io" },
  8453: { chain: base, name: "Base", explorer: "https://basescan.org" },
} as const;

export type SupportedChainId = keyof typeof SUPPORTED_CHAINS;

export const DEFAULT_CHAIN: SupportedChainId = 56;

export function chainName(chainId: number): string {
  return SUPPORTED_CHAINS[chainId as SupportedChainId]?.name ?? `Chain ${chainId}`;
}

export function explorerUrl(
  chainId: number,
  kind: "address" | "tx" | "block",
  value: string,
): string | null {
  const entry = SUPPORTED_CHAINS[chainId as SupportedChainId];
  if (!entry) return null;
  return `${entry.explorer}/${kind}/${value}`;
}

/**
 * Build a viem client with real transport fallback.
 *
 * `fallback()` rotates to the next transport when one 429s or times out, and
 * ranks them by observed latency. This is the difference between a demo that
 * survives and one that dies because a free public endpoint got busy at the
 * wrong moment. A configured `BSC_RPC_URL` is always tried first.
 *
 * `rank: false` keeps the configured RPC as the permanent first choice rather
 * than letting viem re-order it behind a fast-but-rate-limited public node.
 */
function buildClient(chainId: SupportedChainId = DEFAULT_CHAIN): PublicClient {
  const configured = chainId === 56 ? process.env.BSC_RPC_URL?.trim() : undefined;

  const urls = configured ? [configured, ...PUBLIC_BSC_RPCS] : [...PUBLIC_BSC_RPCS];

  const transports = urls.map((url) =>
    http(url, { timeout: 8000, retryCount: 0, batch: false }),
  );

  return createPublicClient({
    chain: SUPPORTED_CHAINS[chainId].chain,
    transport:
      transports.length === 1
        ? transports[0]!
        : fallback(transports, {
            // Try the next endpoint quickly rather than waiting out a timeout.
            retryCount: 1,
            rank: false,
          }),
  }) as PublicClient;
}

/** Normalise and validate an address before it reaches the network. */
export function normalizeAddress(input: string): string | null {
  const trimmed = input.trim();
  if (!isAddress(trimmed)) return null;
  return getAddress(trimmed);
}

/**
 * Read the four standard token properties.
 *
 * Each read is individually guarded: on failure we record `null` for that
 * property and keep going. The result distinguishes "this contract has no
 * `decimals()`" from "the RPC was unreachable", because the first is
 * educational and the second is an outage.
 */
export async function readToken(
  addressInput: string,
  chainId: SupportedChainId = DEFAULT_CHAIN,
): Promise<Result<OnChainToken>> {
  const address = normalizeAddress(addressInput);
  if (!address) {
    return {
      ok: false,
      error: new ProviderError(
        "INVALID_RESPONSE",
        "That does not look like a valid contract address. An EVM address is 42 characters and starts with 0x.",
        { detail: `invalid address: ${addressInput.slice(0, 64)}` },
      ),
    };
  }

  const client = buildClient(chainId);

  // Confirm there is actually a contract here before asking it questions. An
  // EOA address would return "0x" to every call, and we would render an empty
  // token page that looks like a bug.
  let bytecode: string | undefined;
  let blockNumber: bigint | null = null;

  try {
    [bytecode, blockNumber] = await Promise.all([
      client.getBytecode({ address: address as `0x${string}` }),
      client.getBlockNumber().catch(() => null),
    ]);
  } catch (error) {
    return {
      ok: false,
      error: new ProviderError(
        "UPSTREAM_ERROR",
        "Could not reach the blockchain network.",
        { detail: `getBytecode failed: ${describe(error)}`, cause: error },
      ),
    };
  }

  if (!bytecode || bytecode === "0x") {
    return {
      ok: false,
      error: new ProviderError(
        "NOT_FOUND",
        "There is no smart contract at that address on this network.",
        { detail: `no bytecode at ${address} on chain ${chainId}` },
      ),
    };
  }

  const [name, symbol, decimals, totalSupply] = await Promise.all([
    safeRead<string>(() =>
      client.readContract({ address: address as `0x${string}`, abi: ERC20_ABI, functionName: "name" }),
    ),
    safeRead<string>(() =>
      client.readContract({ address: address as `0x${string}`, abi: ERC20_ABI, functionName: "symbol" }),
    ),
    safeRead<number>(() =>
      client.readContract({ address: address as `0x${string}`, abi: ERC20_ABI, functionName: "decimals" }),
    ),
    safeRead<bigint>(() =>
      client.readContract({
        address: address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "totalSupply",
      }),
    ),
  ]);

  // A contract with none of the four properties is probably not a token at
  // all — say so rather than rendering four dashes.
  if (name === null && symbol === null && decimals === null && totalSupply === null) {
    return {
      ok: false,
      error: new ProviderError(
        "NOT_FOUND",
        "That address has a contract, but it does not answer the standard token questions, so it is probably not a token contract.",
        { detail: `no ERC-20 metadata at ${address}` },
      ),
    };
  }

  return {
    ok: true,
    data: {
      address,
      chainId,
      chainName: chainName(chainId),
      name: name ?? null,
      symbol: symbol ?? null,
      decimals: typeof decimals === "number" ? decimals : decimals === null ? null : Number(decimals),
      totalSupply: totalSupply === null ? null : totalSupply.toString(),
      readVia: "rpc",
      blockNumber: blockNumber === null ? null : blockNumber.toString(),
      provenance: makeProvenance("live", new Date().toISOString(), { stale: false }),
    },
  };
}

/**
 * Run a read, converting any failure into `null`.
 *
 * Contract calls revert for perfectly ordinary reasons — a proxy that does not
 * expose `name()`, a string longer than the decoder expects, an older token
 * standard. None of those should break the page.
 */
async function safeRead<T>(fn: () => Promise<unknown>): Promise<T | null> {
  try {
    const value = await fn();
    return (value ?? null) as T | null;
  } catch {
    return null;
  }
}

function describe(error: unknown): string {
  if (error instanceof Error) {
    // viem errors carry a shortMessage that is far more useful than the stack.
    const short = (error as { shortMessage?: string }).shortMessage;
    return short ?? error.message;
  }
  return String(error);
}

/** Exposed so the On-Chain Lab can report which transport is in use. */
export function rpcMode(): "dedicated" | "public" {
  return process.env.BSC_RPC_URL ? "dedicated" : "public";
}

/** Exposed for the Lab's network panel. */
export function supportedChains() {
  return Object.entries(SUPPORTED_CHAINS).map(([id, entry]) => ({
    chainId: Number(id),
    name: entry.name,
    explorer: entry.explorer,
  }));
}
