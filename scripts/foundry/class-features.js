/**
 * Repair class feature grants when imported class items or levels change.
 * Debounced repairs share stable references and avoid recursively handling transfer writes.
 */
import { MODULE_ID } from "../core/constants.js";
import { isDebugEnabled } from "../core/settings.js";
import {
  normalizeNetherscrollsName,
  replaceNetherscrollsDeletionKeys,
  toNumber,
  toTrimmedStringOrNull,
} from "../core/utils.js";
import { renderNetherscrollsGroupedFeatureDescription } from "../data/class-features.js";
import { normalizeNetherscrollsFeatType } from "../data/feats.js";
import { normalizeNetherscrollsImagePath } from "../data/images.js";
import {
  duplicateNetherscrollsDocumentData,
  getActorCharacterId,
  getItemNetherId,
  getNetherscrollsDocumentFlag,
  normalizeNetherscrollsReferenceValue,
} from "../data/references.js";
import { normalizeNetherscrollsNullableNumber } from "../data/rules.js";
import { getNetherscrollsActorItems } from "./collections.js";
import { getNetherscrollsImportPack } from "./compendiums.js";
import { runNetherscrollsEmbeddedDocumentBatches } from "./documents.js";
import { netherscrollsCharacterImportLocks } from "../import/transfer-state.js";

const netherscrollsClassFeatureRepairTimers = new Map();

/** Handle queue class feature repair for item. */
function queueNetherscrollsClassFeatureRepairForItem(item, { delay = 150 } = {}) {
  if (!isNetherscrollsClassLikeActorItem(item)) return;
  const actor = getNetherscrollsOwnedItemActor(item);
  if (!actor) return;
  const characterId = getActorCharacterId(actor);
  if (characterId && netherscrollsCharacterImportLocks.has(characterId)) return;
  queueNetherscrollsActorClassFeatureRepair(actor, { delay });
}

/** Handle queue actor class feature repair. */
function queueNetherscrollsActorClassFeatureRepair(actor, { delay = 150 } = {}) {
  const key = toTrimmedStringOrNull(actor?.uuid ?? actor?.id);
  if (!key) return;
  const existing = netherscrollsClassFeatureRepairTimers.get(key);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(
    /** Run the deferred operation while handle queue actor class feature repair. */ async () => {
      netherscrollsClassFeatureRepairTimers.delete(key);
      try {
        const result = await repairNetherscrollsActorClassFeatures(actor, { notify: false });
        if (isDebugEnabled() && result.created > 0) {
          console.info(
            `${MODULE_ID} | Repaired class features for ${actor?.name ?? "actor"}.`,
            result
          );
        }
      } catch (err) {
        console.warn(
          `${MODULE_ID} | Unable to repair class features for ${actor?.name ?? "actor"}.`,
          err
        );
      }
    },
    delay
  );
  netherscrollsClassFeatureRepairTimers.set(key, timer);
}

/** Determine whether class repair update. */
function isNetherscrollsClassRepairUpdate(changes) {
  const paths = getNetherscrollsChangePaths(changes);
  if (!paths.length) return true;
  return paths.some(
    /** Check whether any entry matches while determine whether class repair update. */
    (path) =>
      path === "system.levels" ||
      path === "system.identifier" ||
      path === "system.classIdentifier" ||
      path.startsWith("system.advancement") ||
      path.startsWith(`flags.${MODULE_ID}`)
  );
}

/** Retrieve change paths. */
function getNetherscrollsChangePaths(value, prefix = "") {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const paths = [];
  for (const [key, entry] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    paths.push(path);
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      paths.push(...getNetherscrollsChangePaths(entry, path));
    }
  }
  return paths;
}

/** Determine whether class like actor item. */
function isNetherscrollsClassLikeActorItem(item) {
  return Boolean(
    (item?.type === "class" || item?.type === "subclass") && getNetherscrollsOwnedItemActor(item)
  );
}

/** Retrieve owned item actor. */
function getNetherscrollsOwnedItemActor(item) {
  if (item?.actor?.documentName === "Actor") return item.actor;
  if (item?.parent?.documentName === "Actor") return item.parent;
  if (item?.parent?.actor?.documentName === "Actor") return item.parent.actor;
  return null;
}

