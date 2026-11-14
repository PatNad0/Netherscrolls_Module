/**
 * Collect applicable native and Foundry effects with explicit ownership and lifetime.
 * Read foreign effects first so mirrored native exports can be recognized and counted once.
 */

/** Create foundry effect collection. */
function createFoundryEffectCollection({
  FOREIGN_NOTE,
  MODULE,
  NS,
  changesOf,
  clone,
  effectId,
  list,
  nativeFlags,
  number,
}) {
  /** Handle levels of. */
  function levelsOf(actor) {
    const classes = {};
    let total = 0,
      attunement = 0;
    for (const item of list(actor?.items)) {
      if (item.type === "class") {
        const levels = number(item.system?.levels);
        total += levels;
        for (const key of new Set(
          [NS.slug(item.system?.identifier), NS.slug(item.name)].filter(Boolean)
        ))
          classes[key] = (classes[key] ?? 0) + levels;
      }
      if (item.system?.attuned === true) attunement++;
    }
    return { total, classes, attunement };
  }

  /** Handle owner scope. */
  function ownerScope(item, levels) {
    if (!item) return {};
    const flags = item.flags?.[MODULE] ?? {};
    const key =
      item.type === "class"
        ? NS.slug(item.system?.identifier ?? item.name)
        : item.type === "subclass"
          ? NS.slug(item.system?.classIdentifier)
          : NS.slug(flags.parentClassIdentifier ?? flags.parentClass);
    return {
      classLevel: key && levels.classes[key] != null ? levels.classes[key] : levels.total,
      classIdentifier: key || undefined,
    };
  }

  /** Determine whether temporary. */
  function isTemporary(effect) {
    if (typeof effect?.isTemporary === "boolean") return effect.isTemporary;
    const duration = effect?.duration ?? {};
    return (
      number(duration.seconds) > 0 ||
      number(duration.rounds) > 0 ||
      number(duration.turns) > 0 ||
      list(effect?.statuses).length > 0
    );
  }

  const isOff = /** Determine whether off. */ (effect) =>
    effect?.disabled === true || effect?.isSuppressed === true || effect?.active === false;

  // Every effect that currently applies to the actor, as NS effect entries.
  /** Read foreign definitions before native mirrors and deduplicate origins before resolving any totals. */
  function collect(actor, now = Date.now()) {
    const levels = levelsOf(actor);
    const effects = [],
      foreign = [],
      keys = new Set(),
      passiveOrigins = new Set(),
      problems = [];
    let acFromFoundry = false;
    const ownUuid = actor?.uuid ?? (actor?.id ? `Actor.${actor.id}` : null);

    const readForeign = /** Read foreign. */ (effect, item) => {
      if (isOff(effect)) return;
      const appliedByOther =
        !item &&
        effect.origin &&
        ownUuid &&
        /^Actor\./.test(String(effect.origin)) &&
        !String(effect.origin).startsWith(ownUuid);
      const kind = isTemporary(effect) || appliedByOther ? "active" : "passive";
      const groups = new Set();
      changesOf(effect).forEach(
        /** Process each entry while collect. */ (change, index) => {
          const translated = NS.fromFoundryChange(change);
          if (!translated) return;
          if (translated.acCalc) {
            acFromFoundry = true;
            return;
          }
          if (translated.warning)
            problems.push(`${effect.name ?? "Effect"}: ${translated.warning}`);
          translated.entries.forEach(
            /** Process each entry while collect. */ (entry, part) => {
              if (entry._nsGroup) {
                const group = `${entry._nsGroup}|${entry.stat}|${entry.bonus}|${entry.mode ?? ""}`;
                if (groups.has(group)) return;
                groups.add(group);
              }
              const key = `foundry:${item?.id ?? "actor"}:${effectId(effect)}:${index}:${part}`;
              const row = {
                ...entry,
                active: true,
                source: effect.name ?? "Foundry effect",
                _nsKey: key,
                _nsKind: kind,
                _nsForeign: true,
                _nsScope: ownerScope(item, levels),
                _nsEffectId: effectId(effect),
                _nsItemName: item?.name ?? null,
              };
              delete row._nsGroup;
              foreign.push(row);
              effects.push(row);
            }
          );
        }
      );
    };
    const readNative = /** Read native. */ (effect, item) => {
      const flags = effect.flags?.netherscrolls;
      const native = flags?.nativeEffect ?? effect.flags?.[MODULE]?.nativeActiveBonus;
      if (
        !native?.stat ||
        isOff(effect) ||
        native.active === false ||
        !NS.eligible(flags?.effectApplication, item)
      )
        return;
      if (
        item &&
        effect.flags?.[MODULE]?.proficiencyFeature &&
        /^(skills|savingThrows|tools)\.[A-Za-z0-9]+\.prof(?:\.totalOverride)?$/.test(native.stat)
      ) {
        const character = nativeFlags(actor);
        const reconciled =
          character?.featureSelectionState ||
          list(character?.featureSelectionGrants).some(
            /** Check whether any entry matches while collect. */
            (grant) => grant.featureId === flags.featureId && grant.type === "proficiency"
          );
        if (reconciled) return;
      }
      if (native.expiresAt && Date.parse(native.expiresAt) <= now) return;
      // Item definitions never expire while eligible. Duration starts on activation.
      if (
        !item &&
        effect.duration?.remaining != null &&
        effect.duration.remaining <= 0 &&
        effect.duration.type !== "none"
      )
        return;
      const runtime = effect.flags?.[MODULE] ?? {};
      const lifecycle = runtime.lifecycle;
      if (
        !item &&
        lifecycle &&
        effect.duration?.seconds != null &&
        number(globalThis.game?.time?.worldTime) >= lifecycle.startedAt + effect.duration.seconds
      )
        return;
      // A Netherscrolls copy of a Foundry effect that is still on the actor counts once.
      if (
        !item &&
        String(native.note ?? "").startsWith(FOREIGN_NOTE) &&
        foreign.some(
          /** Check whether any entry matches while collect. */
          (row) =>
            row._nsKind === "passive" &&
            row.source === native.source &&
            NS.canonicalTarget(row.stat) === NS.canonicalTarget(native.stat)
        )
      )
        return;
      const origin = native.origin;
      const originKey = origin
        ? [
            origin.sourceId ?? origin.itemId,
            origin.featureId,
            origin.effectId,
            origin.characterId,
          ].join(":")
        : null;
      if (!item && originKey && passiveOrigins.has(originKey)) return;
      if (item)
        passiveOrigins.add(
          [
            flags.sourceId,
            flags.featureId,
            native._id,
            actor.flags?.netherscrolls?.characterId ?? nativeFlags(actor)?._id,
          ].join(":")
        );
      const key =
        originKey ??
        `${item?.id ?? lifecycle?.sourceActorId ?? actor.id}:${runtime.effectKey ?? effectId(effect)}`;
      if (keys.has(key)) return;
      keys.add(key);
      const kind = item
        ? "passive"
        : runtime.appliedActivation || lifecycle || isTemporary(effect)
          ? "active"
          : "passive";
      effects.push({
        ...clone(native),
        _nsKey: key,
        _nsKind: kind,
        _nsScope: ownerScope(item, levels),
      });
    };
    const isNative = /** Determine whether native. */ (effect) =>
      effect?.flags?.[MODULE]?.nsRuntimeEffect;
    for (const item of list(actor?.items))
      for (const effect of list(item.effects)) {
        if (effect.transfer !== false && !isNative(effect)) readForeign(effect, item);
      }
    for (const effect of list(actor?.effects)) if (!isNative(effect)) readForeign(effect, null);
    for (const item of list(actor?.items))
      for (const effect of list(item.effects)) {
        if (effect.transfer !== false && isNative(effect)) readNative(effect, item);
      }
    // A repeated activation refreshes a source; prefer the most recent instance.
    for (const effect of [...list(actor?.effects)].reverse())
      if (isNative(effect)) readNative(effect, null);
    return { effects, foreign, acFromFoundry, problems, levels };
  }

  return { collect, levelsOf, ownerScope };
}

export { createFoundryEffectCollection };
