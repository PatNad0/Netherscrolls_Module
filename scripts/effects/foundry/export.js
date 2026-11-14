/**
 * Export portable base values, play state, and passive effect definitions.
 * Active Foundry effects affect current totals but never become permanent service-side copies.
 */

/** Create foundry effect export. */
function createFoundryEffectExport({
  FOREIGN_NOTE,
  MODULE,
  NS,
  clone,
  collect,
  collectState,
  hasNative,
  nativeFlags,
  number,
  resolve,
  sourceCharacter,
}) {
  /** Export state. */
  function exportState(actor) {
    if (!nativeFlags(actor) || typeof actor.toObject !== "function") return {};
    const raw = actor.toObject();
    const character = sourceCharacter({
      flags: raw.flags,
      system: raw.system,
      _source: raw,
      items: raw.items ?? [],
    });
    return Object.fromEntries(
      [
        "abilities",
        "savingThrows",
        "skills",
        "tools",
        "proficiencyBonus",
        "armorClass",
        "initiative",
        "ToHitStr",
        "ToHitDext",
        "ToHitMagic",
        "SaveDC",
        "xp",
        "exhaustion",
        "hp",
        "currency",
        "hitDice",
        "spellSlots",
        "Ressources",
      ]
        .filter(
          /** Keep entries that satisfy the condition while export state. */ (key) =>
            character[key] !== undefined
        )
        .map(/** Transform each entry while export state. */ (key) => [key, clone(character[key])])
    );
  }

  // The API reads advanced.traits/movement/senses from the prepared Actor, where D&D5e has
  // already applied grant and mode-stat effects. Netherscrolls adds those effects to the
  // stored base itself, so a trait, speed or sense that an effect changes is exported from
  // the Actor's own data instead: the effect is never counted twice nor kept after removal.
  /** Recover unmodified base fields so projected grants and movement effects do not become permanent on export. */
  function exportBaseValues(actor) {
    if (!hasNative(actor)) return {};
    const collected = collect(actor);
    const character = sourceCharacter(actor, collected);
    const stats = new Set(
      collected.effects.map(
        /** Transform each entry while export base values. */ (entry) =>
          NS.canonicalTarget(entry.stat)
      )
    );
    const traits = actor._source?.system?.traits ?? {};
    const result = { traits: {}, movement: {}, senses: {} };
    for (const [stat, path] of Object.entries(NS.TRAIT_GRANTS)) {
      if (!stats.has(stat)) continue;
      const value = NS.get(traits, path);
      result.traits[path] =
        value instanceof Set ? [...value] : Array.isArray(value) ? [...value] : [];
    }
    for (const type of NS.MOVEMENT)
      if (stats.has(`speed.${type}`))
        result.movement[type] = number(character.advanced?.movement?.[type]);
    for (const sense of NS.SENSES)
      if (stats.has(`senses.${sense}`))
        result.senses[sense] = number(character.advanced?.senses?.[sense]);
    return result;
  }

  const signed = /** Handle signed. */ (value) => `${value >= 0 ? "+" : ""}${value}`;

  // Passive Foundry effects as Netherscrolls character effects. Temporary and
  // activity-applied effects are Foundry-side and are not exported.
  /** Export passive native definitions and translatable foreign passives while keeping temporary effects in Foundry. */
  function exportEffects(actor) {
    if (!hasNative(actor)) return [];
    const state = collectState(actor);
    const rows = [];
    for (const entry of state.collected.foreign) {
      if (entry._nsKind !== "passive") continue;
      const context = Object.fromEntries(
        Object.entries(entry.filters ?? {}).map(
          /** Transform each entry while export effects. */ ([key, values]) => [
            NS.FILTERS[key],
            values[0],
          ]
        )
      );
      const evaluated = Object.keys(context).length
        ? resolve(state.character, state.effects, context)
        : state.result;
      const applied = evaluated.applied?.[entry._nsKey];
      if (!applied) continue;
      const note = `${FOREIGN_NOTE} ${entry._nsItemName ? `Item: ${entry._nsItemName}` : "Actor effect"}`;
      if (entry.grant != null) {
        // Grant stats take `grant` and never `bonus`.
        rows.push({
          active: true,
          stat: entry.stat,
          grant: entry.grant,
          source: entry.source,
          ...(entry.filters ? { filters: clone(entry.filters) } : {}),
          note,
        });
        continue;
      }
      const override = entry.stat.endsWith(".totalOverride");
      // Speeds, senses and maximums keep their mode; an add is signed, other modes are plain.
      const modeStat = NS.isModeStat(NS.canonicalTarget(entry.stat));
      const plain = override || (modeStat && entry.mode && entry.mode !== "add");
      let stat = entry.stat,
        bonus;
      if (entry.mode && !modeStat) {
        // Other stats have no upgrade/downgrade/multiply: export the value they produce.
        if (!applied.changed) continue;
        stat = `${NS.canonicalTarget(entry.stat)}.totalOverride`;
        bonus = String(evaluated.values[applied.target]);
      } else if (NS.hasFeatureReference(entry.bonus)) {
        if (NS.parseFormula(entry.bonus).dice) continue;
        bonus = plain ? String(applied.value) : signed(applied.value);
      } else {
        const text = String(entry.bonus).trim();
        bonus = /^[+-]?\d+(?:\.\d+)?$/.test(text)
          ? plain
            ? String(Number(text))
            : signed(Number(text))
          : text;
      }
      rows.push({
        active: true,
        stat,
        bonus,
        source: entry.source,
        ...(modeStat && entry.mode && entry.mode !== "add" ? { mode: entry.mode } : {}),
        ...(entry.upToMax ? { upToMax: true } : {}),
        ...(entry.filters ? { filters: clone(entry.filters) } : {}),
        note,
      });
    }
    return rows;
  }

  // True when a Netherscrolls character effect is the exported copy of a Foundry
  // effect still present on the actor (it must not be imported or exported twice).
  function isForeignMirror(actor, effectData) {
    const native =
      effectData?.flags?.netherscrolls?.nativeEffect ??
      effectData?.flags?.[MODULE]?.nativeActiveBonus ??
      effectData;
    if (!String(native?.note ?? "").startsWith(FOREIGN_NOTE) || !native?.stat) return false;
    return collect(actor).foreign.some(
      /** Check whether any entry matches while determine whether foreign mirror. */
      (row) =>
        row._nsKind === "passive" &&
        row.source === native.source &&
        NS.canonicalTarget(row.stat) === NS.canonicalTarget(native.stat)
    );
  }

  return { exportBaseValues, exportEffects, exportState, isForeignMirror };
}

export { createFoundryEffectExport };
