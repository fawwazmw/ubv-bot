# Discord Bot Database & Storage: Best Practices

> **Berdasarkan riset dari berbagai sumber:** Discord.js Guide, Stack Overflow, FreeCodeCamp, dan artikel terkini 2024-2025

---

## 🎯 TL;DR - Rekomendasi Cepat

| Bot Scale | Users | Recommended | Why? |
|-----------|-------|-------------|------|
| **Hobby/Small** | <1,000 | **SQLite** | Simple, fast, no setup needed |
| **Small-Medium** | 1K-10K | **SQLite** atau **MongoDB Atlas Free** | Masih efisien, gratis |
| **Medium-Large** | 10K-100K | **PostgreSQL** atau **MongoDB Atlas** | Scalable, concurrent access |
| **Enterprise** | >100K | **PostgreSQL** (hosted) | ACID compliance, complex queries |

---

## ❌ JSON Files: JANGAN untuk Production!

### Kenapa JSON TIDAK Disarankan?

Menurut **Discord.js maintainers** dan berbagai sumber:

> "JSON files are prone to corruption when written to and read from a lot, which is why they should not be used as a form of database."

#### Masalah JSON:

1. **❌ Prone to Corruption**
   - Banyak read/write → risiko file corrupt
   - Tidak ada transaction management
   - Jika crash saat write → data hilang/rusak

2. **❌ No Data Integrity**
   - Tidak ada DBMS (Database Management System)
   - Tidak ada built-in backup
   - Tidak ada encryption
   - Tidak ada data validation

3. **❌ Performance Issues**
   ```javascript
   // Harus iterate seluruh array untuk mencari data
   const user = users.find(u => u.id === "123"); // O(n) complexity

   // Database pakai index, jauh lebih cepat
   const user = await User.findOne({ id: "123" }); // O(1) atau O(log n)
   ```

4. **❌ Tidak Bisa Handle Relational Data**
   - Tidak ada JOIN
   - Tidak ada foreign keys
   - Sulit maintain relationships

5. **❌ Concurrency Problems**
   - Multiple writes bisa corrupt data
   - Race conditions
   - File locking issues

### Kapan JSON Masih Boleh Dipakai?

✅ **Hanya untuk:**
- Config files (tidak berubah-ubah)
- Development/testing sementara
- Bot sangat kecil (<100 users) dan tidak kritis
- Prototype/MVP cepat

---

## ✅ Database Options: Perbandingan

### 1. **SQLite** ⭐ Recommended untuk Small-Medium Bots

#### Pros:
- ✅ **Zero setup** - Satu file, langsung jalan
- ✅ **Lightweight** - Hanya beberapa MB RAM
- ✅ **Fast** untuk read-heavy workloads
- ✅ **ACID compliant** - Data integrity terjamin
- ✅ **SQL** - Query language yang powerful
- ✅ **Portable** - Cukup copy satu file untuk backup

#### Cons:
- ❌ **Single writer** - Tidak optimal untuk concurrent writes
- ❌ **Tidak bisa di Heroku** - Heroku reset filesystem setiap deploy
- ❌ **Tidak networked** - Tidak bisa diakses dari multiple servers

#### Best For:
- Bot dengan <10,000 users
- Hosted di VPS (bukan Heroku)
- Read-heavy operations (birthday checks, user stats)
- Simple data models

#### Setup (5 menit):
```bash
npm install better-sqlite3
```

```javascript
const Database = require('better-sqlite3');
const db = new Database('data/bot.db');

// Create table
db.exec(`
  CREATE TABLE IF NOT EXISTS birthdays (
    user_id TEXT PRIMARY KEY,
    birthday_date TEXT NOT NULL
  )
`);

// Insert
const insert = db.prepare('INSERT INTO birthdays (user_id, birthday_date) VALUES (?, ?)');
insert.run('123456', '1990-01-15');

// Query
const stmt = db.prepare('SELECT * FROM birthdays WHERE user_id = ?');
const user = stmt.get('123456');
```

**File size:** 1 file (`bot.db`) - ignore di `.gitignore`

---

### 2. **MongoDB Atlas** (Free Tier) ⭐ Recommended untuk Flexibility

