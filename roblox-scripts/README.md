# Roblox Push Status Integration

## Overview

This folder contains the Roblox Lua script that pushes real-time server status to your Discord bot API.

## Files

- **PushStatusOnChange.lua** - Place in `ServerScriptService` of your Roblox game

## Setup Instructions

### 1. Enable HTTP Requests in Roblox Studio

1. Open your game in Roblox Studio
2. Go to **Home** → **Game Settings** (gear icon)
3. Navigate to **Security** tab
4. Check ✅ **Allow HTTP Requests**
5. Click **Save**

### 2. Configure the Script

Open `PushStatusOnChange.lua` and update these constants:

```lua
local WEBHOOK_URL = "https://ubv-bot.fwzdev.site/api/server-status" -- Your public HTTPS endpoint
local WEBHOOK_TOKEN = "123456" -- MUST match STATUS_API_SECRET in bot .env
local GROUP_ID = 36057179 -- Your Roblox group ID
local ADMIN_RANK = 254 -- Admin rank in your group
local OWNER_RANK = 255 -- Owner rank in your group
```

**IMPORTANT**:

- `WEBHOOK_URL` must be publicly accessible (use ngrok for testing or fix Cloudflare Tunnel)
- `WEBHOOK_TOKEN` must match the `STATUS_API_SECRET` environment variable in your bot

### 3. Deploy the Script

1. In Roblox Studio, open **ServerScriptService** in the Explorer
2. Create a new **Script** (not LocalScript or ModuleScript)
3. Copy the entire contents of `PushStatusOnChange.lua` into the script
4. Rename the script to "PushStatusOnChange" for clarity

### 4. Test in Server Mode

1. Click **Play** dropdown → **Start** (or use Play Solo in server mode)
2. Check the **Output** window for logs like:
   ```
   [PushStatus] Script loaded. Waiting for player events...
   [PushStatus] Initial state: players=1 admins=0 owners=0
   [PushStatus] ✓ HTTP 200
   ```

### 5. Verify Bot Response

- Check your Discord bot logs for webhook POST received
- Check your status channel for updated embed showing admin/owner counts

## Troubleshooting

### "HTTP Requests are not enabled for the current place"

- Solution: Enable HTTP Requests in Game Settings → Security

### "RequestAsync failed (pcall): HttpService is not allowed"

- Solution: Ensure you're testing in **Server** mode, not Solo (Client)

### "Server returned non-success: 502"

- Problem: Your public endpoint is unreachable
- Solution: Use **ngrok** for quick testing (see `../TESTING_WITH_NGROK.md`)
- Long-term: Fix Cloudflare Tunnel configuration

### "Server returned non-success: 401" or "403"

- Problem: `WEBHOOK_TOKEN` mismatch
- Solution: Ensure `WEBHOOK_TOKEN` in Lua script matches `STATUS_API_SECRET` in bot `.env`

### No initial status sent

- Expected behavior: Script only sends if players > 0 or staff present (avoids spam)
- Join the game yourself to trigger the first update

### Too many updates sent

- Script uses 1-second debounce to coalesce rapid join/leave events
- Change `DEBOUNCE_SECONDS` if needed

## How It Works

1. **Change Detection**: Tracks last sent `activePlayers`, `admins`, `owners`
2. **Debounce**: Waits 1 second after player event before checking if change is meaningful
3. **HTTP POST**: Sends JSON payload to your webhook endpoint with token header
4. **Retry Logic**: Up to 3 attempts with exponential backoff on failure
5. **Events**: `PlayerAdded`, `PlayerRemoving`, and initial state check

## Payload Structure

```json
{
  "id": "game-job-id",
  "activePlayers": 3,
  "maxPlayers": 50,
  "admins": 1,
  "owners": 0,
  "region": "unknown",
  "degraded": false,
  "updatedAt": "2025-01-14T10:30:00Z"
}
```

## Next Steps

After deploying this script:

1. Test locally first with ngrok (see `TESTING_WITH_NGROK.md`)
2. Once working, fix Cloudflare Tunnel for permanent solution
3. Monitor bot logs and Discord channel for updates
4. Join/leave game with admin/owner accounts to verify rank detection
