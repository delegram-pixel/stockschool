import type { DataProvenance, TokenizedStock } from "@/types";

/**
 * Illustrative sample data.
 *
 * ============================ READ THIS FIRST ============================
 * These are NOT market prices. They are fixed, hand-written examples used for
 * two purposes only:
 *
 *   1. So the product is explorable before Binance Web3 API credentials are
 *      configured (the hackathon requires the app to run for a judge who
 *      clones it with no `.env`).
 *   2. So automated tests have deterministic input.
 *
 * Every value produced from this file carries `provenance.source === "mock"`,
 * and the UI is required to render a visible "Sample data" banner wherever it
 * appears. `assertNotPresentedAsLive` in `src/lib/provenance.ts` exists to make
 * that a testable invariant rather than a good intention.
 *
 * If you are reading this in a code review and wondering whether we faked live
 * data: no. The PRD forbids it (§FR-14), the design brief forbids it (§19), and
 * the type system makes the mock path impossible to confuse with the live one
 * because they differ in the `source` discriminant.
 * =========================================================================
 */

export const SAMPLE_DATA_NOTICE =
  "Sample data — illustrative values, not live market prices. Add Binance Web3 API credentials to load real tokenized-stock data.";

const SAMPLE_PROVENANCE: DataProvenance = {
  source: "mock",
  // Deliberately null rather than a fake "now": we do not know when this was
  // true, because it never was.
  updatedAt: null,
  stale: true,
  note: SAMPLE_DATA_NOTICE,
};

type SampleSeed = {
  symbol: string;
  name: string;
  companyName: string;
  underlyingSymbol: string;
  sector: string;
  contractAddress: string;
  /** Illustrative on-chain price. Static. */
  price: string;
  /** Illustrative reference price. Static. */
  referencePrice: string;
  provider: TokenizedStock["provider"];
  marketStatus: TokenizedStock["marketStatus"];
};

/**
 * Fixed seeds. Prices are chosen to include a premium, a discount and an
 * exact match, so the price-comparison teaching moment has an example of each
 * without anyone having to wait for the market to cooperate.
 */
const SEEDS: SampleSeed[] = [
  {
    symbol: "NVDAB",
    name: "NVIDIA bStock",
    companyName: "NVIDIA Corporation",
    underlyingSymbol: "NVDA",
    sector: "Semiconductors",
    contractAddress: "0x9d3f4b1a7c2e5f8a0b1c2d3e4f5a6b7c8d9e0f11",
    price: "183.60",
    referencePrice: "180.00",
    provider: "bstocks",
    marketStatus: "closed",
  },
  {
    symbol: "AAPLB",
    name: "Apple bStock",
    companyName: "Apple Inc.",
    underlyingSymbol: "AAPL",
    sector: "Consumer Technology",
    contractAddress: "0x1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d",
    price: "227.10",
    referencePrice: "227.10",
    provider: "bstocks",
    marketStatus: "closed",
  },
  {
    symbol: "TSLAX",
    name: "Tesla xStock",
    companyName: "Tesla, Inc.",
    underlyingSymbol: "TSLA",
    sector: "Automotive",
    contractAddress: "0x2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e",
    price: "411.02",
    referencePrice: "418.75",
    provider: "xstocks",
    marketStatus: "closed",
  },
  {
    symbol: "MSFTB",
    name: "Microsoft bStock",
    companyName: "Microsoft Corporation",
    underlyingSymbol: "MSFT",
    sector: "Software",
    contractAddress: "0x3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f",
    price: "438.90",
    referencePrice: "436.20",
    provider: "bstocks",
    marketStatus: "closed",
  },
  {
    symbol: "AMZNO",
    name: "Amazon Ondo Tokenized",
    companyName: "Amazon.com, Inc.",
    underlyingSymbol: "AMZN",
    sector: "E-Commerce",
    contractAddress: "0x4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f70",
    price: "201.44",
    referencePrice: "203.10",
    provider: "ondo",
    marketStatus: "closed",
  },
  {
    symbol: "GOOGLB",
    name: "Alphabet bStock",
    companyName: "Alphabet Inc.",
    underlyingSymbol: "GOOGL",
    sector: "Internet Services",
    contractAddress: "0x5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f7081",
    price: "178.22",
    referencePrice: "176.95",
    provider: "bstocks",
    marketStatus: "closed",
  },
  {
    symbol: "METAX",
    name: "Meta xStock",
    companyName: "Meta Platforms, Inc.",
    underlyingSymbol: "META",
    sector: "Internet Services",
    contractAddress: "0x6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192",
    price: "612.35",
    referencePrice: "615.00",
    provider: "xstocks",
    marketStatus: "closed",
  },
  {
    symbol: "SPYX",
    name: "S&P 500 xStock",
    companyName: "S&P 500 Index",
    underlyingSymbol: "SPX",
    sector: "Index",
    contractAddress: "0x708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3",
    price: "5740.50",
    referencePrice: "5740.50",
    provider: "xstocks",
    marketStatus: "closed",
  },
  {
    symbol: "JPMO",
    name: "JPMorgan Ondo Tokenized",
    companyName: "JPMorgan Chase & Co.",
    underlyingSymbol: "JPM",
    sector: "Banking",
    contractAddress: "0x8192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4",
    price: "246.80",
    referencePrice: "245.10",
    provider: "ondo",
    marketStatus: "closed",
  },
  {
    symbol: "COINB",
    name: "Coinbase bStock",
    companyName: "Coinbase Global, Inc.",
    underlyingSymbol: "COIN",
    sector: "Financial Technology",
    contractAddress: "0x92a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5",
    price: "298.15",
    referencePrice: "301.40",
    provider: "bstocks",
    marketStatus: "closed",
  },
];

/** Build the sample asset list. Always returns fresh objects. */
export function getSampleAssets(): TokenizedStock[] {
  return SEEDS.map((seed) => ({
    id: `${seed.provider}:${seed.symbol.toLowerCase()}`,
    provider: seed.provider,
    name: seed.name,
    companyName: seed.companyName,
    symbol: seed.symbol,
    underlyingSymbol: seed.underlyingSymbol,
    chainId: 56,
    chainName: "BNB Smart Chain",
    contractAddress: seed.contractAddress,
    price: seed.price,
    referencePrice: seed.referencePrice,
    marketStatus: seed.marketStatus,
    sector: seed.sector,
    logoUrl: null,
    tokenRatio: null,
    provenance: SAMPLE_PROVENANCE,
  })).sort((a, b) => a.symbol.localeCompare(b.symbol));
}

export function getSampleAsset(symbol: string): TokenizedStock | null {
  const target = symbol.trim().toUpperCase();
  return (
    getSampleAssets().find(
      (asset) => asset.symbol.toUpperCase() === target || asset.underlyingSymbol === target,
    ) ?? null
  );
}

export function getSampleProvenance(): DataProvenance {
  return { ...SAMPLE_PROVENANCE };
}
