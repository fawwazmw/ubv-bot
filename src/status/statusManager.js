import { ChannelType, EmbedBuilder } from "discord.js";
import fs from "fs-extra";
import { readJsonSafe, writeJsonSafe } from "../data/jsonStore.js";
import { fetchServerStatus } from "../../utils/serverStatus.js";

export class StatusManager {
  constructor(config) {
    this.config = config;
    this.snapshotFile = config.paths.statusSnapshot;
  }

  async init() {
    await fs.ensureDir(this.config.paths.dataDir);
  }

  async resolveChannel(client) {
    const channel = await client.channels.fetch(
      this.config.discord.statusChannelId
    );
    if (!channel || channel.type !== ChannelType.GuildText) {
      throw new Error("STATUS_CHANNEL_ID must point to a text channel.");
    }
    return channel;
  }

  async refresh(channel, { force = false } = {}) {
    const status = await this.fetchStatus();
    const snapshot = this.normalizeSnapshot(status);
    const saved = await readJsonSafe(this.snapshotFile, {});

    if (!force && saved.lastSnapshot && !this.hasChanged(saved.lastSnapshot, snapshot)) {
      console.log("ℹ️ Status unchanged — skipping message update.");
      return null;
    }

    const embed = this.buildEmbed(status);
    const message = await channel.send({ embeds: [embed] });

    const payload = {
      messageId: message.id,
      lastSnapshot: snapshot,
      lastUpdateAt: new Date().toISOString(),
    };
    await writeJsonSafe(this.snapshotFile, payload);
    console.log("✅ Server status posted.");
    return message;
  }

  async fetchStatus() {
    const { status, roblox } = this.config;
    if (!roblox.playerInfoEnabled) {
      return this.buildDisabledStatus();
    }
    const groupPresence =
      roblox.groupId && roblox.groupId > 0
        ? {
            groupId: roblox.groupId,
            placeId: Number.isFinite(roblox.placeId) ? roblox.placeId : undefined,
            ownerRoleName: roblox.ownerRoleName,
            adminRoleName: roblox.adminRoleName,
            presenceCacheMs: roblox.presenceCacheMs,
            universeId: roblox.universeId ?? undefined,
          }
        : undefined;

    return fetchServerStatus(status.apiUrl, {
      universeId: roblox.universeId,
      cacheMs: status.cacheMs,
      promoMessage: status.promoMessage,
      groupPresence,
    });
  }

  buildDisabledStatus() {
    return {
      id: "Disabled",
      activePlayers: 0,
      maxPlayers: 0,
      region: "N/A",
      admins: 0,
      owners: 0,
      promo:
        this.config.status.promoMessage ||
        "ℹ️ Informasi pemain Roblox sedang dinonaktifkan sementara.",
      degraded: true,
    };
  }

  buildEmbed(status) {
    const players = `${status.activePlayers}/${status.maxPlayers}`;
    const ownersCount = Number(status.owners ?? 0);
    const adminsCount = Number(status.admins ?? 0);
    const hasPromo = Boolean(status.promo);

    const ownerLine =
      ownersCount > 0
        ? `👑 **${ownersCount} Owner${ownersCount > 1 ? "s" : ""} online**`
        : null;
    const adminLine =
      adminsCount > 0
        ? `✨ **${adminsCount} Admin${adminsCount > 1 ? "s" : ""} online**`
        : null;

    const statusLine = ownerLine ?? adminLine ?? "✅ Tidak ada admin online.";

    const descriptionParts = [statusLine];
    if (hasPromo) descriptionParts.push("", `💬 ${status.promo}`);
    if (this.config.branding.tagline) {
      descriptionParts.push("", this.config.branding.tagline);
    }

    const color = status.degraded ? 0xed4245 : 0x57f287;
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle("🦜 Status Server Terbaru")
      .addFields(
        { name: "🆔 Server ID", value: status.id, inline: false },
        { name: "👥 Pemain Aktif", value: players, inline: true },
        { name: "🌍 Region", value: status.region, inline: true }
      )
      .setDescription(descriptionParts.join("\n"))
      .setFooter({
        text: `${this.config.branding.botName} • 🔁 Auto Update`,
      })
      .setTimestamp(new Date());

    if (this.config.branding.imageUrl) {
      embed.setImage(this.config.branding.imageUrl);
    }
    return embed;
  }

  normalizeSnapshot(status) {
    return {
      id: status?.id ?? "N/A",
      activePlayers: Number(status?.activePlayers ?? 0),
      maxPlayers: Number(status?.maxPlayers ?? 0),
      admins: Number(status?.admins ?? 0),
      owners: Number(status?.owners ?? 0),
      region: status?.region ?? "",
      promo: status?.promo ?? "",
      degraded: Boolean(status?.degraded ?? false),
    };
  }

  hasChanged(prev, next) {
    if (!prev) return true;
    return Object.keys(next).some((key) => prev[key] !== next[key]);
  }
}
