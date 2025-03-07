import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Shows available commands and usage information');

export async function execute(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2) // Discord blurple color
    .setTitle('🤖 __Crypto Analytics Bot Commands__')
    .setDescription('**Your personal crypto market assistant** 🎯')
    .addFields(
      {
        name: '📊 /analyze <token_address>',
        value: [
          '**Real-time token analysis across supported chains:**',
          '• 💰 Current price and market metrics',
          '• 📈 24h/1h price changes with sentiment',
          '• 💧 Liquidity analysis and security checks',
          '• 👥 Top holders and trading activity',
          '',
          '**Example:** `/analyze 0xdac17f958d2ee523a2206206994597c13d831ec7`'
        ].join('\n'),
        inline: false
      },
      {
        name: '💼 /wallet <wallet_address> <token_address>',
        value: [
          '**Detailed wallet performance analysis:**',
          '• 📊 Complete transaction history',
          '• 💰 Realized and unrealized P&L tracking',
          '• 📈 ROI calculations and metrics',
          '• 💎 Current holdings analysis',
          '',
          '**Example:** `/wallet 0x28c6c06298d514db089934071355e5743bf21d60 0xdac17f958d2ee523a2206206994597c13d831ec7`'
        ].join('\n'),
        inline: false
      },
      {
        name: '📈 /market',
        value: [
          '**Live market overview:**',
          '• 🔥 Top 5 trending tokens',
          '• 📊 Volume leaders (24h/1h/10min)',
          '• 🎯 Real-time price tracking',
          '',
          '*Data auto-updates every minute*'
        ].join('\n'),
        inline: false
      },
      {
        name: '🔗 __Supported Chains__',
        value: [
          '• ⟠ **Ethereum** (ETH)',
          '• 🔷 **Base**',
          '• 🔺 **Avalanche** (AVAX)',
          '• ◎ **Solana** (SOL)'
        ].join('\n'),
        inline: false
      }
    )
    .setFooter({ 
      text: 'Made with 💜 by the cooks | Real-time DeFi analytics' 
    });

  await interaction.reply({ embeds: [embed] });
}