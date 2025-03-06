import { Client, Events, GatewayIntentBits } from "discord.js";
import { setupCommands } from "./commands";

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
  await client.login(process.env.DISCORD_TOKEN);

  return client;
}
