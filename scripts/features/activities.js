/**
 * Build attack, save, healing, damage, and utility activities from native features.
 * Keep per-character preparation separate from the reusable feature definition.
 */

/** Create native feature activities. */
function createNativeFeatureActivities({ NS, clone, formula, number, uses }) {
  // Netherscrolls names a magic weapon's physical damage "Magical Piercing". D&D5e has no such
  // type: it uses the base type, and the item's magical property bypasses resistance.
  const damageType = /** Handle damage type. */ (type) =>
    String(type ?? "")
      .trim()
      .toLowerCase()
      .replace(/^magic(?:al)?\s+/, "");

  const part = /** Handle part. */ (value, type, scope, result) => ({
    number: null,
    denomination: null,
    bonus: "",
    types: [damageType(type)].filter(Boolean),
    custom: { enabled: true, formula: formula(value, scope, result) },
    scaling: { mode: "", number: 1, formula: "" },
  });

  /** Prepare one character-specific activity while retaining the reusable native feature on its flags. */
  function build(feature, original = {}, scope = {}, result) {
    const activity = createBaseActivity(feature, original, scope, result);
    if (feature.featureType === "attack")
      prepareAttackActivity(activity, feature, original, scope, result);
    else if (feature.featureType === "savingThrow")
      prepareSavingThrowActivity(activity, feature, scope, result);
    else prepareUtilityActivity(activity, feature, scope, result);
    activity.flags ??= {};
    activity.flags.netherscrolls ??= {};
    delete activity.flags.netherscrolls.conversionWarning;
    delete activity.flags.netherscrolls.unmappedFeature;
    return activity;
  }

  /** Reset mutually exclusive roll fields before projecting the current native definition. */
  function createBaseActivity(feature, original, scope, result) {
    const name = feature.name ?? feature.title ?? original.name ?? "Feature";
    const activity = clone(original);
    activity.name = name;
    activity.activation ??= {
      type: feature.featureType === "attack" ? "action" : "",
      value: 1,
      condition: "",
    };
    activity.description ??= {
      chatFlavor: feature.description ?? "",
      value: feature.description ?? "",
    };
    activity.effects ??= [];
    activity.range ??= { override: false, units: "", special: "", value: null };
    activity.target ??= { override: false, prompt: true, template: {}, affects: {} };
    activity.duration ??= {
      concentration: false,
      override: false,
      units: "inst",
      value: null,
      special: "",
    };
    activity.uses = uses(feature.usage, scope, result, number(original.uses?.spent));
    activity.consumption = {
      spellSlot: false,
      scaling: { allowed: Boolean(feature.consumption?.variable), max: "" },
      targets:
        feature.usage || feature.consumption
          ? [
              {
                type:
                  feature.consumption?.target === "item" || feature.usage?.pool
                    ? "itemUses"
                    : "activityUses",
                target: "",
                value: String(feature.consumption?.amount ?? 1),
                scaling: {
                  mode: feature.consumption?.variable ? "amount" : "",
                  formula: feature.consumption?.variable ? "1" : "",
                },
              },
            ]
          : [],
    };
    delete activity.roll;
    delete activity.save;
    delete activity.attack;
    delete activity.healing;
    delete activity.damage;
    return activity;
  }

  /** Preserve an explicit attack kind and bind attack and damage formulas to the owner. */
  function prepareAttackActivity(activity, feature, original, scope, result) {
    const name = activity.name;

    activity.type = "attack";
    activity.attack = {
      ability: feature.attackModifier,
      flat: true,
      critical: {},
      bonus: `${formula(`abilities.${feature.attackModifier}.mod`, scope, result)} + (${formula(feature.attackBonus, scope, result)})`,
      type: original.attack?.type ?? {
        value: /ranged|thrown/i.test(name + " " + feature.description) ? "ranged" : "melee",
        classification: /spell attack/i.test(feature.description) ? "spell" : "weapon",
      },
    };
    activity.damage = {
      critical: { bonus: "" },
      includeBase: false,
      parts: (feature.attackDamage ?? []).map(
        /** Transform each entry while prepare attack activity. */ (p) =>
          part(p.formula, p.damageType, scope, result)
      ),
    };
  }

  /** Bind the save DC and damage together so prepared values use the same effect context. */
  function prepareSavingThrowActivity(activity, feature, scope, result) {
    activity.type = "save";
    activity.save = {
      ability: feature.saveAbility ? [feature.saveAbility] : [],
      bonus: "",
      visible: true,
      dc: { calculation: "", formula: formula(feature.dc, scope, result) },
    };
    if (result)
      activity.save.dc.value = NS.formulaValue(
        activity.save.dc.formula,
        /** Perform the callback while prepare saving throw activity. */ () => undefined
      ).value;
    activity.damage = {
      onSave: feature.onSave ?? "half",
      parts: (feature.damage ?? []).map(
        /** Transform each entry while prepare saving throw activity. */ (p) =>
          part(p.formula, p.damageType, scope, result)
      ),
    };
  }

  /** Choose healing, damage, or utility behavior while retaining variable resource scaling. */
  function prepareUtilityActivity(activity, feature, scope, result) {
    const name = activity.name;

    const healing = /: (healing|hit points|temporary hit points)(?: \(|$)/i.exec(name);
    const damage =
      /: (acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder) \(/i.exec(
        name
      );
    if (feature.action?.type === "layOnHands") {
      activity.type = "heal";
      activity.healing = part(1, "healing", scope, result);
      activity.healing.custom.formula = "@scaling";
      activity.activation.type = "action";
    } else if (feature.formula != null && healing) {
      activity.type = "heal";
      activity.healing = part(
        feature.formula,
        healing[1].toLowerCase() === "temporary hit points" ? "temphp" : "healing",
        scope,
        result
      );
    } else if (feature.formula != null && damage) {
      activity.type = "damage";
      activity.damage = {
        critical: { allow: false, bonus: "" },
        parts: [part(feature.formula, damage[1], scope, result)],
      };
    } else {
      activity.type = "utility";
      activity.roll = {
        formula: feature.formula == null ? "" : formula(feature.formula, scope, result),
        name,
        prompt: false,
        visible: true,
      };
    }
  }

  return { build };
}

export { createNativeFeatureActivities };
