/**
 * Build and maintain the managed compendium folder trees.
 * Reuse indexed folders during imports and remove legacy folders only after moving their documents.
 */
import { MODULE_ID, NETHERSCROLLS_PACK_FOLDER_INDEX_READY } from "../core/constants.js";
import { getDocumentId, toTrimmedStringOrNull } from "../core/utils.js";
import {
  NETHERSCROLLS_FEAT_FOLDERS,
  NETHERSCROLLS_ITEM_FOLDERS,
  NETHERSCROLLS_LEGACY_CLASS_FEATURE_FOLDER_NAME,
  NETHERSCROLLS_MAIN_CLASS_FEATURE_FOLDER_NAME,
  NETHERSCROLLS_MAX_SPELL_LEVEL,
  NETHERSCROLLS_SPELL_LEVEL_FOLDERS,
  NETHERSCROLLS_SPELL_SCHOOLS,
} from "../data/catalogs.js";
import { normalizeNetherscrollsItemDocumentType } from "../data/items.js";
import { getNetherscrollsSpellLevel, getNetherscrollsSpellSchool } from "../data/spell-fields.js";
import { getPackDocumentClass, getPackFolders, getPackIndexEntries } from "./collections.js";
import { runNetherscrollsCompendiumDocumentBatches } from "./documents.js";

/** Ensure class folder tree. */
async function ensureNetherscrollsClassFolderTree(pack, folderCache) {
  await findOrCreatePackFolder(pack, {
    cache: folderCache,
    name: "Classes",
    type: "Item",
    parent: null,
    sort: 1000,
  });
}

/** Ensure subclass folder tree. */
async function ensureNetherscrollsSubclassFolderTree(pack, folderCache) {
  await findOrCreatePackFolder(pack, {
    cache: folderCache,
    name: "Subclasses",
    type: "Item",
    parent: null,
    sort: 1000,
  });
}

/** Ensure class folder. */
async function ensureNetherscrollsClassFolder(pack, classData, folderCache) {
  return findOrCreatePackFolder(pack, {
    cache: folderCache,
    name: "Classes",
    type: "Item",
    parent: null,
    sort: 1000,
  });
}

/** Ensure subclass folder. */
async function ensureNetherscrollsSubclassFolder(pack, subclassData, classSource, folderCache) {
  const root = await findOrCreatePackFolder(pack, {
    cache: folderCache,
    name: "Subclasses",
    type: "Item",
    parent: null,
    sort: 1000,
  });

  return findOrCreatePackFolder(pack, {
    cache: folderCache,
    name: toTrimmedStringOrNull(classSource?.name) ?? "Unknown Class",
    type: "Item",
    parent: root,
    sort: 1000,
  });
}

/** Ensure class feature folder tree. */
async function ensureNetherscrollsClassFeatureFolderTree(pack, folderCache) {
  return folderCache;
}

/** Ensure class feature folder. */
async function ensureNetherscrollsClassFeatureFolder(pack, descriptor, folderCache) {
  const classFolder = await findOrCreatePackFolder(pack, {
    cache: folderCache,
    name: toTrimmedStringOrNull(descriptor.classSource?.name) ?? "Unknown Class",
    type: "Item",
    parent: null,
    sort: 1000,
  });

  if (
    descriptor.scope === "class" ||
    (descriptor.scope === "choice" && !descriptor.subclassSource)
  ) {
    return ensureNetherscrollsMainClassFeatureFolder(pack, classFolder, folderCache);
  }

  return findOrCreatePackFolder(pack, {
    cache: folderCache,
    name: toTrimmedStringOrNull(descriptor.subclassSource?.name) ?? "Subclass Features",
    type: "Item",
    parent: classFolder,
    sort: 2000,
  });
}

