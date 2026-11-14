/**
 * Write documents in bounded batches while preserving identity and player-authored activities.
 * Foundry version-specific replacement operators prevent obsolete keyed fields from surviving merges.
 */
import { MODULE_ID, NETHERSCROLLS_COMPENDIUM_WRITE_BATCH_SIZE } from "../core/constants.js";
import {
  normalizeNetherscrollsName,
  reportNetherscrollsTransferItemError,
  yieldNetherscrollsMainThread,
} from "../core/utils.js";
import { normalizeNetherscrollsImportImagePath } from "../data/images.js";
import { getItemNetherId } from "../data/references.js";
import { getPackIndexEntries } from "./collections.js";
import { netherscrollsCompendiumDocumentIdCache } from "./compendium-index.js";
import {
  haveSameNetherscrollsEmbeddedEffects,
  reconcileNetherscrollsItemEffectsSafely,
} from "./effects.js";

// Library rows carry their complete activity and advancement sets, keyed by ID. A plain update
// merges those objects, so an entry removed or re-keyed in Netherscrolls (a spell whose inferred
// attack became a save) would stay next to its replacement. Replace them instead.
function replaceNetherscrollsKeyedSystemFields(update, keys = ["activities", "advancement"]) {
  const system = update?.system;
  const ForcedReplacement = globalThis.foundry?.data?.operators?.ForcedReplacement;
  if (!system || typeof system !== "object" || Array.isArray(system)) return update;
  // The whole system is already being replaced (Item type change).
  if (ForcedReplacement && system instanceof ForcedReplacement) return update;
  const isKeyed = /** Determine whether keyed. */ (value) =>
    Boolean(value && typeof value === "object" && !Array.isArray(value));
  if (
    !keys.some(
      /** Check whether any entry matches while replace keyed system fields. */ (key) =>
        isKeyed(system[key])
    )
  )
    return update;
  const replaced = { ...system };
  for (const key of keys) {
    const value = system[key];
    if (!isKeyed(value)) continue;
    if (ForcedReplacement) {
      replaced[key] = new ForcedReplacement(value);
    } else {
      // Foundry 13: an "==" key replaces the object rather than merging it.
      delete replaced[key];
      replaced[`==${key}`] = value;
    }
  }
  return { ...update, system: replaced };
}

// An owned copy is updated the same way, except that it keeps activities a player added in
// Foundry. Activities an earlier import wrote ("ns…" IDs, or flagged as Netherscrolls features)
// are replaced. Advancement keeps its merge: on an Actor it records what was granted.
function replaceNetherscrollsOwnedItemActivities(update, existing) {
  const activities = update?.system?.activities;
  if (!activities || typeof activities !== "object" || Array.isArray(activities)) return update;
  const current = existing?._source?.system?.activities ?? {};
  const imported = /** Handle imported. */ (id, activity) =>
    /^ns[a-z]/.test(id) || Boolean(activity?.flags?.netherscrolls || activity?.flags?.[MODULE_ID]);
  const kept = Object.fromEntries(
    Object.entries(current).filter(
      /** Keep entries that satisfy the condition while replace owned item activities. */
      ([id, activity]) => !(id in activities) && !imported(id, activity)
    )
  );
  return replaceNetherscrollsKeyedSystemFields(
    { ...update, system: { ...update.system, activities: { ...kept, ...activities } } },
    ["activities"]
  );
}

