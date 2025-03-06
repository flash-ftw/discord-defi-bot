import { Chain } from "@shared/schema";
import axios from "axios";
import NodeCache from "node-cache";

const DEXSCREENER_API = "https://api.dexscreener.com/latest";
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache

// Price validation ranges with more accurate thresholds
const PRICE_RANGES = {
  'WETH': { min: 2000, max: 3000 },
  'cbETH': { min: 2000, max: 3000 },
  'WAVAX': { min: 15, max: 30 },
  'BONK': { min: 0.000001, max: 0.0001 }
};

// List of major DEXes by chain
const majorDexes: Record<Chain, string[]> = {
  'ethereum': ['uniswap', 'sushiswap', 'pancakeswap'],
  'base': ['baseswap', 'pancakeswap', 'uniswap'],
  'avalanche': ['traderjoe', 'pangolin', 'sushiswap'],
  'solana': ['raydium', 'orca', 'meteora']
};

// Minimum liquidity thresholds by chain (in USD)
const MIN_LIQUIDITY = {
  'ethereum': 1000000,    // $1M min for Ethereum
  'base': 100000,         // $100k min for Base
  'avalanche': 50000,     // $50k min for Avalanche
  'solana': 10000         // $10k min for Solana
};

interface DexScreenerPair {
  chainId: string;
  dexId: string;
  priceUsd: string;
  priceChange: {
    h24?: number;
    h1?: number;
  };
  liquidity?: {
    usd?: number;
    h24?: number;
  };
  volume?: {
    h24?: number;
    h6?: number;
    h1?: number;
  };
  priceMax?: string;
  priceMin?: string;
  txns?: {
    h24?: {
      buys: number;
      sells: number;
    };
  };
  fdv?: number;
  marketCap?: number;
  baseToken: {
    symbol: string;
    name: string;
    address: string;
  };
}

interface TokenAnalysis {
  chainId: string;
  symbol: string;
  name: string;
  priceUsd: number;
  priceChange24h: number;
  priceChange1h: number;
  priceMax: number;
  priceMin: number;
  liquidity: {
    usd?: number;
    change24h?: number;
  };
  volume: {
    h24?: number;
    h6?: number;
    h1?: number;
  };
  transactions?: {
    buys24h: number;
    sells24h: number;
  };
  fdv?: number;
  marketCap?: number;
  priceDifferential?: {
    maxPrice: number;
    minPrice: number;
    maxDex: string;
    minDex: string;
    spreadPercent: number;
  };
}

function isValidPrice(symbol: string, price: number): boolean {
  const range = PRICE_RANGES[symbol as keyof typeof PRICE_RANGES];
  if (!range) return true; // Skip validation for unknown tokens
  return price >= range.min && price <= range.max;
}

function filterValidPairs(pairs: DexScreenerPair[], chain: Chain): DexScreenerPair[] {
  return pairs.filter(pair => {
    // Check if pair is on the correct chain
    const chainId = pair.chainId.toLowerCase();
    if (!chainId.includes(chain.toLowerCase())) {
      console.log(`Skipping pair on chain ${chainId}, expecting ${chain}`);
      return false;
    }

    // Validate price if we have a range for this token
    const price = parseFloat(pair.priceUsd);
    if (PRICE_RANGES[pair.baseToken.symbol as keyof typeof PRICE_RANGES] && !isValidPrice(pair.baseToken.symbol, price)) {
      console.log(`Filtered out ${pair.dexId} pair with invalid price: $${price} (expected range: $${PRICE_RANGES[pair.baseToken.symbol as keyof typeof PRICE_RANGES].min}-${PRICE_RANGES[pair.baseToken.symbol as keyof typeof PRICE_RANGES].max})`);
      return false;
    }

    // Check minimum liquidity based on chain
    const minLiquidity = MIN_LIQUIDITY[chain] || 10000;
    if (!pair.liquidity?.usd || pair.liquidity.usd < minLiquidity) {
      console.log(`Filtered out ${pair.dexId} pair with insufficient liquidity: $${pair.liquidity?.usd || 0} (minimum: $${minLiquidity})`);
      return false;
    }

    // Prefer pairs from major DEXes
    const majorDexList = majorDexes[chain] || [];
    if (!majorDexList.includes(pair.dexId.toLowerCase())) {
      console.log(`Note: ${pair.dexId} is not in the list of major DEXes for ${chain}`);
    }

    console.log(`Valid pair found: ${pair.dexId} on ${chainId} with $${pair.liquidity?.usd.toLocaleString()} liquidity and price $${price}`);
    return true;
  });
}

