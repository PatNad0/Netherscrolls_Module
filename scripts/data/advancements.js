/**
 * Translate class progression into Foundry advancement records.
 * Stable IDs and feature UUIDs keep repeated imports linked to the same grants and choices.
 */
import { MODULE_ID } from "../core/constants.js";
import { buildNetherscrollsStableId, toNumber, toTrimmedStringOrNull } from "../core/utils.js";
import {
  NETHERSCROLLS_ARMOR_TRAIT_ALIASES,
  NETHERSCROLLS_SKILL_LABELS,
  NETHERSCROLLS_TOOL_TRAIT_ALIASES,
  NETHERSCROLLS_WEAPON_TRAIT_ALIASES,
  SKILL_KEY_TO_NAME,
} from "./catalogs.js";
import {
  buildNetherscrollsFeatureChoiceDescriptors,
  buildNetherscrollsFeatureDescription,
  getNetherscrollsClassFeatureDescriptors,
  getNetherscrollsClassFeatures,
  getNetherscrollsFeatureChoices,
  getNetherscrollsFeatureTitle,
  getNetherscrollsInlineFeatureChoices,
  getNetherscrollsItemChoiceSubtype,
  getNetherscrollsItemChoiceType,
  getNetherscrollsSubclasses,
  isSameNetherscrollsSubclass,
  shouldCreateNetherscrollsFeatureChoiceItems,
} from "./class-features.js";
import { stripNetherscrollsHtmlTags } from "./descriptions.js";
import { getNetherscrollsSourceId } from "./references.js";
import { normalizeNetherscrollsSaveAbility } from "./rules.js";

/** Combine rule progression and feature grants using the UUIDs produced by the feature import pass. */
function buildNetherscrollsClassAdvancement(source, { featureUuidByKey }) {
  const advancement = {};
  addNetherscrollsAdvancement(advancement, buildNetherscrollsHitPointsAdvancement(source));

  for (const traitAdvancement of buildNetherscrollsClassTraitAdvancements(source)) {
    addNetherscrollsAdvancement(advancement, traitAdvancement);
  }

  const subclassAdvancement = buildNetherscrollsSubclassChoiceAdvancement(source);
  if (subclassAdvancement) addNetherscrollsAdvancement(advancement, subclassAdvancement);

  for (const level of getNetherscrollsClassAsiLevels(source)) {
    addNetherscrollsAdvancement(advancement, buildNetherscrollsAsiAdvancement(source, level));
  }

  for (const descriptor of getNetherscrollsClassFeatureDescriptors([source])) {
    if (descriptor.scope !== "class") continue;
    if (!shouldGrantNetherscrollsFeature(descriptor.feature)) continue;
    const uuid = featureUuidByKey.get(descriptor.key);
    if (!uuid) continue;
    addNetherscrollsAdvancement(
      advancement,
      buildNetherscrollsItemGrantAdvancement(
        descriptor.feature,
        uuid,
        descriptor.level,
        descriptor.key
      )
    );
    addNetherscrollsAdvancement(
      advancement,
      buildNetherscrollsItemChoiceAdvancement(descriptor, featureUuidByKey)
    );
  }

  return advancement;
}

/** Build subclass advancement. */
function buildNetherscrollsSubclassAdvancement(source, classSource, { featureUuidByKey }) {
  const advancement = {};
  for (const descriptor of getNetherscrollsClassFeatureDescriptors([
    { ...classSource, subclasses: [source] },
  ])) {
    if (descriptor.scope !== "subclass") continue;
    if (!shouldGrantNetherscrollsFeature(descriptor.feature)) continue;
    const uuid = featureUuidByKey.get(descriptor.key);
    if (!uuid) continue;
    addNetherscrollsAdvancement(
      advancement,
      buildNetherscrollsItemGrantAdvancement(
        descriptor.feature,
        uuid,
        descriptor.level,
        descriptor.key
      )
    );
    addNetherscrollsAdvancement(
      advancement,
      buildNetherscrollsItemChoiceAdvancement(descriptor, featureUuidByKey)
    );
  }
  return advancement;
}

