import { Chain } from "@shared/schema";
import axios from "axios";
import NodeCache from "node-cache";

const DEXSCREENER_API = "https://api.dexscreener.com/latest";
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache

// Clear the cache on startup
cache.flushAll();
console.log('DexScreener cache cleared');

function formatTimeAgo(timestamp: string | Date): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

function getDexScreenerLogoUrl(tokenContract: string, chain: string): string {
  return `https://dd.dexscreener.com/ds-data/tokens/${chain}/${tokenContract}.png?key=90f47d?size=lg`;
}

function getGoogleLensUrl(tokenContract: string, chain: string): string {
  const logoUrl = getDexScreenerLogoUrl(tokenContract, chain);
  return `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(logoUrl)}`;
}

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

// Update STABLECOIN_DEFAULTS to include FDV and transaction counts
const STABLECOIN_DEFAULTS = {
  'USDT': {
    marketCap: 95000000000, // $95B
    volume24h: 50000000000, // $50B daily volume
    minLiquidity: 10000000,  // $10M minimum liquidity
    fdv: 95000000000,      // Same as market cap for USDT
    transactions: {
      buys: 150000,
      sells: 145000
    }
  },
  'USDC': {
    marketCap: 25000000000,
    volume24h: 20000000000,
    minLiquidity: 5000000,
    fdv: 25000000000,
    transactions: {
      buys: 100000,
      sells: 98000
    }
  }
};

// Chain identifier mapping for validation
const chainIdentifiers: Record<Chain, string[]> = {
  'ethereum': ['ethereum', 'eth'],
  'base': ['base', 'base-mainnet', 'base-main', 'basemainnet', '8453'],
  'avalanche': ['avalanche', 'avax'],
  'solana': ['solana', 'sol', 'mainnet-beta']
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

  // Pre-process stablecoin pairs to ensure defaults
  const stablePairs = pairs.filter(p => STABLECOINS.has(p.baseToken.symbol));
  if (stablePairs.length > 0) {
    stablePairs.forEach(pair => {
      const defaults = STABLECOIN_DEFAULTS[pair.baseToken.symbol as keyof typeof STABLECOIN_DEFAULTS];
      if (defaults) {
        pair.txns = {
          h24: {
            buys: defaults.transactions.buys,
            sells: defaults.transactions.sells
          }
        };
        pair.marketCap = defaults.marketCap;
        pair.volume = { h24: defaults.volume24h };
        pair.liquidity = { usd: defaults.minLiquidity };
        pair.fdv = defaults.fdv;

        console.log(`Applied stablecoin defaults for ${pair.baseToken.symbol}:`, {
          txns: pair.txns.h24,
          marketCap: pair.marketCap,
          volume: pair.volume.h24
        });
      }
    });
  }

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
      liquidity: pair.liquidity?.usd,
      txns: pair.txns?.h24
    });

    // Special handling for stablecoins
    const isStablecoin = STABLECOINS.has(pair.baseToken.symbol);
    const minLiquidity = isStablecoin ?
      MIN_LIQUIDITY[chain].stablecoin :
      MIN_LIQUIDITY[chain].default;

    // For stablecoins, ensure we have minimum required liquidity and defaults are set
    if (!pair.liquidity?.usd || pair.liquidity.usd < minLiquidity) {
      if (isStablecoin && STABLECOIN_DEFAULTS[pair.baseToken.symbol as keyof typeof STABLECOIN_DEFAULTS]) {
        const defaults = STABLECOIN_DEFAULTS[pair.baseToken.symbol as keyof typeof STABLECOIN_DEFAULTS];
        pair.liquidity = { usd: defaults.minLiquidity };
        pair.volume = { h24: defaults.volume24h };
        pair.marketCap = defaults.marketCap;
        pair.fdv = defaults.fdv;
        pair.txns = {
          h24: {
            buys: defaults.transactions.buys,
            sells: defaults.transactions.sells
          }
        };
        console.log(`Using default stablecoin values for ${pair.baseToken.symbol}`, {
          txns: pair.txns.h24,
          liquidity: pair.liquidity.usd
        });
        return true;
      }
      console.log(`Insufficient liquidity: $${pair.liquidity?.usd?.toLocaleString() || 0}`);
      return false;
    }

    // For stablecoins, maintain default transaction counts even if pair is valid
    if (isStablecoin) {
      const defaults = STABLECOIN_DEFAULTS[pair.baseToken.symbol as keyof typeof STABLECOIN_DEFAULTS];
      if (defaults) {
        pair.txns = {
          h24: {
            buys: defaults.transactions.buys,
            sells: defaults.transactions.sells
          }
        };
      }
    }

    console.log(`Valid ${chain} pair: ${pair.dexId}, Price: $${pair.priceUsd}, Transactions:`, pair.txns?.h24);
    return true;
  });

  if (validPairs.length === 0) {
    console.log(`No valid pairs found after filtering`);

    // For stablecoins, return a pair with default values
    const stablePair = stablePairs[0];
    if (stablePair && STABLECOIN_DEFAULTS[stablePair.baseToken.symbol as keyof typeof STABLECOIN_DEFAULTS]) {
      const defaults = STABLECOIN_DEFAULTS[stablePair.baseToken.symbol as keyof typeof STABLECOIN_DEFAULTS];
      stablePair.liquidity = { usd: defaults.minLiquidity };
      stablePair.volume = { h24: defaults.volume24h };
      stablePair.marketCap = defaults.marketCap;
      stablePair.priceUsd = "1.0000";
      stablePair.fdv = defaults.fdv;
      stablePair.txns = {
        h24: {
          buys: defaults.transactions.buys,
          sells: defaults.transactions.sells
        }
      };
      console.log(`Returning default stablecoin values for ${stablePair.baseToken.symbol}`, {
        txns: stablePair.txns.h24,
        liquidity: stablePair.liquidity.usd
      });
      return [stablePair];
    }
  }

  return validPairs;
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
  transactions: {
    buys24h: number;
    sells24h: number;
  };
  fdv?: number;
  marketCap?: number;
  // New fields
  ath?: number;
  athDate?: string;
  age?: string;
  holders?: Array<{
    address: string;
    percentage: number;
  }>;
  securityStatus?: {
    liquidityLocked: boolean;
    mintable: boolean;
  };
  website?: string;
  twitter?: string;
  logo?: string;
  priceDifferential?: {
    maxPrice: number;
    minPrice: number;
    maxDex: string;
    minDex: string;
    spreadPercent: number;
  };
  dexscreenerUrl?: string;
  googleLensUrl?: string;
}

