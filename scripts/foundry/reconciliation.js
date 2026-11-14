/**
 * Reconcile an imported actor's owned items, effects, and document links.
 * Use provenance to remove stale imported content while preserving unrelated Foundry content.
 */
import { MODULE_ID } from "../core/constants.js";
import {
  buildNetherscrollsStableId,
  duplicateNetherscrollsData,
  reportNetherscrollsTransferItemError,
  toTrimmedStringOrNull,
  yieldNetherscrollsMainThread,
} from "../core/utils.js";
import { getNetherscrollsCharacterBackgroundId } from "../data/character-items.js";
import {
  getItemNetherId,
  getNetherscrollsSourceId,
  normalizeNetherscrollsReferenceValue,
} from "../data/references.js";
import { getNetherscrollsActorEffects, getNetherscrollsActorItems } from "./collections.js";
import {
  replaceNetherscrollsOwnedItemActivities,
  runNetherscrollsEmbeddedDocumentBatches,
} from "./documents.js";
import {
  haveSameNetherscrollsEmbeddedEffects,
  reconcileNetherscrollsItemEffectsSafely,
} from "./effects.js";

/** Retrieve inventory document key. */
function getNetherscrollsInventoryDocumentKey(item) {
  const flags = item?.flags?.netherscrolls ?? {};
  if (flags.spellEntryId) return `spell-entry:${flags.spellEntryId}`;
  return flags.inventoryId
    ? `inventory:${flags.inventoryId}`
    : getItemNetherId(item)
      ? `library:${getItemNetherId(item)}`
      : item?.flags?.[MODULE_ID]?.nativeCharacterResource
        ? `resource:${item.flags[MODULE_ID].resourceIndex}`
        : null;
}

/** Reconcile character items safely. */
async function reconcileNetherscrollsCharacterItemsSafely(
  actor,
  rows,
  characterId,
  expectedSources
) {
  const existing = Array.from(getNetherscrollsActorItems(actor));
  const byKey = new Map(
    existing
      .map(
        /** Transform each entry while reconcile character items safely. */ (item) => [
          getNetherscrollsInventoryDocumentKey(item),
          item,
        ]
      )
      .filter(
        /** Keep entries that satisfy the condition while reconcile character items safely. */ ([
          key,
        ]) => key
      )
  );
  const wanted = new Set(rows.map(getNetherscrollsInventoryDocumentKey).filter(Boolean));
  for (const descriptor of expectedSources ?? []) {
    const source = descriptor.source;
    const inventoryId = source?.kind ? source.id : source?.flags?.netherscrolls?.inventoryId;
    const key = source?.spellContext?.entryId
      ? `spell-entry:${source.spellContext.entryId}`
      : inventoryId
        ? `inventory:${inventoryId}`
        : descriptor.netherscrollsId
          ? `library:${descriptor.netherscrollsId}`
          : null;
    if (key) wanted.add(key);
  }
  const protectedIds = new Set();
  const requestedLibraryIds = new Set(
    (expectedSources ?? [])
      .filter(
        /** Keep entries that satisfy the condition while reconcile character items safely. */ (
          source
        ) => !source.source?.spellContext
      )
      .map(
        /** Transform each entry while reconcile character items safely. */ (source) =>
          source.netherscrollsId
      )
      .filter(Boolean)
  );
  const result = {
    created: 0,
    updated: 0,
    deletedLinked: 0,
    deletedEffects: 0,
    embeddedIds: {},
    failed: 0,
  };
  for (const row of rows) {
    const data = duplicateNetherscrollsData(row);
    const key = getNetherscrollsInventoryDocumentKey(data);
    const previous =
      (key ? byKey.get(key) : null) ??
      (data.flags?.netherscrolls?.inventoryId && getItemNetherId(data)
        ? existing.find(
            /** Find the matching entry while reconcile character items safely. */
            (item) =>
              !protectedIds.has(item.id) &&
              !item.flags?.netherscrolls?.inventoryId &&
              getItemNetherId(item) === getItemNetherId(data)
          )
        : null);
    if (previous) protectedIds.add(previous.id);
    data.flags ??= {};
    data.flags[MODULE_ID] = {
      ...(data.flags[MODULE_ID] ?? {}),
      importedCharacterItem: true,
      characterId,
    };
    try {
      let saved;
      if (previous && previous.type === data.type) {
        data._id = previous.id;
        // Reconcile effects by embedded id, never discard the Item before saving its replacement.
        const effects = data.effects;
        const reconcileEffects =
          !haveSameNetherscrollsEmbeddedEffects(previous, data) &&
          typeof previous.createEmbeddedDocuments === "function";
        if (reconcileEffects || haveSameNetherscrollsEmbeddedEffects(previous, data))
          delete data.effects;
        [saved] = await actor.updateEmbeddedDocuments(
          "Item",
          [replaceNetherscrollsOwnedItemActivities(data, previous)],
          { render: false, netherscrollsTransfer: true }
        );
        result.updated++;
        if (reconcileEffects)
          await reconcileNetherscrollsItemEffectsSafely(previous, effects ?? []);
      } else {
        delete data._id;
        [saved] = await actor.createEmbeddedDocuments("Item", [data], {
          render: false,
          netherscrollsTransfer: true,
        });
        if (!saved) throw new Error("Foundry did not create the Item");
        result.created++;
        if (previous)
          await actor.deleteEmbeddedDocuments("Item", [previous.id], {
            render: false,
            netherscrollsTransfer: true,
          });
      }
      const id = getItemNetherId(data);
      if (id) result.embeddedIds[id] = saved?.id ?? previous?.id;
      if (key && saved) byKey.set(key, saved);
    } catch (error) {
      result.failed++;
      reportNetherscrollsTransferItemError(data.name ?? "Item", error);
    }
    await yieldNetherscrollsMainThread();
  }
  // Only remove imported content explicitly absent from the native character.
  // Missing/unreadable requested Items and unrelated local Items remain intact.
  for (const item of existing) {
    const key = getNetherscrollsInventoryDocumentKey(item);
    if (
      result.failed ||
      !key ||
      wanted.has(key) ||
      protectedIds.has(item.id) ||
      (!item.flags?.netherscrolls?.inventoryId && requestedLibraryIds.has(getItemNetherId(item))) ||
      !isNetherscrollsImportedCharacterDocument(item, "importedCharacterItem", characterId)
    )
      continue;
    try {
      await actor.deleteEmbeddedDocuments("Item", [item.id], {
        render: false,
        netherscrollsTransfer: true,
      });
      result.deletedLinked++;
    } catch (error) {
      result.failed++;
      reportNetherscrollsTransferItemError(item.name, error);
    }
  }
  return result;
}

