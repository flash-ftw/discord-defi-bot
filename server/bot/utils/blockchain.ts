import { Chain } from "@shared/schema";
import { getTokenAnalysis } from "./dexscreener";

const chainMapping: Record<string, Chain> = {
  'ethereum': 'ethereum',
  'eth': 'ethereum',
  'pulse': null, // Ignore PulseChain
  'base': 'base',
  'avalanche': 'avalanche',
  'avax': 'avalanche',
  'solana': 'solana',
  'sol': 'solana'
};

// List of major DEXes by chain
const majorDexes: Record<Chain, string[]> = {
  'ethereum': ['uniswap', 'sushiswap', 'pancakeswap'],
  'base': ['baseswap', 'pancakeswap', 'uniswap'],
  'avalanche': ['traderjoe', 'pangolin', 'sushiswap'],
  'solana': ['raydium', 'orca', 'meteora']
};

export async function detectChain(tokenContract: string): Promise<Chain | null> {
  try {
    // Use DexScreener API to detect which chain the token is on
    const response = await getTokenAnalysis(tokenContract, "ethereum"); // Try any chain first
    if (response) {
      // DexScreener response includes chainId which we can use to determine the chain
      const chainId = response.chainId.toLowerCase();

      // Try to match the chainId with our supported chains
      for (const [key, value] of Object.entries(chainMapping)) {
        if (chainId.includes(key)) {
          if (value === null) {
            console.log(`Skipping unsupported chain: ${chainId}`);
            continue;
          }
          console.log(`Detected chain ${value} from chainId ${chainId}`);
          return value;
        }
      }

      console.log(`Unsupported chain detected: ${chainId}`);
    }
  } catch (error) {
    console.error("Error detecting chain:", error);
  }
  return null;
}

export async function getTransactionHistory(
  walletAddress: string,
  tokenContract: string,
  chain: Chain
): Promise<InsertTransaction[]> {
  try {
    //Use DexScreener or alternative method to fetch transaction history if needed. For now, maintain existing behavior.
    return await storage.getTransactions(walletAddress, tokenContract);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }
}