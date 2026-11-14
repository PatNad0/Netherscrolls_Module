/**
 * Apply fields shared by item, feature, and spell conversions.
 * Imported provenance and authoritative effects must be consistent across all library types.
 */
import { MODULE_ID } from "../core/constants.js";
import { duplicateNetherscrollsData, toNumber, toTrimmedStringOrNull } from "../core/utils.js";
import { normalizeNetherscrollsReferenceValue } from "./references.js";
import { buildNetherscrollsSpellSource } from "./spell-fields.js";

/** Normalize item uses. */
function normalizeNetherscrollsItemUses(source) {
  const uses = source?.system?.uses ?? source?.uses ?? {};
  return {
    spent: Math.max(0, toNumber(uses.spent, 0)),
    max: toTrimmedStringOrNull(uses.max) ?? "",
    recovery: Array.isArray(uses.recovery) ? uses.recovery : [],
  };
}

/** Build item source. */
function buildNetherscrollsItemSource(sourceName, source = {}) {
  return buildNetherscrollsSpellSource(sourceName, source);
}

/** Retrieve system value. */
function getNetherscrollsSystemValue(source, key) {
  return source?.system?.[key] ?? source?.[key];
}

/** Normalize activities. */
function normalizeNetherscrollsActivities(source) {
  const activities = getNetherscrollsSystemValue(source, "activities") ?? source?.foundryActivities;
  return activities && typeof activities === "object" && !Array.isArray(activities)
    ? activities
    : {};
}

/** Determine whether object entries. */
function hasNetherscrollsObjectEntries(value) {
  return Boolean(
    value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length
  );
}

/** Sanitize formula count. */
function sanitizeNetherscrollsFormulaCount(value) {
  const raw = toTrimmedStringOrNull(value);
  if (!raw) return "";
  if (/\d+d\d+/i.test(raw)) return "";
  const allowed = /^(?:\d+(?:\.\d+)?|@[a-z_][\w.]*|[+\-*/%()\s])+$/i;
  return allowed.test(raw) ? raw : "";
}

/** Sanitize target data. */
function sanitizeNetherscrollsTargetData(target) {
  if (!target || typeof target !== "object") return target;
  const sanitized = duplicateNetherscrollsData(target);
  sanitized.affects = sanitized.affects ?? {};
  sanitized.affects.count = sanitizeNetherscrollsFormulaCount(sanitized.affects.count);
  if (sanitized.template && typeof sanitized.template === "object") {
    sanitized.template.count = sanitizeNetherscrollsFormulaCount(sanitized.template.count);
  }
  return sanitized;
}

/** Sanitize activity targets. */
function sanitizeNetherscrollsActivityTargets(activities) {
  if (!activities || typeof activities !== "object" || Array.isArray(activities)) return activities;
  for (const activity of Object.values(activities)) {
    if (activity?.target && typeof activity.target === "object") {
      activity.target = sanitizeNetherscrollsTargetData(activity.target);
    }
  }
  return activities;
}

/** Retrieve native effect key. */
function getNetherscrollsNativeEffectKey(effect) {
  const flags = effect?.flags?.netherscrolls;
  if (flags?.generatedFeatureEffect && flags.nativeEffect) {
    const native = flags.nativeEffect;
    return [
      flags.sourceId ?? "",
      flags.featureId ?? "",
      native._id ?? native.id ?? native.stat,
    ].join(":");
  }
  return effect?.flags?.[MODULE_ID]?.effectKey ?? null;
}

/** Build authoritative item effects. */
function buildNetherscrollsAuthoritativeItemEffects(documentData, source, sourceId) {
  return globalThis.NetherscrollsEffects.translateItem(documentData, source, sourceId);
}

/** Persist provenance and authoritative effect definitions together for later reconciliation and export. */
function applyNetherscrollsImportFlags(documentData, source, netherscrollsId) {
  documentData.effects = buildNetherscrollsAuthoritativeItemEffects(
    documentData,
    source,
    netherscrollsId
  );

  if (!netherscrollsId) return;
  documentData.flags = documentData.flags ?? {};
  documentData.flags.netherscrolls = {
    ...(documentData.flags.netherscrolls ?? {}),
    id: netherscrollsId,
  };
  documentData.flags[MODULE_ID] = {
    ...(documentData.flags[MODULE_ID] ?? {}),
  };

  const lastRev = normalizeNetherscrollsReferenceValue(source?.lastRev);
  if (lastRev) documentData.flags[MODULE_ID].lastRev = lastRev;
  if (Array.isArray(source?.tags)) documentData.flags[MODULE_ID].tags = source.tags;
  if (Array.isArray(source?.ability)) documentData.flags[MODULE_ID].ability = source.ability;
  if (Array.isArray(source?.classes)) documentData.flags[MODULE_ID].classes = source.classes;
  if (source?.demifeat != null) documentData.flags[MODULE_ID].demifeat = Boolean(source.demifeat);
  if (source?.isHomebrew != null)
    documentData.flags[MODULE_ID].isHomebrew = Boolean(source.isHomebrew);
  globalThis.NetherscrollsEffects.features.translateItem(documentData, source);
}

/** Build portable active effects. */
function buildNetherscrollsPortableActiveEffects(source, { excludedIds = null } = {}) {
  const entries = Array.isArray(source?.effects)
    ? source.effects
    : Array.isArray(source?.activeBonuses)
      ? source.activeBonuses
      : (source?.activeEffects ?? []);
  const excluded = new Set(excludedIds ?? []);
  const seen = new Set();
  return entries
    .filter(
      /** Keep entries that satisfy the condition while build portable active effects. */ (
        entry
      ) => {
        const key =
          entry?._id ?? `${entry?.stat}:${entry?.grant ?? entry?.bonus}:${entry?.source ?? ""}`;
        if (!entry?.stat || excluded.has(key) || seen.has(key)) return false;
        seen.add(key);
        return true;
      }
    )
    .map(
      /** Transform each entry while build portable active effects. */ (entry) =>
        globalThis.NetherscrollsEffects.createEffect(entry, {
          sourceId: source?._id ?? source?.id ?? "",
          actor: true,
        })
    );
}

export {
  applyNetherscrollsImportFlags,
  buildNetherscrollsItemSource,
  buildNetherscrollsPortableActiveEffects,
  getNetherscrollsNativeEffectKey,
  hasNetherscrollsObjectEntries,
  normalizeNetherscrollsActivities,
  normalizeNetherscrollsItemUses,
  sanitizeNetherscrollsActivityTargets,
  sanitizeNetherscrollsFormulaCount,
  sanitizeNetherscrollsTargetData,
};
