/**
 * Import library monsters as complete NPC Actors (docs/api/29-foundry-monsters.md).
 * The API assembles each `foundryActor`; the module only places it, keeping embedded IDs
 * because activities, effects and consumption targets refer to them.
 */
import {
  MODULE_ID,
  NETHERSCROLLS_MONSTER_FALLBACK_IMAGE,
} from "../core/constants.js";
import {
  createNetherscrollsMainThreadBudget,
  duplicateNetherscrollsData,
  toTrimmedStringOrNull,
  yieldNetherscrollsMainThread,
  yieldNetherscrollsMainThreadIfNeeded,
} from "../core/utils.js";
import { normalizeNetherscrollsPersistentImagePath } from "../data/images.js";
import {
  getNetherscrollsSourceId,
  isNetherscrollsDeleted,
  normalizeNetherscrollsReferenceValue,
} from "../data/references.js";
import { getPackDocumentClass, getPackIndexEntries } from "../foundry/collections.js";
import {
  ensureNetherscrollsImportPackWritable,
  getNetherscrollsImportPack,
} from "../foundry/compendiums.js";
import { ensureNetherscrollsMonsterFolder } from "../foundry/folders.js";
import { runNetherscrollsCompendiumDocumentBatches } from "../foundry/documents.js";

// Complete NPC Actors are large (embedded items and effects): write fewer per request.
const NETHERSCROLLS_MONSTER_WRITE_BATCH_SIZE = 20;

// Notices, not problems: the API kept the original Foundry behavior.
const NETHERSCROLLS_MONSTER_NOTICE_WARNINGS = new Set(["SOURCE_ACTIVITIES_PRESERVED"]);

// Top-level Actor fields the API omits and that the importing world decides.
const NETHERSCROLLS_MONSTER_WORLD_FIELDS = [
  "_id",
  "id",
  "folder",
  "ownership",
  "permission",
  "pack",
  "sort",
];

/** Read the monster ID of a compendium entry or Actor data. */
function getNetherscrollsMonsterId(entry) {
  return normalizeNetherscrollsReferenceValue(entry?.flags?.netherscrolls?.monsterId);
}

/** Warning codes that need a manual review (source-preservation notices excluded). */
function getNetherscrollsMonsterReviewWarnings(record) {
  const warnings = Array.isArray(record?.conversionWarnings) ? record.conversionWarnings : [];
  return warnings.filter(
    /** Keep warnings that are not notices. */ (code) =>
      !NETHERSCROLLS_MONSTER_NOTICE_WARNINGS.has(String(code).split(":")[0])
  );
}

/** Build Actor creation data from one monster record, or null for a tombstone. */
function prepareNetherscrollsMonsterActorData(record) {
  if (isNetherscrollsDeleted(record) || !record?.foundryActor) return null;
  const monsterId = getNetherscrollsSourceId(record);
  if (!monsterId) return null;

  const data = duplicateNetherscrollsData(record.foundryActor);
  for (const key of NETHERSCROLLS_MONSTER_WORLD_FIELDS) delete data[key];
  data.name =
    toTrimmedStringOrNull(data.name) ??
    toTrimmedStringOrNull(record.name) ??
    "Netherscrolls Monster";
  data.type = toTrimmedStringOrNull(data.type) ?? "npc";
  // The API returns final URLs; an unresolved storage key falls back instead of breaking.
  data.img = normalizeNetherscrollsPersistentImagePath(
    data.img,
    NETHERSCROLLS_MONSTER_FALLBACK_IMAGE
  );
  if (data.prototypeToken?.texture) {
    data.prototypeToken.texture.src = normalizeNetherscrollsPersistentImagePath(
      data.prototypeToken.texture.src,
      data.img
    );
  }

  data.flags ??= {};
  data.flags.netherscrolls = {
    ...(data.flags.netherscrolls ?? {}),
    monsterId,
    dataset: "monsters",
  };
  const lastRev = normalizeNetherscrollsReferenceValue(record.lastRev);
  data.flags[MODULE_ID] = {
    ...(data.flags[MODULE_ID] ?? {}),
    ...(lastRev ? { lastRev } : {}),
    // Kept so a later sync can find monsters that use a changed shared feature.
    featureIds: Array.isArray(record.features) ? record.features.map(String) : [],
  };
  return data;
}

