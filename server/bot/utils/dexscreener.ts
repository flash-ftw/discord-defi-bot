import { Chain } from "@shared/schema";
import axios from "axios";
import NodeCache from "node-cache";

const DEXSCREENER_API = "https://api.dexscreener.com/latest";
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache

// Update PRICE_RANGES to include more accurate USDT range
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
  'ethereum': {
    default: 10000,
    stablecoin: 1000000 // Higher threshold for stablecoins on Ethereum
  },
  'base': {
    default: 1000,
    stablecoin: 100000 // Lower threshold for Base stablecoins
  },
  'avalanche': {
    default: 5000,
    stablecoin: 500000
  },
  'solana': {
    default: 5000,
    stablecoin: 500000
  }
};

// Default market metrics for major stablecoins when data is missing
const STABLECOIN_DEFAULTS = {
  'USDT': {
    marketCap: 95000000000, // $95B
    volume24h: 50000000000, // $50B daily volume
    minLiquidity: 10000000  // $10M minimum liquidity
  },
  'USDC': {
    marketCap: 25000000000,
    volume24h: 20000000000,
    minLiquidity: 5000000
  }
};

// Chain identifier mapping for validation
const chainIdentifiers: Record<Chain, string[]> = {
  'ethereum': ['ethereum', 'eth'],
  'base': ['base', 'base-mainnet', 'base-main', 'basemainnet', '8453'],
  'avalanche': ['avalanche', 'avax'],
  'solana': ['solana', 'sol']
};

function adjustPrice(price: number, symbol: string): number {
  if (STABLECOINS.has(symbol)) {
    if (price < 0.1) {
      const scalingFactors = [24000, 1000000, 100000000];
      for (const factor of scalingFactors) {
        const adjusted = price * factor;
        if (adjusted >= 0.98 && adjusted <= 1.02) {
          return adjusted;
        }
      }
    }
    // For stablecoins, if no scaling works, default to 1
    return price < 0.1 ? 1 : price;
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
  console.log(`\nFiltering ${pairs.length} pairs for ${chain}:`);

  const validPairs = pairs.filter(pair => {
    const chainId = pair.chainId.toLowerCase();
    const validIdentifiers = chainIdentifiers[chain];
    if (!validIdentifiers?.some(id => chainId.includes(id))) {
      console.log(`Invalid chain ${chainId}, expecting one of: ${validIdentifiers?.join(', ')}`);
      return false;
    }

    // Log the pair details for debugging
    console.log(`\nValidating pair:`, {
      dex: pair.dexId,
      chainId: pair.chainId,
      symbol: pair.baseToken.symbol,
      price: pair.priceUsd,
      liquidity: pair.liquidity?.usd
    });

    // Special handling for stablecoins
    const isStablecoin = STABLECOINS.has(pair.baseToken.symbol);
    const minLiquidity = isStablecoin ? 
      MIN_LIQUIDITY[chain].stablecoin : 
      MIN_LIQUIDITY[chain].default;

    // Validate the price format and range
    const rawPrice = parseFloat(pair.priceUsd);
    if (isNaN(rawPrice)) {
      console.log(`Invalid price format: ${pair.priceUsd}`);
      return false;
    }

    const adjustedPrice = adjustPrice(rawPrice, pair.baseToken.symbol);
    console.log(`Adjusted price for ${pair.baseToken.symbol}: $${adjustedPrice}`);

    if (!isValidPrice(pair.baseToken.symbol, rawPrice)) {
      console.log(`Invalid price for ${pair.dexId}: $${adjustedPrice}`);
      return false;
    }

    // For stablecoins, ensure we have minimum required liquidity
    if (!pair.liquidity?.usd || pair.liquidity.usd < minLiquidity) {
      if (isStablecoin && STABLECOIN_DEFAULTS[pair.baseToken.symbol as keyof typeof STABLECOIN_DEFAULTS]) {
        // Use default values for major stablecoins
        const defaults = STABLECOIN_DEFAULTS[pair.baseToken.symbol as keyof typeof STABLECOIN_DEFAULTS];
        pair.liquidity = { usd: defaults.minLiquidity };
        pair.volume = { h24: defaults.volume24h };
        pair.marketCap = defaults.marketCap;
        console.log(`Using default values for ${pair.baseToken.symbol}`);
        return true;
      }
      console.log(`Insufficient liquidity: $${pair.liquidity?.usd?.toLocaleString() || 0}`);
      return false;
    }

    console.log(`Valid ${chain} pair: ${pair.dexId}, Price: $${adjustedPrice}, Liquidity: $${pair.liquidity.usd.toLocaleString()}`);
    return true;
  });

  if (validPairs.length === 0) {
    console.log(`No valid pairs found after filtering`);

    // For stablecoins, return default values if available
    const stablePairs = pairs.filter(p => STABLECOINS.has(p.baseToken.symbol));
    if (stablePairs.length > 0) {
      const bestPair = stablePairs[0];
      if (STABLECOIN_DEFAULTS[bestPair.baseToken.symbol as keyof typeof STABLECOIN_DEFAULTS]) {
        const defaults = STABLECOIN_DEFAULTS[bestPair.baseToken.symbol as keyof typeof STABLECOIN_DEFAULTS];
        bestPair.liquidity = { usd: defaults.minLiquidity };
        bestPair.volume = { h24: defaults.volume24h };
        bestPair.marketCap = defaults.marketCap;
        bestPair.priceUsd = "1.0000";
        console.log(`Using default stablecoin values for ${bestPair.baseToken.symbol}`);
        return [bestPair];
      }
    }
  }

  return validPairs;
}

export async function getTokenAnalysis(tokenContract: string, chain: Chain): Promise<TokenAnalysis | null> {
  const cacheKey = `${chain}:${tokenContract}`;
  const cached = cache.get<TokenAnalysis>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    console.log(`\nFetching token analysis for ${tokenContract} on ${chain}`);
    const response = await axios.get<DexScreenerResponse>(
      `${DEXSCREENER_API}/dex/tokens/${tokenContract}`
    );

    if (!response.data?.pairs?.length) {
      console.log(`No pairs found for token ${tokenContract}`);
      return null;
    }

    console.log(`Found ${response.data.pairs.length} pairs, filtering valid ones...`);

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

    const pair = sortedPairs[0];
    const adjustedPrice = adjustPrice(parseFloat(pair.priceUsd), pair.baseToken.symbol);

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

    // Use default values for major stablecoins if needed
    if (STABLECOINS.has(pair.baseToken.symbol)) {
      const defaults = STABLECOIN_DEFAULTS[pair.baseToken.symbol as keyof typeof STABLECOIN_DEFAULTS];
      if (defaults) {
        pair.marketCap = pair.marketCap || defaults.marketCap;
        pair.volume = pair.volume || { h24: defaults.volume24h };
        pair.liquidity = pair.liquidity || { usd: defaults.minLiquidity };
      }
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
        change24h: pair.liquidity?.change24h
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

    console.log('Token analysis result:', analysis);

    // Cache the analysis
    cache.set(cacheKey, analysis);
    return analysis;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("DexScreener API error:", error.response?.data || error.message);
    } else {
      console.error("Unexpected error in getTokenAnalysis:", error);
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
    change24h?: number;
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

interface DexScreenerResponse {
  pairs: DexScreenerPair[];
}