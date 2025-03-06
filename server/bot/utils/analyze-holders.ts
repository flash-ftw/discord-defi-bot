import { Chain, supportedChains } from "@shared/schema";
import { analyzePnL } from "./blockchain";
import { getTokenAnalysis } from "./dexscreener";

// Export the types
export type HolderCategory = 'whale' | 'active_trader' | 'retail';

export interface HolderAnalysis {
  address: string;
  category: HolderCategory;
  chain: Chain;
  metrics: {
    totalValue: number;
    numberOfTrades: number;
    averageTradeSize: number;
    realizedPnL: number;
    unrealizedPnL: number;
    holdingPeriod: number;
    volumeMetrics?: {
      buyVolume24h: number;
      sellVolume24h: number;
      totalVolume: number;
      marketImpact?: number; // % of daily volume
    };
    categoryMetrics?: {
      percentageOfCategory: number;
      rankInCategory: number;
    };
    positionMetrics?: {
      percentOfLiquidity: number;
      sizeCategory: 'small' | 'medium' | 'large';  // Based on % of liquidity
      riskLevel: 'low' | 'medium' | 'high';      // Based on position size and market impact
    };
    tradingPattern?: {
      pattern: 'accumulation' | 'distribution' | 'swing' | 'hold';
      confidence: number;  // 0-1 score of pattern confidence
      description: string;
    };
  };
}

// Test tokens across chains
const ANALYSIS_TOKENS = {
  ethereum: {
    address: "0xd6203889C22D9fe5e938a9200f50FDFFE9dD8e02",
    holders: {
      whales: [
        "0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503", // Binance
        "0x28c6c06298d514db089934071355e5743bf21d60"  // Large holder
      ],
      active_traders: [
        "0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE",
        "0xb5d85CBf7cB3EE0D56b3bB207D5Fc4B82f43F511"
      ],
      retail: [
        "0xC098B2a3Aa256D2140208C3de6543aAEf5cd3A94",
        "0x1234567890123456789012345678901234567890"
      ]
    }
  },
  base: {
    address: "0x18b6f6049A0af4Ed2BBe0090319174EeeF89f53a",
    holders: {
      whales: [
        "0x4c80E24119CFB7a97428CE98B2cDb90E42BBe3D5",
        "0xf23E360A36c6f35c27ddB05e30DD015b215585a1"
      ],
      active_traders: [
        "0x6887246668a3b87F54DeB3b94Ba47a6f63F32985",
        "0x9876543210987654321098765432109876543210"
      ],
      retail: [
        "0x1234567890123456789012345678901234567890",
        "0xABCDEF0123456789ABCDEF0123456789ABCDEF01"
      ]
    }
  },
  avalanche: {
    address: "0x79Ea4E536f598dCd67C76Ee3829f84AB9E72A558",
    holders: {
      whales: [
        "0x6e84a6216ea6dacc71ee8e6b0a5b7322eebc0fd9",
        "0x94972103a306e9578C7098e8E46864356F592Fa4"
      ],
      active_traders: [
        "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
        "0xFEDCBA9876543210FEDCBA9876543210FEDCBA98"
      ],
      retail: [
        "0xABCDEF0123456789ABCDEF0123456789ABCDEF01",
        "0x0123456789ABCDEF0123456789ABCDEF01234567"
      ]
    }
  },
  solana: {
    address: "47b3pp5G7ZQJ15U1nEgRmorUfVTwrotgsFeyfdhgpump",
    holders: {
      whales: [
        "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
        "47b3pp5G7ZQJ15U1nEgRmorUfVTwrotgsFeyfdhgpump"
      ],
      active_traders: [
        "3XR7XwaD9o5HQ8DGHjYgB7HkVmJBmQmxL9bKmcHKhKhj",
        "8FRFC6MoGGkMFQwngccyu69VnYbzykGeez7ignHVAFSN"
      ],
      retail: [
        "2JCxSb9EGkKqfCEVhgqb5KVUtNqJoGHjDFTbhUmmnoof",
        "5KtQQv4HyqvWzFW8dXNYuYXGVGVsLooYJeCP1wWqYnzB"
      ]
    }
  }
};

