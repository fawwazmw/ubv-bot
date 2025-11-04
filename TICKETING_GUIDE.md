# 🎫 UBV Bot - Ticketing System Guide

Sistem ticketing lengkap untuk bot Discord UBV (Universitas Brawijaya Voice).

## 📋 Fitur Utama

### ✨ User Features
- ✅ **Multi-Category Tickets** - 3 kategori: Bantuan, Laporan, Saran
- ✅ **Private Channels** - Setiap ticket memiliki channel private otomatis
- ✅ **One Ticket Limit** - User hanya bisa membuka 1 ticket dalam satu waktu
- ✅ **Ticket Information** - Lihat info detail ticket dengan `/ticket-info`

### 🛠️ Staff Features
- ✅ **Claim System** - Staff bisa claim ticket dengan `/ticket-claim`
- ✅ **Add/Remove Users** - Tambah atau hapus user dari ticket
- ✅ **Force Close** - Admin bisa force close ticket mana saja
- ✅ **Ticket Statistics** - Lihat statistik ticket dengan `/ticket-stats`

### 📊 Admin Features
- ✅ **Easy Setup** - Setup lengkap dengan 1 command
- ✅ **Transcript Logging** - Semua pesan disimpan ke database dan file
- ✅ **Activity Logs** - Log semua aktivitas ticket ke channel khusus
- ✅ **Configurable** - Konfigurasi category, role, dan channels

## 🚀 Setup Guide

### 1. Setup Ticket System

Gunakan command `/ticket-setup` untuk mengkonfigurasi sistem:

```
/ticket-setup
  category: [Category Channel untuk ticket channels]
  staff-role: [Role staff yang handle tickets]
  log-channel: [Channel untuk activity logs] (optional)
  transcript-channel: [Channel untuk menyimpan transcripts] (optional)
```

**Persyaratan:**
- Anda harus memiliki permission **Manage Server**
- Category channel harus sudah dibuat terlebih dahulu
- Staff role harus sudah dibuat terlebih dahulu

**Contoh:**
```
/ticket-setup
  category: Support Tickets
  staff-role: @Staff
  log-channel: #ticket-logs
  transcript-channel: #ticket-transcripts
```

### 2. Send Ticket Panel

Setelah setup, kirim ticket panel ke channel yang diinginkan:

```
/ticket-panel
```

Panel akan menampilkan 3 tombol untuk berbagai kategori ticket.

## 📚 Commands Reference

### Admin Commands (Requires: Manage Server)

#### `/ticket-setup`
Setup atau update konfigurasi ticket system.

**Options:**
- `category` (required) - Category channel untuk ticket channels
- `staff-role` (required) - Role staff yang handle tickets
- `log-channel` (optional) - Channel untuk activity logs
- `transcript-channel` (optional) - Channel untuk transcripts

#### `/ticket-panel`
Kirim ticket panel dengan buttons ke current channel.

#### `/ticket-close`
Force close ticket channel tertentu.

**Options:**
- `channel` (required) - Ticket channel yang akan ditutup

#### `/ticket-stats`
Lihat statistik ticket untuk server.

**Menampilkan:**
- Total tickets
- Open tickets
- Claimed tickets
- Closed tickets
- System status

#### `/ticket-config`
Lihat konfigurasi ticket system saat ini.

**Menampilkan:**
- Ticket category
- Staff role
- Log channel
- Transcript channel
- Auto-close duration
- System status

### Staff/User Commands

#### `/ticket-claim`
Claim ticket di channel saat ini (Staff only).

**Persyaratan:**
- Harus digunakan di ticket channel
- User harus memiliki staff role atau Manage Channels permission

#### `/ticket-add`
Tambah user ke ticket saat ini (Staff only).

**Options:**
- `user` (required) - User yang akan ditambahkan

**Persyaratan:**
- Harus digunakan di ticket channel
- User harus memiliki staff role atau Manage Channels permission

#### `/ticket-remove`
Hapus user dari ticket saat ini (Staff only).

**Options:**
- `user` (required) - User yang akan dihapus

**Persyaratan:**
- Harus digunakan di ticket channel
- User harus memiliki staff role atau Manage Channels permission
- Tidak bisa menghapus pembuat ticket

#### `/ticket-info`
Lihat informasi detail ticket saat ini.

**Menampilkan:**
- Ticket ID
- Creator
- Category
- Status
- Created date
- Claimed by (if any)
- Closed date (if closed)

## 🎨 Ticket Categories

### 🛠️ Bantuan
Untuk bantuan teknis dan pertanyaan umum.

**Use case:**
- Masalah teknis bot
- Pertanyaan tentang server
- Request bantuan staff

### 📢 Laporan
Untuk melaporkan masalah atau pelanggaran.

**Use case:**
- Report user toxic
- Report spam
- Report masalah di voice channel

### 💡 Saran
Untuk memberikan saran atau ide.

**Use case:**
- Saran fitur baru
- Saran event
- Feedback untuk server

## 🔄 Ticket Workflow

### Creating a Ticket

1. User klik tombol category di ticket panel
2. Bot check apakah user sudah punya active ticket
3. Bot create private channel dengan format: `ticket-[number]-[username]`
4. Bot set permissions:
   - User bisa view/send messages
   - Staff role bisa view/send messages
   - Everyone else tidak bisa lihat
