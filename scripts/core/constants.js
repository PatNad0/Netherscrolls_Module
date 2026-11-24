/**
 * Keep service endpoints, module settings keys, and managed pack identities in one place.
 * These values describe the integration; caches and timers live with their owners.
 */

const MODULE_ID = "netherscrolls-module";

const PLACEHOLDER_CHARACTER_ID = "PLACEHOLDER";

const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];

const IMPORT_TYPES = [
  {
    key: "classes",
    label: "Classes",
    icon: "fa-solid fa-graduation-cap",
    checked: true,
  },
  {
    key: "items",
    label: "Items",
    icon: "fa-solid fa-suitcase",
    checked: true,
  },
  {
    key: "feats",
    label: "Feats",
    icon: "fa-solid fa-medal",
    checked: true,
  },
  {
    key: "spells",
    label: "Spells",
    icon: "fa-solid fa-wand-sparkles",
    checked: true,
  },
  {
    key: "backgrounds",
    label: "Backgrounds",
    icon: "fa-solid fa-scroll",
    checked: true,
  },
  {
    key: "races",
    label: "Races",
    icon: "fa-solid fa-person",
    checked: true,
  },
  // Off by default: the full monster dataset is large (complete NPC Actors).
  {
    key: "monsters",
    label: "Monsters",
    icon: "fa-solid fa-dragon",
    checked: false,
  },
];

// Types left out of a default library import (and of its "last import" date).
const NETHERSCROLLS_OPTIONAL_IMPORT_TYPES = new Set(["monsters"]);

const IMPORT_PACKS = {
  classes: "classes",
  subclasses: "subclasses",
  classFeatures: "class-features",
  items: "items",
  feats: "feats",
  spells: "spells",
  backgrounds: "backgrounds",
  races: "races",
  monsters: "monsters",
};

const NETHERSCROLLS_WORLD_IMPORT_PACKS = {
  classes: {
    name: "netherscrolls-classes",
    label: "Netherscrolls Classes",
    type: "Item",
    system: "dnd5e",
  },
  subclasses: {
    name: "netherscrolls-subclasses",
    label: "Netherscrolls Subclasses",
    type: "Item",
    system: "dnd5e",
  },
  classFeatures: {
    name: "netherscrolls-class-features",
    label: "Netherscrolls Class Features",
    type: "Item",
    system: "dnd5e",
  },
  items: {
    name: "netherscrolls-items",
    label: "Netherscrolls Items",
    type: "Item",
    system: "dnd5e",
  },
  feats: {
    name: "netherscrolls-feats",
    label: "Netherscrolls Feats",
    type: "Item",
    system: "dnd5e",
  },
  spells: {
    name: "netherscrolls-spells",
    label: "Netherscrolls Spells",
    type: "Item",
    system: "dnd5e",
  },
  backgrounds: {
    name: "netherscrolls-backgrounds",
    label: "Netherscrolls Backgrounds",
    type: "Item",
    system: "dnd5e",
  },
  races: {
    name: "netherscrolls-races",
    label: "Netherscrolls Races",
    type: "Item",
    system: "dnd5e",
  },
  // Pack name kept from the original definition so an existing world pack is reused.
  monsters: {
    name: "netherscrolls-monster",
    label: "Netherscrolls Monsters",
    type: "Actor",
    system: "dnd5e",
  },
};

// Sidebar banner for each Netherscrolls compendium, shipped in assets/banners/.
// Applied at runtime (never saved in the world), so a missing file shows no banner
// and replacing a file needs no migration.
const NETHERSCROLLS_IMPORT_PACK_BANNER_DIR = `modules/${MODULE_ID}/assets/banners`;

const NETHERSCROLLS_IMPORT_PACK_BANNERS = {
  classes: "classes.webp",
  subclasses: "classes.webp",
  classFeatures: "druid_progression.webp",
  items: "weapons.webp",
  feats: "feats_text.webp",
  spells: "magic_schools.webp",
  races: "races.webp",
  monsters: "dragon_battle.webp",
  backgrounds: "backgrounds.jpg",
};

const NETHERSCROLLS_IMPORT_PACK_OWNERSHIP = {
  PLAYER: "OBSERVER",
  TRUSTED: "OBSERVER",
  ASSISTANT: "OWNER",
  GAMEMASTER: "OWNER",
};

