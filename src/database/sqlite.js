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

// Initialize database on import
getDatabase();

export default {
  getDatabase,
  closeDatabase,
  BirthdayDB
};
