import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { LevelsDB } from '../../database/sqlite.js';
import { getXPProgress, createProgressBar } from './xpTracker.js';

/**
 * Get rank emoji based on position
 * @param {number} rank
 * @returns {string}
 */
function getRankEmoji(rank) {
  switch (rank) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    default: return '📊';
  }
}

/**
 * Create /rank command
 */
export function createRankCommand({ branding }) {
  const definition = new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Check your or another user\'s level and XP')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to check (leave empty for yourself)')
        .setRequired(false)
    );

  async function execute(interaction) {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const userId = targetUser.id;
    const guildId = interaction.guild.id;

    // Get user data
    const userData = LevelsDB.get(userId, guildId);

    if (!userData || userData.xp === 0) {
      const embed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setDescription(`${targetUser} hasn't earned any XP yet! Start chatting to gain levels.`)
        .setFooter({ text: branding.tagline });

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Get rank and progress
    const rank = LevelsDB.getUserRank(userId, guildId);
    const totalUsers = LevelsDB.getTotalUsers(guildId);
    const progress = getXPProgress(userData.xp, userData.level);
    const progressBar = createProgressBar(progress.percentage, 15);

    // Create rank card embed
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setAuthor({
        name: `${targetUser.username}'s Rank`,
        iconURL: targetUser.displayAvatarURL({ dynamic: true })
      })
      .addFields(
        {
          name: '📊 Rank',
          value: `**#${rank}** / ${totalUsers}`,
          inline: true
        },
        {
          name: '⭐ Level',
          value: `**${userData.level}**`,
          inline: true
        },
        {
          name: '💬 Messages',
          value: `**${userData.total_messages.toLocaleString()}**`,
          inline: true
        },
        {
          name: '✨ Total XP',
          value: `**${userData.xp.toLocaleString()}** XP`,
          inline: false
        },
        {
          name: '📈 Progress to Level ' + (userData.level + 1),
          value: `${progressBar}\n**${progress.current.toLocaleString()}** / **${progress.needed.toLocaleString()}** XP`,
          inline: false
        }
      )
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
      .setFooter({ text: branding.tagline })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }

  return {
    definition: definition.toJSON(),
    execute,
  };
}

/**
 * Create /leaderboard command
 */
export function createLeaderboardCommand({ branding }) {
  const definition = new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the server\'s top ranked members')
    .addIntegerOption(option =>
      option
        .setName('page')
        .setDescription('Page number (10 users per page)')
        .setRequired(false)
        .setMinValue(1)
    );

  async function execute(interaction) {
    await interaction.deferReply();

    const page = interaction.options.getInteger('page') || 1;
    const pageSize = 10;
    const offset = (page - 1) * pageSize;
    const guildId = interaction.guild.id;

    // Get leaderboard data
    const allUsers = LevelsDB.getLeaderboard(guildId, 100); // Get top 100
    const totalUsers = allUsers.length;
    const totalPages = Math.ceil(totalUsers / pageSize);

    if (page > totalPages && totalPages > 0) {
      const embed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setDescription(`❌ Page ${page} doesn't exist. Maximum page: ${totalPages}`)
        .setFooter({ text: branding.tagline });

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const pageUsers = allUsers.slice(offset, offset + pageSize);

    if (pageUsers.length === 0) {
      const embed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setDescription('No users have earned XP yet! Start chatting to appear on the leaderboard.')
        .setFooter({ text: branding.tagline });

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Build leaderboard text
    let leaderboardText = '';
    for (let i = 0; i < pageUsers.length; i++) {
      const position = offset + i + 1;
      const user = pageUsers[i];
      const emoji = getRankEmoji(position);

      try {
        const member = await interaction.guild.members.fetch(user.user_id);
        const username = member.user.username;
        leaderboardText += `${emoji} **#${position}** • ${username}\n`;
        leaderboardText += `└ Level **${user.level}** • **${user.xp.toLocaleString()}** XP • ${user.total_messages.toLocaleString()} messages\n\n`;
      } catch (error) {
        // User might have left the server
        leaderboardText += `${emoji} **#${position}** • *User Left*\n`;
        leaderboardText += `└ Level **${user.level}** • **${user.xp.toLocaleString()}** XP\n\n`;
      }
    }

    // Create embed
    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🏆 Server Leaderboard')
      .setDescription(leaderboardText || 'No data available')
      .setFooter({ text: `${branding.tagline} • Page ${page}/${totalPages}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }

  return {
    definition: definition.toJSON(),
    execute,
  };
}

/**
 * Export all level commands
 */
export function createLevelCommands({ branding }) {
  return [
    createRankCommand({ branding }),
    createLeaderboardCommand({ branding }),
  ];
}
