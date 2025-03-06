import axios from 'axios';
import { Client } from 'discord.js';
import NodeCache from "node-cache";

const COINGECKO_API = "https://api.coingecko.com/api/v3";
const cache = new NodeCache({ stdTTL: 60 }); // 1 minute cache

interface PriceData {
  usd: number;
  usd_24h_change: number;
}

interface TokenPrice {
  price: number;
  change24h: number;
  lastUpdated: Date;
}

const TRACKED_TOKENS = {
  'ethereum': 'ethereum',
  'solana': 'solana'
};

export async function getTokenPrices(): Promise<Record<string, TokenPrice>> {
  try {
    const cachedPrices = cache.get<Record<string, TokenPrice>>('prices');
    if (cachedPrices) {
      return cachedPrices;
    }

    const response = await axios.get(`${COINGECKO_API}/simple/price`, {
      params: {
        ids: Object.values(TRACKED_TOKENS).join(','),
        vs_currencies: 'usd',
        include_24hr_change: true
      }
    });

    const prices: Record<string, TokenPrice> = {};
    for (const [key, id] of Object.entries(TRACKED_TOKENS)) {
      const data = response.data[id];
      prices[key] = {
        price: data.usd,
        change24h: data.usd_24h_change,
        lastUpdated: new Date()
      };
    }

    cache.set('prices', prices);
    return prices;
  } catch (error) {
    console.error('Error fetching token prices:', error);
    return {};
  }
}

export function formatPrice(price: number): string {
  return price >= 1 ?
    `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` :
    `$${price.toFixed(6)}`;
}

export function formatPriceChange(change: number): string {
  const sign = change >= 0 ? '📈' : '📉';
  return `${sign} ${change.toFixed(2)}%`;
}

let statusUpdateInterval: NodeJS.Timeout | null = null;

export function startPriceTracking(client: Client) {
  if (statusUpdateInterval) {
    clearInterval(statusUpdateInterval);
  }

  async function updateStatus() {
    try {
      const prices = await getTokenPrices();

      if (!prices.ethereum || !prices.solana) {
        console.error('Failed to fetch prices for status update');
        return;
      }

      const ethPrice = Math.round(prices.ethereum.price);
      const solPrice = prices.solana.price >= 1000 ?
        `${(prices.solana.price / 1000).toFixed(1)}K` :
        prices.solana.price.toFixed(1);

      const status = `ETH $ ${ethPrice} | SOL $ ${solPrice}`; // Exactly matching requested format
      // ActivityType options:
      // 0 = Playing
      // 1 = Streaming
      // 2 = Listening to
      // 3 = Watching
      // 5 = Competing in
      await client.user?.setActivity(status, { type: 0 }); // Using "Playing" type

      console.log('Updated bot status with prices:', status);
    } catch (error) {
      console.error('Error updating bot status:', error);
    }
  }

  // Update immediately and then every minute
  updateStatus();
  statusUpdateInterval = setInterval(updateStatus, 60000);
}