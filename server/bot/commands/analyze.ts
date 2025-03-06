import { ChatInputCommandInteraction } from "discord.js";
import { ethers } from "ethers";
import { storage } from "../../storage";
import { getTokenData, getPriceData } from "../utils/dexscreener";
import { detectChain, getTokenTransactions } from "../utils/blockchain";
import { Chain } from "@shared/schema";

const erc20Abi = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

export async function handleAnalyzeCommand(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const walletAddress = interaction.options.getString("wallet", true);
    const tokenContract = interaction.options.getString("token", true);

    if (!ethers.isAddress(walletAddress) || !ethers.isAddress(tokenContract)) {
      await interaction.editReply("Invalid wallet address or token contract address");
      return;
    }

    const chain = await detectChain(tokenContract);
    if (!chain) {
      await interaction.editReply("Token not found on supported chains");
      return;
    }

    const tokenData = await getTokenData(tokenContract, chain);
    if (!tokenData) {
      await interaction.editReply("Failed to fetch token data");
      return;
    }

    const transactions = await getTokenTransactions(walletAddress, tokenContract, chain);
    const priceData = await getPriceData(tokenContract, chain);

    let totalReceived = 0;
    let totalSent = 0;
    let ethSpent = 0;
    let ethReceived = 0;

    for (const tx of transactions) {
      if (tx.type === "buy") {
        totalReceived += Number(tx.amount);
        ethSpent += Number(tx.amount) * Number(tx.priceUsd);
      } else {
        totalSent += Number(tx.amount);
        ethReceived += Number(tx.amount) * Number(tx.priceUsd);
      }
    }

    const currentBalance = totalReceived - totalSent;
    const realizedPnl = ethReceived - ethSpent;

    const response = {
      embeds: [{
        title: `Token Analysis for ${tokenData.symbol}`,
        description: `Wallet: ${walletAddress}\nToken: ${tokenContract}`,
        fields: [
          { name: "Chain", value: chain, inline: true },
          { name: "Current Price", value: `$${priceData.priceUsd.toFixed(4)}`, inline: true },
          { name: "Tokens Received", value: totalReceived.toFixed(4), inline: true },
          { name: "Tokens Sent", value: totalSent.toFixed(4), inline: true },
          { name: "Current Balance", value: currentBalance.toFixed(4), inline: true },
          { name: "USD Spent", value: `$${ethSpent.toFixed(2)}`, inline: true },
          { name: "USD Received", value: `$${ethReceived.toFixed(2)}`, inline: true },
          { name: "Realized P/L (USD)", value: `$${realizedPnl.toFixed(2)}`, inline: true }
        ],
        timestamp: new Date().toISOString()
      }]
    };

    await interaction.editReply(response);
  } catch (error) {
    console.error("Analysis error:", error);
    await interaction.editReply("Error analyzing wallet transactions");
  }
}