/**
 * Import each library dataset using its converter, folder layout, and batched writes.
 * Stable service identities preserve existing documents and prevent repeated imports from stacking.
 */
import { MODULE_ID } from "../core/constants.js";
import {
  createNetherscrollsMainThreadBudget,
  duplicateNetherscrollsData,
  toTrimmedStringOrNull,
  yieldNetherscrollsMainThreadIfNeeded,
} from "../core/utils.js";
import { getNetherscrollsSubclassClassId } from "../data/character-items.js";
import {
  getNetherscrollsClassFeatureItemDescriptors,
  getNetherscrollsSubclasses,
  getStaleNetherscrollsClassFeatureDocumentIds,
  normalizeNetherscrollsClassFeatureData,
} from "../data/class-features.js";
import {
  normalizeNetherscrollsClassData,
  normalizeNetherscrollsSubclassData,
} from "../data/classes.js";
import { normalizeNetherscrollsFeatData } from "../data/feats.js";
import { normalizeNetherscrollsImportImagePath } from "../data/images.js";
import { applyNetherscrollsImportFlags } from "../data/item-fields.js";
import { normalizeNetherscrollsItemData } from "../data/items.js";
import {
  buildNetherscrollsCompendiumItemUuid,
  getNetherscrollsFoundryItemPayload,
  getNetherscrollsImportTypeLabel,
  getNetherscrollsSourceId,
  isNetherscrollsDeleted,
} from "../data/references.js";
import { normalizeNetherscrollsSpellData } from "../data/spells.js";
import { getCompendiumDocumentsByNetherId } from "../foundry/compendium-index.js";
import {
  ensureNetherscrollsImportPackWritable,
  getNetherscrollsImportPack,
} from "../foundry/compendiums.js";
import { runNetherscrollsCompendiumDocumentBatches } from "../foundry/documents.js";
import { haveSameNetherscrollsEmbeddedEffects } from "../foundry/effects.js";
import {
  cleanupNetherscrollsLegacyClassFeatureFolders,
  ensureNetherscrollsClassFeatureFolder,
  ensureNetherscrollsClassFeatureFolderTree,
  ensureNetherscrollsClassFolder,
  ensureNetherscrollsClassFolderTree,
  ensureNetherscrollsFeatFolder,
  ensureNetherscrollsFeatFolderTree,
  ensureNetherscrollsItemFolder,
  ensureNetherscrollsItemFolderTree,
  ensureNetherscrollsSpellFolder,
  ensureNetherscrollsSpellFolderTree,
  ensureNetherscrollsSubclassFolder,
  ensureNetherscrollsSubclassFolderTree,
} from "../foundry/folders.js";

