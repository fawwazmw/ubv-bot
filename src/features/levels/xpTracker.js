import { LevelsDB } from '../../database/sqlite.js';
import { EmbedBuilder } from 'discord.js';

/**
 * XP Tracking Configuration
 */
const XP_CONFIG = {
  MIN_XP: 15,           // Minimum XP per message
  MAX_XP: 25,           // Maximum XP per message
  COOLDOWN: 60,         // Cooldown in seconds (1 minute like MEE6)
  LEVEL_UP_CHANNEL: true, // Send level up message in same channel
};

/**
 * Get random XP amount within range
 * @returns {number}
 */
function getRandomXP() {
  return Math.floor(Math.random() * (XP_CONFIG.MAX_XP - XP_CONFIG.MIN_XP + 1)) + XP_CONFIG.MIN_XP;
}

/**
 * Check if user is on cooldown
 * @param {number} lastXPTime - Unix timestamp of last XP gain
 * @returns {boolean}
 */
function isOnCooldown(lastXPTime) {
  const now = Math.floor(Date.now() / 1000);
  return (now - lastXPTime) < XP_CONFIG.COOLDOWN;
}

/**
 * Create level up embed
 * @param {Object} user - Discord user
 * @param {number} newLevel - New level achieved
 * @returns {EmbedBuilder}
 */
function createLevelUpEmbed(user, newLevel) {
  const embed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle('🎉 Level Up!')
    .setDescription(`Congratulations ${user}! You've reached **Level ${newLevel}**!`)
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .setTimestamp()
    .setFooter({ text: 'Keep chatting to level up!' });

  return embed;
}

/**
 * Handle XP gain from messages
 * @param {Message} message - Discord message object
 */
export async function handleXPGain(message) {
  // Ignore bots and system messages
  if (message.author.bot) return;

  // Ignore DMs
  if (!message.guild) return;

  // Ignore commands (messages starting with /)
  if (message.content.startsWith('/')) return;

  const userId = message.author.id;
  const guildId = message.guild.id;

  try {
    // Get current user data
    const userData = LevelsDB.getOrCreate(userId, guildId);

    // Check cooldown
    if (isOnCooldown(userData.last_xp_time)) {
      return; // User is on cooldown, no XP gain
    }

    // Add random XP
    const xpGain = getRandomXP();
    const result = LevelsDB.addXP(userId, guildId, xpGain);

    // If user leveled up, send notification
    if (result.leveledUp && XP_CONFIG.LEVEL_UP_CHANNEL) {
      try {
        const embed = createLevelUpEmbed(message.author, result.newLevel);
        await message.channel.send({ embeds: [embed] });
      } catch (error) {
        console.error('Failed to send level up message:', error.message);
      }
    }
  } catch (error) {
    console.error('Error in XP tracking:', error);
  }
}

/**
 * Get XP progress for next level
 * @param {number} currentXP - Current XP
 * @param {number} currentLevel - Current level
 * @returns {Object} {current, needed, percentage}
 */
export function getXPProgress(currentXP, currentLevel) {
  const currentLevelXP = LevelsDB.calculateXPForLevel(currentLevel);
  const nextLevelXP = LevelsDB.calculateXPForLevel(currentLevel + 1);
  const xpIntoLevel = currentXP - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;
  const percentage = Math.floor((xpIntoLevel / xpNeeded) * 100);

  return {
    current: Math.floor(xpIntoLevel),
    needed: Math.floor(xpNeeded),
    percentage: Math.min(percentage, 100),
    nextLevelXP: Math.floor(nextLevelXP)
  };
}

/**
 * Create XP progress bar
 * @param {number} percentage - Progress percentage (0-100)
 * @param {number} length - Bar length in characters
 * @returns {string}
 */
export function createProgressBar(percentage, length = 10) {
  const filled = Math.floor((percentage / 100) * length);
  const empty = length - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `[${bar}] ${percentage}%`;
}

export default {
  handleXPGain,
  getXPProgress,
  createProgressBar,
  XP_CONFIG
};
