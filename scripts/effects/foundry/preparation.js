/**
 * Project resolved native values onto a prepared Foundry actor.
 * Guard against recursive preparation and preserve DataModel containers where the system requires them.
 */

/** Create foundry effect preparation. */
function createFoundryEffectPreparation({
  ABILITIES,
  MODULE,
  NS,
  SKILLS,
  TOOLS,
  collectState,
  hasNative,
  list,
  number,
  numeric,
  ownerScope,
  prepareDC,
  preparing,
  report,
  residualBonus,
  resolve,
  states,
  val,
}) {
  /**
   * Whether D&D5e replaced `key` with a read-only shim. D&D5e 6 moved roll bonuses and prepared
   * ability values under `roll`, `rolls`, `save` and `check`, and writing an old path throws there.
   */
  function moved(container, key) {
    const descriptor =
      container && typeof container === "object" && Object.getOwnPropertyDescriptor(container, key);
    return Boolean(descriptor?.get && !descriptor.set);
  }

  /**
   * Write a roll bonus where this D&D5e reads it: `bonuses.<key>` before D&D5e 6, then
   * `<owner>.roll.bonus` (an ability's `save`/`check`, or the skill or tool itself).
   */
  function setRollBonus(data, legacyKey, owner, value) {
    if (moved(data.bonuses, legacyKey) && owner && typeof owner === "object")
      (owner.roll ??= {}).bonus = value;
    else (data.bonuses ??= {})[legacyKey] = value;
  }

  /** Handle proficiency. */
  function proficiency(current, value, multiplier, roundDown = true) {
    if (current?.clone) return current.clone({ proficiency: value, multiplier, roundDown });
    return {
      multiplier,
      flat: (roundDown ? Math.floor : Math.ceil)(value * multiplier),
      term: String((roundDown ? Math.floor : Math.ceil)(value * multiplier)),
      hasProficiency: multiplier > 0,
    };
  }

  /** Project a complete resolved state without recursively preparing the same actor. */
  function prepare(actor) {
    if (!hasNative(actor) || preparing.has(actor)) return;
    preparing.add(actor);
    try {
      const state = collectState(actor),
        { result, character } = state,
        system = actor.system;
      // Bonuses Netherscrolls does not model stay D&D5e's: they are still added to rolls
      // by D&D5e, so they are added to displayed totals here too.
      const global = globalAbilityBonuses(actor, system);
      const checkBonus = /** Check bonus. */ (ability) => {
        const data = system.abilities?.[ability];
        const own = moved(data?.bonuses, "check") ? data.check?.roll?.bonus : data?.bonuses?.check;
        return numeric(own) + numeric(global.check);
      };
      const pb = val(result, "proficiencyBonus", number(system.attributes?.prof));
      const jackOfAllTrades = list(actor.items).some(
        /** Check whether any entry matches while prepare. */
        (item) =>
          item.flags?.[MODULE]?.nativeMechanics?.type === "jackOfAllTrades" &&
          number(item.flags[MODULE].level) <= ownerScope(item, character._nsLevels).classLevel
      );
      system.attributes ??= {};
      system.attributes.prof = pb;
      system.details ??= {};
      system.details.xp ??= {};
      system.details.xp.value = val(result, "xp", system.details.xp.value);
      system.attributes.exhaustion = val(result, "exhaustion", system.attributes.exhaustion);
      const projection = {
        actor,
        state,
        result,
        character,
        system,
        global,
        checkBonus,
        pb,
        jackOfAllTrades,
      };
      projectAbilitiesAndSaves(projection);
      projectSkillsAndTools(projection);
      projectCombatTotals(projection);
      projectResourcePools(projection);
      system.netherscrolls = { totals: result.values, formulas: result.formulas };
      projectHitDicePools(projection);
      states.set(actor, state);
      NS.features?.prepareActor(actor, state);
      for (const item of list(actor.items))
        for (const activity of list(item.system?.activities)) prepareDC(actor, activity);
    } catch (error) {
      report(actor, error);
    } finally {
      preparing.delete(actor);
    }
  }

  /**
   * The actor-wide check/save/skill/tool bonuses: `bonuses.abilities` before D&D5e 6,
   * `rolls.ability.<kind>.bonus` since. Effect changes to the global save bonus are translated
   * into savingThrows.all and are already in each save total. Only the manual sheet value stays
   * D&D5e's (it adds it to save rolls), so the prepared field is reset to it or the bonus would
   * count twice.
   */
  function globalAbilityBonuses(actor, system) {
    const legacy = system.bonuses?.abilities;
    const modern = system.rolls?.ability;
    if (legacy || !modern) {
      if (legacy) legacy.save = actor._source?.system?.bonuses?.abilities?.save ?? "";
      return legacy ?? {};
    }
    const manualSave = actor._source?.system?.rolls?.ability?.save?.bonus ?? "";
    if (modern.save && typeof modern.save === "object") modern.save.bonus = manualSave;
    return {
      check: modern.check?.bonus,
      save: manualSave,
      skill: modern.skill?.bonus,
      tool: modern.tool?.bonus,
    };
  }

  /** Preserve Foundry save/check models while projecting native ability totals, cover, and proficiency. */
  function projectAbilitiesAndSaves({
    actor,
    result,
    character,
    system,
    global,
    checkBonus,
    pb,
    jackOfAllTrades,
  }) {
    system.abilities ??= {};
    for (const ability of ABILITIES) {
      const data = (system.abilities[ability] ??= {});
      data.value = val(result, `abilities.${ability}`, data.value);
      data.mod = val(result, `abilities.${ability}.mod`, data.mod);
      const path = `savingThrows.${ability}`,
        multiplier = val(result, `${path}.prof`);
      data.proficient = multiplier;
      // D&D5e 6 keeps proficiency and bonus inside `save`/`check`; `saveProf` and the like are
      // read-only shims there.
      const nested = moved(data, "saveProf");
      const oldProf = nested ? data.save?.prof : (data.saveProf ?? data.save?.prof ?? data.prof);
      const prof = proficiency(oldProf, pb, multiplier);
      const total = val(result, path, data.mod + prof.flat);
      setRollBonus(data, "save", data.save, residualBonus(result, path, data.mod + prof.flat));
      const cover =
        ability === "dex"
          ? Math.max(number(system.attributes.ac?.cover), number(actor.coverBonus))
          : 0;
      const shown = total + numeric(global.save) + cover;
      if (data.save && typeof data.save === "object")
        Object.assign(data.save, { value: shown, prof, bonus: shown - data.mod - prof.flat });
      else data.save = shown;
      if (!nested) {
        data.saveProf = prof;
        data.saveBonus = shown - data.mod - prof.flat;
      }
      const currentCheckProf = nested ? data.check?.prof : data.checkProf;
      const checkProf = proficiency(
        currentCheckProf,
        pb,
        Math.max(currentCheckProf?.multiplier ?? 0, jackOfAllTrades ? 0.5 : 0)
      );
      if (nested) (data.check ??= {}).prof = checkProf;
      else data.checkProf = checkProf;
      if (data.check && typeof data.check === "object")
        data.check.value = data.mod + checkBonus(ability) + checkProf.flat;
      // D&D5e 6 prepares `attack` as { value, bonus }; it was a plain number before.
      if (data.attack && typeof data.attack === "object")
        data.attack.value = data.mod + pb + numeric(data.attack.bonus);
      else data.attack = data.mod + pb;
      data.dc =
        8 +
        data.mod +
        pb +
        val(result, "SaveDC") -
        (8 + val(result, `abilities.${character.advanced?.spellcastingAbility || "int"}.mod`) + pb);
    }
  }

  /** Project only supported or existing skills and tools, retaining custom tool ability and rounding rules. */
  function projectSkillsAndTools({ result, character, system, global, checkBonus, pb }) {
    for (const [family, mapping] of [
      ["skills", SKILLS],
      ["tools", TOOLS],
    ]) {
      system[family] ??= {};
      const keys = new Set([
        ...Object.keys(character[family] ?? {}),
        ...Object.keys(result.values)
          .filter(
            /** Keep entries that satisfy the condition while project skills and tools. */ (key) =>
              key.startsWith(`${family}.`) && key.split(".").length === 2
          )
          .map(
            /** Transform each entry while project skills and tools. */ (key) => key.split(".")[1]
          ),
      ]);
      for (const key of keys) {
        const foundryKey = mapping[key]?.[0] ?? key;
        // Custom NS skills/tools remain available through the NS effects sheet;
        // adding unknown CONFIG keys to the stock sheet can break its rendering.
        if (!mapping[key] && !system[family][foundryKey]) continue;
        if (!(`${family}.${key}` in result.values)) continue;
        // Netherscrolls lists every standard tool, mostly untrained; only tools the
        // Actor already has, or is trained in, belong on the D&D5e sheet.
        if (family === "tools" && !system.tools[foundryKey] && !val(result, `tools.${key}.prof`))
          continue;
        const entry = character[family]?.[key] ?? {},
          data = (system[family][foundryKey] ??= {});
        // A granted tool ability (tools.<tool>.ability) replaces the stored one.
        const path = `${family}.${key}`,
          ability = result.toolAbilities?.[path] ?? entry.ability ?? mapping[key]?.[1] ?? "int";
        const mod = val(result, `abilities.${ability}.mod`),
          multiplier = val(result, `${path}.prof`);
        data.ability = ability;
        data.value = multiplier;
        data.mod = mod;
        data.prof = proficiency(data.prof, pb, multiplier, entry.proficiencyRounding !== "up");
        setRollBonus(data, "check", data, residualBonus(result, path, mod + data.prof.flat));
        const extra =
          checkBonus(ability) + numeric(family === "skills" ? global.skill : global.tool);
        data.total = val(result, path) + extra;
        data.bonus = data.total - mod - data.prof.flat;
        if (family === "skills") data.passive = 10 + data.total + numeric(data.bonuses?.passive);
      }
    }
  }

  /** Prepare AC, initiative, and attack/DC residuals without applying the same base proficiency twice. */
  function projectCombatTotals({ state, result, character, system, checkBonus, pb }) {
    system.attributes.ac ??= {};
    system.attributes.ac.value = val(result, "armorClass", system.attributes.ac.value);
    system.attributes.init ??= {};
    const initAbility = character.initiative?.ability ?? "dex";
    const initMod = val(result, `abilities.${initAbility}.mod`);
    system.attributes.init.prof = proficiency(
      system.attributes.init.prof,
      pb,
      number(character.initiative?.prof)
    );
    const init = system.attributes.init;
    const previousTotal = init.total;
    init.total = val(result, "initiative") + checkBonus(initAbility);
    init.mod = initMod;
    const initBonus = residualBonus(result, "initiative", initMod + init.prof.flat);
    // D&D5e 6 reads the initiative bonus from `init.roll.bonus`; `init.bonus` is a read-only shim.
    if (moved(init, "bonus")) (init.roll ??= {}).bonus = initBonus;
    else init.bonus = initBonus;
    // D&D5e 6 also derives a passive initiative score from the total.
    if (Number.isFinite(init.score) && Number.isFinite(previousTotal))
      init.score += init.total - previousTotal;
    system.attributes.spelldc = val(result, "SaveDC");
    system.bonuses ??= {};
    for (const [stat, keys, ability] of [
      ["ToHitStr", ["mwak"], "str"],
      ["ToHitDext", ["rwak"], "dex"],
      ["ToHitMagic", ["msak", "rsak"], character.advanced?.spellcastingAbility || "int"],
    ]) {
      for (const key of keys) {
        const scoped = resolve(character, state.effects, {
          rollType: "attack",
          attackKind: key.startsWith("m") ? "melee" : "ranged",
        });
        const attackBonus = residualBonus(
          scoped,
          stat,
          val(scoped, `abilities.${ability}.mod`) + pb
        );
        // D&D5e 6 reads attack bonuses from `rolls.attack.<kind>.bonus`; `bonuses.<kind>` is
        // gone (or a read-only shim) there.
        const legacy = system.bonuses[key];
        const modern = system.rolls?.attack?.[key];
        if (modern && typeof modern === "object" && (!legacy || moved(legacy, "attack")))
          modern.bonus = attackBonus;
        else (system.bonuses[key] ??= {}).attack = attackBonus;
      }
    }
    system.bonuses.spell ??= {};
    system.bonuses.spell.dc = String(
      val(result, "SaveDC") -
        (8 + val(result, `abilities.${character.advanced?.spellcastingAbility || "int"}.mod`) + pb)
    );
  }

  /** Project HP, currency, spell slots, and resource pools while preserving Foundry-owned containers. */
  function projectResourcePools({ actor, result, character, system }) {
    system.attributes.hp ??= {};
    for (const [part, key] of [
      ["current", "value"],
      ["max", "max"],
      ["temp", "temp"],
    ])
      system.attributes.hp[key] = val(result, `hp.${part}`, system.attributes.hp[key]);
    if ("effectiveMax" in system.attributes.hp)
      system.attributes.hp.effectiveMax =
        system.attributes.hp.max + number(system.attributes.hp.tempmax);
    system.currency ??= {};
    for (const coin of ["pp", "gp", "sp", "cp", "rations"])
      system.currency[coin] = val(result, `currency.${coin}`);
    system.spells ??= {};
    for (let level = 1; level <= 15; level++) {
      if (level > 9 && !system.spells[`spell${level}`]) continue;
      const slot = (system.spells[`spell${level}`] ??= {});
      slot.value = val(result, `spellSlots.current.lvl${level}`);
      slot.max = val(result, `spellSlots.max.lvl${level}`);
    }
    system.resources ??= {};
    for (const [index, resource] of (character.Ressources ?? []).entries()) {
      const current = val(result, `Ressources.${resource.Name}.CurrentQty`),
        max = val(result, `Ressources.${resource.Name}.TotalQty`);
      if (index < 3)
        Object.assign((system.resources[["primary", "secondary", "tertiary"][index]] ??= {}), {
          value: current,
          max,
        });
      else {
        const item = list(actor.items).find(
          /** Find the matching entry while project resource pools. */ (i) =>
            i.flags?.[MODULE]?.resourceIndex === index
        );
        if (item?.system?.uses) Object.assign(item.system.uses, { max, spent: max - current });
      }
    }
  }

  /** Expose per-size hit dice and live aggregate getters expected by the actor system. */
  function projectHitDicePools({ result, system }) {
    system.hitDice ??= {};
    const bySize = {},
      maxima = {};
    for (const die of ["d4", "d6", "d8", "d10", "d12", "d20"]) {
      bySize[die] = val(result, `hitDice.current.${die}`);
      maxima[die] = val(result, `hitDice.max.${die}`);
      system.hitDice[die] = { value: bySize[die], max: maxima[die] };
    }
    if (system.attributes.hd && typeof system.attributes.hd === "object") {
      Object.defineProperties(system.attributes.hd, {
        value: {
          configurable: true,
          get: /** Retrieve. */ () =>
            Object.values(bySize).reduce(
              /** Combine entries into a result while project hit dice pools. */ (a, b) => a + b,
              0
            ),
        },
        max: {
          configurable: true,
          get: /** Retrieve. */ () =>
            Object.values(maxima).reduce(
              /** Combine entries into a result while project hit dice pools. */ (a, b) => a + b,
              0
            ),
        },
        bySize: { configurable: true, get: /** Retrieve. */ () => bySize },
      });
      system.attributes.hd.sizes = new Set(
        Object.keys(maxima)
          .filter(
            /** Keep entries that satisfy the condition while project hit dice pools. */ (die) =>
              maxima[die] > 0 || bySize[die] > 0
          )
          .map(
            /** Transform each entry while project hit dice pools. */ (die) => Number(die.slice(1))
          )
      );
    }
  }

  return { prepare };
}

export { createFoundryEffectPreparation };