/** Create feature documents before class advancements so grant UUIDs point to real compendium records. */
async function importNetherscrollsClasses(classes) {
  const classPack = await getNetherscrollsImportPack("classes");
  if (!classPack) throw new Error("Netherscrolls Classes compendium pack was not found.");

  const subclassPack = await getNetherscrollsImportPack("subclasses");
  if (!subclassPack) throw new Error("Netherscrolls Subclasses compendium pack was not found.");

  const featurePack = await getNetherscrollsImportPack("classFeatures");
  if (!featurePack) throw new Error("Netherscrolls Class Features compendium pack was not found.");

  await ensureNetherscrollsImportPackWritable(classPack);
  await ensureNetherscrollsImportPackWritable(subclassPack);
  await ensureNetherscrollsImportPackWritable(featurePack);

  const featureResult = await importNetherscrollsClassFeatureItems(classes, featurePack);
  const existingClassesByNetherId = await getCompendiumDocumentsByNetherId(classPack);
  const existingSubclassesByNetherId = await getCompendiumDocumentsByNetherId(subclassPack);
  const classData = [];
  const subclassData = [];
  const classDeleteIds = [];
  const subclassDeleteIds = [];
  const legacySubclassDeleteIds = [];
  const classFolderCache = new Map();
  const subclassFolderCache = new Map();
  await ensureNetherscrollsClassFolderTree(classPack, classFolderCache);
  await ensureNetherscrollsSubclassFolderTree(subclassPack, subclassFolderCache);
  const preparationBudget = createNetherscrollsMainThreadBudget();

  for (const classSource of classes) {
    const classNetherscrollsId = getNetherscrollsSourceId(classSource);
    if (isNetherscrollsDeleted(classSource)) {
      const existing = classNetherscrollsId
        ? existingClassesByNetherId.get(String(classNetherscrollsId))
        : null;
      if (existing?.id) classDeleteIds.push(existing.id);

      for (const subclassSource of getNetherscrollsSubclasses(classSource)) {
        const subclassNetherscrollsId = getNetherscrollsSourceId(subclassSource);
        const existingSubclass = subclassNetherscrollsId
          ? existingSubclassesByNetherId.get(String(subclassNetherscrollsId))
          : null;
        if (existingSubclass?.id) subclassDeleteIds.push(existingSubclass.id);
        const legacySubclass = subclassNetherscrollsId
          ? existingClassesByNetherId.get(String(subclassNetherscrollsId))
          : null;
        if (legacySubclass?.id && legacySubclass?.type === "subclass") {
          legacySubclassDeleteIds.push(legacySubclass.id);
        }
      }
      await yieldNetherscrollsMainThreadIfNeeded(preparationBudget);
      continue;
    }

    const preparedClass = normalizeNetherscrollsClassData(classSource, {
      featureUuidByKey: featureResult.uuidByKey,
    });
    // A Foundry Export payload includes the source compendium document's
    // local `_id`. It must not be retained after a character refresh has
    // deliberately removed that document; otherwise Foundry treats a new
    // canonical class as an update to a document that no longer exists.
    delete preparedClass._id;
    delete preparedClass.id;
    if (classNetherscrollsId && existingClassesByNetherId.has(String(classNetherscrollsId))) {
      preparedClass._id = existingClassesByNetherId.get(String(classNetherscrollsId)).id;
    }
    const classFolder = await ensureNetherscrollsClassFolder(
      classPack,
      preparedClass,
      classFolderCache
    );
    if (classFolder?.id) preparedClass.folder = classFolder.id;
    classData.push(preparedClass);

    for (const subclassSource of getNetherscrollsSubclasses(classSource)) {
      const subclassNetherscrollsId = getNetherscrollsSourceId(subclassSource);
      if (isNetherscrollsDeleted(subclassSource)) {
        const existing = subclassNetherscrollsId
          ? existingSubclassesByNetherId.get(String(subclassNetherscrollsId))
          : null;
        if (existing?.id) subclassDeleteIds.push(existing.id);
        const legacySubclass = subclassNetherscrollsId
          ? existingClassesByNetherId.get(String(subclassNetherscrollsId))
          : null;
        if (legacySubclass?.id && legacySubclass?.type === "subclass") {
          legacySubclassDeleteIds.push(legacySubclass.id);
        }
        await yieldNetherscrollsMainThreadIfNeeded(preparationBudget);
        continue;
      }

      const preparedSubclass = normalizeNetherscrollsSubclassData(subclassSource, classSource, {
        featureUuidByKey: featureResult.uuidByKey,
      });
      // See the corresponding class cleanup above. A nested Foundry subclass
      // can carry an obsolete local compendium `_id` as well.
      delete preparedSubclass._id;
      delete preparedSubclass.id;
      if (
        subclassNetherscrollsId &&
        existingSubclassesByNetherId.has(String(subclassNetherscrollsId))
      ) {
        preparedSubclass._id = existingSubclassesByNetherId.get(String(subclassNetherscrollsId)).id;
      }
      const subclassFolder = await ensureNetherscrollsSubclassFolder(
        subclassPack,
        preparedSubclass,
        classSource,
        subclassFolderCache
      );
      if (subclassFolder?.id) preparedSubclass.folder = subclassFolder.id;
      subclassData.push(preparedSubclass);

      const legacySubclass = subclassNetherscrollsId
        ? existingClassesByNetherId.get(String(subclassNetherscrollsId))
        : null;
      if (legacySubclass?.id && legacySubclass?.type === "subclass") {
        legacySubclassDeleteIds.push(legacySubclass.id);
      }
    }
    await yieldNetherscrollsMainThreadIfNeeded(preparationBudget);
  }

  const ItemClass = Item?.implementation ?? Item;
  const uniqueClassDeleteIds = Array.from(new Set([...classDeleteIds, ...legacySubclassDeleteIds]));
  const uniqueSubclassDeleteIds = Array.from(new Set(subclassDeleteIds));
  if (uniqueClassDeleteIds.length) {
    await runNetherscrollsCompendiumDocumentBatches(
      ItemClass,
      "deleteDocuments",
      uniqueClassDeleteIds,
      classPack
    );
  }
  if (uniqueSubclassDeleteIds.length) {
    await runNetherscrollsCompendiumDocumentBatches(
      ItemClass,
      "deleteDocuments",
      uniqueSubclassDeleteIds,
      subclassPack
    );
  }

  const classUpdates = classData.filter(
    /** Keep entries that satisfy the condition while import classes. */ (item) => item._id
  );
  const classCreates = classData.filter(
    /** Keep entries that satisfy the condition while import classes. */ (item) => !item._id
  );
  const subclassUpdates = subclassData.filter(
    /** Keep entries that satisfy the condition while import classes. */ (item) => item._id
  );
  const subclassCreates = subclassData.filter(
    /** Keep entries that satisfy the condition while import classes. */ (item) => !item._id
  );
  if (classUpdates.length) {
    await runNetherscrollsCompendiumDocumentBatches(
      ItemClass,
      "updateDocuments",
      classUpdates,
      classPack
    );
  }
  if (subclassUpdates.length) {
    await runNetherscrollsCompendiumDocumentBatches(
      ItemClass,
      "updateDocuments",
      subclassUpdates,
      subclassPack
    );
  }

  const createdClasses = classCreates.length
    ? await runNetherscrollsCompendiumDocumentBatches(
        ItemClass,
        "createDocuments",
        classCreates,
        classPack
      )
    : [];
  const createdSubclasses = subclassCreates.length
    ? await runNetherscrollsCompendiumDocumentBatches(
        ItemClass,
        "createDocuments",
        subclassCreates,
        subclassPack
      )
    : [];
  return {
    created: createdClasses.length,
    updated: classUpdates.length,
    deleted: uniqueClassDeleteIds.length,
    subclasses: {
      created: createdSubclasses.length,
      updated: subclassUpdates.length,
      deleted: uniqueSubclassDeleteIds.length,
      migrated: Array.from(new Set(legacySubclassDeleteIds)).length,
    },
    features: featureResult.counts,
  };
}

