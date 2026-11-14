/**
 * Normalize native stat targets, grant values, and conditional filters.
 * These rules are shared by evaluation and Foundry translation so both accept the same vocabulary.
 */

/** Create effect stat rules. */
function createEffectStatRules({
  ABILITIES,
  ABILITY_NAMES,
  BONUS_STAT,
  CONDITIONS,
  DAMAGE_TYPES,
  FILTERS,
  MODE_STAT,
  ROLL_MODE_STAT,
  TOOL_ABILITY_STAT,
  TRAIT_GRANTS,
}) {
  // ---------------------------------------------------------------- stat targets
  function canonicalTarget(stat) {
    let target = String(stat)
      .replace(/\.totalOverride$/, "")
      .replace(/\.total$/, "");
    if (/^abilities\.[^.]+\.score$/.test(target)) target = target.slice(0, -6);
    return target;
  }

  /** Handle reference target. */
  function referenceTarget(stat) {
    if (/^abilities\.(str|dex|con|int|wis|cha)\.mod$/.test(stat)) return stat;
    return canonicalTarget(stat).replace(/\.(misc|bonus|prof)$/, "");
  }

  /** Handle dice allowed. */
  function diceAllowed(stat) {
    return (
      !stat.endsWith(".totalOverride") &&
      (BONUS_STAT.test(stat) ||
        /^(?:(?:skills|tools)\.[^.]+|savingThrows\.(?:str|dex|con|int|wis|cha|all)|initiative|ToHitStr|ToHitDext|ToHitMagic)\.(?:misc|bonus)$/.test(
          stat
        ))
    );
  }

  const isGrantStat = /** Determine whether grant stat. */ (stat) =>
    Object.hasOwn(TRAIT_GRANTS, stat) || ROLL_MODE_STAT.test(stat) || TOOL_ABILITY_STAT.test(stat);

  const isModeStat = /** Determine whether mode stat. */ (stat) => MODE_STAT.test(stat);

  // The stored form of a grant value, or null when the stat does not accept it.
  /** Validate grant values as sets or roll modes rather than interpreting them as numeric bonuses. */
  function grantValue(stat, value) {
    if (typeof value !== "string" && typeof value !== "number") return null;
    const text = String(value).trim().toLowerCase();
    if (!text) return null;
    if (
      stat === "resistances.damage" ||
      stat === "immunities.damage" ||
      stat === "vulnerabilities.damage"
    )
      return DAMAGE_TYPES.has(text) ? text : null;
    if (stat === "immunities.condition") return CONDITIONS.has(text) ? text : null;
    if (stat === "resistances.damageBypasses")
      return ["mgc", "ada", "sil"].includes(text) ? text : null;
    if (Object.hasOwn(TRAIT_GRANTS, stat))
      return /^[a-z][a-z0-9_-]{0,63}$/.test(text) ? text : null;
    if (ROLL_MODE_STAT.test(stat))
      return ["advantage", "disadvantage"].includes(text) ? text : null;
    if (TOOL_ABILITY_STAT.test(stat)) {
      const ability = ABILITY_NAMES[text] ?? text;
      return ABILITIES.includes(ability) ? ability : null;
    }
    return null;
  }

  // 5e: any advantage and any disadvantage on the same roll cancel to a normal roll.
  function rollMode(values = []) {
    const advantage = values.includes("advantage"),
      disadvantage = values.includes("disadvantage");
    return advantage === disadvantage ? "normal" : advantage ? "advantage" : "disadvantage";
  }

  /** Require every declared condition to match; unknown or missing context must fail closed. */
  function matchesFilters(filters, context = {}) {
    return Object.entries(filters ?? {}).every(
      /** Check whether all entries match while determine whether filters. */ ([key, values]) => {
        const contextKey = FILTERS[key];
        if (!contextKey || !Array.isArray(values) || !values.length || context[contextKey] == null)
          return false;
        const actual = Array.isArray(context[contextKey])
          ? context[contextKey]
          : [context[contextKey]];
        return values.some(
          /** Check whether any entry matches while determine whether filters. */ (value) =>
            actual.some(
              /** Check whether any entry matches while determine whether filters. */ (entry) =>
                String(entry).toLowerCase() === String(value).toLowerCase()
            )
        );
      }
    );
  }

  const hasFilters = /** Determine whether filters. */ (entry) =>
    Object.keys(entry?.filters ?? {}).length > 0;

  return {
    canonicalTarget,
    diceAllowed,
    grantValue,
    hasFilters,
    isGrantStat,
    isModeStat,
    matchesFilters,
    referenceTarget,
    rollMode,
  };
}

export { createEffectStatRules };
