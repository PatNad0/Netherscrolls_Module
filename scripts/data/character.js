/**
 * Project character sheet values into Foundry actor creation data.
 * Base values and manual bonuses stay distinct so prepared effects are not counted twice.
 */
import { ABILITY_KEYS, MODULE_ID, NETHERSCROLLS_DEFAULT_IMAGE } from "../core/constants.js";
import { debugNetherscrollsCharacterImport } from "../core/settings.js";
import {
  duplicateNetherscrollsData,
  toNumber,
  toNumberOrNull,
  toTrimmedStringOrNull,
} from "../core/utils.js";
import { NETHERSCROLLS_SKILL_LABELS, SKILL_KEY_TO_NAME } from "./catalogs.js";
import { normalizeNetherscrollsPersistentImagePath } from "./images.js";
import { normalizeNetherscrollsReferenceValue } from "./references.js";
import { mergeNetherscrollsDefaults, normalizeNetherscrollsSaveAbility } from "./rules.js";

/** Build a stable actor base before Foundry prepares derived values and applies effects. */
function normalizeNetherscrollsCharacterActorCreationData(actorPayload, character = null) {
  if (!actorPayload || typeof actorPayload !== "object") return;

  const characterImage = toTrimmedStringOrNull(character?.ns_ImageLink);
  actorPayload.img = normalizeNetherscrollsPersistentImagePath(
    characterImage ?? actorPayload.img,
    NETHERSCROLLS_DEFAULT_IMAGE
  );

  // D&D5e calculates a new character's prototype-token dimensions from its
  // trait size. Import payloads created with a display name (for example "Medium")
  // instead of a D&D5e size key cause that calculation to fail during Actor.create.
  actorPayload.system =
    actorPayload.system && typeof actorPayload.system === "object" ? actorPayload.system : {};
  actorPayload.system.traits =
    actorPayload.system.traits && typeof actorPayload.system.traits === "object"
      ? actorPayload.system.traits
      : {};

  applyNetherscrollsCharacterNativeActorData(actorPayload, character);

  const sizes = globalThis.CONFIG?.DND5E?.actorSizes ?? {};
  const sizeValue = actorPayload.system.traits.size;
  const suppliedSize = toTrimmedStringOrNull(
    sizeValue && typeof sizeValue === "object" ? sizeValue.value : sizeValue
  )?.toLowerCase();
  const sizeAliases = {
    tiny: "tiny",
    small: "sm",
    medium: "med",
    large: "lg",
    huge: "huge",
    gargantuan: "grg",
  };
  const normalizedSize = sizeAliases[suppliedSize] ?? suppliedSize;
  actorPayload.system.traits.size = sizes[normalizedSize]
    ? normalizedSize
    : sizes.med
      ? "med"
      : (Object.keys(sizes)[0] ?? "med");
  debugNetherscrollsCharacterImport("Normalized D&D5e actor size.", {
    suppliedSize,
    normalizedSize: actorPayload.system.traits.size,
    availableSizeKeys: Object.keys(sizes),
  });

  // D&D5e derives `ac.value`; preserving an imported value requires a flat AC
  // calculation instead of assigning the derived field directly.
  actorPayload.system.attributes =
    actorPayload.system.attributes && typeof actorPayload.system.attributes === "object"
      ? actorPayload.system.attributes
      : {};

  logNetherscrollsCharacterImportStatAudit(actorPayload, character);

  // The API's `character` member is the authoritative current record. Its
  // ability scores can be newer than the persisted Foundry Actor snapshot,
  // so apply them before creating or updating the Actor.
  normalizeNetherscrollsCharacterAbilities(actorPayload, character);

  // Character Import responses keep skill training separately from the Foundry Actor
  // payload.  D&D5e expects training/expertise in `value` and a manual skill
  // modifier in `bonuses.check`; without this conversion every skill renders
  // as untrained after import.
  normalizeNetherscrollsCharacterSkills(actorPayload, character);

  // The native character record carries current, maximum, and temporary HP.
  // In particular, do not heal a character to full during an automatic import.
  const actorHp = actorPayload.system.attributes.hp;
  normalizeNetherscrollsCharacterHitPoints(actorPayload, character);
  debugNetherscrollsCharacterImport("Normalized D&D5e actor hit points.", {
    importedHp: actorHp,
    normalizedHp: actorPayload.system.attributes.hp,
  });

  const actorAc = actorPayload.system.attributes.ac;
  const characterAc =
    character?.armorClass ?? character?.armor_class ?? character?.ac ?? character?.attributes?.ac;
  const importedAc = characterAc ?? actorAc;
  const armorClass =
    characterAc != null
      ? getNetherscrollsCharacterArmorClassTotal(characterAc)
      : getNetherscrollsFoundryArmorClassTotal(actorAc);
  if (armorClass > 0) {
    const normalizedAc = actorAc && typeof actorAc === "object" ? { ...actorAc } : {};
    delete normalizedAc.value;
    delete normalizedAc.total;
    // The Netherscrolls effect runtime calculates the final AC (base, DEX cap, armor,
    // shield, misc, bonus and effects). D&D5e's default calculation is only its fallback;
    // a flat calculation would hide Foundry AC calculations such as Mage Armor.
    actorPayload.system.attributes.ac = {
      ...normalizedAc,
      flat: Math.trunc(armorClass),
      calc: "default",
      formula: "",
    };
  }
  console.info(
    `${MODULE_ID} | Foundry Import | ${actorPayload.name ?? "Character"}: armor class ${armorClass > 0 ? armorClass : "not supplied"}.`
  );
  debugNetherscrollsCharacterImport("Normalized D&D5e armor class.", {
    importedAc,
    armorClass: armorClass > 0 ? Math.trunc(armorClass) : null,
    acData: actorPayload.system.attributes.ac,
  });

  debugNetherscrollsCharacterImport("Normalized prototype token data.", {
    hasPrototypeToken: Boolean(actorPayload.prototypeToken),
  });
  delete actorPayload.token;
}

