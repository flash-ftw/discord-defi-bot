import { Client, Events, Collection } from "discord.js";
import * as analyzeCommand from "./analyze";
import * as analyzeWalletCommand from "./analyze-wallet";
import * as helpCommand from "./help";

const commands = [analyzeCommand, analyzeWalletCommand, helpCommand];

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

  // Register the commands globally
  try {
    await client.application?.commands.set(commands.map(cmd => cmd.data));
    console.log('Successfully registered application commands.');
  } catch (error) {
    console.error('Error registering application commands:', error);
  }
}