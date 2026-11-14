/**
 * Build portable character exports from source data and current play state.
 * Prepared totals and Foundry-only effects must not become permanent base values on the service.
 */
import { ABILITY_KEYS, MODULE_ID, NETHERSCROLLS_DEFAULT_IMAGE } from "../core/constants.js";
import {
  duplicateNetherscrollsData,
  reportNetherscrollsTransferItemError,
  toNumber,
  toTrimmedStringOrNull,
} from "../core/utils.js";
import { getNetherscrollsFoundrySkillKey } from "../data/character.js";
import { isNetherscrollsImportedClassFeatureDocument } from "../data/class-features.js";
import { normalizeNetherscrollsFeatType } from "../data/feats.js";
import { prepareNetherscrollsFoundryExportItem } from "../data/items.js";
import { getActorCharacterId, getItemNetherId } from "../data/references.js";
import { getNetherscrollsSpellPreparedState } from "../data/spell-fields.js";
import { getNetherscrollsActorItems } from "../foundry/collections.js";

/** Build export reference. */
function buildNetherscrollsExportReference(item, allItems) {
  const id = getItemNetherId(item);
  const reference = {
    ...(item._id ? { _id: item._id } : {}),
    type: item.type,
    ...(id ? {} : { name: item.name }),
  };
  if (id) reference.flags = { netherscrolls: { id } };
  if (item.type === "class") {
    reference.system = {
      levels: item.system?.levels ?? item.system?.level ?? item.system?.classLevel ?? 1,
      identifier: item.system?.identifier ?? item.name,
    };
  } else if (item.type === "subclass") {
    const classes = allItems.filter(
      /** Keep entries that satisfy the condition while build export reference. */ (candidate) =>
        candidate.type === "class"
    );
    const parent =
      classes.find(
        /** Find the matching entry while build export reference. */
        (candidate) =>
          (item.system?.classIdentifier &&
            candidate.system?.identifier === item.system.classIdentifier) ||
          (item.flags?.netherscrolls?.classId &&
            getItemNetherId(candidate) === item.flags.netherscrolls.classId)
      ) ?? (classes.length === 1 ? classes[0] : null);
    const classId = item.flags?.netherscrolls?.classId ?? getItemNetherId(parent);
    if (classId) {
      reference.flags ??= { netherscrolls: {} };
      reference.flags.netherscrolls.classId = classId;
    }
    reference.system = {
      ...(parent ? { classIdentifier: parent.system?.identifier ?? parent.name } : {}),
    };
    if (!parent && !classId)
      reportNetherscrollsTransferItemError(
        item.name,
        new Error("Could not identify its parent class")
      );
  }
  return reference;
}

/** Build linked export item. */
function buildNetherscrollsLinkedExportItem(item) {
  const flags = item.flags.netherscrolls;
  const system = {};
  const source = item.system ?? {};
  for (const key of ["quantity", "equipped", "attuned", "identified", "prepared", "method"]) {
    if (source[key] !== undefined) system[key] = duplicateNetherscrollsData(source[key]);
  }
  if (source.uses) {
    system.uses = pickNetherscrollsProjectionFields(source.uses, ["value", "spent"]);
    if (system.uses.spent == null) delete system.uses.spent;
  }
  if (source.preparation)
    system.preparation = pickNetherscrollsProjectionFields(source.preparation, [
      "prepared",
      "mode",
    ]);
  if (item.type === "feat") system.type = normalizeNetherscrollsFeatType(item);
  return {
    ...(item._id ? { _id: item._id } : {}),
    type: item.type,
    flags: {
      netherscrolls: {
        id: getItemNetherId(item),
        ...(flags.inventoryId ? { inventoryId: flags.inventoryId } : {}),
        ...(flags.kind ? { kind: flags.kind } : {}),
        ...(flags.itemId ? { itemId: flags.itemId } : {}),
        ...(flags.spellEntryId
          ? {
              spellEntryId: flags.spellEntryId,
              spellId: flags.spellId,
              classId: flags.classId ?? null,
            }
          : {}),
      },
    },
    system,
  };
}

/** Determine whether excluded export feature. */
function isNetherscrollsExcludedExportFeature(item) {
  if (item?.type !== "feat") return false;
  return (
    isNetherscrollsImportedClassFeatureDocument(item) ||
    ["race", "class", "subclass"].includes(normalizeNetherscrollsFeatType(item).value)
  );
}

