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
    console.log(`Attempting to detect chain for token: ${tokenContract}`);

    // Try each chain sequentially until we find a match
    for (const chain of ['ethereum', 'base', 'avalanche', 'solana'] as Chain[]) {
      console.log(`Checking ${chain}...`);
      const response = await getTokenAnalysis(tokenContract, chain);
      if (response) {
        const chainId = response.chainId.toLowerCase();
        console.log(`Found response for chain ${chainId}`);

        for (const [key, value] of Object.entries(chainMapping)) {
          if (chainId.includes(key)) {
            if (value === null) {
              console.log(`Skipping unsupported chain: ${chainId}`);
              continue;
            }
            console.log(`Detected chain: ${value}`);
            return value;
          }
        }
      }
    }

    console.log('No matching chain found for token');
    return null;
  } catch (error) {
    console.error("Error detecting chain:", error);
    return null;
  }
}

interface TransactionResult {
  transactions: InsertTransaction[];
  currentPrice: number | null;
}

// Add USDT-specific transaction pattern for simulated data
const STABLECOIN_PATTERNS = {
  'USDT': {
    minTxSize: 1000,
    maxTxSize: 100000,
    priceRange: { min: 0.98, max: 1.02 }
  }
};

export async function getTransactionHistory(
  walletAddress: string,
  tokenContract: string,
  chain: Chain
): Promise<TransactionResult> {
  try {
    console.log(`Getting transaction history for wallet ${walletAddress} on ${chain}`);
    const response = await getTokenAnalysis(tokenContract, chain);
    if (!response) {
      console.log(`No transaction data found for token ${tokenContract} on ${chain}`);
      return { transactions: [], currentPrice: null };
    }

    const currentPrice = response.priceUsd;
    const timestamp = new Date();
    const isStablecoin = response.symbol === 'USDT';

    // Generate unique transaction patterns based on wallet address
    const walletSeed = parseInt(walletAddress.slice(-4), 16);
    const patternType = walletSeed % 6; // Expanded to 6 different patterns

    let mockTransactions: InsertTransaction[] = [];

    console.log(`Generating ${patternType} pattern transactions for wallet`);
    console.log(`Token type: ${isStablecoin ? 'Stablecoin' : 'Standard token'}`);

    if (isStablecoin) {
      // Special pattern for USDT with more realistic stable prices
      const pattern = STABLECOIN_PATTERNS['USDT'];
      const txSize = pattern.minTxSize + (walletSeed % (pattern.maxTxSize - pattern.minTxSize));

      mockTransactions = [
        {
          walletAddress,
          tokenContract,
          amount: txSize.toString(),
          priceUsd: "0.9999",
          timestamp: new Date(timestamp.getTime() - 30 * 24 * 60 * 60 * 1000),
          chain,
          type: "buy"
        },
        {
          walletAddress,
          tokenContract,
          amount: (txSize * 0.5).toString(),
          priceUsd: "1.0001",
          timestamp: new Date(timestamp.getTime() - 15 * 24 * 60 * 60 * 1000),
          chain,
          type: "sell"
        }
      ];
    } else {
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
    }

    // Log the generated transactions for debugging
    console.log('Generated transactions:', {
      count: mockTransactions.length,
      currentPrice,
      isStablecoin,
      firstTx: mockTransactions[0]
    });

    return { transactions: mockTransactions, currentPrice };
  } catch (error) {
    console.error("Error fetching transactions:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Stack trace:", error.stack);
    }
    return { transactions: [], currentPrice: null };
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
    console.log(`\nAnalyzing P&L for wallet ${walletAddress} on ${chain}`);
    console.log(`Token contract: ${tokenContract}`);

    const { transactions, currentPrice } = await getTransactionHistory(walletAddress, tokenContract, chain);

    if (!transactions.length || !currentPrice) {
      console.log('No transactions found or current price unavailable');
      return null;
    }

    console.log(`Current token price: $${currentPrice}`);

    let totalBought = 0;
    let totalBoughtValue = 0;
    let totalSold = 0;
    let totalSoldValue = 0;
    let buyCount = 0;
    let sellCount = 0;

    transactions.forEach(tx => {
      const amount = parseFloat(tx.amount);
      const price = parseFloat(tx.priceUsd);

      console.log(`Processing transaction:`, {
        type: tx.type,
        amount,
        price,
        timestamp: tx.timestamp
      });

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
    const averageBuyPrice = totalBoughtValue / (totalBought ||1); //Avoid division by zero
    const averageSellPrice = totalSoldValue / (totalSold || 1); // Avoid division by zero

    const realizedPnL = totalSoldValue - (totalSold * averageBuyPrice);
    const unrealizedPnL = currentHoldings * (currentPrice - averageBuyPrice);

    // Log the calculated metrics
    console.log('P&L Analysis Results:', {
      totalBought,
      totalSold,
      currentHoldings,
      averageBuyPrice,
      averageSellPrice,
      realizedPnL,
      unrealizedPnL,
      currentPrice,
      buyCount,
      sellCount
    });

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
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Stack trace:", error.stack);
    }
    return null;
  }
}