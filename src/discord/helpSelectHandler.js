import { ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";
import { pluginChoices } from "./helpContent.js";
import { createMentionFetcher } from "./commandMentions.js";
import { buildBirthdaysHelpEmbed } from "./helpEmbeds.js";

export function createHelpSelectHandler({ branding, discord }) {
  return async function handleHelpSelect(interaction) {
    if (interaction.customId === "help_root") {
      const selected = interaction.values?.[0];
      if (selected === "plugin_name") {
        const menu = new StringSelectMenuBuilder()
          .setCustomId("plugin_select")
          .setPlaceholder("Select a plugin")
          .addOptions(
            pluginChoices.map((plugin) => ({
              label: plugin.name,
              description: `Bantuan untuk /help ${plugin.value}`,
              value: plugin.value,
            }))
          );

        const row = new ActionRowBuilder().addComponents(menu);

        try {
          await interaction.update({ components: [row] });
        } catch (error) {
          await interaction.reply({
            content: "Unable to open plugin list here, try again.",
            ephemeral: true,
          });
        }
      }
      return true;
    }

    if (interaction.customId === "plugin_select") {
      const selected = interaction.values?.[0];
      if (!selected) {
        await interaction.reply({
          content: "Plugin tidak dikenal.",
          ephemeral: true,
        });
        return true;
      }

      if (selected === "birthdays") {
        const getCommandMention = createMentionFetcher(
          interaction,
          discord.guildId
        );
        const botImage =
          (interaction.client?.user?.displayAvatarURL
            ? interaction.client.user.displayAvatarURL({
                extension: "png",
                size: 1024,
              })
            : null) ||
          branding.imageUrl ||
          "https://cdn.discordapp.com/embed/avatars/0.png";

        const embed = await buildBirthdaysHelpEmbed({
          getCommandMention,
          thumbnail: botImage,
        });

        await interaction.reply({ embeds: [embed], ephemeral: false });
        return true;
      }

      await interaction.reply({
        content: `/help ${selected}`,
        ephemeral: true,
      });
      return true;
    }

    return false;
  };
}
