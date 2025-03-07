# Local Setup Guide for Discord DeFi Bot

## Prerequisites
1. Node.js v20 or later
   - Download from: https://nodejs.org/
   - After installing, verify by running: `node --version`
2. npm v9 or later (comes with Node.js)
   - Verify by running: `npm --version`
3. A Discord bot token (from Discord Developer Portal)
4. Your Discord server ID

## Step-by-Step Setup

### 1. Discord Bot Setup
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or select your existing one
3. Go to the "Bot" section
4. Click "Reset Token" and copy the new token
5. Enable these privileged intents:
   - MESSAGE CONTENT INTENT
   - SERVER MEMBERS INTENT
   - PRESENCE INTENT
6. Go to OAuth2 section
   - Select "bot" and "applications.commands" scopes
   - Copy the generated URL and use it to invite the bot to your server

### 2. Project Setup
1. Download or clone the repository to your PC
2. Open a terminal/command prompt in the project directory
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
   - To get your server ID: Right-click your server name > Copy Server ID
     (Note: Developer Mode must be enabled in Discord settings)

### 4. Running the Bot
1. Open a terminal in the project directory
2. Start the bot:
   ```bash
   npm run dev
   ```
3. You should see "Bot is ready!" in the console

### 5. Verifying the Bot
1. Your bot should appear online in your Discord server
2. Try these commands:
   - `/help` - Shows all available commands
   - `/market` - Shows market overview
   - `/analyze <token_address>` - Analyzes a token

## Troubleshooting
- If the bot doesn't start:
  - Check your .env file for correct formatting
  - Verify your Discord token is valid
  - Make sure all required intents are enabled
  - If you see "EADDRINUSE: address already in use 0.0.0.0:5000":
    1. Find the process using port 5000: `netstat -ano | findstr :5000` (Windows) or `lsof -i :5000` (Mac/Linux)
    2. Stop the process or choose a different port by setting PORT in your .env file
- If commands don't work:
  - Check if the bot has proper permissions in your server
  - Verify the GUILD_ID matches your server
  - Look for any error messages in the console
- For any errors:
  - Read the console output for detailed error messages
  - Make sure Node.js version is 20 or higher
  - Try deleting node_modules folder and running npm install again

## Security Notes
- Never share your .env file
- Keep your Discord token secret
- Reset your token if it gets exposed