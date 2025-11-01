import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database file path
const DB_DIR = join(__dirname, '../../data');
const DB_FILE = join(DB_DIR, 'ubv-bot.db');

// Ensure data directory exists
if (!existsSync(DB_DIR)) {
  mkdirSync(DB_DIR, { recursive: true });
}

// Initialize database connection
let db = null;

/**
 * Get database instance (singleton pattern)
 */
export function getDatabase() {
  if (!db) {
    db = new Database(DB_FILE);
    db.pragma('journal_mode = WAL'); // Better performance for concurrent reads
    db.pragma('foreign_keys = ON'); // Enable foreign key constraints
    initializeSchema();
  }
  return db;
}

/**
 * Initialize database schema
 */
function initializeSchema() {
  const db = getDatabase();

  // Create birthdays table
  db.exec(`
    CREATE TABLE IF NOT EXISTS birthdays (
      user_id TEXT PRIMARY KEY,
      birthday_date TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Create index for faster queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_birthdays_date
    ON birthdays(birthday_date)
  `);

  // Create levels/XP table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_levels (
      user_id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 0,
      total_messages INTEGER DEFAULT 0,
      last_xp_time INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Create indexes for levels table
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_levels_guild
    ON user_levels(guild_id);

    CREATE INDEX IF NOT EXISTS idx_levels_xp
    ON user_levels(guild_id, xp DESC);

    CREATE INDEX IF NOT EXISTS idx_levels_level
    ON user_levels(guild_id, level DESC);
  `);

  console.log('✅ SQLite database initialized:', DB_FILE);
}

/**
 * Close database connection
 */
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log('✅ Database connection closed');
  }
}

/**
 * Birthday operations
 */
export const BirthdayDB = {
  /**
   * Get birthday for a user
   * @param {string} userId - Discord user ID
   * @returns {Object|null} Birthday record or null
   */
  get(userId) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM birthdays WHERE user_id = ?');
    return stmt.get(userId);
  },

  /**
   * Get all birthdays
   * @returns {Array} All birthday records
   */
  getAll() {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM birthdays ORDER BY birthday_date');
    return stmt.all();
  },

  /**
   * Set/update birthday for a user
   * @param {string} userId - Discord user ID
   * @param {string} birthdayDate - Birthday in format YYYY-MM-DD or MM-DD
   * @returns {Object} Insert/update info
   */
  set(userId, birthdayDate) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO birthdays (user_id, birthday_date, updated_at)
      VALUES (?, ?, strftime('%s', 'now'))
      ON CONFLICT(user_id)
      DO UPDATE SET
        birthday_date = excluded.birthday_date,
        updated_at = strftime('%s', 'now')
    `);
    return stmt.run(userId, birthdayDate);
  },

  /**
   * Delete birthday for a user
   * @param {string} userId - Discord user ID
   * @returns {Object} Delete info
   */
  delete(userId) {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM birthdays WHERE user_id = ?');
    return stmt.run(userId);
  },

  /**
   * Check if user has birthday set
   * @param {string} userId - Discord user ID
   * @returns {boolean}
   */
  has(userId) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM birthdays WHERE user_id = ?');
    const result = stmt.get(userId);
    return result.count > 0;
  },

  /**
   * Get count of all birthdays
   * @returns {number}
   */
  count() {
    const db = getDatabase();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM birthdays');
    const result = stmt.get();
    return result.count;
  },

  /**
   * Get birthdays by date pattern (for finding upcoming birthdays)
   * @param {string} monthDay - Month-day pattern like '01-15'
   * @returns {Array}
   */
  getByDate(monthDay) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM birthdays
      WHERE birthday_date LIKE ? OR birthday_date LIKE ?
    `);
    return stmt.all(`${monthDay}`, `%${monthDay}`);
  },

  /**
   * Bulk insert birthdays (for migration)
   * @param {Array} birthdays - Array of {userId, birthdayDate}
   */
  bulkInsert(birthdays) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO birthdays (user_id, birthday_date, updated_at)
      VALUES (?, ?, strftime('%s', 'now'))
    `);

    const transaction = db.transaction((records) => {
      for (const record of records) {
        stmt.run(record.userId, record.birthdayDate);
      }
    });

    return transaction(birthdays);
  }
};

