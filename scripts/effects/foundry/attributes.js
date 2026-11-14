/**
 * Adapt HP, exhaustion, and activity DC preparation at their system boundaries.
 * Retain source baselines so repeated preparation and effect removal remain reversible.
 */

/** Create foundry effect attributes. */
function createFoundryEffectAttributes({
  ABILITIES,
  NS,
  clone,
  collectState,
  contextFor,
  exhaustionBases,
  hasNative,
  levelsOf,
  number,
  ownerScope,
  portableState,
  report,
  resolve,
  states,
  val,
}) {
  const dcBases = new WeakMap();

  /** Use the system condition as the base and leave saved conditions unchanged when projecting modifiers. */
  function applyPreparedExhaustion(actor) {
    exhaustionBases.set(actor, number(actor.system.attributes.exhaustion));
    const state = hasNative(actor) ? collectState(actor) : portableState(actor);
    const effects = state.effects.filter(
      /** Keep entries that satisfy the condition while apply prepared exhaustion. */ (e) =>
        NS.canonicalTarget(e.stat) === "exhaustion"
    );
    if (!effects.length) return;
    const character = clone(state.character);
    // A real system condition remains the base; do not persist a generated condition
    // or edit the source, so disabling/removing the modifier reverses it naturally.
    character.exhaustion = Math.max(
      number(character.exhaustion),
      number(actor.system.attributes.exhaustion)
    );
    const result = resolve(character, effects);
    for (const error of result.errors) report(actor, error);
    actor.system.attributes.exhaustion = Math.max(0, Math.trunc(val(result, "exhaustion")));
  }

  /** Project ordinary actor HP modifiers after system preparation while leaving native actor totals to their owner. */
  function applyPreparedHP(actor) {
    if (hasNative(actor)) return; // Native actor preparation owns its complete HP total.
    const state = portableState(actor);
    const effects = state.effects.filter(
      /** Keep entries that satisfy the condition while apply prepared hp. */ (e) =>
        NS.canonicalTarget(e.stat) === "hp.max"
    );
    if (!effects.length) return;
    const result = resolve(state.character, effects);
    for (const error of result.errors) report(actor, error);
    const hp = actor.system.attributes.hp;
    hp.max = Math.max(0, Math.floor(val(result, "hp.max")));
    hp.effectiveMax = Math.max(0, hp.max + number(hp.tempmax));
    hp.value = Math.min(
      number(actor._source?.system?.attributes?.hp?.value ?? hp.value),
      hp.effectiveMax
    );
    hp.damage = hp.effectiveMax - hp.value;
    hp.pct = Math.max(0, Math.min(100, hp.effectiveMax ? (hp.value / hp.effectiveMax) * 100 : 0));
  }

  /** Handle install attribute adapters. */
  function installAttributeAdapters() {
    const fields = globalThis.dnd5e?.dataModels?.actor?.AttributesFields;
    if (!fields) return;
    for (const [method, apply] of [
      ["prepareExhaustionLevel", applyPreparedExhaustion],
      ["prepareHitPoints", applyPreparedHP],
    ]) {
      const original = fields[method];
      if (typeof original !== "function" || original._nsEffects) continue;
      const wrapped = /** Handle wrapped. */ function (...args) {
        const result = original.apply(this, args);
        if (this.parent?.system) {
          try {
            apply(this.parent);
          } catch (error) {
            report(this.parent, error);
          }
        }
        return result;
      };
      wrapped._nsEffects = true;
      fields[method] = wrapped;
    }
  }

  /** Retain the original custom DC baseline so repeated preparation does not accumulate the same bonus. */
  function prepareDC(actor, activity) {
    if (!activity?.save?.dc || !hasNative(actor)) return;
    const state = states.get(actor);
    if (!state) return;
    const context = contextFor(activity, "dc");
    const result = resolve(state.character, state.effects, context);
    const feature = NS.features?.definition(activity);
    if (feature) {
      const levels = levelsOf(actor),
        scope = { ...levels, ...ownerScope(activity.item, levels) };
      activity.save.dc.formula = NS.features.formula(feature.dc, scope, result);
      activity.save.dc.value = NS.formulaValue(
        activity.save.dc.formula,
        /** Perform the callback while prepare dc. */ () => undefined
      ).value;
      return;
    }
    const ability = activity.save.dc.calculation;
    const castingAbility = state.character.advanced?.spellcastingAbility || "int";
    const bonus =
      val(result, "SaveDC") -
      (8 + val(result, `abilities.${castingAbility}.mod`) + val(result, "proficiencyBonus"));
    if (
      state.effects.some(
        /** Check whether any entry matches while prepare dc. */
        (e) => e.stat === "SaveDC.totalOverride" && NS.matchesFilters(e.filters, context)
      )
    )
      activity.save.dc.value = val(result, "SaveDC");
    else if (!ability || ability === "custom") {
      const previous = dcBases.get(activity);
      const base =
        previous?.applied === activity.save.dc.value
          ? previous.base
          : number(activity.save.dc.value);
      activity.save.dc.value = base + bonus;
      dcBases.set(activity, { base, applied: activity.save.dc.value });
    } else
      activity.save.dc.value =
        8 +
        val(result, `abilities.${ABILITIES.includes(ability) ? ability : castingAbility}.mod`) +
        val(result, "proficiencyBonus") +
        bonus;
  }

  return { installAttributeAdapters, prepareDC };
}

export { createFoundryEffectAttributes };
