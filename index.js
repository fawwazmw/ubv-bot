import "dotenv/config";
import express from "express";
import { Client, GatewayIntentBits, REST, Routes, MessageFlags } from "discord.js";
import { config } from "./src/config/env.js";
import { buildCommandRegistry } from "./src/discord/commandRegistry.js";
import { createHelpSelectHandler } from "./src/discord/helpSelectHandler.js";
import { initBirthdayScheduler } from "./src/features/birthdays/birthdayScheduler.js";
import { displayBanner, logSuccess, logError, logInfo } from "./src/utils/banner.js";
import { handleXPGain } from "./src/features/levels/xpTracker.js";

// Display beautiful startup banner
displayBanner();

// Health check server for deployment platforms (Render, Railway, etc)
const PORT = process.env.PORT || 3000;
const app = express();
app.get("/", (req, res) => res.send("UBV Bot is running!"));
app.get("/health", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));
app.listen(PORT, () => logInfo(`Health check server running on port ${PORT}`));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

const { commands, registry } = buildCommandRegistry({
  config,
});

async function registerSlashCommands() {
  const rest = new REST({ version: "10" }).setToken(config.discord.token);
  const definitions = commands.map((command) => command.definition);

  await rest.put(
    Routes.applicationGuildCommands(
      config.discord.clientId,
      config.discord.guildId
    ),
    { body: definitions }
  );
  logSuccess("Slash commands registered successfully");
}

const handleHelpSelect = createHelpSelectHandler({
  branding: config.branding,
  discord: config.discord,
});

client.once("clientReady", async () => {
  logSuccess(`Logged in as ${client.user.tag}`);
  client.user.setPresence({
    activities: [
      {
        name: "/help",
        type: 2, // Listening
      },
    ],
    status: "online",
  });

  try {
    await registerSlashCommands();
    initBirthdayScheduler(client, config);
    logInfo("Birthday scheduler initialized");
    logSuccess("Bot is ready to serve!");
  } catch (error) {
    logError(`Failed to register slash commands: ${error?.message ?? error}`);
  }
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = registry.get(interaction.commandName);
      if (!command) {
        logError(`Unknown command: ${interaction.commandName}`);
        return;
      }

      logInfo(`Command: ${interaction.commandName} | User: ${interaction.user.tag}`);

      try {
        await command.execute(interaction);
        logSuccess(`Command completed: ${interaction.commandName}`);
      } catch (error) {
        logError(
          `Command ${interaction.commandName} failed: ${error?.stack || error?.message || error}`
        );
        
        try {
          if (interaction.deferred) {
            await interaction.editReply({ content: "Terjadi kesalahan tak terduga." });
          } else if (!interaction.replied) {
            await interaction.reply({
              content: "Terjadi kesalahan tak terduga.",
              ephemeral: true,
            });
          }
        } catch (replyError) {
          logError(`Failed to send error message: ${replyError.message}`);
        }
      }
      return;
    }

    if (interaction.isStringSelectMenu()) {
      const handled = await handleHelpSelect(interaction);
      if (handled) return;
    }
  } catch (error) {
    logError(`Interaction handler error: ${error?.stack || error?.message || error}`);
  }
});

// Message event for XP tracking
client.on("messageCreate", async (message) => {
  try {
    await handleXPGain(message);
  } catch (error) {
    logError(`XP tracking error: ${error.message}`);
  }
});

client.login(config.discord.token);