/** Reconcile level-dependent grants against the actor's current imported classes and selected choices. */
async function repairNetherscrollsActorClassFeatures(actor, { notify = false } = {}) {
  const result = {
    created: 0,
    skipped: 0,
    missingSources: 0,
  };
  if (!actor?.createEmbeddedDocuments) return result;
  if (typeof actor.canUserModify === "function" && !actor.canUserModify(game?.user, "update")) {
    return result;
  }

  const refs = await getNetherscrollsActorClassFeatureRefs(actor);
  if (!refs.length) return result;

  const createData = [];
  const considered = new Set();
  const foldedChoices = new Set();
  const nativeCharacter = getNetherscrollsDocumentFlag(actor, "nativeCharacter");
  let choiceDocuments;
  for (const ref of refs) {
    const uuid = toTrimmedStringOrNull(ref.uuid);
    if (!uuid || considered.has(uuid)) continue;
    considered.add(uuid);

    const feature = await resolveNetherscrollsDocumentUuid(uuid);
    if (!feature) {
      result.missingSources += 1;
      continue;
    }
    if (isNetherscrollsGroupedFeatureItem(feature, foldedChoices)) continue;

    const featureLevel = getNetherscrollsClassFeatureLevel(feature, ref.level);
    if (
      featureLevel > ref.classLevel ||
      (isNetherscrollsOptionalClassFeature(feature) && !ref.selected)
    ) {
      result.skipped += 1;
      continue;
    }

    const automaticChoices = getNetherscrollsDocumentFlag(feature, "autoGrantChoices") ?? [];
    if (automaticChoices.length) {
      if (!choiceDocuments) {
        const pack = await getNetherscrollsImportPack("classFeatures");
        choiceDocuments = new Map(
          (await pack.getDocuments()).map(
            /** Transform each entry while repair actor class features. */ (document) => [
              getItemNetherId(document),
              document,
            ]
          )
        );
      }
      for (const id of automaticChoices) {
        const choice = choiceDocuments.get(id);
        if (choice?.uuid) refs.push({ ...ref, uuid: choice.uuid, selected: true });
        else result.missingSources += 1;
      }
    }

    const groupedChoices = getNetherscrollsDocumentFlag(feature, "groupedChoices");
    if (groupedChoices && nativeCharacter) {
      const identities = getNetherscrollsGroupedFeatureIdentities(groupedChoices);
      const created = await reconcileNetherscrollsGroupedClassFeature(
        actor,
        feature,
        ref,
        uuid,
        featureLevel,
        groupedChoices,
        nativeCharacter,
        identities
      );
      for (const identity of identities) foldedChoices.add(identity);
      result.created += created;
      result.skipped += 1 - created;
      continue;
    }

    if (findNetherscrollsActorClassFeature(actor, feature, uuid)) {
      result.skipped += 1;
      continue;
    }

    createData.push(buildNetherscrollsActorClassFeatureData(feature, ref, uuid, featureLevel));
  }

  const created = await runNetherscrollsEmbeddedDocumentBatches(
    actor,
    "createEmbeddedDocuments",
    "Item",
    createData,
    { render: false, renderSheet: false, netherscrollsTransfer: true }
  );
  result.created += created.length;
  if (notify && result.created > 0) {
    ui?.notifications?.info?.(
      `Netherscrolls added ${result.created} missing class feature${result.created === 1 ? "" : "s"}.`
    );
  }
  return result;
}

