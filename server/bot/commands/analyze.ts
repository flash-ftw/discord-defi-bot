import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { detectChain } from "../utils/blockchain";
import { getTokenAnalysis } from "../utils/dexscreener";

export const data = new SlashCommandBuilder()
  .setName('analyze')
  .setDescription('Analyze a token\'s price, volume, and market metrics')
  .addStringOption(option =>
    option
      .setName('token')
      .setDescription('Token contract address to analyze (e.g., USDT: 0xdac17f958d2ee523a2206206994597c13d831ec7)')
      .setRequired(true)
  );

function formatPercentage(value: number): string {
  const sign = value >= 0 ? '🚀' : '🔻';
  const color = value >= 0 ? '💚' : '❤️';
  return `${sign} ${color} \`${Math.abs(value).toFixed(2)}%\``;
}

function formatUSD(value: number | undefined): string {
  if (value === undefined) return '`N/A`';
  if (value >= 1000000000) {
    return `\`$${(value / 1000000000).toFixed(2)}B\``;
  } else if (value >= 1000000) {
    return `\`$${(value / 1000000).toFixed(2)}M\``;
  }
  return `\`$${value.toLocaleString(undefined, { maximumFractionDigits: 6 })}\``;
}

function formatTransactions(buys: number, sells: number): string {
  const ratio = buys / (sells || 1);
  const signal = ratio > 1.5 ? '💫' : ratio < 0.67 ? '⚠️' : '⚖️';
  return `${signal} \`${buys.toLocaleString()}\` buys 📥 vs \`${sells.toLocaleString()}\` sells 📤`;
}

function getChainEmoji(chain: string): string {
  switch(chain.toLowerCase()) {
    case 'ethereum': return '⟠';
    case 'base': return '🔷';
    case 'avalanche': return '🔺';
    case 'solana': return '◎';
    default: return '🔗';
  }
}

function getEmbedColor(priceChange24h: number): number {
  if (priceChange24h > 5) return 0x00ff00; // Strong green
  if (priceChange24h > 0) return 0x90EE90; // Light green
  if (priceChange24h < -5) return 0xff0000; // Strong red
  if (priceChange24h < 0) return 0xFFCCCB; // Light red
  return 0x5865F2; // Discord blurple for neutral
}

function analyzeMarketSentiment(analysis: any): string {
  try {
    let sentimentScore = 5; // Start with neutral (5 green, 5 red)
    
    // Price momentum impact (-3 to +3)
    if (analysis.priceChange1h > 0 && analysis.priceChange24h > 0) {
      sentimentScore += Math.min(3, Math.floor((analysis.priceChange24h + analysis.priceChange1h) / 5));
    } else if (analysis.priceChange1h < 0 && analysis.priceChange24h < 0) {
      sentimentScore -= Math.min(3, Math.floor(Math.abs(analysis.priceChange24h + analysis.priceChange1h) / 5));
    }

    // Volume impact (-2 to +2)
    if (analysis.volume?.h24 > 0) {
      const hourlyVolume = (analysis.volume.h24 / 24);
      if (analysis.volume?.h1 > hourlyVolume * 1.5) {
        sentimentScore += 2;
      } else if (analysis.volume?.h1 < hourlyVolume * 0.5) {
        sentimentScore -= 2;
      }
    }

    // Clamp score between 0 and 10
    sentimentScore = Math.max(0, Math.min(10, sentimentScore));
    
    // Generate emoji boxes
    const greenBoxes = '🟩'.repeat(sentimentScore);
    const redBoxes = '🟥'.repeat(10 - sentimentScore);
    
    return `${greenBoxes}${redBoxes}`;
  } catch (error) {
    console.error('Error in market sentiment analysis:', error);
    return '🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨'; // Yellow boxes for error state
  }
}

function validateTokenAddress(address: string): boolean {
  const evmPattern = /^0x[a-fA-F0-9]{40}$/;
  const solanaPattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return evmPattern.test(address) || solanaPattern.test(address);
}

