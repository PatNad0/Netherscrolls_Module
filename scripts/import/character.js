/**
 * Apply one campaign character while preserving its Foundry identity.
 * Serialize work per character and complete required reconciliation before reporting success.
 */
import { normalizeNetherscrollsImportedCharacter } from "../api/campaigns.js";
import { fetchNetherscrollsApiJson, getNetherscrollsRequestGuildId } from "../api/client.js";
import {
  MODULE_ID,
  NETHERSCROLLS_CAMPAIGNS_ENDPOINT,
  NETHERSCROLLS_CHARACTER_FOLDER,
} from "../core/constants.js";
import { debugNetherscrollsCharacterImport, getNetherscrollsApiKey } from "../core/settings.js";
import {
  duplicateNetherscrollsData,
  escapeHtml,
  reportNetherscrollsTransferItemError,
  toTrimmedStringOrNull,
  yieldNetherscrollsMainThread,
} from "../core/utils.js";
import { NETHERSCROLLS_ITEM_TYPES } from "../data/catalogs.js";
import {
  applyNetherscrollsCharacterEquipmentArmorClass,
  normalizeNetherscrollsCharacterActorCreationData,
} from "../data/character.js";
import {
  applyNetherscrollsCharacterClassSelectionsToItems,
  applyNetherscrollsCharacterHitDiceToClassItems,
  applyNetherscrollsCharacterPreparedSpellsToItems,
  applyNetherscrollsSpellContextClasses,
  buildNetherscrollsAdditionalResourceItems,
  collectNetherscrollsCharacterItemSources,
  getNetherscrollsCharacterSpellcasting,
} from "../data/character-items.js";
import { sanitizeNetherscrollsImportResponseImages } from "../data/images.js";
import { buildNetherscrollsPortableActiveEffects } from "../data/item-fields.js";
import { normalizeNetherscrollsReferenceValue } from "../data/references.js";
import { findNetherscrollsActorByCharacterId } from "../foundry/actors.js";
import { repairNetherscrollsActorClassFeatures } from "../foundry/class-features.js";
import { getWorldFolders } from "../foundry/collections.js";
import { scheduleNetherscrollsActorSheetRender } from "../foundry/documents.js";
import { setActorCharacterId } from "../foundry/identifiers.js";
import {
  reconcileNetherscrollsCharacterActorEffects,
  reconcileNetherscrollsCharacterActorItems,
  repairNetherscrollsCharacterActorDocumentLinks,
} from "../foundry/reconciliation.js";
import { resolveNetherscrollsCharacterItemSources } from "./character-library.js";
import { importNetherscrollsCharacterCompanions } from "./companions.js";
import {
  netherscrollsCharacterImportLocks,
  netherscrollsLibraryReplacementState,
} from "./transfer-state.js";

/** Handle hydrate imported character. */
async function hydrateNetherscrollsImportedCharacter(importedCharacter, campaignId) {
  if (importedCharacter?.character && typeof importedCharacter.character === "object") {
    debugNetherscrollsCharacterImport(
      "Using native character payload supplied by the campaign list.",
      {
        characterId: importedCharacter.id,
      }
    );
    return importedCharacter;
  }
  const apiKey = getNetherscrollsApiKey();
  const guildId = getNetherscrollsRequestGuildId(importedCharacter?.guildId || undefined);
  const endpoint = `${NETHERSCROLLS_CAMPAIGNS_ENDPOINT}/${encodeURIComponent(campaignId)}/characters/${encodeURIComponent(importedCharacter.id)}`;
  debugNetherscrollsCharacterImport("Fetching full native character for Foundry Import.", {
    campaignId,
    characterId: importedCharacter.id,
    endpoint,
  });
  const data = await fetchNetherscrollsApiJson(endpoint, apiKey, { guildId });
  const direct = normalizeNetherscrollsImportedCharacter(data?.data ?? data, { guildId });
  if (!direct?.character) {
    throw new Error("The Foundry Import response did not include a native character payload.");
  }
  debugNetherscrollsCharacterImport(
    "Full Foundry Import response contains a native character payload.",
    {
      characterId: direct.id,
      characterPayloadKeys: Object.keys(direct.character ?? {}),
    }
  );
  return direct;
}