/** Add advancement. */
function addNetherscrollsAdvancement(advancement, entry) {
  if (!entry?._id) return;
  advancement[entry._id] = entry;
}

/** Build hit points advancement. */
function buildNetherscrollsHitPointsAdvancement(source) {
  const id = buildNetherscrollsAdvancementId(source, "hit-points");
  return {
    _id: id,
    type: "HitPoints",
    configuration: {},
    value: {},
    title: "Hit Points",
    hint: toTrimmedStringOrNull(source?.hitPoints?.description) ?? "",
  };
}

/** Build class trait advancements. */
function buildNetherscrollsClassTraitAdvancements(source) {
  const proficiencies = source?.proficiencies ?? {};
  const advancements = [];
  const saveGrants = normalizeNetherscrollsSaveTraitKeys(proficiencies.savingThrows);
  if (saveGrants.length) {
    advancements.push(
      buildNetherscrollsTraitAdvancement(source, {
        key: "saving-throws",
        level: 1,
        title: "Saving Throw Proficiencies",
        grants: saveGrants,
      })
    );
  }

  const proficiencyGrants = [
    ...normalizeNetherscrollsArmorTraitKeys(proficiencies.armor),
    ...normalizeNetherscrollsWeaponTraitKeys(proficiencies.weapons),
    ...normalizeNetherscrollsToolTraitKeys(proficiencies.tools),
  ];
  if (proficiencyGrants.length) {
    advancements.push(
      buildNetherscrollsTraitAdvancement(source, {
        key: "equipment-proficiencies",
        level: 1,
        title: "Equipment Proficiencies",
        grants: proficiencyGrants,
      })
    );
  }

  for (const [index, choice] of getNetherscrollsSkillChoiceGroups(
    proficiencies.skillChoices
  ).entries()) {
    if (!choice.pool.length || choice.count <= 0) continue;
    advancements.push(
      buildNetherscrollsTraitAdvancement(source, {
        key: `skill-choices-${index}`,
        level: 1,
        title: toTrimmedStringOrNull(choice.title) ?? "Skill Proficiencies",
        choices: [
          {
            count: choice.count,
            pool: choice.pool,
          },
        ],
        hint: toTrimmedStringOrNull(choice.description) ?? "",
      })
    );
  }

  return advancements;
}

/** Build trait advancement. */
function buildNetherscrollsTraitAdvancement(
  source,
  { key, level, title, grants = [], choices = [], hint = "" }
) {
  const id = buildNetherscrollsAdvancementId(source, key);
  return {
    _id: id,
    type: "Trait",
    configuration: {
      allowReplacements: false,
      choices,
      grants,
      mode: "default",
    },
    value: {
      chosen: grants,
    },
    level,
    title,
    hint,
  };
}

/** Build subclass choice advancement. */
function buildNetherscrollsSubclassChoiceAdvancement(source) {
  const subclassFeature = getNetherscrollsClassFeatures(source).find(
    /** Find the matching entry while build subclass choice advancement. */
    (feature) => toTrimmedStringOrNull(feature?.choiceType)?.toLowerCase() === "subclass"
  );
  if (!subclassFeature && !getNetherscrollsSubclasses(source).length) return null;

  const level = Math.max(1, Math.trunc(toNumber(subclassFeature?.level, 3)));
  const title =
    toTrimmedStringOrNull(source?.subclassType) ??
    toTrimmedStringOrNull(subclassFeature?.title) ??
    "Subclass";
  const id = buildNetherscrollsAdvancementId(source, "subclass-choice");
  return {
    _id: id,
    type: "Subclass",
    configuration: {},
    value: {},
    level,
    title,
    hint: toTrimmedStringOrNull(source?.subclassIntroHtml ?? source?.subclassIntro) ?? "",
  };
}

