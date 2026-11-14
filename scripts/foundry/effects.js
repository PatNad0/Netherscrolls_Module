/**
 * Compare and reconcile embedded effect definitions before reusing an item.
 * Effect replacement must remove obsolete entries so repeated imports do not accumulate bonuses.
 */
import { MODULE_ID } from "../core/constants.js";
import {
  duplicateNetherscrollsData,
  reportNetherscrollsTransferItemError,
  toTrimmedStringOrNull,
} from "../core/utils.js";
import { getNetherscrollsNativeEffectKey } from "../data/item-fields.js";
import { getNetherscrollsActorEffects } from "./collections.js";

/** Retrieve embedded effect sources. */
function getNetherscrollsEmbeddedEffectSources(value) {
  const effects = value?.effects;
  const entries = Array.isArray(effects)
    ? effects
    : Array.isArray(effects?.contents)
      ? effects.contents
      : effects?.values
        ? Array.from(effects.values())
        : [];
  return entries
    .map(
      /** Transform each entry while retrieve embedded effect sources. */ (effect) =>
        effect?.toObject?.() ?? effect
    )
    .filter(
      /** Keep entries that satisfy the condition while retrieve embedded effect sources. */ (
        effect
      ) => effect && typeof effect === "object"
    );
}

/** Retrieve embedded effect signatures. */
function getNetherscrollsEmbeddedEffectSignatures(value) {
  return getNetherscrollsEmbeddedEffectSources(value)
    .map(
      /** Transform each entry while retrieve embedded effect signatures. */ (effect) =>
        JSON.stringify({
          id: effect._id ?? effect.id ?? null,
          native: effect.flags?.netherscrolls ?? effect.flags?.[MODULE_ID] ?? null,
          name: toTrimmedStringOrNull(effect.name) ?? "",
          disabled: Boolean(effect.disabled),
          transfer: Boolean(effect.transfer),
          changes: (Array.isArray(effect.system?.changes)
            ? effect.system.changes
            : Array.isArray(effect.changes)
              ? effect.changes
              : []
          ).map(
            /** Transform each entry while retrieve embedded effect signatures. */ (change) => ({
              key: toTrimmedStringOrNull(change?.key) ?? "",
              mode: change?.mode ?? change?.type ?? null,
              value: String(change?.value ?? ""),
            })
          ),
        })
    )
    .sort();
}

/** Compare normalized definitions so unchanged effects can be reused without duplicating their bonuses. */
function haveSameNetherscrollsEmbeddedEffects(left, right) {
  const leftSignatures = getNetherscrollsEmbeddedEffectSignatures(left);
  const rightSignatures = getNetherscrollsEmbeddedEffectSignatures(right);
  return (
    leftSignatures.length === rightSignatures.length &&
    leftSignatures.every(
      /** Check whether all entries match while handle have same embedded effects. */ (
        signature,
        index
      ) => signature === rightSignatures[index]
    )
  );
}

/** Install incoming effects first; preserve old effects if a write fails before cleanup. */
async function reconcileNetherscrollsItemEffectsSafely(item, incoming) {
  const previous = Array.from(getNetherscrollsActorEffects(item));
  const retained = new Set();
  const failures = [];
  for (const effect of incoming) {
    const match =
      previous.find(
        /** Find the matching entry while reconcile item effects safely. */ (row) =>
          !retained.has(row.id) && row.id === effect._id
      ) ??
      (!effect._id
        ? previous.find(
            /** Find the matching entry while reconcile item effects safely. */
            (row) =>
              !retained.has(row.id) &&
              getNetherscrollsNativeEffectKey(row) &&
              getNetherscrollsNativeEffectKey(row) === getNetherscrollsNativeEffectKey(effect)
          )
        : null);
    try {
      if (match) {
        retained.add(match.id);
        const update = { ...effect, _id: match.id };
        // Foundry migrates legacy `changes` to `system.changes` before applying
        // updates. Deleting that required field afterward invalidates the effect.
        await item.updateEmbeddedDocuments("ActiveEffect", [update], { render: false });
      } else {
        const data = duplicateNetherscrollsData(effect);
        await item.createEmbeddedDocuments("ActiveEffect", [data], { render: false, keepId: true });
      }
    } catch (error) {
      failures.push(error);
      reportNetherscrollsTransferItemError(`${item.name}: ${effect.name ?? "effect"}`, error);
    }
  }
  if (!failures.length)
    for (const effect of previous.filter(
      /** Keep entries that satisfy the condition while reconcile item effects safely. */ (row) =>
        !retained.has(row.id)
    )) {
      try {
        await item.deleteEmbeddedDocuments("ActiveEffect", [effect.id], { render: false });
      } catch (error) {
        failures.push(error);
        reportNetherscrollsTransferItemError(`${item.name}: effect`, error);
      }
    }
  if (failures.length)
    throw new AggregateError(
      failures,
      `${item.name}: ${failures.length} Active Effect write(s) failed.`
    );
}

export { haveSameNetherscrollsEmbeddedEffects, reconcileNetherscrollsItemEffectsSafely };
