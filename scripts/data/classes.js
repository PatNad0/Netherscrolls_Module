/**
 * Build class and subclass document payloads from native or Foundry-shaped responses.
 * Advancement generation and feature discovery are delegated to their own converters.
 */
import { MODULE_ID } from "../core/constants.js";
import {
  duplicateNetherscrollsData,
  escapeHtml,
  toNumber,
  toTrimmedStringOrNull,
} from "../core/utils.js";
import {
  buildNetherscrollsClassAdvancement,
  buildNetherscrollsSubclassAdvancement,
  getNetherscrollsClassFeatureUuids,
  normalizeNetherscrollsClassProperties,
  normalizeNetherscrollsClassSpellcasting,
  normalizeNetherscrollsPrimaryAbility,
} from "./advancements.js";
import {
  formatNetherscrollsProgressionCell,
  getNetherscrollsHtmlValue,
  getNetherscrollsProgressionColumnLabel,
  getNetherscrollsProgressionTable,
  joinNetherscrollsHtmlSections,
  renderNetherscrollsBlocks,
} from "./descriptions.js";
import { normalizeNetherscrollsImagePath } from "./images.js";
import { applyNetherscrollsImportFlags, buildNetherscrollsItemSource } from "./item-fields.js";
import { getNetherscrollsFoundryItemPayload, getNetherscrollsSourceId } from "./references.js";
import {
  mergeNetherscrollsDefaults,
  normalizeNetherscrollsClassHitDie,
  normalizeNetherscrollsClassIdentifier,
  normalizeNetherscrollsSubclassIdentifier,
  slugifyNetherscrollsIdentifier,
} from "./rules.js";

/** Preserve explicit Foundry class fields while supplying stable identities and native advancement defaults. */
function normalizeNetherscrollsClassData(classSource, { featureUuidByKey }) {
  if (getNetherscrollsFoundryItemPayload(classSource)) {
    return normalizeNetherscrollsFoundryClassData(classSource, { featureUuidByKey });
  }

  const source = duplicateNetherscrollsData(classSource);
  const netherscrollsId = getNetherscrollsSourceId(source);
  const name = toTrimmedStringOrNull(source.name) ?? "Netherscrolls Class";
  const identifier = normalizeNetherscrollsClassIdentifier(source);
  const itemData = {
    name,
    type: "class",
    img: normalizeNetherscrollsImagePath(source.img, source.image),
    sort: 0,
    ownership: {
      default: 0,
    },
    system: buildNetherscrollsClassSystem(source, {
      netherscrollsId,
      identifier,
      featureUuidByKey,
    }),
    effects: [],
  };

  applyNetherscrollsImportFlags(itemData, source, netherscrollsId);
  itemData.flags = itemData.flags ?? {};
  const parentClassId = getNetherscrollsSourceId(classSource);
  if (parentClassId) {
    itemData.flags.netherscrolls = {
      ...(itemData.flags.netherscrolls ?? {}),
      classId: parentClassId,
    };
  }
  itemData.flags[MODULE_ID] = {
    ...(itemData.flags[MODULE_ID] ?? {}),
    identifier,
    classFeatureUuids: getNetherscrollsClassFeatureUuids(source, featureUuidByKey, "class"),
    subclassType: toTrimmedStringOrNull(source.subclassType) ?? "",
  };
  if (source.legacy != null) itemData.flags[MODULE_ID].legacy = Boolean(source.legacy);
  if (source.version != null) itemData.flags[MODULE_ID].sourceVersion = source.version;
  const progressionTable = getNetherscrollsProgressionTable(source);
  if (progressionTable) itemData.flags[MODULE_ID].progressionTable = progressionTable;

  return itemData;
}

/** Normalize foundry class data. */
function normalizeNetherscrollsFoundryClassData(classSource, { featureUuidByKey }) {
  const source = duplicateNetherscrollsData(getNetherscrollsFoundryItemPayload(classSource));
  const netherscrollsId = getNetherscrollsSourceId(classSource);
  source.name = toTrimmedStringOrNull(source.name) ?? "Netherscrolls Class";
  source.type = "class";
  source.img = normalizeNetherscrollsImagePath(source.img, source.image);
  source.sort ??= 0;
  source.ownership ??= { default: 0 };
  source.effects ??= [];

  const identifier = normalizeNetherscrollsClassIdentifier({
    ...classSource,
    name: source.name,
    system: source.system,
  });
  const defaults = buildNetherscrollsClassSystem(
    {
      ...classSource,
      system: source.system,
      name: source.name,
    },
    {
      netherscrollsId,
      identifier,
      featureUuidByKey,
    }
  );
  source.system = mergeNetherscrollsDefaults(defaults, source.system ?? {});
  source.system.identifier = toTrimmedStringOrNull(source.system.identifier) ?? identifier;
  source.system.hd =
    source.system.hd && typeof source.system.hd === "object" ? source.system.hd : {};
  source.system.hd.denomination = normalizeNetherscrollsClassHitDie({
    ...classSource,
    system: source.system,
  });
  source.system.hd.spent = 0;
  applyNetherscrollsImportFlags(source, classSource, netherscrollsId);
  source.flags = source.flags ?? {};
  source.flags[MODULE_ID] = {
    ...(source.flags[MODULE_ID] ?? {}),
    identifier,
    classFeatureUuids: getNetherscrollsClassFeatureUuids(classSource, featureUuidByKey, "class"),
  };

  return source;
}

