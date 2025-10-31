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