5. Bot send welcome message dengan info ticket
6. Staff akan di-mention (jika staff role di-set)

### Working on Ticket

1. Staff bisa claim ticket dengan `/ticket-claim`
2. Staff bisa add user lain dengan `/ticket-add`
3. Staff dan user bisa chat di channel
4. Semua messages akan disimpan untuk transcript

### Closing Ticket

1. User atau Staff klik tombol "Tutup Ticket"
2. Bot confirm dan mulai proses closing
3. Bot fetch semua messages dari channel
4. Bot save messages ke database
5. Bot generate text transcript
6. Bot send transcript ke transcript channel (jika di-set)
7. Bot log activity ke log channel (jika di-set)
8. Channel dihapus setelah 10 detik

## 💾 Database Structure

### tickets table
```sql
- ticket_id: INTEGER PRIMARY KEY
- channel_id: TEXT (Discord channel ID)
- user_id: TEXT (Creator user ID)
- guild_id: TEXT
- category: TEXT (support, report, suggestion)
- status: TEXT (open, claimed, closed)
- claimed_by: TEXT (Staff user ID)
- priority: TEXT (normal, low, high, urgent)
- created_at: INTEGER (Unix timestamp)
- closed_at: INTEGER (Unix timestamp)
- closed_by: TEXT (User ID who closed)
```

### ticket_messages table
```sql
- message_id: TEXT PRIMARY KEY
- ticket_id: INTEGER (Foreign key to tickets)
- author_id: TEXT
- author_name: TEXT
- content: TEXT
- attachments: TEXT (JSON)
- timestamp: INTEGER
```

### ticket_config table
```sql
- guild_id: TEXT PRIMARY KEY
- ticket_category_id: TEXT
- staff_role_id: TEXT
- log_channel_id: TEXT
- transcript_channel_id: TEXT
- enabled: INTEGER (0 or 1)
- auto_close_hours: INTEGER
- created_at: INTEGER
- updated_at: INTEGER
```

## 🔐 Permissions

### Required Bot Permissions
- **Manage Channels** - Untuk create dan delete ticket channels
- **Manage Permissions** - Untuk set channel permissions
- **View Channels** - Untuk access ticket channels
- **Send Messages** - Untuk send messages di tickets
- **Read Message History** - Untuk fetch messages untuk transcript
- **Embed Links** - Untuk send embeds
- **Attach Files** - Untuk send transcript files

### Admin Permissions
Commands yang require **Manage Server** permission:
- `/ticket-setup`
- `/ticket-panel`
- `/ticket-close` (force close)
- `/ticket-stats`
- `/ticket-config`

### Staff Permissions
Commands yang require **Staff Role** atau **Manage Channels**:
- `/ticket-claim`
- `/ticket-add`
- `/ticket-remove`

## 📊 Transcript Format

Transcript disimpan dalam format text dengan struktur:

```
═══════════════════════════════════════
  TICKET TRANSCRIPT #123
═══════════════════════════════════════

Ticket ID: #123
Category: support
User ID: 123456789012345678
Created: 1/1/2025, 10:00:00 AM
Closed: 1/1/2025, 11:30:00 AM

═══════════════════════════════════════
  MESSAGES
═══════════════════════════════════════

[1/1/2025, 10:00:00 AM] User#1234:
  Halo, saya butuh bantuan

[1/1/2025, 10:01:00 AM] Staff#5678:
  Halo, ada yang bisa dibantu?

...

═══════════════════════════════════════
  END OF TRANSCRIPT
═══════════════════════════════════════
```

## 🎯 Best Practices

### For Admins
1. ✅ Set dedicated category untuk tickets
2. ✅ Create staff role khusus untuk ticket handlers
3. ✅ Set log channel untuk monitoring
4. ✅ Set transcript channel untuk archive
5. ✅ Review ticket stats secara berkala

### For Staff
1. ✅ Claim ticket yang akan Anda handle
2. ✅ Response sesegera mungkin
3. ✅ Be professional dan helpful
4. ✅ Close ticket setelah selesai
5. ✅ Save transcript untuk reference

### For Users
1. ✅ Pilih kategori yang tepat
2. ✅ Jelaskan masalah dengan detail
3. ✅ Attach screenshot jika diperlukan
4. ✅ Tunggu staff response dengan sabar
5. ✅ Close ticket setelah selesai

## 🐛 Troubleshooting

### Ticket panel tidak muncul
- ✅ Pastikan sudah run `/ticket-setup` terlebih dahulu
- ✅ Check bot permissions di channel tersebut

### User tidak bisa create ticket
- ✅ Check apakah user sudah punya active ticket
- ✅ Check apakah ticket system enabled
- ✅ Check bot permissions untuk create channels

### Staff tidak bisa claim ticket
- ✅ Check apakah user memiliki staff role
- ✅ Check apakah staff role sudah di-set di config

### Transcript tidak tersimpan
- ✅ Check apakah transcript channel sudah di-set
- ✅ Check bot permissions di transcript channel
- ✅ Check database logs untuk errors

## 📞 Support

Jika ada masalah atau pertanyaan tentang ticketing system:
1. Check dokumentasi ini terlebih dahulu
2. Check bot logs untuk error messages
3. Contact developer untuk bug reports

---

**Built with ❤️ for Universitas Brawijaya Voice**
