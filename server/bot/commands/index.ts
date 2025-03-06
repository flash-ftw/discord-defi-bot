import { Client, Events, Collection } from "discord.js";
import * as analyzeCommand from "./analyze";
import * as analyzeWalletCommand from "./analyze-wallet";
import * as helpCommand from "./help";

const commands = [analyzeCommand, analyzeWalletCommand, helpCommand];
const GUILD_ID = '995147630009139252';

export async function setupCommands(client: Client) {
  // Create a collection of all commands
  const commandsCollection = new Collection(
    commands.map(cmd => [cmd.data.name, cmd])
  );

  // Handle command interactions
  client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = commandsCollection.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error('Error executing command:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ 
          content: `There was an error executing this command: ${errorMessage}`, 
          ephemeral: true 
        });
      } else {
        await interaction.reply({ 
          content: `There was an error executing this command: ${errorMessage}`, 
          ephemeral: true 
        });
      }
    }
  });

  // Wait for client to be ready before registering commands
  client.once(Events.ClientReady, async () => {
    try {
      const guild = client.guilds.cache.get(GUILD_ID);
      if (!guild) {
        console.error(`Could not find guild with ID ${GUILD_ID}`);
        return;
      }

      console.log(`Registering commands for guild: ${guild.name} (${GUILD_ID})`);
      console.log('Commands to register:', commands.map(cmd => cmd.data.name));

      const registeredCommands = await guild.commands.set(commands.map(cmd => cmd.data));
      console.log('Successfully registered commands:', registeredCommands.map(cmd => cmd.name));
    } catch (error) {
      console.error('Error registering application commands:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
      }
    }
  });
}