/** Find or create character folder. */
async function findOrCreateNetherscrollsCharacterFolder() {
  const existing = getWorldFolders().find(
    /** Find the matching entry while find or create character folder. */ (folder) => {
      const parentId =
        folder?.folder?.id ?? folder?.folder ?? folder?.parent?.id ?? folder?.parent ?? null;
      return (
        folder?.name === NETHERSCROLLS_CHARACTER_FOLDER.name &&
        folder?.type === NETHERSCROLLS_CHARACTER_FOLDER.type &&
        !parentId
      );
    }
  );
  if (existing) return existing;

  const FolderDocumentClass = globalThis.foundry?.documents?.Folder ?? globalThis.Folder;
  const FolderClass = FolderDocumentClass?.implementation ?? FolderDocumentClass;
  if (typeof FolderClass?.create !== "function") return null;
  return FolderClass.create({ ...NETHERSCROLLS_CHARACTER_FOLDER });
}

/** Serialize imports for the same character so concurrent UI and queue requests cannot race document writes. */
async function importNetherscrollsCampaignCharacter(
  importedCharacter,
  folder,
  { onProgress = null } = {}
) {
  if (netherscrollsLibraryReplacementState.active)
    throw new Error("Wait for the library replacement to finish before importing characters.");
  const characterId = normalizeNetherscrollsReferenceValue(importedCharacter?.id);
  if (!characterId)
    throw new Error("The Foundry Import character has no Netherscrolls character id.");
  const activeImport = netherscrollsCharacterImportLocks.get(characterId);
  if (activeImport) return activeImport;

  const importPromise = applyNetherscrollsCampaignCharacter(importedCharacter, folder, {
    onProgress,
  });
  netherscrollsCharacterImportLocks.set(characterId, importPromise);
  try {
    return await importPromise;
  } finally {
    if (netherscrollsCharacterImportLocks.get(characterId) === importPromise) {
      netherscrollsCharacterImportLocks.delete(characterId);
    }
    scheduleNetherscrollsActorSheetRender(
      findNetherscrollsActorByCharacterId(characterId, null, {
        guildId: importedCharacter?.guildId || undefined,
      })
    );
  }
}

