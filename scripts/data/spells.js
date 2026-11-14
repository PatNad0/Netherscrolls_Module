/**
 * Assemble spell documents from explicit payloads and inferred mechanics.
 * Shared library definitions stay independent of a character's spell preparation context.
 */
import { duplicateNetherscrollsData, toTrimmedStringOrNull } from "../core/utils.js";
import { normalizeNetherscrollsImportImagePath } from "./images.js";
import {
  applyNetherscrollsImportFlags,
  hasNetherscrollsObjectEntries,
  normalizeNetherscrollsActivities,
  normalizeNetherscrollsItemUses,
  sanitizeNetherscrollsActivityTargets,
  sanitizeNetherscrollsTargetData,
} from "./item-fields.js";
import { getNetherscrollsFoundryItemPayload, getNetherscrollsSourceId } from "./references.js";
import { normalizeNetherscrollsSaveAbility, slugifyNetherscrollsIdentifier } from "./rules.js";
import {
  buildNetherscrollsSecondarySpellActivities,
  buildNetherscrollsSpellActivity,
} from "./spell-activities.js";
import {
  buildNetherscrollsSpellSource,
  getNetherscrollsSpellLevel,
  getNetherscrollsSpellPreparedState,
  getNetherscrollsSpellSchool,
  getNetherscrollsSpellSchoolSystemKey,
  normalizeNetherscrollsSpellMethod,
} from "./spell-fields.js";
import {
  getNetherscrollsPrimarySpellText,
  inferNetherscrollsSpellActivation,
  inferNetherscrollsSpellAttack,
  inferNetherscrollsSpellDamage,
  inferNetherscrollsSpellDuration,
  inferNetherscrollsSpellHealing,
  inferNetherscrollsSpellMaterials,
  inferNetherscrollsSpellProperties,
  inferNetherscrollsSpellRange,
  inferNetherscrollsSpellSaveAbility,
  inferNetherscrollsSpellTarget,
  normalizeNetherscrollsSpellText,
} from "./spell-inference.js";

/** Prefer explicit spell mechanics and infer missing fields before constructing library activities. */
function normalizeNetherscrollsSpellData(spell) {
  if (getNetherscrollsFoundryItemPayload(spell)) {
    return normalizeNetherscrollsFoundrySpellData(spell);
  }

  const source = duplicateNetherscrollsData(spell);
  const netherscrollsId = getNetherscrollsSourceId(spell);
  const descriptionHtml = toTrimmedStringOrNull(
    spell?.descriptionHtml ?? spell?.description ?? source.descriptionHtml ?? source.description
  );
  const sourceName = toTrimmedStringOrNull(source.source);
  const school = getNetherscrollsSpellSchool(source);
  const schoolKey = getNetherscrollsSpellSchoolSystemKey(school);
  const inferred = inferNetherscrollsSpellFields(source, descriptionHtml);
  const activities = normalizeNetherscrollsActivities(source);
  const itemData = {
    name: toTrimmedStringOrNull(source.name) ?? "Netherscrolls Spell",
    type: "spell",
    img: normalizeNetherscrollsImportImagePath(source.img, source.image),
    sort: 0,
    ownership: {
      default: 0,
    },
    system: {
      activities: hasNetherscrollsObjectEntries(activities)
        ? sanitizeNetherscrollsActivityTargets(activities)
        : getNetherscrollsInferredSpellActivities(inferred),
      activation: inferred.activation,
      ability: normalizeNetherscrollsSaveAbility(source?.system?.ability ?? source?.ability) ?? "",
      description: {
        value: descriptionHtml ?? "",
        chat: "",
      },
      duration: inferred.duration,
      level: getNetherscrollsSpellLevel(source),
      materials: inferred.materials,
      properties: inferred.properties,
      range: inferred.range,
      target: sanitizeNetherscrollsTargetData(inferred.target),
      uses: normalizeNetherscrollsItemUses(source),
    },
    effects: [],
  };
  if (schoolKey) itemData.system.school = schoolKey;
  itemData.system.identifier =
    toTrimmedStringOrNull(source.system?.identifier) ??
    (netherscrollsId
      ? `netherscrolls-${netherscrollsId}`
      : slugifyNetherscrollsIdentifier(itemData.name));
  itemData.system.actionType =
    toTrimmedStringOrNull(source?.system?.actionType ?? source?.actionType) ?? "";
  const sourceItem = toTrimmedStringOrNull(source?.system?.sourceItem ?? source?.sourceItem);
  if (sourceItem) itemData.system.sourceItem = sourceItem;
  itemData.system.method = normalizeNetherscrollsSpellMethod(source);
  itemData.system.prepared = getNetherscrollsSpellPreparedState(source);

  itemData.system.source = buildNetherscrollsSpellSource(sourceName, source);

  applyNetherscrollsImportFlags(itemData, source, netherscrollsId);

  return itemData;
}

