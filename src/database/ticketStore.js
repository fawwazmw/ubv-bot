import { getDatabase } from './sqlite.js';

/**
 * Initialize ticket tables in database
 */
export function initializeTicketSchema() {
  const db = getDatabase();

  // Tickets table - main ticket data
  db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      ticket_id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      claimed_by TEXT,
      priority TEXT DEFAULT 'normal',
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      closed_at INTEGER,
      closed_by TEXT
    )
  `);

  // Ticket messages table - for transcripts
  db.exec(`
    CREATE TABLE IF NOT EXISTS ticket_messages (
      message_id TEXT PRIMARY KEY,
      ticket_id INTEGER NOT NULL,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      content TEXT NOT NULL,
      attachments TEXT,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE
    )
  `);

  // Ticket config table - per-guild settings
  db.exec(`
    CREATE TABLE IF NOT EXISTS ticket_config (
      guild_id TEXT PRIMARY KEY,
      ticket_category_id TEXT,
      staff_role_id TEXT,
      log_channel_id TEXT,
      transcript_channel_id TEXT,
      enabled INTEGER DEFAULT 1,
      auto_close_hours INTEGER DEFAULT 72,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tickets_guild
    ON tickets(guild_id);

    CREATE INDEX IF NOT EXISTS idx_tickets_user
    ON tickets(user_id);

    CREATE INDEX IF NOT EXISTS idx_tickets_status
    ON tickets(status);

    CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket
    ON ticket_messages(ticket_id);
  `);

  console.log('✅ Ticket database schema initialized');
}

/**
 * Ticket operations
 */
export const TicketDB = {
  /**
   * Create a new ticket
   * @param {Object} data - Ticket data
   * @returns {Object} Created ticket with ticket_id
   */
  create({ channelId, userId, guildId, category, priority = 'normal' }) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO tickets (channel_id, user_id, guild_id, category, priority)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(channelId, userId, guildId, category, priority);
    return this.getById(result.lastInsertRowid);
  },

  /**
   * Get ticket by ID
   * @param {number} ticketId
   * @returns {Object|null}
   */
  getById(ticketId) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM tickets WHERE ticket_id = ?');
    return stmt.get(ticketId);
  },

  /**
   * Get ticket by channel ID
   * @param {string} channelId
   * @returns {Object|null}
   */
  getByChannelId(channelId) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM tickets WHERE channel_id = ?');
    return stmt.get(channelId);
  },

  /**
   * Get all open tickets for a guild
   * @param {string} guildId
   * @returns {Array}
   */
  getOpenTickets(guildId) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM tickets
      WHERE guild_id = ? AND status = 'open'
      ORDER BY created_at DESC
    `);
    return stmt.all(guildId);
  },

  /**
   * Get all tickets for a user
   * @param {string} userId
   * @param {string} guildId
   * @returns {Array}
   */
  getUserTickets(userId, guildId) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM tickets
      WHERE user_id = ? AND guild_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(userId, guildId);
  },

  /**
   * Get active ticket for user (one ticket per user limit)
   * @param {string} userId
   * @param {string} guildId
   * @returns {Object|null}
   */
  getActiveUserTicket(userId, guildId) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM tickets
      WHERE user_id = ? AND guild_id = ? AND status IN ('open', 'claimed')
      LIMIT 1
    `);
    return stmt.get(userId, guildId);
  },

  /**
   * Update ticket status
   * @param {number} ticketId
   * @param {string} status
   * @returns {Object}
   */
  updateStatus(ticketId, status) {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE tickets
      SET status = ?
      WHERE ticket_id = ?
    `);
    return stmt.run(status, ticketId);
  },

  /**
   * Claim ticket (assign to staff)
   * @param {number} ticketId
   * @param {string} staffId
   * @returns {Object}
   */
  claim(ticketId, staffId) {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE tickets
      SET claimed_by = ?, status = 'claimed'
      WHERE ticket_id = ?
    `);
    return stmt.run(staffId, ticketId);
  },

  /**
   * Close ticket
   * @param {number} ticketId
   * @param {string} closedBy
   * @returns {Object}
   */
  close(ticketId, closedBy) {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE tickets
      SET status = 'closed',
          closed_at = strftime('%s', 'now'),
          closed_by = ?
      WHERE ticket_id = ?
    `);
    return stmt.run(closedBy, ticketId);
  },

  /**
   * Delete ticket (hard delete)
   * @param {number} ticketId
   * @returns {Object}
   */
  delete(ticketId) {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM tickets WHERE ticket_id = ?');
    return stmt.run(ticketId);
  },

  /**
   * Get ticket statistics for guild
   * @param {string} guildId
   * @returns {Object}
   */
  getStats(guildId) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN status = 'claimed' THEN 1 ELSE 0 END) as claimed,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed
      FROM tickets
      WHERE guild_id = ?
    `);
    return stmt.get(guildId);
  }
};

/**
 * Ticket message operations (for transcripts)
 */
export const TicketMessageDB = {
  /**
   * Add message to ticket transcript
   * @param {Object} data - Message data
   * @returns {Object}
   */
  add({ messageId, ticketId, authorId, authorName, content, attachments = null }) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO ticket_messages (message_id, ticket_id, author_id, author_name, content, attachments, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
    `);
    return stmt.run(messageId, ticketId, authorId, authorName, content, attachments);
  },

  /**
   * Get all messages for a ticket
   * @param {number} ticketId
   * @returns {Array}
   */
  getByTicketId(ticketId) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM ticket_messages
      WHERE ticket_id = ?
      ORDER BY timestamp ASC
    `);
    return stmt.all(ticketId);
  },

  /**
   * Delete all messages for a ticket
   * @param {number} ticketId
   * @returns {Object}
   */
  deleteByTicketId(ticketId) {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM ticket_messages WHERE ticket_id = ?');
    return stmt.run(ticketId);
  }
};

/**
 * Ticket configuration operations
 */
export const TicketConfigDB = {
  /**
   * Get config for guild
   * @param {string} guildId
   * @returns {Object|null}
   */
  get(guildId) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM ticket_config WHERE guild_id = ?');
    return stmt.get(guildId);
  },

  /**
   * Get or create config for guild
   * @param {string} guildId
   * @returns {Object}
   */
  getOrCreate(guildId) {
    let config = this.get(guildId);
    if (!config) {
      this.create(guildId);
      config = this.get(guildId);
    }
    return config;
  },

  /**
   * Create config for guild
   * @param {string} guildId
   * @returns {Object}
   */
  create(guildId) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO ticket_config (guild_id)
      VALUES (?)
      ON CONFLICT(guild_id) DO NOTHING
    `);
    return stmt.run(guildId);
  },

  /**
   * Update config for guild
   * @param {string} guildId
   * @param {Object} updates - Fields to update
   * @returns {Object}
   */
  update(guildId, updates) {
    const db = getDatabase();
    const allowedFields = [
      'ticket_category_id',
      'staff_role_id',
      'log_channel_id',
      'transcript_channel_id',
      'enabled',
      'auto_close_hours'
    ];

    const fields = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .map(key => `${key} = ?`)
      .join(', ');

    if (!fields) return null;

    const values = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .map(key => updates[key]);

    const stmt = db.prepare(`
      UPDATE ticket_config
      SET ${fields}, updated_at = strftime('%s', 'now')
      WHERE guild_id = ?
    `);

    return stmt.run(...values, guildId);
  },

  /**
   * Check if tickets are enabled for guild
   * @param {string} guildId
   * @returns {boolean}
   */
  isEnabled(guildId) {
    const config = this.get(guildId);
    return config ? config.enabled === 1 : false;
  }
};

// Initialize schema when module is imported
initializeTicketSchema();

export default {
  TicketDB,
  TicketMessageDB,
  TicketConfigDB,
  initializeTicketSchema
};
