/**
 * Cache service-ID lookups separately from compendium creation and writes.
 * Writers invalidate this index so later character imports cannot reuse stale definitions.
 */
import { MODULE_ID, getNetherscrollsImportPackCollection } from "../core/constants.js";
import { debugNetherscrollsCharacterImport } from "../core/settings.js";
import { getItemNetherId } from "../data/references.js";
import { getPackIndexEntries } from "./collections.js";

const netherscrollsCompendiumDocumentIdCache = new Map();

/** Invalidate compendium document id cache. */
function invalidateNetherscrollsCompendiumDocumentIdCache(typeKey) {
  const collection = getNetherscrollsImportPackCollection(typeKey);
  if (!collection) return;
  netherscrollsCompendiumDocumentIdCache.delete(collection);
  debugNetherscrollsCharacterImport(
    "Invalidated Netherscrolls-id compendium index after library import.",
    {
      typeKey,
      collection,
    }
  );
}

/** Reuse the catalogue index until document count or explicit write invalidation makes it stale. */
async function getNetherscrollsCompendiumDocumentsById(pack) {
  if (!pack) return new Map();
  const cacheKey = pack.collection ?? pack.metadata?.id ?? pack.id;
  const indexSize = Number.isFinite(pack.index?.size) ? pack.index.size : null;
  const cached = cacheKey ? netherscrollsCompendiumDocumentIdCache.get(cacheKey) : null;
  if (cached && (indexSize == null || cached.indexSize === indexSize)) {
    debugNetherscrollsCharacterImport("Reused cached Netherscrolls-id compendium index.", {
      pack: cacheKey,
      documentCount: cached.documentsById.size,
    });
    return cached.documentsById;
  }

  debugNetherscrollsCharacterImport("Building Netherscrolls-id compendium index.", {
    pack: cacheKey,
  });
  const documents = await pack.getDocuments();
  const documentsById = new Map();
  for (const document of documents) {
    const netherscrollsId = getItemNetherId(document);
    if (netherscrollsId) documentsById.set(String(netherscrollsId), document);
  }
  if (cacheKey) netherscrollsCompendiumDocumentIdCache.set(cacheKey, { indexSize, documentsById });
  console.info(
    `${MODULE_ID} | Foundry Import | Indexed ${documentsById.size} Netherscrolls ids in ${cacheKey ?? "compendium"}.`
  );
  return documentsById;
}

/** Retrieve compendium documents by nether id. */
async function getCompendiumDocumentsByNetherId(pack) {
  if (!pack) return new Map();
  const index = await pack.getIndex({
    fields: [
      "flags.netherscrolls.id",
      `flags.${MODULE_ID}.netherscrollsId`,
      "name",
      "img",
      `flags.${MODULE_ID}.lastRev`,
      "type",
      "effects",
    ],
  });
  const documentsById = new Map();
  for (const entry of getPackIndexEntries(index)) {
    const netherscrollsId = getItemNetherId(entry);
    if (netherscrollsId)
      documentsById.set(String(netherscrollsId), { ...entry, id: entry.id ?? entry._id });
  }
  return documentsById;
}

export {
  getCompendiumDocumentsByNetherId,
  getNetherscrollsCompendiumDocumentsById,
  invalidateNetherscrollsCompendiumDocumentIdCache,
  netherscrollsCompendiumDocumentIdCache,
};
