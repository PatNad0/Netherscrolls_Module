/**
 * Fetch campaign characters and sync queues within an explicit guild scope.
 * Keep response normalization here so callers receive the same character identity shape.
 */
import { netherscrollsCampaignCache } from "./cache.js";
import { persistNetherscrollsImportQueueCampaignIds } from "./campaign-selection.js";
import {
  fetchNetherscrollsApiJson,
  getNetherscrollsGuildScope,
  getNetherscrollsRequestGuildId,
  requestNetherscrollsJson,
} from "./client.js";
import {
  MODULE_ID,
  NETHERSCROLLS_CAMPAIGNS_ENDPOINT,
  NETHERSCROLLS_CAMPAIGN_CACHE_TTL_MS,
} from "../core/constants.js";
import { getNetherscrollsApiKey } from "../core/settings.js";
import { getNetherscrollsApiRows, toTrimmedStringOrNull } from "../core/utils.js";
import { normalizeNetherscrollsReferenceValue } from "../data/references.js";

/** Reuse in-flight requests within one scope and remember an unambiguous campaign for queue polling. */
async function fetchNetherscrollsCampaigns({ force = false, guildId = undefined } = {}) {
  const apiKey = getNetherscrollsApiKey();
  if (!apiKey) throw new Error("Netherscrolls API Key is missing. Set it in Module Settings.");
  const requestGuildId = getNetherscrollsRequestGuildId(guildId);
  const scope = getNetherscrollsGuildScope(apiKey, requestGuildId);
  const now = Date.now();
  if (
    !force &&
    netherscrollsCampaignCache.scope === scope &&
    Array.isArray(netherscrollsCampaignCache.campaigns) &&
    netherscrollsCampaignCache.expiresAt > now
  ) {
    return netherscrollsCampaignCache.campaigns;
  }
  if (netherscrollsCampaignCache.scope === scope && netherscrollsCampaignCache.pending) {
    return netherscrollsCampaignCache.pending;
  }

  const pending = /** Perform the callback while fetch campaigns. */ (/** Perform the callback while fetch campaigns. */ async () => {
    const data = await fetchNetherscrollsApiJson(NETHERSCROLLS_CAMPAIGNS_ENDPOINT, apiKey, {
      guildId: requestGuildId,
    });
    const rows = getNetherscrollsApiRows(data);
    const campaigns = rows
      .filter(
        /** Keep entries that satisfy the condition while fetch campaigns. */ (campaign) =>
          campaign?.active !== false
      )
      .map(
        /** Transform each entry while fetch campaigns. */ (campaign) => {
          const id = normalizeNetherscrollsReferenceValue(
            campaign?._id ?? campaign?.id ?? campaign?.campaignId ?? campaign?.netherscrollsId
          );
          if (!id) return null;
          const name = toTrimmedStringOrNull(campaign?.name ?? campaign?.title) ?? id;
          const detail = toTrimmedStringOrNull(
            campaign?.system ?? campaign?.description ?? campaign?.code
          );
          return { id, label: detail ? `${name} — ${detail}` : name };
        }
      )
      .filter(Boolean)
      .sort(
        /** Order the entries while fetch campaigns. */ (a, b) => a.label.localeCompare(b.label)
      );
    if (netherscrollsCampaignCache.scope === scope) {
      netherscrollsCampaignCache.campaigns = campaigns;
      netherscrollsCampaignCache.expiresAt = Date.now() + NETHERSCROLLS_CAMPAIGN_CACHE_TTL_MS;
    }
    if (campaigns.length === 1) {
      await persistNetherscrollsImportQueueCampaignIds([campaigns[0].id], apiKey, requestGuildId);
    }
    return campaigns;
  })();
  netherscrollsCampaignCache.scope = scope;
  netherscrollsCampaignCache.pending = pending;
  try {
    return await pending;
  } finally {
    if (netherscrollsCampaignCache.pending === pending) {
      netherscrollsCampaignCache.pending = null;
    }
  }
}

/** Fetch campaign imports. */
async function fetchNetherscrollsCampaignImports(campaignId, { guildId = undefined } = {}) {
  const apiKey = getNetherscrollsApiKey();
  const requestGuildId = getNetherscrollsRequestGuildId(guildId);
  const endpoint = `${NETHERSCROLLS_CAMPAIGNS_ENDPOINT}/${encodeURIComponent(campaignId)}/imports`;
  const data = await requestNetherscrollsJson(endpoint, {
    method: "GET",
    apiKey,
    guildId: requestGuildId,
    cache: "no-store",
    operation: "Foundry Import queue read",
  });
  return getNetherscrollsApiRows(data)
    .map(
      /** Transform each entry while fetch campaign imports. */ (entry) =>
        normalizeNetherscrollsImportedCharacter(entry, { guildId: requestGuildId })
    )
    .filter(Boolean);
}

