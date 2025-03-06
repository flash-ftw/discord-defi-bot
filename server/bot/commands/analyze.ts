import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { detectChain } from "../utils/blockchain";
import { getTokenData } from "../utils/dexscreener";

export const data = new SlashCommandBuilder()
  .setName('analyze')
  .setDescription('Analyze a token across supported chains')
  .addStringOption(option =>
    option
      .setName('token')
      .setDescription('Token contract address')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const tokenContract = interaction.options.getString('token', true);

    // Detect which chain the token is on
    const chain = await detectChain(tokenContract);
    if (!chain) {
      await interaction.editReply('❌ Token not found on any supported chain.');
      return;
    }

    // Get token data from DexScreener
    const tokenData = await getTokenData(tokenContract, chain);
    if (!tokenData) {
      await interaction.editReply('❌ Failed to fetch token data.');
      return;
    }

    await interaction.editReply({
      content: `**Token Analysis**\n` +
        `Chain: ${chain}\n` +
        `Name: ${tokenData.name}\n` +
        `Symbol: ${tokenData.symbol}\n` +
        `Current Price: $${tokenData.priceUsd.toFixed(6)}`
    });
  } catch (error) {
    console.error('Error in analyze command:', error);
    await interaction.editReply('❌ Error analyzing token. Please try again.');
  }
}