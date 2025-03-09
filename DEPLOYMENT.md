# Deployment Guide for Discord DeFi Bot

## Prerequisites
- Node.js v20 or later installed
- Git installed on your computer
- A GitHub account
- A Railway account

## Step 1: Local Setup

1. Create a new directory and download the project files:
```bash
mkdir discord-defi-bot
cd discord-defi-bot
# Download and extract the project files here
```

2. Set up your environment file:
```bash
cp .env.example .env
```

3. Get your Discord credentials:
- Go to [Discord Developer Portal](https://discord.com/developers/applications)
- Create a new application or select existing one
- Go to Bot section and copy your token
- Enable these privileged intents:
  - MESSAGE CONTENT INTENT
  - SERVER MEMBERS INTENT
  - PRESENCE INTENT

4. Update your .env file with:
```env
DISCORD_TOKEN=your_discord_bot_token
GUILD_ID=your_discord_server_id
```

5. Install dependencies:
```bash
npm install
```

6. Test locally:
```bash
npm run dev
```

## Step 2: GitHub Setup

1. Initialize Git repository:
```bash
git init
```

2. Add your files:
```bash
git add .
```

3. Create initial commit:
```bash
git commit -m "Initial commit"
```

4. Create a new repository on GitHub:
- Go to github.com
- Click "New repository"
- Name it "discord-defi-bot"
- Do NOT initialize with README
- Copy the repository URL

5. Push to GitHub:
```bash
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

## Step 3: Railway Deployment

1. Log in to [Railway](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository

5. Add these environment variables in Railway:
- DISCORD_TOKEN
- GUILD_ID
- NODE_ENV=production

6. Your railway.toml is already configured with:
- Node.js version: 20.x
- Build command: npm run build
- Start command: npm run start

7. Monitor deployment:
- Check Railway logs for build progress
- Verify bot comes online in Discord
- Test commands like /help

## Troubleshooting

If you encounter issues:

1. Token Invalid Error:
- Reset your Discord bot token
- Update the token in Railway environment variables
- Redeploy the project

2. Build Failures:
- Check Railway logs for specific errors
- Verify Node.js version matches (20.x)
- Clear build cache if needed

3. Runtime Issues:
- Check environment variables are set correctly
- Verify bot permissions in Discord
- Review application logs

## Security Notes
- Never commit .env file
- Keep your Discord token secure
- Reset token if accidentally exposed
- Monitor Railway logs for unauthorized access