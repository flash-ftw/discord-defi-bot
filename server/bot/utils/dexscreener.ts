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
  'BONK': { min: 0.000001, max: 0.0001 },
  'USDT': { min: 0.98, max: 1.02 }, // Stablecoin range
  'USDC': { min: 0.98, max: 1.02 }  // Stablecoin range
};

// List of stablecoins that need decimal adjustment
const STABLECOINS = new Set(['USDT', 'USDC', 'DAI']);

// Minimum liquidity thresholds by chain (in USD)
const MIN_LIQUIDITY = {
  'ethereum': 10000,     // Further reduced for stablecoins
  'base': 1000,         // Significantly reduced for Base
  'avalanche': 5000,     
  'solana': 5000         
};

// List of major DEXes by chain
const majorDexes: Record<Chain, string[]> = {
  'ethereum': ['uniswap', 'sushiswap', 'pancakeswap'],
  'base': ['baseswap', 'aerodrome', 'pancakeswap', 'uniswap', 'alien-base'], // Added more Base DEXes
  'avalanche': ['traderjoe', 'pangolin', 'sushiswap'],
  'solana': ['raydium', 'orca', 'meteora']
};

// Chain identifier mapping
const chainIdentifiers: Record<Chain, string[]> = {
  'ethereum': ['ethereum', 'eth'],
  'base': ['base', 'base-mainnet', 'base-main'],
  'avalanche': ['avalanche', 'avax'],
  'solana': ['solana', 'sol']
};

function adjustPrice(price: number, symbol: string): number {
  if (STABLECOINS.has(symbol)) {
    if (price < 0.1) {
      // Try different scaling factors to get to ~$1
      const scalingFactors = [24000, 1000000, 100000000];
      for (const factor of scalingFactors) {
        const adjusted = price * factor;
        if (adjusted >= 0.98 && adjusted <= 1.02) {
          return adjusted;
        }
      }
      // If no scaling works, assume it's already correct
      return price;
    }
    return price;
  }
  return price;
}

function isValidPrice(symbol: string, rawPrice: number): boolean {
  const price = adjustPrice(rawPrice, symbol);
  const range = PRICE_RANGES[symbol as keyof typeof PRICE_RANGES];
  if (!range) return true; // Skip validation for unknown tokens

  if (Math.abs(price - 1) <= 0.02 && STABLECOINS.has(symbol)) {
    return true; // Special case for stablecoins near $1
  }

  return price >= range.min && price <= range.max;
}

function filterValidPairs(pairs: DexScreenerPair[], chain: Chain): DexScreenerPair[] {
  console.log(`Filtering pairs for ${chain}. Found ${pairs.length} total pairs`);

  const validPairs = pairs.filter(pair => {
    // Check if pair is on the correct chain using identifiers
    const chainId = pair.chainId.toLowerCase();
    const validIdentifiers = chainIdentifiers[chain];
    if (!validIdentifiers?.some(id => chainId.includes(id))) {
      console.log(`Invalid chain ${chainId}, expecting one of: ${validIdentifiers?.join(', ')}`);
      return false;
    }

    // Validate price if we have a range for this token
    const rawPrice = parseFloat(pair.priceUsd);
    const adjustedPrice = adjustPrice(rawPrice, pair.baseToken.symbol);

    if (PRICE_RANGES[pair.baseToken.symbol as keyof typeof PRICE_RANGES] && !isValidPrice(pair.baseToken.symbol, rawPrice)) {
      console.log(`Invalid price for ${pair.dexId}: $${adjustedPrice}`);
      return false;
    }

    // Adjust minimum liquidity threshold for stablecoins
    const baseMinLiquidity = MIN_LIQUIDITY[chain] || 5000;
    const minLiquidity = STABLECOINS.has(pair.baseToken.symbol) ? baseMinLiquidity / 2 : baseMinLiquidity;

    if (!pair.liquidity?.usd || pair.liquidity.usd < minLiquidity) {
      console.log(`Insufficient liquidity: $${pair.liquidity?.usd?.toLocaleString() || 0}`);
      return false;
    }

    // Log key pair information
    console.log(`Valid ${chain} pair: ${pair.dexId}, Price: $${adjustedPrice}, Liquidity: $${pair.liquidity.usd.toLocaleString()}`);

    // Update the price to the adjusted value
    if (STABLECOINS.has(pair.baseToken.symbol)) {
      pair.priceUsd = adjustedPrice.toString();
    }

    return true;
  });

  if (validPairs.length === 0) {
    console.log(`No valid pairs found, using fallback...`);
    // Fallback: Use the pair with highest liquidity
    const sortedByLiquidity = [...pairs]
      .filter(p => chainIdentifiers[chain].some(id => p.chainId.toLowerCase().includes(id)))
      .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));

    if (sortedByLiquidity.length > 0) {
      const bestPair = sortedByLiquidity[0];
      if (bestPair.liquidity?.usd) {
        console.log(`Using fallback pair: ${bestPair.dexId} ($${bestPair.liquidity.usd.toLocaleString()} liquidity)`);
        return [bestPair];
      }
    }
  }

  return validPairs;
}

interface DexScreenerPair {
  chainId: string;
  dexId: string;
  priceUsd: string;
  priceChange?: {
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
  baseToken: {
    symbol: string;
    name: string;
    address: string;
  };
  txns?: {
    h24?: {
      buys: number;
      sells: number;
    };
  };
  fdv?: number;
  marketCap?: number;
}

export async function getTokenAnalysis(tokenContract: string, chain: Chain): Promise<TokenAnalysis | null> {
  const cacheKey = `${chain}:${tokenContract}`;
  const cached = cache.get<TokenAnalysis>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
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
    const adjustedPrice = adjustPrice(parseFloat(pair.priceUsd), pair.baseToken.symbol);

    console.log(`Selected primary pair: ${pair.dexId} on ${pair.chainId}`);
    console.log(`Price: $${adjustedPrice}, Liquidity: $${pair.liquidity?.usd?.toLocaleString()}`);

    // Calculate price differentials across DEXes
    let priceDifferential;
    if (sortedPairs.length > 1) {
      const prices = sortedPairs.map(p => ({
        price: adjustPrice(parseFloat(p.priceUsd), p.baseToken.symbol),
        dex: p.dexId
      }));
      const maxPrice = Math.max(...prices.map(p => p.price));
      const minPrice = Math.min(...prices.map(p => p.price));
      const maxDex = prices.find(p => p.price === maxPrice)?.dex || '';
      const minDex = prices.find(p => p.price === minPrice)?.dex || '';
      const spreadPercent = ((maxPrice - minPrice) / minPrice) * 100;

      priceDifferential = { maxPrice, minPrice, maxDex, minDex, spreadPercent };
    }

    const analysis: TokenAnalysis = {
      chainId: pair.chainId,
      symbol: pair.baseToken.symbol,
      name: pair.baseToken.name,
      priceUsd: adjustedPrice,
      priceChange24h: pair.priceChange?.h24 || 0,
      priceChange1h: pair.priceChange?.h1 || 0,
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

interface TokenAnalysis {
  chainId: string;
  symbol: string;
  name: string;
  priceUsd: number;
  priceChange24h: number;
  priceChange1h: number;
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

interface DexScreenerResponse {
  pairs: DexScreenerPair[];
}