import { Chain, type InsertTransaction } from "@shared/schema";
import { getTokenAnalysis } from "./dexscreener";

const chainMapping: Record<string, Chain> = {
  'ethereum': 'ethereum',
  'eth': 'ethereum',
  'pulse': null as unknown as Chain, // Ignore PulseChain
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
    // Use DexScreener API to fetch current token price
    const response = await getTokenAnalysis(tokenContract, chain);
    if (!response) {
      console.log(`No transaction data found for token ${tokenContract} on ${chain}`);
      return [];
    }

    const currentPrice = response.priceUsd;
    const timestamp = new Date();

    // Generate more realistic transaction scenarios based on current price
    const mockTransactions: InsertTransaction[] = [
      // Initial entry - large buy at -20% from current price (7 days ago)
      {
        walletAddress,
        tokenContract,
        amount: "10000",
        priceUsd: (currentPrice * 0.8).toString(),
        timestamp: new Date(timestamp.getTime() - 7 * 24 * 60 * 60 * 1000),
        chain,
        type: "buy"
      },
      // Add position - medium buy at -10% (5 days ago)
      {
        walletAddress,
        tokenContract,
        amount: "5000",
        priceUsd: (currentPrice * 0.9).toString(),
        timestamp: new Date(timestamp.getTime() - 5 * 24 * 60 * 60 * 1000),
        chain,
        type: "buy"
      },
      // Take profit - small sell at +15% (3 days ago)
      {
        walletAddress,
        tokenContract,
        amount: "3000",
        priceUsd: (currentPrice * 1.15).toString(),
        timestamp: new Date(timestamp.getTime() - 3 * 24 * 60 * 60 * 1000),
        chain,
        type: "sell"
      },
      // Take profit - medium sell at +10% (1 day ago)
      {
        walletAddress,
        tokenContract,
        amount: "5000",
        priceUsd: (currentPrice * 1.1).toString(),
        timestamp: new Date(timestamp.getTime() - 1 * 24 * 60 * 60 * 1000),
        chain,
        type: "sell"
      }
    ];

    return mockTransactions;
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }
}

interface PnLAnalysis {
  totalBought: number;
  totalSold: number;
  averageBuyPrice: number;
  averageSellPrice: number;
  currentHoldings: number;
  unrealizedPnL: number;
  realizedPnL: number;
  currentPrice: number;
  buyCount: number;   // Number of buy transactions
  sellCount: number;  // Number of sell transactions
}

export async function analyzePnL(
  walletAddress: string,
  tokenContract: string,
  chain: Chain
): Promise<PnLAnalysis | null> {
  try {
    const transactions = await getTransactionHistory(walletAddress, tokenContract, chain);
    const currentPrice = (await getTokenAnalysis(tokenContract, chain))?.priceUsd;

    if (!transactions.length || !currentPrice) {
      return null;
    }

    let totalBought = 0;
    let totalBoughtValue = 0;
    let totalSold = 0;
    let totalSoldValue = 0;
    let buyCount = 0;
    let sellCount = 0;

    transactions.forEach(tx => {
      const amount = parseFloat(tx.amount);
      const price = parseFloat(tx.priceUsd);

      if (tx.type === "buy") {
        totalBought += amount;
        totalBoughtValue += amount * price;
        buyCount++;
      } else {
        totalSold += amount;
        totalSoldValue += amount * price;
        sellCount++;
      }
    });

    const currentHoldings = totalBought - totalSold;
    const averageBuyPrice = totalBoughtValue / totalBought;
    const averageSellPrice = totalSoldValue / totalSold;

    // Calculate P&L
    const realizedPnL = totalSoldValue - (totalSold * averageBuyPrice);
    const unrealizedPnL = currentHoldings * (currentPrice - averageBuyPrice);

    return {
      totalBought,
      totalSold,
      averageBuyPrice,
      averageSellPrice,
      currentHoldings,
      unrealizedPnL,
      realizedPnL,
      currentPrice,
      buyCount,
      sellCount
    };
  } catch (error) {
    console.error("Error analyzing PnL:", error);
    return null;
  }
}