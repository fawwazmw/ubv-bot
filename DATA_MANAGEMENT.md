# Data Management Guide

## 🎯 Quick Answer: "Gimana kalau ada data/JSON baru?"

**Jawaban:** Tinggal bikin aja! Sudah otomatis ke-ignore.

```javascript
// Bikin feature baru
const newStore = new JsonStore('data/my_new_feature.json');
// ✅ Otomatis ke-ignore, tidak perlu update .gitignore!
```

---

## 📊 Tabel Keputusan

| Jenis File | Contoh | Di-commit? | Action |
|------------|--------|------------|--------|
| **User Data** | `data/birthdays.json`<br>`data/user_levels.json`<br>`data/quotes.json` | ❌ TIDAK | Tidak perlu action, sudah auto-ignore |
| **Config Template** | `data/channels_config.json`<br>`data/default_roles.json` | ✅ IYA | Edit `.gitignore`, uncomment whitelist |
| **Environment** | `.env`<br>`.env.production` | ❌ TIDAK | Sudah di-ignore |
| **Dependencies** | `node_modules/` | ❌ TIDAK | Sudah di-ignore |
| **Code** | `*.js`, `package.json` | ✅ IYA | Commit seperti biasa |

---

## 🔄 Workflow Sehari-hari

### Development (Komputer Kamu)

```bash
# 1. Coding fitur baru
vim src/features/myfeature/commands.js

# 2. Testing - data tersimpan otomatis
/my-command test
# → Tersimpan di data/myfeature.json (lokal)

# 3. Commit & Push (tanpa data)
git add .
git commit -m "feat: add new feature"
git push origin main

# ✅ Code di-push, data TIDAK ikut ter-push
```

### Production (Server)

```bash
# 1. Pull update code
git pull origin main

# 2. Restart bot
pm2 restart ubv-bot

# ✅ Data production tetap utuh!
```

---

## 💡 Contoh Kasus Nyata

### Kasus 1: Bikin Fitur "User Notes"

```javascript
// src/features/notes/noteCommands.js
import { readJsonSafe, writeJsonSafe } from '../../data/jsonStore.js';

const NOTES_FILE = 'data/user_notes.json';

export async function saveNote(userId, note) {
  const db = await readJsonSafe(NOTES_FILE, {});
  db[userId] = note;
  await writeJsonSafe(NOTES_FILE, db);
}
```

**Q: Perlu update .gitignore?**
**A:** ❌ TIDAK! Pattern `data/*.json` sudah cover.

---

### Kasus 2: Perlu File Channel IDs (Sama di Semua Environment)

```json
// data/channel_ids.json
{
  "announcements": "123456789",
  "logs": "987654321"
}
```

**Q: Perlu update .gitignore?**
**A:** ✅ IYA! File ini harus di-commit:

```bash
# 1. Edit .gitignore, uncomment:
!data/channel_ids.json

# 2. Add & commit
git add data/channel_ids.json .gitignore
git commit -m "feat: add channel IDs config"
```

---

## 🚨 Red Flags (JANGAN LAKUKAN!)

### ❌ Commit User Data
```bash
# SALAH!
git add data/birthdays.json
git commit -m "update birthdays"
# → Data production bisa tertimpa!
```

### ❌ Hardcode Data
```javascript
// SALAH!
const users = {
  "123": { name: "Test User" }
};

// BENAR!
const users = await readJsonSafe('data/users.json', {});
```

### ❌ Simpan Token di JSON
```json
// SALAH di data/config.json!
{
  "botToken": "MTIzNDU2Nzg5..."
}

// BENAR di .env!
BOT_TOKEN=MTIzNDU2Nzg5...
```

---

## ✅ Best Practices

### 1. **Selalu Gunakan jsonStore.js**
```javascript
import { readJsonSafe, writeJsonSafe } from '../../data/jsonStore.js';

// Auto-create file if not exists
const data = await readJsonSafe('data/newfile.json', {});
```

### 2. **Naming Convention**
```
✅ data/user_birthdays.json
✅ data/server_stats.json
✅ data/message_logs.json

❌ userBirthdays.json (tidak di folder data/)
❌ data/birthdays (tanpa .json)
```

### 3. **Initialize di Production**
```javascript
// Bot otomatis create file kosong kalau belum ada
const db = await readJsonSafe('data/myfile.json', {});
// Default: {} kalau file belum ada
```

---

## 🎓 Summary

1. **File data user** → Otomatis di-ignore ✅
2. **File config bersama** → Whitelist di .gitignore jika perlu
3. **Push code, bukan data** → `git push` hanya untuk code
4. **Data production aman** → Tidak akan tertimpa saat pull

**Intinya:** Kamu bebas bikin file JSON baru di `data/`, semuanya sudah auto-ignore! 🎉
