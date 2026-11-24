/**
 * Export companion Actors (docs/api/38-companions.md, "Foundry transfer"). They travel with their
 * character's export, or alone from their own sheet. The API matches each one by its companion and
 * owner ids, never by name, and saves only runtime values. Every answer carries `actorFlags`, which
 * must be written to the Actor or its next export is refused as stale.
 */
import {
  getNetherscrollsGuildName,
  requestNetherscrollsJson,
  resolveNetherscrollsActorGuildId,
} from "../api/client.js";
import { MODULE_ID, NETHERSCROLLS_CAMPAIGNS_ENDPOINT } from "../core/constants.js";
import { getNetherscrollsApiKey } from "../core/settings.js";
import {
  duplicateNetherscrollsDocumentData,
  getActorCharacterId,
  getActorCompanionId,
  getActorCompanionOwnerId,
  normalizeNetherscrollsReferenceValue,
} from "../data/references.js";
import {
  findNetherscrollsActorByCharacterId,
  findNetherscrollsCompanionActor,
  getNetherscrollsCharacterCompanionActors,
} from "../foundry/actors.js";

// Refusals that a fresh import of the character resolves.
const NETHERSCROLLS_COMPANION_REIMPORT_ERRORS = new Set([
  "FOUNDRY_COMPANION_VERSION_CONFLICT",
  "FOUNDRY_COMPANION_OWNER_CHANGED",
  "FOUNDRY_COMPANION_HIT_DICE_CHANGED",
  "FOUNDRY_COMPANION_FEATURE_MISSING",
]);

/** Add the character's linked companion Actors beside its `actor` in an export envelope. */
function attachNetherscrollsCompanionExports(payload, actor, { guildId = undefined } = {}) {
  if (!payload || typeof payload !== "object") return payload;
  const characterId = normalizeNetherscrollsReferenceValue(
    getActorCharacterId(actor) ?? payload.characterId
  );
  const companions = characterId
    ? getNetherscrollsCharacterCompanionActors(characterId, { guildId }).map(
        /** Send the Actor with its Netherscrolls flags. */ (companion) =>
          duplicateNetherscrollsDocumentData(companion)
      )
    : [];
  if (companions.length) payload.companions = companions;
  else delete payload.companions;
  return payload;
}

/** Write an export's `actorFlags` (new `companionVersion`, refreshed `companionHitDice`). */
async function applyNetherscrollsCompanionActorFlags(actor, actorFlags) {
  if (!actor || !actorFlags || typeof actorFlags !== "object") return false;
  const update = {};
  for (const [key, value] of Object.entries(actorFlags))
    update[`flags.netherscrolls.${key}`] = value;
  if (!Object.keys(update).length) return false;
  await actor.update(update, { render: false, netherscrollsTransfer: true });
  return true;
}

/** After a character export, write each saved companion's `actorFlags` (`data.companions`). */
async function applyNetherscrollsCompanionExportVersions(response, { guildId = undefined } = {}) {
  const rows = response?.data?.companions;
  if (!Array.isArray(rows)) return 0;
  let updated = 0;
  for (const row of rows) {
    const companionId = normalizeNetherscrollsReferenceValue(row?.companionId);
    const actorFlags =
      row?.actorFlags ??
      (Number.isInteger(row?.version) ? { companionVersion: row.version } : null);
    if (!companionId || !actorFlags) continue;
    const actor = findNetherscrollsCompanionActor(companionId, { guildId });
    if (await applyNetherscrollsCompanionActorFlags(actor, actorFlags)) updated += 1;
  }
  return updated;
}

/** A refusal message, pointing to a reimport when that is what fixes it. */
function describeNetherscrollsCompanionExportError(error, ownerName) {
  const message = error?.message ?? String(error);
  return NETHERSCROLLS_COMPANION_REIMPORT_ERRORS.has(error?.code)
    ? `${message} Import ${ownerName ?? "its character"} again, then retry.`
    : message;
}

/** Send one companion Actor's runtime values (HP, hit dice, slots, uses…) to Netherscrolls. */
async function exportNetherscrollsCompanionActor(actor) {
  const companionId = getActorCompanionId(actor);
  if (!companionId) return null;
  const name = actor.name ?? "Companion";
  if (!getNetherscrollsApiKey()) {
    ui?.notifications?.warn?.("Netherscrolls API Key is missing. Set it in Module Settings.");
    return null;
  }
  if (actor.flags?.[MODULE_ID]?.companionMissing === true) {
    ui?.notifications?.warn?.(
      `${name} is no longer a companion in Netherscrolls, so it cannot be sent.`
    );
    return null;
  }
  const guildId = await resolveNetherscrollsActorGuildId(actor);
  const owner = findNetherscrollsActorByCharacterId(getActorCompanionOwnerId(actor), null, {
    guildId,
  });
  const campaignId = normalizeNetherscrollsReferenceValue(
    owner?.flags?.[MODULE_ID]?.nativeCharacter?.campaignId
  );
  if (!campaignId) {
    ui?.notifications?.warn?.(
      `${name} is sent with its character's campaign. Import its character first.`
    );
    return null;
  }

  const guildName = getNetherscrollsGuildName(guildId);
  ui?.notifications?.info?.(
    `Sending ${name} through the Netherscrolls${guildName ? ` (${guildName})` : ""}...`
  );
  try {
    const endpoint = `${NETHERSCROLLS_CAMPAIGNS_ENDPOINT}/${encodeURIComponent(campaignId)}/companions/${encodeURIComponent(companionId)}/export`;
    const response = await requestNetherscrollsJson(endpoint, {
      method: "POST",
      guildId,
      body: { actor: duplicateNetherscrollsDocumentData(actor) },
      operation: "Companion Foundry Export",
    });
    await applyNetherscrollsCompanionActorFlags(actor, response?.actorFlags);
    const changed = Array.isArray(response?.changed) ? response.changed : [];
    ui?.notifications?.info?.(
      changed.length
        ? `${name} has arrived safely in Netherscrolls (${changed.join(", ")}).`
        : `${name} was already up to date in Netherscrolls.`
    );
    return response;
  } catch (err) {
    console.error(`${MODULE_ID} | Companion Foundry Export failed.`, err);
    ui?.notifications?.error?.(
      `Foundry Export of ${name} failed: ${describeNetherscrollsCompanionExportError(err, owner?.name)}`
    );
    throw err;
  }
}

export {
  applyNetherscrollsCompanionActorFlags,
  applyNetherscrollsCompanionExportVersions,
  attachNetherscrollsCompanionExports,
  exportNetherscrollsCompanionActor,
};
