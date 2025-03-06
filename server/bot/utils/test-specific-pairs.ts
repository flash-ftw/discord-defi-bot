import { analyzePnL } from "./blockchain";
import { supportedChains } from "@shared/schema";

const TEST_PAIRS = [
  {
    wallet: "0x28c6c06298d514db089934071355e5743bf21d60",
    token: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT
    chain: "ethereum"
  },
  {
    wallet: "0xf23E360A36c6f35c27ddB05e30DD015b215585a1",
    token: "0x76e222b07C53D28b89b0bAc18602810Fc22B49A8", // Base token
    chain: "base"
  },
  {
    wallet: "0x94972103a306e9578C7098e8E46864356F592Fa4",
    token: "0x739f93504a9e26D5973862Dbc4A44178cC26485", // Token on Base
    chain: "base"
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
      console.error(`Error analyzing pair:`, error);
    }
  }
}

testSpecificPairs().catch(console.error);