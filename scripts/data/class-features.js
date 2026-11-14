/**
 * Discover class features and build stable feature and choice document definitions.
 * Explicit feature records and inferred presentation content are reconciled by identity.
 */
import { MODULE_ID } from "../core/constants.js";
import {
  duplicateNetherscrollsData,
  escapeHtml,
  normalizeNetherscrollsName,
  toNumber,
  toTrimmedStringOrNull,
} from "../core/utils.js";
import {
  extractNetherscrollsFirstHtmlHeadingTitle,
  getNetherscrollsBlocksText,
  getNetherscrollsHtmlValue,
  getNetherscrollsProgressionColumnLabel,
  getNetherscrollsProgressionTable,
  joinNetherscrollsHtmlSections,
  normalizeNetherscrollsInferredFeatureTitle,
  renderNetherscrollsBlocks,
  stripNetherscrollsHtmlTags,
} from "./descriptions.js";
import { normalizeNetherscrollsImagePath } from "./images.js";
import {
  applyNetherscrollsImportFlags,
  buildNetherscrollsItemSource,
  normalizeNetherscrollsActivities,
  normalizeNetherscrollsItemUses,
} from "./item-fields.js";
import {
  buildNetherscrollsSyntheticSourceId,
  getItemNetherId,
  getNetherscrollsDocumentFlag,
  getNetherscrollsSourceId,
  isNetherscrollsDeleted,
} from "./references.js";
import {
  normalizeNetherscrollsClassIdentifier,
  normalizeNetherscrollsNullableNumber,
  normalizeNetherscrollsSubclassIdentifier,
  slugifyNetherscrollsIdentifier,
} from "./rules.js";

/** Give each feature and choice a reusable library definition with stable ownership metadata. */
function normalizeNetherscrollsClassFeatureData(descriptor) {
  const feature = descriptor.feature;
  const netherscrollsId = descriptor.netherscrollsId;
  const featureName = getNetherscrollsFeatureTitle(feature);
  const sourceName = toTrimmedStringOrNull(feature?.source ?? descriptor.classSource?.source);
  const itemData = {
    name: featureName,
    type: "feat",
    img: normalizeNetherscrollsImagePath(feature?.img, feature?.image),
    sort: 0,
    ownership: {
      default: 0,
    },
    system: {
      activities: normalizeNetherscrollsActivities(feature),
      advancement: normalizeNetherscrollsClassFeatureAdvancement(feature),
      description: {
        value: buildNetherscrollsFeatureDescription(feature),
        chat: "",
      },
      identifier: normalizeNetherscrollsClassFeatureIdentifier(descriptor),
      source: buildNetherscrollsItemSource(sourceName, {
        ...feature,
        rules:
          feature?.rules ??
          descriptor.classSource?.rules ??
          (descriptor.classSource?.legacy ? "2014" : undefined),
      }),
      cover: normalizeNetherscrollsNullableNumber(feature?.system?.cover ?? feature?.cover),
      crewed: false,
      enchant: {
        max: "",
        period: "",
      },
      prerequisites: {
        items: getNetherscrollsClassFeaturePrerequisiteItems(descriptor),
        level: null,
        repeatable: false,
      },
      properties: [],
      requirements: buildNetherscrollsFeatureRequirement(descriptor),
      type: {
        value: getNetherscrollsClassFeatureTypeValue(descriptor),
        subtype: getNetherscrollsClassFeatureSubtype(descriptor),
      },
      uses: normalizeNetherscrollsItemUses(feature),
    },
    effects: [],
  };

  applyNetherscrollsImportFlags(itemData, feature, netherscrollsId);
  itemData.flags = itemData.flags ?? {};
  itemData.flags[MODULE_ID] = {
    ...(itemData.flags[MODULE_ID] ?? {}),
    featureKey: descriptor.key,
    featureScope: descriptor.scope,
    parentClass: toTrimmedStringOrNull(descriptor.classSource?.name) ?? "",
    parentClassIdentifier: normalizeNetherscrollsClassIdentifier(descriptor.classSource),
    parentClassNetherscrollsId: getNetherscrollsSourceId(descriptor.classSource) ?? "",
    level: descriptor.level,
    optional: Boolean(feature?.optional),
    selectable: Math.max(0, Math.trunc(toNumber(feature?.selectable, 0))),
    choiceType: toTrimmedStringOrNull(descriptor.choiceType ?? feature?.choiceType) ?? "",
    choices: normalizeNetherscrollsFeatureChoices(feature),
    autoGrantChoices:
      feature.selectable === 0
        ? getNetherscrollsFeatureChoices(feature).map(getNetherscrollsSourceId).filter(Boolean)
        : [],
    ...(feature.mechanics
      ? { nativeMechanics: duplicateNetherscrollsData(feature.mechanics) }
      : {}),
  };
  if (descriptor.scope === "choice") {
    itemData.flags[MODULE_ID].parentFeatureKey = descriptor.parentFeatureKey ?? "";
    itemData.flags[MODULE_ID].parentFeature = getNetherscrollsFeatureTitle(
      descriptor.parentFeature
    );
    itemData.flags[MODULE_ID].choiceIndex = descriptor.choiceIndex ?? 0;
  }
  if (descriptor.subclassSource) {
    itemData.flags[MODULE_ID].parentSubclass =
      toTrimmedStringOrNull(descriptor.subclassSource?.name) ?? "";
    itemData.flags[MODULE_ID].parentSubclassIdentifier = normalizeNetherscrollsSubclassIdentifier(
      descriptor.subclassSource,
      descriptor.classSource
    );
    itemData.flags[MODULE_ID].parentSubclassNetherscrollsId =
      getNetherscrollsSourceId(descriptor.subclassSource) ?? "";
  }

  return itemData;
}

