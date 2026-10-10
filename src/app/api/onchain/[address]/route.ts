import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_CHAIN,
  SUPPORTED_CHAINS,
  explorerUrl,
  readToken,
  type SupportedChainId,
} from "@/lib/blockchain/token-reader";
import type { ProviderErrorCode } from "@/types";

/**
 * Read a token contract from a public RPC.
 *
 * The On-Chain Lab's entire backend. It is a *read*, and it stays one: there is
 * no signer anywhere in this path, no private key, no transaction to submit. A
 * learner can point this at any address on BNB Smart Chain and see what the
 * contract says about itself, without owning a wallet — which is the point.
 *
 * Two things this route refuses to do:
 *
 *  1. **Guess.** An address that is not a contract, or a contract that does not
 *     answer the standard token questions, comes back as an error with a plain
 *     explanation. Rendering four dashes would look like a bug in the app rather
 *     than a fact about the address.
 *
 *  2. **Present a failure as data.** `readToken` distinguishes "this contract has
 *     no `decimals()`" from "the RPC was unreachable", and the status codes here
 *     keep that distinction visible to the caller: a missing property is a 200
 *     with `null`, an unreachable node is a 502.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** HTTP status for each failure kind. */
const STATUS_FOR_CODE: Record<ProviderErrorCode, number> = {
  NOT_CONFIGURED: 503,
  UNAUTHORIZED: 502,
  RATE_LIMITED: 429,
  TIMEOUT: 504,
  UPSTREAM_ERROR: 502,
  INVALID_RESPONSE: 400,
  NOT_FOUND: 404,
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;

  const chainId = parseChainId(request.nextUrl.searchParams.get("chainId"));
  if (chainId === null) {
    return NextResponse.json(
      {
        error: "That chain is not supported.",
        supported: Object.values(SUPPORTED_CHAINS).map((entry) => entry.name),
      },
      { status: 400 },
    );
  }

  const result = await readToken(address, chainId);

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error.message,
        // A stable code, so a caller can branch without parsing prose.
        code: result.error.code,
        address,
        chainId,
      },
      { status: STATUS_FOR_CODE[result.error.code] },
    );
  }

  return NextResponse.json({
    token: result.data,
    // Handed over ready-made so nothing downstream has to rebuild the URL — and
    // so the "verify it yourself" step in lesson 08 is one click, not a puzzle.
    explorerUrl: explorerUrl(result.data.chainId, "address", result.data.address),
  });
}

/**
 * Resolve `?chainId=`, defaulting to BNB Smart Chain.
 *
 * Returns `null` for an unsupported chain rather than silently falling back,
 * because quietly reading Ethereum when someone asked for Base would be worse
 * than an error: the address would resolve to a different contract, and the
 * learner would have no way to tell.
 */
function parseChainId(value: string | null): SupportedChainId | null {
  if (!value) return DEFAULT_CHAIN;

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return null;

  return Object.prototype.hasOwnProperty.call(SUPPORTED_CHAINS, parsed)
    ? (parsed as SupportedChainId)
    : null;
}
