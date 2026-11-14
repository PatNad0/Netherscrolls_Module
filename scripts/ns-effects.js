/* Native Netherscrolls numeric effects. No JavaScript evaluation of API formulas.
 *
 * Ownership model shared with ns-effects-foundry.js:
 * - Passive modifiers (library features, Netherscrolls character effects, Foundry item and
 *   permanent effects) are calculated here with Netherscrolls rules and exported to Netherscrolls.
 * - Active modifiers (temporary Foundry effects, activity-applied buffs) keep their Foundry
 *   lifecycle. Their numeric changes are read here so every total is counted exactly once,
 *   and they are never exported.
 * - Foundry keys without a Netherscrolls stat (custom traits, skill-only bonuses, flags, ...)
 *   remain applied by D&D5e itself.
 * - Grants (resistances, languages, proficiencies, advantage), speeds, senses, ability maximums,
 *   check bonuses and spell damage bonuses are translated both ways and resolved here, but
 *   D&D5e applies them through the projected changes; Netherscrolls never writes those fields.
 */
import { createEffectDefinitions } from "./effects/definitions.js";
import { createEffectFormulaLanguage } from "./effects/formulas.js";
import { createEffectStatRules } from "./effects/stats.js";
import { createEffectResolver } from "./effects/resolver.js";
import { createEffectTranslation } from "./effects/translation.js";
import { createEffectDocuments } from "./effects/documents.js";

/** Assemble the existing public API while keeping each responsibility in its own private scope. */
function initializeNetherscrollsEffects() {
  const definitions = createEffectDefinitions();
  const formulas = createEffectFormulaLanguage(definitions);
  const stats = createEffectStatRules(definitions);
  const resolver = createEffectResolver({ ...definitions, ...formulas, ...stats });
  const translation = createEffectTranslation({ ...definitions, ...formulas, ...stats });
  const documents = createEffectDocuments({ ...definitions, ...stats, ...translation });

  const {
    ABILITIES,
    FILTERS,
    FUNCTIONS,
    MODULE,
    MOVEMENT,
    SENSES,
    SKILLS,
    TOOLS,
    TRAIT_GRANTS,
    clone,
    get,
    list,
    number,
    slug,
  } = definitions;
  const {
    bindFeatureReferences,
    featureReference,
    formulaValue,
    hasFeatureReference,
    parseFormula,
    serialize,
  } = formulas;
  const {
    canonicalTarget,
    diceAllowed,
    grantValue,
    hasFilters,
    isGrantStat,
    isModeStat,
    matchesFilters,
    referenceTarget,
    rollMode,
  } = stats;
  const { resolve } = resolver;
  const { foundryFormula, foundryMode, foundryTargets, fromFoundryChange, toFoundryChanges } =
    translation;
  const { createEffect, eligible, stableId, translateItem } = documents;

  globalThis.NetherscrollsEffects = {
    MODULE,
    ABILITIES,
    SKILLS,
    TOOLS,
    FILTERS,
    FUNCTIONS,
    TRAIT_GRANTS,
    MOVEMENT,
    SENSES,
    parseFormula,
    formulaValue,
    serialize,
    featureReference,
    hasFeatureReference,
    bindFeatureReferences,
    canonicalTarget,
    referenceTarget,
    diceAllowed,
    isGrantStat,
    isModeStat,
    grantValue,
    rollMode,
    matchesFilters,
    hasFilters,
    resolve,
    clone,
    get,
    list,
    number,
    slug,
    stableId,
    foundryMode,
    foundryFormula,
    foundryTargets,
    fromFoundryChange,
    toFoundryChanges,
    createEffect,
    translateItem,
    eligible,
  };
}

initializeNetherscrollsEffects();
