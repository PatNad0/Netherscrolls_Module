/**
 * Expire active effects across world actors and synthetic token actors.
 * Keep source ownership and combat boundaries explicit when responding to rest and turn events.
 */

/** Create foundry effect lifecycle. */
function createFoundryEffectLifecycle({ MODULE, hasNative, list, report }) {
  /** Handle world actors. */
  function worldActors() {
    const actors = new Map(
      list(globalThis.game?.actors).map(
        /** Transform each entry while handle world actors. */ (actor) => [
          actor.uuid ?? actor.id,
          actor,
        ]
      )
    );
    for (const token of globalThis.canvas?.tokens?.placeables ?? [])
      if (token.actor) actors.set(token.actor.uuid ?? token.actor.id, token.actor);
    return [...actors.values()];
  }

  const activeOwner = /** Handle active owner. */ (actor) =>
    actor.isOwner &&
    (globalThis.game?.user?.isGM
      ? !globalThis.game.users?.activeGM ||
        globalThis.game.users.activeGM.id === globalThis.game.user.id
      : !globalThis.game?.users?.activeGM);

  /** Handle end effect. */
  async function endEffect(actor, id) {
    if (!actor.isOwner) throw new Error("You cannot change this character's effects.");
    await actor.updateEmbeddedDocuments("ActiveEffect", [{ _id: id, disabled: true }]);
  }

  /** Expire source-owned instances on every affected actor when the matching rest or lifecycle event occurs. */
  async function expireEvent(source, event) {
    for (const actor of worldActors()) {
      if (!activeOwner(actor)) continue;
      const updates = [];
      for (const effect of list(actor.effects)) {
        const runtime = effect.flags?.[MODULE],
          native = effect.flags?.netherscrolls;
        if (
          !runtime?.nsRuntimeEffect ||
          effect.disabled ||
          (runtime.lifecycle?.sourceActorId ?? actor.id) !== source.id
        )
          continue;
        const unit =
          native.nativeEffect?.duration?.unit ?? native.effectApplication?.duration?.unit;
        if (
          (unit === "untilShortRest" && ["shortRest", "longRest"].includes(event)) ||
          (unit === "untilLongRest" && event === "longRest")
        )
          updates.push({ _id: effect.id, disabled: true });
      }
      if (updates.length) await actor.updateEmbeddedDocuments("ActiveEffect", updates);
    }
  }

  /** Evaluate turn expiry relative to the source or target boundary stored at activation. */
  async function expireTurns(combat) {
    const currentActorId = combat.combatant?.actor?.id;
    const previousActorId = combat.turns?.[combat.previous?.turn]?.actor?.id;
    for (const actor of worldActors()) {
      if (!activeOwner(actor)) continue;
      const updates = [];
      for (const effect of list(actor.effects)) {
        const runtime = effect.flags?.[MODULE],
          native = effect.flags?.netherscrolls;
        const duration = native?.nativeEffect?.duration ?? native?.effectApplication?.duration;
        if (!runtime?.nsRuntimeEffect || effect.disabled || duration?.unit !== "untilNextTurn")
          continue;
        const life = runtime.lifecycle;
        if (!life || (life.combatId && life.combatId !== combat.id)) continue;
        const moved = life.round !== combat.round || life.turn !== combat.turn;
        if (!moved) continue;
        if (duration.expiry === "end") {
          if (life.armed && previousActorId === life.sourceActorId)
            updates.push({ _id: effect.id, disabled: true });
          else if (currentActorId === life.sourceActorId)
            updates.push({ _id: effect.id, [`flags.${MODULE}.lifecycle.armed`]: true });
        } else if (currentActorId === life.sourceActorId)
          updates.push({ _id: effect.id, disabled: true });
      }
      if (updates.length) await actor.updateEmbeddedDocuments("ActiveEffect", updates);
      actor.reset();
    }
  }

  /** Handle refresh actors. */
  function refreshActors() {
    for (const actor of worldActors())
      if (
        hasNative(actor) ||
        [
          ...list(actor.effects),
          ...list(actor.items).flatMap(
            /** Perform the callback while handle refresh actors. */ (item) => list(item.effects)
          ),
        ].some(
          /** Check whether any entry matches while handle refresh actors. */
          (e) => e.flags?.[MODULE]?.nsRuntimeEffect
        )
      ) {
        // reset rebuilds the data model before preparation. Preparing it twice
        // redefines D&D5e's non-configurable senses getters (e.g. darkvision).
        try {
          actor.reset();
          if (actor.sheet?.rendered) actor.sheet.render(false);
        } catch (error) {
          report(actor, error);
        }
      }
  }

  return { activeOwner, endEffect, expireEvent, expireTurns, refreshActors };
}

export { createFoundryEffectLifecycle };
