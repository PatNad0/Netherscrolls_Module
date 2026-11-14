/**
 * Spend native pools and hit dice through supported Foundry document updates.
 * Validate ownership and remaining values before persisting a resource change.
 */

/** Create foundry effect resources. */
function createFoundryEffectResources({ MODULE, NS, collectState, number, val }) {
  /** Reject unauthorised or excessive spending before updating the appropriate persisted pool field. */
  async function adjustPool(actor, stat, amount) {
    if (!actor.isOwner) throw new Error("You cannot change this character's pools.");
    if (!Number.isFinite(amount)) throw new Error("Invalid pool adjustment");
    const state = collectState(actor);
    if (!(stat in state.result.values)) throw new Error(`Unknown NS pool: ${stat}`);
    let path, base;
    const resource = /^Ressources\.(.+)\.(CurrentQty|TotalQty)$/.exec(stat);
    if (resource) {
      const index = state.character.Ressources.findIndex(
        /** Perform the callback while handle adjust pool. */ (row) => row.Name === resource[1]
      );
      base = state.character.Ressources[index][resource[2]];
      path = `flags.${MODULE}.nativeEffectState.Ressources.${index}.${resource[2]}`;
    } else {
      const slot = /^spellSlots\.(current|max)\.lvl(\d+)$/.exec(stat);
      const hp = /^hp\.(current|max|temp)$/.exec(stat);
      if (slot && Number(slot[2]) <= 9)
        path = `system.spells.spell${slot[2]}.${slot[1] === "current" ? "value" : "override"}`;
      else if (hp) path = `system.attributes.hp.${hp[1] === "current" ? "value" : hp[1]}`;
      else if (/^currency\.(pp|gp|sp|cp)$/.test(stat)) path = `system.${stat}`;
      else if (
        /^(?:hitDice\.(?:current|max)\.d(?:4|6|8|10|12|20)|spellSlots\.(?:current|max)\.lvl(?:[1-9]|1[0-5])|currency\.rations)$/.test(
          stat
        )
      )
        path = `flags.${MODULE}.nativeEffectState.${stat}`;
      else throw new Error(`Not a spendable NS pool: ${stat}`);
      base = NS.get(state.character, stat);
    }
    if (state.result.values[stat] + amount < 0)
      throw new Error("This NS pool does not have enough remaining.");
    await actor.update({ [path]: number(base) + amount });
  }

  /** Spend one hit die from the selected pool and clamp healing to the actor's missing hit points. */
  async function rollHitDie(actor, die) {
    if (!actor.isOwner) throw new Error("You cannot change this character's hit dice.");
    if (!/^d(?:4|6|8|10|12|20)$/.test(die)) throw new Error("Invalid hit die");
    const state = collectState(actor);
    if (val(state.result, `hitDice.current.${die}`) < 1)
      throw new Error("No hit dice remaining in this pool.");
    const roll = await new Roll(`1${die} + (${val(state.result, "abilities.con.mod")})`).evaluate();
    const healing = Math.max(
      0,
      Math.min(roll.total, val(state.result, "hp.max") - val(state.result, "hp.current"))
    );
    await actor.update({
      [`flags.${MODULE}.nativeEffectState.hitDice.current.${die}`]:
        number(state.character.hitDice.current[die]) - 1,
      "system.attributes.hp.value": number(state.character.hp.current) + healing,
    });
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: `${actor.name}: ${die} hit die`,
    });
    return roll;
  }

  return { adjustPool, rollHitDie };
}

export { createFoundryEffectResources };
