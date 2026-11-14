/**
 * Prepare owned item copies with character-specific state and provenance.
 * Spell entry identity and preparation belong to the actor copy, not the shared catalogue item.
 */
import { MODULE_ID, NETHERSCROLLS_DEFAULT_IMAGE } from "../core/constants.js";
import {
  duplicateNetherscrollsData,
  toNumber,
  toNumberOrNull,
  toTrimmedStringOrNull,
} from "../core/utils.js";
import { normalizeNetherscrollsFeatType } from "./feats.js";
import { normalizeNetherscrollsImportImagePath } from "./images.js";
import {
  duplicateNetherscrollsDocumentData,
  getItemNetherId,
  getNetherscrollsFoundryItemPayload,
  getNetherscrollsSourceId,
  normalizeNetherscrollsReferenceValue,
} from "./references.js";
import {
  mergeNetherscrollsDefaults,
  normalizeNetherscrollsClassHitDie,
  normalizeNetherscrollsSaveAbility,
} from "./rules.js";
import {
  getNetherscrollsSpellLevel,
  getNetherscrollsSpellPreparedState,
  normalizeNetherscrollsSpellMethod,
} from "./spell-fields.js";

/** Collect catalogue references and distinct spell entries before resolving the actor's owned copies. */
function collectNetherscrollsCharacterItemSources(importedCharacter) {
  const sources = [];
  const add = /** Add. */ (value, dataset = null, { allowRecordId = true, embed = null } = {}) => {
    const rows = Array.isArray(value) ? value : value == null ? [] : [value];
    for (const row of rows) {
      const stringId = typeof row === "string" ? normalizeNetherscrollsReferenceValue(row) : null;
      if (typeof row === "string" && !stringId) continue;
      const source = typeof row === "string" ? { netherscrollsId: stringId } : row;
      if (!source || typeof source !== "object") continue;
      const resolvedDataset = getNetherscrollsCharacterItemDataset(source, dataset);
      sources.push({
        source,
        dataset: resolvedDataset,
        netherscrollsId: getNetherscrollsCharacterSourceId(source, { allowRecordId }),
        embed: embed ?? resolvedDataset !== "classFeatures",
      });
    }
  };
  const actor = importedCharacter?.foundryActor ?? {};
  const character = importedCharacter?.character ?? {};
  const addSubclassWithFeatures = /** Add subclass with features. */ (value) => {
    const subclasses = Array.isArray(value) ? value : value == null ? [] : [value];
    for (const subclassSource of subclasses) {
      if (!subclassSource || typeof subclassSource !== "object") continue;
      add(subclassSource, "subclasses");
      add(subclassSource.subclassFeatures, "classFeatures", { embed: false });
      add(subclassSource.features, "classFeatures", { embed: false });
    }
  };
  const addClassWithNestedContent = /** Add class with nested content. */ (value) => {
    const classes = Array.isArray(value) ? value : value == null ? [] : [value];
    for (const classSource of classes) {
      if (!classSource || typeof classSource !== "object") continue;
      add(classSource, "classes");
      add(classSource.classFeatures, "classFeatures", { embed: false });
      add(classSource.features, "classFeatures", { embed: false });
      const subclasses = [
        ...(Array.isArray(classSource.subclasses) ? classSource.subclasses : []),
        ...(classSource.subclass ? [classSource.subclass] : []),
      ];
      addSubclassWithFeatures(subclasses);
    }
  };
  add(character.items, "items");
  const spellcasting = getNetherscrollsCharacterSpellcasting(importedCharacter);
  if (spellcasting) {
    for (const context of spellcasting.contexts) {
      if (context.casting?.access === "spellList") continue;
      add({ netherscrollsId: context.spellId, spellContext: context }, "spells");
    }
  } else {
    add(character.spells, "spells");
    add(character.preparedSpells, "spells");
  }
  add(character.feats, "feats");
  addClassWithNestedContent(character.classes);
  addClassWithNestedContent(character.class);
  addSubclassWithFeatures(character.subclasses);
  addSubclassWithFeatures(character.subclass);
  add(character.classFeatures, "classFeatures", { embed: false });
  add(getNetherscrollsCharacterBackgroundId(character), "backgrounds");
  add(character.raceId, "races");
  // Character-level Foundry metadata is ignored. Embedded content may retain
  // its complete Foundry document and Actor-owned state.
  add(
    spellcasting
      ? (actor.items ?? []).filter(
          /** Keep entries that satisfy the condition while collect character item sources. */
          (item) => getNetherscrollsCharacterItemDataset(item) !== "spells"
        )
      : actor.items,
    null,
    { allowRecordId: false }
  );

  const deduplicated = [];
  const byKey = new Map();
  for (const descriptor of sources) {
    const { source, dataset, netherscrollsId } = descriptor;
    const id = netherscrollsId;
    const type = toTrimmedStringOrNull(
      getNetherscrollsFoundryItemPayload(source)?.type ?? source?.type
    );
    const name = toTrimmedStringOrNull(
      getNetherscrollsFoundryItemPayload(source)?.name ?? source?.name
    );
    const foundryEmbeddedId = getNetherscrollsFoundryEmbeddedId(
      getNetherscrollsFoundryItemPayload(source)?._id ?? source?._id
    );
    const inventoryId = source?.kind ? source.id : source?.flags?.netherscrolls?.inventoryId;
    const key = source.spellContext?.entryId
      ? `spell-entry:${source.spellContext.entryId}`
      : inventoryId
        ? `inventory:${inventoryId}`
        : id
          ? `${dataset}:id:${id}`.toLowerCase()
          : foundryEmbeddedId
            ? `foundry:${foundryEmbeddedId}`
            : `${dataset ?? ""}:${type ?? ""}:${name ?? ""}`.toLowerCase();
    const existingIndex = byKey.get(key);
    if (existingIndex == null) {
      byKey.set(key, deduplicated.length);
      deduplicated.push(descriptor);
      continue;
    }

    const existing = deduplicated[existingIndex];
    existing.source = mergeNetherscrollsDefaults(existing.source, source);
    existing.embed = existing.embed && descriptor.embed;
  }
  return deduplicated;
}