/** Import class feature items. */
async function importNetherscrollsClassFeatureItems(classes, pack) {
  const existingByNetherId = await getCompendiumDocumentsByNetherId(pack);
  const descriptors = getNetherscrollsClassFeatureItemDescriptors(classes);
  const featureData = [];
  const deleteIds = [];
  const uuidByKey = new Map();
  const folderCache = new Map();
  await ensureNetherscrollsClassFeatureFolderTree(pack, folderCache);
  const preparationBudget = createNetherscrollsMainThreadBudget();

  for (const descriptor of descriptors) {
    if (descriptor.deleted) {
      const existing = descriptor.netherscrollsId
        ? existingByNetherId.get(String(descriptor.netherscrollsId))
        : null;
      if (existing?.id) deleteIds.push(existing.id);
      await yieldNetherscrollsMainThreadIfNeeded(preparationBudget);
      continue;
    }

    const prepared = normalizeNetherscrollsClassFeatureData(descriptor);
    if (descriptor.netherscrollsId && existingByNetherId.has(String(descriptor.netherscrollsId))) {
      prepared._id = existingByNetherId.get(String(descriptor.netherscrollsId)).id;
      uuidByKey.set(descriptor.key, buildNetherscrollsCompendiumItemUuid(pack, prepared._id));
    }
    const folder = await ensureNetherscrollsClassFeatureFolder(pack, descriptor, folderCache);
    if (folder?.id) prepared.folder = folder.id;
    featureData.push(prepared);
    await yieldNetherscrollsMainThreadIfNeeded(preparationBudget);
  }

  deleteIds.push(
    ...(await getStaleNetherscrollsClassFeatureDocumentIds(pack, classes, descriptors))
  );

  const ItemClass = Item?.implementation ?? Item;
  const uniqueDeleteIds = Array.from(new Set(deleteIds));
  if (uniqueDeleteIds.length) {
    await runNetherscrollsCompendiumDocumentBatches(
      ItemClass,
      "deleteDocuments",
      uniqueDeleteIds,
      pack
    );
  }

  const updates = featureData.filter(
    /** Keep entries that satisfy the condition while import class feature items. */ (item) =>
      item._id
  );
  const creates = featureData.filter(
    /** Keep entries that satisfy the condition while import class feature items. */ (item) =>
      !item._id
  );
  if (updates.length) {
    await runNetherscrollsCompendiumDocumentBatches(ItemClass, "updateDocuments", updates, pack);
  }

  let created = [];
  if (creates.length) {
    created = await runNetherscrollsCompendiumDocumentBatches(
      ItemClass,
      "createDocuments",
      creates,
      pack
    );
    for (const createdDocument of created) {
      const featureKey =
        createdDocument?.getFlag?.(MODULE_ID, "featureKey") ??
        createdDocument?.flags?.[MODULE_ID]?.featureKey;
      if (featureKey && createdDocument?.id) {
        uuidByKey.set(featureKey, buildNetherscrollsCompendiumItemUuid(pack, createdDocument.id));
      }
    }
  }

  await cleanupNetherscrollsLegacyClassFeatureFolders(pack).catch(
    /** Handle the operation failure while import class feature items. */ (err) => {
      console.warn("Netherscrolls legacy class feature folder cleanup failed.", err);
    }
  );

  return {
    uuidByKey,
    counts: {
      created: created.length,
      updated: updates.length,
      deleted: uniqueDeleteIds.length,
    },
  };
}

