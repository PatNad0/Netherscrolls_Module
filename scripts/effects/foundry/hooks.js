/**
 * Install effect adapters and route Foundry events to their owning functions.
 * Freeze caster-dependent definitions when an activity creates an active effect on a target.
 */

/** Create foundry effect hooks. */
function createFoundryEffectHooks({
  MODULE,
  NS,
  activeOwner,
  adjustPool,
  appendContextControls,
  changesOf,
  clone,
  collectState,
  contextChoices,
  endEffect,
  exhaustionBases,
  expireEvent,
  expireTurns,
  exportEffects,
  hasNative,
  inspect,
  installAttributeAdapters,
  levelsOf,
  list,
  modifyRoll,
  nativeFlags,
  number,
  ownerScope,
  prepare,
  prepareDC,
  refreshActors,
  report,
  rollHitDie,
  rollNative,
  states,
}) {
  // When an activity applies a Netherscrolls definition, it becomes an active Foundry
  // effect: feature references are frozen with the caster's levels (as the API does at
  // activation) and its D&D5e changes are rebuilt so any target, NPCs included, receives it.
  /** Freeze source feature references at activation so any target can apply the resulting effect independently. */
  function onPreCreateActiveEffect(effect, data) {
    if (!data.flags?.[MODULE]?.nsRuntimeEffect || effect.parent?.documentName !== "Actor") return;
    if (data.flags[MODULE].portableActiveEffect === true) return;
    const originActor = /^Actor\.([^.]+)/.exec(data.origin ?? "")?.[1] ?? effect.parent.id;
    const lifecycle = {
      sourceActorId: originActor,
      startedAt: globalThis.game?.time?.worldTime ?? 0,
      combatId: globalThis.game?.combat?.id ?? null,
      round: globalThis.game?.combat?.round ?? null,
      turn: globalThis.game?.combat?.turn ?? null,
    };
    const ns = data.flags.netherscrolls;
    const source = globalThis.game?.actors?.get?.(originActor) ?? effect.parent;
    const sourceItem = source?.items?.get?.(data.origin?.split(".Item.")[1]?.split(".")[0]);
    const sourceType =
      sourceItem?.flags?.[MODULE]?.featureScope ??
      (["race", "class", "subclass", "feat", "background"].includes(sourceItem?.type)
        ? sourceItem.type
        : "item");
    const native = {
      ...clone(ns?.nativeEffect),
      duration: clone(ns?.nativeEffect?.duration ?? ns?.effectApplication?.duration),
      origin: ns?.nativeEffect?.origin ?? {
        sourceType,
        sourceId: ns?.sourceId,
        featureId: ns?.featureId,
        effectId: ns?.nativeEffect?._id,
        characterId: source?.flags?.netherscrolls?.characterId ?? nativeFlags(source)?._id,
      },
    };
    if (!ns?.nativeEffect?.origin)
      native._id =
        globalThis.crypto?.randomUUID?.().replaceAll("-", "").slice(0, 24) ??
        (NS.stableId(`${Date.now()}:${Math.random()}`) + NS.stableId(Math.random())).slice(0, 24);
    const levels = levelsOf(source);
    const scope = { ...levels, ...ownerScope(sourceItem, levels) };
    try {
      native.bonus = NS.bindFeatureReferences(native.bonus, scope);
    } catch (error) {
      report(effect.parent, error);
    }
    const seconds = { minute: 60, hour: 3600, day: 86400 }[native.duration?.unit];
    if (seconds && !native.expiresAt)
      native.expiresAt = new Date(
        Date.now() + seconds * number(native.duration.value) * 1000
      ).toISOString();
    effect.updateSource({
      [`flags.${MODULE}.lifecycle`]: lifecycle,
      [`flags.${MODULE}.appliedActivation`]: true,
      [`flags.${MODULE}.portableActiveEffect`]: false,
      [`flags.${MODULE}.nativeActiveBonus`]: native,
      "flags.netherscrolls.nativeEffect": native,
      changes: NS.toFoundryChanges(native, scope),
    });
  }

  /** Wrap supported system preparation methods once and connect the corresponding lifecycle hooks. */
  function install() {
    installAttributeAdapters();
    const ActorClass = globalThis.CONFIG?.Actor?.documentClass ?? globalThis.Actor;
    if (!ActorClass?.prototype?.prepareData || ActorClass.prototype.prepareData._nsEffects) return;
    // Old imported definitions may still contain the former HP/exhaustion/range
    // changes. Filter them on a transient document, without rewriting saved effects.
    const applicable = ActorClass.prototype.allApplicableEffects;
    if (typeof applicable === "function" && !applicable._nsEffects) {
      const filtered = /** Handle filtered. */ function* (...args) {
        for (const effect of applicable.apply(this, args)) {
          const native =
            effect.flags?.netherscrolls?.nativeEffect ?? effect.flags?.[MODULE]?.nativeActiveBonus;
          if (
            effect.flags?.[MODULE]?.nsRuntimeEffect &&
            /^(?:hp\.max|exhaustion|ToHitStr|ToHitDext)(?:\.|$)/.test(native?.stat ?? "") &&
            changesOf(effect).length &&
            typeof effect.clone === "function"
          ) {
            const update = { changes: [] };
            if (Array.isArray(effect.system?.changes)) update.system = { changes: [] };
            yield effect.clone(update, { keepId: true, parent: effect.parent });
          } else yield effect;
        }
      };
      filtered._nsEffects = true;
      ActorClass.prototype.allApplicableEffects = filtered;
    }
    const original = ActorClass.prototype.prepareData;
    const wrapped = /** Handle wrapped. */ function (...args) {
      states.delete(this);
      exhaustionBases.delete(this);
      const result = original.apply(this, args);
      prepare(this);
      return result;
    };
    wrapped._nsEffects = true;
    ActorClass.prototype.prepareData = wrapped;
    for (const type of ["skill", "tool", "savingThrow", "abilityCheck", "attack", "damage"]) {
      Hooks.on(
        `dnd5e.postBuild${type[0].toUpperCase() + type.slice(1)}RollConfig`,
        /** Handle the registered event while handle install. */
        (config, roll, index, options) =>
          modifyRoll(type, config, roll, { ...(options ?? {}), index })
      );
    }
    Hooks.on(
      "dnd5e.preConfigureInitiative",
      /** Handle the registered event while handle install. */ (actor, roll) =>
        modifyRoll("initiative", { subject: actor }, roll)
    );
    Hooks.on(
      "dnd5e.preUseActivity",
      /** Handle the registered event while handle install. */ (activity, config) => {
        const spellContext = activity.item?.flags?.[MODULE]?.spellContext;
        if (
          spellContext &&
          (spellContext.casting?.available !== true ||
            (spellContext.casting.requiresPreparation &&
              !spellContext.casting.alwaysPrepared &&
              !activity.item.system?.prepared))
        ) {
          report(
            activity.actor,
            new Error(`${activity.name}: this NS spell context is unavailable or unprepared.`)
          );
          return false;
        }
        if (config?.nsEffectContext) contextChoices.set(activity, config.nsEffectContext);
        if (hasNative(activity.actor)) {
          try {
            const state = collectState(activity.actor);
            NS.features?.prepareActor(activity.actor, state);
            NS.features?.prepareActivity(activity, state);
          } catch (error) {
            report(activity.actor, error);
            return false;
          }
        }
        const nativeFeature = NS.features?.definition(activity);
        if (
          nativeFeature &&
          !NS.eligible({ ...nativeFeature.effectApplication, mode: "passive" }, activity.item)
        ) {
          report(
            activity.actor,
            new Error(`${activity.name}: its NS equipment requirement is not satisfied.`)
          );
          return false;
        }
        const effects = list(activity.effects)
          .map(
            /** Transform each entry while handle install. */ (link) =>
              activity.item?.effects?.get?.(link._id ?? link.id)
          )
          .filter(Boolean);
        for (const effect of effects) {
          const application = effect.flags?.netherscrolls?.effectApplication;
          if (
            effect.flags?.[MODULE]?.nsRuntimeEffect &&
            !NS.eligible({ ...application, mode: "passive" }, activity.item)
          ) {
            report(
              activity.actor,
              new Error(`${activity.name}: its NS equipment requirement is not satisfied.`)
            );
            return false;
          }
        }
        prepareDC(activity.actor, activity);
      }
    );
    Hooks.on("preCreateActiveEffect", onPreCreateActiveEffect);
    Hooks.on(
      "createActiveEffect",
      /** Handle the registered event while handle install. */ (effect) => {
        const actor = effect.parent,
          native = effect.flags?.netherscrolls?.nativeEffect;
        if (
          actor?.documentName !== "Actor" ||
          !activeOwner(actor) ||
          !effect.flags?.[MODULE]?.nsRuntimeEffect ||
          !native?.origin
        )
          return;
        const key = /** Handle key. */ (origin) =>
          [
            origin?.sourceType,
            origin?.sourceId ?? origin?.itemId,
            origin?.featureId,
            origin?.effectId,
            origin?.characterId,
          ].join(":");
        const older = list(actor.effects).filter(
          /** Keep entries that satisfy the condition while handle install. */
          (other) =>
            other.id !== effect.id &&
            !other.disabled &&
            other.flags?.[MODULE]?.nsRuntimeEffect &&
            key(other.flags?.netherscrolls?.nativeEffect?.origin) === key(native.origin)
        );
        if (older.length)
          actor
            .updateEmbeddedDocuments(
              "ActiveEffect",
              older.map(
                /** Transform each entry while handle install. */ (other) => ({
                  _id: other.id,
                  disabled: true,
                })
              )
            )
            .catch(
              /** Handle the operation failure while handle install. */ (error) =>
                report(actor, error)
            );
      }
    );
    Hooks.on(
      "dnd5e.restCompleted",
      /** Handle the registered event while handle install. */ (actor, _result, config) =>
        expireEvent(actor, config.type === "long" ? "longRest" : "shortRest")
    );
    Hooks.on(
      "updateWorldTime",
      /** Handle the registered event while handle install. */ () => refreshActors()
    );
    Hooks.on("renderApplicationV2", appendContextControls);
    Hooks.once(
      "ready",
      /** Handle the lifecycle event while handle install. */ () =>
        globalThis.setInterval?.(refreshActors, 30_000)
    );
    Hooks.on(
      "updateCombat",
      /** Handle the registered event while handle install. */ (combat, change) => {
        if (!("turn" in change) && !("round" in change)) return;
        expireTurns(combat).catch(
          /** Handle the operation failure while handle install. */ (error) => report(null, error)
        );
      }
    );
    const module = globalThis.game?.modules?.get(MODULE);
    if (module)
      module.api = {
        ...module.api,
        effects: {
          resolve: /** Resolve. */ (actor, context) => collectState(actor, context).result,
          roll: rollNative,
          rollHitDie,
          inspect: inspect,
          refresh: /** Handle refresh. */ (actor) => actor.reset(),
          adjustPool,
          endEffect,
          event: expireEvent,
          exportEffects,
        },
      };
  }

  return { install, onPreCreateActiveEffect };
}

export { createFoundryEffectHooks };
