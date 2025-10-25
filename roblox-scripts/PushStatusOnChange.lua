-- ServerScriptService/PushStatusOnChange.lua
-- Push server status (players, admins, owners) to bot API whenever meaningful change occurs.
-- SETUP:
--   1. Enable HTTP Requests: Game Settings → Security → Allow HTTP Requests = ON
--   2. Update WEBHOOK_URL and WEBHOOK_TOKEN below to match your bot's hosted API
--   3. Place this script in ServerScriptService
--   4. Run in server mode (Start or Play)

local WEBHOOK_URL = "https://ubv-bot.fwzdev.site/api/server-status" -- CHANGE TO YOUR PUBLIC HTTPS ENDPOINT
local WEBHOOK_TOKEN = "123456" -- MUST MATCH STATUS_API_SECRET on your bot server
local GROUP_ID = 36057179
local ADMIN_RANK = 254
local OWNER_RANK = 255

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

local DEBOUNCE_SECONDS = 1.0
local MAX_RETRIES = 2
local RETRY_BACKOFF = 0.5

-- Track last sent values to avoid duplicate posts
local lastActive = nil
local lastAdmins = nil
local lastOwners = nil
local pending = false

local function safeGetRank(player, groupId)
	local ok, rank = pcall(function() return player:GetRankInGroup(groupId) end)
	if ok and type(rank) == "number" then return rank end
	return 0
end

local function countAdminsOwners()
	local a, o = 0, 0
	local list = Players:GetPlayers()
	for _, p in ipairs(list) do
		local r = safeGetRank(p, GROUP_ID)
		if r == OWNER_RANK then
			o = o + 1
		elseif r == ADMIN_RANK then
			a = a + 1
		end
	end
	return a, o
end

local function buildPayload()
	local active = #Players:GetPlayers()
	local admins, owners = countAdminsOwners()
	return {
		id = tostring(game.JobId or game.PlaceId or "unknown"),
		activePlayers = active,
		maxPlayers = (Players.MaxPlayers and tonumber(Players.MaxPlayers)) or 0,
		admins = admins,
		owners = owners,
		region = "unknown",
		promo = nil,
		degraded = false,
		updatedAt = os.date("!%Y-%m-%dT%H:%M:%SZ")
	}
end

local function sendPayloadOnce(payload)
	if not WEBHOOK_URL or WEBHOOK_URL == "" then
		warn("[PushStatus] WEBHOOK_URL not configured.")
		return false, "no-webhook-url"
	end

	print("[PushStatus] Sending payload:", HttpService:JSONEncode(payload))

	local body = HttpService:JSONEncode(payload)
	local headers = {
		["Content-Type"] = "application/json",
		["x-webhook-token"] = WEBHOOK_TOKEN,
	}

	local ok, res = pcall(function()
		return HttpService:RequestAsync({
			Url = WEBHOOK_URL,
			Method = "POST",
			Headers = headers,
			Body = body,
			Timeout = 10
		})
	end)

	if not ok then
		warn("[PushStatus] RequestAsync failed (pcall):", res)
		return false, res
	end

	-- RequestAsync returns table like { Success = true/false, StatusCode = N, Body = "..."}
	if type(res) == "table" then
		print(string.format("[PushStatus] Response: StatusCode=%s Success=%s Body=%s",
			tostring(res.StatusCode), tostring(res.Success), tostring(res.Body)))
		if res.Success == false or (res.StatusCode and tonumber(res.StatusCode) >= 400) then
			warn(string.format("[PushStatus] Server returned non-success: %s %s", tostring(res.StatusCode), tostring(res.Body)))
			return false, res
		end
		-- success
		print(string.format("[PushStatus] ✓ HTTP %s", tostring(res.StatusCode)))
		return true, res
	end

	-- unexpected shape
	warn("[PushStatus] Unexpected response shape from RequestAsync:", tostring(res))
	return false, res
end

local function sendPayloadWithRetries(payload)
	local attempt = 0
	while attempt <= MAX_RETRIES do
		local ok, res = sendPayloadOnce(payload)
		if ok then return true, res end
		attempt = attempt + 1
		if attempt <= MAX_RETRIES then
			task.wait(RETRY_BACKOFF * attempt)
			print(string.format("[PushStatus] retrying send (attempt %d)...", attempt + 1))
		end
	end
	warn("[PushStatus] Max retries exceeded.")
	return false, "max-retries-exceeded"
end

-- Decide whether to send: only when one of the tracked fields changed
local function shouldSend(newActive, newAdmins, newOwners)
	-- if we never sent before, send only if activePlayers > 0 or staff present (avoid sending empty at start)
	if lastActive == nil and lastAdmins == nil and lastOwners == nil then
		return newActive > 0 or (newAdmins > 0 or newOwners > 0)
	end
	if newActive ~= lastActive then
		return true
	end
	if newAdmins ~= lastAdmins then
		return true
	end
	if newOwners ~= lastOwners then
		return true
	end
	return false
end

local function recordLast(newActive, newAdmins, newOwners)
	lastActive = newActive
	lastAdmins = newAdmins
	lastOwners = newOwners
end

-- schedule sending with debounce to coalesce rapid events
local function scheduleMaybeSend()
	if pending then return end
	pending = true
	task.spawn(function()
		task.wait(DEBOUNCE_SECONDS)
		pending = false
		local payload = buildPayload()
		local na, na2, no = payload.activePlayers, payload.admins, payload.owners
		if shouldSend(na, na2, no) then
			local ok, res = sendPayloadWithRetries(payload)
			if ok then
				recordLast(na, na2, no)
				print(string.format("[PushStatus] ✓ Pushed: players=%d admins=%d owners=%d", na, na2, no))
			else
				warn("[PushStatus] Failed to push status after retries:", res)
			end
		else
			print("[PushStatus] No meaningful change, skipping send.")
		end
	end)
end

-- Listeners
Players.PlayerAdded:Connect(function(player)
	print("[PushStatus] Player joined:", player.Name)
	scheduleMaybeSend()
end)

Players.PlayerRemoving:Connect(function(player)
	print("[PushStatus] Player leaving:", player.Name)
	scheduleMaybeSend()
end)

-- initial attempt: only send if there are players or staff already
task.spawn(function()
	task.wait(1)
	print("[PushStatus] Script started. Checking initial state...")
	local payload = buildPayload()
	local na, na2, no = payload.activePlayers, payload.admins, payload.owners
	print(string.format("[PushStatus] Initial state: players=%d admins=%d owners=%d", na, na2, no))
	if shouldSend(na, na2, no) then
		local ok, res = sendPayloadWithRetries(payload)
		if ok then
			recordLast(na, na2, no)
			print("[PushStatus] ✓ Initial status pushed.")
		else
			warn("[PushStatus] Failed to push initial status.")
		end
	else
		recordLast(na, na2, no)
		print("[PushStatus] Initial state recorded, no send needed (empty/unchanged).")
	end
end)

-- optional: notify server close once (best-effort)
if typeof(game.BindToClose) == "function" then
	game:BindToClose(function()
		print("[PushStatus] Server closing, sending degraded status...")
		local payload = buildPayload()
		payload.degraded = true
		pcall(function() sendPayloadWithRetries(payload) end)
	end)
end

print("[PushStatus] Script loaded. Waiting for player events...")
