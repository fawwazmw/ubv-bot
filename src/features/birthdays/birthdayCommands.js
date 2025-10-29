import {
  EmbedBuilder,
  PermissionsBitField,
} from "discord.js";
import { createMentionFetcher } from "../../discord/commandMentions.js";
import { readJsonSafe, writeJsonSafe } from "../../data/jsonStore.js";

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

class BirthdayStore {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async load() {
    return readJsonSafe(this.filePath, {});
  }

  async save(data) {
    await writeJsonSafe(this.filePath, data);
  }
}

function ordinalSuffix(value) {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  switch (value % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function validateAndNormalizeDate(input) {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();
  const parts = trimmed.split(/[-\/]/).map((p) => p.trim());
  const currentYear = new Date().getFullYear();

  function isValidYMD(y, m, d) {
    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) {
      return false;
    }
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
    if (y < 1900 || y > currentYear) return null;
    return {
      year: y,
      month: m,
      day: d,
      normalized: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(
        2,
        "0"
      )}`,
    };
  }

  if (parts.length === 2) {
    const m = parseInt(parts[0], 10);
    const d = parseInt(parts[1], 10);
    if (!isValidYMD(2000, m, d)) return null;
    return {
      year: null,
      month: m,
      day: d,
      normalized: `${String(m).padStart(2, "0")}-${String(d).padStart(
        2,
        "0"
      )}`,
    };
  }

  return null;
}

function computeNextOccurrence(parsed) {
  if (!parsed?.month || !parsed.day) return null;

  const today = new Date();
  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).getTime();
  let occurrence = new Date(
    today.getFullYear(),
    parsed.month - 1,
    parsed.day
  );
  let occurrenceMidnight = new Date(
    occurrence.getFullYear(),
    occurrence.getMonth(),
    occurrence.getDate()
  ).getTime();

  if (occurrenceMidnight < todayMidnight) {
    occurrence = new Date(
      today.getFullYear() + 1,
      parsed.month - 1,
      parsed.day
    );
    occurrenceMidnight = new Date(
      occurrence.getFullYear(),
      occurrence.getMonth(),
      occurrence.getDate()
    ).getTime();
  }

  const daysUntil = Math.round((occurrenceMidnight - todayMidnight) / 86_400_000);
  const formatted = `${String(parsed.day).padStart(2, "0")} ${
    monthNames[parsed.month - 1]
  } ${occurrence.getFullYear()}`;
  const age = parsed.year ? occurrence.getFullYear() - parsed.year : null;
  const ageText = Number.isInteger(age)
    ? `${age}${ordinalSuffix(age)}`
    : null;

  return {
    occurrence,
    formatted,
    daysUntil,
    age,
    ageText,
  };
}

function resolveBotImage(interaction, branding) {
  return (
    (interaction.client?.user?.displayAvatarURL
      ? interaction.client.user.displayAvatarURL({
          extension: "png",
          size: 1024,
        })
      : null) ||
    branding.imageUrl ||
    "https://cdn.discordapp.com/embed/avatars/0.png"
  );
}

async function buildUnknownBirthdayEmbed({
  interaction,
  getMention,
  thumbnail,
}) {
  const rememberCmd = getMention
    ? await getMention("remember-birthday")
    : "/remember-birthday";
  const setUserCmd = getMention
    ? await getMention("set-user-birthday")
    : "/set-user-birthday";

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
      value: `• ${rememberCmd} \`10-12\`\n• ${rememberCmd} \`1993-12-16\`\n• ${setUserCmd} \`1994-04-15\` \`@MEE6\``,
    });

  if (thumbnail) {
    embed.setThumbnail(thumbnail);
  }
  return embed;
}