/** Match imported items by provenance and reconcile them without discarding unrelated player-owned content. */
async function reconcileNetherscrollsCharacterActorItems(
  actor,
  itemData,
  characterId,
  { replaceLinked = false, replaceAll = false, expectedSources = null } = {}
) {
  if (replaceAll)
    return reconcileNetherscrollsCharacterItemsSafely(
      actor,
      itemData,
      characterId,
      expectedSources
    );
  const existingById = new Map();
  const duplicateExistingIds = [];
  const shouldReplaceExisting = replaceLinked || replaceAll;
  const existingItems = replaceAll
    ? getNetherscrollsActorItems(actor)
    : replaceLinked
      ? getNetherscrollsActorItems(actor).filter(
          /** Keep entries that satisfy the condition while reconcile character actor items. */ (
            item
          ) => getItemNetherId(item)
        )
      : [];
  const existingItemIds = new Set(
    existingItems
      .map(
        /** Transform each entry while reconcile character actor items. */ (item) =>
          String(item.id ?? item._id ?? "")
      )
      .filter(Boolean)
  );
  const raceEffectNames = new Set(
    (Array.isArray(itemData) ? itemData : [])
      .filter(
        /** Keep entries that satisfy the condition while reconcile character actor items. */ (
          item
        ) => item?.type === "race" || item?.type === "species"
      )
      .map(
        /** Transform each entry while reconcile character actor items. */ (item) =>
          toTrimmedStringOrNull(item?.name)
      )
      .filter(Boolean)
      .map(
        /** Transform each entry while reconcile character actor items. */ (name) => `Race: ${name}`
      )
  );
  const staleEffectIds = shouldReplaceExisting
    ? getNetherscrollsActorEffects(actor)
        .filter(
          /** Keep entries that satisfy the condition while reconcile character actor items. */
          (effect) =>
            replaceAll ||
            isNetherscrollsStaleCharacterEffect(
              effect,
              existingItemIds,
              raceEffectNames,
              characterId
            )
        )
        .map(
          /** Transform each entry while reconcile character actor items. */ (effect) =>
            effect.id ?? effect._id
        )
        .filter(Boolean)
    : [];

  if (staleEffectIds.length && actor?.deleteEmbeddedDocuments) {
    await runNetherscrollsEmbeddedDocumentBatches(
      actor,
      "deleteEmbeddedDocuments",
      "ActiveEffect",
      staleEffectIds,
      { render: false, netherscrollsTransfer: true }
    );
  }
  if (existingItemIds.size && actor?.deleteEmbeddedDocuments) {
    await runNetherscrollsEmbeddedDocumentBatches(
      actor,
      "deleteEmbeddedDocuments",
      "Item",
      existingItemIds,
      { render: false, netherscrollsTransfer: true }
    );
  }

  for (const item of getNetherscrollsActorItems(actor)) {
    const id = getItemNetherId(item);
    if (!id) continue;
    if (shouldReplaceExisting) continue;
    const key = String(id);
    const existing = existingById.get(key);
    if (!existing) {
      existingById.set(key, item);
      continue;
    }
    const existingImported = isNetherscrollsImportedCharacterDocument(
      existing,
      "importedCharacterItem",
      characterId
    );
    const itemImported = isNetherscrollsImportedCharacterDocument(
      item,
      "importedCharacterItem",
      characterId
    );
    // A Netherscrolls id identifies one canonical embedded Item. Older module
    // versions may have created unmarked duplicates, whose transferred effects
    // would otherwise stack every time the character is re-imported.
    if (!existingImported && itemImported) {
      if (existing?.id) duplicateExistingIds.push(existing.id);
      existingById.set(key, item);
    } else if (item?.id) {
      duplicateExistingIds.push(item.id);
    }
  }

  const uniqueItemData = [];
  const pendingById = new Map();
  for (const data of itemData) {
    const id = getNetherscrollsSourceId(data);
    if (!id) {
      uniqueItemData.push(data);
      continue;
    }
    const key = String(id);
    if (pendingById.has(key)) {
      uniqueItemData[pendingById.get(key)] = data;
    } else {
      pendingById.set(key, uniqueItemData.length);
      uniqueItemData.push(data);
    }
  }

  const creates = [];
  const updates = [];
  const replacedWrongTypeIds = [];
  const replacedEffectIds = [];
  for (const data of uniqueItemData) {
    const netherscrollsId = getNetherscrollsSourceId(data);
    data.flags = data.flags ?? {};
    data.flags[MODULE_ID] = {
      ...(data.flags[MODULE_ID] ?? {}),
      characterId,
      importedCharacterItem: true,
    };
    const existing = netherscrollsId ? existingById.get(String(netherscrollsId)) : null;
    if (existing?.id) {
      const effectsDiffer = !haveSameNetherscrollsEmbeddedEffects(existing, data);
      const typeMismatch = Boolean(
        toTrimmedStringOrNull(existing.type) &&
        toTrimmedStringOrNull(data.type) &&
        existing.type !== data.type
      );
      if (typeMismatch || effectsDiffer) {
        (typeMismatch ? replacedWrongTypeIds : replacedEffectIds).push(existing.id);
        creates.push(data);
      } else {
        const update = { ...data, _id: existing.id };
        // Foundry treats embedded effects as separate documents. Leaving an
        // unchanged effect array out of the Item update prevents it from
        // appending another copy on each character import.
        delete update.effects;
        updates.push(replaceNetherscrollsOwnedItemActivities(update, existing));
      }
    } else {
      creates.push(data);
    }
  }
  const deleteIds = Array.from(
    new Set([...duplicateExistingIds, ...replacedWrongTypeIds, ...replacedEffectIds])
  );
  if (deleteIds.length && actor?.deleteEmbeddedDocuments) {
    await runNetherscrollsEmbeddedDocumentBatches(
      actor,
      "deleteEmbeddedDocuments",
      "Item",
      deleteIds,
      { render: false, netherscrollsTransfer: true }
    );
  }
  if (updates.length) {
    await runNetherscrollsEmbeddedDocumentBatches(
      actor,
      "updateEmbeddedDocuments",
      "Item",
      updates,
      { render: false, netherscrollsTransfer: true }
    );
  }
  const createdDocuments = creates.length
    ? await runNetherscrollsEmbeddedDocumentBatches(
        actor,
        "createEmbeddedDocuments",
        "Item",
        creates,
        { render: false, renderSheet: false, keepId: true, netherscrollsTransfer: true }
      )
    : [];
  const embeddedIds = {};
  for (const update of updates) {
    const id = getNetherscrollsSourceId(update);
    if (id && update._id) embeddedIds[String(id)] = update._id;
  }
  for (const [index, data] of creates.entries()) {
    const id = getNetherscrollsSourceId(data);
    const embeddedId = createdDocuments?.[index]?.id ?? createdDocuments?.[index]?._id;
    if (id && embeddedId) embeddedIds[String(id)] = embeddedId;
  }
  return {
    created: creates.length,
    updated: updates.length,
    deletedDuplicates: duplicateExistingIds.length,
    replacedWrongType: replacedWrongTypeIds.length,
    replacedEffects: replacedEffectIds.length,
    deletedLinked: existingItemIds.size,
    deletedEffects: staleEffectIds.length,
    embeddedIds,
  };
}

