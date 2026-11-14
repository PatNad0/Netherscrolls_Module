/**
 * Translate feat prerequisites, ability choices, and advancements into D&D5e fields.
 * Retain explicit Foundry data while supplying native-service defaults where required.
 */
import { MODULE_ID } from "../core/constants.js";
import {
  buildNetherscrollsStableId,
  duplicateNetherscrollsData,
  toTrimmedStringOrNull,
} from "../core/utils.js";
import { normalizeNetherscrollsImportImagePath } from "./images.js";
import {
  applyNetherscrollsImportFlags,
  buildNetherscrollsItemSource,
  normalizeNetherscrollsActivities,
  normalizeNetherscrollsItemUses,
} from "./item-fields.js";
import {
  getNetherscrollsDocumentFlag,
  getNetherscrollsFoundryItemPayload,
  getNetherscrollsSourceId,
} from "./references.js";
import {
  mergeNetherscrollsDefaults,
  normalizeNetherscrollsNullableNumber,
  normalizeNetherscrollsSaveAbility,
  slugifyNetherscrollsIdentifier,
} from "./rules.js";

/** Normalize feat data. */
function normalizeNetherscrollsFeatData(feat) {
  if (getNetherscrollsFoundryItemPayload(feat)) {
    return normalizeNetherscrollsFoundryFeatData(feat);
  }

  const source = duplicateNetherscrollsData(feat);
  const netherscrollsId = getNetherscrollsSourceId(feat);
  const descriptionHtml = toTrimmedStringOrNull(
    feat?.descriptionHtml ?? feat?.description ?? source.descriptionHtml ?? source.description
  );
  const sourceName = toTrimmedStringOrNull(source.source);
  const featData = {
    name: toTrimmedStringOrNull(source.name) ?? "Netherscrolls Feat",
    type: "feat",
    img: normalizeNetherscrollsImportImagePath(source.img, source.image),
    sort: 0,
    ownership: {
      default: 0,
    },
    system: buildNetherscrollsFeatSystem(source, {
      descriptionHtml,
      netherscrollsId,
      sourceName,
    }),
    effects: [],
  };

  applyNetherscrollsImportFlags(featData, source, netherscrollsId);
  return featData;
}

/** Normalize foundry feat data. */
function normalizeNetherscrollsFoundryFeatData(feat) {
  const source = duplicateNetherscrollsData(getNetherscrollsFoundryItemPayload(feat));
  const netherscrollsId = getNetherscrollsSourceId(feat);
  source.name = toTrimmedStringOrNull(source.name) ?? "Netherscrolls Feat";
  source.type = "feat";
  source.img = normalizeNetherscrollsImportImagePath(
    feat.img,
    feat.image,
    source.img,
    source.image
  );
  source.sort ??= 0;
  source.ownership ??= { default: 0 };
  source.effects ??= [];

  const descriptionHtml = toTrimmedStringOrNull(
    source.system?.description?.value ?? feat?.descriptionHtml ?? feat?.description
  );
  const sourceName = toTrimmedStringOrNull(feat?.source ?? source?.system?.source?.book);
  const defaults = buildNetherscrollsFeatSystem(
    {
      ...feat,
      system: source.system,
      flags: source.flags ?? feat?.flags,
    },
    {
      descriptionHtml,
      netherscrollsId,
      sourceName,
    }
  );
  source.system = mergeNetherscrollsDefaults(defaults, source.system ?? {});
  source.system.type = defaults.type;
  source.system.identifier ??= netherscrollsId
    ? `netherscrolls-${netherscrollsId}`
    : slugifyNetherscrollsIdentifier(source.name);
  source.system.source = buildNetherscrollsItemSource(sourceName, {
    ...feat,
    system: {
      ...(feat?.system ?? {}),
      source: source.system.source,
    },
  });

  applyNetherscrollsImportFlags(source, feat, netherscrollsId);
  return source;
}

/** Build feat system. */
function buildNetherscrollsFeatSystem(source, { descriptionHtml, netherscrollsId, sourceName }) {
  return {
    activities: normalizeNetherscrollsActivities(source),
    advancement: normalizeNetherscrollsFeatAdvancement(source),
    description: {
      value: descriptionHtml ?? "",
      chat: "",
    },
    identifier:
      toTrimmedStringOrNull(source?.system?.identifier) ??
      (netherscrollsId
        ? `netherscrolls-${netherscrollsId}`
        : slugifyNetherscrollsIdentifier(source?.name)),
    source: buildNetherscrollsItemSource(sourceName, source),
    cover: normalizeNetherscrollsNullableNumber(source?.system?.cover ?? source?.cover),
    crewed: Boolean(source?.system?.crewed ?? source?.crewed ?? false),
    enchant: {
      max: toTrimmedStringOrNull(source?.system?.enchant?.max ?? source?.enchant?.max) ?? "",
      period:
        toTrimmedStringOrNull(source?.system?.enchant?.period ?? source?.enchant?.period) ?? "",
    },
    prerequisites: normalizeNetherscrollsFeatPrerequisites(source),
    properties: normalizeNetherscrollsFeatProperties(source),
    requirements:
      toTrimmedStringOrNull(source?.system?.requirements ?? source?.requirement) ?? null,
    type: normalizeNetherscrollsFeatType(source),
    uses: normalizeNetherscrollsItemUses(source),
  };
}

