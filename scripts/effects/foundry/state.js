/**
 * Combine source projection, collected effects, and conditional class mechanics.
 * Share result accessors so actor preparation, rolls, and exports interpret the same evaluator output.
 */

/** Create foundry effect state. */
function createFoundryEffectState({
  MODULE,
  SKILLS,
  collect,
  list,
  number,
  ownerScope,
  report,
  resolve,
  sourceCharacter,
}) {
  /** Evaluate collected effects against source values, then include applicable native class mechanics. */
  function collectState(actor, context = {}) {
    const collected = collect(actor);
    const character = sourceCharacter(actor, collected);
    collected.effects.push(...mechanicEffects(actor, character, collected.effects, context));
    const result = resolve(character, collected.effects, context);
    for (const problem of collected.problems) report(actor, problem);
    for (const error of result.errors) report(actor, error);
    return { character, effects: collected.effects, collected, result };
  }

  // Numerical class mechanics are returned separately from library effect
  // definitions by NS. Recompute from the current actor so equipment, HP and
  // ability changes take effect immediately, without exporting derived passives.
  function mechanicEffects(actor, character, effects, context = {}) {
    const base = resolve(character, effects, context).values;
    const rows = [],
      seen = new Set();
    const unconscious =
      context.unconscious ||
      list(actor.statuses).some(
        /** Check whether any entry matches while handle mechanic effects. */ (s) =>
          ["unconscious", "dead"].includes(s)
      );
    const equipped = list(actor.items).filter(
      /** Keep entries that satisfy the condition while handle mechanic effects. */ (i) =>
        i.type === "equipment" && i.system?.equipped
    );
    const armored = equipped.some(
      /** Check whether any entry matches while handle mechanic effects. */ (i) =>
        ["light", "medium", "heavy"].includes(i.system?.type?.value)
    );
    const shield = equipped.some(
      /** Check whether any entry matches while handle mechanic effects. */ (i) =>
        i.system?.type?.value === "shield"
    );
    for (const item of list(actor.items)) {
      const flags = item.flags?.[MODULE],
        mechanic = flags?.nativeMechanics;
      if (!mechanic?.type) continue;
      const scope = ownerScope(item, character._nsLevels);
      if (number(flags.level) > scope.classLevel) continue;
      const add = /** Add. */ (stat, bonus) => {
        const featureId = item.flags?.netherscrolls?.id ?? item.id;
        const key = `mechanic:${featureId}:${stat}`;
        rows.push({
          stat,
          bonus: String(bonus),
          active: true,
          source: item.name,
          origin: {
            sourceType: flags.parentSubclassNetherscrollsId ? "subclass" : "class",
            sourceId: flags.parentSubclassNetherscrollsId || flags.parentClassNetherscrollsId,
            featureId,
          },
          _nsKey: key,
          _nsKind: "passive",
        });
      };
      if (
        seen.has(mechanic.type) &&
        ["unarmoredDefense", "jackOfAllTrades", "auraOfProtection"].includes(mechanic.type)
      )
        continue;
      seen.add(mechanic.type);
      if (
        mechanic.type === "unarmoredDefense" &&
        !armored &&
        !(mechanic.noShield && shield) &&
        !character.transformation &&
        !character._nsAcBase
      ) {
        add(
          "armorClass",
          Math.max(
            0,
            10 +
              number(base[`abilities.${mechanic.ability}.mod`]) -
              number(character.armorClass?.value ?? 10)
          )
        );
      }
      if (mechanic.type === "jackOfAllTrades") {
        const bonus = Math.floor(number(base.proficiencyBonus) / 2);
        for (const skill of Object.keys(SKILLS))
          if (!character.skills?.[skill]?.prof) add(`skills.${skill}.bonus`, bonus);
        if (!character.initiative?.prof) add("initiative.bonus", bonus);
      }
      if (mechanic.type === "auraOfProtection" && number(base["hp.current"]) > 0 && !unconscious) {
        add("savingThrows.all.bonus", Math.max(1, number(base["abilities.cha.mod"])));
      }
    }
    return rows;
  }

  const val = /** Handle val. */ (result, path, fallback = 0) => result.values[path] ?? fallback;

  const expression = /** Handle expression. */ (result, path, fallback = 0) =>
    result.formulas[path] ?? String(val(result, path, fallback));

  const residualBonus = /** Handle residual bonus. */ (result, path, included) =>
    result.formulas[path] == null
      ? String(val(result, path) - included)
      : `(${expression(result, path)}) - (${included})`;

  return { collectState, expression, mechanicEffects, residualBonus, val };
}

export { createFoundryEffectState };