export function createBirthdayCommands({ filePath, branding, discord }) {
  const store = new BirthdayStore(filePath);

  return [
    {
      definition: {
        name: "forget-birthday",
        description: "Remove your saved birthday",
      },
      async execute(interaction) {
        const db = await store.load();
        const targetId = interaction.user.id;
        if (!db[targetId]) {
          const mentionFetcher = createMentionFetcher(
            interaction,
            discord.guildId
          );
          const getMention = (name) => mentionFetcher(name);
          const botImage = resolveBotImage(interaction, branding);
          const embed = await buildUnknownBirthdayEmbed({
            interaction,
            getMention,
            thumbnail: botImage,
          });
          await interaction.reply({ embeds: [embed], ephemeral: false });
          return;
        }

        delete db[targetId];
        await store.save(db);

        const embed = new EmbedBuilder()
          .setColor(0xffa500)
          .setDescription(
            `Duly noted, I will not wish ${interaction.user.toString()}'s birthday anymore.`
          );
        await interaction.reply({ embeds: [embed], ephemeral: false });
      },
    },
    {
      definition: {
        name: "remember-birthday",
        description: "Save your birthday (examples: 1993-12-16 or 10-12)",
        options: [
          {
            name: "date",
            description: "Birthday date",
            type: 3,
            required: true,
          },
        ],
      },
      async execute(interaction) {
        const dateStr = interaction.options.getString("date");
        const parsed = validateAndNormalizeDate(String(dateStr));
        if (!parsed) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(
              "Invalid date format. Use `YYYY-MM-DD` (year optional) or `MM-DD`. Examples: `1993-12-16`, `10-12`."
            );
          await interaction.reply({ embeds: [embed], ephemeral: true });
          return;
        }

        const db = await store.load();
        db[interaction.user.id] = { date: parsed.normalized };
        await store.save(db);

        const occurrence = computeNextOccurrence(parsed);
        if (occurrence) {
          const description =
            occurrence.daysUntil === 0
              ? `Duly noted, it's ${interaction.user.toString()}'s ${
                  occurrence.ageText ? `${occurrence.ageText} ` : ""
                }birthday today! 🎉`
              : `Duly noted, I'll wish ${interaction.user.toString()}'s ${
                  occurrence.ageText ? `${occurrence.ageText} ` : ""
                }birthday in ${occurrence.daysUntil} days, on ${
                  occurrence.formatted
                } 🕯️`;
          const embed = new EmbedBuilder()
            .setColor(0xffa500)
            .setDescription(description);
          await interaction.reply({ embeds: [embed], ephemeral: false });
          return;
        }

        await interaction.reply({
          content: `Saved your birthday as ${parsed.normalized}.`,
          ephemeral: false,
        });
      },
    },
    {
      definition: {
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
      async execute(interaction) {
        const hasPermissions =
          interaction.member?.permissions?.has?.(
            PermissionsBitField.Flags.ManageGuild
          ) || interaction.memberPermissions?.has?.(
            PermissionsBitField.Flags.ManageGuild
          );
        if (!hasPermissions) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription("Missing Permissions");
          await interaction.reply({ embeds: [embed], ephemeral: true });
          return;
        }

        const dateStr = interaction.options.getString("date");
        const member = interaction.options.getUser("member");
        if (!member) {
          await interaction.reply({
            content: "Member not found.",
            ephemeral: true,
          });
          return;
        }

        const parsed = validateAndNormalizeDate(String(dateStr));
        if (!parsed) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(
              "Invalid date format. Use `YYYY-MM-DD` (year optional) or `MM-DD`. Examples: `1993-12-16`, `10-12`."
            );
          await interaction.reply({ embeds: [embed], ephemeral: true });
          return;
        }

        const db = await store.load();
        db[member.id] = { date: parsed.normalized };
        await store.save(db);

        await interaction.reply({
          content: `Set ${member.toString()}'s birthday to ${parsed.normalized}.`,
          ephemeral: true,
        });
      },
    },
    {
      definition: {
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
      async execute(interaction) {
        const member = interaction.options.getUser("member") || interaction.user;
        const db = await store.load();
        const record = db[member.id];
        if (!record) {
          const mentionFetcher = createMentionFetcher(
            interaction,
            discord.guildId
          );
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(`I don't know ${member.toString()}'s birthday yet.`)
            .addFields({
              name: "How to set a birthday",
              value: `${await mentionFetcher(
                "remember-birthday"
              )} <date> atau ${await mentionFetcher(
                "set-user-birthday"
              )} <date> <@member>`,
            })
            .addFields({
              name: "Examples",
              value:
                "• `/remember-birthday 10-12`\n• `/remember-birthday 1993-12-16`\n• `/set-user-birthday 1994-04-15 @Someone`",
            });
          await interaction.reply({ embeds: [embed], ephemeral: false });
          return;
        }

        const parsed = validateAndNormalizeDate(String(record.date));
        if (!parsed) {
          await interaction.reply({
            content: `${member.username}'s birthday is ${record.date}`,
            ephemeral: false,
          });
          return;
        }

        const occurrence = computeNextOccurrence(parsed);
        if (!occurrence) {
          await interaction.reply({
            content: `${member.username}'s birthday is ${record.date}`,
            ephemeral: false,
          });
          return;
        }

        const description =
          occurrence.daysUntil === 0
            ? `${member.toString()}'s ${
                occurrence.ageText ? `${occurrence.ageText} ` : ""
              }birthday is today! 🎉`
            : `${member.toString()}'s ${
                occurrence.ageText ? `${occurrence.ageText} ` : ""
              }birthday is in ${occurrence.daysUntil} days, on ${
                occurrence.formatted
              } 🕯️`;

        const embed = new EmbedBuilder()
          .setColor(0xffa500)
          .setDescription(description);
        await interaction.reply({ embeds: [embed], ephemeral: false });
      },
    },
    {
      definition: {
        name: "next-birthdays",
        description: "List upcoming birthdays (up to 10)",
      },
      async execute(interaction) {
        const db = await store.load();
        const entries = Object.entries(db || {});
        if (!entries.length) {
          await interaction.reply({
            content: "No birthdays known.",
            ephemeral: true,
          });
          return;
        }

        const upcoming = entries
          .map(([id, value]) => {
            const parsed = validateAndNormalizeDate(String(value.date));
            if (!parsed) return null;
            const occurrence = computeNextOccurrence(parsed);
            if (!occurrence) return null;
            return {
              id,
              occurrence,
              heading: `${String(parsed.day).padStart(2, "0")} ${
                monthNames[parsed.month - 1]
              } ${occurrence.occurrence.getFullYear()}`,
            };
          })
          .filter(Boolean)
          .sort(
            (a, b) => a.occurrence.occurrence.getTime() - b.occurrence.occurrence.getTime()
          );

        if (!upcoming.length) {
          await interaction.reply({
            content: "No valid birthday dates found.",
            ephemeral: true,
          });
          return;
        }

        const today = new Date();
        const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
        const lines = [];
        let lastHeading = null;
        let count = 0;

        for (const item of upcoming) {
          if (count >= 10) break;
          const occDate = item.occurrence.occurrence;
          const occKey = `${occDate.getFullYear()}-${occDate.getMonth()}-${occDate.getDate()}`;
          const heading = occKey === todayKey ? "Today" : item.heading;
          if (heading !== lastHeading) {
            if (lines.length) lines.push("");
            lines.push(heading);
            lastHeading = heading;
          }

          let displayName = null;
          try {
            const guild = interaction.guild;
            if (guild) {
              const cached = guild.members.cache.get(item.id);
              const fetched =
                cached || (await guild.members.fetch(item.id).catch(() => null));
              if (fetched) displayName = fetched.displayName;
            }
          } catch (error) {
            displayName = null;
          }

          const mentionOrName = displayName
            ? `${displayName}`
            : `<@${item.id}>`;
          const ageText = item.occurrence.age
            ? ` (${item.occurrence.age})`
            : "";
          lines.push(`${mentionOrName}${ageText}`);
          count += 1;
        }

        const embed = new EmbedBuilder()
          .setTitle("Upcoming birthdays")
          .setColor(0x23272a)
          .setDescription(lines.join("\n"));
        await interaction.reply({ embeds: [embed], ephemeral: false });
      },
    },
  ];
}
