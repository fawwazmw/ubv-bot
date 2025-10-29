import { EmbedBuilder } from "discord.js";

export async function buildBirthdaysHelpEmbed({
  getCommandMention,
  thumbnail,
}) {
  const commands = [
    { name: "forget-birthday", hint: "Remove your birthday" },
    { name: "next-birthdays", hint: "List up to 10 upcoming birthdays" },
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

  const embed = new EmbedBuilder()
    .setTitle("Birthdays Plugin")
    .setColor(0xffa500)
    .setDescription(
      "Track your members birthdays and automatically wish them a happy birthday"
    )
    .setFooter({ text: "UBV Bot • Birthdays commands" });

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
