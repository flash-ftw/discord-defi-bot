# Deployment Guide for Discord DeFi Bot

## GitHub Setup

1. Create a new GitHub repository
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin your-repository-url
   git push -u origin main
   ```

2. Ensure these files are not committed:
   - `.env`
   - `node_modules/`
   - Any files containing sensitive information

## Railway Deployment

1. Prerequisites:
   - A GitHub account with your bot's repository
   - A Railway account (https://railway.app)
   - Your Discord bot token and server ID

2. Setup on Railway:
   - Log in to Railway using your GitHub account
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your bot's repository
   - Wait for initial deployment

3. Configure Environment Variables:
   Required variables to set in Railway dashboard:
   ```
   DISCORD_TOKEN=your_discord_bot_token
   GUILD_ID=your_discord_server_id
   NODE_ENV=production
   ```

4. Verify Deployment:
   - Check Railway logs for successful build
   - Verify bot comes online in your Discord server
   - Test bot commands

## Troubleshooting

1. Build Failures:
   - Check Railway logs for specific error messages
   - Verify all dependencies are properly listed in package.json
   - Ensure Node.js version is set to 20.x in railway.toml

2. Runtime Issues:
   - Verify environment variables are correctly set
   - Check bot permissions in Discord
   - Review application logs in Railway dashboard

3. Common Solutions:
   - Clear build cache in Railway
   - Redeploy after environment variable changes
   - Check Discord Developer Portal for bot token status

## Security Notes

- Never commit your Discord token or sensitive data
- Use environment variables for all sensitive information
- Regularly rotate your Discord bot token
- Monitor Railway logs for unauthorized access attempts