/**
 * Coordinate actor and campaign exports, plus explicit actor reimports.
 * Resolve the actor's guild and references before submitting changes to the service.
 */
import {
  fetchNetherscrollsCampaignCharacters,
  fetchNetherscrollsCampaigns,
  normalizeNetherscrollsImportedCharacter,
} from "../api/campaigns.js";
import {
  fetchNetherscrollsApiJson,
  formatNetherscrollsApiError,
  getActorNetherscrollsGuildId,
  getNetherscrollsGuildName,
  getNetherscrollsRequestGuildId,
  requestNetherscrollsJson,
  resolveNetherscrollsActorGuildId,
} from "../api/client.js";
import {
  MODULE_ID,
  NETHERSCROLLS_CAMPAIGNS_ENDPOINT,
  NETHERSCROLLS_EXPORT_ENDPOINT,
} from "../core/constants.js";
import { getNetherscrollsApiKey, isDebugEnabled } from "../core/settings.js";
import {
  renderFoundryTransferPayload,
  toTrimmedStringOrNull,
  yieldNetherscrollsMainThread,
} from "../core/utils.js";
import { getActorCharacterId, normalizeNetherscrollsReferenceValue } from "../data/references.js";
import {
  applyNetherscrollsCompanionExportVersions,
  attachNetherscrollsCompanionExports,
} from "./companions.js";
import {
  buildNetherscrollsImageReadyFoundryExportPayload,
  collectNetherscrollsFoundryExportImageJobs,
  prepareNetherscrollsFoundryExportImages,
} from "./images.js";
import { buildFoundryExportPayload } from "./payload.js";
import { applyFoundryExportCanonicalIds } from "./repairs.js";
import { repairNetherscrollsActorClassFeatures } from "../foundry/class-features.js";
import { scheduleNetherscrollsActorSheetRender } from "../foundry/documents.js";
import {
  findOrCreateNetherscrollsCharacterFolder,
  hydrateNetherscrollsImportedCharacter,
  importNetherscrollsCampaignCharacter,
} from "../import/character.js";

/** Export actor to. */
async function exportActorToNetherscrolls(actor) {
  if (!actor) return;
  const actorName = toTrimmedStringOrNull(actor.name) ?? "your character";
  if (!getNetherscrollsApiKey()) {
    ui?.notifications?.warn?.("Netherscrolls API Key is missing. Set it in Module Settings.");
    return;
  }
  // An Actor always returns to the guild it came from.
  let guildId;
  try {
    guildId = await resolveNetherscrollsActorGuildId(actor);
  } catch (err) {
    ui?.notifications?.warn?.(`Foundry Export: ${err?.message ?? err}`);
    throw err;
  }
  const guildName = getNetherscrollsGuildName(guildId);
  ui?.notifications?.info?.(
    `Sending ${actorName} through the Netherscrolls${guildName ? ` (${guildName})` : ""}...`
  );
  try {
    const repairResult = await repairNetherscrollsActorClassFeatures(actor, { notify: false });
    if (repairResult.created > 0) {
      ui?.notifications?.info?.(
        `Netherscrolls added ${repairResult.created} missing class feature${repairResult.created === 1 ? "" : "s"}.`
      );
    }
  } catch (err) {
    console.warn(`${MODULE_ID} | Unable to repair class features before Foundry Export.`, err);
  }

  await yieldNetherscrollsMainThread();
  const exportPayload = buildFoundryExportPayload(actor);
  await yieldNetherscrollsMainThread();
  const imageJobs = collectNetherscrollsFoundryExportImageJobs(exportPayload);
  if (imageJobs.length) {
    ui?.notifications?.info?.(
      `${actorName}: ${imageJobs.length} image${imageJobs.length === 1 ? "" : "s"} to move to Netherscrolls.`
    );
  } else {
    ui?.notifications?.info?.(
      `${actorName}'s artwork is already ready. Sending the character sheet...`
    );
  }

  let preparedImageCount = 0;
  let payload;
  try {
    payload = await prepareNetherscrollsFoundryExportImages(actor, exportPayload, {
      guildId,
      onImageProgress: /** Handle image progress. */ ({ label }) => {
        preparedImageCount += 1;
        ui?.notifications?.info?.(
          `${actorName}: moving image ${preparedImageCount} of ${imageJobs.length} (${label})...`
        );
      },
    });
    if (imageJobs.length) {
      ui?.notifications?.info?.(`${actorName}'s artwork is ready. Sending the character sheet...`);
    }
  } catch (err) {
    console.error(`${MODULE_ID} | Foundry Export could not prepare its images.`, err);
    ui?.notifications?.error?.(
      `Foundry Export could not prepare its images: ${err?.message ?? err}`
    );
    throw err;
  }
  if (isDebugEnabled()) {
    try {
      const content = renderFoundryTransferPayload(payload);
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content,
      });
    } catch (err) {
      console.warn(`${MODULE_ID} | Unable to post Foundry Export debug payload.`, err);
    }
  }
  return sendFoundryActorExport(actor, payload, { guildId });
}

