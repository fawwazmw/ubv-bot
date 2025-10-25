# Quick Command Reference - UBV Bot Testing

## Local Development

### Start Bot
```powershell
cd c:\fwz.dev\ubv-bot
node index.js
```

### Test Local Status API (GET)
```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:3000/api/server-status"
```

### Test Local Webhook (POST)
```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:3000/api/server-status" -Method POST `
  -Headers @{"Content-Type"="application/json"; "x-webhook-token"="inisecretkey"} `
  -Body '{"id":"test-server-123","activePlayers":5,"maxPlayers":50,"admins":2,"owners":1,"region":"unknown","degraded":false,"updatedAt":"2025-01-14T10:00:00Z"}'
```

---

## Ngrok Setup (Quick Fix for 502)

### Install and Configure
```powershell
# Download from https://ngrok.com/download
# Extract to C:\Tools\ngrok\

cd C:\Tools\ngrok
.\ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

### Start Tunnel
```powershell
cd C:\Tools\ngrok
.\ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://a1b2c3d4.ngrok-free.app`)

### Update Bot Configuration
Edit `.env`:
```env
API_URL=https://a1b2c3d4.ngrok-free.app/api/server-status
```

### Update Roblox Script
Edit `PushStatusOnChange.lua`:
```lua
local WEBHOOK_URL = "https://a1b2c3d4.ngrok-free.app/api/server-status"
local WEBHOOK_TOKEN = "inisecretkey"
```

### Test Ngrok Webhook (POST)
```powershell
Invoke-WebRequest -Uri "https://YOUR-NGROK-URL.ngrok-free.app/api/server-status" -Method POST `
  -Headers @{"Content-Type"="application/json"; "x-webhook-token"="inisecretkey"} `
  -Body '{"id":"ngrok-test","activePlayers":10,"maxPlayers":50,"admins":3,"owners":1,"region":"unknown","degraded":false,"updatedAt":"2025-01-14T11:00:00Z"}'
```

Expected: `StatusCode: 200`

### View Ngrok Traffic
Open in browser: http://127.0.0.1:4040

---

## Cloudflare Tunnel (Permanent Solution)

### Check Existing Tunnels
```powershell
cloudflared tunnel list
```

### Stop Service
```powershell
sc.exe stop cloudflared
```

### Recreate Tunnel (if needed)
```powershell
cloudflared login
cloudflared tunnel create ubv-bot
cloudflared tunnel route dns ubv-bot ubv-bot.fwzdev.site
```

### Edit Config
Create/edit `C:\Users\YOUR_USERNAME\.cloudflared\config.yml`:
```yaml
tunnel: TUNNEL_ID_FROM_CREATE
credentials-file: C:\Users\YOUR_USERNAME\.cloudflared\TUNNEL_ID.json

ingress:
  - hostname: ubv-bot.fwzdev.site
    service: http://localhost:3000
  - service: http_status:404
```

### Install and Start Service
```powershell
cloudflared service uninstall
cloudflared service install
sc.exe start cloudflared
```

### Test Public URL
```powershell
Invoke-WebRequest -Uri "https://ubv-bot.fwzdev.site/api/server-status"
```

Expected: `StatusCode: 200`

---

## Roblox Studio Testing

### Enable HTTP Requests
1. Open game in Roblox Studio
2. **Home** → **Game Settings** (gear icon)
3. **Security** tab
4. ✅ Check **Allow HTTP Requests**
5. **Save**

### Deploy Script
1. Open **ServerScriptService** in Explorer
2. Create new **Script** (not LocalScript)
3. Copy contents from `c:\fwz.dev\ubv-bot\roblox-scripts\PushStatusOnChange.lua`
4. Update `WEBHOOK_URL` and `WEBHOOK_TOKEN` at top of script

### Test in Server Mode
1. **Play** dropdown → **Start** (or Play Solo in server mode)
2. Check **Output** window for:
   ```
   [PushStatus] Script loaded. Waiting for player events...
   [PushStatus] Initial state: players=1 admins=0 owners=0
   [PushStatus] ✓ HTTP 200
   ```

### Verify Bot Received Webhook
Check bot terminal for:
```
✓ POST /api/server-status - Webhook received
Token validated: true
Payload keys: id, activePlayers, maxPlayers, admins, owners, degraded, updatedAt
Saved status to disk: ...
```

### Verify Discord Update
Check your status channel for new message showing player/admin/owner counts

---

## Debugging Commands

### Check Bot Logs
Watch terminal output for:
- `✓ POST /api/server-status - Webhook received` (good)
- `⚠️ No pushed status available yet` (waiting for first push)
- `❌ Gagal memenuhi permintaan` (error)

### Check Persisted Status
```powershell
Get-Content c:\fwz.dev\ubv-bot\data\last_server_status.json
```

### Check Port Listening
```powershell
Test-NetConnection -ComputerName 127.0.0.1 -Port 3000
```

Expected: `TcpTestSucceeded : True`

### Check Cloudflared Service
```powershell
sc.exe query cloudflared
```

Expected: `STATE : 4 RUNNING`

### Check Cloudflared Logs
```powershell
Get-EventLog -LogName Application -Source cloudflared -Newest 20
```

---

## Common Errors and Fixes

### Error: 502 Bad Gateway
- **Cause**: Public endpoint unreachable
- **Fix**: Use ngrok OR fix Cloudflare Tunnel (see above)

### Error: 429 Too Many Requests
- **Cause**: Old code was polling Roblox API
- **Fix**: Already patched (restart bot to clear cache)
- **Verify**: Bot logs should show "Returning degraded placeholder" NOT "Gagal memenuhi permintaan status API: 429"

### Error: 401 Unauthorized (webhook POST)
- **Cause**: `WEBHOOK_TOKEN` mismatch
- **Fix**: Ensure Roblox script `WEBHOOK_TOKEN` matches bot `.env` `STATUS_API_SECRET`

### Error: "HTTP Requests are not enabled"
- **Cause**: Game Settings → Security → Allow HTTP Requests not checked
- **Fix**: Enable in Roblox Studio Game Settings

### Error: "RequestAsync failed (pcall)"
- **Cause**: Running in wrong mode (Client/Solo instead of Server)
- **Fix**: Use **Play → Start** (server mode)

---

## Environment Variables Quick Reference

```env
# Required
DISCORD_TOKEN=your-bot-token
CLIENT_ID=your-app-id
GUILD_ID=your-server-id
STATUS_CHANNEL_ID=your-channel-id
API_URL=https://your-public-url/api/server-status
STATUS_API_SECRET=inisecretkey

# Optional
STATUS_API_PORT=3000
UPDATE_INTERVAL_MS=300000
ROBLOX_UNIVERSE_ID=7765806968
ROBLOX_PROMO_MESSAGE=Join now!
BOT_BRAND=UBV Bot
BRAND_TAGLINE=/help
IMAGE_URL=https://your-image.png
```

---

## File Locations

- Bot: `c:\fwz.dev\ubv-bot\index.js`
- Webhook Server: `c:\fwz.dev\ubv-bot\statusApiServer.js`
- Roblox Script: `c:\fwz.dev\ubv-bot\roblox-scripts\PushStatusOnChange.lua`
- Config: `c:\fwz.dev\ubv-bot\.env`
- Persisted Status: `c:\fwz.dev\ubv-bot\data\last_server_status.json`
- Documentation:
  - `INTEGRATION_SUMMARY.md` - Complete overview
  - `TESTING_WITH_NGROK.md` - Ngrok setup guide
  - `roblox-scripts\README.md` - Roblox script setup