/** Normalize feat advancement. */
function normalizeNetherscrollsFeatAdvancement(source) {
  const explicit = source?.system?.advancement ?? source?.advancement;
  if (explicit && typeof explicit === "object" && !Array.isArray(explicit)) {
    return explicit;
  }

  if (!isNetherscrollsDemifeatSource(source)) return {};
  const abilities = normalizeNetherscrollsFeatAbilities(source?.ability ?? source?.abilities);
  if (!abilities.length) return {};

  const fixed = {};
  for (const ability of abilities) fixed[ability] = 1;
  const id = buildNetherscrollsStableId(
    `asi${source?.netherscrollsId ?? source?._id ?? source?.id ?? source?.name ?? ""}`
  );
  return {
    [id]: {
      _id: id,
      type: "AbilityScoreImprovement",
      configuration: {
        cap: 2,
        fixed,
        locked: [],
        points: 0,
      },
      value: {
        type: "asi",
        assignments: {},
      },
      level: 0,
      title: "Ability Score Improvement",
      hint: "",
    },
  };
}

/** Normalize feat abilities. */
function normalizeNetherscrollsFeatAbilities(value) {
  const values = Array.isArray(value) ? value : [value];
  const abilities = [];
  for (const ability of values) {
    const normalized = normalizeNetherscrollsSaveAbility(ability);
    if (normalized && !abilities.includes(normalized)) abilities.push(normalized);
  }
  return abilities;
}

/** Determine whether demifeat source. */
function isNetherscrollsDemifeatSource(source) {
  return (
    source?.demifeat === true ||
    source?.system?.demifeat === true ||
    source?.flags?.[MODULE_ID]?.demifeat === true ||
    source?.flags?.netherscrolls?.demifeat === true
  );
}

/** Normalize feat prerequisites. */
function normalizeNetherscrollsFeatPrerequisites(source) {
  const explicit = source?.system?.prerequisites ?? source?.prerequisites;
  if (explicit && typeof explicit === "object") return explicit;

  return {
    items: [],
    level: normalizeNetherscrollsNullableNumber(source?.level ?? source?.minimumLevel),
    repeatable: Boolean(source?.repeatable ?? false),
  };
}

/** Normalize feat properties. */
function normalizeNetherscrollsFeatProperties(source) {
  const explicit = source?.system?.properties ?? source?.properties;
  if (Array.isArray(explicit)) return explicit;
  if (explicit instanceof Set) return Array.from(explicit);
  if (explicit && typeof explicit === "object") {
    return Object.keys(explicit).filter(
      /** Keep entries that satisfy the condition while normalize feat properties. */ (key) =>
        explicit[key]
    );
  }
  return [];
}

/** Normalize feat type. */
function normalizeNetherscrollsFeatType(source) {
  const candidates = [source?.system?.type, source?.foundryType, source?.featType];
  const explicit = candidates.find(
    /** Find the matching entry while normalize feat type. */ (type) =>
      toTrimmedStringOrNull(typeof type === "object" ? type?.value : type)
  );
  let value = toTrimmedStringOrNull(
    typeof explicit === "object" ? explicit?.value : explicit
  )?.toLowerCase();
  const subtype =
    toTrimmedStringOrNull(source?.system?.type?.subtype ?? explicit?.subtype ?? source?.subtype) ??
    "";
  const scope = toTrimmedStringOrNull(
    getNetherscrollsDocumentFlag(source, "featureScope")
  )?.toLowerCase();
  const choiceType = toTrimmedStringOrNull(
    getNetherscrollsDocumentFlag(source, "choiceType")
  )?.toLowerCase();
  const hasClassParent =
    getNetherscrollsDocumentFlag(source, "parentClassNetherscrollsId") ||
    getNetherscrollsDocumentFlag(source, "parentClassIdentifier");
  // Only our class-feature provenance can repair an old default "feat".
  // A real feat granted by a class/race advancement remains a feat, and
  // selectable feat choices (e.g. fighting styles) retain their own category.
  if (
    ["class", "subclass"].includes(scope) ||
    (scope === "choice" &&
      (!value || value === "feat") &&
      !subtype &&
      !["feat", "feats"].includes(choiceType)) ||
    (!value && scope !== "choice" && hasClassParent)
  ) {
    value = "class";
  }
  return {
    ...(explicit && typeof explicit === "object" ? explicit : {}),
    value: value ?? "feat",
    subtype,
  };
}

export { normalizeNetherscrollsFeatData, normalizeNetherscrollsFeatType };