export async function getTokenAnalysis(tokenContract: string, chain: Chain): Promise<TokenAnalysis | null> {
  const cacheKey = `${chain}:${tokenContract}`;
  const cached = cache.get<TokenAnalysis>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    console.log(`Fetching token analysis from DexScreener for ${tokenContract} on ${chain}`);
    const response = await axios.get<DexScreenerResponse>(
      `${DEXSCREENER_API}/dex/tokens/${tokenContract}`
    );

    if (!response.data?.pairs?.length) {
      console.log(`No pairs found for token ${tokenContract}`);
      return null;
    }

    // Filter valid pairs for the specified chain
    const validPairs = filterValidPairs(response.data.pairs, chain);
    if (!validPairs.length) {
      console.log(`No valid pairs found for token ${tokenContract} on ${chain}`);
      return null;
    }

    // Sort pairs by liquidity and volume to find the main pair
    const sortedPairs = validPairs.sort((a, b) => {
      const aScore = (a.liquidity?.usd || 0) + (a.volume?.h24 || 0);
      const bScore = (b.liquidity?.usd || 0) + (b.volume?.h24 || 0);
      return bScore - aScore;
    });

    // Get the first pair with highest liquidity and volume
    const pair = sortedPairs[0];
    console.log(`Selected primary pair: ${pair.dexId} on ${pair.chainId}`);
    console.log(`Price: $${pair.priceUsd}, Liquidity: $${pair.liquidity?.usd?.toLocaleString()}, Volume: $${pair.volume?.h24?.toLocaleString()}`);

    // Calculate price differentials across DEXes
    let priceDifferential;
    if (sortedPairs.length > 1) {
      const prices = sortedPairs.map(p => ({
        price: parseFloat(p.priceUsd),
        dex: p.dexId
      }));
      const maxPrice = Math.max(...prices.map(p => p.price));
      const minPrice = Math.min(...prices.map(p => p.price));
      const maxDex = prices.find(p => p.price === maxPrice)?.dex || '';
      const minDex = prices.find(p => p.price === minPrice)?.dex || '';
      const spreadPercent = ((maxPrice - minPrice) / minPrice) * 100;

      console.log(`Price differentials: Max $${maxPrice} (${maxDex}), Min $${minPrice} (${minDex}), Spread ${spreadPercent.toFixed(2)}%`);
      priceDifferential = { maxPrice, minPrice, maxDex, minDex, spreadPercent };
    }

    const analysis: TokenAnalysis = {
      chainId: pair.chainId,
      symbol: pair.baseToken.symbol,
      name: pair.baseToken.name,
      priceUsd: parseFloat(pair.priceUsd),
      priceChange24h: pair.priceChange?.h24 || 0,
      priceChange1h: pair.priceChange?.h1 || 0,
      priceMax: pair.priceMax ? parseFloat(pair.priceMax) : parseFloat(pair.priceUsd),
      priceMin: pair.priceMin ? parseFloat(pair.priceMin) : parseFloat(pair.priceUsd),
      liquidity: {
        usd: pair.liquidity?.usd,
        change24h: pair.liquidity?.h24
      },
      volume: {
        h24: pair.volume?.h24,
        h6: pair.volume?.h6,
        h1: pair.volume?.h1
      },
      transactions: pair.txns?.h24 ? {
        buys24h: pair.txns.h24.buys,
        sells24h: pair.txns.h24.sells
      } : undefined,
      fdv: pair.fdv,
      marketCap: pair.marketCap,
      priceDifferential: priceDifferential
    };

    // Cache the analysis
    cache.set(cacheKey, analysis);
    return analysis;

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("DexScreener API error:", error.response?.data || error.message);
    }
    return null;
  }
}

interface DexScreenerResponse {
  pairs: DexScreenerPair[];
}