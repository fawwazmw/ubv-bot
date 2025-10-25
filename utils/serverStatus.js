import axios from "axios";
import { fetchRobloxServerStatus } from "./robloxServers.js";

function describeAxiosError(err) {
  const status = err?.response?.status;
  const code = err?.code;
  const detail =
    err?.response?.data?.errors?.[0]?.message ??
    err?.response?.data?.message ??
    err?.message;
  const parts = [];
  if (status) parts.push(`status ${status}`);
  if (code) parts.push(`code ${code}`);
  if (detail) parts.push(detail);
  return parts.length > 0 ? parts.join(" | ") : err?.message ?? "unknown error";
}

const DEFAULT_PROMO =
  "Ayo gabung dan sapa mereka — kamu bisa dapat 🎁 item spesial, dan 💡 bantuan langsung";

function normalizeStatusPayload(data, promoMessage) {
  return {
    id: data?.id != null ? String(data.id) : "unknown",
    activePlayers: Number(data?.activePlayers ?? 0),
    maxPlayers: Number(data?.maxPlayers ?? 0),
    region: data?.region ?? "—",
    // prefer explicit admins/owners fields; keep backwards compatibility by
    // treating anomalies as admins when admins is not provided.
    admins: Number(data?.admins ?? data?.anomalies ?? 0),
    owners: Number(data?.owners ?? 0),
    promo: data?.promo ?? promoMessage ?? DEFAULT_PROMO,
    degraded: Boolean(data?.degraded ?? false),
  };
}

function buildFallbackStatus(promoMessage) {
  return {
    id: "N/A",
    activePlayers: 0,
    maxPlayers: 0,
    region: "N/A",
    admins: 0,
    owners: 0,
    promo:
      promoMessage ?? "⚠️ Tidak dapat memuat data terbaru. Mencoba lagi...",
    degraded: true,
  };
}

export async function fetchServerStatus(
  apiUrl,
  { universeId, cacheMs, promoMessage } = {}
) {
  if (apiUrl) {
    try {
      const { data } = await axios.get(apiUrl, { timeout: 10000 });
      return normalizeStatusPayload(data, promoMessage);
    } catch (err) {
      // If the configured API_URL fails, do NOT fallback to polling the
      // Roblox Games API — that causes extra requests and rate-limits.
      // Treat the API failure as authoritative and return a fallback
      // status so callers (the bot) won't attempt to poll Roblox.
      console.error("❌ Gagal ambil data dari API:", describeAxiosError(err));
      return buildFallbackStatus(promoMessage);
    }
  }

  if (!universeId) {
    console.error(
      "❌ Tidak ada sumber status server. Set API_URL atau ROBLOX_UNIVERSE_ID."
    );
    return buildFallbackStatus(promoMessage);
  }

  try {
    return await fetchRobloxServerStatus(universeId, {
      cacheMs,
      promoMessage,
    });
  } catch (err) {
    console.error("❌ Gagal mengambil data Roblox:", describeAxiosError(err));
    return buildFallbackStatus(promoMessage);
  }
}