/** Ensure main class feature folder. */
async function ensureNetherscrollsMainClassFeatureFolder(pack, classFolder, folderCache) {
  const cacheKey = getPackFolderCacheKey({
    name: NETHERSCROLLS_MAIN_CLASS_FEATURE_FOLDER_NAME,
    type: "Item",
    parent: classFolder,
  });
  if (folderCache?.has(cacheKey)) return folderCache.get(cacheKey);
  await prepareNetherscrollsPackFolderIndex(pack, folderCache);

  const existing = findPackFolder(pack, {
    name: NETHERSCROLLS_MAIN_CLASS_FEATURE_FOLDER_NAME,
    type: "Item",
    parent: classFolder,
  });
  const legacy = findPackFolder(pack, {
    name: NETHERSCROLLS_LEGACY_CLASS_FEATURE_FOLDER_NAME,
    type: "Item",
    parent: classFolder,
  });

  if (existing) {
    await updatePackFolderSort(existing, pack, 1000);
    if (legacy && getDocumentId(legacy) !== getDocumentId(existing)) {
      await movePackFolderDocuments(pack, legacy, existing);
      await deletePackFolderIfEmpty(pack, legacy);
    }
    return existing;
  }

  if (legacy) {
    if (typeof legacy.update === "function") {
      await legacy.update(
        {
          name: NETHERSCROLLS_MAIN_CLASS_FEATURE_FOLDER_NAME,
          sorting: "m",
          sort: 1000,
        },
        { pack: pack.collection, render: false, netherscrollsTransfer: true }
      );
      folderCache?.set(
        getPackFolderCacheKey({
          name: NETHERSCROLLS_MAIN_CLASS_FEATURE_FOLDER_NAME,
          type: "Item",
          parent: classFolder,
        }),
        legacy
      );
      return legacy;
    }

    await updatePackFolderSort(legacy, pack, 1000);
    return legacy;
  }

  return findOrCreatePackFolder(pack, {
    cache: folderCache,
    name: NETHERSCROLLS_MAIN_CLASS_FEATURE_FOLDER_NAME,
    type: "Item",
    parent: classFolder,
    sort: 1000,
  });
}

/** Ensure item folder tree. */
async function ensureNetherscrollsItemFolderTree(pack, folderCache) {
  for (const folderDefinition of NETHERSCROLLS_ITEM_FOLDERS) {
    await findOrCreatePackFolder(pack, {
      cache: folderCache,
      name: folderDefinition.label,
      type: "Item",
      parent: null,
      sort: folderDefinition.sort,
    });
  }
}

/** Ensure item folder. */
async function ensureNetherscrollsItemFolder(pack, itemData, folderCache) {
  const folderDefinition = getNetherscrollsItemFolder(itemData);
  return findOrCreatePackFolder(pack, {
    cache: folderCache,
    name: folderDefinition.label,
    type: "Item",
    parent: null,
    sort: folderDefinition.sort,
  });
}

/** Retrieve item folder. */
function getNetherscrollsItemFolder(itemData) {
  const type = normalizeNetherscrollsItemDocumentType(itemData);
  return (
    NETHERSCROLLS_ITEM_FOLDERS.find(
      /** Find the matching entry while retrieve item folder. */ (folder) => folder.type === type
    ) ??
    NETHERSCROLLS_ITEM_FOLDERS.find(
      /** Find the matching entry while retrieve item folder. */ (folder) => folder.type === "loot"
    )
  );
}

/** Ensure feat folder tree. */
async function ensureNetherscrollsFeatFolderTree(pack, folderCache) {
  for (const folderDefinition of NETHERSCROLLS_FEAT_FOLDERS) {
    await findOrCreatePackFolder(pack, {
      cache: folderCache,
      name: folderDefinition.label,
      type: "Item",
      parent: null,
      sort: folderDefinition.sort,
    });
  }
}

/** Ensure feat folder. */
async function ensureNetherscrollsFeatFolder(pack, featData, folderCache) {
  const folderDefinition = getNetherscrollsFeatFolder(featData);
  return findOrCreatePackFolder(pack, {
    cache: folderCache,
    name: folderDefinition.label,
    type: "Item",
    parent: null,
    sort: folderDefinition.sort,
  });
}

/** Retrieve feat folder. */
function getNetherscrollsFeatFolder(featData) {
  const isDemifeat =
    featData?.demifeat === true ||
    featData?.flags?.[MODULE_ID]?.demifeat === true ||
    featData?.system?.flags?.[MODULE_ID]?.demifeat === true;
  const key = isDemifeat ? "demifeat" : "feat";
  return (
    NETHERSCROLLS_FEAT_FOLDERS.find(
      /** Find the matching entry while retrieve feat folder. */ (folder) => folder.key === key
    ) ?? NETHERSCROLLS_FEAT_FOLDERS[0]
  );
}

