import express from "express";
import fs from "fs-extra";
import path from "path";
import { fetchRobloxServerStatus } from "./utils/robloxServers.js";

// Simple in-memory store for the last pushed status (by webhook)
let lastPushedStatus = null;
const LAST_STATUS_FILE = path.resolve(
  process.cwd(),
  "./data/last_server_status.json"
);

// ensure data dir exists and attempt to load last persisted status
await fs.ensureDir(path.dirname(LAST_STATUS_FILE));
try {
  if (await fs.pathExists(LAST_STATUS_FILE)) {
    const raw = await fs.readJson(LAST_STATUS_FILE).catch(() => null);
    if (raw && typeof raw === "object") {
      lastPushedStatus = raw;
      console.log("ℹ️ Loaded last pushed status from disk.");
    }
  }
} catch (e) {
  console.warn("⚠️ Could not read last_server_status file:", e?.message ?? e);
}

const DEFAULT_PORT = 3000;
const DEFAULT_CACHE_MS = 30000;

export function startStatusApiServer({
  universeId,
  port,
  cacheMs,
  promoMessage,
}) {
  if (!universeId) {
    // If universeId is not provided, still start the HTTP API so push/webhook
    // mode can be used. The server will warn that polling fallback is disabled.
    console.warn(
      "⚠️ ROBLOX_UNIVERSE_ID tidak diset. Status API akan berjalan hanya untuk webhook (push) mode."
    );
  }

  const resolvedPort = Number.isFinite(port) ? port : DEFAULT_PORT;
  const resolvedCache = Number.isFinite(cacheMs) ? cacheMs : DEFAULT_CACHE_MS;

  const app = express();
  app.use(express.json()); // accept JSON bodies for webhook POSTs

  // POST webhook to allow Roblox Studio (or other trusted sources) push a server status.
  // Protect this endpoint by setting STATUS_API_SECRET in your environment and
  // sending it as the `x-webhook-token` header from the client.
  app.post("/api/server-status", (req, res) => {
    const secret = process.env.STATUS_API_SECRET || "";
    const token = (req.headers["x-webhook-token"] || "").toString();
    if (secret) {
      const valid = token && token === secret;
      console.log("[webhook] token present:", !!token, "valid:", valid);
      if (!valid) {
        console.warn("[webhook] invalid webhook token");
        return res.status(401).json({ error: "invalid webhook token" });
      }
    } else {
      // no secret configured on server
      console.log(
        "[webhook] no STATUS_API_SECRET configured; accepting unauthenticated pushes"
      );
    }

    const body = req.body;
    if (!body || typeof body !== "object") {
      console.warn("[webhook] invalid payload (not an object)");
      return res.status(400).json({ error: "invalid payload" });
    }

    if (
      typeof body.id === "undefined" ||
      typeof body.activePlayers === "undefined"
    ) {
      console.warn(
        "[webhook] missing required fields. Keys:",
        Object.keys(body)
      );
      return res
        .status(400)
        .json({ error: "payload must include id and activePlayers" });
    }

    // Debug: show which keys were included
    console.log("[webhook] received payload keys:", Object.keys(body));

    // Support new fields `admins` and `owners`. For backwards compatibility
    // treat `anomalies` as `admins` when `admins` is not provided by the client.
    lastPushedStatus = {
      id: String(body.id),
      activePlayers: Number(body.activePlayers) || 0,
      maxPlayers:
        typeof body.maxPlayers !== "undefined" ? Number(body.maxPlayers) : 0,
      region: body.region || body.locale || "unknown",
      admins: Number(body.admins ?? body.anomalies ?? 0),
      owners: Number(body.owners ?? 0),
      promo: body.promo || promoMessage || null,
      degraded: !!body.degraded,
      updatedAt: body.updatedAt || new Date().toISOString(),
    };

    // persist to disk to survive restarts
    fs.writeJson(LAST_STATUS_FILE, lastPushedStatus).catch((e) => {
      console.warn("⚠️ Failed to persist last pushed status:", e?.message ?? e);
    });

    console.log("[webhook] saved lastPushedStatus:", {
      id: lastPushedStatus.id,
      activePlayers: lastPushedStatus.activePlayers,
      admins: lastPushedStatus.admins,
      owners: lastPushedStatus.owners,
    });

    return res.json({ ok: true });
  });

  // GET returns last pushed status (if any), otherwise returns degraded "waiting" status.
  // We do NOT fallback to Roblox polling (unreliable, causes 429 rate limits).
  app.get("/api/server-status", async (_req, res) => {
    if (lastPushedStatus) {
      return res.json(lastPushedStatus);
    }

    // No pushed status yet—return degraded "waiting" status WITHOUT polling Roblox
    console.log(
      "⚠️ No pushed status available yet. Returning degraded placeholder."
    );
    return res.status(200).json({
      id: "N/A",
      activePlayers: 0,
      maxPlayers: 0,
      region: "N/A",
      admins: 0,
      owners: 0,
      promo:
        promoMessage ||
        "⚠️ No status available yet. Waiting for webhook push from game server.",
      degraded: true,
    });
  });

  const server = app.listen(resolvedPort, () => {
    console.log(`🌐 Status API aktif di port ${resolvedPort}`);
  });

  server.on("error", (err) => {
    console.error(
      "❌ Status API gagal dijalankan:",
      err?.message ?? "Unknown error"
    );
  });

  return server;
}
