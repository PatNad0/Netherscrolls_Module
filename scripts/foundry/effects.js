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

// Foundry 14 names change modes by string `type`; older data still carries the numeric `mode`.
const NETHERSCROLLS_CHANGE_MODE_TYPES = [
  "custom",
  "multiply",
  "add",
  "downgrade",
  "upgrade",
  "override",
];

/**
 * A change's mode as Foundry 14's string type. Reading `mode` on a Foundry 14 change logs a
 * deprecation, so `type` is read first; a numeric mode maps to the same string.
 */
function getNetherscrollsChangeType(change) {
  if (typeof change?.type === "string" && change.type) return change.type;
  const mode = change?.mode;
  if (mode === undefined || mode === null || mode === "") return null;
  const number = Number(mode);
  if (!Number.isInteger(number)) return String(mode);
  return NETHERSCROLLS_CHANGE_MODE_TYPES[number] ?? `custom.${number}`;
}

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
              type: getNetherscrollsChangeType(change),
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
