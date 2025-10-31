# UBV Bot - Documentation

## 📝 Overview

UBV Bot adalah Discord bot sederhana untuk Universitas Brawijaya Voice dengan fitur:

- **Help Command** - Panduan penggunaan bot
- **Birthday Commands** - Manajemen ulang tahun anggota

## ✨ Features

### 1. **Help Command**

- Command: `/help`
- Menampilkan daftar command yang tersedia
- Interactive menu dengan dropdown select
- Informasi detail setiap command

### 2. **Birthday Commands**

- Command untuk mengelola birthday anggota server
- Menyimpan data ulang tahun dalam file JSON
- Fitur tambah, hapus, dan lihat daftar ulang tahun

---

## 🔧 Configuration

### Environment Variables (`.env`)

```env
# Discord (Required)
DISCORD_TOKEN=your-discord-bot-token
CLIENT_ID=your-client-id
GUILD_ID=your-guild-id

# Branding (Optional)
BOT_BRAND=UBV Bot
BRAND_TAGLINE=Universitas Brawijaya Voice
IMAGE_URL=https://your-image-url.png
```

### Minimal Configuration

Untuk menjalankan bot, Anda hanya memerlukan 3 environment variables wajib:

1. `DISCORD_TOKEN` - Token bot Discord
2. `CLIENT_ID` - Application ID dari Discord Developer Portal
3. `GUILD_ID` - ID server Discord

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` menjadi `.env` dan isi nilai yang diperlukan:

```bash
cp .env.example .env
```

Edit `.env`:

```env
DISCORD_TOKEN=your-token-here
CLIENT_ID=your-client-id-here
GUILD_ID=your-guild-id-here
```

### 3. Run Bot

```bash
node index.js
```

Bot akan:

- Login ke Discord
- Register slash commands
- Menampilkan status "Listening to /help"
- Siap menerima commands

---

## 📁 Project Structure

```
ubv-bot/
├── index.js                          # Entry point
├── src/
│   ├── config/
│   │   └── env.js                    # Environment config loader
│   ├── discord/
│   │   ├── commandRegistry.js        # Command registry builder
│   │   ├── helpSelectHandler.js      # Help menu handler
│   │   └── commands/
│   │       └── helpCommand.js        # Help command implementation
│   ├── features/
│   │   └── birthdays/
│   │       └── birthdayCommands.js   # Birthday commands
│   └── data/
│       └── jsonStore.js              # JSON file utilities
├── data/
│   └── birthdays.json                # Birthday data (auto-created)
└── .env                              # Environment variables
```

---

## 🧪 Testing

### Test Bot Login

```bash
node index.js
```

Expected output:

```
🤖 Logged in sebagai YourBot#1234
✅ Slash command terdaftar.
```

### Test Commands in Discord

1. Type `/help` in your Discord server
2. Bot should respond with help menu
3. Test dropdown menu selections

---

## 🛠️ Development

### Adding New Commands

1. Create command file in `src/discord/commands/`:

```javascript
export function createMyCommand({ config }) {
  return {
    definition: {
      name: "mycommand",
      description: "My command description",
    },
    async execute(interaction) {
      await interaction.reply("Hello!");
    },
  };
}
```

2. Register in `src/discord/commandRegistry.js`:

```javascript
import { createMyCommand } from "./commands/myCommand.js";

export function buildCommandRegistry({ config }) {
  const commands = [
    createHelpCommand({ ... }),
    createMyCommand({ config }), // Add here
    ...createBirthdayCommands({ ... }),
  ];
  // ...
}
```

3. Restart bot - commands will auto-register

---

## 📋 Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DISCORD_TOKEN` | ✅ | - | Discord bot token |
| `CLIENT_ID` | ✅ | - | Discord application ID |
| `GUILD_ID` | ✅ | - | Discord server ID |
| `BOT_BRAND` | ❌ | `UBV Bot` | Bot display name |
| `BRAND_TAGLINE` | ❌ | `Universitas Brawijaya Voice` | Bot status tagline |
| `IMAGE_URL` | ❌ | `null` | Banner image URL |
| `DATA_DIR` | ❌ | `./data` | Data directory path |

---

## 🐛 Troubleshooting

### Bot not starting?

- Check `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID` are set correctly
- Verify bot has been invited to server with correct permissions
- Check Node.js version (requires v18+)

### Commands not showing?

- Wait a few minutes for Discord to sync commands
- Check `GUILD_ID` matches your server
- Restart Discord client

### Bot offline in Discord?

- Check bot token hasn't been regenerated
- Verify bot has `GUILDS` intent enabled in Developer Portal
- Check console for error messages

---

## 📝 Changelog

### Latest Update (2025-10-30)

- ✅ Removed server status features
- ✅ Removed Roblox integration
- ✅ Simplified to core Discord bot features only
- ✅ Cleaned up unused dependencies and code
- ✅ Updated documentation

---

## 📞 Support

For issues or questions:

- Check bot console logs for error messages
- Verify `.env` configuration is correct
- Check Discord bot permissions in server settings

---

## 📄 License

This is a private bot for Universitas Brawijaya Voice community.