/** Build export play state. */
function buildNetherscrollsExportPlayState(sourceActor, preparedSystem) {
  const projection = {};
  const classes = (sourceActor.items ?? []).filter(
    /** Keep entries that satisfy the condition while build export play state. */ (item) =>
      item.type === "class"
  );
  const hitDice = { current: {}, max: {} };
  for (const item of classes) {
    const die = item.system?.hd?.denomination;
    const level = Number(item.system?.levels);
    const spent = Number(item.system?.hd?.spent ?? 0);
    if (
      !["d6", "d8", "d10", "d12"].includes(die) ||
      !Number.isFinite(level) ||
      !Number.isFinite(spent)
    )
      continue;
    hitDice.max[die] = (hitDice.max[die] ?? 0) + level;
    hitDice.current[die] = (hitDice.current[die] ?? 0) + Math.max(0, level - spent);
  }
  if (Object.keys(hitDice.max).length) projection.hitDice = hitDice;
  const extra = (sourceActor.items ?? []).filter(
    /** Keep entries that satisfy the condition while build export play state. */
    (item) => item.flags?.[MODULE_ID]?.nativeCharacterResource
  );
  if (extra.length) {
    const resources = duplicateNetherscrollsData(
      sourceActor.flags?.[MODULE_ID]?.nativeCharacter?.Ressources ?? []
    );
    for (const [index, key] of ["primary", "secondary", "tertiary"].entries()) {
      const resource = preparedSystem.resources?.[key];
      if (resource)
        resources[index] = {
          ...(resources[index] ?? {}),
          Name: resource.label,
          CurrentQty: resource.value,
          TotalQty: resource.max,
        };
    }
    for (const item of extra) {
      const flags = item.flags[MODULE_ID];
      const maximum = Number(item.system?.uses?.max);
      const spent = Number(item.system?.uses?.spent ?? 0);
      if (!Number.isFinite(maximum) || !Number.isFinite(spent)) continue;
      resources[flags.resourceIndex] = {
        ...flags.nativeResource,
        Name: item.name,
        TotalQty: maximum,
        CurrentQty: Math.max(0, maximum - spent),
      };
    }
    projection.Ressources = resources;
  }
  return projection;
}

