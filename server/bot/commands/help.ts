import { ChatInputCommandInteraction } from "discord.js";

export async function handleHelpCommand(interaction: ChatInputCommandInteraction) {
  const helpEmbed = {
    title: "Token Analysis Bot Help",
    description: "Commands and usage information",
    fields: [
      {
        name: "/analyze",
        value: "Analyzes token transactions for a specific wallet address\nUse: `/analyze wallet:<address> token:<contract>`",
      },
      {
        name: "Example",
        value: "/analyze wallet:0x28c6c06298d514db089934071355e5743bf21d60 token:0xdAC17F958D2ee523a2206206994597C13D831ec7",
      },
      {
        name: "Common Token Addresses",
        value: `USDT (Ethereum): 0xdAC17F958D2ee523a2206206994597C13D831ec7
LINK (Ethereum): 0x514910771AF9Ca656af840dff83E8264EcF986CA
UNI (Ethereum): 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984
USDC (Base): 0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb
USDT.e (Avalanche): 0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E`
      }
    ],
    footer: {
      text: "Supports Ethereum, Base, and Avalanche chains"
    }
  };

  await interaction.reply({ embeds: [helpEmbed] });
}