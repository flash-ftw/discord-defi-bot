import axios from "axios";
import { Chain } from "@shared/schema";
import { storage } from "../../storage";

const DEXSCREENER_API = "https://api.dexscreener.com/latest";

interface DexScreenerResponse {
  pairs: Array<{
    chainId: string;
    dexId: string;
    priceUsd: string;
    baseToken: {
      symbol: string;
      name: string;
      address: string;
    };
  }>;
}

export async function getTokenData(tokenContract: string, chain: Chain) {
  try {
    const response = await axios.get<DexScreenerResponse>(
      `${DEXSCREENER_API}/dex/tokens/${tokenContract}`
    );

    if (!response.data?.pairs?.length) {
      throw new Error(`No pairs found for token ${tokenContract} on ${chain}`);
    }

    // Find the pair for the specific chain
    const pair = response.data.pairs.find(p => p.chainId.toLowerCase() === chain.toLowerCase());
    if (!pair) {
      throw new Error(`No liquidity found for token on ${chain}`);
    }

    return {
      symbol: pair.baseToken.symbol,
      name: pair.baseToken.name,
      priceUsd: parseFloat(pair.priceUsd)
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("DexScreener API error:", error.response?.data || error.message);
      throw new Error(`Failed to fetch token data: ${error.message}`);
    }
    throw error;
  }
}

export async function getPriceData(tokenContract: string, chain: Chain) {
  // Check cache first
  const cachedPrice = await storage.getCachedPrice(tokenContract, chain);
  if (cachedPrice) {
    console.log(`Using cached price for ${tokenContract} on ${chain}: $${cachedPrice}`);
    return { priceUsd: cachedPrice };
  }

  try {
    const response = await axios.get<DexScreenerResponse>(
      `${DEXSCREENER_API}/dex/tokens/${tokenContract}`
    );

    if (!response.data?.pairs?.length) {
      throw new Error(`No pairs found for token ${tokenContract} on ${chain}`);
    }

    // Find the pair for the specific chain
    const pair = response.data.pairs.find(p => p.chainId.toLowerCase() === chain.toLowerCase());
    if (!pair) {
      throw new Error(`No liquidity found for token on ${chain}`);
    }

    const priceUsd = parseFloat(pair.priceUsd);

    // Cache the price
    storage.setCachedPrice(tokenContract, chain, priceUsd);
    console.log(`Cached new price for ${tokenContract} on ${chain}: $${priceUsd}`);

    return { priceUsd };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("DexScreener API error:", error.response?.data || error.message);
      throw new Error(`Failed to fetch price data: ${error.message}`);
    }
    throw error;
  }
}