/** Export portable base data and current play state while excluding temporary Foundry-only effect definitions. */
function buildFoundryExportPayload(actor) {
  if (!actor || typeof actor.toObject !== "function") {
    throw new Error("A Foundry Actor document is required for Foundry Export.");
  }

  const sourceActor = actor.toObject();
  const spellcasting = buildNetherscrollsSpellcastingExport(sourceActor);
  const transformedActor = actor.toObject(false);
  const preparedSystem = duplicateNetherscrollsData(
    transformedActor?.system ?? sourceActor?.system ?? {}
  );
  preparedSystem.attributes ??= {};
  const preparedHpMax = actor.system?.attributes?.hp?.max;
  if (typeof preparedHpMax === "number" && Number.isFinite(preparedHpMax)) {
    preparedSystem.attributes.hp ??= {};
    preparedSystem.attributes.hp.max = preparedHpMax;
  }
  // The API stores prepared traits, speeds and senses as the character's base, and
  // Netherscrolls adds grant and speed/sense effects on top. Values an effect changes are
  // exported from the Actor's own data so the effect is not stored into the base.
  const exportBase = globalThis.NetherscrollsEffects?.foundry?.exportBaseValues?.(actor) ?? {};
  for (const [path, value] of Object.entries(exportBase.traits ?? {})) {
    const [trait, field] = path.split(".");
    preparedSystem.traits =
      preparedSystem.traits && typeof preparedSystem.traits === "object"
        ? preparedSystem.traits
        : {};
    preparedSystem.traits[trait] =
      preparedSystem.traits[trait] && typeof preparedSystem.traits[trait] === "object"
        ? preparedSystem.traits[trait]
        : {};
    preparedSystem.traits[trait][field] = value;
  }
  if (Object.keys(exportBase.movement ?? {}).length) {
    preparedSystem.attributes.movement = {
      ...(preparedSystem.attributes.movement ?? {}),
      ...exportBase.movement,
    };
  }
  if (Object.keys(exportBase.senses ?? {}).length) {
    preparedSystem.attributes.senses ??= {};
    const senses =
      preparedSystem.attributes.senses.ranges &&
      typeof preparedSystem.attributes.senses.ranges === "object"
        ? preparedSystem.attributes.senses.ranges
        : preparedSystem.attributes.senses;
    Object.assign(senses, exportBase.senses);
  }
  const acSources = [
    actor.system?.attributes?.ac,
    transformedActor?.system?.attributes?.ac,
    sourceActor?.system?.attributes?.ac,
  ].filter(
    /** Keep entries that satisfy the condition while build foundry export payload. */ (ac) =>
      ac != null
  );
  const acValues = [
    ...acSources.map(
      /** Transform each entry while build foundry export payload. */ (ac) => ac.value
    ),
    ...acSources.map(
      /** Transform each entry while build foundry export payload. */ (ac) => ac.flat
    ),
  ];
  const armorClass = acValues
    .map(
      /** Transform each entry while build foundry export payload. */ (value) =>
        typeof value === "number" || (typeof value === "string" && value.trim())
          ? Number(value)
          : NaN
    )
    .find(
      /** Find the matching entry while build foundry export payload. */ (value) =>
        Number.isSafeInteger(value)
    );
  if (armorClass !== undefined) {
    // Calculated AC can be a live getter absent from serialized source data.
    preparedSystem.attributes.ac = { value: armorClass };
  } else if (acSources.length) {
    throw new Error(
      `${sourceActor?.name ?? actor.name ?? "Character"}: calculated armor class must be an integer before Foundry Export.`
    );
  }
  const preparedPrototypeToken =
    typeof actor?.prototypeToken?.toObject === "function"
      ? actor.prototypeToken.toObject(false)
      : (transformedActor?.prototypeToken ?? sourceActor?.prototypeToken);
  const characterId = getActorCharacterId(sourceActor);
  const sourceFlags = duplicateNetherscrollsData(sourceActor?.flags ?? {});
  if (sourceFlags[MODULE_ID]) {
    delete sourceFlags[MODULE_ID].nativeCharacter;
    delete sourceFlags[MODULE_ID].nativeEffectState;
    delete sourceFlags[MODULE_ID].spellcasting;
  }
  const sourceItems = sourceActor?.items ?? [];
  const ignoredIds = new Set(
    sourceItems
      .filter(
        /** Keep entries that satisfy the condition while build foundry export payload. */
        (item) =>
          ["race", "class", "subclass"].includes(item.type) ||
          isNetherscrollsExcludedExportFeature(item)
      )
      .map(/** Transform each entry while build foundry export payload. */ (item) => item._id)
      .filter(Boolean)
  );
  // Passive effects are exported; active ones (applied through an activity) stay in
  // Foundry. Foundry-authored passive effects are translated by the effect runtime, and
  // their earlier Netherscrolls copies are replaced rather than sent twice.
  const effectRuntime = globalThis.NetherscrollsEffects?.foundry;
  const nativeBonuses = extractNetherscrollsPortableActiveBonuses(
    (sourceActor.effects ?? []).filter(
      /** Keep entries that satisfy the condition while build foundry export payload. */
      (effect) =>
        !effect.flags?.[MODULE_ID]?.appliedActivation &&
        !effectRuntime?.isForeignMirror?.(actor, effect) &&
        (effect.flags?.[MODULE_ID]?.nsRuntimeEffect ||
          !ignoredIds.has(
            String(effect.origin ?? "")
              .split(".Item.")[1]
              ?.split(".")[0]
          ))
    )
  );
  const activeBonuses = [...nativeBonuses, ...(effectRuntime?.exportEffects?.(actor) ?? [])];
  const items = sourceItems
    .filter(
      /** Keep entries that satisfy the condition while build foundry export payload. */
      (item) =>
        item?.flags?.[MODULE_ID]?.nativeCharacterResource !== true &&
        !isNetherscrollsExcludedExportFeature(item)
    )
    .map(
      /** Transform each entry while build foundry export payload. */ (item) =>
        ["race", "class", "subclass"].includes(item.type)
          ? buildNetherscrollsExportReference(item, sourceItems)
          : getItemNetherId(item)
            ? buildNetherscrollsLinkedExportItem(item)
            : prepareNetherscrollsFoundryExportItem(item)
    );
  if (
    !items.some(
      /** Check whether any entry matches while build foundry export payload. */ (item) =>
        item.type === "race"
    )
  ) {
    const declaredRace = sourceActor.system?.details?.race;
    const raceName = toTrimmedStringOrNull(
      typeof declaredRace === "string" ? declaredRace : declaredRace?.name
    );
    if (raceName) items.push({ type: "race", name: raceName });
  }
  for (const item of items) {
    if (item?.type !== "spell") continue;
    item.system ??= {};
    // The API derives canonical preparedSpells from this legacy boolean.
    // Keep modern preparation states and casting methods on the Item too.
    const prepared =
      item.system.prepared != null
        ? getNetherscrollsSpellPreparedState({ system: { prepared: item.system.prepared } }) > 0
        : item.system.preparation?.prepared === true;
    item.system.preparation = { ...(item.system.preparation ?? {}), prepared };
  }
  return {
    schemaVersion: 2,
    systemVersion: game.system?.version ?? sourceActor?._stats?.systemVersion,
    actor: {
      ...duplicateNetherscrollsData(sourceActor),
      name: sourceActor?.name ?? actor?.name ?? "Unnamed Character",
      type: "character",
      img: sourceActor?.img ?? actor?.img ?? NETHERSCROLLS_DEFAULT_IMAGE,
      flags: {
        ...sourceFlags,
        netherscrolls: {
          ...(sourceActor?.flags?.netherscrolls ?? {}),
          ...(characterId ? { characterId } : {}),
        },
      },
      system: duplicateNetherscrollsData(sourceActor?.system ?? {}),
      prototypeToken: duplicateNetherscrollsData(sourceActor?.prototypeToken ?? {}),
      items,
    },
    preparedActor: {
      // The API projects native values from prepared data, including calculated
      // AC, advancement-derived maximum HP, and spell-slot maxima.
      system: preparedSystem,
      prototypeToken: duplicateNetherscrollsData(preparedPrototypeToken ?? {}),
    },
    netherscrolls: {
      ...(spellcasting ? { spellcasting } : {}),
      ...buildNetherscrollsExportPlayState(sourceActor, preparedSystem),
      // Netherscrolls stores the BASE armor class and adds DEX, the equipped armor and
      // shield and every effect itself. Without an explicit base the API would store
      // Foundry's calculated total, and that total would be counted again on the sheet.
      armorClass: getNetherscrollsExportArmorClassBase(actor),
      ...(globalThis.NetherscrollsEffects.foundry?.exportState(actor) ?? {}),
      ...(activeBonuses.length || sourceActor.flags?.[MODULE_ID]?.nativeCharacter
        ? { effects: activeBonuses, activeBonuses }
        : {}),
    },
  };
}

