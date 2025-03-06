import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { detectChain, analyzePnL } from "../utils/blockchain";
import { getTokenAnalysis } from "../utils/dexscreener";

export const data = new SlashCommandBuilder()
  .setName('wallet')
  .setDescription('Analyze token P&L for a wallet address')
  .addStringOption(option =>
    option
      .setName('wallet')
      .setDescription('Wallet address to analyze (e.g., 0x28c6c06298d514db089934071355e5743bf21d60)')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('token')
      .setDescription('Token contract address (e.g., USDT: 0xdac17f958d2ee523a2206206994597c13d831ec7)')
      .setRequired(true)
  );

function formatUSD(value: number): string {
  return `\`$${value.toLocaleString(undefined, { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 6 
  })}\``;
}

function formatPercentage(value: number): string {
  const sign = value >= 0 ? '🚀' : '🔻';
  const color = value >= 0 ? '💚' : '❤️';
  return `${sign} ${color} \`${Math.abs(value).toFixed(2)}%\``;
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

function getEmbedColor(pnlPercent: number): number {
  if (pnlPercent > 20) return 0x00ff00; // Strong green
  if (pnlPercent > 0) return 0x90EE90; // Light green
  if (pnlPercent < -20) return 0xff0000; // Strong red
  if (pnlPercent < 0) return 0xFFCCCB; // Light red
  return 0x5865F2; // Discord blurple for neutral
}

function validateAddresses(walletAddress: string, tokenContract: string): boolean {
  const evmPattern = /^0x[a-fA-F0-9]{40}$/;
  const solanaPattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

  const isValidWallet = evmPattern.test(walletAddress) || solanaPattern.test(walletAddress);
  const isValidToken = evmPattern.test(tokenContract) || solanaPattern.test(tokenContract);

  return isValidWallet && isValidToken;
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const walletAddress = interaction.options.getString('wallet', true);
    const tokenContract = interaction.options.getString('token', true);

    if (!validateAddresses(walletAddress, tokenContract)) {
      await interaction.editReply('❌ Invalid wallet or token address format. Please verify both addresses.');
      return;
    }

    const chain = await detectChain(tokenContract);
    if (!chain) {
      await interaction.editReply('❌ Token not found on any supported chain. Please verify the contract address is correct and the token exists on a supported chain (Ethereum, Base, Avalanche, or Solana).');
      return;
    }

    console.log(`Analyzing wallet ${walletAddress} for token ${tokenContract} on ${chain}`);

    const tokenInfo = await getTokenAnalysis(tokenContract, chain);
    if (!tokenInfo) {
      await interaction.editReply('❌ Could not fetch token information. The token might not exist or have enough liquidity.');
      return;
    }

    const analysis = await analyzePnL(walletAddress, tokenContract, chain);
    if (!analysis) {
      await interaction.editReply('❌ No transaction data found for this wallet and token. The wallet might not have any history with this token, or the token might be too new.');
      return;
    }

    const totalInvestment = analysis.totalBought * analysis.averageBuyPrice;
    const totalPnLPercent = totalInvestment > 0 ? 
      ((analysis.realizedPnL + analysis.unrealizedPnL) / totalInvestment) * 100 : 0;

    const chainEmoji = getChainEmoji(chain);
    const embedColor = getEmbedColor(totalPnLPercent);

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(`${chainEmoji} ${tokenInfo.name} (${tokenInfo.symbol}) Wallet Analysis`)
      .setDescription(`**Analyzing trades on ${chain.charAt(0).toUpperCase() + chain.slice(1)}** 🔍`)
      .addFields(
        {
          name: '💰 __Token Information__',
          value: `**Current Price:** ${formatUSD(tokenInfo.priceUsd)} 📊`,
          inline: false
        },
        {
          name: '📊 __Transaction Summary__',
          value: [
            `**Buy Orders:** \`${analysis.buyCount}\` trades 📥`,
            `**Sell Orders:** \`${analysis.sellCount}\` trades 📤`
          ].join('\n'),
          inline: true
        },
        {
          name: '💼 __Position Details__',
          value: [
            `**Total Bought:** \`${analysis.totalBought.toLocaleString()}\` tokens 🔄`,
            `**Avg Buy Price:** ${formatUSD(analysis.averageBuyPrice)} 💸`,
            `**Total Sold:** \`${analysis.totalSold.toLocaleString()}\` tokens 🔄`,
            `**Avg Sell Price:** ${formatUSD(analysis.averageSellPrice)} 💰`,
            `**Current Holdings:** \`${analysis.currentHoldings.toLocaleString()}\` tokens 💎`
          ].join('\n'),
          inline: false
        },
        {
          name: '📈 __Profit/Loss Analysis__',
          value: [
            `**Realized P&L:** ${formatUSD(analysis.realizedPnL)} 💫`,
            `**Unrealized P&L:** ${formatUSD(analysis.unrealizedPnL)} 📊`,
            `**Total P&L:** ${formatUSD(analysis.realizedPnL + analysis.unrealizedPnL)} 🎯`,
            `**ROI:** ${formatPercentage(totalPnLPercent)} ✨`
          ].join('\n'),
          inline: false
        }
      )
      .setTimestamp()
      .setFooter({ 
        text: `Wallet: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} | Powered by DexScreener` 
      });

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error in wallet analyze command:', error);
    let errorMessage = '❌ An error occurred while analyzing the wallet. ';

    if (error instanceof Error) {
      console.error('Detailed error:', error.message);
      console.error('Stack trace:', error.stack);
      errorMessage += '*Technical details have been logged for investigation.*';
    } else {
      errorMessage += '*Please verify both addresses and try again.*';
    }

    await interaction.editReply(errorMessage);
  }
}