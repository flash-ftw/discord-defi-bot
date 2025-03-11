import axios from 'axios';
import NodeCache from 'node-cache';

const DEXSCREENER_API = "https://api.dexscreener.com/latest";
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache

// Add validation thresholds
const VALIDATION_THRESHOLDS = {
  MIN_PRICE: 0.00000001,
  MAX_PRICE: 1000000,
  MIN_LIQUIDITY: 100,
  MIN_VOLUME: 10,
  MIN_HOLDERS: 1,
  MAX_HOLDERS: 1000000,
  MIN_PERCENTAGE: 0,
  MAX_PERCENTAGE: 100,
  MIN_TIMESTAMP: 0,
  MAX_TIMESTAMP: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year in future
  MIN_TRADES: 1,
  MAX_TRADES: 1000000,
  MIN_MCAP: 1000,
  MAX_MCAP: 1000000000000,
  SUSPICIOUS_VOLUME_LIQUIDITY_RATIO: 50, // 50x V/L ratio is suspicious
  SUSPICIOUS_BUY_SELL_RATIO: 5, // 5:1 ratio is suspicious
  HIGH_PRICE_IMPACT: 10, // 10% price impact is high
  CRITICAL_PRICE_IMPACT: 25 // 25% price impact is critical
};

// Add time format thresholds
const TIME_THRESHOLDS = {
  MINUTE: 60,
  HOUR: 60 * 60,
  DAY: 24 * 60 * 60,
  WEEK: 7 * 24 * 60 * 60,
  MONTH: 30 * 24 * 60 * 60,
  YEAR: 365 * 24 * 60 * 60
};

// Add security risk levels
const SECURITY_LEVELS = {
  HIGH_RISK: '🔴',
  MEDIUM_RISK: '🟡',
  LOW_RISK: '🟢',
  UNKNOWN: '⚪'
};

// Add chain icons
const CHAIN_ICONS = {
  ethereum: 'Ξ',
  bsc: 'BNB',
  polygon: 'MATIC',
  arbitrum: 'ARB',
  optimism: 'OP',
  solana: '◎',
  default: '🌐'
};

function validatePrice(price) {
  return price >= VALIDATION_THRESHOLDS.MIN_PRICE && 
         price <= VALIDATION_THRESHOLDS.MAX_PRICE && 
         !isNaN(price) && 
         isFinite(price);
}

function validateTimestamp(timestamp) {
  return timestamp >= VALIDATION_THRESHOLDS.MIN_TIMESTAMP && 
         timestamp <= VALIDATION_THRESHOLDS.MAX_TIMESTAMP;
}

function validatePercentage(percentage) {
  return percentage >= VALIDATION_THRESHOLDS.MIN_PERCENTAGE && 
         percentage <= VALIDATION_THRESHOLDS.MAX_PERCENTAGE;
}

function formatTimeAgo(timestamp) {
  const date = new Date(timestamp);
  if (!validateTimestamp(date.getTime())) {
    console.log(`Invalid timestamp: ${timestamp}`);
    return 'Unknown';
  }

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < TIME_THRESHOLDS.MINUTE) {
    return `${diffInSeconds}s ago`;
  }
  if (diffInSeconds < TIME_THRESHOLDS.HOUR) {
    const minutes = Math.floor(diffInSeconds / TIME_THRESHOLDS.MINUTE);
    return `${minutes}m ago`;
  }
  if (diffInSeconds < TIME_THRESHOLDS.DAY) {
    const hours = Math.floor(diffInSeconds / TIME_THRESHOLDS.HOUR);
    return `${hours}h ago`;
  }
  if (diffInSeconds < TIME_THRESHOLDS.WEEK) {
    const days = Math.floor(diffInSeconds / TIME_THRESHOLDS.DAY);
    return `${days}d ago`;
  }
  if (diffInSeconds < TIME_THRESHOLDS.MONTH) {
    const weeks = Math.floor(diffInSeconds / TIME_THRESHOLDS.WEEK);
    return `${weeks}w ago`;
  }
  if (diffInSeconds < TIME_THRESHOLDS.YEAR) {
    const months = Math.floor(diffInSeconds / TIME_THRESHOLDS.MONTH);
    return `${months}mo ago`;
  }
  const years = Math.floor(diffInSeconds / TIME_THRESHOLDS.YEAR);
  const remainingMonths = Math.floor((diffInSeconds % TIME_THRESHOLDS.YEAR) / TIME_THRESHOLDS.MONTH);
  return `${years}y${remainingMonths > 0 ? ` ${remainingMonths}mo` : ''} ago`;
}