/** Send changed entry preparations with the imported character version so the API can detect stale edits. */
function buildNetherscrollsSpellcastingExport(sourceActor) {
  const bundle = sourceActor.flags?.[MODULE_ID]?.spellcasting;
  if (!Array.isArray(bundle?.contexts)) return null;
  if (!Number.isSafeInteger(bundle.characterVersion) || bundle.characterVersion < 0) {
    throw new Error(
      "Reimport this character before exporting spell preparation: the character version is missing."
    );
  }
  const contexts = new Map(
    bundle.contexts.map(
      /** Transform each entry while build spellcasting export. */ (context) => [
        context.entryId,
        context,
      ]
    )
  );
  const seen = new Set();
  const preparations = [];
  for (const item of sourceActor.items ?? []) {
    const flags = item.flags?.netherscrolls;
    if (item.type !== "spell" || !flags?.spellEntryId) continue;
    const context = contexts.get(flags.spellEntryId);
    if (!context || context.spellId !== getItemNetherId(item) || seen.has(context.entryId)) {
      throw new Error(
        "Spell entries changed or were duplicated locally. Reimport the character before exporting preparation."
      );
    }
    seen.add(context.entryId);
    const casting = context.casting ?? {};
    const importedPrepared = Boolean(
      context.prepared ||
      casting.alwaysPrepared ||
      (casting.available && !casting.requiresPreparation)
    );
    const prepared = getNetherscrollsSpellPreparedState(item) > 0;
    if (prepared !== importedPrepared)
      preparations.push({ entryId: context.entryId, spellId: context.spellId, prepared });
  }
  if (preparations.length > 100)
    throw new Error("At most 100 spell preparations can be exported at once.");
  // Omitted entries are retained by the API; deleting a local item is not a forget operation.
  return { expectedVersion: bundle.characterVersion, preparations };
}