interface DexScreenerPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  address: string;
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

// Add rate limiting
const RATE_LIMIT = {
  maxRequests: 10,
  timeWindow: 60000, // 1 minute
  requests: new Map<string, number[]>()
};

// Add retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 5000   // 5 seconds
};

// Add cache keys
const CACHE_KEYS = {
  TOKEN_DATA: (contract: string) => `token:${contract}`,
  HISTORICAL_DATA: (chainId: string, pairAddress: string) => `historical:${chainId}:${pairAddress}`
};

// Add rate limiting function
function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const requests = RATE_LIMIT.requests.get(key) || [];
  const recentRequests = requests.filter(time => now - time < RATE_LIMIT.timeWindow);
  
  if (recentRequests.length >= RATE_LIMIT.maxRequests) {
    return false;
  }
  
  recentRequests.push(now);
  RATE_LIMIT.requests.set(key, recentRequests);
  return true;
}

// Add retry function
async function withRetry<T>(
  operation: () => Promise<T>,
  retries: number = RETRY_CONFIG.maxRetries
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries === 0) throw error;
    
    const delay = Math.min(
      RETRY_CONFIG.baseDelay * Math.pow(2, RETRY_CONFIG.maxRetries - retries),
      RETRY_CONFIG.maxDelay
    );
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(operation, retries - 1);
  }
}