async function reconcileNetherscrollsGroupedClassFeature(
  actor,
  feature,
  ref,
  uuid,
  level,
  tree,
  character,
  identities
) {
  const owner = ref.subclassItem ?? ref.classItem;
  const ownerId = getItemNetherId(owner);
  const selections = (character.featureSelections ?? []).filter(
    (selection) => selection.sourceType === ref.scope && selection.sourceId === ownerId
  );
  const selectedIds = getNetherscrollsSelectedClassChoices(owner)
    .filter(({ level }) => level == null || level <= ref.classLevel)
    .map(({ id }) => id);
  const sourceDescription = feature._source?.system?.description ?? feature.system?.description;
  const description = renderNetherscrollsGroupedFeatureDescription(
    sourceDescription?.value ?? "",
    tree,
    {
      className: owner.name,
      level,
      selectedIds,
      selections,
    }
  );
  const options = { render: false, renderSheet: false, netherscrollsTransfer: true };
  const existing = findNetherscrollsActorClassFeature(actor, feature, uuid, { matchName: false });
  const featureKey = getNetherscrollsDocumentFlag(feature, "featureKey");
  let savedItem = existing;
  if (!existing) {
    const itemData = buildNetherscrollsActorClassFeatureData(feature, ref, uuid, level);
    itemData.system.description.value = description;
    const [saved] = await actor.createEmbeddedDocuments("Item", [itemData], options);
    if (!saved) throw new Error(`Could not create ${feature.name} with its selected choices.`);
    savedItem = saved;
  } else if (
    existing.name !== feature.name ||
    getNetherscrollsDocumentFlag(existing, "featureKey") !== featureKey ||
    (existing._source?.system ?? existing.system)?.description?.value !== description
  ) {
    const [saved] = await actor.updateEmbeddedDocuments(
      "Item",
      [
        {
          _id: existing.id,
          name: feature.name,
          system: { description: { value: description } },
          flags: { [MODULE_ID]: { featureKey, featureScope: ref.scope } },
        },
      ],
      options
    );
    if (!saved) throw new Error(`Could not update ${feature.name} with its selected choices.`);
  }

  // The parent is saved before clearing the older module-generated choice items and prompts.
  if (featureKey) {
    const advancement = owner._source?.system?.advancement ?? owner.system?.advancement ?? {};
    const retiredAdvancement = Object.fromEntries(
      Object.entries(advancement)
        .filter(
          ([, entry]) =>
            entry?.type === "ItemChoice" &&
            getNetherscrollsDocumentFlag(entry, "featureKey") === featureKey
        )
        .map(([id]) => [`-=${id}`, null])
    );
    if (Object.keys(retiredAdvancement).length) {
      await actor.updateEmbeddedDocuments(
        "Item",
        [replaceNetherscrollsDeletionKeys({
          _id: owner.id,
          system: { advancement: retiredAdvancement },
        }, { update: true })],
        options
      );
    }
  }
  const obsolete = getNetherscrollsActorItems(actor)
    .filter(
      (item) =>
        item.type === "feat" &&
        item.id !== savedItem.id &&
        isNetherscrollsGroupedFeatureItem(item, identities) &&
        !hasNetherscrollsOwnedChoiceMechanics(item)
    )
    .map((item) => item.id)
    .filter(Boolean);
  if (obsolete.length) await actor.deleteEmbeddedDocuments("Item", obsolete, options);
  return existing ? 0 : 1;
}

function getNetherscrollsGroupedFeatureIdentities(tree) {
  const identities = new Set();
  function recordChoiceIdentity(node) {
    if (node.id) identities.add(node.id);
    if (node.key) identities.add(node.key);
    node.choices.forEach(recordChoiceIdentity);
  }
  recordChoiceIdentity(tree);
  return identities;
}

function isNetherscrollsGroupedFeatureItem(item, identities) {
  return (
    identities.has(getItemNetherId(item)) ||
    identities.has(getNetherscrollsDocumentFlag(item, "featureKey"))
  );
}

function hasNetherscrollsOwnedChoiceMechanics(item) {
  const source = item._source ?? item;
  return Boolean(
    getNetherscrollsDocumentFlag(item, "nativeMechanics") ||
    Object.keys(source.system?.activities ?? {}).length ||
    Object.keys(source.system?.advancement ?? {}).length ||
    (source.effects?.length ?? source.effects?.size) ||
    toTrimmedStringOrNull(source.system?.uses?.max)
  );
}

