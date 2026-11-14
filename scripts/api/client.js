/**
 * Keep authenticated HTTP requests and guild selection on the same boundary.
 * An actor retains its origin guild so exports remain scoped when the world changes guilds.
 */
import { netherscrollsCampaignCache, netherscrollsCharacterSelectionRefreshes } from "./cache.js";
import {
  MODULE_ID,
  NETHERSCROLLS_GUILDS_ENDPOINT,
  NETHERSCROLLS_GUILD_CACHE_TTL_MS,
  NETHERSCROLLS_GUILD_SELECTION_ERRORS,
  SETTINGS,
} from "../core/constants.js";
import { getNetherscrollsApiKey } from "../core/settings.js";
import { toTrimmedStringOrNull } from "../core/utils.js";
import { resetNetherscrollsSourceNameCache } from "../data/sources.js";

const netherscrollsGuildCache = {
  apiKey: null,
  data: null,
  expiresAt: 0,
  pending: null,
};

// ---------------------------------------------------------------- guilds
//
// One API key works in every guild its account belongs to; every request except
// GET /foundry/guilds names its guild with x-guild-id (docs: Foundry and guilds cookbook).
// The world remembers one guild. Actors remember the guild they came from, so an
// export always returns to that guild even after the world switches guilds.

// A guild chosen on a client that cannot write world settings (a player) for this session.
let netherscrollsSessionGuild = null;

/** Reject malformed guild identifiers before they can enter request headers or saved actor flags. */
function normalizeNetherscrollsGuildId(value) {
  const id = toTrimmedStringOrNull(value);
  return id && /^[a-f\d]{24}$/i.test(id) ? id : "";
}

/** Retrieve selected guild id. */
function getNetherscrollsSelectedGuildId() {
  const stored = normalizeNetherscrollsGuildId(game?.settings?.get?.(MODULE_ID, SETTINGS.guildId));
  return normalizeNetherscrollsGuildId(netherscrollsSessionGuild?.id) || stored;
}

/** Retrieve selected guild name. */
function getNetherscrollsSelectedGuildName() {
  if (netherscrollsSessionGuild?.id) return netherscrollsSessionGuild.name ?? "";
  return toTrimmedStringOrNull(game?.settings?.get?.(MODULE_ID, SETTINGS.guildName)) ?? "";
}

/** Retrieve actor guild id. */
function getActorNetherscrollsGuildId(actor) {
  return normalizeNetherscrollsGuildId(actor?.flags?.netherscrolls?.guildId);
}

// `undefined` means "the world's guild"; an explicit "" sends no x-guild-id header.
function getNetherscrollsRequestGuildId(guildId = undefined) {
  if (guildId !== undefined && guildId !== null) return normalizeNetherscrollsGuildId(guildId);
  return getNetherscrollsSelectedGuildId();
}