/** Build asi advancement. */
function buildNetherscrollsAsiAdvancement(source, level) {
  const id = buildNetherscrollsAdvancementId(source, `asi-${level}`);
  return {
    _id: id,
    type: "AbilityScoreImprovement",
    configuration: {
      cap: 2,
      fixed: {},
      locked: [],
      points: 2,
    },
    value: {
      type: "asi",
      assignments: {},
    },
    level,
    title: "Ability Score Improvement",
    hint: "",
  };
}

/** Build item grant advancement. */
function buildNetherscrollsItemGrantAdvancement(feature, uuid, level, key) {
  const optional = Boolean(feature?.optional);
  const id = buildNetherscrollsAdvancementId(feature, `grant-${key}`);
  return {
    _id: id,
    type: "ItemGrant",
    configuration: {
      items: [
        {
          uuid,
          optional,
        },
      ],
      optional,
      spell: null,
    },
    value: {
      added: {},
    },
    level,
    title: getNetherscrollsFeatureTitle(feature),
    hint: toTrimmedStringOrNull(feature?.descriptionHtml ?? feature?.description) ?? "",
    flags: {
      [MODULE_ID]: {
        featureKey: key,
      },
    },
  };
}

/** Build item choice advancement. */
function buildNetherscrollsItemChoiceAdvancement(descriptor, featureUuidByKey) {
  const feature = descriptor.feature;
  if (!shouldBuildNetherscrollsItemChoiceAdvancement(feature)) return null;

  const choiceDescriptors = buildNetherscrollsFeatureChoiceDescriptors(descriptor);
  const pool = choiceDescriptors
    .map(
      /** Transform each entry while build item choice advancement. */ (
        choiceDescriptor,
        index
      ) => {
        const uuid = featureUuidByKey.get(choiceDescriptor.key);
        return uuid
          ? {
              uuid,
              sort: (index + 1) * 100000,
            }
          : null;
      }
    )
    .filter(Boolean);
  if (!pool.length) return null;

  const count = getNetherscrollsFeatureChoiceCount(feature, pool.length);
  const level = descriptor.level;
  return {
    _id: buildNetherscrollsAdvancementId(feature, `choice-${descriptor.key}`),
    type: "ItemChoice",
    configuration: {
      allowDrops: true,
      choices: {
        [String(level)]: {
          count,
          replacement: Boolean(
            feature?.replacement ?? feature?.replaceable ?? feature?.allowReplacement
          ),
        },
      },
      pool,
      restriction: {
        level: "",
        list: [],
        subtype: getNetherscrollsItemChoiceSubtype(feature),
        type: getNetherscrollsItemChoiceType(feature),
      },
      sorting: "a",
      spell: null,
      type: "feat",
    },
    value: {
      added: {},
      replaced: {},
    },
    level,
    title: getNetherscrollsFeatureTitle(feature),
    hint: stripNetherscrollsHtmlTags(buildNetherscrollsFeatureDescription(feature)),
    flags: {
      [MODULE_ID]: {
        featureKey: descriptor.key,
        choiceType: toTrimmedStringOrNull(feature?.choiceType) ?? "",
      },
    },
  };
}

/** Build advancement id. */
function buildNetherscrollsAdvancementId(source, key) {
  return buildNetherscrollsStableId(
    `adv:${getNetherscrollsSourceId(source) ?? source?.name ?? ""}:${key}`
  );
}

/** Determine whether grant feature. */
function shouldGrantNetherscrollsFeature(feature) {
  if (isNetherscrollsAbilityScoreImprovementFeature(feature)) return false;
  const choiceType = toTrimmedStringOrNull(feature?.choiceType)?.toLowerCase();
  if (choiceType === "subclass") return false;
  return true;
}

/** Determine whether build item choice advancement. */
function shouldBuildNetherscrollsItemChoiceAdvancement(feature) {
  return (
    shouldCreateNetherscrollsFeatureChoiceItems(feature) &&
    !getNetherscrollsInlineFeatureChoices(feature).length
  );
}

/** Retrieve feature choice count. */
function getNetherscrollsFeatureChoiceCount(feature, poolSize) {
  const explicit = toNumber(feature?.selectable ?? feature?.count, Number.NaN);
  if (Number.isFinite(explicit) && explicit > 0) return Math.min(poolSize, Math.trunc(explicit));
  return 1;
}

