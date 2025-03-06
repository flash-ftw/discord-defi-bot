import { analyzePnL } from "./blockchain";
import { supportedChains } from "@shared/schema";

const TEST_PAIRS = [
  {
    chain: "solana",
    wallet: "47b3pp5G7ZQJ15U1nEgRmorUfVTwrotgsFeyfdhgpump", // Test wallet
    token: "47b3pp5G7ZQJ15U1nEgRmorUfVTwrotgsFeyfdhgpump"  // Token contract
  },
  {
    chain: "ethereum",
    wallet: "0x28c6c06298d514db089934071355e5743bf21d60", // Test wallet
    token: "0xd6203889C22D9fe5e938a9200f50FDFFE9dD8e02"  // Token contract
  },
  {
    chain: "base",
    wallet: "0xf23E360A36c6f35c27ddB05e30DD015b215585a1", // Test wallet
    token: "0x18b6f6049A0af4Ed2BBe0090319174EeeF89f53a"  // Token contract
  },
  {
    chain: "avalanche",
    wallet: "0x94972103a306e9578C7098e8E46864356F592Fa4", // Test wallet
    token: "0x79Ea4E536f598dCd67C76Ee3829f84AB9E72A558"  // Token contract
  }
];

async function testSpecificPairs() {
  for (const pair of TEST_PAIRS) {
    console.log(`\n=== Testing ${pair.chain.toUpperCase()} ===`);
    console.log(`Wallet: ${pair.wallet}`);
    console.log(`Token: ${pair.token}`);

    try {
      const analysis = await analyzePnL(pair.wallet, pair.token, pair.chain as any);

      if (analysis) {
        console.log("\nP&L Analysis Results:");
        console.log(`Current Price: $${analysis.currentPrice.toFixed(6)}`);
        console.log(`Total Bought: ${analysis.totalBought.toLocaleString()} tokens @ $${analysis.averageBuyPrice.toFixed(6)}`);
        console.log(`Total Sold: ${analysis.totalSold.toLocaleString()} tokens @ $${analysis.averageSellPrice.toFixed(6)}`);
        console.log(`Current Holdings: ${analysis.currentHoldings.toLocaleString()} tokens`);
        console.log(`Realized P&L: $${analysis.realizedPnL.toFixed(2)}`);
        console.log(`Unrealized P&L: $${analysis.unrealizedPnL.toFixed(2)}`);
        console.log(`Total P&L: $${(analysis.realizedPnL + analysis.unrealizedPnL).toFixed(2)}`);
      } else {
        console.log("No analysis data available");
      }
    } catch (error) {
      console.error(`Error analyzing pair:`, error);
    }
  }
}

testSpecificPairs().catch(console.error);