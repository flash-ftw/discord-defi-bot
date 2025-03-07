# Discord DeFi Analytics Bot 🤖

A sophisticated Discord bot for real-time cryptocurrency analytics, offering comprehensive token insights with dynamic, user-friendly interfaces and instant market intelligence.

## Features 🌟

### Token Analysis (/analyze) 📊
- Real-time price tracking and market metrics
- 24h/1h price changes with sentiment analysis
- Liquidity analysis and security checks
- Top holders distribution
- Trading activity monitoring
- Automatic contract detection in chat
- Links to charts and market research tools

### Wallet Analysis (/wallet) 💼
- Complete transaction history
- Realized and unrealized P&L tracking
- ROI calculations and metrics
- Current holdings analysis

### Market Overview (/market) 📈
- Top 5 trending tokens
- Volume leaders (24h/1h/10min)
- Real-time price tracking
- Auto-updates every minute

### Smart Features 🧠
- Automatic contract address detection in chat
- Multi-chain support
- Real-time market sentiment analysis
- Security and liquidity checks
- Advanced holder analytics

## Supported Chains 🔗
- ⟠ Ethereum (ETH)
- 🔷 Base
- 🔺 Avalanche (AVAX)
- ◎ Solana (SOL)

## Setup 🚀

1. Clone the repository:
```bash
git clone https://github.com/yourusername/discord-defi-bot.git
cd discord-defi-bot
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up your Discord bot:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application
   - Add a bot to your application
   - Copy the bot token to your `.env` file
   - Enable necessary intents (Presence, Server Members, Message Content)

5. Start the bot:
```bash
npm run dev
```

## Commands 🎮

### /analyze <token_address>
Analyzes a token's metrics including:
- Current price and market data
- Price changes and trends
- Liquidity and volume analysis
- Security checks
- Top holders
- Trading activity

### /wallet <wallet_address> <token_address>
Analyzes a wallet's performance for a specific token:
- Transaction history
- P&L analysis
- ROI metrics
- Current holdings

### /market
Shows market overview including:
- Trending tokens
- Volume leaders
- Price updates

### /help
Displays all available commands and usage information.

## API Reference 📚

The bot uses various APIs to fetch data:
- DexScreener API for token data
- Chain-specific RPC endpoints for blockchain data
- CoinGecko API for additional market data

Rate limits and caching are implemented to ensure stable performance.

## Development 🛠️

### Prerequisites
- Node.js v20 or later
- npm v9 or later
- A Discord bot token
- Access to blockchain RPC endpoints

### Local Development
1. Follow the setup instructions above
2. Install development dependencies:
```bash
npm install --save-dev
```

3. Run in development mode:
```bash
npm run dev
```

### Testing
```bash
npm test
```

## Contributing 🤝

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed information about how to contribute to this project.

## License 📝

[MIT](LICENSE)

## Security 🔒

This bot includes features to help identify potential risks but should not be used as the sole source for investment decisions. Always do your own research.

## Disclaimer ⚠️

This bot is for informational purposes only. Nothing contained here should be considered financial or investment advice.