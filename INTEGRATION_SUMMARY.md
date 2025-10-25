# UBV Bot - Status API Integration Summary

## ✅ Changes Completed

### 1. **Replaced "anomalies" with "admins" and "owners" fields**

- Discord embed now shows: "X Owner dan Y Admin" or "X Admin" or "Tidak ada admin online"
- Payload structure:
  ```json
  {
    "id": "job-id",
    "activePlayers": 5,
    "maxPlayers": 50,
    "admins": 2, // rank 254
    "owners": 1, // rank 255
    "region": "unknown",
    "degraded": false,
    "updatedAt": "2025-01-14T10:00:00Z"
  }
  ```

### 2. **Real-time push-based updates** (instead of periodic polling)

- Roblox ServerScript sends HTTP POST to webhook whenever:
  - Player joins (PlayerAdded event)
  - Player leaves (PlayerRemoving event)
  - Admin/owner rank changes detected
- 1-second debounce to coalesce rapid events
- Change detection: only sends when `activePlayers`, `admins`, or `owners` change

### 3. **Webhook POST endpoint** (`/api/server-status`)

- Validates `x-webhook-token` header (must match `STATUS_API_SECRET`)
- Accepts payload with `admins`/`owners` (backwards compatible with `anomalies`)
- Persists to `./data/last_server_status.json` (survives bot restarts)
- Logs: token validation, payload keys, saved status

### 4. **GET endpoint returns last pushed status** (`/api/server-status`)

- Returns `lastPushedStatus` if webhook POST received
- Returns degraded "waiting for webhook" status if no push yet
- **NEVER calls Roblox API** (eliminates 429 rate limit errors)

### 5. **Discord embed always posts new messages** (no editing)

- Every status change creates a new Discord message
- Keeps history of all changes visible

### 6. **Eliminated Roblox API polling**

- `utils/serverStatus.js`: when `apiUrl` fails, returns fallback WITHOUT calling Roblox
- `statusApiServer.js`: GET endpoint never calls `fetchRobloxServerStatus`
- Result: **NO MORE 429 errors**

---

## 🔧 Configuration

### Bot Environment Variables (`.env`)

```env
# Discord
DISCORD_TOKEN=your-discord-bot-token
CLIENT_ID=your-client-id
GUILD_ID=your-guild-id
STATUS_CHANNEL_ID=your-status-channel-id

# Status API (push-based webhook)
API_URL=https://ubv-bot.fwzdev.site/api/server-status
STATUS_API_SECRET=inisecretkey
STATUS_API_PORT=3000

# Roblox (optional, only for fallback — NOT USED when webhook working)
ROBLOX_UNIVERSE_ID=7765806968
ROBLOX_PROMO_MESSAGE=Join sekarang!

# Bot branding
BOT_BRAND=UBV Bot
BRAND_TAGLINE=/help
IMAGE_URL=https://your-image-url.png

# Update interval (milliseconds)
UPDATE_INTERVAL_MS=300000
```

### Roblox ServerScript Configuration (`PushStatusOnChange.lua`)

```lua
local WEBHOOK_URL = "https://ubv-bot.fwzdev.site/api/server-status"
local WEBHOOK_TOKEN = "inisecretkey"  -- MUST match STATUS_API_SECRET
local GROUP_ID = 36057179
local ADMIN_RANK = 254
local OWNER_RANK = 255
```

---

## 🚨 Current Issue: 502 Bad Gateway

### Problem

- Public URL `https://ubv-bot.fwzdev.site/api/server-status` returns 502 Bad Gateway
- Local server works fine (`localhost:3000` responds correctly)
- Cloudflared service running but endpoint unreachable

### Root Cause

- Cloudflare Tunnel not properly configured/connected
- Manual `cloudflared tunnel run` fails: "Cannot determine default origin certificate path"
- Service may be using `--token` mode but credentials missing/stale

### Impact

- Roblox ServerScript cannot POST to webhook (gets 502)
- Bot cannot fetch status from API_URL (fails with 502)
- Bot shows degraded "waiting for webhook" status in Discord

---

## ✅ Quick Fix: Use Ngrok for Testing

See `TESTING_WITH_NGROK.md` for step-by-step instructions:

1. Download ngrok from https://ngrok.com/download
2. Configure authtoken: `ngrok config add-authtoken YOUR_TOKEN`
3. Start tunnel: `ngrok http 3000`
4. Copy HTTPS URL (e.g., `https://a1b2c3d4.ngrok-free.app`)
5. Update `.env`: `API_URL=https://a1b2c3d4.ngrok-free.app/api/server-status`
6. Update Roblox script: `WEBHOOK_URL = "https://a1b2c3d4.ngrok-free.app/api/server-status"`
7. Restart bot and test from Roblox Studio

### Test Webhook from PowerShell

```powershell
Invoke-WebRequest -Uri "https://a1b2c3d4.ngrok-free.app/api/server-status" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"; "x-webhook-token"="inisecretkey"} `
  -Body '{"id":"test-123","activePlayers":5,"maxPlayers":50,"admins":2,"owners":1,"degraded":false,"updatedAt":"2025-01-14T10:00:00Z"}'
