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
    key: "monster",
    label: "Monster",
    icon: "fa-solid fa-dragon",
    checked: false,
  },
];
const IMPORT_PACKS = {
  classes: "classes",
  classFeatures: "class-features",
  items: "items",
  feats: "feats",
  spells: "spells",
  monster: "monster",
};
const NETHERSCROLLS_WORLD_IMPORT_PACKS = {
  classes: {
    name: "netherscrolls-classes",
    label: "Netherscrolls Classes",
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
  monster: {
    name: "netherscrolls-monster",
    label: "Netherscrolls Monster",
    type: "Actor",
    system: "dnd5e",
  },
};
const NETHERSCROLLS_IMPORT_PACK_OWNERSHIP = {
  PLAYER: "OBSERVER",
  TRUSTED: "OBSERVER",
  ASSISTANT: "OWNER",
  GAMEMASTER: "OWNER",
};
const NETHERSCROLLS_API_BASE = "https://api.netherscrolls.ca/api/foundry";
const SYNC_ENDPOINT = `${NETHERSCROLLS_API_BASE}/sync`;
const NETHERSCROLLS_IMPORT_ENDPOINTS = {
  classes: `${NETHERSCROLLS_API_BASE}/import/classes`,
  items: `${NETHERSCROLLS_API_BASE}/import/items`,
  feats: `${NETHERSCROLLS_API_BASE}/import/feats`,
  spells: `${NETHERSCROLLS_API_BASE}/import/spells`,
};
const NETHERSCROLLS_DEFAULT_IMAGE = "https://i.postimg.cc/wBj0LZyj/image.png";
const NETHERSCROLLS_IMPORT_IMAGE = NETHERSCROLLS_DEFAULT_IMAGE;
const NETHERSCROLLS_GENERIC_IMAGE_PATHS = new Set([
  "icons/svg/item-bag.svg",
  "systems/dnd5e/icons/svg/items/equipment.svg",
  "systems/dnd5e/icons/svg/items/feature.svg",
  "systems/dnd5e/icons/svg/items/loot.svg",
  "systems/dnd5e/icons/svg/items/spell.svg",
  "systems/dnd5e/icons/svg/items/tool.svg",
]);
const NETHERSCROLLS_VALID_IMAGE_EXTENSIONS = new Set([
  "apng",
  "avif",
  "bmp",
  "gif",
  "jpeg",
  "jpg",
  "png",
  "svg",
  "webp",
]);
const NETHERSCROLLS_MAX_SPELL_LEVEL = 15;
const NETHERSCROLLS_ITEM_FOLDERS = [
  { type: "weapon", label: "Weapons", sort: 1000 },
  { type: "equipment", label: "Equipment", sort: 2000 },
  { type: "consumable", label: "Consumables", sort: 3000 },
  { type: "tool", label: "Tools", sort: 4000 },
  { type: "container", label: "Containers", sort: 5000 },
  { type: "loot", label: "Loot", sort: 6000 },
];
const NETHERSCROLLS_FEAT_FOLDERS = [
  { key: "feat", label: "Feats", sort: 1000 },
  { key: "demifeat", label: "Demifeats", sort: 2000 },
];
const NETHERSCROLLS_SPELL_LEVEL_FOLDERS = Array.from(
  { length: NETHERSCROLLS_MAX_SPELL_LEVEL + 1 },
  (_value, level) => ({
    level,
    label: `Level${level}`,
    sort: (level + 1) * 1000,
  })
);
const NETHERSCROLLS_SPELL_SCHOOLS = [
  { key: "abj", label: "Abjuration", aliases: ["abjuration"], sort: 1000 },
  { key: "con", label: "Conjuration", aliases: ["conjuration"], sort: 2000 },
  { key: "div", label: "Divination", aliases: ["divination"], sort: 3000 },
  { key: "enc", label: "Enchantment", aliases: ["enchantment"], sort: 4000 },
  { key: "evo", label: "Evocation", aliases: ["evocation"], sort: 5000 },
  { key: "ill", label: "Illusion", aliases: ["illusion"], sort: 6000 },
  { key: "nec", label: "Necromancy", aliases: ["necromancy"], sort: 7000 },
  { key: "trs", label: "Transmutation", aliases: ["transmutation", "tra"], sort: 8000 },
];
const NETHERSCROLLS_UNKNOWN_SPELL_SCHOOL = {
  key: "unknown",
  label: "Unsorted",
  aliases: [],
  sort: 9000,
};
const NETHERSCROLLS_ABILITY_LABELS = {
  str: ["str", "strength"],
  dex: ["dex", "dexterity"],
  con: ["con", "constitution"],
  int: ["int", "intelligence"],
  wis: ["wis", "wisdom"],
  cha: ["cha", "charisma"],
  hon: ["hon", "honor", "honour"],
  san: ["san", "sanity"],
};
const NETHERSCROLLS_DAMAGE_TYPES = [
  "acid",
  "bludgeoning",
  "cold",
  "fire",
  "force",
  "lightning",
  "necrotic",
  "piercing",
  "poison",
  "psychic",
  "radiant",
  "slashing",
  "thunder",
];
const NETHERSCROLLS_ITEM_TYPES = new Set([
  "weapon",
  "equipment",
  "consumable",
  "tool",
  "container",
  "loot",
]);
const NETHERSCROLLS_ITEM_RARITIES = new Set([
  "common",
  "uncommon",
  "rare",
  "veryRare",
  "legendary",
  "artifact",
]);
const NETHERSCROLLS_ITEM_VALID_PROPERTIES = {
  weapon: new Set(["ada", "amm", "fin", "fir", "foc", "hvy", "lgt", "lod", "mgc", "rch", "rel", "ret", "sil", "spc", "thr", "two", "ver"]),
  equipment: new Set(["ada", "foc", "mgc", "stealthDisadvantage"]),
  consumable: new Set(["ada", "amm", "foc", "mgc", "ret", "sil"]),
  tool: new Set(["foc", "mgc"]),
  container: new Set(["mgc", "weightlessContents"]),
  loot: new Set(["mgc"]),
};
const NETHERSCROLLS_ITEM_PROPERTY_ALIASES = {
  adamantine: "ada",
  ada: "ada",
  ammunition: "amm",
  ammo: "amm",
  amm: "amm",
  finesse: "fin",
  fin: "fin",
  firearm: "fir",
  fir: "fir",
  focus: "foc",
  foc: "foc",
  heavy: "hvy",
  hvy: "hvy",
  light: "lgt",
  lgt: "lgt",
  loading: "lod",
  lod: "lod",
  magic: "mgc",
  magical: "mgc",
  mgc: "mgc",
  reach: "rch",
  rch: "rch",
  reload: "rel",
  rel: "rel",
  returning: "ret",
  ret: "ret",
  silver: "sil",
  silvered: "sil",
  sil: "sil",
  special: "spc",
  spc: "spc",
  "stealth disadvantage": "stealthDisadvantage",
  stealthdisadvantage: "stealthDisadvantage",
  thrown: "thr",
  thr: "thr",
  "two handed": "two",
  "two-handed": "two",
  twohanded: "two",
  two: "two",
  versatile: "ver",
  ver: "ver",
  weightless: "weightlessContents",
  "weightless contents": "weightlessContents",
  weightlesscontents: "weightlessContents",
};
const NETHERSCROLLS_WEAPON_TYPE_BY_NAME = {
  battleaxe: "martialM",
  blowgun: "martialR",
  club: "simpleM",
  dagger: "simpleM",
  dart: "simpleR",
  flail: "martialM",
  glaive: "martialM",
  greataxe: "martialM",
  greatclub: "simpleM",
  greatsword: "martialM",
  halberd: "martialM",
  handaxe: "simpleM",
  "hand crossbow": "martialR",
  "heavy crossbow": "martialR",
  javelin: "simpleM",
  lance: "martialM",
  "light crossbow": "simpleR",
  "light hammer": "simpleM",
  longbow: "martialR",
  longsword: "martialM",
  mace: "simpleM",
  maul: "martialM",
  morningstar: "martialM",
  musket: "martialR",
  net: "martialR",
  pike: "martialM",
  pistol: "martialR",
  quarterstaff: "simpleM",
  rapier: "martialM",
  scimitar: "martialM",
  shortbow: "simpleR",
  shortsword: "martialM",
  sickle: "simpleM",
  sling: "simpleR",
  spear: "simpleM",
  trident: "martialM",
  "war pick": "martialM",
  warhammer: "martialM",
  warpick: "martialM",
  whip: "martialM",
};
const NETHERSCROLLS_WEAPON_BASE_DATA_BY_NAME = {
  battleaxe: {
    type: "martialM",
    baseItem: "battleaxe",
    damage: "1d8",
    versatileDamage: "1d10",
    damageType: "slashing",
    properties: ["ver"],
    range: { reach: 5 },
  },
  blowgun: {
    type: "martialR",
    baseItem: "blowgun",
    damage: "1",
    damageType: "piercing",
    properties: ["amm", "lod"],
    range: { value: 25, long: 100 },
  },
  club: {
    type: "simpleM",
    baseItem: "club",
    damage: "1d4",
    damageType: "bludgeoning",
    properties: ["lgt"],
    range: { reach: 5 },
  },
  dagger: {
    type: "simpleM",
    baseItem: "dagger",
    damage: "1d4",
    damageType: "piercing",
    properties: ["fin", "lgt", "thr"],
    range: { value: 20, long: 60, reach: 5 },
  },
  dart: {
    type: "simpleR",
    baseItem: "dart",
    damage: "1d4",
    damageType: "piercing",
    properties: ["fin", "thr"],
    range: { value: 20, long: 60 },
  },
  flail: {
    type: "martialM",
    baseItem: "flail",
    damage: "1d8",
    damageType: "bludgeoning",
    range: { reach: 5 },
  },
  glaive: {
    type: "martialM",
    baseItem: "glaive",
    damage: "1d10",
    damageType: "slashing",
    properties: ["hvy", "rch", "two"],
    range: { reach: 10 },
  },
  greataxe: {
    type: "martialM",
    baseItem: "greataxe",
    damage: "1d12",
    damageType: "slashing",
    properties: ["hvy", "two"],
    range: { reach: 5 },
  },
  greatclub: {
    type: "simpleM",
    baseItem: "greatclub",
    damage: "1d8",
    damageType: "bludgeoning",
    properties: ["two"],
    range: { reach: 5 },
  },
  greatsword: {
    type: "martialM",
    baseItem: "greatsword",
    damage: "2d6",
    damageType: "slashing",
    properties: ["hvy", "two"],
    range: { reach: 5 },
  },
  halberd: {
    type: "martialM",
    baseItem: "halberd",
    damage: "1d10",
    damageType: "slashing",
    properties: ["hvy", "rch", "two"],
    range: { reach: 10 },
  },
  handaxe: {
    type: "simpleM",
    baseItem: "handaxe",
    damage: "1d6",
    damageType: "slashing",
    properties: ["lgt", "thr"],
    range: { value: 20, long: 60, reach: 5 },
  },
  "hand crossbow": {
    type: "martialR",
    baseItem: "handcrossbow",
    damage: "1d6",
    damageType: "piercing",
    properties: ["amm", "lgt", "lod"],
    range: { value: 30, long: 120 },
  },
  "heavy crossbow": {
    type: "martialR",
    baseItem: "heavycrossbow",
    damage: "1d10",
    damageType: "piercing",
    properties: ["amm", "hvy", "lod", "two"],
    range: { value: 100, long: 400 },
  },
  javelin: {
    type: "simpleM",
    baseItem: "javelin",
    damage: "1d6",
    damageType: "piercing",
    properties: ["thr"],
    range: { value: 30, long: 120, reach: 5 },
  },
  lance: {
    type: "martialM",
    baseItem: "lance",
    damage: "1d12",
    damageType: "piercing",
    properties: ["rch", "spc"],
    range: { reach: 10 },
  },
  "light crossbow": {
    type: "simpleR",
    baseItem: "lightcrossbow",
    damage: "1d8",
    damageType: "piercing",
    properties: ["amm", "lod", "two"],
    range: { value: 80, long: 320 },
  },
  "light hammer": {
    type: "simpleM",
    baseItem: "lighthammer",
    damage: "1d4",
    damageType: "bludgeoning",
    properties: ["lgt", "thr"],
    range: { value: 20, long: 60, reach: 5 },
  },
  longbow: {
    type: "martialR",
    baseItem: "longbow",
    damage: "1d8",
    damageType: "piercing",
    properties: ["amm", "hvy", "two"],
    range: { value: 150, long: 600 },
  },
  longsword: {
    type: "martialM",
    baseItem: "longsword",
    damage: "1d8",
    versatileDamage: "1d10",
    damageType: "slashing",
    properties: ["ver"],
    range: { reach: 5 },
  },
  mace: {
    type: "simpleM",
    baseItem: "mace",
    damage: "1d6",
    damageType: "bludgeoning",
    range: { reach: 5 },
  },
  maul: {
    type: "martialM",
    baseItem: "maul",
    damage: "2d6",
    damageType: "bludgeoning",
    properties: ["hvy", "two"],
    range: { reach: 5 },
  },
  morningstar: {
    type: "martialM",
    baseItem: "morningstar",
    damage: "1d8",
    damageType: "piercing",
    range: { reach: 5 },
  },
  musket: {
    type: "martialR",
    baseItem: "musket",
    damage: "1d12",
    damageType: "piercing",
    properties: ["amm", "lod", "two"],
    range: { value: 40, long: 120 },
  },
  net: {
    type: "martialR",
    baseItem: "net",
    properties: ["spc", "thr"],
    range: { value: 5, long: 15 },
  },
  pike: {
    type: "martialM",
    baseItem: "pike",
    damage: "1d10",
    damageType: "piercing",
    properties: ["hvy", "rch", "two"],
    range: { reach: 10 },
  },
  pistol: {
    type: "martialR",
    baseItem: "pistol",
    damage: "1d10",
    damageType: "piercing",
    properties: ["amm", "lod"],
    range: { value: 30, long: 90 },
  },
  quarterstaff: {
    type: "simpleM",
    baseItem: "quarterstaff",
    damage: "1d6",
    versatileDamage: "1d8",
    damageType: "bludgeoning",
    properties: ["ver"],
    range: { reach: 5 },
  },
  rapier: {
    type: "martialM",
    baseItem: "rapier",
    damage: "1d8",
    damageType: "piercing",
    properties: ["fin"],
    range: { reach: 5 },
  },
  scimitar: {
    type: "martialM",
    baseItem: "scimitar",
    damage: "1d6",
    damageType: "slashing",
    properties: ["fin", "lgt"],
    range: { reach: 5 },
  },
  shortbow: {
    type: "simpleR",
    baseItem: "shortbow",
    damage: "1d6",
    damageType: "piercing",
    properties: ["amm", "two"],
    range: { value: 80, long: 320 },
  },
  shortsword: {
    type: "martialM",
    baseItem: "shortsword",
    damage: "1d6",
    damageType: "piercing",
    properties: ["fin", "lgt"],
    range: { reach: 5 },
  },
  sickle: {
    type: "simpleM",
    baseItem: "sickle",
    damage: "1d4",
    damageType: "slashing",
    properties: ["lgt"],
    range: { reach: 5 },
  },
  sling: {
    type: "simpleR",
    baseItem: "sling",
    damage: "1d4",
    damageType: "bludgeoning",
    properties: ["amm"],
    range: { value: 30, long: 120 },
  },
  spear: {
    type: "simpleM",
    baseItem: "spear",
    damage: "1d6",
    versatileDamage: "1d8",
    damageType: "piercing",
    properties: ["thr", "ver"],
    range: { value: 20, long: 60, reach: 5 },
  },
  trident: {
    type: "martialM",
    baseItem: "trident",
    damage: "1d6",
    versatileDamage: "1d8",
    damageType: "piercing",
    properties: ["thr", "ver"],
    range: { value: 20, long: 60, reach: 5 },
  },
  "war pick": {
    type: "martialM",
    baseItem: "warpick",
    damage: "1d8",
    damageType: "piercing",
    range: { reach: 5 },
  },
  warpick: {
    type: "martialM",
    baseItem: "warpick",
    damage: "1d8",
    damageType: "piercing",
    range: { reach: 5 },
  },
  warhammer: {
    type: "martialM",
    baseItem: "warhammer",
    damage: "1d8",
    versatileDamage: "1d10",
    damageType: "bludgeoning",
    properties: ["ver"],
    range: { reach: 5 },
  },
  whip: {
    type: "martialM",
    baseItem: "whip",
    damage: "1d4",
    damageType: "slashing",
    properties: ["fin", "rch"],
    range: { reach: 10 },
  },
};
const NETHERSCROLLS_ARMOR_BASE_DATA_BY_NAME = {
  breastplate: {
    type: "medium",
    baseItem: "breastplate",
    ac: 14,
    dex: 2,
  },
  "chain mail": {
    type: "heavy",
    baseItem: "chainmail",
    ac: 16,
    dex: 0,
    strength: 13,
    properties: ["stealthDisadvantage"],
  },
  "chain shirt": {
    type: "medium",
    baseItem: "chainshirt",
    ac: 13,
    dex: 2,
  },
  "half plate": {
    type: "medium",
    baseItem: "halfplate",
    ac: 15,
    dex: 2,
    properties: ["stealthDisadvantage"],
  },
  hide: {
    type: "medium",
    baseItem: "hide",
    ac: 12,
    dex: 2,
  },
  leather: {
    type: "light",
    baseItem: "leather",
    ac: 11,
  },
  padded: {
    type: "light",
    baseItem: "padded",
    ac: 11,
    properties: ["stealthDisadvantage"],
  },
  plate: {
    type: "heavy",
    baseItem: "plate",
    ac: 18,
    dex: 0,
    strength: 15,
    properties: ["stealthDisadvantage"],
  },
  "ring mail": {
    type: "heavy",
    baseItem: "ringmail",
    ac: 14,
    dex: 0,
    properties: ["stealthDisadvantage"],
  },
  "scale mail": {
    type: "medium",
    baseItem: "scalemail",
    ac: 14,
    dex: 2,
    properties: ["stealthDisadvantage"],
  },
  shield: {
    type: "shield",
    baseItem: "shield",
    ac: 2,
  },
  splint: {
    type: "heavy",
    baseItem: "splint",
    ac: 17,
    dex: 0,
    strength: 15,
    properties: ["stealthDisadvantage"],
  },
  "studded leather": {
    type: "light",
    baseItem: "studded",
    ac: 12,
  },
};
const NETHERSCROLLS_NUMBER_WORDS = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};
const SKILL_KEY_TO_NAME = {
  acr: "acrobatics",
  ani: "animalHandling",
  arc: "arcana",
  ath: "athletics",
  dec: "deception",
  his: "history",
  ins: "insight",
  itm: "intimidation",
  inv: "investigation",
  med: "medicine",
  nat: "nature",
  prc: "perception",
  prf: "performance",
  per: "persuasion",
  rel: "religion",
  slt: "sleightOfHand",
  ste: "stealth",
  sur: "survival",
};
const NETHERSCROLLS_SKILL_LABELS = {
  acrobatics: "acr",
  animalhandling: "ani",
  "animal handling": "ani",
  arcana: "arc",
  athletics: "ath",
  deception: "dec",
  history: "his",
  insight: "ins",
  intimidation: "itm",
  investigation: "inv",
  medicine: "med",
  nature: "nat",
  perception: "prc",
  performance: "prf",
  persuasion: "per",
  religion: "rel",
  sleightofhand: "slt",
  "sleight of hand": "slt",
  stealth: "ste",
  survival: "sur",
};
const NETHERSCROLLS_ARMOR_TRAIT_ALIASES = {
  lgt: "armor:lgt",
  light: "armor:lgt",
  "light armor": "armor:lgt",
  med: "armor:med",
  medium: "armor:med",
  "medium armor": "armor:med",
  hvy: "armor:hvy",
  heavy: "armor:hvy",
  "heavy armor": "armor:hvy",
  shl: "armor:shl",
  shield: "armor:shl",
  shields: "armor:shl",
};
const NETHERSCROLLS_WEAPON_TRAIT_ALIASES = {
  sim: "weapon:sim",
  simple: "weapon:sim",
  "simple weapon": "weapon:sim",
  "simple weapons": "weapon:sim",
  mar: "weapon:mar",
  martial: "weapon:mar",
  "martial weapon": "weapon:mar",
  "martial weapons": "weapon:mar",
};
const NETHERSCROLLS_TOOL_TRAIT_ALIASES = {
  "alchemist's supplies": "tool:alchemist",
  "brewer's supplies": "tool:brewer",
  "calligrapher's supplies": "tool:calligrapher",
  "carpenter's tools": "tool:carpenter",
  "cartographer's tools": "tool:cartographer",
  "cobbler's tools": "tool:cobbler",
  "cook's utensils": "tool:cook",
  "disguise kit": "tool:disg",
  "forgery kit": "tool:forg",
  "gaming set": "tool:game:*",
  "herbalism kit": "tool:herb",
  "jeweler's tools": "tool:jeweler",
  "land vehicles": "tool:vehicle:land",
  "mason's tools": "tool:mason",
  "musical instrument": "tool:music:*",
  "navigator's tools": "tool:navg",
  "painter's supplies": "tool:painter",
  "poisoner's kit": "tool:pois",
  "potter's tools": "tool:potter",
  "smith's tools": "tool:smith",
  "thieves' tools": "tool:thief",
  "tinker's tools": "tool:tinker",
  "water vehicles": "tool:vehicle:water",
  "weaver's tools": "tool:weaver",
  "woodcarver's tools": "tool:woodcarver",
};
const SETTINGS = {
  rerollInit: "rerollInitEachRound",
  npcDeathSave: "npcDeathSaveEachTurn",
  apiKey: "nsApiKey",
  importFromNetherscroll: "importFromNetherscroll",
  syncButton: "showSyncButton",
  debug: "debugMode",
  devEnhancedDamage: "devEnhancedDamage",
};

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, SETTINGS.rerollInit, {
    name: "Reroll initiative each round",
    hint: "When a new combat round starts, reset and reroll all initiatives.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: (value) => toggleRerollInitHook(Boolean(value)),
  });

  game.settings.register(MODULE_ID, SETTINGS.npcDeathSave, {
    name: "NPC death save each turn",
    hint: "When an NPC at 0 HP starts its turn, roll a death save (with CON save).",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: (value) => toggleNpcDeathSaveHook(Boolean(value)),
  });

  game.settings.register(MODULE_ID, SETTINGS.apiKey, {
    name: "Netherscrolls API Key",
    hint: "Paste your API key here. This is stored in the world settings and only editable by GMs.",
    scope: "world",
    config: true,
    restricted: true,
    type: String,
    default: "",
  });

  game.settings.registerMenu(MODULE_ID, SETTINGS.importFromNetherscroll, {
    name: "Import from Netherscroll [EXPERIMENTAL]",
    label: "Open Importer",
    hint: "Import classes, items, spells, and monsters from the Netherscroll website.",
    icon: "fa-solid fa-cloud-arrow-down",
    type: NetherscrollsImportSettings,
    restricted: true,
  });

  game.settings.register(MODULE_ID, SETTINGS.syncButton, {
    name: "Sync button",
    hint: "Show the sync button on actor sheets.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => rerenderActorSheets(),
  });

  game.settings.register(MODULE_ID, SETTINGS.debug, {
    name: "Debug mode",
    hint: "Show sync request/response payloads in chat.",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(MODULE_ID, SETTINGS.devEnhancedDamage, {
    name: "[DEV] enhanced damage",
    hint: "Developer toggle for enhanced damage behavior.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });
});

const NetherscrollsImportSettings = createNetherscrollsImportSettingsClass();

function createNetherscrollsImportSettingsClass() {
  const applicationApi = globalThis.foundry?.applications?.api;
  const ApplicationV2 = applicationApi?.ApplicationV2;
  const HandlebarsApplicationMixin = applicationApi?.HandlebarsApplicationMixin;

  if (ApplicationV2 && HandlebarsApplicationMixin) {
    const HandlebarsApplication = HandlebarsApplicationMixin(ApplicationV2);

    return class NetherscrollsImportSettingsV2 extends HandlebarsApplication {
      static DEFAULT_OPTIONS = {
        id: "netherscrolls-import-settings",
        classes: ["netherscrolls-import-window"],
        window: {
          title: "Import from Netherscroll [EXPERIMENTAL]",
        },
        position: {
          width: 520,
          height: "auto",
        },
      };

      static PARTS = {
        form: {
          template: `modules/${MODULE_ID}/templates/import-from-netherscroll.hbs`,
        },
      };

      async _prepareContext(options) {
        const context = await super._prepareContext(options);
        return getNetherscrollsImportSettingsContext(context);
      }

      async _onRender(context, options) {
        await super._onRender(context, options);
        activateNetherscrollsImportSettingsListeners(
          this.element,
          handleNetherscrollsImportSettingsSubmitEvent
        );
      }
    };
  }

  if (ApplicationV2) {
    return class NetherscrollsImportSettingsV2 extends ApplicationV2 {
      static DEFAULT_OPTIONS = {
        id: "netherscrolls-import-settings",
        classes: ["netherscrolls-import-window"],
        window: {
          title: "Import from Netherscroll [EXPERIMENTAL]",
        },
        position: {
          width: 520,
          height: "auto",
        },
      };

      async _prepareContext(options) {
        const context = await super._prepareContext(options);
        return getNetherscrollsImportSettingsContext(context);
      }

      async _renderHTML(context, _options) {
        const html = await renderTemplate(
          `modules/${MODULE_ID}/templates/import-from-netherscroll.hbs`,
          context
        );
        const template = document.createElement("template");
        template.innerHTML = String(html ?? "").trim();
        return template.content;
      }

      _replaceHTML(result, content, _options) {
        content.replaceChildren(result);
      }

      async _onRender(context, options) {
        await super._onRender(context, options);
        activateNetherscrollsImportSettingsListeners(
          this.element,
          handleNetherscrollsImportSettingsSubmitEvent
        );
      }
    };
  }

  const FormApplicationClass =
    globalThis.FormApplication ?? globalThis.foundry?.appv1?.api?.FormApplication;

  return class NetherscrollsImportSettingsV1 extends FormApplicationClass {
    static get defaultOptions() {
      const options = {
        id: "netherscrolls-import-settings",
        title: "Import from Netherscroll [EXPERIMENTAL]",
        template: `modules/${MODULE_ID}/templates/import-from-netherscroll.hbs`,
        classes: ["netherscrolls-import-window"],
        width: 520,
        height: "auto",
        submitOnChange: false,
        closeOnSubmit: false,
      };
      return foundry?.utils?.mergeObject
        ? foundry.utils.mergeObject(super.defaultOptions, options)
        : { ...(super.defaultOptions ?? {}), ...options };
    }

    getData(options) {
      const context = super.getData(options) ?? {};
      return getNetherscrollsImportSettingsContext(context);
    }

    activateListeners(html) {
      super.activateListeners(html);
      activateNetherscrollsImportSettingsListeners(html);
    }

    async _updateObject(_event, formData) {
      await submitNetherscrollsImportSettings(formData);
    }
  };
}

function getNetherscrollsImportSettingsContext(context = {}) {
  const apiKey = getNetherscrollsApiKey();
  const today = new Date().toISOString().slice(0, 10);

  return {
    ...context,
    hasApiKey: Boolean(apiKey),
    importTypes: IMPORT_TYPES,
    defaultSinceDate: today,
  };
}

function activateNetherscrollsImportSettingsListeners(html, submitHandler = null) {
  const root = html?.[0] ?? html;
  const form = root?.matches?.("form") ? root : root?.querySelector?.("form");
  const listenerRoot = form ?? root;

  if (root === form || root?.classList?.contains("window-content")) {
    root?.classList?.add("ns-import-form");
  }
  form?.classList?.add("ns-import-form");

  const sinceCheckbox = listenerRoot?.querySelector?.('[name="sinceEnabled"]');
  const sinceDate = listenerRoot?.querySelector?.('[name="sinceDate"]');
  const sincePanel = listenerRoot?.querySelector?.(".ns-import-since-panel");

  const updateSinceState = () => {
    if (!sinceCheckbox || !sinceDate) return;
    const enabled = Boolean(sinceCheckbox.checked);
    sinceDate.disabled = !enabled;
    sincePanel?.classList?.toggle("is-since-enabled", enabled);
  };

  sinceCheckbox?.addEventListener?.("change", updateSinceState);
  updateSinceState();

  if (!submitHandler || !form || form.dataset.netherscrollsImportSubmitBound === "1") {
    return;
  }

  form.dataset.netherscrollsImportSubmitBound = "1";
  form.addEventListener("submit", submitHandler);
}

async function handleNetherscrollsImportSettingsSubmitEvent(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();

  const form = event?.currentTarget;
  const submitter = event?.submitter;
  const submitButton = submitter?.matches?.('button[type="submit"]')
    ? submitter
    : form?.querySelector?.('button[type="submit"]');

  if (submitButton) submitButton.disabled = true;
  try {
    await submitNetherscrollsImportSettings(getNetherscrollsFormDataObject(form));
  } catch (err) {
    console.error(`${MODULE_ID} | Netherscrolls import form submit failed.`, err);
    ui?.notifications?.error?.(`Netherscrolls import failed: ${err?.message ?? err}`);
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

async function submitNetherscrollsImportSettings(formData) {
  const apiKey = getNetherscrollsApiKey();
  if (!apiKey) {
    ui?.notifications?.warn?.(
      "Netherscrolls API Key is missing. Set it in Module Settings."
    );
    return;
  }

  const selectedTypes = IMPORT_TYPES.filter((type) =>
    isImportTypeSelected(formData, type.key)
  );
  if (!selectedTypes.length) {
    ui?.notifications?.warn?.("Select at least one Netherscroll import type.");
    return;
  }

  const sinceEnabled = Boolean(formData?.sinceEnabled);
  const sinceDate = String(formData?.sinceDate ?? "").trim();
  if (sinceEnabled && !sinceDate) {
    ui?.notifications?.warn?.("Choose a date or disable Since.");
    return;
  }

  const since = sinceEnabled ? normalizeNetherscrollsSinceDate(sinceDate) : null;
  if (sinceEnabled && !since) {
    ui?.notifications?.warn?.("Choose a valid Since date.");
    return;
  }

  const requests = buildNetherscrollsImportRequests({
    apiKey,
    selectedTypes,
    sinceDate: since,
  });
  const destinationPlan = buildNetherscrollsImportDestinationPlan(selectedTypes);
  if (isDebugEnabled()) {
    console.info(`${MODULE_ID} | Netherscrolls import requests prepared.`, {
      requests: requests.map(sanitizeNetherscrollsImportRequest),
      destinations: destinationPlan,
    });
  }

  const unsupportedTypes = selectedTypes.filter(
    (type) => !NETHERSCROLLS_IMPORT_ENDPOINTS[type.key]
  );
  if (unsupportedTypes.length) {
    const labels = unsupportedTypes.map((type) => type.label.toLowerCase()).join(", ");
    ui?.notifications?.warn?.(`Import endpoint not configured yet for: ${labels}.`);
  }

  let importedAny = false;
  for (const request of requests) {
    try {
      const response = await sendNetherscrollsImportRequest(request);
      const result = await applyNetherscrollsImportResponse(response, request.typeKey);
      importedAny = true;
      ui?.notifications?.info?.(formatNetherscrollsImportResult(request.typeKey, result));
    } catch (err) {
      console.error(`${MODULE_ID} | Netherscrolls ${request.typeKey} import failed.`, err);
      ui?.notifications?.error?.(
        `Netherscrolls ${getNetherscrollsImportTypeLabel(request.typeKey)} import failed: ${err?.message ?? err}`
      );
    }
  }
  if (importedAny) {
    return;
  }

  const range = sinceEnabled ? `since ${sinceDate}` : "since forever";
  const labels = selectedTypes.map((type) => type.label.toLowerCase()).join(", ");
  ui?.notifications?.info?.(
    `Netherscrolls import request prepared: ${labels} ${range}.`
  );
}

Hooks.once("ready", () => {
  toggleRerollInitHook(game.settings.get(MODULE_ID, SETTINGS.rerollInit) === true);
  toggleNpcDeathSaveHook(game.settings.get(MODULE_ID, SETTINGS.npcDeathSave) === true);
  initEnhanceDialogInputHandlers();
  initChatNumberActionHandlers();
});

Hooks.on("renderApplicationV1", (app, html) => {
  injectSyncButtonV1(app, html);
});

Hooks.on("renderApplicationV2", (app, element) => {
  injectSyncButtonV2(app, element);
});

Hooks.on("renderActorSheet", (app, html) => {
  injectSyncButtonV1(app, html);
});

Hooks.on("renderActorSheetV2", (app, html) => {
  injectSyncButtonV2(app, html);
});

Hooks.on("createItem", (item) => {
  queueNetherscrollsClassFeatureRepairForItem(item, { delay: 100 });
});

Hooks.on("updateItem", (item, changes) => {
  if (!isNetherscrollsClassRepairUpdate(changes)) return;
  queueNetherscrollsClassFeatureRepairForItem(item, { delay: 100 });
});

Hooks.on("getChatLogEntryContext", (_html, options) => {
  registerEnhancedDamageContextOption(options);
});
Hooks.on("getChatMessageContextOptions", (_app, options) => {
  registerEnhancedDamageContextOption(options);
});
Hooks.on("getDocumentContextOptions", (app, options) => {
  if (!isChatContextApplication(app)) return;
  registerEnhancedDamageContextOption(options);
});

let rerollInitHandler = null;
let npcDeathSaveHandler = null;
let enhanceDialogInputHandlersBound = false;
let chatNumberActionHandlersBound = false;
let chatNumberActionToolbar = null;
const netherscrollsClassFeatureRepairTimers = new Map();

function rerenderActorSheets() {
  const apps = Object.values(ui?.windows ?? {});
  for (const app of apps) {
    if (app?.actor || app?.document?.documentName === "Actor") {
      app.render(false);
    }
  }
}

function isSyncButtonEnabled() {
  return Boolean(game?.settings?.get(MODULE_ID, SETTINGS.syncButton));
}

function isDebugEnabled() {
  return Boolean(game?.settings?.get(MODULE_ID, SETTINGS.debug));
}

function isEnhancedDamageEnabled() {
  return Boolean(game?.settings?.get(MODULE_ID, SETTINGS.devEnhancedDamage));
}

function getNetherscrollsApiKey() {
  return String(game?.settings?.get(MODULE_ID, SETTINGS.apiKey) ?? "").trim();
}

function getNetherscrollsFormDataObject(form, formData) {
  if (formData?.object && typeof formData.object === "object") return formData.object;

  const source = formData instanceof FormData ? formData : new FormData(form);
  return Object.fromEntries(source.entries());
}

function isImportTypeSelected(formData, key) {
  return Boolean(formData?.[`importTypes.${key}`] ?? formData?.importTypes?.[key]);
}

function normalizeNetherscrollsSinceDate(value) {
  const raw = toTrimmedStringOrNull(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function buildNetherscrollsImportRequests({ apiKey, selectedTypes, sinceDate }) {
  return selectedTypes
    .map((type) =>
      buildNetherscrollsImportRequest({
        apiKey,
        typeKey: type.key,
        sinceDate,
      })
    )
    .filter(Boolean);
}

function buildNetherscrollsImportRequest({ apiKey, typeKey, sinceDate }) {
  const endpoint = NETHERSCROLLS_IMPORT_ENDPOINTS[typeKey];
  if (!endpoint) return null;

  const url = new URL(endpoint);
  if (sinceDate) url.searchParams.set("since", sinceDate);

  return {
    typeKey,
    url: url.toString(),
    options: {
      method: "GET",
      headers: {
        Accept: "application/json",
        "x-api-key": apiKey,
      },
    },
    payload: {
      dataset: typeKey,
      since: sinceDate || null,
    },
  };
}

function sanitizeNetherscrollsImportRequest(request) {
  return {
    ...request,
    options: {
      ...request.options,
      headers: {
        ...request.options?.headers,
        "x-api-key": request.options?.headers?.["x-api-key"] ? "<redacted>" : "",
      },
    },
  };
}

function buildNetherscrollsImportDestinationPlan(selectedTypes) {
  const destinations = {};
  for (const type of selectedTypes) {
    destinations[type.key] = {
      pack: getNetherscrollsImportPackCollection(type.key),
      defaultImage: NETHERSCROLLS_DEFAULT_IMAGE,
    };
  }

  if (destinations.spells) {
    destinations.spells.folderRule = "Spells / Level{level} / {school}";
    destinations.spells.levels = NETHERSCROLLS_SPELL_LEVEL_FOLDERS.map(
      (level) => level.label
    );
    destinations.spells.schools = NETHERSCROLLS_SPELL_SCHOOLS.map(
      (school) => school.label
    );
  }

  if (destinations.items) {
    destinations.items.folderRule = "Items / {type}";
    destinations.items.types = NETHERSCROLLS_ITEM_FOLDERS.map((folder) => folder.label);
  }

  if (destinations.feats) {
    destinations.feats.folderRule = "Feats / {feat|demifeat}";
    destinations.feats.types = NETHERSCROLLS_FEAT_FOLDERS.map((folder) => folder.label);
  }

  if (destinations.classes) {
    destinations.classes.folderRule = "Classes / {class|subclass}";
    destinations.classes.featurePack = getNetherscrollsImportPackCollection("classFeatures");
    destinations.classes.featureFolderRule = "Class Features / {class} / {feature|subclass}";
  }

  return destinations;
}

function formatNetherscrollsImportResult(typeKey, result) {
  const label = getNetherscrollsImportTypeLabel(typeKey);
  const imported = result?.[typeKey]?.created ?? 0;
  const updated = result?.[typeKey]?.updated ?? 0;
  const removed = result?.[typeKey]?.deleted ?? 0;
  if (typeKey === "classes" && result?.classes?.features) {
    const features = result.classes.features;
    return `Netherscrolls ${label} imported: ${imported} created, ${updated} updated, ${removed} removed. Class features: ${features.created ?? 0} created, ${features.updated ?? 0} updated, ${features.deleted ?? 0} removed.`;
  }
  return `Netherscrolls ${label} imported: ${imported} created, ${updated} updated, ${removed} removed.`;
}

function getNetherscrollsImportTypeLabel(typeKey) {
  const definition = IMPORT_TYPES.find((type) => type.key === typeKey);
  return definition?.label?.toLowerCase?.() ?? String(typeKey ?? "content");
}

async function sendNetherscrollsImportRequest(importRequest) {
  const response = await fetch(importRequest.url, importRequest.options);
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      data?.error?.message ??
      data?.message ??
      `Import failed (${response.status} ${response.statusText}).`;
    throw new Error(message);
  }

  return data;
}

async function applyNetherscrollsImportResponse(data, requestTypeKey = null) {
  const result = {};
  const classes = getNetherscrollsResponseDataset(data, "classes", requestTypeKey);
  if (Array.isArray(classes)) {
    result.classes = await importNetherscrollsClasses(classes);
  }

  const items = getNetherscrollsResponseDataset(data, "items", requestTypeKey);
  if (Array.isArray(items)) {
    result.items = await importNetherscrollsItems(items);
  }

  const feats = getNetherscrollsResponseDataset(data, "feats", requestTypeKey);
  if (Array.isArray(feats)) {
    result.feats = await importNetherscrollsFeats(feats);
  }

  const spells = getNetherscrollsResponseDataset(data, "spells", requestTypeKey);
  if (Array.isArray(spells)) {
    result.spells = await importNetherscrollsSpells(spells);
  }

  return result;
}

async function importNetherscrollsClasses(classes) {
  const classPack = await getNetherscrollsImportPack("classes");
  if (!classPack) throw new Error("Netherscrolls Classes compendium pack was not found.");

  const featurePack = await getNetherscrollsImportPack("classFeatures");
  if (!featurePack) throw new Error("Netherscrolls Class Features compendium pack was not found.");

  await ensureNetherscrollsImportPackWritable(classPack);
  await ensureNetherscrollsImportPackWritable(featurePack);

  const featureResult = await importNetherscrollsClassFeatureItems(classes, featurePack);
  const existingByNetherId = await getCompendiumDocumentsByNetherId(classPack);
  const classData = [];
  const deleteIds = [];
  const folderCache = new Map();
  await ensureNetherscrollsClassFolderTree(classPack, folderCache);

  for (const classSource of classes) {
    const classNetherscrollsId = getNetherscrollsSourceId(classSource);
    if (isNetherscrollsDeleted(classSource)) {
      const existing = classNetherscrollsId
        ? existingByNetherId.get(String(classNetherscrollsId))
        : null;
      if (existing?.id) deleteIds.push(existing.id);

      for (const subclassSource of getNetherscrollsSubclasses(classSource)) {
        const subclassNetherscrollsId = getNetherscrollsSourceId(subclassSource);
        const existingSubclass = subclassNetherscrollsId
          ? existingByNetherId.get(String(subclassNetherscrollsId))
          : null;
        if (existingSubclass?.id) deleteIds.push(existingSubclass.id);
      }
      continue;
    }

    const preparedClass = normalizeNetherscrollsClassData(classSource, {
      featureUuidByKey: featureResult.uuidByKey,
    });
    if (classNetherscrollsId && existingByNetherId.has(String(classNetherscrollsId))) {
      preparedClass._id = existingByNetherId.get(String(classNetherscrollsId)).id;
    }
    const classFolder = await ensureNetherscrollsClassFolder(classPack, preparedClass, folderCache);
    if (classFolder?.id) preparedClass.folder = classFolder.id;
    classData.push(preparedClass);

    for (const subclassSource of getNetherscrollsSubclasses(classSource)) {
      const subclassNetherscrollsId = getNetherscrollsSourceId(subclassSource);
      if (isNetherscrollsDeleted(subclassSource)) {
        const existing = subclassNetherscrollsId
          ? existingByNetherId.get(String(subclassNetherscrollsId))
          : null;
        if (existing?.id) deleteIds.push(existing.id);
        continue;
      }

      const preparedSubclass = normalizeNetherscrollsSubclassData(subclassSource, classSource, {
        featureUuidByKey: featureResult.uuidByKey,
      });
      if (subclassNetherscrollsId && existingByNetherId.has(String(subclassNetherscrollsId))) {
        preparedSubclass._id = existingByNetherId.get(String(subclassNetherscrollsId)).id;
      }
      const subclassFolder = await ensureNetherscrollsSubclassFolder(
        classPack,
        preparedSubclass,
        classSource,
        folderCache
      );
      if (subclassFolder?.id) preparedSubclass.folder = subclassFolder.id;
      classData.push(preparedSubclass);
    }
  }

  const ItemClass = Item?.implementation ?? Item;
  const uniqueDeleteIds = Array.from(new Set(deleteIds));
  if (uniqueDeleteIds.length) {
    await ItemClass.deleteDocuments(uniqueDeleteIds, { pack: classPack.collection });
  }

  const updates = classData.filter((item) => item._id);
  const creates = classData.filter((item) => !item._id);
  if (updates.length) {
    await ItemClass.updateDocuments(updates, { pack: classPack.collection });
  }

  if (!creates.length) {
    return {
      created: 0,
      updated: updates.length,
      deleted: uniqueDeleteIds.length,
      features: featureResult.counts,
    };
  }

  const created = await ItemClass.createDocuments(creates, { pack: classPack.collection });
  return {
    created: created.length,
    updated: updates.length,
    deleted: uniqueDeleteIds.length,
    features: featureResult.counts,
  };
}

async function importNetherscrollsClassFeatureItems(classes, pack) {
  const existingByNetherId = await getCompendiumDocumentsByNetherId(pack);
  const featureData = [];
  const deleteIds = [];
  const uuidByKey = new Map();
  const folderCache = new Map();
  await ensureNetherscrollsClassFeatureFolderTree(pack, folderCache);

  for (const descriptor of getNetherscrollsClassFeatureDescriptors(classes)) {
    if (descriptor.deleted) {
      const existing = descriptor.netherscrollsId
        ? existingByNetherId.get(String(descriptor.netherscrollsId))
        : null;
      if (existing?.id) deleteIds.push(existing.id);
      continue;
    }

    const prepared = normalizeNetherscrollsClassFeatureData(descriptor);
    if (descriptor.netherscrollsId && existingByNetherId.has(String(descriptor.netherscrollsId))) {
      prepared._id = existingByNetherId.get(String(descriptor.netherscrollsId)).id;
      uuidByKey.set(descriptor.key, buildNetherscrollsCompendiumItemUuid(pack, prepared._id));
    }
    const folder = await ensureNetherscrollsClassFeatureFolder(pack, descriptor, folderCache);
    if (folder?.id) prepared.folder = folder.id;
    featureData.push(prepared);
  }

  const ItemClass = Item?.implementation ?? Item;
  const uniqueDeleteIds = Array.from(new Set(deleteIds));
  if (uniqueDeleteIds.length) {
    await ItemClass.deleteDocuments(uniqueDeleteIds, { pack: pack.collection });
  }

  const updates = featureData.filter((item) => item._id);
  const creates = featureData.filter((item) => !item._id);
  if (updates.length) {
    await ItemClass.updateDocuments(updates, { pack: pack.collection });
  }

  let created = [];
  if (creates.length) {
    created = await ItemClass.createDocuments(creates, { pack: pack.collection });
    for (const createdDocument of created) {
      const featureKey =
        createdDocument?.getFlag?.(MODULE_ID, "featureKey") ??
        createdDocument?.flags?.[MODULE_ID]?.featureKey;
      if (featureKey && createdDocument?.id) {
        uuidByKey.set(featureKey, buildNetherscrollsCompendiumItemUuid(pack, createdDocument.id));
      }
    }
  }

  return {
    uuidByKey,
    counts: {
      created: created.length,
      updated: updates.length,
      deleted: uniqueDeleteIds.length,
    },
  };
}

async function importNetherscrollsItems(items) {
  const pack = await getNetherscrollsImportPack("items");
  if (!pack) throw new Error("Netherscrolls Items compendium pack was not found.");
  await ensureNetherscrollsImportPackWritable(pack);

  const existingByNetherId = await getCompendiumDocumentsByNetherId(pack);
  const itemData = [];
  const deleteIds = [];
  const folderCache = new Map();
  await ensureNetherscrollsItemFolderTree(pack, folderCache);

  for (const item of items) {
    const netherscrollsId = getNetherscrollsSourceId(item);
    if (isNetherscrollsDeleted(item)) {
      const existing = netherscrollsId
        ? existingByNetherId.get(String(netherscrollsId))
        : null;
      if (existing?.id) deleteIds.push(existing.id);
      continue;
    }

    const prepared = normalizeNetherscrollsItemData(item);
    if (netherscrollsId && existingByNetherId.has(String(netherscrollsId))) {
      prepared._id = existingByNetherId.get(String(netherscrollsId)).id;
    }
    const folder = await ensureNetherscrollsItemFolder(pack, prepared, folderCache);
    if (folder?.id) prepared.folder = folder.id;
    itemData.push(prepared);
  }

  const ItemClass = Item?.implementation ?? Item;
  if (deleteIds.length) {
    await ItemClass.deleteDocuments(deleteIds, { pack: pack.collection });
  }

  const updates = itemData.filter((item) => item._id);
  const creates = itemData.filter((item) => !item._id);
  if (updates.length) {
    await ItemClass.updateDocuments(updates, { pack: pack.collection });
  }

  if (!creates.length) {
    return { created: 0, updated: updates.length, deleted: deleteIds.length };
  }

  const created = await ItemClass.createDocuments(creates, { pack: pack.collection });
  return {
    created: created.length,
    updated: updates.length,
    deleted: deleteIds.length,
  };
}

async function importNetherscrollsFeats(feats) {
  const pack = await getNetherscrollsImportPack("feats");
  if (!pack) throw new Error("Netherscrolls Feats compendium pack was not found.");
  await ensureNetherscrollsImportPackWritable(pack);

  const existingByNetherId = await getCompendiumDocumentsByNetherId(pack);
  const featData = [];
  const deleteIds = [];
  const folderCache = new Map();
  await ensureNetherscrollsFeatFolderTree(pack, folderCache);

  for (const feat of feats) {
    const netherscrollsId = getNetherscrollsSourceId(feat);
    if (isNetherscrollsDeleted(feat)) {
      const existing = netherscrollsId
        ? existingByNetherId.get(String(netherscrollsId))
        : null;
      if (existing?.id) deleteIds.push(existing.id);
      continue;
    }

    const prepared = normalizeNetherscrollsFeatData(feat);
    if (netherscrollsId && existingByNetherId.has(String(netherscrollsId))) {
      prepared._id = existingByNetherId.get(String(netherscrollsId)).id;
    }
    const folder = await ensureNetherscrollsFeatFolder(pack, prepared, folderCache);
    if (folder?.id) prepared.folder = folder.id;
    featData.push(prepared);
  }

  const ItemClass = Item?.implementation ?? Item;
  if (deleteIds.length) {
    await ItemClass.deleteDocuments(deleteIds, { pack: pack.collection });
  }

  const updates = featData.filter((feat) => feat._id);
  const creates = featData.filter((feat) => !feat._id);
  if (updates.length) {
    await ItemClass.updateDocuments(updates, { pack: pack.collection });
  }

  if (!creates.length) {
    return { created: 0, updated: updates.length, deleted: deleteIds.length };
  }

  const created = await ItemClass.createDocuments(creates, { pack: pack.collection });
  return {
    created: created.length,
    updated: updates.length,
    deleted: deleteIds.length,
  };
}

async function importNetherscrollsSpells(spells) {
  const pack = await getNetherscrollsImportPack("spells");
  if (!pack) throw new Error("Netherscrolls Spells compendium pack was not found.");
  await ensureNetherscrollsImportPackWritable(pack);

  const existingByNetherId = await getCompendiumDocumentsByNetherId(pack);
  const spellData = [];
  const deleteIds = [];
  const folderCache = new Map();
  await ensureNetherscrollsSpellFolderTree(pack, folderCache);
  for (const spell of spells) {
    const netherscrollsId = getNetherscrollsSourceId(spell);
    if (isNetherscrollsDeleted(spell)) {
      const existing = netherscrollsId
        ? existingByNetherId.get(String(netherscrollsId))
        : null;
      if (existing?.id) deleteIds.push(existing.id);
      continue;
    }

    const prepared = normalizeNetherscrollsSpellData(spell);
    if (netherscrollsId && existingByNetherId.has(String(netherscrollsId))) {
      prepared._id = existingByNetherId.get(String(netherscrollsId)).id;
    }
    const folder = await ensureNetherscrollsSpellFolder(pack, prepared, folderCache);
    if (folder?.id) prepared.folder = folder.id;
    spellData.push(prepared);
  }

  const ItemClass = Item?.implementation ?? Item;
  if (deleteIds.length) {
    await ItemClass.deleteDocuments(deleteIds, { pack: pack.collection });
  }

  const updates = spellData.filter((spell) => spell._id);
  const creates = spellData.filter((spell) => !spell._id);
  if (updates.length) {
    await ItemClass.updateDocuments(updates, { pack: pack.collection });
  }

  if (!creates.length) {
    return { created: 0, updated: updates.length, deleted: deleteIds.length };
  }

  const created = await ItemClass.createDocuments(creates, { pack: pack.collection });
  return {
    created: created.length,
    updated: updates.length,
    deleted: deleteIds.length,
  };
}

async function ensureNetherscrollsImportPackWritable(pack) {
  if (!pack?.locked) return;
  if (typeof pack.configure === "function") {
    await pack.configure({ locked: false });
  }
  if (pack.locked) {
    throw new Error(`Unlock the ${pack.title ?? pack.collection ?? "Netherscrolls"} compendium before importing.`);
  }
}

async function getCompendiumDocumentsByNetherId(pack) {
  const documents = await pack.getDocuments();
  const byId = new Map();
  for (const document of documents) {
    const netherscrollsId = getItemNetherId(document);
    if (netherscrollsId) byId.set(String(netherscrollsId), document);
  }

  return byId;
}

function getNetherscrollsResponseDataset(data, dataKey, requestTypeKey = null) {
  if (Array.isArray(data)) return requestTypeKey === dataKey ? data : null;
  if (Array.isArray(data?.[dataKey])) return data[dataKey];
  if (data?.meta?.dataKey === dataKey && Array.isArray(data?.data)) return data.data;
  if (requestTypeKey === dataKey && Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.[dataKey])) return data.data[dataKey];
  if (dataKey === "classes" && isNetherscrollsClassLike(data)) return [data];
  return null;
}

function isNetherscrollsClassLike(data) {
  return Boolean(
    data &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      (Array.isArray(data.classFeatures) ||
        Array.isArray(data.subclasses) ||
        data.progression ||
        data.presentation?.progressionTable)
  );
}

function getNetherscrollsSourceId(data) {
  const foundryItem = getNetherscrollsFoundryItemPayload(data);
  return normalizeNetherscrollsReferenceValue(
    data?.netherscrollsId ??
      data?._id ??
      data?.id ??
      data?.flags?.[MODULE_ID]?.netherscrollsId ??
      data?.flags?.netherscrolls?.id ??
      foundryItem?.flags?.[MODULE_ID]?.netherscrollsId ??
      foundryItem?.flags?.netherscrolls?.id
  );
}

function getNetherscrollsFoundryItemPayload(data) {
  return data?.foundryItem ?? data?.foundry ?? data?.document ?? null;
}

function normalizeNetherscrollsReferenceValue(value) {
  if (value && typeof value === "object") {
    return (
      toTrimmedStringOrNull(value.$oid) ??
      toTrimmedStringOrNull(value.$date) ??
      toTrimmedStringOrNull(value.oid) ??
      toTrimmedStringOrNull(value.date) ??
      toTrimmedStringOrNull(value.id) ??
      null
    );
  }

  return toTrimmedStringOrNull(value);
}

function normalizeNetherscrollsImagePath(...values) {
  for (const value of values) {
    const raw = toTrimmedStringOrNull(value);
    if (!isValidNetherscrollsImagePath(raw)) continue;
    if (isNetherscrollsGenericImagePath(raw)) continue;
    return raw;
  }

  return NETHERSCROLLS_DEFAULT_IMAGE;
}

function normalizeNetherscrollsImportImagePath(...values) {
  for (const value of values) {
    const raw = toTrimmedStringOrNull(value);
    if (!isValidNetherscrollsImagePath(raw)) continue;
    if (isNetherscrollsGenericImagePath(raw)) continue;
    return raw;
  }

  return NETHERSCROLLS_IMPORT_IMAGE;
}

function isNetherscrollsGenericImagePath(value) {
  const raw = toTrimmedStringOrNull(value);
  if (!raw) return false;
  const path = raw.split(/[?#]/)[0]?.toLowerCase() ?? "";
  return NETHERSCROLLS_GENERIC_IMAGE_PATHS.has(path);
}

function isValidNetherscrollsImagePath(value) {
  const raw = toTrimmedStringOrNull(value);
  if (!raw) return false;
  const path = raw.split(/[?#]/)[0]?.toLowerCase() ?? "";
  const extension = /\.([a-z0-9]+)$/i.exec(path)?.[1];
  return Boolean(extension && NETHERSCROLLS_VALID_IMAGE_EXTENSIONS.has(extension));
}

function isNetherscrollsDeleted(data) {
  if (data?.deleted === true) return true;
  return String(data?.deleted ?? "").toLowerCase() === "true";
}

function getNetherscrollsImportPackDefinition(typeKey) {
  return NETHERSCROLLS_WORLD_IMPORT_PACKS[typeKey] ?? null;
}

function getNetherscrollsImportPackCollection(typeKey) {
  const definition = getNetherscrollsImportPackDefinition(typeKey);
  if (definition?.name) return `world.${definition.name}`;

  const packName = IMPORT_PACKS[typeKey] ?? typeKey;
  return `${MODULE_ID}.${packName}`;
}

async function getNetherscrollsImportPack(typeKey) {
  const definition = getNetherscrollsImportPackDefinition(typeKey);
  if (!definition) return game?.packs?.get?.(getNetherscrollsImportPackCollection(typeKey)) ?? null;

  const collection = getNetherscrollsImportPackCollection(typeKey);
  const existing = game?.packs?.get?.(collection);
  if (existing) return existing;

  return createNetherscrollsWorldImportPack(definition);
}

async function createNetherscrollsWorldImportPack(definition) {
  const CompendiumCollectionClass =
    globalThis.foundry?.documents?.collections?.CompendiumCollection ??
    globalThis.CompendiumCollection;

  if (typeof CompendiumCollectionClass?.createCompendium !== "function") {
    throw new Error("Foundry world compendium creation API is unavailable.");
  }

  const metadata = {
    name: definition.name,
    label: definition.label,
    type: definition.type,
    package: "world",
  };
  if (definition.system) metadata.system = definition.system;

  const pack = await CompendiumCollectionClass.createCompendium(metadata);
  const resolvedPack = pack ?? game?.packs?.get?.(`world.${definition.name}`) ?? null;
  if (resolvedPack?.configure) {
    try {
      await resolvedPack.configure({
        locked: false,
        ownership: NETHERSCROLLS_IMPORT_PACK_OWNERSHIP,
      });
    } catch (err) {
      console.warn(`${MODULE_ID} | Unable to configure ${definition.label} compendium.`, err);
    }
  }

  return resolvedPack;
}

function normalizeNetherscrollsClassData(classSource, { featureUuidByKey }) {
  if (getNetherscrollsFoundryItemPayload(classSource)) {
    return normalizeNetherscrollsFoundryClassData(classSource, { featureUuidByKey });
  }

  const source = duplicateNetherscrollsData(classSource);
  const netherscrollsId = getNetherscrollsSourceId(source);
  const name = toTrimmedStringOrNull(source.name) ?? "Netherscrolls Class";
  const identifier = normalizeNetherscrollsClassIdentifier(source);
  const itemData = {
    name,
    type: "class",
    img: normalizeNetherscrollsImagePath(source.img, source.image),
    sort: 0,
    ownership: {
      default: 0,
    },
    system: buildNetherscrollsClassSystem(source, {
      netherscrollsId,
      identifier,
      featureUuidByKey,
    }),
    effects: [],
  };

  applyNetherscrollsImportFlags(itemData, source, netherscrollsId);
  itemData.flags = itemData.flags ?? {};
  itemData.flags[MODULE_ID] = {
    ...(itemData.flags[MODULE_ID] ?? {}),
    identifier,
    classFeatureUuids: getNetherscrollsClassFeatureUuids(source, featureUuidByKey, "class"),
    subclassType: toTrimmedStringOrNull(source.subclassType) ?? "",
  };
  if (source.legacy != null) itemData.flags[MODULE_ID].legacy = Boolean(source.legacy);
  if (source.version != null) itemData.flags[MODULE_ID].sourceVersion = source.version;
  const progressionTable = getNetherscrollsProgressionTable(source);
  if (progressionTable) itemData.flags[MODULE_ID].progressionTable = progressionTable;

  return itemData;
}

function normalizeNetherscrollsFoundryClassData(classSource, { featureUuidByKey }) {
  const source = duplicateNetherscrollsData(getNetherscrollsFoundryItemPayload(classSource));
  const netherscrollsId = getNetherscrollsSourceId(classSource);
  source.name = toTrimmedStringOrNull(source.name) ?? "Netherscrolls Class";
  source.type = "class";
  source.img = normalizeNetherscrollsImagePath(source.img, source.image);
  source.sort ??= 0;
  source.ownership ??= { default: 0 };
  source.effects ??= [];

  const identifier = normalizeNetherscrollsClassIdentifier({
    ...classSource,
    name: source.name,
    system: source.system,
  });
  const defaults = buildNetherscrollsClassSystem(
    {
      ...classSource,
      system: source.system,
      name: source.name,
    },
    {
      netherscrollsId,
      identifier,
      featureUuidByKey,
    }
  );
  source.system = mergeNetherscrollsDefaults(defaults, source.system ?? {});
  source.system.identifier = toTrimmedStringOrNull(source.system.identifier) ?? identifier;
  applyNetherscrollsImportFlags(source, classSource, netherscrollsId);
  source.flags = source.flags ?? {};
  source.flags[MODULE_ID] = {
    ...(source.flags[MODULE_ID] ?? {}),
    identifier,
    classFeatureUuids: getNetherscrollsClassFeatureUuids(classSource, featureUuidByKey, "class"),
  };

  return source;
}

function normalizeNetherscrollsSubclassData(subclassSource, classSource, { featureUuidByKey }) {
  if (getNetherscrollsFoundryItemPayload(subclassSource)) {
    return normalizeNetherscrollsFoundrySubclassData(subclassSource, classSource, { featureUuidByKey });
  }

  const source = duplicateNetherscrollsData(subclassSource);
  const netherscrollsId = getNetherscrollsSourceId(source);
  const classIdentifier = normalizeNetherscrollsClassIdentifier(classSource);
  const identifier = normalizeNetherscrollsSubclassIdentifier(source, classSource);
  const itemData = {
    name: toTrimmedStringOrNull(source.name) ?? "Netherscrolls Subclass",
    type: "subclass",
    img: normalizeNetherscrollsImagePath(source.img, source.image),
    sort: 0,
    ownership: {
      default: 0,
    },
    system: buildNetherscrollsSubclassSystem(source, classSource, {
      netherscrollsId,
      identifier,
      classIdentifier,
      featureUuidByKey,
    }),
    effects: [],
  };

  applyNetherscrollsImportFlags(itemData, source, netherscrollsId);
  itemData.flags = itemData.flags ?? {};
  itemData.flags[MODULE_ID] = {
    ...(itemData.flags[MODULE_ID] ?? {}),
    identifier,
    parentClass: toTrimmedStringOrNull(classSource?.name) ?? "",
    parentClassIdentifier: classIdentifier,
    parentClassNetherscrollsId: getNetherscrollsSourceId(classSource) ?? "",
    subclassFeatureUuids: getNetherscrollsClassFeatureUuids(classSource, featureUuidByKey, "subclass", source),
  };

  return itemData;
}

function normalizeNetherscrollsFoundrySubclassData(subclassSource, classSource, { featureUuidByKey }) {
  const source = duplicateNetherscrollsData(getNetherscrollsFoundryItemPayload(subclassSource));
  const netherscrollsId = getNetherscrollsSourceId(subclassSource);
  source.name = toTrimmedStringOrNull(source.name) ?? "Netherscrolls Subclass";
  source.type = "subclass";
  source.img = normalizeNetherscrollsImagePath(source.img, source.image);
  source.sort ??= 0;
  source.ownership ??= { default: 0 };
  source.effects ??= [];

  const classIdentifier = normalizeNetherscrollsClassIdentifier(classSource);
  const identifier = normalizeNetherscrollsSubclassIdentifier(
    {
      ...subclassSource,
      name: source.name,
      system: source.system,
    },
    classSource
  );
  const defaults = buildNetherscrollsSubclassSystem(
    {
      ...subclassSource,
      system: source.system,
      name: source.name,
    },
    classSource,
    {
      netherscrollsId,
      identifier,
      classIdentifier,
      featureUuidByKey,
    }
  );
  source.system = mergeNetherscrollsDefaults(defaults, source.system ?? {});
  source.system.identifier = toTrimmedStringOrNull(source.system.identifier) ?? identifier;
  source.system.classIdentifier = toTrimmedStringOrNull(source.system.classIdentifier) ?? classIdentifier;
  applyNetherscrollsImportFlags(source, subclassSource, netherscrollsId);
  source.flags = source.flags ?? {};
  source.flags[MODULE_ID] = {
    ...(source.flags[MODULE_ID] ?? {}),
    identifier,
    parentClass: toTrimmedStringOrNull(classSource?.name) ?? "",
    parentClassIdentifier: classIdentifier,
    parentClassNetherscrollsId: getNetherscrollsSourceId(classSource) ?? "",
    subclassFeatureUuids: getNetherscrollsClassFeatureUuids(classSource, featureUuidByKey, "subclass", subclassSource),
  };

  return source;
}

function buildNetherscrollsClassSystem(source, { netherscrollsId, identifier, featureUuidByKey }) {
  const sourceName = toTrimmedStringOrNull(source.source ?? source.system?.source?.book);
  return {
    advancement: buildNetherscrollsClassAdvancement(source, { featureUuidByKey }),
    description: {
      value: buildNetherscrollsClassDescription(source),
      chat: "",
    },
    hd: {
      denomination: normalizeNetherscrollsClassHitDie(source),
      spent: 0,
      additional: "",
    },
    identifier:
      toTrimmedStringOrNull(source?.system?.identifier) ??
      identifier ??
      (netherscrollsId ? `netherscrolls-${netherscrollsId}` : slugifyNetherscrollsIdentifier(source?.name)),
    levels: Math.max(1, Math.trunc(toNumber(source?.system?.levels ?? source?.levels, 1))),
    primaryAbility: normalizeNetherscrollsPrimaryAbility(source),
    properties: normalizeNetherscrollsClassProperties(source),
    source: buildNetherscrollsItemSource(sourceName, {
      ...source,
      rules: source?.rules ?? (source?.legacy ? "2014" : undefined),
    }),
    spellcasting: normalizeNetherscrollsClassSpellcasting(source),
    startingEquipment: Array.isArray(source?.system?.startingEquipment) ? source.system.startingEquipment : [],
    wealth: toTrimmedStringOrNull(source?.system?.wealth ?? source?.wealth) ?? "",
  };
}

function buildNetherscrollsSubclassSystem(source, classSource, { netherscrollsId, identifier, classIdentifier, featureUuidByKey }) {
  const sourceName = toTrimmedStringOrNull(source.source ?? classSource?.source ?? source.system?.source?.book);
  return {
    advancement: buildNetherscrollsSubclassAdvancement(source, classSource, { featureUuidByKey }),
    classIdentifier,
    description: {
      value: buildNetherscrollsSubclassDescription(source),
      chat: "",
    },
    identifier:
      toTrimmedStringOrNull(source?.system?.identifier) ??
      identifier ??
      (netherscrollsId ? `netherscrolls-${netherscrollsId}` : slugifyNetherscrollsIdentifier(source?.name)),
    source: buildNetherscrollsItemSource(sourceName, {
      ...source,
      rules: source?.rules ?? classSource?.rules ?? (classSource?.legacy ? "2014" : undefined),
    }),
    spellcasting: normalizeNetherscrollsClassSpellcasting(source, classSource),
  };
}

function normalizeNetherscrollsClassFeatureData(descriptor) {
  const feature = descriptor.feature;
  const netherscrollsId = descriptor.netherscrollsId;
  const featureName = getNetherscrollsFeatureTitle(feature);
  const sourceName = toTrimmedStringOrNull(feature?.source ?? descriptor.classSource?.source);
  const itemData = {
    name: featureName,
    type: "feat",
    img: normalizeNetherscrollsImagePath(feature?.img, feature?.image),
    sort: 0,
    ownership: {
      default: 0,
    },
    system: {
      activities: feature?.system?.activities ?? {},
      advancement: feature?.system?.advancement ?? {},
      description: {
        value: buildNetherscrollsFeatureDescription(feature),
        chat: "",
      },
      identifier: normalizeNetherscrollsClassFeatureIdentifier(descriptor),
      source: buildNetherscrollsItemSource(sourceName, {
        ...feature,
        rules: feature?.rules ?? descriptor.classSource?.rules ?? (descriptor.classSource?.legacy ? "2014" : undefined),
      }),
      cover: 0,
      crewed: false,
      enchant: {
        max: "",
        period: "",
      },
      prerequisites: {
        items: [],
        repeatable: false,
      },
      properties: [],
      requirements: buildNetherscrollsFeatureRequirement(descriptor),
      type: {
        value: "class",
        subtype: "",
      },
      uses: normalizeNetherscrollsItemUses(feature),
    },
    effects: [],
  };

  applyNetherscrollsImportFlags(itemData, feature, netherscrollsId);
  itemData.flags = itemData.flags ?? {};
  itemData.flags[MODULE_ID] = {
    ...(itemData.flags[MODULE_ID] ?? {}),
    featureKey: descriptor.key,
    featureScope: descriptor.scope,
    parentClass: toTrimmedStringOrNull(descriptor.classSource?.name) ?? "",
    parentClassIdentifier: normalizeNetherscrollsClassIdentifier(descriptor.classSource),
    parentClassNetherscrollsId: getNetherscrollsSourceId(descriptor.classSource) ?? "",
    level: descriptor.level,
    optional: Boolean(feature?.optional),
    selectable: Math.max(0, Math.trunc(toNumber(feature?.selectable, 0))),
    choiceType: toTrimmedStringOrNull(feature?.choiceType) ?? "",
    choices: normalizeNetherscrollsFeatureChoices(feature),
  };
  if (descriptor.subclassSource) {
    itemData.flags[MODULE_ID].parentSubclass = toTrimmedStringOrNull(descriptor.subclassSource?.name) ?? "";
    itemData.flags[MODULE_ID].parentSubclassIdentifier = normalizeNetherscrollsSubclassIdentifier(
      descriptor.subclassSource,
      descriptor.classSource
    );
    itemData.flags[MODULE_ID].parentSubclassNetherscrollsId = getNetherscrollsSourceId(descriptor.subclassSource) ?? "";
  }

  return itemData;
}

function getNetherscrollsClassFeatureDescriptors(classes) {
  const descriptors = [];
  for (const classSource of classes) {
    for (const feature of getNetherscrollsClassFeatures(classSource)) {
      descriptors.push(buildNetherscrollsFeatureDescriptor(classSource, null, feature));
    }

    for (const subclassSource of getNetherscrollsSubclasses(classSource)) {
      for (const feature of getNetherscrollsSubclassFeatures(subclassSource)) {
        descriptors.push(buildNetherscrollsFeatureDescriptor(classSource, subclassSource, feature));
      }
    }
  }

  return descriptors;
}

function buildNetherscrollsFeatureDescriptor(classSource, subclassSource, feature) {
  const scope = subclassSource ? "subclass" : "class";
  const level = Math.max(1, Math.trunc(toNumber(feature?.level, 1)));
  const key = buildNetherscrollsClassFeatureKey(classSource, subclassSource, feature);
  const netherscrollsId =
    getNetherscrollsSourceId(feature) ??
    buildNetherscrollsSyntheticSourceId("feature", key);
  return {
    key,
    scope,
    netherscrollsId,
    classSource,
    subclassSource,
    feature,
    level,
    deleted:
      isNetherscrollsDeleted(feature) ||
      isNetherscrollsDeleted(classSource) ||
      Boolean(subclassSource && isNetherscrollsDeleted(subclassSource)),
  };
}

function buildNetherscrollsClassFeatureKey(classSource, subclassSource, feature) {
  const classKey =
    getNetherscrollsSourceId(classSource) ??
    normalizeNetherscrollsClassIdentifier(classSource);
  const subclassKey = subclassSource
    ? getNetherscrollsSourceId(subclassSource) ?? normalizeNetherscrollsSubclassIdentifier(subclassSource, classSource)
    : "class";
  const featureKey =
    getNetherscrollsSourceId(feature) ??
    `${Math.max(1, Math.trunc(toNumber(feature?.level, 1)))}-${slugifyNetherscrollsIdentifier(getNetherscrollsFeatureTitle(feature))}`;
  return `${classKey}:${subclassKey}:${featureKey}`;
}

function buildNetherscrollsSyntheticSourceId(prefix, key) {
  return `${prefix}:${buildNetherscrollsStableId(key)}`;
}

function buildNetherscrollsClassAdvancement(source, { featureUuidByKey }) {
  const advancement = {};
  addNetherscrollsAdvancement(advancement, buildNetherscrollsHitPointsAdvancement(source));

  for (const traitAdvancement of buildNetherscrollsClassTraitAdvancements(source)) {
    addNetherscrollsAdvancement(advancement, traitAdvancement);
  }

  const subclassAdvancement = buildNetherscrollsSubclassChoiceAdvancement(source);
  if (subclassAdvancement) addNetherscrollsAdvancement(advancement, subclassAdvancement);

  for (const level of getNetherscrollsClassAsiLevels(source)) {
    addNetherscrollsAdvancement(advancement, buildNetherscrollsAsiAdvancement(source, level));
  }

  for (const descriptor of getNetherscrollsClassFeatureDescriptors([source])) {
    if (descriptor.scope !== "class") continue;
    if (!shouldGrantNetherscrollsFeature(descriptor.feature)) continue;
    const uuid = featureUuidByKey.get(descriptor.key);
    if (!uuid) continue;
    addNetherscrollsAdvancement(
      advancement,
      buildNetherscrollsItemGrantAdvancement(descriptor.feature, uuid, descriptor.level, descriptor.key)
    );
  }

  return advancement;
}

function buildNetherscrollsSubclassAdvancement(source, classSource, { featureUuidByKey }) {
  const advancement = {};
  for (const descriptor of getNetherscrollsClassFeatureDescriptors([{ ...classSource, subclasses: [source] }])) {
    if (descriptor.scope !== "subclass") continue;
    if (!shouldGrantNetherscrollsFeature(descriptor.feature)) continue;
    const uuid = featureUuidByKey.get(descriptor.key);
    if (!uuid) continue;
    addNetherscrollsAdvancement(
      advancement,
      buildNetherscrollsItemGrantAdvancement(descriptor.feature, uuid, descriptor.level, descriptor.key)
    );
  }
  return advancement;
}

function addNetherscrollsAdvancement(advancement, entry) {
  if (!entry?._id) return;
  advancement[entry._id] = entry;
}

function buildNetherscrollsHitPointsAdvancement(source) {
  const id = buildNetherscrollsAdvancementId(source, "hit-points");
  return {
    _id: id,
    type: "HitPoints",
    configuration: {},
    value: {},
    title: "Hit Points",
    hint: toTrimmedStringOrNull(source?.hitPoints?.description) ?? "",
  };
}

function buildNetherscrollsClassTraitAdvancements(source) {
  const proficiencies = source?.proficiencies ?? {};
  const advancements = [];
  const saveGrants = normalizeNetherscrollsSaveTraitKeys(proficiencies.savingThrows);
  if (saveGrants.length) {
    advancements.push(
      buildNetherscrollsTraitAdvancement(source, {
        key: "saving-throws",
        level: 1,
        title: "Saving Throw Proficiencies",
        grants: saveGrants,
      })
    );
  }

  const proficiencyGrants = [
    ...normalizeNetherscrollsArmorTraitKeys(proficiencies.armor),
    ...normalizeNetherscrollsWeaponTraitKeys(proficiencies.weapons),
    ...normalizeNetherscrollsToolTraitKeys(proficiencies.tools),
  ];
  if (proficiencyGrants.length) {
    advancements.push(
      buildNetherscrollsTraitAdvancement(source, {
        key: "equipment-proficiencies",
        level: 1,
        title: "Equipment Proficiencies",
        grants: proficiencyGrants,
      })
    );
  }

  for (const [index, choice] of getNetherscrollsSkillChoiceGroups(proficiencies.skillChoices).entries()) {
    if (!choice.pool.length || choice.count <= 0) continue;
    advancements.push(
      buildNetherscrollsTraitAdvancement(source, {
        key: `skill-choices-${index}`,
        level: 1,
        title: toTrimmedStringOrNull(choice.title) ?? "Skill Proficiencies",
        choices: [
          {
            count: choice.count,
            pool: choice.pool,
          },
        ],
        hint: toTrimmedStringOrNull(choice.description) ?? "",
      })
    );
  }

  return advancements;
}

function buildNetherscrollsTraitAdvancement(source, { key, level, title, grants = [], choices = [], hint = "" }) {
  const id = buildNetherscrollsAdvancementId(source, key);
  return {
    _id: id,
    type: "Trait",
    configuration: {
      allowReplacements: false,
      choices,
      grants,
      mode: "default",
    },
    value: {
      chosen: grants,
    },
    level,
    title,
    hint,
  };
}

function buildNetherscrollsSubclassChoiceAdvancement(source) {
  const subclassFeature = getNetherscrollsClassFeatures(source).find(
    (feature) => toTrimmedStringOrNull(feature?.choiceType)?.toLowerCase() === "subclass"
  );
  if (!subclassFeature && !getNetherscrollsSubclasses(source).length) return null;

  const level = Math.max(1, Math.trunc(toNumber(subclassFeature?.level, 3)));
  const title =
    toTrimmedStringOrNull(source?.subclassType) ??
    toTrimmedStringOrNull(subclassFeature?.title) ??
    "Subclass";
  const id = buildNetherscrollsAdvancementId(source, "subclass-choice");
  return {
    _id: id,
    type: "Subclass",
    configuration: {},
    value: {},
    level,
    title,
    hint: toTrimmedStringOrNull(source?.subclassIntroHtml ?? source?.subclassIntro) ?? "",
  };
}

function buildNetherscrollsAsiAdvancement(source, level) {
  const id = buildNetherscrollsAdvancementId(source, `asi-${level}`);
  return {
    _id: id,
    type: "AbilityScoreImprovement",
    configuration: {
      cap: 2,
      fixed: {},
      locked: [],
      points: 2,
    },
    value: {
      type: "asi",
      assignments: {},
    },
    level,
    title: "Ability Score Improvement",
    hint: "",
  };
}

function buildNetherscrollsItemGrantAdvancement(feature, uuid, level, key) {
  const optional = Boolean(feature?.optional);
  const id = buildNetherscrollsAdvancementId(feature, `grant-${key}`);
  return {
    _id: id,
    type: "ItemGrant",
    configuration: {
      items: [
        {
          uuid,
          optional,
        },
      ],
      optional,
      spell: null,
    },
    value: {
      added: {},
    },
    level,
    title: getNetherscrollsFeatureTitle(feature),
    hint: toTrimmedStringOrNull(feature?.descriptionHtml ?? feature?.description) ?? "",
    flags: {
      [MODULE_ID]: {
        featureKey: key,
      },
    },
  };
}

function buildNetherscrollsAdvancementId(source, key) {
  return buildNetherscrollsStableId(`adv:${getNetherscrollsSourceId(source) ?? source?.name ?? ""}:${key}`);
}

function shouldGrantNetherscrollsFeature(feature) {
  if (isNetherscrollsAbilityScoreImprovementFeature(feature)) return false;
  const choiceType = toTrimmedStringOrNull(feature?.choiceType)?.toLowerCase();
  if (choiceType === "subclass") return false;
  return true;
}

function isNetherscrollsAbilityScoreImprovementFeature(feature) {
  return /ability score improvement/i.test(toTrimmedStringOrNull(feature?.title ?? feature?.name) ?? "");
}

function getNetherscrollsClassAsiLevels(source) {
  const levels = getNetherscrollsClassFeatures(source)
    .filter(isNetherscrollsAbilityScoreImprovementFeature)
    .map((feature) => Math.max(1, Math.trunc(toNumber(feature?.level, 0))))
    .filter(Boolean);
  if (levels.length) return Array.from(new Set(levels)).sort((a, b) => a - b);
  return [4, 8, 12, 16, 19];
}

function normalizeNetherscrollsClassHitDie(source) {
  const raw =
    toTrimmedStringOrNull(source?.system?.hd?.denomination) ??
    toTrimmedStringOrNull(source?.diceType) ??
    toTrimmedStringOrNull(source?.hitPoints?.hitDice) ??
    "d6";
  const match = /d(4|6|8|10|12|20|100)\b/i.exec(raw);
  return match ? `d${match[1]}` : "d6";
}

function normalizeNetherscrollsClassIdentifier(source) {
  return (
    toTrimmedStringOrNull(source?.system?.identifier) ??
    slugifyNetherscrollsIdentifier(source?.name ?? getNetherscrollsSourceId(source) ?? "class")
  );
}

function normalizeNetherscrollsSubclassIdentifier(source, classSource) {
  return (
    toTrimmedStringOrNull(source?.system?.identifier) ??
    slugifyNetherscrollsIdentifier(
      `${normalizeNetherscrollsClassIdentifier(classSource)}-${source?.name ?? getNetherscrollsSourceId(source) ?? "subclass"}`
    )
  );
}

function normalizeNetherscrollsClassFeatureIdentifier(descriptor) {
  return slugifyNetherscrollsIdentifier(
    `${normalizeNetherscrollsClassIdentifier(descriptor.classSource)}-${descriptor.scope}-${getNetherscrollsFeatureTitle(descriptor.feature)}-${descriptor.level}`
  );
}

function normalizeNetherscrollsPrimaryAbility(source) {
  const explicit = source?.system?.primaryAbility ?? source?.primaryAbility;
  if (explicit && typeof explicit === "object") return explicit;
  const values = normalizeNetherscrollsAbilityList(explicit);
  return {
    value: values,
    all: values.length === 0,
  };
}

function normalizeNetherscrollsClassProperties(source) {
  const properties = source?.system?.properties ?? source?.properties;
  if (Array.isArray(properties)) return properties;
  if (properties instanceof Set) return Array.from(properties);
  if (properties && typeof properties === "object") {
    return Object.keys(properties).filter((key) => properties[key]);
  }
  return [];
}

function normalizeNetherscrollsClassSpellcasting(source, fallbackSource = {}) {
  const explicit = source?.system?.spellcasting;
  if (explicit && typeof explicit === "object") return explicit;
  const progression = normalizeNetherscrollsSpellcastingProgression(
    explicit ?? source?.casterType ?? source?.spellcasting?.progression ?? fallbackSource?.casterType
  );
  return {
    progression,
    ability: normalizeNetherscrollsSaveAbility(source?.spellcastingAbility ?? source?.ability) ?? "",
  };
}

function normalizeNetherscrollsSpellcastingProgression(value) {
  const raw = toTrimmedStringOrNull(value)?.toLowerCase() ?? "none";
  const normalized = raw.replace(/[\s_-]+/g, "");
  if (!raw || raw === "false" || raw === "none" || raw === "no" || raw === "0") return "none";
  if (["full", "fullcaster", "caster"].includes(normalized)) return "full";
  if (["half", "halfcaster", "1/2"].includes(normalized)) return "half";
  if (["third", "thirdcaster", "1/3"].includes(normalized)) return "third";
  if (["pact", "pactmagic"].includes(normalized)) return "pact";
  if (["artificer"].includes(normalized)) return "artificer";
  return ["none", "full", "half", "third", "pact", "artificer"].includes(raw) ? raw : "none";
}

function normalizeNetherscrollsAbilityList(value) {
  const values = Array.isArray(value) ? value : [value];
  return values.map((entry) => normalizeNetherscrollsSaveAbility(entry)).filter(Boolean);
}

function normalizeNetherscrollsSaveTraitKeys(value) {
  return normalizeNetherscrollsAbilityList(value).map((ability) => `saves:${ability}`);
}

function normalizeNetherscrollsArmorTraitKeys(value) {
  return normalizeNetherscrollsTraitKeys(value, NETHERSCROLLS_ARMOR_TRAIT_ALIASES);
}

function normalizeNetherscrollsWeaponTraitKeys(value) {
  return normalizeNetherscrollsTraitKeys(value, NETHERSCROLLS_WEAPON_TRAIT_ALIASES);
}

function normalizeNetherscrollsToolTraitKeys(value) {
  return normalizeNetherscrollsTraitKeys(value, NETHERSCROLLS_TOOL_TRAIT_ALIASES);
}

function normalizeNetherscrollsTraitKeys(value, aliases) {
  const values = Array.isArray(value) ? value : [value];
  const keys = [];
  for (const entry of values) {
    const key = normalizeNetherscrollsTraitKey(entry, aliases);
    if (key && !keys.includes(key)) keys.push(key);
  }
  return keys;
}

function normalizeNetherscrollsTraitKey(value, aliases) {
  const raw = toTrimmedStringOrNull(value);
  if (!raw) return null;
  if (/^[a-z]+:[a-z0-9*:-]+$/i.test(raw)) return raw;
  const normalized = raw.toLowerCase().replace(/\s+/g, " ").trim();
  const compact = normalized.replace(/[^a-z0-9]/g, "");
  return aliases[normalized] ?? aliases[compact] ?? null;
}

function getNetherscrollsSkillChoiceGroups(value) {
  const groups = Array.isArray(value) ? value : value ? [value] : [];
  return groups.map((group) => {
    const choices = getNetherscrollsFeatureChoices(group);
    return {
      title: group?.title,
      description: group?.description,
      count: Math.max(1, Math.trunc(toNumber(group?.selectable ?? group?.count, 1))),
      pool: choices
        .map((choice) => normalizeNetherscrollsSkillTraitKey(choice?.title ?? choice?.name ?? choice))
        .filter(Boolean),
    };
  });
}

function normalizeNetherscrollsSkillTraitKey(value) {
  const raw = toTrimmedStringOrNull(value);
  if (!raw) return null;
  if (/^skills:[a-z]{3}$/i.test(raw)) return raw.toLowerCase();
  if (SKILL_KEY_TO_NAME[raw.toLowerCase()]) return `skills:${raw.toLowerCase()}`;
  const normalized = raw.toLowerCase().replace(/\s+/g, " ").trim();
  const compact = normalized.replace(/[^a-z0-9]/g, "");
  const key = NETHERSCROLLS_SKILL_LABELS[normalized] ?? NETHERSCROLLS_SKILL_LABELS[compact];
  return key ? `skills:${key}` : null;
}

function getNetherscrollsClassFeatureUuids(classSource, featureUuidByKey, scope, subclassSource = null) {
  return getNetherscrollsClassFeatureDescriptors([classSource])
    .filter((descriptor) => descriptor.scope === scope)
    .filter((descriptor) => !subclassSource || isSameNetherscrollsSubclass(descriptor.subclassSource, subclassSource, classSource))
    .map((descriptor) => featureUuidByKey.get(descriptor.key))
    .filter(Boolean);
}

function isSameNetherscrollsSubclass(left, right, classSource) {
  if (left === right) return true;
  const leftId = getNetherscrollsSourceId(left);
  const rightId = getNetherscrollsSourceId(right);
  if (leftId || rightId) return leftId === rightId;
  return normalizeNetherscrollsSubclassIdentifier(left, classSource) === normalizeNetherscrollsSubclassIdentifier(right, classSource);
}

function getNetherscrollsClassFeatures(source) {
  return Array.isArray(source?.classFeatures)
    ? source.classFeatures
    : Array.isArray(source?.features)
    ? source.features
    : [];
}

function getNetherscrollsSubclasses(source) {
  return Array.isArray(source?.subclasses) ? source.subclasses : [];
}

function getNetherscrollsSubclassFeatures(source) {
  return Array.isArray(source?.subclassFeatures)
    ? source.subclassFeatures
    : Array.isArray(source?.features)
    ? source.features
    : [];
}

function getNetherscrollsFeatureTitle(feature) {
  return toTrimmedStringOrNull(feature?.title ?? feature?.name) ?? "Class Feature";
}

function getNetherscrollsFeatureChoices(feature) {
  return Array.isArray(feature?.choices) ? feature.choices : [];
}

function normalizeNetherscrollsFeatureChoices(feature) {
  return getNetherscrollsFeatureChoices(feature).map((choice) => ({
    id: getNetherscrollsSourceId(choice) ?? "",
    title: toTrimmedStringOrNull(choice?.title ?? choice?.name) ?? "",
    description: toTrimmedStringOrNull(choice?.descriptionHtml ?? choice?.description) ?? "",
  }));
}

function buildNetherscrollsFeatureRequirement(descriptor) {
  const level = descriptor.level;
  if (descriptor.subclassSource) {
    return `${toTrimmedStringOrNull(descriptor.subclassSource?.name) ?? "Subclass"} ${level}`;
  }
  return `${toTrimmedStringOrNull(descriptor.classSource?.name) ?? "Class"} ${level}`;
}

function buildNetherscrollsClassDescription(source) {
  return joinNetherscrollsHtmlSections([
    getNetherscrollsHtmlValue(source?.descriptionHtml),
    getNetherscrollsHtmlValue(source?.summaryHtml),
    getNetherscrollsHtmlValue(source?.presentation?.summary),
    getNetherscrollsHtmlValue(source?.hitPoints?.description),
    getNetherscrollsHtmlValue(source?.proficiencies?.description),
    getNetherscrollsHtmlValue(source?.startingEquipment?.description),
    renderNetherscrollsProgressionTable(source),
    buildNetherscrollsSubclassIntroHtml(source),
  ]);
}

function buildNetherscrollsSubclassDescription(source) {
  return joinNetherscrollsHtmlSections([
    getNetherscrollsHtmlValue(source?.descriptionHtml),
    getNetherscrollsHtmlValue(source?.contentHtml),
    getNetherscrollsHtmlValue(source?.summaryHtml),
    getNetherscrollsHtmlValue(source?.presentation?.summary),
    renderNetherscrollsBlocks(source?.blocks),
  ]);
}

function buildNetherscrollsFeatureDescription(feature) {
  const choiceHtml = renderNetherscrollsFeatureChoices(feature);
  return joinNetherscrollsHtmlSections([
    getNetherscrollsHtmlValue(feature?.descriptionHtml),
    getNetherscrollsHtmlValue(feature?.contentHtml),
    getNetherscrollsHtmlValue(feature?.description),
    renderNetherscrollsBlocks(feature?.blocks),
    choiceHtml,
  ]);
}

function buildNetherscrollsSubclassIntroHtml(source) {
  const html = getNetherscrollsHtmlValue(source?.subclassIntroHtml ?? source?.subclassIntro);
  if (!html) return "";
  const title = escapeHtml(toTrimmedStringOrNull(source?.subclassType) ?? "Subclasses");
  return `<h2>${title}</h2>${html}`;
}

function getNetherscrollsHtmlValue(value) {
  return toTrimmedStringOrNull(value) ?? "";
}

function joinNetherscrollsHtmlSections(sections) {
  return sections.map((section) => toTrimmedStringOrNull(section)).filter(Boolean).join("\n");
}

function renderNetherscrollsProgressionTable(source) {
  const table = getNetherscrollsProgressionTable(source);
  const columns = Array.isArray(table?.columns) ? table.columns : [];
  const rows = Array.isArray(table?.rows) ? table.rows : [];
  if (!columns.length || !rows.length) return "";

  const header = columns
    .map((column) => `<th>${escapeHtml(getNetherscrollsProgressionColumnLabel(column))}</th>`)
    .join("");
  const body = rows
    .map((row) => {
      const cells = columns
        .map((column) => `<td>${escapeHtml(formatNetherscrollsProgressionCell(row?.[column.key ?? column.id ?? column]))}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  return `<h2>Class Progression</h2><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
}

function getNetherscrollsProgressionTable(source) {
  const table = source?.presentation?.progressionTable ?? source?.progression;
  if (!table || typeof table !== "object") return null;
  const columns = Array.isArray(table.columns) ? table.columns : [];
  const rows = Array.isArray(table.rows) ? table.rows : [];
  if (!columns.length || !rows.length) return null;
  return {
    columns,
    rows,
    spellcasting: table.spellcasting ?? source?.progression?.spellcasting ?? {},
  };
}

function getNetherscrollsProgressionColumnLabel(column) {
  if (typeof column === "string") return column;
  return toTrimmedStringOrNull(column?.label ?? column?.title ?? column?.name ?? column?.key ?? column?.id) ?? "";
}

function formatNetherscrollsProgressionCell(value) {
  if (Array.isArray(value)) return value.map(formatNetherscrollsProgressionCell).filter(Boolean).join(", ");
  if (value && typeof value === "object") {
    if (value.name || value.title) return toTrimmedStringOrNull(value.name ?? value.title) ?? "";
    return Object.values(value).map(formatNetherscrollsProgressionCell).filter(Boolean).join(", ");
  }
  return String(value ?? "");
}

function renderNetherscrollsFeatureChoices(feature) {
  const choices = normalizeNetherscrollsFeatureChoices(feature).filter((choice) => choice.title);
  if (!choices.length) return "";
  const items = choices.map((choice) => `<li>${escapeHtml(choice.title)}</li>`).join("");
  return `<h3>Choices</h3><ul>${items}</ul>`;
}

function renderNetherscrollsBlocks(blocks) {
  if (!Array.isArray(blocks)) return "";
  return blocks.map(renderNetherscrollsBlock).filter(Boolean).join("\n");
}

function renderNetherscrollsBlock(block) {
  const type = toTrimmedStringOrNull(block?.type)?.toLowerCase();
  if (type === "p" || Array.isArray(block?.paragraphs)) {
    return (block?.paragraphs ?? [])
      .map((paragraph) => `<p>${escapeHtml(String(paragraph ?? ""))}</p>`)
      .join("");
  }
  if (type === "heading" || type === "h2") {
    return `<h2>${escapeHtml(String(block?.text ?? block?.title ?? ""))}</h2>`;
  }
  if (type === "html") return getNetherscrollsHtmlValue(block?.html);
  return "";
}

function buildNetherscrollsCompendiumItemUuid(pack, id) {
  return `Compendium.${pack.collection}.Item.${id}`;
}

function normalizeNetherscrollsFeatData(feat) {
  if (getNetherscrollsFoundryItemPayload(feat)) {
    return normalizeNetherscrollsFoundryFeatData(feat);
  }

  const source = duplicateNetherscrollsData(feat);
  const netherscrollsId = getNetherscrollsSourceId(feat);
  const descriptionHtml = toTrimmedStringOrNull(
    feat?.descriptionHtml ?? feat?.description ?? source.descriptionHtml ?? source.description
  );
  const sourceName = toTrimmedStringOrNull(source.source);
  const featData = {
    name: toTrimmedStringOrNull(source.name) ?? "Netherscrolls Feat",
    type: "feat",
    img: normalizeNetherscrollsImportImagePath(source.img, source.image),
    sort: 0,
    ownership: {
      default: 0,
    },
    system: buildNetherscrollsFeatSystem(source, {
      descriptionHtml,
      netherscrollsId,
      sourceName,
    }),
    effects: [],
  };

  applyNetherscrollsImportFlags(featData, source, netherscrollsId);
  return featData;
}

function normalizeNetherscrollsFoundryFeatData(feat) {
  const source = duplicateNetherscrollsData(getNetherscrollsFoundryItemPayload(feat));
  const netherscrollsId = getNetherscrollsSourceId(feat);
  source.name = toTrimmedStringOrNull(source.name) ?? "Netherscrolls Feat";
  source.type = "feat";
  source.img = normalizeNetherscrollsImportImagePath(source.img, source.image);
  source.sort ??= 0;
  source.ownership ??= { default: 0 };
  source.effects ??= [];

  const descriptionHtml = toTrimmedStringOrNull(
    source.system?.description?.value ?? feat?.descriptionHtml ?? feat?.description
  );
  const sourceName = toTrimmedStringOrNull(feat?.source ?? source?.system?.source?.book);
  const defaults = buildNetherscrollsFeatSystem(
    {
      ...feat,
      system: source.system,
    },
    {
      descriptionHtml,
      netherscrollsId,
      sourceName,
    }
  );
  source.system = mergeNetherscrollsDefaults(defaults, source.system ?? {});
  source.system.identifier ??=
    netherscrollsId ? `netherscrolls-${netherscrollsId}` : slugifyNetherscrollsIdentifier(source.name);
  source.system.source = buildNetherscrollsItemSource(sourceName, {
    ...feat,
    system: {
      ...(feat?.system ?? {}),
      source: source.system.source,
    },
  });

  applyNetherscrollsImportFlags(source, feat, netherscrollsId);
  return source;
}

function buildNetherscrollsFeatSystem(source, { descriptionHtml, netherscrollsId, sourceName }) {
  return {
    activities: normalizeNetherscrollsActivities(source),
    advancement: normalizeNetherscrollsFeatAdvancement(source),
    description: {
      value: descriptionHtml ?? "",
      chat: "",
    },
    identifier:
      toTrimmedStringOrNull(source?.system?.identifier) ??
      (netherscrollsId ? `netherscrolls-${netherscrollsId}` : slugifyNetherscrollsIdentifier(source?.name)),
    source: buildNetherscrollsItemSource(sourceName, source),
    cover: normalizeNetherscrollsNullableNumber(source?.system?.cover ?? source?.cover),
    crewed: Boolean(source?.system?.crewed ?? source?.crewed ?? false),
    enchant: {
      max: toTrimmedStringOrNull(source?.system?.enchant?.max ?? source?.enchant?.max) ?? "",
      period: toTrimmedStringOrNull(source?.system?.enchant?.period ?? source?.enchant?.period) ?? "",
    },
    prerequisites: normalizeNetherscrollsFeatPrerequisites(source),
    properties: normalizeNetherscrollsFeatProperties(source),
    requirements: toTrimmedStringOrNull(source?.system?.requirements ?? source?.requirement) ?? null,
    type: normalizeNetherscrollsFeatType(source),
    uses: normalizeNetherscrollsItemUses(source),
  };
}

function normalizeNetherscrollsFeatAdvancement(source) {
  const explicit = source?.system?.advancement ?? source?.advancement;
  if (explicit && typeof explicit === "object" && !Array.isArray(explicit)) {
    return explicit;
  }

  if (!isNetherscrollsDemifeatSource(source)) return {};
  const abilities = normalizeNetherscrollsFeatAbilities(source?.ability ?? source?.abilities);
  if (!abilities.length) return {};

  const fixed = {};
  for (const ability of abilities) fixed[ability] = 1;
  const id = buildNetherscrollsStableId(`asi${source?.netherscrollsId ?? source?._id ?? source?.id ?? source?.name ?? ""}`);
  return {
    [id]: {
      _id: id,
      type: "AbilityScoreImprovement",
      configuration: {
        cap: 2,
        fixed,
        locked: [],
        points: 0,
      },
      value: {
        type: "asi",
        assignments: {},
      },
      level: 0,
      title: "Ability Score Improvement",
      hint: "",
    },
  };
}

function normalizeNetherscrollsFeatAbilities(value) {
  const values = Array.isArray(value) ? value : [value];
  const abilities = [];
  for (const ability of values) {
    const normalized = normalizeNetherscrollsSaveAbility(ability);
    if (normalized && !abilities.includes(normalized)) abilities.push(normalized);
  }
  return abilities;
}

function isNetherscrollsDemifeatSource(source) {
  return (
    source?.demifeat === true ||
    source?.system?.demifeat === true ||
    source?.flags?.[MODULE_ID]?.demifeat === true ||
    source?.flags?.netherscrolls?.demifeat === true
  );
}

function normalizeNetherscrollsFeatPrerequisites(source) {
  const explicit = source?.system?.prerequisites ?? source?.prerequisites;
  if (explicit && typeof explicit === "object") return explicit;

  return {
    items: [],
    level: normalizeNetherscrollsNullableNumber(source?.level ?? source?.minimumLevel),
    repeatable: Boolean(source?.repeatable ?? false),
  };
}

function normalizeNetherscrollsFeatProperties(source) {
  const explicit = source?.system?.properties ?? source?.properties;
  if (Array.isArray(explicit)) return explicit;
  if (explicit instanceof Set) return Array.from(explicit);
  if (explicit && typeof explicit === "object") {
    return Object.keys(explicit).filter((key) => explicit[key]);
  }
  return [];
}

function normalizeNetherscrollsFeatType(source) {
  const explicit = source?.system?.type ?? source?.foundryType;
  if (explicit && typeof explicit === "object") {
    return {
      value: toTrimmedStringOrNull(explicit.value) ?? "feat",
      subtype: toTrimmedStringOrNull(explicit.subtype) ?? "",
    };
  }

  return {
    value: toTrimmedStringOrNull(source?.foundryType ?? source?.featType) ?? "feat",
    subtype: toTrimmedStringOrNull(source?.subtype) ?? "",
  };
}

function normalizeNetherscrollsItemData(item) {
  if (getNetherscrollsFoundryItemPayload(item)) {
    return normalizeNetherscrollsFoundryItemData(item);
  }

  const source = duplicateNetherscrollsData(item);
  const netherscrollsId = getNetherscrollsSourceId(item);
  const itemType = normalizeNetherscrollsItemDocumentType(source);
  const descriptionHtml = toTrimmedStringOrNull(
    item?.descriptionHtml ?? item?.description ?? source.descriptionHtml ?? source.description
  );
  const sourceName = toTrimmedStringOrNull(source.source);
  const itemData = {
    name: toTrimmedStringOrNull(source.name) ?? "Netherscrolls Item",
    type: itemType,
    img: normalizeNetherscrollsImportImagePath(source.img, source.image),
    sort: 0,
    ownership: {
      default: 0,
    },
    system: buildNetherscrollsItemSystem(source, {
      itemType,
      descriptionHtml,
      netherscrollsId,
      sourceName,
    }),
    effects: [],
  };

  applyNetherscrollsImportFlags(itemData, source, netherscrollsId);
  return itemData;
}

function normalizeNetherscrollsFoundryItemData(item) {
  const source = duplicateNetherscrollsData(getNetherscrollsFoundryItemPayload(item));
  const netherscrollsId = getNetherscrollsSourceId(item);
  source.name = toTrimmedStringOrNull(source.name) ?? "Netherscrolls Item";
  source.type = normalizeNetherscrollsItemDocumentType({
    ...item,
    type: source.type,
    system: source.system,
  });
  source.img = normalizeNetherscrollsImportImagePath(source.img, source.image);
  source.sort ??= 0;
  source.ownership ??= { default: 0 };
  source.effects ??= [];

  const descriptionHtml = toTrimmedStringOrNull(
    source.system?.description?.value ?? item?.descriptionHtml ?? item?.description
  );
  const sourceName = toTrimmedStringOrNull(item?.source ?? source?.system?.source?.book);
  const defaults = buildNetherscrollsItemSystem(
    {
      ...item,
      system: source.system,
      type: source.type,
      properties: item?.properties ?? source.system?.properties,
    },
    {
      itemType: source.type,
      descriptionHtml,
      netherscrollsId,
      sourceName,
    }
  );
  source.system = mergeNetherscrollsDefaults(defaults, source.system ?? {});
  source.system.identifier ??=
    netherscrollsId ? `netherscrolls-${netherscrollsId}` : slugifyNetherscrollsIdentifier(source.name);
  source.system.source = buildNetherscrollsItemSource(sourceName, {
    ...item,
    system: {
      ...(item?.system ?? {}),
      source: source.system.source,
    },
  });

  applyNetherscrollsImportFlags(source, item, netherscrollsId);
  return source;
}

function buildNetherscrollsItemSystem(source, { itemType, descriptionHtml, netherscrollsId, sourceName }) {
  const system = {
    activities: normalizeNetherscrollsActivities(source),
    description: {
      value: descriptionHtml ?? "",
      chat: "",
    },
    identifier:
      toTrimmedStringOrNull(source?.system?.identifier ?? source?.identifier) ??
      (netherscrollsId ? `netherscrolls-${netherscrollsId}` : slugifyNetherscrollsIdentifier(source?.name)),
    source: buildNetherscrollsItemSource(sourceName, source),
    identified: Boolean(source?.system?.identified ?? source?.identified ?? true),
    unidentified: normalizeNetherscrollsUnidentifiedData(source),
    container: source?.system?.container ?? source?.container ?? null,
    quantity: normalizeNetherscrollsItemQuantity(source),
    uses: normalizeNetherscrollsItemUses(source),
    weight: normalizeNetherscrollsItemWeight(source),
    price: normalizeNetherscrollsItemPrice(source),
    rarity: normalizeNetherscrollsItemRarity(source?.system?.rarity ?? source?.rarity),
    properties: normalizeNetherscrollsItemProperties(source, itemType),
  };

  if (isNetherscrollsEquippableItemType(itemType)) {
    system.attunement = normalizeNetherscrollsItemAttunement(source?.system?.attunement ?? source?.attunement);
    system.attuned = Boolean(source?.system?.attuned ?? source?.attuned ?? false);
    system.equipped = Boolean(source?.system?.equipped ?? source?.equipped ?? false);
  }

  applyNetherscrollsItemTypeSystem(system, source, itemType);
  applyNetherscrollsMountableItemFields(system, source);
  return system;
}

function normalizeNetherscrollsUnidentifiedData(source) {
  const unidentified = source?.system?.unidentified ?? source?.unidentified ?? {};
  return {
    name: toTrimmedStringOrNull(unidentified?.name) ?? "",
    description: toTrimmedStringOrNull(unidentified?.description) ?? "",
  };
}

function applyNetherscrollsMountableItemFields(system, source) {
  const cover = source?.system?.cover ?? source?.cover;
  if (cover !== undefined) system.cover = normalizeNetherscrollsNullableNumber(cover);

  const crew = source?.system?.crew ?? source?.crew;
  if (crew && typeof crew === "object") {
    system.crew = {
      max: normalizeNetherscrollsNullableNumber(crew.max),
      value: Array.isArray(crew.value) ? crew.value : [],
    };
  }

  const hp = source?.system?.hp ?? source?.hp;
  if (hp && typeof hp === "object") {
    system.hp = {
      value: normalizeNetherscrollsNullableNumber(hp.value),
      max: normalizeNetherscrollsNullableNumber(hp.max),
      dt: normalizeNetherscrollsNullableNumber(hp.dt),
      conditions: toTrimmedStringOrNull(hp.conditions) ?? "",
    };
  }

  const speed = source?.system?.speed ?? source?.speed;
  if (speed && typeof speed === "object") {
    system.speed = {
      value: normalizeNetherscrollsNullableNumber(speed.value),
      units: toTrimmedStringOrNull(speed.units ?? speed.unit) ?? "ft",
      conditions: toTrimmedStringOrNull(speed.conditions) ?? "",
    };
  }
}

function applyNetherscrollsItemTypeSystem(system, source, itemType) {
  if (itemType === "weapon") {
    const baseData = getNetherscrollsWeaponBaseData(source);
    const damageType = getNetherscrollsItemDamageType(source) ?? baseData?.damageType ?? null;
    const baseDamage = getNetherscrollsFirstItemValue(
      source?.system?.damage?.base,
      source?.damage?.base,
      source?.damage,
      baseData?.damage
    );
    const versatileDamage = getNetherscrollsFirstItemValue(
      source?.system?.damage?.versatile,
      source?.damage?.versatile,
      source?.versatileDamage,
      baseData?.versatileDamage
    );
    system.activities = normalizeNetherscrollsActivities(source);
    system.ammunition = normalizeNetherscrollsWeaponAmmunition(source);
    system.armor = {
      value: Math.max(0, toNumber(source?.system?.armor?.value ?? source?.armor?.value, 0)),
    };
    system.damage = {
      base: normalizeNetherscrollsItemDamagePart(baseDamage, damageType),
      versatile: normalizeNetherscrollsItemDamagePart(versatileDamage, versatileDamage == null ? null : damageType),
    };
    system.magicalBonus = normalizeNetherscrollsMagicalBonus(source);
    system.mastery = toTrimmedStringOrNull(source?.system?.mastery ?? source?.mastery) ?? "";
    system.proficient = normalizeNetherscrollsNullableNumber(source?.system?.proficient ?? source?.proficient);
    system.range = normalizeNetherscrollsWeaponRange(source, baseData);
    system.type = normalizeNetherscrollsItemSubtype(source, "weapon");
    return;
  }

  if (itemType === "equipment") {
    const baseData = getNetherscrollsArmorBaseData(source);
    system.activities = normalizeNetherscrollsActivities(source);
    system.armor = normalizeNetherscrollsEquipmentArmor(source, baseData);
    system.proficient = normalizeNetherscrollsNullableNumber(source?.system?.proficient ?? source?.proficient);
    system.strength = normalizeNetherscrollsNullableNumber(
      getNetherscrollsFirstItemValue(source?.system?.strength, source?.armor?.strength, source?.strength, baseData?.strength)
    );
    system.type = normalizeNetherscrollsItemSubtype(source, "equipment");
    return;
  }

  if (itemType === "consumable") {
    system.activities = normalizeNetherscrollsActivities(source);
    system.damage = {
      base: normalizeNetherscrollsItemDamagePart(
        source?.system?.damage?.base ?? source?.damage?.base ?? source?.damage,
        getNetherscrollsItemDamageType(source)
      ),
      replace: Boolean(source?.system?.damage?.replace ?? source?.damage?.replace ?? false),
    };
    system.magicalBonus = normalizeNetherscrollsMagicalBonus(source);
    system.type = normalizeNetherscrollsItemSubtype(source, "consumable");
    system.uses = normalizeNetherscrollsItemUses(source);
    return;
  }

  if (itemType === "tool") {
    system.activities = normalizeNetherscrollsActivities(source);
    system.ability = normalizeNetherscrollsSaveAbility(source?.system?.ability ?? source?.ability) ?? "";
    system.bonus = sanitizeNetherscrollsBonusFormula(source?.system?.bonus ?? source?.bonus);
    system.chatFlavor = toTrimmedStringOrNull(source?.system?.chatFlavor ?? source?.chatFlavor) ?? "";
    system.proficient = normalizeNetherscrollsNullableNumber(source?.system?.proficient ?? source?.proficient);
    system.type = normalizeNetherscrollsItemSubtype(source, "tool");
    return;
  }

  if (itemType === "container") {
    system.capacity = normalizeNetherscrollsItemCapacity(source);
    system.quantity = 1;
    return;
  }

  system.type = normalizeNetherscrollsItemSubtype(source, "loot");
}

function normalizeNetherscrollsItemDocumentType(source) {
  const raw = toTrimmedStringOrNull(
    source?.type ?? source?.itemType ?? source?.documentType ?? source?.system?.documentType
  )?.toLowerCase();
  const label = raw?.replace(/[_-]+/g, " ").trim();
  if (NETHERSCROLLS_ITEM_TYPES.has(raw)) return raw;
  if (raw === "armor" || raw === "shield") return "equipment";
  if (["magic item", "wondrous", "wondrous item", "wondrousitem", "ring", "rod", "wand", "staff", "focus", "clothing", "trinket"].includes(label)) {
    return "equipment";
  }
  if (raw === "backpack" || raw === "bag") return "container";
  if (raw === "ammunition" || raw === "ammo" || raw === "potion" || raw === "scroll") return "consumable";
  if (raw === "art" || raw === "gem" || raw === "treasure" || raw === "trade") return "loot";
  if (getNetherscrollsWeaponBaseData(source)) return "weapon";
  if (getNetherscrollsArmorBaseData(source)) return "equipment";
  if (source?.armor && Object.keys(source.armor).length) return "equipment";
  return "loot";
}

function normalizeNetherscrollsItemSubtype(source, itemType) {
  const explicit = source?.system?.type ?? source?.foundryType;
  if (explicit && typeof explicit === "object") {
    const value = normalizeNetherscrollsItemSubtypeValue(
      explicit.value ?? explicit.type ?? source?.subtype,
      itemType,
      source
    );
    return buildNetherscrollsItemTypeObject(itemType, value, {
      subtype: explicit.subtype,
      baseItem: getNetherscrollsFirstItemValue(explicit.baseItem, getNetherscrollsItemBaseItem(source, itemType)),
    });
  }

  const value = normalizeNetherscrollsItemSubtypeValue(
    source?.subtype ??
      source?.itemSubtype ??
      source?.weaponType ??
      source?.equipmentType ??
      source?.consumableType ??
      source?.toolType ??
      source?.lootType ??
      source?.foundryType ??
      source?.armor?.type ??
      source?.type,
    itemType,
    source
  );
  return buildNetherscrollsItemTypeObject(itemType, value, {
    baseItem: getNetherscrollsItemBaseItem(source, itemType),
  });
}

function buildNetherscrollsItemTypeObject(itemType, value, source = {}) {
  const type = {
    value: value ?? "",
  };
  if (itemType === "consumable" || itemType === "loot") {
    type.subtype = toTrimmedStringOrNull(source.subtype) ?? "";
  } else {
    type.baseItem = toTrimmedStringOrNull(source.baseItem) ?? "";
  }
  return type;
}

function normalizeNetherscrollsItemSubtypeValue(value, itemType, source = {}) {
  const raw = toTrimmedStringOrNull(value)?.toLowerCase();
  const label = raw?.replace(/[_-]+/g, " ").trim();
  if (itemType === "weapon") {
    if (["simplem", "simple melee", "simple melee weapon"].includes(label)) return "simpleM";
    if (["simpler", "simple ranged", "simple ranged weapon"].includes(label)) return "simpleR";
    if (["martialm", "martial melee", "martial melee weapon"].includes(label)) return "martialM";
    if (["martialr", "martial ranged", "martial ranged weapon"].includes(label)) return "martialR";
    if (["natural", "improv", "improvised", "siege"].includes(label)) {
      return label === "improvised" ? "improv" : label;
    }
    const baseData = getNetherscrollsWeaponBaseData(source);
    if (baseData?.type) return baseData.type;
    const nameType = NETHERSCROLLS_WEAPON_TYPE_BY_NAME[normalizeNetherscrollsItemNameKey(source?.name)];
    return nameType ?? "simpleM";
  }

  if (itemType === "equipment") {
    if (["light", "medium", "heavy", "natural", "shield", "clothing", "focus", "trinket"].includes(label)) {
      return label;
    }
    if (label === "light armor") return "light";
    if (label === "medium armor") return "medium";
    if (label === "heavy armor") return "heavy";
    const baseData = getNetherscrollsArmorBaseData(source);
    if (baseData?.type) return baseData.type;
    if (/\bshield\b/i.test(String(source?.name ?? ""))) return "shield";
    return source?.armor && Object.keys(source.armor).length ? "light" : "trinket";
  }

  if (itemType === "consumable") {
    if (["ammo", "ammunition"].includes(label)) return "ammo";
    if (["potion", "poison", "food", "scroll", "wand", "rod", "trinket"].includes(label)) return label;
    if (/\b(potion|elixir)\b/i.test(String(source?.name ?? ""))) return "potion";
    if (/\bscroll\b/i.test(String(source?.name ?? ""))) return "scroll";
    if (normalizeNetherscrollsItemProperties(source, "consumable").includes("amm")) return "ammo";
    return "trinket";
  }

  if (itemType === "loot") {
    if (["art", "gear", "gem", "junk", "material", "resource", "trade", "treasure"].includes(label)) {
      return label;
    }
    return "gear";
  }

  return raw ?? itemType;
}

function normalizeNetherscrollsItemNameKey(name) {
  return String(name ?? "")
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getNetherscrollsWeaponBaseData(source) {
  return getNetherscrollsBaseDataByName(source, NETHERSCROLLS_WEAPON_BASE_DATA_BY_NAME);
}

function getNetherscrollsArmorBaseData(source) {
  return getNetherscrollsBaseDataByName(source, NETHERSCROLLS_ARMOR_BASE_DATA_BY_NAME);
}

function getNetherscrollsBaseDataByName(source, lookup) {
  const key = normalizeNetherscrollsItemNameKey(source?.name);
  if (!key) return null;
  return lookup[key] ?? lookup[key.replace(/\s+(?:armor|weapon)$/i, "")] ?? null;
}

function getNetherscrollsItemBaseItem(source, itemType) {
  const baseData = getNetherscrollsItemBaseData(source, itemType);
  return toTrimmedStringOrNull(baseData?.baseItem);
}

function getNetherscrollsItemBaseData(source, itemType) {
  if (itemType === "weapon") return getNetherscrollsWeaponBaseData(source);
  if (itemType === "equipment") return getNetherscrollsArmorBaseData(source);
  return null;
}

function getNetherscrollsFirstItemValue(...values) {
  for (const value of values) {
    if (value == null) continue;
    if (typeof value === "string" && !value.trim()) continue;
    if (Array.isArray(value) && !value.length) continue;
    if (typeof value === "object" && !Array.isArray(value) && !Object.keys(value).length) continue;
    return value;
  }
  return undefined;
}

function normalizeNetherscrollsItemQuantity(source) {
  const value = normalizeNetherscrollsNullableNumber(source?.system?.quantity ?? source?.quantity);
  return Math.max(1, Math.trunc(value ?? 1));
}

function normalizeNetherscrollsItemWeight(source) {
  const weight = source?.system?.weight ?? source?.weight;
  if (weight && typeof weight === "object") {
    return {
      value: Math.max(0, toNumber(weight.value ?? weight.lb ?? weight.lbs ?? weight.pounds ?? 0)),
      units: normalizeNetherscrollsWeightUnit(weight.units ?? weight.unit ?? (weight.kg != null ? "kg" : "lb")),
    };
  }
  return {
    value: Math.max(0, toNumber(weight, 0)),
    units: "lb",
  };
}

function normalizeNetherscrollsWeightUnit(value) {
  const unit = toTrimmedStringOrNull(value)?.toLowerCase();
  if (unit === "kg" || unit === "kilogram" || unit === "kilograms") return "kg";
  if (unit === "ton" || unit === "tons") return "ton";
  return "lb";
}

function normalizeNetherscrollsItemPrice(source) {
  const price = source?.system?.price ?? source?.price;
  if (price && typeof price === "object") {
    const directValue = normalizeNetherscrollsNullableNumber(price.value ?? price.amount);
    if (directValue != null) {
      return {
        value: Math.max(0, directValue),
        denomination: normalizeNetherscrollsCurrencyDenomination(price.denomination ?? price.currency),
      };
    }

    for (const denomination of ["pp", "gp", "ep", "sp", "cp"]) {
      const value = normalizeNetherscrollsNullableNumber(price[denomination]);
      if (value != null) {
        return {
          value: Math.max(0, value),
          denomination,
        };
      }
    }
  }
  return {
    value: Math.max(0, toNumber(price, 0)),
    denomination: "gp",
  };
}

function normalizeNetherscrollsCurrencyDenomination(value) {
  const denomination = toTrimmedStringOrNull(value)?.toLowerCase();
  return ["pp", "gp", "ep", "sp", "cp"].includes(denomination) ? denomination : "gp";
}

function normalizeNetherscrollsItemRarity(value) {
  const raw = toTrimmedStringOrNull(value);
  if (!raw) return "";
  const normalized = raw.toLowerCase().replace(/[_-]+/g, " ").trim();
  if (normalized === "mundane" || normalized === "none") return "";
  if (normalized === "very rare") return "veryRare";
  if (NETHERSCROLLS_ITEM_RARITIES.has(normalized)) return normalized;
  return "";
}

function normalizeNetherscrollsItemAttunement(value) {
  if (value === 1 || value === 2 || value === true) return "required";
  const normalized = toTrimmedStringOrNull(value)?.toLowerCase();
  if (!normalized || normalized === "0" || normalized === "false" || normalized === "none") return "";
  if (normalized === "required" || normalized.includes("requires attunement")) return "required";
  if (normalized === "optional") return "optional";
  return "";
}

function normalizeNetherscrollsItemProperties(source, itemType) {
  const values = [
    ...(Array.isArray(source?.system?.properties) ? source.system.properties : []),
    ...(Array.isArray(source?.properties) ? source.properties : []),
    ...(Array.isArray(source?.tags) ? source.tags : []),
  ];
  if (typeof source?.system?.properties === "string") values.push(source.system.properties);
  if (typeof source?.properties === "string") values.push(source.properties);
  if (typeof source?.tags === "string") values.push(source.tags);
  if (source?.system?.properties instanceof Set) values.push(...source.system.properties);
  if (source?.properties instanceof Set) values.push(...source.properties);
  if (source?.system?.properties && typeof source.system.properties === "object" && !Array.isArray(source.system.properties)) {
    values.push(...Object.keys(source.system.properties).filter((key) => source.system.properties[key]));
  }
  if (source?.properties && typeof source.properties === "object" && !Array.isArray(source.properties)) {
    values.push(...Object.keys(source.properties).filter((key) => source.properties[key]));
  }

  const properties = new Set();
  for (const value of values) {
    const property = normalizeNetherscrollsItemProperty(value);
    if (property) properties.add(property);
  }
  const baseData = getNetherscrollsItemBaseData(source, itemType);
  for (const property of baseData?.properties ?? []) {
    const normalized = normalizeNetherscrollsItemProperty(property);
    if (normalized) properties.add(normalized);
  }

  const rarity = normalizeNetherscrollsItemRarity(source?.system?.rarity ?? source?.rarity);
  const attunement = normalizeNetherscrollsItemAttunement(source?.system?.attunement ?? source?.attunement);
  if (source?.magical === true || source?.isMagic === true || attunement || (rarity && rarity !== "common")) {
    properties.add("mgc");
  }

  const valid = NETHERSCROLLS_ITEM_VALID_PROPERTIES[itemType] ?? null;
  return Array.from(properties).filter((property) => !valid || valid.has(property));
}

function normalizeNetherscrollsItemProperty(value) {
  const raw = toTrimmedStringOrNull(value);
  if (!raw) return null;
  const key = raw.toLowerCase().replace(/[_]+/g, " ").trim();
  return NETHERSCROLLS_ITEM_PROPERTY_ALIASES[key] ?? raw;
}

function isNetherscrollsEquippableItemType(itemType) {
  return ["weapon", "equipment", "consumable", "tool", "container"].includes(itemType);
}

function normalizeNetherscrollsWeaponAmmunition(source) {
  const ammunition = source?.system?.ammunition ?? source?.ammunition;
  if (ammunition && typeof ammunition === "object") {
    return {
      type: toTrimmedStringOrNull(ammunition.type) ?? "",
    };
  }
  return {
    type: toTrimmedStringOrNull(ammunition) ?? "",
  };
}

function normalizeNetherscrollsItemDamagePart(value, fallbackType = null) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if ("number" in value || "denomination" in value || "custom" in value) {
      return buildNetherscrollsActivityPart({
        ...value,
        types: normalizeNetherscrollsItemDamageTypes(value.types ?? value.type ?? value.damageType, fallbackType),
      });
    }
    if (Array.isArray(value.parts) && value.parts.length) {
      return normalizeNetherscrollsItemDamagePart(value.parts[0], fallbackType);
    }
  }

  if (Array.isArray(value)) {
    const formula = toTrimmedStringOrNull(value[0]);
    const type = normalizeNetherscrollsDamageType(value[1]) ?? fallbackType;
    return formula
      ? removeBlankNetherscrollsDamageTypes(parseNetherscrollsDicePart(formula, type ?? ""))
      : buildNetherscrollsEmptyDamagePart(type);
  }

  const formula = parseNetherscrollsFormulaFromUnknown(value);
  if (!formula) return buildNetherscrollsEmptyDamagePart(fallbackType);
  return removeBlankNetherscrollsDamageTypes(parseNetherscrollsDicePart(formula, fallbackType ?? ""));
}

function normalizeNetherscrollsItemDamageTypes(value, fallbackType = null) {
  const values = Array.isArray(value) ? value : [value];
  const types = values.map(normalizeNetherscrollsDamageType).filter(Boolean);
  if (!types.length && fallbackType) types.push(fallbackType);
  return types;
}

function buildNetherscrollsEmptyDamagePart(type = null) {
  return {
    number: null,
    denomination: 0,
    bonus: "",
    types: type ? [type] : [],
    custom: {
      enabled: false,
      formula: "",
    },
    scaling: {
      mode: "whole",
      number: null,
      formula: "",
    },
  };
}

function removeBlankNetherscrollsDamageTypes(part) {
  return {
    ...part,
    types: Array.isArray(part?.types) ? part.types.filter(Boolean) : [],
  };
}

function getNetherscrollsItemDamageType(source) {
  return (
    normalizeNetherscrollsDamageType(
      Array.isArray(source?.damageTypes) ? source.damageTypes[0] : source?.damageType
    ) ??
    normalizeNetherscrollsDamageType(source?.system?.damage?.type) ??
    getNetherscrollsWeaponBaseData(source)?.damageType ??
    null
  );
}

function normalizeNetherscrollsMagicalBonus(source) {
  return sanitizeNetherscrollsBonusFormula(
    source?.system?.magicalBonus ?? source?.magicalBonus ?? source?.bonus
  );
}

function normalizeNetherscrollsWeaponRange(source, baseData = getNetherscrollsWeaponBaseData(source)) {
  const range = getNetherscrollsFirstItemValue(source?.system?.range, source?.range);
  const baseRange = baseData?.range ?? {};
  if (range && typeof range === "object") {
    return {
      value: normalizeNetherscrollsNullableNumber(
        getNetherscrollsFirstItemValue(range.value, range.distance, baseRange.value)
      ),
      long: normalizeNetherscrollsNullableNumber(getNetherscrollsFirstItemValue(range.long, baseRange.long)),
      reach: normalizeNetherscrollsNullableNumber(getNetherscrollsFirstItemValue(range.reach, baseRange.reach)),
      units: toTrimmedStringOrNull(range.units ?? range.unit ?? baseRange.units) ?? "ft",
    };
  }

  const weaponRange = parseNetherscrollsWeaponRangeText(range);
  if (weaponRange) {
    return {
      value: normalizeNetherscrollsNullableNumber(weaponRange.value),
      long: normalizeNetherscrollsNullableNumber(weaponRange.long),
      reach: normalizeNetherscrollsNullableNumber(baseRange.reach),
      units: weaponRange.units,
    };
  }

  const parsed = parseNetherscrollsRangeText(range);
  return {
    value: normalizeNetherscrollsNullableNumber(getNetherscrollsFirstItemValue(parsed?.value, baseRange.value)),
    long: normalizeNetherscrollsNullableNumber(baseRange.long),
    reach: normalizeNetherscrollsNullableNumber(baseRange.reach),
    units: parsed?.units ?? baseRange.units ?? "ft",
  };
}

function parseNetherscrollsWeaponRangeText(value) {
  const raw = toTrimmedStringOrNull(value);
  if (!raw) return null;
  const match = /(\d+)\s*(?:\/|-)\s*(\d+)\s*(?:ft|feet|foot)?\b/i.exec(raw);
  if (!match) return null;
  return {
    value: Number(match[1]),
    long: Number(match[2]),
    units: "ft",
  };
}

function normalizeNetherscrollsEquipmentArmor(source, baseData = getNetherscrollsArmorBaseData(source)) {
  const armor = source?.system?.armor ?? source?.armor ?? {};
  return {
    value: Math.max(0, toNumber(getNetherscrollsFirstItemValue(armor.value, armor.ac, armor.armorClass, baseData?.ac), 0)),
    magicalBonus: sanitizeNetherscrollsBonusFormula(armor.magicalBonus ?? source?.magicalBonus),
    dex: normalizeNetherscrollsNullableNumber(getNetherscrollsFirstItemValue(armor.dex, armor.dexterity, baseData?.dex)),
  };
}

function normalizeNetherscrollsItemUses(source) {
  const uses = source?.system?.uses ?? source?.uses ?? {};
  return {
    spent: Math.max(0, toNumber(uses.spent, 0)),
    max: toTrimmedStringOrNull(uses.max) ?? "",
    recovery: Array.isArray(uses.recovery) ? uses.recovery : [],
    autoDestroy: Boolean(uses.autoDestroy),
  };
}

function normalizeNetherscrollsItemCapacity(source) {
  const capacity = source?.system?.capacity ?? source?.capacity ?? {};
  const count = normalizeNetherscrollsNullableNumber(capacity.count ?? capacity.items);
  const result = {
    volume: {
      value: Math.max(0, toNumber(capacity.volume?.value ?? capacity.volume, 0)),
      units: toTrimmedStringOrNull(capacity.volume?.units ?? capacity.volumeUnits) ?? "ft3",
    },
    weight: {
      value: Math.max(0, toNumber(capacity.weight?.value ?? capacity.weight, 0)),
      units: normalizeNetherscrollsWeightUnit(capacity.weight?.units ?? capacity.weightUnits),
    },
  };
  if (count != null) result.count = Math.max(0, Math.trunc(count));
  return result;
}

function normalizeNetherscrollsNullableNumber(value) {
  const number = toNumberOrNull(value);
  return number == null ? null : number;
}

function buildNetherscrollsItemSource(sourceName, source = {}) {
  return buildNetherscrollsSpellSource(sourceName, source);
}

function getNetherscrollsSystemValue(source, key) {
  return source?.system?.[key] ?? source?.[key];
}

function getNetherscrollsFoundrySourceValue(source) {
  return source?.system?.source ?? source?.foundrySource ?? source?.source;
}

function normalizeNetherscrollsActivities(source) {
  const activities = getNetherscrollsSystemValue(source, "activities");
  return activities && typeof activities === "object" && !Array.isArray(activities) ? activities : {};
}

function hasNetherscrollsObjectEntries(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length);
}

function sanitizeNetherscrollsFormulaCount(value) {
  const raw = toTrimmedStringOrNull(value);
  if (!raw) return "";
  if (/\d+d\d+/i.test(raw)) return "";
  const allowed = /^(?:\d+(?:\.\d+)?|@[a-z_][\w.]*|[+\-*/%()\s])+$/i;
  return allowed.test(raw) ? raw : "";
}

function sanitizeNetherscrollsTargetData(target) {
  if (!target || typeof target !== "object") return target;
  const sanitized = duplicateNetherscrollsData(target);
  sanitized.affects = sanitized.affects ?? {};
  sanitized.affects.count = sanitizeNetherscrollsFormulaCount(sanitized.affects.count);
  if (sanitized.template && typeof sanitized.template === "object") {
    sanitized.template.count = sanitizeNetherscrollsFormulaCount(sanitized.template.count);
  }
  return sanitized;
}

function sanitizeNetherscrollsActivityTargets(activities) {
  if (!activities || typeof activities !== "object" || Array.isArray(activities)) return activities;
  for (const activity of Object.values(activities)) {
    if (activity?.target && typeof activity.target === "object") {
      activity.target = sanitizeNetherscrollsTargetData(activity.target);
    }
  }
  return activities;
}

function applyNetherscrollsImportFlags(documentData, source, netherscrollsId) {
  if (!netherscrollsId) return;
  documentData.flags = documentData.flags ?? {};
  documentData.flags[MODULE_ID] = {
    ...(documentData.flags[MODULE_ID] ?? {}),
    netherscrollsId,
  };

  const lastRev = normalizeNetherscrollsReferenceValue(source?.lastRev);
  if (lastRev) documentData.flags[MODULE_ID].lastRev = lastRev;
  if (Array.isArray(source?.tags)) documentData.flags[MODULE_ID].tags = source.tags;
  if (Array.isArray(source?.ability)) documentData.flags[MODULE_ID].ability = source.ability;
  if (Array.isArray(source?.classes)) documentData.flags[MODULE_ID].classes = source.classes;
  if (source?.demifeat != null) documentData.flags[MODULE_ID].demifeat = Boolean(source.demifeat);
  if (source?.isHomebrew != null) documentData.flags[MODULE_ID].isHomebrew = Boolean(source.isHomebrew);
}

function mergeNetherscrollsDefaults(defaults, data) {
  if (foundry?.utils?.mergeObject) {
    return foundry.utils.mergeObject(defaults, data, { inplace: false });
  }
  return {
    ...defaults,
    ...(data ?? {}),
  };
}

function normalizeNetherscrollsSpellData(spell) {
  if (getNetherscrollsFoundryItemPayload(spell)) {
    return normalizeNetherscrollsFoundrySpellData(spell);
  }

  const source = duplicateNetherscrollsData(spell);
  const netherscrollsId = getNetherscrollsSourceId(spell);
  const descriptionHtml = toTrimmedStringOrNull(
    spell?.descriptionHtml ?? spell?.description ?? source.descriptionHtml ?? source.description
  );
  const sourceName = toTrimmedStringOrNull(source.source);
  const school = getNetherscrollsSpellSchool(source);
  const schoolKey = getNetherscrollsSpellSchoolSystemKey(school);
  const inferred = inferNetherscrollsSpellFields(source, descriptionHtml);
  const activities = normalizeNetherscrollsActivities(source);
  const itemData = {
    name: toTrimmedStringOrNull(source.name) ?? "Netherscrolls Spell",
    type: "spell",
    img: normalizeNetherscrollsImportImagePath(source.img, source.image),
    sort: 0,
    ownership: {
      default: 0,
    },
    system: {
      activities: hasNetherscrollsObjectEntries(activities)
        ? sanitizeNetherscrollsActivityTargets(activities)
        : inferred.activity ? sanitizeNetherscrollsActivityTargets({ [inferred.activity._id]: inferred.activity }) : {},
      activation: inferred.activation,
      ability: normalizeNetherscrollsSaveAbility(source?.system?.ability ?? source?.ability) ?? "",
      description: {
        value: descriptionHtml ?? "",
        chat: "",
      },
      duration: inferred.duration,
      level: getNetherscrollsSpellLevel(source),
      materials: inferred.materials,
      properties: inferred.properties,
      range: inferred.range,
      target: sanitizeNetherscrollsTargetData(inferred.target),
      uses: normalizeNetherscrollsItemUses(source),
    },
    effects: [],
  };
  if (schoolKey) itemData.system.school = schoolKey;
  itemData.system.identifier =
    toTrimmedStringOrNull(source.system?.identifier) ??
    (netherscrollsId ? `netherscrolls-${netherscrollsId}` : slugifyNetherscrollsIdentifier(itemData.name));
  itemData.system.actionType = toTrimmedStringOrNull(source?.system?.actionType ?? source?.actionType) ?? "";
  const sourceItem = toTrimmedStringOrNull(source?.system?.sourceItem ?? source?.sourceItem);
  const sourceClass = getNetherscrollsPrimarySpellClass(source);
  if (sourceItem) itemData.system.sourceItem = sourceItem;
  else if (sourceClass) itemData.system.sourceItem = `class:${sourceClass}`;
  itemData.system.method =
    toTrimmedStringOrNull(source?.system?.method ?? source?.method) ?? "spell";
  itemData.system.prepared = toNumber(source?.system?.prepared ?? source?.prepared, 0);

  itemData.system.source = buildNetherscrollsSpellSource(sourceName, source);

  applyNetherscrollsImportFlags(itemData, source, netherscrollsId);

  return itemData;
}

function normalizeNetherscrollsFoundrySpellData(spell) {
  const source = duplicateNetherscrollsData(getNetherscrollsFoundryItemPayload(spell));
  const netherscrollsId = getNetherscrollsSourceId(spell);
  source.name = toTrimmedStringOrNull(source.name) ?? "Netherscrolls Spell";
  source.type = toTrimmedStringOrNull(source.type) ?? "spell";
  source.img = normalizeNetherscrollsImportImagePath(source.img, source.image);
  source.system = source.system ?? {};
  source.system.level = getNetherscrollsSpellLevel(source);
  source.system.identifier ??=
    netherscrollsId ? `netherscrolls-${netherscrollsId}` : slugifyNetherscrollsIdentifier(source.name);
  const schoolKey = getNetherscrollsSpellSchoolSystemKey(getNetherscrollsSpellSchool(source));
  if (schoolKey) source.system.school = schoolKey;
  source.system.ability ??= normalizeNetherscrollsSaveAbility(spell?.system?.ability ?? spell?.ability) ?? "";
  source.system.actionType ??= toTrimmedStringOrNull(spell?.system?.actionType ?? spell?.actionType) ?? "";
  source.system.method ??= "spell";
  source.system.prepared ??= 0;
  source.system.uses ??= normalizeNetherscrollsItemUses(spell);
  const inferred = inferNetherscrollsSpellFields(
    spell,
    source.system?.description?.value ?? spell?.descriptionHtml ?? spell?.description
  );
  source.system.activation ??= inferred.activation;
  source.system.duration ??= inferred.duration;
  source.system.materials ??= inferred.materials;
  if (!Array.isArray(source.system.properties) || !source.system.properties.length) {
    source.system.properties = inferred.properties;
  }
  source.system.range ??= inferred.range;
  source.system.target = sanitizeNetherscrollsTargetData(source.system.target ?? inferred.target);
  if (!source.system.activities || !Object.keys(source.system.activities).length) {
    const activities = normalizeNetherscrollsActivities(spell);
    source.system.activities = hasNetherscrollsObjectEntries(activities)
      ? sanitizeNetherscrollsActivityTargets(activities)
      : inferred.activity ? sanitizeNetherscrollsActivityTargets({ [inferred.activity._id]: inferred.activity }) : {};
  } else {
    source.system.activities = sanitizeNetherscrollsActivityTargets(source.system.activities);
  }
  const sourceItem = toTrimmedStringOrNull(spell?.system?.sourceItem ?? spell?.sourceItem);
  const sourceClass = getNetherscrollsPrimarySpellClass(spell);
  if (sourceItem) source.system.sourceItem ??= sourceItem;
  else if (sourceClass) source.system.sourceItem ??= `class:${sourceClass}`;
  if (source.system.sourceClass) delete source.system.sourceClass;
  const sourceName = toTrimmedStringOrNull(spell?.source ?? source?.system?.source?.book);
  source.system.source = buildNetherscrollsSpellSource(
    sourceName,
    {
      ...spell,
      system: {
        ...(spell?.system ?? {}),
        source: source.system.source,
      },
    }
  );
  source.effects ??= [];
  applyNetherscrollsImportFlags(source, spell, netherscrollsId);
  return source;
}

function slugifyNetherscrollsIdentifier(value) {
  return (
    toTrimmedStringOrNull(value)
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "netherscrolls-spell"
  );
}

function buildNetherscrollsSpellSource(sourceName, source = {}) {
  const foundrySource = getNetherscrollsFoundrySourceValue(source);
  const foundrySourceBook = typeof foundrySource === "object" ? foundrySource?.book : foundrySource;
  return {
    book: toTrimmedStringOrNull(sourceName ?? foundrySourceBook) ?? "",
    page: String(source?.page ?? source?.sourcePage ?? foundrySource?.page ?? ""),
    custom: String(source?.customSource ?? foundrySource?.custom ?? ""),
    license: String(source?.license ?? foundrySource?.license ?? ""),
    revision: toNumber(source?.revision ?? foundrySource?.revision, 1),
    rules: String(source?.rules ?? foundrySource?.rules ?? "2024"),
  };
}

function inferNetherscrollsSpellFields(source, descriptionHtml) {
  const text = normalizeNetherscrollsSpellText(descriptionHtml);
  const primaryText = getNetherscrollsPrimarySpellText(text);
  const activation = inferNetherscrollsSpellActivation(source, text);
  const properties = inferNetherscrollsSpellProperties(source, text);
  const duration = inferNetherscrollsSpellDuration(source, text);
  const range = inferNetherscrollsSpellRange(source, text);
  const target = inferNetherscrollsSpellTarget(source, text);
  const materials = inferNetherscrollsSpellMaterials(source, text);
  const saveAbility = inferNetherscrollsSpellSaveAbility(source, primaryText);
  const healing = inferNetherscrollsSpellHealing(source, primaryText);
  const damage = inferNetherscrollsSpellDamage(source, primaryText);
  const attack = inferNetherscrollsSpellAttack(source, primaryText);
  const activity = buildNetherscrollsSpellActivity(source, {
    activation,
    damage,
    duration,
    healing,
    properties,
    range,
    saveAbility,
    target,
    text: primaryText,
    attack,
  });

  return {
    activation,
    activity,
    duration,
    materials,
    properties,
    range,
    target,
  };
}

function normalizeNetherscrollsSpellText(value) {
  const raw = toTrimmedStringOrNull(value);
  if (!raw) return "";
  const stripped =
    foundry?.utils?.stripHTML?.(raw) ?? String(raw).replace(/<[^>]*>/g, " ");
  return stripped
    .replace(/\[\[\/save\s+([a-z]{3})[^\]]*\]\]/gi, "$1 saving throw")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getNetherscrollsPrimarySpellText(text) {
  return String(text ?? "").split(/\bat higher levels?\b/i)[0].trim();
}

function inferNetherscrollsSpellActivation(source, text) {
  const explicit = source?.system?.activation ?? source?.activation;
  if (explicit && typeof explicit === "object") {
    return {
      type: toTrimmedStringOrNull(explicit.type) ?? "action",
      value: toNumber(explicit.value ?? 1, 1),
      condition: toTrimmedStringOrNull(explicit.condition) ?? "",
    };
  }

  const raw =
    toTrimmedStringOrNull(source?.castingTime) ??
    toTrimmedStringOrNull(source?.casting_time) ??
    getNetherscrollsMetadataLine(text, "Casting Time") ??
    "";
  const activation = parseNetherscrollsActivationText(raw || text);
  return activation ?? { type: "action", value: 1, condition: "" };
}

function parseNetherscrollsActivationText(value) {
  const text = String(value ?? "").toLowerCase();
  if (!text) return null;
  const valueMatch = /\b(\d+)\b/.exec(text);
  const count = valueMatch ? Number(valueMatch[1]) : 1;
  const condition = toTrimmedStringOrNull(String(value).split(",").slice(1).join(","));

  if (/\breaction\b/.test(text)) return { type: "reaction", value: count, condition: condition ?? "" };
  if (/\bbonus action\b/.test(text)) return { type: "bonus", value: count, condition: "" };
  if (/\baction\b/.test(text)) return { type: "action", value: count, condition: "" };
  if (/\bminute\b/.test(text)) return { type: "minute", value: count, condition: "" };
  if (/\bhour\b/.test(text)) return { type: "hour", value: count, condition: "" };
  if (/\bday\b/.test(text)) return { type: "day", value: count, condition: "" };
  return null;
}

function inferNetherscrollsSpellDuration(source, text) {
  const explicit = source?.system?.duration ?? source?.foundryDuration ?? source?.duration;
  if (explicit && typeof explicit === "object") {
    return {
      value: String(explicit.value ?? ""),
      units: toTrimmedStringOrNull(explicit.units ?? explicit.unit) ?? "inst",
      special: String(explicit.special ?? ""),
    };
  }

  const raw =
    toTrimmedStringOrNull(source?.duration) ??
    getNetherscrollsMetadataLine(text, "Duration") ??
    inferNetherscrollsDurationPhrase(text);
  return parseNetherscrollsDurationText(raw) ?? { value: "0", units: "inst", special: "" };
}

function inferNetherscrollsDurationPhrase(text) {
  const source = String(text ?? "");
  const untilTurn = /\buntil the (?:start|end) of (?:your|the target'?s|its) next turn\b/i.exec(source);
  if (untilTurn) return "1 round";
  const lastsFor = /\b(?:lasts?|remain|remains|persists?) for (?:up to )?(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(round|minute|hour|day|month|year)s?\b/i.exec(source);
  if (lastsFor) return `${lastsFor[1]} ${lastsFor[2]}`;
  if (/\binstantaneous\b/i.test(source)) return "instantaneous";
  if (/\buntil dispelled\b/i.test(source)) return "until dispelled";
  return null;
}

function parseNetherscrollsDurationText(value) {
  const raw = toTrimmedStringOrNull(value);
  if (!raw) return null;
  const text = raw.toLowerCase();
  if (/\binstantaneous\b/.test(text)) return { value: "0", units: "inst", special: "" };
  if (/\buntil dispelled\b/.test(text)) return { value: "", units: "disp", special: "" };
  if (/\bpermanent\b/.test(text)) return { value: "", units: "perm", special: "" };

  const match = /(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(turn|round|minute|hour|day|month|year)s?\b/i.exec(raw);
  if (!match) return null;
  return {
    value: String(toNetherscrollsNumber(match[1]) ?? match[1]),
    units: match[2].toLowerCase(),
    special: "",
  };
}

function inferNetherscrollsSpellProperties(source, text) {
  const properties = new Set();
  const explicit = source?.system?.properties ?? source?.properties;
  if (Array.isArray(explicit)) {
    explicit.forEach((property) => addNetherscrollsSpellProperty(properties, property));
  }

  const componentTypes = source?.componentTypes ?? source?.components ?? source?.component_types;
  collectNetherscrollsComponents(componentTypes, properties);
  const metadataComponents = getNetherscrollsMetadataLine(text, "Components");
  collectNetherscrollsComponents(metadataComponents, properties);
  const durationText =
    toTrimmedStringOrNull(source?.duration) ?? getNetherscrollsMetadataLine(text, "Duration");

  if (source?.concentration === true || /\bconcentration\b/i.test(String(durationText ?? ""))) {
    properties.add("concentration");
  }
  if (source?.ritual === true || source?.isRitual === true) properties.add("ritual");

  return Array.from(properties);
}

function collectNetherscrollsComponents(value, properties) {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((component) => collectNetherscrollsComponents(component, properties));
    return;
  }
  if (typeof value === "object") {
    for (const [key, enabled] of Object.entries(value)) {
      if (enabled) addNetherscrollsSpellProperty(properties, key);
    }
    return;
  }

  const text = String(value);
  if (/\bV\b|vocal|verbal/i.test(text)) properties.add("vocal");
  if (/\bS\b|somatic/i.test(text)) properties.add("somatic");
  if (/\bM\b|material/i.test(text)) properties.add("material");
}

function addNetherscrollsSpellProperty(properties, value) {
  const key = String(value ?? "").toLowerCase();
  if (key === "v" || key === "verbal" || key === "vocal") properties.add("vocal");
  if (key === "s" || key === "somatic") properties.add("somatic");
  if (key === "m" || key === "material") properties.add("material");
  if (key === "concentration") properties.add("concentration");
  if (key === "ritual") properties.add("ritual");
}

function inferNetherscrollsSpellMaterials(source, text) {
  const explicit = source?.system?.materials ?? source?.materials;
  if (explicit && typeof explicit === "object") {
    return {
      value: String(explicit.value ?? ""),
      consumed: Boolean(explicit.consumed),
      cost: toNumber(explicit.cost, 0),
      supply: toNumber(explicit.supply, 0),
    };
  }

  const value =
    toTrimmedStringOrNull(source?.componentMaterial) ??
    toTrimmedStringOrNull(source?.material) ??
    toTrimmedStringOrNull(source?.component_material) ??
    parseNetherscrollsMaterialText(text);
  return {
    value: value ?? "",
    consumed: /\bconsume[ds]?\b/i.test(value ?? ""),
    cost: 0,
    supply: 0,
  };
}

function parseNetherscrollsMaterialText(text) {
  const components = getNetherscrollsMetadataLine(text, "Components");
  const match = /\bM\b\s*\(([^)]+)\)/i.exec(components ?? "");
  return toTrimmedStringOrNull(match?.[1]);
}

function inferNetherscrollsSpellRange(source, text) {
  const explicit = source?.system?.range ?? source?.foundryRange ?? source?.range;
  if (explicit && typeof explicit === "object") {
    return normalizeNetherscrollsRangeObject(explicit);
  }

  const raw =
    toTrimmedStringOrNull(source?.range) ??
    getNetherscrollsMetadataLine(text, "Range") ??
    inferNetherscrollsRangePhrase(text);
  return parseNetherscrollsRangeText(raw) ?? { value: "", units: "self", special: "" };
}

function normalizeNetherscrollsRangeObject(range) {
  const units = toTrimmedStringOrNull(range.units ?? range.unit) ?? "ft";
  const value = range.value ?? range.distance ?? "";
  return value === "" || value == null
    ? { value: "", units, special: String(range.special ?? "") }
    : { value: String(value), units, special: String(range.special ?? "") };
}

function inferNetherscrollsRangePhrase(text) {
  const source = String(text ?? "");
  const within = /\bwithin\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:-| )?(feet|foot|ft|mile|miles)\b/i.exec(source);
  if (within) return `${within[1]} ${within[2]}`;
  if (/\bmelee spell attack\b/i.test(source) || /\btouch (?:a|one|the)?\s*creature\b/i.test(source)) return "touch";
  if (/\byou can see\b/i.test(source)) return "sight";
  return null;
}

function parseNetherscrollsRangeText(value) {
  const raw = toTrimmedStringOrNull(value);
  if (!raw) return null;
  const text = raw.toLowerCase();
  if (/\bself\b/.test(text)) return { value: "", units: "self", special: "" };
  if (/\btouch\b/.test(text)) return { value: "", units: "touch", special: "" };
  if (/\bsight\b/.test(text)) return { value: "", units: "sight", special: "" };
  if (/\bunlimited\b/.test(text)) return { value: "", units: "any", special: "" };

  const match = /(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:-| )?(feet|foot|ft|mile|miles)\b/i.exec(raw);
  if (!match) return null;
  return {
    value: String(toNetherscrollsNumber(match[1]) ?? match[1]),
    units: /^mile/i.test(match[2]) ? "mi" : "ft",
    special: "",
  };
}

function inferNetherscrollsSpellTarget(source, text) {
  const explicit = source?.system?.target ?? source?.target;
  if (explicit && typeof explicit === "object") return normalizeNetherscrollsTargetObject(explicit);

  const target = {
    affects: {
      count: "",
      type: "",
      choice: false,
      special: "",
    },
    template: {
      count: "",
      contiguous: false,
      stationary: false,
      type: "",
      size: "",
      width: "",
      height: "",
      units: "ft",
    },
  };

  const sourceText = String(text ?? "");
  const countMatch = /\b(?:up to\s+)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(creature|object|target)s?\b/i.exec(sourceText);
  if (countMatch) {
    target.affects.count = String(toNetherscrollsNumber(countMatch[1]) ?? countMatch[1]);
    target.affects.type = countMatch[2].toLowerCase() === "target" ? "" : countMatch[2].toLowerCase();
  } else if (/\ba creature\b|\bone creature\b|\bthe target\b/i.test(sourceText)) {
    target.affects.count = "1";
    target.affects.type = "creature";
  }

  const template = inferNetherscrollsTemplateTarget(sourceText);
  if (template) target.template = { ...target.template, ...template };
  return target;
}

function normalizeNetherscrollsTargetObject(target) {
  return {
    template: {
      count: sanitizeNetherscrollsFormulaCount(target?.template?.count),
      contiguous: Boolean(target?.template?.contiguous),
      stationary: Boolean(target?.template?.stationary),
      type: String(target?.template?.type ?? ""),
      size: String(target?.template?.size ?? ""),
      width: String(target?.template?.width ?? ""),
      height: String(target?.template?.height ?? ""),
      units: String(target?.template?.units ?? "ft"),
    },
    affects: {
      count: sanitizeNetherscrollsFormulaCount(target?.affects?.count),
      type: String(target?.affects?.type ?? ""),
      choice: Boolean(target?.affects?.choice),
      special: String(target?.affects?.special ?? ""),
    },
  };
}

function inferNetherscrollsTemplateTarget(text) {
  const source = String(text ?? "");
  const sphere = /(\d+)\s*(?:-| )?foot(?:-| )?radius sphere/i.exec(source);
  if (sphere) return { type: "sphere", size: sphere[1], units: "ft" };
  const cone = /(\d+)\s*(?:-| )?foot cone/i.exec(source);
  if (cone) return { type: "cone", size: cone[1], units: "ft" };
  const cube = /(\d+)\s*(?:-| )?foot cube/i.exec(source);
  if (cube) return { type: "cube", size: cube[1], units: "ft" };
  const line = /(\d+)\s*(?:-| )?foot(?:-| )?long(?:,?\s*(\d+)\s*(?:-| )?foot(?:-| )?wide)? line/i.exec(source);
  if (line) return { type: "line", size: line[1], width: line[2] ?? "", units: "ft" };
  return null;
}

function inferNetherscrollsSpellSaveAbility(source, text) {
  const explicit =
    source?.saveAbilities ??
    source?.saveAbility ??
    source?.save?.ability ??
    source?.system?.save?.ability;
  const explicitAbility = normalizeNetherscrollsSaveAbility(explicit);
  if (explicitAbility) return explicitAbility;

  const saveCommand = /\b(str|dex|con|int|wis|cha) saving throw\b/i.exec(text);
  if (saveCommand) return saveCommand[1].toLowerCase();

  for (const [ability, aliases] of Object.entries(NETHERSCROLLS_ABILITY_LABELS)) {
    if (aliases.some((alias) => new RegExp(`\\b${alias}\\s+saving throw\\b`, "i").test(text))) {
      return ability;
    }
  }
  return null;
}

function normalizeNetherscrollsSaveAbility(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  const normalized = toTrimmedStringOrNull(raw)?.toLowerCase();
  if (!normalized) return null;
  for (const [ability, aliases] of Object.entries(NETHERSCROLLS_ABILITY_LABELS)) {
    if (ability === normalized || aliases.includes(normalized)) return ability;
  }
  return null;
}

function inferNetherscrollsSpellAttack(source, text) {
  const explicit = toTrimmedStringOrNull(source?.actionType ?? source?.attackType);
  const content = `${explicit ?? ""} ${text ?? ""}`;
  if (/\bmelee spell attack\b|\bmsak\b/i.test(content)) return "melee";
  if (/\branged spell attack\b|\brsak\b/i.test(content)) return "ranged";
  return null;
}

function inferNetherscrollsSpellHealing(source, text) {
  const explicit = source?.healing ?? source?.heal;
  const explicitFormula = parseNetherscrollsFormulaFromUnknown(explicit);
  const formula =
    explicitFormula ??
    parseNetherscrollsHealingFormula(text) ??
    null;
  if (!formula) return null;
  return {
    ...parseNetherscrollsDicePart(formula, "healing"),
    scaling: inferNetherscrollsScaling(text, "healing"),
  };
}

function inferNetherscrollsSpellDamage(source, text) {
  const explicit = source?.damage;
  const explicitFormula = parseNetherscrollsFormulaFromUnknown(explicit);
  const explicitType = normalizeNetherscrollsDamageType(
    Array.isArray(source?.damageTypes) ? source.damageTypes[0] : source?.damageType
  );
  const parsed =
    explicitFormula
      ? {
          formula: explicitFormula,
          type: explicitType ?? inferNetherscrollsDamageType(text),
        }
      : parseNetherscrollsDamageFormula(text);
  if (!parsed?.formula || !parsed?.type) return null;
  return {
    ...parseNetherscrollsDicePart(parsed.formula, parsed.type),
    scaling: inferNetherscrollsScaling(text, "damage"),
  };
}

function parseNetherscrollsFormulaFromUnknown(value) {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number") {
    return toTrimmedStringOrNull(value);
  }
  if (Array.isArray(value)) {
    return parseNetherscrollsFormulaFromUnknown(value[0]);
  }
  return toTrimmedStringOrNull(value.formula ?? value.value ?? value.damage ?? value.healing);
}

function parseNetherscrollsHealingFormula(text) {
  const source = String(text ?? "");
  const match =
    /\bregains?\s+(?:hit points )?(?:equal to\s+)?(\d+d\d+(?:\s*\+\s*(?:your spellcasting ability modifier|your \w+ modifier|@mod|\d+))?|\d+)\s+hit points\b/i.exec(source) ??
    /\brestore[sd]?\s+(\d+d\d+(?:\s*\+\s*(?:your spellcasting ability modifier|your \w+ modifier|@mod|\d+))?|\d+)\s+hit points\b/i.exec(source);
  return normalizeNetherscrollsFormula(match?.[1]);
}

function parseNetherscrollsDamageFormula(text) {
  const typePattern = NETHERSCROLLS_DAMAGE_TYPES.join("|");
  const regex = new RegExp(
    `\\b(\\d+d\\d+(?:\\s*\\+\\s*(?:your spellcasting ability modifier|your \\w+ modifier|@mod|\\d+))?|\\d+)\\s+(${typePattern})\\s+damage\\b`,
    "i"
  );
  const match = regex.exec(String(text ?? ""));
  if (!match) return null;
  return {
    formula: normalizeNetherscrollsFormula(match[1]),
    type: normalizeNetherscrollsDamageType(match[2]),
  };
}

function inferNetherscrollsDamageType(text) {
  const source = String(text ?? "").toLowerCase();
  return NETHERSCROLLS_DAMAGE_TYPES.find((type) => source.includes(`${type} damage`)) ?? null;
}

function normalizeNetherscrollsDamageType(value) {
  const normalized = toTrimmedStringOrNull(value)?.toLowerCase();
  if (!normalized) return null;
  if (normalized === "heal" || normalized === "healing") return "healing";
  return NETHERSCROLLS_DAMAGE_TYPES.includes(normalized) ? normalized : null;
}

function normalizeNetherscrollsFormula(value) {
  const raw = toTrimmedStringOrNull(value);
  if (!raw) return null;
  return raw
    .replace(/your spellcasting ability modifier/gi, "@mod")
    .replace(/your \w+ modifier/gi, "@mod")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeNetherscrollsFormula(value) {
  const normalized = normalizeNetherscrollsFormula(value);
  if (!normalized) return null;

  const firstPart = normalized.split(",")[0]?.trim() ?? "";
  const match = /^(\d+d\d+(?:\s*[+\-]\s*(?:@mod|\d+))?|\d+|@mod)$/i.exec(firstPart);
  if (match) return match[1];

  return (
    /(\d+d\d+(?:\s*[+\-]\s*(?:@mod|\d+))?|\d+|@mod)/i.exec(firstPart)?.[1] ?? null
  );
}

function sanitizeNetherscrollsBonusFormula(value) {
  const normalized = normalizeNetherscrollsFormula(value);
  if (!normalized) return "";

  const firstPart = normalized.split(",")[0]?.trim() ?? "";
  const safeRollFormula =
    /^[-+]?(?:\d+|@mod|\d+d\d+)(?:\s*[+\-*/]\s*(?:\d+|@mod|\d+d\d+))*$/i;
  return safeRollFormula.test(firstPart) ? firstPart : "";
}

function parseNetherscrollsDicePart(formula, type) {
  const normalized = sanitizeNetherscrollsFormula(formula);
  const dice = /^(\d+)d(\d+)(?:\s*([+-])\s*(.+))?$/i.exec(normalized ?? "");
  if (dice) {
    const bonusValue = sanitizeNetherscrollsBonusFormula(dice[4]);
    const bonusSign = dice[3] === "-" && !bonusValue.startsWith("-") ? "-" : "";
    return {
      number: Number(dice[1]),
      denomination: Number(dice[2]),
      bonus: bonusValue ? `${bonusSign}${bonusValue}` : "",
      types: [type],
      custom: {
        enabled: false,
        formula: "",
      },
    };
  }

  return {
    number: null,
    denomination: 0,
    bonus: sanitizeNetherscrollsBonusFormula(normalized),
    types: [type],
    custom: {
      enabled: false,
      formula: "",
    },
  };
}

function inferNetherscrollsScaling(text, kind) {
  const source = String(text ?? "");
  const scalingText = source.split(/\bat higher levels?\b/i).slice(1).join(" ");
  const formulaMatch =
    /\b(?:damage|healing|amount of healing|amount)\s+increases? by\s+(\d+d\d+|\d+)/i.exec(scalingText) ??
    /\bincreases? by\s+(\d+d\d+|\d+)/i.exec(scalingText);
  const formula = normalizeNetherscrollsFormula(formulaMatch?.[1]);
  const dice = /^(\d+)d(\d+)$/i.exec(formula ?? "");
  if (dice) {
    return {
      mode: "whole",
      number: Number(dice[1]),
      formula: "",
    };
  }
  return {
    mode: "whole",
    number: null,
    formula: formula ?? "",
  };
}

function buildNetherscrollsSpellActivity(source, inferred) {
  const type = getNetherscrollsActivityType(source, inferred);
  if (!type) return null;

  const activity = buildNetherscrollsBaseActivity(source, type, inferred);
  if (type === "attack") {
    activity.attack = {
      ability: "spellcasting",
      bonus: "",
      critical: {},
      flat: false,
      type: {
        value: inferred.attack ?? "ranged",
        classification: "spell",
      },
    };
    if (inferred.damage) activity.damage = buildNetherscrollsActivityDamage(inferred.damage);
  } else if (type === "save") {
    activity.save = {
      ability: [inferred.saveAbility],
      dc: {
        formula: "",
        calculation: "spellcasting",
      },
    };
    activity.damage = buildNetherscrollsSaveActivityDamage(inferred.damage, inferred.text);
  } else if (type === "heal") {
    activity.healing = buildNetherscrollsActivityPart(inferred.healing);
  } else if (type === "damage") {
    activity.damage = buildNetherscrollsActivityDamage(inferred.damage);
  }

  return activity;
}

function getNetherscrollsActivityType(source, inferred) {
  const explicit = toTrimmedStringOrNull(source?.actionType ?? source?.activityType)?.toLowerCase();
  if (explicit === "save" || explicit === "attack" || explicit === "heal" || explicit === "damage") {
    return explicit;
  }
  if (inferred.healing) return "heal";
  if (inferred.attack) return "attack";
  if (inferred.saveAbility) return "save";
  if (inferred.damage) return "damage";
  return null;
}

function buildNetherscrollsBaseActivity(source, type, inferred) {
  const id = buildNetherscrollsActivityId(source, type);
  const range = inferred.range ?? { units: "self" };
  const duration = inferred.duration ?? { value: "0", units: "inst" };
  return {
    type,
    _id: id,
    sort: 0,
    activation: {
      type: inferred.activation?.type ?? "action",
      override: false,
    },
    consumption: {
      spellSlot: true,
      targets: [],
      scaling: {
        allowed: false,
        max: "",
      },
    },
    description: {
      chatFlavor: inferNetherscrollsChatFlavor(inferred.text),
    },
    duration: {
      value: duration.value ?? "",
      units: duration.units ?? "inst",
      concentration: inferred.properties?.includes("concentration") ?? false,
      override: false,
    },
    effects: [],
    range: {
      ...range,
      override: false,
    },
    target: {
      ...(inferred.target ?? {}),
      override: false,
      prompt: true,
    },
    uses: {
      spent: 0,
      recovery: [],
    },
    flags: {},
    visibility: {
      level: {},
      requireAttunement: false,
      requireIdentification: false,
      requireMagic: false,
    },
  };
}

function buildNetherscrollsActivityDamage(damage, text = null) {
  const activityDamage = {
    parts: damage ? [buildNetherscrollsActivityPart(damage)] : [],
    critical: {},
    includeBase: true,
  };
  if (text != null) activityDamage.onSave = inferNetherscrollsOnSave(text);
  return activityDamage;
}

function buildNetherscrollsSaveActivityDamage(damage, text) {
  return {
    parts: damage ? [buildNetherscrollsActivityPart(damage)] : [],
    onSave: inferNetherscrollsOnSave(text),
  };
}

function buildNetherscrollsActivityPart(part) {
  return {
    number: part?.number ?? null,
    denomination: part?.denomination ?? 0,
    bonus: part?.bonus ?? "",
    types: part?.types ?? [],
    custom: part?.custom ?? {
      enabled: false,
      formula: "",
    },
    scaling: part?.scaling ?? {
      mode: "whole",
      number: null,
      formula: "",
    },
  };
}

function inferNetherscrollsOnSave(text) {
  return /\bhalf (?:as much )?damage\b|\btakes? half\b/i.test(String(text ?? ""))
    ? "half"
    : "none";
}

function inferNetherscrollsChatFlavor(text) {
  const match = /\bhas no effect on ([^.]+)\./i.exec(String(text ?? ""));
  return match ? `Restriction: Unaffected: ${match[1]}` : "";
}

function buildNetherscrollsActivityId(source, type) {
  const base = `${type}${source?.netherscrollsId ?? source?._id ?? source?.id ?? source?.name ?? ""}`;
  const firstHash = hashNetherscrollsString(base);
  const secondHash = hashNetherscrollsString([...base].reverse().join(""));
  const raw = `ns${type}${firstHash}${secondHash}`.replace(/[^a-zA-Z0-9]/g, "");
  return raw.padEnd(16, "0").slice(0, 16);
}

function hashNetherscrollsString(value) {
  let hash = 0;
  const text = String(value ?? "");
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function buildNetherscrollsStableId(value) {
  const firstHash = hashNetherscrollsString(value);
  const secondHash = hashNetherscrollsString([...String(value ?? "")].reverse().join(""));
  return `ns${firstHash}${secondHash}`.replace(/[^a-zA-Z0-9]/g, "").padEnd(16, "0").slice(0, 16);
}

function getNetherscrollsMetadataLine(text, label) {
  const regex = new RegExp(`\\b${label}\\s*:\\s*([^\\n.]+)`, "i");
  return toTrimmedStringOrNull(regex.exec(String(text ?? ""))?.[1]);
}

function getNetherscrollsPrimarySpellClass(source) {
  const classes = source?.classes ?? source?.system?.classes;
  const first = Array.isArray(classes) ? classes[0] : classes;
  return toTrimmedStringOrNull(first)?.toLowerCase() ?? null;
}

function toNetherscrollsNumber(value) {
  const normalized = toTrimmedStringOrNull(value)?.toLowerCase();
  if (!normalized) return null;
  const numeric = Number(normalized);
  if (Number.isFinite(numeric)) return numeric;
  return NETHERSCROLLS_NUMBER_WORDS[normalized] ?? null;
}

function duplicateNetherscrollsData(value) {
  if (foundry?.utils?.deepClone) return foundry.utils.deepClone(value ?? {});
  return JSON.parse(JSON.stringify(value ?? {}));
}

async function ensureNetherscrollsClassFolderTree(pack, folderCache) {
  await findOrCreatePackFolder(pack, {
    cache: folderCache,
    name: "Classes",
    type: "Item",
    parent: null,
    sort: 1000,
  });
  await findOrCreatePackFolder(pack, {
    cache: folderCache,
    name: "Subclasses",
    type: "Item",
    parent: null,
    sort: 2000,
  });
}

async function ensureNetherscrollsClassFolder(pack, classData, folderCache) {
  return findOrCreatePackFolder(pack, {
    cache: folderCache,
    name: "Classes",
    type: "Item",
    parent: null,
    sort: 1000,
  });
}

async function ensureNetherscrollsSubclassFolder(pack, subclassData, classSource, folderCache) {
  const root = await findOrCreatePackFolder(pack, {
    cache: folderCache,
    name: "Subclasses",
    type: "Item",
    parent: null,
    sort: 2000,
  });

  return findOrCreatePackFolder(pack, {
    cache: folderCache,
    name: toTrimmedStringOrNull(classSource?.name) ?? "Unknown Class",
    type: "Item",
    parent: root,
    sort: 1000,
  });
}

async function ensureNetherscrollsClassFeatureFolderTree(pack, folderCache) {
  return folderCache;
}

async function ensureNetherscrollsClassFeatureFolder(pack, descriptor, folderCache) {
  const classFolder = await findOrCreatePackFolder(pack, {
    cache: folderCache,
    name: toTrimmedStringOrNull(descriptor.classSource?.name) ?? "Unknown Class",
    type: "Item",
    parent: null,
    sort: 1000,
  });

  if (descriptor.scope === "class") {
    return findOrCreatePackFolder(pack, {
      cache: folderCache,
      name: "Class Features",
      type: "Item",
      parent: classFolder,
      sort: 1000,
    });
  }

  return findOrCreatePackFolder(pack, {
    cache: folderCache,
    name: toTrimmedStringOrNull(descriptor.subclassSource?.name) ?? "Subclass Features",
    type: "Item",
    parent: classFolder,
    sort: 2000,
  });
}

async function ensureNetherscrollsItemFolderTree(pack, folderCache) {
  for (const folderDefinition of NETHERSCROLLS_ITEM_FOLDERS) {
    await findOrCreatePackFolder(pack, {
      cache: folderCache,
      name: folderDefinition.label,
      type: "Item",
      parent: null,
      sort: folderDefinition.sort,
    });
  }
}

async function ensureNetherscrollsItemFolder(pack, itemData, folderCache) {
  const folderDefinition = getNetherscrollsItemFolder(itemData);
  return findOrCreatePackFolder(pack, {
    cache: folderCache,
    name: folderDefinition.label,
    type: "Item",
    parent: null,
    sort: folderDefinition.sort,
  });
}

function getNetherscrollsItemFolder(itemData) {
  const type = normalizeNetherscrollsItemDocumentType(itemData);
  return (
    NETHERSCROLLS_ITEM_FOLDERS.find((folder) => folder.type === type) ??
    NETHERSCROLLS_ITEM_FOLDERS.find((folder) => folder.type === "loot")
  );
}

async function ensureNetherscrollsFeatFolderTree(pack, folderCache) {
  for (const folderDefinition of NETHERSCROLLS_FEAT_FOLDERS) {
    await findOrCreatePackFolder(pack, {
      cache: folderCache,
      name: folderDefinition.label,
      type: "Item",
      parent: null,
      sort: folderDefinition.sort,
    });
  }
}

async function ensureNetherscrollsFeatFolder(pack, featData, folderCache) {
  const folderDefinition = getNetherscrollsFeatFolder(featData);
  return findOrCreatePackFolder(pack, {
    cache: folderCache,
    name: folderDefinition.label,
    type: "Item",
    parent: null,
    sort: folderDefinition.sort,
  });
}

function getNetherscrollsFeatFolder(featData) {
  const isDemifeat =
    featData?.demifeat === true ||
    featData?.flags?.[MODULE_ID]?.demifeat === true ||
    featData?.system?.flags?.[MODULE_ID]?.demifeat === true;
  const key = isDemifeat ? "demifeat" : "feat";
  return (
    NETHERSCROLLS_FEAT_FOLDERS.find((folder) => folder.key === key) ??
    NETHERSCROLLS_FEAT_FOLDERS[0]
  );
}

async function ensureNetherscrollsSpellFolderTree(pack, folderCache) {
  for (const levelDefinition of NETHERSCROLLS_SPELL_LEVEL_FOLDERS) {
    const levelFolder = await findOrCreatePackFolder(pack, {
      cache: folderCache,
      name: levelDefinition.label,
      type: "Item",
      parent: null,
      sort: levelDefinition.sort,
    });

    for (const schoolDefinition of NETHERSCROLLS_SPELL_SCHOOLS) {
      await findOrCreatePackFolder(pack, {
        cache: folderCache,
        name: schoolDefinition.label,
        type: "Item",
        parent: levelFolder,
        sort: schoolDefinition.sort,
      });
    }
  }
}

async function ensureNetherscrollsSpellFolder(pack, spellData, folderCache) {
  const level = getNetherscrollsSpellLevel(spellData);
  const levelDefinition = getNetherscrollsSpellLevelFolder(level);
  const schoolDefinition = getNetherscrollsSpellSchool(spellData);
  const levelFolder = await findOrCreatePackFolder(pack, {
    cache: folderCache,
    name: levelDefinition.label,
    type: "Item",
    parent: null,
    sort: levelDefinition.sort,
  });

  return findOrCreatePackFolder(pack, {
    cache: folderCache,
    name: schoolDefinition.label,
    type: "Item",
    parent: levelFolder,
    sort: schoolDefinition.sort,
  });
}

async function findOrCreatePackFolder(pack, { cache, name, type, parent, sort = null }) {
  const parentId = getDocumentId(parent);
  const cacheKey = `${parentId ?? "root"}:${type}:${name}`;
  if (cache?.has(cacheKey)) return cache.get(cacheKey);

  await pack.getIndex({ fields: ["folder", "name", "type"] }).catch(() => null);
  const existing = getPackFolders(pack).find((folder) => {
    const folderParentId = getDocumentId(folder.folder);
    return folder.name === name && folder.type === type && folderParentId === parentId;
  });

  if (existing) {
    await updatePackFolderSort(existing, pack, sort);
    cache?.set(cacheKey, existing);
    return existing;
  }

  const FolderClass = Folder?.implementation ?? Folder;
  const created = await FolderClass.create(
    {
      name,
      type,
      sorting: "m",
      folder: parentId,
      sort: sort ?? 0,
    },
    { pack: pack.collection }
  );
  cache?.set(cacheKey, created);
  return created;
}

async function updatePackFolderSort(folder, pack, sort) {
  if (sort == null) return;
  const needsUpdate = Number(folder?.sort) !== Number(sort) || folder?.sorting !== "m";
  if (!needsUpdate) return;
  if (typeof folder?.update !== "function") return;

  await folder.update(
    {
      sort,
      sorting: "m",
    },
    { pack: pack.collection }
  );
}

function getPackFolders(pack) {
  const folders = pack?.folders;
  if (!folders) return [];
  if (Array.isArray(folders)) return folders;
  if (Array.isArray(folders.contents)) return folders.contents;
  if (typeof folders.values === "function") return Array.from(folders.values());
  if (typeof folders[Symbol.iterator] === "function") return Array.from(folders);
  return [];
}

function getNetherscrollsSpellLevelFolder(level) {
  const normalized = Math.max(
    0,
    Math.min(NETHERSCROLLS_MAX_SPELL_LEVEL, Number(level) || 0)
  );
  return (
    NETHERSCROLLS_SPELL_LEVEL_FOLDERS.find((folder) => folder.level === normalized) ??
    NETHERSCROLLS_SPELL_LEVEL_FOLDERS[0]
  );
}

function getNetherscrollsSpellLevel(spellData) {
  const value =
    spellData?.system?.level ??
    spellData?.level ??
    spellData?.spellLevel ??
    spellData?.data?.level;
  const level = Number(value);
  if (!Number.isFinite(level)) return 0;
  return Math.max(0, Math.min(NETHERSCROLLS_MAX_SPELL_LEVEL, Math.trunc(level)));
}

function getNetherscrollsSpellSchool(spellData) {
  const rawSchool = toTrimmedStringOrNull(
    spellData?.system?.school ?? spellData?.school ?? spellData?.magicSchool
  );
  if (!rawSchool) return NETHERSCROLLS_UNKNOWN_SPELL_SCHOOL;

  const normalized = rawSchool.toLowerCase();
  return (
    NETHERSCROLLS_SPELL_SCHOOLS.find(
      (school) =>
        school.key === normalized ||
        school.label.toLowerCase() === normalized ||
        school.aliases.includes(normalized)
    ) ?? NETHERSCROLLS_UNKNOWN_SPELL_SCHOOL
  );
}

function getNetherscrollsSpellSchoolSystemKey(school) {
  if (!school || school.key === NETHERSCROLLS_UNKNOWN_SPELL_SCHOOL.key) return null;
  return school.key;
}

function getDocumentId(document) {
  if (!document) return null;
  if (typeof document === "string") return document;
  return document.id ?? document._id ?? null;
}

function initEnhanceDialogInputHandlers() {
  if (enhanceDialogInputHandlersBound) return;
  if (typeof document?.addEventListener !== "function") return;

  document.addEventListener("click", onEnhanceDialogControlClick);
  document.addEventListener("input", onEnhanceDialogInputEvent);
  document.addEventListener("change", onEnhanceDialogInputEvent);
  enhanceDialogInputHandlersBound = true;
}

function onEnhanceDialogControlClick(event) {
  const button = event?.target?.closest?.(".ns-enhance-step");
  if (!button) return;

  const bucket = toTrimmedStringOrNull(button.dataset?.enhanceBucket);
  if (!bucket) return;

  const root = button.closest(".ns-enhance-damage") ?? document;
  const input = root?.querySelector?.(`[data-enhance-input="${bucket}"]`);
  if (!input) return;

  const step = Number(button.dataset?.enhanceStep ?? 0);
  if (!Number.isFinite(step) || step === 0) return;

  adjustEnhanceDialogInput(input, step > 0 ? 1 : -1);
  event.preventDefault();
}

function onEnhanceDialogInputEvent(event) {
  const input = event?.target;
  if (!(input instanceof HTMLInputElement)) return;
  if (!input.matches?.("[data-enhance-input]")) return;
  clampEnhanceDialogInputValue(input);
}

function adjustEnhanceDialogInput(input, delta) {
  if (!(input instanceof HTMLInputElement)) return;

  const { min, max } = getEnhanceDialogInputLimits(input);
  const current = Number(input.value);
  const base = Number.isFinite(current) ? Math.floor(current) : min;
  const next = Math.max(min, Math.min(max, base + delta));
  input.value = String(next);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function clampEnhanceDialogInputValue(input) {
  if (!(input instanceof HTMLInputElement)) return;

  const { min, max } = getEnhanceDialogInputLimits(input);
  const current = Number(input.value);
  const next = Number.isFinite(current) ? Math.floor(current) : min;
  const clamped = Math.max(min, Math.min(max, next));
  if (String(clamped) !== String(input.value)) input.value = String(clamped);
}

function getEnhanceDialogInputLimits(input) {
  const rawMin = Number(input?.min);
  const rawMax = Number(input?.max);
  const min = Number.isFinite(rawMin) ? rawMin : 0;
  const max = Number.isFinite(rawMax) ? rawMax : Number.POSITIVE_INFINITY;
  return {
    min: Math.floor(min),
    max: Math.floor(max),
  };
}

function initChatNumberActionHandlers() {
  if (chatNumberActionHandlersBound) return;
  if (typeof document?.addEventListener !== "function") return;

  ensureChatNumberActionToolbar();
  document.addEventListener("selectionchange", onChatNumberSelectionChange);
  document.addEventListener("mousedown", onChatNumberDocumentMouseDown, true);
  document.addEventListener("keydown", onChatNumberDocumentKeydown, true);
  if (typeof window?.addEventListener === "function") {
    window.addEventListener("resize", hideChatNumberActionToolbar);
    window.addEventListener("scroll", hideChatNumberActionToolbar, true);
  }
  chatNumberActionHandlersBound = true;
}

function ensureChatNumberActionToolbar() {
  if (chatNumberActionToolbar?.isConnected) return chatNumberActionToolbar;
  if (!document?.body) return null;

  const toolbar = document.createElement("div");
  toolbar.classList.add("ns-chat-number-toolbar");
  toolbar.hidden = true;
  toolbar.innerHTML = `
    <button type="button" class="ns-chat-number-action" data-hp-action="add">Add maximum hp</button>
    <button
      type="button"
      class="ns-chat-number-action is-remove"
      data-hp-action="remove"
    >Remove maximum hp</button>
  `;
  toolbar.addEventListener("mousedown", (event) => event.preventDefault());
  toolbar.addEventListener("click", onChatNumberActionClick);
  document.body.append(toolbar);
  chatNumberActionToolbar = toolbar;
  return toolbar;
}

function onChatNumberSelectionChange() {
  refreshChatNumberActionToolbar();
}

function onChatNumberDocumentMouseDown(event) {
  if (event?.target?.closest?.(".ns-chat-number-toolbar")) return;
  if (!event?.target?.closest?.(".chat-message, #chat-log, .chat-log, .chat-popout")) {
    hideChatNumberActionToolbar();
  }
}

function onChatNumberDocumentKeydown(event) {
  if (event?.key === "Escape") hideChatNumberActionToolbar();
}

function refreshChatNumberActionToolbar() {
  const selectionData = getSelectedChatNumberData();
  if (!selectionData) {
    hideChatNumberActionToolbar();
    return;
  }
  showChatNumberActionToolbar(selectionData);
}

function getSelectedChatNumberData() {
  const selection = window?.getSelection?.();
  if (!selection || selection.rangeCount < 1 || selection.isCollapsed) return null;

  const range = selection.getRangeAt(0);
  if (!range) return null;
  if (!isNodeWithinChatLog(range.startContainer) || !isNodeWithinChatLog(range.endContainer)) {
    return null;
  }

  const amount = parseSelectedChatNumber(selection.toString());
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const rect = getSelectionClientRect(range);
  if (!rect) return null;

  return { amount, rect };
}

function isNodeWithinChatLog(node) {
  const element = node instanceof Element ? node : node?.parentElement ?? null;
  return Boolean(element?.closest?.(".chat-message, #chat-log, .chat-log, .chat-popout"));
}

function parseSelectedChatNumber(text) {
  const normalized = toTrimmedStringOrNull(String(text ?? "").replace(/\u2212/g, "-"));
  if (!normalized) return null;

  const matches = normalized.match(/[+-]?\d[\d,]*(?:\.\d+)?/g) ?? [];
  if (matches.length !== 1) return null;

  const parsed = Number(matches[0].replace(/,/g, ""));
  if (!Number.isFinite(parsed)) return null;

  return Math.floor(Math.abs(parsed));
}

function getSelectionClientRect(range) {
  if (!range?.getClientRects || !range?.getBoundingClientRect) return null;

  const rects = Array.from(range.getClientRects()).filter(
    (rect) => Number(rect?.width) > 0 || Number(rect?.height) > 0
  );
  const rect = rects[rects.length - 1] ?? range.getBoundingClientRect();
  if (!rect || (Number(rect.width) <= 0 && Number(rect.height) <= 0)) return null;
  return rect;
}

function showChatNumberActionToolbar(selectionData) {
  const toolbar = ensureChatNumberActionToolbar();
  if (!toolbar) return;

  toolbar.dataset.amount = String(selectionData.amount);
  toolbar.hidden = false;
  toolbar.style.left = "-9999px";
  toolbar.style.top = "-9999px";

  const toolbarWidth = toolbar.offsetWidth || 0;
  const toolbarHeight = toolbar.offsetHeight || 0;
  const margin = 8;
  const rect = selectionData.rect;

  let left = rect.left + rect.width / 2 - toolbarWidth / 2;
  const maxLeft = Math.max(margin, window.innerWidth - toolbarWidth - margin);
  left = Math.min(Math.max(margin, left), maxLeft);

  let top = rect.top - toolbarHeight - margin;
  if (top < margin) top = rect.bottom + margin;

  toolbar.style.left = `${Math.round(left)}px`;
  toolbar.style.top = `${Math.round(top)}px`;
}

function hideChatNumberActionToolbar() {
  if (!chatNumberActionToolbar) return;
  chatNumberActionToolbar.hidden = true;
  delete chatNumberActionToolbar.dataset.amount;
}

async function onChatNumberActionClick(event) {
  const button = event?.target?.closest?.(".ns-chat-number-action");
  if (!button || !chatNumberActionToolbar) return;

  const amount = Math.max(0, Math.floor(toNumber(chatNumberActionToolbar.dataset?.amount, 0)));
  if (amount <= 0) {
    ui?.notifications?.warn?.("Select exactly one positive number in chat first.");
    hideChatNumberActionToolbar();
    return;
  }

  const action = String(button.dataset?.hpAction ?? "");
  const delta = action === "remove" ? -amount : amount;
  if (delta === 0) return;

  const buttons = Array.from(
    chatNumberActionToolbar.querySelectorAll(".ns-chat-number-action")
  );
  for (const entry of buttons) entry.disabled = true;

  try {
    await applySelectedMaxHpToControlledActors(delta, amount);
  } finally {
    for (const entry of buttons) entry.disabled = false;
    clearCurrentTextSelection();
    hideChatNumberActionToolbar();
  }
}

function clearCurrentTextSelection() {
  try {
    window?.getSelection?.()?.removeAllRanges?.();
  } catch {
    // Ignore selection clearing failures.
  }
}

async function applySelectedMaxHpToControlledActors(delta, amount) {
  const actors = getControlledTokenActors();
  if (!actors.length) {
    ui?.notifications?.warn?.("Control at least one token before changing maximum HP.");
    return;
  }

  const failed = [];
  let updated = 0;

  for (const actor of actors) {
    try {
      const changed = await applyActorMaximumHpChange(actor, delta);
      if (changed) updated += 1;
    } catch (err) {
      failed.push(actor?.name ?? "Unknown Actor");
      console.warn(`${MODULE_ID} | Unable to change maximum HP for ${actor?.name ?? "actor"}.`, err);
    }
  }

  if (updated > 0) {
    const verb = delta > 0 ? "Added" : "Removed";
    const prep = delta > 0 ? "to" : "from";
    const noun = updated === 1 ? "actor" : "actors";
    ui?.notifications?.info?.(`${verb} ${amount} maximum HP ${prep} ${updated} controlled ${noun}.`);
  }

  if (failed.length) {
    ui?.notifications?.warn?.(`Maximum HP change failed for: ${failed.join(", ")}`);
  }
}

function getControlledTokenActors() {
  const controlled = Array.isArray(canvas?.tokens?.controlled) ? canvas.tokens.controlled : [];
  const actors = [];
  const seen = new Set();

  for (const token of controlled) {
    const actor = token?.actor;
    if (!actor?.update || actor?.isOwner === false) continue;

    const key = toTrimmedStringOrNull(actor?.uuid ?? actor?.id ?? token?.document?.uuid ?? token?.id);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    actors.push(actor);
  }

  return actors;
}

async function applyActorMaximumHpChange(actor, delta) {
  if (!actor?.update || !delta) return false;

  const hp = actor.system?.attributes?.hp ?? {};
  const currentValue = Math.max(0, toNumber(hp.value, 0));
  const baseMax = Math.max(0, toNumber(hp.max, 0));
  const hasTempMax = Object.prototype.hasOwnProperty.call(hp, "tempmax") || hp?.tempmax != null;

  // Prefer tempmax so temporary maximum HP changes do not overwrite the actor's base max HP.
  if (hasTempMax) {
    const currentTempMax = toNumber(hp.tempmax, 0);
    const nextTempMax = Math.max(-baseMax, currentTempMax + delta);
    const nextValue = Math.min(currentValue, Math.max(0, baseMax + nextTempMax));
    const updateData = {
      "system.attributes.hp.tempmax": nextTempMax,
    };
    if (nextValue !== currentValue) updateData["system.attributes.hp.value"] = nextValue;
    await actor.update(updateData);
    return true;
  }

  const nextMax = Math.max(0, baseMax + delta);
  const nextValue = Math.min(currentValue, nextMax);
  const updateData = {
    "system.attributes.hp.max": nextMax,
  };
  if (nextValue !== currentValue) updateData["system.attributes.hp.value"] = nextValue;
  await actor.update(updateData);
  return true;
}

function isChatContextApplication(app) {
  if (!app) return false;
  const name = String(app?.constructor?.name ?? "");
  if (/ChatLog|ChatPopout/i.test(name)) return true;
  const tabName = String(app?.tabName ?? "");
  return tabName === "chat";
}

function registerEnhancedDamageContextOption(options) {
  if (!Array.isArray(options)) return;
  if (options.some((option) => option?.name === "Enhance")) return;

  options.push({
    name: "Enhance",
    icon: '<i class="fas fa-magic"></i>',
    condition: (li) => {
      if (!isEnhancedDamageEnabled()) return false;
      const message = getContextMenuMessage(li);
      return canEnhanceDamageMessage(message);
    },
    callback: async (li) => {
      const message = getContextMenuMessage(li);
      if (!canEnhanceDamageMessage(message)) return;
      await runEnhanceDamageFlow(message);
    },
  });
}

function getContextMenuMessage(li) {
  const target =
    li?.[0] ??
    (typeof li?.get === "function" ? li.get(0) : null) ??
    (li instanceof HTMLElement ? li : null);
  const entry =
    target?.closest?.("[data-message-id], [data-document-id], [data-entry-id]") ?? target;

  const messageId =
    li?.data?.("messageId") ??
    li?.data?.("documentId") ??
    li?.data?.("entryId") ??
    li?.attr?.("data-message-id") ??
    li?.attr?.("data-document-id") ??
    li?.attr?.("data-entry-id") ??
    entry?.dataset?.messageId ??
    entry?.dataset?.documentId ??
    entry?.dataset?.entryId ??
    null;
  if (!messageId) return null;
  return game?.messages?.get(messageId) ?? null;
}

function canEnhanceDamageMessage(message) {
  if (!message) return false;

  const type = String(message?.flags?.dnd5e?.roll?.type ?? "");
  if (/(damage|healing)/i.test(type)) return true;

  const flaggedRolls = message?.flags?.dnd5e?.rolls;
  if (
    Array.isArray(flaggedRolls) &&
    flaggedRolls.some((entry) => /(damage|healing)/i.test(String(entry?.type ?? "")))
  ) {
    return true;
  }

  const messageRolls = Array.isArray(message?.rolls) ? message.rolls : [];
  return messageRolls.some((roll) => {
    const rollName = String(roll?.constructor?.name ?? "");
    const rollType = String(roll?.options?.type ?? "");
    return /damage/i.test(rollName) || /(damage|healing)/i.test(rollType);
  });
}

async function runEnhanceDamageFlow(message) {
  const typeResolution = [];
  const buckets = collectEnhanceBuckets(message, typeResolution);
  if (isDebugEnabled()) {
    await postEnhanceDebugMessage(
      message,
      "Enhance | Parsed Damage Data",
      buildEnhanceDebugSnapshot(message, buckets, typeResolution)
    );
  }
  if (!buckets.length) {
    ui?.notifications?.warn?.("Enhance: no damage dice were found in this message.");
    return;
  }

  let selectedCounts = await promptEnhanceRerollCounts(buckets);
  if (selectedCounts == null) return;
  if (!isEnhanceCountsObject(selectedCounts)) return;
  if (getSelectedEnhanceCountTotal(selectedCounts) <= 0) return;

  if (isDebugEnabled()) {
    await postEnhanceDebugMessage(message, "Enhance | Selected Counts", {
      selectedCounts,
      requested: getSelectedEnhanceCountTotal(selectedCounts),
    });
  }

  const result = await repostDamageMessage(message, buckets, selectedCounts);
  if (isDebugEnabled()) {
    await postEnhanceDebugMessage(message, "Enhance | Repost Result", result ?? null);
  }
}

function collectEnhanceBuckets(message, typeResolutionLog = null) {
  const buckets = new Map();
  const messageRolls = Array.isArray(message?.rolls) ? message.rolls : [];

  for (let rollIndex = 0; rollIndex < messageRolls.length; rollIndex += 1) {
    const roll = messageRolls[rollIndex];
    if (!isDamageLikeRoll(message, roll, rollIndex)) continue;

    const damageType = getRollDamageType(message, roll, rollIndex, typeResolutionLog);
    const terms = Array.isArray(roll?.terms) ? roll.terms : [];

    for (let termIndex = 0; termIndex < terms.length; termIndex += 1) {
      const term = terms[termIndex];
      const faces = Number(term?.faces);
      const results = Array.isArray(term?.results) ? term.results : null;
      if (!Number.isFinite(faces) || faces <= 0 || !results?.length) continue;

      const key = buildEnhanceBucketKey(damageType, faces);
      const bucket =
        buckets.get(key) ??
        {
          key,
          damageType,
          faces,
          dice: [],
        };
      buckets.set(key, bucket);

      for (let resultIndex = 0; resultIndex < results.length; resultIndex += 1) {
        const result = results[resultIndex];
        if (result?.active === false || result?.discarded === true) continue;
        const value = Number(result?.result);
        if (!Number.isFinite(value)) continue;

        bucket.dice.push({
          value,
          rollIndex,
          termIndex,
          resultIndex,
          faces,
        });
      }
    }
  }

  const list = Array.from(buckets.values()).filter((bucket) => bucket.dice.length > 0);
  for (const bucket of list) {
    bucket.dice.sort(
      (a, b) =>
        a.value - b.value ||
        a.rollIndex - b.rollIndex ||
        a.termIndex - b.termIndex ||
        a.resultIndex - b.resultIndex
    );
  }

  list.sort((a, b) => {
    const byType = String(a.damageType).localeCompare(String(b.damageType));
    return byType || a.faces - b.faces;
  });

  return list;
}

async function postEnhanceDebugMessage(message, title, data) {
  if (!isDebugEnabled()) return;
  try {
    const actor = resolveMessageActor(message);
    const speaker = actor
      ? ChatMessage.getSpeaker({ actor })
      : message?.speaker ?? ChatMessage.getSpeaker();
    const safeTitle = escapeHtml(String(title ?? "Enhance Debug"));
    const content = `<p><strong>${safeTitle}</strong></p>${renderSyncPayload(data)}`;
    await ChatMessage.create({ speaker, content });
  } catch (err) {
    console.warn(`${MODULE_ID} | Failed to post enhance debug message.`, err);
  }
}

function buildEnhanceDebugSnapshot(message, buckets, typeResolutionLog) {
  const messageRolls = Array.isArray(message?.rolls) ? message.rolls : [];
  return {
    messageId: message?.id ?? null,
    messageSpeaker: sanitizeDebugValue(message?.speaker ?? null, 2),
    dnd5eFlags: sanitizeDebugValue(message?.flags?.dnd5e ?? null, 3),
    rolls: messageRolls.map((roll, rollIndex) => summarizeRollForDebug(roll, rollIndex)),
    typeResolution: sanitizeDebugValue(typeResolutionLog ?? [], 4),
    buckets: summarizeEnhanceBuckets(buckets),
  };
}

function summarizeRollForDebug(roll, rollIndex) {
  const terms = Array.isArray(roll?.terms) ? roll.terms : [];
  const diceTerms = terms
    .map((term, termIndex) => {
      const faces = Number(term?.faces);
      if (!Number.isFinite(faces) || faces <= 0) return null;
      const results = Array.isArray(term?.results)
        ? term.results
            .filter((result) => result?.active !== false && result?.discarded !== true)
            .map((result) => Number(result?.result))
            .filter((value) => Number.isFinite(value))
        : [];
      return {
        termIndex,
        faces,
        results,
        flavor: toTrimmedStringOrNull(term?.flavor ?? term?.options?.flavor),
      };
    })
    .filter(Boolean);

  return {
    rollIndex,
    formula: toTrimmedStringOrNull(roll?.formula ?? roll?._formula),
    options: sanitizeDebugValue(roll?.options ?? null, 3),
    diceTerms,
  };
}

function summarizeEnhanceBuckets(buckets) {
  if (!Array.isArray(buckets)) return [];
  return buckets.map((bucket) => ({
    key: bucket?.key ?? null,
    damageType: bucket?.damageType ?? null,
    faces: bucket?.faces ?? null,
    diceCount: Array.isArray(bucket?.dice) ? bucket.dice.length : 0,
    diceResults: Array.isArray(bucket?.dice) ? bucket.dice.map((die) => die?.value) : [],
  }));
}

function sanitizeDebugValue(value, depth = 2) {
  if (depth <= 0) {
    if (Array.isArray(value)) return `[Array(${value.length})]`;
    if (value && typeof value === "object") return "[Object]";
    return value;
  }

  if (value == null) return value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    const limited = value.slice(0, 20);
    return limited.map((entry) => sanitizeDebugValue(entry, depth - 1));
  }

  if (typeof value === "object") {
    const out = {};
    const entries = Object.entries(value).slice(0, 40);
    for (const [key, entry] of entries) {
      out[key] = sanitizeDebugValue(entry, depth - 1);
    }
    return out;
  }

  return String(value);
}

function isDamageLikeRoll(message, roll, rollIndex) {
  const rollType = String(roll?.options?.type ?? "").toLowerCase();
  if (/(damage|healing)/.test(rollType)) return true;

  const rollName = String(roll?.constructor?.name ?? "");
  if (/damage/i.test(rollName)) return true;

  const entry = getDnd5eFlaggedRollEntry(message, rollIndex);
  const entryType = String(entry?.type ?? "").toLowerCase();
  if (/(damage|healing)/.test(entryType)) return true;

  if ((Array.isArray(message?.rolls) ? message.rolls.length : 0) === 1) {
    const messageType = String(message?.flags?.dnd5e?.roll?.type ?? "").toLowerCase();
    if (/(damage|healing)/.test(messageType)) return true;
  }

  return false;
}

function getDnd5eFlaggedRollEntry(message, rollIndex) {
  const flagged = message?.flags?.dnd5e?.rolls;
  if (!Array.isArray(flagged)) return null;
  return flagged[rollIndex] ?? null;
}

function getRollDamageType(message, roll, rollIndex, typeResolutionLog = null) {
  const entry = getDnd5eFlaggedRollEntry(message, rollIndex);
  const single = message?.flags?.dnd5e?.roll ?? {};
  const options = roll?.options ?? {};
  const terms = Array.isArray(roll?.terms) ? roll.terms : [];

  const trace = Array.isArray(typeResolutionLog)
    ? {
        rollIndex,
        formula: toTrimmedStringOrNull(roll?.formula ?? roll?._formula),
        candidates: [],
        fallback: null,
        resolved: null,
      }
    : null;

  const candidates = [];
  pushDamageTypeCandidate(candidates, "roll.options.type", options.type);
  pushDamageTypeCandidate(candidates, "roll.options.types", options.types);
  pushDamageTypeCandidate(candidates, "roll.options.rollType", options.rollType);
  pushDamageTypeCandidate(candidates, "roll.options.damageType", options.damageType);
  pushDamageTypeCandidate(candidates, "roll.options.damageTypes", options.damageTypes);
  pushDamageTypeCandidate(candidates, "roll.options.damage", options.damage);
  pushDamageTypeCandidate(candidates, "roll.options.parts", options.parts);
  pushDamageTypeCandidate(candidates, "roll.options.flavor", options.flavor);
  pushDamageTypeCandidate(candidates, "roll.flavor", roll?.flavor);
  pushDamageTypeCandidate(candidates, "roll.formula", roll?.formula);
  pushDamageTypeCandidate(candidates, "roll._formula", roll?._formula);

  pushDamageTypeCandidate(candidates, "flags.roll.damageType", entry?.damageType);
  pushDamageTypeCandidate(candidates, "flags.roll.damageTypes", entry?.damageTypes);
  pushDamageTypeCandidate(candidates, "flags.roll.damage", entry?.damage);
  pushDamageTypeCandidate(candidates, "flags.roll.parts", entry?.parts);
  pushDamageTypeCandidate(candidates, "flags.roll.options.damageType", entry?.options?.damageType);
  pushDamageTypeCandidate(candidates, "flags.roll.options.damageTypes", entry?.options?.damageTypes);
  pushDamageTypeCandidate(candidates, "flags.roll.options.damage", entry?.options?.damage);
  pushDamageTypeCandidate(candidates, "flags.roll.options.parts", entry?.options?.parts);
  pushDamageTypeCandidate(candidates, "flags.roll.options.type", entry?.options?.type);
  pushDamageTypeCandidate(candidates, "flags.roll.options.types", entry?.options?.types);
  pushDamageTypeCandidate(candidates, "flags.roll.options.flavor", entry?.options?.flavor);
  pushDamageTypeCandidate(candidates, "flags.roll.flavor", entry?.flavor);

  pushDamageTypeCandidate(candidates, "flags.single.type", single?.type);
  pushDamageTypeCandidate(candidates, "flags.single.types", single?.types);
  pushDamageTypeCandidate(candidates, "flags.single.damageType", single?.damageType);
  pushDamageTypeCandidate(candidates, "flags.single.damageTypes", single?.damageTypes);
  pushDamageTypeCandidate(candidates, "flags.single.damage", single?.damage);
  pushDamageTypeCandidate(candidates, "flags.single.parts", single?.parts);
  pushDamageTypeCandidate(candidates, "flags.single.options.type", single?.options?.type);
  pushDamageTypeCandidate(candidates, "flags.single.options.types", single?.options?.types);
  pushDamageTypeCandidate(candidates, "flags.single.options.damageType", single?.options?.damageType);
  pushDamageTypeCandidate(candidates, "flags.single.options.damageTypes", single?.options?.damageTypes);
  pushDamageTypeCandidate(candidates, "flags.single.options.damage", single?.options?.damage);
  pushDamageTypeCandidate(candidates, "flags.single.options.parts", single?.options?.parts);
  pushDamageTypeCandidate(candidates, "flags.single.options.flavor", single?.options?.flavor);
  pushDamageTypeCandidate(candidates, "flags.single.flavor", single?.flavor);

  const formulaTags = [
    ...extractDamageTypeTagsFromFormula(roll?.formula),
    ...extractDamageTypeTagsFromFormula(roll?._formula),
  ];
  for (let index = 0; index < formulaTags.length; index += 1) {
    pushDamageTypeCandidate(candidates, `roll.formulaTag[${index}]`, formulaTags[index]);
  }

  for (let termIndex = 0; termIndex < terms.length; termIndex += 1) {
    const term = terms[termIndex];
    pushDamageTypeCandidate(candidates, `roll.terms[${termIndex}].flavor`, term?.flavor);
    pushDamageTypeCandidate(candidates, `roll.terms[${termIndex}].options.flavor`, term?.options?.flavor);
    pushDamageTypeCandidate(candidates, `roll.terms[${termIndex}].options.damageType`, term?.options?.damageType);
    pushDamageTypeCandidate(candidates, `roll.terms[${termIndex}].options.damageTypes`, term?.options?.damageTypes);
    pushDamageTypeCandidate(candidates, `roll.terms[${termIndex}].options.damage`, term?.options?.damage);
    pushDamageTypeCandidate(candidates, `roll.terms[${termIndex}].options.parts`, term?.options?.parts);
    pushDamageTypeCandidate(candidates, `roll.terms[${termIndex}].type`, term?.type);
  }

  for (const candidate of candidates) {
    const normalized = normalizeDamageTypeLabel(candidate.value);
    if (trace) {
      trace.candidates.push({
        source: candidate.source,
        raw: sanitizeDebugValue(candidate.value, 3),
        normalized,
      });
    }
    if (normalized && !/^(damage|healing)$/i.test(normalized)) {
      if (trace) {
        trace.resolved = { source: candidate.source, value: normalized };
        typeResolutionLog.push(trace);
      }
      return normalized;
    }
  }

  const contentType = getContentDamageTypeByRollIndex(message, rollIndex);
  if (contentType) {
    if (trace) {
      trace.fallback = "message.content";
      trace.resolved = { source: "message.content", value: contentType };
      typeResolutionLog.push(trace);
    }
    return contentType;
  }

  const itemType = getItemDamageTypeByRollIndex(message, rollIndex);
  if (itemType) {
    if (trace) {
      trace.fallback = "item.damage.parts";
      trace.resolved = { source: "item.damage.parts", value: itemType };
      typeResolutionLog.push(trace);
    }
    return itemType;
  }

  const kind = String(options.type ?? entry?.type ?? single?.type ?? "").toLowerCase();
  if (kind === "healing") {
    if (trace) {
      trace.fallback = "roll.kind";
      trace.resolved = { source: "roll.kind", value: "healing" };
      typeResolutionLog.push(trace);
    }
    return "healing";
  }
  if (trace) {
    trace.fallback = "default";
    trace.resolved = { source: "default", value: "damage" };
    typeResolutionLog.push(trace);
  }
  return "damage";
}

function pushDamageTypeCandidate(candidates, source, value) {
  if (value == null) return;
  candidates.push({ source, value });
}

function buildEnhanceBucketKey(damageType, faces) {
  return `${String(damageType ?? "damage")}::d${Number(faces)}`;
}

function getSelectedEnhanceCountTotal(selectedCounts) {
  if (!selectedCounts || typeof selectedCounts !== "object") return 0;
  return Object.values(selectedCounts).reduce(
    (sum, value) => sum + Math.max(0, Math.floor(toNumber(value, 0))),
    0
  );
}

function getContentDamageTypeByRollIndex(message, rollIndex) {
  const content = toTrimmedStringOrNull(message?.content);
  if (!content) return null;

  const matches = [];
  const attrRegexes = [
    /data-damage-type="([^"]+)"/gi,
    /data-type="([^"]+)"/gi,
    /data-damagetype="([^"]+)"/gi,
  ];

  for (const regex of attrRegexes) {
    let match;
    while ((match = regex.exec(content)) !== null) {
      const normalized = normalizeDamageTypeLabel(match[1]);
      if (normalized) matches.push(normalized);
    }
  }

  if (!matches.length) {
    const keys = Object.keys(CONFIG?.DND5E?.damageTypes ?? {});
    if (keys.length) {
      const tokenRegex = new RegExp(`\\b(${keys.map(escapeRegex).join("|")})\\b`, "gi");
      let match;
      while ((match = tokenRegex.exec(content)) !== null) {
        const normalized = normalizeDamageTypeLabel(match[1]);
        if (normalized) matches.push(normalized);
      }
    }
  }

  const unique = [];
  const seen = new Set();
  for (const type of matches) {
    const key = String(type).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(type);
  }

  if (!unique.length) return null;
  return unique[rollIndex] ?? (unique.length === 1 ? unique[0] : null);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getItemDamageTypeByRollIndex(message, rollIndex) {
  const item = resolveMessageItem(message);
  const parts = resolveMessageDamageParts(message, item);
  if (!parts.length) return null;

  const types = parts
    .map((part) => normalizeDamageTypeLabel(part?.[1]))
    .filter((value) => Boolean(value));
  if (!types.length) return null;

  return types[rollIndex] ?? (types.length === 1 ? types[0] : null);
}

function resolveMessageItem(message) {
  const flags = message?.flags?.dnd5e ?? {};
  const rollFlag = flags?.roll ?? {};

  const uuidCandidates = [
    rollFlag?.itemUuid,
    flags?.itemUuid,
    rollFlag?.item?.uuid,
    flags?.item?.uuid,
    message?.flags?.itemUuid,
    rollFlag?.origin,
    flags?.origin,
  ];
  for (const uuid of uuidCandidates) {
    const item = resolveItemByUuid(uuid);
    if (item) return item;
  }

  const itemIdCandidates = [
    rollFlag?.itemId,
    flags?.itemId,
    rollFlag?.item?.id,
    rollFlag?.item?._id,
    flags?.item?.id,
    flags?.item?._id,
  ];
  const actor = resolveMessageActor(message);
  for (const itemId of itemIdCandidates) {
    const id = toTrimmedStringOrNull(itemId);
    if (!id || !actor?.items?.get) continue;
    const item = actor.items.get(id);
    if (item) return item;
  }

  const parsedFromOrigin = parseActorItemIdsFromUuid(rollFlag?.origin ?? flags?.origin);
  if (parsedFromOrigin.actorId && parsedFromOrigin.itemId) {
    const actorFromOrigin = game?.actors?.get?.(parsedFromOrigin.actorId);
    const itemFromOrigin = actorFromOrigin?.items?.get?.(parsedFromOrigin.itemId) ?? null;
    if (itemFromOrigin) return itemFromOrigin;
  }

  return null;
}

function resolveItemByUuid(uuid) {
  const id = toTrimmedStringOrNull(uuid);
  if (!id) return null;
  try {
    if (typeof fromUuidSync === "function") {
      const doc = fromUuidSync(id);
      if (doc?.documentName === "Item") return doc;
    }
  } catch {
    // Ignore and continue with parsing fallbacks.
  }
  const parsed = parseActorItemIdsFromUuid(id);
  if (parsed.actorId && parsed.itemId) {
    const actor = game?.actors?.get?.(parsed.actorId) ?? null;
    const item = actor?.items?.get?.(parsed.itemId) ?? null;
    if (item) return item;
  }
  return null;
}

function resolveMessageActor(message) {
  const speaker = message?.speaker ?? {};
  if (typeof ChatMessage?.getSpeakerActor === "function") {
    const speakerActor = ChatMessage.getSpeakerActor(speaker);
    if (speakerActor) return speakerActor;
  }
  const actorId = toTrimmedStringOrNull(speaker?.actor);
  if (actorId && game?.actors?.get) {
    const actor = game.actors.get(actorId);
    if (actor) return actor;
  }

  const sceneId = toTrimmedStringOrNull(speaker?.scene);
  const tokenId = toTrimmedStringOrNull(speaker?.token);
  if (!sceneId || !tokenId) return null;

  const scene =
    game?.scenes?.get?.(sceneId) ??
    (canvas?.scene?.id === sceneId ? canvas.scene : null);
  const token = scene?.tokens?.get?.(tokenId);
  return token?.actor ?? null;
}

function parseActorItemIdsFromUuid(uuid) {
  const str = toTrimmedStringOrNull(uuid);
  if (!str) return { actorId: null, itemId: null };

  const actorMatch = /Actor\.([^.\]]+)/i.exec(str);
  const itemMatch = /Item\.([^.\]]+)/i.exec(str);
  return {
    actorId: actorMatch?.[1] ?? null,
    itemId: itemMatch?.[1] ?? null,
  };
}

function resolveMessageDamageParts(message, item) {
  const flags = message?.flags?.dnd5e ?? {};
  const rollFlag = flags?.roll ?? {};
  const flaggedRolls = Array.isArray(flags?.rolls) ? flags.rolls : [];

  const candidateParts = [
    rollFlag?.parts,
    rollFlag?.damage?.parts,
    flags?.parts,
    flags?.damage?.parts,
    ...flaggedRolls.map((entry) => entry?.parts),
    ...flaggedRolls.map((entry) => entry?.damage?.parts),
  ];

  for (const candidate of candidateParts) {
    const normalized = normalizeDamageParts(candidate);
    if (normalized.length) return normalized;
  }

  const activity = resolveMessageActivity(message, item);
  const activityParts = normalizeDamageParts(activity?.damage?.parts);
  if (activityParts.length) return activityParts;

  return normalizeDamageParts(item?.system?.damage?.parts);
}

function resolveMessageActivity(message, item) {
  if (!item) return null;

  const flags = message?.flags?.dnd5e ?? {};
  const rollFlag = flags?.roll ?? {};
  const activityId = toTrimmedStringOrNull(
    rollFlag?.activityId ?? flags?.activityId ?? rollFlag?.activity?.id
  );
  const activityUuid = toTrimmedStringOrNull(
    rollFlag?.activityUuid ?? flags?.activityUuid ?? rollFlag?.activity?.uuid
  );

  const activities = item?.system?.activities;
  if (!activities) return null;

  if (activityId) {
    if (Array.isArray(activities)) {
      const found = activities.find((entry) => String(entry?.id ?? "") === activityId);
      if (found) return found;
    } else if (typeof activities === "object") {
      if (activities[activityId]) return activities[activityId];
      const found = Object.values(activities).find(
        (entry) => String(entry?.id ?? "") === activityId
      );
      if (found) return found;
    }
  }

  if (activityUuid) {
    const maybeId = activityUuid.split(".").pop();
    if (maybeId && typeof activities === "object" && activities[maybeId]) {
      return activities[maybeId];
    }
  }

  return null;
}

function normalizeDamageParts(parts) {
  if (!Array.isArray(parts)) return [];

  const out = [];
  for (const part of parts) {
    if (!part) continue;
    if (Array.isArray(part)) {
      const formula = part[0] ?? null;
      const type = part[1] ?? null;
      out.push([formula, type]);
      continue;
    }
    if (typeof part === "object") {
      const formula =
        part?.formula ??
        part?.number ??
        part?.roll ??
        part?.value ??
        part?.base ??
        null;
      const type =
        part?.damageType ??
        part?.type ??
        part?.types ??
        part?.damageTypes ??
        part?.damage ??
        null;
      out.push([formula, type]);
    }
  }
  return out;
}

function extractDamageTypeTagsFromFormula(formula) {
  const text = toTrimmedStringOrNull(formula);
  if (!text) return [];
  const tags = [];
  const regex = /\[([^\]]+)\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const tag = toTrimmedStringOrNull(match[1]);
    if (tag) tags.push(tag);
  }
  return tags;
}

function normalizeDamageTypeLabel(value) {
  const labels = [];
  collectDamageTypeLabels(value, labels);
  if (!labels.length) return null;

  const seen = new Set();
  const unique = [];
  for (const label of labels) {
    const key = String(label).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(label);
  }
  return unique.join(", ");
}

function collectDamageTypeLabels(value, out) {
  if (value == null) return;

  if (typeof value === "string") {
    const str = toTrimmedStringOrNull(value);
    if (!str) return;
    const parts = str.split(/[,/|]/).map((part) => toTrimmedStringOrNull(part)).filter(Boolean);
    for (const part of parts) {
      const mapped = mapDamageTypeLabel(part);
      if (mapped) out.push(mapped);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) collectDamageTypeLabels(entry, out);
    return;
  }

  if (value instanceof Set) {
    for (const entry of value) collectDamageTypeLabels(entry, out);
    return;
  }

  if (typeof value === "object") {
    const typedValue = value?.damageType ?? value?.type ?? value?.value ?? value?.id ?? value?.name;
    if (typedValue != null) collectDamageTypeLabels(typedValue, out);
    if (value?.label != null) collectDamageTypeLabels(value.label, out);
    if (value?.damageTypes != null) collectDamageTypeLabels(value.damageTypes, out);
    if (value?.types != null) collectDamageTypeLabels(value.types, out);
    if (value?.parts != null) collectDamageTypeLabels(value.parts, out);

    const trueKeys = Object.entries(value)
      .filter(([, flag]) => flag === true)
      .map(([key]) => key);
    if (trueKeys.length) {
      for (const key of trueKeys) collectDamageTypeLabels(key, out);
      return;
    }
  }
}

function mapDamageTypeLabel(raw) {
  const value = toTrimmedStringOrNull(raw);
  if (!value) return null;

  const known = getKnownDamageTypeMap();
  const cleaned = value.replace(/[[\]()]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return null;

  const simpleKey = cleaned.toLowerCase();
  if (simpleKey === "damage" || simpleKey === "healing") return null;
  if (known.has(simpleKey)) return known.get(simpleKey);

  const prefixed = simpleKey.startsWith("damage.") ? simpleKey.slice("damage.".length) : simpleKey;
  if (known.has(prefixed)) return known.get(prefixed);

  const tokens = simpleKey.split(/[^a-z]+/).filter(Boolean);
  for (const token of tokens) {
    if (known.has(token)) return known.get(token);
  }

  if (game?.i18n?.has?.(cleaned)) {
    const localized = game.i18n.localize(cleaned);
    const localText = toTrimmedStringOrNull(localized)?.toLowerCase();
    if (localText && known.has(localText)) return known.get(localText);
  }

  return null;
}

function getKnownDamageTypeMap() {
  const map = new Map();
  const cfg = CONFIG?.DND5E?.damageTypes ?? {};

  const add = (key, label) => {
    const k = toTrimmedStringOrNull(key)?.toLowerCase();
    const v = toTrimmedStringOrNull(label);
    if (!k || !v) return;
    map.set(k, v);
  };

  for (const [key, entry] of Object.entries(cfg)) {
    const label = localizeDamageTypeEntry(entry, key);
    add(key, label);
    add(`damage.${key}`, label);
    add(label, label);

    if (typeof entry === "string") add(entry, label);
    if (entry && typeof entry === "object") {
      add(entry.label, label);
      add(entry.name, label);
    }
  }

  return map;
}

function localizeDamageTypeEntry(entry, fallback) {
  if (typeof entry === "string") {
    if (game?.i18n?.has?.(entry)) return game.i18n.localize(entry);
    return entry;
  }
  if (entry && typeof entry === "object") {
    if (typeof entry.label === "string") {
      if (game?.i18n?.has?.(entry.label)) return game.i18n.localize(entry.label);
      return entry.label;
    }
    if (typeof entry.name === "string") return entry.name;
  }
  return fallback;
}

function renderEnhanceDialogContent(buckets) {
  const rows = buckets
    .map((bucket, index) => {
      const damageType = escapeHtml(String(bucket.damageType ?? "damage"));
      const diceText = escapeHtml(bucket.dice.map((die) => die.value).join(", "));
      return `
        <tr>
          <td>${damageType}</td>
          <td>d${bucket.faces}</td>
          <td>${diceText}</td>
          <td>
            <div class="ns-enhance-stepper" data-enhance-bucket="${index}">
              <button
                type="button"
                class="ns-enhance-step"
                data-enhance-step="-1"
                data-enhance-bucket="${index}"
                aria-label="Decrease reroll count"
                title="Decrease"
              >&#9660;</button>
              <input
                type="number"
                min="0"
                max="${bucket.dice.length}"
                value="0"
                step="1"
                inputmode="numeric"
                name="enhance-bucket-${index}"
                data-enhance-input="${index}"
                class="ns-enhance-input"
              />
              <button
                type="button"
                class="ns-enhance-step"
                data-enhance-step="1"
                data-enhance-bucket="${index}"
                aria-label="Increase reroll count"
                title="Increase"
              >&#9650;</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <div class="ns-enhance-damage">
      <p>Set how many of the lowest dice to reroll for each damage.</p>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="text-align: left;">Damage Type</th>
            <th style="text-align: left;">Die</th>
            <th style="text-align: left;">Rolled Dice</th>
            <th style="text-align: left;">Reroll Count</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function readEnhanceDialogCounts(html, buckets) {
  const counts = {};
  for (let index = 0; index < buckets.length; index += 1) {
    const bucket = buckets[index];
    const input =
      html?.find?.(`[data-enhance-input="${index}"]`)?.first?.() ??
      html?.find?.(`[data-enhance-input="${index}"]`);
    const raw = typeof input?.val === "function" ? input.val() : input?.value;
    const amount = Math.floor(toNumber(raw, 0));
    counts[bucket.key] = Math.max(0, Math.min(bucket.dice.length, amount));
  }
  return counts;
}

function readEnhanceDialogCountsFromForm(form, buckets) {
  const counts = {};
  for (let index = 0; index < buckets.length; index += 1) {
    const bucket = buckets[index];
    const input =
      form?.elements?.namedItem?.(`enhance-bucket-${index}`) ??
      form?.querySelector?.(`[data-enhance-input="${index}"]`);
    const raw = input?.value;
    const amount = Math.floor(toNumber(raw, 0));
    counts[bucket.key] = Math.max(0, Math.min(bucket.dice.length, amount));
  }
  return counts;
}

function isEnhanceCountsObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function resolveEnhanceDialogRoot(event, button, dialog) {
  const eventTarget = event?.currentTarget ?? event?.target ?? null;
  const fromEvent =
    eventTarget?.closest?.(".window-content, .dialog-content, .app, .application, .dialog") ??
    null;
  if (fromEvent?.querySelector) return fromEvent;

  const dialogElement = dialog?.element ?? dialog?.window?.element ?? null;
  const dialogNode = dialogElement?.[0] ?? dialogElement;
  if (dialogNode?.querySelector) return dialogNode;

  const buttonElement = button?.element ?? null;
  const buttonNode = buttonElement?.[0] ?? buttonElement;
  if (buttonNode?.closest) {
    const fromButton =
      buttonNode.closest(".window-content, .dialog-content, .app, .application, .dialog") ?? null;
    if (fromButton?.querySelector) return fromButton;
  }

  return document;
}

async function promptEnhanceRerollCountsFallback(buckets) {
  const counts = {};

  for (const bucket of buckets) {
    const damageType = String(bucket.damageType ?? "damage");
    const diceValues = bucket.dice.map((die) => die.value).join(", ");
    const response = window.prompt(
      `Enhance Damage\n${damageType} d${bucket.faces}\nRolled: ${diceValues}\nHow many lowest dice to reroll? (0-${bucket.dice.length})`,
      "0"
    );
    if (response == null) return null;

    const amount = Math.floor(toNumber(response, 0));
    counts[bucket.key] = Math.max(0, Math.min(bucket.dice.length, amount));
  }

  return counts;
}

async function promptEnhanceRerollCounts(buckets) {
  const content = renderEnhanceDialogContent(buckets);
  const dialogV2 = foundry?.applications?.api?.DialogV2;

  if (dialogV2?.prompt) {
    try {
      const value = await dialogV2.prompt({
        window: { title: "Enhance Damage" },
        content,
        modal: true,
        rejectClose: false,
        ok: {
          label: "Reroll",
          icon: '<i class="fas fa-check"></i>',
          callback: (event, button, dialog) => {
            const root = resolveEnhanceDialogRoot(event, button, dialog);
            return readEnhanceDialogCountsFromForm(root, buckets);
          },
        },
      });
      if (value == null) return null;
      if (isEnhanceCountsObject(value)) return value;
    } catch {
      // Continue to fallbacks.
    }
  }

  if (typeof Dialog === "function") {
    return new Promise((resolve) => {
      let settled = false;
      const done = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      const dialog = new Dialog({
        title: "Enhance Damage",
        content,
        buttons: {
          apply: {
            icon: '<i class="fas fa-check"></i>',
            label: "Reroll",
            callback: (html) => done(readEnhanceDialogCounts(html, buckets)),
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => done(null),
          },
        },
        default: "apply",
        close: () => done(null),
      });

      dialog.render(true);
    });
  }

  const fallback = {};
  if (typeof window?.prompt === "function") {
    return promptEnhanceRerollCountsFallback(buckets);
  }
  for (const bucket of buckets) fallback[bucket.key] = 0;
  return fallback;
}

function randomDieResult(faces) {
  const sides = Math.max(1, Math.floor(toNumber(faces, 0)));
  return Math.floor(Math.random() * sides) + 1;
}

function recomputeRollData(rollData) {
  if (!rollData || typeof rollData !== "object") return rollData;
  try {
    if (typeof Roll?.fromData === "function") {
      const roll = Roll.fromData(rollData);
      if (typeof roll?._evaluateTotal === "function") {
        roll._total = roll._evaluateTotal();
      } else if (Number.isFinite(Number(roll?.total))) {
        roll._total = Number(roll.total);
      }
      return typeof roll?.toJSON === "function" ? roll.toJSON() : rollData;
    }
  } catch (err) {
    console.warn(`${MODULE_ID} | Unable to recompute enhanced roll total.`, err);
  }

  const fallbackTotal = computeSimpleRollTotal(rollData?.terms);
  if (Number.isFinite(fallbackTotal)) {
    rollData.total = fallbackTotal;
    rollData._total = fallbackTotal;
    rollData.result = String(fallbackTotal);
  }
  return rollData;
}

function computeSimpleRollTotal(terms) {
  if (!Array.isArray(terms) || !terms.length) return null;

  let total = 0;
  let hasValue = false;
  let operator = "+";

  for (const term of terms) {
    const op = String(term?.operator ?? "");
    if (["+", "-", "*", "/"].includes(op)) {
      operator = op;
      continue;
    }

    const value = getSimpleTermTotal(term);
    if (!Number.isFinite(value)) continue;
    hasValue = true;

    if (operator === "+") total += value;
    else if (operator === "-") total -= value;
    else if (operator === "*") total *= value;
    else if (operator === "/") total = value === 0 ? total : total / value;
    operator = "+";
  }

  return hasValue ? total : null;
}

function getSimpleTermTotal(term) {
  if (!term || typeof term !== "object") return null;

  const results = Array.isArray(term?.results) ? term.results : null;
  if (results?.length) {
    return results.reduce((sum, result) => {
      if (result?.active === false || result?.discarded === true) return sum;
      const value = Number(result?.result);
      return Number.isFinite(value) ? sum + value : sum;
    }, 0);
  }

  const number = Number(term?.number);
  if (Number.isFinite(number)) return number;

  const total = Number(term?.total);
  if (Number.isFinite(total)) return total;

  return null;
}

function applyEnhanceRerolls(source, message, buckets, selectedCounts) {
  const sourceRolls = Array.isArray(source?.rolls) ? source.rolls : [];
  const messageRolls = Array.isArray(message?.rolls) ? message.rolls : [];
  const maxIndex =
    Math.max(sourceRolls.length, messageRolls.length, getMaxEnhanceRollIndex(buckets) + 1) || 0;
  const rollFormats = [];
  const rolls = [];

  for (let i = 0; i < maxIndex; i += 1) {
    const sourceEntry = sourceRolls[i];
    rollFormats[i] = getRollEntryFormat(sourceEntry);

    let rollData = getRollDataObject(sourceEntry);
    if (!hasRollTerms(rollData)) {
      rollData = getRollDataObject(messageRolls[i]);
    }
    if (hasRollTerms(rollData)) {
      rolls[i] = rollData;
      continue;
    }

    rolls[i] = null;
  }

  const changedRollIndices = new Set();
  let changedDiceCount = 0;

  for (const bucket of buckets) {
    const rawCount = selectedCounts?.[bucket.key] ?? 0;
    const count = Math.max(0, Math.min(bucket.dice.length, Math.floor(toNumber(rawCount, 0))));
    if (count <= 0) continue;

    for (const die of bucket.dice.slice(0, count)) {
      const result = rolls?.[die.rollIndex]?.terms?.[die.termIndex]?.results?.[die.resultIndex] ?? null;
      if (!result) continue;
      result.result = randomDieResult(die.faces);
      changedRollIndices.add(die.rollIndex);
      changedDiceCount += 1;
    }
  }

  for (const rollIndex of changedRollIndices) {
    const rollData = rolls[rollIndex];
    if (!rollData) continue;
    rolls[rollIndex] = recomputeRollData(rollData);
  }

  source.rolls = rolls
    .map((rollData, index) => {
      if (rollData == null) return sourceRolls[index] ?? null;
      return serializeRollDataEntry(rollData, rollFormats[index]);
    })
    .filter((entry) => entry != null);

  return changedDiceCount;
}

async function repostDamageMessage(message, buckets = null, selectedCounts = null) {
  try {
    const source = foundry?.utils?.deepClone?.(message.toObject()) ?? message.toObject();
    let changedDiceCount = 0;
    const requested = getSelectedEnhanceCountTotal(selectedCounts);
    if (Array.isArray(buckets) && selectedCounts) {
      changedDiceCount = applyEnhanceRerolls(source, message, buckets, selectedCounts);
      if (requested > 0 && changedDiceCount === 0) {
        ui?.notifications?.warn?.("Enhance: no dice could be rerolled from this message.");
        return {
          success: false,
          reason: "no-dice-rerolled",
          requested,
          changedDiceCount,
        };
      }
    }
    delete source._id;
    delete source._stats;
    source.user = game?.user?.id ?? source.user;
    source.timestamp = Date.now();
    const created = await ChatMessage.create(source);
    return {
      success: true,
      requested,
      changedDiceCount,
      messageId: created?.id ?? null,
    };
  } catch (err) {
    console.error(`${MODULE_ID} | Enhance damage failed.`, err);
    ui?.notifications?.error?.("Enhance damage failed. Check console for details.");
    return {
      success: false,
      reason: "exception",
      error: String(err?.message ?? err),
    };
  }
}

function getMaxEnhanceRollIndex(buckets) {
  if (!Array.isArray(buckets) || !buckets.length) return -1;
  let max = -1;
  for (const bucket of buckets) {
    for (const die of bucket?.dice ?? []) {
      const idx = Number(die?.rollIndex);
      if (Number.isFinite(idx) && idx > max) max = idx;
    }
  }
  return max;
}

function hasRollTerms(rollData) {
  return Array.isArray(rollData?.terms) && rollData.terms.length > 0;
}

function getRollEntryFormat(entry) {
  if (typeof entry === "string") return "string";
  if (entry && typeof entry === "object") return "object";
  return "object";
}

function getRollDataObject(entry) {
  if (!entry) return null;

  if (typeof entry === "string") {
    try {
      const parsed = JSON.parse(entry);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      try {
        if (typeof Roll?.fromJSON === "function") {
          const roll = Roll.fromJSON(entry);
          return getRollDataObject(roll);
        }
      } catch {
        return null;
      }
      return null;
    }
  }

  if (typeof entry === "object") {
    const ctorName = String(entry?.constructor?.name ?? "");
    if (/roll/i.test(ctorName)) {
      if (typeof entry.toJSON === "function") {
        const json = entry.toJSON();
        const parsed = getRollDataObject(json);
        if (parsed) return parsed;
      }
      if (typeof entry.toObject === "function") {
        const obj = entry.toObject();
        const parsed = getRollDataObject(obj);
        if (parsed) return parsed;
      }
    }

    if (Array.isArray(entry.terms)) {
      try {
        return foundry?.utils?.deepClone?.(entry) ?? JSON.parse(JSON.stringify(entry));
      } catch {
        return null;
      }
    }

    if (typeof entry.toJSON === "function") {
      const json = entry.toJSON();
      return getRollDataObject(json);
    }

    if (typeof entry.toObject === "function") {
      const obj = entry.toObject();
      return getRollDataObject(obj);
    }
  }

  return null;
}

function serializeRollDataEntry(rollData, format) {
  if (format === "string") {
    try {
      if (typeof Roll?.fromData === "function") {
        const roll = Roll.fromData(rollData);
        const json = roll?.toJSON?.();
        if (typeof json === "string") return json;
        if (json && typeof json === "object") return JSON.stringify(json);
      }
    } catch {
      // fall through to raw serialization
    }
    return JSON.stringify(rollData);
  }

  return rollData;
}

function isActorSheetApp(app) {
  if (!app) return false;
  if (getActorFromApp(app)) return true;
  const name = app?.constructor?.name ?? "";
  return name.includes("ActorSheet");
}

function getActorFromApp(app) {
  if (app?.actor) return app.actor;
  if (app?.document?.documentName === "Actor") return app.document;
  if (app?.object?.documentName === "Actor") return app.object;
  if (app?.object?.actor) return app.object.actor;
  return null;
}

function injectSyncButtonV1(app, html) {
  if (!isSyncButtonEnabled()) return;
  if (!isActorSheetApp(app)) return;
  if (!html?.closest) return;

  const appElement = html.closest(".app");
  if (!appElement?.find) return;

  const actor = getActorFromApp(app);
  if (!actor) return;

  const header = appElement.find(".window-header");
  if (!header.length) return;
  if (header.find(".netherscrolls-sync-button").length) return;

  const button = $(
    `<a class="header-button netherscrolls-sync-button" title="sync">
      <i class="fas fa-cloud-upload-alt"></i>sync
    </a>`
  );

  button.on("click", () => postActorSyncMessage(actor));

  const modeSlider = header.find(".mode-slider");
  const title = header.find(".window-title");
  if (modeSlider.length) {
    modeSlider.last().after(button);
  } else if (title.length) {
    title.first().before(button);
  } else {
    header.prepend(button);
  }
}

function injectSyncButtonV2(app, element) {
  if (!isSyncButtonEnabled()) return;
  if (!isActorSheetApp(app)) return;
  if (!element?.querySelector) return;

  const actor = getActorFromApp(app);
  if (!actor) return;

  const header =
    element.querySelector("header.window-header") ||
    element.querySelector(".window-header");
  if (!header) return;
  if (header.querySelector(".netherscrolls-sync-button")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.classList.add("header-control", "netherscrolls-sync-button");
  button.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><span>sync</span>';
  button.addEventListener("click", () => postActorSyncMessage(actor));

  const modeSlider = header.querySelector(".mode-slider");
  const title = header.querySelector(".window-title");
  if (modeSlider) {
    modeSlider.insertAdjacentElement("afterend", button);
  } else if (title) {
    title.insertAdjacentElement("beforebegin", button);
  } else {
    header.prepend(button);
  }
}

async function postActorSyncMessage(actor) {
  if (!actor) return;
  try {
    const repairResult = await repairNetherscrollsActorClassFeatures(actor, { notify: false });
    if (repairResult.created > 0) {
      ui?.notifications?.info?.(`Netherscrolls added ${repairResult.created} missing class feature${repairResult.created === 1 ? "" : "s"}.`);
    }
  } catch (err) {
    console.warn(`${MODULE_ID} | Unable to repair class features before sync.`, err);
  }

  const payload = buildActorSyncPayload(actor);
  if (isDebugEnabled()) {
    const content = renderSyncPayload(payload);
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
    });
  }
  syncActorToApi(actor, payload);
}

function queueNetherscrollsClassFeatureRepairForItem(item, { delay = 150 } = {}) {
  if (!isNetherscrollsClassLikeActorItem(item)) return;
  const actor = getNetherscrollsOwnedItemActor(item);
  if (!actor) return;
  queueNetherscrollsActorClassFeatureRepair(actor, { delay });
}

function queueNetherscrollsActorClassFeatureRepair(actor, { delay = 150 } = {}) {
  const key = toTrimmedStringOrNull(actor?.uuid ?? actor?.id);
  if (!key) return;
  const existing = netherscrollsClassFeatureRepairTimers.get(key);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(async () => {
    netherscrollsClassFeatureRepairTimers.delete(key);
    try {
      const result = await repairNetherscrollsActorClassFeatures(actor, { notify: false });
      if (isDebugEnabled() && result.created > 0) {
        console.info(`${MODULE_ID} | Repaired class features for ${actor?.name ?? "actor"}.`, result);
      }
    } catch (err) {
      console.warn(`${MODULE_ID} | Unable to repair class features for ${actor?.name ?? "actor"}.`, err);
    }
  }, delay);
  netherscrollsClassFeatureRepairTimers.set(key, timer);
}

function isNetherscrollsClassRepairUpdate(changes) {
  const paths = getNetherscrollsChangePaths(changes);
  if (!paths.length) return true;
  return paths.some((path) =>
    path === "system.levels" ||
    path === "system.identifier" ||
    path === "system.classIdentifier" ||
    path.startsWith("system.advancement") ||
    path.startsWith(`flags.${MODULE_ID}`)
  );
}

function getNetherscrollsChangePaths(value, prefix = "") {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const paths = [];
  for (const [key, entry] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    paths.push(path);
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      paths.push(...getNetherscrollsChangePaths(entry, path));
    }
  }
  return paths;
}

function isNetherscrollsClassLikeActorItem(item) {
  return Boolean((item?.type === "class" || item?.type === "subclass") && getNetherscrollsOwnedItemActor(item));
}

function getNetherscrollsOwnedItemActor(item) {
  if (item?.actor?.documentName === "Actor") return item.actor;
  if (item?.parent?.documentName === "Actor") return item.parent;
  if (item?.parent?.actor?.documentName === "Actor") return item.parent.actor;
  return null;
}

async function repairNetherscrollsActorClassFeatures(actor, { notify = false } = {}) {
  const result = {
    created: 0,
    skipped: 0,
    missingSources: 0,
  };
  if (!actor?.createEmbeddedDocuments) return result;
  if (typeof actor.canUserModify === "function" && !actor.canUserModify(game?.user, "update")) {
    return result;
  }

  const refs = await getNetherscrollsActorClassFeatureRefs(actor);
  if (!refs.length) return result;

  const createData = [];
  const considered = new Set();
  for (const ref of refs) {
    const uuid = toTrimmedStringOrNull(ref.uuid);
    if (!uuid || considered.has(uuid)) continue;
    considered.add(uuid);

    const feature = await resolveNetherscrollsDocumentUuid(uuid);
    if (!feature) {
      result.missingSources += 1;
      continue;
    }

    const featureLevel = getNetherscrollsClassFeatureLevel(feature, ref.level);
    if (featureLevel > ref.classLevel || isNetherscrollsOptionalClassFeature(feature)) {
      result.skipped += 1;
      continue;
    }

    if (actorHasNetherscrollsClassFeature(actor, feature, uuid)) {
      result.skipped += 1;
      continue;
    }

    createData.push(buildNetherscrollsActorClassFeatureData(feature, ref, uuid, featureLevel));
  }

  if (!createData.length) return result;
  const created = await actor.createEmbeddedDocuments("Item", createData, { renderSheet: false });
  result.created = Array.isArray(created) ? created.length : createData.length;
  if (notify && result.created > 0) {
    ui?.notifications?.info?.(`Netherscrolls added ${result.created} missing class feature${result.created === 1 ? "" : "s"}.`);
  }
  return result;
}

async function getNetherscrollsActorClassFeatureRefs(actor) {
  const items = getNetherscrollsActorItems(actor);
  const classItems = items.filter((item) => item?.type === "class");
  const subclassItems = items.filter((item) => item?.type === "subclass");
  const refs = [];

  for (const classItem of classItems) {
    const classLevel = getNetherscrollsActorClassLevel(classItem);
    if (classLevel <= 0) continue;
    refs.push(
      ...(await getNetherscrollsClassItemFeatureRefs(classItem, "classFeatureUuids", {
        classItem,
        classLevel,
        scope: "class",
      }))
    );

    for (const subclassItem of subclassItems) {
      if (!isNetherscrollsActorSubclassForClass(subclassItem, classItem)) continue;
      refs.push(
        ...(await getNetherscrollsClassItemFeatureRefs(subclassItem, "subclassFeatureUuids", {
          classItem,
          subclassItem,
          classLevel,
          scope: "subclass",
        }))
      );
    }
  }

  return refs;
}

function getNetherscrollsActorItems(actor) {
  if (!actor?.items) return [];
  return Array.from(actor.items);
}

function getNetherscrollsActorClassLevel(item) {
  return Math.max(0, Math.trunc(toNumber(item?.system?.levels ?? item?.system?.level, 0)));
}

async function getNetherscrollsClassItemFeatureRefs(item, flagName, context) {
  const refsByUuid = new Map();
  addNetherscrollsFeatureRefs(refsByUuid, normalizeNetherscrollsUuidArray(getNetherscrollsDocumentFlag(item, flagName)), context);
  addNetherscrollsFeatureRefs(refsByUuid, getNetherscrollsItemGrantRefs(item), context);

  if (!refsByUuid.size) {
    const importedItem = await resolveNetherscrollsImportedClassLikeDocument(item);
    addNetherscrollsFeatureRefs(refsByUuid, normalizeNetherscrollsUuidArray(getNetherscrollsDocumentFlag(importedItem, flagName)), context);
    addNetherscrollsFeatureRefs(refsByUuid, getNetherscrollsItemGrantRefs(importedItem), context);
  }

  return Array.from(refsByUuid.values());
}

function addNetherscrollsFeatureRefs(refsByUuid, entries, context) {
  for (const entry of entries ?? []) {
    const uuid = toTrimmedStringOrNull(typeof entry === "string" ? entry : entry?.uuid);
    if (!uuid || refsByUuid.has(uuid)) continue;
    refsByUuid.set(uuid, {
      ...context,
      uuid,
      level: normalizeNetherscrollsNullableNumber(entry?.level),
    });
  }
}

function normalizeNetherscrollsUuidArray(value) {
  if (Array.isArray(value)) return value.map(toTrimmedStringOrNull).filter(Boolean);
  const raw = toTrimmedStringOrNull(value);
  if (!raw) return [];
  return raw.split(/[,\s]+/).map(toTrimmedStringOrNull).filter(Boolean);
}

function getNetherscrollsItemGrantRefs(item) {
  const advancement = item?.system?.advancement ?? {};
  const entries = Object.values(advancement);
  const refs = [];
  for (const entry of entries) {
    if (entry?.type !== "ItemGrant") continue;
    const level = normalizeNetherscrollsNullableNumber(entry.level);
    for (const granted of entry?.configuration?.items ?? []) {
      const uuid = toTrimmedStringOrNull(granted?.uuid);
      if (uuid) refs.push({ uuid, level });
    }
  }
  return refs;
}

async function resolveNetherscrollsImportedClassLikeDocument(item) {
  const pack = await getNetherscrollsImportPack("classes");
  if (!pack?.getDocuments) return null;
  const itemType = toTrimmedStringOrNull(item?.type);
  const netherscrollsId = getNetherscrollsDocumentFlag(item, "netherscrollsId");
  const identifier = getNetherscrollsClassLikeIdentifier(item);
  const name = normalizeNetherscrollsName(item?.name).toLowerCase();

  const documents = await pack.getDocuments();
  return (
    documents.find((document) => document?.type === itemType && netherscrollsId && getNetherscrollsDocumentFlag(document, "netherscrollsId") === netherscrollsId) ??
    documents.find((document) => document?.type === itemType && identifier && getNetherscrollsClassLikeIdentifier(document) === identifier) ??
    documents.find((document) => document?.type === itemType && name && normalizeNetherscrollsName(document?.name).toLowerCase() === name) ??
    null
  );
}

function getNetherscrollsClassLikeIdentifier(item) {
  return toTrimmedStringOrNull(
    getNetherscrollsDocumentFlag(item, "identifier") ??
      item?.system?.identifier ??
      item?.system?.classIdentifier
  );
}

function isNetherscrollsActorSubclassForClass(subclassItem, classItem) {
  const classIdentifier = getNetherscrollsClassLikeIdentifier(classItem);
  const subclassClassIdentifier = toTrimmedStringOrNull(
    subclassItem?.system?.classIdentifier ?? getNetherscrollsDocumentFlag(subclassItem, "parentClassIdentifier")
  );
  if (classIdentifier && subclassClassIdentifier) return classIdentifier === subclassClassIdentifier;

  const parentClass = normalizeNetherscrollsName(
    getNetherscrollsDocumentFlag(subclassItem, "parentClass") ?? subclassItem?.system?.className
  ).toLowerCase();
  const className = normalizeNetherscrollsName(classItem?.name).toLowerCase();
  return Boolean(parentClass && className && parentClass === className);
}

async function resolveNetherscrollsDocumentUuid(uuid) {
  const id = toTrimmedStringOrNull(uuid);
  if (!id) return null;
  try {
    if (typeof fromUuid === "function") return await fromUuid(id);
  } catch (err) {
    console.warn(`${MODULE_ID} | Unable to resolve UUID ${id}.`, err);
  }

  try {
    if (typeof fromUuidSync === "function") {
      const document = fromUuidSync(id);
      if (document) return document;
    }
  } catch {
    // Fall back to manual compendium lookup below.
  }

  const match = /^Compendium\.(.+)\.Item\.([^.]+)$/i.exec(id);
  if (!match) return null;
  const pack = game?.packs?.get?.(match[1]);
  return (await pack?.getDocument?.(match[2])) ?? null;
}

function getNetherscrollsClassFeatureLevel(feature, fallbackLevel = null) {
  const level = normalizeNetherscrollsNullableNumber(getNetherscrollsDocumentFlag(feature, "level") ?? fallbackLevel);
  return Math.max(1, Math.trunc(level ?? 1));
}

function isNetherscrollsOptionalClassFeature(feature) {
  return Boolean(getNetherscrollsDocumentFlag(feature, "optional"));
}

function actorHasNetherscrollsClassFeature(actor, feature, uuid) {
  const featureId = getNetherscrollsDocumentFlag(feature, "netherscrollsId");
  const featureKey = getNetherscrollsDocumentFlag(feature, "featureKey");
  const parentClassIdentifier = getNetherscrollsDocumentFlag(feature, "parentClassIdentifier");
  const featureName = normalizeNetherscrollsName(feature?.name).toLowerCase();

  for (const item of getNetherscrollsActorItems(actor)) {
    if (item?.type !== "feat") continue;
    if (uuid && getNetherscrollsDocumentFlag(item, "grantedFromUuid") === uuid) return true;
    if (featureId && getNetherscrollsDocumentFlag(item, "netherscrollsId") === featureId) return true;
    if (featureKey && getNetherscrollsDocumentFlag(item, "featureKey") === featureKey) return true;
    const itemName = normalizeNetherscrollsName(item?.name).toLowerCase();
    const isClassFeature = item?.system?.type?.value === "class" || Boolean(getNetherscrollsDocumentFlag(item, "featureScope"));
    if (featureName && itemName === featureName && isClassFeature) {
      const itemParentClassIdentifier = getNetherscrollsDocumentFlag(item, "parentClassIdentifier");
      if (!parentClassIdentifier || !itemParentClassIdentifier || parentClassIdentifier === itemParentClassIdentifier) {
        return true;
      }
    }
  }

  return false;
}

function buildNetherscrollsActorClassFeatureData(feature, ref, uuid, featureLevel) {
  const data = duplicateNetherscrollsDocumentData(feature);
  delete data._id;
  delete data.folder;
  delete data.ownership;
  data.sort = 0;
  data.img = normalizeNetherscrollsImagePath(data.img);
  data.flags = data.flags ?? {};
  data.flags[MODULE_ID] = {
    ...(data.flags[MODULE_ID] ?? {}),
    grantedFromUuid: uuid,
    grantedByClassItemId: ref.classItem?.id ?? "",
    grantedByClass: ref.classItem?.name ?? "",
    grantedBySubclassItemId: ref.subclassItem?.id ?? "",
    grantedBySubclass: ref.subclassItem?.name ?? "",
    grantedAtClassLevel: featureLevel,
  };
  return data;
}

function duplicateNetherscrollsDocumentData(document) {
  if (typeof document?.toObject === "function") return document.toObject();
  return duplicateNetherscrollsData(document);
}

function getNetherscrollsDocumentFlag(document, key) {
  try {
    const value = document?.getFlag?.(MODULE_ID, key) ?? document?.flags?.[MODULE_ID]?.[key] ?? null;
    if (value != null || key !== "netherscrollsId") return value;
    return document?.getFlag?.("netherscrolls", "id") ?? document?.flags?.netherscrolls?.id ?? null;
  } catch {
    const value = document?.flags?.[MODULE_ID]?.[key] ?? null;
    if (value != null || key !== "netherscrollsId") return value;
    return document?.flags?.netherscrolls?.id ?? null;
  }
}

function renderSyncPayload(payload) {
  const json = JSON.stringify(payload, null, 2);
  const escaped = escapeHtml(json);
  return `<pre class="ns-sync-data">${escaped}</pre>`;
}

function buildActorSyncPayload(actor) {
  const system = actor?.system ?? {};
  const attributes = system.attributes ?? {};
  const abilities = system.abilities ?? {};
  const currency = system.currency ?? {};
  const { items, spells, feats } = splitActorItems(actor);
  const characterId = getActorCharacterId(actor);
  const payload = {
    characterName: actor?.name ?? "",
    proficiencyBonus: toNumber(attributes.prof),
    initiative: getInitiativeValue(attributes, abilities),
    armorClass: getArmorClassValue(attributes),
    hp: {
      current: toNumber(attributes.hp?.value),
      max: toNumber(attributes.hp?.max),
      temp: toNumber(attributes.hp?.temp),
    },
    hitDice: buildHitDice(actor),
    spellSlots: buildSpellSlots(system.spells),
    currency: {
      pp: toNumber(currency.pp),
      gp: toNumber(currency.gp),
      sp: toNumber(currency.sp),
      cp: toNumber(currency.cp),
    },
    exhaustion: toNumber(attributes.exhaustion),
    abilities: buildAbilities(abilities),
    savingThrows: buildSavingThrows(abilities, attributes.prof),
    skills: buildSkills(actor, system.skills, abilities, system.bonuses, attributes.prof),
    items,
    spells,
    feats,
  };
  if (characterId) payload.characterId = characterId;
  return payload;
}

function buildAbilities(abilities) {
  const result = {};
  for (const key of ABILITY_KEYS) {
    result[key] = toNumber(abilities?.[key]?.value);
  }
  return result;
}

function buildSavingThrows(abilities, profBonus) {
  const result = {};
  for (const key of ABILITY_KEYS) {
    const data = abilities?.[key] ?? {};
    const proficient = toNumber(data?.proficient ?? data?.prof);
    let bonus =
      data?.save ??
      data?.save?.value ??
      data?.save?.total ??
      data?.saveBonus;
    const misc = toNumber(data?.bonuses?.save);
    if (bonus == null) {
      const mod = getAbilityMod(data);
      bonus = mod + toNumber(profBonus) * proficient + misc;
    }
    const entry = {
      proficient,
      bonus: toNumber(bonus),
    };
    if (misc) entry.misc = misc;
    result[key] = entry;
  }
  return result;
}

function buildSkills(actor, skills, abilities, bonuses, profBonus) {
  const result = {};
  if (!skills || typeof skills !== "object") return result;

  const pb = toNumber(profBonus);
  const rollData = typeof actor?.getRollData === "function" ? actor.getRollData() : null;
  const global = bonuses?.abilities ?? {};

  for (const [key, skill] of Object.entries(skills)) {
    if (!skill || typeof skill !== "object") continue;

    const outKey = SKILL_KEY_TO_NAME[key] ?? key;
    const abilityKey = skill?.ability ?? null;
    const prof = toNumber(skill?.value ?? skill?.proficient ?? skill?.prof);
    const ability = abilityKey ? abilities?.[abilityKey] ?? {} : {};

    const abilityMod = getAbilityMod(ability);
    const base = abilityMod + getProficiencyContribution(pb, prof);
    const total = getSkillTotalBonus(skill, base, rollData, {
      skillCheck: skill?.bonuses?.check,
      abilityCheck: ability?.bonuses?.check,
      globalAbilityCheck: global?.check,
      globalSkill: global?.skill,
    });

    result[outKey] = {
      ability: abilityKey,
      prof,
      misc: toNumber(total - base),
    };
  }

  return result;
}

function getProficiencyContribution(proficiencyBonus, prof) {
  const pb = toNumber(proficiencyBonus);
  const p = toNumber(prof);
  if (!pb || !p) return 0;
  // Match 5e / dnd5e rounding rules for half-proficiency.
  return Math.floor(pb * p);
}

function getSkillTotalBonus(skill, base, rollData, bonusFormulas) {
  const direct =
    toNumberOrNull(skill?.total) ??
    toNumberOrNull(skill?.mod) ??
    toNumberOrNull(skill?.bonus) ??
    toNumberOrNull(skill?.check?.total) ??
    toNumberOrNull(skill?.check?.bonus);
  if (direct != null) return direct;

  const misc =
    evalDeterministicFormula(bonusFormulas?.skillCheck, rollData) +
    evalDeterministicFormula(bonusFormulas?.abilityCheck, rollData) +
    evalDeterministicFormula(bonusFormulas?.globalAbilityCheck, rollData) +
    evalDeterministicFormula(bonusFormulas?.globalSkill, rollData);
  return base + misc;
}

function buildSpellSlots(spells) {
  const current = {};
  const max = {};
  if (!spells) return { current, max };

  for (let level = 1; level <= 9; level += 1) {
    const slot = spells[`spell${level}`];
    if (!slot) continue;
    const cur = toNumber(slot.value);
    const mx = toNumber(slot.max ?? slot.override);
    if (cur <= 0 && mx <= 0) continue;
    current[`lvl${level}`] = cur;
    max[`lvl${level}`] = mx;
  }

  return { current, max };
}

function buildHitDice(actor) {
  const current = {};
  const max = {};
  const classes = actor?.items?.filter((item) => item?.type === "class") ?? [];

  if (classes.length) {
    for (const cls of classes) {
      const data = cls?.system ?? {};
      const die = normalizeHitDie(
        data?.hd?.denomination ??
          data?.hitDice ??
          data?.hitDie ??
          data?.hd?.value ??
          data?.hd?.faces
      );
      if (!die) continue;
      const levels = toNumber(data?.levels);
      if (levels <= 0) continue;
      const spent = toNumber(data?.hd?.spent ?? data?.hitDiceUsed ?? data?.hitDiceSpent);
      const available = Math.max(0, levels - spent);
      current[die] = (current[die] ?? 0) + available;
      max[die] = (max[die] ?? 0) + levels;
    }
    return { current, max };
  }

  const hd = actor?.system?.attributes?.hd;
  const die = normalizeHitDie(hd?.denomination ?? hd?.hitDice ?? hd?.value ?? hd);
  if (!die) return { current, max };

  const cur = toNumber(hd?.value ?? hd?.current ?? hd?.spent);
  const mx = toNumber(hd?.max ?? hd?.value ?? hd?.current);
  current[die] = cur;
  max[die] = mx;
  return { current, max };
}

function normalizeHitDie(hitDice) {
  if (!hitDice) return null;
  if (typeof hitDice === "string") {
    return hitDice.startsWith("d") ? hitDice : `d${hitDice}`;
  }
  if (typeof hitDice === "number") {
    return `d${hitDice}`;
  }
  const denom = hitDice?.denomination ?? hitDice?.faces ?? hitDice?.value;
  if (!denom) return null;
  return `d${denom}`;
}

function splitActorItems(actor) {
  const items = [];
  const spells = [];
  const feats = [];
  const ignoreTypes = new Set(["spell", "feat", "class", "subclass", "background", "race"]);

  for (const item of actor?.items ?? []) {
    if (!item?.name) continue;
    if (item.type === "spell") {
      spells.push(buildSpellExport(item));
    } else if (item.type === "feat") {
      const featType = item?.system?.type?.value ?? item?.system?.type;
      if (featType === "feat") {
        feats.push(buildFeatExport(item));
      }
    } else if (!ignoreTypes.has(item.type)) {
      items.push(buildItemExport(item));
    }
  }

  return { items, spells, feats };
}

function buildFeatExport(item) {
  const name = normalizeNetherscrollsName(item?.name);
  const description = getDescription(item);
  const source = getSource(item);
  const requirements =
    item?.system?.requirements ??
    item?.system?.requirement ??
    item?.system?.prerequisites ??
    null;
  const ability = getFeatAbilities(item);
  const netherscrollsId = getItemNetherId(item);

  if (netherscrollsId) {
    return { netherscrollsId, name };
  }

  return compactObject({
    name,
    description,
    requirement: requirements || null,
    source,
    demifeat: null,
    ability,
    netherscrollsId: netherscrollsId || null,
  });
}

function buildSpellExport(item) {
  const system = item?.system ?? {};
  const name = normalizeNetherscrollsName(item?.name);
  const description = getDescription(item);
  const source = getSource(item);
  const components = system.components ?? {};
  const material = system.materials?.value ?? system.material ?? null;
  const netherscrollsId = getItemNetherId(item);
  const damageParts = Array.isArray(system.damage?.parts)
    ? system.damage.parts
    : [];
  const damage = damageParts.length
    ? damageParts.map((part) => String(part?.[0] ?? "")).filter(Boolean).join(" + ")
    : null;
  const damageTypes = damageParts.length
    ? damageParts.map((part) => part?.[1]).filter(Boolean)
    : null;
  const saveAbilities = Array.isArray(system.save?.ability)
    ? system.save.ability
    : system.save?.ability
    ? [system.save.ability]
    : null;
  const componentTypes = Object.entries(components)
    .filter(([, value]) => value)
    .map(([key]) => key.toUpperCase());

  if (netherscrollsId) {
    return { netherscrollsId, name };
  }

  return compactObject({
    name,
    level: system.level ?? null,
    school: system.school ?? null,
    description,
    source,
    classes: null,
    castingTime: formatActivation(system.activation),
    range: formatRange(system.range),
    duration: formatDuration(system.duration),
    concentration: system.duration?.concentration ?? null,
    ritual: system.ritual ?? null,
    actionType: system.actionType ?? null,
    damage,
    summary: null,
    componentTypes: componentTypes.length ? componentTypes : null,
    componentMaterial: material ?? null,
    saveAbilities,
    damageTypes,
    netherscrollsId: netherscrollsId || null,
  });
}

function buildItemExport(item) {
  const system = item?.system ?? {};
  const name = normalizeNetherscrollsName(item?.name);
  const description = getDescription(item);
  const source = getSource(item);
  const netherscrollsId = getItemNetherId(item);
  const priceValue = system.price?.value ?? system.price ?? null;
  const weightValue = system.weight?.value ?? system.weight ?? null;
  const properties = Array.isArray(system.properties)
    ? system.properties
    : system.properties
    ? Object.keys(system.properties).filter((key) => system.properties[key])
    : [];
  const isHomebrew =
    typeof system.source?.custom === "string" && system.source.custom ? true : null;

  if (netherscrollsId) {
    return { netherscrollsId, name };
  }

  return compactObject({
    name,
    description,
    type: item?.type ?? null,
    rarity: system.rarity ?? null,
    attunement: system.attunement ?? null,
    price: priceValue != null ? { gp: priceValue } : null,
    weight: weightValue != null ? { lb: weightValue } : null,
    source,
    properties: properties.length ? properties : null,
    armor: system.armor ?? {},
    tags: null,
    isHomebrew,
    netherscrollsId: netherscrollsId || null,
  });
}

function getFeatAbilities(item) {
  const advances = item?.system?.advancement;
  if (!Array.isArray(advances)) return null;
  const abilities = [];
  for (const adv of advances) {
    if (adv?.type !== "AbilityScoreImprovement") continue;
    const value = adv?.value ?? {};
    const chosen = Object.keys(value).filter((key) => value[key]);
    abilities.push(...chosen);
  }
  return abilities.length ? abilities : null;
}

function getSource(item) {
  const source = item?.system?.source ?? {};
  const value = source.custom || source.book || source.rules || null;
  return value || "Foundry";
}

function getDescription(item) {
  const value = item?.system?.description?.value ?? "";
  if (foundry?.utils?.stripHTML) {
    return foundry.utils.stripHTML(value);
  }
  return String(value).replace(/<[^>]*>/g, "").trim();
}

function toTrimmedStringOrNull(value) {
  if (value == null) return null;
  const str = String(value).trim();
  return str ? str : null;
}

function evalDeterministicFormula(formula, rollData) {
  const raw = toTrimmedStringOrNull(formula);
  if (!raw) return 0;

  // Avoid randomness; these should be flat numeric bonuses (sometimes with @data references).
  if (/\d+d\d+/i.test(raw)) return 0;

  // Roll formulas like "+1" are not always valid standalone; prefix with 0.
  const expr = /^[+-]/.test(raw) ? `0 ${raw}` : raw;

  try {
    if (typeof Roll === "function") {
      const roll = new Roll(expr, rollData ?? {});
      const evaluated = roll.evaluate?.({ async: false });
      const total = Number((evaluated ?? roll)?.total);
      return Number.isFinite(total) ? total : 0;
    }
  } catch {
    // Fall back to a plain numeric parse.
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeNetherscrollsName(name) {
  if (!name) return "";
  return String(name)
    .replace(/\s*\(Legacy\)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatActivation(activation) {
  if (!activation) return null;
  const type = activation.type ?? "";
  const value = activation.value ?? "";
  if (!type && value === "") return null;
  if (value === "" || value == null) return type || null;
  return `${value} ${type}`.trim();
}

function formatRange(range) {
  if (!range) return null;
  const value = range.value ?? range.distance ?? "";
  const units = range.units ?? range.unit ?? "";
  if (!value && !units) return null;
  return `${value} ${units}`.trim();
}

function formatDuration(duration) {
  if (!duration) return null;
  const value = duration.value ?? "";
  const units = duration.units ?? "";
  if (!value && !units) return null;
  return `${value} ${units}`.trim();
}

function compactObject(value) {
  if (!value || typeof value !== "object") return value;
  const entries = Object.entries(value).filter(([, val]) => val !== null);
  return Object.fromEntries(entries);
}

function getItemNetherId(item) {
  try {
    return (
      item?.getFlag?.(MODULE_ID, "netherscrollsId") ??
      item?.getFlag?.("netherscrolls", "id") ??
      null
    );
  } catch (err) {
    console.warn(`${MODULE_ID} | Unable to read item netherscrollsId flag.`, err);
    return null;
  }
}

async function setItemNetherId(item, id) {
  try {
    if (!item?.setFlag || !id) return;
    const current = item?.getFlag?.(MODULE_ID, "netherscrollsId") ?? null;
    if (current === id) return;
    await item.setFlag(MODULE_ID, "netherscrollsId", id);
  } catch (err) {
    console.warn(`${MODULE_ID} | Unable to set item netherscrollsId flag.`, err);
  }
}

function getInitiativeValue(attributes, abilities) {
  const init = attributes?.init ?? {};
  if (init.total != null) return toNumber(init.total);
  if (init.value != null) return toNumber(init.value);
  if (init.mod != null) return toNumber(init.mod);
  const bonus = toNumber(init.bonus);
  const mod = getAbilityMod(abilities?.dex ?? {});
  return mod + bonus;
}

function getArmorClassValue(attributes) {
  const ac = attributes?.ac ?? {};
  if (ac.value != null) return toNumber(ac.value);
  if (ac.total != null) return toNumber(ac.total);
  if (ac.flat != null) return toNumber(ac.flat);
  if (typeof ac === "number" || typeof ac === "string") return toNumber(ac);
  return 0;
}

function getAbilityMod(ability) {
  const mod = ability?.mod;
  if (Number.isFinite(Number(mod))) return Number(mod);
  const value = Number(ability?.value);
  if (Number.isFinite(value)) return Math.floor((value - 10) / 2);
  return 0;
}

function escapeHtml(value) {
  if (foundry?.utils?.escapeHTML) {
    return foundry.utils.escapeHTML(value);
  }
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toNumberOrNull(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function getActorCharacterId(actor) {
  try {
    return actor?.getFlag?.(MODULE_ID, "characterId") ?? null;
  } catch (err) {
    console.warn(`${MODULE_ID} | Unable to read actor characterId flag.`, err);
    return null;
  }
}

async function setActorCharacterId(actor, characterId) {
  try {
    if (!actor?.setFlag || !characterId) return;
    const current = actor?.getFlag?.(MODULE_ID, "characterId") ?? null;
    if (current === characterId) return;
    await actor.setFlag(MODULE_ID, "characterId", characterId);
  } catch (err) {
    console.warn(`${MODULE_ID} | Unable to set actor characterId flag.`, err);
  }
}

async function syncActorToApi(actor, payload) {
  const apiKey = String(game?.settings?.get(MODULE_ID, SETTINGS.apiKey) ?? "").trim();
  if (!apiKey) {
    ui?.notifications?.warn?.(
      "Netherscrolls API Key is missing. Set it in Module Settings."
    );
    return;
  }

  try {
    const response = await fetch(SYNC_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        data?.error?.message ??
        data?.message ??
        (typeof data?.error === "string" ? data.error : null) ??
        `Sync failed (${response.status} ${response.statusText}).`;
      ui?.notifications?.warn?.(`Sync failed: ${message}`);
      if (data && isDebugEnabled()) {
        const errorContent = renderSyncPayload(data);
        ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor }),
          content: errorContent,
        });
      }
      return;
    }

    if (data && isDebugEnabled()) {
      const responseContent = renderSyncPayload(data);
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: responseContent,
      });
    }
    const characterId = data?.data?.characterId;
    if (characterId) {
      await setActorCharacterId(actor, characterId);
    }
    await applyLinkedIds(actor, data?.linked);
    const name = data?.data?.name ?? payload?.characterName ?? actor?.name ?? "actor";
    ui?.notifications?.info?.(`Sync success: ${name}`);
  } catch (err) {
    console.error("Netherscrolls sync failed.", err);
    ui?.notifications?.error?.("Sync failed. Check console for details.");
  }
}

function toggleRerollInitHook(enabled) {
  if (!game?.ready) return;
  const shouldEnable = Boolean(enabled);

  if (shouldEnable && !rerollInitHandler) {
    rerollInitHandler = buildRerollInitHandler();
    Hooks.on("updateCombat", rerollInitHandler);
    ui?.notifications?.info?.("Reroll initiative each round: ON");
  } else if (!shouldEnable && rerollInitHandler) {
    Hooks.off("updateCombat", rerollInitHandler);
    rerollInitHandler = null;
    ui?.notifications?.info?.("Reroll initiative each round: OFF");
  }
}

function buildRerollInitHandler() {
  const lastByCombat = {};

  return async (combat, changed) => {
    if (!game?.user?.isGM) return;
    if (!combat?.isActive) return;
    if (!Object.prototype.hasOwnProperty.call(changed ?? {}, "round")) return;
    const round = Number(changed.round);
    if (!Number.isFinite(round)) return;
    if (lastByCombat[combat.id] === round) return;
    lastByCombat[combat.id] = round;

    // Foundry startCombat() begins at round 1, so keep the initial initiative roll.
    if (round <= 1) return;

    setTimeout(async () => {
      try {
        await combat.resetAll({ updateTurn: false });
        await combat.rollAll({
          updateTurn: false,
          messageOptions: { create: false },
        });
        await combat.update({ turn: 0 });
      } catch (err) {
        console.error("Reroll each round FAILED:", err);
      }
    }, 0);
  };
}

function toggleNpcDeathSaveHook(enabled) {
  if (!game?.ready) return;
  const shouldEnable = Boolean(enabled);

  if (shouldEnable && !npcDeathSaveHandler) {
    npcDeathSaveHandler = buildNpcDeathSaveHandler();
    Hooks.on("updateCombat", npcDeathSaveHandler);
    ui?.notifications?.info?.("NPC death save each turn: ON");
  } else if (!shouldEnable && npcDeathSaveHandler) {
    Hooks.off("updateCombat", npcDeathSaveHandler);
    npcDeathSaveHandler = null;
    ui?.notifications?.info?.("NPC death save each turn: OFF");
  }
}

function buildNpcDeathSaveHandler() {
  const lastByCombat = {};

  return async (combat, changed) => {
    if (!game?.user?.isGM) return;
    if (!combat?.isActive) return;
    if (
      !Object.prototype.hasOwnProperty.call(changed ?? {}, "turn") &&
      !Object.prototype.hasOwnProperty.call(changed ?? {}, "round")
    ) {
      return;
    }

    const combatant = combat.combatant;
    const actor = combatant?.actor;
    if (!actor) return;
    if (actor.hasPlayerOwner) return;

    const hp = Number(actor.system?.attributes?.hp?.value ?? 0);
    if (hp > 0) return;

    const death = actor.system?.attributes?.death;
    if (!death) return;

    const success = Number(death.success ?? 0);
    const failure = Number(death.failure ?? 0);
    const stable = Boolean(death.stable);
    if (stable || success >= 3 || failure >= 3) return;

    const key = `${combat.round}:${combat.turn}:${actor.id}`;
    if (lastByCombat[combat.id] === key) return;
    lastByCombat[combat.id] = key;

    await rollNpcDeathSave(actor);
  };
}

async function rollNpcDeathSave(actor) {
  const death = actor.system?.attributes?.death;
  if (!death) return;

  const save = actor.system?.abilities?.con?.save;
  const conSave = Number(save?.value ?? save ?? 0);

  const roll = await new Roll("1d20 + @conSave", { conSave }).evaluate({ async: true });

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: "Death Save (+CON save)",
  });

  const die = Number(roll.dice?.[0]?.total ?? 0);
  const total = Number(roll.total ?? 0);

  let success = Number(death.success ?? 0);
  let failure = Number(death.failure ?? 0);

  if (die === 20) {
    await actor.update({
      "system.attributes.hp.value": 1,
      "system.attributes.death.success": 0,
      "system.attributes.death.failure": 0,
      "system.attributes.death.stable": false,
    });
    return;
  }

  if (die === 1) failure += 2;
  else if (total >= 10) success += 1;
  else failure += 1;

  success = Math.min(success, 3);
  failure = Math.min(failure, 3);

  await actor.update({
    "system.attributes.death.success": success,
    "system.attributes.death.failure": failure,
    "system.attributes.death.stable": success >= 3,
  });
}

async function applyLinkedIds(actor, linked) {
  if (!actor || !linked) return;
  const itemLinks = Array.isArray(linked.items) ? linked.items : [];
  const spellLinks = Array.isArray(linked.spells) ? linked.spells : [];
  const featLinks = Array.isArray(linked.feats) ? linked.feats : [];

  if (!itemLinks.length && !spellLinks.length && !featLinks.length) return;

  const byName = new Map();
  for (const item of actor.items ?? []) {
    if (!item?.name) continue;
    const key = `${item.type}:${normalizeNetherscrollsName(item.name).toLowerCase()}`;
    const bucket = byName.get(key);
    if (bucket) bucket.push(item);
    else byName.set(key, [item]);
  }

  const apply = async (links, type) => {
    for (const link of links) {
      const id = link?.id;
      const name = link?.name;
      if (!id || !name) continue;
      const key = `${type}:${normalizeNetherscrollsName(name).toLowerCase()}`;
      const items = byName.get(key);
      if (!items) continue;
      for (const item of items) {
        await setItemNetherId(item, id);
      }
    }
  };

  await apply(itemLinks, "weapon");
  await apply(itemLinks, "equipment");
  await apply(itemLinks, "consumable");
  await apply(itemLinks, "tool");
  await apply(itemLinks, "container");
  await apply(itemLinks, "loot");
  await apply(spellLinks, "spell");
  await apply(featLinks, "feat");
}