function formatTimeDifference(seconds) {
  if (seconds < TIME_THRESHOLDS.MINUTE) {
    return `${seconds}s`;
  } else if (seconds < TIME_THRESHOLDS.HOUR) {
    const minutes = Math.floor(seconds / TIME_THRESHOLDS.MINUTE);
    return `${minutes}m`;
  } else if (seconds < TIME_THRESHOLDS.DAY) {
    const hours = Math.floor(seconds / TIME_THRESHOLDS.HOUR);
    return `${hours}h`;
  } else if (seconds < TIME_THRESHOLDS.WEEK) {
    const days = Math.floor(seconds / TIME_THRESHOLDS.DAY);
    return `${days}d`;
  } else if (seconds < TIME_THRESHOLDS.MONTH) {
    const weeks = Math.floor(seconds / TIME_THRESHOLDS.WEEK);
    return `${weeks}w`;
  } else if (seconds < TIME_THRESHOLDS.YEAR) {
    const months = Math.floor(seconds / TIME_THRESHOLDS.MONTH);
    return `${months}mo`;
  } else {
    const years = Math.floor(seconds / TIME_THRESHOLDS.YEAR);
    const remainingMonths = Math.floor((seconds % TIME_THRESHOLDS.YEAR) / TIME_THRESHOLDS.MONTH);
    return `${years}y${remainingMonths > 0 ? ` ${remainingMonths}mo` : ''}`;
  }
}

async function fetchHistoricalData(pair) {
  try {
    console.log('[DEBUG] Fetching historical data for pair:', pair.pairAddress);
    console.log('[DEBUG] Chain ID:', pair.chainId);
    console.log('[DEBUG] Current price:', pair.priceUsd);

    // Try to get ATH from pair data
    let ath = parseFloat(pair.priceUsd);
    let athDate = 'Just now';
    if (pair.priceUsd24hAgo) {
      const ath24hAgo = parseFloat(pair.priceUsd24hAgo);
      if (ath24hAgo > ath) {
        ath = ath24hAgo;
        athDate = '24h ago';
      }
    }

    // Try to get more historical data from pair data
    if (pair.priceUsd7dAgo) {
      const ath7dAgo = parseFloat(pair.priceUsd7dAgo);
      if (ath7dAgo > ath) {
        ath = ath7dAgo;
        athDate = '7d ago';
      }
    }

    // If we have no historical data, use current price as ATH
    if (!ath || ath <= 0) {
      ath = parseFloat(pair.priceUsd);
      athDate = 'Just now';
    }

    console.log('[DEBUG] Historical data:', { ath, athDate });
    return { ath, athDate };
  } catch (error) {
    console.log('[DEBUG] Error fetching historical data:', error.message);
    console.log('[DEBUG] Stack trace:', error.stack);
    
    // Fallback to current price as ATH
    return {
      ath: parseFloat(pair.priceUsd),
      athDate: 'Just now'
    };
  }
}

