import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { detectChain } from "../utils/blockchain";
import { getTokenAnalysis } from "../utils/dexscreener";

export const data = new SlashCommandBuilder()
  .setName('analyze')
  .setDescription('Analyze a token\'s price, volume, and market metrics')
  .addStringOption(option =>
    option
      .setName('token')
      .setDescription('Token contract address')
      .setRequired(true)
  );

function formatPercentage(value: number): string {
  const sign = value >= 0 ? '📈' : '📉';
  return `${sign} ${value.toFixed(2)}%`;
}

function formatUSD(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 6 })}`;
}

function formatTransactions(buys: number, sells: number): string {
  return `${buys} buys 📥 | ${sells} sells 📤`;
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const tokenContract = interaction.options.getString('token', true);
    console.log(`Analyzing token contract: ${tokenContract}`);

    // Detect which chain the token is on
    const chain = await detectChain(tokenContract);
    if (!chain) {
      await interaction.editReply('❌ Token not found on any supported chain.');
      return;
    }

    console.log(`Detected chain: ${chain}`);

    // Get detailed token analysis
    const analysis = await getTokenAnalysis(tokenContract, chain);
    if (!analysis) {
      await interaction.editReply('❌ Failed to fetch token analysis.');
      return;
    }

    console.log(`Token analysis received:`, analysis);

    // Format response with detailed P&L analysis
    const response = [
      `**${analysis.name} (${analysis.symbol}) Analysis**`,
      `Chain: ${chain}`,
      `\n**Price Information**`,
      `Current Price: ${formatUSD(analysis.priceUsd)}`,
      `24h Change: ${formatPercentage(analysis.priceChange24h)}`,
      `1h Change: ${formatPercentage(analysis.priceChange1h)}`,
      `\n**Market Metrics**`,
      analysis.marketCap ? `Market Cap: ${formatUSD(analysis.marketCap)}` : null,
      analysis.fdv ? `Fully Diluted Value: ${formatUSD(analysis.fdv)}` : null,
      `\n**Trading Activity (24h)**`,
      `Volume: ${formatUSD(analysis.volume.h24 || 0)}`,
      analysis.transactions ? 
        `Transactions: ${formatTransactions(analysis.transactions.buys24h, analysis.transactions.sells24h)}` : null,
      `\n**Liquidity Info**`,
      `Current Liquidity: ${formatUSD(analysis.liquidity.usd || 0)}`,
      `Liquidity Change (24h): ${formatPercentage(analysis.liquidity.change24h || 0)}`,
      `\n**Historical Prices**`,
      `All-Time High: ${formatUSD(analysis.priceMax)}`,
      `All-Time Low: ${formatUSD(analysis.priceMin)}`,
    ].filter(Boolean).join('\n');

    await interaction.editReply({
      content: response
    });

  } catch (error) {
    console.error('Error in analyze command:', error);
    await interaction.editReply('❌ An error occurred while analyzing the token.');
  }
}