/**
 * Project persisted actor source fields into the native character evaluator.
 * Adopt manual sheet edits without treating prepared totals as new permanent base values.
 */

/** Create foundry effect source. */
function createFoundryEffectSource({
  ABILITIES,
  MODULE,
  NS,
  SKILLS,
  TOOLS,
  clone,
  exhaustionBases,
  levelsOf,
  list,
  nativeFlags,
  number,
  numeric,
}) {
  // Adopts a manual bonus edited on the Foundry sheet. The importer writes misc + bonus.
  function adoptManual(block, value) {
    if (!block || typeof block !== "object" || value == null) return;
    const raw = String(value).trim();
    const edited = raw === "" ? 0 : Number(raw.replace(/\s+/g, ""));
    if (!Number.isFinite(edited)) return;
    const misc = numeric(block.misc),
      bonus = numeric(block.bonus);
    if (edited !== misc + bonus) block.bonus = edited - misc;
  }

  /** Read base values from persisted source and adopt only explicit manual edits from the sheet. */
  function sourceCharacter(actor, collected = { levels: levelsOf(actor), acFromFoundry: false }) {
    const native = clone(nativeFlags(actor));
    const source = actor._source?.system ?? actor.system ?? {};
    const prepared = actor.system ?? {};
    const pick = /** Handle pick. */ (path, fallback) => {
      const value = NS.get(source, path);
      return value ?? NS.get(prepared, path) ?? fallback;
    };
    const proficiency = native.proficiencyBonus;
    if (proficiency == null || typeof proficiency !== "object") {
      native.proficiencyBonus = {
        value: proficiency ?? source.attributes?.prof ?? prepared.attributes?.prof ?? 0,
        misc: 0,
        bonus: 0,
      };
    }
    const armorClass = native.armorClass;
    if (armorClass == null || typeof armorClass !== "object")
      native.armorClass = { value: armorClass ?? 10, misc: 0, bonus: 0 };
    native.abilities ??= {};
    native.savingThrows ??= {};
    native.skills ??= {};
    native.tools ??= {};
    for (const ability of ABILITIES) {
      if (native.abilities[ability] == null || typeof native.abilities[ability] !== "object") {
        native.abilities[ability] = { score: native.abilities[ability] ?? 10, misc: 0, bonus: 0 };
      }
      const score = pick(`abilities.${ability}.value`);
      if (score != null) native.abilities[ability].score = score;
      const proficient = pick(`abilities.${ability}.proficient`);
      native.savingThrows[ability] ??= {};
      if (proficient != null) native.savingThrows[ability].prof = proficient;
      adoptManual(native.savingThrows[ability], source.abilities?.[ability]?.bonuses?.save);
    }
    for (const [family, mapping] of [
      ["skills", SKILLS],
      ["tools", TOOLS],
    ]) {
      for (const [key, [foundryKey, defaultAbility]] of Object.entries(mapping)) {
        const current = source[family]?.[foundryKey] ?? prepared[family]?.[foundryKey];
        if (!current) continue;
        native[family][key] ??= { ability: defaultAbility, prof: 0, misc: 0, bonus: 0 };
        if (current.value != null) native[family][key].prof = current.value;
        if (current.ability) native[family][key].ability = current.ability;
        adoptManual(native[family][key], source[family]?.[foundryKey]?.bonuses?.check);
      }
    }
    native.initiative ??= {};
    adoptManual(native.initiative, source.attributes?.init?.bonus);
    for (const [stat, kind, field] of [
      ["ToHitStr", "mwak", "attack"],
      ["ToHitDext", "rwak", "attack"],
      ["ToHitMagic", "msak", "attack"],
      ["SaveDC", "spell", "dc"],
    ]) {
      if (native[stat] == null || typeof native[stat] !== "object")
        native[stat] = { misc: 0, bonus: native[stat] ?? 0 };
      adoptManual(native[stat], source.bonuses?.[kind]?.[field]);
    }
    native.hp ??= {};
    native.currency ??= {};
    native.spellSlots ??= { current: {}, max: {} };
    for (const [part, key] of [
      ["current", "value"],
      ["max", "max"],
      ["temp", "temp"],
    ]) {
      const value = source.attributes?.hp?.[key];
      if (value != null) native.hp[part] = value;
    }
    for (const coin of ["pp", "gp", "sp", "cp"])
      if (source.currency?.[coin] != null) native.currency[coin] = source.currency[coin];
    if (source.details?.xp?.value != null) native.xp = source.details.xp.value;
    if (source.attributes?.exhaustion != null) native.exhaustion = source.attributes.exhaustion;
    if (exhaustionBases.has(actor))
      native.exhaustion = Math.max(number(native.exhaustion), exhaustionBases.get(actor));
    native.advanced ??= {};
    if (source.attributes?.spellcasting)
      native.advanced.spellcastingAbility = source.attributes.spellcasting;
    // Mode-stat bases: the Actor's own speeds and senses (its race fills unset ones, as D&D5e
    // does during preparation) and ability maximums. Their effects are added by the resolver.
    const race = list(actor.items).find(
      /** Find the matching entry while handle source character. */ (item) => item.type === "race"
    );
    const raceSystem = race?._source?.system ?? race?.system ?? {};
    const present = /** Handle present. */ (value) =>
      value != null && value !== "" && typeof value !== "object";
    const movement = {},
      senses = {};
    for (const type of NS.MOVEMENT) {
      const value = source.attributes?.movement?.[type] ?? raceSystem.movement?.[type];
      if (present(value)) movement[type] = number(value);
    }
    for (const sense of NS.SENSES) {
      const own = source.attributes?.senses?.ranges?.[sense] ?? source.attributes?.senses?.[sense];
      const value = present(own)
        ? own
        : (raceSystem.senses?.ranges?.[sense] ?? raceSystem.senses?.[sense]);
      if (present(value)) senses[sense] = number(value);
    }
    native.advanced.movement = { ...(native.advanced.movement ?? {}), ...movement };
    native.advanced.senses = { ...(native.advanced.senses ?? {}), ...senses };
    for (const ability of ABILITIES) {
      const max = source.abilities?.[ability]?.max;
      if (present(max) && Number.isFinite(Number(max))) native.abilities[ability].max = Number(max);
    }
    for (let level = 1; level <= 9; level++) {
      const slot = source.spells?.[`spell${level}`];
      if (!slot) continue;
      native.spellSlots.current ??= {};
      native.spellSlots.max ??= {};
      if (slot.value != null) native.spellSlots.current[`lvl${level}`] = slot.value;
      // D&D5e derives max from classes; an explicit override is a base edit.
      if (slot.override != null) native.spellSlots.max[`lvl${level}`] = slot.override;
    }
    const dice = new Map();
    for (const item of list(actor.items).filter(
      /** Keep entries that satisfy the condition while handle source character. */ (item) =>
        item.type === "class"
    )) {
      const data = item._source?.system ?? item.system;
      const die = data?.hd?.denomination;
      if (!/^d(?:4|6|8|10|12|20)$/.test(die ?? "")) continue;
      const pool = dice.get(die) ?? { max: 0, spent: 0 };
      pool.max += number(data.levels);
      pool.spent += number(data.hd.spent);
      dice.set(die, pool);
    }
    native.hitDice ??= {};
    native.hitDice.max ??= {};
    native.hitDice.current ??= {};
    for (const [die, pool] of dice) {
      native.hitDice.max[die] = pool.max;
      native.hitDice.current[die] = pool.max - pool.spent;
    }
    for (const [index, resource] of (native.Ressources ?? []).entries()) {
      const stored =
        index < 3
          ? source.resources?.[["primary", "secondary", "tertiary"][index]]
          : list(actor.items).find(
              /** Find the matching entry while handle source character. */ (item) =>
                item.flags?.[MODULE]?.resourceIndex === index
            )?._source?.system?.uses;
      if (!stored) continue;
      if (index < 3) {
        if (stored.value != null) resource.CurrentQty = stored.value;
        if (stored.max != null) resource.TotalQty = stored.max;
      } else {
        if (stored.max != null) resource.TotalQty = number(stored.max);
        if (stored.spent != null)
          resource.CurrentQty = number(resource.TotalQty) - number(stored.spent);
      }
    }
    // Equipped armor and shield, including Foundry-native magical bonuses. Netherscrolls
    // library armor carries its enhancement as an effect and clears the mirror field.
    const equipment = list(actor.items).filter(
      /** Keep entries that satisfy the condition while handle source character. */
      (item) => item.type === "equipment" && item.system?.equipped === true
    );
    const armor = equipment.find(
      /** Find the matching entry while handle source character. */ (item) =>
        ["light", "medium", "heavy"].includes(item.system?.type?.value)
    );
    const shield = equipment.find(
      /** Find the matching entry while handle source character. */ (item) =>
        item.system?.type?.value === "shield"
    );
    if (armor || shield)
      native._nsArmor = {
        armor: armor
          ? {
              value:
                number(armor.system?.armor?.value) + numeric(armor.system?.armor?.magicalBonus),
              dex:
                armor.system?.type?.value === "heavy"
                  ? 0
                  : (armor.system?.armor?.dex ??
                    (armor.system?.type?.value === "medium" ? 2 : null)),
            }
          : null,
        shield: shield
          ? number(shield.system?.armor?.value) + numeric(shield.system?.armor?.magicalBonus)
          : 0,
      };
    // A Foundry AC calculation (Mage Armor, unarmored defense, natural armor) supplies the
    // base. The importer's own "default"/"flat" calculations and its legacy custom formula do not.
    const preparedAc = prepared.attributes?.ac ?? {};
    const calc = preparedAc.calc ?? source.attributes?.ac?.calc;
    const formula = String(preparedAc.formula ?? source.attributes?.ac?.formula ?? "");
    const legacyCustom =
      calc === "custom" && /^@attributes\.ac\.armor \+ @attributes\.ac\.dex \+ \(/.test(formula);
    if (collected.acFromFoundry || (calc && !["default", "flat"].includes(calc) && !legacyCustom)) {
      const base = Number(preparedAc.base);
      const fallback =
        number(preparedAc.value) -
        number(preparedAc.shield) -
        number(preparedAc.bonus) -
        number(preparedAc.cover);
      if (Number.isFinite(base) || preparedAc.value != null)
        native._nsAcBase = Number.isFinite(base) ? base : fallback;
    }
    // Merge sparse native pool edits without losing the names/other members of a resource.
    const merge = /** Handle merge. */ (target, patch) => {
      for (const [key, value] of Object.entries(patch ?? {})) {
        if (["__proto__", "constructor", "prototype"].includes(key)) continue;
        if (value && typeof value === "object") merge((target[key] ??= {}), value);
        else target[key] = value;
      }
    };
    merge(native, actor.flags?.[MODULE]?.nativeEffectState);
    native._nsLevels = collected.levels;
    return native;
  }

  return { sourceCharacter };
}

export { createFoundryEffectSource };
