# Quick Reference - UBV Bot

## 🚀 Quick Start Commands

### Start Bot
```bash
cd /home/fawwazmw/Documents/fwzdev/ubv-bot
node index.js
```

### Stop Bot
Press `Ctrl + C` in the terminal

---

## 📝 Environment Setup

### Required Environment Variables
Create `.env` file in project root:

```env
DISCORD_TOKEN=your-discord-bot-token
CLIENT_ID=your-discord-application-id
GUILD_ID=your-discord-server-id
```

### Optional Branding Variables
```env
BOT_BRAND=UBV Bot
BRAND_TAGLINE=/help
IMAGE_URL=https://example.com/banner.jpg
```

---

## 🎯 Available Discord Commands

### /help
- Displays help menu with all available commands
- Interactive dropdown menu for detailed information
- Usage: Simply type `/help` in Discord

### Birthday Commands
Check `/help` in Discord for full list of birthday-related commands

---

## 🔧 Development

### Install Dependencies
```bash
npm install
```

### Project Structure
```
ubv-bot/
├── index.js              # Main bot file
├── .env                  # Environment config
├── .env.example          # Template config
├── src/
│   ├── config/           # Configuration loader
│   ├── discord/          # Discord commands
│   ├── features/         # Bot features (birthdays, etc)
│   └── data/             # Data utilities
└── data/
    └── birthdays.json    # Birthday data
```

### Adding New Commands

1. Create command file in `src/discord/commands/newCommand.js`:
```javascript
export function createNewCommand({ config }) {
  return {
    definition: {
      name: "commandname",
      description: "Command description",
    },
    async execute(interaction) {
      await interaction.reply("Response");
    },
  };
}
```

2. Import and register in `src/discord/commandRegistry.js`:
```javascript
import { createNewCommand } from "./commands/newCommand.js";

export function buildCommandRegistry({ config }) {
  const commands = [
    createHelpCommand({ ... }),
    createNewCommand({ config }), // Add here
    ...createBirthdayCommands({ ... }),
  ];
  // ...
}
```

3. Restart bot

---

## 🐛 Debugging

### Check Bot Status
Expected console output when bot starts:
```
🤖 Logged in sebagai YourBot#1234
✅ Slash command terdaftar.
```

### Common Issues

#### Bot won't start
- Check `.env` file exists with correct values
- Verify `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID` are set
- Check Node.js version: `node --version` (requires v18+)

#### Commands not appearing in Discord
- Wait 1-2 minutes for Discord to sync
- Verify `GUILD_ID` matches your server
- Try restarting Discord client
- Check bot has been invited with `applications.commands` scope

#### Bot shows offline
- Verify `DISCORD_TOKEN` is valid (not regenerated)
- Check bot has `GUILDS` intent enabled in Discord Developer Portal
- Review console for error messages

---

## 📁 File Locations

| File | Path | Purpose |
|------|------|---------|
| Main Bot | `index.js` | Entry point |
| Config | `.env` | Environment variables |
| Config Template | `.env.example` | Example configuration |
| Birthday Data | `data/birthdays.json` | Birthday storage |
| Documentation | `INTEGRATION_SUMMARY.md` | Full documentation |

---

## 🔐 Security Notes

- Never commit `.env` to Git (already in `.gitignore`)
- Keep `DISCORD_TOKEN` private
- Regenerate token if accidentally exposed
- Use environment variables for all sensitive data

---

## 📋 Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DISCORD_TOKEN` | ✅ Yes | - | Bot token from Discord Developer Portal |
| `CLIENT_ID` | ✅ Yes | - | Application ID from Discord Developer Portal |
| `GUILD_ID` | ✅ Yes | - | Server ID (enable Developer Mode in Discord) |
| `BOT_BRAND` | ❌ No | `UBV Bot` | Bot display name |
| `BRAND_TAGLINE` | ❌ No | `/help` | Status message tagline |
| `IMAGE_URL` | ❌ No | `null` | Banner image URL for embeds |
| `DATA_DIR` | ❌ No | `./data` | Directory for data files |

---

## 🧪 Testing Checklist

### Initial Setup
- [ ] `.env` file created with required variables
- [ ] `npm install` completed successfully
- [ ] Bot invited to Discord server
- [ ] Bot has necessary permissions

### Bot Functionality
- [ ] Bot starts without errors
- [ ] Bot shows as online in Discord
- [ ] `/help` command works
- [ ] Help menu dropdown functions correctly
- [ ] Birthday commands accessible

---

## 📞 Getting Help

### Check Logs
Monitor console output for error messages and status updates

### Common Solutions
1. **Bot won't connect**: Check token and network
2. **Commands missing**: Wait for sync or restart Discord
3. **Permission errors**: Verify bot role permissions
4. **Data not saving**: Check `DATA_DIR` exists and is writable

---

## 📝 Quick Tips

- Use `/help` in Discord to see all available commands
- Bot automatically registers slash commands on startup
- Data files are created automatically in `./data/` directory
- Bot activity shows current tagline (default: "Listening to /help")
- Command changes require bot restart to take effect

---

## 🔄 Recent Changes

**Latest Update (2025-10-30)**
- Removed server status monitoring features
- Removed Roblox game integration
- Simplified to core Discord bot functionality
- Updated documentation to reflect current features
- Cleaned up unused dependencies

---

## 📌 Important Notes

- This bot is designed for guild (server) commands only
- Slash commands are registered per-guild (faster updates)
- Birthday data is stored locally in JSON format
- Bot requires Node.js v18 or higher
- Minimal dependencies for lightweight operation