/** Apply actor data, owned items, effects, and links as one workflow before acknowledging a successful import. */
async function applyNetherscrollsCampaignCharacter(
  importedCharacter,
  folder,
  { onProgress = null } = {}
) {
  const characterId = normalizeNetherscrollsReferenceValue(importedCharacter?.id);
  if (!importedCharacter?.character || typeof importedCharacter.character !== "object") {
    throw new Error("The Foundry Import response has no native character payload.");
  }

  try {
    const MessageClass =
      globalThis.CONFIG?.ChatMessage?.documentClass ??
      globalThis.foundry?.documents?.ChatMessage ??
      globalThis.ChatMessage;
    if (typeof MessageClass?.create !== "function")
      throw new Error("Foundry ChatMessage API is unavailable.");
    await MessageClass.create({
      speaker: { alias: "Netherscrolls" },
      content: `<p>Importing ${escapeHtml(String(importedCharacter.name ?? importedCharacter.character.name ?? "character"))}...</p>`,
    });
  } catch (error) {
    console.warn(`${MODULE_ID} | Unable to post character import message.`, error);
    ui?.notifications?.warn?.(`Netherscrolls import chat failed: ${error?.message ?? error}`);
  }

  await sanitizeNetherscrollsImportResponseImages({
    character: importedCharacter.character,
    foundryItems: importedCharacter.foundryActor?.items,
  });
  await yieldNetherscrollsMainThread();

  onProgress?.("preparing actor data...");
  const actorPayload = {
    name: importedCharacter.name,
    type: "character",
    img: importedCharacter.character.ns_ImageLink,
    system: {},
    prototypeToken: {},
    flags: {
      netherscrolls: { characterId },
    },
  };
  debugNetherscrollsCharacterImport("Building Foundry Actor from native character data.", {
    characterId,
    name: importedCharacter.name,
  });
  normalizeNetherscrollsCharacterActorCreationData(actorPayload, importedCharacter.character);
  const spellcasting = getNetherscrollsCharacterSpellcasting(importedCharacter);
  actorPayload.flags[MODULE_ID].spellcasting = spellcasting
    ? duplicateNetherscrollsData(spellcasting)
    : null;
  const itemSources = collectNetherscrollsCharacterItemSources(importedCharacter);
  const classSourceCount = itemSources.filter(
    /** Keep entries that satisfy the condition while apply campaign character. */ (entry) =>
      entry.dataset === "classes"
  ).length;
  const classFeatureSourceCount = itemSources.filter(
    /** Keep entries that satisfy the condition while apply campaign character. */
    (entry) => entry.dataset === "classFeatures"
  ).length;
  const effectSources = buildNetherscrollsPortableActiveEffects(importedCharacter.character);
  // The guild the character was read from. The Actor keeps it so later exports go
  // back to this guild, and linked material is resolved in this guild too.
  const guildId = getNetherscrollsRequestGuildId(importedCharacter?.guildId || undefined);
  actorPayload.type = "character";
  // Without a folder ("Create NS folder" off), a new Actor goes to the root and an
  // existing one stays where it is.
  if (folder?.id) actorPayload.folder = folder.id;
  else delete actorPayload.folder;
  actorPayload.name = toTrimmedStringOrNull(actorPayload.name) ?? importedCharacter.name;
  actorPayload.flags = actorPayload.flags ?? {};
  actorPayload.flags.netherscrolls = {
    ...(actorPayload.flags.netherscrolls ?? {}),
    characterId,
    ...(guildId ? { guildId } : {}),
  };
  debugNetherscrollsCharacterImport("Prepared Actor payload for persistence.", {
    characterId,
    name: actorPayload.name,
    size: actorPayload.system?.traits?.size,
    hasPrototypeToken: Boolean(actorPayload.prototypeToken),
    itemSourceCount: itemSources.length,
    effectSourceCount: effectSources.length,
    classSourceCount,
    classFeatureSourceCount,
  });
  console.info(
    `${MODULE_ID} | Foundry Import | ${actorPayload.name}: ${classSourceCount} class/subclass source(s), ${classFeatureSourceCount} class feature source(s).`
  );

  onProgress?.("resolving items, spells, and features...");
  const content = await resolveNetherscrollsCharacterItemSources(itemSources, {
    guildId,
    onProgress: /** Handle progress. */ (completed, total) =>
      onProgress?.(`looking up imported library content (${completed}/${total})...`),
  });
  await yieldNetherscrollsMainThread();
  content.items.push(
    ...buildNetherscrollsAdditionalResourceItems(importedCharacter.character, characterId)
  );
  applyNetherscrollsCharacterClassSelectionsToItems(content.items, importedCharacter.character);
  applyNetherscrollsCharacterHitDiceToClassItems(content.items, importedCharacter.character);
  applyNetherscrollsCharacterPreparedSpellsToItems(content.items, importedCharacter.character);
  applyNetherscrollsSpellContextClasses(content.items);
  for (const item of content.items) {
    if (
      !NETHERSCROLLS_ITEM_TYPES.has(item.type) &&
      !["facility", "vehicle", "backpack"].includes(item.type)
    )
      continue;
    const flags = item.flags?.netherscrolls ?? {};
    const matches = /** Determine whether. */ (reference) =>
      [flags.inventoryId, flags.itemId, flags.id]
        .filter(Boolean)
        .includes(
          typeof reference === "string"
            ? reference
            : (reference?.inventoryId ?? reference?.id ?? reference?.itemId)
        );
    item.system ??= {};
    if (Array.isArray(importedCharacter.character.equipment))
      item.system.equipped = importedCharacter.character.equipment.some(matches);
    if (Array.isArray(importedCharacter.character.attunement))
      item.system.attuned = importedCharacter.character.attunement.some(matches);
  }
  applyNetherscrollsCharacterEquipmentArmorClass(
    actorPayload,
    importedCharacter.character,
    content.items,
    effectSources
  );
  debugNetherscrollsCharacterImport("Resolved character item sources.", {
    characterId,
    resolvedItemCount: content.items.length,
    fetched: content.fetched,
  });

  let actor = findNetherscrollsActorByCharacterId(characterId, importedCharacter.name, { guildId });
  const created = !actor;
  if (actor) {
    onProgress?.("updating existing Foundry actor...");
    debugNetherscrollsCharacterImport("Updating existing Foundry Actor.", {
      characterId,
      actorId: actor.id,
    });
    delete actorPayload.type;
    await actor.update(actorPayload, { render: false });
  } else {
    const ActorDocumentClass = globalThis.Actor?.implementation ?? globalThis.Actor;
    if (typeof ActorDocumentClass?.create !== "function") {
      throw new Error("Foundry Actor creation API is unavailable.");
    }
    onProgress?.("creating Foundry actor...");
    debugNetherscrollsCharacterImport("Creating Foundry Actor.", {
      characterId,
      name: actorPayload.name,
    });
    actor = await ActorDocumentClass.create(actorPayload, { renderSheet: false });
    debugNetherscrollsCharacterImport("Foundry Actor created.", {
      characterId,
      actorId: actor?.id,
    });
  }
  onProgress?.("linking actor to Netherscrolls...");
  await setActorCharacterId(actor, characterId);
  await yieldNetherscrollsMainThread();

  onProgress?.(
    `adding or updating ${content.items.length} item${content.items.length === 1 ? "" : "s"}...`
  );
  const itemResult = await reconcileNetherscrollsCharacterActorItems(
    actor,
    content.items,
    characterId,
    {
      replaceAll: true,
      expectedSources: itemSources,
    }
  );
  await yieldNetherscrollsMainThread();
  debugNetherscrollsCharacterImport("Reconciled character items.", { characterId, itemResult });
  onProgress?.("linking background, race, and original class...");
  const documentLinks = await repairNetherscrollsCharacterActorDocumentLinks(
    actor,
    importedCharacter.character,
    itemResult.embeddedIds
  );
  debugNetherscrollsCharacterImport("Repaired Actor embedded-document links.", {
    characterId,
    documentLinks,
  });
  // A character effect exported from a passive Foundry effect that is still on the actor
  // (for example an item's own effect) must not be imported again as a second copy.
  const isForeignMirror = globalThis.NetherscrollsEffects?.foundry?.isForeignMirror;
  const importedEffectSources =
    typeof isForeignMirror === "function"
      ? effectSources.filter(
          /** Keep entries that satisfy the condition while apply campaign character. */ (effect) =>
            !isForeignMirror(actor, effect)
        )
      : effectSources;
  onProgress?.(
    `adding or updating ${importedEffectSources.length} effect${importedEffectSources.length === 1 ? "" : "s"}...`
  );
  const effectResult = await reconcileNetherscrollsCharacterActorEffects(
    actor,
    importedEffectSources,
    characterId
  );
  await yieldNetherscrollsMainThread();
  debugNetherscrollsCharacterImport("Reconciled character effects.", { characterId, effectResult });
  let repairedFeatures = 0;
  try {
    onProgress?.("repairing class features...");
    const repair = await repairNetherscrollsActorClassFeatures(actor, { notify: false });
    if (repair.missingSources) {
      throw new Error(
        `Netherscrolls import is incomplete: ${repair.missingSources} class feature source(s) could not be resolved. The sync remains queued.`
      );
    }
    repairedFeatures = repair.created ?? 0;
    console.info(
      `${MODULE_ID} | Foundry Import | ${actorPayload.name}: class feature repair result.`,
      repair
    );
    debugNetherscrollsCharacterImport("Repaired class features after import.", {
      characterId,
      repair,
    });
  } catch (err) {
    debugNetherscrollsCharacterImport("Class-feature repair failed.", {
      characterId,
      error: err?.message ?? String(err),
      stack: err?.stack,
    });
    reportNetherscrollsTransferItemError("Class features", err);
    throw err;
  }

  await globalThis.NetherscrollsEffects.features.initializeActor(
    actor,
    importedCharacter.character
  );

  // Companions are calculated from the character, so they follow its complete import.
  let companions = null;
  try {
    companions = await importNetherscrollsCharacterCompanions(importedCharacter, actor, {
      characterFolder: folder,
      guildId,
      onProgress,
    });
  } catch (err) {
    console.error(`${MODULE_ID} | ${actorPayload.name}: companions could not be imported.`, err);
    companions = {
      created: 0,
      updated: 0,
      failed: [{ name: "Companions", error: err?.message ?? String(err) }],
      missing: [],
      review: [],
    };
  }
  reportNetherscrollsCompanionImport(actorPayload.name, companions);
  onProgress?.("complete.");

  return {
    actor,
    created,
    fetched: content.fetched,
    items: itemResult,
    effects: effectResult,
    documentLinks,
    repairedFeatures,
    companions,
  };
}

/** Tell the GM about companions that failed, need a review, or are no longer linked. */
function reportNetherscrollsCompanionImport(characterName, result) {
  if (!result) return;
  const name = characterName ?? "Character";
  for (const failure of result.failed)
    ui?.notifications?.warn?.(
      `${name}: companion ${failure.name} was not imported (${failure.error}).`
    );
  if (result.review.length)
    ui?.notifications?.warn?.(
      `${name}: ${result.review.length} companion${result.review.length === 1 ? " has" : "s have"} values to review. See the browser console.`
    );
  if (result.missing.length)
    ui?.notifications?.info?.(
      `${name}: ${result.missing.join(", ")} ${result.missing.length === 1 ? "is" : "are"} no longer ${name}'s companion in Netherscrolls. The Actor was kept and will not be exported.`
    );
}

export {
  findOrCreateNetherscrollsCharacterFolder,
  hydrateNetherscrollsImportedCharacter,
  importNetherscrollsCampaignCharacter,
};
