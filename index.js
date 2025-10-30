import "dotenv/config";
import express from "express";
import { Client, GatewayIntentBits, REST, Routes, MessageFlags } from "discord.js";
import { config } from "./src/config/env.js";
import { buildCommandRegistry } from "./src/discord/commandRegistry.js";
import { createHelpSelectHandler } from "./src/discord/helpSelectHandler.js";

// Health check server for deployment platforms (Render, Railway, etc)
const PORT = process.env.PORT || 3000;
const app = express();
app.get("/", (req, res) => res.send("UBV Bot is running!"));
app.get("/health", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));
app.listen(PORT, () => console.log(`🌐 Health check server running on port ${PORT}`));

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

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
  console.log("✅ Slash command terdaftar.");
}

const handleHelpSelect = createHelpSelectHandler({
  branding: config.branding,
  discord: config.discord,
});

client.once("clientReady", async () => {
  console.log(`🤖 Logged in sebagai ${client.user.tag}`);
  client.user.setPresence({
    activities: [
      {
        name: config.branding.tagline || "Universitas Brawijaya Voice",
        type: 2, // Listening
      },
    ],
    status: "online",
  });

  try {
    await registerSlashCommands();
  } catch (error) {
    console.error("❌ Gagal mendaftarkan slash commands:", error?.message ?? error);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = registry.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(
        `❌ Command ${interaction.commandName} failed:`,
        error?.message ?? error
      );
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: "Terjadi kesalahan tak terduga." });
      } else {
        await interaction.reply({
          content: "Terjadi kesalahan tak terduga.",
          flags: [MessageFlags.Ephemeral],
        });
      }
    }
    return;
  }

  if (interaction.isStringSelectMenu()) {
    const handled = await handleHelpSelect(interaction);
    if (handled) return;
  }
});

client.login(config.discord.token);
