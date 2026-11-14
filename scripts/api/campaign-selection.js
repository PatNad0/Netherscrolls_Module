/**
 * Remember the queue campaign for one API key and guild.
 * A fingerprint prevents a saved selection from being reused in a different scope.
 */
import { getNetherscrollsRequestGuildId } from "./client.js";
import { MODULE_ID, SETTINGS } from "../core/constants.js";
import { getNetherscrollsApiKey } from "../core/settings.js";
import { buildNetherscrollsStableId } from "../core/utils.js";
import { normalizeNetherscrollsReferenceValue } from "../data/references.js";

// The remembered queue campaign belongs to one key and one guild: campaign ids do
// not exist in another guild. Without a guild the fingerprint stays the key's own,
// which keeps campaigns remembered before guilds existed.
function getNetherscrollsQueueCampaignFingerprint(apiKey, guildId) {
  const guild = getNetherscrollsRequestGuildId(guildId);
  return buildNetherscrollsStableId(guild ? `${apiKey}|${guild}` : apiKey);
}

/** Retrieve persisted import queue campaign ids. */
function getPersistedNetherscrollsImportQueueCampaignIds(
  apiKey = getNetherscrollsApiKey(),
  guildId = undefined
) {
  if (!apiKey) return [];
  const raw = game?.settings?.get?.(MODULE_ID, SETTINGS.importQueueCampaignIds);
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const stored = JSON.parse(raw);
    if (stored?.apiKeyFingerprint !== getNetherscrollsQueueCampaignFingerprint(apiKey, guildId))
      return [];
    return Array.from(
      new Set(
        (Array.isArray(stored?.campaignIds) ? stored.campaignIds : [])
          .map(normalizeNetherscrollsReferenceValue)
          .filter(Boolean)
      )
    );
  } catch (_err) {
    return [];
  }
}

/** Bind saved campaigns to the current credentials and guild without persisting the raw API key. */
async function persistNetherscrollsImportQueueCampaignIds(
  campaignIds,
  apiKey = getNetherscrollsApiKey(),
  guildId = undefined
) {
  if (!apiKey || !game?.user?.isGM || typeof game?.settings?.set !== "function") return;
  const ids = Array.from(
    new Set(
      (Array.isArray(campaignIds) ? campaignIds : [])
        .map(normalizeNetherscrollsReferenceValue)
        .filter(Boolean)
    )
  );
  const value = JSON.stringify({
    apiKeyFingerprint: getNetherscrollsQueueCampaignFingerprint(apiKey, guildId),
    campaignIds: ids,
  });
  try {
    await game.settings.set(MODULE_ID, SETTINGS.importQueueCampaignIds, value);
  } catch (err) {
    console.warn(`${MODULE_ID} | Unable to remember Foundry Import queue campaign ids.`, err);
  }
}

/** Remember import queue campaign id. */
function rememberNetherscrollsImportQueueCampaignId(campaignId) {
  const id = normalizeNetherscrollsReferenceValue(campaignId);
  if (!id) return;
  persistNetherscrollsImportQueueCampaignIds([id]);
}

export {
  getPersistedNetherscrollsImportQueueCampaignIds,
  persistNetherscrollsImportQueueCampaignIds,
  rememberNetherscrollsImportQueueCampaignId,
};
