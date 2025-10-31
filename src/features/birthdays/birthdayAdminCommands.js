import { EmbedBuilder, PermissionsBitField } from "discord.js";
import { checkBirthdaysNow } from "./birthdayScheduler.js";

export function createBirthdayAdminCommands({ config }) {
  return [
    {
      definition: {
        name: "check-birthdays",
        description: "Manually trigger birthday check (Admin only)",
      },
      async execute(interaction) {
        const hasPermissions =
          interaction.member?.permissions?.has?.(
            PermissionsBitField.Flags.ManageGuild
          ) ||
          interaction.memberPermissions?.has?.(
            PermissionsBitField.Flags.ManageGuild
          );

        if (!hasPermissions) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription("❌ Missing Permissions: Manage Server required");
          await interaction.reply({ embeds: [embed], ephemeral: true });
          return;
        }

        if (!config.birthdays.channelId) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(
              "❌ Birthday channel not configured.\n\nPlease set `BIRTHDAY_CHANNEL_ID` in your environment variables."
            );
          await interaction.reply({ embeds: [embed], ephemeral: true });
          return;
        }

        await interaction.deferReply({ ephemeral: true });

        try {
          await checkBirthdaysNow(interaction.client, config);

          const embed = new EmbedBuilder()
            .setColor(0x57f287)
            .setDescription(
              "✅ Birthday check completed!\n\nCheck the birthday announcement channel for results."
            );
          await interaction.editReply({ embeds: [embed] });
        } catch (error) {
          console.error("Error in check-birthdays command:", error);
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(`❌ Error: ${error.message}`);
          await interaction.editReply({ embeds: [embed] });
        }
      },
    },
    {
      definition: {
        name: "birthday-config",
        description: "Show current birthday system configuration (Admin only)",
      },
      async execute(interaction) {
        const hasPermissions =
          interaction.member?.permissions?.has?.(
            PermissionsBitField.Flags.ManageGuild
          ) ||
          interaction.memberPermissions?.has?.(
            PermissionsBitField.Flags.ManageGuild
          );

        if (!hasPermissions) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription("❌ Missing Permissions: Manage Server required");
          await interaction.reply({ embeds: [embed], ephemeral: true });
          return;
        }

        const channelMention = config.birthdays.channelId
          ? `<#${config.birthdays.channelId}>`
          : "❌ Not set";

        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("🎂 Birthday System Configuration")
          .addFields(
            {
              name: "📢 Announcement Channel",
              value: channelMention,
              inline: true,
            },
            {
              name: "🕐 Check Time",
              value: config.birthdays.checkTime,
              inline: true,
            },
            {
              name: "🌍 Timezone",
              value: config.birthdays.timezone,
              inline: true,
            }
          )
          .setFooter({
            text: "Configure via environment variables: BIRTHDAY_CHANNEL_ID, BIRTHDAY_CHECK_TIME, BIRTHDAY_TIMEZONE",
          });

        await interaction.reply({ embeds: [embed], ephemeral: true });
      },
    },
  ];
}
