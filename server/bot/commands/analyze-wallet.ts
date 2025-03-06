import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { detectChain, analyzePnL } from "../utils/blockchain";

export const data = new SlashCommandBuilder()
  .setName('wallet')
  .setDescription('Analyze token P&L for a wallet address')
  .addStringOption(option =>
    option
      .setName('wallet')
      .setDescription('Wallet address to analyze (e.g., 0x28c6c06298d514db089934071355e5743bf21d60)')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('token')
      .setDescription('Token contract address (e.g., USDT: 0xdac17f958d2ee523a2206206994597c13d831ec7)')
      .setRequired(true)
  );

function formatUSD(value: number): string {
  return `$${value.toLocaleString(undefined, { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 6 
  })}`;
}

function formatPercentage(value: number): string {
  const sign = value >= 0 ? '📈' : '📉';
  return `${sign} ${value.toFixed(2)}%`;
}

function validateAddresses(walletAddress: string, tokenContract: string): boolean {
  // Basic validation for EVM addresses
  const evmPattern = /^0x[a-fA-F0-9]{40}$/;
  // Basic validation for Solana addresses
  const solanaPattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

  const isValidWallet = evmPattern.test(walletAddress) || solanaPattern.test(walletAddress);
  const isValidToken = evmPattern.test(tokenContract) || solanaPattern.test(tokenContract);

  return isValidWallet && isValidToken;
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const walletAddress = interaction.options.getString('wallet', true);
    const tokenContract = interaction.options.getString('token', true);

    // Validate address formats
    if (!validateAddresses(walletAddress, tokenContract)) {
      await interaction.editReply('❌ Invalid wallet or token address format. Please verify both addresses.');
      return;
    }

    // Detect which chain the token is on
    const chain = await detectChain(tokenContract);
    if (!chain) {
      await interaction.editReply('❌ Token not found on any supported chain. Please verify the contract address is correct and the token exists on a supported chain (Ethereum, Base, Avalanche, or Solana).');
      return;
    }

    console.log(`Analyzing wallet ${walletAddress} for token ${tokenContract} on ${chain}`);

    // Get P&L analysis
    const analysis = await analyzePnL(walletAddress, tokenContract, chain);
    if (!analysis) {
      await interaction.editReply('❌ No transaction data found for this wallet and token. The wallet might not have any history with this token, or the token might be too new.');
      return;
    }

    // Calculate percentages
    const totalInvestment = analysis.totalBought * analysis.averageBuyPrice;
    const totalPnLPercent = totalInvestment > 0 ? 
      ((analysis.realizedPnL + analysis.unrealizedPnL) / totalInvestment) * 100 : 0;

    const response = [
      `**Wallet Analysis for ${chain}**`,
      `\n**Transaction Summary**`,
      `🔄 Total Buy Transactions: ${analysis.buyCount} trades`,
      `🔄 Total Sell Transactions: ${analysis.sellCount} trades`,
      `\n**Position Details**`,
      `💰 Total Bought: ${analysis.totalBought.toLocaleString()} tokens at avg. ${formatUSD(analysis.averageBuyPrice)}`,
      `💰 Total Sold: ${analysis.totalSold.toLocaleString()} tokens at avg. ${formatUSD(analysis.averageSellPrice)}`,
      `💼 Current Holdings: ${analysis.currentHoldings.toLocaleString()} tokens`,
      `\n**Profit/Loss Analysis**`,
      `Current Price: ${formatUSD(analysis.currentPrice)}`,
      `📊 Realized P&L: ${formatUSD(analysis.realizedPnL)}`,
      `📈 Unrealized P&L: ${formatUSD(analysis.unrealizedPnL)}`,
      `💫 Total P&L: ${formatUSD(analysis.realizedPnL + analysis.unrealizedPnL)} (${formatPercentage(totalPnLPercent)})`
    ].join('\n');

    await interaction.editReply({ content: response });

  } catch (error) {
    console.error('Error in wallet analyze command:', error);
    let errorMessage = '❌ An error occurred while analyzing the wallet. ';

    if (error instanceof Error) {
      console.error('Detailed error:', error.message);
      console.error('Stack trace:', error.stack);
      errorMessage += 'Technical details have been logged for investigation.';
    } else {
      errorMessage += 'Please verify both addresses and try again.';
    }

    await interaction.editReply(errorMessage);
  }
}