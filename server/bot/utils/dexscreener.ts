import { Chain } from "@shared/schema";
import axios, { AxiosResponse } from "axios";
import NodeCache from "node-cache";

// Add type declarations for external modules
declare module 'axios' {
  export interface AxiosResponse<T = any> {
    data: T;
  }
}

declare module 'node-cache' {
  export default class NodeCache {
    constructor(options?: { stdTTL?: number });
    get<T>(key: string): T | undefined;
    set(key: string, value: any, ttl?: number): boolean;
    flushAll(): void;
  }
}

const DEXSCREENER_API = "https://api.dexscreener.com/latest";
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache

// Clear the cache on startup
cache.flushAll();
console.log('DexScreener cache cleared');

// Add validation thresholds
const VALIDATION_THRESHOLDS = {
  MIN_PRICE: 0.00000001,
  MAX_PRICE: 1000000,
  MIN_LIQUIDITY: 100,
  MIN_VOLUME: 10,
  MIN_HOLDERS: 1,
  MAX_HOLDERS: 1000000,
  MIN_PERCENTAGE: 0,
  MAX_PERCENTAGE: 100,
  MIN_TIMESTAMP: 0,
  MAX_TIMESTAMP: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year in future
};

// Add time format thresholds
const TIME_THRESHOLDS = {
  MINUTE: 60,
  HOUR: 3600,
  DAY: 86400,
  WEEK: 604800,
  MONTH: 2592000, // 30 days
  YEAR: 31536000, // 365 days
};

function validatePrice(price: number): boolean {
  return price >= VALIDATION_THRESHOLDS.MIN_PRICE && 
         price <= VALIDATION_THRESHOLDS.MAX_PRICE && 
         !isNaN(price) && 
         isFinite(price);
}

function validateTimestamp(timestamp: number): boolean {
  return timestamp >= VALIDATION_THRESHOLDS.MIN_TIMESTAMP && 
         timestamp <= VALIDATION_THRESHOLDS.MAX_TIMESTAMP;
}

function validatePercentage(percentage: number): boolean {
  return percentage >= VALIDATION_THRESHOLDS.MIN_PERCENTAGE && 
         percentage <= VALIDATION_THRESHOLDS.MAX_PERCENTAGE;
}

function formatTimeAgo(timestamp: string | Date): string {
  const date = new Date(timestamp);
  if (!validateTimestamp(date.getTime())) {
    console.log(`Invalid timestamp: ${timestamp}`);
    return 'Unknown';
  }

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < TIME_THRESHOLDS.MINUTE) {
    return `${diffInSeconds}s ago`;
  }
  if (diffInSeconds < TIME_THRESHOLDS.HOUR) {
    const minutes = Math.floor(diffInSeconds / TIME_THRESHOLDS.MINUTE);
    return `${minutes}m ago`;
  }
  if (diffInSeconds < TIME_THRESHOLDS.DAY) {
    const hours = Math.floor(diffInSeconds / TIME_THRESHOLDS.HOUR);
    return `${hours}h ago`;
  }
  if (diffInSeconds < TIME_THRESHOLDS.WEEK) {
    const days = Math.floor(diffInSeconds / TIME_THRESHOLDS.DAY);
    return `${days}d ago`;
  }
  if (diffInSeconds < TIME_THRESHOLDS.MONTH) {
    const weeks = Math.floor(diffInSeconds / TIME_THRESHOLDS.WEEK);
    return `${weeks}w ago`;
  }
  if (diffInSeconds < TIME_THRESHOLDS.YEAR) {
    const months = Math.floor(diffInSeconds / TIME_THRESHOLDS.MONTH);
    return `${months}mo ago`;
  }
  const years = Math.floor(diffInSeconds / TIME_THRESHOLDS.YEAR);
  const remainingMonths = Math.floor((diffInSeconds % TIME_THRESHOLDS.YEAR) / TIME_THRESHOLDS.MONTH);
  return `${years}y${remainingMonths > 0 ? ` ${remainingMonths}mo` : ''} ago`;
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
    website?: string;
    twitter?: string;
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
  security?: {
    liquidityLocked: boolean;
    mintable: boolean;
  };
  holders?: Array<{
    address: string;
    percentage: number;
  }>;
  createdAt?: string; // Add creation timestamp
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

interface DexScreenerCandle {
  timestamp: number;
  high: number;
  low: number;
  open: number;
  close: number;
  volume: number;
}

interface DexScreenerHistoricalResponse {
  candles: DexScreenerCandle[];
}