/** Normalize subclass data. */
function normalizeNetherscrollsSubclassData(subclassSource, classSource, { featureUuidByKey }) {
  if (getNetherscrollsFoundryItemPayload(subclassSource)) {
    return normalizeNetherscrollsFoundrySubclassData(subclassSource, classSource, {
      featureUuidByKey,
    });
  }

  const source = duplicateNetherscrollsData(subclassSource);
  const netherscrollsId = getNetherscrollsSourceId(source);
  const classIdentifier = normalizeNetherscrollsClassIdentifier(classSource);
  const identifier = normalizeNetherscrollsSubclassIdentifier(source, classSource);
  const itemData = {
    name: toTrimmedStringOrNull(source.name) ?? "Netherscrolls Subclass",
    type: "subclass",
    img: normalizeNetherscrollsImagePath(source.img, source.image),
    sort: 0,
    ownership: {
      default: 0,
    },
    system: buildNetherscrollsSubclassSystem(source, classSource, {
      netherscrollsId,
      identifier,
      classIdentifier,
      featureUuidByKey,
    }),
    effects: [],
  };

  applyNetherscrollsImportFlags(itemData, source, netherscrollsId);
  itemData.flags = itemData.flags ?? {};
  itemData.flags[MODULE_ID] = {
    ...(itemData.flags[MODULE_ID] ?? {}),
    identifier,
    parentClass: toTrimmedStringOrNull(classSource?.name) ?? "",
    parentClassIdentifier: classIdentifier,
    parentClassNetherscrollsId: getNetherscrollsSourceId(classSource) ?? "",
    subclassFeatureUuids: getNetherscrollsClassFeatureUuids(
      classSource,
      featureUuidByKey,
      "subclass",
      source
    ),
  };

  return itemData;
}

/** Normalize foundry subclass data. */
function normalizeNetherscrollsFoundrySubclassData(
  subclassSource,
  classSource,
  { featureUuidByKey }
) {
  const source = duplicateNetherscrollsData(getNetherscrollsFoundryItemPayload(subclassSource));
  const netherscrollsId = getNetherscrollsSourceId(subclassSource);
  source.name = toTrimmedStringOrNull(source.name) ?? "Netherscrolls Subclass";
  source.type = "subclass";
  source.img = normalizeNetherscrollsImagePath(source.img, source.image);
  source.sort ??= 0;
  source.ownership ??= { default: 0 };
  source.effects ??= [];

  const classIdentifier = normalizeNetherscrollsClassIdentifier(classSource);
  const identifier = normalizeNetherscrollsSubclassIdentifier(
    {
      ...subclassSource,
      name: source.name,
      system: source.system,
    },
    classSource
  );
  const defaults = buildNetherscrollsSubclassSystem(
    {
      ...subclassSource,
      system: source.system,
      name: source.name,
    },
    classSource,
    {
      netherscrollsId,
      identifier,
      classIdentifier,
      featureUuidByKey,
    }
  );
  source.system = mergeNetherscrollsDefaults(defaults, source.system ?? {});
  source.system.identifier = toTrimmedStringOrNull(source.system.identifier) ?? identifier;
  source.system.classIdentifier =
    toTrimmedStringOrNull(source.system.classIdentifier) ?? classIdentifier;
  applyNetherscrollsImportFlags(source, subclassSource, netherscrollsId);
  source.flags = source.flags ?? {};
  const parentClassId = getNetherscrollsSourceId(classSource);
  if (parentClassId) {
    source.flags.netherscrolls = {
      ...(source.flags.netherscrolls ?? {}),
      classId: parentClassId,
    };
  }
  source.flags[MODULE_ID] = {
    ...(source.flags[MODULE_ID] ?? {}),
    identifier,
    parentClass: toTrimmedStringOrNull(classSource?.name) ?? "",
    parentClassIdentifier: classIdentifier,
    parentClassNetherscrollsId: getNetherscrollsSourceId(classSource) ?? "",
    subclassFeatureUuids: getNetherscrollsClassFeatureUuids(
      classSource,
      featureUuidByKey,
      "subclass",
      subclassSource
    ),
  };

  return source;
}

