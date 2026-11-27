/**
 * Import a character's companions with it, as linked NPC Actors (docs/api/38-companions.md).
 * Each companion is found by its Netherscrolls id, updated in place, and calculated from the
 * character Actor just imported. One failing companion never blocks the character or the others.
 */
import { MODULE_ID, NETHERSCROLLS_COMPANION_FOLDER } from "../core/constants.js";
import {
  duplicateNetherscrollsData,
  toTrimmedStringOrNull,
  yieldNetherscrollsMainThread,
} from "../core/utils.js";
import {
  getNetherscrollsCompanionOwnerSheet,
  prepareNetherscrollsCompanionActorData,
} from "../data/companions.js";
import {
  getActorCompanionId,
  getActorCompanionOwnerId,
  normalizeNetherscrollsReferenceValue,
} from "../data/references.js";
import {
  findNetherscrollsCompanionActor,
  getNetherscrollsCharacterCompanionActors,
} from "../foundry/actors.js";
import { getWorldFolders } from "../foundry/collections.js";

const NETHERSCROLLS_COMPANION_WRITE_OPTIONS = Object.freeze({
  render: false,
  renderSheet: false,
  netherscrollsTransfer: true,
});

/** Parent folder id of a Folder document. */
function getNetherscrollsFolderParentId(folder) {
  return folder?.folder?.id ?? folder?.folder ?? folder?.parent?.id ?? folder?.parent ?? null;
}

/** The Companions folder inside the character folder. */
async function findOrCreateNetherscrollsCompanionFolder(characterFolder) {
  const parentId = characterFolder?.id ?? null;
  const existing = getWorldFolders().find(
    /** Find the companion folder under this parent. */ (folder) =>
      folder?.name === NETHERSCROLLS_COMPANION_FOLDER.name &&
      folder?.type === NETHERSCROLLS_COMPANION_FOLDER.type &&
      (getNetherscrollsFolderParentId(folder) ?? null) === parentId
  );
  if (existing) return existing;
  const FolderDocumentClass = globalThis.foundry?.documents?.Folder ?? globalThis.Folder;
  const FolderClass = FolderDocumentClass?.implementation ?? FolderDocumentClass;
  if (typeof FolderClass?.create !== "function") return characterFolder ?? null;
  return FolderClass.create({ ...NETHERSCROLLS_COMPANION_FOLDER, folder: parentId });
}

/** Companion ids the API could not prepare (`{ companionId, name, code, message }`): they still exist. */
function getNetherscrollsCompanionFailureIds(failures) {
  return (Array.isArray(failures) ? failures : [])
    .map(
      /** Read the failed companion id. */ (failure) =>
        normalizeNetherscrollsReferenceValue(failure?.companionId)
    )
    .filter(Boolean);
}

/** Readable reason for a companion the API could not prepare. */
function describeNetherscrollsCompanionFailure(failure) {
  return {
    name:
      toTrimmedStringOrNull(failure?.name) ??
      (failure?.code === "FOUNDRY_COMPANION_LIST_FAILED" ? "The companion list" : "A companion"),
    error:
      toTrimmedStringOrNull(failure?.message ?? failure?.code) ??
      "Netherscrolls could not prepare it.",
  };
}

/** Effects the import owns: everything generated from Netherscrolls data. */
function isNetherscrollsManagedCompanionEffect(effect) {
  const flags = effect?.flags ?? {};
  return Boolean(
    flags.netherscrolls?.nativeEffect ||
      flags.netherscrolls?.generatedFeatureEffect ||
      flags[MODULE_ID]?.companionCalculation
  );
}

/** Create a companion Actor, owned by the same players as its character. */
async function createNetherscrollsCompanionActor(data, ownerActor, folder) {
  const ActorDocumentClass = globalThis.Actor?.implementation ?? globalThis.Actor;
  if (typeof ActorDocumentClass?.create !== "function")
    throw new Error("Foundry Actor creation API is unavailable.");
  const friendly = globalThis.CONST?.TOKEN_DISPOSITIONS?.FRIENDLY ?? 1;
  return ActorDocumentClass.create(
    {
      ...data,
      folder: folder?.id ?? null,
      ownership: duplicateNetherscrollsData(ownerActor?.ownership ?? { default: 0 }),
      prototypeToken: { ...data.prototypeToken, disposition: friendly },
    },
    { ...NETHERSCROLLS_COMPANION_WRITE_OPTIONS, keepEmbeddedIds: true }
  );
}

/**
 * Update a companion Actor in place. Its folder, ownership and token disposition stay the world's,
 * unless it changed character: then its new character's players own it. Items and Netherscrolls
 * effects are replaced, so removed features disappear; effects added in Foundry (conditions, spells
 * cast on it) stay.
 */
