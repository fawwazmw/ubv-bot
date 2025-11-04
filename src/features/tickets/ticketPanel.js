import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  MessageFlags
} from 'discord.js';
import { TicketDB, TicketConfigDB } from '../../database/ticketStore.js';

/**
 * Ticket categories configuration
 */
export const TICKET_CATEGORIES = {
  SUPPORT: {
    id: 'support',
    label: '🛠️ Bantuan',
    emoji: '🛠️',
    description: 'Bantuan teknis dan pertanyaan umum',
    color: 0x3ba55d
  },
  REPORT: {
    id: 'report',
    label: '📢 Laporan',
    emoji: '📢',
    description: 'Laporkan masalah atau pelanggaran',
    color: 0xed4245
  },
  SUGGESTION: {
    id: 'suggestion',
    label: '💡 Saran',
    emoji: '💡',
    description: 'Berikan saran atau ide untuk server',
    color: 0xfee75c
  }
};

/**
 * Create ticket panel embed and buttons
 * @param {Object} branding - Bot branding config
 * @returns {Object} { embeds, components }
 */
export function createTicketPanel(branding) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🎫 Ticket Support System')
    .setDescription(
      '**Butuh bantuan dari staff?**\n' +
      'Klik salah satu tombol di bawah untuk membuka ticket sesuai kategori.\n\n' +
      '**Kategori Ticket:**\n' +
      `${TICKET_CATEGORIES.SUPPORT.emoji} **${TICKET_CATEGORIES.SUPPORT.label}** - ${TICKET_CATEGORIES.SUPPORT.description}\n` +
      `${TICKET_CATEGORIES.REPORT.emoji} **${TICKET_CATEGORIES.REPORT.label}** - ${TICKET_CATEGORIES.REPORT.description}\n` +
      `${TICKET_CATEGORIES.SUGGESTION.emoji} **${TICKET_CATEGORIES.SUGGESTION.label}** - ${TICKET_CATEGORIES.SUGGESTION.description}\n\n` +
      '⚠️ *Hanya boleh membuka 1 ticket dalam satu waktu*'
    )
    .setFooter({ text: branding.botName || 'UBV Bot' })
    .setTimestamp();

  // Create buttons for each category
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_create_${TICKET_CATEGORIES.SUPPORT.id}`)
      .setLabel(TICKET_CATEGORIES.SUPPORT.label)
      .setEmoji(TICKET_CATEGORIES.SUPPORT.emoji)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`ticket_create_${TICKET_CATEGORIES.REPORT.id}`)
      .setLabel(TICKET_CATEGORIES.REPORT.label)
      .setEmoji(TICKET_CATEGORIES.REPORT.emoji)
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`ticket_create_${TICKET_CATEGORIES.SUGGESTION.id}`)
      .setLabel(TICKET_CATEGORIES.SUGGESTION.label)
      .setEmoji(TICKET_CATEGORIES.SUGGESTION.emoji)
      .setStyle(ButtonStyle.Primary)
  );

  return {
    embeds: [embed],
    components: [row]
  };
}

/**
 * Handle ticket creation button click
 * @param {ButtonInteraction} interaction
 * @returns {Promise<void>}
 */
export async function handleTicketCreate(interaction) {
  const category = interaction.customId.replace('ticket_create_', '');
  const categoryConfig = Object.values(TICKET_CATEGORIES).find(c => c.id === category);

  if (!categoryConfig) {
    await interaction.reply({
      content: '❌ Kategori ticket tidak valid.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Check if tickets are enabled
  const config = TicketConfigDB.get(interaction.guildId);
  if (!config || !config.enabled) {
    await interaction.reply({
      content: '❌ Sistem ticket belum diaktifkan di server ini.\n\nSilakan hubungi admin untuk mengkonfigurasi sistem ticket.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Check if user already has an active ticket
  const existingTicket = TicketDB.getActiveUserTicket(
    interaction.user.id,
    interaction.guildId
  );

  if (existingTicket) {
    await interaction.reply({
      content: `❌ Anda sudah memiliki ticket yang aktif: <#${existingTicket.channel_id}>\n\nSilakan tutup ticket tersebut sebelum membuka yang baru.`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Check bot permissions
  const botMember = interaction.guild.members.cache.get(interaction.client.user.id);
  const requiredPermissions = [
    PermissionsBitField.Flags.ManageChannels,
    PermissionsBitField.Flags.ViewChannel,
    PermissionsBitField.Flags.SendMessages
  ];

  const missingPermissions = requiredPermissions.filter(
    perm => !botMember.permissions.has(perm)
  );

  if (missingPermissions.length > 0) {
    const permNames = missingPermissions.map(perm => {
      const names = {
        [PermissionsBitField.Flags.ManageChannels]: 'Manage Channels',
        [PermissionsBitField.Flags.ViewChannel]: 'View Channels',
        [PermissionsBitField.Flags.SendMessages]: 'Send Messages'
      };
      return names[perm];
    });

    await interaction.reply({
      content:
        `❌ **Bot Missing Permissions**\n\n` +
        `Bot tidak memiliki permission yang diperlukan untuk membuat ticket:\n` +
        `${permNames.map(name => `• ${name}`).join('\n')}\n\n` +
        `**Cara memperbaiki:**\n` +
        `1. Pergi ke Server Settings → Roles\n` +
        `2. Pilih role bot\n` +
        `3. Enable permission: **Manage Channels**\n` +
        `4. Coba buat ticket lagi`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Check category permissions if configured
  if (config.ticket_category_id) {
    const category = interaction.guild.channels.cache.get(config.ticket_category_id);
    if (category) {
      const categoryPerms = category.permissionsFor(botMember);
      if (!categoryPerms.has(PermissionsBitField.Flags.ManageChannels)) {
        await interaction.reply({
          content:
            `❌ **Missing Category Permissions**\n\n` +
            `Bot tidak memiliki permission **Manage Channels** di category <#${config.ticket_category_id}>.\n\n` +
            `**Cara memperbaiki:**\n` +
            `1. Klik kanan category "${category.name}"\n` +
            `2. Edit Category → Permissions\n` +
            `3. Add role bot dan enable **Manage Channels**\n` +
            `4. Coba buat ticket lagi`,
          flags: MessageFlags.Ephemeral
        });
        return;
      }
    }
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    // Create ticket channel
    const ticketNumber = await getNextTicketNumber(interaction.guildId);
    const channelName = `ticket-${ticketNumber}-${interaction.user.username}`;

    // Get staff role if configured
    const staffRole = config.staff_role_id
      ? interaction.guild.roles.cache.get(config.staff_role_id)
      : null;

    // Prepare permission overwrites
    const permissionOverwrites = [
      {
        id: interaction.guild.id, // @everyone
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: interaction.user.id, // Ticket creator
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AttachFiles,
          PermissionsBitField.Flags.EmbedLinks
        ]
      },
      {
        id: interaction.client.user.id, // Bot
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ManageChannels,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
      }
    ];

    // Add staff role permissions if configured
    if (staffRole) {
      permissionOverwrites.push({
        id: staffRole.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AttachFiles,
          PermissionsBitField.Flags.EmbedLinks
        ]
      });
    }

    // Create the channel
    const ticketChannel = await interaction.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: config.ticket_category_id || null,
      permissionOverwrites,
      topic: `Ticket #${ticketNumber} | ${categoryConfig.label} | Dibuat oleh ${interaction.user.tag}`
    });

    // Save ticket to database
    const ticket = TicketDB.create({
      channelId: ticketChannel.id,
      userId: interaction.user.id,
      guildId: interaction.guildId,
      category: category
    });

    // Send welcome message in ticket channel
    const welcomeEmbed = new EmbedBuilder()
      .setColor(categoryConfig.color)
      .setTitle(`${categoryConfig.emoji} ${categoryConfig.label}`)
      .setDescription(
        `👋 Halo ${interaction.user}!\n\n` +
        `**Kategori:** ${categoryConfig.description}\n` +
        `**Ticket ID:** #${ticket.ticket_id}\n` +
        `**Status:** 🟢 Open\n\n` +
        `Silakan jelaskan keperluan Anda. ${staffRole ? `Staff ${staffRole} akan segera membantu.` : 'Staff akan segera membantu.'}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━`
      )
      .setFooter({ text: `Ticket dibuat oleh ${interaction.user.tag}` })
      .setTimestamp();

    const closeButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_close_${ticket.ticket_id}`)
        .setLabel('Tutup Ticket')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({
      content: `${interaction.user}${staffRole ? ` ${staffRole}` : ''}`,
      embeds: [welcomeEmbed],
      components: [closeButton]
    });

    // Reply to user
    await interaction.editReply({
      content: `✅ Ticket berhasil dibuat!\n\nSilakan cek channel: ${ticketChannel}`
    });

    // Log to log channel if configured
    if (config.log_channel_id) {
      const logChannel = interaction.guild.channels.cache.get(config.log_channel_id);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(0x3ba55d)
          .setTitle('📝 Ticket Created')
          .setDescription(
            `**Ticket ID:** #${ticket.ticket_id}\n` +
            `**User:** ${interaction.user.tag} (${interaction.user.id})\n` +
            `**Category:** ${categoryConfig.label}\n` +
            `**Channel:** ${ticketChannel}`
          )
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  } catch (error) {
    console.error('Error creating ticket:', error);

    let errorMessage = '❌ Terjadi kesalahan saat membuat ticket.\n\n';

    if (error.code === 50013) {
      errorMessage +=
        `**Missing Permissions**\n` +
        `Bot tidak memiliki permission yang diperlukan.\n\n` +
        `**Solusi:**\n` +
        `1. Berikan bot permission **Manage Channels** di Server Settings\n` +
        `2. Jika menggunakan category, pastikan bot juga punya permission di category tersebut\n` +
        `3. Hubungi admin untuk bantuan\n\n` +
        `Error Code: ${error.code}`;
    } else {
      errorMessage +=
        `Error: ${error.message}\n\n` +
        `Silakan coba lagi atau hubungi admin.`;
    }

    await interaction.editReply({
      content: errorMessage
    });
  }
}

/**
 * Get next ticket number for guild
 * @param {string} guildId
 * @returns {Promise<number>}
 */
async function getNextTicketNumber(guildId) {
  const tickets = TicketDB.getOpenTickets(guildId);
  return (tickets.length || 0) + 1;
}