/** Normalize class feature advancement. */
function normalizeNetherscrollsClassFeatureAdvancement(feature) {
  const advancement = feature?.system?.advancement ?? feature?.advancement;
  return advancement && typeof advancement === "object" && !Array.isArray(advancement)
    ? advancement
    : {};
}

/** Use the same feature identity plan for library documents and class advancement references. */
function getNetherscrollsClassFeatureDescriptors(classes) {
  const descriptors = [];
  for (const classSource of classes) {
    for (const feature of getNetherscrollsClassFeatures(classSource)) {
      descriptors.push(buildNetherscrollsFeatureDescriptor(classSource, null, feature));
    }

    for (const subclassSource of getNetherscrollsSubclasses(classSource)) {
      for (const feature of getNetherscrollsSubclassFeatures(subclassSource, classSource)) {
        descriptors.push(buildNetherscrollsFeatureDescriptor(classSource, subclassSource, feature));
      }
    }
  }

  return descriptors;
}

/** Retrieve class feature item descriptors. */
function getNetherscrollsClassFeatureItemDescriptors(classes) {
  const descriptors = [];
  const visit = /** Handle visit. */ (descriptor) => {
    descriptors.push(descriptor);
    for (const choice of buildNetherscrollsFeatureChoiceDescriptors(descriptor)) visit(choice);
  };
  for (const descriptor of getNetherscrollsClassFeatureDescriptors(classes)) {
    visit(descriptor);
  }
  return descriptors;
}

/** Retrieve stale class feature document ids. */
async function getStaleNetherscrollsClassFeatureDocumentIds(pack, classes, descriptors) {
  const classIds = new Set(
    classes
      .map(
        /** Transform each entry while retrieve stale class feature document ids. */ (source) =>
          getNetherscrollsSourceId(source)
      )
      .filter(Boolean)
      .map(String)
  );
  const classIdentifiers = new Set(
    classes.map(normalizeNetherscrollsClassIdentifier).filter(Boolean)
  );
  const classNames = new Set(
    classes
      .map(
        /** Transform each entry while retrieve stale class feature document ids. */ (source) =>
          normalizeNetherscrollsName(source?.name).toLowerCase()
      )
      .filter(Boolean)
  );
  const expectedIds = new Set(
    descriptors
      .map(
        /** Transform each entry while retrieve stale class feature document ids. */ (descriptor) =>
          descriptor.netherscrollsId
      )
      .filter(Boolean)
      .map(String)
  );
  const expectedKeys = new Set(
    descriptors
      .map(
        /** Transform each entry while retrieve stale class feature document ids. */ (descriptor) =>
          descriptor.key
      )
      .filter(Boolean)
  );
  const documents = await pack.getDocuments();
  const staleIds = [];

  for (const document of documents) {
    if (!isNetherscrollsImportedClassFeatureDocument(document)) continue;
    if (
      !isNetherscrollsClassFeatureOwnedByImportedClass(document, {
        classIds,
        classIdentifiers,
        classNames,
      })
    )
      continue;

    const netherscrollsId = getItemNetherId(document);
    const featureKey = getNetherscrollsDocumentFlag(document, "featureKey");
    if (netherscrollsId && expectedIds.has(String(netherscrollsId))) continue;
    if (featureKey && expectedKeys.has(featureKey)) continue;
    if (document?.id) staleIds.push(document.id);
  }

  return staleIds;
}

/** Determine whether imported class feature document. */
function isNetherscrollsImportedClassFeatureDocument(document) {
  if (document?.type !== "feat") return false;
  return Boolean(
    getNetherscrollsDocumentFlag(document, "featureScope") ||
    getNetherscrollsDocumentFlag(document, "featureKey") ||
    getNetherscrollsDocumentFlag(document, "parentClassNetherscrollsId") ||
    getNetherscrollsDocumentFlag(document, "parentClassIdentifier")
  );
}

/** Determine whether class feature owned by imported class. */
function isNetherscrollsClassFeatureOwnedByImportedClass(
  document,
  { classIds, classIdentifiers, classNames }
) {
  const parentClassId = toTrimmedStringOrNull(
    getNetherscrollsDocumentFlag(document, "parentClassNetherscrollsId")
  );
  if (parentClassId && classIds.has(parentClassId)) return true;

  const parentClassIdentifier = toTrimmedStringOrNull(
    getNetherscrollsDocumentFlag(document, "parentClassIdentifier")
  );
  if (parentClassIdentifier && classIdentifiers.has(parentClassIdentifier)) return true;

  const parentClassName = normalizeNetherscrollsName(
    getNetherscrollsDocumentFlag(document, "parentClass")
  ).toLowerCase();
  return Boolean(parentClassName && classNames.has(parentClassName));
}

