/**
 * Register settings during Foundry init, after application classes have been selected.
 * Preserve registration order because it also determines the configuration screen order.
 */
import {
  clearNetherscrollsGuildScopedCaches,
  resetNetherscrollsGuildState,
} from "../api/client.js";
import { MODULE_ID, SETTINGS } from "./constants.js";
import { toggleNpcDeathSaveHook, toggleRerollInitHook } from "../gameplay/combat.js";
import { toggleNetherscrollsImportQueuePolling } from "../import/queue.js";
import { rerenderActorSheets } from "../ui/sheets.js";
import { registerNetherscrollsSidebarTab } from "../ui/sidebar.js";
import { NetherscrollsImportSettings } from "../ui/transfer.js";

/** Register settings. */
function registerNetherscrollsSettings() {
  registerNetherscrollsSidebarTab();
  game.settings.registerMenu(MODULE_ID, SETTINGS.importFromNetherscroll, {
    name: "Import / Export",
    label: "Open Netherscrolls import / export",
    hint: "Choose your guild, then bring characters and library content from Netherscrolls or send characters back.",
    icon: "fa-solid fa-right-left",
    type: NetherscrollsImportSettings,
    restricted: true,
  });

  game.settings.register(MODULE_ID, SETTINGS.apiKey, {
    name: "Netherscrolls API Key",
    hint: "Your account key from Netherscrolls. It works in every guild you belong to; import and export rights are granted per guild. Campaign actions need a campaign DM or guild administrator.",
    scope: "world",
    config: true,
    restricted: true,
    type: String,
    default: "",
    onChange: /** Handle change. */ () => resetNetherscrollsGuildState(),
  });

  game.settings.register(MODULE_ID, SETTINGS.importQueuePolling, {
    name: "Poll the Foundry sync queues",
    hint: "Periodically apply queued imports and send queued exports using the DM or administrator API key.",
    scope: "world",
    config: true,
    restricted: true,
    type: Boolean,
    default: false,
    onChange: /** Handle change. */ (value) =>
      toggleNetherscrollsImportQueuePolling(Boolean(value)),
  });

  game.settings.register(MODULE_ID, SETTINGS.rerollInit, {
    name: "Reroll initiative each round",
    hint: "When a new combat round starts, reset and reroll all initiatives.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: /** Handle change. */ (value) => toggleRerollInitHook(Boolean(value)),
  });

  game.settings.register(MODULE_ID, SETTINGS.npcDeathSave, {
    name: "NPC death save each turn",
    hint: "When an NPC at 0 HP starts its turn, roll a death save (with CON save).",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: /** Handle change. */ (value) => toggleNpcDeathSaveHook(Boolean(value)),
  });

  // The guild this world plays in (GET /foundry/guilds id), chosen in the import/export window.
  game.settings.register(MODULE_ID, SETTINGS.guildId, {
    scope: "world",
    config: false,
    restricted: true,
    type: String,
    default: "",
    onChange: /** Handle change. */ () => clearNetherscrollsGuildScopedCaches(),
  });
  game.settings.register(MODULE_ID, SETTINGS.guildName, {
    scope: "world",
    config: false,
    type: String,
    default: "",
  });
  // { [guildId]: ISO date } of the last library import, offered as the "only changes since" date.
  game.settings.register(MODULE_ID, SETTINGS.libraryImportDates, {
    scope: "world",
    config: false,
    restricted: true,
    type: String,
    default: "",
  });

  game.settings.register(MODULE_ID, SETTINGS.exportButton, {
    name: "Foundry Export button",
    hint: "Show the Foundry Export button on linked character sheets.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: /** Handle change. */ () => rerenderActorSheets(),
  });

  game.settings.register(MODULE_ID, SETTINGS.importQueuePollingSafetyReset, {
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
  });
  game.settings.register(MODULE_ID, SETTINGS.importQueueCampaignIds, {
    scope: "world",
    config: false,
    restricted: true,
    type: String,
    default: "",
  });

  game.settings.register(MODULE_ID, SETTINGS.devEnhancedDamage, {
    name: "Enhance rolls",
    hint: "Adds an Enhance option to chat messages for rerolling the lowest dice of any roll.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(MODULE_ID, SETTINGS.debug, {
    name: "Debug mode",
    hint: "Show Foundry Import and Foundry Export request/response payloads in chat.",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
  });
}

export { registerNetherscrollsSettings };