/** Retrieve character item dataset. */
function getNetherscrollsCharacterItemDataset(source, fallback = null) {
  const explicit = toTrimmedStringOrNull(
    source?.dataset ?? source?.dataSet ?? source?.collection
  )?.toLowerCase();
  if (explicit) {
    const normalized = explicit.replace(/[^a-z]/g, "");
    if (normalized === "classfeatures") return "classFeatures";
    if (
      ["classes", "subclasses", "items", "feats", "spells", "backgrounds", "races"].includes(
        normalized
      )
    )
      return normalized;
  }
  if (fallback) return fallback;
  const type = toTrimmedStringOrNull(
    getNetherscrollsFoundryItemPayload(source)?.type ?? source?.type
  )?.toLowerCase();
  if (type === "spell") return "spells";
  if (type === "feat") {
    const flags = getNetherscrollsFoundryItemPayload(source)?.flags ?? source?.flags ?? {};
    if (
      flags?.[MODULE_ID]?.featureScope ||
      flags?.[MODULE_ID]?.parentClassNetherscrollsId ||
      flags?.[MODULE_ID]?.parentClassIdentifier
    ) {
      return "classFeatures";
    }
    return "feats";
  }
  if (type === "class") return "classes";
  if (type === "subclass") return "subclasses";
  if (type === "background") return "backgrounds";
  if (type === "race") return "races";
  return "items";
}

/** Retrieve character source id. */
function getNetherscrollsCharacterSourceId(source, { allowRecordId = false } = {}) {
  if (source?.kind === "personal" || source?.flags?.netherscrolls?.kind === "personal") return null;
  const foundryItem = getNetherscrollsFoundryItemPayload(source);
  const explicitId = normalizeNetherscrollsReferenceValue(
    source?.itemId ??
      source?.flags?.netherscrolls?.itemId ??
      source?.netherscrollsId ??
      source?.flags?.netherscrolls?.id ??
      foundryItem?.flags?.netherscrolls?.id
  );
  if (explicitId || !allowRecordId) return explicitId;

  return normalizeNetherscrollsReferenceValue(
    source?.classId ??
      source?.subclassId ??
      source?.itemId ??
      source?.spellId ??
      source?.featId ??
      source?.backgroundId ??
      source?.raceId ??
      source?._id ??
      source?.id
  );
}