/** Map monster ID to the compendium document IDs currently holding it. */
async function getNetherscrollsMonsterDocumentIds(pack) {
  const index = await pack.getIndex({ fields: ["flags.netherscrolls.monsterId"] });
  const byMonsterId = new Map();
  for (const entry of getPackIndexEntries(index)) {
    const monsterId = getNetherscrollsMonsterId(entry);
    const id = entry?.id ?? entry?._id;
    if (!monsterId || !id) continue;
    if (!byMonsterId.has(monsterId)) byMonsterId.set(monsterId, []);
    byMonsterId.get(monsterId).push(id);
  }
  return byMonsterId;
}

/** Create Actors in small batches; a failing Actor is reported without stopping the others. */
async function createNetherscrollsMonsterActors(ActorClass, rows, pack) {
  const options = {
    pack: pack.collection,
    keepId: true,
    keepEmbeddedIds: true,
    render: false,
    netherscrollsTransfer: true,
  };
  const saved = [];
  const failed = [];
  for (let offset = 0; offset < rows.length; offset += NETHERSCROLLS_MONSTER_WRITE_BATCH_SIZE) {
    const chunk = rows.slice(offset, offset + NETHERSCROLLS_MONSTER_WRITE_BATCH_SIZE);
    try {
      await ActorClass.createDocuments(chunk, options);
      saved.push(...chunk);
    } catch (_batchError) {
      // Retry one by one so a single invalid Actor does not drop its whole batch.
      for (const row of chunk) {
        try {
          await ActorClass.createDocuments([row], options);
          saved.push(row);
        } catch (error) {
          failed.push(row.name);
          console.warn(`${MODULE_ID} | Monster "${row.name}" could not be imported.`, error);
        }
      }
    }
    await yieldNetherscrollsMainThread();
  }
  return { saved, failed };
}

/** Replace the managed monster compendium entries for the given records. */
async function importNetherscrollsMonsters(records) {
  const pack = await getNetherscrollsImportPack("monsters");
  if (!pack) throw new Error("Netherscrolls Monsters compendium pack was not found.");
  await ensureNetherscrollsImportPackWritable(pack);

  const existing = await getNetherscrollsMonsterDocumentIds(pack);
  const deleteIds = [];
  const rows = [];
  const reviewed = [];
  const seen = new Set();
  let removed = 0;
  const folderCache = new Map();
  const budget = createNetherscrollsMainThreadBudget();

  for (const record of records) {
    const monsterId = getNetherscrollsSourceId(record);
    if (!monsterId || seen.has(monsterId)) continue;
    seen.add(monsterId);
    const previous = existing.get(monsterId) ?? [];
    deleteIds.push(...previous);

    const data = prepareNetherscrollsMonsterActorData(record);
    if (!data) {
      if (previous.length) removed += 1;
      await yieldNetherscrollsMainThreadIfNeeded(budget);
      continue;
    }
    // Recreate under the same ID: a full replacement drops embedded documents
    // the new payload no longer has, which a merge update would keep.
    if (previous.length) data._id = previous[0];
    const folder = await ensureNetherscrollsMonsterFolder(pack, data, folderCache);
    if (folder?.id) data.folder = folder.id;
    rows.push(data);
    const warnings = getNetherscrollsMonsterReviewWarnings(record);
    if (warnings.length) reviewed.push({ name: data.name, monsterId, warnings });
    await yieldNetherscrollsMainThreadIfNeeded(budget);
  }

  const ActorClass = getPackDocumentClass(pack);
  if (typeof ActorClass?.createDocuments !== "function")
    throw new Error("Foundry Actor creation API is unavailable.");
  if (deleteIds.length) {
    await runNetherscrollsCompendiumDocumentBatches(
      ActorClass,
      "deleteDocuments",
      deleteIds,
      pack,
      {},
      NETHERSCROLLS_MONSTER_WRITE_BATCH_SIZE
    );
  }
  const { saved, failed } = await createNetherscrollsMonsterActors(ActorClass, rows, pack);
  // A row with an _id replaced an existing monster.
  const updated = saved.filter(/** Replacements that were saved. */ (row) => row._id).length;

  if (reviewed.length) {
    console.info(
      `${MODULE_ID} | ${reviewed.length} imported monsters have conversion warnings to review.`,
      reviewed
    );
  }
  return {
    created: saved.length - updated,
    updated,
    deleted: removed,
    failed: failed.length,
    review: reviewed.length,
  };
}

export { importNetherscrollsMonsters, prepareNetherscrollsMonsterActorData };
