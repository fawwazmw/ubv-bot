# Testing with Ngrok (Quick Fix for 502 Bad Gateway)

## Why Ngrok?

Your public endpoint `https://ubv-bot.fwzdev.site/api/server-status` returns 502 Bad Gateway. Ngrok provides a quick way to expose your local server (which works fine) to the internet for testing.

## Prerequisites

- Your bot server is running locally on `localhost:3000`
- You have PowerShell access

## Step 1: Install Ngrok

### Download

1. Go to https://ngrok.com/download
2. Download the Windows version (ZIP file)
3. Extract `ngrok.exe` to a folder (e.g., `C:\Tools\ngrok\`)

### Create Account (Free)

1. Sign up at https://dashboard.ngrok.com/signup
2. Copy your **authtoken** from https://dashboard.ngrok.com/get-started/your-authtoken

### Configure

Open PowerShell and run:

```powershell
cd C:\Tools\ngrok  # or wherever you extracted ngrok.exe
.\ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

## Step 2: Start Ngrok Tunnel

In PowerShell, run:

```powershell
.\ngrok http 3000
```

You'll see output like:

```
ngrok

Session Status                online
Account                       your-email@example.com
Version                       3.x.x
Region                        United States (us)
Latency                       20ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://a1b2c3d4.ngrok-free.app -> http://localhost:3000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**Copy the HTTPS URL** (e.g., `https://a1b2c3d4.ngrok-free.app`)

## Step 3: Update Your Configuration

### Bot .env File

Edit `c:\fwz.dev\ubv-bot\.env` and update:

```env
API_URL=https://a1b2c3d4.ngrok-free.app/api/server-status
```

(Replace `a1b2c3d4.ngrok-free.app` with your actual ngrok URL)

### Roblox Script

Edit `PushStatusOnChange.lua` in Roblox Studio:

```lua
local WEBHOOK_URL = "https://a1b2c3d4.ngrok-free.app/api/server-status"
local WEBHOOK_TOKEN = "inisecretkey" -- MUST match STATUS_API_SECRET in .env
```

## Step 4: Restart Bot and Test

1. **Restart your bot** (Ctrl+C in terminal, then `node index.js`)
2. **Test webhook from PowerShell**:

   ```powershell
   Invoke-WebRequest -Uri "https://a1b2c3d4.ngrok-free.app/api/server-status" -Method POST `
     -Headers @{"Content-Type"="application/json"; "x-webhook-token"="inisecretkey"} `
     -Body '{"id":"test-123","activePlayers":5,"maxPlayers":50,"admins":2,"owners":1,"degraded":false,"updatedAt":"2025-01-14T10:00:00Z"}'
   ```

   Expected output: `StatusCode: 200`

3. **Check bot logs** - should show:

   ```
   ✓ POST /api/server-status - Webhook received
   Token validated: true
   Payload keys: id, activePlayers, maxPlayers, admins, owners, degraded, updatedAt
   Saved status to disk: ...
   ```

4. **Check Discord** - bot should post new status message showing "1 Owner dan 2 Admin"

## Step 5: Test from Roblox Studio

1. Update `WEBHOOK_URL` in your Roblox script (see Step 3)
2. In Roblox Studio: **Play** → **Start** (server mode)
3. Check **Output** window for:
   ```
   [PushStatus] ✓ HTTP 200
   ```
4. Join/leave or wait for rank changes - bot should update Discord

## Ngrok Web Interface

Visit http://127.0.0.1:4040 in your browser to see:

- All HTTP requests to your tunnel
- Request/response details
- Useful for debugging webhook calls

## Limitations (Free Plan)

- Ngrok URL changes every time you restart ngrok
- Limited to 1 tunnel at a time
- Has rate limits (but should be fine for your use case)

## Next Steps

Once this works with ngrok:

1. You can keep using ngrok for development/testing
2. Or fix your Cloudflare Tunnel for a permanent solution:
   - Run `cloudflared tunnel list` to see existing tunnels
   - Run `cloudflared login` then recreate tunnel properly
   - Update DNS records in Cloudflare dashboard
   - Restart cloudflared service

## Troubleshooting

### "command not found" / ".\ngrok : not recognized"

- Ensure you're in the correct directory (`cd C:\Tools\ngrok`)
- Try full path: `C:\Tools\ngrok\ngrok.exe http 3000`

### "ERR_NGROK_108: Authentication failed"

- Run `.\ngrok config add-authtoken YOUR_TOKEN` with correct token from dashboard

### Bot still gets 502

- Make sure you updated `API_URL` in `.env` with your ngrok HTTPS URL
- Restart bot after changing `.env`
- Test GET manually: `Invoke-WebRequest -Uri "https://YOUR-NGROK-URL.ngrok-free.app/api/server-status"`

### Roblox gets 502

- Make sure you updated `WEBHOOK_URL` in Lua script
- Check ngrok web interface (http://127.0.0.1:4040) to see if request arrived
- Verify `x-webhook-token` header matches `STATUS_API_SECRET`
