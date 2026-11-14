/**
 * Create stable effect documents and attach authoritative native definitions to items.
 * Reconcile generated effects with existing changes so imports do not count the same modifier twice.
 */

/** Create effect documents. */
function createEffectDocuments({
  ABILITIES,
  MODULE,
  canonicalTarget,
  clone,
  foundryTargets,
  fromFoundryChange,
  grantValue,
  hasFilters,
  isGrantStat,
  list,
  number,
  toFoundryChanges,
}) {
  // ---------------------------------------------------------------- library item translation
  function stableId(value) {
    let a = 2166136261,
      b = 5381;
    for (const char of String(value)) {
      a = Math.imul(a ^ char.charCodeAt(0), 16777619);
      b = Math.imul(b, 33) ^ char.charCodeAt(0);
    }
    return (a >>> 0).toString(16).padStart(8, "0") + (b >>> 0).toString(16).padStart(8, "0");
  }

  /** Handle duration data. */
  function durationData(duration) {
    const unit = duration?.unit;
    if (unit === "round")
      return { rounds: number(duration.value), seconds: number(duration.value) * 6 };
    if (["minute", "hour", "day"].includes(unit))
      return { seconds: number(duration.value) * { minute: 60, hour: 3600, day: 86400 }[unit] };
    return {};
  }

  /** Keep stable provenance on generated effects so reimports and activations can recognize their source. */
  function createEffect(
    entry,
    {
      sourceId = "",
      featureId = "",
      application = { mode: "passive" },
      projection,
      name,
      actor = false,
      scope = {},
    } = {}
  ) {
    const identity = `${sourceId}:${featureId}:${entry._id ?? entry.id ?? `${entry.stat}:${entry.source ?? ""}:${entry.grant ?? entry.bonus}`}`;
    const data = clone(projection ?? {});
    data._id ??= stableId(identity);
    data.name = name ?? entry.source ?? `NS: ${entry.stat}`;
    data.disabled = entry.active === false;
    data.transfer = !actor && application.mode !== "activated";
    // Unconditional effects carry real D&D5e changes so Foundry applies them to any actor.
    // On a Netherscrolls actor the runtime recalculates the same fields from the native
    // definition below, so the bonus is never applied twice.
    data.changes = toFoundryChanges(entry, scope);
    if (Array.isArray(data.system?.changes)) data.system.changes = clone(data.changes);
    data.duration = durationData(entry.duration ?? application.duration);
    data.flags ??= {};
    data.flags.netherscrolls = {
      ...data.flags.netherscrolls,
      generatedFeatureEffect: !actor,
      sourceId,
      featureId,
      nativeEffect: clone(entry),
      effectApplication: clone(application),
    };
    data.flags[MODULE] = {
      ...data.flags[MODULE],
      nsRuntimeEffect: true,
      effectKey: `ns-effect:${identity}`,
      sourceStat: entry.stat,
      nativeActiveBonus: clone(entry),
      portableActiveEffect: actor,
    };
    const escape = /** Escape. */ (value) =>
      String(value ?? "").replace(
        /[&<>"']/g,
        /** Perform the callback while create effect. */
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
      );
    const portableRuntime =
      /^(?:hp\.max|exhaustion|ToHitStr|ToHitDext|DamageStr|DamageDext)(?:\.|$)/.test(entry.stat);
    const grant = isGrantStat(entry.stat);
    const unmapped =
      !data.changes.length && !hasFilters(entry)
        ? portableRuntime
          ? "<p><em>Applied by the Netherscrolls module during actor preparation or attack and damage rolls, including NPC targets.</em></p>"
          : "<p><em>Calculated by Netherscrolls on Netherscrolls characters only.</em></p>"
        : "";
    // Conditional grants (advantage against spells, ...) have no D&D5e field to scope them.
    const conditional = !hasFilters(entry)
      ? ""
      : grant
        ? "<p><em>Conditional: Foundry does not apply it automatically. Apply it by hand when the condition is met.</em></p>"
        : "<p><em>Conditional: applied by Netherscrolls at roll time.</em></p>";
    const shown = grant
      ? entry.grant
      : `${entry.mode && entry.mode !== "add" ? `${entry.mode} ` : ""}${entry.bonus}${entry.upToMax ? " (up to the maximum)" : ""}`;
    data.description = `<p>${escape(entry.stat)}: ${escape(shown)}</p>${entry.note ? `<p>${escape(entry.note)}</p>` : ""}${conditional}${unmapped}`;
    return data;
  }

  /** Reuse authoritative native definitions and reconcile their generated projections with existing item data. */
  function translateItem(document, source, sourceId) {
    const original = list(document.effects);
    const activities = Object.values(document.system?.activities ?? {});
    const linked = new Set(
      activities.flatMap(
        /** Perform the callback while translate item. */ (a) =>
          list(a.effects).map(
            /** Transform each entry while translate item. */ (e) => e._id ?? e.id ?? e
          )
      )
    );
    const isNative = /** Determine whether native. */ (effect) =>
      effect.flags?.netherscrolls?.nativeEffect || effect.flags?.[MODULE]?.nsRuntimeEffect;
    const features = ["class", "subclass"].includes(document.type) ? [] : list(source.features);
    const owners = [source, ...features];
    const projections = [
      ...original,
      ...list(source.foundryEffects),
      ...features.flatMap(
        /** Perform the callback while translate item. */ (f) => list(f.foundryEffects)
      ),
    ];
    const ownerEntries = /** Handle owner entries. */ (owner) =>
      list(owner.effects).length || Array.isArray(owner.effects)
        ? list(owner.effects)
        : list(owner.activeBonuses ?? owner.activeEffects);
    const hasNativeDefinitions =
      owners.some(
        /** Check whether any entry matches while translate item. */ (owner) =>
          ownerEntries(owner).some(
            /** Check whether any entry matches while translate item. */ (entry) => entry?.stat
          )
      ) ||
      projections.some(
        /** Check whether any entry matches while translate item. */ (projection) =>
          projection.flags?.netherscrolls?.nativeEffect
      );
    // Replace only changes owned by a native definition. A grant owns only its own value: a
    // native acid resistance does not replace the item's fire resistance, status or bonus.
    const ownershipTarget = /** Handle ownership target. */ (stat) =>
      canonicalTarget(stat).replace(/\.(misc|bonus)$/, "");
    const ownershipKeys = /** Handle ownership keys. */ (e) => {
      if (isGrantStat(e.stat)) {
        const value = grantValue(e.stat, e.grant);
        const stats = /^savingThrows\.all\.rollMode$/.test(e.stat)
          ? ABILITIES.map(
              /** Transform each entry while translate item. */ (a) => `savingThrows.${a}.rollMode`
            )
          : [e.stat];
        return value == null
          ? []
          : stats.map(
              /** Transform each entry while translate item. */ (stat) => `${stat}=${value}`
            );
      }
      const target = ownershipTarget(e.stat);
      return target === "savingThrows.all"
        ? ABILITIES.map(
            /** Transform each entry while translate item. */ (a) => `savingThrows.${a}`
          )
        : [target];
    };
    const ownedTargets = new Set(
      owners
        .flatMap(/** Perform the callback while translate item. */ (owner) => ownerEntries(owner))
        .filter(/** Keep entries that satisfy the condition while translate item. */ (e) => e?.stat)
        .concat(
          projections
            .map(
              /** Transform each entry while translate item. */ (e) =>
                e.flags?.netherscrolls?.nativeEffect
            )
            .filter(Boolean)
        )
        .flatMap(ownershipKeys)
    );
    const mirrored = /** Handle mirrored. */ (change) => {
      const targets =
        change.key === "system.bonuses.abilities.save"
          ? ABILITIES.map(
              /** Transform each entry while translate item. */ (a) => ({
                stat: `savingThrows.${a}`,
              })
            )
          : foundryTargets(change.key);
      if (!targets?.length) return false;
      if (targets[0].grant) {
        const entries = fromFoundryChange(change)?.entries ?? [];
        return (
          entries.length > 0 &&
          entries.every(
            /** Check whether all entries match while translate item. */ (e) =>
              ownershipKeys(e).every(
                /** Check whether all entries match while translate item. */ (key) =>
                  ownedTargets.has(key)
              )
          )
        );
      }
      // A melee/ranged weapon change is the STR and the DEX bonus at once; a native STR or
      // DEX definition of the same bonus replaces it (Bracers of Archery: DamageDext).
      const owned = /** Handle owned. */ (t) => ownedTargets.has(ownershipTarget(t.stat));
      return targets[0].split ? targets.some(owned) : targets.every(owned);
    };
    const retained = original
      .filter(
        /** Keep entries that satisfy the condition while translate item. */ (e) => !isNative(e)
      )
      .flatMap(
        /** Perform the callback while translate item. */ (e) => {
          const result = clone(e);
          result.transfer =
            e.transfer === false || linked.has(e._id) ? false : (e.transfer ?? true);
          if (!result.transfer) return [result];
          let kept = 0;
          for (const container of [result, result.system].filter(Boolean)) {
            if (!Array.isArray(container.changes)) continue;
            if (hasNativeDefinitions)
              container.changes = container.changes.filter(
                /** Keep entries that satisfy the condition while translate item. */ (change) =>
                  !mirrored(change)
              );
            kept += container.changes.length;
          }
          // A passive effect with no changes and no status does nothing. It is either an imported
          // marker or one whose every change is now calculated natively, and would only show as an
          // empty duplicate on the sheet.
          if (!kept && !list(result.statuses).length) return [];
          return [result];
        }
      );
    const translated = new Map();
    for (const owner of owners) {
      for (const entry of ownerEntries(owner)) {
        if (!entry?.stat) continue;
        const projection = projections.find(
          /** Find the matching entry while translate item. */
          (e) =>
            e.flags?.netherscrolls?.nativeEffect?._id &&
            e.flags.netherscrolls.nativeEffect._id === entry._id
        );
        const flags = projection?.flags?.netherscrolls;
        const featureId =
          owner === source
            ? (flags?.featureId ?? "")
            : (owner.id ?? owner._id ?? owner.name ?? owner.title ?? "");
        const application = owner.effectApplication ??
          flags?.effectApplication ?? { mode: "passive", requirement: "selected" };
        const effect = createEffect(entry, {
          sourceId: flags?.sourceId ?? sourceId,
          featureId,
          application,
          projection,
          name: owner.name ?? owner.title,
        });
        if (owner.subtype === "profFeature") effect.flags[MODULE].proficiencyFeature = true;
        translated.set(effect.flags[MODULE].effectKey, effect);
        if (application.mode === "activated") {
          let activity = activities.find(
            /** Find the matching entry while translate item. */ (a) => {
              const f = a.flags?.netherscrolls;
              return (
                f?.featureEffects?.id === featureId ||
                f?.featureId === featureId ||
                f?.nativeFeatureId === featureId
              );
            }
          );
          if (!activity) {
            document.system ??= {};
            document.system.activities ??= {};
            const id = stableId(`activity:${sourceId}:${featureId}`);
            activity = document.system.activities[id] ??= {
              _id: id,
              type: "utility",
              name: owner.name ?? owner.title ?? "NS effect",
              activation: { type: "action", value: 1 },
              effects: [],
              flags: { netherscrolls: { nativeFeatureId: featureId } },
            };
            activities.push(activity);
          }
          activity.effects ??= [];
          if (
            !activity.effects.some(
              /** Check whether any entry matches while translate item. */ (e) =>
                (e._id ?? e.id) === effect._id
            )
          )
            activity.effects.push({ _id: effect._id });
        }
      }
    }
    // Feature-only projections carry native definitions when the outer payload does not.
    if (!Array.isArray(source.features) && !Array.isArray(source.effects))
      for (const projection of projections) {
        const flags = projection.flags?.netherscrolls;
        if (!flags?.nativeEffect) continue;
        if (
          [...translated.values()].some(
            /** Check whether any entry matches while translate item. */
            (e) => e.flags.netherscrolls.nativeEffect._id === flags.nativeEffect._id
          )
        )
          continue;
        const effect = createEffect(flags.nativeEffect, {
          sourceId: flags.sourceId ?? sourceId,
          featureId: flags.featureId,
          application: flags.effectApplication,
          projection,
          name: projection.name,
        });
        translated.set(effect.flags[MODULE].effectKey, effect);
      }
    const result = [...retained, ...translated.values()];
    if (
      ["light", "medium", "heavy", "shield"].includes(document.system?.type?.value) &&
      result.some(
        /** Check whether any entry matches while translate item. */
        (e) => canonicalTarget(e.flags?.netherscrolls?.nativeEffect?.stat ?? "") === "armorClass"
      )
    ) {
      document.system.armor ??= {};
      document.system.armor.magicalBonus = "";
    }
    return result;
  }

  /** Apply item-owned passive definitions only when their ownership, equipment, or attunement requirement is met. */
  function eligible(application, item) {
    if (!item) return true;
    if (application?.mode === "activated") return false;
    const equipped = item.system?.equipped === true;
    const attuned = item.system?.attuned === true || item.system?.attunement === 2;
    switch (application?.requirement ?? "selected") {
      case "selected":
      case "owned":
        return true;
      case "equipped":
        return equipped;
      case "attuned":
        return attuned;
      case "equippedAndAttuned":
        return equipped && attuned;
      default:
        return false;
    }
  }

  return { createEffect, eligible, stableId, translateItem };
}

export { createEffectDocuments };
