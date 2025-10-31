import cron from "node-cron";
import { EmbedBuilder } from "discord.js";
import { readJsonSafe } from "../../data/jsonStore.js";

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

function parseDateString(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return {
      year: parseInt(parts[0], 10),
      month: parseInt(parts[1], 10),
      day: parseInt(parts[2], 10),
    };
  }
  if (parts.length === 2) {
    return {
      year: null,
      month: parseInt(parts[0], 10),
      day: parseInt(parts[1], 10),
    };
  }
  return null;
}

function isTodayBirthday(parsed) {
  if (!parsed?.month || !parsed.day) return false;
  const today = new Date();
  return today.getMonth() + 1 === parsed.month && today.getDate() === parsed.day;
}

function calculateAge(parsed) {
  if (!parsed?.year) return null;
  const today = new Date();
  return today.getFullYear() - parsed.year;
}

async function checkAndAnnounceBirthdays(client, config) {
  const { channelId } = config.birthdays;
  const { birthdays: birthdaysPath } = config.paths;

  if (!channelId) {
    console.log("⚠️ Birthday channel not configured. Skipping birthday check.");
    return;
  }

  try {
    const db = await readJsonSafe(birthdaysPath, {});
    const entries = Object.entries(db || {});

    if (!entries.length) {
      console.log("ℹ️ No birthdays in database.");
      return;
    }

    const todayBirthdays = [];

    for (const [userId, data] of entries) {
      const parsed = parseDateString(data.date);
      if (parsed && isTodayBirthday(parsed)) {
        const age = calculateAge(parsed);
        todayBirthdays.push({ userId, age });
      }
    }

    if (!todayBirthdays.length) {
      console.log("ℹ️ No birthdays today.");
      return;
    }

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      console.error("❌ Birthday channel not found or not a text channel.");
      return;
    }

    for (const birthday of todayBirthdays) {
      try {
        const ageText = birthday.age
          ? ` their ${birthday.age}${ordinalSuffix(birthday.age)}`
          : "";

        const embed = new EmbedBuilder()
          .setColor(0xffa500)
          .setTitle("🎉 Happy Birthday! 🎂")
          .setDescription(
            `Today is${ageText} birthday!\n\nLet's all wish <@${birthday.userId}> a wonderful day! 🎈🎊`
          )
          .setTimestamp()
          .setFooter({ text: "UBV Bot • Birthday Announcement" });

        await channel.send({
          content: `🎉 <@${birthday.userId}>`,
          embeds: [embed],
        });

        console.log(`🎂 Announced birthday for user ${birthday.userId}`);
      } catch (error) {
        console.error(`❌ Error announcing birthday for ${birthday.userId}:`, error.message);
      }
    }
  } catch (error) {
    console.error("❌ Error in birthday checker:", error.message);
  }
}

export function initBirthdayScheduler(client, config) {
  const { checkTime } = config.birthdays;
  const [hour, minute] = checkTime.split(":").map((n) => parseInt(n, 10));

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    console.error("❌ Invalid BIRTHDAY_CHECK_TIME format. Use HH:MM (e.g., 00:00)");
    return;
  }

  const cronExpression = `${minute} ${hour} * * *`;

  cron.schedule(
    cronExpression,
    async () => {
      console.log("🔔 Running birthday checker...");
      await checkAndAnnounceBirthdays(client, config);
    },
    {
      timezone: config.birthdays.timezone,
    }
  );

  console.log(
    `✅ Birthday scheduler initialized (${cronExpression} ${config.birthdays.timezone})`
  );
}

export async function checkBirthdaysNow(client, config) {
  console.log("🔔 Manual birthday check triggered...");
  await checkAndAnnounceBirthdays(client, config);
}