/** Retrieve actor class feature refs. */
async function getNetherscrollsActorClassFeatureRefs(actor) {
  const items = getNetherscrollsActorItems(actor);
  const classItems = items.filter(
    /** Keep entries that satisfy the condition while retrieve actor class feature refs. */ (
      item
    ) => item?.type === "class"
  );
  const subclassItems = items.filter(
    /** Keep entries that satisfy the condition while retrieve actor class feature refs. */ (
      item
    ) => item?.type === "subclass"
  );
  const refs = [];

  for (const classItem of classItems) {
    const classLevel = getNetherscrollsActorClassLevel(classItem);
    if (classLevel <= 0) continue;
    refs.push(
      ...(await getNetherscrollsClassItemFeatureRefs(classItem, "classFeatureUuids", {
        classItem,
        classLevel,
        scope: "class",
      }))
    );

    for (const subclassItem of subclassItems) {
      if (!isNetherscrollsActorSubclassForClass(subclassItem, classItem)) continue;
      refs.push(
        ...(await getNetherscrollsClassItemFeatureRefs(subclassItem, "subclassFeatureUuids", {
          classItem,
          subclassItem,
          classLevel,
          scope: "subclass",
        }))
      );
    }
  }

  return refs;
}

/** Retrieve actor class level. */
function getNetherscrollsActorClassLevel(item) {
  return Math.max(0, Math.trunc(toNumber(item?.system?.levels ?? item?.system?.level, 0)));
}

/** Retrieve class item feature refs. */
async function getNetherscrollsClassItemFeatureRefs(item, flagName, context) {
  const refsByUuid = new Map();
  addNetherscrollsFeatureRefs(
    refsByUuid,
    normalizeNetherscrollsUuidArray(getNetherscrollsDocumentFlag(item, flagName)),
    context
  );
  addNetherscrollsFeatureRefs(refsByUuid, getNetherscrollsItemGrantRefs(item), context);

  if (!refsByUuid.size) {
    const importedItem = await resolveNetherscrollsImportedClassLikeDocument(item);
    addNetherscrollsFeatureRefs(
      refsByUuid,
      normalizeNetherscrollsUuidArray(getNetherscrollsDocumentFlag(importedItem, flagName)),
      context
    );
    addNetherscrollsFeatureRefs(refsByUuid, getNetherscrollsItemGrantRefs(importedItem), context);
  }

  addNetherscrollsFeatureRefs(
    refsByUuid,
    await getNetherscrollsSelectedClassFeatureRefs(item),
    context
  );
  return Array.from(refsByUuid.values());
}

function getNetherscrollsSelectedClassChoices(item) {
  const choicesByLevel = getNetherscrollsDocumentFlag(item, "choicesByLevel");
  if (!choicesByLevel || typeof choicesByLevel !== "object" || Array.isArray(choicesByLevel))
    return [];
  const selected = [];
  for (const [level, choices] of Object.entries(choicesByLevel)) {
    for (const choice of Array.isArray(choices) ? choices : []) {
      const id = normalizeNetherscrollsReferenceValue(
        typeof choice === "object" ? (choice?._id ?? choice?.id ?? choice?.netherscrollsId) : choice
      );
      if (id) selected.push({ id, level: normalizeNetherscrollsNullableNumber(level) });
    }
  }
  return selected;
}

/** Retrieve selected class feature refs. */
async function getNetherscrollsSelectedClassFeatureRefs(item) {
  const selected = getNetherscrollsSelectedClassChoices(item);
  if (!selected.length) return [];
  const pack = await getNetherscrollsImportPack("classFeatures");
  if (!pack?.getDocuments) return [];
  const documents = await pack.getDocuments();
  const byId = new Map(
    documents
      .map(
        /** Transform each entry while retrieve selected class feature refs. */ (document) => [
          String(getNetherscrollsDocumentFlag(document, "netherscrollsId") ?? ""),
          document,
        ]
      )
      .filter(
        /** Keep entries that satisfy the condition while retrieve selected class feature refs. */ ([
          id,
        ]) => id
      )
  );
  return selected
    .map(
      /** Transform each entry while retrieve selected class feature refs. */ ({ id, level }) => {
        const document = byId.get(String(id));
        if (!document) return null;
        const uuid =
          toTrimmedStringOrNull(document.uuid) ??
          (pack.collection && document.id
            ? `Compendium.${pack.collection}.Item.${document.id}`
            : null);
        return uuid ? { uuid, level, selected: true } : null;
      }
    )
    .filter(Boolean);
}

