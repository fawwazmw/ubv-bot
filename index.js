import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  REST,
  Routes,
  ChannelType,
  PermissionsBitField,
} from "discord.js";
import fs from "fs-extra";
import { fetchServerStatus } from "./utils/serverStatus.js";
import { startStatusApiServer } from "./statusApiServer.js";

const {
  DISCORD_TOKEN,
  CLIENT_ID,
  GUILD_ID,
  STATUS_CHANNEL_ID,
  API_URL,
  IMAGE_URL,
  UPDATE_INTERVAL_MS = 300000,
  BOT_BRAND = "UBV Bot",
  BRAND_TAGLINE = "/help",
  ROBLOX_UNIVERSE_ID,
  STATUS_API_PORT,
  STATUS_CACHE_MS,
  ROBLOX_PROMO_MESSAGE,
} = process.env;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const DATA_FILE = "./data/status.json";
const statusCacheMs = Number(STATUS_CACHE_MS ?? 30000);
const statusApiPort = Number(STATUS_API_PORT ?? process.env.PORT ?? 3000);

// pastikan folder data ada
await fs.ensureDir("./data");

// (No external leaderboard integration enabled)

startStatusApiServer({
  universeId: ROBLOX_UNIVERSE_ID,
  port: statusApiPort,
  cacheMs: statusCacheMs,
  promoMessage: ROBLOX_PROMO_MESSAGE,
});

function buildEmbed(status) {
  const players = `${status.activePlayers}/${status.maxPlayers}`;
  // owners (rank 255) take precedence in visibility, then admins (rank 254)
  const ownersCount = Number(status.owners ?? 0);
  const adminsCount = Number(status.admins ?? 0);
  const adminText =
    ownersCount > 0
      ? `👑 **${ownersCount} Owner${ownersCount > 1 ? "s" : ""} online**`
      : adminsCount > 0
      ? `✨ **${adminsCount} Admin${adminsCount > 1 ? "s" : ""} online**`
      : "✅ Tidak ada admin online.";

  const isDegraded = Boolean(status.degraded);
  return new EmbedBuilder()
    .setColor(isDegraded ? 0xed4245 : 0x57f287)
    .setTitle("🦜 Status Server Terbaru")
    .addFields(
      { name: "🆔 Server ID", value: status.id, inline: false },
      { name: "👥 Pemain Aktif", value: players, inline: true },
      { name: "🌍 Region", value: status.region, inline: true }
    )
    .setDescription(`${adminText}\n\n💬 ${status.promo || ""}`)
    .setImage(IMAGE_URL)
    .setFooter({ text: `${BOT_BRAND} • 🔁 Auto Update` })
    .setTimestamp(new Date());
}