/** Import actor from. */
async function importActorFromNetherscrolls(actor) {
  const characterId = getActorCharacterId(actor);
  if (!characterId) {
    ui?.notifications?.warn?.("This Actor is not linked to a Netherscrolls character.");
    return null;
  }
  if (!getNetherscrollsApiKey()) {
    ui?.notifications?.warn?.("Netherscrolls API Key is missing. Set it in Module Settings.");
    return null;
  }

  try {
    ui?.notifications?.info?.(`Foundry Import: locating ${actor.name ?? "character"}...`);
    // The character lives in the guild the Actor came from.
    const guildId = await resolveNetherscrollsActorGuildId(actor);
    const resolved = await findNetherscrollsCampaignCharacterById(characterId, {
      guildId,
      campaignId:
        actor?.flags?.[MODULE_ID]?.nativeCharacter?.campaignId ??
        actor?.flags?.netherscrolls?.campaignId,
    });
    const importedCharacter = await hydrateNetherscrollsImportedCharacter(
      resolved.character,
      resolved.campaignId
    );
    const folder = await findOrCreateNetherscrollsCharacterFolder();
    if (!folder?.id) throw new Error("Foundry could not create the NS-Character Actor folder.");
    const result = await importNetherscrollsCampaignCharacter(importedCharacter, folder, {
      onProgress: /** Handle progress. */ (stage) =>
        console.info(`${MODULE_ID} | Foundry Import | ${actor.name ?? "Character"} — ${stage}`),
    });
    ui?.notifications?.info?.(
      `Foundry Import succeeded: ${importedCharacter.name ?? actor.name ?? "character"}`
    );
    return result;
  } catch (err) {
    console.error(`${MODULE_ID} | Foundry Import failed.`, err);
    ui?.notifications?.error?.(`Foundry Import failed: ${err?.message ?? err}`);
    throw err;
  }
}

/** Find campaign character by id. */
async function findNetherscrollsCampaignCharacterById(
  characterId,
  { guildId = undefined, campaignId = null } = {}
) {
  const canonicalCharacterId = normalizeNetherscrollsReferenceValue(characterId);
  if (!canonicalCharacterId)
    throw new Error("A Netherscrolls character id is required for Foundry Import.");
  const requestGuildId = getNetherscrollsRequestGuildId(guildId);

  // The character's own campaign answers with one request; fall back to a search
  // when it moved or the stored campaign is unknown.
  const knownCampaignId = normalizeNetherscrollsReferenceValue(campaignId);
  if (knownCampaignId) {
    try {
      const endpoint = `${NETHERSCROLLS_CAMPAIGNS_ENDPOINT}/${encodeURIComponent(knownCampaignId)}/characters/${encodeURIComponent(canonicalCharacterId)}`;
      const data = await fetchNetherscrollsApiJson(endpoint, getNetherscrollsApiKey(), {
        guildId: requestGuildId,
      });
      const character = normalizeNetherscrollsImportedCharacter(data?.data ?? data, {
        guildId: requestGuildId,
      });
      if (character?.id === canonicalCharacterId) return { campaignId: knownCampaignId, character };
    } catch (err) {
      if (err?.status !== 404 && err?.status !== 403) throw err;
    }
  }

  const campaigns = await fetchNetherscrollsCampaigns({ guildId: requestGuildId });
  for (const campaign of campaigns) {
    if (campaign.id === knownCampaignId) continue;
    const characters = await fetchNetherscrollsCampaignCharacters(campaign.id, {
      guildId: requestGuildId,
    });
    const character = characters.find(
      /** Find the matching entry while find campaign character by id. */ (entry) =>
        entry.id === canonicalCharacterId
    );
    if (character) return { campaignId: campaign.id, character };
  }
  const guildName = getNetherscrollsGuildName(requestGuildId);
  throw new Error(
    `The linked Netherscrolls character is not available in any campaign you manage${guildName ? ` in ${guildName}` : ""}.`
  );
}