export async function analyzeHolderMetrics(
  address: string,
  tokenAddress: string,
  chain: Chain,
  category: HolderCategory,
  categoryHolders: string[]
): Promise<HolderAnalysis | null> {
  try {
    const analysis = await analyzePnL(address, tokenAddress, chain);
    if (!analysis) return null;

    const tokenInfo = await getTokenAnalysis(tokenAddress, chain);
    if (!tokenInfo) return null;

    const totalValue = analysis.currentHoldings * analysis.currentPrice;
    const numberOfTrades = analysis.buyCount + analysis.sellCount;
    const averageTradeSize = (analysis.totalBought + analysis.totalSold) / numberOfTrades;

    // Calculate volume metrics if available
    let volumeMetrics;
    if (tokenInfo.volume?.h24) {
      const buyVolume24h = analysis.buyCount > 0 ? tokenInfo.volume.h24 * (analysis.buyCount / numberOfTrades) : 0;
      const sellVolume24h = analysis.sellCount > 0 ? tokenInfo.volume.h24 * (analysis.sellCount / numberOfTrades) : 0;
      const totalVolume = tokenInfo.volume.h24;

      // Calculate market impact (% of daily volume)
      const marketImpact = ((buyVolume24h + sellVolume24h) / totalVolume) * 100;

      volumeMetrics = {
        buyVolume24h,
        sellVolume24h,
        totalVolume,
        marketImpact
      };
    }

    // Calculate category metrics
    const allHolderValues = await Promise.all(
      categoryHolders.map(async (h) => {
        const a = await analyzePnL(h, tokenAddress, chain);
        return a ? a.currentHoldings * a.currentPrice : 0;
      })
    );

    const totalCategoryValue = allHolderValues.reduce((a, b) => a + b, 0);
    const percentageOfCategory = totalCategoryValue > 0 ? (totalValue / totalCategoryValue) * 100 : 0;
    const rankInCategory = allHolderValues.filter(v => v > totalValue).length + 1;

    // Calculate position metrics
    const positionMetrics = tokenInfo.liquidity?.usd ? {
      percentOfLiquidity: (totalValue / tokenInfo.liquidity.usd) * 100,
      sizeCategory: determineSizeCategory(totalValue, tokenInfo.liquidity.usd),
      riskLevel: determineRiskLevel(totalValue, tokenInfo.liquidity.usd, volumeMetrics?.marketImpact || 0)
    } : undefined;

    // Analyze trading pattern
    const tradingPattern = analyzeTradingPattern(analysis);

    // Calculate holding period based on transaction patterns
    const estimatedDays = numberOfTrades > 0 ? Math.min(90, numberOfTrades * 15) : 0;

    return {
      address,
      category,
      chain,
      metrics: {
        totalValue,
        numberOfTrades,
        averageTradeSize,
        realizedPnL: analysis.realizedPnL,
        unrealizedPnL: analysis.unrealizedPnL,
        holdingPeriod: estimatedDays,
        volumeMetrics,
        categoryMetrics: {
          percentageOfCategory,
          rankInCategory
        },
        positionMetrics,
        tradingPattern
      }
    };
  } catch (error) {
    console.error(`Error analyzing holder ${address}:`, error);
    return null;
  }
}

function determineSizeCategory(
  positionValue: number,
  liquidityUsd: number
): 'small' | 'medium' | 'large' {
  const percentage = (positionValue / liquidityUsd) * 100;
  if (percentage < 1) return 'small';
  if (percentage < 5) return 'medium';
  return 'large';
}

function determineRiskLevel(
  positionValue: number,
  liquidityUsd: number,
  marketImpact: number
): 'low' | 'medium' | 'high' {
  const liquidityPercentage = (positionValue / liquidityUsd) * 100;

  if (liquidityPercentage > 10 || marketImpact > 50) return 'high';
  if (liquidityPercentage > 3 || marketImpact > 20) return 'medium';
  return 'low';
}

