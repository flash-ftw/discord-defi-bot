import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from "discord.js";
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

    const embed = new EmbedBuilder()
      .setColor(0x5865F2) // Discord blurple color
      .setTitle('🎯 __Live Market Prices__')
      .setDescription('**Real-time cryptocurrency price tracking** 📊')
      .addFields(
        {
          name: '⟠ __Ethereum (ETH)__',
          value: [
            `**Price:** ${formatPrice(prices.ethereum.price)} 💎`,
            `**24h:** ${formatPriceChange(prices.ethereum.change24h)} 📊`
          ].join('\n'),
          inline: true
        },
        {
          name: '◎ __Solana (SOL)__',
          value: [
            `**Price:** ${formatPrice(prices.solana.price)} 💫`,
            `**24h:** ${formatPriceChange(prices.solana.change24h)} 📈`
          ].join('\n'),
          inline: true
        }
      )
      .setTimestamp()
      .setFooter({ 
        text: `Last Updated: ${prices.ethereum.lastUpdated.toLocaleTimeString()} | Powered by CoinGecko 🦎` 
      });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in status command:', error);
    await interaction.editReply('❌ An error occurred while fetching prices.');
  }
}