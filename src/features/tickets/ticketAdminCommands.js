import {
  EmbedBuilder,
  PermissionsBitField,
  ChannelType,
  SlashCommandBuilder,
  MessageFlags
} from 'discord.js';
import { TicketDB, TicketConfigDB } from '../../database/ticketStore.js';
import { createTicketPanel } from './ticketPanel.js';
import { forceCloseTicket } from './ticketClose.js';

/**
 * Create ticket admin commands
 * @param {Object} config - Bot configuration
 * @returns {Array} Array of command objects
 */
export function createTicketAdminCommands({ branding, config }) {
  return [
    {
      definition: new SlashCommandBuilder()
        .setName('ticket-setup')
        .setDescription('Setup ticket system (Admin only)')
        .addChannelOption(option =>
          option
            .setName('category')
            .setDescription('Category channel untuk menaruh ticket channels')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
        .addRoleOption(option =>
          option
            .setName('staff-role')
            .setDescription('Role staff yang bisa handle tickets')
            .setRequired(true)
        )
        .addChannelOption(option =>
          option
            .setName('log-channel')
            .setDescription('Channel untuk log ticket activity')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addChannelOption(option =>
          option
            .setName('transcript-channel')
            .setDescription('Channel untuk menyimpan transcript tickets')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
        .toJSON(),

      async execute(interaction) {
        // Double check permissions
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription('❌ Missing Permissions: Manage Server required');
          await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
          return;
        }

        const category = interaction.options.getChannel('category');
        const staffRole = interaction.options.getRole('staff-role');
        const logChannel = interaction.options.getChannel('log-channel');
        const transcriptChannel = interaction.options.getChannel('transcript-channel');

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
          // Get or create config
          TicketConfigDB.getOrCreate(interaction.guildId);

          // Update config
          TicketConfigDB.update(interaction.guildId, {
            ticket_category_id: category.id,
            staff_role_id: staffRole.id,
            log_channel_id: logChannel?.id || null,
            transcript_channel_id: transcriptChannel?.id || null,
            enabled: 1
          });

          const embed = new EmbedBuilder()
            .setColor(0x3ba55d)
            .setTitle('✅ Ticket System Configured')
            .addFields(
              { name: '📁 Ticket Category', value: `${category}`, inline: true },
              { name: '👥 Staff Role', value: `${staffRole}`, inline: true },
              { name: '📝 Log Channel', value: logChannel ? `${logChannel}` : 'Not set', inline: true },
              { name: '📋 Transcript Channel', value: transcriptChannel ? `${transcriptChannel}` : 'Not set', inline: true },
              { name: '🟢 Status', value: 'Enabled', inline: true }
            )
            .setFooter({ text: 'Use /ticket-panel to send the ticket panel' })
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });

          // Log to log channel if configured
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              .setColor(0x3ba55d)
              .setTitle('⚙️ Ticket System Configured')
              .setDescription(
                `Ticket system has been configured by ${interaction.user}\n\n` +
                `**Staff Role:** ${staffRole}\n` +
                `**Category:** ${category}\n` +
                `**Status:** Enabled`
              )
              .setTimestamp();

            await logChannel.send({ embeds: [logEmbed] });
          }
        } catch (error) {
          console.error('Error setting up tickets:', error);
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(`❌ Error: ${error.message}`);
          await interaction.editReply({ embeds: [embed] });
        }
      }
    },

    {
      definition: new SlashCommandBuilder()
        .setName('ticket-panel')
        .setDescription('Send ticket panel to current channel (Admin only)')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
        .toJSON(),

      async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription('❌ Missing Permissions: Manage Server required');
          await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
          return;
        }

        // Check if tickets are configured
        const ticketConfig = TicketConfigDB.get(interaction.guildId);
        if (!ticketConfig || !ticketConfig.enabled) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(
              '❌ Ticket system belum dikonfigurasi.\n\nGunakan `/ticket-setup` untuk mengkonfigurasi terlebih dahulu.'
            );
          await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
          return;
        }

        // Check bot permissions in current channel
        const botPermissions = interaction.channel.permissionsFor(interaction.client.user);
        if (!botPermissions.has(PermissionsBitField.Flags.SendMessages)) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(
              '❌ Bot tidak memiliki permission **Send Messages** di channel ini.\n\nSilakan berikan permission tersebut terlebih dahulu.'
            );
          await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
          return;
        }

        if (!botPermissions.has(PermissionsBitField.Flags.EmbedLinks)) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(
              '❌ Bot tidak memiliki permission **Embed Links** di channel ini.\n\nSilakan berikan permission tersebut terlebih dahulu.'
            );
          await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
          return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
          const panel = createTicketPanel(branding);
          await interaction.channel.send(panel);

          const embed = new EmbedBuilder()
            .setColor(0x3ba55d)
            .setDescription('✅ Ticket panel berhasil dikirim!');
          await interaction.editReply({ embeds: [embed] });
        } catch (error) {
          console.error('Error sending ticket panel:', error);
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(
              `❌ Error: ${error.message}\n\n` +
              `Pastikan bot memiliki permission:\n` +
              `• Send Messages\n` +
              `• Embed Links\n` +
              `• Use External Emojis (optional)`
            );
          await interaction.editReply({ embeds: [embed] });
        }
      }
    },

    {
      definition: new SlashCommandBuilder()
        .setName('ticket-close')
        .setDescription('Force close a ticket (Admin only)')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Ticket channel to close')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
        .toJSON(),

      async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription('❌ Missing Permissions: Manage Server required');
          await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
          return;
        }

        const channel = interaction.options.getChannel('channel');
        await forceCloseTicket(interaction, channel.id);
      }
    },

    {
      definition: new SlashCommandBuilder()
        .setName('ticket-stats')
        .setDescription('View ticket statistics (Admin only)')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
        .toJSON(),

      async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription('❌ Missing Permissions: Manage Server required');
          await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
          return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
          const stats = TicketDB.getStats(interaction.guildId);
          const ticketConfig = TicketConfigDB.get(interaction.guildId);

          const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle('📊 Ticket Statistics')
            .addFields(
              { name: '📝 Total Tickets', value: `${stats.total}`, inline: true },
              { name: '🟢 Open', value: `${stats.open}`, inline: true },
              { name: '🔵 Claimed', value: `${stats.claimed}`, inline: true },
              { name: '🔒 Closed', value: `${stats.closed}`, inline: true },
              {
                name: '⚙️ System Status',
                value: ticketConfig?.enabled ? '🟢 Enabled' : '🔴 Disabled',
                inline: true
              }
            )
            .setFooter({ text: branding.botName || 'UBV Bot' })
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
        } catch (error) {
          console.error('Error fetching ticket stats:', error);
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(`❌ Error: ${error.message}`);
          await interaction.editReply({ embeds: [embed] });
        }
      }
    },

    {
      definition: new SlashCommandBuilder()
        .setName('ticket-config')
        .setDescription('View current ticket configuration (Admin only)')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
        .toJSON(),

      async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription('❌ Missing Permissions: Manage Server required');
          await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
          return;
        }

        const ticketConfig = TicketConfigDB.get(interaction.guildId);

        if (!ticketConfig) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(
              '❌ Ticket system belum dikonfigurasi.\n\nGunakan `/ticket-setup` untuk mengkonfigurasi terlebih dahulu.'
            );
          await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
          return;
        }

        const category = ticketConfig.ticket_category_id
          ? `<#${ticketConfig.ticket_category_id}>`
          : '❌ Not set';
        const staffRole = ticketConfig.staff_role_id
          ? `<@&${ticketConfig.staff_role_id}>`
          : '❌ Not set';
        const logChannel = ticketConfig.log_channel_id
          ? `<#${ticketConfig.log_channel_id}>`
          : '❌ Not set';
        const transcriptChannel = ticketConfig.transcript_channel_id
          ? `<#${ticketConfig.transcript_channel_id}>`
          : '❌ Not set';

        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('⚙️ Ticket System Configuration')
          .addFields(
            { name: '📁 Ticket Category', value: category, inline: true },
            { name: '👥 Staff Role', value: staffRole, inline: true },
            { name: '📝 Log Channel', value: logChannel, inline: true },
            { name: '📋 Transcript Channel', value: transcriptChannel, inline: true },
            {
              name: '⏱️ Auto Close',
              value: `${ticketConfig.auto_close_hours} hours`,
              inline: true
            },
            {
              name: '🔘 Status',
              value: ticketConfig.enabled ? '🟢 Enabled' : '🔴 Disabled',
              inline: true
            }
          )
          .setFooter({ text: 'Use /ticket-setup to update configuration' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }
    }
  ];
}
