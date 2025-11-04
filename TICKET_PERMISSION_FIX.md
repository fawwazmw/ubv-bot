# 🔧 Ticket System - Permission Fix Guide

## ❌ Error yang Terjadi

```
DiscordAPIError[50013]: Missing Permissions
Error creating ticket
```

### 🔍 Penyebab:
Bot **tidak memiliki permission "Manage Channels"** yang diperlukan untuk membuat ticket channel.

---

## ✅ Solusi 1: Berikan Permission di Server Level (RECOMMENDED)

### Langkah-langkah:

1. **Buka Server Settings**
   - Klik nama server → Server Settings

2. **Pergi ke Roles**
   - Pilih tab "Roles" di sidebar

3. **Pilih Role Bot**
   - Cari dan klik role bot Anda (biasanya nama sama dengan bot)

4. **Enable Permissions**
   Enable permission berikut:
   - ✅ **Manage Channels** ← PENTING!
   - ✅ **View Channels**
   - ✅ **Send Messages**
   - ✅ **Embed Links**
   - ✅ **Attach Files**
   - ✅ **Read Message History**
   - ✅ **Manage Permissions** (untuk set channel permissions)

5. **Save Changes**
   - Klik "Save Changes"

6. **Test Ticket**
   - Coba buat ticket lagi dengan klik button di ticket panel

---

## ✅ Solusi 2: Berikan Permission di Category (Jika Menggunakan Category)

Jika Anda sudah menjalankan `/ticket-setup` dan menggunakan category tertentu:

### Langkah-langkah:

1. **Klik Kanan Category Channel**
   - Misalnya category "Support Tickets"
   - Klik kanan → Edit Category

2. **Buka Permissions Tab**
   - Klik "Permissions" di sidebar

3. **Add Role Bot**
   - Klik "Add members or roles"
   - Pilih role bot Anda

4. **Enable Permissions**
   - ✅ **Manage Channels**
   - ✅ **View Channels**
   - ✅ **Send Messages**
   - ✅ **Embed Links**

5. **Save Changes**

6. **Test Ticket**
   - Coba buat ticket lagi

---

## ✅ Solusi 3: Berikan Administrator Permission (EASY)

**⚠️ Warning:** Ini memberikan full access ke bot. Hanya gunakan jika Anda trust bot sepenuhnya.

### Langkah-langkah:

1. Server Settings → Roles
2. Pilih role bot
3. Enable **Administrator** permission
4. Save

✅ **Advantage:** Bot punya semua permission yang dibutuhkan
❌ **Disadvantage:** Bot punya full access ke server

---

## 🔍 Verification

### Check Bot Permissions:

1. **Klik kanan bot di member list**
2. **Pilih "View Permissions"**
3. **Verifikasi permissions:**
   - ✅ Manage Channels
   - ✅ View Channels
   - ✅ Send Messages
   - ✅ Embed Links
   - ✅ Read Message History

### Test Ticket Creation:

1. Pergi ke channel dengan ticket panel
2. Klik salah satu button (Bantuan, Laporan, atau Saran)
3. Bot seharusnya membuat ticket channel tanpa error

---

## 📊 Permission Requirements Summary

| Permission | Required For | Priority |
|------------|-------------|----------|
| **Manage Channels** | Create & delete ticket channels | 🔴 CRITICAL |
| **View Channels** | Access ticket channels | 🔴 CRITICAL |
| **Send Messages** | Send messages in tickets | 🔴 CRITICAL |
| **Embed Links** | Send formatted embeds | 🟡 IMPORTANT |
| **Manage Permissions** | Set channel permissions | 🟡 IMPORTANT |
| **Read Message History** | Generate transcripts | 🟡 IMPORTANT |
| **Attach Files** | Send transcript files | 🟢 OPTIONAL |

---

## 🔧 Code Changes Applied

### 1. **Permission Check Before Creating Ticket**
Sekarang bot akan check permissions SEBELUM mencoba create channel dan memberikan error message yang jelas:

```javascript
// Check bot permissions
const botMember = interaction.guild.members.cache.get(interaction.client.user.id);
const requiredPermissions = [
  PermissionsBitField.Flags.ManageChannels,
  PermissionsBitField.Flags.ViewChannel,
  PermissionsBitField.Flags.SendMessages
];

const missingPermissions = requiredPermissions.filter(
  perm => !botMember.permissions.has(perm)
);

if (missingPermissions.length > 0) {
  // Show helpful error message
}
```

### 2. **Category Permission Check**
Check permissions di category jika dikonfigurasi:

```javascript
if (config.ticket_category_id) {
  const category = interaction.guild.channels.cache.get(config.ticket_category_id);
  const categoryPerms = category.permissionsFor(botMember);
  if (!categoryPerms.has(PermissionsBitField.Flags.ManageChannels)) {
    // Show error with category-specific instructions
  }
}
```

### 3. **Better Error Messages**
Error handling yang lebih informatif:

```javascript
if (error.code === 50013) {
  // Show specific message for permission errors
}
```

---

## 🚀 After Fixing Permissions

### Test Checklist:

- [ ] `/ticket-panel` berhasil send panel
- [ ] Button "Bantuan" berhasil create ticket
- [ ] Button "Laporan" berhasil create ticket
- [ ] Button "Saran" berhasil create ticket
- [ ] Ticket channel ter-create di category yang benar
- [ ] Staff role ter-mention di ticket
- [ ] Button "Tutup Ticket" berfungsi
- [ ] Channel ter-delete setelah ticket ditutup

---

## 📞 Troubleshooting

### Masih Error Setelah Memberikan Permission?

**1. Check Role Hierarchy:**
- Bot role harus di atas @everyone
- Server Settings → Roles → Drag bot role ke atas

**2. Check Category Override:**
- Category permissions bisa override server permissions
- Pastikan tidak ada "❌" (deny) di category permissions

**3. Restart Bot:**
```bash
# Stop bot (Ctrl+C)
npm start
```

**4. Re-invite Bot dengan Proper Permissions:**
- Generate invite link dengan permissions yang benar
- Bot Permissions Calculator: https://discordapi.com/permissions.html
- Required permissions value: `268511248` (includes Manage Channels)

**5. Check Bot Role Position:**
- Bot role HARUS lebih tinggi dari role yang ingin di-manage
- Jika staff role lebih tinggi dari bot role, bot tidak bisa set permissions

---

## 💡 Best Practices

### For Server Owners:

1. ✅ Create dedicated role untuk bot dengan clear nama
2. ✅ Berikan minimal permissions yang dibutuhkan
3. ✅ Set bot role position di atas @everyone tapi di bawah admin
4. ✅ Test ticket system setelah setup
5. ✅ Monitor bot logs untuk errors

### For Bot Developers:

1. ✅ Always check permissions before operations
2. ✅ Provide clear error messages
3. ✅ Log permission errors for debugging
4. ✅ Document required permissions in setup guide

---

## ✅ Quick Fix Command

**One-liner untuk setup bot dengan permissions yang tepat:**

1. Create role "UBV Bot" dengan permissions:
   - Manage Channels ✅
   - View Channels ✅
   - Send Messages ✅
   - Embed Links ✅
   - Read Message History ✅
   - Manage Permissions ✅

2. Assign role ke bot

3. Test dengan `/ticket-panel`

---

## 📚 Related Documentation

- **TICKETING_GUIDE.md** - Full ticketing system guide
- **TICKETING_FIXES.md** - Other common fixes
- **TICKETING_CATEGORY_UPDATE.md** - Category changes

---

**Fix applied! Bot sekarang akan check permissions dan memberikan error message yang jelas sebelum mencoba create channel.** ✅

**Setelah memberikan permission "Manage Channels" ke bot, restart bot dan coba lagi!**
