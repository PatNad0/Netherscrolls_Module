/**
 * Read current settings at the point of use so changes take effect without a reload.
 * Registration is separate because it wires these values to application behavior.
 */
import { MODULE_ID, SETTINGS } from "./constants.js";

/** Determine whether foundry export button enabled. */
function isFoundryExportButtonEnabled() {
  return Boolean(game?.settings?.get(MODULE_ID, SETTINGS.exportButton));
}

/** Determine whether debug enabled. */
function isDebugEnabled() {
  return Boolean(game?.settings?.get(MODULE_ID, SETTINGS.debug));
}

/** Handle debug character import. */
function debugNetherscrollsCharacterImport(message, details = undefined) {
  if (!isDebugEnabled()) return;
  const prefix = `${MODULE_ID} | Foundry Import | ${message}`;
  if (details === undefined) console.debug(prefix);
  else console.debug(prefix, details);
}

/** Determine whether enhanced damage enabled. */
function isEnhancedDamageEnabled() {
  return Boolean(game?.settings?.get(MODULE_ID, SETTINGS.devEnhancedDamage));
}

/** Retrieve api key. */
function getNetherscrollsApiKey() {
  return String(game?.settings?.get(MODULE_ID, SETTINGS.apiKey) ?? "").trim();
}

export {
  debugNetherscrollsCharacterImport,
  getNetherscrollsApiKey,
  isDebugEnabled,
  isEnhancedDamageEnabled,
  isFoundryExportButtonEnabled,
};
