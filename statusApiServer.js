import express from 'express';
import { fetchRobloxServerStatus } from './utils/robloxServers.js';

const DEFAULT_PORT = 3000;
const DEFAULT_CACHE_MS = 30000;

export function startStatusApiServer({
  universeId,
  port,
  cacheMs,
  promoMessage
}) {
  if (!universeId) {
    console.warn(
      '⚠️ ROBLOX_UNIVERSE_ID tidak diset. Status API tidak dijalankan.'
    );
    return;
  }

  const resolvedPort = Number.isFinite(port) ? port : DEFAULT_PORT;
  const resolvedCache = Number.isFinite(cacheMs) ? cacheMs : DEFAULT_CACHE_MS;

  const app = express();

  app.get('/api/server-status', async (_req, res) => {
    try {
      const status = await fetchRobloxServerStatus(universeId, {
        cacheMs: resolvedCache,
        promoMessage
      });
      res.json(status);
    } catch (err) {
      console.error('❌ Gagal memenuhi permintaan status API:', err.message);
      res.status(502).json({
        id: 'N/A',
        activePlayers: 0,
        maxPlayers: 0,
        region: 'N/A',
        anomalies: 0,
        promo: '⚠️ Tidak dapat memuat data terbaru. Coba beberapa saat lagi.',
        degraded: true
      });
    }
  });

  const server = app.listen(resolvedPort, () => {
    console.log(`🌐 Status API aktif di port ${resolvedPort}`);
  });

  server.on('error', (err) => {
    console.error(
      '❌ Status API gagal dijalankan:',
      err?.message ?? 'Unknown error'
    );
  });
}
