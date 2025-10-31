# 🎂 Birthday System - UBV Bot

## Overview
Sistem birthday otomatis yang melacak ulang tahun member dan mengirim ucapan setiap hari.

## ✨ Features

### 1. Auto Birthday Announcement
- Bot cek birthday setiap hari pada waktu yang ditentukan
- Kirim ucapan otomatis dengan embed menarik
- Tampilkan umur member (jika tahun lahir diatur)
- Mention member yang berulang tahun

### 2. Manual Birthday Check
- Admin dapat trigger pengecekan dengan `/check-birthdays`
- Berguna untuk testing

### 3. Birthday Configuration
- Lihat konfigurasi dengan `/birthday-config`
- Channel, timezone, dan waktu pengecekan

## 📝 Commands

### User Commands
- `/birthday [member]` - Lihat birthday sendiri atau member lain
- `/remember-birthday [date]` - Simpan birthday sendiri
- `/forget-birthday` - Hapus birthday sendiri
- `/next-birthdays` - List 10 upcoming birthdays

### Admin Commands
- `/set-user-birthday [date] [@member]` - Set birthday member lain
- `/check-birthdays` - Trigger manual birthday check
- `/birthday-config` - Lihat konfigurasi sistem

## ⚙️ Configuration

Tambahkan di file `.env`:

```env
# Required: Channel untuk announcement
BIRTHDAY_CHANNEL_ID=1234567890123456789

# Optional: Waktu pengecekan (default: 00:00)
BIRTHDAY_CHECK_TIME=00:00

# Optional: Timezone (default: Asia/Jakarta)
BIRTHDAY_TIMEZONE=Asia/Jakarta
```

### Cara Mendapatkan Channel ID

1. Enable Developer Mode di Discord:
   - User Settings → Advanced → Developer Mode ✅

2. Channel ID:
   - Klik kanan pada channel → Copy ID

## 📅 Date Format

### Format 1: Tanpa Tahun (MM-DD)
```
/remember-birthday 12-25
```
- Hanya bulan dan tanggal
- Tidak menampilkan umur

### Format 2: Dengan Tahun (YYYY-MM-DD)
```
/remember-birthday 1995-12-25
```
- Tahun, bulan, dan tanggal
- Menampilkan umur saat ulang tahun

## 🔄 How It Works

1. **Daily Check**
   - Bot cek database setiap hari (default 00:00 WIB)
   - Menggunakan node-cron scheduler
   - Timezone-aware

2. **Birthday Announcement**
   - Jika ada member yang berulang tahun
   - Bot kirim embed ke channel
   - Mention member tersebut
   - Tampilkan umur jika ada

## 🛠️ Troubleshooting

### Birthday tidak diumumkan?
1. ✅ Cek `BIRTHDAY_CHANNEL_ID` sudah diatur
2. ✅ Bot punya permission send messages di channel
3. ✅ Database `birthdays.json` berisi data
4. ✅ Format tanggal benar
5. ✅ Timezone sesuai

### Manual check
```
/check-birthdays
```
Trigger pengecekan langsung.

## 📊 Data Storage

Birthday disimpan di `data/birthdays.json`:

```json
{
  "123456789012345678": {
    "date": "1995-12-25"
  },
  "987654321098765432": {
    "date": "03-15"
  }
}
```

## 🔐 Permissions Required

Bot memerlukan:
- ✅ View Channels
- ✅ Send Messages
- ✅ Embed Links

## 🌍 Timezone Examples

- `Asia/Jakarta` - WIB (GMT+7)
- `Asia/Makassar` - WITA (GMT+8)
- `Asia/Jayapura` - WIT (GMT+9)
- `America/New_York` - EST (GMT-5)
- `Europe/London` - GMT (GMT+0)

---

**Last Updated:** 2024-10-30  
**Version:** 1.0 (Simplified - No Role Feature)
