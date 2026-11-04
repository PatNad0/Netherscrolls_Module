/* D&D5e adapter for the native NS effect evaluator. Prepared values are never saved as base stats. */
(() => {
  "use strict";
  const NS = globalThis.NetherscrollsEffects;
  const { MODULE, ABILITIES, SKILLS, TOOLS, clone, list, number, resolve } = NS;
  const states = new WeakMap(), preparing = new WeakSet(), warnings = new Set();
  const report = (actor, error) => {
    const message = `${actor?.name ?? "Netherscrolls"}: ${error.message ?? error}`;
    if (warnings.has(message)) return;
    warnings.add(message);
    console.warn(`${MODULE} | NS effects | ${message}`);
    globalThis.ui?.notifications?.warn?.(message);
  };
  function set(object, path, value) {
    const parts = path.split(".");
    let target = object;
    for (const part of parts.slice(0, -1)) target = target[part] ??= {};
    target[parts.at(-1)] = value;
  }
  const nativeFlags = actor => actor?.flags?.[MODULE]?.nativeCharacter;
  const hasNative = actor => nativeFlags(actor) || [...list(actor?.effects), ...list(actor?.items).flatMap(item => list(item.effects))]
    .some(effect => effect.flags?.[MODULE]?.nsRuntimeEffect);
  function sourceCharacter(actor) {
    const native = clone(nativeFlags(actor));
    const source = actor._source?.system ?? actor.system;
    const prepared = states.get(actor)?.baseInputs ?? actor.system;
    native.proficiencyBonus ??= { value: source.attributes?.prof ?? states.get(actor)?.character?.proficiencyBonus?.value ?? actor.system.attributes?.prof ?? 0 };
    native.armorClass ??= { value: source.attributes?.ac?.flat ?? 10 };
    native.abilities ??= {}; native.savingThrows ??= {}; native.skills ??= {}; native.tools ??= {};
    for (const ability of ABILITIES) {
      native.abilities[ability] ??= { score: 10, misc: 0, bonus: 0 };
      if (prepared.abilities?.[ability]?.value != null) native.abilities[ability].score = prepared.abilities[ability].value;
      if (prepared.abilities?.[ability]?.proficient != null) {
        native.savingThrows[ability] ??= {};
        native.savingThrows[ability].prof = prepared.abilities[ability].proficient;
      }
    }
    for (const [family, mapping] of [["skills", SKILLS], ["tools", TOOLS]]) {
      for (const [key, [foundryKey, defaultAbility]] of Object.entries(mapping)) {
        const current = prepared[family]?.[foundryKey];
        if (!current) continue;
        native[family][key] ??= { ability: defaultAbility, prof: 0, misc: 0, bonus: 0 };
        if (current.value != null) native[family][key].prof = current.value;
        if (current.ability) native[family][key].ability = current.ability;
      }
    }
    native.hp ??= {}; native.currency ??= {}; native.spellSlots ??= { current: {}, max: {} };
    for (const [part, key] of [["current", "value"], ["max", "max"], ["temp", "temp"]]) {
      const value = source.attributes?.hp?.[key] ?? prepared.attributes?.hp?.[key];
      if (value != null) native.hp[part] = value;
    }
    for (const coin of ["pp", "gp", "sp", "cp"]) if (source.currency?.[coin] != null) native.currency[coin] = source.currency[coin];
    if (source.details?.xp?.value != null) native.xp = source.details.xp.value;
    if (source.attributes?.exhaustion != null) native.exhaustion = source.attributes.exhaustion;
    native.advanced ??= {};
    if (source.attributes?.spellcasting) native.advanced.spellcastingAbility = source.attributes.spellcasting;
    for (let level = 1; level <= 9; level++) {
      const slot = source.spells?.[`spell${level}`];
      if (!slot) continue;
      native.spellSlots.current ??= {}; native.spellSlots.max ??= {};
      if (slot.value != null) native.spellSlots.current[`lvl${level}`] = slot.value;
      // D&D5e derives max from classes; an explicit override is a base edit.
      if (slot.override != null) native.spellSlots.max[`lvl${level}`] = slot.override;
    }
    const dice = new Map();
    for (const item of list(actor.items).filter(item => item.type === "class")) {
      const data = item._source?.system ?? item.system;
      const die = data?.hd?.denomination;
      if (!/^d(?:4|6|8|10|12|20)$/.test(die ?? "")) continue;
      const pool = dice.get(die) ?? { max: 0, spent: 0 };
      pool.max += number(data.levels); pool.spent += number(data.hd.spent); dice.set(die, pool);
    }
    native.hitDice ??= {}; native.hitDice.max ??= {}; native.hitDice.current ??= {};
    for (const [die, pool] of dice) {
      native.hitDice.max[die] = pool.max;
      native.hitDice.current[die] = pool.max - pool.spent;
    }
    for (const [index, resource] of (native.Ressources ?? []).entries()) {
      const stored = index < 3 ? source.resources?.[["primary", "secondary", "tertiary"][index]] :
        list(actor.items).find(item => item.flags?.[MODULE]?.resourceIndex === index)?._source?.system?.uses;
      if (!stored) continue;
      if (index < 3) {
        if (stored.value != null) resource.CurrentQty = stored.value;
        if (stored.max != null) resource.TotalQty = stored.max;
      } else {
        if (stored.max != null) resource.TotalQty = number(stored.max);
        if (stored.spent != null) resource.CurrentQty = number(resource.TotalQty) - number(stored.spent);
      }
    }
    const equipment = list(actor.items).filter(item => item.type === "equipment" && item.system?.equipped);
    const armor = equipment.find(item => ["light", "medium", "heavy"].includes(item.system?.type?.value));
    const shield = equipment.find(item => item.system?.type?.value === "shield");
    if (armor || shield) native._nsArmor = { value: number(armor?.system?.armor?.value ?? 10),
      dex: armor?.system?.type?.value === "heavy" ? 0 : armor?.system?.armor?.dex ?? null,
      shield: number(shield?.system?.armor?.value) };
    // Merge sparse native pool edits without losing the names/other members of a resource.
    const merge = (target, patch) => {
      for (const [key, value] of Object.entries(patch ?? {})) {
        if (["__proto__", "constructor", "prototype"].includes(key)) continue;
        if (value && typeof value === "object") merge(target[key] ??= {}, value);
        else target[key] = value;
      }
    };
    merge(native, actor.flags?.[MODULE]?.nativeEffectState);
    return native;
  }
  function collectState(actor, context = {}) {
    const character = sourceCharacter(actor);
    const effects = NS.collect(actor);
    const result = resolve(character, effects, context);
    for (const error of result.errors) report(actor, error);
    return { character, effects, result };
  }
  const val = (result, path, fallback = 0) => result.values[path] ?? fallback;
  const expression = (result, path, fallback = 0) => result.formulas[path] ?? String(val(result, path, fallback));
  function proficiency(current, value, multiplier, roundDown = true) {
    if (current?.clone) return current.clone({ proficiency: value, multiplier, roundDown });
    return { multiplier, flat: (roundDown ? Math.floor : Math.ceil)(value * multiplier), term: String((roundDown ? Math.floor : Math.ceil)(value * multiplier)), hasProficiency: multiplier > 0 };
  }
  function prepare(actor) {
    if (!hasNative(actor) || preparing.has(actor)) return;
    preparing.add(actor);
    try {
      const state = collectState(actor), { result, character } = state, system = actor.system;
      state.baseInputs = states.get(actor)?.baseInputs ?? {
        attributes: { hp: { value: system.attributes?.hp?.value, max: system.attributes?.hp?.max, temp: system.attributes?.hp?.temp } },
        abilities: Object.fromEntries(ABILITIES.map(key => [key, { value: system.abilities?.[key]?.value, proficient: system.abilities?.[key]?.proficient }])),
        skills: Object.fromEntries(Object.entries(system.skills ?? {}).map(([key, value]) => [key, { value: value.value, ability: value.ability }])),
        tools: Object.fromEntries(Object.entries(system.tools ?? {}).map(([key, value]) => [key, { value: value.value, ability: value.ability }])),
      };
      const pb = val(result, "proficiencyBonus", number(system.attributes?.prof));
      system.attributes ??= {}; system.attributes.prof = pb;
      system.details ??= {}; system.details.xp ??= {}; system.details.xp.value = val(result, "xp", system.details.xp.value);
      system.attributes.exhaustion = val(result, "exhaustion", system.attributes.exhaustion);
      system.abilities ??= {};
      for (const ability of ABILITIES) {
        const data = system.abilities[ability] ??= {};
        data.value = val(result, `abilities.${ability}`, data.value);
        data.mod = val(result, `abilities.${ability}.mod`, data.mod);
        const path = `savingThrows.${ability}`, multiplier = val(result, `${path}.prof`);
        data.proficient = multiplier;
        const oldProf = data.saveProf ?? data.save?.prof ?? data.prof;
        const prof = proficiency(oldProf, pb, multiplier);
        const total = val(result, path, data.mod + prof.flat);
        data.bonuses ??= {};
        data.bonuses.save = `(${expression(result, path)}) - (${data.mod + prof.flat})`;
        if (data.save && typeof data.save === "object") Object.assign(data.save, { value: total, prof, bonus: total - data.mod - prof.flat });
        else data.save = total;
        data.saveProf = prof;
        data.saveBonus = total - data.mod - prof.flat;
        data.checkProf = proficiency(data.checkProf, pb, data.checkProf?.multiplier ?? 0);
        if (data.check && typeof data.check === "object") data.check.value = data.mod + number(data.checkBonus) + data.checkProf.flat;
        data.attack = data.mod + pb;
        data.dc = 8 + data.mod + pb + val(result, "SaveDC") - (8 + val(result, `abilities.${character.advanced?.spellcastingAbility ?? "int"}.mod`) + pb);
      }
      for (const [family, mapping] of [["skills", SKILLS], ["tools", TOOLS]]) {
        system[family] ??= {};
        const keys = new Set([...Object.keys(character[family] ?? {}), ...Object.keys(result.values)
          .filter(key => key.startsWith(`${family}.`) && key.split(".").length === 2).map(key => key.split(".")[1])]);
        for (const key of keys) {
          const foundryKey = mapping[key]?.[0] ?? key;
          // Custom NS skills/tools remain available through the NS effects sheet;
          // adding unknown CONFIG keys to the stock sheet can break its rendering.
          if (!mapping[key] && !system[family][foundryKey]) continue;
          const entry = character[family]?.[key] ?? {}, data = system[family][foundryKey] ??= {};
          const path = `${family}.${key}`, ability = entry.ability ?? mapping[key]?.[1] ?? "int";
          const mod = val(result, `abilities.${ability}.mod`), multiplier = val(result, `${path}.prof`);
          data.ability = ability; data.value = multiplier; data.mod = mod;
          data.prof = proficiency(data.prof, pb, multiplier, entry.proficiencyRounding !== "up");
          data.bonuses ??= {};
          data.bonuses.check = `(${expression(result, path)}) - (${mod + data.prof.flat})`;
          data.total = val(result, path); data.bonus = data.total - mod - data.prof.flat;
          if (family === "skills") data.passive = 10 + data.total;
        }
      }
      system.attributes.ac ??= {}; system.attributes.ac.value = val(result, "armorClass", system.attributes.ac.value);
      system.attributes.init ??= {};
      const initMod = val(result, `abilities.${character.initiative?.ability ?? "dex"}.mod`);
      system.attributes.init.total = val(result, "initiative");
      system.attributes.init.mod = initMod;
      system.attributes.init.prof = proficiency(system.attributes.init.prof, pb, number(character.initiative?.prof));
      system.attributes.init.bonus = `(${expression(result, "initiative")}) - (${initMod + system.attributes.init.prof.flat})`;
      system.attributes.spelldc = val(result, "SaveDC");
      system.bonuses ??= {};
      for (const [stat, keys, ability] of [["ToHitStr", ["mwak"], "str"], ["ToHitDext", ["rwak"], "dex"],
        ["ToHitMagic", ["msak", "rsak"], character.advanced?.spellcastingAbility ?? "int"]]) {
        for (const key of keys) { system.bonuses[key] ??= {}; system.bonuses[key].attack = `(${expression(result, stat)}) - (${val(result, `abilities.${ability}.mod`) + pb})`; }
      }
      system.bonuses.spell ??= {};
      system.bonuses.spell.dc = String(val(result, "SaveDC") - (8 + val(result, `abilities.${character.advanced?.spellcastingAbility ?? "int"}.mod`) + pb));
      system.attributes.hp ??= {};
      for (const [part, key] of [["current", "value"], ["max", "max"], ["temp", "temp"]]) system.attributes.hp[key] = val(result, `hp.${part}`, system.attributes.hp[key]);
      system.currency ??= {};
      for (const coin of ["pp", "gp", "sp", "cp", "rations"]) system.currency[coin] = val(result, `currency.${coin}`);
      system.spells ??= {};
      for (let level = 1; level <= 15; level++) {
        if (level > 9 && !system.spells[`spell${level}`]) continue;
        const slot = system.spells[`spell${level}`] ??= {};
        slot.value = val(result, `spellSlots.current.lvl${level}`);
        slot.max = val(result, `spellSlots.max.lvl${level}`);
      }
      system.resources ??= {};
      for (const [index, resource] of (character.Ressources ?? []).entries()) {
        const current = val(result, `Ressources.${resource.Name}.CurrentQty`), max = val(result, `Ressources.${resource.Name}.TotalQty`);
        if (index < 3) Object.assign(system.resources[["primary", "secondary", "tertiary"][index]] ??= {}, { value: current, max });
        else {
          const item = list(actor.items).find(i => i.flags?.[MODULE]?.resourceIndex === index);
          if (item?.system?.uses) Object.assign(item.system.uses, { max, spent: max - current });
        }
      }
      system.netherscrolls = { totals: result.values, formulas: result.formulas };
      system.hitDice ??= {};
      const bySize = {}, maxima = {};
      for (const die of ["d4", "d6", "d8", "d10", "d12", "d20"]) {
        bySize[die] = val(result, `hitDice.current.${die}`); maxima[die] = val(result, `hitDice.max.${die}`);
        system.hitDice[die] = { value: bySize[die], max: maxima[die] };
      }
      if (system.attributes.hd && typeof system.attributes.hd === "object") {
        Object.defineProperties(system.attributes.hd, {
          value: { configurable: true, get: () => Object.values(bySize).reduce((a, b) => a + b, 0) },
          max: { configurable: true, get: () => Object.values(maxima).reduce((a, b) => a + b, 0) },
          bySize: { configurable: true, get: () => bySize },
        });
        system.attributes.hd.sizes = new Set(Object.keys(maxima).filter(die => maxima[die] > 0 || bySize[die] > 0).map(die => Number(die.slice(1))));
      }
      states.set(actor, state);
      for (const item of list(actor.items)) for (const activity of list(item.system?.activities)) prepareDC(actor, activity);
    } catch (error) { report(actor, error); } finally { preparing.delete(actor); }
  }

  const contextChoices = new WeakMap();
  function contextFor(subject, rollType, config = {}, roll = {}) {
    config = { ...contextChoices.get(subject), ...config, ...config.nsEffectContext };
    const item = subject?.item ?? (subject?.parent?.documentName === "Item" ? subject.parent : null);
    const flags = subject?.flags?.netherscrolls ?? {};
    const itemFlags = item?.flags?.netherscrolls ?? {};
    const attack = subject?.attack?.type;
    const actor = subject?.actor;
    const native = nativeFlags(actor);
    const grants = [...list(native?.featureGrants), ...list(native?.featureSelectionGrants), ...list(native?.spells)]
      .filter(grant => (grant.id ?? grant.spellId) === itemFlags.id && grant.castAsClass);
    const classes = [...new Set(grants.map(grant => grant.castAsClass))];
    const classReference = config.spellClass ?? flags.spellClass ?? item?.system?.sourceClass ?? itemFlags.castAsClass ??
      item?.flags?.[MODULE]?.castAsClass ?? (classes.length === 1 ? classes[0] : undefined);
    const classId = typeof classReference === "object" ? classReference?.identifier ?? classReference?.id ?? classReference?._id ?? classReference?.name : classReference;
    const classItem = list(actor?.items).find(entry => entry.type === "class" &&
      [entry.id, entry.flags?.netherscrolls?.id, entry.system?.identifier, entry.name].includes(classId));
    const spellClass = classItem?.system?.identifier ?? classItem?.name ?? classId;
    const attackKind = config.attackKind ?? (attack?.value === "melee" || attack?.value === "ranged" ? attack.value :
      subject?.actionType?.startsWith("m") ? "melee" : subject?.actionType?.startsWith("r") ? "ranged" : undefined);
    return { rollType, ...(spellClass ? { spellClass: String(spellClass).toLowerCase() } : {}),
      featureTags: config.featureTags ?? flags.featureTags ?? flags.tags ?? itemFlags.featureTags,
      attackKind, damageType: config.damageType ?? roll.options?.type ?? roll.options?.damageType,
      weaponId: config.weaponId ?? (item?.type === "weapon" ? itemFlags.id : undefined) };
  }
  function rollTarget(config, type, actor, subject) {
    if (type === "skill") return `skills.${Object.keys(SKILLS).find(k => SKILLS[k][0] === config.skill) ?? config.skill}`;
    if (type === "tool") return `tools.${Object.keys(TOOLS).find(k => TOOLS[k][0] === config.tool) ?? config.tool}`;
    if (type === "savingThrow") return `savingThrows.${config.ability}`;
    if (type === "initiative") return "initiative";
    if (type === "abilityCheck") return `abilities.${config.ability ?? "str"}.mod`;
    if (type === "attack") return subject?.item?.type === "spell" || subject?.attack?.type?.classification === "spell" ? "ToHitMagic" :
      (subject?.ability === "dex" ? "ToHitDext" : "ToHitStr");
    if (type === "damage") return `abilities.${subject?.ability ?? actor.system.attributes?.spellcasting ?? "str"}.mod`;
    return null;
  }
  function modifyRoll(type, config, roll, options = {}) {
    const subject = config.subject, actor = subject?.actor ?? (subject?.documentName === "Actor" || subject?.system?.abilities ? subject : null);
    if (!actor || !hasNative(actor)) return;
    try {
      const state = states.get(actor) ?? collectState(actor);
      const fields = options.formData?.object ?? {};
      const selected = Object.fromEntries(Object.values(NS.FILTERS).filter(k => k !== "rollType").map(key =>
        [key, fields[`nsEffectContext.${key}`] ?? fields.nsEffectContext?.[key]]).filter(([, value]) => value));
      if (typeof selected.featureTags === "string") selected.featureTags = selected.featureTags.split(",").map(s => s.trim()).filter(Boolean);
      const context = contextFor(subject, type === "skill" || type === "tool" || type === "abilityCheck" ? "check" : type === "savingThrow" ? "save" : type, { ...config, ...selected }, roll);
      const target = rollTarget(config, type, actor, subject);
      if (!target) return;
      const character = clone(state.character);
      if (["skill", "tool"].includes(type) && roll.data?.abilityId && character[type === "skill" ? "skills" : "tools"]?.[target.split(".")[1]]) {
        character[type === "skill" ? "skills" : "tools"][target.split(".")[1]].ability = roll.data.abilityId;
      }
      // Re-collect at roll time: an instance may have expired since the sheet opened.
      const effects = NS.collect(actor);
      const contextual = resolve(character, effects, context);
      for (const error of contextual.errors) report(actor, error);
      const base = expression(state.result, target), desired = expression(contextual, target);
      if (base === desired) return;
      roll.parts ??= [];
      roll.data ??= {};
      const bonusKey = type === "skill" ? `${config.skill}Bonus` : type === "tool" ? `${config.tool}Bonus` :
        type === "savingThrow" ? `${config.ability}SaveBonus` : type === "attack" ? "actorBonus" : type === "initiative" ? "initiativeBonus" : null;
      if (bonusKey) {
        // Replace the native contribution, not desired-minus-original dice: those
        // would roll the same die twice and fail to cancel one another.
        const key = "nsEffectTotal";
        const replaceParts = new Set([`@${bonusKey}`, "@mod", "@prof", `@${key}`]);
        roll.parts = roll.parts.filter(part => !replaceParts.has(part));
        let adjusted = desired;
        if (type === "attack" && !state.effects.some(e => e.stat === `${target}.totalOverride` && NS.matchesFilters(e.filters, context))) {
          const ability = target === "ToHitMagic" ? character.advanced?.spellcastingAbility ?? "int" : target === "ToHitDext" ? "dex" : "str";
          // Keep the weapon's own proficiency choice and alternate attack ability.
          const difference = number(roll.data.mod) + number(roll.data.prof) - val(state.result, `abilities.${ability}.mod`) - val(state.result, "proficiencyBonus");
          if (difference) adjusted = `(${desired}) + (${difference})`;
        }
        roll.data[key] = adjusted;
        roll.parts.push(`@${key}`);
      } else {
        // Only the damage part that actually uses the ability modifier changes.
        if (type === "damage" && !roll.parts.some(part => /@mod\b/.test(part))) return;
        const delta = val(contextual, target) - val(state.result, target);
        if (delta) {
          roll.parts = roll.parts.filter(part => part !== "@nsEffectDelta");
          roll.data.nsEffectDelta = delta;
          roll.parts.push("@nsEffectDelta");
        }
      }
    } catch (error) { report(actor, error); }
  }
  const dcBases = new WeakMap();
  function prepareDC(actor, activity) {
    if (!activity?.save?.dc || !hasNative(actor)) return;
    const state = states.get(actor);
    if (!state) return;
    const context = contextFor(activity, "dc");
    const result = resolve(state.character, NS.collect(actor), context);
    const ability = activity.save.dc.calculation;
    const castingAbility = state.character.advanced?.spellcastingAbility ?? "int";
    const bonus = val(result, "SaveDC") - (8 + val(result, `abilities.${castingAbility}.mod`) + val(result, "proficiencyBonus"));
    if (state.effects.some(e => e.stat === "SaveDC.totalOverride" && NS.matchesFilters(e.filters, context))) activity.save.dc.value = val(result, "SaveDC");
    else if (!ability || ability === "custom") {
      const previous = dcBases.get(activity);
      const base = previous?.applied === activity.save.dc.value ? previous.base : number(activity.save.dc.value);
      activity.save.dc.value = base + bonus;
      dcBases.set(activity, { base, applied: activity.save.dc.value });
    } else activity.save.dc.value = 8 + val(result, `abilities.${ABILITIES.includes(ability) ? ability : castingAbility}.mod`) + val(result, "proficiencyBonus") + bonus;
  }
  function install() {
    const ActorClass = globalThis.CONFIG?.Actor?.documentClass ?? globalThis.Actor;
    if (!ActorClass?.prototype?.prepareData || ActorClass.prototype.prepareData._nsEffects) return;
    const original = ActorClass.prototype.prepareData;
    const wrapped = function (...args) { states.delete(this); const result = original.apply(this, args); prepare(this); return result; };
    wrapped._nsEffects = true;
    ActorClass.prototype.prepareData = wrapped;
    for (const type of ["skill", "tool", "savingThrow", "abilityCheck", "attack", "damage"]) {
      Hooks.on(`dnd5e.postBuild${type[0].toUpperCase() + type.slice(1)}RollConfig`, (config, roll, _index, options) => modifyRoll(type, config, roll, options));
    }
    Hooks.on("dnd5e.preConfigureInitiative", (actor, roll) => modifyRoll("initiative", { subject: actor }, roll));
    Hooks.on("dnd5e.preUseActivity", (activity, config) => {
      if (config?.nsEffectContext) contextChoices.set(activity, config.nsEffectContext);
      const effects = list(activity.effects).map(link => activity.item?.effects?.get?.(link._id ?? link.id)).filter(Boolean);
      for (const effect of effects) {
        const application = effect.flags?.netherscrolls?.effectApplication;
        if (effect.flags?.[MODULE]?.nsRuntimeEffect && !NS.eligible({ ...application, mode: "passive" }, activity.item)) {
          report(activity.actor, new Error(`${activity.name}: its NS equipment requirement is not satisfied.`));
          return false;
        }
      }
      prepareDC(activity.actor, activity);
    });
    Hooks.on("preCreateActiveEffect", (effect, data) => {
      if (!data.flags?.[MODULE]?.nsRuntimeEffect || effect.parent?.documentName !== "Actor") return;
      const originActor = /^Actor\.([^.]+)/.exec(data.origin ?? "")?.[1] ?? effect.parent.id;
      const lifecycle = { sourceActorId: originActor, startedAt: globalThis.game?.time?.worldTime ?? 0,
        combatId: globalThis.game?.combat?.id ?? null, round: globalThis.game?.combat?.round ?? null, turn: globalThis.game?.combat?.turn ?? null };
      const ns = data.flags.netherscrolls;
      const source = globalThis.game?.actors?.get?.(originActor);
      const sourceItem = source?.items?.get?.(data.origin?.split(".Item.")[1]?.split(".")[0]);
      const sourceType = sourceItem?.flags?.[MODULE]?.featureScope ??
        (["race", "class", "subclass", "feat", "background"].includes(sourceItem?.type) ? sourceItem.type : "item");
      const native = { ...clone(ns?.nativeEffect), duration: clone(ns?.nativeEffect?.duration ?? ns?.effectApplication?.duration),
        origin: ns?.nativeEffect?.origin ?? { sourceType,
          sourceId: ns?.sourceId, featureId: ns?.featureId, effectId: ns?.nativeEffect?._id,
          characterId: source?.flags?.netherscrolls?.characterId ?? nativeFlags(source)?._id } };
      if (!ns?.nativeEffect?.origin) native._id = globalThis.crypto?.randomUUID?.().replaceAll("-", "").slice(0, 24) ??
        (NS.stableId(`${Date.now()}:${Math.random()}`) + NS.stableId(Math.random())).slice(0, 24);
      const seconds = ({ minute: 60, hour: 3600, day: 86400 })[native.duration?.unit];
      if (seconds && !native.expiresAt) native.expiresAt = new Date(Date.now() + seconds * number(native.duration.value) * 1000).toISOString();
      effect.updateSource({ [`flags.${MODULE}.lifecycle`]: lifecycle,
        [`flags.${MODULE}.portableActiveEffect`]: true, [`flags.${MODULE}.nativeActiveBonus`]: native,
        "flags.netherscrolls.nativeEffect": native });
    });
    Hooks.on("createActiveEffect", effect => {
      const actor = effect.parent, native = effect.flags?.netherscrolls?.nativeEffect;
      if (actor?.documentName !== "Actor" || !activeOwner(actor) || !effect.flags?.[MODULE]?.nsRuntimeEffect || !native?.origin) return;
      const key = origin => [origin?.sourceType, origin?.sourceId ?? origin?.itemId, origin?.featureId, origin?.effectId, origin?.characterId].join(":");
      const older = list(actor.effects).filter(other => other.id !== effect.id && !other.disabled &&
        other.flags?.[MODULE]?.nsRuntimeEffect && key(other.flags?.netherscrolls?.nativeEffect?.origin) === key(native.origin));
      if (older.length) actor.updateEmbeddedDocuments("ActiveEffect", older.map(other => ({ _id: other.id, disabled: true }))).catch(error => report(actor, error));
    });
    Hooks.on("dnd5e.restCompleted", (actor, _result, config) => expireEvent(actor, config.type === "long" ? "longRest" : "shortRest"));
    Hooks.on("updateWorldTime", () => refreshActors());
    Hooks.on("renderApplicationV2", appendContextControls);
    Hooks.once("ready", () => globalThis.setInterval?.(refreshActors, 30_000));
    Hooks.on("updateCombat", (combat, change) => {
      if (!("turn" in change) && !("round" in change)) return;
      expireTurns(combat).catch(error => report(null, error));
    });
    const module = globalThis.game?.modules?.get(MODULE);
    if (module) module.api = { ...module.api, effects: { resolve: (actor, context) => collectState(actor, context).result,
      roll: rollNative, rollHitDie, inspect: inspect, refresh: actor => actor.prepareData(), adjustPool, endEffect, event: expireEvent } };
  }

  function appendContextControls(app) {
    const subject = app.config?.subject ?? app.activity;
    const actor = subject?.actor ?? (subject?.documentName === "Actor" ? subject : null);
    if (!actor || !hasNative(actor) || !app.element?.querySelector || app.element.querySelector("[data-ns-context]")) return;
    const choices = new Map();
    for (const effect of NS.collect(actor)) for (const [filter, values] of Object.entries(effect.filters ?? {})) {
      const key = NS.FILTERS[filter];
      if (!key || key === "rollType") continue;
      const set = choices.get(key) ?? new Set();
      for (const value of values) set.add(value);
      choices.set(key, set);
    }
    if (!choices.size) return;
    const form = app.element.matches("form") ? app.element : app.element.querySelector("form");
    if (!form) return;
    const fieldset = document.createElement("fieldset");
    fieldset.dataset.nsContext = "true";
    const legend = document.createElement("legend"); legend.textContent = "NS effect conditions"; fieldset.append(legend);
    const context = contextFor(subject, "check");
    const labels = { spellClass: "Casting class", featureTags: "Feature tags", attackKind: "Attack kind", damageType: "Damage type", weaponId: "NS weapon ID" };
    for (const [key, values] of choices) {
      const label = document.createElement("label"); label.className = "form-group";
      const caption = document.createElement("span"); caption.textContent = labels[key]; label.append(caption);
      const select = document.createElement("select"); select.name = `nsEffectContext.${key}`;
      for (const value of ["", ...values]) {
        const option = document.createElement("option"); option.value = value; option.textContent = value || "Automatic"; select.append(option);
      }
      if (values.has(context[key])) select.value = context[key];
      select.addEventListener("change", () => {
        const selected = { ...contextChoices.get(subject) };
        if (select.value) selected[key] = key === "featureTags" ? [select.value] : select.value;
        else delete selected[key];
        contextChoices.set(subject, selected);
        prepareDC(actor, subject);
      });
      label.append(select); fieldset.append(label);
    }
    (form.querySelector(".form-footer") ?? form.querySelector("footer"))?.before(fieldset);
    if (!fieldset.isConnected) form.append(fieldset);
  }

  function worldActors() {
    const actors = new Map(list(globalThis.game?.actors).map(actor => [actor.uuid ?? actor.id, actor]));
    for (const token of globalThis.canvas?.tokens?.placeables ?? []) if (token.actor) actors.set(token.actor.uuid ?? token.actor.id, token.actor);
    return [...actors.values()];
  }
  const activeOwner = actor => actor.isOwner && (globalThis.game?.user?.isGM ? !globalThis.game.users?.activeGM || globalThis.game.users.activeGM.id === globalThis.game.user.id : !globalThis.game?.users?.activeGM);
  async function endEffect(actor, id) {
    if (!actor.isOwner) throw new Error("You cannot change this character's effects.");
    await actor.updateEmbeddedDocuments("ActiveEffect", [{ _id: id, disabled: true }]);
  }
  async function expireEvent(source, event) {
    for (const actor of worldActors()) {
      if (!activeOwner(actor)) continue;
      const updates = [];
      for (const effect of list(actor.effects)) {
        const runtime = effect.flags?.[MODULE], native = effect.flags?.netherscrolls;
        if (!runtime?.nsRuntimeEffect || effect.disabled || (runtime.lifecycle?.sourceActorId ?? actor.id) !== source.id) continue;
        const unit = native.nativeEffect?.duration?.unit ?? native.effectApplication?.duration?.unit;
        if ((unit === "untilShortRest" && ["shortRest", "longRest"].includes(event)) || (unit === "untilLongRest" && event === "longRest")) updates.push({ _id: effect.id, disabled: true });
      }
      if (updates.length) await actor.updateEmbeddedDocuments("ActiveEffect", updates);
    }
  }
  async function expireTurns(combat) {
    const currentActorId = combat.combatant?.actor?.id;
    const previousActorId = combat.turns?.[combat.previous?.turn]?.actor?.id;
    for (const actor of worldActors()) {
      if (!activeOwner(actor)) continue;
      const updates = [];
      for (const effect of list(actor.effects)) {
        const runtime = effect.flags?.[MODULE], native = effect.flags?.netherscrolls;
        const duration = native?.nativeEffect?.duration ?? native?.effectApplication?.duration;
        if (!runtime?.nsRuntimeEffect || effect.disabled || duration?.unit !== "untilNextTurn") continue;
        const life = runtime.lifecycle;
        if (!life || (life.combatId && life.combatId !== combat.id)) continue;
        const moved = life.round !== combat.round || life.turn !== combat.turn;
        if (!moved) continue;
        if (duration.expiry === "end") {
          if (life.armed && previousActorId === life.sourceActorId) updates.push({ _id: effect.id, disabled: true });
          else if (currentActorId === life.sourceActorId) updates.push({ _id: effect.id, [`flags.${MODULE}.lifecycle.armed`]: true });
        } else if (currentActorId === life.sourceActorId) updates.push({ _id: effect.id, disabled: true });
      }
      if (updates.length) await actor.updateEmbeddedDocuments("ActiveEffect", updates);
      actor.prepareData();
    }
  }
  function refreshActors() {
    for (const actor of worldActors()) if (hasNative(actor)) {
      try { actor.prepareData(); if (actor.sheet?.rendered) actor.sheet.render(false); } catch (error) { report(actor, error); }
    }
  }
  async function adjustPool(actor, stat, amount) {
    if (!actor.isOwner) throw new Error("You cannot change this character's pools.");
    if (!Number.isFinite(amount)) throw new Error("Invalid pool adjustment");
    const state = collectState(actor);
    if (!(stat in state.result.values)) throw new Error(`Unknown NS pool: ${stat}`);
    let path, base;
    const resource = /^Ressources\.(.+)\.(CurrentQty|TotalQty)$/.exec(stat);
    if (resource) {
      const index = state.character.Ressources.findIndex(row => row.Name === resource[1]);
      base = state.character.Ressources[index][resource[2]];
      path = `flags.${MODULE}.nativeEffectState.Ressources.${index}.${resource[2]}`;
    } else {
      const slot = /^spellSlots\.(current|max)\.lvl(\d+)$/.exec(stat);
      const hp = /^hp\.(current|max|temp)$/.exec(stat);
      if (slot && Number(slot[2]) <= 9) path = `system.spells.spell${slot[2]}.${slot[1] === "current" ? "value" : "override"}`;
      else if (hp) path = `system.attributes.hp.${hp[1] === "current" ? "value" : hp[1]}`;
      else if (/^currency\.(pp|gp|sp|cp)$/.test(stat)) path = `system.${stat}`;
      else if (/^(?:hitDice\.(?:current|max)\.d(?:4|6|8|10|12|20)|spellSlots\.(?:current|max)\.lvl(?:[1-9]|1[0-5])|currency\.rations)$/.test(stat)) path = `flags.${MODULE}.nativeEffectState.${stat}`;
      else throw new Error(`Not a spendable NS pool: ${stat}`);
      base = NS.get(state.character, stat);
    }
    if (state.result.values[stat] + amount < 0) throw new Error("This NS pool does not have enough remaining.");
    await actor.update({ [path]: number(base) + amount });
  }
  async function rollHitDie(actor, die) {
    if (!actor.isOwner) throw new Error("You cannot change this character's hit dice.");
    if (!/^d(?:4|6|8|10|12|20)$/.test(die)) throw new Error("Invalid hit die");
    const state = collectState(actor);
    if (val(state.result, `hitDice.current.${die}`) < 1) throw new Error("No hit dice remaining in this pool.");
    const roll = await new Roll(`1${die} + (${val(state.result, "abilities.con.mod")})`).evaluate();
    const healing = Math.max(0, Math.min(roll.total, val(state.result, "hp.max") - val(state.result, "hp.current")));
    await actor.update({ [`flags.${MODULE}.nativeEffectState.hitDice.current.${die}`]: number(state.character.hitDice.current[die]) - 1,
      "system.attributes.hp.value": number(state.character.hp.current) + healing });
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `${actor.name}: ${die} hit die` });
    return roll;
  }
  function exportState(actor) {
    if (!nativeFlags(actor) || typeof actor.toObject !== "function") return {};
    const raw = actor.toObject();
    const character = sourceCharacter({ flags: raw.flags, system: raw.system, _source: raw, items: raw.items ?? [] });
    return Object.fromEntries(["abilities", "savingThrows", "skills", "tools", "proficiencyBonus", "armorClass", "initiative",
      "ToHitStr", "ToHitDext", "ToHitMagic", "SaveDC", "xp", "exhaustion", "hp", "currency", "hitDice", "spellSlots", "Ressources"]
      .filter(key => character[key] !== undefined).map(key => [key, clone(character[key])]));
  }

  async function rollNative(actor, stat, context = {}) {
    const { result } = collectState(actor, context);
    if (!(stat in result.values)) throw new Error(`Unknown NS roll stat: ${stat}`);
    const roll = new Roll(`1d20 + (${expression(result, stat)})`);
    await roll.evaluate();
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `${actor.name}: ${stat}` });
    return roll;
  }
  function inspect(actor) {
    const { result } = collectState(actor);
    const escape = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    const rows = Object.entries(result.values).filter(([key]) => !/\.(misc|bonus|prof)$/.test(key));
    const content = `<table><thead><tr><th>NS stat</th><th>Total</th><th>Action</th></tr></thead><tbody>${rows.map(([key, value]) =>
      `<tr><td>${escape(key)}</td><td>${escape(result.formulas[key] ?? value)}</td><td>${/^(skills|tools|savingThrows)\./.test(key) ? `<button type="button" data-ns-roll="${escape(key)}">Roll</button>` :
        /^hitDice\.current/.test(key) ? `<button type="button" data-ns-hit-die="${escape(key.split(".").at(-1))}">Roll &amp; spend</button>` :
        /^(spellSlots\.current|currency\.|Ressources\..+\.CurrentQty)/.test(key) ? `<button type="button" data-ns-spend="${escape(key)}">Spend 1</button>` : ""}</td></tr>`).join("")}</tbody></table>
      ${list(actor.effects).filter(e => e.flags?.[MODULE]?.nsRuntimeEffect && !e.disabled).map(e => `<p>${escape(e.name)} <button type="button" data-ns-end="${escape(e.id)}">End effect</button></p>`).join("")}`;
    const DialogClass = globalThis.foundry?.applications?.api?.DialogV2;
    if (DialogClass) return new DialogClass({ window: { title: `${actor.name}: NS effects` }, content,
      buttons: [{ action: "close", label: "Close" }], render: (_event, dialog) => {
        for (const button of dialog.element.querySelectorAll("[data-ns-roll]")) button.addEventListener("click", () =>
          rollNative(actor, button.dataset.nsRoll, { rollType: button.dataset.nsRoll.startsWith("savingThrows") ? "save" : "check" }).catch(error => report(actor, error)));
        for (const button of dialog.element.querySelectorAll("[data-ns-spend]")) button.addEventListener("click", () =>
          adjustPool(actor, button.dataset.nsSpend, -1).then(() => { dialog.close(); inspect(actor); }).catch(error => report(actor, error)));
        for (const button of dialog.element.querySelectorAll("[data-ns-end]")) button.addEventListener("click", () =>
          endEffect(actor, button.dataset.nsEnd).then(() => { dialog.close(); inspect(actor); }).catch(error => report(actor, error)));
        for (const button of dialog.element.querySelectorAll("[data-ns-hit-die]")) button.addEventListener("click", () =>
          rollHitDie(actor, button.dataset.nsHitDie).then(() => { dialog.close(); inspect(actor); }).catch(error => report(actor, error)));
      } }).render({ force: true });
  }
  NS.foundry = { prepare, sourceCharacter, collectState, contextFor, modifyRoll, prepareDC, install, rollNative, inspect, states,
    adjustPool, endEffect, expireEvent, expireTurns, hasNative, exportState, rollHitDie };
  if (globalThis.Hooks) {
    Hooks.once("setup", install);
    Hooks.on("getHeaderControlsActorSheetV2", (app, controls) => {
      if (nativeFlags(app.actor)) controls.push({ icon: "fa-solid fa-wand-magic-sparkles", label: "NS effects", action: "ns-effects", onClick: () => inspect(app.actor) });
    });
    Hooks.on("getActorSheetHeaderButtons", (app, buttons) => {
      if (nativeFlags(app.actor)) buttons.unshift({ label: "NS effects", class: "ns-effects", icon: "fas fa-wand-magic-sparkles", onclick: () => inspect(app.actor) });
    });
  }
})();