/** Determine whether stale character effect. */
function isNetherscrollsStaleCharacterEffect(effect, linkedItemIds, raceEffectNames, characterId) {
  if (isNetherscrollsImportedCharacterDocument(effect, "importedCharacterEffect", characterId))
    return true;
  if (raceEffectNames.has(toTrimmedStringOrNull(effect?.name))) return true;
  const origin = toTrimmedStringOrNull(effect?.origin ?? effect?._source?.origin) ?? "";
  const match = /(?:^|\.)Item\.([A-Za-z0-9_-]+)/.exec(origin);
  return Boolean(match?.[1] && linkedItemIds.has(match[1]));
}

/** Repair character actor document links. */
async function repairNetherscrollsCharacterActorDocumentLinks(
  actor,
  character = null,
  embeddedIds = {}
) {
  if (!actor?.update) return {};
  const references = [
    {
      path: "system.details.background",
      label: "background",
      types: new Set(["background"]),
      netherscrollsId: getNetherscrollsCharacterBackgroundId(character),
    },
    {
      path: "system.details.race",
      label: "race",
      types: new Set(["race", "species"]),
      netherscrollsId: normalizeNetherscrollsReferenceValue(
        character?.raceId ??
          character?.speciesId ??
          character?.race?.raceId ??
          character?.race?.id ??
          character?.species?.speciesId ??
          character?.species?.id
      ),
    },
    {
      path: "system.details.originalClass",
      label: "original class",
      types: new Set(["class"]),
      netherscrollsId: getNetherscrollsCharacterOriginalClassId(character),
    },
  ];
  const items = getNetherscrollsActorItems(actor);
  const updates = {};
  const repaired = {};

  for (const reference of references) {
    if (!reference.netherscrollsId) continue;
    const reconciledId = normalizeNetherscrollsReferenceValue(
      embeddedIds?.[reference.netherscrollsId]
    );
    const item = reconciledId
      ? items.find(
          /** Find the matching entry while repair character actor document links. */ (candidate) =>
            candidate?.id === reconciledId
        )
      : items.find(
          /** Find the matching entry while repair character actor document links. */
          (candidate) =>
            reference.types.has(candidate?.type) &&
            String(getItemNetherId(candidate) ?? "") === reference.netherscrollsId
        );
    const itemId = reconciledId ?? normalizeNetherscrollsReferenceValue(item?.id);
    if (!itemId || (item && !reference.types.has(item.type))) {
      reportNetherscrollsTransferItemError(
        reference.label,
        new Error(`Could not link ${reference.netherscrollsId}; other character data was imported.`)
      );
      continue;
    }
    updates[reference.path] = itemId;
    repaired[reference.path] = itemId;
  }

  if (Object.keys(updates).length) await actor.update(updates, { render: false });
  return repaired;
}

