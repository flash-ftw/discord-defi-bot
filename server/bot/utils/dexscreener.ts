import axios from "axios";
import { Chain } from "@shared/schema";
import NodeCache from "node-cache";

const DEXSCREENER_API = "https://api.dexscreener.com/latest";
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache

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

interface DexScreenerResponse {
  pairs: DexScreenerPair[];
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

export async function getTokenAnalysis(tokenContract: string, chain: Chain): Promise<TokenAnalysis | null> {
  const cacheKey = `${chain}:${tokenContract}`;
  const cached = cache.get<TokenAnalysis>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    console.log(`Fetching token analysis from DexScreener for ${tokenContract}`);
    const response = await axios.get<DexScreenerResponse>(
      `${DEXSCREENER_API}/dex/tokens/${tokenContract}`
    );

    if (!response.data?.pairs?.length) {
      console.log(`No pairs found for token ${tokenContract}`);
      return null;
    }

    // Sort pairs by liquidity and volume to find the main pair
    const sortedPairs = response.data.pairs.sort((a, b) => {
      const aScore = (a.liquidity?.usd || 0) + (a.volume?.h24 || 0);
      const bScore = (b.liquidity?.usd || 0) + (b.volume?.h24 || 0);
      return bScore - aScore;
    });

    // Get the first pair with highest liquidity and volume
    const pair = sortedPairs[0];
    console.log(`Selected pair on chain ${pair.chainId} from DEX ${pair.dexId}`);

    // Calculate price differentials across DEXes
    const validPairs = sortedPairs.filter(p => p.liquidity?.usd && p.liquidity.usd > 10000); // Only consider pairs with >$10k liquidity
    let priceDifferential;
    if (validPairs.length > 1) {
      const prices = validPairs.map(p => ({
        price: parseFloat(p.priceUsd),
        dex: p.dexId
      }));
      const maxPrice = Math.max(...prices.map(p => p.price));
      const minPrice = Math.min(...prices.map(p => p.price));
      const maxDex = prices.find(p => p.price === maxPrice)?.dex || '';
      const minDex = prices.find(p => p.price === minPrice)?.dex || '';
      const spreadPercent = ((maxPrice - minPrice) / minPrice) * 100;

      console.log(`Price differentials: Max ${maxPrice} (${maxDex}), Min ${minPrice} (${minDex}), Spread ${spreadPercent.toFixed(2)}%`);
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