/** Keep native base fields separate from effect-derived totals to prevent bonuses accumulating on reimport. */
function applyNetherscrollsCharacterNativeActorData(actorPayload, character = null) {
  if (!character || typeof character !== "object") return;

  const system = actorPayload.system;
  system.attributes =
    system.attributes && typeof system.attributes === "object" ? system.attributes : {};
  system.details = system.details && typeof system.details === "object" ? system.details : {};

  actorPayload.flags =
    actorPayload.flags && typeof actorPayload.flags === "object" ? actorPayload.flags : {};
  actorPayload.flags.netherscrolls =
    actorPayload.flags.netherscrolls && typeof actorPayload.flags.netherscrolls === "object"
      ? actorPayload.flags.netherscrolls
      : {};
  const nativeCharacterId = normalizeNetherscrollsReferenceValue(character._id ?? character.id);
  const campaignId = normalizeNetherscrollsReferenceValue(character.campaignId);
  const ownerId = normalizeNetherscrollsReferenceValue(character.ownerId);
  if (nativeCharacterId) actorPayload.flags.netherscrolls.characterId = nativeCharacterId;
  if (campaignId) actorPayload.flags.netherscrolls.campaignId = campaignId;
  if (ownerId) actorPayload.flags.netherscrolls.ownerId = ownerId;
  const nativeCharacter = duplicateNetherscrollsData(character);
  delete nativeCharacter.foundryFlag;
  actorPayload.flags[MODULE_ID] = {
    ...(actorPayload.flags[MODULE_ID] ?? {}),
    nativeCharacter,
    nativeEffectState: null,
  };

  const characterName = toTrimmedStringOrNull(character.name);
  if (characterName) actorPayload.name = characterName;

  const advanced =
    character.advanced && typeof character.advanced === "object" ? character.advanced : {};
  if (advanced.token && typeof advanced.token === "object") {
    actorPayload.prototypeToken = mergeNetherscrollsDefaults(
      actorPayload.prototypeToken && typeof actorPayload.prototypeToken === "object"
        ? actorPayload.prototypeToken
        : {},
      duplicateNetherscrollsData(advanced.token)
    );
  }
  actorPayload.prototypeToken =
    actorPayload.prototypeToken && typeof actorPayload.prototypeToken === "object"
      ? actorPayload.prototypeToken
      : {};
  actorPayload.prototypeToken.name ??= characterName ?? actorPayload.name ?? "Unnamed Character";
  actorPayload.prototypeToken.actorLink ??= true;
  actorPayload.prototypeToken.texture =
    actorPayload.prototypeToken.texture && typeof actorPayload.prototypeToken.texture === "object"
      ? actorPayload.prototypeToken.texture
      : {};
  const portrait = toTrimmedStringOrNull(character.ns_ImageLink ?? actorPayload.img);
  if (portrait && !toTrimmedStringOrNull(actorPayload.prototypeToken.texture.src)) {
    actorPayload.prototypeToken.texture.src = portrait;
  }
  actorPayload.prototypeToken.bar1 ??= { attribute: "attributes.hp" };
  const gridMatch = /^(\d+)x(\d+)$/i.exec(toTrimmedStringOrNull(character.grid) ?? "");
  if (gridMatch) {
    actorPayload.prototypeToken.width = Math.max(1, Number(gridMatch[1]));
    actorPayload.prototypeToken.height = Math.max(1, Number(gridMatch[2]));
  }

  if (advanced.traits && typeof advanced.traits === "object") {
    system.traits = mergeNetherscrollsDefaults(
      system.traits && typeof system.traits === "object" ? system.traits : {},
      duplicateNetherscrollsData(advanced.traits)
    );
  }
  if (advanced.movement && typeof advanced.movement === "object") {
    system.attributes.movement = mergeNetherscrollsDefaults(
      system.attributes.movement && typeof system.attributes.movement === "object"
        ? system.attributes.movement
        : {},
      duplicateNetherscrollsData(advanced.movement)
    );
  }
  if (advanced.senses && typeof advanced.senses === "object") {
    system.attributes.senses = mergeNetherscrollsDefaults(
      system.attributes.senses && typeof system.attributes.senses === "object"
        ? system.attributes.senses
        : {},
      duplicateNetherscrollsData(advanced.senses)
    );
  }
  if (Object.prototype.hasOwnProperty.call(advanced, "spellcastingAbility")) {
    system.attributes.spellcasting =
      normalizeNetherscrollsSaveAbility(advanced.spellcastingAbility) ?? "";
  }
  if (Object.prototype.hasOwnProperty.call(advanced, "alignment")) {
    system.details.alignment = String(advanced.alignment ?? "");
  }
  if (
    !normalizeNetherscrollsReferenceValue(character.backgroundId) &&
    Object.prototype.hasOwnProperty.call(advanced, "background")
  ) {
    system.details.background = String(advanced.background ?? "");
  }
  if (Object.prototype.hasOwnProperty.call(character, "backstory")) {
    system.details.biography =
      system.details.biography && typeof system.details.biography === "object"
        ? system.details.biography
        : {};
    system.details.biography.value = String(character.backstory ?? "");
  }
  const characterXp = toNumberOrNull(character.xp ?? character.experience);
  if (characterXp != null) {
    system.details.xp =
      system.details.xp && typeof system.details.xp === "object" ? system.details.xp : {};
    system.details.xp.value = Math.max(0, Math.trunc(characterXp));
  }

  const proficiencyBonus = toNumberOrNull(character.proficiencyBonus);
  if (proficiencyBonus != null) system.attributes.prof = proficiencyBonus;
  const exhaustion = toNumberOrNull(character.exhaustion);
  if (exhaustion != null) system.attributes.exhaustion = Math.max(0, Math.trunc(exhaustion));
  if (character.initiative && typeof character.initiative === "object") {
    const initiative = character.initiative;
    const current =
      system.attributes.init && typeof system.attributes.init === "object"
        ? system.attributes.init
        : {};
    const ability = normalizeNetherscrollsSaveAbility(initiative.ability);
    system.attributes.init = {
      ...current,
      ...(ability ? { ability } : {}),
      proficient: getNetherscrollsCharacterProficiencyValue(initiative),
      bonus: String(getNetherscrollsCharacterManualBonus(initiative)),
    };
  }

  normalizeNetherscrollsCharacterSavingThrows(actorPayload, character);
  normalizeNetherscrollsCharacterCurrency(actorPayload, character);
  normalizeNetherscrollsCharacterSpellSlots(actorPayload, character);
  normalizeNetherscrollsCharacterResources(actorPayload, character);
  normalizeNetherscrollsCharacterBonuses(actorPayload, character);
  normalizeNetherscrollsCharacterHitDice(actorPayload, character);
}

