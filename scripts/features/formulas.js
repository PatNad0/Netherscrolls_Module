/**
 * Bind feature formulas and resource maxima to the owning character and class levels.
 * Foundry remains responsible for consumption and recovery after the prepared values are supplied.
 */

/** Create native feature formulas. */
function createNativeFeatureFormulas() {
  const NS = globalThis.NetherscrollsEffects;

  const { MODULE, clone, list, number } = NS;

  const definition = /** Handle definition. */ (activity) =>
    activity.flags?.[MODULE]?.nativeFeature;

  /** Select the most recent level-table value available to this feature's owning class. */
  function pick(value, scope) {
    if (!value || typeof value !== "object") return value ?? 0;
    if (!Array.isArray(value.byLevel) || !value.byLevel.length)
      throw new Error("Invalid feature level table");
    const rows = [...value.byLevel].sort(
      /** Order the entries while handle pick. */ (a, b) => a.level - b.level
    );
    return (
      rows
        .filter(
          /** Keep entries that satisfy the condition while handle pick. */ (row) =>
            row.level <= (scope.classLevel ?? scope.total ?? 1)
        )
        .at(-1) ?? rows[0]
    ).value;
  }

  /** Bind native references to the current feature scope and reject unsupported mappings. */
  function formula(value, scope = {}, result) {
    value = pick(value, scope);
    if (result)
      return NS.formulaValue(
        value,
        /** Perform the callback while handle formula. */ (reference) => {
          const level = NS.featureReference(reference, scope);
          if (level != null) return level;
          return result.values[NS.referenceTarget(reference)];
        }
      ).formula;
    return NS.serialize(NS.parseFormula(value).ast, {
      ref: /** Handle ref. */ (reference) => {
        const level = NS.featureReference(reference, scope);
        if (level != null) return level;
        if (/^abilities\.(str|dex|con|int|wis|cha)\.(mod|total)$/.test(reference))
          return `@${reference.replace(/\.total$/, ".value")}`;
        if (reference === "proficiencyBonus.total") return "@attributes.prof";
        if (reference === "SaveDC.total") return "@attributes.spelldc";
        if (reference === "hp.max.total") return "@attributes.hp.max";
        // Validate unsupported references instead of silently substituting zero.
        throw new Error(`Unmapped feature reference ${reference}`);
      },
      dice: /** Handle dice. */ (count, sides) => `(${count})d(${sides})`,
    });
  }

  /** Resolve a deterministic resource maximum; dice cannot define a stable pool capacity. */
  function maximum(usage, scope, result) {
    const scaling = usage.scaling;
    let value = usage.maxCharge;
    if (scaling?.type === "classLevel")
      value = (scope.classLevel ?? scope.total ?? 1) * number(scaling.multiplier ?? 1);
    else if (scaling?.type === "proficiencyBonus") value = "proficiencyBonus.total";
    else if (scaling?.type === "abilityModifier")
      value = `max(${number(scaling.minimum)}, abilities.${scaling.ability}.mod + ${number(scaling.offset)})`;
    else if (scaling?.type === "table")
      value =
        [...scaling.levels]
          .sort(/** Order the entries while handle maximum. */ (a, b) => a.level - b.level)
          .filter(
            /** Keep entries that satisfy the condition while handle maximum. */ (row) =>
              row.level <= (scope.classLevel ?? 0)
          )
          .at(-1)?.value ?? usage.maxCharge;
    const bound = formula(value, scope, result);
    if (!result) return `max(0, floor(${bound}))`;
    const evaluated = NS.formulaValue(
      bound,
      /** Perform the callback while handle maximum. */ () => undefined
    );
    if (evaluated.dice) throw new Error("Feature maximum cannot contain dice");
    return Math.max(scaling?.minimum ?? 0, Math.floor(evaluated.value));
  }

  /** Describe Foundry consumption and recovery without taking over their lifecycle. */
  function uses(usage, scope, result, spent = 0) {
    if (!usage) return { spent, max: "", recovery: [] };
    const max = maximum(usage, scope, result);
    const period = { shortRest: "sr", longRest: "lr", dawn: "dawn", dusk: "dusk" }[
      usage.shortRestFromLevel && scope.classLevel >= usage.shortRestFromLevel
        ? "shortRest"
        : usage.rechargeType
    ];
    return {
      spent,
      max,
      ...(result ? { value: Math.max(0, max - spent) } : {}),
      recovery: period
        ? [
            {
              period,
              type: usage.rechargeAll ? "recoverAll" : "formula",
              formula: usage.rechargeAll ? "" : formula(usage.rechargeAmount ?? 1, scope, result),
            },
          ]
        : [],
    };
  }

  return { MODULE, NS, clone, definition, formula, list, maximum, number, pick, uses };
}

export { createNativeFeatureFormulas };
