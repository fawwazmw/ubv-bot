import express from "express";
import fs from "fs-extra";
import path from "path";
import { readJsonSafe, writeJsonSafe } from "../data/jsonStore.js";

const DEFAULT_PORT = 3000;

export async function startStatusApiServer({
  universeId,
  port,
  promoMessage,
  secret,
  storagePath,
}) {
  const resolvedPort = Number.isFinite(port) ? port : DEFAULT_PORT;
  const filePath =
    storagePath ||
    path.resolve(process.cwd(), "./data/last_server_status.json");

  await fs.ensureDir(path.dirname(filePath));

  const state = {
    lastStatus: await readJsonSafe(filePath, null),
  };
  if (state.lastStatus) {
    console.log("ℹ️ Loaded last pushed status from disk.");
  }

  if (!universeId) {
    console.warn(
      "⚠️ ROBLOX_UNIVERSE_ID not configured. Status API will rely on webhook pushes only."
    );
  }

  const app = express();
  app.use(express.json());

  app.post("/api/server-status", (req, res) => {
    if (secret) {
      const token = (req.headers["x-webhook-token"] || "").toString();
      if (!token || token !== secret) {
        console.warn("[webhook] invalid webhook token");
        return res.status(401).json({ error: "invalid webhook token" });
      }
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
      console.warn("[webhook] missing required fields");
      return res
        .status(400)
        .json({ error: "payload must include id and activePlayers" });
    }

    state.lastStatus = {
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

    writeJsonSafe(filePath, state.lastStatus);

    console.log("[webhook] status updated", {
      id: state.lastStatus.id,
      activePlayers: state.lastStatus.activePlayers,
      admins: state.lastStatus.admins,
      owners: state.lastStatus.owners,
    });

    return res.json({ ok: true });
  });

  app.get("/api/server-status", (_req, res) => {
    if (state.lastStatus) {
      return res.json(state.lastStatus);
    }

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
