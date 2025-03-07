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

## Deployment Guide 🚀

### GitHub Deployment
1. Fork this repository to your GitHub account

2. Set up GitHub Secrets:
   - Go to your repository Settings > Secrets and Variables > Actions
   - Add a new repository secret named `DISCORD_TOKEN`
   - Add your Discord bot token as the value

3. Update Discord Bot Settings:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Select your application
   - Under "Bot" settings:
     - Enable "Message Content Intent"
     - Enable "Server Members Intent"
     - Enable "Presence Intent"

4. Configure Environment:
   The bot needs these environment variables:
   ```env
   DISCORD_TOKEN=your_discord_bot_token
   GUILD_ID=your_discord_server_id
   ```

5. Deploy:
   - For GitHub hosting, use GitHub Secrets
   - For local development, use a `.env` file (do not commit this file)


### GitHub Actions Deployment

1. Fork this repository to your GitHub account

2. Set up GitHub Secrets:
   - Go to your repository Settings > Secrets and Variables > Actions
   - Add these repository secrets:
     - `DISCORD_TOKEN`: Your Discord bot token
     - `GUILD_ID`: Your Discord server ID

3. Enable GitHub Actions:
   - Go to the Actions tab in your repository
   - Enable workflows if they're not already enabled
   - The deployment workflow will run automatically on pushes to main
   - You can also manually trigger deployments from the Actions tab

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