#### Pros:
- ✅ **Free tier** - 512MB gratis selamanya
- ✅ **Cloud-based** - Accessible dari mana saja
- ✅ **JSON-like** - Mirip struktur data JavaScript
- ✅ **Flexible schema** - Mudah ubah struktur data
- ✅ **Scalable** - Mudah upgrade saat grow
- ✅ **Automatic backups** (di paid tier)
- ✅ **Works on Heroku/serverless**

#### Cons:
- ❌ **Requires internet** - Tidak bisa offline
- ❌ **More memory** - ~3GB RAM untuk instance
- ❌ **Latency** - Network calls (tapi minimal)
- ❌ **Learning curve** - NoSQL berbeda dari SQL

#### Best For:
- Bot yang di-host di Heroku/serverless
- Butuh flexible schema
- Multiple servers/shards
- Sudah familiar dengan JSON structure

#### Setup (10 menit):
```bash
npm install mongoose
```

```javascript
const mongoose = require('mongoose');

// Connect
await mongoose.connect(process.env.MONGODB_URI);

// Define schema
const birthdaySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  birthdayDate: { type: String, required: true }
});

const Birthday = mongoose.model('Birthday', birthdaySchema);

// Insert
await Birthday.create({ userId: '123456', birthdayDate: '1990-01-15' });

// Query
const user = await Birthday.findOne({ userId: '123456' });
```