/** Import items. */
async function importNetherscrollsItems(items) {
  const pack = await getNetherscrollsImportPack("items");
  if (!pack) throw new Error("Netherscrolls Items compendium pack was not found.");
  await ensureNetherscrollsImportPackWritable(pack);

  const existingByNetherId = await getCompendiumDocumentsByNetherId(pack);
  const itemData = [];
  const deleteIds = [];
  const folderCache = new Map();
  await ensureNetherscrollsItemFolderTree(pack, folderCache);
  const preparationBudget = createNetherscrollsMainThreadBudget();

  for (const item of items) {
    const netherscrollsId = getNetherscrollsSourceId(item);
    if (isNetherscrollsDeleted(item)) {
      const existing = netherscrollsId ? existingByNetherId.get(String(netherscrollsId)) : null;
      if (existing?.id) deleteIds.push(existing.id);
      await yieldNetherscrollsMainThreadIfNeeded(preparationBudget);
      continue;
    }

    const prepared = normalizeNetherscrollsItemData(item);
    if (netherscrollsId && existingByNetherId.has(String(netherscrollsId))) {
      prepared._id = existingByNetherId.get(String(netherscrollsId)).id;
    }
    const folder = await ensureNetherscrollsItemFolder(pack, prepared, folderCache);
    if (folder?.id) prepared.folder = folder.id;
    itemData.push(prepared);
    await yieldNetherscrollsMainThreadIfNeeded(preparationBudget);
  }

  const ItemClass = Item?.implementation ?? Item;
  if (deleteIds.length) {
    await runNetherscrollsCompendiumDocumentBatches(ItemClass, "deleteDocuments", deleteIds, pack);
  }

  const updates = itemData.filter(
    /** Keep entries that satisfy the condition while import items. */ (item) => item._id
  );
  const creates = itemData.filter(
    /** Keep entries that satisfy the condition while import items. */ (item) => !item._id
  );
  if (updates.length) {
    await runNetherscrollsCompendiumDocumentBatches(ItemClass, "updateDocuments", updates, pack);
  }

  if (!creates.length) {
    return { created: 0, updated: updates.length, deleted: deleteIds.length };
  }

  const created = await runNetherscrollsCompendiumDocumentBatches(
    ItemClass,
    "createDocuments",
    creates,
    pack
  );
  return {
    created: created.length,
    updated: updates.length,
    deleted: deleteIds.length,
  };
}

/** Import feats. */
async function importNetherscrollsFeats(feats) {
  const pack = await getNetherscrollsImportPack("feats");
  if (!pack) throw new Error("Netherscrolls Feats compendium pack was not found.");
  await ensureNetherscrollsImportPackWritable(pack);

  const existingByNetherId = await getCompendiumDocumentsByNetherId(pack);
  const featData = [];
  const deleteIds = [];
  const folderCache = new Map();
  await ensureNetherscrollsFeatFolderTree(pack, folderCache);
  const preparationBudget = createNetherscrollsMainThreadBudget();

  for (const feat of feats) {
    const netherscrollsId = getNetherscrollsSourceId(feat);
    if (isNetherscrollsDeleted(feat)) {
      const existing = netherscrollsId ? existingByNetherId.get(String(netherscrollsId)) : null;
      if (existing?.id) deleteIds.push(existing.id);
      await yieldNetherscrollsMainThreadIfNeeded(preparationBudget);
      continue;
    }

    const prepared = normalizeNetherscrollsFeatData(feat);
    if (netherscrollsId && existingByNetherId.has(String(netherscrollsId))) {
      prepared._id = existingByNetherId.get(String(netherscrollsId)).id;
    }
    const folder = await ensureNetherscrollsFeatFolder(pack, prepared, folderCache);
    if (folder?.id) prepared.folder = folder.id;
    featData.push(prepared);
    await yieldNetherscrollsMainThreadIfNeeded(preparationBudget);
  }

  const ItemClass = Item?.implementation ?? Item;
  if (deleteIds.length) {
    await runNetherscrollsCompendiumDocumentBatches(ItemClass, "deleteDocuments", deleteIds, pack);
  }

  const updates = featData.filter(
    /** Keep entries that satisfy the condition while import feats. */ (feat) => feat._id
  );
  const creates = featData.filter(
    /** Keep entries that satisfy the condition while import feats. */ (feat) => !feat._id
  );
  if (updates.length) {
    await runNetherscrollsCompendiumDocumentBatches(ItemClass, "updateDocuments", updates, pack);
  }

  if (!creates.length) {
    return { created: 0, updated: updates.length, deleted: deleteIds.length };
  }

  const created = await runNetherscrollsCompendiumDocumentBatches(
    ItemClass,
    "createDocuments",
    creates,
    pack
  );
  return {
    created: created.length,
    updated: updates.length,
    deleted: deleteIds.length,
  };
}

