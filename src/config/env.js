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
  requireEnv(env, ["DISCORD_TOKEN", "CLIENT_ID", "GUILD_ID"]);

  const dataDir = path.resolve(env.DATA_DIR ?? "./data");

  return {
    discord: {
      token: env.DISCORD_TOKEN,
      clientId: env.CLIENT_ID,
      guildId: env.GUILD_ID,
    },
    branding: {
      botName: env.BOT_BRAND ?? "UBV Bot",
      tagline: "Universitas Brawijaya Voice",
      imageUrl: env.IMAGE_URL ?? null,
    },
    paths: {
      dataDir,
      birthdays: path.join(dataDir, "birthdays.json"),
    },
  };
}

export const config = loadConfig();
