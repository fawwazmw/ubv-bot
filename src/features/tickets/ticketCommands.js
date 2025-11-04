import {
  EmbedBuilder,
  SlashCommandBuilder,
  PermissionsBitField,
  MessageFlags
} from 'discord.js';
import { TicketDB, TicketConfigDB, TicketMessageDB } from '../../database/ticketStore.js';
import { TICKET_CATEGORIES } from './ticketPanel.js';

/**
 * Create ticket user commands
 * @param {Object} config - Bot configuration
 * @returns {Array} Array of command objects
 */
export function createTicketCommands({ branding }) {
  return [
    {
      definition: new SlashCommandBuilder()
        .setName('ticket-claim')
        .setDescription('Claim current ticket (Staff only)')
        .toJSON(),

      async execute(interaction) {
        // Check if in a ticket channel
        const ticket = TicketDB.getByChannelId(interaction.channelId);

        if (!ticket) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription('❌ Command ini hanya bisa digunakan di ticket channel.');
          await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
          return;
        }

        // Check if user is staff
        const config = TicketConfigDB.get(interaction.guildId);
        const isStaff = config?.staff_role_id
          ? interaction.member.roles.cache.has(config.staff_role_id)
          : interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels);

        if (!isStaff) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription('❌ Hanya staff yang bisa claim ticket.');
          await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
          return;
        }

        // Check if ticket is already claimed
        if (ticket.claimed_by) {
          const embed = new EmbedBuilder()
            .setColor(0xfee75c)
            .setDescription(
              `⚠️ Ticket ini sudah di-claim oleh <@${ticket.claimed_by}>`
            );
          await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
          return;
        }

        await interaction.deferReply();

        try {
          // Claim ticket
          TicketDB.claim(ticket.ticket_id, interaction.user.id);

          const categoryConfig = Object.values(TICKET_CATEGORIES).find(
            c => c.id === ticket.category
          );

          const embed = new EmbedBuilder()
            .setColor(0x3ba55d)
            .setTitle('✅ Ticket Claimed')
            .setDescription(
              `${interaction.user} telah mengambil ticket ini.\n\n` +
              `**Ticket ID:** #${ticket.ticket_id}\n` +
              `**Category:** ${categoryConfig?.label || ticket.category}\n` +
              `**Status:** 🔵 Claimed`
            )
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });

          // Update channel topic
          await interaction.channel.setTopic(
            `Ticket #${ticket.ticket_id} | ${categoryConfig?.label || ticket.category} | Claimed by ${interaction.user.tag}`
          );
        } catch (error) {
          console.error('Error claiming ticket:', error);
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(`❌ Error: ${error.message}`);
          await interaction.editReply({ embeds: [embed] });
        }
      }
    },

    {
      definition: new SlashCommandBuilder()
        .setName('ticket-add')
        .setDescription('Add user to current ticket (Staff only)')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('User to add')
            .setRequired(true)
        )
        .toJSON(),

      async execute(interaction) {
        // Check if in a ticket channel
        const ticket = TicketDB.getByChannelId(interaction.channelId);

        if (!ticket) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription('❌ Command ini hanya bisa digunakan di ticket channel.');
          await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
          return;
        }

        // Check if user is staff
        const config = TicketConfigDB.get(interaction.guildId);
        const isStaff = config?.staff_role_id
          ? interaction.member.roles.cache.has(config.staff_role_id)
          : interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels);

        if (!isStaff) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription('❌ Hanya staff yang bisa menambah user ke ticket.');
          await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
          return;
        }

        const userToAdd = interaction.options.getUser('user');

        await interaction.deferReply();

        try {
          // Add user to channel permissions
          await interaction.channel.permissionOverwrites.create(userToAdd.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            AttachFiles: true,
            EmbedLinks: true
          });

          const embed = new EmbedBuilder()
            .setColor(0x3ba55d)
            .setDescription(
              `✅ ${userToAdd} telah ditambahkan ke ticket ini.`
            )
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
        } catch (error) {
          console.error('Error adding user to ticket:', error);
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(`❌ Error: ${error.message}`);
          await interaction.editReply({ embeds: [embed] });
        }
      }
    },

    {
      definition: new SlashCommandBuilder()
        .setName('ticket-remove')
        .setDescription('Remove user from current ticket (Staff only)')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('User to remove')
            .setRequired(true)
        )
        .toJSON(),

      async execute(interaction) {
        // Check if in a ticket channel
        const ticket = TicketDB.getByChannelId(interaction.channelId);

        if (!ticket) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription('❌ Command ini hanya bisa digunakan di ticket channel.');
          await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
          return;
        }

        // Check if user is staff
        const config = TicketConfigDB.get(interaction.guildId);
        const isStaff = config?.staff_role_id
          ? interaction.member.roles.cache.has(config.staff_role_id)
          : interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels);

        if (!isStaff) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription('❌ Hanya staff yang bisa menghapus user dari ticket.');
          await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
          return;
        }

        const userToRemove = interaction.options.getUser('user');

        // Prevent removing ticket creator
        if (userToRemove.id === ticket.user_id) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription('❌ Tidak bisa menghapus pembuat ticket dari channel ini.');
          await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
          return;
        }

        await interaction.deferReply();

        try {
          // Remove user from channel permissions
          await interaction.channel.permissionOverwrites.delete(userToRemove.id);

          const embed = new EmbedBuilder()
            .setColor(0x3ba55d)
            .setDescription(
              `✅ ${userToRemove} telah dihapus dari ticket ini.`
            )
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
        } catch (error) {
          console.error('Error removing user from ticket:', error);
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(`❌ Error: ${error.message}`);
          await interaction.editReply({ embeds: [embed] });
        }
      }
    },

    {
      definition: new SlashCommandBuilder()
        .setName('ticket-info')
        .setDescription('View ticket information')
        .toJSON(),

      async execute(interaction) {
        // Check if in a ticket channel
        const ticket = TicketDB.getByChannelId(interaction.channelId);

        if (!ticket) {
          const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription('❌ Command ini hanya bisa digunakan di ticket channel.');
          await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
          return;
        }

        const categoryConfig = Object.values(TICKET_CATEGORIES).find(
          c => c.id === ticket.category
        );

        const statusEmoji = {
          open: '🟢',
          claimed: '🔵',
          closed: '🔒'
        };

        const embed = new EmbedBuilder()
          .setColor(categoryConfig?.color || 0x5865f2)
          .setTitle(`🎫 Ticket Information #${ticket.ticket_id}`)
          .addFields(
            {
              name: '👤 Creator',
              value: `<@${ticket.user_id}>`,
              inline: true
            },
            {
              name: '📂 Category',
              value: categoryConfig?.label || ticket.category,
              inline: true
            },
            {
              name: '📊 Status',
              value: `${statusEmoji[ticket.status] || '⚪'} ${ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}`,
              inline: true
            },
            {
              name: '🕐 Created',
              value: `<t:${ticket.created_at}:F>`,
              inline: true
            }
          )
          .setFooter({ text: branding.botName || 'UBV Bot' })
          .setTimestamp();

        if (ticket.claimed_by) {
          embed.addFields({
            name: '👨‍💼 Claimed By',
            value: `<@${ticket.claimed_by}>`,
            inline: true
          });
        }

        if (ticket.closed_at) {
          embed.addFields(
            {
              name: '🔒 Closed',
              value: `<t:${ticket.closed_at}:F>`,
              inline: true
            },
            {
              name: '👤 Closed By',
              value: `<@${ticket.closed_by}>`,
              inline: true
            }
          );
        }

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }
    }
  ];
}