/** Build feature descriptor. */
function buildNetherscrollsFeatureDescriptor(classSource, subclassSource, feature) {
  const scope = subclassSource ? "subclass" : "class";
  const level = Math.max(1, Math.trunc(toNumber(feature?.level, 1)));
  const key = buildNetherscrollsClassFeatureKey(classSource, subclassSource, feature);
  const netherscrollsId =
    getNetherscrollsSourceId(feature) ?? buildNetherscrollsSyntheticSourceId("feature", key);
  return {
    key,
    scope,
    netherscrollsId,
    classSource,
    subclassSource,
    feature,
    level,
    deleted:
      isNetherscrollsDeleted(feature) ||
      isNetherscrollsDeleted(classSource) ||
      Boolean(subclassSource && isNetherscrollsDeleted(subclassSource)),
  };
}

/** Represent choices as separate stable documents so advancements can grant the selected option. */
function buildNetherscrollsFeatureChoiceDescriptors(parentDescriptor) {
  if (!shouldCreateNetherscrollsFeatureChoiceItems(parentDescriptor.feature)) return [];

  const descriptors = [];
  for (const [index, choice] of getNetherscrollsFeatureChoices(
    parentDescriptor.feature
  ).entries()) {
    const title = getNetherscrollsFeatureChoiceTitle(choice, index);
    if (!title) continue;

    const choiceKey = getNetherscrollsFeatureChoiceKey(parentDescriptor, choice, index);
    const netherscrollsId =
      getNetherscrollsSourceId(choice) ??
      buildNetherscrollsSyntheticSourceId("feature-choice", choiceKey);
    const choiceDescriptor = {
      key: choiceKey,
      scope: "choice",
      netherscrollsId,
      classSource: parentDescriptor.classSource,
      subclassSource: parentDescriptor.subclassSource,
      parentFeature: parentDescriptor.feature,
      parentFeatureKey: parentDescriptor.key,
      choiceIndex: index,
      choiceType: toTrimmedStringOrNull(parentDescriptor.feature?.choiceType) ?? "",
      feature: buildNetherscrollsFeatureChoiceItem(
        parentDescriptor,
        choice,
        index,
        netherscrollsId
      ),
      level: Math.max(parentDescriptor.level, toNumber(choice?.level, 1)),
      deleted: parentDescriptor.deleted || isNetherscrollsDeleted(choice),
    };
    choiceDescriptor.feature.choices = getNetherscrollsFeatureChoices(choice);
    choiceDescriptor.feature.selectable = choice?.selectable ?? 0;
    descriptors.push(choiceDescriptor);
  }

  return descriptors;
}

/** Build feature choice item. */
function buildNetherscrollsFeatureChoiceItem(parentDescriptor, choice, index, netherscrollsId) {
  const parentFeature = parentDescriptor.feature;
  const title = getNetherscrollsFeatureChoiceTitle(choice, index);
  const source = choice && typeof choice === "object" ? choice : {};
  return {
    ...source,
    _id: netherscrollsId,
    title,
    name: title,
    level: Math.max(parentDescriptor.level, toNumber(source.level, 1)),
    descriptionHtml:
      buildNetherscrollsFeatureChoiceDescription(choice) ||
      buildNetherscrollsFeatureChoiceFallbackDescription(choice, parentFeature),
    choices: [],
    selectable: 0,
    choiceType: "",
    source: source.source ?? parentFeature?.source,
    rules: source.rules ?? parentFeature?.rules,
    img: source.img ?? source.image ?? parentFeature?.img ?? parentFeature?.image,
  };
}

// Netherscrolls leaves some options without text: creature forms and companions (their
// statistics are in `creature`) and Favored Enemy / Terrain picks, where the name is the option.
function buildNetherscrollsFeatureChoiceFallbackDescription(choice, parentFeature) {
  const sections = [];
  const creature = choice?.creature;
  if (creature && typeof creature === "object") {
    const challenge = Number(creature.challengeRating);
    const fractions = { 0.125: "1/8", 0.25: "1/4", 0.5: "1/2" };
    const header = [
      toTrimmedStringOrNull(creature.size),
      Number.isFinite(challenge) ? `CR ${fractions[challenge] ?? challenge}` : null,
    ]
      .filter(Boolean)
      .join(", ");
    if (header) sections.push(`<p><strong>${escapeHtml(header)}</strong></p>`);

    const movement = Object.entries(creature.movement ?? {})
      .map(
        /** Transform each entry while build feature choice fallback description. */ ([
          mode,
          distance,
        ]) => [mode, toTrimmedStringOrNull(distance)]
      )
      .filter(
        /** Keep entries that satisfy the condition while build feature choice fallback description. */ ([
          ,
          distance,
        ]) => distance
      )
      .sort(
        /** Order the entries while build feature choice fallback description. */ ([a], [b]) =>
          a === "walk" ? -1 : b === "walk" ? 1 : 0
      )
      .map(
        /** Transform each entry while build feature choice fallback description. */ ([
          mode,
          distance,
        ]) => (mode === "walk" ? distance : `${mode} ${distance}`)
      );
    if (movement.length)
      sections.push(`<p><strong>Speed</strong> ${escapeHtml(movement.join(", "))}</p>`);

    const senses = Object.entries(creature.senses ?? {})
      .map(
        /** Transform each entry while build feature choice fallback description. */ ([
          sense,
          value,
        ]) => [sense, toTrimmedStringOrNull(value)]
      )
      .filter(
        /** Keep entries that satisfy the condition while build feature choice fallback description. */ ([
          ,
          value,
        ]) => value
      )
      .map(
        /** Transform each entry while build feature choice fallback description. */ ([
          sense,
          value,
        ]) =>
          sense === "passive_perception"
            ? `passive Perception ${value}`
            : `${sense.replace(/_/g, " ")} ${value}`
      );
    if (senses.length)
      sections.push(`<p><strong>Senses</strong> ${escapeHtml(senses.join(", "))}</p>`);
  }
  const parentTitle = getNetherscrollsFeatureTitle(parentFeature);
  if (parentTitle) sections.push(`<p>An option of <em>${escapeHtml(parentTitle)}</em>.</p>`);
  return sections.join("");
}

