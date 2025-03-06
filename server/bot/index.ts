import { Client, GatewayIntentBits, Events, REST, Routes, ApplicationCommandType, ApplicationCommandOptionType } from "discord.js";
import { handleAnalyzeCommand } from "./commands/analyze";
import { handleHelpCommand } from "./commands/help";

if (!process.env.DISCORD_TOKEN) {
  throw new Error("DISCORD_TOKEN environment variable is required");
}

const commands = [
  {
    name: "analyze",
    description: "Analyze token transactions for a wallet",
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        name: "wallet",
        description: "Wallet address to analyze",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "token",
        description: "Token contract address",
        type: ApplicationCommandOptionType.String,
        required: true,
      }
    ]
  },
  {
    name: "help",
    description: "Show help information",
    type: ApplicationCommandType.ChatInput,
  }
];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

client.on(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user?.tag}`);

  // Register slash commands
  const rest = new REST().setToken(process.env.DISCORD_TOKEN);
  try {
    console.log("Started refreshing application (/) commands.");
    await rest.put(
      Routes.applicationCommands(client.user!.id),
      { body: commands }
    );
    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error("Error refreshing commands:", error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    switch (interaction.commandName) {
      case "analyze": {
        await handleAnalyzeCommand(interaction);
        break;
      }
      case "help": {
        await handleHelpCommand(interaction);
        break;
      }
      default: {
        await interaction.reply({ 
          content: "Unknown command",
          ephemeral: true 
        });
      }
    }
  } catch (error) {
    console.error("Command error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ 
        content: `Error: ${errorMessage}`
      });
    } else {
      await interaction.reply({ 
        content: `Error: ${errorMessage}`,
        ephemeral: true 
      });
    }
  }
});

export async function setupBot() {
  try {
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error("Failed to start Discord bot:", error);
    throw error;
  }
}