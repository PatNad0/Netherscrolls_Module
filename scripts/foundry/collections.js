/**
 * Read Foundry collections through their supported array and collection interfaces.
 * Keeping this compatibility boundary shared avoids scattered collection-shape assumptions.
 */

/** Retrieve world actors. */
function getWorldActors() {
  const actors = game?.actors;
  if (!actors) return [];
  if (Array.isArray(actors)) return actors;
  if (Array.isArray(actors.contents)) return actors.contents;
  if (typeof actors.values === "function") return Array.from(actors.values());
  if (typeof actors[Symbol.iterator] === "function") return Array.from(actors);
  return [];
}

/** Retrieve actor effects. */
function getNetherscrollsActorEffects(actor) {
  const effects = actor?.effects;
  if (Array.isArray(effects)) return effects;
  if (Array.isArray(effects?.contents)) return effects.contents;
  if (effects?.values) return Array.from(effects.values());
  if (effects?.[Symbol.iterator]) return Array.from(effects);
  return [];
}

/** Retrieve world folders. */
function getWorldFolders() {
  const folders = game?.folders;
  if (!folders) return [];
  if (Array.isArray(folders)) return folders;
  if (Array.isArray(folders.contents)) return folders.contents;
  if (typeof folders.values === "function") return Array.from(folders.values());
  if (typeof folders[Symbol.iterator] === "function") return Array.from(folders);
  return [];
}

/** Retrieve pack document class. */
function getPackDocumentClass(pack) {
  const documentName = pack?.documentName ?? pack?.metadata?.type ?? "Item";
  const DocumentClass = globalThis?.[documentName];
  return DocumentClass?.implementation ?? DocumentClass ?? null;
}

/** Retrieve pack folders. */
function getPackFolders(pack) {
  const folders = pack?.folders;
  if (!folders) return [];
  if (Array.isArray(folders)) return folders;
  if (Array.isArray(folders.contents)) return folders.contents;
  if (typeof folders.values === "function") return Array.from(folders.values());
  if (typeof folders[Symbol.iterator] === "function") return Array.from(folders);
  return [];
}

/** Retrieve pack index entries. */
function getPackIndexEntries(packOrIndex) {
  const index = packOrIndex?.index ?? packOrIndex;
  if (!index) return [];
  if (Array.isArray(index)) return index;
  if (Array.isArray(index.contents)) return index.contents;
  if (typeof index.values === "function") return Array.from(index.values());
  if (typeof index[Symbol.iterator] === "function") return Array.from(index);
  return [];
}

/** Retrieve actor items. */
function getNetherscrollsActorItems(actor) {
  if (!actor?.items) return [];
  return Array.from(actor.items);
}

export {
  getNetherscrollsActorEffects,
  getNetherscrollsActorItems,
  getPackDocumentClass,
  getPackFolders,
  getPackIndexEntries,
  getWorldActors,
  getWorldFolders,
};