/** Retrieve feature choice key. */
function getNetherscrollsFeatureChoiceKey(parentDescriptor, choice, index) {
  const choiceId = getNetherscrollsSourceId(choice);
  const choiceKey =
    choiceId ??
    `${index + 1}-${slugifyNetherscrollsIdentifier(getNetherscrollsFeatureChoiceTitle(choice, index))}`;
  return `${parentDescriptor.key}:choice:${choiceKey}`;
}

/** Build class feature key. */
function buildNetherscrollsClassFeatureKey(classSource, subclassSource, feature) {
  const classKey =
    getNetherscrollsSourceId(classSource) ?? normalizeNetherscrollsClassIdentifier(classSource);
  const subclassKey = subclassSource
    ? (getNetherscrollsSourceId(subclassSource) ??
      normalizeNetherscrollsSubclassIdentifier(subclassSource, classSource))
    : "class";
  const featureKey =
    getNetherscrollsSourceId(feature) ??
    `${Math.max(1, Math.trunc(toNumber(feature?.level, 1)))}-${slugifyNetherscrollsIdentifier(getNetherscrollsFeatureTitle(feature))}`;
  return `${classKey}:${subclassKey}:${featureKey}`;
}

/** Determine whether create feature choice items. */
function shouldCreateNetherscrollsFeatureChoiceItems(feature) {
  const choices = getNetherscrollsFeatureChoices(feature);
  if (!choices.length) return false;

  const choiceType = toTrimmedStringOrNull(feature?.choiceType)
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (choiceType === "subclass") return false;
  return true;
}

/** Retrieve item choice type. */
function getNetherscrollsItemChoiceType(feature) {
  const choiceType = toTrimmedStringOrNull(feature?.choiceType)?.toLowerCase();
  return ["feat", "feats"].includes(choiceType) || getNetherscrollsItemChoiceSubtype(feature)
    ? "feat"
    : "class";
}

/** Retrieve item choice subtype. */
function getNetherscrollsItemChoiceSubtype(feature) {
  const choiceType = toTrimmedStringOrNull(feature?.choiceType)
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (
    choiceType === "fightingstyle" ||
    /fighting\s+style/i.test(getNetherscrollsFeatureTitle(feature))
  ) {
    return "fightingStyle";
  }
  return "";
}

/** Normalize class feature identifier. */
function normalizeNetherscrollsClassFeatureIdentifier(descriptor) {
  return slugifyNetherscrollsIdentifier(
    `${normalizeNetherscrollsClassIdentifier(descriptor.classSource)}-${descriptor.scope}-${getNetherscrollsFeatureTitle(descriptor.feature)}-${descriptor.level}`
  );
}

/** Determine whether same subclass. */
function isSameNetherscrollsSubclass(left, right, classSource) {
  if (left === right) return true;
  const leftId = getNetherscrollsSourceId(left);
  const rightId = getNetherscrollsSourceId(right);
  if (leftId || rightId) return leftId === rightId;
  return (
    normalizeNetherscrollsSubclassIdentifier(left, classSource) ===
    normalizeNetherscrollsSubclassIdentifier(right, classSource)
  );
}

/** Retrieve class features. */
function getNetherscrollsClassFeatures(source) {
  if (Array.isArray(source?.classFeatures)) return source.classFeatures;
  if (Array.isArray(source?.features)) return source.features;
  return inferNetherscrollsClassFeatures(source);
}

/** Retrieve subclasses. */
function getNetherscrollsSubclasses(source) {
  return Array.isArray(source?.subclasses) ? source.subclasses : [];
}

/** Retrieve subclass features. */
function getNetherscrollsSubclassFeatures(source, classSource = null) {
  if (Array.isArray(source?.subclassFeatures)) return source.subclassFeatures;
  if (Array.isArray(source?.features)) return source.features;
  return inferNetherscrollsSubclassFeatures(source, classSource);
}