async function updateNetherscrollsCompanionActor(actor, data, ownerActor) {
  const { items = [], effects = [], ...root } = data;
  delete root.type;
  delete root.folder;
  delete root.ownership;
  const previousOwnerId = getActorCompanionOwnerId(actor);
  const ownerId = normalizeNetherscrollsReferenceValue(data.flags?.netherscrolls?.characterId);
  if (ownerActor?.ownership && previousOwnerId && ownerId && previousOwnerId !== ownerId)
    root.ownership = duplicateNetherscrollsData(ownerActor.ownership);
  if (root.prototypeToken) {
    root.prototypeToken = { ...root.prototypeToken };
    delete root.prototypeToken.disposition;
  }
  await actor.update(root, NETHERSCROLLS_COMPANION_WRITE_OPTIONS);

  const itemIds = Array.from(actor.items ?? [])
    .map(/** Item id. */ (item) => item?.id)
    .filter(Boolean);
  if (itemIds.length)
    await actor.deleteEmbeddedDocuments("Item", itemIds, NETHERSCROLLS_COMPANION_WRITE_OPTIONS);
  if (items.length)
    await actor.createEmbeddedDocuments("Item", items, {
      ...NETHERSCROLLS_COMPANION_WRITE_OPTIONS,
      keepId: true,
    });

  const incoming = new Set(
    effects.map(/** Effect id. */ (effect) => effect?._id).filter(Boolean)
  );
  const effectIds = Array.from(actor.effects ?? [])
    .filter(
      /** Replace managed effects and any that would collide. */ (effect) =>
        isNetherscrollsManagedCompanionEffect(effect) || incoming.has(effect?.id)
    )
    .map(/** Effect id. */ (effect) => effect.id);
  if (effectIds.length)
    await actor.deleteEmbeddedDocuments(
      "ActiveEffect",
      effectIds,
      NETHERSCROLLS_COMPANION_WRITE_OPTIONS
    );
  if (effects.length)
    await actor.createEmbeddedDocuments("ActiveEffect", effects, {
      ...NETHERSCROLLS_COMPANION_WRITE_OPTIONS,
      keepId: true,
    });
}

/**
 * Import the companions of a character just imported. `importedCharacter.companions` is the
 * transfer's list; without one (an older API), companions are left untouched and null is returned.
 */
async function importNetherscrollsCharacterCompanions(
  importedCharacter,
  ownerActor,
  { characterFolder = null, guildId = "", onProgress = null } = {}
) {
  if (!Array.isArray(importedCharacter?.companions)) return null;
  const characterId = normalizeNetherscrollsReferenceValue(importedCharacter.id);
  const result = { created: 0, updated: 0, failed: [], missing: [], review: [] };
  const failures = importedCharacter.companionFailures ?? [];
  result.failed.push(...failures.map(describeNetherscrollsCompanionFailure));
  const listed = new Set(getNetherscrollsCompanionFailureIds(failures));
  const entries = importedCharacter.companions;
  const owner = entries.length ? getNetherscrollsCompanionOwnerSheet(ownerActor) : null;
  let folder = null;

  for (const [index, entry] of entries.entries()) {
    const label =
      toTrimmedStringOrNull(entry?.companion?.name ?? entry?.foundryActor?.name) ?? "Companion";
    onProgress?.(`importing companion ${index + 1} of ${entries.length} (${label})...`);
    try {
      const prepared = prepareNetherscrollsCompanionActorData(entry, owner, {
        guildId,
        characterId,
      });
      if (!prepared) throw new Error("The transfer has no Foundry Actor for this companion.");
      listed.add(prepared.companionId);
      const actor = findNetherscrollsCompanionActor(prepared.companionId, { guildId });
      if (actor) {
        await updateNetherscrollsCompanionActor(actor, prepared.data, ownerActor);
        result.updated += 1;
      } else {
        // Without a character folder, companions are created at the root too.
        if (characterFolder)
          folder ??= await findOrCreateNetherscrollsCompanionFolder(characterFolder);
        await createNetherscrollsCompanionActor(prepared.data, ownerActor, folder);
        result.created += 1;
      }
      if (prepared.review.length)
        result.review.push({ name: prepared.data.name, review: prepared.review });
    } catch (error) {
      console.error(`${MODULE_ID} | Companion "${label}" could not be imported.`, error);
      result.failed.push({ name: label, error: error?.message ?? String(error) });
    }
    await yieldNetherscrollsMainThread();
  }

  // No longer this character's in Netherscrolls (deleted or given away): kept, but not exported.
  // When the list itself could not be loaded, nothing can be concluded.
  const listFailed = failures.some(
    /** The whole list failed. */ (failure) => failure?.code === "FOUNDRY_COMPANION_LIST_FAILED"
  );
  const linked = listFailed
    ? []
    : getNetherscrollsCharacterCompanionActors(characterId, { guildId, includeMissing: true });
  for (const actor of linked) {
    if (listed.has(getActorCompanionId(actor))) continue;
    if (actor.flags?.[MODULE_ID]?.companionMissing === true) continue;
    await actor.update(
      { [`flags.${MODULE_ID}.companionMissing`]: true },
      NETHERSCROLLS_COMPANION_WRITE_OPTIONS
    );
    result.missing.push(actor.name);
  }

  if (result.review.length)
    console.warn(
      `${MODULE_ID} | Companions of ${importedCharacter.name ?? "a character"} with values to review.`,
      result.review
    );
  return result;
}

/** One line summarizing a companion import, or null when there was nothing to import. */
function formatNetherscrollsCompanionImportResult(result) {
  if (!result) return null;
  const parts = [];
  if (result.created) parts.push(`${result.created} created`);
  if (result.updated) parts.push(`${result.updated} updated`);
  if (result.failed.length) parts.push(`${result.failed.length} failed`);
  if (result.review.length) parts.push(`${result.review.length} to review`);
  if (result.missing.length) parts.push(`${result.missing.length} no longer linked`);
  return parts.length ? `companions: ${parts.join(", ")}` : null;
}

export { formatNetherscrollsCompanionImportResult, importNetherscrollsCharacterCompanions };