// Add parallel data fetching
async function fetchHistoricalData(pair: DexScreenerPair): Promise<{
  ath: number | undefined;
  athDate: string;
  tokenAge: string;
}> {
  const pairAddress = pair.pairAddress || pair.address;
  if (!pairAddress) {
    console.log(`No pair address found for historical data`);
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
    // Get historical candles with different resolutions
    const [dailyResponse, hourlyResponse] = await Promise.all([
      withRetry(() => axios.get<DexScreenerHistoricalResponse>(
        `${DEXSCREENER_API}/dex/pairs/${pair.chainId}/${pairAddress}/candles`,
        {
          params: {
            from: Math.floor(Date.now() / 1000) - (365 * 24 * 60 * 60), // 1 year ago
            to: Math.floor(Date.now() / 1000),
            resolution: '1D'
          }
        }
      )),
      withRetry(() => axios.get<DexScreenerHistoricalResponse>(
        `${DEXSCREENER_API}/dex/pairs/${pair.chainId}/${pairAddress}/candles`,
        {
          params: {
            from: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60), // 7 days ago
            to: Math.floor(Date.now() / 1000),
            resolution: '1H'
          }
        }
      ))
    ]);

    const dailyData = dailyResponse.data as DexScreenerHistoricalResponse;
    const hourlyData = hourlyResponse.data as DexScreenerHistoricalResponse;

    if (!dailyData?.candles?.length && !hourlyData?.candles?.length) {
      console.log(`No historical candles found for ${pairAddress}`);
      return { ath: undefined, athDate: '', tokenAge: '' };
    }

    const dailyCandles = dailyData?.candles || [];
    const hourlyCandles = hourlyData?.candles || [];
    let maxPrice = 0;
    let maxPriceTimestamp = 0;
    let tokenAge = '';

    // Validate and calculate ATH from both daily and hourly candles
    for (const candle of [...dailyCandles, ...hourlyCandles]) {
      if (validatePrice(candle.high) && candle.high > maxPrice) {
        maxPrice = candle.high;
        maxPriceTimestamp = candle.timestamp;
      }
    }

    // Validate and check current price against ATH
    const currentPrice = parseFloat(pair.priceUsd);
    if (validatePrice(currentPrice) && currentPrice > maxPrice) {
      maxPrice = currentPrice;
      maxPriceTimestamp = Math.floor(Date.now() / 1000);
    }

    // Calculate token age using pair creation time or first candle
    const firstCandle = dailyCandles[dailyCandles.length - 1];
    const firstTimestamp = firstCandle && validateTimestamp(firstCandle.timestamp * 1000) 
      ? firstCandle.timestamp * 1000 
      : Date.now();
    
    const now = Date.now();
    const ageInSeconds = Math.floor((now - firstTimestamp) / 1000);
    
    if (ageInSeconds < TIME_THRESHOLDS.MINUTE) {
      tokenAge = `${ageInSeconds}s`;
    } else if (ageInSeconds < TIME_THRESHOLDS.HOUR) {
      const minutes = Math.floor(ageInSeconds / TIME_THRESHOLDS.MINUTE);
      tokenAge = `${minutes}m`;
    } else if (ageInSeconds < TIME_THRESHOLDS.DAY) {
      const hours = Math.floor(ageInSeconds / TIME_THRESHOLDS.HOUR);
      tokenAge = `${hours}h`;
    } else if (ageInSeconds < TIME_THRESHOLDS.WEEK) {
      const days = Math.floor(ageInSeconds / TIME_THRESHOLDS.DAY);
      tokenAge = `${days}d`;
    } else if (ageInSeconds < TIME_THRESHOLDS.MONTH) {
      const weeks = Math.floor(ageInSeconds / TIME_THRESHOLDS.WEEK);
      tokenAge = `${weeks}w`;
    } else if (ageInSeconds < TIME_THRESHOLDS.YEAR) {
      const months = Math.floor(ageInSeconds / TIME_THRESHOLDS.MONTH);
      tokenAge = `${months}mo`;
    } else {
      const years = Math.floor(ageInSeconds / TIME_THRESHOLDS.YEAR);
      const remainingMonths = Math.floor((ageInSeconds % TIME_THRESHOLDS.YEAR) / TIME_THRESHOLDS.MONTH);
      tokenAge = `${years}y${remainingMonths > 0 ? ` ${remainingMonths}mo` : ''}`;
    }

    // If we found an ATH, format the date
    const athDate = maxPrice > 0 ? formatTimeAgo(new Date(maxPriceTimestamp * 1000)) : '';

    const result = {
      ath: maxPrice > 0 ? maxPrice : undefined,
      athDate,
      tokenAge
    };

    console.log(`Historical data for ${pairAddress}:`, {
      ath: result.ath,
      athDate: result.athDate,
      tokenAge: result.tokenAge,
      currentPrice,
      maxPrice,
      firstTimestamp: new Date(firstTimestamp).toISOString(),
      lastUpdate: new Date().toISOString()
    });

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

    const responseData = response.data as DexScreenerResponse;

    if (!responseData?.pairs?.length) {
      console.log(`No pairs found for token ${tokenContract}`);
      return null;
    }

    const validPairs = filterValidPairs(responseData.pairs, chain);
    if (!validPairs.length) return null;

    const pair = validPairs[0];
    const symbol = pair.baseToken.symbol.toUpperCase();

    // Fetch historical data
    const { ath, athDate, tokenAge } = await fetchHistoricalData(pair);

    // Get the best pair for price and liquidity
    const bestPair = validPairs.reduce((best, current) => {
      if (!best.liquidity?.usd || (current.liquidity?.usd || 0) > best.liquidity.usd) {
        return current;
      }
      return best;
    });

    const analysis: TokenAnalysis = {
      chainId: pair.chainId,
      symbol: symbol,
      name: pair.baseToken.name,
      priceUsd: adjustPrice(parseFloat(bestPair.priceUsd), symbol),
      priceChange24h: bestPair.priceChange?.h24 || 0,
      priceChange1h: bestPair.priceChange?.h1 || 0,
      liquidity: {
        usd: bestPair.liquidity?.usd,
        change24h: bestPair.liquidity?.change24h
      },
      volume: {
        h24: bestPair.volume?.h24,
        h6: bestPair.volume?.h6,
        h1: bestPair.volume?.h1
      },
      transactions: {
        buys24h: bestPair.txns?.h24?.buys || 0,
        sells24h: bestPair.txns?.h24?.sells || 0
      },
      fdv: bestPair.fdv,
      marketCap: bestPair.marketCap,
      ath,
      athDate,
      age: tokenAge,
      holders: pair.holders || [],
      securityStatus: pair.security || {
        liquidityLocked: false,
        mintable: true
      },
      website: pair.baseToken.website,
      twitter: pair.baseToken.twitter,
      logo: getDexScreenerLogoUrl(tokenContract, chain),
      priceDifferential: bestPair.priceDifferential,
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