/** Import spells. */
async function importNetherscrollsSpells(spells) {
  const pack = await getNetherscrollsImportPack("spells");
  if (!pack) throw new Error("Netherscrolls Spells compendium pack was not found.");
  await ensureNetherscrollsImportPackWritable(pack);

  const existingByNetherId = await getCompendiumDocumentsByNetherId(pack);
  const spellData = [];
  const deleteIds = [];
  const folderCache = new Map();
  await ensureNetherscrollsSpellFolderTree(pack, folderCache);
  const preparationBudget = createNetherscrollsMainThreadBudget();
  for (const spell of spells) {
    const netherscrollsId = getNetherscrollsSourceId(spell);
    if (isNetherscrollsDeleted(spell)) {
      const existing = netherscrollsId ? existingByNetherId.get(String(netherscrollsId)) : null;
      if (existing?.id) deleteIds.push(existing.id);
      await yieldNetherscrollsMainThreadIfNeeded(preparationBudget);
      continue;
    }

    const prepared = normalizeNetherscrollsSpellData(spell);
    if (netherscrollsId && existingByNetherId.has(String(netherscrollsId))) {
      prepared._id = existingByNetherId.get(String(netherscrollsId)).id;
    }
    const folder = await ensureNetherscrollsSpellFolder(pack, prepared, folderCache);
    if (folder?.id) prepared.folder = folder.id;
    spellData.push(prepared);
    await yieldNetherscrollsMainThreadIfNeeded(preparationBudget);
  }

  const ItemClass = Item?.implementation ?? Item;
  if (deleteIds.length) {
    await runNetherscrollsCompendiumDocumentBatches(ItemClass, "deleteDocuments", deleteIds, pack);
  }

  const updates = spellData.filter(
    /** Keep entries that satisfy the condition while import spells. */ (spell) => spell._id
  );
  const creates = spellData.filter(
    /** Keep entries that satisfy the condition while import spells. */ (spell) => !spell._id
  );
  if (updates.length) {
    await runNetherscrollsCompendiumDocumentBatches(ItemClass, "updateDocuments", updates, pack);
  }

  if (!creates.length) {
    return { created: 0, updated: updates.length, deleted: deleteIds.length };
  }

  const created = await runNetherscrollsCompendiumDocumentBatches(
    ItemClass,
    "createDocuments",
    creates,
    pack
  );
  return {
    created: created.length,
    updated: updates.length,
    deleted: deleteIds.length,
  };
}

// An ItemGrant step that grants nothing only shows as an empty step during level-up (Variant
// Aasimar's "Celestial Legacy (Spells)" arrives without its spells).
function removeNetherscrollsEmptyItemGrants(system) {
  const advancement = system?.advancement;
  if (!advancement || typeof advancement !== "object") return;
  const isEmpty = /** Determine whether empty. */ (entry) =>
    entry?.type === "ItemGrant" && !(entry.configuration?.items ?? []).length;
  if (Array.isArray(advancement)) {
    system.advancement = advancement.filter(
      /** Keep entries that satisfy the condition while remove empty item grants. */ (entry) =>
        !isEmpty(entry)
    );
    return;
  }
  for (const [id, entry] of Object.entries(advancement)) {
    if (isEmpty(entry)) delete advancement[id];
  }
}

