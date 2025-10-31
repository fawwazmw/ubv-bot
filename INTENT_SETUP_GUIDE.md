# 🔧 Discord Intents Setup Guide

## Error: Used disallowed intents

Ini terjadi karena bot memerlukan **Server Members Intent** yang belum diaktifkan.

## ✅ Cara Mengaktifkan (5 Menit):

### Step 1: Buka Discord Developer Portal
1. Kunjungi: https://discord.com/developers/applications
2. Login dengan akun Discord Anda
3. Pilih aplikasi bot Anda (UBV Bot)

### Step 2: Aktifkan Privileged Gateway Intents
1. Klik tab **"Bot"** di sidebar kiri
2. Scroll ke bawah sampai bagian **"Privileged Gateway Intents"**
3. **Toggle ON** opsi berikut:
   - ✅ **SERVER MEMBERS INTENT** (Required untuk birthday role)
   - ⬜ Presence Intent (Optional - tidak perlu)
   - ⬜ Message Content Intent (Optional - tidak perlu)

### Step 3: Save Changes
1. Klik **"Save Changes"** di bagian bawah
2. Restart bot Anda

### Step 4: Restart Bot
```bash
npm start
```

## ✅ Done!
Bot sekarang memiliki akses untuk:
- Fetch guild members
- Assign/remove roles
- Access member information

---

**Note:** Server Members Intent diperlukan untuk:
- Birthday role assignment
- Member fetching untuk announcements
- Display member avatars

Jika Anda tidak ingin mengaktifkan intent ini, gunakan Solusi 2 (tanpa birthday role).
