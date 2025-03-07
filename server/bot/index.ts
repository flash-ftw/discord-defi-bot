import { Client, Events, GatewayIntentBits } from "discord.js";
import { setupCommands } from "./commands";
import * as dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

export async function setupBot() {
  const client = new Client({ 
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });

  client.once(Events.ClientReady, c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
  });

  // Initialize commands
  await setupCommands(client);

  // Login with token
  const token = process.env.DISCORD_TOKEN;
  console.log("Token exists:", !!token);
  console.log("Token length:", token?.length);
  console.log("Token first 5 chars:", token?.substring(0, 5));
  console.log("Token last 5 chars:", token?.substring(token.length - 5));
  
  try {
    await client.login(token);
  } catch (error) {
    console.error("Login error:", error);
    console.error("Please check your Discord token - it appears to be invalid");
    console.error("Get a new token from the Discord Developer Portal");
  }

  return client;
}