/** Retrieve character original class id. */
function getNetherscrollsCharacterOriginalClassId(character) {
  const direct = normalizeNetherscrollsReferenceValue(
    character?.originalClassId ??
      character?.classId ??
      character?.originalClass?.classId ??
      character?.originalClass?.id ??
      character?.class?.classId ??
      character?.class?.id
  );
  if (direct) return direct;
  const classes = Array.isArray(character?.classes) ? character.classes : [];
  for (const entry of classes) {
    const id = normalizeNetherscrollsReferenceValue(entry?.classId ?? entry?.id);
    if (id) return id;
  }
  return null;
}

/** Replace character-owned effects using stable provenance so a repeated import cannot stack old definitions. */
async function reconcileNetherscrollsCharacterActorEffects(actor, effectSources, characterId) {
  if (!Array.isArray(effectSources) || !effectSources.length) return { created: 0, updated: 0 };
  const existingByKey = new Map();
  const duplicateExistingIds = [];
  for (const effect of Array.from(actor?.effects ?? [])) {
    const key = effect?.getFlag?.(MODULE_ID, "effectKey") ?? effect?.flags?.[MODULE_ID]?.effectKey;
    if (!key) continue;
    const normalizedKey = String(key);
    const existing = existingByKey.get(normalizedKey);
    if (!existing) {
      existingByKey.set(normalizedKey, effect);
      continue;
    }
    const existingImported = isNetherscrollsImportedCharacterDocument(
      existing,
      "importedCharacterEffect",
      characterId
    );
    const effectImported = isNetherscrollsImportedCharacterDocument(
      effect,
      "importedCharacterEffect",
      characterId
    );
    if (existingImported && effectImported && effect?.id) {
      duplicateExistingIds.push(effect.id);
    } else if (!existingImported && effectImported) {
      existingByKey.set(normalizedKey, effect);
    }
  }

  const creates = [];
  const updates = [];
  const pendingByKey = new Map();
  for (const source of effectSources) {
    const data = duplicateNetherscrollsData(source);
    delete data._id;
    delete data.id;
    delete data.parent;
    const key =
      toTrimmedStringOrNull(
        source?.flags?.[MODULE_ID]?.effectKey ??
          source?.netherscrollsId ??
          source?.id ??
          source?.origin ??
          source?.name
      ) ?? buildNetherscrollsStableId(JSON.stringify(source));
    data.flags = data.flags ?? {};
    data.flags[MODULE_ID] = {
      ...(data.flags[MODULE_ID] ?? {}),
      characterId,
      effectKey: key,
      importedCharacterEffect: true,
    };
    const existing = existingByKey.get(key);
    const prepared = existing?.id
      ? { mode: "update", data: { ...data, _id: existing.id } }
      : { mode: "create", data };
    if (pendingByKey.has(key)) {
      const pending = pendingByKey.get(key);
      pending.data = prepared.data;
      pending.mode = prepared.mode;
    } else {
      pendingByKey.set(key, prepared);
    }
  }
  for (const pending of pendingByKey.values()) {
    if (pending.mode === "update") updates.push(pending.data);
    else creates.push(pending.data);
  }
  if (duplicateExistingIds.length && actor?.deleteEmbeddedDocuments) {
    await runNetherscrollsEmbeddedDocumentBatches(
      actor,
      "deleteEmbeddedDocuments",
      "ActiveEffect",
      duplicateExistingIds,
      { render: false, netherscrollsTransfer: true }
    );
  }
  if (updates.length) {
    await runNetherscrollsEmbeddedDocumentBatches(
      actor,
      "updateEmbeddedDocuments",
      "ActiveEffect",
      updates,
      { render: false, netherscrollsTransfer: true }
    );
  }
  if (creates.length) {
    await runNetherscrollsEmbeddedDocumentBatches(
      actor,
      "createEmbeddedDocuments",
      "ActiveEffect",
      creates,
      { render: false, renderSheet: false, netherscrollsTransfer: true }
    );
  }
  return {
    created: creates.length,
    updated: updates.length,
    deletedDuplicates: duplicateExistingIds.length,
  };
}

/** Determine whether imported character document. */
function isNetherscrollsImportedCharacterDocument(document, markerFlag, characterId) {
  const flags = document?.flags?.[MODULE_ID] ?? {};
  const marker = document?.getFlag?.(MODULE_ID, markerFlag) ?? flags[markerFlag];
  const linkedCharacterId = document?.getFlag?.(MODULE_ID, "characterId") ?? flags.characterId;
  return Boolean(
    marker && (!characterId || String(linkedCharacterId ?? "") === String(characterId))
  );
}

export {
  reconcileNetherscrollsCharacterActorEffects,
  reconcileNetherscrollsCharacterActorItems,
  repairNetherscrollsCharacterActorDocumentLinks,
};
