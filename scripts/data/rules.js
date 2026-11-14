/**
 * Normalize shared rule fields consistently across character, class, item, and spell data.
 * Keep these helpers independent of transfer workflows and document persistence.
 */
import { toNumberOrNull, toTrimmedStringOrNull } from "../core/utils.js";
import { NETHERSCROLLS_ABILITY_LABELS, NETHERSCROLLS_DAMAGE_TYPES } from "./catalogs.js";
import { getNetherscrollsFoundryItemPayload, getNetherscrollsSourceId } from "./references.js";

/** Normalize class hit die. */
function normalizeNetherscrollsClassHitDie(source) {
  const foundryItem = getNetherscrollsFoundryItemPayload(source);
  const raw =
    [
      source?.system?.hd?.denomination,
      foundryItem?.system?.hd?.denomination,
      source?.diceType,
      source?.hitDice,
      source?.hitDie,
      source?.hd,
      source?.hitPoints?.hitDice,
      source?.hitPoints?.die,
    ]
      .map(toTrimmedStringOrNull)
      .find(Boolean) ?? "d6";
  const match = /d(4|6|8|10|12|20|100)\b/i.exec(raw);
  return match ? `d${match[1]}` : "d6";
}

/** Normalize class identifier. */
function normalizeNetherscrollsClassIdentifier(source) {
  return (
    toTrimmedStringOrNull(source?.system?.identifier) ??
    slugifyNetherscrollsIdentifier(source?.name ?? getNetherscrollsSourceId(source) ?? "class")
  );
}

/** Normalize subclass identifier. */
function normalizeNetherscrollsSubclassIdentifier(source, classSource) {
  return (
    toTrimmedStringOrNull(source?.system?.identifier) ??
    slugifyNetherscrollsIdentifier(
      `${normalizeNetherscrollsClassIdentifier(classSource)}-${source?.name ?? getNetherscrollsSourceId(source) ?? "subclass"}`
    )
  );
}

/** Normalize nullable number. */
function normalizeNetherscrollsNullableNumber(value) {
  const number = toNumberOrNull(value);
  return number == null ? null : number;
}

/** Handle merge defaults. */
function mergeNetherscrollsDefaults(defaults, data) {
  if (foundry?.utils?.mergeObject) {
    return foundry.utils.mergeObject(defaults, data, { inplace: false });
  }
  return {
    ...defaults,
    ...(data ?? {}),
  };
}

/** Handle slugify identifier. */
function slugifyNetherscrollsIdentifier(value) {
  return (
    toTrimmedStringOrNull(value)
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "netherscrolls-spell"
  );
}

/** Normalize save ability. */
function normalizeNetherscrollsSaveAbility(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  const normalized = toTrimmedStringOrNull(raw)?.toLowerCase();
  if (!normalized) return null;
  for (const [ability, aliases] of Object.entries(NETHERSCROLLS_ABILITY_LABELS)) {
    if (ability === normalized || aliases.includes(normalized)) return ability;
  }
  return null;
}

/** Normalize damage type. */
function normalizeNetherscrollsDamageType(value) {
  const normalized = toTrimmedStringOrNull(value)?.toLowerCase();
  if (!normalized) return null;
  if (normalized === "heal" || normalized === "healing") return "healing";
  return NETHERSCROLLS_DAMAGE_TYPES.includes(normalized) ? normalized : null;
}

export {
  mergeNetherscrollsDefaults,
  normalizeNetherscrollsClassHitDie,
  normalizeNetherscrollsClassIdentifier,
  normalizeNetherscrollsDamageType,
  normalizeNetherscrollsNullableNumber,
  normalizeNetherscrollsSaveAbility,
  normalizeNetherscrollsSubclassIdentifier,
  slugifyNetherscrollsIdentifier,
};