/** Determine whether ability score improvement feature. */
function isNetherscrollsAbilityScoreImprovementFeature(feature) {
  return /ability score improvement/i.test(
    toTrimmedStringOrNull(feature?.title ?? feature?.name) ?? ""
  );
}

/** Retrieve class asi levels. */
function getNetherscrollsClassAsiLevels(source) {
  const levels = getNetherscrollsClassFeatures(source)
    .filter(isNetherscrollsAbilityScoreImprovementFeature)
    .map(
      /** Transform each entry while retrieve class asi levels. */ (feature) =>
        Math.max(1, Math.trunc(toNumber(feature?.level, 0)))
    )
    .filter(Boolean);
  if (levels.length)
    return Array.from(new Set(levels)).sort(
      /** Order the entries while retrieve class asi levels. */ (a, b) => a - b
    );
  return [4, 8, 12, 16, 19];
}

/** Normalize primary ability. */
function normalizeNetherscrollsPrimaryAbility(source) {
  const explicit = source?.system?.primaryAbility ?? source?.primaryAbility;
  if (explicit && typeof explicit === "object") return explicit;
  const values = normalizeNetherscrollsAbilityList(explicit);
  return {
    value: values,
    all: values.length === 0,
  };
}

/** Normalize class properties. */
function normalizeNetherscrollsClassProperties(source) {
  const properties = source?.system?.properties ?? source?.properties;
  if (Array.isArray(properties)) return properties;
  if (properties instanceof Set) return Array.from(properties);
  if (properties && typeof properties === "object") {
    return Object.keys(properties).filter(
      /** Keep entries that satisfy the condition while normalize class properties. */ (key) =>
        properties[key]
    );
  }
  return [];
}

/** Normalize class spellcasting. */
function normalizeNetherscrollsClassSpellcasting(source, fallbackSource = {}) {
  const explicit = source?.system?.spellcasting;
  if (explicit && typeof explicit === "object") return explicit;
  const progression = normalizeNetherscrollsSpellcastingProgression(
    explicit ??
      source?.casterType ??
      source?.spellcasting?.progression ??
      fallbackSource?.casterType
  );
  return {
    progression,
    ability:
      normalizeNetherscrollsSaveAbility(source?.spellcastingAbility ?? source?.ability) ?? "",
  };
}

/** Normalize spellcasting progression. */
function normalizeNetherscrollsSpellcastingProgression(value) {
  const raw = toTrimmedStringOrNull(value)?.toLowerCase() ?? "none";
  const normalized = raw.replace(/[\s_-]+/g, "");
  if (!raw || raw === "false" || raw === "none" || raw === "no" || raw === "0") return "none";
  if (["full", "fullcaster", "caster"].includes(normalized)) return "full";
  if (["half", "halfcaster", "1/2"].includes(normalized)) return "half";
  if (["third", "thirdcaster", "1/3"].includes(normalized)) return "third";
  if (["pact", "pactmagic"].includes(normalized)) return "pact";
  if (["artificer"].includes(normalized)) return "artificer";
  return ["none", "full", "half", "third", "pact", "artificer"].includes(raw) ? raw : "none";
}

/** Normalize ability list. */
function normalizeNetherscrollsAbilityList(value) {
  const values = Array.isArray(value) ? value : [value];
  return values
    .map(
      /** Transform each entry while normalize ability list. */ (entry) =>
        normalizeNetherscrollsSaveAbility(entry)
    )
    .filter(Boolean);
}

/** Normalize save trait keys. */
function normalizeNetherscrollsSaveTraitKeys(value) {
  return normalizeNetherscrollsAbilityList(value).map(
    /** Transform each entry while normalize save trait keys. */ (ability) => `saves:${ability}`
  );
}

/** Normalize armor trait keys. */
function normalizeNetherscrollsArmorTraitKeys(value) {
  return normalizeNetherscrollsTraitKeys(value, NETHERSCROLLS_ARMOR_TRAIT_ALIASES);
}