/** Use an explicit empty guild for account-level endpoints; omitted guilds inherit the world selection. */
function buildNetherscrollsApiHeaders({
  apiKey = getNetherscrollsApiKey(),
  guildId = undefined,
  json = false,
} = {}) {
  const headers = { Accept: "application/json", "x-api-key": apiKey };
  const guild = getNetherscrollsRequestGuildId(guildId);
  if (guild) headers["x-guild-id"] = guild;
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

/** Scope caches by credentials and guild together because identifiers are not portable across guilds. */
function getNetherscrollsGuildScope(apiKey = getNetherscrollsApiKey(), guildId = undefined) {
  return `${apiKey}|${getNetherscrollsRequestGuildId(guildId)}`;
}

/** Normalize guild list. */
function normalizeNetherscrollsGuildList(body) {
  const data = body?.data && typeof body.data === "object" ? body.data : {};
  const guilds = (Array.isArray(data.guilds) ? data.guilds : [])
    .map(
      /** Transform each entry while normalize guild list. */ (guild) => {
        const id = normalizeNetherscrollsGuildId(guild?.id ?? guild?._id);
        if (!id) return null;
        const modules = guild?.modules && typeof guild.modules === "object" ? guild.modules : {};
        return {
          id,
          slug: toTrimmedStringOrNull(guild.slug) ?? "",
          name: toTrimmedStringOrNull(guild.name) ?? toTrimmedStringOrNull(guild.slug) ?? id,
          isDefault: guild.isDefault === true,
          modules: {
            library: modules.library !== false,
            campaigns: modules.campaigns !== false,
          },
          apikey: {
            import: guild?.apikey?.import === true,
            export: guild?.apikey?.export === true,
          },
        };
      }
    )
    .filter(Boolean);
  return {
    guildMode: data.guildMode === true,
    defaultGuildId: normalizeNetherscrollsGuildId(data.defaultGuildId),
    guilds,
  };
}

/** Share concurrent lookups and bound the lifetime of permission data; legacy servers may have no guild endpoint. */
async function fetchNetherscrollsGuilds({ force = false } = {}) {
  const apiKey = getNetherscrollsApiKey();
  if (!apiKey) throw new Error("Netherscrolls API Key is missing. Set it in Module Settings.");
  const now = Date.now();
  if (
    !force &&
    netherscrollsGuildCache.apiKey === apiKey &&
    netherscrollsGuildCache.data &&
    netherscrollsGuildCache.expiresAt > now
  ) {
    return netherscrollsGuildCache.data;
  }
  if (netherscrollsGuildCache.apiKey === apiKey && netherscrollsGuildCache.pending) {
    return netherscrollsGuildCache.pending;
  }

  const pending = /** Perform the callback while fetch guilds. */ (/** Perform the callback while fetch guilds. */ async () => {
    let data;
    try {
      data = normalizeNetherscrollsGuildList(
        await requestNetherscrollsJson(NETHERSCROLLS_GUILDS_ENDPOINT, {
          method: "GET",
          apiKey,
          guildId: "",
          cache: "no-store",
          operation: "Guild list",
        })
      );
    } catch (err) {
      // A server from before guilds has no such route; it needs no guild at all.
      if (err?.status !== 404) throw err;
      data = { guildMode: false, defaultGuildId: "", guilds: [] };
    }
    if (netherscrollsGuildCache.apiKey === apiKey) {
      netherscrollsGuildCache.data = data;
      netherscrollsGuildCache.expiresAt = Date.now() + NETHERSCROLLS_GUILD_CACHE_TTL_MS;
    }
    return data;
  })();
  netherscrollsGuildCache.apiKey = apiKey;
  netherscrollsGuildCache.pending = pending;
  try {
    return await pending;
  } finally {
    if (netherscrollsGuildCache.pending === pending) netherscrollsGuildCache.pending = null;
  }
}

/** Invalidate guild list. */
function invalidateNetherscrollsGuildList() {
  netherscrollsGuildCache.data = null;
  netherscrollsGuildCache.expiresAt = 0;
}

// What the key may do in a guild: its apikey.* rights combined with the guild's
// modules (campaigns covers characters, exports and images; library covers imports).
function getNetherscrollsGuildAccess(guild) {
  if (!guild) return { importCharacters: true, exportCharacters: true, importLibrary: true };
  return {
    importCharacters: guild.apikey.import && guild.modules.campaigns,
    exportCharacters: guild.apikey.export && guild.modules.campaigns,
    importLibrary: guild.apikey.import && guild.modules.library,
  };
}

/** Determine whether guild usable. */
function isNetherscrollsGuildUsable(guild) {
  const access = getNetherscrollsGuildAccess(guild);
  return access.importCharacters || access.exportCharacters || access.importLibrary;
}

/** Describe guild access. */
function describeNetherscrollsGuildAccess(guild) {
  if (!guild) return "";
  if (!guild.apikey.import && !guild.apikey.export) {
    return "No Foundry access: ask a guild admin for apikey.import / apikey.export";
  }
  const access = getNetherscrollsGuildAccess(guild);
  if (!isNetherscrollsGuildUsable(guild))
    return "Library and campaigns are turned off in this guild";
  const parts = [];
  if (access.importCharacters && access.exportCharacters) parts.push("Import and export");
  else if (access.importCharacters) parts.push("Import only");
  else if (access.exportCharacters) parts.push("Export only");
  else parts.push("Library only");
  if (!guild.modules.campaigns) parts.push("campaigns turned off");
  else if (!access.importLibrary)
    parts.push(guild.modules.library ? "no library import" : "library turned off");
  return parts.join(" · ");
}

/** Persist the world selection when permitted and retain a session selection when the client cannot save it. */
async function setNetherscrollsSelectedGuild(guild) {
  const id = normalizeNetherscrollsGuildId(guild?.id);
  const name = id ? (guild?.name ?? "") : "";
  const previous = getNetherscrollsSelectedGuildId();
  netherscrollsSessionGuild = null;
  let saved = false;
  if (game?.user?.isGM && typeof game?.settings?.set === "function") {
    try {
      await game.settings.set(MODULE_ID, SETTINGS.guildId, id);
      await game.settings.set(MODULE_ID, SETTINGS.guildName, name);
      saved = true;
    } catch (err) {
      console.warn(`${MODULE_ID} | Unable to save the Netherscrolls guild for this world.`, err);
    }
  }
  if (!saved) netherscrollsSessionGuild = { id, name };
  if (previous !== id) clearNetherscrollsGuildScopedCaches();
  return id ? guild : null;
}

// Validates the world's guild against GET /foundry/guilds. One guild is chosen
// automatically; several guilds without a valid choice return needsChoice.
async function resolveNetherscrollsGuild({ force = false, notify = true } = {}) {
  const list = await fetchNetherscrollsGuilds({ force });
  if (!list.guildMode) return { ...list, guild: null, needsChoice: false };

  const storedId = getNetherscrollsSelectedGuildId();
  const stored = list.guilds.find(
    /** Find the matching entry while resolve guild. */ (guild) => guild.id === storedId
  );
  if (stored) {
    // Keep the displayed name in sync when a super admin renames the guild.
    if (stored.name !== getNetherscrollsSelectedGuildName())
      await setNetherscrollsSelectedGuild(stored);
    return { ...list, guild: stored, needsChoice: false };
  }
  if (storedId) {
    const lostName = getNetherscrollsSelectedGuildName() || "the saved guild";
    if (notify)
      ui?.notifications?.warn?.(
        `Netherscrolls: you no longer have access to "${lostName}". Choose a guild.`
      );
    await setNetherscrollsSelectedGuild(null);
  }
  if (list.guilds.length === 1) {
    const guild = await setNetherscrollsSelectedGuild(list.guilds[0]);
    return { ...list, guild, needsChoice: false, autoSelected: true };
  }
  return { ...list, guild: null, needsChoice: list.guilds.length > 1 };
}

// The guild a request for this Actor must use: the guild it came from, else the
// world's guild. Throws when the account has several guilds and none is chosen.
async function resolveNetherscrollsActorGuildId(actor = null) {
  const tagged = getActorNetherscrollsGuildId(actor);
  if (tagged) return tagged;
  const state = await resolveNetherscrollsGuild({ notify: false });
  if (!state.guildMode) return "";
  if (state.guild) return state.guild.id;
  if (!state.guilds.length)
    throw new Error("This Netherscrolls account is not a member of any guild.");
  throw new Error("Choose your Netherscrolls guild first: open Netherscrolls import / export.");
}

/** Retrieve guild name. */
function getNetherscrollsGuildName(guildId) {
  const id = normalizeNetherscrollsGuildId(guildId);
  if (!id) return "";
  const known = netherscrollsGuildCache.data?.guilds?.find(
    /** Find the matching entry while retrieve guild name. */ (guild) => guild.id === id
  );
  if (known) return known.name;
  return id === getNetherscrollsSelectedGuildId() ? getNetherscrollsSelectedGuildName() : "";
}

/** Discard every guild-dependent lookup together so a new selection cannot reuse the previous guild's records. */
function clearNetherscrollsGuildScopedCaches() {
  netherscrollsCampaignCache.scope = null;
  netherscrollsCampaignCache.campaigns = null;
  netherscrollsCampaignCache.expiresAt = 0;
  netherscrollsCampaignCache.pending = null;
  resetNetherscrollsSourceNameCache(null);
  netherscrollsCharacterSelectionRefreshes.clear();
}

/** Reset guild state. */
function resetNetherscrollsGuildState() {
  netherscrollsGuildCache.apiKey = null;
  netherscrollsGuildCache.pending = null;
  invalidateNetherscrollsGuildList();
  netherscrollsSessionGuild = null;
  clearNetherscrollsGuildScopedCaches();
}

// Reacts to guild errors once, for every request (cookbook "module reaction table").
async function handleNetherscrollsGuildError(error, guildId) {
  const code = error?.code;
  if (!code) return;
  if (NETHERSCROLLS_GUILD_SELECTION_ERRORS.has(code)) {
    invalidateNetherscrollsGuildList();
    if (guildId && guildId === getNetherscrollsSelectedGuildId()) {
      const name = getNetherscrollsSelectedGuildName() || "the saved guild";
      await setNetherscrollsSelectedGuild(null);
      ui?.notifications?.warn?.(
        `Netherscrolls: "${name}" can no longer be used. Choose a guild again in Netherscrolls import / export.`
      );
    }
    return;
  }
  // Rights and modules are read per request; refresh what the window shows.
  if (code === "MODULE_DISABLED" || code === "FOUNDRY_API_PERMISSION_DENIED")
    invalidateNetherscrollsGuildList();
}

/** Retrieve library import date. */
function getNetherscrollsLibraryImportDate(guildId = getNetherscrollsSelectedGuildId()) {
  try {
    const dates = JSON.parse(game?.settings?.get?.(MODULE_ID, SETTINGS.libraryImportDates) || "{}");
    return toTrimmedStringOrNull(dates?.[guildId || "default"]);
  } catch (_err) {
    return null;
  }
}

/** Remember library import date. */
async function rememberNetherscrollsLibraryImportDate(guildId, isoDate) {
  if (!game?.user?.isGM || typeof game?.settings?.set !== "function") return;
  try {
    let dates = {};
    try {
      dates = JSON.parse(game.settings.get(MODULE_ID, SETTINGS.libraryImportDates) || "{}") ?? {};
    } catch (_err) {
      dates = {};
    }
    dates[guildId || "default"] = isoDate;
    await game.settings.set(MODULE_ID, SETTINGS.libraryImportDates, JSON.stringify(dates));
  } catch (err) {
    console.warn(`${MODULE_ID} | Unable to remember the library import date.`, err);
  }
}

/** Fetch api json. */
async function fetchNetherscrollsApiJson(url, apiKey, { guildId = undefined } = {}) {
  return requestNetherscrollsJson(url, { method: "GET", apiKey, guildId });
}

/** Keep headers, empty acknowledgements, and structured errors consistent for every JSON endpoint. */
async function requestNetherscrollsJson(
  url,
  {
    method = "GET",
    apiKey = getNetherscrollsApiKey(),
    guildId = undefined,
    body = null,
    operation = "Request",
    includeStatus = false,
    cache = null,
  } = {}
) {
  const requestGuildId = getNetherscrollsRequestGuildId(guildId);
  const response = await fetch(url, {
    method,
    ...(cache ? { cache } : {}),
    headers: buildNetherscrollsApiHeaders({ apiKey, guildId: requestGuildId, json: body != null }),
    ...(body == null ? {} : { body: JSON.stringify(body) }),
  });
  // 204 (queue acknowledgements and cancellations) has no JSON body.
  const data =
    response.status === 204
      ? null
      : await response
          .json()
          .catch(/** Handle the operation failure while handle request json. */ () => null);
  if (!response.ok) {
    throw await buildNetherscrollsApiError(response, data, operation, requestGuildId);
  }
  return includeStatus ? { data, status: response.status } : data;
}

/** Preserve server diagnostics and update invalid guild state before a workflow handles the failure. */
async function buildNetherscrollsApiError(response, data, operation, requestGuildId) {
  const message =
    data?.error?.message ??
    data?.message ??
    (typeof data?.error === "string" ? data.error : null) ??
    `${operation} failed (${response.status} ${response.statusText}).`;
  const error = new Error(formatNetherscrollsApiError({ ...data?.error, message }));
  error.status = response.status;
  error.code = data?.error?.code ?? data?.code ?? null;
  error.hint = data?.error?.hint ?? null;
  error.requestId = data?.error?.requestId ?? response.headers?.get?.("x-request-id") ?? null;
  error.details = data?.error?.details ?? null;
  error.module = data?.error?.module ?? null;
  error.guildName = data?.error?.guild?.name ?? getNetherscrollsGuildName(requestGuildId);
  error.guildId = requestGuildId;
  error.data = data;
  try {
    await handleNetherscrollsGuildError(error, requestGuildId);
  } catch (err) {
    console.warn(`${MODULE_ID} | Unable to process a guild error.`, err);
  }
  return error;
}

/** Format api error. */
function formatNetherscrollsApiError(error) {
  const details = error?.details;
  const document = details?.document;
  const documentLabel = [
    document?.type,
    document?.name ? `"${document.name}"` : null,
    document?.id ? `ID: ${document.id}` : null,
    document?.foundryId ? `Foundry ID: ${document.foundryId}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const fields = Array.isArray(details?.fields)
    ? details.fields
        .filter(
          /** Keep entries that satisfy the condition while format api error. */ (field) =>
            field?.path
        )
        .map(
          /** Transform each entry while format api error. */ (field) =>
            `${field.path}${field.kind ? ` (${field.kind})` : ""}`
        )
    : [];
  return [
    error?.message ?? "Foundry Export failed.",
    // Permission refusals explain, as text, which guild needs which apikey.* grant.
    typeof details === "string" ? details : null,
    documentLabel ? `Document: ${documentLabel}.` : null,
    details?.stage ? `Stage: ${details.stage}.` : null,
    fields.length ? `Invalid fields: ${fields.join(", ")}.` : null,
    error?.hint,
    error?.code ? `Code: ${error.code}.` : null,
    error?.requestId ? `Request ID: ${error.requestId}.` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

export {
  buildNetherscrollsApiError,
  buildNetherscrollsApiHeaders,
  clearNetherscrollsGuildScopedCaches,
  describeNetherscrollsGuildAccess,
  fetchNetherscrollsApiJson,
  formatNetherscrollsApiError,
  getActorNetherscrollsGuildId,
  getNetherscrollsGuildAccess,
  getNetherscrollsGuildName,
  getNetherscrollsGuildScope,
  getNetherscrollsLibraryImportDate,
  getNetherscrollsRequestGuildId,
  getNetherscrollsSelectedGuildId,
  getNetherscrollsSelectedGuildName,
  isNetherscrollsGuildUsable,
  normalizeNetherscrollsGuildId,
  rememberNetherscrollsLibraryImportDate,
  requestNetherscrollsJson,
  resetNetherscrollsGuildState,
  resolveNetherscrollsActorGuildId,
  resolveNetherscrollsGuild,
  setNetherscrollsSelectedGuild,
};