export function createTokenEmbed(analysis: any, tokenContract: string, chain: string): EmbedBuilder {
  const sentiment = analyzeMarketSentiment(analysis);
  const chainEmoji = getChainEmoji(chain);
  const embedColor = getEmbedColor(analysis.priceChange24h);

  const securityStatus = {
    liquidityLocked: analysis.securityStatus?.liquidityLocked || false, 
    mintable: analysis.securityStatus?.mintable || false 
  };

  // Format holders info with emojis and better spacing
  const holdersInfo = analysis.holders ? 
    analysis.holders.slice(0, 5).map((holder: any, index: number) => 
      `${['👑', '🥈', '🥉', '💎', '💫'][index]} \`${holder.percentage.toFixed(2)}%\``
    ).join('\n') :
    '*Holder data not available* ⚠️';

  // Create quick stats line with more compact format
  const quickStats = [
    `💰 \`$${analysis.priceUsd?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}\``,
    `💧 \`$${analysis.liquidity?.usd?.toLocaleString() || '0'}\``,
    `📊 Vol: ${formatUSD(analysis.volume?.h24)}`
  ].join(' │ ');

  // Format market metrics with better alignment and more data
  const marketMetrics = [
    `**Market Cap:** ${formatUSD(analysis.marketCap)}`,
    `**Volume (24h):** ${formatUSD(analysis.volume?.h24)}`,
    `**FDV:** ${formatUSD(analysis.fdv)}`,
    `**Token Age:** ${analysis.age || 'Unknown'}`
  ].filter(Boolean);

  // Enhanced security status with more detailed indicators
  const securityIndicators = [
    `${securityStatus.liquidityLocked ? '🔒 **SAFU:**' : '🔓 **RISK:**'} ${securityStatus.liquidityLocked ? 'Liquidity Locked' : 'Unlocked Liquidity'}`,
    `${securityStatus.mintable ? '⚠️ **CAUTION:**' : '✅ **SAFE:**'} ${securityStatus.mintable ? 'Mintable Token' : 'Non-Mintable'}`
  ];

  // Format price change with emoji and color
  const priceChangeEmoji = analysis.priceChange1h > 0 ? '🚀 💚' : '🔻 ❤️';
  const priceChangeText = `${priceChangeEmoji} ${analysis.priceChange1h?.toFixed(2)}%`;

  return new EmbedBuilder()
    .setColor(embedColor)
    .setTitle(`${chainEmoji} ${analysis.name} (${analysis.symbol})`)
    .setDescription(
      `**Token Analysis on ${chain.charAt(0).toUpperCase() + chain.slice(1)}** 🔍\n` +
      `\`${tokenContract}\`\n\n` +
      `${quickStats}\n\n` +
      `**Market Sentiment:**\n${sentiment}`
    )
    .setThumbnail(analysis.logo)
    .addFields(
      { 
        name: '📊 __Price Analysis__',
        value: [
          `**Current:** ${formatUSD(analysis.priceUsd)}`,
          `**1h Change:** ${priceChangeText}`,
          `**ATH:** ${formatUSD(analysis.ath)} ${analysis.athDate ? `(${analysis.athDate})` : '(Unknown)'}`
        ].join('\n'),
        inline: true
      },
      {
        name: '💰 __Market Data__',
        value: marketMetrics.join('\n'),
        inline: true
      },
      {
        name: '\u200b',
        value: '\u200b',
        inline: true
      },
      {
        name: '🏆 __Top Holders__',
        value: holdersInfo,
        inline: true
      },
      {
        name: '🛡️ __Security Check__',
        value: securityIndicators.join('\n'),
        inline: true
      },
      {
        name: '\u200b',
        value: '\u200b',
        inline: true
      },
      {
        name: '🔗 __Quick Links__',
        value: [
          `[📊 Chart](${analysis.dexscreenerUrl}) • [🐦 Twitter](${analysis.twitter}) • [🔍 Similar Logos](${analysis.googleLensUrl})`,
          `[🔎 Token Explorer](https://x.com/search?q=${tokenContract}&src=typed_query)`
        ].join('\n'),
        inline: false
      }
    )
    .setTimestamp()
    .setFooter({ 
      text: `Powered by DeFi Analytics • Real-time market data`,
      iconURL: 'https://i.imgur.com/AfFp7pu.png'
    });
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const tokenContract = interaction.options.getString('token', true);
    console.log(`Analyzing token contract: ${tokenContract}`);

    if (!validateTokenAddress(tokenContract)) {
      await interaction.editReply('❌ Invalid token address format. Please verify the contract address.');
      return;
    }

    const chain = await detectChain(tokenContract);
    if (!chain) {
      await interaction.editReply('❌ Token not found on any supported chain. Please verify the contract address is correct and the token exists on a supported chain (Ethereum, Base, Avalanche, or Solana).');
      return;
    }

    const analysis = await getTokenAnalysis(tokenContract, chain);
    if (!analysis) {
      await interaction.editReply('❌ Failed to fetch token analysis. The token might not have enough liquidity or trading activity.');
      return;
    }

    const embed = createTokenEmbed(analysis, tokenContract, chain);
    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error in analyze command:', error);
    let errorMessage = '❌ An error occurred while analyzing the token. ';

    if (error instanceof Error) {
      console.error('Detailed error:', error.message);
      console.error('Stack trace:', error.stack);
      errorMessage += '*Technical details have been logged for investigation.*';
    } else {
      errorMessage += '*Please verify the token contract address and try again.*';
    }

    await interaction.editReply(errorMessage);
  }
}