/** Handle merge feature lists. */
function mergeNetherscrollsFeatureLists(...lists) {
  const merged = [];
  const byKey = new Map();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const feature of list) {
      if (!feature || typeof feature !== "object") continue;
      const key = getNetherscrollsFeatureMergeKey(feature);
      if (!key) continue;
      if (!byKey.has(key)) {
        byKey.set(key, feature);
        merged.push(feature);
      }
    }
  }
  return merged;
}

/** Retrieve feature merge key. */
function getNetherscrollsFeatureMergeKey(feature) {
  const title = getNetherscrollsFeatureTitle(feature);
  const level = Math.max(1, Math.trunc(toNumber(feature?.level, 1)));
  const id = feature?.inferredFrom ? null : getNetherscrollsSourceId(feature);
  return id ? `id:${id}` : `${level}:${slugifyNetherscrollsIdentifier(title)}`;
}

/** Infer class features. */
function inferNetherscrollsClassFeatures(source) {
  const progressionFeatures = extractNetherscrollsProgressionFeatures(source);
  const sectionFeatures = extractNetherscrollsFeatureSections(source, {
    fallbackFeatures: progressionFeatures,
    scope: "class",
  });
  const blockFeatures = extractNetherscrollsFeatureBlocks(source, {
    fallbackFeatures: progressionFeatures,
    scope: "class",
  });
  return mergeNetherscrollsFeatureLists(sectionFeatures, blockFeatures, progressionFeatures);
}

/** Infer subclass features. */
function inferNetherscrollsSubclassFeatures(source, classSource = null) {
  const sectionFeatures = extractNetherscrollsFeatureSections(source, {
    fallbackFeatures: [],
    scope: "subclass",
    classSource,
  });
  const blockFeatures = extractNetherscrollsFeatureBlocks(source, {
    fallbackFeatures: [],
    scope: "subclass",
    classSource,
  });
  return mergeNetherscrollsFeatureLists(sectionFeatures, blockFeatures);
}

/** Build inferred feature. */
function buildInferredNetherscrollsFeature(
  source,
  { title, level, descriptionHtml = "", inferredFrom = "", choiceType = "" }
) {
  const featureTitle = toTrimmedStringOrNull(title) ?? "Class Feature";
  const normalizedLevel = Math.max(1, Math.min(20, Math.trunc(toNumber(level, 1))));
  const keySource = `${getNetherscrollsSourceId(source) ?? normalizeNetherscrollsName(source?.name)}:${normalizedLevel}:${featureTitle}:${inferredFrom}`;
  return {
    _id: buildNetherscrollsSyntheticSourceId("feature", keySource),
    level: normalizedLevel,
    title: featureTitle,
    description: descriptionHtml,
    descriptionHtml,
    selectable: 0,
    choices: [],
    choiceType,
    inferredFrom,
  };
}

/** Extract progression features. */
function extractNetherscrollsProgressionFeatures(source) {
  const table = getNetherscrollsProgressionTable(source);
  const columns = Array.isArray(table?.columns) ? table.columns : [];
  const rows = Array.isArray(table?.rows) ? table.rows : [];
  if (!columns.length || !rows.length) return [];

  const features = [];
  for (const row of rows) {
    const level = getNetherscrollsProgressionRowLevel(row, columns);
    if (!level) continue;

    for (const value of getNetherscrollsProgressionFeatureValues(row, columns)) {
      for (const title of splitNetherscrollsFeatureTitles(value)) {
        features.push(
          buildInferredNetherscrollsFeature(source, {
            title,
            level,
            descriptionHtml: "",
            inferredFrom: "progression",
          })
        );
      }
    }
  }

  return mergeNetherscrollsFeatureLists(features);
}

/** Retrieve progression row level. */
function getNetherscrollsProgressionRowLevel(row, columns) {
  const direct = getNetherscrollsProgressionRowValue(row, "level", 0);
  const directLevel = parseNetherscrollsFeatureLevel(direct);
  if (directLevel) return directLevel;

  for (const [index, column] of columns.entries()) {
    const label = getNetherscrollsProgressionColumnLabel(column).toLowerCase();
    const key = getNetherscrollsProgressionColumnKey(column);
    if (!/\blevel\b/.test(label) && !/\blevel\b/.test(String(key ?? "").toLowerCase())) continue;
    const level = parseNetherscrollsFeatureLevel(
      getNetherscrollsProgressionRowValue(row, column, index)
    );
    if (level) return level;
  }

  return null;
}

/** Retrieve progression feature values. */
function getNetherscrollsProgressionFeatureValues(row, columns) {
  const values = [];
  for (const [index, column] of columns.entries()) {
    const label = getNetherscrollsProgressionColumnLabel(column).toLowerCase();
    const key = String(getNetherscrollsProgressionColumnKey(column) ?? "").toLowerCase();
    if (!/\bfeatures?\b/.test(label) && !/\bfeatures?\b/.test(key)) continue;
    values.push(getNetherscrollsProgressionRowValue(row, column, index));
  }

  if (!values.length) {
    values.push(row?.features, row?.classFeatures, row?.feature);
  }

  return values.filter(
    /** Keep entries that satisfy the condition while retrieve progression feature values. */ (
      value
    ) => value != null
  );
}