/** Normalize character hit points. */
function normalizeNetherscrollsCharacterHitPoints(actorPayload, character = null) {
  const characterHp = character?.hp ?? character?.hitPoints ?? character?.hitpoints;
  if (!characterHp || typeof characterHp !== "object") return;
  const existing =
    actorPayload.system.attributes.hp && typeof actorPayload.system.attributes.hp === "object"
      ? actorPayload.system.attributes.hp
      : {};
  const normalized = { ...existing };
  const current = toNumberOrNull(characterHp.current ?? characterHp.value);
  const maximum = toNumberOrNull(characterHp.max ?? characterHp.maximum ?? characterHp.total);
  const temporary = toNumberOrNull(characterHp.temp ?? characterHp.temporary);
  if (current != null) normalized.value = Math.max(0, Math.trunc(current));
  if (maximum != null) normalized.max = Math.max(0, Math.trunc(maximum));
  if (temporary != null) normalized.temp = Math.max(0, Math.trunc(temporary));
  actorPayload.system.attributes.hp = normalized;
}

/** Normalize character saving throws. */
function normalizeNetherscrollsCharacterSavingThrows(actorPayload, character = null) {
  const savingThrows = character?.savingThrows;
  if (!savingThrows || typeof savingThrows !== "object") return;
  actorPayload.system.abilities =
    actorPayload.system.abilities && typeof actorPayload.system.abilities === "object"
      ? actorPayload.system.abilities
      : {};
  for (const ability of ABILITY_KEYS) {
    const source = savingThrows[ability];
    if (!source || typeof source !== "object") continue;
    const existing =
      actorPayload.system.abilities[ability] &&
      typeof actorPayload.system.abilities[ability] === "object"
        ? actorPayload.system.abilities[ability]
        : {};
    const bonuses =
      existing.bonuses && typeof existing.bonuses === "object" ? existing.bonuses : {};
    actorPayload.system.abilities[ability] = {
      ...existing,
      proficient: getNetherscrollsCharacterProficiencyValue(source),
      bonuses: { ...bonuses, save: String(getNetherscrollsCharacterManualBonus(source)) },
    };
  }
}