// Base AC of an Actor not imported from Netherscrolls (imported Actors export their
// native armorClass block instead): the unarmored or flat base, never the total.
// With body armor equipped the Netherscrolls sheet uses that armor's own value.
function getNetherscrollsExportArmorClassBase(actor) {
  const ac = actor?.system?.attributes?.ac ?? {};
  const sourceAc =
    actor?._source?.system?.attributes?.ac ?? actor?.toObject?.()?.system?.attributes?.ac ?? {};
  const calc = toTrimmedStringOrNull(ac.calc ?? sourceAc.calc) ?? "default";
  const dexMod = toNumber(actor?.system?.abilities?.dex?.mod, 0);
  const wearsArmor = getNetherscrollsActorItems(actor).some(
    /** Check whether any entry matches while retrieve export armor class base. */
    (item) =>
      item?.type === "equipment" &&
      item.system?.equipped === true &&
      ["light", "medium", "heavy"].includes(item.system?.type?.value)
  );
  let value = 10;
  let maxDexBonus;
  if (calc === "flat" || calc === "natural") {
    // Flat and natural armor already are the whole base; DEX is not added to them.
    value = toNumber(sourceAc.flat ?? ac.flat, 10);
    maxDexBonus = 0;
  } else if (calc !== "default" && !wearsArmor && Number.isFinite(Number(ac.base))) {
    // Mage Armor, unarmored defense, custom formulas: D&D5e's base includes DEX.
    value = Number(ac.base) - dexMod;
  }
  return { value: Math.trunc(value), ...(maxDexBonus === undefined ? {} : { maxDexBonus }) };
}

/** Select supported sheet fields explicitly so derived or implementation-specific fields do not leak into exports. */
function buildNetherscrollsCharacterSystemProjection(system = null) {
  const source = system && typeof system === "object" ? system : {};
  const attributes =
    source.attributes && typeof source.attributes === "object" ? source.attributes : {};
  const details = source.details && typeof source.details === "object" ? source.details : {};
  const projectedAttributes = {};
  const attributeObjects = [
    ["hp", ["value", "max", "temp"]],
    ["ac", ["value", "flat"]],
    ["init", ["ability", "proficient", "bonus"]],
    [
      "movement",
      ["burrow", "climb", "fly", "swim", "walk", "units", "hover", "ignoredDifficultTerrain"],
    ],
    [
      "senses",
      ["darkvision", "blindsight", "tremorsense", "truesight", "units", "special", "ranges"],
    ],
  ];
  for (const [key, fields] of attributeObjects) {
    const projected = pickNetherscrollsProjectionFields(attributes[key], fields);
    if (Object.keys(projected).length) projectedAttributes[key] = projected;
  }
  for (const key of ["prof", "exhaustion", "spellcasting"]) {
    if (Object.prototype.hasOwnProperty.call(attributes, key))
      projectedAttributes[key] = duplicateNetherscrollsData(attributes[key]);
  }

  const abilities = {};
  for (const ability of ABILITY_KEYS) {
    const sourceAbility = source.abilities?.[ability];
    if (!sourceAbility || typeof sourceAbility !== "object") continue;
    const projected = pickNetherscrollsProjectionFields(sourceAbility, ["value", "proficient"]);
    if (Object.prototype.hasOwnProperty.call(sourceAbility.bonuses ?? {}, "save")) {
      projected.bonuses = { save: duplicateNetherscrollsData(sourceAbility.bonuses.save) };
    }
    abilities[ability] = projected;
  }

  const skills = {};
  for (const [skill, sourceSkill] of Object.entries(source.skills ?? {})) {
    if (!getNetherscrollsFoundrySkillKey(skill) || !sourceSkill || typeof sourceSkill !== "object")
      continue;
    const projected = pickNetherscrollsProjectionFields(sourceSkill, ["ability", "value"]);
    if (Object.prototype.hasOwnProperty.call(sourceSkill.bonuses ?? {}, "check")) {
      projected.bonuses = { check: duplicateNetherscrollsData(sourceSkill.bonuses.check) };
    }
    skills[skill] = projected;
  }

  const projectedDetails = {};
  const xp = pickNetherscrollsProjectionFields(details.xp, ["value"]);
  if (Object.keys(xp).length) projectedDetails.xp = xp;
  const biography = pickNetherscrollsProjectionFields(details.biography, ["value"]);
  if (Object.keys(biography).length) projectedDetails.biography = biography;
  if (Object.prototype.hasOwnProperty.call(details, "alignment"))
    projectedDetails.alignment = duplicateNetherscrollsData(details.alignment);

  const currency = {};
  for (const denomination of ["pp", "gp", "sp", "cp"]) {
    if (Object.prototype.hasOwnProperty.call(source.currency ?? {}, denomination))
      currency[denomination] = source.currency[denomination];
  }
  const spells = {};
  for (let level = 1; level <= 9; level += 1) {
    const key = `spell${level}`;
    if (Object.prototype.hasOwnProperty.call(source.spells ?? {}, key))
      spells[key] = pickNetherscrollsProjectionFields(source.spells[key], ["value", "max"]);
  }
  const resources = {};
  for (const key of ["primary", "secondary", "tertiary"]) {
    if (Object.prototype.hasOwnProperty.call(source.resources ?? {}, key))
      resources[key] = pickNetherscrollsProjectionFields(source.resources[key], [
        "label",
        "value",
        "max",
      ]);
  }
  const bonuses = {};
  for (const key of ["mwak", "rwak", "msak", "rsak", "spell"]) {
    if (Object.prototype.hasOwnProperty.call(source.bonuses ?? {}, key))
      bonuses[key] = pickNetherscrollsProjectionFields(
        source.bonuses[key],
        key === "spell" ? ["dc"] : ["attack"]
      );
  }
  const hitDice = {};
  for (const denomination of ["d6", "d8", "d10", "d12"]) {
    if (Object.prototype.hasOwnProperty.call(source.hitDice ?? {}, denomination))
      hitDice[denomination] = pickNetherscrollsProjectionFields(source.hitDice[denomination], [
        "value",
        "max",
      ]);
  }
  return {
    attributes: projectedAttributes,
    abilities,
    skills,
    currency,
    details: projectedDetails,
    traits: pickNetherscrollsProjectionFields(source.traits, [
      "size",
      "creatureType",
      "languages",
      "di",
      "dr",
      "dv",
      "ci",
      "weaponProf",
      "armorProf",
      "dm",
    ]),
    spells,
    resources,
    bonuses,
    hitDice,
  };
}