/** Retrieve progression column key. */
function getNetherscrollsProgressionColumnKey(column) {
  if (typeof column === "string") return column;
  return column?.key ?? column?.id ?? column?.name ?? column?.title ?? column?.label ?? null;
}

/** Retrieve progression row value. */
function getNetherscrollsProgressionRowValue(row, column, index = null) {
  if (!row) return null;
  if (Array.isArray(row)) return index == null ? null : row[index];
  if (typeof column === "string") return row[column];
  const key = getNetherscrollsProgressionColumnKey(column);
  return key != null ? row[key] : null;
}

/** Handle split feature titles. */
function splitNetherscrollsFeatureTitles(value) {
  const titles = [];
  for (const entry of flattenNetherscrollsFeatureTitleValues(value)) {
    const raw = toTrimmedStringOrNull(entry);
    if (!raw) continue;
    const withBreaks = raw
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/li>\s*<li>/gi, "\n")
      .replace(/<[^>]+>/g, " ");
    for (const piece of withBreaks.split(/[,;\n]+/)) {
      const title = normalizeNetherscrollsInferredFeatureTitle(piece);
      if (title) titles.push(title);
    }
  }
  return titles;
}

/** Handle flatten feature title values. */
function flattenNetherscrollsFeatureTitleValues(value) {
  if (Array.isArray(value)) return value.flatMap(flattenNetherscrollsFeatureTitleValues);
  if (value && typeof value === "object") {
    if (value.title || value.name) return [value.title ?? value.name];
    return Object.values(value).flatMap(flattenNetherscrollsFeatureTitleValues);
  }
  return [value];
}

/** Extract feature sections. */
function extractNetherscrollsFeatureSections(
  source,
  { fallbackFeatures = [], scope, classSource = null } = {}
) {
  const progressionByTitle = buildNetherscrollsFeatureTitleLookup(fallbackFeatures);
  const features = [];
  for (const section of getNetherscrollsStructuredSections(source)) {
    const rawTitle = toTrimmedStringOrNull(section?.title ?? section?.name);
    if (!rawTitle) continue;

    const sectionTitle = stripNetherscrollsFeatureLevelPrefix(rawTitle);
    if (isNetherscrollsGenericClassSectionTitle(sectionTitle)) continue;

    const titleKey = slugifyNetherscrollsIdentifier(sectionTitle);
    const fallback = progressionByTitle.get(titleKey);
    const level =
      parseNetherscrollsFeatureLevel(
        section?.level ?? section?.classLevel ?? section?.unlockLevel
      ) ??
      parseNetherscrollsFeatureLevel(rawTitle) ??
      parseNetherscrollsFeatureLevelFromText(buildNetherscrollsSectionText(section)) ??
      fallback?.level ??
      null;
    if (!level) continue;

    features.push(
      buildInferredNetherscrollsFeature(source, {
        title: fallback?.title ?? sectionTitle,
        level,
        descriptionHtml: buildNetherscrollsSectionDescription(section),
        inferredFrom: scope === "subclass" ? "subclass-section" : "class-section",
        choiceType: inferNetherscrollsFeatureChoiceType(sectionTitle, classSource ?? source),
      })
    );
  }

  return features;
}

/** Extract feature blocks. */
function extractNetherscrollsFeatureBlocks(
  source,
  { fallbackFeatures = [], scope, classSource = null } = {}
) {
  const blockGroups = collectNetherscrollsFeatureBlockGroups(source?.blocks);
  if (!blockGroups.length) return [];

  const progressionByTitle = buildNetherscrollsFeatureTitleLookup(fallbackFeatures);
  const features = [];
  for (const group of blockGroups) {
    const rawTitle = toTrimmedStringOrNull(group?.title);
    if (!rawTitle) continue;

    const featureTitle = stripNetherscrollsFeatureLevelPrefix(rawTitle);
    if (isNetherscrollsGenericClassSectionTitle(featureTitle)) continue;

    const titleKey = slugifyNetherscrollsIdentifier(featureTitle);
    const fallback = progressionByTitle.get(titleKey);
    const level =
      parseNetherscrollsFeatureLevel(group?.level ?? group?.classLevel ?? group?.unlockLevel) ??
      parseNetherscrollsFeatureLevel(rawTitle) ??
      parseNetherscrollsFeatureLevelFromText(getNetherscrollsBlocksText(group?.blocks)) ??
      fallback?.level ??
      parseNetherscrollsFeatureLevel(source?.level ?? source?.classLevel ?? source?.unlockLevel) ??
      null;
    if (!level) continue;

    features.push(
      buildInferredNetherscrollsFeature(source, {
        title: fallback?.title ?? featureTitle,
        level,
        descriptionHtml: renderNetherscrollsBlocks(group.blocks),
        inferredFrom: scope === "subclass" ? "subclass-blocks" : "class-blocks",
        choiceType: inferNetherscrollsFeatureChoiceType(featureTitle, classSource ?? source),
      })
    );
  }

  return features;
}