/** Normalize character currency. */
function normalizeNetherscrollsCharacterCurrency(actorPayload, character = null) {
  if (!character?.currency || typeof character.currency !== "object") return;
  const currency =
    actorPayload.system.currency && typeof actorPayload.system.currency === "object"
      ? { ...actorPayload.system.currency }
      : {};
  for (const denomination of ["pp", "gp", "sp", "cp"]) {
    const amount = toNumberOrNull(character.currency[denomination]);
    if (amount != null) currency[denomination] = amount;
  }
  actorPayload.system.currency = currency;
}

/** Normalize character spell slots. */
function normalizeNetherscrollsCharacterSpellSlots(actorPayload, character = null) {
  const spellSlots = character?.spellSlots;
  if (!spellSlots && !character?.pactSlots) return;
  actorPayload.system.spells =
    actorPayload.system.spells && typeof actorPayload.system.spells === "object"
      ? actorPayload.system.spells
      : {};
  for (let level = 1; level <= 9; level += 1) {
    const current = toNumberOrNull(spellSlots?.current?.[`lvl${level}`]);
    const maximum = toNumberOrNull(spellSlots?.max?.[`lvl${level}`]);
    if (current == null && maximum == null) continue;
    const key = `spell${level}`;
    const existing =
      actorPayload.system.spells[key] && typeof actorPayload.system.spells[key] === "object"
        ? actorPayload.system.spells[key]
        : {};
    actorPayload.system.spells[key] = {
      ...existing,
      ...(current == null ? {} : { value: Math.max(0, Math.trunc(current)) }),
      ...(maximum == null ? {} : { max: Math.max(0, Math.trunc(maximum)) }),
    };
  }
  if (character.pactSlots) {
    const pact = character.pactSlots;
    actorPayload.system.spells.pact = {
      ...(actorPayload.system.spells.pact ?? {}),
      value: pact.current,
      max: pact.max,
      level: pact.level,
    };
  }
}

