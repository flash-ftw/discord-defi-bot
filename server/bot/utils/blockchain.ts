import { ethers } from "ethers";
import { Chain, type InsertTransaction, supportedChains } from "@shared/schema";
import { storage } from "../../storage";

// Initialize providers only for available RPC URLs
const providers: Partial<Record<Chain, ethers.JsonRpcProvider>> = {};

// Only initialize providers for chains with configured RPC URLs
if (process.env.ETH_RPC_URL) {
  providers.ethereum = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL);
}
if (process.env.BASE_RPC_URL) {
  providers.base = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
}
if (process.env.AVAX_RPC_URL) {
  providers.avalanche = new ethers.JsonRpcProvider(process.env.AVAX_RPC_URL);
}

const availableChains = Object.keys(providers) as Chain[];
console.log("Available chains:", availableChains);

export async function detectChain(tokenContract: string): Promise<Chain | null> {
  for (const chain of availableChains) {
    try {
      const provider = providers[chain];
      if (!provider) {
        continue; // Skip if provider is not initialized
      }

      console.log(`Checking chain ${chain} for token ${tokenContract}`);
      const code = await provider.getCode(tokenContract);
      if (code !== "0x") {
        console.log(`Token found on ${chain}`);
        return chain;
      }
    } catch (error) {
      console.error(`Error checking chain ${chain}:`, error);
    }
  }
  return null;
}

export async function getTokenTransactions(
  walletAddress: string,
  tokenContract: string,
  chain: Chain
): Promise<InsertTransaction[]> {
  try {
    if (!providers[chain]) {
      throw new Error(`Chain ${chain} is not currently supported - RPC URL not configured`);
    }

    // For now, just return transactions from storage
    // In a future implementation, we could fetch historical transactions from the chain
    return await storage.getTransactions(walletAddress, tokenContract);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    throw new Error("Failed to fetch token transactions");
  }
}