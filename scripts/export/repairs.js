/**
 * Apply canonical identifiers returned by a successful export to matching local documents.
 * Match embedded item provenance carefully so an acknowledgement cannot relink another item.
 */
import { MODULE_ID } from "../core/constants.js";
import {
  normalizeNetherscrollsName,
  reportNetherscrollsTransferItemError,
  toTrimmedStringOrNull,
  yieldNetherscrollsMainThread,
} from "../core/utils.js";
import { isNetherscrollsPlaceholderImage } from "../data/images.js";
import { getItemNetherId, normalizeNetherscrollsReferenceValue } from "../data/references.js";
import { getNetherscrollsActorItems } from "../foundry/collections.js";
import { setActorCharacterId, setNetherscrollsItemIdentifiers } from "../foundry/identifiers.js";

/** Match returned canonical records to local items before persisting their new IDs and artwork. */
async function applyFoundryExportCanonicalIds(actor, response, { guildId = undefined } = {}) {
  if (!actor || !response) return;
  const characterId = normalizeNetherscrollsReferenceValue(response?.data?.characterId);
  if (characterId) await setActorCharacterId(actor, characterId, { guildId });

  const repairs = [
    ...collectFoundryExportItemRepairs(response?.linked),
    ...collectFoundryExportItemRepairs(response?.resolved),
  ];
  const appliedKeys = new Set();
  for (const [repairIndex, repair] of repairs.entries()) {
    const canonicalId = normalizeNetherscrollsReferenceValue(repair.id);
    if (!canonicalId) continue;
    const item = findFoundryExportRepairItem(actor, repair);
    if (!item) {
      console.warn(
        `${MODULE_ID} | Foundry Export returned an id that could not be matched to an embedded Item.`,
        repair
      );
      continue;
    }
    const repairKey = `${item.id ?? item._id}:${canonicalId}:${repair.classId ?? ""}:${repair.inventoryId ?? ""}:${repair.img ?? ""}`;
    if (appliedKeys.has(repairKey)) continue;
    appliedKeys.add(repairKey);
    try {
      await setNetherscrollsItemIdentifiers(item, {
        id: canonicalId,
        classId: repair.classId,
        inventoryId: repair.inventoryId,
        kind: repair.kind,
        itemId: repair.itemId,
      });
    } catch (error) {
      reportNetherscrollsTransferItemError(item.name ?? "Item flags", error);
    }
    if (repair.img && !isNetherscrollsPlaceholderImage(repair.img)) {
      for (const copy of getNetherscrollsActorItems(actor).filter(
        /** Keep entries that satisfy the condition while apply foundry export canonical ids. */
        (candidate) => getItemNetherId(candidate) === canonicalId
      )) {
        if (copy.img === repair.img) continue;
        try {
          await copy.update({ img: repair.img }, { render: false, netherscrollsTransfer: true });
        } catch (error) {
          reportNetherscrollsTransferItemError(copy.name ?? "Item artwork", error);
        }
      }
    }
    if ((repairIndex + 1) % 10 === 0) await yieldNetherscrollsMainThread();
  }
}

/** Collect foundry export item repairs. */
function collectFoundryExportItemRepairs(container) {
  if (!container || typeof container !== "object") return [];
  const repairs = [];
  const append = /** Append. */ (value, type = null, classId = null) => {
    for (const row of Array.isArray(value) ? value : value ? [value] : []) {
      if (!row || typeof row !== "object") continue;
      repairs.push({
        id: row.id ?? row.netherscrollsId,
        foundryId: row.foundryId,
        img: row.img,
        inventoryId: row.inventoryId,
        kind: row.kind,
        itemId: row.itemId,
        name: row.name,
        type: row.type ?? row.foundryType ?? type,
        classId: row.classId ?? classId,
      });
    }
  };

  append(container.race, "race");
  append(container.background, "background");
  append(container.items);
  append(container.spells, "spell");
  append(container.feats, "feat");
  append(container.subclasses, "subclass");
  for (const classLink of Array.isArray(container.classes) ? container.classes : []) {
    append(classLink, "class");
    append(classLink?.subclass, "subclass", classLink?.id ?? classLink?.netherscrollsId);
    append(classLink?.subclasses, "subclass", classLink?.id ?? classLink?.netherscrollsId);
  }
  return repairs;
}

/** Find foundry export repair item. */
function findFoundryExportRepairItem(actor, repair) {
  const actorItems = Array.from(actor?.items ?? []);
  const foundryId = toTrimmedStringOrNull(repair?.foundryId);
  if (foundryId) {
    const exact =
      actor?.items?.get?.(foundryId) ??
      actorItems.find(
        /** Find the matching entry while find foundry export repair item. */ (item) =>
          String(item?.id ?? item?._id ?? "") === foundryId
      );
    if (exact) return exact;
  }

  const type = toTrimmedStringOrNull(repair?.type)?.toLowerCase() ?? null;
  const name = normalizeNetherscrollsName(repair?.name).toLowerCase();
  const candidates = actorItems.filter(
    /** Keep entries that satisfy the condition while find foundry export repair item. */ (
      item
    ) => {
      if (type && String(item?.type ?? "").toLowerCase() !== type) return false;
      if (name && normalizeNetherscrollsName(item?.name).toLowerCase() !== name) return false;
      return Boolean(type || name);
    }
  );
  return candidates.length === 1 ? candidates[0] : null;
}

export { applyFoundryExportCanonicalIds };
