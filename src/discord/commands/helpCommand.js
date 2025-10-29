import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import { createMentionFetcher } from "../commandMentions.js";
import { pluginChoices, pluginHelpEntries } from "../helpContent.js";
import { buildBirthdaysHelpEmbed } from "../helpEmbeds.js";

export function createHelpCommand({ branding, discord }) {
  return {
    definition: {
      name: "help",
      description: "Tampilkan daftar perintah dan plugin",
      options: [
        {
          name: "plugin_name",
          description: "Name of the plugin to get the commands for",
          type: 3,
          required: false,
          choices: pluginChoices,
        },
      ],
    },

    async execute(interaction) {
      const botImage =
        (interaction.client?.user?.displayAvatarURL
          ? interaction.client.user.displayAvatarURL({
              extension: "png",
              size: 1024,
            })
          : null) ||
        branding.imageUrl ||
        "https://cdn.discordapp.com/embed/avatars/0.png";

      const getCommandMention = createMentionFetcher(
        interaction,
        discord.guildId
      );

      async function buildPluginEmbed(key) {
        if (key !== "birthdays") return null;
        return buildBirthdaysHelpEmbed({
          getCommandMention,
          thumbnail: botImage,
        });
      }

      const providedPlugin = interaction.options?.getString?.("plugin_name");
      if (providedPlugin) {
        const pluginEmbed = await buildPluginEmbed(providedPlugin);
        if (pluginEmbed) {
          await interaction.reply({ embeds: [pluginEmbed], ephemeral: false });
          return;
        }
        await interaction.reply({
          content: `/help ${providedPlugin}`,
          ephemeral: true,
        });
        return;
      }

      const helpMention = await getCommandMention("help");
      const embed = new EmbedBuilder()
        .setColor(0x23272a)
        .setTitle("🦜 UBV Bot Plugins Commands")
        .setThumbnail(botImage)
        .addFields(
          ...pluginHelpEntries.map((plugin) => {
            const parts = plugin.value.split(" ");
            const sub = parts.slice(1).join(" ");
            const subCode = sub ? `\`${sub}\`` : "";
            return {
              name: plugin.name,
              value: `${helpMention} ${subCode}`.trim(),
              inline: true,
            };
          })
        )
        .setFooter({ text: "Select the plugin for which you need help" });

      if (branding.tagline) {
        embed.setDescription(branding.tagline);
      }

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("help_root")
        .setPlaceholder("Select the plugin for which you need help")
        .addOptions([
          {
            label: "plugin_name",
            description: "Open plugin list",
            value: "plugin_name",
          },
        ]);

      const components = [new ActionRowBuilder().addComponents(selectMenu)];

      await interaction.reply({
        embeds: [embed],
        components,
        ephemeral: false,
      });
    },
  };
}
