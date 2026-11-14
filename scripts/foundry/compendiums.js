/**
 * Create and organize the module's managed world compendiums.
 * Sidebar placement and banners describe these packs without migrating world content.
 */
import {
  MODULE_ID,
  NETHERSCROLLS_IMAGE_VALIDATION_TIMEOUT_MS,
  NETHERSCROLLS_IMPORT_PACK_BANNERS,
  NETHERSCROLLS_IMPORT_PACK_BANNER_DIR,
  NETHERSCROLLS_IMPORT_PACK_OWNERSHIP,
  NETHERSCROLLS_IMPORT_SIDEBAR_FOLDER,
  NETHERSCROLLS_WORLD_IMPORT_PACKS,
  getNetherscrollsImportPackCollection,
  getNetherscrollsImportPackDefinition,
} from "../core/constants.js";
import { getDocumentId, toTrimmedStringOrNull } from "../core/utils.js";
import { getWorldFolders } from "./collections.js";

/** Ensure import pack writable. */
async function ensureNetherscrollsImportPackWritable(pack) {
  if (!pack?.locked) return;
  if (typeof pack.configure === "function") {
    await pack.configure({ locked: false });
  }
  if (pack.locked) {
    throw new Error(
      `Unlock the ${pack.title ?? pack.collection ?? "Netherscrolls"} compendium before importing.`
    );
  }
}

/** Retrieve import pack. */
async function getNetherscrollsImportPack(typeKey) {
  const definition = getNetherscrollsImportPackDefinition(typeKey);
  if (!definition) return game?.packs?.get?.(getNetherscrollsImportPackCollection(typeKey)) ?? null;

  const collection = getNetherscrollsImportPackCollection(typeKey);
  const existing = game?.packs?.get?.(collection);
  if (existing) return ensureNetherscrollsImportPackSidebarFolder(existing);

  const created = await createNetherscrollsWorldImportPack(definition);
  if (created) applyNetherscrollsImportPackBanners();
  return ensureNetherscrollsImportPackSidebarFolder(created);
}

/** Handle place existing import packs in sidebar folder. */
async function placeExistingNetherscrollsImportPacksInSidebarFolder() {
  try {
    for (const typeKey of Object.keys(NETHERSCROLLS_WORLD_IMPORT_PACKS)) {
      const pack = game?.packs?.get?.(getNetherscrollsImportPackCollection(typeKey));
      if (pack) await ensureNetherscrollsImportPackSidebarFolder(pack);
    }
  } catch (err) {
    console.warn(
      `${MODULE_ID} | Unable to place existing Netherscrolls compendiums in the sidebar folder.`,
      err
    );
  }
}

/** Create world import pack. */
async function createNetherscrollsWorldImportPack(definition) {
  const CompendiumCollectionClass =
    globalThis.foundry?.documents?.collections?.CompendiumCollection ??
    globalThis.CompendiumCollection;

  if (typeof CompendiumCollectionClass?.createCompendium !== "function") {
    throw new Error("Foundry world compendium creation API is unavailable.");
  }

  const metadata = {
    name: definition.name,
    label: definition.label,
    type: definition.type,
    package: "world",
  };
  if (definition.system) metadata.system = definition.system;

  const pack = await CompendiumCollectionClass.createCompendium(metadata);
  const resolvedPack = pack ?? game?.packs?.get?.(`world.${definition.name}`) ?? null;
  if (resolvedPack?.configure) {
    try {
      await resolvedPack.configure({
        locked: false,
        ownership: NETHERSCROLLS_IMPORT_PACK_OWNERSHIP,
      });
    } catch (err) {
      console.warn(`${MODULE_ID} | Unable to configure ${definition.label} compendium.`, err);
    }
  }

  return resolvedPack;
}

/** Ensure import pack sidebar folder. */
async function ensureNetherscrollsImportPackSidebarFolder(pack) {
  if (!pack || typeof pack.setFolder !== "function") return pack;

  try {
    const folder = await findOrCreateNetherscrollsCompendiumFolder();
    if (!folder?.id) return pack;
    if (getDocumentId(pack.folder) !== getDocumentId(folder)) {
      await pack.setFolder(folder);
    }
  } catch (err) {
    console.warn(
      `${MODULE_ID} | Unable to place ${pack.title ?? pack.collection ?? "compendium"} in the Netherscrolls folder.`,
      err
    );
  }

  return pack;
}

const netherscrollsPackBannerChecks = new Map();

/** Determine whether pack banner available. */
function isNetherscrollsPackBannerAvailable(path) {
  let check = netherscrollsPackBannerChecks.get(path);
  if (check) return check;
  check = new Promise(
    /** Perform the callback while determine whether pack banner available. */ (resolve) => {
      const ImageClass = globalThis.Image;
      if (typeof ImageClass !== "function") return resolve(false);
      const image = new ImageClass();
      const finish = /** Handle finish. */ (available) => {
        clearTimeout(timeout);
        image.onload = null;
        image.onerror = null;
        resolve(available);
      };
      const timeout = setTimeout(
        /** Run the deferred operation while determine whether pack banner available. */ () =>
          finish(false),
        NETHERSCROLLS_IMAGE_VALIDATION_TIMEOUT_MS
      );
      image.onload =
        /** Perform the callback while determine whether pack banner available. */ () =>
          finish(true);
      image.onerror =
        /** Perform the callback while determine whether pack banner available. */ () =>
          finish(false);
      image.src = path;
    }
  );
  netherscrollsPackBannerChecks.set(path, check);
  return check;
}