/** Retrieve foundry embedded id. */
function getNetherscrollsFoundryEmbeddedId(value) {
  const id = toTrimmedStringOrNull(value);
  return id && /^[A-Za-z0-9]{16}$/.test(id) ? id : null;
}

/** Create an actor-specific copy with provenance; shared compendium definitions must remain reusable. */
function prepareNetherscrollsCharacterActorItemData(
  document,
  direct,
  source,
  netherscrollsId,
  dataset = null
) {
  const fromCompendium = document ? duplicateNetherscrollsDocumentData(document) : {};
  const sourceData = duplicateNetherscrollsData(direct ?? {});
  // A local library match is canonical. Only copy mutable Actor-owned state
  // from the character payload; names, descriptions, advancement, activities,
  // feature links, and other configuration remain from the compendium.
  const data = document ? fromCompendium : sourceData;
  if (document) applyNetherscrollsCharacterItemState(data, sourceData);
  const sourceEmbeddedId = getNetherscrollsFoundryEmbeddedId(sourceData?._id ?? source?._id);
  delete data._id;
  delete data.id;
  delete data.uuid;
  delete data.folder;
  delete data.ownership;
  delete data.parent;
  if (sourceEmbeddedId) data._id = sourceEmbeddedId;
  data.name = toTrimmedStringOrNull(data.name) ?? "Netherscrolls Item";
  data.type = toTrimmedStringOrNull(data.type) ?? "loot";
  const requiredType = {
    backgrounds: "background",
    races: "race",
    classes: "class",
    subclasses: "subclass",
    spells: "spell",
    feats: "feat",
  }[dataset];
  if (requiredType) data.type = requiredType;
  if (data.type === "feat") {
    data.system ??= {};
    const canonicalType = normalizeNetherscrollsFeatType(data);
    const snapshotType = normalizeNetherscrollsFeatType(sourceData);
    // Older feat-library records can contain misclassified racial/class
    // features. Preserve an explicit snapshot category across that lookup.
    data.system.type =
      canonicalType.value === "feat" && snapshotType.value !== "feat"
        ? snapshotType
        : canonicalType;
  }
  data.img = normalizeNetherscrollsImportImagePath(data.img);
  if (data.type === "spell") {
    data.system = data.system && typeof data.system === "object" ? data.system : {};
    data.system.level = getNetherscrollsSpellLevel(data);
    // Library records intentionally share a neutral sort value. Actor spells
    // need a level-based value so D&D5e builds spellbook sections in level
    // order instead of the arbitrary order of the character reference array.
    data.sort = getNetherscrollsCharacterSpellSort(data.system.level);
    data.system.method = normalizeNetherscrollsSpellMethod(sourceData, data);
    data.system.prepared = getNetherscrollsSpellPreparedState(sourceData, data);
    // `sourceItem` is an Actor-owned association. Never retain an inferred
    // library class link such as `class:cleric`; allow D&D5e to associate a
    // newly embedded spell with the Actor's actual spellcasting class.
    data.system.sourceItem =
      toTrimmedStringOrNull(sourceData?.system?.sourceItem ?? sourceData?.sourceItem) ?? "";
    delete data.system.preparation;
  }
  if (data.type === "class") {
    const classLevel = toNumber(
      source?.level ??
        source?.levels ??
        source?.characterLevel ??
        direct?.level ??
        direct?.levels ??
        direct?.characterLevel ??
        source?.system?.levels ??
        source?.system?.level ??
        direct?.system?.levels ??
        direct?.system?.level ??
        data?.system?.levels,
      1
    );
    data.system = data.system && typeof data.system === "object" ? data.system : {};
    data.system.levels = Math.max(1, Math.trunc(classLevel));
    data.system.hd = data.system.hd && typeof data.system.hd === "object" ? data.system.hd : {};
    data.system.hd.denomination = normalizeNetherscrollsClassHitDie({
      ...source,
      ...direct,
      system: {
        ...(source?.system ?? {}),
        ...(direct?.system ?? {}),
        hd: data.system.hd,
      },
    });
    // Character imports start with every class hit die available, matching the
    // full-HP import policy. D&D5e derives the visible current/max totals from
    // this die denomination, class levels, and spent count.
    data.system.hd.spent = 0;
  }
  data.flags = data.flags ?? {};
  data.flags.netherscrolls = {
    ...(data.flags.netherscrolls ?? {}),
    ...(netherscrollsId ? { id: netherscrollsId } : {}),
  };
  if (data.type === "subclass") {
    const classId = getNetherscrollsSubclassClassId(source, direct, data);
    if (classId) data.flags.netherscrolls.classId = classId;
  }
  data.flags[MODULE_ID] = {
    ...(data.flags[MODULE_ID] ?? {}),
  };
  if (source?.lastRev) data.flags[MODULE_ID].lastRev = source.lastRev;
  if (dataset === "items") {
    data.system ??= {};
    if (source.quantity != null) data.system.quantity = source.quantity;
    if (source.kind === "catalogue") {
      Object.assign(data.flags.netherscrolls, {
        kind: "catalogue",
        inventoryId: source.id,
        itemId: netherscrollsId,
      });
    }
  }
  if (data.type === "spell" && source.spellContext)
    applyNetherscrollsSpellContext(data, source.spellContext);
  return data;
}