/** Ensure spell folder tree. */
async function ensureNetherscrollsSpellFolderTree(pack, folderCache) {
  for (const levelDefinition of NETHERSCROLLS_SPELL_LEVEL_FOLDERS) {
    const levelFolder = await findOrCreatePackFolder(pack, {
      cache: folderCache,
      name: levelDefinition.label,
      type: "Item",
      parent: null,
      sort: levelDefinition.sort,
    });

    for (const schoolDefinition of NETHERSCROLLS_SPELL_SCHOOLS) {
      await findOrCreatePackFolder(pack, {
        cache: folderCache,
        name: schoolDefinition.label,
        type: "Item",
        parent: levelFolder,
        sort: schoolDefinition.sort,
      });
    }
  }
}

/** Ensure spell folder. */
async function ensureNetherscrollsSpellFolder(pack, spellData, folderCache) {
  const level = getNetherscrollsSpellLevel(spellData);
  const levelDefinition = getNetherscrollsSpellLevelFolder(level);
  const schoolDefinition = getNetherscrollsSpellSchool(spellData);
  const levelFolder = await findOrCreatePackFolder(pack, {
    cache: folderCache,
    name: levelDefinition.label,
    type: "Item",
    parent: null,
    sort: levelDefinition.sort,
  });

  return findOrCreatePackFolder(pack, {
    cache: folderCache,
    name: schoolDefinition.label,
    type: "Item",
    parent: levelFolder,
    sort: schoolDefinition.sort,
  });
}

/** Find or create pack folder. */
async function findOrCreatePackFolder(pack, { cache, name, type, parent, sort = null }) {
  const parentId = getDocumentId(parent);
  const cacheKey = getPackFolderCacheKey({ name, type, parent });
  if (cache?.has(cacheKey)) return cache.get(cacheKey);

  await prepareNetherscrollsPackFolderIndex(pack, cache);
  const existing = findPackFolder(pack, { name, type, parent });

  if (existing) {
    await updatePackFolderSort(existing, pack, sort);
    cache?.set(cacheKey, existing);
    return existing;
  }

  const FolderClass = Folder?.implementation ?? Folder;
  const created = await FolderClass.create(
    {
      name,
      type,
      sorting: "m",
      folder: parentId,
      sort: sort ?? 0,
    },
    { pack: pack.collection, render: false, netherscrollsTransfer: true }
  );
  cache?.set(cacheKey, created);
  return created;
}

/** Prepare pack folder index. */
async function prepareNetherscrollsPackFolderIndex(pack, cache) {
  if (cache?.has(NETHERSCROLLS_PACK_FOLDER_INDEX_READY)) return;
  await pack
    .getIndex({ fields: ["folder", "name", "type"] })
    .catch(/** Handle the operation failure while prepare pack folder index. */ () => null);
  cache?.set(NETHERSCROLLS_PACK_FOLDER_INDEX_READY, true);
}

/** Retrieve pack folder cache key. */
function getPackFolderCacheKey({ name, type, parent }) {
  const parentId = getDocumentId(parent);
  return `${parentId ?? "root"}:${type}:${name}`;
}

/** Find pack folder. */
function findPackFolder(pack, { name, type, parent }) {
  const parentId = getDocumentId(parent);
  return getPackFolders(pack).find(
    /** Find the matching entry while find pack folder. */ (folder) => {
      const folderParentId = getDocumentId(folder.folder);
      return folder.name === name && folder.type === type && folderParentId === parentId;
    }
  );
}

/** Handle cleanup legacy class feature folders. */
async function cleanupNetherscrollsLegacyClassFeatureFolders(pack) {
  await pack
    .getIndex({ fields: ["folder", "name", "type"] })
    .catch(
      /** Handle the operation failure while handle cleanup legacy class feature folders. */ () =>
        null
    );
  for (const folder of getPackFolders(pack)) {
    if (folder?.name !== NETHERSCROLLS_LEGACY_CLASS_FEATURE_FOLDER_NAME) continue;
    if (folder?.type !== "Item") continue;
    const target = findPackFolder(pack, {
      name: NETHERSCROLLS_MAIN_CLASS_FEATURE_FOLDER_NAME,
      type: "Item",
      parent: folder.folder,
    });
    if (target) await movePackFolderDocuments(pack, folder, target);
    await deletePackFolderIfEmpty(pack, folder);
  }
}

