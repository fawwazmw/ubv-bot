import { BirthdayDB } from './sqlite.js';

/**
 * Birthday Store - SQLite adapter with same interface as JSON store
 * This maintains compatibility with existing code
 */
export class BirthdayStore {
  constructor(filePath) {
    // filePath is kept for compatibility but not used
    // SQLite database path is managed internally
    this.filePath = filePath;
  }

  /**
   * Load all birthdays as object (compatible with JSON format)
   * @returns {Promise<Object>} Birthdays in format { userId: { date: "YYYY-MM-DD" } }
   */
  async load() {
    const records = BirthdayDB.getAll();
    const result = {};

    for (const record of records) {
      result[record.user_id] = {
        date: record.birthday_date
      };
    }

    return result;
  }

  /**
   * Save birthdays (compatible with JSON format)
   * @param {Object} data - Birthdays in format { userId: { date: "YYYY-MM-DD" } }
   */
  async save(data) {
    // Get current database state
    const currentRecords = BirthdayDB.getAll();
    const currentUserIds = new Set(currentRecords.map(r => r.user_id));
    const newUserIds = new Set(Object.keys(data));

    // Delete users that are not in new data
    for (const userId of currentUserIds) {
      if (!newUserIds.has(userId)) {
        BirthdayDB.delete(userId);
      }
    }

    // Update/insert users from new data
    for (const [userId, value] of Object.entries(data)) {
      if (value && value.date) {
        BirthdayDB.set(userId, value.date);
      }
    }
  }

  /**
   * Get single birthday
   * @param {string} userId
   * @returns {Object|null}
   */
  async get(userId) {
    const record = BirthdayDB.get(userId);
    return record ? { date: record.birthday_date } : null;
  }

  /**
   * Set single birthday
   * @param {string} userId
   * @param {string} date
   */
  async set(userId, date) {
    BirthdayDB.set(userId, date);
  }

  /**
   * Delete single birthday
   * @param {string} userId
   */
  async delete(userId) {
    BirthdayDB.delete(userId);
  }

  /**
   * Check if user has birthday
   * @param {string} userId
   * @returns {boolean}
   */
  async has(userId) {
    return BirthdayDB.has(userId);
  }
}

export default BirthdayStore;
