import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Shows available commands and usage information');

export async function execute(interaction: ChatInputCommandInteraction) {
  const helpMessage = `
**Token Analysis Bot Commands**

/analyze <token_address>
- Analyzes a token across supported chains (Ethereum, Base, Avalanche, Solana)
- Provides detailed market analysis including:
  • Current price and 24h/1h changes
  • Trading volume and liquidity metrics
  • Price history (ATH/ATL)
- Examples: 
  • ETH Token: /analyze 0x...
  • Solana Token: /analyze DezX...

/help
- Shows this help message

**Supported Chains**
• Ethereum (ETH)
• Base
• Avalanche (AVAX)
• Solana (SOL)
`;

  await interaction.reply({ content: helpMessage });
}