/** Report export warnings. */
function reportNetherscrollsExportWarnings(actor, response) {
  const warnings = Array.isArray(response?.warnings) ? response.warnings : [];
  if (!response?.partial && !warnings.length) return false;
  const name = actor?.name ?? "Character";
  ui?.notifications?.warn?.(
    `${name} saved to Netherscrolls with warnings. Review the affected documents before retrying.`
  );
  for (const warning of warnings) {
    const message = formatNetherscrollsApiError({
      ...warning,
      details: { ...warning.details, document: warning.document ?? warning.details?.document },
    });
    ui?.notifications?.warn?.(message);
    console.warn(`${MODULE_ID} | ${name}: partial Foundry Export`, warning);
  }
  return true;
}

/** Record the companions' new versions; a failure here must not undo a saved export. */
async function applyNetherscrollsCompanionVersionsSafely(actor, response, guildId) {
  try {
    await applyNetherscrollsCompanionExportVersions(response, { guildId });
  } catch (err) {
    console.warn(
      `${MODULE_ID} | ${actor?.name ?? "Character"}: companion versions could not be stored. Import the character before its next export.`,
      err
    );
  }
}

/** Submit the prepared payload and apply canonical identities only after the service accepts the export. */
async function sendFoundryActorExport(actor, payload = null, { guildId = undefined } = {}) {
  const apiKey = getNetherscrollsApiKey();
  if (!apiKey) {
    ui?.notifications?.warn?.("Netherscrolls API Key is missing. Set it in Module Settings.");
    throw new Error("Netherscrolls API Key is missing.");
  }

  try {
    if (guildId === undefined) guildId = await resolveNetherscrollsActorGuildId(actor);
    if (!payload)
      payload = await buildNetherscrollsImageReadyFoundryExportPayload(actor, { guildId });
    attachNetherscrollsCompanionExports(payload, actor, { guildId });
    await yieldNetherscrollsMainThread();
    const data = await requestNetherscrollsJson(NETHERSCROLLS_EXPORT_ENDPOINT, {
      method: "POST",
      apiKey,
      guildId,
      body: payload,
      operation: "Foundry Export",
    });

    if (data && isDebugEnabled()) {
      const responseContent = renderFoundryTransferPayload(data);
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: responseContent,
      });
    }
    // A linked Actor is expected to match by id; anything else means the guild found
    // the character by its Foundry id or name, which is worth a look (cookbook).
    if (getActorCharacterId(actor) && data?.data?.matchedBy && data.data.matchedBy !== "id") {
      ui?.notifications?.warn?.(
        `${actor?.name ?? "Character"} matched by ${data.data.matchedBy}, not by id. Check that it went to the right guild.`
      );
    }
    await applyFoundryExportCanonicalIds(actor, data, { guildId });
    await applyNetherscrollsCompanionVersionsSafely(actor, data, guildId);
    scheduleNetherscrollsActorSheetRender(actor);
    const name = data?.data?.name ?? actor?.name ?? "actor";
    if (!reportNetherscrollsExportWarnings(actor, data)) {
      ui?.notifications?.info?.(`${name} has arrived safely in Netherscrolls!`);
    }
    return data;
  } catch (err) {
    console.error(`${MODULE_ID} | Foundry Export failed.`, err);
    ui?.notifications?.error?.(`Foundry Export failed: ${err?.message ?? err}`);
    throw err;
  }
}