/** Fetch campaign exports. */
async function fetchNetherscrollsCampaignExports(campaignId, { guildId = undefined } = {}) {
  const apiKey = getNetherscrollsApiKey();
  const requestGuildId = getNetherscrollsRequestGuildId(guildId);
  const endpoint = `${NETHERSCROLLS_CAMPAIGNS_ENDPOINT}/${encodeURIComponent(campaignId)}/exports`;
  const data = await requestNetherscrollsJson(endpoint, {
    method: "GET",
    apiKey,
    guildId: requestGuildId,
    cache: "no-store",
    operation: "Foundry Export queue read",
  });
  return getNetherscrollsApiRows(data)
    .map(
      /** Transform each entry while fetch campaign exports. */ (entry) =>
        normalizeNetherscrollsImportedCharacter(entry, { guildId: requestGuildId })
    )
    .filter(Boolean);
}

/** Handle acknowledge campaign import. */
async function acknowledgeNetherscrollsCampaignImport(
  campaignId,
  characterId,
  { guildId = undefined } = {}
) {
  const endpoint = `${NETHERSCROLLS_CAMPAIGNS_ENDPOINT}/${encodeURIComponent(campaignId)}/imports/${encodeURIComponent(characterId)}`;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await requestNetherscrollsJson(endpoint, {
        method: "DELETE",
        apiKey: getNetherscrollsApiKey(),
        guildId,
        cache: "no-store",
        operation: "Foundry Import acknowledgement",
      });
      return;
    } catch (err) {
      const transient =
        !err?.status || err.status === 408 || err.status === 429 || err.status >= 500;
      if (attempt >= 2 || !transient) throw err;
      console.warn(`${MODULE_ID} | Retrying Foundry Import queue acknowledgement.`, {
        campaignId,
        characterId,
        error: err,
      });
    }
  }
}

/** Fetch campaign characters. */
async function fetchNetherscrollsCampaignCharacters(campaignId, { guildId = undefined } = {}) {
  const apiKey = getNetherscrollsApiKey();
  if (!apiKey) throw new Error("Netherscrolls API Key is missing. Set it in Module Settings.");
  const requestGuildId = getNetherscrollsRequestGuildId(guildId);
  const endpoint = `${NETHERSCROLLS_CAMPAIGNS_ENDPOINT}/${encodeURIComponent(campaignId)}/characters`;
  const data = await fetchNetherscrollsApiJson(endpoint, apiKey, { guildId: requestGuildId });
  return getNetherscrollsApiRows(data)
    .map(
      /** Transform each entry while fetch campaign characters. */ (entry) =>
        normalizeNetherscrollsImportedCharacter(entry, { guildId: requestGuildId })
    )
    .filter(Boolean);
}

// `guildId` records the guild the character was read from: its Actor is tagged
// with it, and its linked library records are resolved in that same guild.
function normalizeNetherscrollsImportedCharacter(entry, { guildId = undefined } = {}) {
  const character = entry?.character;
  const foundryActor = entry?.foundryActor;
  const id = normalizeNetherscrollsReferenceValue(
    character?._id ?? character?.id ?? foundryActor?.flags?.netherscrolls?.characterId
  );
  if (!id) return null;
  const name =
    toTrimmedStringOrNull(character?.name ?? entry?.name ?? foundryActor?.name) ??
    "Unnamed Character";
  return {
    id,
    name,
    character,
    foundryActor,
    spellcasting: entry?.spellcasting,
    // The character's companions, each with its converted NPC Actor (docs/api/10-foundry.md).
    // Absent from older API responses: then companions are left untouched.
    companions: Array.isArray(entry?.companions) ? entry.companions : undefined,
    companionFailures: Array.isArray(entry?.companionFailures) ? entry.companionFailures : [],
    raw: entry,
    guildId: getNetherscrollsRequestGuildId(guildId),
  };
}

export {
  acknowledgeNetherscrollsCampaignImport,
  fetchNetherscrollsCampaignCharacters,
  fetchNetherscrollsCampaignExports,
  fetchNetherscrollsCampaignImports,
  fetchNetherscrollsCampaigns,
  normalizeNetherscrollsImportedCharacter,
};
