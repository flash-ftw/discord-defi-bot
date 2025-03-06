import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Shows available commands and usage');

export async function execute(interaction: ChatInputCommandInteraction) {
  const helpText = `
**Available Commands**

/analyze <token_address>
- Analyzes a token across supported chains
- Shows current price and basic token information
- Example: /analyze 0x...

/help
- Shows this help message
`;

  await interaction.reply({ content: helpText });
}
