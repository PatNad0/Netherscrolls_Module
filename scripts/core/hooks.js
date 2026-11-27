/**
 * Connect Foundry lifecycle events to the features that own their behavior.
 * Registration happens once from index.js, after the effects adapters are available.
 */
import { resolveNetherscrollsGuild } from "../api/client.js";
import { MODULE_ID, SETTINGS } from "./constants.js";
import { registerNetherscrollsSettings } from "./registration.js";
import { getNetherscrollsApiKey } from "./settings.js";
import {
  isNetherscrollsClassRepairUpdate,
  queueNetherscrollsClassFeatureRepairForItem,
} from "../foundry/class-features.js";
import {
  applyNetherscrollsImportPackBanners,
  markNetherscrollsPackTitles,
  placeExistingNetherscrollsImportPacksInSidebarFolder,
} from "../foundry/compendiums.js";
import { toggleNpcDeathSaveHook, toggleRerollInitHook } from "../gameplay/combat.js";
import { isChatContextApplication, registerEnhanceContextOption } from "../gameplay/enhance.js";
import {
  disableLegacyNetherscrollsImportQueuePolling,
  isPrimaryNetherscrollsQueuePoller,
  toggleNetherscrollsImportQueuePolling,
} from "../import/queue.js";
import { initChatNumberActionHandlers } from "../ui/chat-actions.js";
import { initEnhanceDialogInputHandlers } from "../ui/enhance-dialog.js";
import {
  injectFoundryExportButtonV1,
  injectFoundryExportButtonV2,
  installNetherscrollsSpellbookSectionOrdering,
} from "../ui/sheets.js";

let hooksRegistered = false;

/** Wire feature owners once, even if initialization is requested again. */
function registerNetherscrollsHooks() {
  if (hooksRegistered) return;
  hooksRegistered = true;
  Hooks.once("init", registerNetherscrollsSettings);

  Hooks.once("ready", onNetherscrollsReady);

  Hooks.on(
    "renderApplicationV1",
    /** Handle the registered event while register hooks. */ (app, html) => {
      injectFoundryExportButtonV1(app, html);
    }
  );

  Hooks.on(
    "renderApplicationV2",
    /** Handle the registered event while register hooks. */ (app, element) => {
      injectFoundryExportButtonV2(app, element);
    }
  );

  Hooks.on(
    "renderActorSheet",
    /** Handle the registered event while register hooks. */ (app, html) => {
      injectFoundryExportButtonV1(app, html);
    }
  );

  Hooks.on(
    "renderCompendiumDirectory",
    /** Handle the registered event while register hooks. */ (app, html) => {
      markNetherscrollsPackTitles(html);
    }
  );

  Hooks.on(
    "renderActorSheetV2",
    /** Handle the registered event while register hooks. */ (app, html) => {
      injectFoundryExportButtonV2(app, html);
    }
  );

  Hooks.on("createItem", onNetherscrollsItemCreated);

  Hooks.on("updateItem", onNetherscrollsItemUpdated);

  Hooks.on(
    "updateUser",
    /** Handle the registered event while register hooks. */ () => {
      toggleNetherscrollsImportQueuePolling(
        game?.settings?.get(MODULE_ID, SETTINGS.importQueuePolling) === true
      );
    }
  );

  Hooks.on(
    "getChatLogEntryContext",
    /** Handle the registered event while register hooks. */ (_html, options) => {
      registerEnhanceContextOption(options);
    }
  );

  Hooks.on(
    "getChatMessageContextOptions",
    /** Handle the registered event while register hooks. */ (_app, options) => {
      registerEnhanceContextOption(options);
    }
  );

  Hooks.on(
    "getDocumentContextOptions",
    /** Handle the registered event while register hooks. */ (app, options) => {
      if (!isChatContextApplication(app)) return;
      registerEnhanceContextOption(options);
    }
  );
}

/** Start world-dependent features after Foundry has loaded settings and documents. */
async function onNetherscrollsReady() {
  await disableLegacyNetherscrollsImportQueuePolling();
  installNetherscrollsSpellbookSectionOrdering();
  toggleRerollInitHook(game.settings.get(MODULE_ID, SETTINGS.rerollInit) === true);
  toggleNpcDeathSaveHook(game.settings.get(MODULE_ID, SETTINGS.npcDeathSave) === true);
  initEnhanceDialogInputHandlers();
  initChatNumberActionHandlers();
  placeExistingNetherscrollsImportPacksInSidebarFolder();
  applyNetherscrollsImportPackBanners();

  // Resolve a single available guild quietly; leave ambiguous choices to the transfer window.
  if (game.user?.isGM && isPrimaryNetherscrollsQueuePoller() && getNetherscrollsApiKey()) {
    resolveNetherscrollsGuild().catch(
      /** Handle the operation failure while handle ready. */ (err) => {
        console.warn(`${MODULE_ID} | Unable to check the Netherscrolls guild at startup.`, err);
      }
    );
  }
  // The first poll waits a minute so it does not compete with the world loading.
  toggleNetherscrollsImportQueuePolling(
    game.settings.get(MODULE_ID, SETTINGS.importQueuePolling) === true,
    { initialDelayMs: 60_000 }
  );
}

/** Imported writes repair their own grants; only user-created items need this follow-up. */
function onNetherscrollsItemCreated(item, options) {
  if (options?.netherscrollsTransfer) return;
  queueNetherscrollsClassFeatureRepairForItem(item, { delay: 100 });
}

/** Debounce grant repairs only for relevant user edits to class items. */
function onNetherscrollsItemUpdated(item, changes, options) {
  if (options?.netherscrollsTransfer) return;
  if (!isNetherscrollsClassRepairUpdate(changes)) return;
  queueNetherscrollsClassFeatureRepairForItem(item, { delay: 100 });
}

export { registerNetherscrollsHooks };