// A campaign belongs to one guild, so a batch is sent to that guild only.
/** Track batch progress per actor and retry only failed exports when requested. */
async function exportNetherscrollsCampaignActors(
  campaignId,
  actors,
  { retryFailedOnce = true, guildId = undefined } = {}
) {
  const canonicalCampaignId = normalizeNetherscrollsReferenceValue(campaignId);
  if (!canonicalCampaignId)
    throw new Error("A Netherscrolls campaign id is required for batch Foundry Export.");
  const apiKey = getNetherscrollsApiKey();
  if (!apiKey) throw new Error("Netherscrolls API Key is missing. Set it in Module Settings.");
  const requestGuildId = getNetherscrollsRequestGuildId(guildId);
  const nonRetryableFailures = [];

  let pending = Array.from(actors ?? [])
    .map(
      /** Transform each entry while export campaign actors. */ (candidate, originalIndex) => {
        const descriptor = candidate?.type === "character" ? { actor: candidate } : candidate;
        const actor = descriptor?.actor;
        if (actor?.type !== "character") return null;
        const characterId = normalizeNetherscrollsReferenceValue(descriptor?.characterId);
        const linkedId = getActorCharacterId(actor);
        if (characterId && linkedId && characterId !== linkedId) {
          throw new Error(
            `${actor.name}: this Actor is already linked to another Netherscrolls character.`
          );
        }
        // An Actor from another guild must never be written into this guild.
        const actorGuildId = getActorNetherscrollsGuildId(actor);
        if (requestGuildId && actorGuildId && actorGuildId !== requestGuildId) {
          const actorGuildName = getNetherscrollsGuildName(actorGuildId) || "another guild";
          nonRetryableFailures.push({
            actor,
            originalIndex,
            characterId,
            error: {
              code: "NETHERSCROLLS_ACTOR_OTHER_GUILD",
              message: `${actor.name} belongs to ${actorGuildName}; switch to that guild to send it.`,
            },
          });
          return null;
        }
        return {
          actor,
          originalIndex,
          characterId,
          syncToken: normalizeNetherscrollsReferenceValue(descriptor?.syncToken),
        };
      }
    )
    .filter(Boolean);
  if (!pending.length && !nonRetryableFailures.length)
    throw new Error("No Foundry character Actors were selected for Export.");
  if (pending.length > 100)
    throw new Error("Foundry Export supports at most 100 characters per campaign batch.");

  const succeeded = [];
  let failed = [];
  const imageUploadCache = new Map();
  const maximumAttempts = retryFailedOnce ? 2 : 1;
  for (let attempt = 1; attempt <= maximumAttempts && pending.length; attempt += 1) {
    const endpoint = `${NETHERSCROLLS_CAMPAIGNS_ENDPOINT}/${encodeURIComponent(canonicalCampaignId)}/characters/export`;
    const characters = [];
    for (const entry of pending) {
      entry.payload ??= await buildNetherscrollsImageReadyFoundryExportPayload(entry.actor, {
        apiKey,
        guildId: requestGuildId,
        cache: imageUploadCache,
      });
      if (entry.syncToken) entry.payload.syncToken = entry.syncToken;
      // Target the selected campaign character without persisting a local
      // link until the API has confirmed a successful export.
      if (entry.characterId) entry.payload.characterId = entry.characterId;
      attachNetherscrollsCompanionExports(entry.payload, entry.actor, { guildId: requestGuildId });
      characters.push(entry.payload);
      await yieldNetherscrollsMainThread();
    }
    const requestPayload = { characters };
    await yieldNetherscrollsMainThread();
    const { data: responseBody, status } = await requestNetherscrollsJson(endpoint, {
      method: "POST",
      apiKey,
      guildId: requestGuildId,
      body: requestPayload,
      operation: "Campaign Foundry Export",
      includeStatus: true,
    });
    if (status !== 200 && status !== 207) {
      throw new Error(`Campaign Foundry Export returned unexpected HTTP ${status}.`);
    }

    const entries = Array.isArray(responseBody?.data) ? responseBody.data : [];
    const resultsByIndex = new Map(
      entries.map(
        /** Transform each entry while export campaign actors. */ (entry) => [
          Number(entry?.index),
          entry,
        ]
      )
    );
    failed = [];
    for (const [requestIndex, pendingEntry] of pending.entries()) {
      const result = resultsByIndex.get(requestIndex);
      const ok = status === 200 ? result?.ok !== false : result?.ok === true;
      if (!result || !ok) {
        const failure = {
          ...pendingEntry,
          error: result?.error ?? {
            status,
            code: "FOUNDRY_EXPORT_RESULT_MISSING",
            message: "The API did not return a successful result for this entry.",
          },
        };
        const failureStatus = Number(failure.error?.status);
        if (
          failure.error?.code === "FOUNDRY_EXPORT_SYNC_STALE" ||
          (failureStatus >= 400 && failureStatus < 500 && ![408, 429].includes(failureStatus))
        ) {
          nonRetryableFailures.push(failure);
        } else {
          failed.push(failure);
        }
        continue;
      }
      reportNetherscrollsExportWarnings(pendingEntry.actor, result);
      await applyFoundryExportCanonicalIds(pendingEntry.actor, result, { guildId: requestGuildId });
      await applyNetherscrollsCompanionVersionsSafely(pendingEntry.actor, result, requestGuildId);
      scheduleNetherscrollsActorSheetRender(pendingEntry.actor);
      succeeded.push({
        actor: pendingEntry.actor,
        originalIndex: pendingEntry.originalIndex,
        result,
      });
    }

    if (status === 200 && failed.length) {
      throw new Error(
        "A 200 campaign Foundry Export response contained a failed or missing entry."
      );
    }
    pending = failed.map(
      /** Transform each entry while export campaign actors. */ ({
        actor,
        originalIndex,
        characterId,
        syncToken,
        payload,
      }) => ({
        actor,
        originalIndex,
        characterId,
        syncToken,
        payload,
      })
    );
  }

  return {
    succeeded,
    failed: [...nonRetryableFailures, ...failed],
  };
}

export {
  exportActorToNetherscrolls,
  exportNetherscrollsCampaignActors,
  importActorFromNetherscrolls,
};
