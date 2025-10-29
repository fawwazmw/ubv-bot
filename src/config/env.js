import path from "path";

function parseNumber(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "off"].includes(normalized)) return false;
  return fallback;
}

function requireEnv(env, keys) {
  const missing = keys.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}

export function loadConfig(env = process.env) {
  requireEnv(env, ["DISCORD_TOKEN", "CLIENT_ID", "GUILD_ID", "STATUS_CHANNEL_ID"]);

  const dataDir = path.resolve(env.DATA_DIR ?? "./data");

  const updateIntervalMs = parseNumber(env.UPDATE_INTERVAL_MS, 5 * 60 * 1000);
  const statusCacheMs = parseNumber(env.STATUS_CACHE_MS, 30_000);
  const robloxPresenceCacheMs = parseNumber(env.ROBLOX_PRESENCE_CACHE_MS, undefined);
  const statusApiPort = parseNumber(
    env.STATUS_API_PORT ?? env.PORT,
    3000
  );

  const robloxGroupId = parseNumber(env.ROBLOX_GROUP_ID, undefined);
  const robloxPlaceId = parseNumber(env.ROBLOX_PLACE_ID, undefined);
  const robloxPlayerInfoEnabled = parseBoolean(
    env.ROBLOX_PLAYER_INFO_ENABLED,
    false
  );

  return {
    discord: {
      token: env.DISCORD_TOKEN,
      clientId: env.CLIENT_ID,
      guildId: env.GUILD_ID,
      statusChannelId: env.STATUS_CHANNEL_ID,
    },
    branding: {
      botName: env.BOT_BRAND ?? "UBV Bot",
      tagline: env.BRAND_TAGLINE ?? "/help",
      imageUrl: env.IMAGE_URL ?? null,
    },
    status: {
      apiUrl: env.API_URL ?? null,
      updateIntervalMs,
      cacheMs: statusCacheMs,
      promoMessage: env.ROBLOX_PROMO_MESSAGE ?? null,
    },
    roblox: {
      universeId: env.ROBLOX_UNIVERSE_ID ?? null,
      groupId: Number.isFinite(robloxGroupId) ? robloxGroupId : null,
      placeId: Number.isFinite(robloxPlaceId) ? robloxPlaceId : null,
      ownerRoleName: env.ROBLOX_OWNER_ROLE_NAME || "Owner",
      adminRoleName: env.ROBLOX_ADMIN_ROLE_NAME || "Admin",
      presenceCacheMs: Number.isFinite(robloxPresenceCacheMs)
        ? robloxPresenceCacheMs
        : undefined,
      playerInfoEnabled: robloxPlayerInfoEnabled,
    },
    statusApi: {
      port: statusApiPort,
      secret: env.STATUS_API_SECRET || "",
    },
    paths: {
      dataDir,
      statusSnapshot: path.join(dataDir, "status.json"),
      birthdays: path.join(dataDir, "birthdays.json"),
      lastPushedStatus: path.join(dataDir, "last_server_status.json"),
    },
  };
}

export const config = loadConfig();
