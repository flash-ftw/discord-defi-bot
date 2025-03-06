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
  const sign = value >= 0 ? '📈' : '📉';
  const color = value >= 0 ? '🟢' : '🔴';
  return `${sign} ${color} ${Math.abs(value).toFixed(2)}%`;
}

function formatUSD(value: number | undefined): string {
  if (value === undefined) return 'N/A';
  if (value >= 1000000000) {
    return `$${(value / 1000000000).toFixed(2)}B`;
  } else if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 6 })}`;
}

function formatTransactions(buys: number, sells: number): string {
  const ratio = buys / (sells || 1);
  const signal = ratio > 1.5 ? '🟢' : ratio < 0.67 ? '🔴' : '🟡';
  return `${buys.toLocaleString()} buys 📥 vs ${sells.toLocaleString()} sells 📤 ${signal}`;
}

function getChainEmoji(chain: string): string {
  switch(chain.toLowerCase()) {
    case 'ethereum': return '⟠';
    case 'base': return '🔵';
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
  return 0xFFFFFF; // White for neutral
}

function analyzeMarketSentiment(analysis: any): string[] {
  const signals = [];

  try {
    // Price momentum
    if (analysis.priceChange1h > 0 && analysis.priceChange24h > 0) {
      signals.push('🚀 Strong bullish momentum');
    } else if (analysis.priceChange1h < 0 && analysis.priceChange24h < 0) {
      signals.push('🐻 Bearish pressure');
    }

    // Volume analysis
    if (analysis.volume?.h24 > 0) {
      const hourlyVolume = (analysis.volume.h24 / 24);
      if (analysis.volume?.h1 > hourlyVolume * 1.5) {
        signals.push('📊 Above average volume');
      }
    }

    // Buy/Sell ratio analysis
    if (analysis.transactions) {
      const ratio = analysis.transactions.buys24h / (analysis.transactions.sells24h || 1);
      if (ratio > 1.5) signals.push('💫 Strong buying pressure');
      else if (ratio < 0.67) signals.push('⚠️ Heavy selling detected');
    }

    // Price differential analysis
    if (analysis.priceDifferential && analysis.priceDifferential.spreadPercent > 1) {
      signals.push(`💹 ${analysis.priceDifferential.spreadPercent.toFixed(2)}% arbitrage opportunity between ${analysis.priceDifferential.maxDex} and ${analysis.priceDifferential.minDex}`);
    }

    return signals.length > 0 ? signals : ['📊 Neutral market activity'];
  } catch (error) {
    console.error('Error in market sentiment analysis:', error);
    return ['📊 Unable to analyze market sentiment'];
  }
}

function validateTokenAddress(address: string): boolean {
  // Basic validation for EVM chains (0x followed by 40 hex chars)
  const evmPattern = /^0x[a-fA-F0-9]{40}$/;
  // Basic validation for Solana (base58 string between 32-44 chars)
  const solanaPattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

  return evmPattern.test(address) || solanaPattern.test(address);
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const tokenContract = interaction.options.getString('token', true);
    console.log(`Analyzing token contract: ${tokenContract}`);

    // Validate token address format
    if (!validateTokenAddress(tokenContract)) {
      await interaction.editReply('❌ Invalid token address format. Please verify the contract address.');
      return;
    }

    // Detect which chain the token is on
    const chain = await detectChain(tokenContract);
    if (!chain) {
      await interaction.editReply('❌ Token not found on any supported chain. Please verify the contract address is correct and the token exists on a supported chain (Ethereum, Base, Avalanche, or Solana).');
      return;
    }

    console.log(`Detected chain: ${chain}`);

    // Get detailed token analysis
    const analysis = await getTokenAnalysis(tokenContract, chain);
    if (!analysis) {
      await interaction.editReply('❌ Failed to fetch token analysis. The token might not have enough liquidity or trading activity.');
      return;
    }

    console.log(`Token analysis received:`, analysis);

    const sentiment = analyzeMarketSentiment(analysis);
    const chainEmoji = getChainEmoji(chain);
    const embedColor = getEmbedColor(analysis.priceChange24h);

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(`${chainEmoji} ${analysis.name} (${analysis.symbol})`)
      .setDescription(`Token Analysis on ${chain.charAt(0).toUpperCase() + chain.slice(1)}`)
      .addFields(
        { 
          name: '💰 Price Information',
          value: [
            `Current Price: ${formatUSD(analysis.priceUsd)}`,
            `24h Change: ${formatPercentage(analysis.priceChange24h)}`,
            `1h Change: ${formatPercentage(analysis.priceChange1h)}`
          ].join('\n'),
          inline: false
        },
        {
          name: '📊 Market Metrics',
          value: [
            `Market Cap: ${formatUSD(analysis.marketCap)}`,
            analysis.fdv ? `FDV: ${formatUSD(analysis.fdv)}` : null,
            `Volume (24h): ${formatUSD(analysis.volume?.h24)}`
          ].filter(Boolean).join('\n'),
          inline: true
        },
        {
          name: '💧 Liquidity Info',
          value: [
            `Current: ${formatUSD(analysis.liquidity?.usd)}`,
            analysis.liquidity?.change24h !== undefined ?
              `24h Change: ${formatPercentage(analysis.liquidity.change24h)}` : null
          ].filter(Boolean).join('\n'),
          inline: true
        },
        {
          name: '📈 Trading Activity',
          value: analysis.transactions ?
            formatTransactions(analysis.transactions.buys24h, analysis.transactions.sells24h) :
            'No transaction data available',
          inline: false
        },
        {
          name: '🎯 Market Sentiment',
          value: sentiment.join('\n'),
          inline: false
        }
      )
      .setTimestamp()
      .setFooter({ 
        text: `Contract: ${tokenContract.slice(0, 6)}...${tokenContract.slice(-4)}` 
      });

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error in analyze command:', error);
    let errorMessage = '❌ An error occurred while analyzing the token. ';

    if (error instanceof Error) {
      console.error('Detailed error:', error.message);
      console.error('Stack trace:', error.stack);
      errorMessage += 'Technical details have been logged for investigation.';
    } else {
      errorMessage += 'Please verify the token contract address and try again.';
    }

    await interaction.editReply(errorMessage);
  }
}