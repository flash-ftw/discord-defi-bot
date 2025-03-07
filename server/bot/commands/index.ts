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
  evm: /0x[a-fA-F0-9]{40}/gi,
  solana: /[1-9A-HJ-NP-Za-km-z]{32,44}/gi
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
      console.error('Command execution error:', error instanceof Error ? error.message : 'Unknown error');
      const errorMessage = 'There was an error executing this command.';

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  });

  // Add message event listener for contract detection
  client.on(Events.MessageCreate, async message => {
    if (message.author.bot || message.content.startsWith('/')) return;

    try {
      // Extract contract addresses using case-insensitive global regex
      const evmContracts = [...(message.content.matchAll(CONTRACT_PATTERNS.evm) || [])].map(match => match[0]);
      const solanaContracts = [...(message.content.matchAll(CONTRACT_PATTERNS.solana) || [])].map(match => match[0]);
      const contracts = [...evmContracts, ...solanaContracts];

      // Debug log
      console.log('Found contracts in message:', contracts);

      if (contracts.length > 0) {
        const contract = contracts[0];

        // Try to detect chain and analyze
        const chain = await detectChain(contract);
        if (!chain) {
          console.log(`No chain detected for contract: ${contract}`);
          return;
        }

        console.log(`Detected chain ${chain} for contract ${contract}`);
        const analysis = await getTokenAnalysis(contract, chain);
        if (!analysis) {
          console.log(`No analysis available for contract: ${contract}`);
          return;
        }

        // Create and send embed
        try {
          const embed = analyzeCommand.createTokenEmbed(analysis, contract, chain);
          await message.reply({ embeds: [embed] });
          console.log('Successfully sent token analysis');
        } catch (embedError) {
          console.error('Error creating or sending embed:', embedError);
        }
      }
    } catch (error) {
      console.error('Message processing error:', error instanceof Error ? error.message : 'Unknown error');
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

      const registeredCommands = await guild.commands.set(commands.map(cmd => cmd.data));
      console.log('Successfully registered commands:', registeredCommands.map(cmd => cmd.name));

      // Start price tracking
      startPriceTracking(client);
    } catch (error) {
      console.error('Bot initialization error:', error instanceof Error ? error.message : 'Unknown error');
    }
  });
}