/** Normalize foundry spell data. */
function normalizeNetherscrollsFoundrySpellData(spell) {
  const source = duplicateNetherscrollsData(getNetherscrollsFoundryItemPayload(spell));
  const netherscrollsId = getNetherscrollsSourceId(spell);
  source.name = toTrimmedStringOrNull(source.name) ?? "Netherscrolls Spell";
  source.type = toTrimmedStringOrNull(source.type) ?? "spell";
  source.img = normalizeNetherscrollsImportImagePath(
    spell.img,
    spell.image,
    source.img,
    source.image
  );
  source.system = source.system ?? {};
  source.system.level = getNetherscrollsSpellLevel(spell);
  source.system.identifier ??= netherscrollsId
    ? `netherscrolls-${netherscrollsId}`
    : slugifyNetherscrollsIdentifier(source.name);
  const schoolKey = getNetherscrollsSpellSchoolSystemKey(getNetherscrollsSpellSchool(source));
  if (schoolKey) source.system.school = schoolKey;
  source.system.ability ??=
    normalizeNetherscrollsSaveAbility(spell?.system?.ability ?? spell?.ability) ?? "";
  source.system.actionType ??=
    toTrimmedStringOrNull(spell?.system?.actionType ?? spell?.actionType) ?? "";
  source.system.method = normalizeNetherscrollsSpellMethod(spell, source);
  source.system.prepared = getNetherscrollsSpellPreparedState(spell, source);
  delete source.system.preparation;
  source.system.uses ??= normalizeNetherscrollsItemUses(spell);
  const inferred = inferNetherscrollsSpellFields(
    spell,
    source.system?.description?.value ?? spell?.descriptionHtml ?? spell?.description
  );
  source.system.activation ??= inferred.activation;
  source.system.duration ??= inferred.duration;
  source.system.materials ??= inferred.materials;
  if (!Array.isArray(source.system.properties) || !source.system.properties.length) {
    source.system.properties = inferred.properties;
  }
  source.system.range ??= inferred.range;
  source.system.target = sanitizeNetherscrollsTargetData(source.system.target ?? inferred.target);
  if (!source.system.activities || !Object.keys(source.system.activities).length) {
    const activities = normalizeNetherscrollsActivities(spell);
    source.system.activities = hasNetherscrollsObjectEntries(activities)
      ? sanitizeNetherscrollsActivityTargets(activities)
      : getNetherscrollsInferredSpellActivities(inferred);
  } else {
    source.system.activities = sanitizeNetherscrollsActivityTargets(source.system.activities);
  }
  const sourceItem = toTrimmedStringOrNull(spell?.system?.sourceItem ?? spell?.sourceItem);
  if (sourceItem) source.system.sourceItem = sourceItem;
  if (source.system.sourceClass) delete source.system.sourceClass;
  const sourceName = toTrimmedStringOrNull(spell?.source ?? source?.system?.source?.book);
  source.system.source = buildNetherscrollsSpellSource(sourceName, {
    ...spell,
    system: {
      ...(spell?.system ?? {}),
      source: source.system.source,
    },
  });
  source.effects ??= [];
  applyNetherscrollsImportFlags(source, spell, netherscrollsId);
  return source;
}

/** Retrieve inferred spell activities. */
function getNetherscrollsInferredSpellActivities(inferred) {
  const activities = inferred?.activities ?? (inferred?.activity ? [inferred.activity] : []);
  return sanitizeNetherscrollsActivityTargets(
    Object.fromEntries(
      activities.map(
        /** Transform each entry while retrieve inferred spell activities. */ (activity) => [
          activity._id,
          activity,
        ]
      )
    )
  );
}

/** Infer one coherent mechanic set, then build primary and secondary activities from that same context. */
function inferNetherscrollsSpellFields(source, descriptionHtml) {
  const text = normalizeNetherscrollsSpellText(descriptionHtml);
  const primaryText = getNetherscrollsPrimarySpellText(text);
  const activation = inferNetherscrollsSpellActivation(source, text);
  const properties = inferNetherscrollsSpellProperties(source, text);
  const duration = inferNetherscrollsSpellDuration(source, text);
  const range = inferNetherscrollsSpellRange(source, text);
  const target = inferNetherscrollsSpellTarget(source, text);
  const materials = inferNetherscrollsSpellMaterials(source, text);
  const saveAbility = inferNetherscrollsSpellSaveAbility(source, primaryText);
  const healing = inferNetherscrollsSpellHealing(source, primaryText);
  const damage = inferNetherscrollsSpellDamage(source, primaryText, text);
  const attack = inferNetherscrollsSpellAttack(source, primaryText);
  const inferred = {
    activation,
    damage,
    duration,
    healing,
    properties,
    range,
    saveAbility,
    target,
    text: primaryText,
    attack,
  };
  const activity = buildNetherscrollsSpellActivity(source, inferred);
  const activities = activity
    ? [activity, ...buildNetherscrollsSecondarySpellActivities(source, inferred, activity)]
    : [];

  return {
    activation,
    activity,
    activities,
    duration,
    materials,
    properties,
    range,
    target,
  };
}

export { normalizeNetherscrollsSpellData };
