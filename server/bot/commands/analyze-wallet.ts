import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { detectChain, analyzePnL } from "../utils/blockchain";

export const data = new SlashCommandBuilder()
  .setName('wallet')
  .setDescription('Analyze token P&L for a wallet address')
  .addStringOption(option =>
    option
      .setName('wallet')
      .setDescription('Wallet address to analyze')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('token')
      .setDescription('Token contract address')
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

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const walletAddress = interaction.options.getString('wallet', true);
    const tokenContract = interaction.options.getString('token', true);

    // Detect which chain the token is on
    const chain = await detectChain(tokenContract);
    if (!chain) {
      await interaction.editReply('❌ Token not found on any supported chain.');
      return;
    }

    console.log(`Analyzing wallet ${walletAddress} for token ${tokenContract} on ${chain}`);

    // Get P&L analysis
    const analysis = await analyzePnL(walletAddress, tokenContract, chain);
    if (!analysis) {
      await interaction.editReply('❌ No transaction data found for this wallet and token.');
      return;
    }

    // Calculate percentages
    const totalPnLPercent = ((analysis.realizedPnL + analysis.unrealizedPnL) / 
      (analysis.totalBought * analysis.averageBuyPrice)) * 100;

    const response = [
      `**Wallet P&L Analysis for ${chain}**`,
      `\n**Transaction Summary**`,
      `Total Bought: ${analysis.totalBought.toLocaleString()} tokens at avg. ${formatUSD(analysis.averageBuyPrice)}`,
      `Total Sold: ${analysis.totalSold.toLocaleString()} tokens at avg. ${formatUSD(analysis.averageSellPrice)}`,
      `Current Holdings: ${analysis.currentHoldings.toLocaleString()} tokens`,
      `\n**Profit/Loss Analysis**`,
      `Current Price: ${formatUSD(analysis.currentPrice)}`,
      `Realized P&L: ${formatUSD(analysis.realizedPnL)}`,
      `Unrealized P&L: ${formatUSD(analysis.unrealizedPnL)}`,
      `Total P&L: ${formatUSD(analysis.realizedPnL + analysis.unrealizedPnL)} (${formatPercentage(totalPnLPercent)})`
    ].join('\n');

    await interaction.editReply({ content: response });

  } catch (error) {
    console.error('Error in wallet analyze command:', error);
    await interaction.editReply('❌ An error occurred while analyzing the wallet.');
  }
}
