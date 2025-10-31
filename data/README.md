# Data Directory

This directory stores database files used by the bot.

## 📋 File Types

### Database Files (Not Committed)
These files are **automatically ignored by git** and contain user-specific data that differs between development and production:

- `ubv-bot.db` - SQLite database containing all bot data (birthdays, etc.)
- `ubv-bot.db-shm` - SQLite shared memory file (temporary)
- `ubv-bot.db-wal` - SQLite write-ahead log (temporary)
- `birthdays.json` - **DEPRECATED** - Migrated to SQLite database

**Important:** These files are created automatically when the bot runs. Don't commit them!

### Config Files (Can Be Committed)
To commit a config file that should be the same across all environments:

1. Create the file in `data/` directory
2. Add it to `.gitignore` whitelist:
   ```gitignore
   !data/your_config_file.json
   ```

Example use cases:
- Channel ID mappings
- Role configurations
- Default settings templates

## 🔄 How It Works

### Development → Production Flow

```
┌──────────────────┐                  ┌──────────────────┐
│   Development    │                  │   Production     │
│                  │                  │                  │
│  ubv-bot.db      │                  │  ubv-bot.db      │
│  (test data)     │  ← Git ignores → │  (real data)     │
│                  │                  │                  │
└──────────────────┘                  └──────────────────┘
       ↓ git push                            ↑ git pull
       ↓                                     ↑
  ┌────────────────────────────────────────────┐
  │          Git Repository                    │
  │  ✅ Code files                             │
  │  ✅ Database schema (in code)              │
  │  ❌ Database files (ignored)               │
  └────────────────────────────────────────────┘
```

**Result:** Each environment has its own database that doesn't interfere with each other.

## 🆕 Adding New Data Storage

When creating a new feature that needs data storage:

### Recommended: Use SQLite Database
Add new tables to the database:

```javascript
import { getDatabase } from '../database/sqlite.js';

const db = getDatabase();

// Create new table
db.exec(`
  CREATE TABLE IF NOT EXISTS my_feature (
    user_id TEXT PRIMARY KEY,
    data TEXT NOT NULL
  )
`);

// Use it
const stmt = db.prepare('INSERT INTO my_feature (user_id, data) VALUES (?, ?)');
stmt.run(userId, data);
```

**Benefits:**
- ✅ All data in one database file
- ✅ ACID compliance
- ✅ Fast queries with indexes
- ✅ No file corruption issues

### Option 2: Shared Config
If you need a config file that must be identical across all environments:

1. Create `data/my_config.json`
2. Edit `.gitignore` and uncomment/add:
   ```gitignore
   !data/my_config.json
   ```
3. Commit it: `git add data/my_config.json`

## ⚠️ First Time Setup

When deploying to a new environment:

```bash
# 1. Clone repository
git clone <repo-url>
cd ubv-bot

# 2. Install dependencies
npm install

# 3. The data/ directory exists (thanks to .gitkeep)

# 4. Data files will be created automatically when bot runs
npm start
```

## 🔒 Security Note

Never commit files containing:
- User personal information
- Tokens or API keys (use `.env` instead)
- Production user data
- Sensitive statistics

All `.json` files in this directory are ignored by default for safety.