```

Expected: `StatusCode: 200`

---

## 📁 File Changes

### Modified Files

- `index.js` - Changed embed to show admins/owners, always post new messages
- `statusApiServer.js` - Added webhook POST, persistence, removed Roblox polling from GET
- `utils/serverStatus.js` - Patched to never fallback to Roblox when API_URL configured
- `utils/robloxServers.js` - Added admins/owners fields to Roblox polling fallback (rarely used)

### New Files

- `roblox-scripts/PushStatusOnChange.lua` - Roblox ServerScript for push-based updates
- `roblox-scripts/README.md` - Setup instructions for Roblox script
- `TESTING_WITH_NGROK.md` - Quick ngrok setup guide
- `data/last_server_status.json` - Persisted last webhook payload (auto-created)

---

## 🧪 Testing Checklist

### Local Testing (with ngrok)

- [ ] Bot starts without errors
- [ ] Webhook POST from PowerShell returns 200
- [ ] Bot logs show "Token validated: true" and payload keys
- [ ] Discord channel shows degraded status before first push
- [ ] After POST, Discord shows new message with correct admins/owners counts
- [ ] Bot GET `/api/server-status` returns last pushed status
- [ ] File `./data/last_server_status.json` created with payload

### Roblox Studio Testing

- [ ] HTTP Requests enabled in Game Settings → Security
- [ ] `PushStatusOnChange.lua` placed in ServerScriptService
- [ ] `WEBHOOK_URL` and `WEBHOOK_TOKEN` updated in script
- [ ] Script logs `[PushStatus] Script loaded. Waiting for player events...`
- [ ] Join game → Output shows `[PushStatus] ✓ HTTP 200`
- [ ] Bot logs show webhook POST received
- [ ] Discord shows new message with updated player count
- [ ] Admin/owner joins → Discord shows correct rank count
- [ ] Leave game → Discord shows new message with decreased count

### Production (with fixed Cloudflare Tunnel)

- [ ] Public URL `https://ubv-bot.fwzdev.site/api/server-status` returns 200
- [ ] Roblox script POSTs successfully (HTTP 200 in Output)
- [ ] Bot receives webhook and updates Discord
- [ ] No 502 or 429 errors in bot logs

---

## 🔒 Security Notes

- Webhook token (`STATUS_API_SECRET`) acts as simple shared secret
- Consider adding HMAC signature verification for stronger security (optional)
- Keep token private (don't commit to Git)
- Use HTTPS only (ngrok/Cloudflare both provide HTTPS)

---

## 📝 Next Steps

1. **Fix 502 issue**: Either use ngrok (quick) or fix Cloudflare Tunnel (permanent)

   - Ngrok: See `TESTING_WITH_NGROK.md`
   - Cloudflare: Run `cloudflared tunnel list`, recreate tunnel, update DNS

2. **Test end-to-end**:

   - Verify webhook POST from PowerShell
   - Deploy Roblox script in ServerScriptService
   - Join game and verify Discord updates

3. **Monitor bot logs**:

   - Should show "Token validated: true" on webhook POST
   - Should show "Payload keys: id, activePlayers, ..." with all fields
   - Should show "Saved status to disk"
   - Should NOT show any 429 or 502 errors after fix

4. **Optimize if needed**:
   - Adjust `DEBOUNCE_SECONDS` in Roblox script if too many/few updates
   - Adjust `UPDATE_INTERVAL_MS` in bot .env (currently 5 minutes)
   - Add more detailed logging if troubleshooting needed

---

## 🐛 Troubleshooting

### Still seeing 429 errors?

- Restart bot completely (old cache may persist)
- Verify `API_URL` is set in `.env`
- Check bot logs for "Returning degraded placeholder" (means no Roblox calls)

### Still seeing 502 errors?

- Problem is infrastructure (tunnel), not code
- Use ngrok as workaround (see `TESTING_WITH_NGROK.md`)
- Or fix Cloudflare Tunnel:
  - `cloudflared service uninstall`
  - `cloudflared login`
  - `cloudflared tunnel create ubv-bot`
  - Update `config.yml` with tunnel credentials
  - `cloudflared service install`

### Webhook POST returns 401/403?

- Check `WEBHOOK_TOKEN` in Roblox script matches `STATUS_API_SECRET` in .env
- Check header name is `x-webhook-token` (lowercase, with dash)

### Discord not updating?

- Check `STATUS_CHANNEL_ID` is correct channel ID
- Bot must have permission to send messages in that channel
- Check bot logs for "Pesan status baru dikirim" (success)

### Roblox script not sending?

- Enable HTTP Requests in Game Settings → Security
- Check Output window for `[PushStatus]` logs
- Verify game running in Server mode (not Solo/Client)
- Test with `print(game.JobId)` to ensure server context

---

## 📞 Contact

For further issues, check:

- Bot logs (console output)
- Roblox Studio Output window
- Ngrok web interface (http://127.0.0.1:4040) for webhook debugging
- Discord channel for status messages

All critical files are in:

- `index.js` - Bot main file
- `statusApiServer.js` - Webhook server
- `roblox-scripts/PushStatusOnChange.lua` - Roblox push script
- `.env` - Configuration (DO NOT COMMIT TO GIT)
