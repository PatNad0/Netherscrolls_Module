/**
 * Own optional initiative rerolls and NPC death saves during combat updates.
 * Keep handler references local so toggling settings can remove exactly the registered hook.
 */

let rerollInitHandler = null;

let npcDeathSaveHandler = null;

/** Keep the exact handler reference so disabling the setting removes the combat hook cleanly. */
function toggleRerollInitHook(enabled) {
  if (!game?.ready) return;
  const shouldEnable = Boolean(enabled);

  if (shouldEnable && !rerollInitHandler) {
    rerollInitHandler = buildRerollInitHandler();
    Hooks.on("updateCombat", rerollInitHandler);
    ui?.notifications?.info?.("Reroll initiative each round: ON");
  } else if (!shouldEnable && rerollInitHandler) {
    Hooks.off("updateCombat", rerollInitHandler);
    rerollInitHandler = null;
    ui?.notifications?.info?.("Reroll initiative each round: OFF");
  }
}

/** Build reroll init handler. */
function buildRerollInitHandler() {
  const lastByCombat = {};

  return /** Perform the callback while build reroll init handler. */ async (combat, changed) => {
    if (!game?.user?.isGM) return;
    if (!combat?.isActive) return;
    if (!Object.prototype.hasOwnProperty.call(changed ?? {}, "round")) return;
    const round = Number(changed.round);
    if (!Number.isFinite(round)) return;
    if (lastByCombat[combat.id] === round) return;
    lastByCombat[combat.id] = round;

    // Foundry startCombat() begins at round 1, so keep the initial initiative roll.
    if (round <= 1) return;

    setTimeout(
      /** Run the deferred operation while build reroll init handler. */ async () => {
        try {
          await combat.resetAll({ updateTurn: false });
          await combat.rollAll({
            updateTurn: false,
            messageOptions: { create: false },
          });
          await combat.update({ turn: 0 });
        } catch (err) {
          console.error("Reroll each round FAILED:", err);
        }
      },
      0
    );
  };
}

/** Keep optional NPC death saves independently switchable without duplicating combat listeners. */
function toggleNpcDeathSaveHook(enabled) {
  if (!game?.ready) return;
  const shouldEnable = Boolean(enabled);

  if (shouldEnable && !npcDeathSaveHandler) {
    npcDeathSaveHandler = buildNpcDeathSaveHandler();
    Hooks.on("updateCombat", npcDeathSaveHandler);
    ui?.notifications?.info?.("NPC death save each turn: ON");
  } else if (!shouldEnable && npcDeathSaveHandler) {
    Hooks.off("updateCombat", npcDeathSaveHandler);
    npcDeathSaveHandler = null;
    ui?.notifications?.info?.("NPC death save each turn: OFF");
  }
}

/** Build npc death save handler. */
function buildNpcDeathSaveHandler() {
  const lastByCombat = {};

  return /** Perform the callback while build npc death save handler. */ async (
    combat,
    changed
  ) => {
    if (!game?.user?.isGM) return;
    if (!combat?.isActive) return;
    if (
      !Object.prototype.hasOwnProperty.call(changed ?? {}, "turn") &&
      !Object.prototype.hasOwnProperty.call(changed ?? {}, "round")
    ) {
      return;
    }

    const combatant = combat.combatant;
    const actor = combatant?.actor;
    if (!actor) return;
    if (actor.hasPlayerOwner) return;

    const hp = Number(actor.system?.attributes?.hp?.value ?? 0);
    if (hp > 0) return;

    const death = actor.system?.attributes?.death;
    if (!death) return;

    const success = Number(death.success ?? 0);
    const failure = Number(death.failure ?? 0);
    const stable = Boolean(death.stable);
    if (stable || success >= 3 || failure >= 3) return;

    const key = `${combat.round}:${combat.turn}:${actor.id}`;
    if (lastByCombat[combat.id] === key) return;
    lastByCombat[combat.id] = key;

    await rollNpcDeathSave(actor);
  };
}

/** Handle roll npc death save. */
async function rollNpcDeathSave(actor) {
  const death = actor.system?.attributes?.death;
  if (!death) return;

  const save = actor.system?.abilities?.con?.save;
  const conSave = Number(save?.value ?? save ?? 0);

  const roll = await new Roll("1d20 + @conSave", { conSave }).evaluate({ async: true });

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: "Death Save (+CON save)",
  });

  const die = Number(roll.dice?.[0]?.total ?? 0);
  const total = Number(roll.total ?? 0);

  let success = Number(death.success ?? 0);
  let failure = Number(death.failure ?? 0);

  if (die === 20) {
    await actor.update({
      "system.attributes.hp.value": 1,
      "system.attributes.death.success": 0,
      "system.attributes.death.failure": 0,
      "system.attributes.death.stable": false,
    });
    return;
  }

  if (die === 1) failure += 2;
  else if (total >= 10) success += 1;
  else failure += 1;

  success = Math.min(success, 3);
  failure = Math.min(failure, 3);

  await actor.update({
    "system.attributes.death.success": success,
    "system.attributes.death.failure": failure,
    "system.attributes.death.stable": success >= 3,
  });
}

export { toggleNpcDeathSaveHook, toggleRerollInitHook };