const NETHERSCROLLS_IMPORT_SIDEBAR_FOLDER = {
  name: "Netherscrolls",
  type: "Compendium",
  sorting: "m",
  sort: 0,
};

const NETHERSCROLLS_API_BASE = "https://api.netherscrolls.ca/api/foundry";

const NETHERSCROLLS_GUILDS_ENDPOINT = `${NETHERSCROLLS_API_BASE}/guilds`;

const NETHERSCROLLS_MEDIA_IMAGE_ENDPOINT = `${NETHERSCROLLS_API_BASE}/media/image`;

const NETHERSCROLLS_EXPORT_ENDPOINT = `${NETHERSCROLLS_API_BASE}/export`;

const NETHERSCROLLS_IMPORT_SELECTION_ENDPOINT = `${NETHERSCROLLS_API_BASE}/import/selection`;

const NETHERSCROLLS_SOURCES_ENDPOINT = `${NETHERSCROLLS_API_BASE}/import/sources`;

const NETHERSCROLLS_CAMPAIGNS_ENDPOINT = `${NETHERSCROLLS_API_BASE}/campaigns`;

const NETHERSCROLLS_SOURCE_IMPORT_ENDPOINT = `${NETHERSCROLLS_API_BASE}/import/source`;

const NETHERSCROLLS_IMPORT_QUEUE_POLL_INTERVAL_MS = 30_000;

const NETHERSCROLLS_IMPORT_QUEUE_IDLE_POLL_INTERVAL_MS = 30_000;

const NETHERSCROLLS_CAMPAIGN_CACHE_TTL_MS = 5 * 60_000;

const NETHERSCROLLS_CHARACTER_SELECTION_CACHE_TTL_MS = 5 * 60_000;

const NETHERSCROLLS_IMAGE_VALIDATION_CONCURRENCY = 6;

const NETHERSCROLLS_IMAGE_VALIDATION_TIMEOUT_MS = 15_000;

const NETHERSCROLLS_COMPENDIUM_WRITE_BATCH_SIZE = 50;

const NETHERSCROLLS_IMPORT_PREPARATION_FRAME_BUDGET_MS = 12;

const NETHERSCROLLS_FOUNDRY_CREATED_SOURCE_ID = "6a4b21868f309c84b6cb7908";

const NETHERSCROLLS_EXCLUDED_IMPORT_SOURCE_IDS = new Set([NETHERSCROLLS_FOUNDRY_CREATED_SOURCE_ID]);

const NETHERSCROLLS_SOURCE_NAME_FALLBACKS = new Map([
  [NETHERSCROLLS_FOUNDRY_CREATED_SOURCE_ID, "Foundry Export"],
]);

const NETHERSCROLLS_IMPORT_ENDPOINTS = {
  classes: `${NETHERSCROLLS_API_BASE}/import/classes`,
  items: `${NETHERSCROLLS_API_BASE}/import/items`,
  feats: `${NETHERSCROLLS_API_BASE}/import/feats`,
  spells: `${NETHERSCROLLS_API_BASE}/import/spells`,
  backgrounds: `${NETHERSCROLLS_API_BASE}/import/backgrounds`,
  races: `${NETHERSCROLLS_API_BASE}/import/races`,
  monsters: `${NETHERSCROLLS_API_BASE}/import/monsters`,
};

// Portrait the API uses for a monster without one (docs/api/29-foundry-monsters.md).
const NETHERSCROLLS_MONSTER_FALLBACK_IMAGE = "icons/svg/mystery-man.svg";

const NETHERSCROLLS_CHARACTER_FOLDER = {
  name: "NS-Character",
  type: "Actor",
  sorting: "m",
  sort: 0,
};

// Companion Actors are created in this folder, inside the character folder.
const NETHERSCROLLS_COMPANION_FOLDER = {
  name: "Companions",
  type: "Actor",
  sorting: "a",
};

const NETHERSCROLLS_DEFAULT_IMAGE = "https://i.postimg.cc/wBj0LZyj/image.png";

const NETHERSCROLLS_IMPORT_IMAGE = NETHERSCROLLS_DEFAULT_IMAGE;

const NETHERSCROLLS_PACK_FOLDER_INDEX_READY = Symbol("netherscrollsPackFolderIndexReady");

// GET /foundry/guilds, cached per API key. Guild permissions and modules can change
// on the server, so the list is refreshed after this delay or after a guild error.
const NETHERSCROLLS_GUILD_CACHE_TTL_MS = 60_000;

