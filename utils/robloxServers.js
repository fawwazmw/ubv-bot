import axios from "axios";

const DEFAULT_CACHE_MS = 30000;
const DEFAULT_PROMO =
  "Server aktif! Yuk gabung sekarang dan ajak temanmu meramaikan kampus virtual.";

const cache = new Map();

function getCacheEntry(universeId) {
  return cache.get(String(universeId));
}

function setCacheEntry(universeId, value) {
  cache.set(String(universeId), {
    value,
    timestamp: Date.now(),
  });
}

function isCacheValid(entry, cacheMs) {
  if (!entry) return false;
  return Date.now() - entry.timestamp < cacheMs;
}

export async function fetchRobloxServerStatus(
  universeId,
  { cacheMs = DEFAULT_CACHE_MS, promoMessage } = {}
) {
  if (!universeId) {
    throw new Error("ROBLOX_UNIVERSE_ID belum dikonfigurasi.");
  }

  const cacheEntry = getCacheEntry(universeId);
  if (isCacheValid(cacheEntry, cacheMs)) {
    return cacheEntry.value;
  }

  const { data } = await axios.get(
    `https://games.roblox.com/v1/games/${universeId}/servers/Public`,
    {
      params: {
        sortOrder: "Asc",
        limit: 10,
      },
      timeout: 5000,
    }
  );

  const servers = Array.isArray(data?.data) ? data.data : [];
  const activeServer = servers.find((srv) => srv.playing > 0) ?? servers[0];

  const status = activeServer
    ? {
        id: activeServer.id ?? "Unknown-Server",
        activePlayers: Number(activeServer.playing ?? 0),
        maxPlayers: Number(activeServer.maxPlayers ?? 0),
        region: activeServer.region ?? "Global",
        admins: 0,
        owners: 0,
        promo: promoMessage ?? DEFAULT_PROMO,
        degraded: false,
      }
    : {
        id: "No-Server",
        activePlayers: 0,
        maxPlayers: 0,
        region: "Unknown",
        admins: 0,
        owners: 0,
        promo: "Belum ada server publik aktif saat ini.",
        degraded: true,
      };

  setCacheEntry(universeId, status);
  return status;
}
