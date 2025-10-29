export function createMentionFetcher(interaction, guildId) {
  let guildCommandsCache = null;

  return async function getMention(commandName) {
    try {
      if (!guildCommandsCache) {
        guildCommandsCache =
          await interaction.client.application.commands.fetch({
            guildId,
          });
      }
      const found =
        guildCommandsCache && guildCommandsCache.find((c) => c.name === commandName);
      if (found?.id) {
        return `</${found.name}:${found.id}>`;
      }
    } catch (error) {
      // ignore and fallback to plain text
    }
    return `/${commandName}`;
  };
}
