import { Chain, supportedChains } from "@shared/schema";
import { analyzePnL } from "./blockchain";

// Top holders for testing (selected from blockchain explorers)
const HOLDERS = {
  ethereum: {
    address: "0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503", // Binance Wallet
    token: "0xd6203889C22D9fe5e938a9200f50FDFFE9dD8e02"
  },
  base: {
    address: "0x4c80E24119CFB7a97428CE98B2cDb90E42BBe3D5", // Large Base Holder
    token: "0x18b6f6049A0af4Ed2BBe0090319174EeeF89f53a"
  },
  avalanche: {
    address: "0x6e84a6216ea6dacc71ee8e6b0a5b7322eebc0fd9", // TraderJoe Router
    token: "0x79Ea4E536f598dCd67C76Ee3829f84AB9E72A558"
  },
  solana: {
    address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", // Top Solana Holder
    token: "47b3pp5G7ZQJ15U1nEgRmorUfVTwrotgsFeyfdhgpump"
  }
};

async function testTopHolders() {
  for (const chain of supportedChains) {
    console.log(`\n=== Testing ${chain.toUpperCase()} Top Holder ===`);
    const holder = HOLDERS[chain];
    
    if (!holder) {
      console.log(`No test holder configured for ${chain}`);
      continue;
    }

    console.log(`Wallet: ${holder.address}`);
    console.log(`Token: ${holder.token}`);

    try {
      const analysis = await analyzePnL(holder.address, holder.token, chain);

      if (analysis) {
        console.log("\nTop Holder P&L Analysis:");
        console.log(`Current Price: $${analysis.currentPrice.toFixed(6)}`);
        console.log(`Total Bought: ${analysis.totalBought.toLocaleString()} tokens @ $${analysis.averageBuyPrice.toFixed(6)}`);
        console.log(`Total Sold: ${analysis.totalSold.toLocaleString()} tokens @ $${analysis.averageSellPrice.toFixed(6)}`);
        console.log(`Current Holdings: ${analysis.currentHoldings.toLocaleString()} tokens`);
        console.log(`Realized P&L: $${analysis.realizedPnL.toFixed(2)}`);
        console.log(`Unrealized P&L: $${analysis.unrealizedPnL.toFixed(2)}`);
        console.log(`Total P&L: $${(analysis.realizedPnL + analysis.unrealizedPnL).toFixed(2)}`);
      } else {
        console.log("No P&L data available for this holder");
      }
    } catch (error) {
      console.error(`Error analyzing holder on ${chain}:`, error);
    }
  }
}

testTopHolders().catch(console.error);
