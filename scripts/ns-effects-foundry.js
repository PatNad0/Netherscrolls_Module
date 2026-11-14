/* D&D5e adapter for the native NS effect evaluator. Prepared values are never saved as base stats.
 *
 * On an actor imported from Netherscrolls (it has a native character flag):
 * - Base values come from the persisted Foundry source, never from prepared data, so
 *   changes Foundry already applied are not counted a second time.
 * - Every applicable effect is read: Netherscrolls definitions use their native formula;
 *   Foundry effects are translated for the keys Netherscrolls owns (see ns-effects.js).
 * - Passive effects are exported to Netherscrolls. Active (temporary or activity-applied)
 *   effects stay Foundry-side: they count in totals but are never exported.
 * - Grants, speeds, senses, ability maximums, check bonuses and spell damage bonuses are
 *   applied by D&D5e through their projected changes; the runtime resolves them for formulas,
 *   export and the effects dialog, and only adds STR/DEX damage bonuses at roll time.
 * Ordinary actors retain D&D5e preparation, with narrow adapters for NS physical
 * attack and damage bonuses, maximum HP and exhaustion definitions.
 */
import "./ns-effects.js";
import { createFoundryEffectSupport } from "./effects/foundry/support.js";
import { createFoundryEffectCollection } from "./effects/foundry/collection.js";
import { createFoundryEffectSource } from "./effects/foundry/source.js";
import { createFoundryEffectState } from "./effects/foundry/state.js";
import { createFoundryEffectRolls } from "./effects/foundry/rolls.js";
import { createFoundryEffectAttributes } from "./effects/foundry/attributes.js";
import { createFoundryEffectPreparation } from "./effects/foundry/preparation.js";
import { createFoundryEffectLifecycle } from "./effects/foundry/lifecycle.js";
import { createFoundryEffectResources } from "./effects/foundry/resources.js";
import { createFoundryEffectInspection } from "./effects/foundry/inspection.js";
import { createFoundryEffectExport } from "./effects/foundry/export.js";
import { createFoundryEffectHooks } from "./effects/foundry/hooks.js";

/** Assemble the existing public API while keeping each responsibility in its own private scope. */
function initializeNetherscrollsFoundryEffects() {
  const support = createFoundryEffectSupport();
  const collection = createFoundryEffectCollection(support);
  const source = createFoundryEffectSource({ ...support, ...collection });
  const state = createFoundryEffectState({ ...support, ...collection, ...source });
  const rolls = createFoundryEffectRolls({ ...support, ...collection, ...source, ...state });
  const attributes = createFoundryEffectAttributes({
    ...support,
    ...collection,
    ...state,
    ...rolls,
  });
  const preparation = createFoundryEffectPreparation({
    ...support,
    ...collection,
    ...state,
    ...attributes,
  });
  const lifecycle = createFoundryEffectLifecycle(support);
  const resources = createFoundryEffectResources({ ...support, ...state });
  const inspection = createFoundryEffectInspection({
    ...support,
    ...collection,
    ...state,
    ...rolls,
    ...attributes,
    ...lifecycle,
    ...resources,
  });
  const exporter = createFoundryEffectExport({ ...support, ...collection, ...source, ...state });
  const hooks = createFoundryEffectHooks({
    ...support,
    ...collection,
    ...state,
    ...preparation,
    ...rolls,
    ...attributes,
    ...inspection,
    ...lifecycle,
    ...resources,
    ...exporter,
  });

  const { NS, hasNative, nativeFlags, states } = support;
  const { collect, levelsOf, ownerScope } = collection;
  const { sourceCharacter } = source;
  const { collectState } = state;
  const { prepare } = preparation;
  const { contextFor, modifyRoll } = rolls;
  const { installAttributeAdapters, prepareDC } = attributes;
  const { install, onPreCreateActiveEffect } = hooks;
  const { endEffect, expireEvent, expireTurns } = lifecycle;
  const { adjustPool, rollHitDie } = resources;
  const { exportBaseValues, exportEffects, exportState, isForeignMirror } = exporter;
  const { inspect, rollNative } = inspection;

  NS.foundry = {
    prepare,
    sourceCharacter,
    collect,
    collectState,
    contextFor,
    modifyRoll,
    prepareDC,
    install,
    rollNative,
    inspect,
    states,
    adjustPool,
    endEffect,
    expireEvent,
    expireTurns,
    hasNative,
    exportState,
    exportEffects,
    exportBaseValues,
    isForeignMirror,
    rollHitDie,
    onPreCreateActiveEffect,
    levelsOf,
    ownerScope,
    installAttributeAdapters,
  };
  if (globalThis.Hooks) {
    Hooks.once("setup", install);
    Hooks.on(
      "getHeaderControlsActorSheetV2",
      /** Handle the registered event while initialize foundry effects. */ (app, controls) => {
        if (nativeFlags(app.actor))
          controls.push({
            icon: "fa-solid fa-wand-magic-sparkles",
            label: "NS effects",
            action: "ns-effects",
            onClick: /** Handle click. */ () => inspect(app.actor),
          });
      }
    );
    Hooks.on(
      "getActorSheetHeaderButtons",
      /** Handle the registered event while initialize foundry effects. */ (app, buttons) => {
        if (nativeFlags(app.actor))
          buttons.unshift({
            label: "NS effects",
            class: "ns-effects",
            icon: "fas fa-wand-magic-sparkles",
            onclick: /** Handle onclick. */ () => inspect(app.actor),
          });
      }
    );
  }
}

initializeNetherscrollsFoundryEffects();