// API errors that mean the stored guild can no longer be used (cookbook reaction table).
const NETHERSCROLLS_GUILD_SELECTION_ERRORS = new Set([
  "GUILD_ID_INVALID",
  "GUILD_MEMBERSHIP_NOT_FOUND",
  "GUILD_NOT_SELECTED",
]);

const SETTINGS = {
  rerollInit: "rerollInitEachRound",
  npcDeathSave: "npcDeathSaveEachTurn",
  apiKey: "nsApiKey",
  guildId: "nsGuildId",
  guildName: "nsGuildName",
  libraryImportDates: "nsLibraryImportDatesV1",
  importFromNetherscroll: "importFromNetherscroll",
  exportButton: "showFoundryExportButton",
  importQueuePolling: "pollFoundryImportQueue",
  importQueuePollingSafetyReset: "pollFoundryImportQueueSafetyResetV1",
  importQueueCampaignIds: "foundryImportQueueCampaignIdsV1",
  debug: "debugMode",
  devEnhancedDamage: "devEnhancedDamage",
};

/** Retrieve import pack definition. */
function getNetherscrollsImportPackDefinition(typeKey) {
  return NETHERSCROLLS_WORLD_IMPORT_PACKS[typeKey] ?? null;
}

/** Retrieve import pack collection. */
function getNetherscrollsImportPackCollection(typeKey) {
  const definition = getNetherscrollsImportPackDefinition(typeKey);
  if (definition?.name) return `world.${definition.name}`;

  const packName = IMPORT_PACKS[typeKey] ?? typeKey;
  return `${MODULE_ID}.${packName}`;
}

export {
  ABILITY_KEYS,
  IMPORT_TYPES,
  MODULE_ID,
  NETHERSCROLLS_CAMPAIGNS_ENDPOINT,
  NETHERSCROLLS_CAMPAIGN_CACHE_TTL_MS,
  NETHERSCROLLS_CHARACTER_FOLDER,
  NETHERSCROLLS_COMPANION_FOLDER,
  NETHERSCROLLS_CHARACTER_SELECTION_CACHE_TTL_MS,
  NETHERSCROLLS_COMPENDIUM_WRITE_BATCH_SIZE,
  NETHERSCROLLS_DEFAULT_IMAGE,
  NETHERSCROLLS_EXCLUDED_IMPORT_SOURCE_IDS,
  NETHERSCROLLS_EXPORT_ENDPOINT,
  NETHERSCROLLS_GUILDS_ENDPOINT,
  NETHERSCROLLS_GUILD_CACHE_TTL_MS,
  NETHERSCROLLS_GUILD_SELECTION_ERRORS,
  NETHERSCROLLS_IMAGE_VALIDATION_CONCURRENCY,
  NETHERSCROLLS_IMAGE_VALIDATION_TIMEOUT_MS,
  NETHERSCROLLS_IMPORT_ENDPOINTS,
  NETHERSCROLLS_IMPORT_IMAGE,
  NETHERSCROLLS_IMPORT_PACK_BANNERS,
  NETHERSCROLLS_IMPORT_PACK_BANNER_DIR,
  NETHERSCROLLS_IMPORT_PACK_OWNERSHIP,
  NETHERSCROLLS_IMPORT_PREPARATION_FRAME_BUDGET_MS,
  NETHERSCROLLS_IMPORT_QUEUE_IDLE_POLL_INTERVAL_MS,
  NETHERSCROLLS_IMPORT_QUEUE_POLL_INTERVAL_MS,
  NETHERSCROLLS_IMPORT_SELECTION_ENDPOINT,
  NETHERSCROLLS_IMPORT_SIDEBAR_FOLDER,
  NETHERSCROLLS_MEDIA_IMAGE_ENDPOINT,
  NETHERSCROLLS_MONSTER_FALLBACK_IMAGE,
  NETHERSCROLLS_OPTIONAL_IMPORT_TYPES,
  NETHERSCROLLS_PACK_FOLDER_INDEX_READY,
  NETHERSCROLLS_SOURCES_ENDPOINT,
  NETHERSCROLLS_SOURCE_IMPORT_ENDPOINT,
  NETHERSCROLLS_SOURCE_NAME_FALLBACKS,
  NETHERSCROLLS_WORLD_IMPORT_PACKS,
  SETTINGS,
  getNetherscrollsImportPackCollection,
  getNetherscrollsImportPackDefinition,
};