/** Normalize character resources. */
function normalizeNetherscrollsCharacterResources(actorPayload, character = null) {
  if (!Array.isArray(character?.Ressources)) return;
  const keys = ["primary", "secondary", "tertiary"];
  const existing =
    actorPayload.system.resources && typeof actorPayload.system.resources === "object"
      ? actorPayload.system.resources
      : {};
  const resources = { ...existing };
  for (const [index, key] of keys.entries()) {
    const source = character.Ressources[index];
    const current = existing[key] && typeof existing[key] === "object" ? existing[key] : {};
    resources[key] =
      source && typeof source === "object"
        ? {
            ...current,
            label: String(source.Name ?? source.name ?? ""),
            value: Math.max(0, toNumber(source.CurrentQty ?? source.current ?? source.value, 0)),
            max: Math.max(0, toNumber(source.TotalQty ?? source.max, 0)),
          }
        : { ...current, label: "", value: 0, max: 0 };
  }
  actorPayload.system.resources = resources;
}

/** Normalize character bonuses. */
function normalizeNetherscrollsCharacterBonuses(actorPayload, character = null) {
  const mappings = [
    { source: character?.ToHitStr, paths: [["mwak", "attack"]] },
    { source: character?.ToHitDext, paths: [["rwak", "attack"]] },
    {
      source: character?.ToHitMagic,
      paths: [
        ["msak", "attack"],
        ["rsak", "attack"],
      ],
    },
    { source: character?.SaveDC, paths: [["spell", "dc"]] },
  ];
  if (
    !mappings.some(
      /** Check whether any entry matches while normalize character bonuses. */ (mapping) =>
        mapping.source && typeof mapping.source === "object"
    )
  )
    return;
  actorPayload.system.bonuses =
    actorPayload.system.bonuses && typeof actorPayload.system.bonuses === "object"
      ? actorPayload.system.bonuses
      : {};
  for (const mapping of mappings) {
    if (!mapping.source || typeof mapping.source !== "object") continue;
    const value = String(getNetherscrollsCharacterManualBonus(mapping.source));
    for (const [group, field] of mapping.paths) {
      actorPayload.system.bonuses[group] =
        actorPayload.system.bonuses[group] && typeof actorPayload.system.bonuses[group] === "object"
          ? actorPayload.system.bonuses[group]
          : {};
      actorPayload.system.bonuses[group][field] = value;
    }
  }
}

/** Normalize character hit dice. */
function normalizeNetherscrollsCharacterHitDice(actorPayload, character = null) {
  const hitDice = character?.hitDice;
  if (!hitDice || typeof hitDice !== "object") return;
  actorPayload.system.hitDice =
    actorPayload.system.hitDice && typeof actorPayload.system.hitDice === "object"
      ? actorPayload.system.hitDice
      : {};
  for (const denomination of ["d6", "d8", "d10", "d12"]) {
    const current = toNumberOrNull(hitDice.current?.[denomination]);
    const maximum = toNumberOrNull(hitDice.max?.[denomination]);
    if (current == null && maximum == null) continue;
    const existing =
      actorPayload.system.hitDice[denomination] &&
      typeof actorPayload.system.hitDice[denomination] === "object"
        ? actorPayload.system.hitDice[denomination]
        : {};
    actorPayload.system.hitDice[denomination] = {
      ...existing,
      ...(current == null ? {} : { value: Math.max(0, Math.trunc(current)) }),
      ...(maximum == null ? {} : { max: Math.max(0, Math.trunc(maximum)) }),
    };
  }
}

/** Retrieve character manual bonus. */
function getNetherscrollsCharacterManualBonus(source) {
  return toNumber(source?.misc, 0) + toNumber(source?.bonus, 0);
}

/** Retrieve character proficiency value. */
function getNetherscrollsCharacterProficiencyValue(source) {
  return Math.max(
    0,
    Math.min(2, toNumber(source?.prof ?? source?.proficiency ?? source?.value, 0))
  );
}