/** Handle pick projection fields. */
function pickNetherscrollsProjectionFields(source, fields) {
  const value = source && typeof source === "object" ? source : {};
  const projected = {};
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(value, field) || value[field] === undefined) continue;
    projected[field] = value[field] === null ? null : duplicateNetherscrollsData(value[field]);
  }
  return projected;
}

/** Extract portable active bonuses. */
function extractNetherscrollsPortableActiveBonuses(effects) {
  const rows = Array.isArray(effects) ? effects : [];
  const activeBonuses = [];
  for (const effect of rows) {
    const flags = effect?.flags?.[MODULE_ID];
    const stat = toTrimmedStringOrNull(flags?.sourceStat);
    if (!flags?.portableActiveEffect || !stat) continue;
    const changes = Array.isArray(effect?.changes) ? effect.changes : [];
    const nativeActiveBonus =
      flags.nativeActiveBonus && typeof flags.nativeActiveBonus === "object"
        ? duplicateNetherscrollsData(flags.nativeActiveBonus)
        : {};
    // A grant effect (resistance, language, advantage, ...) has `grant` and no `bonus`;
    // the API rejects a bonus on a grant stat.
    const grant = globalThis.NetherscrollsEffects?.isGrantStat?.(stat)
      ? toTrimmedStringOrNull(nativeActiveBonus.grant)
      : null;
    const bonus =
      grant != null
        ? null
        : toTrimmedStringOrNull(
            flags?.nsRuntimeEffect ? flags.nativeActiveBonus?.bonus : changes[0]?.value
          );
    if (bonus == null && grant == null) continue;
    const effectKey = toTrimmedStringOrNull(flags.effectKey) ?? "";
    delete nativeActiveBonus.bonus;
    delete nativeActiveBonus.grant;
    activeBonuses.push({
      ...nativeActiveBonus,
      ...(effectKey.startsWith("active-bonus:")
        ? { _id: effectKey.slice("active-bonus:".length) }
        : {}),
      active: effect?.disabled !== true,
      stat,
      ...(grant != null ? { grant } : { bonus }),
      source:
        toTrimmedStringOrNull(effect?.name) ??
        toTrimmedStringOrNull(nativeActiveBonus.source) ??
        "Foundry",
      note: toTrimmedStringOrNull(nativeActiveBonus.note) ?? "",
    });
  }
  return activeBonuses;
}

export { buildFoundryExportPayload };