/** Add feature refs. */
function addNetherscrollsFeatureRefs(refsByUuid, entries, context) {
  for (const entry of entries ?? []) {
    const uuid = toTrimmedStringOrNull(typeof entry === "string" ? entry : entry?.uuid);
    if (!uuid) continue;
    if (refsByUuid.has(uuid)) {
      if (entry?.selected) refsByUuid.get(uuid).selected = true;
      continue;
    }
    refsByUuid.set(uuid, {
      ...context,
      uuid,
      level: normalizeNetherscrollsNullableNumber(entry?.level),
      selected: Boolean(entry?.selected),
    });
  }
}

/** Normalize uuid array. */
function normalizeNetherscrollsUuidArray(value) {
  if (Array.isArray(value)) return value.map(toTrimmedStringOrNull).filter(Boolean);
  const raw = toTrimmedStringOrNull(value);
  if (!raw) return [];
  return raw
    .split(/[,\s]+/)
    .map(toTrimmedStringOrNull)
    .filter(Boolean);
}

/** Retrieve item grant refs. */
function getNetherscrollsItemGrantRefs(item) {
  const advancement = item?.system?.advancement ?? {};
  const entries = Object.values(advancement);
  const refs = [];
  for (const entry of entries) {
    if (entry?.type !== "ItemGrant") continue;
    const level = normalizeNetherscrollsNullableNumber(entry.level);
    for (const granted of entry?.configuration?.items ?? []) {
      const uuid = toTrimmedStringOrNull(granted?.uuid);
      if (uuid) refs.push({ uuid, level });
    }
  }
  return refs;
}

/** Resolve imported class like document. */
async function resolveNetherscrollsImportedClassLikeDocument(item) {
  const pack = await getNetherscrollsImportPack(
    item?.type === "subclass" ? "subclasses" : "classes"
  );
  if (!pack?.getDocuments) return null;
  const itemType = toTrimmedStringOrNull(item?.type);
  const netherscrollsId = getNetherscrollsDocumentFlag(item, "netherscrollsId");
  const identifier = getNetherscrollsClassLikeIdentifier(item);
  const name = normalizeNetherscrollsName(item?.name).toLowerCase();

  const documents = await pack.getDocuments();
  return (
    documents.find(
      /** Find the matching entry while resolve imported class like document. */
      (document) =>
        document?.type === itemType &&
        netherscrollsId &&
        getNetherscrollsDocumentFlag(document, "netherscrollsId") === netherscrollsId
    ) ??
    documents.find(
      /** Find the matching entry while resolve imported class like document. */
      (document) =>
        document?.type === itemType &&
        identifier &&
        getNetherscrollsClassLikeIdentifier(document) === identifier
    ) ??
    documents.find(
      /** Find the matching entry while resolve imported class like document. */
      (document) =>
        document?.type === itemType &&
        name &&
        normalizeNetherscrollsName(document?.name).toLowerCase() === name
    ) ??
    null
  );
}

/** Retrieve class like identifier. */
function getNetherscrollsClassLikeIdentifier(item) {
  return toTrimmedStringOrNull(
    getNetherscrollsDocumentFlag(item, "identifier") ??
      item?.system?.identifier ??
      item?.system?.classIdentifier
  );
}

/** Determine whether actor subclass for class. */
function isNetherscrollsActorSubclassForClass(subclassItem, classItem) {
  const classIdentifier = getNetherscrollsClassLikeIdentifier(classItem);
  const subclassClassIdentifier = toTrimmedStringOrNull(
    subclassItem?.system?.classIdentifier ??
      getNetherscrollsDocumentFlag(subclassItem, "parentClassIdentifier")
  );
  if (classIdentifier && subclassClassIdentifier)
    return classIdentifier === subclassClassIdentifier;

  const parentClass = normalizeNetherscrollsName(
    getNetherscrollsDocumentFlag(subclassItem, "parentClass") ?? subclassItem?.system?.className
  ).toLowerCase();
  const className = normalizeNetherscrollsName(classItem?.name).toLowerCase();
  return Boolean(parentClass && className && parentClass === className);
}

