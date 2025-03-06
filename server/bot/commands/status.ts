import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { getTokenPrices, formatPrice, formatPriceChange } from "../utils/price-tracker";
import { getTokenAnalysis } from "../utils/dexscreener";

export const data = new SlashCommandBuilder()
  .setName('market')
  .setDescription('Show market overview, trending tokens, and volume leaders');

function formatVolume(value: number | undefined): string {
  if (!value) return '`N/A`';
  if (value >= 1000000000) {
    return `\`$${(value / 1000000000).toFixed(2)}B\``;
  }
  return `\`$${(value / 1000000).toFixed(2)}M\``;
}

async function getTrendingTokens(): Promise<string[]> {
  // Placeholder for trending tokens - will be enhanced with real data
  const trendingTokens = [
    '🥇 **[ETH](https://www.coingecko.com/en/coins/ethereum)** ⟠ `$2,213` (+5.2%)',
    '🥈 **[SOL](https://www.coingecko.com/en/coins/solana)** ◎ `$144.1` (+3.8%)',
    '🥉 **[AVAX](https://www.coingecko.com/en/coins/avalanche)** 🔺 `$35.4` (+2.1%)',
    '4️⃣ **[BNB](https://www.coingecko.com/en/coins/binance-coin)** 💛 `$382` (+1.8%)',
    '5️⃣ **[LINK](https://www.coingecko.com/en/coins/chainlink)** 🔗 `$18.45` (+4.2%)'
  ];
  return trendingTokens;
}

async function getVolumeLeaders(): Promise<{
  h24: string[];
  h1: string[];
  m10: string[];
}> {
  // Placeholder for volume leaders - will be enhanced with real data
  return {
    h24: [
      '🥇 **[ETH](https://www.coingecko.com/en/coins/ethereum)** `$25.1B`',
      '🥈 **[BNB](https://www.coingecko.com/en/coins/binance-coin)** `$12.3B`',
      '🥉 **[SOL](https://www.coingecko.com/en/coins/solana)** `$8.5B`'
    ],
    h1: [
      '🥇 **[ETH](https://www.coingecko.com/en/coins/ethereum)** `$1.2B`',
      '🥈 **[SOL](https://www.coingecko.com/en/coins/solana)** `$425M`',
      '🥉 **[AVAX](https://www.coingecko.com/en/coins/avalanche)** `$310M`'
    ],
    m10: [
      '🥇 **[ETH](https://www.coingecko.com/en/coins/ethereum)** `$180M`',
      '🥈 **[SOL](https://www.coingecko.com/en/coins/solana)** `$85M`'
    ]
  };
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const [prices, trendingTokens, volumeLeaders] = await Promise.all([
      getTokenPrices(),
      getTrendingTokens(),
      getVolumeLeaders()
    ]);

    if (!prices.ethereum || !prices.solana) {
      await interaction.editReply('❌ Failed to fetch current prices. Please try again later.');
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865F2) // Discord blurple color
      .setTitle('🎯 __Market Overview__')
      .setDescription('**Real-time cryptocurrency market analysis** 📊')
      .setThumbnail('attachment://TBD_logo-removebg-preview.png')
      .addFields(
        {
          name: '🔥 __Trending Tokens__',
          value: trendingTokens.join('\n'),
          inline: false
        },
        {
          name: '📊 __24h Volume Leaders__',
          value: volumeLeaders.h24.join('\n'),
          inline: true
        },
        {
          name: '⚡ __1h Volume Leaders__',
          value: volumeLeaders.h1.join('\n'),
          inline: true
        },
        {
          name: '🔄 __10min Volume Leaders__',
          value: volumeLeaders.m10.join('\n'),
          inline: false
        }
      )
      .setTimestamp()
      .setFooter({ 
        text: `Powered by chefs for the cooks 👨‍🍳` 
      });

    await interaction.editReply({ 
      embeds: [embed],
      files: [{
        attachment: './attached_assets/TBD_logo-removebg-preview.png',
        name: 'TBD_logo-removebg-preview.png'
      }]
    });
  } catch (error) {
    console.error('Error in market command:', error);
    await interaction.editReply('❌ An error occurred while fetching market data.');
  }
}