/** Collect feature block groups. */
function collectNetherscrollsFeatureBlockGroups(blocks) {
  if (!Array.isArray(blocks)) return [];

  const groups = [];
  let current = null;
  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;

    if (Array.isArray(block.blocks) && (block.title || block.name)) {
      if (current) groups.push(current);
      current = null;
      groups.push({
        title: block.title ?? block.name,
        level: block.level ?? block.classLevel ?? block.unlockLevel,
        blocks: block.blocks,
      });
      continue;
    }

    const headingTitle = getNetherscrollsBlockHeadingTitle(block);
    if (headingTitle) {
      if (current) groups.push(current);
      current = {
        title: headingTitle,
        level: block.level ?? block.classLevel ?? block.unlockLevel,
        blocks: [],
      };
      continue;
    }

    if (current) current.blocks.push(block);
  }

  if (current) groups.push(current);
  return groups;
}

/** Retrieve block heading title. */
function getNetherscrollsBlockHeadingTitle(block) {
  const type = toTrimmedStringOrNull(block?.type)?.toLowerCase();
  if (["heading", "h1", "h2", "h3", "h4"].includes(type)) {
    return normalizeNetherscrollsInferredFeatureTitle(block?.text ?? block?.title ?? block?.name);
  }
  if (type === "html") return extractNetherscrollsFirstHtmlHeadingTitle(block?.html);
  return null;
}

/** Build feature title lookup. */
function buildNetherscrollsFeatureTitleLookup(features) {
  const lookup = new Map();
  for (const feature of features) {
    const title = getNetherscrollsFeatureTitle(feature);
    lookup.set(slugifyNetherscrollsIdentifier(title), feature);
  }
  return lookup;
}

/** Retrieve structured sections. */
function getNetherscrollsStructuredSections(source) {
  const sections = [];
  collectNetherscrollsSections(sections, source?.sections);
  collectNetherscrollsSections(sections, source?.summary?.sections);
  collectNetherscrollsSections(sections, source?.presentation?.sections);
  return sections;
}

/** Collect sections. */
function collectNetherscrollsSections(target, sections) {
  if (!Array.isArray(sections)) return;
  for (const section of sections) {
    if (!section || typeof section !== "object") continue;
    target.push(section);
    collectNetherscrollsSections(target, section.sections);
  }
}

/** Build section description. */
function buildNetherscrollsSectionDescription(section) {
  return joinNetherscrollsHtmlSections([
    getNetherscrollsHtmlValue(section?.descriptionHtml),
    getNetherscrollsHtmlValue(section?.contentHtml),
    getNetherscrollsHtmlValue(section?.description),
    renderNetherscrollsBlocks(section?.blocks),
  ]);
}

/** Build section text. */
function buildNetherscrollsSectionText(section) {
  return [
    section?.descriptionHtml,
    section?.contentHtml,
    section?.description,
    getNetherscrollsBlocksText(section?.blocks),
  ]
    .map(
      /** Transform each entry while build section text. */ (value) =>
        stripNetherscrollsHtmlTags(value)
    )
    .filter(Boolean)
    .join(" ");
}

/** Parse feature level. */
function parseNetherscrollsFeatureLevel(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  if (Number.isFinite(number) && number >= 1 && number <= 20) return Math.trunc(number);
  const raw = String(value);
  const match = /\b([1-9]|1[0-9]|20)(?:st|nd|rd|th)?(?:\s*[- ]?level|\s*level)?\b/i.exec(raw);
  if (!match) return null;
  return Math.max(1, Math.min(20, Math.trunc(Number(match[1]))));
}

/** Parse feature level from text. */
function parseNetherscrollsFeatureLevelFromText(value) {
  const raw = toTrimmedStringOrNull(value);
  if (!raw) return null;
  const match =
    /\b(?:([1-9]|1[0-9]|20)(?:st|nd|rd|th)?\s*[- ]?level|level\s+([1-9]|1[0-9]|20))\b/i.exec(raw);
  if (!match) return null;
  return Math.max(1, Math.min(20, Math.trunc(Number(match[1] ?? match[2]))));
}

/** Handle strip feature level prefix. */
function stripNetherscrollsFeatureLevelPrefix(value) {
  return (
    toTrimmedStringOrNull(
      String(value ?? "").replace(
        /^\s*(?:at\s+)?(?:(?:[1-9]|1[0-9]|20)(?:st|nd|rd|th)?\s*[- ]?level(?:\s*[:.-]\s*|\s+)|(?:[1-9]|1[0-9]|20)(?:st|nd|rd|th)(?:\s*[:.-]\s*|\s+)|(?:[1-9]|1[0-9]|20)\s*[:.-]\s*)/i,
        ""
      )
    ) ?? String(value ?? "")
  );
}

/** Determine whether generic class section title. */
function isNetherscrollsGenericClassSectionTitle(value) {
  const normalized = slugifyNetherscrollsIdentifier(value);
  return [
    "class-features",
    "subclasses",
    "creating-a-class",
    "creating-a-character",
    "hit-points",
    "proficiencies",
    "equipment",
    "starting-equipment",
    "quick-build",
    "multiclassing",
  ].includes(normalized);
}

