import { Client, Events, Collection } from "discord.js";
import * as analyzeCommand from "./analyze";
import * as analyzeWalletCommand from "./analyze-wallet";
import * as helpCommand from "./help";
import * as statusCommand from "./status";
import { startPriceTracking } from "../utils/price-tracker";
import { detectChain } from "../utils/blockchain";
import { getTokenAnalysis } from "../utils/dexscreener";

const commands = [analyzeCommand, analyzeWalletCommand, helpCommand, statusCommand];
const GUILD_ID = '995147630009139252';

// Contract address detection regex patterns
const CONTRACT_PATTERNS = {
  evm: /0x[a-fA-F0-9]{40}/g,
  solana: /[1-9A-HJ-NP-Za-km-z]{32,44}/g
};

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

  // Add message event listener for contract detection
  client.on(Events.MessageCreate, async message => {
    // Ignore bot messages and commands
    if (message.author.bot || message.content.startsWith('/')) return;

    try {
      // Look for EVM and Solana contract addresses
      const evmContracts = message.content.match(CONTRACT_PATTERNS.evm) || [];
      const solanaContracts = message.content.match(CONTRACT_PATTERNS.solana) || [];
      const contracts = [...evmContracts, ...solanaContracts];

      // Process first found contract address
      if (contracts.length > 0) {
        const contract = contracts[0];
        console.log(`Detected contract address in message: ${contract}`);

        // Detect chain and get analysis
        const chain = await detectChain(contract);
        if (!chain) return;

        console.log(`Found response for chain ${chain}`);
        const analysis = await getTokenAnalysis(contract, chain);
        if (!analysis) return;

        console.log('[TOKEN] Analysis result:', {
          name: analysis.name,
          symbol: analysis.symbol,
          price: analysis.priceUsd
        });

        // Create embed response using the imported function
        const embed = analyzeCommand.createTokenEmbed(analysis, contract, chain);

        // Reply with analysis
        await message.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Error processing message for contracts:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
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

      // Start price tracking
      startPriceTracking(client);
    } catch (error) {
      console.error('Error registering application commands:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
      }
    }
  });
}