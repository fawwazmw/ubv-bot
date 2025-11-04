import { EmbedBuilder } from "discord.js";

export async function buildBirthdaysHelpEmbed({
  getCommandMention,
  thumbnail,
  tagline,
}) {
  const commands = [
    { name: "birthday", hint: "Show your birthday or another member's birthday", extra: "(optional member)" },
    { name: "remember-birthday", hint: "Add your birthday", extra: "[date]" },
    { name: "forget-birthday", hint: "Remove your birthday" },
    { name: "next-birthdays", hint: "List up to 10 upcoming birthdays" },
    { name: "set-user-birthday", hint: "Set another member's birthday (Admin)", extra: "[date] [@member]" },
    { name: "check-birthdays", hint: "Manually trigger birthday check (Admin)" },
    { name: "birthday-config", hint: "Show birthday system configuration (Admin)" },
  ];

  const embed = new EmbedBuilder()
    .setTitle("Birthdays Plugin")
    .setColor(0xffa500)
    .setFooter({ text: "UBV Bot • Birthdays commands" });

  const descriptionParts = [
    "Track your members birthdays and automatically wish them a happy birthday",
  ];
  if (tagline) {
    descriptionParts.unshift(tagline);
  }
  embed.setDescription(descriptionParts.join("\n\n"));

  if (thumbnail) {
    embed.setThumbnail(thumbnail);
  }

  for (const cmd of commands) {
    const mention = await getCommandMention(cmd.name);
    const extra = cmd.extra ? ` \`${cmd.extra}\`` : "";
    embed.addFields({
      name: `${mention}${extra}`,
      value: cmd.hint,
      inline: false,
    });
  }

  return embed;
}

export async function buildLevelsHelpEmbed({
  getCommandMention,
  thumbnail,
  tagline,
}) {
  const commands = [
    { name: "rank", hint: "Check your current level, XP, and rank position", extra: "(optional @user)" },
    { name: "leaderboard", hint: "View the top ranked members in the server", extra: "(optional page)" },
  ];

  const embed = new EmbedBuilder()
    .setTitle("⭐ Levels & Ranking System")
    .setColor(0x5865F2)
    .setFooter({ text: "UBV Bot • Levels commands" });

  const descriptionParts = [
    "**📊 How it works:**",
    "• Earn **15-25 XP** for each message you send",
    "• **1 minute cooldown** between XP gains (anti-spam)",
    "• Level up automatically when you reach enough XP",
    "• Compete with other members on the leaderboard!",
    "",
    "**📈 Level Formula:**",
    "`Level = floor(0.1 × √XP)`",
    "",
    "**🎯 Level Requirements:**",
    "• Level 1: 100 XP",
    "• Level 5: 2,500 XP",
    "• Level 10: 10,000 XP",
    "• Level 20: 40,000 XP",
  ];

  if (tagline) {
    descriptionParts.unshift(`*${tagline}*`, "");
  }

  embed.setDescription(descriptionParts.join("\n"));

  if (thumbnail) {
    embed.setThumbnail(thumbnail);
  }

  // Add a blank field for spacing
  embed.addFields({ name: "\u200B", value: "**📋 Available Commands:**", inline: false });

  for (const cmd of commands) {
    const mention = await getCommandMention(cmd.name);
    const extra = cmd.extra ? ` \`${cmd.extra}\`` : "";
    embed.addFields({
      name: `${mention}${extra}`,
      value: cmd.hint,
      inline: false,
    });
  }

  // Add tips section
  embed.addFields({
    name: "💡 Tips",
    value: "• Stay active in chat to gain more XP\n• Check `/rank` to see your progress\n• Compete for the top spot on `/leaderboard`\n• Level up notifications appear automatically!",
    inline: false,
  });

  return embed;
}

export async function buildTicketingHelpEmbed({
  getCommandMention,
  thumbnail,
  tagline,
}) {
  const userCommands = [
    { name: "ticket-info", hint: "View information about current ticket" },
  ];

  const staffCommands = [
    { name: "ticket-claim", hint: "Claim the current ticket (Staff only)" },
    { name: "ticket-add", hint: "Add user to current ticket (Staff only)", extra: "[@user]" },
    { name: "ticket-remove", hint: "Remove user from current ticket (Staff only)", extra: "[@user]" },
  ];

  const embed = new EmbedBuilder()
    .setTitle("🎫 Ticketing System")
    .setColor(0x5865F2)
    .setFooter({ text: "UBV Bot • Ticketing commands" });

  const descriptionParts = [
    "**📋 How it works:**",
    "• Click a category button on the ticket panel to create a ticket",
    "• A private channel will be created just for you and staff",
    "• Chat with staff to get help or submit requests",
    "• Click 'Tutup Ticket' when you're done",
    "",
    "**🎨 Ticket Categories:**",
    "• 🛠️ **Bantuan** - Get technical help and support",
    "• 📢 **Laporan** - Report issues or violations",
    "• 💡 **Saran** - Submit suggestions or ideas",
    "",
    "**⚠️ Rules:**",
    "• You can only have 1 active ticket at a time",
    "• Be patient, staff will respond as soon as possible",
    "• All messages are logged for transcript",
  ];

  if (tagline) {
    descriptionParts.unshift(`*${tagline}*`, "");
  }

  embed.setDescription(descriptionParts.join("\n"));

  if (thumbnail) {
    embed.setThumbnail(thumbnail);
  }

  // User Commands
  embed.addFields({ name: "\u200B", value: "**👤 User Commands:**", inline: false });
  for (const cmd of userCommands) {
    const mention = await getCommandMention(cmd.name);
    const extra = cmd.extra ? ` \`${cmd.extra}\`` : "";
    embed.addFields({
      name: `${mention}${extra}`,
      value: cmd.hint,
      inline: false,
    });
  }

  // Staff Commands
  embed.addFields({ name: "\u200B", value: "**👨‍💼 Staff Commands:**", inline: false });
  for (const cmd of staffCommands) {
    const mention = await getCommandMention(cmd.name);
    const extra = cmd.extra ? ` \`${cmd.extra}\`` : "";
    embed.addFields({
      name: `${mention}${extra}`,
      value: cmd.hint,
      inline: false,
    });
  }

  // Tips section
  embed.addFields({
    name: "💡 Tips",
    value: "• Click the appropriate category button based on your need\n• Only one ticket can be open at a time\n• Be clear and detailed when explaining your issue\n• Staff will respond as soon as possible\n• Click 'Tutup Ticket' when your issue is resolved",
    inline: false,
  });

  return embed;
}
