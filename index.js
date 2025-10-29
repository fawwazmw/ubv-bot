import "dotenv/config";
import { Client, GatewayIntentBits, REST, Routes } from "discord.js";
import { config } from "./src/config/env.js";
import { StatusManager } from "./src/status/statusManager.js";
import { startStatusApiServer } from "./src/status/statusApiServer.js";
import { buildCommandRegistry } from "./src/discord/commandRegistry.js";
import { createHelpSelectHandler } from "./src/discord/helpSelectHandler.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const statusManager = new StatusManager(config);
await statusManager.init();

const { commands, registry } = buildCommandRegistry({
  config,
  statusManager,
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

await startStatusApiServer({
  universeId: config.roblox.universeId,
  port: config.statusApi.port,
  promoMessage: config.status.promoMessage,
  secret: config.statusApi.secret,
  storagePath: config.paths.lastPushedStatus,
});

const handleHelpSelect = createHelpSelectHandler({
  branding: config.branding,
  discord: config.discord,
});

client.once("ready", async () => {
  console.log(`🤖 Logged in sebagai ${client.user.tag}`);
  client.user.setPresence({
    activities: [
      {
        name: config.branding.tagline || "/help",
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

  let statusChannel = null;
  try {
    statusChannel = await statusManager.resolveChannel(client);
  } catch (error) {
    console.error("❌ STATUS_CHANNEL_ID tidak valid:", error?.message ?? error);
    process.exit(1);
  }

  try {
    await statusManager.refresh(statusChannel, { force: true });
  } catch (error) {
    console.error("❌ Gagal mengirim status awal:", error?.message ?? error);
  }

  if (config.status.updateIntervalMs > 0) {
    setInterval(() => {
      statusManager
        .refresh(statusChannel)
        .catch((error) =>
          console.error(
            "❌ Gagal memperbarui status:",
            error?.message ?? error
          )
        );
    }, config.status.updateIntervalMs);

    console.log(
      `🔁 Auto-update setiap ${config.status.updateIntervalMs / 60000} menit.`
    );
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
          ephemeral: true,
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