/** Retrieve character spellcasting. */
function getNetherscrollsCharacterSpellcasting(importedCharacter) {
  const bundle = importedCharacter?.spellcasting ?? importedCharacter?.raw?.spellcasting;
  return Array.isArray(bundle?.contexts) ? bundle : null;
}

/** Apply spell context. */
function applyNetherscrollsSpellContext(item, context) {
  const casting = context.casting ?? {};
  item.flags.netherscrolls = {
    ...item.flags.netherscrolls,
    spellEntryId: context.entryId,
    spellId: context.spellId,
    classId: context.classId ?? null,
  };
  item.flags[MODULE_ID].spellContext = duplicateNetherscrollsData(context);
  item.system.ability = normalizeNetherscrollsSaveAbility(casting.ability) ?? "";
  item.system.sourceItem = "";
  item.system.method =
    {
      spellSlots: "spell",
      atWill: "atwill",
      ritualOnly: "ritual",
      limitedUses: "innate",
      resource: "innate",
    }[casting.method] ?? "innate";
  item.system.prepared =
    casting.alwaysPrepared || (casting.available && !casting.requiresPreparation)
      ? 2
      : context.prepared
        ? 1
        : 0;
  delete item.system.preparation;
  for (const activity of Object.values(item.system.activities ?? {})) {
    if (activity.attack) activity.attack.ability = item.system.ability;
    if (activity.save?.dc)
      activity.save.dc = { ...activity.save.dc, calculation: item.system.ability };
    activity.consumption ??= {};
    activity.consumption.spellSlot =
      casting.requiresSpellSlot === true ||
      (casting.method === "spellSlots" && item.system.level > 0);
  }
}

/** Apply spell context classes. */
function applyNetherscrollsSpellContextClasses(items) {
  for (const item of items) {
    const context = item.flags?.[MODULE_ID]?.spellContext;
    if (!context) continue;
    const owner = items.find(
      /** Find the matching entry while apply spell context classes. */
      (candidate) => candidate.type === "class" && getItemNetherId(candidate) === context.classId
    );
    item.system.sourceItem = owner?.system?.identifier ? `class:${owner.system.identifier}` : "";
  }
}

/** Retrieve subclass class id. */
function getNetherscrollsSubclassClassId(...sources) {
  for (const source of sources) {
    const classId = normalizeNetherscrollsReferenceValue(
      source?.flags?.netherscrolls?.classId ??
        source?.classId ??
        source?.parentClassId ??
        source?.parentClassNetherscrollsId ??
        source?.flags?.[MODULE_ID]?.parentClassNetherscrollsId
    );
    if (classId) return classId;
  }
  return null;
}

/** Retrieve character spell sort. */
function getNetherscrollsCharacterSpellSort(level) {
  return Math.max(0, Math.trunc(toNumber(level, 0))) * 100000;
}

