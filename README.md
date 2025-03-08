# Discord DeFi Analytics Bot 🤖

A powerful Discord bot for comprehensive cryptocurrency analytics, providing real-time, in-depth token insights with advanced features for crypto enthusiasts and traders.

## ⚠️ SECURITY ALERT
If you've previously cloned this repository and the Discord token was exposed:
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Reset your bot token immediately
3. Update your environment variables with the new token
4. Never commit your .env file to Git

## 🚀 Quick Start

### Prerequisites
- Node.js v20 or later
- npm v9 or later
- A Discord bot token
- Your Discord server ID

### Installation
1. Clone the repository
```bash
git clone <your-repository-url>
cd discord-defi-bot
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your Discord token and server ID
```

4. Start the bot
```bash
npm run dev
```

## 🔐 Environment Setup
Required environment variables:
- `DISCORD_TOKEN`: Your Discord bot token
- `GUILD_ID`: Your Discord server ID

Optional variables:
- `ETHERSCAN_API_KEY`: For Ethereum blockchain data
- `BSCSCAN_API_KEY`: For BSC blockchain data
- `AVALANCHE_API_KEY`: For Avalanche blockchain data
- `BASE_RPC_URL`: Custom Base chain RPC URL


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

## 📚 Documentation
- See [LOCAL_SETUP.md](LOCAL_SETUP.md) for detailed local development instructions
- See [DEPLOYMENT.md](DEPLOYMENT.md) for Railway deployment guide
- See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines

## 🛡️ Security Best Practices
1. Never commit sensitive data (tokens, API keys)
2. Use environment variables for configuration
3. Reset tokens if accidentally exposed
4. Keep dependencies updated

## 📝 License
[MIT](LICENSE)

## ⚠️ Disclaimer
This bot is for informational purposes only. Nothing contained here should be considered financial or investment advice.