**Setup MongoDB Atlas:**
1. Daftar di [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create free cluster (M0 - 512MB)
3. Whitelist IP: `0.0.0.0/0` (all IPs)
4. Get connection string
5. Add to `.env`: `MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/`

---

### 3. **PostgreSQL** - Enterprise Grade

#### Pros:
- ✅ **ACID compliant**
- ✅ **Complex queries** - JOINs, subqueries, CTEs
- ✅ **Transactional integrity**
- ✅ **Mature ecosystem**
- ✅ **Free hosting** - Supabase, Railway, Neon

#### Cons:
- ❌ **More complex setup**
- ❌ **Overkill untuk simple bots**
- ❌ **Requires external hosting**

#### Best For:
- Enterprise-level bots
- Complex relational data
- Heavy analytics/reporting
- Butuh complex queries

#### Setup:
```bash
npm install pg sequelize
```

---

## 🔄 Migration Path: JSON → Database

### Untuk Bot Kamu (Birthday Bot):

**Saat ini:** JSON file (`data/birthdays.json`)

```json
{
  "123456": { "date": "1990-01-15" },
  "789012": { "date": "1995-05-20" }
}
```

### Option 1: Migrate ke SQLite (Recommended!)

**Pros:**
- ✅ Paling mudah migrate dari JSON
- ✅ Tidak perlu setup external service
- ✅ Masih single file seperti JSON
- ✅ Lebih aman dan faster

**Migration script:**
```javascript
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';

const db = new Database('data/birthdays.db');

// Create table
db.exec(`
  CREATE TABLE IF NOT EXISTS birthdays (
    user_id TEXT PRIMARY KEY,
    birthday_date TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  )
`);

// Migrate from JSON
const json = JSON.parse(readFileSync('data/birthdays.json'));
const insert = db.prepare('INSERT OR REPLACE INTO birthdays (user_id, birthday_date) VALUES (?, ?)');

const transaction = db.transaction((data) => {
  for (const [userId, value] of Object.entries(data)) {
    insert.run(userId, value.date);
  }
});

transaction(json);
console.log('Migration complete!');
```

### Option 2: Migrate ke MongoDB Atlas

**Pros:**
- ✅ Cloud-based (tidak ada file lokal)
- ✅ Works di Heroku
- ✅ Automatic backups
- ✅ Easy scaling

**Migration script:**
```javascript
import mongoose from 'mongoose';
import { readFileSync } from 'fs';

await mongoose.connect(process.env.MONGODB_URI);

const Birthday = mongoose.model('Birthday', new mongoose.Schema({
  userId: String,
  birthdayDate: String
}));

// Migrate from JSON
const json = JSON.parse(readFileSync('data/birthdays.json'));

for (const [userId, value] of Object.entries(json)) {
  await Birthday.create({ userId, birthdayDate: value.date });
}

console.log('Migration complete!');
```

---

## 🎯 Rekomendasi untuk UBV Bot

### Current Situation:
- Bot: Small to medium scale
- Data: User birthdays (simple key-value)
- Hosting: VPS (bukan Heroku)
- Users: Estimated <1,000 users

### **Rekomendasi: SQLite** ✅

**Alasan:**
1. ✅ **Simple migration** dari JSON yang sudah ada
2. ✅ **Tidak perlu setup external service** (MongoDB Atlas)
3. ✅ **Lebih aman** dari JSON corruption
4. ✅ **Performance boost** dengan indexing
5. ✅ **Single file** - mudah backup (`bot.db` file)
6. ✅ **Zero cost** - tidak ada biaya hosting database
7. ✅ **Works di VPS** - tidak ada masalah persistent storage

### Future Scaling Path:
```
JSON (current)
    ↓
SQLite (recommended now - handles up to 10K users easily)
    ↓
PostgreSQL (jika >10K users atau butuh complex queries)
    ↓
PostgreSQL Cluster (jika >100K users)
```

---

## 📊 Performance Comparison

| Operation | JSON | SQLite | MongoDB |
|-----------|------|--------|---------|
| **Read single user** | O(n) | O(1) with index | O(1) with index |
| **Write single user** | Load all → modify → save | Direct update | Direct update |
| **Find by pattern** | Iterate all | SQL WHERE + index | Query with index |
| **Concurrent writes** | ❌ Corruption risk | ⚠️ Single writer | ✅ Concurrent |
| **Memory usage** | Load entire file | ~10MB | ~3GB |
| **Startup time** | Fast | Instant | Connection ~100ms |

---

## 🔒 Security & Backup Best Practices

### SQLite:
```bash
# Backup (cron job daily)
cp data/bot.db backups/bot-$(date +%Y%m%d).db

# Restore
cp backups/bot-20250131.db data/bot.db
```

### MongoDB:
```bash
# Backup (mongodump)
mongodump --uri="mongodb+srv://..." --out=./backup

# Restore
mongorestore --uri="mongodb+srv://..." ./backup
```

### Important:
- ✅ **Encrypt backups** jika ada sensitive data
- ✅ **Automated backups** - daily atau weekly
- ✅ **Test restores** - pastikan backup works
- ✅ **Off-site storage** - jangan simpan di server yang sama

---

## 📚 Resources

### SQLite:
- [Better-SQLite3 Docs](https://github.com/WiseLibs/better-sqlite3)
- [Discord.js Sequelize Guide](https://discordjs.guide/sequelize/)

### MongoDB:
- [MongoDB Atlas Free](https://www.mongodb.com/atlas)
- [Mongoose Docs](https://mongoosejs.com/docs/guide.html)
- [FreeCodeCamp Tutorial](https://www.freecodecamp.org/news/how-to-build-a-100-days-of-code-bot-for-discord-using-typescript-and-mongodb/)

### PostgreSQL:
- [Supabase](https://supabase.com) - Free PostgreSQL hosting
- [Neon](https://neon.tech) - Serverless PostgreSQL

---

## 🎓 Summary

| Aspect | Current (JSON) | Recommended (SQLite) | Alternative (MongoDB) |
|--------|---------------|---------------------|----------------------|
| **Setup Time** | 0 min | 5 min | 10 min |
| **Cost** | Free | Free | Free (512MB) |
| **Data Safety** | ❌ Low | ✅ High | ✅ High |
| **Performance** | ⚠️ Slow | ✅ Fast | ✅ Fast |
| **Scalability** | ❌ Poor | ⚠️ Medium | ✅ Excellent |
| **Migration Effort** | - | Easy | Medium |
| **Learning Curve** | Easy | Medium (SQL) | Medium (NoSQL) |

**Bottom Line:** Untuk UBV Bot, **SQLite adalah pilihan terbaik** saat ini. Mudah migrate, aman, cepat, dan cukup untuk scale yang ada. Upgrade ke PostgreSQL/MongoDB kalau sudah >10K users atau butuh multi-server.