/** Normalize weapon trait keys. */
function normalizeNetherscrollsWeaponTraitKeys(value) {
  return normalizeNetherscrollsTraitKeys(value, NETHERSCROLLS_WEAPON_TRAIT_ALIASES);
}

/** Normalize tool trait keys. */
function normalizeNetherscrollsToolTraitKeys(value) {
  return normalizeNetherscrollsTraitKeys(value, NETHERSCROLLS_TOOL_TRAIT_ALIASES);
}

/** Normalize trait keys. */
function normalizeNetherscrollsTraitKeys(value, aliases) {
  const values = Array.isArray(value) ? value : [value];
  const keys = [];
  for (const entry of values) {
    const key = normalizeNetherscrollsTraitKey(entry, aliases);
    if (key && !keys.includes(key)) keys.push(key);
  }
  return keys;
}

/** Normalize trait key. */
function normalizeNetherscrollsTraitKey(value, aliases) {
  const raw = toTrimmedStringOrNull(value);
  if (!raw) return null;
  if (/^[a-z]+:[a-z0-9*:-]+$/i.test(raw)) return raw;
  const normalized = raw.toLowerCase().replace(/\s+/g, " ").trim();
  const compact = normalized.replace(/[^a-z0-9]/g, "");
  return aliases[normalized] ?? aliases[compact] ?? null;
}

/** Retrieve skill choice groups. */
function getNetherscrollsSkillChoiceGroups(value) {
  const groups = Array.isArray(value) ? value : value ? [value] : [];
  return groups.map(
    /** Transform each entry while retrieve skill choice groups. */ (group) => {
      const choices = getNetherscrollsFeatureChoices(group);
      return {
        title: group?.title,
        description: group?.description,
        count: Math.max(1, Math.trunc(toNumber(group?.selectable ?? group?.count, 1))),
        pool: choices
          .map(
            /** Transform each entry while retrieve skill choice groups. */ (choice) =>
              normalizeNetherscrollsSkillTraitKey(choice?.title ?? choice?.name ?? choice)
          )
          .filter(Boolean),
      };
    }
  );
}

/** Normalize skill trait key. */
function normalizeNetherscrollsSkillTraitKey(value) {
  const raw = toTrimmedStringOrNull(value);
  if (!raw) return null;
  if (/^skills:[a-z]{3}$/i.test(raw)) return raw.toLowerCase();
  if (SKILL_KEY_TO_NAME[raw.toLowerCase()]) return `skills:${raw.toLowerCase()}`;
  const normalized = raw.toLowerCase().replace(/\s+/g, " ").trim();
  const compact = normalized.replace(/[^a-z0-9]/g, "");
  const key = NETHERSCROLLS_SKILL_LABELS[normalized] ?? NETHERSCROLLS_SKILL_LABELS[compact];
  return key ? `skills:${key}` : null;
}

/** Retrieve class feature uuids. */
function getNetherscrollsClassFeatureUuids(
  classSource,
  featureUuidByKey,
  scope,
  subclassSource = null
) {
  return getNetherscrollsClassFeatureDescriptors([classSource])
    .filter(
      /** Keep entries that satisfy the condition while retrieve class feature uuids. */ (
        descriptor
      ) => descriptor.scope === scope
    )
    .filter(
      /** Keep entries that satisfy the condition while retrieve class feature uuids. */
      (descriptor) =>
        !subclassSource ||
        isSameNetherscrollsSubclass(descriptor.subclassSource, subclassSource, classSource)
    )
    .map(
      /** Transform each entry while retrieve class feature uuids. */ (descriptor) =>
        featureUuidByKey.get(descriptor.key)
    )
    .filter(Boolean);
}

export {
  buildNetherscrollsClassAdvancement,
  buildNetherscrollsSubclassAdvancement,
  getNetherscrollsClassFeatureUuids,
  normalizeNetherscrollsClassProperties,
  normalizeNetherscrollsClassSpellcasting,
  normalizeNetherscrollsPrimaryAbility,
};