/** Infer feature choice type. */
function inferNetherscrollsFeatureChoiceType(title, source) {
  const rawSubclassType = toTrimmedStringOrNull(source?.subclassType);
  if (!rawSubclassType) return "";
  const titleKey = slugifyNetherscrollsIdentifier(title).replace(/s$/, "");
  const subclassTypeKey = slugifyNetherscrollsIdentifier(rawSubclassType).replace(/s$/, "");
  return titleKey === subclassTypeKey ? "subclass" : "";
}

/** Retrieve feature title. */
function getNetherscrollsFeatureTitle(feature) {
  return toTrimmedStringOrNull(feature?.title ?? feature?.name) ?? "Class Feature";
}

/** Retrieve feature choices. */
function getNetherscrollsFeatureChoices(feature) {
  return Array.isArray(feature?.choices) ? feature.choices : [];
}

/** Normalize feature choices. */
function normalizeNetherscrollsFeatureChoices(feature) {
  return getNetherscrollsFeatureChoices(feature).map(
    /** Transform each entry while normalize feature choices. */ (choice, index) => ({
      id: getNetherscrollsSourceId(choice) ?? "",
      title: getNetherscrollsFeatureChoiceTitle(choice, index),
      description: buildNetherscrollsFeatureChoiceDescription(choice),
    })
  );
}

/** Retrieve feature choice title. */
function getNetherscrollsFeatureChoiceTitle(choice, index = 0) {
  if (choice && typeof choice === "object") {
    return (
      toTrimmedStringOrNull(choice.title ?? choice.name ?? choice.label) ?? `Choice ${index + 1}`
    );
  }
  return toTrimmedStringOrNull(choice) ?? `Choice ${index + 1}`;
}

/** Build feature choice description. */
function buildNetherscrollsFeatureChoiceDescription(choice) {
  if (!choice || typeof choice !== "object") return "";
  return joinNetherscrollsHtmlSections([
    getNetherscrollsHtmlValue(choice?.descriptionHtml),
    getNetherscrollsHtmlValue(choice?.contentHtml),
    getNetherscrollsHtmlValue(choice?.description),
    renderNetherscrollsBlocks(choice?.blocks),
  ]);
}

/** Build feature requirement. */
function buildNetherscrollsFeatureRequirement(descriptor) {
  const level = descriptor.level;
  if (descriptor.subclassSource) {
    return `${toTrimmedStringOrNull(descriptor.subclassSource?.name) ?? "Subclass"} ${level}`;
  }
  return `${toTrimmedStringOrNull(descriptor.classSource?.name) ?? "Class"} ${level}`;
}

/** Retrieve class feature type value. */
function getNetherscrollsClassFeatureTypeValue(descriptor) {
  return descriptor.scope === "choice"
    ? getNetherscrollsItemChoiceType(descriptor.parentFeature)
    : "class";
}

/** Retrieve class feature subtype. */
function getNetherscrollsClassFeatureSubtype(descriptor) {
  return descriptor.scope === "choice"
    ? getNetherscrollsItemChoiceSubtype(descriptor.parentFeature)
    : "";
}

/** Retrieve class feature prerequisite items. */
function getNetherscrollsClassFeaturePrerequisiteItems(descriptor) {
  if (descriptor.scope !== "choice") return [];
  const parentTitle = getNetherscrollsFeatureTitle(descriptor.parentFeature);
  return [slugifyNetherscrollsIdentifier(parentTitle)].filter(Boolean);
}

/** Build feature description. */
function buildNetherscrollsFeatureDescription(feature) {
  const choiceHtml = renderNetherscrollsFeatureChoices(feature);
  return joinNetherscrollsHtmlSections([
    getNetherscrollsHtmlValue(feature?.descriptionHtml),
    getNetherscrollsHtmlValue(feature?.contentHtml),
    getNetherscrollsHtmlValue(feature?.description),
    renderNetherscrollsBlocks(feature?.blocks),
    choiceHtml,
  ]);
}

/** Render feature choices. */
function renderNetherscrollsFeatureChoices(feature) {
  const choices = normalizeNetherscrollsFeatureChoices(feature).filter(
    /** Keep entries that satisfy the condition while render feature choices. */ (choice) =>
      choice.title
  );
  if (!choices.length) return "";
  const items = choices
    .map(
      /** Transform each entry while render feature choices. */ (choice) => {
        const description = toTrimmedStringOrNull(choice.description);
        return `<li><strong>${escapeHtml(choice.title)}</strong>${description ? ` ${description}` : ""}</li>`;
      }
    )
    .join("");
  return `<h3>Choices</h3><ul>${items}</ul>`;
}

export {
  buildNetherscrollsFeatureChoiceDescriptors,
  buildNetherscrollsFeatureDescription,
  getNetherscrollsClassFeatureDescriptors,
  getNetherscrollsClassFeatureItemDescriptors,
  getNetherscrollsClassFeatures,
  getNetherscrollsFeatureChoices,
  getNetherscrollsFeatureTitle,
  getNetherscrollsItemChoiceSubtype,
  getNetherscrollsItemChoiceType,
  getNetherscrollsSubclasses,
  getStaleNetherscrollsClassFeatureDocumentIds,
  isNetherscrollsImportedClassFeatureDocument,
  isSameNetherscrollsSubclass,
  normalizeNetherscrollsClassFeatureData,
  shouldCreateNetherscrollsFeatureChoiceItems,
};