async function upsertStatusMessage(channel) {
  const status = await fetchServerStatus(API_URL, {
    universeId: ROBLOX_UNIVERSE_ID,
    cacheMs: statusCacheMs,
    promoMessage: ROBLOX_PROMO_MESSAGE,
  });
  const embed = buildEmbed(status);

  let saved = await fs.readJson(DATA_FILE).catch(() => ({}));
  // Always send a new message for each update (do not edit previous messages).
  // This ensures every change appears as a new message in the channel.
  try {
    const msg = await channel.send({ embeds: [embed] });
    saved.messageId = msg.id; // keep latest id if needed for debugging
    await fs.writeJson(DATA_FILE, saved).catch(() => {});
    console.log("✅ Pesan status baru dikirim.");
  } catch (err) {
    console.error("❌ Gagal mengirim pesan status:", err?.message ?? err);
  }
}

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
  const commands = [
    { name: "status", description: "Perbarui status server UBV sekarang" },
    {
      name: "help",
      description: "Tampilkan daftar perintah dan plugin",
      options: [
        {
          name: "plugin_name",
          description: "Name of the plugin to get the commands for",
          type: 3, // STRING
          required: false,
          choices: [
            { name: "Birthdays", value: "birthdays" },
            { name: "Commands", value: "commands" },
            { name: "MEE6 AI", value: "ai" },
            { name: "Levels", value: "levels" },
            { name: "Moderator", value: "moderator" },
            { name: "Temporary Channels", value: "temporary_channels" },
            { name: "Ticketing", value: "ticketing" },
            { name: "Invite Tracker", value: "invite_tracker" },
            { name: "Emojis", value: "emojis" },
          ],
        },
      ],
    },
    {
      name: "forget-birthday",
      description: "Remove your saved birthday",
    },
    {
      name: "remember-birthday",
      description: "Save your birthday (examples: 1993-12-16 or 10-12)",
      options: [
        { name: "date", description: "Birthday date", type: 3, required: true },
      ],
    },
    {
      name: "set-user-birthday",
      description: "Set another member's birthday (admin/staff)",
      options: [
        {
          name: "date",
          description: "Birthday (ex: 1994-12-31 or 12-31)",
          type: 3,
          required: true,
        },
        {
          name: "member",
          description: "Member to set",
          type: 6,
          required: true,
        },
      ],
    },
    {
      name: "birthday",
      description: "Show your or another member's birthday",
      options: [
        {
          name: "member",
          description: "Member to check",
          type: 6,
          required: false,
        },
      ],
    },
    {
      name: "next-birthdays",
      description: "List upcoming birthdays (up to 10)",
    },
    // Levels/rank commands removed (MEE6 integration disabled)
  ];

  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
    body: commands,
  });
  console.log("✅ Slash command terdaftar.");
}

