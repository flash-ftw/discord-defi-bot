# SECURITY ALERT ⚠️

## IMPORTANT: If you've committed your Discord token to Git:
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Reset your bot token immediately
3. Update your GitHub repository secrets with the new token
4. Never share or commit your token

For secure deployment, follow these steps:

1. Reset your Discord bot token if it was exposed
2. Add it as a GitHub secret (not in code or .env)
3. Use environment variables for sensitive data
4. Keep your .env file in .gitignore

# Discord DeFi Analytics Bot 🤖

A powerful Discord bot for comprehensive cryptocurrency analytics, providing real-time, in-depth token insights with advanced features for crypto enthusiasts and traders.

Key components:
- Multi-chain token analysis with detailed metrics
- Advanced Discord embed formatting
- Real-time market data visualization
- Automated contract and token intelligence
- Enhanced token information extraction and presentation

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

## Deployment Guide 🚀

### Railway Deployment 🚀

1. Push your code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin your-repo-url
   git push -u origin main
   ```

2. Deploy to Railway:
   - Create an account on [Railway](https://railway.app/)
   - Create a new project and select "Deploy from GitHub repo"
   - Connect your GitHub repository
   - Add environment variables in Railway dashboard:
     ```
     DISCORD_TOKEN = your_discord_bot_token
     GUILD_ID = your_discord_server_id
     DATABASE_URL = automatically provided by Railway if you add PostgreSQL
     ```
   - Add a PostgreSQL database from the Railway dashboard
   - Deploy your application

3. Monitor your deployment:
   - Railway provides logs and metrics
   - Your bot will be online 24/7
   - Set up alerts for any issues

### Security Best Practices 🔒

1. Token Security:
   - Never commit tokens to Git
   - Use GitHub Secrets for sensitive data
   - Reset tokens if exposed
   - Use environment variables

2. Repository Security:
   - Enable branch protection
   - Require pull request reviews
   - Enable vulnerability alerts

3. Monitoring:
   - Check Actions tab for deployment status
   - Monitor bot logs for suspicious activity
   - Regularly audit access tokens


### Local Development
1. Create a `.env` file:
```env
DISCORD_TOKEN=your_discord_bot_token_here
GUILD_ID=your_discord_server_id_here
```

2. Install dependencies and start:
```bash
npm install
npm run dev
```

IMPORTANT: Never commit your `.env` file or share your Discord token!


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

## Security Notice 🔒

- Never commit your Discord token or any API keys to the repository
- Always use environment variables or secrets management
- Keep your bot token secure and reset it if accidentally exposed

## Disclaimer ⚠️

This bot is for informational purposes only. Nothing contained here should be considered financial or investment advice.