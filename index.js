import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  REST,
  Routes,
  ChannelType
} from 'discord.js';
import fs from 'fs-extra';
import { fetchServerStatus } from './utils/serverStatus.js';
import { startStatusApiServer } from './statusApiServer.js';

const {
  DISCORD_TOKEN,
  CLIENT_ID,
  GUILD_ID,
  STATUS_CHANNEL_ID,
  API_URL,
  IMAGE_URL,
  UPDATE_INTERVAL_MS = 300000,
  BOT_BRAND = 'UBV Bot',
  BRAND_TAGLINE = 'Status Universitas Brawijaya Voice',
  ROBLOX_UNIVERSE_ID,
  STATUS_API_PORT,
  STATUS_CACHE_MS,
  ROBLOX_PROMO_MESSAGE
} = process.env;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const DATA_FILE = './data/status.json';
const statusCacheMs = Number(STATUS_CACHE_MS ?? 30000);
const statusApiPort = Number(STATUS_API_PORT ?? process.env.PORT ?? 3000);

// pastikan folder data ada
await fs.ensureDir('./data');

startStatusApiServer({
  universeId: ROBLOX_UNIVERSE_ID,
  port: statusApiPort,
  cacheMs: statusCacheMs,
  promoMessage: ROBLOX_PROMO_MESSAGE
});

function buildEmbed(status) {
  const players = `${status.activePlayers}/${status.maxPlayers}`;
  const anomalyText =
    status.anomalies > 0
      ? `✨ **${status.anomalies} anomali sedang berjaga!**`
      : '✅ Tidak ada anomali terdeteksi.';

  const isDegraded = Boolean(status.degraded);
  return new EmbedBuilder()
    .setColor(isDegraded ? 0xED4245 : 0x57F287)
    .setTitle('🦜 Status Server Terbaru')
    .addFields(
      { name: '🆔 Server ID', value: status.id, inline: false },
      { name: '👥 Pemain Aktif', value: players, inline: true },
      { name: '🌍 Region', value: status.region, inline: true }
    )
    .setDescription(`${anomalyText}\n\n💬 ${status.promo}`)
    .setImage(IMAGE_URL)
    .setFooter({ text: `${BOT_BRAND} • 🔁 Auto Update` })
    .setTimestamp(new Date());
}

async function upsertStatusMessage(channel) {
  const status = await fetchServerStatus(API_URL, {
    universeId: ROBLOX_UNIVERSE_ID,
    cacheMs: statusCacheMs,
    promoMessage: ROBLOX_PROMO_MESSAGE
  });
  const embed = buildEmbed(status);

  let saved = await fs.readJson(DATA_FILE).catch(() => ({}));

  try {
    if (saved.messageId) {
      const msg = await channel.messages.fetch(saved.messageId);
      await msg.edit({ embeds: [embed] });
      console.log('✅ Status diperbarui (edit pesan lama).');
    } else {
      const msg = await channel.send({ embeds: [embed] });
      saved.messageId = msg.id;
      await fs.writeJson(DATA_FILE, saved);
      console.log('✅ Pesan status baru dikirim.');
    }
  } catch {
    const msg = await channel.send({ embeds: [embed] });
    saved.messageId = msg.id;
    await fs.writeJson(DATA_FILE, saved);
    console.log('✅ Pesan status dikirim ulang.');
  }
}

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  const commands = [
    { name: 'status', description: 'Perbarui status server UBV sekarang' }
  ];

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
  console.log('✅ Slash command terdaftar.');
}

client.once('ready', async () => {
  console.log(`🤖 Logged in sebagai ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: BRAND_TAGLINE, type: 3 }],
    status: 'online'
  });

  await registerCommands();

  const channel = await client.channels.fetch(STATUS_CHANNEL_ID);
  if (!channel || channel.type !== ChannelType.GuildText) {
    console.error('❌ STATUS_CHANNEL_ID tidak valid.');
    process.exit(1);
  }

  await upsertStatusMessage(channel);
  setInterval(() => upsertStatusMessage(channel), Number(UPDATE_INTERVAL_MS));

  console.log(`🔁 Auto-update setiap ${UPDATE_INTERVAL_MS / 1000 / 60} menit.`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'status') {
    await interaction.deferReply({ ephemeral: true });
    const channel = await client.channels.fetch(STATUS_CHANNEL_ID);
    await upsertStatusMessage(channel);
    await interaction.editReply('✅ Status server UBV berhasil diperbarui!');
  }
});

client.login(DISCORD_TOKEN);
