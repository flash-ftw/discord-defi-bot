import { Chain } from "@shared/schema";
import { getTokenData } from "./dexscreener";

export async function detectChain(tokenContract: string): Promise<Chain | null> {
  try {
    // Use DexScreener API to detect which chain the token is on
    const response = await getTokenData(tokenContract, "ethereum"); // Try any chain first
    if (response) {
      // DexScreener response includes chainId which we can use to determine the chain
      const chainId = response.chainId.toLowerCase();
      if (chainId.includes("ethereum")) return "ethereum";
      if (chainId.includes("base")) return "base";
      if (chainId.includes("avalanche")) return "avalanche";
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
    //Use DexScreener or alternative method to fetch transaction history if needed.  For now, maintain existing behavior.
    return await storage.getTransactions(walletAddress, tokenContract);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }
}