/** Build class system. */
function buildNetherscrollsClassSystem(source, { netherscrollsId, identifier, featureUuidByKey }) {
  const sourceName = toTrimmedStringOrNull(source.source ?? source.system?.source?.book);
  return {
    advancement: buildNetherscrollsClassAdvancement(source, { featureUuidByKey }),
    description: {
      value: buildNetherscrollsClassDescription(source),
      chat: "",
    },
    hd: {
      denomination: normalizeNetherscrollsClassHitDie(source),
      spent: 0,
      additional: "",
    },
    identifier:
      toTrimmedStringOrNull(source?.system?.identifier) ??
      identifier ??
      (netherscrollsId
        ? `netherscrolls-${netherscrollsId}`
        : slugifyNetherscrollsIdentifier(source?.name)),
    levels: Math.max(1, Math.trunc(toNumber(source?.system?.levels ?? source?.levels, 1))),
    primaryAbility: normalizeNetherscrollsPrimaryAbility(source),
    properties: normalizeNetherscrollsClassProperties(source),
    source: buildNetherscrollsItemSource(sourceName, {
      ...source,
      rules: source?.rules ?? (source?.legacy ? "2014" : undefined),
    }),
    spellcasting: normalizeNetherscrollsClassSpellcasting(source),
    startingEquipment: Array.isArray(source?.system?.startingEquipment)
      ? source.system.startingEquipment
      : [],
    wealth: toTrimmedStringOrNull(source?.system?.wealth ?? source?.wealth) ?? "",
  };
}

/** Build subclass system. */
function buildNetherscrollsSubclassSystem(
  source,
  classSource,
  { netherscrollsId, identifier, classIdentifier, featureUuidByKey }
) {
  const sourceName = toTrimmedStringOrNull(
    source.source ?? classSource?.source ?? source.system?.source?.book
  );
  return {
    advancement: buildNetherscrollsSubclassAdvancement(source, classSource, { featureUuidByKey }),
    classIdentifier,
    description: {
      value: buildNetherscrollsSubclassDescription(source),
      chat: "",
    },
    identifier:
      toTrimmedStringOrNull(source?.system?.identifier) ??
      identifier ??
      (netherscrollsId
        ? `netherscrolls-${netherscrollsId}`
        : slugifyNetherscrollsIdentifier(source?.name)),
    source: buildNetherscrollsItemSource(sourceName, {
      ...source,
      rules: source?.rules ?? classSource?.rules ?? (classSource?.legacy ? "2014" : undefined),
    }),
    spellcasting: normalizeNetherscrollsClassSpellcasting(source, classSource),
  };
}

/** Build class description. */
function buildNetherscrollsClassDescription(source) {
  return joinNetherscrollsHtmlSections([
    getNetherscrollsHtmlValue(source?.descriptionHtml),
    getNetherscrollsHtmlValue(source?.summaryHtml),
    getNetherscrollsHtmlValue(source?.presentation?.summary),
    getNetherscrollsHtmlValue(source?.hitPoints?.description),
    getNetherscrollsHtmlValue(source?.proficiencies?.description),
    getNetherscrollsHtmlValue(source?.startingEquipment?.description),
    renderNetherscrollsProgressionTable(source),
    buildNetherscrollsSubclassIntroHtml(source),
  ]);
}

/** Build subclass description. */
function buildNetherscrollsSubclassDescription(source) {
  return joinNetherscrollsHtmlSections([
    getNetherscrollsHtmlValue(source?.descriptionHtml),
    getNetherscrollsHtmlValue(source?.contentHtml),
    getNetherscrollsHtmlValue(source?.summaryHtml),
    getNetherscrollsHtmlValue(source?.presentation?.summary),
    renderNetherscrollsBlocks(source?.blocks),
  ]);
}

/** Build subclass intro html. */
function buildNetherscrollsSubclassIntroHtml(source) {
  const html = getNetherscrollsHtmlValue(source?.subclassIntroHtml ?? source?.subclassIntro);
  if (!html) return "";
  const title = escapeHtml(toTrimmedStringOrNull(source?.subclassType) ?? "Subclasses");
  return `<h2>${title}</h2>${html}`;
}

/** Render progression table. */
function renderNetherscrollsProgressionTable(source) {
  const table = getNetherscrollsProgressionTable(source);
  const columns = Array.isArray(table?.columns) ? table.columns : [];
  const rows = Array.isArray(table?.rows) ? table.rows : [];
  if (!columns.length || !rows.length) return "";

  const header = columns
    .map(
      /** Transform each entry while render progression table. */ (column) =>
        `<th>${escapeHtml(getNetherscrollsProgressionColumnLabel(column))}</th>`
    )
    .join("");
  const body = rows
    .map(
      /** Transform each entry while render progression table. */ (row) => {
        const cells = columns
          .map(
            /** Transform each entry while render progression table. */
            (column) =>
              `<td>${escapeHtml(formatNetherscrollsProgressionCell(row?.[column.key ?? column.id ?? column]))}</td>`
          )
          .join("");
        return `<tr>${cells}</tr>`;
      }
    )
    .join("");
  return `<h2>Class Progression</h2><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
}

export { normalizeNetherscrollsClassData, normalizeNetherscrollsSubclassData };