/** Normalize generic library rows and recreate incompatible definitions rather than stacking embedded effects. */
async function importNetherscrollsGenericFoundryItems(rows, typeKey) {
  const pack = await getNetherscrollsImportPack(typeKey);
  if (!pack)
    throw new Error(
      `Netherscrolls ${getNetherscrollsImportTypeLabel(typeKey)} compendium pack was not found.`
    );
  await ensureNetherscrollsImportPackWritable(pack);

  const existingByNetherId = await getCompendiumDocumentsByNetherId(pack);
  const itemData = [];
  const deleteIds = [];
  const preparationBudget = createNetherscrollsMainThreadBudget();
  for (const row of rows) {
    const netherscrollsId = getNetherscrollsSourceId(row);
    if (isNetherscrollsDeleted(row)) {
      const existing = netherscrollsId ? existingByNetherId.get(String(netherscrollsId)) : null;
      if (existing?.id) deleteIds.push(existing.id);
      await yieldNetherscrollsMainThreadIfNeeded(preparationBudget);
      continue;
    }

    const foundryItem = getNetherscrollsFoundryItemPayload(row);
    const source = duplicateNetherscrollsData(foundryItem ?? row);
    delete source._id;
    delete source.id;
    delete source.folder;
    source.name =
      toTrimmedStringOrNull(source.name) ??
      toTrimmedStringOrNull(row?.name) ??
      "Netherscrolls Content";
    const fallbackTypes = {
      backgrounds: "background",
      races: "race",
      subclasses: "subclass",
    };
    source.type = toTrimmedStringOrNull(source.type) ?? fallbackTypes[typeKey] ?? "loot";
    source.img = normalizeNetherscrollsImportImagePath(row?.img, row?.image, source.img);
    source.system ??= {};
    source.effects ??= [];
    removeNetherscrollsEmptyItemGrants(source.system);
    // Races arrive without a Foundry payload (and a payload can omit its text):
    // fall back to the row's top-level HTML whenever the document has none.
    if (!toTrimmedStringOrNull(source.system.description?.value)) {
      const description =
        toTrimmedStringOrNull(row?.descriptionHtml) ?? toTrimmedStringOrNull(row?.description);
      if (description) {
        source.system.description = { ...(source.system.description ?? {}), value: description };
      }
    }
    applyNetherscrollsImportFlags(source, row, netherscrollsId);
    if (source.type === "subclass") {
      const classId = getNetherscrollsSubclassClassId(row, foundryItem);
      if (classId) source.flags.netherscrolls.classId = classId;
    }
    if (netherscrollsId && existingByNetherId.has(String(netherscrollsId))) {
      const existing = existingByNetherId.get(String(netherscrollsId));
      if (fallbackTypes[typeKey] && toTrimmedStringOrNull(existing?.type) !== source.type) {
        if (existing?.id) deleteIds.push(existing.id);
      } else if (!haveSameNetherscrollsEmbeddedEffects(existing, source)) {
        // Recreate the canonical library Item when its effect set changed.
        // Updating nested ActiveEffects can append them rather than remove old
        // entries, which makes racial bonuses stack after repeated imports.
        if (existing?.id) deleteIds.push(existing.id);
      } else {
        source._id = existing.id;
        delete source.effects;
      }
    }
    itemData.push(source);
    await yieldNetherscrollsMainThreadIfNeeded(preparationBudget);
  }

  const ItemClass = Item?.implementation ?? Item;
  const uniqueDeleteIds = Array.from(new Set(deleteIds));
  if (uniqueDeleteIds.length) {
    await runNetherscrollsCompendiumDocumentBatches(
      ItemClass,
      "deleteDocuments",
      uniqueDeleteIds,
      pack
    );
  }

  const updates = itemData.filter(
    /** Keep entries that satisfy the condition while import generic foundry items. */ (item) =>
      item._id
  );
  const creates = itemData.filter(
    /** Keep entries that satisfy the condition while import generic foundry items. */ (item) =>
      !item._id
  );
  if (updates.length) {
    await runNetherscrollsCompendiumDocumentBatches(ItemClass, "updateDocuments", updates, pack);
  }
  const created = creates.length
    ? await runNetherscrollsCompendiumDocumentBatches(ItemClass, "createDocuments", creates, pack)
    : [];
  return {
    created: created.length,
    updated: updates.length,
    deleted: uniqueDeleteIds.length,
  };
}

export {
  importNetherscrollsClasses,
  importNetherscrollsFeats,
  importNetherscrollsGenericFoundryItems,
  importNetherscrollsItems,
  importNetherscrollsSpells,
};