async function getTokenAnalysis(tokenContract, chain) {
  try {
    console.log(`\n[DEBUG] Starting token analysis for ${tokenContract} on ${chain}`);
    
    // Try the token search endpoint first
    console.log(`[DEBUG] Fetching token data from DexScreener search API...`);
    const searchResponse = await axios.get(
      `${DEXSCREENER_API}/dex/search?q=${tokenContract}`
    );

    let responseData = { pairs: [] };
    
    // If search doesn't return results, fallback to tokens endpoint
    if (!searchResponse.data?.pairs?.length) {
      console.log(`[DEBUG] No pairs found in search, trying tokens endpoint...`);
      const tokenResponse = await axios.get(
        `${DEXSCREENER_API}/dex/tokens/${tokenContract}`
      );
      responseData = tokenResponse.data;
    } else {
      responseData = searchResponse.data;
    }

    console.log(`[DEBUG] Received ${responseData?.pairs?.length || 0} pairs from API`);

    if (!responseData?.pairs?.length) {
      console.log(`[DEBUG] No pairs found for token ${tokenContract}`);
      return null;
    }

    // Filter pairs for the specified chain
    const validPairs = responseData.pairs.filter(pair => 
      pair.chainId.toLowerCase().includes(chain.toLowerCase())
    );
    console.log(`[DEBUG] Found ${validPairs.length} valid pairs after filtering`);

    if (!validPairs.length) {
      console.log(`[DEBUG] No valid pairs found after filtering`);
      return null;
    }

    // Sort pairs by liquidity to get the most relevant pair first
    const sortedPairs = validPairs.sort((a, b) => 
      (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
    );

    const pair = sortedPairs[0];
    const symbol = pair.baseToken.symbol.toUpperCase();
    console.log(`[DEBUG] Selected pair:`, {
      dex: pair.dexId,
      symbol,
      price: pair.priceUsd,
      liquidity: pair.liquidity?.usd
    });

    // Enhanced age determination
    let tokenAge = 'Unknown';
    let creationTime = null;

    // Try different sources for creation time
    if (pair.baseToken?.createdAt) {
      creationTime = new Date(pair.baseToken.createdAt);
    } else if (pair.pairCreatedAt) {
      creationTime = new Date(pair.pairCreatedAt);
      tokenAge += ' (based on pair creation)';
    } else if (pair.createdAt) {
      creationTime = new Date(pair.createdAt);
      tokenAge += ' (based on listing)';
    }

    if (creationTime && !isNaN(creationTime.getTime())) {
      const now = new Date();
      const ageInSeconds = Math.floor((now - creationTime) / 1000);
      tokenAge = formatTimeDifference(ageInSeconds);
      
      // Add relative description
      if (ageInSeconds < TIME_THRESHOLDS.DAY) {
        tokenAge += ' (Very New)';
      } else if (ageInSeconds < TIME_THRESHOLDS.WEEK) {
        tokenAge += ' (New)';
      } else if (ageInSeconds < TIME_THRESHOLDS.MONTH) {
        tokenAge += ' (Recent)';
      } else if (ageInSeconds < TIME_THRESHOLDS.YEAR) {
        tokenAge += ' (Established)';
      } else {
        tokenAge += ' (Long-established)';
      }
      
      console.log('[DEBUG] Token creation time:', creationTime.toISOString());
    }

    // Fetch historical data
    console.log(`[DEBUG] Fetching historical data...`);
    const { ath, athDate } = await fetchHistoricalData(pair);
    console.log(`[DEBUG] Historical data:`, { ath, athDate, tokenAge });

    // Get the best pair for price and liquidity
    const bestPair = sortedPairs[0]; // We already sorted by liquidity

    console.log(`[DEBUG] Best pair selected:`, {
      dex: bestPair.dexId,
      liquidity: bestPair.liquidity?.usd,
      price: bestPair.priceUsd
    });

    // Get holder data from the best pair
    const holders = bestPair.holders?.filter(h => 
      validatePercentage(h.percentage) && 
      h.address && 
      h.address.length > 0
    ).slice(0, 5) || [];

    console.log(`[DEBUG] Found ${holders.length} valid holders`);

    const analysis = {
      chainId: pair.chainId,
      symbol: symbol,
      name: pair.baseToken.name,
      priceUsd: parseFloat(bestPair.priceUsd),
      priceChange24h: bestPair.priceChange?.h24 || 0,
      priceChange1h: bestPair.priceChange?.h1 || 0,
      liquidity: {
        usd: bestPair.liquidity?.usd,
        change24h: bestPair.liquidity?.change24h
      },
      volume: {
        h24: bestPair.volume?.h24,
        h6: bestPair.volume?.h6,
        h1: bestPair.volume?.h1
      },
      transactions: {
        buys24h: bestPair.txns?.h24?.buys || 0,
        sells24h: bestPair.txns?.h24?.sells || 0
      },
      fdv: bestPair.fdv,
      marketCap: bestPair.marketCap,
      ath,
      athDate,
      age: tokenAge,
      holders,
      securityStatus: bestPair.security || {
        liquidityLocked: false,
        mintable: true
      },
      website: bestPair.baseToken.website || undefined,
      twitter: bestPair.baseToken.twitter || undefined,
      logo: `https://dd.dexscreener.com/ds-data/tokens/${chain}/${tokenContract}.png?key=90f47d?size=lg`,
      priceDifferential: bestPair.priceDifferential,
      dexscreenerUrl: `https://dexscreener.com/${chain}/${tokenContract}`,
      googleLensUrl: `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(`https://dd.dexscreener.com/ds-data/tokens/${chain}/${tokenContract}.png?key=90f47d?size=lg`)}`,
      bestPair
    };

    console.log(`[DEBUG] Final analysis:`, {
      symbol: analysis.symbol,
      price: analysis.priceUsd,
      liquidity: analysis.liquidity?.usd,
      volume: analysis.volume?.h24,
      holders: analysis.holders?.length,
      ath: analysis.ath,
      age: analysis.age
    });

    return analysis;
  } catch (error) {
    console.error("[DEBUG] Error in getTokenAnalysis:", error);
    if (error instanceof Error) {
      console.error("[DEBUG] Error details:", error.message);
      console.error("[DEBUG] Stack trace:", error.stack);
    }
    return null;
  }
}

// Add security check functions
function getSecurityScore(analysis) {
  let score = 0;
  let maxScore = 0;

  // Contract verification (+2)
  if (analysis.securityStatus?.verified) score += 2;
  maxScore += 2;

  // Liquidity locked (+2)
  if (analysis.securityStatus?.liquidityLocked) score += 2;
  maxScore += 2;

  // Not mintable (+1)
  if (!analysis.securityStatus?.mintable) score += 1;
  maxScore += 1;

  // Not honeypot (+2)
  if (!analysis.securityStatus?.honeypot) score += 2;
  maxScore += 2;

  // Reasonable tax (+1)
  if (analysis.securityStatus?.tax && analysis.securityStatus.tax <= 10) score += 1;
  maxScore += 1;

  // Calculate percentage
  return (score / maxScore) * 100;
}

function getSecurityLevel(score) {
  if (score >= 80) return SECURITY_LEVELS.LOW_RISK;
  if (score >= 50) return SECURITY_LEVELS.MEDIUM_RISK;
  if (score >= 0) return SECURITY_LEVELS.HIGH_RISK;
  return SECURITY_LEVELS.UNKNOWN;
}

// Add trading metrics functions
function getTradingMetrics(analysis) {
  const metrics = {
    volumeLiquidityRatio: (analysis.volume?.h24 || 0) / (analysis.liquidity?.usd || 1),
    buySellRatio: (analysis.transactions?.buys24h || 0) / (analysis.transactions?.sells24h || 1),
    priceImpact: {
      small: 100 / (analysis.liquidity?.usd || 1) * 100,
      medium: 1000 / (analysis.liquidity?.usd || 1) * 100,
      large: 10000 / (analysis.liquidity?.usd || 1) * 100
    },
    suspicious: false,
    warning: ''
  };

  // Check for suspicious activity
  if (metrics.volumeLiquidityRatio > VALIDATION_THRESHOLDS.SUSPICIOUS_VOLUME_LIQUIDITY_RATIO) {
    metrics.suspicious = true;
    metrics.warning += '⚠️ Unusually high volume/liquidity ratio\n';
  }

  if (metrics.buySellRatio > VALIDATION_THRESHOLDS.SUSPICIOUS_BUY_SELL_RATIO) {
    metrics.suspicious = true;
    metrics.warning += '⚠️ Unusual buy/sell ratio\n';
  }

  if (metrics.priceImpact.medium > VALIDATION_THRESHOLDS.HIGH_PRICE_IMPACT) {
    metrics.suspicious = true;
    metrics.warning += '⚠️ High price impact\n';
  }

  return metrics;
}

async function main() {
  const tokenContract = process.argv[2];
  if (!tokenContract) {
    console.error('Please provide a token contract address');
    process.exit(1);
  }

  console.log(`\n[TEST] Analyzing token: ${tokenContract}`);
  
  // Check if it's a Solana address (base58 format)
  const isSolanaAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tokenContract);
  
  // Try multiple chains, but prioritize Solana if it looks like a Solana address
  const chains = isSolanaAddress 
    ? ['solana', 'ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism']
    : ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'solana'];

  let analysis = null;
  
  for (const chain of chains) {
    console.log(`\n[TEST] Trying chain: ${chain}`);
    analysis = await getTokenAnalysis(tokenContract, chain);
    if (analysis) {
      break;
    }
  }

  if (!analysis) {
    console.error('Failed to analyze token on any chain');
    process.exit(1);
  }

  // Calculate additional trading metrics
  const volumeToLiquidity = analysis.volume?.h24 / (analysis.liquidity?.usd || 1);
  const priceImpact1k = 1000 / (analysis.liquidity?.usd || 1) * 100;
  const topHoldersTotal = analysis.holders?.reduce((sum, h) => sum + h.percentage, 0) || 0;
  const buys24h = analysis.transactions?.buys24h || 0;
  const sells24h = analysis.transactions?.sells24h || 0;

  // Format numbers
  const formatUSD = (num) => {
    if (!num) return '$0';
    if (num >= 1000000) return `$${(num/1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num/1000).toFixed(1)}K`;
    return `$${num.toFixed(2)}`;
  };

  const formatPrice = (price) => {
    if (!price) return '0';
    if (price < 0.00001) return price.toExponential(2);
    if (price < 0.001) return price.toFixed(7);
    if (price < 0.1) return price.toFixed(5);
    if (price < 1) return price.toFixed(4);
    return price.toFixed(2);
  };

  // Helper functions for formatting
  const formatPercentage = (num) => {
    if (!num) return '0%';
    return `${num > 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  const getEmojiBars = (value, max, count = 5) => {
    const filled = Math.round((value / max) * count);
    return ''.padStart(filled, '🟩').padStart(count, '⬜');
  };

  const getTrendIndicator = (current, previous) => {
    const change = ((current - previous) / previous) * 100;
    if (change > 5) return '📈 Strong Up';
    if (change > 0) return '↗️ Up';
    if (change < -5) return '📉 Strong Down';
    if (change < 0) return '↘️ Down';
    return '➡️ Stable';
  };

  const getBuySellBars = (buys, sells, count = 10) => {
    const total = buys + sells;
    const buyBars = Math.round((buys / total) * count);
    return ''.padStart(buyBars, '🟩').padStart(count, '🟥');
  };

  const getWalletCategory = (value) => {
    if (value >= 10000) return '🐋 Whale';
    if (value >= 5000) return '🐋 Big Fish';
    if (value >= 1000) return '🐠 Fish';
    return '🦐 Shrimp';
  };

  // Calculate additional metrics
  const avgTxSize = analysis.volume?.h24 / (buys24h + sells24h) || 0;
  const priceImpacts = {
    '100': 100 / (analysis.liquidity?.usd || 1) * 100,
    '1k': 1000 / (analysis.liquidity?.usd || 1) * 100,
    '10k': 10000 / (analysis.liquidity?.usd || 1) * 100
  };

  // Calculate timeframes
  const volume1h = analysis.volume?.h1 || 0;
  const volume3h = analysis.volume?.h6 ? analysis.volume.h6 / 2 : volume1h * 3;
  const volume12h = analysis.volume?.h24 ? analysis.volume.h24 / 2 : volume1h * 12;
  const volume24h = analysis.volume?.h24 || 0;

  // Remove debug logs and clear console
  console.clear();
  
  // Get security score and trading metrics
  const securityScore = getSecurityScore(analysis);
  const securityLevel = getSecurityLevel(securityScore);
  const tradingMetrics = getTradingMetrics(analysis);
  const chainIcon = CHAIN_ICONS[analysis.chainId] || CHAIN_ICONS.default;

  // Calculate risk level emoji
  const riskEmoji = securityScore >= 80 ? '🟢' : securityScore >= 50 ? '🟡' : '🔴';

  console.log('\n=== Discord Embed Preview ===\n');

  // Title with chain and risk level
  console.log(`${chainIcon} **${analysis.symbol.trim()}** Analysis ${riskEmoji}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Basic Info
  console.log('🔍 **Token Information**');
  console.log(`• Name: ${analysis.name} (${analysis.symbol.trim()})`);
  console.log(`• Chain: ${analysis.chainId.toUpperCase()}`);
  console.log(`• Price: $${formatPrice(analysis.priceUsd)}`);
  console.log(`• Market Cap: ${formatUSD(analysis.marketCap)}`);
  console.log(`• Contract: ${tokenContract.slice(0, 6)}...${tokenContract.slice(-4)}`);
  console.log(`  Full: \`${tokenContract}\``);
  console.log(`• Age: ${analysis.age}\n`);

  // Price Analysis with Trends
  console.log('💰 **Price Metrics**');
  console.log(`• Current: $${formatPrice(analysis.priceUsd)}`);
  console.log('• Price Changes:');
  console.log(`  - 24H: ${formatPercentage(analysis.priceChange24h)} ${analysis.priceChange24h >= 0 ? '📈' : '📉'}`);
  console.log(`  - 12H: ${formatPercentage(analysis.priceChange24h/2)} ${analysis.priceChange24h/2 >= 0 ? '📈' : '📉'}`);
  console.log(`  - 3H: ${formatPercentage(analysis.priceChange1h*3)} ${analysis.priceChange1h*3 >= 0 ? '📈' : '📉'}`);
  console.log(`  - 1H: ${formatPercentage(analysis.priceChange1h)} ${analysis.priceChange1h >= 0 ? '📈' : '📉'}`);
  console.log('• ATH Info:');
  console.log(`  - ATH: $${formatPrice(analysis.ath)} (${analysis.athDate})`);
  const athDiff = ((analysis.priceUsd - analysis.ath) / analysis.ath * 100);
  console.log(`  - From ATH: ${formatPercentage(athDiff)}\n`);

  // Volume Analysis with Warnings
  console.log('📊 **Volume Metrics**');
  console.log('• Volume by Timeframe:');
  console.log(`  24H: ${formatUSD(volume24h)} ${getEmojiBars(volume24h, volume24h)}`);
  console.log(`  12H: ${formatUSD(volume12h)} ${getEmojiBars(volume12h, volume24h/2)}`);
  console.log(`   3H: ${formatUSD(volume3h)} ${getEmojiBars(volume3h, volume24h/8)}`);
  console.log(`   1H: ${formatUSD(volume1h)} ${getEmojiBars(volume1h, volume24h/24)}`);
  console.log(`• Volume/Liquidity: ${tradingMetrics.volumeLiquidityRatio.toFixed(1)}x ${tradingMetrics.volumeLiquidityRatio > VALIDATION_THRESHOLDS.SUSPICIOUS_VOLUME_LIQUIDITY_RATIO ? '⚠️' : ''}`);
  console.log(`• Total Trades: ${buys24h + sells24h} transactions\n`);

  // Liquidity Analysis with Risk Indicators
  console.log('💧 **Liquidity Status**');
  console.log(`• Total Liquidity: ${formatUSD(analysis.liquidity?.usd)}`);
  console.log(`• Main Pool: ${formatUSD(analysis.liquidity?.usd)} (${analysis.bestPair?.dexId})`);
  if (analysis.bestPair?.pairAddress) {
    console.log(`• Pool Address: ${analysis.bestPair.pairAddress.slice(0, 6)}...${analysis.bestPair.pairAddress.slice(-4)}`);
  }
  console.log('• Price Impact:');
  console.log(`  - $100: ${tradingMetrics.priceImpact.small.toFixed(2)}% ${tradingMetrics.priceImpact.small > VALIDATION_THRESHOLDS.HIGH_PRICE_IMPACT ? '⚠️' : ''}`);
  console.log(`  - $1K: ${tradingMetrics.priceImpact.medium.toFixed(2)}% ${tradingMetrics.priceImpact.medium > VALIDATION_THRESHOLDS.HIGH_PRICE_IMPACT ? '⚠️' : ''}`);
  console.log(`  - $10K: ${tradingMetrics.priceImpact.large.toFixed(2)}% ${tradingMetrics.priceImpact.large > VALIDATION_THRESHOLDS.HIGH_PRICE_IMPACT ? '⚠️' : ''}\n`);

  // Trading Activity with Patterns
  console.log('🔄 **Trading Activity**');
  console.log('• Buy/Sell Analysis:');
  console.log(`  - Buys: ${buys24h} | Sells: ${sells24h}`);
  const buyRatio = buys24h / (buys24h + sells24h);
  console.log(`  - Ratio: ${getBuySellBars(buys24h, sells24h)} (${(buyRatio * 100).toFixed(1)}%)`);
  console.log(`  - Pressure: ${buyRatio > 0.5 ? '📈 Bullish' : '📉 Bearish'}`);
  console.log('• Trading Metrics:');
  console.log(`  - Trades/Hour: ${Math.round((buys24h + sells24h) / 24)}`);
  console.log(`  - Avg Transaction: ${formatUSD(avgTxSize)}\n`);

  // Security Analysis with Score
  console.log('🔒 **Security Analysis**');
  console.log(`• Overall Score: ${securityScore.toFixed(1)}% ${riskEmoji}`);
  console.log(`• Contract: ${analysis.securityStatus?.verified ? '✅ Verified' : '⚠️ Unverified'}`);
  console.log(`• Mintable: ${analysis.securityStatus?.mintable ? '🔴 Yes' : '🟢 No'}`);
  console.log(`• Liquidity: ${analysis.securityStatus?.liquidityLocked ? '🟢 Locked' : '🔴 Unlocked'}`);
  console.log(`• Honeypot: ${analysis.securityStatus?.honeypot ? '🔴 Yes' : '🟢 No'}`);
  console.log(`• Tax: ${analysis.securityStatus?.tax ? `${analysis.securityStatus.tax}%` : 'Unknown'}\n`);

  // Risk Assessment
  const riskFactors = [];
  if (!analysis.securityStatus?.verified) riskFactors.push('⚠️ Unverified Contract');
  if (analysis.securityStatus?.mintable) riskFactors.push('⚠️ Mintable Token');
  if (!analysis.securityStatus?.liquidityLocked) riskFactors.push('⚠️ Unlocked Liquidity');
  if (tradingMetrics.volumeLiquidityRatio > VALIDATION_THRESHOLDS.SUSPICIOUS_VOLUME_LIQUIDITY_RATIO) riskFactors.push('⚠️ High Volume/Liquidity Ratio');
  if (tradingMetrics.priceImpact.medium > VALIDATION_THRESHOLDS.HIGH_PRICE_IMPACT) riskFactors.push('⚠️ High Price Impact');

  if (riskFactors.length > 0) {
    console.log('⚠️ **Risk Factors**');
    riskFactors.forEach(risk => console.log(`• ${risk}`));
    console.log();
  }

  // Trading Recommendations
  console.log('💡 **Analysis**');
  if (securityScore < 50) {
    console.log('• 🔴 High-risk token - Trade with extreme caution');
  } else if (securityScore < 80) {
    console.log('• 🟡 Medium-risk token - Trade with caution');
  } else {
    console.log('• 🟢 Lower-risk token - Standard trading caution applies');
  }

  if (tradingMetrics.volumeLiquidityRatio > VALIDATION_THRESHOLDS.SUSPICIOUS_VOLUME_LIQUIDITY_RATIO) {
    console.log('• ⚠️ Unusually high volume relative to liquidity');
  }

  if (tradingMetrics.priceImpact.medium > VALIDATION_THRESHOLDS.HIGH_PRICE_IMPACT) {
    console.log('• ⚠️ High price impact - Consider smaller trade sizes');
  }

  const trendStrength = Math.abs(analysis.priceChange1h);
  if (trendStrength > 20) {
    console.log(`• ${analysis.priceChange1h > 0 ? '📈' : '📉'} Strong ${analysis.priceChange1h > 0 ? 'upward' : 'downward'} price movement`);
  }
  console.log();

  // Links
  console.log('🔗 **Quick Links**');
  console.log(`• [DexScreener](${analysis.dexscreenerUrl})`);
  if (analysis.website) console.log(`• [Website](${analysis.website})`);
  if (analysis.twitter) console.log(`• [Twitter](${analysis.twitter})`);
  if (analysis.telegram) console.log(`• [Telegram](${analysis.telegram})`);
  console.log();

  // Footer
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');
  const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
  console.log(`Data from DexScreener • ${timestamp} UTC`);

  console.log('\n=== End of Embed Preview ===\n');
}

main().catch(console.error); 