/** Handle move pack folder documents. */
async function movePackFolderDocuments(pack, fromFolder, toFolder) {
  const fromFolderId = getDocumentId(fromFolder);
  const toFolderId = getDocumentId(toFolder);
  if (!fromFolderId || !toFolderId || fromFolderId === toFolderId) return 0;

  await pack
    .getIndex({ fields: ["folder"] })
    .catch(/** Handle the operation failure while handle move pack folder documents. */ () => null);
  const entries = getPackIndexEntries(pack).filter(
    /** Keep entries that satisfy the condition while handle move pack folder documents. */
    (entry) => getDocumentId(entry.folder) === fromFolderId
  );
  const updates = entries
    .map(
      /** Transform each entry while handle move pack folder documents. */ (entry) =>
        getDocumentId(entry)
    )
    .filter(Boolean)
    .map(
      /** Transform each entry while handle move pack folder documents. */ (id) => ({
        _id: id,
        folder: toFolderId,
      })
    );
  if (!updates.length) return 0;

  const DocumentClass = getPackDocumentClass(pack);
  if (typeof DocumentClass?.updateDocuments !== "function") return 0;

  await runNetherscrollsCompendiumDocumentBatches(DocumentClass, "updateDocuments", updates, pack);
  for (const entry of entries) {
    entry.folder = toFolderId;
  }
  return updates.length;
}

/** Delete pack folder if empty. */
async function deletePackFolderIfEmpty(pack, folder) {
  const folderId = getDocumentId(folder);
  if (!folderId || typeof folder?.delete !== "function") return false;

  await pack
    .getIndex({ fields: ["folder"] })
    .catch(/** Handle the operation failure while delete pack folder if empty. */ () => null);
  const hasChildFolder = getPackFolders(pack).some(
    /** Check whether any entry matches while delete pack folder if empty. */
    (candidate) => getDocumentId(candidate.folder) === folderId
  );
  if (hasChildFolder) return false;

  const hasDocuments = getPackIndexEntries(pack).some(
    /** Check whether any entry matches while delete pack folder if empty. */
    (entry) => getDocumentId(entry.folder) === folderId
  );
  if (hasDocuments) return false;

  await folder.delete({ pack: pack.collection, render: false, netherscrollsTransfer: true });
  return true;
}

/** Update pack folder sort. */
async function updatePackFolderSort(folder, pack, sort) {
  if (sort == null) return;
  const needsUpdate = Number(folder?.sort) !== Number(sort) || folder?.sorting !== "m";
  if (!needsUpdate) return;
  if (typeof folder?.update !== "function") return;

  await folder.update(
    {
      sort,
      sorting: "m",
    },
    { pack: pack.collection, render: false, netherscrollsTransfer: true }
  );
}

/** Retrieve spell level folder. */
function getNetherscrollsSpellLevelFolder(level) {
  const normalized = Math.max(0, Math.min(NETHERSCROLLS_MAX_SPELL_LEVEL, Number(level) || 0));
  return (
    NETHERSCROLLS_SPELL_LEVEL_FOLDERS.find(
      /** Find the matching entry while retrieve spell level folder. */ (folder) =>
        folder.level === normalized
    ) ?? NETHERSCROLLS_SPELL_LEVEL_FOLDERS[0]
  );
}

// D&D5e creature types, in folder order. Anything else lands in "Other".
const NETHERSCROLLS_MONSTER_TYPE_FOLDERS = [
  "aberration",
  "beast",
  "celestial",
  "construct",
  "dragon",
  "elemental",
  "fey",
  "fiend",
  "giant",
  "humanoid",
  "monstrosity",
  "ooze",
  "plant",
  "undead",
];

/** Place a monster Actor in its creature-type folder. */
async function ensureNetherscrollsMonsterFolder(pack, actorData, folderCache) {
  const type = String(actorData?.system?.details?.type?.value ?? "")
    .trim()
    .toLowerCase();
  const index = NETHERSCROLLS_MONSTER_TYPE_FOLDERS.indexOf(type);
  const name = index >= 0 ? type.charAt(0).toUpperCase() + type.slice(1) : "Other";
  return findOrCreatePackFolder(pack, {
    cache: folderCache,
    name,
    type: "Actor",
    parent: null,
    sort: (index >= 0 ? index : NETHERSCROLLS_MONSTER_TYPE_FOLDERS.length) * 100,
  });
}

export {
  cleanupNetherscrollsLegacyClassFeatureFolders,
  ensureNetherscrollsMonsterFolder,
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
};
