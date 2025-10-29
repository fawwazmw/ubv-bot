import axios from "axios";

const ROLE_CACHE_MS = 5 * 60 * 1000; // 5 minutes
const MEMBERS_CACHE_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_PRESENCE_CACHE_MS = 60 * 1000; // 1 minute
const staffPresenceCache = new Map();
const roleListCache = new Map();
const roleMembersCache = new Map();

function getCacheEntry(cache, key, ttl) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttl) return null;
  return entry.value;
}

function setCacheEntry(cache, key, value) {
  cache.set(key, { value, timestamp: Date.now() });
}

async function fetchGroupRoles(groupId) {
  const cacheKey = String(groupId);
  const cached = getCacheEntry(roleListCache, cacheKey, ROLE_CACHE_MS);
  if (cached) return cached;

  const { data } = await axios.get(
    `https://groups.roblox.com/v1/groups/${groupId}/roles`,
    { timeout: 5000 }
  );
  const roles = Array.isArray(data?.roles) ? data.roles : [];
  setCacheEntry(roleListCache, cacheKey, roles);
  return roles;
}

async function fetchUsersForRole(groupId, roleId) {
  const cacheKey = `${groupId}:${roleId}`;
  const cached = getCacheEntry(roleMembersCache, cacheKey, MEMBERS_CACHE_MS);
  if (cached) return cached;

  let ids = [];
  let cursor = null;
  do {
    const url = new URL(
      `https://groups.roblox.com/v1/groups/${groupId}/roles/${roleId}/users`
    );
    url.searchParams.set("limit", "100");
    if (cursor) url.searchParams.set("cursor", cursor);
    const { data } = await axios.get(url.toString(), { timeout: 5000 });
    const batch = Array.isArray(data?.data) ? data.data : [];
    ids.push(...batch.map((u) => u.userId));
    cursor = data?.nextPageCursor;
  } while (cursor);

  setCacheEntry(roleMembersCache, cacheKey, ids);
  return ids;
}

async function fetchPresences(userIds) {
  if (!userIds.length) return [];
  const chunks = [];
  for (let i = 0; i < userIds.length; i += 100) {
    chunks.push(userIds.slice(i, i + 100));
  }

  const presences = [];
  for (const chunk of chunks) {
    const { data } = await axios.post(
      "https://presence.roblox.com/v1/presence/users",
      { userIds: chunk },
      { timeout: 5000, headers: { "Content-Type": "application/json" } }
    );
    if (Array.isArray(data?.userPresences)) {
      presences.push(...data.userPresences);
    }
  }
  return presences;
}

function filterInGamePresences(presences, ids, { universeId, placeId }) {
  if (!ids.length || !presences.length) return [];
  const idSet = new Set(ids.map((id) => Number(id)));
  const targetUniverse = Number(universeId) || null;
  const targetPlace = Number(placeId) || null;

  return presences.filter((p) => {
    if (p.userPresenceType !== 2) return false; // 2 = InGame
    if (!idSet.has(Number(p.userId))) return false;
    const universeMatches =
      targetUniverse && Number(p.universeId) === targetUniverse;
    const placeMatches = targetPlace && Number(p.placeId) === targetPlace;
    return universeMatches || placeMatches;
  });
}

export async function fetchGroupStaffPresence({
  groupId,
  ownerRoleName = "Owner",
  adminRoleName = "Admin",
  universeId,
  placeId,
  presenceCacheMs = DEFAULT_PRESENCE_CACHE_MS,
}) {
  if (!groupId) {
    throw new Error("groupId is required to fetch staff presence");
  }
  if (!universeId && !placeId) {
    throw new Error("universeId or placeId is required to filter presence");
  }

  const cacheKey = JSON.stringify({
    groupId: Number(groupId),
    ownerRoleName: ownerRoleName?.toLowerCase?.() || "owner",
    adminRoleName: adminRoleName?.toLowerCase?.() || "admin",
    universeId: Number(universeId) || null,
    placeId: Number(placeId) || null,
  });
  const cached = getCacheEntry(
    staffPresenceCache,
    cacheKey,
    presenceCacheMs
  );
  if (cached) return cached;

  const roles = await fetchGroupRoles(groupId);
  const ownerRoleId = roles.find(
    (r) => r.name?.toLowerCase() === ownerRoleName?.toLowerCase()
  )?.id;
  const adminRoleId = roles.find(
    (r) => r.name?.toLowerCase() === adminRoleName?.toLowerCase()
  )?.id;

  const ownerIds = ownerRoleId
    ? await fetchUsersForRole(groupId, ownerRoleId)
    : [];
  const adminIds = adminRoleId
    ? await fetchUsersForRole(groupId, adminRoleId)
    : [];

  const uniqueIds = [...new Set([...ownerIds, ...adminIds])];
  const presences = await fetchPresences(uniqueIds);

  const ownersInGame = filterInGamePresences(presences, ownerIds, {
    universeId,
    placeId,
  }).length;
  const adminsInGame = filterInGamePresences(presences, adminIds, {
    universeId,
    placeId,
  }).length;

  const result = {
    ownerIds,
    adminIds,
    ownersInGame,
    adminsInGame,
  };

  setCacheEntry(staffPresenceCache, cacheKey, result);
  return result;
}