/**
 * Levels operations
 */
export const LevelsDB = {
  /**
   * Get user level data
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @returns {Object|null}
   */
  get(userId, guildId) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM user_levels WHERE user_id = ? AND guild_id = ?');
    return stmt.get(userId, guildId);
  },

  /**
   * Get or create user level data
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @returns {Object}
   */
  getOrCreate(userId, guildId) {
    let user = this.get(userId, guildId);
    if (!user) {
      this.create(userId, guildId);
      user = this.get(userId, guildId);
    }
    return user;
  },

  /**
   * Create new user level entry
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @returns {Object}
   */
  create(userId, guildId) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO user_levels (user_id, guild_id)
      VALUES (?, ?)
      ON CONFLICT(user_id) DO NOTHING
    `);
    return stmt.run(userId, guildId);
  },

  /**
   * Add XP to user
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @param {number} xpAmount - Amount of XP to add
   * @returns {Object} {oldLevel, newLevel, xpGained}
   */
  addXP(userId, guildId, xpAmount) {
    const db = getDatabase();
    const user = this.getOrCreate(userId, guildId);
    const oldLevel = user.level;
    const newXP = user.xp + xpAmount;
    const newLevel = this.calculateLevel(newXP);

    const stmt = db.prepare(`
      UPDATE user_levels
      SET xp = ?,
          level = ?,
          total_messages = total_messages + 1,
          last_xp_time = strftime('%s', 'now'),
          updated_at = strftime('%s', 'now')
      WHERE user_id = ? AND guild_id = ?
    `);

    stmt.run(newXP, newLevel, userId, guildId);

    return {
      oldLevel,
      newLevel,
      xpGained: xpAmount,
      totalXP: newXP,
      leveledUp: newLevel > oldLevel
    };
  },

  /**
   * Calculate level from XP (MEE6-style formula)
   * Level = floor(0.1 * sqrt(XP))
   * @param {number} xp - Total XP
   * @returns {number} Level
   */
  calculateLevel(xp) {
    return Math.floor(0.1 * Math.sqrt(xp));
  },

  /**
   * Calculate XP needed for a specific level
   * @param {number} level - Target level
   * @returns {number} XP needed
   */
  calculateXPForLevel(level) {
    return Math.pow(level / 0.1, 2);
  },

  /**
   * Get leaderboard (top users by XP)
   * @param {string} guildId - Discord guild ID
   * @param {number} limit - Number of users to return
   * @returns {Array}
   */
  getLeaderboard(guildId, limit = 10) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM user_levels
      WHERE guild_id = ?
      ORDER BY xp DESC, level DESC
      LIMIT ?
    `);
    return stmt.all(guildId, limit);
  },

  /**
   * Get user rank in guild
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @returns {number} Rank position (1-indexed)
   */
  getUserRank(userId, guildId) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT COUNT(*) + 1 as rank
      FROM user_levels
      WHERE guild_id = ?
        AND xp > (SELECT xp FROM user_levels WHERE user_id = ? AND guild_id = ?)
    `);
    const result = stmt.get(guildId, userId, guildId);
    return result ? result.rank : null;
  },

  /**
   * Get total users with XP in guild
   * @param {string} guildId - Discord guild ID
   * @returns {number}
   */
  getTotalUsers(guildId) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM user_levels WHERE guild_id = ?');
    const result = stmt.get(guildId);
    return result.count;
  },

  /**
   * Reset user XP and level
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @returns {Object}
   */
  reset(userId, guildId) {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE user_levels
      SET xp = 0, level = 0, total_messages = 0, updated_at = strftime('%s', 'now')
      WHERE user_id = ? AND guild_id = ?
    `);
    return stmt.run(userId, guildId);
  },

  /**
   * Delete user level data
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @returns {Object}
   */
  delete(userId, guildId) {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM user_levels WHERE user_id = ? AND guild_id = ?');
    return stmt.run(userId, guildId);
  }
};

// Initialize database on import
getDatabase();

export default {
  getDatabase,
  closeDatabase,
  BirthdayDB,
  LevelsDB
};