/** Compare imported base fields with native values only in debug mode to diagnose projection mismatches. */
function logNetherscrollsCharacterImportStatAudit(actorPayload, character = null) {
  if (!character || typeof character !== "object") return;

  const characterAbilities =
    character.abilities && typeof character.abilities === "object" ? character.abilities : {};
  const characterSkills =
    character.skills && typeof character.skills === "object" ? character.skills : {};
  const snapshotSkills =
    actorPayload?.system?.skills && typeof actorPayload.system.skills === "object"
      ? actorPayload.system.skills
      : {};
  const chaScore = toNumberOrNull(characterAbilities.cha?.score ?? characterAbilities.cha);
  const chaAdjustments = [character.activeBonuses, character.activeEffects, character.effects]
    .filter(Array.isArray)
    .flat()
    .filter(
      /** Keep entries that satisfy the condition while log character import stat audit. */
      (entry) =>
        entry?.active !== false &&
        /^abilities\.cha(?:\.score)?$/i.test(toTrimmedStringOrNull(entry?.stat) ?? "")
    )
    .map(
      /** Transform each entry while log character import stat audit. */ (entry) =>
        toTrimmedStringOrNull(entry?.bonus)
    )
    .filter(Boolean);
  const skillBonuses = [];
  const missingSnapshotSkills = [];

  for (const [sourceKey, sourceSkill] of Object.entries(characterSkills)) {
    if (!sourceSkill || typeof sourceSkill !== "object") continue;
    const skillKey = getNetherscrollsFoundrySkillKey(sourceKey, sourceSkill);
    if (!skillKey) continue;
    const manualBonus = getNetherscrollsCharacterSkillManualBonus(sourceSkill);
    const name =
      SKILL_KEY_TO_NAME[skillKey] ?? toTrimmedStringOrNull(sourceSkill.name) ?? sourceKey;
    if (manualBonus) skillBonuses.push(`${name} ${manualBonus >= 0 ? "+" : ""}${manualBonus}`);
    if (!Object.prototype.hasOwnProperty.call(snapshotSkills, skillKey))
      missingSnapshotSkills.push(name);
  }

  console.info(
    `${MODULE_ID} | Foundry Import | ${actorPayload?.name ?? character.name ?? "Character"}: API stat audit — ` +
      `CHA base ${chaScore ?? "not supplied"}; active CHA adjustments ${chaAdjustments.length ? chaAdjustments.join(", ") : "none"}; ` +
      `skill bonuses ${skillBonuses.length ? skillBonuses.join(", ") : "none"}; ` +
      `missing from Foundry snapshot ${missingSnapshotSkills.length ? missingSnapshotSkills.join(", ") : "none"}.`
  );
}

/** Normalize character abilities. */
function normalizeNetherscrollsCharacterAbilities(actorPayload, character = null) {
  const sourceAbilities = character?.abilities;
  if (!sourceAbilities || typeof sourceAbilities !== "object") return;

  const normalizedAbilities =
    actorPayload.system.abilities && typeof actorPayload.system.abilities === "object"
      ? { ...actorPayload.system.abilities }
      : {};
  const importedScores = {};

  for (const ability of ABILITY_KEYS) {
    const score = toNumberOrNull(sourceAbilities[ability]?.score ?? sourceAbilities[ability]);
    if (score == null) continue;

    normalizedAbilities[ability] = {
      ...(normalizedAbilities[ability] && typeof normalizedAbilities[ability] === "object"
        ? normalizedAbilities[ability]
        : {}),
      value: Math.trunc(score),
    };
    importedScores[ability] = Math.trunc(score);
  }

  actorPayload.system.abilities = normalizedAbilities;
  debugNetherscrollsCharacterImport("Normalized D&D5e actor ability scores.", {
    importedScores,
  });
}

/** Normalize character skills. */
function normalizeNetherscrollsCharacterSkills(actorPayload, character = null) {
  const sourceSkills = character?.skills;
  if (!sourceSkills || typeof sourceSkills !== "object") return;

  actorPayload.system =
    actorPayload.system && typeof actorPayload.system === "object" ? actorPayload.system : {};
  actorPayload.system.skills =
    actorPayload.system.skills && typeof actorPayload.system.skills === "object"
      ? actorPayload.system.skills
      : {};

  for (const [sourceKey, sourceSkill] of Object.entries(sourceSkills)) {
    if (!sourceSkill || typeof sourceSkill !== "object") continue;
    const skillKey = getNetherscrollsFoundrySkillKey(sourceKey, sourceSkill);
    if (!skillKey) continue;

    const existing = actorPayload.system.skills[skillKey];
    const skill = existing && typeof existing === "object" ? existing : {};
    const existingBonuses = skill.bonuses && typeof skill.bonuses === "object" ? skill.bonuses : {};
    const ability = normalizeNetherscrollsSaveAbility(sourceSkill.ability);
    const manualBonus = getNetherscrollsCharacterSkillManualBonus(sourceSkill);

    actorPayload.system.skills[skillKey] = {
      ...skill,
      ...(ability ? { ability } : {}),
      value: getNetherscrollsCharacterSkillProficiency(sourceSkill),
      bonuses: {
        ...existingBonuses,
        check: manualBonus ? String(manualBonus) : "",
      },
    };
  }
}