/** Resolve document uuid. */
async function resolveNetherscrollsDocumentUuid(uuid) {
  const id = toTrimmedStringOrNull(uuid);
  if (!id) return null;
  try {
    if (typeof fromUuid === "function") return await fromUuid(id);
  } catch (err) {
    console.warn(`${MODULE_ID} | Unable to resolve UUID ${id}.`, err);
  }

  try {
    if (typeof fromUuidSync === "function") {
      const document = fromUuidSync(id);
      if (document) return document;
    }
  } catch {
    // Fall back to manual compendium lookup below.
  }

  const match = /^Compendium\.(.+)\.Item\.([^.]+)$/i.exec(id);
  if (!match) return null;
  const pack = game?.packs?.get?.(match[1]);
  return (await pack?.getDocument?.(match[2])) ?? null;
}

/** Retrieve class feature level. */
function getNetherscrollsClassFeatureLevel(feature, fallbackLevel = null) {
  const level = normalizeNetherscrollsNullableNumber(
    getNetherscrollsDocumentFlag(feature, "level") ?? fallbackLevel
  );
  return Math.max(1, Math.trunc(level ?? 1));
}

/** Determine whether optional class feature. */
function isNetherscrollsOptionalClassFeature(feature) {
  return Boolean(getNetherscrollsDocumentFlag(feature, "optional"));
}

/** Find an owned feature using the established identity and legacy name matching. */
function findNetherscrollsActorClassFeature(actor, feature, uuid, { matchName = true } = {}) {
  const featureId = getNetherscrollsDocumentFlag(feature, "netherscrollsId");
  const featureKey = getNetherscrollsDocumentFlag(feature, "featureKey");
  const parentClassIdentifier = getNetherscrollsDocumentFlag(feature, "parentClassIdentifier");
  const featureName = normalizeNetherscrollsName(feature?.name).toLowerCase();

  for (const item of getNetherscrollsActorItems(actor)) {
    if (item?.type !== "feat") continue;
    if (uuid && getNetherscrollsDocumentFlag(item, "grantedFromUuid") === uuid) return item;
    if (featureId && getNetherscrollsDocumentFlag(item, "netherscrollsId") === featureId)
      return item;
    if (featureKey && getNetherscrollsDocumentFlag(item, "featureKey") === featureKey) return item;
    if (!matchName) continue;
    const itemName = normalizeNetherscrollsName(item?.name).toLowerCase();
    const isClassFeature =
      item?.system?.type?.value === "class" ||
      Boolean(getNetherscrollsDocumentFlag(item, "featureScope"));
    if (featureName && itemName === featureName && isClassFeature) {
      const itemParentClassIdentifier = getNetherscrollsDocumentFlag(item, "parentClassIdentifier");
      if (
        !parentClassIdentifier ||
        !itemParentClassIdentifier ||
        parentClassIdentifier === itemParentClassIdentifier
      ) {
        return item;
      }
    }
  }

  return null;
}

/** Build actor class feature data. */
function buildNetherscrollsActorClassFeatureData(feature, ref, uuid, featureLevel) {
  const data = duplicateNetherscrollsDocumentData(feature);
  delete data._id;
  delete data.folder;
  delete data.ownership;
  data.sort = 0;
  data.img = normalizeNetherscrollsImagePath(data.img);
  data.system ??= {};
  data.system.type = normalizeNetherscrollsFeatType(data);
  data.flags = data.flags ?? {};
  data.flags[MODULE_ID] = {
    ...(data.flags[MODULE_ID] ?? {}),
    grantedFromUuid: uuid,
    grantedByClassItemId: ref.classItem?.id ?? "",
    grantedByClass: ref.classItem?.name ?? "",
    grantedBySubclassItemId: ref.subclassItem?.id ?? "",
    grantedBySubclass: ref.subclassItem?.name ?? "",
    grantedAtClassLevel: featureLevel,
  };
  return data;
}

export {
  isNetherscrollsClassRepairUpdate,
  queueNetherscrollsClassFeatureRepairForItem,
  repairNetherscrollsActorClassFeatures,
};