/** Apply character item state. */
function applyNetherscrollsCharacterItemState(target, source) {
  if (!target || !source || typeof target !== "object" || typeof source !== "object") return;
  if (Number.isFinite(Number(source.sort))) target.sort = Number(source.sort);

  const mutableSystemPaths = [
    ["quantity"],
    ["equipped"],
    ["attuned"],
    ["attunement"],
    ["identified"],
    ["proficient"],
    ["favorite"],
    ["container"],
    ["uses", "value"],
    ["uses", "spent"],
    ["uses", "autoDestroy"],
    ["prepared"],
    ["preparation", "prepared"],
  ];
  for (const path of mutableSystemPaths) {
    copyNetherscrollsCharacterItemStatePath(target.system, source.system, path);
  }
}

/** Apply legacy preparation only where a spell does not already have authoritative entry context. */
function applyNetherscrollsCharacterPreparedSpellsToItems(items, character = null) {
  if (!Array.isArray(items) || !Array.isArray(character?.preparedSpells)) return;
  const preparedIds = new Set(
    character.preparedSpells
      .map(
        /** Transform each entry while apply character prepared spells to items. */ (reference) =>
          typeof reference === "string"
            ? normalizeNetherscrollsReferenceValue(reference)
            : getNetherscrollsCharacterSourceId(reference, { allowRecordId: true })
      )
      .filter(Boolean)
  );
  for (const item of items) {
    if (item?.type !== "spell") continue;
    if (item.flags?.netherscrolls?.spellEntryId) continue;
    const prepared = preparedIds.has(getItemNetherId(item));
    item.system ??= {};
    item.system.prepared = prepared ? (item.system.prepared === 2 ? 2 : 1) : 0;
    if (item.system.preparation && typeof item.system.preparation === "object") {
      item.system.preparation.prepared = prepared;
    }
  }
}

/** Apply character hit dice to class items. */
function applyNetherscrollsCharacterHitDiceToClassItems(items, character = null) {
  const hitDice = character?.hitDice;
  if (!Array.isArray(items) || !hitDice || typeof hitDice !== "object") return;
  for (const denomination of ["d6", "d8", "d10", "d12"]) {
    const current = toNumberOrNull(hitDice.current?.[denomination]);
    const maximum = toNumberOrNull(hitDice.max?.[denomination]);
    if (current == null || maximum == null) continue;
    let remainingSpent = Math.max(0, Math.trunc(maximum) - Math.trunc(current));
    const classes = items.filter(
      /** Keep entries that satisfy the condition while apply character hit dice to class items. */
      (item) => item?.type === "class" && normalizeNetherscrollsClassHitDie(item) === denomination
    );
    for (const classItem of classes) {
      classItem.system =
        classItem.system && typeof classItem.system === "object" ? classItem.system : {};
      classItem.system.hd =
        classItem.system.hd && typeof classItem.system.hd === "object" ? classItem.system.hd : {};
      const levels = Math.max(0, Math.trunc(toNumber(classItem.system.levels, 0)));
      const spent = Math.min(levels, remainingSpent);
      classItem.system.hd.spent = spent;
      remainingSpent -= spent;
    }
  }
}

/** Apply character class selections to items. */
function applyNetherscrollsCharacterClassSelectionsToItems(items, character = null) {
  const selections = Array.isArray(character?.classes) ? character.classes : [];
  if (!Array.isArray(items) || !selections.length) return;
  for (const selection of selections) {
    const classId = normalizeNetherscrollsReferenceValue(selection?.classId ?? selection?.id);
    const subclassId = normalizeNetherscrollsReferenceValue(
      selection?.subclass?.subclassId ?? selection?.subclass?.id
    );
    const classItem = items.find(
      /** Find the matching entry while apply character class selections to items. */
      (item) => item?.type === "class" && String(getNetherscrollsSourceId(item) ?? "") === classId
    );
    if (classItem) {
      classItem.flags = classItem.flags ?? {};
      classItem.flags[MODULE_ID] = {
        ...(classItem.flags[MODULE_ID] ?? {}),
        nativeClassSelection: duplicateNetherscrollsData(selection),
        choicesByLevel: duplicateNetherscrollsData(selection?.choicesByLevel ?? {}),
      };
    }
    if (!subclassId) continue;
    const subclassItem = items.find(
      /** Find the matching entry while apply character class selections to items. */
      (item) =>
        item?.type === "subclass" && String(getNetherscrollsSourceId(item) ?? "") === subclassId
    );
    if (subclassItem) {
      subclassItem.flags = subclassItem.flags ?? {};
      subclassItem.flags[MODULE_ID] = {
        ...(subclassItem.flags[MODULE_ID] ?? {}),
        nativeSubclassSelection: duplicateNetherscrollsData(selection.subclass),
        choicesByLevel: duplicateNetherscrollsData(selection?.subclass?.choicesByLevel ?? {}),
      };
    }
  }
}