/** Retrieve foundry skill key. */
function getNetherscrollsFoundrySkillKey(sourceKey, sourceSkill = null) {
  const candidates = [sourceKey, sourceSkill?.key, sourceSkill?.id, sourceSkill?.name];
  for (const candidate of candidates) {
    const raw = toTrimmedStringOrNull(candidate)?.toLowerCase();
    if (!raw) continue;
    if (SKILL_KEY_TO_NAME[raw]) return raw;
    const normalized = raw.replace(/[^a-z]/g, "");
    if (NETHERSCROLLS_SKILL_LABELS[normalized]) return NETHERSCROLLS_SKILL_LABELS[normalized];
    if (/^[a-z][a-z0-9_]*$/.test(raw)) return raw;
  }
  return null;
}

/** Retrieve character skill proficiency. */
function getNetherscrollsCharacterSkillProficiency(sourceSkill) {
  if (sourceSkill?.expertise === true || sourceSkill?.isExpertise === true) return 2;
  const raw = sourceSkill?.prof ?? sourceSkill?.proficiency ?? sourceSkill?.value ?? 0;
  const normalized = toTrimmedStringOrNull(raw)?.toLowerCase();
  if (normalized === "expertise" || normalized === "double") return 2;
  if (normalized === "proficient" || normalized === "trained") return 1;
  if (normalized === "half" || normalized === "halfproficiency") return 0.5;
  return Math.max(0, Math.min(2, toNumber(raw, 0)));
}

/** Retrieve character skill manual bonus. */
function getNetherscrollsCharacterSkillManualBonus(sourceSkill) {
  return (
    toNumber(sourceSkill?.misc, 0) +
    toNumber(sourceSkill?.bonus, 0) +
    toNumber(sourceSkill?.bonuses?.check, 0)
  );
}

/** Apply character equipment armor class. */
function applyNetherscrollsCharacterEquipmentArmorClass(actorPayload) {
  // The Netherscrolls effect runtime owns AC on imported characters: equipped armor and
  // shield, the DEX cap, misc/bonus formulas and every effect. Baking misc/bonus into a
  // custom D&D5e formula would count them twice, so keep D&D5e's default calculation.
  actorPayload.system.attributes ??= {};
  actorPayload.system.attributes.ac = {
    ...(actorPayload.system.attributes.ac ?? {}),
    calc: "default",
    formula: "",
  };
}

/** Retrieve character armor class total. */
function getNetherscrollsCharacterArmorClassTotal(value) {
  if (!value || typeof value !== "object") return toNumber(value, 0);
  const explicitTotal = value.total ?? value.flat;
  if (explicitTotal != null) return toNumber(explicitTotal, 0);
  return toNumber(value.value, 0) + toNumber(value.misc, 0) + toNumber(value.bonus, 0);
}

/** Retrieve foundry armor class total. */
function getNetherscrollsFoundryArmorClassTotal(value) {
  if (!value || typeof value !== "object") return toNumber(value, 0);
  return toNumber(value.flat ?? value.total ?? value.value, 0);
}

/** Retrieve character hit point maximum. */
function getNetherscrollsCharacterHitPointMaximum(actorHp, character = null) {
  const characterHp =
    character?.hp ??
    character?.hitPoints ??
    character?.hitpoints ??
    character?.attributes?.hp ??
    null;
  const candidates = [
    actorHp?.max,
    actorHp?.maximum,
    characterHp?.max,
    characterHp?.maximum,
    characterHp?.total,
    actorHp?.value,
    typeof characterHp === "number" ? characterHp : null,
  ];
  for (const candidate of candidates) {
    const maximum = Math.max(0, Math.trunc(toNumber(candidate, 0)));
    if (maximum > 0) return maximum;
  }
  return 0;
}

export {
  applyNetherscrollsCharacterEquipmentArmorClass,
  getNetherscrollsFoundrySkillKey,
  normalizeNetherscrollsCharacterActorCreationData,
};
