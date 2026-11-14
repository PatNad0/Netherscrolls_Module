/**
 * Apply context-specific native modifiers to Foundry roll configuration.
 * Remove only previously injected parts so repeated preparation cannot stack roll bonuses.
 */

/** Create foundry effect rolls. */
function createFoundryEffectRolls({
  MODULE,
  NS,
  SKILLS,
  TOOLS,
  clone,
  collect,
  collectState,
  expression,
  hasNative,
  list,
  mechanicEffects,
  nativeFlags,
  number,
  report,
  residualBonus,
  resolve,
  sourceCharacter,
  states,
  val,
}) {
  const contextChoices = new WeakMap();

  /** Handle context for. */
  function contextFor(subject, rollType, config = {}, roll = {}) {
    config = { ...contextChoices.get(subject), ...config, ...config.nsEffectContext };
    const item =
      subject?.item ?? (subject?.parent?.documentName === "Item" ? subject.parent : null);
    const flags = subject?.flags?.netherscrolls ?? {};
    const itemFlags = item?.flags?.netherscrolls ?? {};
    const attack = subject?.attack?.type;
    const actor = subject?.actor;
    const native = nativeFlags(actor);
    const grants = [
      ...list(native?.featureGrants),
      ...list(native?.featureSelectionGrants),
      ...list(native?.spells),
    ].filter(
      /** Keep entries that satisfy the condition while handle context for. */ (grant) =>
        (grant.id ?? grant.spellId) === itemFlags.id && grant.castAsClass
    );
    const classes = [
      ...new Set(
        grants.map(
          /** Transform each entry while handle context for. */ (grant) => grant.castAsClass
        )
      ),
    ];
    // D&D5e resolves sourceItem (including subclass parentage) through classIdentifier.
    // Only read a stored legacy value, never the deprecated sourceClass getter.
    const systemClass =
      item?.system?.classIdentifier ||
      Object.getOwnPropertyDescriptor(item?.system ?? {}, "sourceClass")?.value ||
      undefined;
    const classReference =
      config.spellClass ??
      flags.spellClass ??
      (itemFlags.spellEntryId
        ? itemFlags.classId
        : (systemClass ??
          itemFlags.castAsClass ??
          item?.flags?.[MODULE]?.castAsClass ??
          (classes.length === 1 ? classes[0] : undefined)));
    const classId =
      typeof classReference === "object"
        ? (classReference?.identifier ??
          classReference?.id ??
          classReference?._id ??
          classReference?.name)
        : classReference;
    const classItem = list(actor?.items).find(
      /** Find the matching entry while handle context for. */
      (entry) =>
        entry.type === "class" &&
        [entry.id, entry.flags?.netherscrolls?.id, entry.system?.identifier, entry.name].includes(
          classId
        )
    );
    const spellClass = classItem?.system?.identifier ?? classItem?.name ?? classId;
    const attackKind =
      config.attackKind ??
      (attack?.value === "melee" || attack?.value === "ranged"
        ? attack.value
        : subject?.actionType?.startsWith("m")
          ? "melee"
          : subject?.actionType?.startsWith("r")
            ? "ranged"
            : undefined);
    return {
      rollType,
      ...(spellClass ? { spellClass: String(spellClass).toLowerCase() } : {}),
      featureTags: config.featureTags ?? flags.featureTags ?? flags.tags ?? itemFlags.featureTags,
      attackKind,
      damageType: config.damageType ?? roll.options?.type ?? roll.options?.damageType,
      weaponId: config.weaponId ?? (item?.type === "weapon" ? itemFlags.id : undefined),
      // "against a spell" is only known when the roller chooses it in the roll dialog.
      ...(config.against ? { against: config.against } : {}),
    };
  }

  /** Handle roll target. */
  function rollTarget(config, type, actor, subject) {
    if (type === "skill")
      return `skills.${Object.keys(SKILLS).find(/** Find the matching entry while handle roll target. */ (k) => SKILLS[k][0] === config.skill) ?? config.skill}`;
    if (type === "tool")
      return `tools.${Object.keys(TOOLS).find(/** Find the matching entry while handle roll target. */ (k) => TOOLS[k][0] === config.tool) ?? config.tool}`;
    if (type === "savingThrow") return `savingThrows.${config.ability}`;
    if (type === "initiative") return "initiative";
    if (type === "abilityCheck") return `abilities.${config.ability ?? "str"}.mod`;
    if (type === "attack")
      return subject?.item?.type === "spell" || subject?.attack?.type?.classification === "spell"
        ? "ToHitMagic"
        : subject?.ability === "dex"
          ? "ToHitDext"
          : "ToHitStr";
    if (type === "damage")
      return `abilities.${subject?.ability ?? actor.system.attributes?.spellcasting ?? "str"}.mod`;
    return null;
  }

  // The damage bonus of an attack: spell attacks use DamageMagic, others their attack ability.
  function damageBonusStat(subject) {
    if (!subject?.attack) return null;
    if (subject.item?.type === "spell" || subject.attack?.type?.classification === "spell")
      return "DamageMagic";
    return subject.ability === "dex"
      ? "DamageDext"
      : subject.ability === "str"
        ? "DamageStr"
        : null;
  }

  // Netherscrolls damage bonuses that have no D&D5e change (STR/DEX damage, and spell damage
  // with conditions D&D5e cannot scope) are added once, to the first damage part of an attack.
  // Foundry-authored rows are skipped: D&D5e already adds their mwak/rwak/msak/rsak bonus.
  /** Add native STR/DEX and unprojectable spell damage only once on the first damage part. */
  function applyDamageBonus(actor, subject, roll, options, character, effects, context) {
    roll.parts = (roll.parts ?? []).filter(
      /** Keep entries that satisfy the condition while apply damage bonus. */ (part) =>
        part !== "@nsDamageBonus"
    );
    if (options?.index != null && options.index !== 0) return;
    const stat = damageBonusStat(subject);
    if (!stat) return;
    const rows = effects.filter(
      /** Keep entries that satisfy the condition while apply damage bonus. */
      (e) =>
        !e._nsForeign &&
        NS.canonicalTarget(e.stat) === `${stat}.bonus` &&
        !NS.toFoundryChanges(e).length
    );
    if (!rows.length) return;
    const result = resolve(character, rows, context);
    for (const error of result.errors) report(actor, error);
    const bonus = expression(result, `${stat}.bonus`);
    if (bonus === "0") return;
    roll.data ??= {};
    roll.data.nsDamageBonus = bonus;
    roll.parts.push("@nsDamageBonus");
  }

  /** Replace this adapter's prior roll parts while preserving unrelated system and module contributions. */
  function modifyRoll(type, config, roll, options = {}) {
    const subject = config.subject,
      actor =
        subject?.actor ??
        (subject?.documentName === "Actor" || subject?.system?.abilities ? subject : null);
    if (!actor) return;
    if (!hasNative(actor)) {
      try {
        if (type === "attack") modifyPortableAttack(actor, subject, config, roll);
        if (type === "damage") {
          const state = portableState(actor);
          applyDamageBonus(
            actor,
            subject,
            roll,
            options,
            state.character,
            state.effects,
            contextFor(subject, "damage", config, roll)
          );
        }
      } catch (error) {
        report(actor, error);
      }
      return;
    }
    // Skill and tool rolls also fire the ability-check hook; they are handled once, by their own hook.
    if (type === "abilityCheck" && (config.skill || config.tool)) return;
    try {
      const state = states.get(actor) ?? collectState(actor);
      const fields = options.formData?.object ?? {};
      const selected = Object.fromEntries(
        Object.values(NS.FILTERS)
          .filter(
            /** Keep entries that satisfy the condition while handle modify roll. */ (k) =>
              k !== "rollType"
          )
          .map(
            /** Transform each entry while handle modify roll. */ (key) => [
              key,
              fields[`nsEffectContext.${key}`] ?? fields.nsEffectContext?.[key],
            ]
          )
          .filter(
            /** Keep entries that satisfy the condition while handle modify roll. */ ([, value]) =>
              value
          )
      );
      if (typeof selected.featureTags === "string")
        selected.featureTags = selected.featureTags
          .split(",")
          .map(/** Transform each entry while handle modify roll. */ (s) => s.trim())
          .filter(Boolean);
      const context = contextFor(
        subject,
        type === "skill" || type === "tool" || type === "abilityCheck"
          ? "check"
          : type === "savingThrow"
            ? "save"
            : type,
        { ...config, ...selected },
        roll
      );
      const target = rollTarget(config, type, actor, subject);
      if (!target) return;
      const character = clone(state.character);
      if (
        ["skill", "tool"].includes(type) &&
        roll.data?.abilityId &&
        character[type === "skill" ? "skills" : "tools"]?.[target.split(".")[1]]
      ) {
        character[type === "skill" ? "skills" : "tools"][target.split(".")[1]].ability =
          roll.data.abilityId;
      }
      // Re-collect at roll time: an instance may have expired since the sheet opened.
      const currentEffects = collect(actor).effects;
      currentEffects.push(...mechanicEffects(actor, character, currentEffects, context));
      const contextual = resolve(character, currentEffects, context);
      for (const error of contextual.errors) report(actor, error);
      if (type === "damage")
        applyDamageBonus(actor, subject, roll, options, character, currentEffects, context);
      const base = expression(state.result, target),
        desired = expression(contextual, target);
      // Foundry selects actorBonus by melee/ranged; NS selects by attack ability.
      // Even an unconditional effect must replace that contribution on every attack.
      if (base === desired && type !== "attack") return;
      if (type === "attack" && subject?.attack?.flat) return;
      roll.parts ??= [];
      roll.data ??= {};
      const bonusKey =
        type === "skill"
          ? `${config.skill}Bonus`
          : type === "tool"
            ? `${config.tool}Bonus`
            : type === "savingThrow"
              ? `${config.ability}SaveBonus`
              : type === "attack"
                ? "actorBonus"
                : type === "initiative"
                  ? "initiativeBonus"
                  : null;
      if (bonusKey) {
        // Replace the native contribution, not desired-minus-original dice: those
        // would roll the same die twice and fail to cancel one another.
        const key = "nsEffectTotal";
        const replaceParts = new Set([`@${bonusKey}`, "@mod", "@prof", `@${key}`]);
        roll.parts = roll.parts.filter(
          /** Keep entries that satisfy the condition while handle modify roll. */ (part) =>
            !replaceParts.has(part)
        );
        let adjusted = desired;
        if (
          type === "attack" &&
          !currentEffects.some(
            /** Check whether any entry matches while handle modify roll. */
            (e) => e.stat === `${target}.totalOverride` && NS.matchesFilters(e.filters, context)
          )
        ) {
          const ability =
            target === "ToHitMagic"
              ? character.advanced?.spellcastingAbility || "int"
              : target === "ToHitDext"
                ? "dex"
                : "str";
          // Keep the weapon's own proficiency choice and alternate attack ability.
          const difference =
            number(roll.data.mod) +
            number(roll.data.prof) -
            val(state.result, `abilities.${ability}.mod`) -
            val(state.result, "proficiencyBonus");
          if (difference) adjusted = `(${desired}) + (${difference})`;
        }
        roll.data[key] = adjusted;
        roll.parts.push(`@${key}`);
      } else {
        // Only the damage part that actually uses the ability modifier changes.
        if (
          type === "damage" &&
          !roll.parts.some(
            /** Check whether any entry matches while handle modify roll. */ (part) =>
              /@mod\b/.test(part)
          )
        )
          return;
        const delta = val(contextual, target) - val(state.result, target);
        if (delta) {
          roll.parts = roll.parts.filter(
            /** Keep entries that satisfy the condition while handle modify roll. */ (part) =>
              part !== "@nsEffectDelta"
          );
          roll.data.nsEffectDelta = delta;
          roll.parts.push("@nsEffectDelta");
        }
      }
    } catch (error) {
      report(actor, error);
    }
  }

  // Read an ordinary actor's already prepared values. Only our native definitions
  // are evaluated here; Foundry has already applied its own effects.
  function portableState(actor) {
    const collected = collect(actor);
    const character = sourceCharacter(
      {
        system: actor.system,
        items: actor.items,
        _source: { system: actor.system },
        flags: { [MODULE]: { nativeCharacter: {} } },
      },
      collected
    );
    for (const stat of ["ToHitStr", "ToHitDext", "ToHitMagic"])
      character[stat] = { misc: 0, bonus: 0 };
    character.hp = {
      current: actor.system.attributes?.hp?.value ?? 0,
      max: actor.system.attributes?.hp?.max ?? 0,
      temp: actor.system.attributes?.hp?.temp ?? 0,
    };
    character.exhaustion = actor.system.attributes?.exhaustion ?? 0;
    return {
      character,
      effects: collected.effects.filter(
        /** Keep entries that satisfy the condition while handle portable state. */ (e) =>
          !e._nsForeign
      ),
    };
  }

  /** Handle modify portable attack. */
  function modifyPortableAttack(actor, subject, config, roll) {
    if (subject?.attack?.flat) return;
    const target = rollTarget(config, "attack", actor, subject);
    if (!["ToHitStr", "ToHitDext"].includes(target)) return;
    const state = portableState(actor),
      context = contextFor(subject, "attack", config, roll);
    const effects = state.effects.filter(
      /** Keep entries that satisfy the condition while handle modify portable attack. */
      (e) => NS.canonicalTarget(e.stat).replace(/\.(misc|bonus)$/, "") === target
    );
    if (
      !effects.some(
        /** Check whether any entry matches while handle modify portable attack. */ (e) =>
          NS.matchesFilters(e.filters, context)
      )
    )
      return;
    const result = resolve(state.character, effects, context);
    for (const error of result.errors) report(actor, error);
    const ability = target === "ToHitDext" ? "dex" : "str";
    const override = effects.some(
      /** Check whether any entry matches while handle modify portable attack. */
      (e) => e.stat === `${target}.totalOverride` && NS.matchesFilters(e.filters, context)
    );
    roll.parts ??= [];
    roll.data ??= {};
    roll.parts = roll.parts.filter(
      /** Keep entries that satisfy the condition while handle modify portable attack. */ (p) =>
        p !== "@nsPhysicalBonus"
    );
    if (override) {
      roll.parts = roll.parts.filter(
        /** Keep entries that satisfy the condition while handle modify portable attack. */ (p) =>
          !["@mod", "@prof", "@actorBonus"].includes(p)
      );
      roll.data.nsPhysicalBonus = expression(result, target);
    } else
      roll.data.nsPhysicalBonus = residualBonus(
        result,
        target,
        val(result, `abilities.${ability}.mod`) + val(result, "proficiencyBonus")
      );
    roll.parts.push("@nsPhysicalBonus");
  }

  return { contextChoices, contextFor, modifyRoll, portableState };
}

export { createFoundryEffectRolls };
