/**
 * Normalize service identities and read provenance without changing documents.
 * Catalogue IDs, embedded IDs, and generated IDs serve different ownership boundaries.
 */
import { IMPORT_TYPES, MODULE_ID } from "../core/constants.js";
import {
  buildNetherscrollsStableId,
  duplicateNetherscrollsData,
  toTrimmedStringOrNull,
} from "../core/utils.js";

/** Retrieve import type label. */
function getNetherscrollsImportTypeLabel(typeKey) {
  const definition = IMPORT_TYPES.find(
    /** Find the matching entry while retrieve import type label. */ (type) => type.key === typeKey
  );
  return definition?.label?.toLowerCase?.() ?? String(typeKey ?? "content");
}

/** Retrieve response dataset. */
function getNetherscrollsResponseDataset(data, dataKey, requestTypeKey = null) {
  if (Array.isArray(data)) return requestTypeKey === dataKey ? data : null;
  if (Array.isArray(data?.[dataKey])) return data[dataKey];
  if (data?.meta?.dataKey === dataKey && Array.isArray(data?.data)) return data.data;
  if (requestTypeKey === dataKey && Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.[dataKey])) return data.data[dataKey];
  if (Array.isArray(data?.data?.byDataset?.[dataKey])) return data.data.byDataset[dataKey];
  if (dataKey === "classes" && isNetherscrollsClassLike(data)) return [data];
  return null;
}

/** Determine whether class like. */
function isNetherscrollsClassLike(data) {
  return Boolean(
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    (Array.isArray(data.classFeatures) ||
      Array.isArray(data.subclasses) ||
      data.progression ||
      data.progressionTable ||
      data.presentation?.progressionTable)
  );
}

/** Retrieve source id. */
function getNetherscrollsSourceId(data) {
  const foundryItem = getNetherscrollsFoundryItemPayload(data);
  return normalizeNetherscrollsReferenceValue(
    data?.netherscrollsId ??
      data?.flags?.netherscrolls?.id ??
      foundryItem?.flags?.netherscrolls?.id ??
      data?._id ??
      data?.id
  );
}

/** Retrieve foundry item payload. */
function getNetherscrollsFoundryItemPayload(data) {
  return data?.foundryItem ?? data?.foundry ?? data?.document ?? null;
}

/** Normalize reference value. */
function normalizeNetherscrollsReferenceValue(value) {
  if (value && typeof value === "object") {
    return (
      toTrimmedStringOrNull(value.$oid) ??
      toTrimmedStringOrNull(value.$date) ??
      toTrimmedStringOrNull(value.oid) ??
      toTrimmedStringOrNull(value.date) ??
      toTrimmedStringOrNull(value.id) ??
      null
    );
  }

  return toTrimmedStringOrNull(value);
}

/** Determine whether deleted. */
function isNetherscrollsDeleted(data) {
  if (data?.deleted === true) return true;
  return String(data?.deleted ?? "").toLowerCase() === "true";
}

/** Build synthetic source id. */
function buildNetherscrollsSyntheticSourceId(prefix, key) {
  return `${prefix}:${buildNetherscrollsStableId(key)}`;
}

/** Build compendium item uuid. */
function buildNetherscrollsCompendiumItemUuid(pack, id) {
  return `Compendium.${pack.collection}.Item.${id}`;
}

/** Retrieve foundry source value. */
function getNetherscrollsFoundrySourceValue(source) {
  return source?.system?.source ?? source?.foundrySource ?? source?.source;
}

/** Duplicate document data. */
function duplicateNetherscrollsDocumentData(document) {
  if (typeof document?.toObject === "function") return document.toObject();
  return duplicateNetherscrollsData(document);
}

/** Retrieve document flag. */
function getNetherscrollsDocumentFlag(document, key) {
  if (key === "netherscrollsId") return document?.flags?.netherscrolls?.id ?? null;
  try {
    return document?.getFlag?.(MODULE_ID, key) ?? document?.flags?.[MODULE_ID]?.[key] ?? null;
  } catch {
    return document?.flags?.[MODULE_ID]?.[key] ?? null;
  }
}

/** Retrieve item nether id. */
function getItemNetherId(item) {
  if (item?.flags?.netherscrolls?.kind === "personal") return null;
  return normalizeNetherscrollsReferenceValue(
    item?.flags?.netherscrolls?.itemId ?? item?.flags?.netherscrolls?.id
  );
}

/** Retrieve actor character id. */
function getActorCharacterId(actor) {
  return normalizeNetherscrollsReferenceValue(actor?.flags?.netherscrolls?.characterId);
}

export {
  buildNetherscrollsCompendiumItemUuid,
  buildNetherscrollsSyntheticSourceId,
  duplicateNetherscrollsDocumentData,
  getActorCharacterId,
  getItemNetherId,
  getNetherscrollsDocumentFlag,
  getNetherscrollsFoundryItemPayload,
  getNetherscrollsFoundrySourceValue,
  getNetherscrollsImportTypeLabel,
  getNetherscrollsResponseDataset,
  getNetherscrollsSourceId,
  isNetherscrollsDeleted,
  normalizeNetherscrollsReferenceValue,
};
