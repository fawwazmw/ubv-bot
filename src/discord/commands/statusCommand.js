export function createStatusCommand({ statusManager }) {
  return {
    definition: {
      name: "status",
      description: "Perbarui status server UBV sekarang",
    },
    async execute(interaction) {
      try {
        await interaction.deferReply({ ephemeral: true });
        const channel = await statusManager.resolveChannel(interaction.client);
        await statusManager.refresh(channel, { force: true });
        await interaction.editReply("Status server berhasil diperbarui.");
      } catch (error) {
        console.error("❌ Status command failed:", error?.message ?? error);
        const message =
          "Gagal memperbarui status. Pastikan STATUS_CHANNEL_ID valid dan coba lagi.";
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(message);
        } else {
          await interaction.reply({ content: message, ephemeral: true });
        }
      }
    },
  };
}
