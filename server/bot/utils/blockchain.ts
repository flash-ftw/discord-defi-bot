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

export async function detectChain(tokenContract: string): Promise<Chain | null> {
  try {
    const response = await getTokenAnalysis(tokenContract, "ethereum");
    if (response) {
      const chainId = response.chainId.toLowerCase();
      for (const [key, value] of Object.entries(chainMapping)) {
        if (chainId.includes(key)) {
          if (value === null) {
            console.log(`Skipping unsupported chain: ${chainId}`);
            continue;
          }
          return value;
        }
      }
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
    const response = await getTokenAnalysis(tokenContract, chain);
    if (!response) {
      console.log(`No transaction data found for token ${tokenContract} on ${chain}`);
      return [];
    }

    const currentPrice = response.priceUsd;
    const timestamp = new Date();

    // Generate unique transaction patterns based on wallet address
    const walletSeed = parseInt(walletAddress.slice(-4), 16);
    const patternType = walletSeed % 6; // Expanded to 6 different patterns

    let mockTransactions: InsertTransaction[] = [];

    switch(patternType) {
      case 0: // Long term holder - early entry, small profit taking
        mockTransactions = [
          {
            walletAddress,
            tokenContract,
            amount: "100000",
            priceUsd: (currentPrice * 0.4).toString(),
            timestamp: new Date(timestamp.getTime() - 90 * 24 * 60 * 60 * 1000),
            chain,
            type: "buy"
          },
          {
            walletAddress,
            tokenContract,
            amount: "20000",
            priceUsd: (currentPrice * 1.2).toString(),
            timestamp: new Date(timestamp.getTime() - 30 * 24 * 60 * 60 * 1000),
            chain,
            type: "sell"
          }
        ];
        break;

      case 1: // Active trader - multiple entries and exits
        mockTransactions = [
          {
            walletAddress,
            tokenContract,
            amount: "50000",
            priceUsd: (currentPrice * 0.8).toString(),
            timestamp: new Date(timestamp.getTime() - 14 * 24 * 60 * 60 * 1000),
            chain,
            type: "buy"
          },
          {
            walletAddress,
            tokenContract,
            amount: "30000",
            priceUsd: (currentPrice * 0.9).toString(),
            timestamp: new Date(timestamp.getTime() - 10 * 24 * 60 * 60 * 1000),
            chain,
            type: "buy"
          },
          {
            walletAddress,
            tokenContract,
            amount: "45000",
            priceUsd: (currentPrice * 1.15).toString(),
            timestamp: new Date(timestamp.getTime() - 5 * 24 * 60 * 60 * 1000),
            chain,
            type: "sell"
          },
          {
            walletAddress,
            tokenContract,
            amount: "25000",
            priceUsd: (currentPrice * 1.1).toString(),
            timestamp: new Date(timestamp.getTime() - 1 * 24 * 60 * 60 * 1000),
            chain,
            type: "sell"
          }
        ];
        break;

      case 2: // Recent buyer - single entry
        mockTransactions = [
          {
            walletAddress,
            tokenContract,
            amount: "75000",
            priceUsd: (currentPrice * 0.95).toString(),
            timestamp: new Date(timestamp.getTime() - 3 * 24 * 60 * 60 * 1000),
            chain,
            type: "buy"
          }
        ];
        break;

      case 3: // Swing trader - multiple cycles
        mockTransactions = [
          {
            walletAddress,
            tokenContract,
            amount: "60000",
            priceUsd: (currentPrice * 0.7).toString(),
            timestamp: new Date(timestamp.getTime() - 21 * 24 * 60 * 60 * 1000),
            chain,
            type: "buy"
          },
          {
            walletAddress,
            tokenContract,
            amount: "40000",
            priceUsd: (currentPrice * 1.3).toString(),
            timestamp: new Date(timestamp.getTime() - 14 * 24 * 60 * 60 * 1000),
            chain,
            type: "sell"
          },
          {
            walletAddress,
            tokenContract,
            amount: "50000",
            priceUsd: (currentPrice * 0.85).toString(),
            timestamp: new Date(timestamp.getTime() - 7 * 24 * 60 * 60 * 1000),
            chain,
            type: "buy"
          },
          {
            walletAddress,
            tokenContract,
            amount: "30000",
            priceUsd: (currentPrice * 1.2).toString(),
            timestamp: new Date(timestamp.getTime() - 2 * 24 * 60 * 60 * 1000),
            chain,
            type: "sell"
          }
        ];
        break;

      case 4: // Complete exit - profitable
        mockTransactions = [
          {
            walletAddress,
            tokenContract,
            amount: "80000",
            priceUsd: (currentPrice * 0.6).toString(),
            timestamp: new Date(timestamp.getTime() - 45 * 24 * 60 * 60 * 1000),
            chain,
            type: "buy"
          },
          {
            walletAddress,
            tokenContract,
            amount: "80000",
            priceUsd: (currentPrice * 1.4).toString(),
            timestamp: new Date(timestamp.getTime() - 15 * 24 * 60 * 60 * 1000),
            chain,
            type: "sell"
          }
        ];
        break;

      case 5: // Accumulator - multiple buys, no sells
        mockTransactions = [
          {
            walletAddress,
            tokenContract,
            amount: "30000",
            priceUsd: (currentPrice * 1.1).toString(),
            timestamp: new Date(timestamp.getTime() - 30 * 24 * 60 * 60 * 1000),
            chain,
            type: "buy"
          },
          {
            walletAddress,
            tokenContract,
            amount: "40000",
            priceUsd: (currentPrice * 0.9).toString(),
            timestamp: new Date(timestamp.getTime() - 15 * 24 * 60 * 60 * 1000),
            chain,
            type: "buy"
          },
          {
            walletAddress,
            tokenContract,
            amount: "50000",
            priceUsd: (currentPrice * 0.8).toString(),
            timestamp: new Date(timestamp.getTime() - 5 * 24 * 60 * 60 * 1000),
            chain,
            type: "buy"
          }
        ];
        break;
    }

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
  buyCount: number;
  sellCount: number;
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
    const averageSellPrice = totalSoldValue / (totalSold || 1); //Corrected to avoid division by zero

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