/** Build additional resource items. */
function buildNetherscrollsAdditionalResourceItems(character = null, characterId = null) {
  const resources = Array.isArray(character?.Ressources) ? character.Ressources : [];
  return resources.slice(3).map(
    /** Transform each entry while build additional resource items. */ (resource, offset) => {
      const index = offset + 3;
      const name =
        toTrimmedStringOrNull(resource?.Name ?? resource?.name) ?? `Resource ${index + 1}`;
      const baseCurrent = Math.max(
        0,
        toNumber(resource?.CurrentQty ?? resource?.current ?? resource?.value, 0)
      );
      const baseMaximum = Math.max(0, toNumber(resource?.TotalQty ?? resource?.max, 0));
      const currentResult = { value: baseCurrent, bonuses: [] };
      const maximumResult = { value: baseMaximum, bonuses: [] };
      const current = Math.max(0, currentResult.value);
      const maximum = Math.max(0, maximumResult.value);
      return {
        name,
        type: "feat",
        img: NETHERSCROLLS_DEFAULT_IMAGE,
        system: {
          description: { value: `<p>Netherscrolls character resource ${index + 1}.</p>`, chat: "" },
          activities: {},
          type: { value: "feat", subtype: "" },
          uses: { spent: Math.max(0, maximum - current), max: String(maximum), recovery: [] },
        },
        effects: [],
        flags: {
          [MODULE_ID]: {
            nativeCharacterResource: true,
            characterId: normalizeNetherscrollsReferenceValue(characterId) ?? "",
            resourceIndex: index,
            resourceName: name,
            nativeResource: duplicateNetherscrollsData(resource),
            nativeActiveBonuses: duplicateNetherscrollsData([
              ...currentResult.bonuses,
              ...maximumResult.bonuses,
            ]),
          },
        },
      };
    }
  );
}

/** Copy character item state path. */
function copyNetherscrollsCharacterItemStatePath(target, source, path) {
  if (!target || !source || !Array.isArray(path) || !path.length) return;
  let sourceCursor = source;
  for (const key of path) {
    if (!sourceCursor || typeof sourceCursor !== "object" || !(key in sourceCursor)) return;
    sourceCursor = sourceCursor[key];
  }
  if (sourceCursor === undefined) return;

  let targetCursor = target;
  for (const key of path.slice(0, -1)) {
    targetCursor[key] =
      targetCursor[key] && typeof targetCursor[key] === "object" ? targetCursor[key] : {};
    targetCursor = targetCursor[key];
  }
  targetCursor[path[path.length - 1]] = duplicateNetherscrollsData(sourceCursor);
}

/** Retrieve character background id. */
function getNetherscrollsCharacterBackgroundId(character) {
  return normalizeNetherscrollsReferenceValue(
    character?.backgroundId ??
      character?.background?.backgroundId ??
      character?.background?._id ??
      character?.background?.id ??
      character?.backgrounds?.backgroundId ??
      character?.backgrounds?._id ??
      character?.backgrounds?.id ??
      character?.background
  );
}

export {
  applyNetherscrollsCharacterClassSelectionsToItems,
  applyNetherscrollsCharacterHitDiceToClassItems,
  applyNetherscrollsCharacterPreparedSpellsToItems,
  applyNetherscrollsSpellContextClasses,
  buildNetherscrollsAdditionalResourceItems,
  collectNetherscrollsCharacterItemSources,
  getNetherscrollsCharacterBackgroundId,
  getNetherscrollsCharacterItemDataset,
  getNetherscrollsCharacterSourceId,
  getNetherscrollsCharacterSpellcasting,
  getNetherscrollsSubclassClassId,
  prepareNetherscrollsCharacterActorItemData,
};
