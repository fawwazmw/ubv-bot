import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  MessageFlags
} from 'discord.js';
import { TicketDB, TicketMessageDB, TicketConfigDB } from '../../database/ticketStore.js';
import { TICKET_CATEGORIES } from './ticketPanel.js';

/**
 * Handle ticket close button click
 * @param {ButtonInteraction} interaction
 * @returns {Promise<void>}
 */
export async function handleTicketClose(interaction) {
  const ticketId = parseInt(interaction.customId.replace('ticket_close_', ''));

  // Get ticket from database
  const ticket = TicketDB.getById(ticketId);

  if (!ticket) {
    await interaction.reply({
      content: '❌ Ticket tidak ditemukan di database.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Check if ticket is already closed
  if (ticket.status === 'closed') {
    await interaction.reply({
      content: '❌ Ticket ini sudah ditutup.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Check permissions - only ticket creator or staff can close
  const config = TicketConfigDB.get(interaction.guildId);
  const isCreator = interaction.user.id === ticket.user_id;
  const isStaff = config?.staff_role_id
    ? interaction.member.roles.cache.has(config.staff_role_id)
    : interaction.member.permissions.has('ManageChannels');

  if (!isCreator && !isStaff) {
    await interaction.reply({
      content: '❌ Anda tidak memiliki izin untuk menutup ticket ini.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    // Fetch messages from channel for transcript
    const messages = await fetchChannelMessages(interaction.channel);

    // Save messages to database
    for (const msg of messages) {
      try {
        TicketMessageDB.add({
          messageId: msg.id,
          ticketId: ticketId,
          authorId: msg.author.id,
          authorName: msg.author.tag,
          content: msg.content || '[No content]',
          attachments: msg.attachments.size > 0
            ? JSON.stringify([...msg.attachments.values()].map(a => ({
                name: a.name,
                url: a.url,
                size: a.size
              })))
            : null
        });
      } catch (err) {
        console.error(`Failed to save message ${msg.id}:`, err);
      }
    }

    // Generate transcript
    const transcript = await generateTranscript(ticket, messages);

    // Close ticket in database
    TicketDB.close(ticketId, interaction.user.id);

    // Send transcript to transcript channel if configured
    if (config?.transcript_channel_id) {
      const transcriptChannel = interaction.guild.channels.cache.get(
        config.transcript_channel_id
      );

      if (transcriptChannel) {
        const categoryConfig = Object.values(TICKET_CATEGORIES).find(
          c => c.id === ticket.category
        );

        const transcriptEmbed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(`📋 Ticket Transcript #${ticket.ticket_id}`)
          .setDescription(
            `**Category:** ${categoryConfig?.label || ticket.category}\n` +
            `**User:** <@${ticket.user_id}>\n` +
            `**Opened:** <t:${ticket.created_at}:F>\n` +
            `**Closed:** <t:${Math.floor(Date.now() / 1000)}:F>\n` +
            `**Closed By:** ${interaction.user}\n` +
            `**Total Messages:** ${messages.length}`
          )
          .setTimestamp();

        const attachment = new AttachmentBuilder(
          Buffer.from(transcript, 'utf-8'),
          { name: `ticket-${ticket.ticket_id}-transcript.txt` }
        );

        await transcriptChannel.send({
          embeds: [transcriptEmbed],
          files: [attachment]
        });
      }
    }

    // Send closing message
    const closingEmbed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle('🔒 Ticket Closed')
      .setDescription(
        `Ticket ini telah ditutup oleh ${interaction.user}\n\n` +
        `Channel akan dihapus dalam **10 detik**.\n` +
        `Transcript telah disimpan.`
      )
      .setTimestamp();

    await interaction.editReply({
      content: '✅ Ticket berhasil ditutup.'
    });

    await interaction.channel.send({ embeds: [closingEmbed] });

    // Log to log channel if configured
    if (config?.log_channel_id) {
      const logChannel = interaction.guild.channels.cache.get(config.log_channel_id);
      if (logChannel) {
        const categoryConfig = Object.values(TICKET_CATEGORIES).find(
          c => c.id === ticket.category
        );

        const logEmbed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle('🔒 Ticket Closed')
          .setDescription(
            `**Ticket ID:** #${ticket.ticket_id}\n` +
            `**User:** <@${ticket.user_id}>\n` +
            `**Category:** ${categoryConfig?.label || ticket.category}\n` +
            `**Closed By:** ${interaction.user}\n` +
            `**Duration:** <t:${ticket.created_at}:R>\n` +
            `**Messages:** ${messages.length}`
          )
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }
    }

    // Delete channel after delay
    setTimeout(async () => {
      try {
        await interaction.channel.delete('Ticket closed');
      } catch (err) {
        console.error('Failed to delete ticket channel:', err);
      }
    }, 10000);

  } catch (error) {
    console.error('Error closing ticket:', error);
    await interaction.editReply({
      content: '❌ Terjadi kesalahan saat menutup ticket. Channel tidak akan dihapus.'
    });
  }
}

/**
 * Fetch all messages from channel
 * @param {TextChannel} channel
 * @returns {Promise<Array>}
 */
async function fetchChannelMessages(channel) {
  const messages = [];
  let lastId;

  while (true) {
    const options = { limit: 100 };
    if (lastId) {
      options.before = lastId;
    }

    const fetchedMessages = await channel.messages.fetch(options);
    messages.push(...fetchedMessages.values());

    if (fetchedMessages.size < 100) {
      break;
    }

    lastId = fetchedMessages.last().id;
  }

  return messages.reverse(); // Oldest first
}

/**
 * Generate text transcript from messages
 * @param {Object} ticket - Ticket data
 * @param {Array} messages - Array of messages
 * @returns {Promise<string>}
 */
async function generateTranscript(ticket, messages) {
  const lines = [];

  lines.push('═══════════════════════════════════════');
  lines.push(`  TICKET TRANSCRIPT #${ticket.ticket_id}`);
  lines.push('═══════════════════════════════════════');
  lines.push('');
  lines.push(`Ticket ID: #${ticket.ticket_id}`);
  lines.push(`Category: ${ticket.category}`);
  lines.push(`User ID: ${ticket.user_id}`);
  lines.push(`Created: ${new Date(ticket.created_at * 1000).toLocaleString()}`);
  lines.push(`Closed: ${new Date().toLocaleString()}`);
  lines.push('');
  lines.push('═══════════════════════════════════════');
  lines.push('  MESSAGES');
  lines.push('═══════════════════════════════════════');
  lines.push('');

  for (const msg of messages) {
    const timestamp = msg.createdAt.toLocaleString();
    const author = msg.author.tag;

    lines.push(`[${timestamp}] ${author}:`);

    if (msg.content) {
      lines.push(`  ${msg.content}`);
    }

    if (msg.embeds.length > 0) {
      lines.push(`  [${msg.embeds.length} embed(s)]`);
    }

    if (msg.attachments.size > 0) {
      lines.push(`  Attachments:`);
      msg.attachments.forEach(att => {
        lines.push(`    - ${att.name} (${att.url})`);
      });
    }

    lines.push('');
  }

  lines.push('═══════════════════════════════════════');
  lines.push(`  END OF TRANSCRIPT`);
  lines.push('═══════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Handle force close ticket (admin command)
 * @param {Interaction} interaction
 * @param {string} channelId
 * @returns {Promise<void>}
 */
export async function forceCloseTicket(interaction, channelId) {
  const ticket = TicketDB.getByChannelId(channelId);

  if (!ticket) {
    await interaction.reply({
      content: '❌ Channel ini bukan ticket atau tidak ditemukan di database.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (ticket.status === 'closed') {
    await interaction.reply({
      content: '❌ Ticket ini sudah ditutup.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Create a fake button interaction to reuse handleTicketClose
  const fakeInteraction = {
    ...interaction,
    customId: `ticket_close_${ticket.ticket_id}`,
    channel: interaction.guild.channels.cache.get(channelId)
  };

  await handleTicketClose(fakeInteraction);
}
