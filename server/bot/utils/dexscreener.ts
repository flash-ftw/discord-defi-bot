import axios from "axios";
import { Chain } from "@shared/schema";
import { storage } from "../../storage";

const DEXSCREENER_API = "https://api.dexscreener.com/latest";

interface DexScreenerPair {
  chainId: string;
  dexId: string;
  priceUsd: string;
  baseToken: {
    symbol: string;
    name: string;
    address: string;
  };
}

interface DexScreenerResponse {
  pairs: DexScreenerPair[];
}

interface TokenData {
  chainId: string;
  symbol: string;
  name: string;
  priceUsd: number;
}

export async function getTokenData(tokenContract: string, chain: Chain): Promise<TokenData | null> {
  try {
    const response = await axios.get<DexScreenerResponse>(
      `${DEXSCREENER_API}/dex/tokens/${tokenContract}`
    );

    if (!response.data?.pairs?.length) {
      throw new Error(`No pairs found for token ${tokenContract}`);
    }

    // Find the first pair with liquidity
    const pair = response.data.pairs[0];

    return {
      chainId: pair.chainId,
      symbol: pair.baseToken.symbol,
      name: pair.baseToken.name,
      priceUsd: parseFloat(pair.priceUsd)
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("DexScreener API error:", error.response?.data || error.message);
    }
    return null;
  }
}

export async function getTokenPrice(tokenContract: string, chain: Chain) {
  // Check cache first
  const cachedPrice = await storage.getCachedPrice(tokenContract, chain);
  if (cachedPrice) {
    console.log(`Using cached price for ${tokenContract} on ${chain}: $${cachedPrice}`);
    return { priceUsd: cachedPrice };
  }

  try {
    const tokenData = await getTokenData(tokenContract, chain);
    if (!tokenData) {
      throw new Error(`Failed to fetch token data for ${tokenContract}`);
    }

    const priceUsd = tokenData.priceUsd;

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