/** Apply import pack banner. */
async function applyNetherscrollsImportPackBanner(typeKey, pack) {
  const file = NETHERSCROLLS_IMPORT_PACK_BANNERS[typeKey];
  if (!file || !pack?.metadata) return false;
  const path = `${NETHERSCROLLS_IMPORT_PACK_BANNER_DIR}/${file}`;
  if (pack.metadata.banner === path) return false;
  if (!(await isNetherscrollsPackBannerAvailable(path))) return false;
  try {
    pack.metadata.banner = path;
    return pack.metadata.banner === path;
  } catch (err) {
    console.warn(`${MODULE_ID} | Unable to set the ${pack.title ?? pack.collection} banner.`, err);
    return false;
  }
}

// Our banners are light sepia art, where the sidebar's white pack titles are hard to read.
// Mark each Netherscrolls pack's title so the stylesheet can colour it brown. Core and the
// system name the title element differently across versions, so find it by its text.
function markNetherscrollsPackTitles(html) {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root?.querySelector) return;
  // The top-level "Netherscrolls" compendium folder gets the parchment header.
  const folder = getWorldFolders().find(
    /** Find the matching entry while mark pack titles. */
    (entry) =>
      entry?.name === NETHERSCROLLS_IMPORT_SIDEBAR_FOLDER.name &&
      entry?.type === NETHERSCROLLS_IMPORT_SIDEBAR_FOLDER.type &&
      !getDocumentId(entry?.folder)
  );
  const folderId = getDocumentId(folder);
  if (folderId) {
    root
      .querySelector(`[data-folder-id="${CSS.escape(folderId)}"]`)
      ?.classList.add("netherscrolls-folder");
  }
  for (const typeKey of Object.keys(NETHERSCROLLS_WORLD_IMPORT_PACKS)) {
    const collection = getNetherscrollsImportPackCollection(typeKey);
    const pack = game?.packs?.get?.(collection);
    const title = toTrimmedStringOrNull(pack?.title ?? pack?.metadata?.label);
    if (!title) continue;
    const quoted = CSS.escape(collection);
    const entry = root.querySelector(`[data-pack="${quoted}"], [data-entry-id="${quoted}"]`);
    if (!entry) continue;
    entry.classList.add("netherscrolls-pack");
    const label = Array.from(entry.querySelectorAll("*")).find(
      /** Find the matching entry while mark pack titles. */ (node) =>
        Array.from(node.childNodes).some(
          /** Check whether any entry matches while mark pack titles. */
          (child) => child.nodeType === Node.TEXT_NODE && child.textContent.trim() === title
        )
    );
    if (!label) continue;
    label.classList.add("netherscrolls-pack-title");
    const icon = label.previousElementSibling;
    if (icon?.tagName === "I") icon.classList.add("netherscrolls-pack-title");
  }
}

/** Apply import pack banners. */
async function applyNetherscrollsImportPackBanners() {
  try {
    const results = await Promise.all(
      Object.keys(NETHERSCROLLS_WORLD_IMPORT_PACKS).map(
        /** Transform each entry while apply import pack banners. */ (typeKey) => {
          const pack = game?.packs?.get?.(getNetherscrollsImportPackCollection(typeKey));
          return pack ? applyNetherscrollsImportPackBanner(typeKey, pack) : false;
        }
      )
    );
    if (results.some(Boolean)) ui.compendium?.render?.();
  } catch (err) {
    console.warn(`${MODULE_ID} | Unable to apply Netherscrolls compendium banners.`, err);
  }
}

/** Find or create compendium folder. */
async function findOrCreateNetherscrollsCompendiumFolder() {
  const existing = getWorldFolders().find(
    /** Find the matching entry while find or create compendium folder. */ (folder) => {
      const parentId = getDocumentId(folder?.folder);
      return (
        folder?.name === NETHERSCROLLS_IMPORT_SIDEBAR_FOLDER.name &&
        folder?.type === NETHERSCROLLS_IMPORT_SIDEBAR_FOLDER.type &&
        !parentId
      );
    }
  );
  if (existing) return existing;

  const FolderDocumentClass = globalThis.foundry?.documents?.Folder ?? globalThis.Folder;
  const FolderClass = FolderDocumentClass?.implementation ?? FolderDocumentClass;
  if (typeof FolderClass?.create !== "function") return null;

  return FolderClass.create({ ...NETHERSCROLLS_IMPORT_SIDEBAR_FOLDER });
}

export {
  applyNetherscrollsImportPackBanners,
  ensureNetherscrollsImportPackWritable,
  getNetherscrollsImportPack,
  markNetherscrollsPackTitles,
  placeExistingNetherscrollsImportPacksInSidebarFolder,
};