/** Preserve document IDs across upserts and type changes; recheck identity after a partially successful batch. */
async function runNetherscrollsCompendiumDocumentBatches(
  DocumentClass,
  method,
  entries,
  pack,
  options = {},
  batchSize = NETHERSCROLLS_COMPENDIUM_WRITE_BATCH_SIZE
) {
  let rows = Array.from(entries ?? []);
  const results = [];
  if (!rows.length || typeof DocumentClass?.[method] !== "function") return results;
  const writeOptions = {
    pack: pack.collection,
    render: false,
    netherscrollsTransfer: true,
    ...options,
  };
  const write = /** Write. */ async (writeMethod, chunk) => {
    try {
      const saved = (await DocumentClass[writeMethod](chunk, writeOptions)) ?? [];
      results.push(...saved);
      if (writeMethod === "updateDocuments") {
        for (const row of chunk) {
          if (!Array.isArray(row.effects)) continue;
          const item = saved.find(
            /** Find the matching entry while run compendium document batches. */ (document) =>
              (document.id ?? document._id) === row._id
          );
          if (
            typeof item?.createEmbeddedDocuments === "function" &&
            !haveSameNetherscrollsEmbeddedEffects(item, row)
          ) {
            await reconcileNetherscrollsItemEffectsSafely(item, row.effects);
          }
        }
      }
    } catch (error) {
      if (chunk.length === 1) {
        reportNetherscrollsTransferItemError(chunk[0]?.name ?? "Library Item", error);
        error.netherscrollsWriteFailure = true;
        throw error;
      }
      // Recheck identity after a failed batch in case Foundry saved some entries.
      for (const row of chunk)
        results.push(
          ...(await runNetherscrollsCompendiumDocumentBatches(
            DocumentClass,
            writeMethod,
            [row],
            pack,
            options,
            batchSize
          ))
        );
    }
  };
  if (["createDocuments", "updateDocuments"].includes(method)) {
    const index = await pack.getIndex({
      fields: [
        "name",
        "type",
        "img",
        "flags.netherscrolls.id",
        `flags.${MODULE_ID}.netherscrollsId`,
      ],
    });
    const existing = getPackIndexEntries(index);
    const identity = /** Handle identity. */ (row) =>
      getItemNetherId(row) ?? row?.flags?.[MODULE_ID]?.netherscrollsId;
    const updates = new Map();
    const creates = new Map();
    for (const row of rows) {
      const id = identity(row);
      const matching = existing.filter(
        /** Keep entries that satisfy the condition while run compendium document batches. */ (
          entry
        ) => {
          if (row._id && (entry.id ?? entry._id) === row._id) return true;
          if (!id) return false;
          const entryId = identity(entry);
          if (entryId) return entryId === id;
          // Recover only unlinked legacy copies in this dedicated NS compendium.
          return (
            entry.type === row.type &&
            normalizeNetherscrollsName(entry.name).toLowerCase() ===
              normalizeNetherscrollsName(row.name).toLowerCase()
          );
        }
      );
      const image = normalizeNetherscrollsImportImagePath(
        row.img,
        ...matching.map(
          /** Transform each entry while run compendium document batches. */ (entry) =>
            updates.get(entry.id ?? entry._id)?.img ?? entry.img
        )
      );
      if (matching.length) {
        for (const entry of matching) {
          const localId = entry.id ?? entry._id;
          const update = replaceNetherscrollsKeyedSystemFields({
            ...row,
            _id: localId,
            img: image,
          });
          const ForcedReplacement = globalThis.foundry?.data?.operators?.ForcedReplacement;
          if (entry.type && row.type && entry.type !== row.type && ForcedReplacement) {
            // Foundry v14 requires a new system model when the Item type changes.
            // Keep the document ID so existing compendium references remain valid.
            update.system = new ForcedReplacement(row.system ?? {});
          }
          updates.set(localId, update);
        }
      } else if (method === "updateDocuments") {
        updates.set(row._id, replaceNetherscrollsKeyedSystemFields({ ...row, img: image }));
      } else {
        const key = id ? `${row.type}:${id}` : `row:${creates.size}`;
        const previous = creates.get(key);
        creates.set(key, {
          ...row,
          img: normalizeNetherscrollsImportImagePath(row.img, previous?.img),
        });
      }
    }
    const updateRows = [...updates.values()];
    for (let offset = 0; offset < updateRows.length; offset += batchSize) {
      await write("updateDocuments", updateRows.slice(offset, offset + batchSize));
      await yieldNetherscrollsMainThread();
    }
    rows = [...creates.values()];
    method = "createDocuments";
  }
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const chunk = rows.slice(offset, offset + batchSize);
    await write(method, chunk);
    if (offset + batchSize < rows.length) await yieldNetherscrollsMainThread();
  }
  netherscrollsCompendiumDocumentIdCache.delete(pack.collection);
  return results;
}

/** Bound document work and preserve per-item error reporting during character transfers. */
async function runNetherscrollsEmbeddedDocumentBatches(
  actor,
  method,
  documentType,
  entries,
  options = {},
  batchSize = 25
) {
  const rows = Array.from(entries ?? []);
  const results = [];
  if (!rows.length || typeof actor?.[method] !== "function") return results;
  if (options.netherscrollsTransfer) {
    for (const row of rows) {
      try {
        const saved = await actor[method](documentType, [row], options);
        if (Array.isArray(saved)) results.push(...saved);
      } catch (error) {
        reportNetherscrollsTransferItemError(row?.name ?? documentType, error);
      }
      await yieldNetherscrollsMainThread();
    }
    return results;
  }
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const chunk = rows.slice(offset, offset + batchSize);
    const result = await actor[method](documentType, chunk, options);
    if (Array.isArray(result)) results.push(...result);
    if (offset + batchSize < rows.length) await yieldNetherscrollsMainThread();
  }
  return results;
}

/** Schedule actor sheet render. */
function scheduleNetherscrollsActorSheetRender(actor) {
  const sheet = actor?.sheet;
  if (!sheet?.rendered || typeof sheet.render !== "function") return;
  setTimeout(
    /** Run the deferred operation while schedule actor sheet render. */ () => {
      try {
        sheet.render(false);
      } catch (err) {
        console.warn(`${MODULE_ID} | Unable to refresh the Actor sheet after transfer.`, err);
      }
    },
    0
  );
}

export {
  replaceNetherscrollsOwnedItemActivities,
  runNetherscrollsCompendiumDocumentBatches,
  runNetherscrollsEmbeddedDocumentBatches,
  scheduleNetherscrollsActorSheetRender,
};
