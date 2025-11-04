import { MessageFlags } from 'discord.js';
import { handleTicketCreate } from './ticketPanel.js';
import { handleTicketClose } from './ticketClose.js';

/**
 * Handle ticket-related button interactions
 * @param {ButtonInteraction} interaction
 * @returns {Promise<boolean>} True if handled, false otherwise
 */
export async function handleTicketButton(interaction) {
  const customId = interaction.customId;

  // Check if this is a ticket-related button
  if (!customId.startsWith('ticket_')) {
    return false;
  }

  try {
    // Handle ticket creation buttons
    if (customId.startsWith('ticket_create_')) {
      await handleTicketCreate(interaction);
      return true;
    }

    // Handle ticket close buttons
    if (customId.startsWith('ticket_close_')) {
      await handleTicketClose(interaction);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error handling ticket button:', error);

    try {
      if (interaction.deferred) {
        await interaction.editReply({
          content: '❌ Terjadi kesalahan saat memproses permintaan Anda.'
        });
      } else if (!interaction.replied) {
        await interaction.reply({
          content: '❌ Terjadi kesalahan saat memproses permintaan Anda.',
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (replyError) {
      console.error('Failed to send error message:', replyError);
    }

    return true;
  }
}

export default handleTicketButton;
