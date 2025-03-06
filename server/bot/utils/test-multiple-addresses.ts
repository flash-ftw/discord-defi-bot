import { Chain, supportedChains } from "@shared/schema";
import { analyzePnL } from "./blockchain";

// Test different addresses for the same tokens
const TEST_SCENARIOS = [
  // Ethereum token tests
  {
    chain: "ethereum",
    token: "0xd6203889C22D9fe5e938a9200f50FDFFE9dD8e02",
    addresses: [
      "0x28c6c06298d514db089934071355e5743bf21d60", // Regular trader
      "0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503", // Binance Wallet
      "0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE", // Another active trader
      "0xb5d85CBf7cB3EE0D56b3bB207D5Fc4B82f43F511", // Zero balance wallet
      "0xC098B2a3Aa256D2140208C3de6543aAEf5cd3A94"  // Complete exit
    ]
  },
  // Base token tests
  {
    chain: "base",
    token: "0x18b6f6049A0af4Ed2BBe0090319174EeeF89f53a",
    addresses: [
      "0x4c80E24119CFB7a97428CE98B2cDb90E42BBe3D5", // Large holder
      "0xf23E360A36c6f35c27ddB05e30DD015b215585a1", // Regular trader
      "0x6887246668a3b87F54DeB3b94Ba47a6f63F32985", // Active trader
      "0x1234567890123456789012345678901234567890", // New wallet
      "0x9876543210987654321098765432109876543210"  // All sold position
    ]
  },
  // Avalanche token tests
  {
    chain: "avalanche",
    token: "0x79Ea4E536f598dCd67C76Ee3829f84AB9E72A558",
    addresses: [
      "0x6e84a6216ea6dacc71ee8e6b0a5b7322eebc0fd9", // TraderJoe router
      "0x94972103a306e9578C7098e8E46864356F592Fa4", // Regular trader
      "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", // Active trader
      "0xABCDEF0123456789ABCDEF0123456789ABCDEF01", // Fresh wallet
      "0xFEDCBA9876543210FEDCBA9876543210FEDCBA98"  // Complete exit
    ]
  },
  // Solana token tests
  {
    chain: "solana",
    token: "47b3pp5G7ZQJ15U1nEgRmorUfVTwrotgsFeyfdhgpump",
    addresses: [
      "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", // Top holder
      "47b3pp5G7ZQJ15U1nEgRmorUfVTwrotgsFeyfdhgpump", // Contract address
      "3XR7XwaD9o5HQ8DGHjYgB7HkVmJBmQmxL9bKmcHKhKhj", // Active trader
      "8FRFC6MoGGkMFQwngccyu69VnYbzykGeez7ignHVAFSN", // New wallet
      "2JCxSb9EGkKqfCEVhgqb5KVUtNqJoGHjDFTbhUmmnoof"  // All sold
    ]
  }
];

async function testMultipleAddresses() {
  for (const scenario of TEST_SCENARIOS) {
    console.log(`\n=== Testing ${scenario.chain.toUpperCase()} Token ===`);
    console.log(`Token: ${scenario.token}`);

    for (const address of scenario.addresses) {
      console.log(`\nAnalyzing address: ${address}`);

      try {
        const analysis = await analyzePnL(address, scenario.token, scenario.chain as Chain);

        if (analysis) {
          console.log("\nWallet Analysis Results:");
          console.log(`Current Price: $${analysis.currentPrice.toFixed(6)}`);
          console.log(`Buy Transactions: ${analysis.buyCount} trades`);
          console.log(`Sell Transactions: ${analysis.sellCount} trades`);
          console.log(`Total Bought: ${analysis.totalBought.toLocaleString()} tokens @ $${analysis.averageBuyPrice.toFixed(6)}`);
          console.log(`Total Sold: ${analysis.totalSold.toLocaleString()} tokens @ $${analysis.averageSellPrice.toFixed(6)}`);
          console.log(`Current Holdings: ${analysis.currentHoldings.toLocaleString()} tokens`);
          console.log(`Realized P&L: $${analysis.realizedPnL.toFixed(2)}`);
          console.log(`Unrealized P&L: $${analysis.unrealizedPnL.toFixed(2)}`);
          console.log(`Total P&L: $${(analysis.realizedPnL + analysis.unrealizedPnL).toFixed(2)}`);

          // Validate basic calculations
          const expectedHoldings = analysis.totalBought - analysis.totalSold;
          if (Math.abs(expectedHoldings - analysis.currentHoldings) > 0.000001) {
            console.log("WARNING: Holdings calculation mismatch!");
            console.log(`Expected: ${expectedHoldings}, Actual: ${analysis.currentHoldings}`);
          }

          // Verify trading counts
          if (analysis.buyCount === 0 && analysis.totalBought > 0) {
            console.log("WARNING: Buy count is zero but total bought is positive!");
          }
          if (analysis.sellCount === 0 && analysis.totalSold > 0) {
            console.log("WARNING: Sell count is zero but total sold is positive!");
          }

          // Check for edge cases
          if (analysis.currentHoldings === 0) {
            console.log("NOTE: Zero balance wallet (all tokens sold or no trades)");
          }
          if (analysis.buyCount === 0 && analysis.sellCount === 0) {
            console.log("NOTE: New wallet with no trading history");
          }

          // Validate P&L calculations
          const totalInvestment = analysis.totalBought * analysis.averageBuyPrice;
          const totalReturns = analysis.totalSold * analysis.averageSellPrice + 
                             analysis.currentHoldings * analysis.currentPrice;
          const calculatedTotalPnL = totalReturns - totalInvestment;
          const reportedTotalPnL = analysis.realizedPnL + analysis.unrealizedPnL;

          if (Math.abs(calculatedTotalPnL - reportedTotalPnL) > 0.01) {
            console.log("\nWARNING: P&L calculation mismatch!");
            console.log(`Total Investment: $${totalInvestment.toFixed(2)}`);
            console.log(`Total Returns: $${totalReturns.toFixed(2)}`);
            console.log(`Calculated P&L: $${calculatedTotalPnL.toFixed(2)}`);
            console.log(`Reported P&L: $${reportedTotalPnL.toFixed(2)}`);
          }

          // Verify price changes
          if (analysis.currentPrice <= 0) {
            console.log("WARNING: Invalid current price (zero or negative)!");
          }
          if (analysis.averageBuyPrice <= 0 && analysis.totalBought > 0) {
            console.log("WARNING: Invalid average buy price!");
          }
          if (analysis.averageSellPrice <= 0 && analysis.totalSold > 0) {
            console.log("WARNING: Invalid average sell price!");
          }
        } else {
          console.log("No analysis data available");
        }
      } catch (error) {
        console.error(`Error analyzing address:`, error);
      }
    }
  }
}

testMultipleAddresses().catch(console.error);