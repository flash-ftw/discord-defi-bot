# Local Setup Guide for Discord DeFi Bot

## Prerequisites
1. Node.js v20 or later
2. npm v9 or later
3. A Discord bot token (from Discord Developer Portal)
4. Your Discord server ID

## Step-by-Step Setup

### 1. Discord Bot Setup
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or select your existing one
3. Go to the "Bot" section
4. Reset your token and copy the new one
5. Enable these privileged intents:
   - MESSAGE CONTENT INTENT
   - SERVER MEMBERS INTENT
   - PRESENCE INTENT

### 2. Project Setup
1. Download or clone the repository to your PC
2. Open a terminal in the project directory
3. Install dependencies:
   ```bash
   npm install
   ```

### 3. Configuration
1. Create a new file named `.env` in the project root
2. Add these lines to your `.env` file:
   ```env
   DISCORD_TOKEN=your_new_bot_token_here
   GUILD_ID=your_discord_server_id_here
   ```
   Replace with your actual values

### 4. Running the Bot
1. Open a terminal in the project directory
2. Start the bot:
   ```bash
   npm run dev
   ```
3. You should see "Bot is ready!" in the console

### 5. Verifying the Bot
1. Your bot should appear online in your Discord server
2. Try the following commands:
   - `/help` - Shows all available commands
   - `/market` - Shows market overview
   - `/analyze <token_address>` - Analyzes a token

## Troubleshooting
- If the bot doesn't start: Check your .env file and token
- If commands don't work: Ensure the bot has proper permissions in your server
- For any errors: Check the console output for detailed error messages

## Security Notes
- Never share your .env file
- Keep your Discord token secret
- Reset your token if it gets exposed