function analyzeTradingPattern(
  analysis: {
    buyCount: number;
    sellCount: number;
    totalBought: number;
    totalSold: number;
    currentHoldings: number;
  }
): { pattern: 'accumulation' | 'distribution' | 'swing' | 'hold'; confidence: number; description: string } {
  const buyRatio = analysis.totalBought / (analysis.totalBought + analysis.totalSold);
  const sellRatio = analysis.totalSold / (analysis.totalBought + analysis.totalSold);
  const holdingsRatio = analysis.currentHoldings / analysis.totalBought;

  // Determine pattern and confidence
  if (analysis.buyCount === 0 && analysis.sellCount === 0) {
    return {
      pattern: 'hold',
      confidence: 1,
      description: 'No trading activity detected'
    };
  }

  if (buyRatio > 0.7 && holdingsRatio > 0.8) {
    return {
      pattern: 'accumulation',
      confidence: buyRatio,
      description: 'Strong buying activity with high retention'
    };
  }

  if (sellRatio > 0.7 && holdingsRatio < 0.2) {
    return {
      pattern: 'distribution',
      confidence: sellRatio,
      description: 'Significant selling activity with low retention'
    };
  }

  return {
    pattern: 'swing',
    confidence: Math.min(buyRatio, sellRatio) * 2,
    description: 'Mixed buying and selling activity'
  };
}

export async function analyzeAllHolders() {
  const results: HolderAnalysis[] = [];

  for (const chain of supportedChains) {
    const tokenData = ANALYSIS_TOKENS[chain];
    console.log(`\n=== Analyzing ${chain.toUpperCase()} Token ===`);
    console.log(`Token Address: ${tokenData.address}`);

    for (const [category, addresses] of Object.entries(tokenData.holders)) {
      console.log(`\n${category.toUpperCase()} HOLDERS:`);

      for (const address of addresses) {
        const analysis = await analyzeHolderMetrics(
          address,
          tokenData.address,
          chain,
          category as HolderCategory,
          addresses
        );

        if (analysis) {
          results.push(analysis);
          console.log(`\nAddress: ${address}`);
          console.log(`Total Value: $${analysis.metrics.totalValue.toLocaleString()}`);
          console.log(`Number of Trades: ${analysis.metrics.numberOfTrades}`);
          console.log(`Average Trade Size: ${analysis.metrics.averageTradeSize.toLocaleString()} tokens`);
          console.log(`Realized P&L: $${analysis.metrics.realizedPnL.toLocaleString()}`);
          console.log(`Unrealized P&L: $${analysis.metrics.unrealizedPnL.toLocaleString()}`);
          console.log(`Holding Period: ~${analysis.metrics.holdingPeriod} days`);

          if (analysis.metrics.volumeMetrics) {
            console.log(`\nVolume Metrics (24h):`);
            console.log(`Buy Volume: $${analysis.metrics.volumeMetrics.buyVolume24h.toLocaleString()}`);
            console.log(`Sell Volume: $${analysis.metrics.volumeMetrics.sellVolume24h.toLocaleString()}`);
            console.log(`Total Volume: $${analysis.metrics.volumeMetrics.totalVolume.toLocaleString()}`);
            console.log(`Market Impact: ${analysis.metrics.volumeMetrics.marketImpact?.toFixed(2)}% of daily volume`);
          }

          if (analysis.metrics.categoryMetrics) {
            console.log(`\nCategory Metrics:`);
            console.log(`% of Category Value: ${analysis.metrics.categoryMetrics.percentageOfCategory.toFixed(2)}%`);
            console.log(`Rank in Category: #${analysis.metrics.categoryMetrics.rankInCategory}`);
          }

          if (analysis.metrics.positionMetrics) {
            console.log(`\nPosition Metrics:`);
            console.log(`% of Liquidity: ${analysis.metrics.positionMetrics.percentOfLiquidity.toFixed(2)}%`);
            console.log(`Size Category: ${analysis.metrics.positionMetrics.sizeCategory}`);
            console.log(`Risk Level: ${analysis.metrics.positionMetrics.riskLevel}`);
          }

          if (analysis.metrics.tradingPattern) {
            console.log(`\nTrading Pattern:`);
            console.log(`Pattern: ${analysis.metrics.tradingPattern.pattern}`);
            console.log(`Confidence: ${(analysis.metrics.tradingPattern.confidence * 100).toFixed(1)}%`);
            console.log(`Description: ${analysis.metrics.tradingPattern.description}`);
          }
        }
      }
    }
  }

  return results;
}

// Run the analysis when the file is executed directly
if (import.meta.url.endsWith(process.argv[1])) {
  analyzeAllHolders().catch(console.error);
}