client.once("ready", async () => {
  console.log(`🤖 Logged in sebagai ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: "/help", type: 2 }], // type 2 = Listening
    status: "online",
  });

  await registerCommands();

  const channel = await client.channels.fetch(STATUS_CHANNEL_ID);
  if (!channel || channel.type !== ChannelType.GuildText) {
    console.error("❌ STATUS_CHANNEL_ID tidak valid.");
    process.exit(1);
  }

  await upsertStatusMessage(channel);
  setInterval(() => upsertStatusMessage(channel), Number(UPDATE_INTERVAL_MS));

  console.log(`🔁 Auto-update setiap ${UPDATE_INTERVAL_MS / 1000 / 60} menit.`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === "help") {
    // Prepare bot image
    const botImage =
      (interaction.client?.user?.displayAvatarURL
        ? interaction.client.user.displayAvatarURL({
            extension: "png",
            size: 1024,
          })
        : null) ||
      IMAGE_URL ||
      "https://cdn.discordapp.com/embed/avatars/0.png";

    // Helper: fetch guild application commands once and try to build a slash-mention
    let _guildCommandsCache = null;
    async function getCommandMention(cmdName) {
      try {
        if (!_guildCommandsCache) {
          _guildCommandsCache =
            await interaction.client.application.commands.fetch({
              guildId: GUILD_ID,
            });
        }
        const found = _guildCommandsCache.find((c) => c.name === cmdName);
        if (found && found.id) return `</${found.name}:${found.id}>`;
      } catch (e) {
        // ignore and fallback
      }
      return `\`/${cmdName}\``; // fallback to inline code
    }

    // Build plugin-specific embed; returns EmbedBuilder or null if unknown
    async function buildPluginEmbed(key) {
      if (key === "birthdays") {
        const { EmbedBuilder } = await import("discord.js");
        const embed = new EmbedBuilder()
          .setTitle("Birthdays Plugin")
          .setColor(0xffa500)
          .setThumbnail(botImage)
          .setDescription(
            "Track your members birthdays and automatically wish them a happy birthday"
          )
          .setFooter({ text: "UBV Bot • Birthdays commands" });

        // Commands for Birthdays plugin
        const cmds = [
          {
            name: "forget-birthday",
            hint: "Remove your birthday",
            extra: null,
          },
          {
            name: "next-birthdays",
            hint: "List up to 10 upcoming birthdays",
            extra: null,
          },
          {
            name: "remember-birthday",
            hint: "Add your birthday",
            extra: "[date]",
          },
          {
            name: "birthday",
            hint: "Show your birthday or another member's birthday",
            extra: "(optional member)",
          },
        ];

        for (const c of cmds) {
          const mention = await getCommandMention(c.name);
          const extra = c.extra ? ` ${"`" + c.extra + "`"}` : "";
          // Use the mention as the field name so it looks prominent, description in value
          embed.addFields({
            name: `${mention}${extra}`,
            value: c.hint,
            inline: false,
          });
        }

        return embed;
      }
      // other plugin keys handled above
      return null;
    }

    // If user provided the optional plugin_name in the slash command, reply with the plugin help
    const providedPlugin = interaction.options?.getString?.("plugin_name");
    if (providedPlugin) {
      const pluginEmbed = await buildPluginEmbed(providedPlugin);
      if (pluginEmbed) {
        await interaction.reply({ embeds: [pluginEmbed], ephemeral: false });
        return;
      }
      // fallback to the simple ephemeral autofill behavior
      await interaction.reply({
        content: `/help ${providedPlugin}`,
        ephemeral: true,
      });
      return;
    }

    // Daftar plugin dan command
    const plugins = [
      { name: "Birthdays", value: "/help birthdays" },
      { name: "Commands", value: "/help commands" },
      { name: "Ticketing", value: "/help ticketing" },
      { name: "Invite Tracker", value: "/help invite_tracker" },
      { name: "MEE6 AI", value: "/help ai" },
      { name: "Moderator", value: "/help moderator" },
      { name: "Temporary Channels", value: "/help temporary_channels" },
      { name: "Emojis", value: "/help emojis" },
    ];

    // Import komponen Discord.js
    const {
      ActionRowBuilder,
      StringSelectMenuBuilder,
      StringSelectMenuOptionBuilder,
    } = await import("discord.js");

    // Try to build a clickable slash-command mention for /help (</help:ID>) so it renders blue
    let helpMention = "/help";
    try {
      // fetch guild application commands and find the help command
      const guildCommands = await interaction.client.application.commands.fetch(
        { guildId: GUILD_ID }
      );
      const helpCmd = guildCommands.find((c) => c.name === "help");
      if (helpCmd && helpCmd.id) helpMention = `</help:${helpCmd.id}>`;
    } catch (e) {
      // fallback to plain text if anything fails
      helpMention = "/help";
    }

    // Embed daftar command plugin
    const embed = new EmbedBuilder()
      .setColor(0x23272a)
      .setTitle("🦜 UBV Bot Plugins Commands")
      .setThumbnail(botImage)
      .addFields(
        ...plugins.map((plugin) => {
          // plugin.value like '/help birthdays' -> sub = 'birthdays'
          const parts = plugin.value.split(" ");
          const sub = parts.slice(1).join(" ");
          const subCode = sub ? "`" + sub + "`" : "";
          return {
            name: plugin.name,
            value: `${helpMention} ${subCode}`.trim(),
            inline: true,
          };
        })
      )
      .setFooter({ text: "Select the plugin for which you need help" });

    // Root select menu with a single "+1 option" called plugin_name
    const rootMenu = new StringSelectMenuBuilder()
      .setCustomId("help_root")
      .setPlaceholder("Select the plugin for which you need help")
      .addOptions([
        {
          label: "plugin_name",
          description: "Open plugin list",
          value: "plugin_name",
        },
      ]);
    const rootRow = new ActionRowBuilder().addComponents(rootMenu);

    await interaction.reply({
      embeds: [embed],
      components: [rootRow],
      ephemeral: false,
    });
  }

  // Levels/rank commands removed — MEE6 integration disabled

  // -- Birthdays plugin commands handling --
  // data file for birthdays
  const BIRTHDAYS_FILE = "./data/birthdays.json";

  // Helper to load/save birthdays
  async function loadBirthdays() {
    return (await fs.readJson(BIRTHDAYS_FILE).catch(() => ({}))) || {};
  }
  async function saveBirthdays(obj) {
    await fs.writeJson(BIRTHDAYS_FILE, obj);
  }

  // Date parsing/validation helper - accepts 'YYYY-MM-DD' or 'MM-DD' (also accepts '/' separator)
  function validateAndNormalizeDate(input) {
    if (!input || typeof input !== "string") return null;
    const s = input.trim();
    const parts = s.split(/[-\/]/).map((p) => p.trim());
    const todayYear = new Date().getFullYear();

    function isValidYMD(y, m, d) {
      if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d))
        return false;
      if (m < 1 || m > 12) return false;
      const maxDay = new Date(y, m, 0).getDate();
      if (d < 1 || d > maxDay) return false;
      return true;
    }

    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (!isValidYMD(y, m, d)) return null;
      // reasonable year bounds
      if (y < 1900 || y > todayYear) return null;
      const normalized = `${y}-${String(m).padStart(2, "0")}-${String(
        d
      ).padStart(2, "0")}`;
      return { year: y, month: m, day: d, normalized };
    }

    if (parts.length === 2) {
      const m = parseInt(parts[0], 10);
      const d = parseInt(parts[1], 10);
      // use leap-year safe year for validation (2000 is leap)
      if (!isValidYMD(2000, m, d)) return null;
      const normalized = `${String(m).padStart(2, "0")}-${String(d).padStart(
        2,
        "0"
      )}`;
      return { year: null, month: m, day: d, normalized };
    }

    return null;
  }

  // /forget-birthday
  if (interaction.commandName === "forget-birthday") {
    const targetId = interaction.user.id;
    const db = await loadBirthdays();
    if (!db[targetId]) {
      // build the "I don't know X's birthday yet" embed like the attachment
      // try to get real slash mentions for remember-birthday and set-user-birthday
      let guildCommands = null;
      try {
        guildCommands = await interaction.client.application.commands.fetch({
          guildId: GUILD_ID,
        });
      } catch (e) {
        guildCommands = null;
      }

      const mkMention = (name) => {
        try {
          const f = guildCommands && guildCommands.find((c) => c.name === name);
          if (f && f.id) return `</${f.name}:${f.id}>`;
        } catch (e) {}
        return `\`/${name}\``;
      };

      const rememberCmd = mkMention("remember-birthday");
      const setUserCmd = mkMention("set-user-birthday");

      const botImage =
        (interaction.client?.user?.displayAvatarURL
          ? interaction.client.user.displayAvatarURL({
              extension: "png",
              size: 1024,
            })
          : null) ||
        IMAGE_URL ||
        "https://cdn.discordapp.com/embed/avatars/0.png";

      const { EmbedBuilder } = await import("discord.js");
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setDescription(
          `I don't know ${interaction.user.toString()}'s birthday yet.`
        )
        .addFields({
          name: "",
          value: `Use the ${rememberCmd} or ${setUserCmd} commands to set a birthday.`,
        })
        .addFields({
          name: "Examples:",
          value: `• ${rememberCmd} \`10-12\`\n• ${rememberCmd} \`1993-12-16\`\n• ${setUserCmd} \`1994-4-15\` \`@MEE6\``,
        });

      await interaction.reply({ embeds: [embed], ephemeral: false });
      return;
    }

    // If the birthday exists, remove it
    delete db[targetId];
    await saveBirthdays(db);
    // reply with a nicer embed similar to the example
    const { EmbedBuilder } = await import("discord.js");
    const embed = new EmbedBuilder()
      .setColor(0xffa500)
      .setDescription(
        `Duly noted, I will not wish ${interaction.user.toString()}'s birthday anymore.`
      );
    await interaction.reply({ embeds: [embed], ephemeral: false });
    return;
  }

  // /remember-birthday
  if (interaction.commandName === "remember-birthday") {
    const dateStr = interaction.options.getString("date");
    const id = interaction.user.id;
    const parsed = validateAndNormalizeDate(String(dateStr));
    if (!parsed) {
      const { EmbedBuilder } = await import("discord.js");
      const err = new EmbedBuilder()
        .setColor(0xed4245)
        .setDescription(
          "Invalid date format. Use `YYYY-MM-DD` (year optional) or `MM-DD`. Examples: `1993-12-16`, `10-12`."
        );
      await interaction.reply({ embeds: [err], ephemeral: true });
      return;
    }

    const db = await loadBirthdays();
    // store the normalized string (YYYY-MM-DD or MM-DD)
    db[id] = { date: parsed.normalized };
    await saveBirthdays(db);
    let replyEmbed = null;
    if (parsed && parsed.month && parsed.day) {
      const today = new Date();
      const thisYear = today.getFullYear();
      let occYear = thisYear;
      let occ = new Date(occYear, parsed.month - 1, parsed.day);
      const todayTime = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      ).getTime();
      const occTime = new Date(
        occ.getFullYear(),
        occ.getMonth(),
        occ.getDate()
      ).getTime();
      if (occTime < todayTime) {
        occYear = thisYear + 1;
        occ = new Date(occYear, parsed.month - 1, parsed.day);
      }
      const msPerDay = 1000 * 60 * 60 * 24;
      const days = Math.round(
        (new Date(occ.getFullYear(), occ.getMonth(), occ.getDate()).getTime() -
          todayTime) /
          msPerDay
      );
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      const formatted = `${String(parsed.day).padStart(2, "0")} ${
        monthNames[parsed.month - 1]
      } ${occ.getFullYear()}`;
      const age = parsed.year ? occ.getFullYear() - parsed.year : null;
      const ageText = age
        ? `${age}${
            age % 10 === 1 && age !== 11
              ? "st"
              : age % 10 === 2 && age !== 12
              ? "nd"
              : age % 10 === 3 && age !== 13
              ? "rd"
              : "th"
          }`
        : null;

      const { EmbedBuilder } = await import("discord.js");
      replyEmbed = new EmbedBuilder()
        .setColor(0xffa500)
        .setDescription(
          `Duly noted, I'll wish ${interaction.user.toString()}'s ${
            ageText ? ageText + " " : ""
          }birthday in ${days} days, on ${formatted} 🕯️`
        );
    }

    if (replyEmbed) {
      await interaction.reply({ embeds: [replyEmbed], ephemeral: false });
      return;
    }

    // fallback simple reply
    await interaction.reply({
      content: `Saved your birthday as ${dateStr}.`,
      ephemeral: false,
    });
    return;
  }

  // /set-user-birthday - admin/staff can set another member's birthday
  if (interaction.commandName === "set-user-birthday") {
    // permission check: require ManageGuild
    const hasPerms = interaction.member?.permissions?.has?.(
      PermissionsBitField.Flags.ManageGuild
    );
    if (!hasPerms) {
      const { EmbedBuilder } = await import("discord.js");
      const err = new EmbedBuilder()
        .setColor(0xed4245)
        .setDescription("Missing Permissions");
      await interaction.reply({ embeds: [err], ephemeral: true });
      return;
    }

    const date = interaction.options.getString("date");
    const member = interaction.options.getUser("member");
    if (!member) {
      await interaction.reply({
        content: "Member not found.",
        ephemeral: true,
      });
      return;
    }
    // validate and normalize before saving
    const parsed = validateAndNormalizeDate(String(date));
    if (!parsed) {
      const { EmbedBuilder } = await import("discord.js");
      const err = new EmbedBuilder()
        .setColor(0xed4245)
        .setDescription(
          "Invalid date format. Use `YYYY-MM-DD` (year optional) or `MM-DD`. Examples: `1993-12-16`, `10-12`."
        );
      await interaction.reply({ embeds: [err], ephemeral: true });
      return;
    }

    const db = await loadBirthdays();
    db[member.id] = { date: parsed.normalized };
    await saveBirthdays(db);
    await interaction.reply({
      content: `Set ${member.toString()}'s birthday to ${parsed.normalized}.`,
      ephemeral: true,
    });
    return;
  }

  // /birthday - show your or another member's birthday
  if (interaction.commandName === "birthday") {
    const member = interaction.options.getUser("member") || interaction.user;
    const db = await loadBirthdays();
    const record = db[member.id];
    // If missing, show helpful embed with examples
    if (!record) {
      const { EmbedBuilder } = await import("discord.js");
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setDescription(`I don't know ${member.toString()}'s birthday yet.`)
        .addFields({
          name: "How to set a birthday",
          value:
            "Use `/remember-birthday <date>` to add your birthday or `/set-user-birthday <date> @member` to set someone else's.",
        })
        .addFields({
          name: "Examples",
          value:
            "• `/remember-birthday 10-12`\n• `/remember-birthday 1993-12-16`\n• `/set-user-birthday 1994-04-15 @Someone`",
        });
      await interaction.reply({ embeds: [embed], ephemeral: false });
      return;
    }

    // parse the stored (normalized) date
    const parsed = validateAndNormalizeDate(String(record.date));
    if (!parsed || !parsed.month || !parsed.day) {
      // fallback: show raw stored value if it's somehow invalid
      await interaction.reply({
        content: `${member.username}'s birthday is ${record.date}`,
        ephemeral: false,
      });
      return;
    }

    // compute next occurrence and age
    const today = new Date();
    const thisYear = today.getFullYear();
    let occYear = thisYear;
    let occ = new Date(occYear, parsed.month - 1, parsed.day);
    const todayTime = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    ).getTime();
    const occTime = new Date(
      occ.getFullYear(),
      occ.getMonth(),
      occ.getDate()
    ).getTime();
    if (occTime < todayTime) {
      occYear = thisYear + 1;
      occ = new Date(occYear, parsed.month - 1, parsed.day);
    }
    const msPerDay = 1000 * 60 * 60 * 24;
    const days = Math.round(
      (new Date(occ.getFullYear(), occ.getMonth(), occ.getDate()).getTime() -
        todayTime) /
        msPerDay
    );

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const formatted = `${String(parsed.day).padStart(2, "0")} ${
      monthNames[parsed.month - 1]
    } ${occ.getFullYear()}`;
    const age = parsed.year ? occ.getFullYear() - parsed.year : null;
    const ageText = age
      ? `${age}${
          age % 10 === 1 && age !== 11
            ? "st"
            : age % 10 === 2 && age !== 12
            ? "nd"
            : age % 10 === 3 && age !== 13
            ? "rd"
            : "th"
        }`
      : null;

    const { EmbedBuilder } = await import("discord.js");
    const desc =
      days === 0
        ? `${member.toString()}'s ${
            ageText ? ageText + " " : ""
          }birthday is today! 🎉`
        : `${member.toString()}'s ${
            ageText ? ageText + " " : ""
          }birthday is in ${days} days, on ${formatted} 🕯️`;

    const embed = new EmbedBuilder().setColor(0xffa500).setDescription(desc);

    await interaction.reply({ embeds: [embed], ephemeral: false });
    return;
  }

  // /next-birthdays (simple stub)
  if (interaction.commandName === "next-birthdays") {
    // fixed default: show up to 10 upcoming birthdays
    const limit = 10;
    const db = await loadBirthdays();

    const entries = Object.entries(db || {});
    if (!entries.length) {
      await interaction.reply({
        content: "No birthdays known.",
        ephemeral: true,
      });
      return;
    }

    // parse stored date strings and compute next occurrence and age when possible
    const today = new Date();
    const todayY = today.getFullYear();
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const upcoming = entries
      .map(([id, v]) => {
        const parsed = validateAndNormalizeDate(String(v.date));
        if (!parsed) return null;
        const { year: byear, month, day } = parsed;
        if (!month || !day) return null;
        // compute next occurrence
        let occYear = todayY;
        const occ = new Date(occYear, month - 1, day);
        // normalize date-only comparisons (zero time)
        const occTime = new Date(
          occ.getFullYear(),
          occ.getMonth(),
          occ.getDate()
        ).getTime();
        const todayTime = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        ).getTime();
        if (occTime < todayTime) {
          occYear = todayY + 1;
        }
        const nextDate = new Date(occYear, month - 1, day);
        const age = byear ? occYear - byear : null;
        const heading = `${String(day).padStart(2, "0")} ${
          monthNames[month - 1]
        } ${nextDate.getFullYear()}`;
        return { id, dateRaw: parsed.normalized, nextDate, heading, age };
      })
      .filter(Boolean)
      .sort((a, b) => a.nextDate - b.nextDate);

    if (!upcoming.length) {
      await interaction.reply({
        content: "No valid birthday dates found.",
        ephemeral: true,
      });
      return;
    }

    // build message grouped by date, limit = number of people shown
    let count = 0;
    let lastHeading = null;
    const lines = [];
    for (const item of upcoming) {
      if (count >= limit) break;
      const isToday =
        item.nextDate.getFullYear() === today.getFullYear() &&
        item.nextDate.getMonth() === today.getMonth() &&
        item.nextDate.getDate() === today.getDate();
      const heading = isToday ? "Today" : item.heading;
      if (heading !== lastHeading) {
        if (lines.length) lines.push("");
        lines.push(heading);
        lastHeading = heading;
      }

      // try to resolve a nicer display name from the guild
      let display = null;
      try {
        const guild = interaction.guild;
        if (guild) {
          const cached = guild.members.cache.get(item.id);
          const fetched =
            cached || (await guild.members.fetch(item.id).catch(() => null));
          if (fetched) display = fetched.displayName;
        }
      } catch (e) {
        display = null;
      }

      const mentionOrName = display ? `${display}` : `<@${item.id}>`;
      const ageText = item.age ? ` (${item.age})` : "";
      lines.push(`${mentionOrName}${ageText}`);
      count += 1;
    }

    // Send embed similar to reference
    const { EmbedBuilder } = await import("discord.js");
    const embed = new EmbedBuilder()
      .setTitle("Upcoming birthdays")
      .setColor(0x23272a)
      .setDescription(lines.join("\n"));

    await interaction.reply({ embeds: [embed], ephemeral: false });
    return;
  }
});

