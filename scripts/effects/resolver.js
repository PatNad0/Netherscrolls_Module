/**
 * Resolve a dependency graph of native character stats and applicable modifiers.
 * Cache completed reads and report cycles or unsupported formulas instead of inventing totals.
 */

/** Create effect resolver. */
function createEffectResolver({
  ABILITIES,
  ABILITY,
  MOVEMENT,
  ORDERED_MODES,
  SENSES,
  SKILLS,
  TOOLS,
  canonicalTarget,
  constant,
  diceAllowed,
  featureReference,
  formulaValue,
  get,
  grantValue,
  isGrantStat,
  isModeStat,
  matchesFilters,
  number,
  parseFormula,
  plus,
  referenceTarget,
  safeStatKey,
}) {
  // ---------------------------------------------------------------- resolver
  /** Resolve dependent stats lazily so modifiers use final values without double-counting or hiding cycles. */
  function resolve(character, effects = [], context = {}) {
    const nodes = new Map(),
      modifiers = new Map(),
      cache = new Map(),
      visiting = new Set(),
      errors = [],
      applied = {};
    // Grant effects are sets, never numbers: stat -> granted values (no duplicates).
    const grants = new Map(),
      toolAbilities = {};
    const levels = character._nsLevels ?? {};
    const add = /** Add. */ (key, evaluator) => nodes.set(key, evaluator);
    const scalar = /** Handle scalar. */ (key, value = 0) =>
      add(
        key,
        /** Perform the callback while resolve. */ (read) => {
          if (parseFormula(value ?? 0).dice && !diceAllowed(key))
            throw new Error(`Dice are not permitted on ${key}`);
          return formulaValue(
            value ?? 0,
            /** Perform the callback while resolve. */ (reference) => read(reference)
          );
        }
      );
    const component = /** Handle component. */ (key, value) => scalar(key, value ?? 0);
    const block = /** Handle block. */ (key, base = 0) => {
      const entry = get(character, key);
      component(`${key}.misc`, entry?.misc);
      component(`${key}.bonus`, entry?.bonus);
      add(
        key,
        /** Perform the callback while resolve. */ (read) =>
          plus(
            plus(
              typeof base === "function" ? base(read) : constant(base),
              read(`${key}.misc`, true)
            ),
            read(`${key}.bonus`, true)
          )
      );
    };
    const proficiency = character.proficiencyBonus;
    block(
      "proficiencyBonus",
      proficiency && typeof proficiency === "object" ? (proficiency.value ?? 0) : (proficiency ?? 0)
    );
    scalar("xp", character.xp ?? 0);
    scalar("exhaustion", character.exhaustion ?? 0);
    for (const ability of ABILITIES) {
      block(
        `abilities.${ability}`,
        character.abilities?.[ability]?.score ?? character.abilities?.[ability] ?? 10
      );
      add(
        `abilities.${ability}.mod`,
        /** Perform the callback while resolve. */ (read) =>
          constant(Math.floor((read(`abilities.${ability}`, true).value - 10) / 2))
      );
    }
    for (const family of ["skills", "tools", "savingThrows"]) {
      const defaults =
        family === "skills"
          ? SKILLS
          : family === "tools"
            ? TOOLS
            : Object.fromEntries(
                ABILITIES.map(/** Transform each entry while resolve. */ (k) => [k, [k, k]])
              );
      const keys = new Set([
        ...(family === "tools" ? [] : Object.keys(defaults)),
        ...Object.keys(character[family] ?? {}),
      ]);
      for (const effect of effects) {
        const match = new RegExp(`^${family}\\.([^.]+)`).exec(effect.stat);
        if (match && match[1] !== "all" && safeStatKey(match[1])) keys.add(match[1]);
      }
      for (const key of keys) {
        if (!safeStatKey(key)) continue;
        const entry = character[family]?.[key] ?? {};
        const stored = entry.ability ?? defaults[key]?.[1] ?? "int";
        const path = `${family}.${key}`;
        // A granted tool ability replaces the stored one; with several, the highest final
        // modifier wins and a tie goes to the first in ABILITIES order.
        const abilityOf = /** Handle ability of. */ (read) => {
          const granted = family === "tools" ? grants.get(`tools.${key}.ability`) : null;
          if (!granted?.length) return stored;
          const ability = ABILITIES.filter(
            /** Keep entries that satisfy the condition while resolve. */ (a) => granted.includes(a)
          ).reduce(
            /** Combine entries into a result while resolve. */ (best, a) =>
              read(`abilities.${a}.mod`, true).value > read(`abilities.${best}.mod`, true).value
                ? a
                : best
          );
          toolAbilities[path] = ability;
          return ability;
        };
        component(`${path}.prof`, entry.prof ?? 0);
        block(
          path,
          /** Perform the callback while resolve. */ (read) =>
            plus(
              read(`abilities.${abilityOf(read)}.mod`, true),
              constant(
                (entry.proficiencyRounding === "up" ? Math.ceil : Math.floor)(
                  read(`${path}.prof`, true).value * read("proficiencyBonus", true).value
                )
              )
            )
        );
      }
    }
    // Netherscrolls AC: base (armor or armorClass.value) + DEX (capped by armor or
    // maxDexBonus) + shield + misc + bonus + effects. A Foundry AC calculation such as
    // Mage Armor supplies the base including DEX (`_nsAcBase`).
    block(
      "armorClass",
      /** Perform the callback while resolve. */ (read) => {
        const raw = character.armorClass;
        const ac = raw && typeof raw === "object" ? raw : { value: raw ?? 10 };
        const gear = character._nsArmor ?? {};
        const dexMod = read("abilities.dex.mod", true).value;
        const capped = /** Handle capped. */ (limit) => {
          if (limit == null || limit === "") return dexMod;
          const cap = Math.max(0, Math.trunc(number(limit)));
          return cap === 0 ? 0 : Math.min(dexMod, cap);
        };
        let base;
        if (character._nsAcBase != null) base = number(character._nsAcBase);
        else if (gear.armor) base = number(gear.armor.value) + capped(gear.armor.dex);
        else base = number(ac.value ?? 10) + capped(ac.maxDexBonus);
        return constant(base + number(gear.shield));
      }
    );
    block(
      "initiative",
      /** Perform the callback while resolve. */ (read) =>
        plus(
          read(`abilities.${character.initiative?.ability ?? "dex"}.mod`, true),
          constant(
            Math.floor(number(character.initiative?.prof) * read("proficiencyBonus", true).value)
          )
        )
    );
    for (const stat of ["ToHitStr", "ToHitDext", "ToHitMagic", "SaveDC"])
      block(
        stat,
        /** Perform the callback while resolve. */ (read) => {
          const ability =
            stat === "ToHitStr"
              ? "str"
              : stat === "ToHitDext"
                ? "dex"
                : character.advanced?.spellcastingAbility || "int";
          return constant(
            (stat === "SaveDC" ? 8 : 0) +
              read(`abilities.${ability}.mod`, true).value +
              read("proficiencyBonus", true).value
          );
        }
      );
    for (const part of ["current", "max", "temp"]) scalar(`hp.${part}`, character.hp?.[part]);
    for (const coin of ["pp", "gp", "sp", "cp", "rations"])
      scalar(`currency.${coin}`, character.currency?.[coin]);
    for (const part of ["current", "max"]) {
      for (const die of ["d4", "d6", "d8", "d10", "d12", "d20"])
        scalar(`hitDice.${part}.${die}`, character.hitDice?.[part]?.[die]);
      for (let level = 1; level <= 15; level++)
        scalar(`spellSlots.${part}.lvl${level}`, character.spellSlots?.[part]?.[`lvl${level}`]);
    }
    for (const resource of character.Ressources ?? []) {
      for (const part of ["CurrentQty", "TotalQty"])
        scalar(`Ressources.${resource.Name}.${part}`, resource[part]);
    }
    // Mode stats: speeds and senses start from the stored base, ability maximums from 20.
    const advanced = character.advanced ?? {};
    for (const type of MOVEMENT) scalar(`speed.${type}`, number(advanced.movement?.[type]));
    for (const sense of SENSES)
      scalar(
        `senses.${sense}`,
        number(advanced.senses?.[sense] ?? advanced.senses?.ranges?.[sense])
      );
    for (const ability of ABILITIES) {
      const max = character.abilities?.[ability]?.max;
      scalar(
        `abilities.${ability}.max`,
        max != null && max !== "" && Number.isFinite(Number(max)) ? Number(max) : 20
      );
    }
    // Check and damage bonuses have no stored base.
    for (const stat of [
      "checks.all",
      ...ABILITIES.map(/** Transform each entry while resolve. */ (a) => `checks.${a}`),
      "DamageStr",
      "DamageDext",
      "DamageMagic",
    ])
      scalar(`${stat}.bonus`, 0);
    const seen = new Set();
    for (const effect of effects) {
      if (effect.active === false || !matchesFilters(effect.filters, context)) continue;
      const identity =
        effect._nsKey ?? (effect.origin ? JSON.stringify(effect.origin) : effect._id);
      if (identity && seen.has(identity)) continue;
      if (identity) seen.add(identity);
      try {
        if (isGrantStat(effect.stat)) {
          const value = grantValue(effect.stat, effect.grant);
          if (value == null)
            throw new Error(`"${effect.grant ?? ""}" is not a value of ${effect.stat}`);
          const values = grants.get(effect.stat) ?? [];
          if (!values.includes(value)) values.push(value);
          grants.set(effect.stat, values);
          if (effect._nsKey) applied[effect._nsKey] = { target: effect.stat, value, changed: true };
          continue;
        }
        if (
          effect.upToMax &&
          !new RegExp(`^abilities\\.${ABILITY}(?:\\.score)?$`).test(effect.stat)
        )
          throw new Error("upToMax only applies to an ability score");
        if (effect.mode && effect.mode !== "add" && effect.upToMax)
          throw new Error("upToMax cannot be combined with a mode");
        const parsed = parseFormula(effect.bonus);
        if (parsed.dice && !diceAllowed(effect.stat))
          throw new Error("Dice are not permitted on this NS stat");
        if (parsed.dice && ORDERED_MODES.has(effect.mode))
          throw new Error(`Dice cannot be used with ${effect.mode}`);
        let targets = [canonicalTarget(effect.stat)];
        if (/^savingThrows\.all(?:\.(?:bonus|misc|prof))?$/.test(targets[0]))
          targets = ABILITIES.map(
            /** Transform each entry while resolve. */ (k) => targets[0].replace(".all", `.${k}`)
          );
        if (/^Ressources\.(CurrentQty|TotalQty)$/.test(targets[0]))
          targets = (character.Ressources ?? []).map(
            /** Transform each entry while resolve. */
            (r) => `Ressources.${r.Name}.${targets[0].split(".")[1]}`
          );
        for (const target of targets) {
          if (!nodes.has(target)) throw new Error(`Unsupported NS stat: ${effect.stat}`);
          const entries = modifiers.get(target) ?? [];
          entries.push(effect);
          modifiers.set(target, entries);
        }
      } catch (error) {
        errors.push({
          effect,
          message: `${effect.source ? `${effect.source}: ` : ""}${error.message}`,
        });
      }
    }
    const isOverride = /** Determine whether override. */ (effect) =>
      effect.stat.endsWith(".totalOverride") || effect.mode === "override";
    /** Read. */
    function read(key, exact = false) {
      const target = exact ? key : referenceTarget(key);
      if (cache.has(target)) return cache.get(target);
      if (!nodes.has(target)) throw new Error(`Unknown NS formula reference: ${key}`);
      if (visiting.has(target))
        throw new Error(`FORMULA_CYCLE: ${[...visiting, target].join(" -> ")}`);
      visiting.add(target);
      try {
        const entries = modifiers.get(target) ?? [];
        const evaluate = /** Handle evaluate. */ (effect) =>
          formulaValue(
            effect.bonus,
            /** Perform the callback while read. */ (reference) => {
              const feature = featureReference(reference, { ...levels, ...effect._nsScope });
              return feature ?? read(reference);
            }
          );
        const attempt = /** Handle attempt. */ (effect, apply) => {
          try {
            apply(evaluate(effect));
          } catch (error) {
            if (String(error.message).startsWith("FORMULA_CYCLE")) throw error;
            errors.push({
              effect,
              message: `${effect.source ? `${effect.source}: ` : ""}${error.message}`,
            });
          }
        };
        const note = /** Handle note. */ (effect, value, changed = true) => {
          if (effect._nsKey) applied[effect._nsKey] = { target, value, changed };
        };
        let result;
        const overrides = entries.filter(isOverride);
        if (isModeStat(target)) {
          // Mode stats: when several overrides apply, the highest wins.
          for (const effect of overrides)
            attempt(
              effect,
              /** Perform the callback while read. */ (value) => {
                const better = !result || value.value > result.value;
                if (better) result = { ...value };
                note(effect, value.value, better);
              }
            );
        } else if (overrides.length) {
          const override = overrides.at(-1);
          attempt(
            override,
            /** Perform the callback while read. */ (value) => {
              result = { ...value };
              note(override, value.value);
            }
          );
        }
        if (!result) {
          result = nodes.get(target)(read);
          // Foundry order: multiply, add, downgrade, upgrade (override handled above).
          for (const effect of entries.filter(
            /** Keep entries that satisfy the condition while read. */ (entry) =>
              entry.mode === "multiply"
          ))
            attempt(
              effect,
              /** Perform the callback while read. */ (value) => {
                result = {
                  value: result.value * value.value,
                  formula: `(${result.formula}) * (${value.formula})`,
                  dice: result.dice,
                };
                note(effect, value.value);
              }
            );
          for (const effect of entries.filter(
            /** Keep entries that satisfy the condition while read. */
            (entry) => !isOverride(entry) && !ORDERED_MODES.has(entry.mode) && !entry.upToMax
          ))
            attempt(
              effect,
              /** Perform the callback while read. */ (value) => {
                result = plus(result, value);
                note(effect, value.value);
              }
            );
          for (const mode of ["downgrade", "upgrade"])
            for (const effect of entries.filter(
              /** Keep entries that satisfy the condition while read. */ (entry) =>
                entry.mode === mode
            ))
              attempt(
                effect,
                /** Perform the callback while read. */ (value) => {
                  const better =
                    mode === "upgrade" ? value.value > result.value : value.value < result.value;
                  note(effect, value.value, better);
                  if (!better) return;
                  const delta = value.value - result.value;
                  result = result.dice
                    ? {
                        value: value.value,
                        formula: `(${result.formula}) + (${delta})`,
                        dice: true,
                      }
                    : constant(value.value);
                }
              );
          // "+N, to a maximum of the cap": every capped addition together, after the ordinary
          // score effects, never lowering a score already above the maximum.
          const capped = entries.filter(
            /** Keep entries that satisfy the condition while read. */ (entry) =>
              entry.upToMax && !isOverride(entry)
          );
          if (capped.length) {
            let sum = 0;
            for (const effect of capped)
              attempt(
                effect,
                /** Perform the callback while read. */ (value) => {
                  sum += value.value;
                  note(effect, value.value);
                }
              );
            const cap = read(`${target}.max`, true).value;
            result = constant(Math.max(result.value, Math.min(result.value + sum, cap)));
          }
        }
        if (target === "armorClass" && result.value < 0) result = constant(0);
        cache.set(target, result);
        return result;
      } finally {
        visiting.delete(target);
      }
    }
    for (const key of nodes.keys()) {
      try {
        read(key, true);
      } catch (error) {
        errors.push({ stat: key, message: error.message });
      }
    }
    return {
      values: Object.fromEntries(
        [...cache].map(
          /** Transform each entry while resolve. */ ([key, value]) => [key, value.value]
        )
      ),
      formulas: Object.fromEntries(
        [...cache]
          .filter(
            /** Keep entries that satisfy the condition while resolve. */ ([, value]) => value.dice
          )
          .map(/** Transform each entry while resolve. */ ([key, value]) => [key, value.formula])
      ),
      errors,
      applied,
      grants: Object.fromEntries(grants),
      toolAbilities,
    };
  }

  return { resolve };
}

export { createEffectResolver };