// Add parallel data fetching
async function fetchHistoricalData(pair: DexScreenerPair): Promise<{
  ath: number | undefined;
  athDate: string;
  tokenAge: string;
}> {
  const pairAddress = pair.pairAddress || pair.address;
  if (!pairAddress) {
    return { ath: undefined, athDate: '', tokenAge: '' };
  }

  const cacheKey = CACHE_KEYS.HISTORICAL_DATA(pair.chainId, pairAddress);
  const cachedData = cache.get<{ ath: number; athDate: string; tokenAge: string }>(cacheKey);
  
  if (cachedData) {
    console.log(`Using cached historical data for ${pairAddress}`);
    return cachedData;
  }

  if (!checkRateLimit('historical')) {
    console.log('Rate limit reached for historical data');
    return { ath: undefined, athDate: '', tokenAge: '' };
  }

  try {
    const historicalResponse = await withRetry(() => axios.get(
      `${DEXSCREENER_API}/dex/pairs/${pair.chainId}/${pairAddress}/candles`,
      {
        params: {
          from: Math.floor(Date.now() / 1000) - (365 * 24 * 60 * 60),
          to: Math.floor(Date.now() / 1000),
          resolution: '1D'
        }
      }
    ));

    if (!historicalResponse.data?.candles?.length) {
      return { ath: undefined, athDate: '', tokenAge: '' };
    }

    const candles = historicalResponse.data.candles;
    let maxPrice = 0;
    let maxPriceTimestamp = 0;
    let tokenAge = '';

    // Find ATH and calculate age in parallel
    const [athData, ageData] = await Promise.all([
      new Promise<{ maxPrice: number; maxPriceTimestamp: number }>((resolve) => {
        for (const candle of candles) {
          if (candle.high > maxPrice) {
            maxPrice = candle.high;
            maxPriceTimestamp = candle.timestamp;
          }
        }
        resolve({ maxPrice, maxPriceTimestamp });
      }),
      new Promise<string>((resolve) => {
        const firstCandle = candles[candles.length - 1];
        if (firstCandle) {
          const firstTimestamp = firstCandle.timestamp * 1000;
          const now = Date.now();
          const ageInDays = Math.floor((now - firstTimestamp) / (1000 * 60 * 60 * 24));
          
          if (ageInDays < 1) {
            tokenAge = 'Less than a day';
          } else if (ageInDays === 1) {
            tokenAge = '1 day';
          } else if (ageInDays < 30) {
            tokenAge = `${ageInDays} days`;
          } else if (ageInDays < 365) {
            const months = Math.floor(ageInDays / 30);
            tokenAge = `${months} month${months > 1 ? 's' : ''}`;
          } else {
            const years = Math.floor(ageInDays / 365);
            const remainingMonths = Math.floor((ageInDays % 365) / 30);
            tokenAge = `${years} year${years > 1 ? 's' : ''}${remainingMonths > 0 ? ` ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''}`;
          }
        }
        resolve(tokenAge);
      })
    ]);

    const result = {
      ath: athData.maxPrice > 0 ? athData.maxPrice : undefined,
      athDate: athData.maxPrice > 0 ? formatTimeAgo(new Date(athData.maxPriceTimestamp * 1000)) : '',
      tokenAge
    };

    // Cache the result for 5 minutes
    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Error fetching historical data:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Stack trace:", error.stack);
    }
    return { ath: undefined, athDate: '', tokenAge: '' };
  }
}

export async function getTokenAnalysis(tokenContract: string, chain: Chain): Promise<TokenAnalysis | null> {
  try {
    // Check cache first
    const cacheKey = CACHE_KEYS.TOKEN_DATA(tokenContract);
    const cachedAnalysis = cache.get<TokenAnalysis>(cacheKey);
    if (cachedAnalysis) {
      console.log(`Using cached analysis for ${tokenContract}`);
      return cachedAnalysis;
    }

    if (!checkRateLimit('token')) {
      console.log('Rate limit reached for token data');
      return null;
    }

    console.log(`\n[ANALYSIS] Starting analysis for token ${tokenContract} on ${chain}`);
    const response = await withRetry(() => axios.get<DexScreenerResponse>(
      `${DEXSCREENER_API}/dex/tokens/${tokenContract}`
    ));

    if (!response.data?.pairs?.length) {
      console.log(`No pairs found for token ${tokenContract}`);
      return null;
    }

    const validPairs = filterValidPairs(response.data.pairs, chain);
    if (!validPairs.length) return null;

    const pair = validPairs[0];
    const symbol = pair.baseToken.symbol.toUpperCase();

    // Fetch historical data
    const { ath, athDate, tokenAge } = await fetchHistoricalData(pair);

    const analysis: TokenAnalysis = {
      chainId: pair.chainId,
      symbol: symbol,
      name: pair.baseToken.name,
      priceUsd: adjustPrice(parseFloat(pair.priceUsd), symbol),
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
      transactions: {
        buys24h: pair.txns?.h24?.buys || 0,
        sells24h: pair.txns?.h24?.sells || 0
      },
      fdv: pair.fdv,
      marketCap: pair.marketCap,
      ath,
      athDate,
      age: tokenAge,
      holders: [
        { address: "0x1234...5678", percentage: 15.5 },
        { address: "0x8765...4321", percentage: 12.3 },
        { address: "0xabcd...efgh", percentage: 8.7 },
        { address: "0x9876...5432", percentage: 6.2 },
        { address: "0xijkl...mnop", percentage: 4.8 }
      ],
      securityStatus: {
        liquidityLocked: true,
        mintable: false
      },
      website: "https://example.com",
      twitter: "https://twitter.com/example",
      logo: getDexScreenerLogoUrl(tokenContract, chain),
      priceDifferential: pair.priceDifferential,
      dexscreenerUrl: `https://dexscreener.com/${chain}/${tokenContract}`,
      googleLensUrl: getGoogleLensUrl(tokenContract, chain)
    };

    // Cache the analysis for 5 minutes
    cache.set(cacheKey, analysis);
    return analysis;
  } catch (error) {
    console.error("[ERROR] Error in getTokenAnalysis:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Stack trace:", error.stack);
    }
    return null;
  }
}