// Handler tombol help agar mengisi chat user
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;

  // If user selected the root 'plugin_name' option, replace the components with the full plugin list
  if (interaction.customId === "help_root") {
    const val = interaction.values[0];
    if (val === "plugin_name") {
      // rebuild plugins list
      const plugins = [
        { name: "Birthdays", value: "/help birthdays" },
        { name: "Commands", value: "/help commands" },
        { name: "Levels", value: "/help levels" },
        { name: "Ticketing", value: "/help ticketing" },
        { name: "Invite Tracker", value: "/help invite_tracker" },
        { name: "MEE6 AI", value: "/help ai" },
        { name: "Moderator", value: "/help moderator" },
        { name: "Temporary Channels", value: "/help temporary_channels" },
        { name: "Emojis", value: "/help emojis" },
      ];

      const {
        ActionRowBuilder,
        StringSelectMenuBuilder,
        StringSelectMenuOptionBuilder,
      } = await import("discord.js");

      const pluginMenu = new StringSelectMenuBuilder()
        .setCustomId("plugin_select")
        .setPlaceholder("Select a plugin")
        .addOptions(
          plugins.map((plugin) => ({
            label: plugin.name,
            description: `Bantuan untuk ${plugin.value}`,
            value: plugin.value.replace("/help ", ""),
          }))
        );

      const pluginRow = new ActionRowBuilder().addComponents(pluginMenu);

      // Update the original message to replace the root select with the plugin list select
      try {
        await interaction.update({ components: [pluginRow] });
      } catch (e) {
        // If update fails (message deleted or other), send ephemeral fallback
        await interaction.reply({
          content: "Unable to open plugin list here, try again.",
          ephemeral: true,
        });
      }
    }
    return;
  }

  // When a plugin is selected, reply with the autofill command
  if (interaction.customId === "plugin_select") {
    const selected = interaction.values[0];
    // If birthdays selected, send a rich embed like the attachment
    if (selected === "birthdays") {
      const { EmbedBuilder } = await import("discord.js");
      const botImage =
        (interaction.client?.user?.displayAvatarURL
          ? interaction.client.user.displayAvatarURL({
              extension: "png",
              size: 1024,
            })
          : null) ||
        IMAGE_URL ||
        "https://cdn.discordapp.com/embed/avatars/0.png";

      // Try to fetch guild commands to render real slash mentions when possible
      let guildCommands = null;
      try {
        guildCommands = await interaction.client.application.commands.fetch({
          guildId: GUILD_ID,
        });
      } catch (e) {
        guildCommands = null;
      }

      const mentionFor = (name) => {
        try {
          const f = guildCommands && guildCommands.find((c) => c.name === name);
          if (f && f.id) return `</${f.name}:${f.id}>`;
        } catch (e) {
          /* ignore */
        }
        return `\`/${name}\``;
      };

      const embed = new EmbedBuilder()
        .setTitle("Birthdays Plugin")
        .setColor(0xffa500)
        .setThumbnail(botImage)
        .setDescription(
          "Track your members birthdays and automatically wish them a happy birthday"
        )
        .setFooter({ text: "UBV Bot • Birthdays commands" });

      const cmds = [
        { name: "forget-birthday", hint: "Remove your birthday", extra: null },
        {
          name: "next-birthdays",
          hint: "List up to 10 upcoming birthdays",
          extra: null,
        },
        {
          name: "remember-birthday",
          hint: "Add your birthday",
          extra: "[date]",
        },
        {
          name: "birthday",
          hint: "Show your birthday or another member's birthday",
          extra: "(optional member)",
        },
      ];

      for (const c of cmds) {
        const mention = mentionFor(c.name);
        const extra = c.extra ? ` ${"`" + c.extra + "`"}` : "";
        embed.addFields({
          name: `${mention}${extra}`,
          value: c.hint,
          inline: false,
        });
      }

      await interaction.reply({ embeds: [embed], ephemeral: false });
      return;
    }

    // If levels selected, send the Levels plugin embed
    if (selected === "levels") {
      const { EmbedBuilder } = await import("discord.js");
      const botImage =
        (interaction.client?.user?.displayAvatarURL
          ? interaction.client.user.displayAvatarURL({
              extension: "png",
              size: 1024,
            })
          : null) ||
        IMAGE_URL ||
        "https://cdn.discordapp.com/embed/avatars/0.png";

      // Try to fetch guild commands to render real slash mentions when possible
      let guildCommands = null;
      try {
        guildCommands = await interaction.client.application.commands.fetch({
          guildId: GUILD_ID,
        });
      } catch (e) {
        guildCommands = null;
      }

      const mentionFor = (name) => {
        try {
          const f = guildCommands && guildCommands.find((c) => c.name === name);
          if (f && f.id) return `</${f.name}:${f.id}>`;
        } catch (e) {
          /* ignore */
        }
        return `\`/${name}\``;
      };

      const embed = new EmbedBuilder()
        .setTitle("Levels Plugin")
        .setColor(0x5865f2)
        .setThumbnail(botImage)
        .setDescription(
          "Give your members XP and Levels when they send messages and rank them by activity in a leaderboard"
        )
        .setFooter({ text: "UBV Bot • Levels commands" });

      const cmds = [
        { name: "levels", hint: "Get a link to the leaderboard", extra: null },
        {
          name: "rank",
          hint: "Get your rank or another member's rank",
          extra: "(optional member)",
        },
      ];

      for (const c of cmds) {
        const mention = mentionFor(c.name);
        const extra = c.extra ? ` ${"`" + c.extra + "`"}` : "";
        embed.addFields({
          name: `${mention}${extra}`,
          value: c.hint,
          inline: false,
        });
      }

      await interaction.reply({ embeds: [embed], ephemeral: false });
      return;
    }

    await interaction.reply({ content: `/help ${selected}`, ephemeral: true });
  }
});

client.login(DISCORD_TOKEN);
