import { analyzePnL } from "./blockchain";
import { supportedChains } from "@shared/schema";

// Test tokens
const TEST_TOKENS = {
  ethereum: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
  base: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22",    // cbETH
  avalanche: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", // WAVAX
  solana: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" // BONK
};

// Test wallet addresses
const TEST_WALLETS = {
  ethereum: "0x1234....", // Sample wallet
  base: "0x5678....",
  avalanche: "0x9abc....",
  solana: "DezX...."
};

async function testPnL() {
  console.log("Testing P&L Analysis across chains...\n");

  for (const chain of supportedChains) {
    console.log(`\n=== Testing ${chain.toUpperCase()} ===`);
    
    const tokenAddress = TEST_TOKENS[chain];
    const walletAddress = TEST_WALLETS[chain];
    
    try {
      console.log(`Testing token ${tokenAddress}`);
      const analysis = await analyzePnL(walletAddress, tokenAddress, chain);
      
      if (analysis) {
        console.log("\nP&L Analysis Results:");
        console.log(`Current Price: $${analysis.currentPrice.toFixed(6)}`);
        console.log(`Total Bought: ${analysis.totalBought} tokens @ $${analysis.averageBuyPrice.toFixed(6)}`);
        console.log(`Total Sold: ${analysis.totalSold} tokens @ $${analysis.averageSellPrice.toFixed(6)}`);
        console.log(`Current Holdings: ${analysis.currentHoldings} tokens`);
        console.log(`Realized P&L: $${analysis.realizedPnL.toFixed(2)}`);
        console.log(`Unrealized P&L: $${analysis.unrealizedPnL.toFixed(2)}`);
        console.log(`Total P&L: $${(analysis.realizedPnL + analysis.unrealizedPnL).toFixed(2)}`);
      } else {
        console.log("No analysis data available");
      }
    } catch (error) {
      console.error(`Error analyzing ${chain}:`, error);
    }
  }
}

testPnL().catch(console.error);
