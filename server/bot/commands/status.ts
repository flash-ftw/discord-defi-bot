import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { getTokenPrices, formatPrice, formatPriceChange } from "../utils/price-tracker";

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Show current prices for ETH and SOL');

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const prices = await getTokenPrices();
    
    if (!prices.ethereum || !prices.solana) {
      await interaction.editReply('❌ Failed to fetch current prices. Please try again later.');
      return;
    }

    const response = [
      '**Live Market Prices**',
      '',
      '**Ethereum (ETH)**',
      `Price: ${formatPrice(prices.ethereum.price)}`,
      `24h Change: ${formatPriceChange(prices.ethereum.change24h)}`,
      '',
      '**Solana (SOL)**',
      `Price: ${formatPrice(prices.solana.price)}`,
      `24h Change: ${formatPriceChange(prices.solana.change24h)}`,
      '',
      `*Last Updated: ${prices.ethereum.lastUpdated.toLocaleTimeString()}*`
    ].join('\n');

    await interaction.editReply(response);
  } catch (error) {
    console.error('Error in status command:', error);
    await interaction.editReply('❌ An error occurred while fetching prices.');
  }
}
