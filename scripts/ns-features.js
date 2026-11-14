/* Native feature rolls and resources. Foundry owns consumption and rest updates. */
import "./ns-effects.js";
import { createNativeFeatureFormulas } from "./features/formulas.js";
import { createNativeFeatureActivities } from "./features/activities.js";
import { createNativeFeatureTranslation } from "./features/translation.js";
import { createNativeFeatureResources } from "./features/resources.js";

/** Assemble the existing public API while keeping each responsibility in its own private scope. */
function initializeNetherscrollsFeatures() {
  const formulas = createNativeFeatureFormulas();
  const activities = createNativeFeatureActivities(formulas);
  const translation = createNativeFeatureTranslation({ ...formulas, ...activities });
  const resources = createNativeFeatureResources({ ...formulas, ...activities });

  const { NS, definition, formula, maximum, pick, uses } = formulas;
  const { build } = activities;
  const { translateItem } = translation;
  const { identity, initializeActor, plan, prepareActivity, prepareActor } = resources;

  NS.features = {
    pick,
    formula,
    maximum,
    uses,
    build,
    translateItem,
    identity,
    plan,
    prepareActor,
    prepareActivity,
    initializeActor,
    definition,
  };
}

initializeNetherscrollsFeatures();
