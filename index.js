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
  // Monster import is not available yet. Keep this definition ready for the endpoint.
  // {
  //   key: "monster",
  //   label: "Monster",
  //   icon: "fa-solid fa-dragon",
  //   checked: false,
  // },
];
const IMPORT_PACKS = {
  classes: "classes",
  subclasses: "subclasses",
  classFeatures: "class-features",
  items: "items",
  feats: "feats",
  spells: "spells",
  backgrounds: "backgrounds",
  races: "races",
  monster: "monster",
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
const NETHERSCROLLS_IMPORT_SIDEBAR_FOLDER = {
  name: "Netherscrolls",
  type: "Compendium",
  sorting: "m",
  sort: 0,
};
const NETHERSCROLLS_API_BASE = "https://api.netherscrolls.ca/api/foundry";
const NETHERSCROLLS_MEDIA_IMAGE_ENDPOINT = `${NETHERSCROLLS_API_BASE}/media/image`;
const NETHERSCROLLS_EXPORT_ENDPOINT = `${NETHERSCROLLS_API_BASE}/export`;
const NETHERSCROLLS_IMPORT_SELECTION_ENDPOINT = `${NETHERSCROLLS_API_BASE}/import/selection`;
const NETHERSCROLLS_SOURCES_ENDPOINT = `${NETHERSCROLLS_API_BASE}/import/sources`;
const NETHERSCROLLS_CAMPAIGNS_ENDPOINT = `${NETHERSCROLLS_API_BASE}/campaigns`;
const NETHERSCROLLS_SOURCE_IMPORT_ENDPOINT = `${NETHERSCROLLS_API_BASE}/import/source`;
const NETHERSCROLLS_IMPORT_QUEUE_POLL_INTERVAL_MS = 60_000;
const NETHERSCROLLS_EXCLUDED_IMPORT_SOURCE_IDS = new Set(["6a4b21868f309c84b6cb7908"]);
const NETHERSCROLLS_IMPORT_ENDPOINTS = {
  classes: `${NETHERSCROLLS_API_BASE}/import/classes`,
  items: `${NETHERSCROLLS_API_BASE}/import/items`,
  feats: `${NETHERSCROLLS_API_BASE}/import/feats`,
  spells: `${NETHERSCROLLS_API_BASE}/import/spells`,
  backgrounds: `${NETHERSCROLLS_API_BASE}/import/backgrounds`,
  races: `${NETHERSCROLLS_API_BASE}/import/races`,
};
const NETHERSCROLLS_CHARACTER_FOLDER = {
  name: "NS-Character",
  type: "Actor",
  sorting: "m",
  sort: 0,
};
const NETHERSCROLLS_DEFAULT_IMAGE = "https://i.postimg.cc/wBj0LZyj/image.png";
const NETHERSCROLLS_IMPORT_IMAGE = NETHERSCROLLS_DEFAULT_IMAGE;
const netherscrollsCharacterImportState = new WeakMap();
const netherscrollsCharacterImportLocks = new Map();
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
const NETHERSCROLLS_MAIN_CLASS_FEATURE_FOLDER_NAME = "Main Class";
const NETHERSCROLLS_LEGACY_CLASS_FEATURE_FOLDER_NAME = "Class Features";
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
  exportButton: "showFoundryExportButton",
  importQueuePolling: "pollFoundryImportQueue",
  importQueuePollingSafetyReset: "pollFoundryImportQueueSafetyResetV1",
  debug: "debugMode",
  devEnhancedDamage: "devEnhancedDamage",
  hardVision: "enableHardVision",
};

const HARD_VISION_SVG_NS = "http://www.w3.org/2000/svg";
const HARD_VISION_SIDEBAR_TAB = "netherscrolls-hard-vision";
const HARD_VISION_SCENE_FLAG = "hardVision";
const hardVisionController = createHardVisionController();
const NetherscrollsHardVisionSidebarTab = createNetherscrollsHardVisionSidebarTabClass();
function createHardVisionController() {
  return {
    active: false,
    range: 30,
    tokenIds: [],
    rangesByTokenId: new Map(),
    svg: null,
    mask: null,
    maskBackground: null,
    blackout: null,
    circles: new Map(),
    animationFrame: null,

    getBoard() {
      return canvas?.app?.canvas ?? canvas?.app?.view ?? document.querySelector("#board");
    },

    getToken(tokenId) {
      return canvas?.tokens?.placeables?.find((token) => token.document.id === tokenId);
    },

    createSvgElement(name) {
      return document.createElementNS(HARD_VISION_SVG_NS, name);
    },

    ensureOverlay() {
      if (this.svg?.isConnected) return this.svg;

      const board = this.getBoard();
      if (!board) return null;

      const maskId = `${MODULE_ID}-hard-vision-mask-${Math.random().toString(36).slice(2)}`;
      const svg = this.createSvgElement("svg");
      svg.id = `${MODULE_ID}-hard-vision-overlay`;
      svg.setAttribute("aria-hidden", "true");
      Object.assign(svg.style, {
        position: "fixed",
        left: "0px",
        top: "0px",
        width: "0px",
        height: "0px",
        pointerEvents: "none",
        userSelect: "none",
        overflow: "hidden",
        zIndex: "5",
      });

      const definitions = this.createSvgElement("defs");
      const mask = this.createSvgElement("mask");
      mask.id = maskId;
      mask.setAttribute("maskUnits", "userSpaceOnUse");
      mask.setAttribute("maskContentUnits", "userSpaceOnUse");
      mask.setAttribute("mask-type", "luminance");

      const maskBackground = this.createSvgElement("rect");
      maskBackground.setAttribute("x", "0");
      maskBackground.setAttribute("y", "0");
      maskBackground.setAttribute("fill", "white");
      mask.append(maskBackground);
      definitions.append(mask);

      const blackout = this.createSvgElement("rect");
      blackout.setAttribute("x", "0");
      blackout.setAttribute("y", "0");
      blackout.setAttribute("fill", "#000000");
      blackout.setAttribute("mask", `url(#${maskId})`);
      svg.append(definitions, blackout);
      document.body.append(svg);

      this.svg = svg;
      this.mask = mask;
      this.maskBackground = maskBackground;
      this.blackout = blackout;
      return svg;
    },

    removeOverlay() {
      this.svg?.remove();
      this.svg = null;
      this.mask = null;
      this.maskBackground = null;
      this.blackout = null;
      this.circles.clear();
    },

    getCircle(tokenId) {
      let circle = this.circles.get(tokenId);
      if (circle?.isConnected) return circle;

      circle = this.createSvgElement("circle");
      circle.setAttribute("fill", "black");
      this.mask.append(circle);
      this.circles.set(tokenId, circle);
      return circle;
    },

    removeUnusedCircles(activeTokenIds) {
      for (const [tokenId, circle] of this.circles.entries()) {
        if (activeTokenIds.has(tokenId)) continue;
        circle.remove();
        this.circles.delete(tokenId);
      }
    },

    updateOverlay() {
      if (!this.active) return;
      if (!isNetherscrollsHardVisionEnabled()) {
        this.stop();
        return;
      }
      if (!canvas?.ready) {
        if (this.svg) this.svg.style.display = "none";
        return;
      }

      const board = this.getBoard();
      const svg = this.ensureOverlay();
      if (!board || !svg || !canvas.dimensions) return;

      const boardRectangle = board.getBoundingClientRect();
      if (boardRectangle.width <= 0 || boardRectangle.height <= 0) {
        svg.style.display = "none";
        return;
      }

      Object.assign(svg.style, {
        display: "block",
        left: `${boardRectangle.left}px`,
        top: `${boardRectangle.top}px`,
        width: `${boardRectangle.width}px`,
        height: `${boardRectangle.height}px`,
      });
      svg.setAttribute("viewBox", `0 0 ${boardRectangle.width} ${boardRectangle.height}`);
      svg.setAttribute("width", String(boardRectangle.width));
      svg.setAttribute("height", String(boardRectangle.height));
      for (const rectangle of [this.maskBackground, this.blackout]) {
        rectangle.setAttribute("width", String(boardRectangle.width));
        rectangle.setAttribute("height", String(boardRectangle.height));
      }

      const activeTokenIds = new Set();
      for (const tokenId of this.tokenIds) {
        const token = this.getToken(tokenId);
        if (!token) continue;

        activeTokenIds.add(tokenId);
        const range = this.rangesByTokenId.get(tokenId) ?? this.range;
        const canvasRadius = range * canvas.dimensions.distancePixels;
        const center = token.center;
        const clientCenter = canvas.clientCoordinatesFromCanvas({ x: center.x, y: center.y });
        const clientEdge = canvas.clientCoordinatesFromCanvas({
          x: center.x + canvasRadius,
          y: center.y,
        });
        const radius = Math.hypot(clientEdge.x - clientCenter.x, clientEdge.y - clientCenter.y);
        const circle = this.getCircle(tokenId);
        circle.setAttribute("cx", String(clientCenter.x - boardRectangle.left));
        circle.setAttribute("cy", String(clientCenter.y - boardRectangle.top));
        circle.setAttribute("r", String(radius));
      }

      this.removeUnusedCircles(activeTokenIds);
      if (!activeTokenIds.size) svg.style.display = "none";
    },

    animationLoop() {
      if (!this.active) {
        this.animationFrame = null;
        return;
      }
      this.updateOverlay();
      this.animationFrame = requestAnimationFrame(() => this.animationLoop());
    },

    applyRestrictions(restrictions) {
      const validRestrictions = Array.from(restrictions ?? [])
        .map(({ tokenId, range }) => ({ tokenId: String(tokenId ?? ""), range: Number(range) }))
        .filter(({ tokenId, range }) => tokenId && Number.isFinite(range) && range >= 0);
      if (!validRestrictions.length) {
        this.stop();
        return;
      }

      this.tokenIds = validRestrictions.map(({ tokenId }) => tokenId);
      this.rangesByTokenId = new Map(
        validRestrictions.map(({ tokenId, range }) => [tokenId, range])
      );
      this.range = validRestrictions[0].range;
      this.start();
    },
    start() {
      this.active = true;
      this.ensureOverlay();
      if (!this.animationFrame) this.animationLoop();
      refreshNetherscrollsHardVisionTab();
    },

    stop() {
      this.active = false;
      this.tokenIds = [];
      this.rangesByTokenId.clear();
      if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
      this.removeOverlay();
      refreshNetherscrollsHardVisionTab();
    },

    async openMenu() {
      if (!isNetherscrollsHardVisionEnabled()) {
        return ui?.notifications?.warn?.("Player vision limit is disabled in Netherscrolls settings.");
      }
      if (!canvas?.ready) return ui?.notifications?.warn?.("The canvas is not ready.");

      const DialogV2 = foundry?.applications?.api?.DialogV2;
      if (!DialogV2?.input) {
        return ui?.notifications?.error?.("Player vision limit requires Foundry VTT's DialogV2 API.");
      }

      const existingRange = Number.isFinite(this.range) ? this.range : 30;
      const result = await DialogV2.input({
        window: { title: "Player Vision Limit" },
        content: `
          <div class="form-group">
            <label>Vision</label>
            <div class="form-fields">
              <select name="mode">
                <option value="limited">Limited</option>
                <option value="unlimited">No Limit</option>
              </select>
            </div>
          </div>
          <div data-ns-hard-vision-range></div>
        `,
        render: (_event, dialog) => {
          const root = dialog.element ?? dialog.form;
          const modeSelect = root?.querySelector?.('[name="mode"]');
          const container = root?.querySelector?.("[data-ns-hard-vision-range]");
          if (!modeSelect || !container) return;

          let rememberedRange = String(existingRange);
          const refreshRangeInput = () => {
            const oldInput = root.querySelector('[name="range"]');
            if (oldInput) rememberedRange = oldInput.value;
            container.replaceChildren();
            if (modeSelect.value === "unlimited") return;

            const group = document.createElement("div");
            group.className = "form-group";
            group.innerHTML = `
              <label>Maximum Range</label>
              <div class="form-fields">
                <input type="number" name="range" value="${rememberedRange}" min="0" step="1" autofocus>
              </div>
              <p class="hint">Uses the scene's distance units.</p>
            `;
            container.append(group);
          };
          modeSelect.addEventListener("change", refreshRangeInput);
          refreshRangeInput();
        },
        ok: { label: "Apply" },
        rejectClose: false,
      });

      if (!result) return;

      const isGM = game.user?.isGM === true;
      const selectedTokens = canvas.tokens.controlled.filter(
        (token) => isGM || token.document.isOwner
      );

      if (result.mode === "unlimited") {
        if (!isGM) {
          this.stop();
          return ui?.notifications?.info?.("Local vision limit removed.");
        }
        if (!selectedTokens.length) {
          return ui?.notifications?.warn?.("Select at least one token to remove its player vision limit.");
        }
        await updateNetherscrollsSceneVisionRestrictions({
          tokenIds: selectedTokens.map((token) => token.document.id),
          enabled: false,
        });
        return ui?.notifications?.info?.("Player vision limit removed from the selected token(s).");
      }

      const range = Number(result.range);
      if (!Number.isFinite(range) || range < 0) {
        return ui?.notifications?.error?.("Enter a valid vision range.");
      }
      if (!selectedTokens.length) {
        return ui?.notifications?.warn?.(
          isGM
            ? "Select at least one player token first."
            : "Select a token you control first."
        );
      }

      const tokenIds = selectedTokens.map((token) => token.document.id);
      if (isGM) {
        await updateNetherscrollsSceneVisionRestrictions({ tokenIds, range, enabled: true });
        return ui?.notifications?.info?.(
          `Player vision limited to ${range} ${canvas.dimensions.units || "units"}.`
        );
      }

      this.applyRestrictions(tokenIds.map((tokenId) => ({ tokenId, range })));
      return ui?.notifications?.info?.(
        `Local vision limited to ${range} ${canvas.dimensions.units || "units"}.`
      );
    },
  };
}

function isNetherscrollsHardVisionEnabled() {
  try {
    return game?.settings?.get(MODULE_ID, SETTINGS.hardVision) === true;
  } catch (_err) {
    return false;
  }
}
function getNetherscrollsSceneVisionRestrictions(scene) {
  const stored =
    scene?.getFlag?.(MODULE_ID, HARD_VISION_SCENE_FLAG) ??
    scene?.flags?.[MODULE_ID]?.[HARD_VISION_SCENE_FLAG];
  const tokenRanges = stored?.tokenRanges;
  if (!tokenRanges || typeof tokenRanges !== "object") return [];

  return Object.entries(tokenRanges)
    .map(([tokenId, range]) => ({ tokenId: String(tokenId), range: Number(range) }))
    .filter(({ tokenId, range }) => tokenId && Number.isFinite(range) && range >= 0);
}

function syncNetherscrollsSceneVisionRestrictions(scene = canvas?.scene) {
  if (
    !isNetherscrollsHardVisionEnabled() ||
    !canvas?.ready ||
    !scene ||
    scene.id !== canvas.scene?.id ||
    game.user?.isGM
  ) {
    hardVisionController.stop();
    return;
  }

  const ownedRestrictions = getNetherscrollsSceneVisionRestrictions(scene).filter(({ tokenId }) => {
    const token = hardVisionController.getToken(tokenId);
    return token?.document?.isOwner === true;
  });
  hardVisionController.applyRestrictions(ownedRestrictions);
}

async function updateNetherscrollsSceneVisionRestrictions({ tokenIds, range = null, enabled }) {
  if (!game.user?.isGM) {
    throw new Error("Only a GM can set player vision limits.");
  }

  const scene = canvas?.scene;
  if (!scene?.setFlag) throw new Error("Open a scene before setting a player vision limit.");

  const nextTokenRanges = Object.fromEntries(
    getNetherscrollsSceneVisionRestrictions(scene).map(({ tokenId, range: currentRange }) => [
      tokenId,
      currentRange,
    ])
  );

  for (const tokenId of new Set(tokenIds ?? [])) {
    if (enabled) nextTokenRanges[tokenId] = Number(range);
    else delete nextTokenRanges[tokenId];
  }

  await scene.setFlag(MODULE_ID, HARD_VISION_SCENE_FLAG, { tokenRanges: nextTokenRanges });
}

function refreshNetherscrollsHardVisionTab() {
  ui?.[HARD_VISION_SIDEBAR_TAB]?.render?.({ force: false });
}

function openNetherscrollsModuleConfiguration() {
  const SettingsConfig = globalThis.foundry?.applications?.settings?.SettingsConfig;
  if (SettingsConfig) return new SettingsConfig({ initialCategory: MODULE_ID }).render({ force: true });
  return ui?.settings?.activate?.();
}

function openNetherscrollsImporter() {
  return new NetherscrollsImportSettings().render({ force: true });
}

function createNetherscrollsHardVisionSidebarTabClass() {
  const HandlebarsApplicationMixin = globalThis.foundry?.applications?.api?.HandlebarsApplicationMixin;
  const AbstractSidebarTab = globalThis.foundry?.applications?.sidebar?.AbstractSidebarTab;
  if (!HandlebarsApplicationMixin || !AbstractSidebarTab) return null;

  return class NetherscrollsHardVisionSidebarTab extends HandlebarsApplicationMixin(AbstractSidebarTab) {
    static tabName = HARD_VISION_SIDEBAR_TAB;

    static DEFAULT_OPTIONS = {
      id: HARD_VISION_SIDEBAR_TAB,
      classes: ["netherscrolls-sidebar-tab"],
      window: {
        title: "Netherscrolls",
        icon: "fa-solid fa-scroll",
      },
      actions: {
        openModuleConfig: () => openNetherscrollsModuleConfiguration(),
        openImporter: () => openNetherscrollsImporter(),
        openHardVision: () => hardVisionController.openMenu(),
      },
    };

    static PARTS = {
      content: {
        template: `modules/${MODULE_ID}/templates/netherscrolls-sidebar-tab.hbs`,
        root: true,
      },
    };

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      return {
        ...context,
        visionLimitEnabled: isNetherscrollsHardVisionEnabled(),
      };
    }
  };
}

function registerNetherscrollsHardVisionSidebarTab() {
  if (!NetherscrollsHardVisionSidebarTab) return;

  const uiConfig = globalThis.CONFIG?.ui;
  if (!uiConfig) return;

  uiConfig[HARD_VISION_SIDEBAR_TAB] = NetherscrollsHardVisionSidebarTab;
  const Sidebar = uiConfig.sidebar;
  if (!Sidebar?.TABS) return;

  const descriptor = {
    icon: "fa-solid fa-scroll",
    tooltip: "Netherscrolls",
  };
  const settingsTab = Sidebar.TABS.settings;
  if (settingsTab) delete Sidebar.TABS.settings;
  Sidebar.TABS[HARD_VISION_SIDEBAR_TAB] = descriptor;
  if (settingsTab) Sidebar.TABS.settings = settingsTab;
}
Hooks.once("init", () => {
  registerNetherscrollsHardVisionSidebarTab();
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
    hint: "Use a user-generated key with apikey.import and apikey.export; campaign actions require a campaign DM or administrator key.",
    scope: "world",
    config: true,
    restricted: true,
    type: String,
    default: "",
  });

  game.settings.registerMenu(MODULE_ID, SETTINGS.importFromNetherscroll, {
    name: "Foundry Import",
    label: "Open Foundry Import",
    hint: "Run Foundry Import for Netherscrolls library content and campaign characters.",
    icon: "fa-solid fa-cloud-arrow-down",
    type: NetherscrollsImportSettings,
    restricted: true,
  });

  game.settings.register(MODULE_ID, SETTINGS.exportButton, {
    name: "Foundry Export button",
    hint: "Show the Foundry Export button on linked character sheets.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => rerenderActorSheets(),
  });

  game.settings.register(MODULE_ID, SETTINGS.importQueuePolling, {
    name: "EXPERIMENTAL: Poll the Foundry Import queue",
    hint: "Experimental: periodically apply queued campaign characters using the DM or administrator API key.",
    scope: "world",
    config: true,
    restricted: true,
    type: Boolean,
    default: false,
    onChange: (value) => toggleNetherscrollsImportQueuePolling(Boolean(value)),
  });
  game.settings.register(MODULE_ID, SETTINGS.importQueuePollingSafetyReset, {
    scope: "world",
    config: false,
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

  game.settings.register(MODULE_ID, SETTINGS.devEnhancedDamage, {
    name: "Enhanced damage",
    hint: "Developer toggle for enhanced damage behavior.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(MODULE_ID, SETTINGS.hardVision, {
    name: "Enable player vision limit",
    hint: "Show the Netherscrolls scene-control tab that lets players locally limit vision around selected tokens.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: (value) => {
      if (!value) hardVisionController.stop();
      else syncNetherscrollsSceneVisionRestrictions();
      refreshNetherscrollsHardVisionTab();
    },
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
          title: "Foundry Import",
        },
        position: {
          width: 900,
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
          title: "Foundry Import",
        },
        position: {
          width: 900,
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
        title: "Foundry Import",
        template: `modules/${MODULE_ID}/templates/import-from-netherscroll.hbs`,
        classes: ["netherscrolls-import-window"],
        width: 900,
        height: "auto",
        submitOnChange: false,
        closeOnSubmit: false,
      };
      return foundry?.utils?.mergeObject
        ? foundry.utils.mergeObject(super.defaultOptions, options)
        : { ...(super.defaultOptions ?? {}), ...options };
    }

    async getData(options) {
      const context = (await super.getData(options)) ?? {};
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

async function getNetherscrollsImportSettingsContext(context = {}) {
  const apiKey = getNetherscrollsApiKey();
  const today = new Date().toISOString().slice(0, 10);
  const compendiumState = await getNetherscrollsCompendiumReadiness();

  return {
    ...context,
    hasApiKey: Boolean(apiKey),
    compendiumReady: compendiumState.ready,
    compendiumDocumentCount: compendiumState.documentCount,
    importTypes: IMPORT_TYPES,
    sources: [],
    sourceLoading: Boolean(apiKey),
    sourceLoadError: null,
    hasSources: false,
    defaultSinceDate: today,
  };
}

async function getNetherscrollsImportSourceContext(apiKey) {
  try {
    const response = await fetch(NETHERSCROLLS_SOURCES_ENDPOINT, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "x-api-key": apiKey,
      },
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        data?.error?.message ??
        data?.message ??
        `Source list failed (${response.status} ${response.statusText}).`;
      throw new Error(message);
    }

    return {
      sources: normalizeNetherscrollsImportSources(data),
      sourceLoadError: null,
    };
  } catch (err) {
    console.error(`${MODULE_ID} | Unable to load Netherscrolls sources.`, err);
    return {
      sources: [],
      sourceLoadError: err?.message ?? String(err ?? "Unable to load sources."),
    };
  }
}

function normalizeNetherscrollsImportSources(data) {
  const rows = Array.isArray(data?.data?.sources)
    ? data.data.sources
    : Array.isArray(data?.sources)
      ? data.sources
      : Array.isArray(data)
        ? data
        : [];

  return rows
    .map((source) => {
      const id = normalizeNetherscrollsReferenceValue(
        source?._id ?? source?.id ?? source?.netherscrollsId
      );
      if (id && NETHERSCROLLS_EXCLUDED_IMPORT_SOURCE_IDS.has(id)) return null;

      const key = toTrimmedStringOrNull(source?.key);
      const abbreviation = toTrimmedStringOrNull(source?.abbreviation);
      const name = toTrimmedStringOrNull(source?.name) ?? key ?? abbreviation ?? id;
      const value = normalizeNetherscrollsReferenceValue(name ?? key ?? abbreviation ?? id);
      if (!value) return null;

      const detailParts = [abbreviation, key].filter(Boolean);
      return {
        value,
        label: detailParts.length ? `${name} (${detailParts.join(" / ")})` : name,
        sortName: String(name).toLowerCase(),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.sortName.localeCompare(b.sortName));
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
  loadNetherscrollsImportSourcesIntoForm(listenerRoot, getNetherscrollsApiKey());
  activateNetherscrollsCharacterImportListeners(listenerRoot);

  if (!submitHandler || !form || form.dataset.netherscrollsImportSubmitBound === "1") {
    return;
  }

  form.dataset.netherscrollsImportSubmitBound = "1";
  form.addEventListener("submit", submitHandler);
}

async function loadNetherscrollsImportSourcesIntoForm(root, apiKey) {
  const sourceList = root?.querySelector?.(".ns-import-source-list");
  const message = root?.querySelector?.(".ns-import-source-message");
  if (!sourceList || !apiKey || sourceList.dataset.netherscrollsSourcesBound === "1") return;

  sourceList.dataset.netherscrollsSourcesBound = "1";
  sourceList.classList.add("is-loading");
  if (message) {
    message.classList.remove("is-error");
    message.textContent = "Connecting to the API server...";
  }

  const sourceContext = await getNetherscrollsImportSourceContext(apiKey);
  sourceList.replaceChildren();
  sourceList.classList.remove("is-loading");

  if (sourceContext.sourceLoadError) {
    if (message) {
      message.classList.add("is-error");
      message.textContent = `Sources unavailable: ${sourceContext.sourceLoadError}`;
    }
    return;
  }

  for (const source of sourceContext.sources) {
    const label = document.createElement("label");
    label.classList.add("ns-import-source-option");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "sources";
    checkbox.value = source.value;

    const text = document.createElement("span");
    text.textContent = source.label;

    label.append(checkbox, text);
    sourceList.appendChild(label);
  }

  if (message) {
    message.classList.remove("is-error");
    message.textContent = sourceContext.sources.length
      ? "Pick any sources to limit the import. Leave all unchecked to import all sources."
      : "No importable sources returned.";
  }
}

async function handleNetherscrollsImportSettingsSubmitEvent(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();

  const form = event?.currentTarget;
  const submitter = event?.submitter;
  const submitButton = submitter?.matches?.('button[type="submit"]')
    ? submitter
    : form?.querySelector?.('button[type="submit"]');

  const originalButtonHtml = submitButton?.innerHTML;
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Connecting to the API server...`;
  }
  try {
    const result = await submitNetherscrollsImportSettings(getNetherscrollsFormDataObject(form));
    if (result?.importedAny) {
      await refreshNetherscrollsCharacterImportAvailability(form);
    }
  } catch (err) {
    console.error(`${MODULE_ID} | Netherscrolls import form submit failed.`, err);
    ui?.notifications?.error?.(`Foundry Import failed: ${err?.message ?? err}`);
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      if (originalButtonHtml != null) submitButton.innerHTML = originalButtonHtml;
    }
  }
}

async function submitNetherscrollsImportSettings(formData) {
  const apiKey = getNetherscrollsApiKey();
  if (!apiKey) {
    ui?.notifications?.warn?.(
      "Netherscrolls API Key is missing. Set it in Module Settings."
    );
    return { importedAny: false };
  }

  const selectedTypes = IMPORT_TYPES.filter((type) =>
    isImportTypeSelected(formData, type.key)
  );
  if (!selectedTypes.length) {
    ui?.notifications?.warn?.("Select at least one Foundry Import content type.");
    return { importedAny: false };
  }

  const sinceEnabled = Boolean(formData?.sinceEnabled);
  const sinceDate = String(formData?.sinceDate ?? "").trim();
  if (sinceEnabled && !sinceDate) {
    ui?.notifications?.warn?.("Choose a date or disable Since.");
    return { importedAny: false };
  }

  const since = sinceEnabled ? normalizeNetherscrollsSinceDate(sinceDate) : null;
  if (sinceEnabled && !since) {
    ui?.notifications?.warn?.("Choose a valid Since date.");
    return { importedAny: false };
  }

  const selectedSources = getSelectedNetherscrollsSourceValues(formData);
  const requests = await buildNetherscrollsImportRequests({
    apiKey,
    selectedTypes,
    sinceDate: since,
    selectedSources,
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
    ui?.notifications?.warn?.(`Foundry Import endpoint not configured for: ${labels}.`);
  }

  let importedAny = false;
  for (const request of requests) {
    try {
      const response = await sendNetherscrollsImportRequest(request);
      const result = await applyNetherscrollsImportResponse(response, request.typeKey, request.typeKeys);
      importedAny = true;
      ui?.notifications?.info?.(
        request.sourceFiltered
          ? formatNetherscrollsSourceImportResult(result, request.typeKeys)
          : formatNetherscrollsImportResult(request.typeKey, result)
      );
    } catch (err) {
      console.error(`${MODULE_ID} | Netherscrolls ${request.typeKey} import failed.`, err);
      ui?.notifications?.error?.(
        `Netherscrolls ${getNetherscrollsImportTypeLabel(request.typeKey)} import failed: ${err?.message ?? err}`
      );
    }
  }
  if (importedAny) {
    return { importedAny: true };
  }

  const range = sinceEnabled ? `since ${sinceDate}` : "since forever";
  const labels = selectedTypes.map((type) => type.label.toLowerCase()).join(", ");
  ui?.notifications?.info?.(
    `Netherscrolls import request prepared: ${labels} ${range}.`
  );
  return { importedAny: false };
}

async function getNetherscrollsCompendiumReadiness() {
  let documentCount = 0;
  for (const typeKey of Object.keys(NETHERSCROLLS_WORLD_IMPORT_PACKS)) {
    if (typeKey === "monster") continue;
    const pack = game?.packs?.get?.(getNetherscrollsImportPackCollection(typeKey));
    if (!pack) continue;

    try {
      const index = await pack.getIndex?.({
        fields: ["flags.netherscrolls.id"],
      });
      const entries = index?.contents ?? (index ? Array.from(index) : []);
      const imported = entries.filter((entry) =>
        Boolean(entry?.flags?.netherscrolls?.id)
      );
      documentCount += imported.length;
    } catch (err) {
      console.warn(`${MODULE_ID} | Unable to read Netherscrolls compendium index.`, err);
    }
  }
  return { ready: documentCount > 0, documentCount };
}

function activateNetherscrollsCharacterImportListeners(root) {
  const panel = root?.querySelector?.("[data-ns-character-import-panel]");
  if (!panel || panel.dataset.netherscrollsCharacterImportBound === "1") return;
  panel.dataset.netherscrollsCharacterImportBound = "1";

  const state = getNetherscrollsCharacterImportState(root);
  const campaignSelect = panel.querySelector("[data-ns-campaign-select]");
  panel.querySelector('[data-ns-character-action="refresh-campaigns"]')?.addEventListener("click", () => {
    loadNetherscrollsCampaignsIntoForm(root, { force: true });
  });
  campaignSelect?.addEventListener("change", () => {
    loadNetherscrollsCampaignCharactersIntoForm(root, campaignSelect.value);
  });
  panel.querySelector('[data-ns-character-action="select-all"]')?.addEventListener("click", () => {
    panel.querySelectorAll('[name="characterIds"]:not(:disabled)').forEach((input) => {
      input.checked = true;
    });
  });
  panel.querySelector('[data-ns-character-action="clear-selection"]')?.addEventListener("click", () => {
    panel.querySelectorAll('[name="characterIds"]').forEach((input) => {
      input.checked = false;
    });
  });
  root?.querySelector?.('[data-ns-character-action="import-selected"]')?.addEventListener("click", async (event) => {
    const selectedIds = Array.from(panel.querySelectorAll('[name="characterIds"]:checked')).map((input) => input.value);
    const selected = selectedIds
      .map((id) => state.charactersById.get(id))
      .filter(Boolean);
    if (!selected.length) {
      ui?.notifications?.warn?.("Select at least one Netherscrolls character for Foundry Import.");
      return;
    }

    const button = event.currentTarget;
    const originalHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Running Foundry Import…';
    try {
      await importNetherscrollsSelectedCampaignCharacters(root, selected);
    } catch (err) {
      console.error(`${MODULE_ID} | Character import failed.`, err);
      ui?.notifications?.error?.(`Foundry Import failed: ${err?.message ?? err}`);
    } finally {
      button.disabled = false;
      button.innerHTML = originalHtml;
    }
  });
  root?.querySelector?.('[data-ns-character-action="export-selected"]')?.addEventListener("click", async (event) => {
    const campaignId = normalizeNetherscrollsReferenceValue(campaignSelect?.value);
    const selectedIds = Array.from(panel.querySelectorAll('[name="characterIds"]:checked')).map((input) => input.value);
    if (!campaignId) {
      ui?.notifications?.warn?.("Select a campaign before running Foundry Export.");
      return;
    }
    const actors = selectedIds
      .map((characterId) => findNetherscrollsActorByCharacterId(characterId))
      .filter(Boolean);
    if (!actors.length) {
      ui?.notifications?.warn?.("Select at least one character that already exists in Foundry.");
      return;
    }

    const button = event.currentTarget;
    const originalHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Exporting characters…';
    try {
      const result = await exportNetherscrollsCampaignActors(campaignId, actors);
      const message = `Foundry Export: ${result.succeeded.length} succeeded, ${result.failed.length} failed.`;
      setNetherscrollsCharacterImportMessage(root, message, { error: Boolean(result.failed.length) });
      if (result.failed.length) ui?.notifications?.warn?.(message);
      else ui?.notifications?.info?.(message);
    } catch (err) {
      console.error(`${MODULE_ID} | Campaign Foundry Export failed.`, err);
      ui?.notifications?.error?.(`Campaign Foundry Export failed: ${err?.message ?? err}`);
    } finally {
      button.disabled = false;
      button.innerHTML = originalHtml;
    }
  });

  if (getNetherscrollsApiKey()) {
    loadNetherscrollsCampaignsIntoForm(root);
  }
}

function getNetherscrollsCharacterImportState(root) {
  let state = netherscrollsCharacterImportState.get(root);
  if (state) return state;
  state = {
    campaigns: [],
    charactersById: new Map(),
  };
  netherscrollsCharacterImportState.set(root, state);
  return state;
}

async function refreshNetherscrollsCharacterImportAvailability(root) {
  const panel = root?.querySelector?.("[data-ns-character-import-panel]");
  if (!panel) return;
  const state = await getNetherscrollsCompendiumReadiness();
  const enabled = state.ready;

  const status = root.querySelector("[data-ns-compendium-status]");
  status?.classList.toggle("is-ready", enabled);
  status?.classList.toggle("is-missing", !enabled);
  if (status) {
    status.replaceChildren();
    const icon = document.createElement("i");
    icon.className = enabled ? "fa-solid fa-boxes-stacked" : "fa-solid fa-cloud-arrow-down";
    const text = document.createElement("span");
    text.textContent = enabled
      ? `Netherscrolls library ready (${state.documentCount} documents)`
      : "Library empty; Foundry Import will fetch required linked records";
    status.append(icon, text);
  }

  const prerequisite = panel.querySelector("[data-ns-character-prerequisite]");
  prerequisite?.classList.add("is-ready");
  prerequisite?.classList.remove("is-blocked");
  if (prerequisite) {
    prerequisite.textContent = enabled
      ? "Select a campaign, then choose the Netherscrolls characters to create or update in Foundry."
      : "Select a campaign. Missing linked records will be fetched through targeted Foundry Import selection.";
  }
  await loadNetherscrollsCampaignsIntoForm(root, { force: true });
}

async function loadNetherscrollsCampaignsIntoForm(root, { force = false } = {}) {
  const panel = root?.querySelector?.("[data-ns-character-import-panel]");
  const select = panel?.querySelector?.("[data-ns-campaign-select]");
  if (!panel || !select || panel.disabled) return;
  const state = getNetherscrollsCharacterImportState(root);
  if (state.loadingCampaigns || (!force && state.campaigns.length)) return;

  state.loadingCampaigns = true;
  setNetherscrollsCharacterImportMessage(root, "Loading campaigns available to this API key…");
  select.disabled = true;
  try {
    const campaigns = await fetchNetherscrollsCampaigns();
    state.campaigns = campaigns;
    const previousValue = select.value;
    select.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = campaigns.length ? "Select a campaign" : "No importable campaigns found";
    select.appendChild(placeholder);
    for (const campaign of campaigns) {
      const option = document.createElement("option");
      option.value = campaign.id;
      option.textContent = campaign.label;
      if (campaign.id === previousValue) option.selected = true;
      select.appendChild(option);
    }
    setNetherscrollsCharacterImportMessage(
      root,
      campaigns.length
        ? "Select a campaign to load its Netherscrolls characters."
        : "This API key is not a DM for any importable Netherscrolls campaigns."
    );
  } catch (err) {
    console.error(`${MODULE_ID} | Unable to load Netherscrolls campaigns.`, err);
    select.replaceChildren();
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Campaigns unavailable";
    select.appendChild(option);
    setNetherscrollsCharacterImportMessage(root, `Campaigns unavailable: ${err?.message ?? err}`, { error: true });
  } finally {
    state.loadingCampaigns = false;
    select.disabled = false;
  }
}

async function fetchNetherscrollsCampaigns() {
  const apiKey = getNetherscrollsApiKey();
  if (!apiKey) throw new Error("Netherscrolls API Key is missing. Set it in Module Settings.");
  const data = await fetchNetherscrollsApiJson(NETHERSCROLLS_CAMPAIGNS_ENDPOINT, apiKey);
  const rows = getNetherscrollsApiRows(data);
  return rows
    .map((campaign) => {
      const id = normalizeNetherscrollsReferenceValue(
        campaign?._id ?? campaign?.id ?? campaign?.campaignId ?? campaign?.netherscrollsId
      );
      if (!id) return null;
      const name = toTrimmedStringOrNull(campaign?.name ?? campaign?.title) ?? id;
      const detail = toTrimmedStringOrNull(campaign?.system ?? campaign?.description ?? campaign?.code);
      return { id, label: detail ? `${name} — ${detail}` : name };
    })
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label));
}

async function disableLegacyNetherscrollsImportQueuePolling() {
  if (game?.settings?.get(MODULE_ID, SETTINGS.importQueuePollingSafetyReset) === true) return;
  try {
    await game.settings.set(MODULE_ID, SETTINGS.importQueuePolling, false);
    await game.settings.set(MODULE_ID, SETTINGS.importQueuePollingSafetyReset, true);
  } catch (err) {
    console.error(`${MODULE_ID} | Unable to disable legacy Foundry Import queue polling.`, err);
  }
}

function toggleNetherscrollsImportQueuePolling(enabled) {
  if (netherscrollsImportQueuePollTimer) {
    clearTimeout(netherscrollsImportQueuePollTimer);
    netherscrollsImportQueuePollTimer = null;
  }
  if (!enabled || !game?.ready || !isPrimaryNetherscrollsQueuePoller()) return;

  const run = async () => {
    try {
      await pollNetherscrollsImportQueues();
    } catch (err) {
      console.error(`${MODULE_ID} | Foundry Import queue poll failed.`, err);
    } finally {
      if (
        game?.settings?.get(MODULE_ID, SETTINGS.importQueuePolling) === true &&
        isPrimaryNetherscrollsQueuePoller()
      ) {
        netherscrollsImportQueuePollTimer = setTimeout(
          run,
          NETHERSCROLLS_IMPORT_QUEUE_POLL_INTERVAL_MS
        );
      }
    }
  };
  run();
}

async function pollNetherscrollsImportQueues() {
  if (netherscrollsImportQueuePollRunning || !isPrimaryNetherscrollsQueuePoller()) return {
    imported: 0,
    failed: 0,
  };
  const apiKey = getNetherscrollsApiKey();
  if (!apiKey) return { imported: 0, failed: 0 };

  netherscrollsImportQueuePollRunning = true;
  let imported = 0;
  let failed = 0;
  try {
    const campaigns = await fetchNetherscrollsCampaigns();
    if (!campaigns.length) return { imported, failed };
    const folder = await findOrCreateNetherscrollsCharacterFolder();
    if (!folder?.id) throw new Error("Foundry could not create the NS-Character Actor folder.");

    for (const campaign of campaigns) {
      const queuedCharacters = await fetchNetherscrollsCampaignImports(campaign.id);
      for (const importedCharacter of queuedCharacters) {
        try {
          await importNetherscrollsCampaignCharacter(importedCharacter, folder);
          await acknowledgeNetherscrollsCampaignImport(campaign.id, importedCharacter.id);
          imported += 1;
        } catch (err) {
          failed += 1;
          console.error(
            `${MODULE_ID} | Foundry Import queue entry remains queued after a failed apply.`,
            {
              campaignId: campaign.id,
              characterId: importedCharacter.id,
              error: err,
            }
          );
        }
      }
    }
    if (imported) {
      ui?.notifications?.info?.(
        `Foundry Import queue: ${imported} character${imported === 1 ? "" : "s"} applied.`
      );
    }
    return { imported, failed };
  } finally {
    netherscrollsImportQueuePollRunning = false;
  }
}

function isPrimaryNetherscrollsQueuePoller() {
  if (!game?.user?.isGM) return false;
  const activeGM = game?.users?.activeGM;
  return !activeGM || activeGM.id === game.user.id;
}

async function fetchNetherscrollsCampaignImports(campaignId) {
  const apiKey = getNetherscrollsApiKey();
  const endpoint = `${NETHERSCROLLS_CAMPAIGNS_ENDPOINT}/${encodeURIComponent(campaignId)}/imports`;
  const data = await fetchNetherscrollsApiJson(endpoint, apiKey);
  return getNetherscrollsApiRows(data)
    .map(normalizeNetherscrollsImportedCharacter)
    .filter(Boolean);
}

async function acknowledgeNetherscrollsCampaignImport(campaignId, characterId) {
  const endpoint = `${NETHERSCROLLS_CAMPAIGNS_ENDPOINT}/${encodeURIComponent(campaignId)}/imports/${encodeURIComponent(characterId)}`;
  await requestNetherscrollsJson(endpoint, {
    method: "DELETE",
    apiKey: getNetherscrollsApiKey(),
    operation: "Foundry Import acknowledgement",
  });
}

async function loadNetherscrollsCampaignCharactersIntoForm(root, campaignId) {
  const panel = root?.querySelector?.("[data-ns-character-import-panel]");
  const list = panel?.querySelector?.("[data-ns-character-list]");
  if (!panel || !list) return;
  const id = normalizeNetherscrollsReferenceValue(campaignId);
  const state = getNetherscrollsCharacterImportState(root);
  state.charactersById.clear();
  list.replaceChildren();
  if (!id) {
    setNetherscrollsCharacterImportMessage(root, "Select a campaign to load its Netherscrolls characters.");
    return;
  }

  setNetherscrollsCharacterImportMessage(root, "Loading campaign characters…");
  try {
    const characters = await fetchNetherscrollsCampaignCharacters(id);
    for (const character of characters) state.charactersById.set(character.id, character);
    renderNetherscrollsCampaignCharacterList(list, characters);
    setNetherscrollsCharacterImportMessage(
      root,
      characters.length ? "Choose one or more characters for Foundry Import." : "This campaign has no characters available for Foundry Import."
    );
  } catch (err) {
    console.error(`${MODULE_ID} | Unable to load Netherscrolls campaign characters.`, err);
    setNetherscrollsCharacterImportMessage(root, `Characters unavailable: ${err?.message ?? err}`, { error: true });
  }
}

async function fetchNetherscrollsCampaignCharacters(campaignId) {
  const apiKey = getNetherscrollsApiKey();
  if (!apiKey) throw new Error("Netherscrolls API Key is missing. Set it in Module Settings.");
  const endpoint = `${NETHERSCROLLS_CAMPAIGNS_ENDPOINT}/${encodeURIComponent(campaignId)}/characters`;
  const data = await fetchNetherscrollsApiJson(endpoint, apiKey);
  return getNetherscrollsApiRows(data)
    .map(normalizeNetherscrollsImportedCharacter)
    .filter(Boolean);
}

async function fetchNetherscrollsApiJson(url, apiKey) {
  return requestNetherscrollsJson(url, { method: "GET", apiKey });
}

async function requestNetherscrollsJson(
  url,
  {
    method = "GET",
    apiKey = getNetherscrollsApiKey(),
    body = null,
    operation = "Request",
    includeStatus = false,
  } = {}
) {
  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      ...(body == null ? {} : { "Content-Type": "application/json" }),
      "x-api-key": apiKey,
    },
    ...(body == null ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      data?.error?.message ??
      data?.message ??
      (typeof data?.error === "string" ? data.error : null) ??
      `${operation} failed (${response.status} ${response.statusText}).`;
    const error = new Error(message);
    error.status = response.status;
    error.code = data?.error?.code ?? data?.code ?? null;
    error.data = data;
    throw error;
  }
  return includeStatus ? { data, status: response.status } : data;
}

function getNetherscrollsApiRows(data) {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.data) ? data.data : [];
}

function normalizeNetherscrollsImportedCharacter(entry) {
  const character = entry?.character;
  const foundryActor = entry?.foundryActor;
  const id = normalizeNetherscrollsReferenceValue(
    character?._id ??
      character?.id ??
      foundryActor?.flags?.netherscrolls?.characterId
  );
  if (!id) return null;
  const name = toTrimmedStringOrNull(foundryActor?.name ?? character?.name ?? entry?.name) ?? "Unnamed Character";
  return { id, name, character, foundryActor, raw: entry };
}

function renderNetherscrollsCampaignCharacterList(root, characters) {
  root.replaceChildren();
  if (!characters.length) return;
  const table = document.createElement("table");
  table.className = "ns-character-table";
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  for (const label of ["", "Character", "Details", "Foundry"]) {
    const cell = document.createElement("th");
    cell.textContent = label;
    headerRow.appendChild(cell);
  }
  thead.appendChild(headerRow);
  const tbody = document.createElement("tbody");
  for (const importedCharacter of characters) {
    const row = document.createElement("tr");
    const selectCell = document.createElement("td");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "characterIds";
    checkbox.value = importedCharacter.id;
    checkbox.setAttribute("aria-label", `Foundry Import ${importedCharacter.name}`);
    selectCell.appendChild(checkbox);

    const nameCell = document.createElement("td");
    nameCell.textContent = importedCharacter.name;
    const detailsCell = document.createElement("td");
    detailsCell.textContent = getNetherscrollsCharacterImportDetail(importedCharacter);
    const statusCell = document.createElement("td");
    const existing = findNetherscrollsActorByCharacterId(importedCharacter.id);
    statusCell.className = `ns-character-status ${existing ? "is-existing" : "is-new"}`;
    statusCell.textContent = existing ? "Will update" : "Will create";
    row.append(selectCell, nameCell, detailsCell, statusCell);
    tbody.appendChild(row);
  }
  table.append(thead, tbody);
  root.appendChild(table);
}

function getNetherscrollsCharacterImportDetail(importedCharacter) {
  const source = importedCharacter?.character ?? {};
  const parts = [
    toTrimmedStringOrNull(source?.race?.name ?? source?.raceName),
    toTrimmedStringOrNull(source?.class?.name ?? source?.className ?? source?.characterClass),
  ].filter(Boolean);
  const level = source?.level ?? source?.levels ?? source?.characterLevel;
  if (level != null) parts.push(`Level ${level}`);
  return parts.join(" · ") || "—";
}

function setNetherscrollsCharacterImportMessage(root, message, { error = false } = {}) {
  const element = root?.querySelector?.("[data-ns-character-message]");
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("is-error", Boolean(error));
}

async function importNetherscrollsSelectedCampaignCharacters(root, selected) {
  setNetherscrollsCharacterImportMessage(root, "Preparing character import...");
  debugNetherscrollsCharacterImport("Starting selected-character import.", {
    selectedCount: selected.length,
  });

  const campaignId = normalizeNetherscrollsReferenceValue(
    root?.querySelector?.("[data-ns-campaign-select]")?.value
  );
  if (!campaignId) throw new Error("Select a campaign before importing characters.");

  const folder = await findOrCreateNetherscrollsCharacterFolder();
  if (!folder?.id) throw new Error("Foundry could not create the NS-Character Actor folder.");
  debugNetherscrollsCharacterImport("Resolved character destination folder.", {
    campaignId,
    folderId: folder.id,
    folderName: folder.name,
  });

  const results = [];
  for (const [index, selectedCharacter] of selected.entries()) {
    const progressLabel = `Character ${index + 1} of ${selected.length}: ${selectedCharacter?.name ?? "Unnamed Character"}`;
    try {
      setNetherscrollsCharacterImportMessage(root, `${progressLabel} — loading Foundry Import payload...`);
      debugNetherscrollsCharacterImport("Hydrating selected Foundry Import character.", {
        campaignId,
        characterId: selectedCharacter?.id,
        name: selectedCharacter?.name,
        hasActorPayload: Boolean(selectedCharacter?.foundryActor),
      });
      const importedCharacter = await hydrateNetherscrollsImportedCharacter(selectedCharacter, campaignId);
      debugNetherscrollsCharacterImport("Foundry Import character hydrated.", {
        characterId: importedCharacter.id,
        name: importedCharacter.name,
        actorPayloadKeys: Object.keys(importedCharacter.foundryActor ?? {}),
      });
      const result = await importNetherscrollsCampaignCharacter(importedCharacter, folder, {
        onProgress: (stage) => {
          setNetherscrollsCharacterImportMessage(root, `${progressLabel} — ${stage}`);
          console.info(`${MODULE_ID} | Foundry Import | ${progressLabel} — ${stage}`);
        },
      });
      debugNetherscrollsCharacterImport("Character import completed.", {
        characterId: importedCharacter.id,
        name: importedCharacter.name,
        created: result.created,
        fetched: result.fetched,
        itemResult: result.items,
        effectResult: result.effects,
        repairedFeatures: result.repairedFeatures,
      });
      results.push({
        ...result,
        characterId: importedCharacter.id,
        name: importedCharacter.name,
        ok: true,
      });
    } catch (err) {
      setNetherscrollsCharacterImportMessage(root, `${progressLabel} — failed: ${err?.message ?? String(err)}`, { error: true });
      debugNetherscrollsCharacterImport("Character import failed.", {
        campaignId,
        characterId: selectedCharacter?.id,
        name: selectedCharacter?.name,
        error: err?.message ?? String(err),
        stack: err?.stack,
      });
      console.error(`${MODULE_ID} | Unable to import character ${selectedCharacter?.name ?? ""}.`, err);
      results.push({
        characterId: selectedCharacter?.id,
        name: selectedCharacter?.name ?? "Unnamed Character",
        ok: false,
        error: err?.message ?? String(err),
      });
    }
  }

  const created = results.filter((result) => result.ok && result.created).length;
  const updated = results.filter((result) => result.ok && !result.created).length;
  const failed = results.filter((result) => !result.ok);
  const fetched = results.reduce((total, result) => total + (result.fetched ?? 0), 0);
  const message = [
    `Netherscrolls characters: ${created} created, ${updated} updated`,
    fetched ? `${fetched} linked content record${fetched === 1 ? "" : "s"} refreshed` : null,
    failed.length ? `${failed.length} failed` : null,
  ]
    .filter(Boolean)
    .join("; ");
  setNetherscrollsCharacterImportMessage(root, message, { error: Boolean(failed.length) });
  if (failed.length) {
    ui?.notifications?.warn?.(`${message}. See the console for individual failures.`);
  } else {
    ui?.notifications?.info?.(message);
  }
  debugNetherscrollsCharacterImport("Selected-character import finished.", { results, message });

  const list = root?.querySelector?.("[data-ns-character-list]");
  const state = getNetherscrollsCharacterImportState(root);
  if (list) {
    renderNetherscrollsCampaignCharacterList(list, Array.from(state.charactersById.values()));
    const failedIds = new Set(failed.map((result) => String(result.characterId ?? "")));
    list.querySelectorAll?.('[name="characterIds"]').forEach((input) => {
      input.checked = failedIds.has(String(input.value));
    });
  }
}

async function hydrateNetherscrollsImportedCharacter(importedCharacter, campaignId) {
  const listActor = importedCharacter?.foundryActor;
  const hasListActor = listActor && typeof listActor === "object";
  const hasUnresolvedListImage = isNetherscrollsUnresolvedImageKey(listActor?.img);
  if (hasListActor && !hasUnresolvedListImage) {
    debugNetherscrollsCharacterImport("Using Foundry Actor payload supplied by the campaign list.", {
      characterId: importedCharacter.id,
    });
    return importedCharacter;
  }
  if (hasUnresolvedListImage) {
    console.warn(
      `${MODULE_ID} | Foundry Import | Campaign list returned an unresolved image key; ` +
      "refreshing the Actor from the single-character route.",
      listActor.img
    );
  }
  const apiKey = getNetherscrollsApiKey();
  const endpoint = `${NETHERSCROLLS_CAMPAIGNS_ENDPOINT}/${encodeURIComponent(campaignId)}/characters/${encodeURIComponent(importedCharacter.id)}`;
  debugNetherscrollsCharacterImport("Fetching full Foundry Import character.", { campaignId, characterId: importedCharacter.id, endpoint });
  const data = await fetchNetherscrollsApiJson(endpoint, apiKey);
  const direct = normalizeNetherscrollsImportedCharacter(data?.data ?? data);
  if (!direct?.foundryActor) {
    throw new Error("The Foundry Import response did not include a Foundry Actor payload.");
  }
  debugNetherscrollsCharacterImport("Full Foundry Import character contains a Foundry Actor payload.", {
    characterId: direct.id,
    actorPayloadKeys: Object.keys(direct.foundryActor ?? {}),
  });
  return direct;
}

async function findOrCreateNetherscrollsCharacterFolder() {
  const existing = getWorldFolders().find((folder) => {
    const parentId = folder?.folder?.id ?? folder?.folder ?? folder?.parent?.id ?? folder?.parent ?? null;
    return (
      folder?.name === NETHERSCROLLS_CHARACTER_FOLDER.name &&
      folder?.type === NETHERSCROLLS_CHARACTER_FOLDER.type &&
      !parentId
    );
  });
  if (existing) return existing;

  const FolderDocumentClass = globalThis.foundry?.documents?.Folder ?? globalThis.Folder;
  const FolderClass = FolderDocumentClass?.implementation ?? FolderDocumentClass;
  if (typeof FolderClass?.create !== "function") return null;
  return FolderClass.create({ ...NETHERSCROLLS_CHARACTER_FOLDER });
}

async function importNetherscrollsCampaignCharacter(importedCharacter, folder, { onProgress = null } = {}) {
  const characterId = normalizeNetherscrollsReferenceValue(importedCharacter?.id);
  if (!characterId) throw new Error("The Foundry Import character has no Netherscrolls character id.");
  const activeImport = netherscrollsCharacterImportLocks.get(characterId);
  if (activeImport) return activeImport;

  const importPromise = applyNetherscrollsCampaignCharacter(importedCharacter, folder, {
    onProgress,
  });
  netherscrollsCharacterImportLocks.set(characterId, importPromise);
  try {
    return await importPromise;
  } finally {
    if (netherscrollsCharacterImportLocks.get(characterId) === importPromise) {
      netherscrollsCharacterImportLocks.delete(characterId);
    }
  }
}

async function applyNetherscrollsCampaignCharacter(importedCharacter, folder, { onProgress = null } = {}) {
  const characterId = normalizeNetherscrollsReferenceValue(importedCharacter?.id);
  if (!importedCharacter?.foundryActor || typeof importedCharacter.foundryActor !== "object") {
    throw new Error("The Foundry Import character has no Foundry Actor payload.");
  }

  onProgress?.("preparing actor data...");
  const actorPayload = duplicateNetherscrollsData(importedCharacter.foundryActor);
  debugNetherscrollsCharacterImport("Preparing Foundry Actor payload.", {
    characterId,
    name: importedCharacter.name,
    sourceSize: actorPayload?.system?.traits?.size,
    hasPrototypeToken: Boolean(actorPayload?.prototypeToken),
  });
  normalizeNetherscrollsCharacterActorCreationData(actorPayload, importedCharacter.character);
  const itemSources = collectNetherscrollsCharacterItemSources(importedCharacter);
  const classSourceCount = itemSources.filter((entry) => entry.dataset === "classes").length;
  const classFeatureSourceCount = itemSources.filter((entry) => entry.dataset === "classFeatures").length;
  const effectSources = [
    ...(Array.isArray(actorPayload.effects) ? actorPayload.effects : []),
    ...buildNetherscrollsPortableActiveEffects(importedCharacter.character),
  ];
  delete actorPayload.items;
  delete actorPayload.effects;
  delete actorPayload._id;
  delete actorPayload.id;
  delete actorPayload.uuid;
  actorPayload.type = "character";
  actorPayload.folder = folder.id;
  actorPayload.name = toTrimmedStringOrNull(actorPayload.name) ?? importedCharacter.name;
  actorPayload.flags = actorPayload.flags ?? {};
  actorPayload.flags.netherscrolls = {
    ...(actorPayload.flags.netherscrolls ?? {}),
    characterId,
  };
  debugNetherscrollsCharacterImport("Prepared Actor payload for persistence.", {
    characterId,
    name: actorPayload.name,
    size: actorPayload.system?.traits?.size,
    hasPrototypeToken: Boolean(actorPayload.prototypeToken),
    itemSourceCount: itemSources.length,
    effectSourceCount: effectSources.length,
    classSourceCount,
    classFeatureSourceCount,
  });
  console.info(`${MODULE_ID} | Foundry Import | ${actorPayload.name}: ${classSourceCount} class/subclass source(s), ${classFeatureSourceCount} class feature source(s).`);

  onProgress?.("resolving items, spells, and features...");
  const content = await resolveNetherscrollsCharacterItemSources(itemSources, {
    onProgress: (completed, total) => onProgress?.(`looking up imported library content (${completed}/${total})...`),
  });
  debugNetherscrollsCharacterImport("Resolved character item sources.", {
    characterId,
    resolvedItemCount: content.items.length,
    fetched: content.fetched,
  });

  let actor = findNetherscrollsActorByCharacterId(characterId);
  const created = !actor;
  if (actor) {
    onProgress?.("updating existing Foundry actor...");
    debugNetherscrollsCharacterImport("Updating existing Foundry Actor.", { characterId, actorId: actor.id });
    delete actorPayload.type;
    await actor.update(actorPayload);
  } else {
    const ActorDocumentClass = globalThis.Actor?.implementation ?? globalThis.Actor;
    if (typeof ActorDocumentClass?.create !== "function") {
      throw new Error("Foundry Actor creation API is unavailable.");
    }
    onProgress?.("creating Foundry actor...");
    debugNetherscrollsCharacterImport("Creating Foundry Actor.", { characterId, name: actorPayload.name });
    actor = await ActorDocumentClass.create(actorPayload);
    debugNetherscrollsCharacterImport("Foundry Actor created.", { characterId, actorId: actor?.id });
  }
  onProgress?.("linking actor to Netherscrolls...");
  await setActorCharacterId(actor, characterId);

  onProgress?.(`adding or updating ${content.items.length} item${content.items.length === 1 ? "" : "s"}...`);
  const itemResult = await reconcileNetherscrollsCharacterActorItems(actor, content.items, characterId, {
    replaceAll: true,
  });
  debugNetherscrollsCharacterImport("Reconciled character items.", { characterId, itemResult });
  onProgress?.("linking background, race, and original class...");
  const documentLinks = await repairNetherscrollsCharacterActorDocumentLinks(
    actor,
    importedCharacter.character,
    itemResult.embeddedIds
  );
  debugNetherscrollsCharacterImport("Repaired Actor embedded-document links.", {
    characterId,
    documentLinks,
  });
  onProgress?.(`adding or updating ${effectSources.length} effect${effectSources.length === 1 ? "" : "s"}...`);
  const effectResult = await reconcileNetherscrollsCharacterActorEffects(actor, effectSources, characterId);
  debugNetherscrollsCharacterImport("Reconciled character effects.", { characterId, effectResult });
  let repairedFeatures = 0;
  try {
    onProgress?.("repairing class features...");
    const repair = await repairNetherscrollsActorClassFeatures(actor, { notify: false });
    repairedFeatures = repair.created ?? 0;
    console.info(`${MODULE_ID} | Foundry Import | ${actorPayload.name}: class feature repair result.`, repair);
    debugNetherscrollsCharacterImport("Repaired class features after import.", { characterId, repair });
  } catch (err) {
    debugNetherscrollsCharacterImport("Class-feature repair failed.", {
      characterId,
      error: err?.message ?? String(err),
      stack: err?.stack,
    });
    console.error(`${MODULE_ID} | Unable to repair imported class features.`, err);
    throw err;
  }

  onProgress?.("complete.");

  return {
    actor,
    created,
    fetched: content.fetched,
    items: itemResult,
    effects: effectResult,
    documentLinks,
    repairedFeatures,
  };
}

function normalizeNetherscrollsCharacterActorCreationData(actorPayload, character = null) {
  if (!actorPayload || typeof actorPayload !== "object") return;

  actorPayload.img = normalizeNetherscrollsPersistentImagePath(
    actorPayload.img,
    NETHERSCROLLS_DEFAULT_IMAGE
  );

  // D&D5e calculates a new character's prototype-token dimensions from its
  // trait size. Import payloads created with a display name (for example "Medium")
  // instead of a D&D5e size key cause that calculation to fail during Actor.create.
  actorPayload.system = actorPayload.system && typeof actorPayload.system === "object"
    ? actorPayload.system
    : {};
  actorPayload.system.traits = actorPayload.system.traits && typeof actorPayload.system.traits === "object"
    ? actorPayload.system.traits
    : {};

  // XP belongs to the character record. Prefer it over a retained Actor snapshot
  // so subsequent Foundry Imports keep the Actor's progression current.
  const characterXp = toNumberOrNull(character?.xp ?? character?.experience);
  if (characterXp != null) {
    actorPayload.system.details = actorPayload.system.details && typeof actorPayload.system.details === "object"
      ? actorPayload.system.details
      : {};
    actorPayload.system.details.xp = actorPayload.system.details.xp && typeof actorPayload.system.details.xp === "object"
      ? actorPayload.system.details.xp
      : {};
    actorPayload.system.details.xp.value = Math.max(0, Math.trunc(characterXp));
  }

  const sizes = globalThis.CONFIG?.DND5E?.actorSizes ?? {};
  const sizeValue = actorPayload.system.traits.size;
  const suppliedSize = toTrimmedStringOrNull(
    sizeValue && typeof sizeValue === "object" ? sizeValue.value : sizeValue
  )?.toLowerCase();
  const sizeAliases = {
    tiny: "tiny",
    small: "sm",
    medium: "med",
    large: "lg",
    huge: "huge",
    gargantuan: "grg",
  };
  const normalizedSize = sizeAliases[suppliedSize] ?? suppliedSize;
  actorPayload.system.traits.size = sizes[normalizedSize]
    ? normalizedSize
    : (sizes.med ? "med" : Object.keys(sizes)[0] ?? "med");
  debugNetherscrollsCharacterImport("Normalized D&D5e actor size.", {
    suppliedSize,
    normalizedSize: actorPayload.system.traits.size,
    availableSizeKeys: Object.keys(sizes),
  });

  // D&D5e derives `ac.value`; preserving an imported value requires a flat AC
  // calculation instead of assigning the derived field directly.
  actorPayload.system.attributes = actorPayload.system.attributes && typeof actorPayload.system.attributes === "object"
    ? actorPayload.system.attributes
    : {};

  logNetherscrollsCharacterImportStatAudit(actorPayload, character);

  // The API's `character` member is the authoritative current record. Its
  // ability scores can be newer than the persisted Foundry Actor snapshot,
  // so apply them before creating or updating the Actor.
  normalizeNetherscrollsCharacterAbilities(actorPayload, character);

  // Character Import responses keep skill training separately from the Foundry Actor
  // payload.  D&D5e expects training/expertise in `value` and a manual skill
  // modifier in `bonuses.check`; without this conversion every skill renders
  // as untrained after import.
  normalizeNetherscrollsCharacterSkills(actorPayload, character);

  // A Foundry character can otherwise be created with the correct maximum HP
  // but a zero current value. Character imports intentionally begin at full
  // health, including re-imports of an existing Actor.
  const actorHp = actorPayload.system.attributes.hp;
  const hpMaximum = getNetherscrollsCharacterHitPointMaximum(actorHp, character);
  if (hpMaximum > 0) {
    actorPayload.system.attributes.hp = {
      ...(actorHp && typeof actorHp === "object" ? actorHp : {}),
      value: hpMaximum,
      max: hpMaximum,
    };
  }
  debugNetherscrollsCharacterImport("Normalized D&D5e actor hit points.", {
    importedHp: actorHp,
    maximum: hpMaximum || null,
    importedAtFullHealth: hpMaximum > 0,
  });

  const actorAc = actorPayload.system.attributes.ac;
  const characterAc =
    character?.armorClass ??
    character?.armor_class ??
    character?.ac ??
    character?.attributes?.ac;
  const importedAc = characterAc ?? actorAc;
  const armorClass = characterAc != null
    ? getNetherscrollsCharacterArmorClassTotal(characterAc)
    : getNetherscrollsFoundryArmorClassTotal(actorAc);
  if (armorClass > 0) {
    const normalizedAc = actorAc && typeof actorAc === "object"
      ? { ...actorAc }
      : {};
    delete normalizedAc.value;
    delete normalizedAc.total;
    actorPayload.system.attributes.ac = {
      ...normalizedAc,
      flat: Math.trunc(armorClass),
      calc: "flat",
    };
  }
  console.info(`${MODULE_ID} | Foundry Import | ${actorPayload.name ?? "Character"}: armor class ${armorClass > 0 ? armorClass : "not supplied"}.`);
  debugNetherscrollsCharacterImport("Normalized D&D5e armor class.", {
    importedAc,
    armorClass: armorClass > 0 ? Math.trunc(armorClass) : null,
    acData: actorPayload.system.attributes.ac,
  });

  debugNetherscrollsCharacterImport("Normalized prototype token data.", {
    hasPrototypeToken: Boolean(actorPayload.prototypeToken),
  });
  delete actorPayload.token;
}

function logNetherscrollsCharacterImportStatAudit(actorPayload, character = null) {
  if (!character || typeof character !== "object") return;

  const characterAbilities = character.abilities && typeof character.abilities === "object"
    ? character.abilities
    : {};
  const characterSkills = character.skills && typeof character.skills === "object"
    ? character.skills
    : {};
  const snapshotSkills = actorPayload?.system?.skills && typeof actorPayload.system.skills === "object"
    ? actorPayload.system.skills
    : {};
  const chaScore = toNumberOrNull(characterAbilities.cha?.score ?? characterAbilities.cha);
  const chaAdjustments = [character.activeBonuses, character.activeEffects, character.effects]
    .filter(Array.isArray)
    .flat()
    .filter((entry) => entry?.active !== false && /^abilities\.cha(?:\.score)?$/i.test(toTrimmedStringOrNull(entry?.stat) ?? ""))
    .map((entry) => toTrimmedStringOrNull(entry?.bonus))
    .filter(Boolean);
  const skillBonuses = [];
  const missingSnapshotSkills = [];

  for (const [sourceKey, sourceSkill] of Object.entries(characterSkills)) {
    if (!sourceSkill || typeof sourceSkill !== "object") continue;
    const skillKey = getNetherscrollsFoundrySkillKey(sourceKey, sourceSkill);
    if (!skillKey) continue;
    const manualBonus = getNetherscrollsCharacterSkillManualBonus(sourceSkill);
    const name = SKILL_KEY_TO_NAME[skillKey] ?? sourceKey;
    if (manualBonus) skillBonuses.push(`${name} ${manualBonus >= 0 ? "+" : ""}${manualBonus}`);
    if (!Object.prototype.hasOwnProperty.call(snapshotSkills, skillKey)) missingSnapshotSkills.push(name);
  }

  console.info(
    `${MODULE_ID} | Foundry Import | ${actorPayload?.name ?? character.name ?? "Character"}: API stat audit — ` +
    `CHA base ${chaScore ?? "not supplied"}; active CHA adjustments ${chaAdjustments.length ? chaAdjustments.join(", ") : "none"}; ` +
    `skill bonuses ${skillBonuses.length ? skillBonuses.join(", ") : "none"}; ` +
    `missing from Foundry snapshot ${missingSnapshotSkills.length ? missingSnapshotSkills.join(", ") : "none"}.`
  );
}

function normalizeNetherscrollsCharacterAbilities(actorPayload, character = null) {
  const sourceAbilities = character?.abilities;
  if (!sourceAbilities || typeof sourceAbilities !== "object") return;

  const normalizedAbilities = actorPayload.system.abilities && typeof actorPayload.system.abilities === "object"
    ? { ...actorPayload.system.abilities }
    : {};
  const importedScores = {};

  for (const ability of ABILITY_KEYS) {
    const score = toNumberOrNull(sourceAbilities[ability]?.score ?? sourceAbilities[ability]);
    if (score == null) continue;

    normalizedAbilities[ability] = {
      ...(normalizedAbilities[ability] && typeof normalizedAbilities[ability] === "object"
        ? normalizedAbilities[ability]
        : {}),
      value: Math.trunc(score),
    };
    importedScores[ability] = Math.trunc(score);
  }

  actorPayload.system.abilities = normalizedAbilities;
  debugNetherscrollsCharacterImport("Normalized D&D5e actor ability scores.", {
    importedScores,
  });
}

function normalizeNetherscrollsCharacterSkills(actorPayload, character = null) {
  const sourceSkills = character?.skills;
  if (!sourceSkills || typeof sourceSkills !== "object") return;

  actorPayload.system = actorPayload.system && typeof actorPayload.system === "object"
    ? actorPayload.system
    : {};
  actorPayload.system.skills = actorPayload.system.skills && typeof actorPayload.system.skills === "object"
    ? actorPayload.system.skills
    : {};

  for (const [sourceKey, sourceSkill] of Object.entries(sourceSkills)) {
    if (!sourceSkill || typeof sourceSkill !== "object") continue;
    const skillKey = getNetherscrollsFoundrySkillKey(sourceKey, sourceSkill);
    if (!skillKey) continue;

    const existing = actorPayload.system.skills[skillKey];
    const skill = existing && typeof existing === "object" ? existing : {};
    const existingBonuses = skill.bonuses && typeof skill.bonuses === "object" ? skill.bonuses : {};
    const ability = normalizeNetherscrollsSaveAbility(sourceSkill.ability);
    const manualBonus = getNetherscrollsCharacterSkillManualBonus(sourceSkill);

    actorPayload.system.skills[skillKey] = {
      ...skill,
      ...(ability ? { ability } : {}),
      value: getNetherscrollsCharacterSkillProficiency(sourceSkill),
      bonuses: {
        ...existingBonuses,
        check: manualBonus ? String(manualBonus) : "",
      },
    };
  }
}

function getNetherscrollsFoundrySkillKey(sourceKey, sourceSkill = null) {
  const candidates = [sourceKey, sourceSkill?.key, sourceSkill?.id, sourceSkill?.name];
  for (const candidate of candidates) {
    const raw = toTrimmedStringOrNull(candidate)?.toLowerCase();
    if (!raw) continue;
    if (SKILL_KEY_TO_NAME[raw]) return raw;
    const normalized = raw.replace(/[^a-z]/g, "");
    if (NETHERSCROLLS_SKILL_LABELS[normalized]) return NETHERSCROLLS_SKILL_LABELS[normalized];
  }
  return null;
}

function getNetherscrollsCharacterSkillProficiency(sourceSkill) {
  if (sourceSkill?.expertise === true || sourceSkill?.isExpertise === true) return 2;
  const raw = sourceSkill?.prof ?? sourceSkill?.proficiency ?? sourceSkill?.value ?? 0;
  const normalized = toTrimmedStringOrNull(raw)?.toLowerCase();
  if (normalized === "expertise" || normalized === "double") return 2;
  if (normalized === "proficient" || normalized === "trained") return 1;
  if (normalized === "half" || normalized === "halfproficiency") return 0.5;
  return Math.max(0, Math.min(2, toNumber(raw, 0)));
}

function getNetherscrollsCharacterSkillManualBonus(sourceSkill) {
  return toNumber(sourceSkill?.misc, 0) +
    toNumber(sourceSkill?.bonus, 0) +
    toNumber(sourceSkill?.bonuses?.check, 0);
}

function getNetherscrollsCharacterArmorClassTotal(value) {
  if (!value || typeof value !== "object") return toNumber(value, 0);
  const explicitTotal = value.total ?? value.flat;
  if (explicitTotal != null) return toNumber(explicitTotal, 0);
  return (
    toNumber(value.value, 0) +
    toNumber(value.misc, 0) +
    toNumber(value.bonus, 0)
  );
}

function getNetherscrollsFoundryArmorClassTotal(value) {
  if (!value || typeof value !== "object") return toNumber(value, 0);
  return toNumber(value.flat ?? value.total ?? value.value, 0);
}

function getNetherscrollsCharacterHitPointMaximum(actorHp, character = null) {
  const characterHp =
    character?.hp ??
    character?.hitPoints ??
    character?.hitpoints ??
    character?.attributes?.hp ??
    null;
  const candidates = [
    actorHp?.max,
    actorHp?.maximum,
    characterHp?.max,
    characterHp?.maximum,
    characterHp?.total,
    actorHp?.value,
    typeof characterHp === "number" ? characterHp : null,
  ];
  for (const candidate of candidates) {
    const maximum = Math.max(0, Math.trunc(toNumber(candidate, 0)));
    if (maximum > 0) return maximum;
  }
  return 0;
}

function getWorldActors() {
  const actors = game?.actors;
  if (!actors) return [];
  if (Array.isArray(actors)) return actors;
  if (Array.isArray(actors.contents)) return actors.contents;
  if (typeof actors.values === "function") return Array.from(actors.values());
  if (typeof actors[Symbol.iterator] === "function") return Array.from(actors);
  return [];
}

function findNetherscrollsActorByCharacterId(characterId) {
  const id = normalizeNetherscrollsReferenceValue(characterId);
  if (!id) return null;
  return getWorldActors().find((actor) => String(getActorCharacterId(actor) ?? "") === id) ?? null;
}

function collectNetherscrollsCharacterItemSources(importedCharacter) {
  const sources = [];
  const add = (
    value,
    dataset = null,
    { allowRecordId = true, embed = null } = {}
  ) => {
    const rows = Array.isArray(value) ? value : value == null ? [] : [value];
    for (const row of rows) {
      const stringId = typeof row === "string"
        ? normalizeNetherscrollsReferenceValue(row)
        : null;
      if (typeof row === "string" && !stringId) continue;
      const source = typeof row === "string" ? { netherscrollsId: stringId } : row;
      if (!source || typeof source !== "object") continue;
      const resolvedDataset = getNetherscrollsCharacterItemDataset(source, dataset);
      sources.push({
        source,
        dataset: resolvedDataset,
        netherscrollsId: getNetherscrollsCharacterSourceId(source, { allowRecordId }),
        embed: embed ?? resolvedDataset !== "classFeatures",
      });
    }
  };
  const character = importedCharacter?.character ?? {};
  const addSubclassWithFeatures = (value) => {
    const subclasses = Array.isArray(value) ? value : value == null ? [] : [value];
    for (const subclassSource of subclasses) {
      if (!subclassSource || typeof subclassSource !== "object") continue;
      add(subclassSource, "subclasses");
      add(subclassSource.subclassFeatures, "classFeatures", { embed: false });
      add(subclassSource.features, "classFeatures", { embed: false });
    }
  };
  const addClassWithNestedContent = (value) => {
    const classes = Array.isArray(value) ? value : value == null ? [] : [value];
    for (const classSource of classes) {
      if (!classSource || typeof classSource !== "object") continue;
      add(classSource, "classes");
      add(classSource.classFeatures, "classFeatures", { embed: false });
      add(classSource.features, "classFeatures", { embed: false });
      const subclasses = [
        ...(Array.isArray(classSource.subclasses) ? classSource.subclasses : []),
        ...(classSource.subclass ? [classSource.subclass] : []),
      ];
      addSubclassWithFeatures(subclasses);
    }
  };
  add(character.items, "items");
  add(character.spells, "spells");
  add(character.feats, "feats");
  addClassWithNestedContent(character.classes);
  addClassWithNestedContent(character.class);
  addSubclassWithFeatures(character.subclasses);
  addSubclassWithFeatures(character.subclass);
  add(character.classFeatures, "classFeatures", { embed: false });
  add(getNetherscrollsCharacterBackgroundId(character), "backgrounds");
  add(character.raceId, "races");

  const deduplicated = [];
  const byKey = new Map();
  for (const descriptor of sources) {
    const { source, dataset, netherscrollsId } = descriptor;
    const id = netherscrollsId;
    const type = toTrimmedStringOrNull(
      getNetherscrollsFoundryItemPayload(source)?.type ?? source?.type
    );
    const name = toTrimmedStringOrNull(
      getNetherscrollsFoundryItemPayload(source)?.name ?? source?.name
    );
    const key = id
      ? `id:${id}`.toLowerCase()
      : `${dataset ?? ""}:${type ?? ""}:${name ?? ""}`.toLowerCase();
    const existingIndex = byKey.get(key);
    if (existingIndex == null) {
      byKey.set(key, deduplicated.length);
      deduplicated.push(descriptor);
      continue;
    }

    const existing = deduplicated[existingIndex];
    existing.source = mergeNetherscrollsDefaults(existing.source, source);
    existing.embed = existing.embed && descriptor.embed;
  }
  return deduplicated;
}

function getNetherscrollsCharacterItemDataset(source, fallback = null) {
  const explicit = toTrimmedStringOrNull(source?.dataset ?? source?.dataSet ?? source?.collection)?.toLowerCase();
  if (explicit) {
    const normalized = explicit.replace(/[^a-z]/g, "");
    if (normalized === "classfeatures") return "classFeatures";
    if (["classes", "subclasses", "items", "feats", "spells", "backgrounds", "races"].includes(normalized)) return normalized;
  }
  if (fallback) return fallback;
  const type = toTrimmedStringOrNull(
    getNetherscrollsFoundryItemPayload(source)?.type ?? source?.type
  )?.toLowerCase();
  if (type === "spell") return "spells";
  if (type === "feat") {
    const flags = getNetherscrollsFoundryItemPayload(source)?.flags ?? source?.flags ?? {};
    if (
      flags?.[MODULE_ID]?.featureScope ||
      flags?.[MODULE_ID]?.parentClassNetherscrollsId ||
      flags?.[MODULE_ID]?.parentClassIdentifier
    ) {
      return "classFeatures";
    }
    return "feats";
  }
  if (type === "class") return "classes";
  if (type === "subclass") return "subclasses";
  if (type === "background") return "backgrounds";
  if (type === "race") return "races";
  return "items";
}

async function resolveNetherscrollsCharacterItemSources(sources, { onProgress = null } = {}) {
  const items = [];
  const fetched = await importMissingNetherscrollsCharacterDocuments(sources);
  // Resolve non-embedded class-feature references first. A targeted feature
  // import can refresh its parent class/subclass feature UUIDs before those
  // class documents are copied into the Actor.
  const orderedSources = [
    ...sources.filter((descriptor) => descriptor.dataset === "classFeatures"),
    ...sources.filter((descriptor) => descriptor.dataset !== "classFeatures"),
  ];
  for (const [index, descriptor] of orderedSources.entries()) {
    onProgress?.(index + 1, sources.length);
    const resolved = await resolveNetherscrollsCharacterItemSource(
      descriptor.source,
      descriptor.dataset,
      {
        netherscrollsId: descriptor.netherscrollsId,
        required: descriptor.embed !== false,
      }
    );
    if (resolved?.item && descriptor.embed !== false) items.push(resolved.item);
  }
  return { items, fetched };
}

async function resolveNetherscrollsCharacterItemSource(
  source,
  fallbackDataset = null,
  { netherscrollsId: suppliedNetherscrollsId = null, required = true } = {}
) {
  const dataset = getNetherscrollsCharacterItemDataset(source, fallbackDataset);
  const netherscrollsId =
    normalizeNetherscrollsReferenceValue(suppliedNetherscrollsId) ??
    getNetherscrollsCharacterSourceId(source);
  const direct = getNetherscrollsFoundryItemPayload(source) ?? source;
  if (!netherscrollsId) {
    const message = `Character ${dataset} content is missing its Netherscrolls id and cannot be recreated from the library.`;
    if (required) throw new Error(message);
    console.warn(`${MODULE_ID} | ${message}`);
    return { item: null };
  }
  const document = await findNetherscrollsCompendiumDocumentById(dataset, netherscrollsId);
  debugNetherscrollsCharacterImport(
    document ? "Matched character content to an imported compendium document." : "No imported compendium document matched character content after targeted fetch.",
    { dataset, netherscrollsId, documentId: document?.id ?? null, documentName: document?.name ?? null }
  );
  if (!document) {
    const message = `Could not resolve required Netherscrolls ${dataset} ${netherscrollsId} through Foundry Import selection.`;
    if (required) throw new Error(message);
    console.warn(`${MODULE_ID} | ${message}`);
    return { item: null };
  }
  const item = prepareNetherscrollsCharacterActorItemData(
    document,
    direct,
    source,
    netherscrollsId,
    dataset
  );
  return { item };
}

async function importMissingNetherscrollsCharacterDocuments(sources) {
  const supportedDatasets = new Set([
    "items",
    "feats",
    "spells",
    "classes",
    "subclasses",
    "backgrounds",
    "races",
  ]);
  const refresh = [];
  for (const descriptor of sources) {
    const dataset = descriptor?.dataset;
    const id = normalizeNetherscrollsReferenceValue(descriptor?.netherscrollsId);
    if (!id || !supportedDatasets.has(dataset)) continue;
    // Character imports must not embed an old local compendium version. Refresh
    // every linked record from the API, even when its Netherscrolls id already
    // exists in Foundry, so imported effects and configuration are authoritative.
    refresh.push({ dataset, id });
  }
  if (!refresh.length) return 0;

  const unique = Array.from(
    new Map(refresh.map((entry) => [`${entry.dataset}:${entry.id}`, entry])).values()
  );
  let importedCount = 0;
  for (let offset = 0; offset < unique.length; offset += 100) {
    const chunk = unique.slice(offset, offset + 100);
    const selection = {};
    for (const { dataset, id } of chunk) {
      selection[dataset] ??= [];
      selection[dataset].push(id);
    }
    const response = await requestNetherscrollsJson(NETHERSCROLLS_IMPORT_SELECTION_ENDPOINT, {
      method: "POST",
      apiKey: getNetherscrollsApiKey(),
      body: selection,
      operation: "Foundry Import selection",
    });
    // The API response is authoritative for character import. Delete the local
    // canonical records first so Foundry cannot preserve old nested ActiveEffect
    // documents while updating the outer Item.
    await clearNetherscrollsCharacterLibraryDocuments(chunk);
    await applyNetherscrollsImportResponse(response, null, Object.keys(selection));
    importedCount += Object.values(response?.data ?? {})
      .filter(Array.isArray)
      .reduce((count, rows) => count + rows.length, 0);
  }
  return importedCount;
}

async function clearNetherscrollsCharacterLibraryDocuments(entries) {
  const idsByDataset = new Map();
  for (const entry of entries) {
    const dataset = toTrimmedStringOrNull(entry?.dataset);
    const id = normalizeNetherscrollsReferenceValue(entry?.id);
    if (!dataset || !id) continue;
    const ids = idsByDataset.get(dataset) ?? new Set();
    ids.add(id);
    idsByDataset.set(dataset, ids);
  }

  const ItemClass = Item?.implementation ?? Item;
  if (typeof ItemClass?.deleteDocuments !== "function") return;
  for (const [dataset, netherscrollsIds] of idsByDataset) {
    const pack = await getNetherscrollsImportPack(dataset);
    if (!pack) continue;
    const documentsById = await getNetherscrollsCompendiumDocumentsById(pack);
    const documentIds = Array.from(netherscrollsIds)
      .map((id) => documentsById.get(String(id))?.id)
      .filter(Boolean);
    if (documentIds.length) {
      await ItemClass.deleteDocuments(documentIds, { pack: pack.collection });
    }
    invalidateNetherscrollsCompendiumDocumentIdCache(dataset);
  }
}

function isStaleNetherscrollsCharacterLibraryDocument(document, dataset) {
  const expectedType = {
    backgrounds: "background",
    races: "race",
    classes: "class",
    subclasses: "subclass",
    spells: "spell",
    feats: "feat",
  }[dataset];
  if (expectedType && toTrimmedStringOrNull(document?.type) !== expectedType) return true;
  const img = toTrimmedStringOrNull(document?.img);
  return isNetherscrollsUnresolvedImageKey(img) || img === NETHERSCROLLS_IMPORT_IMAGE;
}

function getNetherscrollsCharacterSourceId(
  source,
  { allowRecordId = false } = {}
) {
  const foundryItem = getNetherscrollsFoundryItemPayload(source);
  const explicitId = normalizeNetherscrollsReferenceValue(
    source?.netherscrollsId ??
      source?.flags?.netherscrolls?.id ??
      foundryItem?.flags?.netherscrolls?.id
  );
  if (explicitId || !allowRecordId) return explicitId;

  return normalizeNetherscrollsReferenceValue(
    source?.classId ??
      source?.subclassId ??
      source?.itemId ??
      source?.spellId ??
      source?.featId ??
      source?.backgroundId ??
      source?.raceId ??
      source?._id ??
      source?.id
  );
}

async function findNetherscrollsCompendiumDocumentById(dataset, netherscrollsId) {
  const pack = await getNetherscrollsImportPack(dataset);
  if (!pack) {
    debugNetherscrollsCharacterImport("No compendium pack is available for character content lookup.", {
      dataset,
      netherscrollsId,
    });
    return null;
  }
  const documentsById = await getNetherscrollsCompendiumDocumentsById(pack);
  const document = documentsById.get(String(netherscrollsId)) ?? null;
  debugNetherscrollsCharacterImport("Looked up imported compendium content by Netherscrolls flag.", {
    dataset,
    netherscrollsId,
    pack: pack.collection,
    documentCount: documentsById.size,
    matched: Boolean(document),
  });
  return document;
}

function prepareNetherscrollsCharacterActorItemData(
  document,
  direct,
  source,
  netherscrollsId,
  dataset = null
) {
  const fromCompendium = document ? duplicateNetherscrollsDocumentData(document) : {};
  const sourceData = duplicateNetherscrollsData(direct ?? {});
  // A local library match is canonical. Only copy mutable Actor-owned state
  // from the character payload; names, descriptions, advancement, activities,
  // feature links, and other configuration remain from the compendium.
  const data = document ? fromCompendium : sourceData;
  if (document) applyNetherscrollsCharacterItemState(data, sourceData);
  delete data._id;
  delete data.id;
  delete data.uuid;
  delete data.folder;
  delete data.ownership;
  delete data.parent;
  data.name = toTrimmedStringOrNull(data.name) ?? "Netherscrolls Item";
  data.type = toTrimmedStringOrNull(data.type) ?? "loot";
  const requiredType = {
    backgrounds: "background",
    races: "race",
    classes: "class",
    subclasses: "subclass",
    spells: "spell",
    feats: "feat",
  }[dataset];
  if (requiredType) data.type = requiredType;
  data.img = normalizeNetherscrollsImportImagePath(data.img);
  if (data.type === "spell") {
    data.system = data.system && typeof data.system === "object" ? data.system : {};
    data.system.level = getNetherscrollsSpellLevel(data);
    // Library records intentionally share a neutral sort value. Actor spells
    // need a level-based value so D&D5e builds spellbook sections in level
    // order instead of the arbitrary order of the character reference array.
    data.sort = getNetherscrollsCharacterSpellSort(data.system.level);
    data.system.method = normalizeNetherscrollsSpellMethod(sourceData, data);
    data.system.prepared = getNetherscrollsSpellPreparedState(sourceData, data);
    // `sourceItem` is an Actor-owned association. Never retain an inferred
    // library class link such as `class:cleric`; allow D&D5e to associate a
    // newly embedded spell with the Actor's actual spellcasting class.
    data.system.sourceItem =
      toTrimmedStringOrNull(sourceData?.system?.sourceItem ?? sourceData?.sourceItem) ?? "";
    delete data.system.preparation;
  }
  if (data.type === "class") {
    const classLevel = toNumber(
      source?.level ??
      source?.levels ??
      source?.characterLevel ??
      direct?.level ??
      direct?.levels ??
      direct?.characterLevel ??
      source?.system?.levels ??
      source?.system?.level ??
      direct?.system?.levels ??
      direct?.system?.level ??
      data?.system?.levels,
      1
    );
    data.system = data.system && typeof data.system === "object" ? data.system : {};
    data.system.levels = Math.max(1, Math.trunc(classLevel));
    data.system.hd = data.system.hd && typeof data.system.hd === "object" ? data.system.hd : {};
    data.system.hd.denomination = normalizeNetherscrollsClassHitDie({
      ...source,
      ...direct,
      system: {
        ...(source?.system ?? {}),
        ...(direct?.system ?? {}),
        hd: data.system.hd,
      },
    });
    // Character imports start with every class hit die available, matching the
    // full-HP import policy. D&D5e derives the visible current/max totals from
    // this die denomination, class levels, and spent count.
    data.system.hd.spent = 0;
  }
  data.flags = data.flags ?? {};
  data.flags.netherscrolls = {
    ...(data.flags.netherscrolls ?? {}),
    ...(netherscrollsId ? { id: netherscrollsId } : {}),
  };
  if (data.type === "subclass") {
    const classId = getNetherscrollsSubclassClassId(source, direct, data);
    if (classId) data.flags.netherscrolls.classId = classId;
  }
  data.flags[MODULE_ID] = {
    ...(data.flags[MODULE_ID] ?? {}),
  };
  if (source?.lastRev) data.flags[MODULE_ID].lastRev = source.lastRev;
  return data;
}

function getNetherscrollsSubclassClassId(...sources) {
  for (const source of sources) {
    const classId = normalizeNetherscrollsReferenceValue(
      source?.flags?.netherscrolls?.classId ??
      source?.classId ??
      source?.parentClassId ??
      source?.parentClassNetherscrollsId ??
      source?.flags?.[MODULE_ID]?.parentClassNetherscrollsId
    );
    if (classId) return classId;
  }
  return null;
}

function getNetherscrollsCharacterSpellSort(level) {
  return Math.max(0, Math.trunc(toNumber(level, 0))) * 100000;
}

function applyNetherscrollsCharacterItemState(target, source) {
  if (!target || !source || typeof target !== "object" || typeof source !== "object") return;
  if (Number.isFinite(Number(source.sort))) target.sort = Number(source.sort);

  const mutableSystemPaths = [
    ["quantity"],
    ["equipped"],
    ["attuned"],
    ["attunement"],
    ["identified"],
    ["proficient"],
    ["favorite"],
    ["container"],
    ["uses", "value"],
    ["uses", "spent"],
    ["uses", "autoDestroy"],
    ["prepared"],
    ["preparation", "prepared"],
  ];
  for (const path of mutableSystemPaths) {
    copyNetherscrollsCharacterItemStatePath(target.system, source.system, path);
  }
}

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
    .map((effect) => effect?.toObject?.() ?? effect)
    .filter((effect) => effect && typeof effect === "object");
}

function getNetherscrollsEmbeddedEffectSignatures(value) {
  return getNetherscrollsEmbeddedEffectSources(value)
    .map((effect) => JSON.stringify({
      name: toTrimmedStringOrNull(effect.name) ?? "",
      disabled: Boolean(effect.disabled),
      transfer: Boolean(effect.transfer),
      changes: (Array.isArray(effect.changes) ? effect.changes : []).map((change) => ({
        key: toTrimmedStringOrNull(change?.key) ?? "",
        mode: change?.mode ?? null,
        value: String(change?.value ?? ""),
      })),
    }))
    .sort();
}

function haveSameNetherscrollsEmbeddedEffects(left, right) {
  const leftSignatures = getNetherscrollsEmbeddedEffectSignatures(left);
  const rightSignatures = getNetherscrollsEmbeddedEffectSignatures(right);
  return leftSignatures.length === rightSignatures.length &&
    leftSignatures.every((signature, index) => signature === rightSignatures[index]);
}

function copyNetherscrollsCharacterItemStatePath(target, source, path) {
  if (!target || !source || !Array.isArray(path) || !path.length) return;
  let sourceCursor = source;
  for (const key of path) {
    if (!sourceCursor || typeof sourceCursor !== "object" || !(key in sourceCursor)) return;
    sourceCursor = sourceCursor[key];
  }
  if (sourceCursor === undefined) return;

  let targetCursor = target;
  for (const key of path.slice(0, -1)) {
    targetCursor[key] = targetCursor[key] && typeof targetCursor[key] === "object"
      ? targetCursor[key]
      : {};
    targetCursor = targetCursor[key];
  }
  targetCursor[path[path.length - 1]] = duplicateNetherscrollsData(sourceCursor);
}

async function reconcileNetherscrollsCharacterActorItems(
  actor,
  itemData,
  characterId,
  { replaceLinked = false, replaceAll = false } = {}
) {
  const existingById = new Map();
  const duplicateExistingIds = [];
  const shouldReplaceExisting = replaceLinked || replaceAll;
  const existingItems = replaceAll
    ? getNetherscrollsActorItems(actor)
    : replaceLinked
    ? getNetherscrollsActorItems(actor).filter((item) => getItemNetherId(item))
    : [];
  const existingItemIds = new Set(
    existingItems.map((item) => String(item.id ?? item._id ?? "")).filter(Boolean)
  );
  const raceEffectNames = new Set(
    (Array.isArray(itemData) ? itemData : [])
      .filter((item) => item?.type === "race" || item?.type === "species")
      .map((item) => toTrimmedStringOrNull(item?.name))
      .filter(Boolean)
      .map((name) => `Race: ${name}`)
  );
  const staleEffectIds = shouldReplaceExisting
    ? getNetherscrollsActorEffects(actor)
      .filter((effect) => replaceAll || isNetherscrollsStaleCharacterEffect(
          effect,
          existingItemIds,
          raceEffectNames,
          characterId
        ))
      .map((effect) => effect.id ?? effect._id)
      .filter(Boolean)
    : [];

  if (staleEffectIds.length && actor?.deleteEmbeddedDocuments) {
    await actor.deleteEmbeddedDocuments("ActiveEffect", staleEffectIds);
  }
  if (existingItemIds.size && actor?.deleteEmbeddedDocuments) {
    await actor.deleteEmbeddedDocuments("Item", Array.from(existingItemIds));
  }

  for (const item of getNetherscrollsActorItems(actor)) {
    const id = getItemNetherId(item);
    if (!id) continue;
    if (shouldReplaceExisting) continue;
    const key = String(id);
    const existing = existingById.get(key);
    if (!existing) {
      existingById.set(key, item);
      continue;
    }
    const existingImported = isNetherscrollsImportedCharacterDocument(
      existing,
      "importedCharacterItem",
      characterId
    );
    const itemImported = isNetherscrollsImportedCharacterDocument(
      item,
      "importedCharacterItem",
      characterId
    );
    // A Netherscrolls id identifies one canonical embedded Item. Older module
    // versions may have created unmarked duplicates, whose transferred effects
    // would otherwise stack every time the character is re-imported.
    if (!existingImported && itemImported) {
      if (existing?.id) duplicateExistingIds.push(existing.id);
      existingById.set(key, item);
    } else if (item?.id) {
      duplicateExistingIds.push(item.id);
    }
  }

  const uniqueItemData = [];
  const pendingById = new Map();
  for (const data of itemData) {
    const id = getNetherscrollsSourceId(data);
    if (!id) {
      uniqueItemData.push(data);
      continue;
    }
    const key = String(id);
    if (pendingById.has(key)) {
      uniqueItemData[pendingById.get(key)] = data;
    } else {
      pendingById.set(key, uniqueItemData.length);
      uniqueItemData.push(data);
    }
  }

  const creates = [];
  const updates = [];
  const replacedWrongTypeIds = [];
  const replacedEffectIds = [];
  for (const data of uniqueItemData) {
    const netherscrollsId = getNetherscrollsSourceId(data);
    data.flags = data.flags ?? {};
    data.flags[MODULE_ID] = {
      ...(data.flags[MODULE_ID] ?? {}),
      characterId,
      importedCharacterItem: true,
    };
    const existing = netherscrollsId ? existingById.get(String(netherscrollsId)) : null;
    if (existing?.id) {
      const effectsDiffer = !haveSameNetherscrollsEmbeddedEffects(existing, data);
      const typeMismatch = Boolean(
        toTrimmedStringOrNull(existing.type) &&
        toTrimmedStringOrNull(data.type) &&
        existing.type !== data.type
      );
      if (typeMismatch || effectsDiffer) {
        (typeMismatch ? replacedWrongTypeIds : replacedEffectIds).push(existing.id);
        creates.push(data);
      } else {
        const update = { ...data, _id: existing.id };
        // Foundry treats embedded effects as separate documents. Leaving an
        // unchanged effect array out of the Item update prevents it from
        // appending another copy on each character import.
        delete update.effects;
        updates.push(update);
      }
    } else {
      creates.push(data);
    }
  }
  const deleteIds = Array.from(new Set([
    ...duplicateExistingIds,
    ...replacedWrongTypeIds,
    ...replacedEffectIds,
  ]));
  if (deleteIds.length && actor?.deleteEmbeddedDocuments) {
    await actor.deleteEmbeddedDocuments("Item", deleteIds);
  }
  if (updates.length) await actor.updateEmbeddedDocuments("Item", updates);
  const createdDocuments = creates.length
    ? await actor.createEmbeddedDocuments("Item", creates, { renderSheet: false })
    : [];
  const embeddedIds = {};
  for (const update of updates) {
    const id = getNetherscrollsSourceId(update);
    if (id && update._id) embeddedIds[String(id)] = update._id;
  }
  for (const [index, data] of creates.entries()) {
    const id = getNetherscrollsSourceId(data);
    const embeddedId = createdDocuments?.[index]?.id ?? createdDocuments?.[index]?._id;
    if (id && embeddedId) embeddedIds[String(id)] = embeddedId;
  }
  return {
    created: creates.length,
    updated: updates.length,
    deletedDuplicates: duplicateExistingIds.length,
    replacedWrongType: replacedWrongTypeIds.length,
    replacedEffects: replacedEffectIds.length,
    deletedLinked: existingItemIds.size,
    deletedEffects: staleEffectIds.length,
    embeddedIds,
  };
}

function getNetherscrollsActorEffects(actor) {
  const effects = actor?.effects;
  if (Array.isArray(effects)) return effects;
  if (Array.isArray(effects?.contents)) return effects.contents;
  if (effects?.values) return Array.from(effects.values());
  if (effects?.[Symbol.iterator]) return Array.from(effects);
  return [];
}

function isNetherscrollsStaleCharacterEffect(effect, linkedItemIds, raceEffectNames, characterId) {
  if (isNetherscrollsImportedCharacterDocument(effect, "importedCharacterEffect", characterId)) return true;
  if (raceEffectNames.has(toTrimmedStringOrNull(effect?.name))) return true;
  const origin = toTrimmedStringOrNull(effect?.origin ?? effect?._source?.origin) ?? "";
  const match = /(?:^|\.)Item\.([A-Za-z0-9_-]+)/.exec(origin);
  return Boolean(match?.[1] && linkedItemIds.has(match[1]));
}

async function repairNetherscrollsCharacterActorDocumentLinks(
  actor,
  character = null,
  embeddedIds = {}
) {
  if (!actor?.update) return {};
  const references = [
    {
      path: "system.details.background",
      label: "background",
      types: new Set(["background"]),
      netherscrollsId: getNetherscrollsCharacterBackgroundId(character),
    },
    {
      path: "system.details.race",
      label: "race",
      types: new Set(["race", "species"]),
      netherscrollsId: normalizeNetherscrollsReferenceValue(
        character?.raceId ??
        character?.speciesId ??
        character?.race?.raceId ??
        character?.race?.id ??
        character?.species?.speciesId ??
        character?.species?.id
      ),
    },
    {
      path: "system.details.originalClass",
      label: "original class",
      types: new Set(["class"]),
      netherscrollsId: getNetherscrollsCharacterOriginalClassId(character),
    },
  ];
  const items = getNetherscrollsActorItems(actor);
  const updates = {};
  const repaired = {};

  for (const reference of references) {
    if (!reference.netherscrollsId) continue;
    const reconciledId = normalizeNetherscrollsReferenceValue(
      embeddedIds?.[reference.netherscrollsId]
    );
    const item = reconciledId
      ? items.find((candidate) => candidate?.id === reconciledId)
      : items.find((candidate) => (
          reference.types.has(candidate?.type) &&
          String(getItemNetherId(candidate) ?? "") === reference.netherscrollsId
        ));
    const itemId = reconciledId ?? normalizeNetherscrollsReferenceValue(item?.id);
    if (!itemId || (item && !reference.types.has(item.type))) {
      throw new Error(
        `Could not link the imported ${reference.label} ` +
        `(${reference.netherscrollsId}) to an embedded Foundry Item.`
      );
    }
    updates[reference.path] = itemId;
    repaired[reference.path] = itemId;
  }

  if (Object.keys(updates).length) await actor.update(updates);
  return repaired;
}

function getNetherscrollsCharacterBackgroundId(character) {
  return normalizeNetherscrollsReferenceValue(
    character?.backgroundId ??
    character?.background?.backgroundId ??
    character?.background?._id ??
    character?.background?.id ??
    character?.backgrounds?.backgroundId ??
    character?.backgrounds?._id ??
    character?.backgrounds?.id ??
    character?.background
  );
}

function getNetherscrollsCharacterOriginalClassId(character) {
  const direct = normalizeNetherscrollsReferenceValue(
    character?.originalClassId ??
    character?.classId ??
    character?.originalClass?.classId ??
    character?.originalClass?.id ??
    character?.class?.classId ??
    character?.class?.id
  );
  if (direct) return direct;
  const classes = Array.isArray(character?.classes) ? character.classes : [];
  for (const entry of classes) {
    const id = normalizeNetherscrollsReferenceValue(entry?.classId ?? entry?.id);
    if (id) return id;
  }
  return null;
}

async function reconcileNetherscrollsCharacterActorEffects(actor, effectSources, characterId) {
  if (!Array.isArray(effectSources) || !effectSources.length) return { created: 0, updated: 0 };
  const existingByKey = new Map();
  const duplicateExistingIds = [];
  for (const effect of Array.from(actor?.effects ?? [])) {
    const key = effect?.getFlag?.(MODULE_ID, "effectKey") ?? effect?.flags?.[MODULE_ID]?.effectKey;
    if (!key) continue;
    const normalizedKey = String(key);
    const existing = existingByKey.get(normalizedKey);
    if (!existing) {
      existingByKey.set(normalizedKey, effect);
      continue;
    }
    const existingImported = isNetherscrollsImportedCharacterDocument(
      existing,
      "importedCharacterEffect",
      characterId
    );
    const effectImported = isNetherscrollsImportedCharacterDocument(
      effect,
      "importedCharacterEffect",
      characterId
    );
    if (existingImported && effectImported && effect?.id) {
      duplicateExistingIds.push(effect.id);
    } else if (!existingImported && effectImported) {
      existingByKey.set(normalizedKey, effect);
    }
  }

  const creates = [];
  const updates = [];
  const pendingByKey = new Map();
  for (const source of effectSources) {
    const data = duplicateNetherscrollsData(source);
    delete data._id;
    delete data.id;
    delete data.parent;
    const key = toTrimmedStringOrNull(
      source?.flags?.[MODULE_ID]?.effectKey ??
      source?.netherscrollsId ??
      source?.id ??
      source?.origin ??
      source?.name
    ) ?? buildNetherscrollsStableId(JSON.stringify(source));
    data.flags = data.flags ?? {};
    data.flags[MODULE_ID] = {
      ...(data.flags[MODULE_ID] ?? {}),
      characterId,
      effectKey: key,
      importedCharacterEffect: true,
    };
    const existing = existingByKey.get(key);
    const prepared = existing?.id
      ? { mode: "update", data: { ...data, _id: existing.id } }
      : { mode: "create", data };
    if (pendingByKey.has(key)) {
      const pending = pendingByKey.get(key);
      pending.data = prepared.data;
      pending.mode = prepared.mode;
    } else {
      pendingByKey.set(key, prepared);
    }
  }
  for (const pending of pendingByKey.values()) {
    if (pending.mode === "update") updates.push(pending.data);
    else creates.push(pending.data);
  }
  if (duplicateExistingIds.length && actor?.deleteEmbeddedDocuments) {
    await actor.deleteEmbeddedDocuments("ActiveEffect", duplicateExistingIds);
  }
  if (updates.length) await actor.updateEmbeddedDocuments("ActiveEffect", updates);
  if (creates.length) await actor.createEmbeddedDocuments("ActiveEffect", creates, { renderSheet: false });
  return {
    created: creates.length,
    updated: updates.length,
    deletedDuplicates: duplicateExistingIds.length,
  };
}

function isNetherscrollsImportedCharacterDocument(document, markerFlag, characterId) {
  const flags = document?.flags?.[MODULE_ID] ?? {};
  const marker = document?.getFlag?.(MODULE_ID, markerFlag) ?? flags[markerFlag];
  const linkedCharacterId =
    document?.getFlag?.(MODULE_ID, "characterId") ??
    flags.characterId;
  return Boolean(
    marker &&
    (!characterId || String(linkedCharacterId ?? "") === String(characterId))
  );
}

Hooks.once("ready", async () => {
  refreshNetherscrollsHardVisionTab();
  syncNetherscrollsSceneVisionRestrictions();
  await disableLegacyNetherscrollsImportQueuePolling();
  installNetherscrollsSpellbookSectionOrdering();
  toggleRerollInitHook(game.settings.get(MODULE_ID, SETTINGS.rerollInit) === true);
  toggleNpcDeathSaveHook(game.settings.get(MODULE_ID, SETTINGS.npcDeathSave) === true);
  initEnhanceDialogInputHandlers();
  initChatNumberActionHandlers();
  placeExistingNetherscrollsImportPacksInSidebarFolder();
  toggleNetherscrollsImportQueuePolling(
    game.settings.get(MODULE_ID, SETTINGS.importQueuePolling) === true
  );
});

Hooks.on("canvasReady", () => syncNetherscrollsSceneVisionRestrictions());
Hooks.on("updateScene", (scene, changes) => {
  if (scene.id !== canvas?.scene?.id || !changes?.flags?.[MODULE_ID]) return;
  syncNetherscrollsSceneVisionRestrictions(scene);
});
Hooks.on("canvasTearDown", () => hardVisionController.stop());
Hooks.on("renderApplicationV1", (app, html) => {
  injectFoundryExportButtonV1(app, html);
});

Hooks.on("renderApplicationV2", (app, element) => {
  injectFoundryExportButtonV2(app, element);
});

Hooks.on("renderActorSheet", (app, html) => {
  injectFoundryExportButtonV1(app, html);
});

Hooks.on("renderActorSheetV2", (app, html) => {
  injectFoundryExportButtonV2(app, html);
});

Hooks.on("createItem", (item) => {
  queueNetherscrollsClassFeatureRepairForItem(item, { delay: 100 });
});

Hooks.on("updateItem", (item, changes) => {
  if (!isNetherscrollsClassRepairUpdate(changes)) return;
  queueNetherscrollsClassFeatureRepairForItem(item, { delay: 100 });
});

Hooks.on("updateUser", () => {
  toggleNetherscrollsImportQueuePolling(
    game?.settings?.get(MODULE_ID, SETTINGS.importQueuePolling) === true
  );
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
const netherscrollsSpellbookPatchedClasses = new WeakSet();
let netherscrollsImportQueuePollTimer = null;
let netherscrollsImportQueuePollRunning = false;

function installNetherscrollsSpellbookSectionOrdering() {
  const characterSheets = globalThis.CONFIG?.Actor?.sheetClasses?.character ?? {};
  for (const registration of Object.values(characterSheets)) {
    const SheetClass = registration?.cls;
    const prototype = SheetClass?.prototype;
    if (
      typeof SheetClass !== "function" ||
      typeof prototype?._prepareSpellbook !== "function" ||
      netherscrollsSpellbookPatchedClasses.has(SheetClass)
    ) {
      continue;
    }

    const prepareSpellbook = prototype._prepareSpellbook;
    Object.defineProperty(prototype, "_prepareSpellbook", {
      configurable: true,
      writable: true,
      value: function prepareOrderedNetherscrollsSpellbook(...args) {
        return sortNetherscrollsSpellbookSections(prepareSpellbook.apply(this, args));
      },
    });
    netherscrollsSpellbookPatchedClasses.add(SheetClass);
  }
}

function sortNetherscrollsSpellbookSections(spellbook) {
  if (!spellbook || typeof spellbook !== "object" || Array.isArray(spellbook)) return spellbook;
  return Object.fromEntries(
    Object.entries(spellbook).sort(([leftKey, left], [rightKey, right]) => {
      const orderDifference =
        toNumber(left?.order, 1000) - toNumber(right?.order, 1000);
      if (orderDifference) return orderDifference;

      const levelDifference =
        getNetherscrollsSpellbookSectionLevel(leftKey, left) -
        getNetherscrollsSpellbookSectionLevel(rightKey, right);
      if (levelDifference) return levelDifference;

      return String(left?.label ?? leftKey).localeCompare(
        String(right?.label ?? rightKey),
        game?.i18n?.lang
      );
    })
  );
}

function getNetherscrollsSpellbookSectionLevel(key, section) {
  const datasetLevel = Number(section?.dataset?.level);
  if (Number.isFinite(datasetLevel)) return datasetLevel;
  const keyLevel = /^spell(\d+)$/i.exec(String(key ?? ""));
  return keyLevel ? Number(keyLevel[1]) : Number.POSITIVE_INFINITY;
}

function rerenderActorSheets() {
  const apps = Object.values(ui?.windows ?? {});
  for (const app of apps) {
    if (app?.actor || app?.document?.documentName === "Actor") {
      app.render(false);
    }
  }
}

function isFoundryExportButtonEnabled() {
  return Boolean(game?.settings?.get(MODULE_ID, SETTINGS.exportButton));
}

function isDebugEnabled() {
  return Boolean(game?.settings?.get(MODULE_ID, SETTINGS.debug));
}

function debugNetherscrollsCharacterImport(message, details = undefined) {
  if (!isDebugEnabled()) return;
  const prefix = `${MODULE_ID} | Foundry Import | ${message}`;
  if (details === undefined) console.debug(prefix);
  else console.debug(prefix, details);
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
  const data = Object.fromEntries(source.entries());
  for (const key of new Set(Array.from(source.keys()))) {
    const values = source.getAll(key);
    if (values.length > 1) data[key] = values;
  }
  return data;
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

function getSelectedNetherscrollsSourceValues(formData) {
  const raw = formData?.sources ?? formData?.source;
  const values = Array.isArray(raw) ? raw : [raw];
  return Array.from(
    new Set(
      values
        .flatMap((value) => String(value ?? "").split(","))
        .map((value) => toTrimmedStringOrNull(value))
        .filter(Boolean)
    )
  );
}

async function buildNetherscrollsImportRequests({ apiKey, selectedTypes, sinceDate, selectedSources = [] }) {
  if (selectedSources.length) {
    return selectedTypes
      .filter((type) => NETHERSCROLLS_IMPORT_ENDPOINTS[type.key])
      .map((type) =>
        buildNetherscrollsSourceImportRequest({
          apiKey,
          typeKey: type.key,
          selectedSources,
          sinceDate,
        })
      )
      .filter(Boolean);
  }

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

function buildNetherscrollsSourceImportRequest({
  apiKey,
  typeKey,
  selectedSources,
  sinceDate,
}) {
  const url = new URL(NETHERSCROLLS_SOURCE_IMPORT_ENDPOINT);
  for (const source of selectedSources) {
    url.searchParams.append("sources", source);
  }
  url.searchParams.set("dataset", getNetherscrollsSourceImportDataset(typeKey));
  if (sinceDate) url.searchParams.set("since", sinceDate);

  return {
    typeKey,
    typeKeys: [typeKey],
    sourceFiltered: true,
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
      sourceDataset: getNetherscrollsSourceImportDataset(typeKey),
      sources: selectedSources,
      since: sinceDate || null,
    },
  };
}

function getNetherscrollsSourceImportDataset(typeKey) {
  const datasets = {
    classes: "class",
    feats: "feat",
    items: "item",
    spells: "spell",
    backgrounds: "background",
    races: "race",
  };
  return datasets[typeKey] ?? typeKey;
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
    destinations.classes.subclassPack = getNetherscrollsImportPackCollection("subclasses");
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
    const subclasses = result.classes.subclasses ?? {};
    return `Netherscrolls ${label} imported: ${imported} created, ${updated} updated, ${removed} removed. Subclasses: ${subclasses.created ?? 0} created, ${subclasses.updated ?? 0} updated, ${subclasses.deleted ?? 0} removed. Class features: ${features.created ?? 0} created, ${features.updated ?? 0} updated, ${features.deleted ?? 0} removed.`;
  }
  return `Netherscrolls ${label} imported: ${imported} created, ${updated} updated, ${removed} removed.`;
}

function formatNetherscrollsSourceImportResult(result, typeKeys = []) {
  const labels = (Array.isArray(typeKeys) ? typeKeys : [])
    .filter((typeKey) => result?.[typeKey])
    .map((typeKey) => {
      const counts = result[typeKey] ?? {};
      return `${getNetherscrollsImportTypeLabel(typeKey)}: ${counts.created ?? 0} created, ${counts.updated ?? 0} updated, ${counts.deleted ?? 0} removed`;
    });

  return labels.length
    ? `Netherscrolls source import complete. ${labels.join("; ")}.`
    : "Netherscrolls source import complete. No selected dataset returned importable data.";
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
    const error = new Error(message);
    error.code = data?.error?.code ?? null;
    throw error;
  }

  return data;
}

async function applyNetherscrollsImportResponse(data, requestTypeKey = null, allowedTypeKeys = null) {
  const result = {};
  const allowedTypes = Array.isArray(allowedTypeKeys) ? new Set(allowedTypeKeys) : null;
  const shouldImportType = (typeKey) => !allowedTypes || allowedTypes.has(typeKey);

  const classes = shouldImportType("classes")
    ? getNetherscrollsResponseDataset(data, "classes", requestTypeKey)
    : null;
  if (Array.isArray(classes)) {
    result.classes = await importNetherscrollsClasses(classes);
    invalidateNetherscrollsCompendiumDocumentIdCache("classes");
    invalidateNetherscrollsCompendiumDocumentIdCache("subclasses");
    invalidateNetherscrollsCompendiumDocumentIdCache("classFeatures");
  }

  const subclasses = shouldImportType("subclasses")
    ? getNetherscrollsResponseDataset(data, "subclasses", requestTypeKey)
    : null;
  if (Array.isArray(subclasses)) {
    result.subclasses = await importNetherscrollsGenericFoundryItems(subclasses, "subclasses");
    invalidateNetherscrollsCompendiumDocumentIdCache("subclasses");
  }

  const items = shouldImportType("items")
    ? getNetherscrollsResponseDataset(data, "items", requestTypeKey)
    : null;
  if (Array.isArray(items)) {
    result.items = await importNetherscrollsItems(items);
    invalidateNetherscrollsCompendiumDocumentIdCache("items");
  }

  const feats = shouldImportType("feats")
    ? getNetherscrollsResponseDataset(data, "feats", requestTypeKey)
    : null;
  if (Array.isArray(feats)) {
    result.feats = await importNetherscrollsFeats(feats);
    invalidateNetherscrollsCompendiumDocumentIdCache("feats");
  }

  const spells = shouldImportType("spells")
    ? getNetherscrollsResponseDataset(data, "spells", requestTypeKey)
    : null;
  if (Array.isArray(spells)) {
    result.spells = await importNetherscrollsSpells(spells);
    invalidateNetherscrollsCompendiumDocumentIdCache("spells");
  }

  const backgrounds = shouldImportType("backgrounds")
    ? getNetherscrollsResponseDataset(data, "backgrounds", requestTypeKey)
    : null;
  if (Array.isArray(backgrounds)) {
    result.backgrounds = await importNetherscrollsGenericFoundryItems(backgrounds, "backgrounds");
    invalidateNetherscrollsCompendiumDocumentIdCache("backgrounds");
  }

  const races = shouldImportType("races")
    ? getNetherscrollsResponseDataset(data, "races", requestTypeKey)
    : null;
  if (Array.isArray(races)) {
    result.races = await importNetherscrollsGenericFoundryItems(races, "races");
    invalidateNetherscrollsCompendiumDocumentIdCache("races");
  }

  return result;
}

async function importNetherscrollsClasses(classes) {
  const classPack = await getNetherscrollsImportPack("classes");
  if (!classPack) throw new Error("Netherscrolls Classes compendium pack was not found.");

  const subclassPack = await getNetherscrollsImportPack("subclasses");
  if (!subclassPack) throw new Error("Netherscrolls Subclasses compendium pack was not found.");

  const featurePack = await getNetherscrollsImportPack("classFeatures");
  if (!featurePack) throw new Error("Netherscrolls Class Features compendium pack was not found.");

  await ensureNetherscrollsImportPackWritable(classPack);
  await ensureNetherscrollsImportPackWritable(subclassPack);
  await ensureNetherscrollsImportPackWritable(featurePack);

  const featureResult = await importNetherscrollsClassFeatureItems(classes, featurePack);
  const existingClassesByNetherId = await getCompendiumDocumentsByNetherId(classPack);
  const existingSubclassesByNetherId = await getCompendiumDocumentsByNetherId(subclassPack);
  const classData = [];
  const subclassData = [];
  const classDeleteIds = [];
  const subclassDeleteIds = [];
  const legacySubclassDeleteIds = [];
  const classFolderCache = new Map();
  const subclassFolderCache = new Map();
  await ensureNetherscrollsClassFolderTree(classPack, classFolderCache);
  await ensureNetherscrollsSubclassFolderTree(subclassPack, subclassFolderCache);

  for (const classSource of classes) {
    const classNetherscrollsId = getNetherscrollsSourceId(classSource);
    if (isNetherscrollsDeleted(classSource)) {
      const existing = classNetherscrollsId
        ? existingClassesByNetherId.get(String(classNetherscrollsId))
        : null;
      if (existing?.id) classDeleteIds.push(existing.id);

      for (const subclassSource of getNetherscrollsSubclasses(classSource)) {
        const subclassNetherscrollsId = getNetherscrollsSourceId(subclassSource);
        const existingSubclass = subclassNetherscrollsId
          ? existingSubclassesByNetherId.get(String(subclassNetherscrollsId))
          : null;
        if (existingSubclass?.id) subclassDeleteIds.push(existingSubclass.id);
        const legacySubclass = subclassNetherscrollsId
          ? existingClassesByNetherId.get(String(subclassNetherscrollsId))
          : null;
        if (legacySubclass?.id && legacySubclass?.type === "subclass") {
          legacySubclassDeleteIds.push(legacySubclass.id);
        }
      }
      continue;
    }

    const preparedClass = normalizeNetherscrollsClassData(classSource, {
      featureUuidByKey: featureResult.uuidByKey,
    });
    // A Foundry Export payload includes the source compendium document's
    // local `_id`. It must not be retained after a character refresh has
    // deliberately removed that document; otherwise Foundry treats a new
    // canonical class as an update to a document that no longer exists.
    delete preparedClass._id;
    delete preparedClass.id;
    if (classNetherscrollsId && existingClassesByNetherId.has(String(classNetherscrollsId))) {
      preparedClass._id = existingClassesByNetherId.get(String(classNetherscrollsId)).id;
    }
    const classFolder = await ensureNetherscrollsClassFolder(
      classPack,
      preparedClass,
      classFolderCache
    );
    if (classFolder?.id) preparedClass.folder = classFolder.id;
    classData.push(preparedClass);

    for (const subclassSource of getNetherscrollsSubclasses(classSource)) {
      const subclassNetherscrollsId = getNetherscrollsSourceId(subclassSource);
      if (isNetherscrollsDeleted(subclassSource)) {
        const existing = subclassNetherscrollsId
          ? existingSubclassesByNetherId.get(String(subclassNetherscrollsId))
          : null;
        if (existing?.id) subclassDeleteIds.push(existing.id);
        const legacySubclass = subclassNetherscrollsId
          ? existingClassesByNetherId.get(String(subclassNetherscrollsId))
          : null;
        if (legacySubclass?.id && legacySubclass?.type === "subclass") {
          legacySubclassDeleteIds.push(legacySubclass.id);
        }
        continue;
      }

      const preparedSubclass = normalizeNetherscrollsSubclassData(subclassSource, classSource, {
        featureUuidByKey: featureResult.uuidByKey,
      });
      // See the corresponding class cleanup above. A nested Foundry subclass
      // can carry an obsolete local compendium `_id` as well.
      delete preparedSubclass._id;
      delete preparedSubclass.id;
      if (subclassNetherscrollsId && existingSubclassesByNetherId.has(String(subclassNetherscrollsId))) {
        preparedSubclass._id = existingSubclassesByNetherId.get(String(subclassNetherscrollsId)).id;
      }
      const subclassFolder = await ensureNetherscrollsSubclassFolder(
        subclassPack,
        preparedSubclass,
        classSource,
        subclassFolderCache
      );
      if (subclassFolder?.id) preparedSubclass.folder = subclassFolder.id;
      subclassData.push(preparedSubclass);

      const legacySubclass = subclassNetherscrollsId
        ? existingClassesByNetherId.get(String(subclassNetherscrollsId))
        : null;
      if (legacySubclass?.id && legacySubclass?.type === "subclass") {
        legacySubclassDeleteIds.push(legacySubclass.id);
      }
    }
  }

  const ItemClass = Item?.implementation ?? Item;
  const uniqueClassDeleteIds = Array.from(
    new Set([...classDeleteIds, ...legacySubclassDeleteIds])
  );
  const uniqueSubclassDeleteIds = Array.from(new Set(subclassDeleteIds));
  if (uniqueClassDeleteIds.length) {
    await ItemClass.deleteDocuments(uniqueClassDeleteIds, { pack: classPack.collection });
  }
  if (uniqueSubclassDeleteIds.length) {
    await ItemClass.deleteDocuments(uniqueSubclassDeleteIds, { pack: subclassPack.collection });
  }

  const classUpdates = classData.filter((item) => item._id);
  const classCreates = classData.filter((item) => !item._id);
  const subclassUpdates = subclassData.filter((item) => item._id);
  const subclassCreates = subclassData.filter((item) => !item._id);
  if (classUpdates.length) {
    await ItemClass.updateDocuments(classUpdates, { pack: classPack.collection });
  }
  if (subclassUpdates.length) {
    await ItemClass.updateDocuments(subclassUpdates, { pack: subclassPack.collection });
  }

  const createdClasses = classCreates.length
    ? await ItemClass.createDocuments(classCreates, { pack: classPack.collection })
    : [];
  const createdSubclasses = subclassCreates.length
    ? await ItemClass.createDocuments(subclassCreates, { pack: subclassPack.collection })
    : [];
  return {
    created: createdClasses.length,
    updated: classUpdates.length,
    deleted: uniqueClassDeleteIds.length,
    subclasses: {
      created: createdSubclasses.length,
      updated: subclassUpdates.length,
      deleted: uniqueSubclassDeleteIds.length,
      migrated: Array.from(new Set(legacySubclassDeleteIds)).length,
    },
    features: featureResult.counts,
  };
}

async function importNetherscrollsClassFeatureItems(classes, pack) {
  const existingByNetherId = await getCompendiumDocumentsByNetherId(pack);
  const descriptors = getNetherscrollsClassFeatureItemDescriptors(classes);
  const featureData = [];
  const deleteIds = [];
  const uuidByKey = new Map();
  const folderCache = new Map();
  await ensureNetherscrollsClassFeatureFolderTree(pack, folderCache);

  for (const descriptor of descriptors) {
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

  deleteIds.push(...(await getStaleNetherscrollsClassFeatureDocumentIds(pack, classes, descriptors)));

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

  await cleanupNetherscrollsLegacyClassFeatureFolders(pack).catch((err) => {
    console.warn("Netherscrolls legacy class feature folder cleanup failed.", err);
  });

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

async function importNetherscrollsGenericFoundryItems(rows, typeKey) {
  const pack = await getNetherscrollsImportPack(typeKey);
  if (!pack) throw new Error(`Netherscrolls ${getNetherscrollsImportTypeLabel(typeKey)} compendium pack was not found.`);
  await ensureNetherscrollsImportPackWritable(pack);

  const existingByNetherId = await getCompendiumDocumentsByNetherId(pack);
  const itemData = [];
  const deleteIds = [];
  for (const row of rows) {
    const netherscrollsId = getNetherscrollsSourceId(row);
    if (isNetherscrollsDeleted(row)) {
      const existing = netherscrollsId ? existingByNetherId.get(String(netherscrollsId)) : null;
      if (existing?.id) deleteIds.push(existing.id);
      continue;
    }

    const foundryItem = getNetherscrollsFoundryItemPayload(row);
    const source = duplicateNetherscrollsData(foundryItem ?? row);
    delete source._id;
    delete source.id;
    delete source.folder;
    source.name = toTrimmedStringOrNull(source.name) ?? toTrimmedStringOrNull(row?.name) ?? "Netherscrolls Content";
    const fallbackTypes = {
      backgrounds: "background",
      races: "race",
      subclasses: "subclass",
    };
    source.type = toTrimmedStringOrNull(source.type) ?? fallbackTypes[typeKey] ?? "loot";
    source.img = normalizeNetherscrollsImportImagePath(source.img, row?.img, row?.image);
    source.system ??= {};
    source.effects ??= [];
    applyNetherscrollsImportFlags(source, row, netherscrollsId);
    if (source.type === "subclass") {
      const classId = getNetherscrollsSubclassClassId(row, foundryItem);
      if (classId) source.flags.netherscrolls.classId = classId;
    }
    if (netherscrollsId && existingByNetherId.has(String(netherscrollsId))) {
      const existing = existingByNetherId.get(String(netherscrollsId));
      if (
        fallbackTypes[typeKey] &&
        toTrimmedStringOrNull(existing?.type) !== source.type
      ) {
        if (existing?.id) deleteIds.push(existing.id);
      } else if (!haveSameNetherscrollsEmbeddedEffects(existing, source)) {
        // Recreate the canonical library Item when its effect set changed.
        // Updating nested ActiveEffects can append them rather than remove old
        // entries, which makes racial bonuses stack after repeated imports.
        if (existing?.id) deleteIds.push(existing.id);
      } else {
        source._id = existing.id;
        delete source.effects;
      }
    }
    itemData.push(source);
  }

  const ItemClass = Item?.implementation ?? Item;
  const uniqueDeleteIds = Array.from(new Set(deleteIds));
  if (uniqueDeleteIds.length) {
    await ItemClass.deleteDocuments(uniqueDeleteIds, { pack: pack.collection });
  }

  const updates = itemData.filter((item) => item._id);
  const creates = itemData.filter((item) => !item._id);
  if (updates.length) {
    await ItemClass.updateDocuments(updates, { pack: pack.collection });
  }
  const created = creates.length
    ? await ItemClass.createDocuments(creates, { pack: pack.collection })
    : [];
  return {
    created: created.length,
    updated: updates.length,
    deleted: uniqueDeleteIds.length,
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

const netherscrollsCompendiumDocumentIdCache = new Map();

function invalidateNetherscrollsCompendiumDocumentIdCache(typeKey) {
  const collection = getNetherscrollsImportPackCollection(typeKey);
  if (!collection) return;
  netherscrollsCompendiumDocumentIdCache.delete(collection);
  debugNetherscrollsCharacterImport("Invalidated Netherscrolls-id compendium index after library import.", {
    typeKey,
    collection,
  });
}

async function getNetherscrollsCompendiumDocumentsById(pack) {
  if (!pack) return new Map();
  const cacheKey = pack.collection ?? pack.metadata?.id ?? pack.id;
  const indexSize = Number.isFinite(pack.index?.size) ? pack.index.size : null;
  const cached = cacheKey ? netherscrollsCompendiumDocumentIdCache.get(cacheKey) : null;
  if (cached && (indexSize == null || cached.indexSize === indexSize)) {
    debugNetherscrollsCharacterImport("Reused cached Netherscrolls-id compendium index.", {
      pack: cacheKey,
      documentCount: cached.documentsById.size,
    });
    return cached.documentsById;
  }

  debugNetherscrollsCharacterImport("Building Netherscrolls-id compendium index.", { pack: cacheKey });
  const documents = await pack.getDocuments();
  const documentsById = new Map();
  for (const document of documents) {
    const netherscrollsId = getItemNetherId(document);
    if (netherscrollsId) documentsById.set(String(netherscrollsId), document);
  }
  if (cacheKey) netherscrollsCompendiumDocumentIdCache.set(cacheKey, { indexSize, documentsById });
  console.info(`${MODULE_ID} | Foundry Import | Indexed ${documentsById.size} Netherscrolls ids in ${cacheKey ?? "compendium"}.`);
  return documentsById;
}

async function getCompendiumDocumentsByNetherId(pack) {
  return getNetherscrollsCompendiumDocumentsById(pack);
}

function getNetherscrollsResponseDataset(data, dataKey, requestTypeKey = null) {
  if (Array.isArray(data)) return requestTypeKey === dataKey ? data : null;
  if (Array.isArray(data?.[dataKey])) return data[dataKey];
  if (data?.meta?.dataKey === dataKey && Array.isArray(data?.data)) return data.data;
  if (requestTypeKey === dataKey && Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.[dataKey])) return data.data[dataKey];
  if (Array.isArray(data?.data?.byDataset?.[dataKey])) return data.data.byDataset[dataKey];
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
        data.progressionTable ||
        data.presentation?.progressionTable)
  );
}

function getNetherscrollsSourceId(data) {
  const foundryItem = getNetherscrollsFoundryItemPayload(data);
  return normalizeNetherscrollsReferenceValue(
    data?.netherscrollsId ??
      data?.flags?.netherscrolls?.id ??
      foundryItem?.flags?.netherscrolls?.id ??
      data?._id ??
      data?.id
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
  return normalizeNetherscrollsPersistentImageValues(values, NETHERSCROLLS_DEFAULT_IMAGE);
}

function normalizeNetherscrollsImportImagePath(...values) {
  return normalizeNetherscrollsPersistentImageValues(values, NETHERSCROLLS_IMPORT_IMAGE);
}

function normalizeNetherscrollsPersistentImageValues(values, fallback) {
  for (const value of values) {
    const raw = toTrimmedStringOrNull(value);
    if (raw) return normalizeNetherscrollsPersistentImagePath(raw, fallback);
  }
  return fallback;
}

function normalizeNetherscrollsPersistentImagePath(value, fallback = NETHERSCROLLS_DEFAULT_IMAGE) {
  const img = String(value ?? "").trim();
  if (/^https?:\/\//i.test(img)) return img;
  if (isNetherscrollsUnresolvedImageKey(img)) {
    console.error(
      `${MODULE_ID} | Netherscrolls returned an unresolved image key. ` +
      "The API requires R2_PUBLIC_BASE_URL.",
      img
    );
    return fallback;
  }
  return img || fallback;
}

function isNetherscrollsUnresolvedImageKey(value) {
  return /^image\//i.test(String(value ?? "").trim());
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
  if (existing) return ensureNetherscrollsImportPackSidebarFolder(existing);

  const created = await createNetherscrollsWorldImportPack(definition);
  return ensureNetherscrollsImportPackSidebarFolder(created);
}

async function placeExistingNetherscrollsImportPacksInSidebarFolder() {
  try {
    for (const typeKey of Object.keys(NETHERSCROLLS_WORLD_IMPORT_PACKS)) {
      const pack = game?.packs?.get?.(getNetherscrollsImportPackCollection(typeKey));
      if (pack) await ensureNetherscrollsImportPackSidebarFolder(pack);
    }
  } catch (err) {
    console.warn(`${MODULE_ID} | Unable to place existing Netherscrolls compendiums in the sidebar folder.`, err);
  }
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

async function ensureNetherscrollsImportPackSidebarFolder(pack) {
  if (!pack || typeof pack.setFolder !== "function") return pack;

  try {
    const folder = await findOrCreateNetherscrollsCompendiumFolder();
    if (!folder?.id) return pack;
    if (getDocumentId(pack.folder) !== getDocumentId(folder)) {
      await pack.setFolder(folder);
    }
  } catch (err) {
    console.warn(`${MODULE_ID} | Unable to place ${pack.title ?? pack.collection ?? "compendium"} in the Netherscrolls folder.`, err);
  }

  return pack;
}

async function findOrCreateNetherscrollsCompendiumFolder() {
  const existing = getWorldFolders().find((folder) => {
    const parentId = getDocumentId(folder?.folder);
    return (
      folder?.name === NETHERSCROLLS_IMPORT_SIDEBAR_FOLDER.name &&
      folder?.type === NETHERSCROLLS_IMPORT_SIDEBAR_FOLDER.type &&
      !parentId
    );
  });
  if (existing) return existing;

  const FolderDocumentClass =
    globalThis.foundry?.documents?.Folder ??
    globalThis.Folder;
  const FolderClass = FolderDocumentClass?.implementation ?? FolderDocumentClass;
  if (typeof FolderClass?.create !== "function") return null;

  return FolderClass.create({ ...NETHERSCROLLS_IMPORT_SIDEBAR_FOLDER });
}

function getWorldFolders() {
  const folders = game?.folders;
  if (!folders) return [];
  if (Array.isArray(folders)) return folders;
  if (Array.isArray(folders.contents)) return folders.contents;
  if (typeof folders.values === "function") return Array.from(folders.values());
  if (typeof folders[Symbol.iterator] === "function") return Array.from(folders);
  return [];
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
  const parentClassId = getNetherscrollsSourceId(classSource);
  if (parentClassId) {
    itemData.flags.netherscrolls = {
      ...(itemData.flags.netherscrolls ?? {}),
      classId: parentClassId,
    };
  }
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
  source.system.hd = source.system.hd && typeof source.system.hd === "object" ? source.system.hd : {};
  source.system.hd.denomination = normalizeNetherscrollsClassHitDie({
    ...classSource,
    system: source.system,
  });
  source.system.hd.spent = 0;
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
  const parentClassId = getNetherscrollsSourceId(classSource);
  if (parentClassId) {
    source.flags.netherscrolls = {
      ...(source.flags.netherscrolls ?? {}),
      classId: parentClassId,
    };
  }
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
      activities: normalizeNetherscrollsActivities(feature),
      advancement: normalizeNetherscrollsClassFeatureAdvancement(feature),
      description: {
        value: buildNetherscrollsFeatureDescription(feature),
        chat: "",
      },
      identifier: normalizeNetherscrollsClassFeatureIdentifier(descriptor),
      source: buildNetherscrollsItemSource(sourceName, {
        ...feature,
        rules: feature?.rules ?? descriptor.classSource?.rules ?? (descriptor.classSource?.legacy ? "2014" : undefined),
      }),
      cover: normalizeNetherscrollsNullableNumber(feature?.system?.cover ?? feature?.cover),
      crewed: false,
      enchant: {
        max: "",
        period: "",
      },
      prerequisites: {
        items: getNetherscrollsClassFeaturePrerequisiteItems(descriptor),
        level: null,
        repeatable: false,
      },
      properties: [],
      requirements: buildNetherscrollsFeatureRequirement(descriptor),
      type: {
        value: getNetherscrollsClassFeatureTypeValue(descriptor),
        subtype: getNetherscrollsClassFeatureSubtype(descriptor),
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
  if (descriptor.scope === "choice") {
    itemData.flags[MODULE_ID].parentFeatureKey = descriptor.parentFeatureKey ?? "";
    itemData.flags[MODULE_ID].parentFeature = getNetherscrollsFeatureTitle(descriptor.parentFeature);
    itemData.flags[MODULE_ID].choiceIndex = descriptor.choiceIndex ?? 0;
  }
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

function normalizeNetherscrollsClassFeatureAdvancement(feature) {
  const advancement = feature?.system?.advancement ?? feature?.advancement;
  return advancement && typeof advancement === "object" && !Array.isArray(advancement) ? advancement : {};
}

function getNetherscrollsClassFeatureDescriptors(classes) {
  const descriptors = [];
  for (const classSource of classes) {
    for (const feature of getNetherscrollsClassFeatures(classSource)) {
      descriptors.push(buildNetherscrollsFeatureDescriptor(classSource, null, feature));
    }

    for (const subclassSource of getNetherscrollsSubclasses(classSource)) {
      for (const feature of getNetherscrollsSubclassFeatures(subclassSource, classSource)) {
        descriptors.push(buildNetherscrollsFeatureDescriptor(classSource, subclassSource, feature));
      }
    }
  }

  return descriptors;
}

function getNetherscrollsClassFeatureItemDescriptors(classes) {
  const descriptors = [];
  for (const descriptor of getNetherscrollsClassFeatureDescriptors(classes)) {
    descriptors.push(descriptor);
    descriptors.push(...buildNetherscrollsFeatureChoiceDescriptors(descriptor));
  }
  return descriptors;
}

async function getStaleNetherscrollsClassFeatureDocumentIds(pack, classes, descriptors) {
  const classIds = new Set(classes.map((source) => getNetherscrollsSourceId(source)).filter(Boolean).map(String));
  const classIdentifiers = new Set(classes.map(normalizeNetherscrollsClassIdentifier).filter(Boolean));
  const classNames = new Set(
    classes
      .map((source) => normalizeNetherscrollsName(source?.name).toLowerCase())
      .filter(Boolean)
  );
  const expectedIds = new Set(descriptors.map((descriptor) => descriptor.netherscrollsId).filter(Boolean).map(String));
  const expectedKeys = new Set(descriptors.map((descriptor) => descriptor.key).filter(Boolean));
  const documents = await pack.getDocuments();
  const staleIds = [];

  for (const document of documents) {
    if (!isNetherscrollsImportedClassFeatureDocument(document)) continue;
    if (!isNetherscrollsClassFeatureOwnedByImportedClass(document, { classIds, classIdentifiers, classNames })) continue;

    const netherscrollsId = getItemNetherId(document);
    const featureKey = getNetherscrollsDocumentFlag(document, "featureKey");
    if (netherscrollsId && expectedIds.has(String(netherscrollsId))) continue;
    if (featureKey && expectedKeys.has(featureKey)) continue;
    if (document?.id) staleIds.push(document.id);
  }

  return staleIds;
}

function isNetherscrollsImportedClassFeatureDocument(document) {
  if (document?.type !== "feat") return false;
  return Boolean(
    getNetherscrollsDocumentFlag(document, "featureScope") ||
      getNetherscrollsDocumentFlag(document, "featureKey") ||
      getNetherscrollsDocumentFlag(document, "parentClassNetherscrollsId") ||
      getNetherscrollsDocumentFlag(document, "parentClassIdentifier")
  );
}

function isNetherscrollsClassFeatureForExport(document) {
  if (isNetherscrollsImportedClassFeatureDocument(document)) return true;
  if (document?.type !== "feat") return false;
  return toTrimmedStringOrNull(document?.system?.type?.value)?.toLowerCase() === "class";
}

function isNetherscrollsClassFeatureOwnedByImportedClass(document, { classIds, classIdentifiers, classNames }) {
  const parentClassId = toTrimmedStringOrNull(getNetherscrollsDocumentFlag(document, "parentClassNetherscrollsId"));
  if (parentClassId && classIds.has(parentClassId)) return true;

  const parentClassIdentifier = toTrimmedStringOrNull(getNetherscrollsDocumentFlag(document, "parentClassIdentifier"));
  if (parentClassIdentifier && classIdentifiers.has(parentClassIdentifier)) return true;

  const parentClassName = normalizeNetherscrollsName(getNetherscrollsDocumentFlag(document, "parentClass")).toLowerCase();
  return Boolean(parentClassName && classNames.has(parentClassName));
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

function buildNetherscrollsFeatureChoiceDescriptors(parentDescriptor) {
  if (!shouldCreateNetherscrollsFeatureChoiceItems(parentDescriptor.feature)) return [];

  const descriptors = [];
  for (const [index, choice] of getNetherscrollsFeatureChoices(parentDescriptor.feature).entries()) {
    const title = getNetherscrollsFeatureChoiceTitle(choice, index);
    if (!title) continue;

    const choiceKey = getNetherscrollsFeatureChoiceKey(parentDescriptor, choice, index);
    const netherscrollsId = getNetherscrollsSourceId(choice) ?? buildNetherscrollsSyntheticSourceId("feature-choice", choiceKey);
    descriptors.push({
      key: choiceKey,
      scope: "choice",
      netherscrollsId,
      classSource: parentDescriptor.classSource,
      subclassSource: parentDescriptor.subclassSource,
      parentFeature: parentDescriptor.feature,
      parentFeatureKey: parentDescriptor.key,
      choiceIndex: index,
      choiceType: toTrimmedStringOrNull(parentDescriptor.feature?.choiceType) ?? "",
      feature: buildNetherscrollsFeatureChoiceItem(parentDescriptor, choice, index, netherscrollsId),
      level: parentDescriptor.level,
      deleted: parentDescriptor.deleted || isNetherscrollsDeleted(choice),
    });
  }

  return descriptors;
}

function buildNetherscrollsFeatureChoiceItem(parentDescriptor, choice, index, netherscrollsId) {
  const parentFeature = parentDescriptor.feature;
  const title = getNetherscrollsFeatureChoiceTitle(choice, index);
  const source = choice && typeof choice === "object" ? choice : {};
  return {
    ...source,
    _id: netherscrollsId,
    title,
    name: title,
    level: parentDescriptor.level,
    descriptionHtml: buildNetherscrollsFeatureChoiceDescription(choice),
    choices: [],
    selectable: 0,
    choiceType: "",
    source: source.source ?? parentFeature?.source,
    rules: source.rules ?? parentFeature?.rules,
    img: source.img ?? source.image ?? parentFeature?.img ?? parentFeature?.image,
  };
}

function getNetherscrollsFeatureChoiceKey(parentDescriptor, choice, index) {
  const choiceId = getNetherscrollsSourceId(choice);
  const choiceKey = choiceId ?? `${index + 1}-${slugifyNetherscrollsIdentifier(getNetherscrollsFeatureChoiceTitle(choice, index))}`;
  return `${parentDescriptor.key}:choice:${choiceKey}`;
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
    addNetherscrollsAdvancement(
      advancement,
      buildNetherscrollsItemChoiceAdvancement(descriptor, featureUuidByKey)
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
    addNetherscrollsAdvancement(
      advancement,
      buildNetherscrollsItemChoiceAdvancement(descriptor, featureUuidByKey)
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

function buildNetherscrollsItemChoiceAdvancement(descriptor, featureUuidByKey) {
  const feature = descriptor.feature;
  if (!shouldBuildNetherscrollsItemChoiceAdvancement(feature)) return null;

  const choiceDescriptors = buildNetherscrollsFeatureChoiceDescriptors(descriptor);
  const pool = choiceDescriptors
    .map((choiceDescriptor, index) => {
      const uuid = featureUuidByKey.get(choiceDescriptor.key);
      return uuid
        ? {
            uuid,
            sort: (index + 1) * 100000,
          }
        : null;
    })
    .filter(Boolean);
  if (!pool.length) return null;

  const count = getNetherscrollsFeatureChoiceCount(feature, pool.length);
  const level = descriptor.level;
  return {
    _id: buildNetherscrollsAdvancementId(feature, `choice-${descriptor.key}`),
    type: "ItemChoice",
    configuration: {
      allowDrops: true,
      choices: {
        [String(level)]: {
          count,
          replacement: Boolean(feature?.replacement ?? feature?.replaceable ?? feature?.allowReplacement),
        },
      },
      pool,
      restriction: {
        level: "",
        list: [],
        subtype: getNetherscrollsItemChoiceSubtype(feature),
        type: getNetherscrollsItemChoiceType(feature),
      },
      sorting: "a",
      spell: null,
      type: getNetherscrollsItemChoiceType(feature),
    },
    value: {
      added: {},
      replaced: {},
    },
    level,
    title: getNetherscrollsFeatureTitle(feature),
    hint: stripNetherscrollsHtmlTags(buildNetherscrollsFeatureDescription(feature)),
    flags: {
      [MODULE_ID]: {
        featureKey: descriptor.key,
        choiceType: toTrimmedStringOrNull(feature?.choiceType) ?? "",
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

function shouldBuildNetherscrollsItemChoiceAdvancement(feature) {
  return shouldCreateNetherscrollsFeatureChoiceItems(feature);
}

function shouldCreateNetherscrollsFeatureChoiceItems(feature) {
  const choices = getNetherscrollsFeatureChoices(feature);
  if (!choices.length) return false;

  const choiceType = toTrimmedStringOrNull(feature?.choiceType)?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (choiceType === "subclass") return false;
  return true;
}

function getNetherscrollsFeatureChoiceCount(feature, poolSize) {
  const explicit = toNumber(feature?.selectable ?? feature?.count, Number.NaN);
  if (Number.isFinite(explicit) && explicit > 0) return Math.min(poolSize, Math.trunc(explicit));
  return 1;
}

function getNetherscrollsItemChoiceType(_feature) {
  return "feat";
}

function getNetherscrollsItemChoiceSubtype(feature) {
  const choiceType = toTrimmedStringOrNull(feature?.choiceType)?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (choiceType === "fightingstyle" || /fighting\s+style/i.test(getNetherscrollsFeatureTitle(feature))) {
    return "fightingStyle";
  }
  return "";
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
  const foundryItem = getNetherscrollsFoundryItemPayload(source);
  const raw = [
    source?.system?.hd?.denomination,
    foundryItem?.system?.hd?.denomination,
    source?.diceType,
    source?.hitDice,
    source?.hitDie,
    source?.hd,
    source?.hitPoints?.hitDice,
    source?.hitPoints?.die,
  ].map(toTrimmedStringOrNull).find(Boolean) ?? "d6";
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
  if (Array.isArray(source?.classFeatures)) return source.classFeatures;
  if (Array.isArray(source?.features)) return source.features;
  return inferNetherscrollsClassFeatures(source);
}

function getNetherscrollsSubclasses(source) {
  return Array.isArray(source?.subclasses) ? source.subclasses : [];
}

function getNetherscrollsSubclassFeatures(source, classSource = null) {
  if (Array.isArray(source?.subclassFeatures)) return source.subclassFeatures;
  if (Array.isArray(source?.features)) return source.features;
  return inferNetherscrollsSubclassFeatures(source, classSource);
}

function mergeNetherscrollsFeatureLists(...lists) {
  const merged = [];
  const byKey = new Map();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const feature of list) {
      if (!feature || typeof feature !== "object") continue;
      const key = getNetherscrollsFeatureMergeKey(feature);
      if (!key) continue;
      if (!byKey.has(key)) {
        byKey.set(key, feature);
        merged.push(feature);
      }
    }
  }
  return merged;
}

function getNetherscrollsFeatureMergeKey(feature) {
  const title = getNetherscrollsFeatureTitle(feature);
  const level = Math.max(1, Math.trunc(toNumber(feature?.level, 1)));
  const id = feature?.inferredFrom ? null : getNetherscrollsSourceId(feature);
  return id ? `id:${id}` : `${level}:${slugifyNetherscrollsIdentifier(title)}`;
}

function inferNetherscrollsClassFeatures(source) {
  const progressionFeatures = extractNetherscrollsProgressionFeatures(source);
  const sectionFeatures = extractNetherscrollsFeatureSections(source, {
    fallbackFeatures: progressionFeatures,
    scope: "class",
  });
  const blockFeatures = extractNetherscrollsFeatureBlocks(source, {
    fallbackFeatures: progressionFeatures,
    scope: "class",
  });
  return mergeNetherscrollsFeatureLists(sectionFeatures, blockFeatures, progressionFeatures);
}

function inferNetherscrollsSubclassFeatures(source, classSource = null) {
  const sectionFeatures = extractNetherscrollsFeatureSections(source, {
    fallbackFeatures: [],
    scope: "subclass",
    classSource,
  });
  const blockFeatures = extractNetherscrollsFeatureBlocks(source, {
    fallbackFeatures: [],
    scope: "subclass",
    classSource,
  });
  return mergeNetherscrollsFeatureLists(sectionFeatures, blockFeatures);
}

function buildInferredNetherscrollsFeature(source, { title, level, descriptionHtml = "", inferredFrom = "", choiceType = "" }) {
  const featureTitle = toTrimmedStringOrNull(title) ?? "Class Feature";
  const normalizedLevel = Math.max(1, Math.min(20, Math.trunc(toNumber(level, 1))));
  const keySource = `${getNetherscrollsSourceId(source) ?? normalizeNetherscrollsName(source?.name)}:${normalizedLevel}:${featureTitle}:${inferredFrom}`;
  return {
    _id: buildNetherscrollsSyntheticSourceId("feature", keySource),
    level: normalizedLevel,
    title: featureTitle,
    description: descriptionHtml,
    descriptionHtml,
    selectable: 0,
    choices: [],
    choiceType,
    inferredFrom,
  };
}

function extractNetherscrollsProgressionFeatures(source) {
  const table = getNetherscrollsProgressionTable(source);
  const columns = Array.isArray(table?.columns) ? table.columns : [];
  const rows = Array.isArray(table?.rows) ? table.rows : [];
  if (!columns.length || !rows.length) return [];

  const features = [];
  for (const row of rows) {
    const level = getNetherscrollsProgressionRowLevel(row, columns);
    if (!level) continue;

    for (const value of getNetherscrollsProgressionFeatureValues(row, columns)) {
      for (const title of splitNetherscrollsFeatureTitles(value)) {
        features.push(buildInferredNetherscrollsFeature(source, {
          title,
          level,
          descriptionHtml: "",
          inferredFrom: "progression",
        }));
      }
    }
  }

  return mergeNetherscrollsFeatureLists(features);
}

function getNetherscrollsProgressionRowLevel(row, columns) {
  const direct = getNetherscrollsProgressionRowValue(row, "level", 0);
  const directLevel = parseNetherscrollsFeatureLevel(direct);
  if (directLevel) return directLevel;

  for (const [index, column] of columns.entries()) {
    const label = getNetherscrollsProgressionColumnLabel(column).toLowerCase();
    const key = getNetherscrollsProgressionColumnKey(column);
    if (!/\blevel\b/.test(label) && !/\blevel\b/.test(String(key ?? "").toLowerCase())) continue;
    const level = parseNetherscrollsFeatureLevel(getNetherscrollsProgressionRowValue(row, column, index));
    if (level) return level;
  }

  return null;
}

function getNetherscrollsProgressionFeatureValues(row, columns) {
  const values = [];
  for (const [index, column] of columns.entries()) {
    const label = getNetherscrollsProgressionColumnLabel(column).toLowerCase();
    const key = String(getNetherscrollsProgressionColumnKey(column) ?? "").toLowerCase();
    if (!/\bfeatures?\b/.test(label) && !/\bfeatures?\b/.test(key)) continue;
    values.push(getNetherscrollsProgressionRowValue(row, column, index));
  }

  if (!values.length) {
    values.push(row?.features, row?.classFeatures, row?.feature);
  }

  return values.filter((value) => value != null);
}

function getNetherscrollsProgressionColumnKey(column) {
  if (typeof column === "string") return column;
  return column?.key ?? column?.id ?? column?.name ?? column?.title ?? column?.label ?? null;
}

function getNetherscrollsProgressionRowValue(row, column, index = null) {
  if (!row) return null;
  if (Array.isArray(row)) return index == null ? null : row[index];
  if (typeof column === "string") return row[column];
  const key = getNetherscrollsProgressionColumnKey(column);
  return key != null ? row[key] : null;
}

function splitNetherscrollsFeatureTitles(value) {
  const titles = [];
  for (const entry of flattenNetherscrollsFeatureTitleValues(value)) {
    const raw = toTrimmedStringOrNull(entry);
    if (!raw) continue;
    const withBreaks = raw
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/li>\s*<li>/gi, "\n")
      .replace(/<[^>]+>/g, " ");
    for (const piece of withBreaks.split(/[,;\n]+/)) {
      const title = normalizeNetherscrollsInferredFeatureTitle(piece);
      if (title) titles.push(title);
    }
  }
  return titles;
}

function flattenNetherscrollsFeatureTitleValues(value) {
  if (Array.isArray(value)) return value.flatMap(flattenNetherscrollsFeatureTitleValues);
  if (value && typeof value === "object") {
    if (value.title || value.name) return [value.title ?? value.name];
    return Object.values(value).flatMap(flattenNetherscrollsFeatureTitleValues);
  }
  return [value];
}

function normalizeNetherscrollsInferredFeatureTitle(value) {
  const title = toTrimmedStringOrNull(String(value ?? "").replace(/^[\s*\u2022\-\u2013\u2014]+/, ""));
  if (!title) return null;
  if (/^(?:-|\u2013|\u2014|none|n\/a|null)$/i.test(title)) return null;
  if (/^\+?\d+(?:d\d+)?$/i.test(title)) return null;
  return title;
}

function extractNetherscrollsFeatureSections(source, { fallbackFeatures = [], scope, classSource = null } = {}) {
  const progressionByTitle = buildNetherscrollsFeatureTitleLookup(fallbackFeatures);
  const features = [];
  for (const section of getNetherscrollsStructuredSections(source)) {
    const rawTitle = toTrimmedStringOrNull(section?.title ?? section?.name);
    if (!rawTitle) continue;

    const sectionTitle = stripNetherscrollsFeatureLevelPrefix(rawTitle);
    if (isNetherscrollsGenericClassSectionTitle(sectionTitle)) continue;

    const titleKey = slugifyNetherscrollsIdentifier(sectionTitle);
    const fallback = progressionByTitle.get(titleKey);
    const level =
      parseNetherscrollsFeatureLevel(section?.level ?? section?.classLevel ?? section?.unlockLevel) ??
      parseNetherscrollsFeatureLevel(rawTitle) ??
      parseNetherscrollsFeatureLevelFromText(buildNetherscrollsSectionText(section)) ??
      fallback?.level ??
      null;
    if (!level) continue;

    features.push(buildInferredNetherscrollsFeature(source, {
      title: fallback?.title ?? sectionTitle,
      level,
      descriptionHtml: buildNetherscrollsSectionDescription(section),
      inferredFrom: scope === "subclass" ? "subclass-section" : "class-section",
      choiceType: inferNetherscrollsFeatureChoiceType(sectionTitle, classSource ?? source),
    }));
  }

  return features;
}

function extractNetherscrollsFeatureBlocks(source, { fallbackFeatures = [], scope, classSource = null } = {}) {
  const blockGroups = collectNetherscrollsFeatureBlockGroups(source?.blocks);
  if (!blockGroups.length) return [];

  const progressionByTitle = buildNetherscrollsFeatureTitleLookup(fallbackFeatures);
  const features = [];
  for (const group of blockGroups) {
    const rawTitle = toTrimmedStringOrNull(group?.title);
    if (!rawTitle) continue;

    const featureTitle = stripNetherscrollsFeatureLevelPrefix(rawTitle);
    if (isNetherscrollsGenericClassSectionTitle(featureTitle)) continue;

    const titleKey = slugifyNetherscrollsIdentifier(featureTitle);
    const fallback = progressionByTitle.get(titleKey);
    const level =
      parseNetherscrollsFeatureLevel(group?.level ?? group?.classLevel ?? group?.unlockLevel) ??
      parseNetherscrollsFeatureLevel(rawTitle) ??
      parseNetherscrollsFeatureLevelFromText(getNetherscrollsBlocksText(group?.blocks)) ??
      fallback?.level ??
      parseNetherscrollsFeatureLevel(source?.level ?? source?.classLevel ?? source?.unlockLevel) ??
      null;
    if (!level) continue;

    features.push(buildInferredNetherscrollsFeature(source, {
      title: fallback?.title ?? featureTitle,
      level,
      descriptionHtml: renderNetherscrollsBlocks(group.blocks),
      inferredFrom: scope === "subclass" ? "subclass-blocks" : "class-blocks",
      choiceType: inferNetherscrollsFeatureChoiceType(featureTitle, classSource ?? source),
    }));
  }

  return features;
}

function collectNetherscrollsFeatureBlockGroups(blocks) {
  if (!Array.isArray(blocks)) return [];

  const groups = [];
  let current = null;
  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;

    if (Array.isArray(block.blocks) && (block.title || block.name)) {
      if (current) groups.push(current);
      current = null;
      groups.push({
        title: block.title ?? block.name,
        level: block.level ?? block.classLevel ?? block.unlockLevel,
        blocks: block.blocks,
      });
      continue;
    }

    const headingTitle = getNetherscrollsBlockHeadingTitle(block);
    if (headingTitle) {
      if (current) groups.push(current);
      current = {
        title: headingTitle,
        level: block.level ?? block.classLevel ?? block.unlockLevel,
        blocks: [],
      };
      continue;
    }

    if (current) current.blocks.push(block);
  }

  if (current) groups.push(current);
  return groups;
}

function getNetherscrollsBlockHeadingTitle(block) {
  const type = toTrimmedStringOrNull(block?.type)?.toLowerCase();
  if (["heading", "h1", "h2", "h3", "h4"].includes(type)) {
    return normalizeNetherscrollsInferredFeatureTitle(block?.text ?? block?.title ?? block?.name);
  }
  if (type === "html") return extractNetherscrollsFirstHtmlHeadingTitle(block?.html);
  return null;
}

function buildNetherscrollsFeatureTitleLookup(features) {
  const lookup = new Map();
  for (const feature of features) {
    const title = getNetherscrollsFeatureTitle(feature);
    lookup.set(slugifyNetherscrollsIdentifier(title), feature);
  }
  return lookup;
}

function getNetherscrollsStructuredSections(source) {
  const sections = [];
  collectNetherscrollsSections(sections, source?.sections);
  collectNetherscrollsSections(sections, source?.summary?.sections);
  collectNetherscrollsSections(sections, source?.presentation?.sections);
  return sections;
}

function collectNetherscrollsSections(target, sections) {
  if (!Array.isArray(sections)) return;
  for (const section of sections) {
    if (!section || typeof section !== "object") continue;
    target.push(section);
    collectNetherscrollsSections(target, section.sections);
  }
}

function buildNetherscrollsSectionDescription(section) {
  return joinNetherscrollsHtmlSections([
    getNetherscrollsHtmlValue(section?.descriptionHtml),
    getNetherscrollsHtmlValue(section?.contentHtml),
    getNetherscrollsHtmlValue(section?.description),
    renderNetherscrollsBlocks(section?.blocks),
  ]);
}

function buildNetherscrollsSectionText(section) {
  return [
    section?.descriptionHtml,
    section?.contentHtml,
    section?.description,
    getNetherscrollsBlocksText(section?.blocks),
  ]
    .map((value) => stripNetherscrollsHtmlTags(value))
    .filter(Boolean)
    .join(" ");
}

function parseNetherscrollsFeatureLevel(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  if (Number.isFinite(number) && number >= 1 && number <= 20) return Math.trunc(number);
  const raw = String(value);
  const match = /\b([1-9]|1[0-9]|20)(?:st|nd|rd|th)?(?:\s*[- ]?level|\s*level)?\b/i.exec(raw);
  if (!match) return null;
  return Math.max(1, Math.min(20, Math.trunc(Number(match[1]))));
}

function parseNetherscrollsFeatureLevelFromText(value) {
  const raw = toTrimmedStringOrNull(value);
  if (!raw) return null;
  const match = /\b(?:([1-9]|1[0-9]|20)(?:st|nd|rd|th)?\s*[- ]?level|level\s+([1-9]|1[0-9]|20))\b/i.exec(raw);
  if (!match) return null;
  return Math.max(1, Math.min(20, Math.trunc(Number(match[1] ?? match[2]))));
}

function stripNetherscrollsFeatureLevelPrefix(value) {
  return (
    toTrimmedStringOrNull(
      String(value ?? "").replace(
        /^\s*(?:at\s+)?(?:(?:[1-9]|1[0-9]|20)(?:st|nd|rd|th)?\s*[- ]?level(?:\s*[:.-]\s*|\s+)|(?:[1-9]|1[0-9]|20)(?:st|nd|rd|th)(?:\s*[:.-]\s*|\s+)|(?:[1-9]|1[0-9]|20)\s*[:.-]\s*)/i,
        ""
      )
    ) ?? String(value ?? "")
  );
}

function isNetherscrollsGenericClassSectionTitle(value) {
  const normalized = slugifyNetherscrollsIdentifier(value);
  return [
    "class-features",
    "subclasses",
    "creating-a-class",
    "creating-a-character",
    "hit-points",
    "proficiencies",
    "equipment",
    "starting-equipment",
    "quick-build",
    "multiclassing",
  ].includes(normalized);
}

function inferNetherscrollsFeatureChoiceType(title, source) {
  const rawSubclassType = toTrimmedStringOrNull(source?.subclassType);
  if (!rawSubclassType) return "";
  const titleKey = slugifyNetherscrollsIdentifier(title).replace(/s$/, "");
  const subclassTypeKey = slugifyNetherscrollsIdentifier(rawSubclassType).replace(/s$/, "");
  return titleKey === subclassTypeKey ? "subclass" : "";
}

function getNetherscrollsFeatureTitle(feature) {
  return toTrimmedStringOrNull(feature?.title ?? feature?.name) ?? "Class Feature";
}

function getNetherscrollsFeatureChoices(feature) {
  return Array.isArray(feature?.choices) ? feature.choices : [];
}

function normalizeNetherscrollsFeatureChoices(feature) {
  return getNetherscrollsFeatureChoices(feature).map((choice, index) => ({
    id: getNetherscrollsSourceId(choice) ?? "",
    title: getNetherscrollsFeatureChoiceTitle(choice, index),
    description: buildNetherscrollsFeatureChoiceDescription(choice),
  }));
}

function getNetherscrollsFeatureChoiceTitle(choice, index = 0) {
  if (choice && typeof choice === "object") {
    return toTrimmedStringOrNull(choice.title ?? choice.name ?? choice.label) ?? `Choice ${index + 1}`;
  }
  return toTrimmedStringOrNull(choice) ?? `Choice ${index + 1}`;
}

function buildNetherscrollsFeatureChoiceDescription(choice) {
  if (!choice || typeof choice !== "object") return "";
  return joinNetherscrollsHtmlSections([
    getNetherscrollsHtmlValue(choice?.descriptionHtml),
    getNetherscrollsHtmlValue(choice?.contentHtml),
    getNetherscrollsHtmlValue(choice?.description),
    renderNetherscrollsBlocks(choice?.blocks),
  ]);
}

function buildNetherscrollsFeatureRequirement(descriptor) {
  const level = descriptor.level;
  if (descriptor.subclassSource) {
    return `${toTrimmedStringOrNull(descriptor.subclassSource?.name) ?? "Subclass"} ${level}`;
  }
  return `${toTrimmedStringOrNull(descriptor.classSource?.name) ?? "Class"} ${level}`;
}

function getNetherscrollsClassFeatureTypeValue(descriptor) {
  return descriptor.scope === "choice" ? getNetherscrollsItemChoiceType(descriptor.parentFeature) : "class";
}

function getNetherscrollsClassFeatureSubtype(descriptor) {
  return descriptor.scope === "choice" ? getNetherscrollsItemChoiceSubtype(descriptor.parentFeature) : "";
}

function getNetherscrollsClassFeaturePrerequisiteItems(descriptor) {
  if (descriptor.scope !== "choice") return [];
  const parentTitle = getNetherscrollsFeatureTitle(descriptor.parentFeature);
  return [slugifyNetherscrollsIdentifier(parentTitle)].filter(Boolean);
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
  const normalized = new Set();
  const uniqueSections = [];
  for (const section of sections) {
    const html = toTrimmedStringOrNull(section);
    if (!html) continue;

    const key = normalizeNetherscrollsHtmlSectionKey(html);
    if (key && normalized.has(key)) continue;
    if (key) normalized.add(key);
    uniqueSections.push(html);
  }
  return uniqueSections.join("\n");
}

function normalizeNetherscrollsHtmlSectionKey(value) {
  return stripNetherscrollsHtmlTags(value)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
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
  const table =
    source?.presentation?.progressionTable ??
    source?.progressionTable ??
    source?.presentation?.progression ??
    source?.progression;
  if (!table || typeof table !== "object") return null;
  const columns = Array.isArray(table.columns) ? table.columns : [];
  const rows = Array.isArray(table.rows) ? table.rows : [];
  if (!columns.length || !rows.length) return null;
  return {
    columns,
    rows,
    spellcasting:
      table.spellcasting ??
      source?.presentation?.progressionTable?.spellcasting ??
      source?.progressionTable?.spellcasting ??
      source?.presentation?.progression?.spellcasting ??
      source?.progression?.spellcasting ??
      {},
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
  const items = choices
    .map((choice) => {
      const description = toTrimmedStringOrNull(choice.description);
      return `<li><strong>${escapeHtml(choice.title)}</strong>${description ? ` ${description}` : ""}</li>`;
    })
    .join("");
  return `<h3>Choices</h3><ul>${items}</ul>`;
}

function renderNetherscrollsBlocks(blocks) {
  if (!Array.isArray(blocks)) return "";
  return blocks.map(renderNetherscrollsBlock).filter(Boolean).join("\n");
}

function renderNetherscrollsBlock(block) {
  const type = toTrimmedStringOrNull(block?.type)?.toLowerCase();
  if (type === "p" || Array.isArray(block?.paragraphs)) {
    return (Array.isArray(block?.paragraphs) ? block.paragraphs : [])
      .map((paragraph) => `<p>${escapeHtml(String(paragraph ?? ""))}</p>`)
      .join("");
  }
  if (["heading", "h1", "h2", "h3", "h4"].includes(type)) {
    return `<h2>${escapeHtml(String(block?.text ?? block?.title ?? ""))}</h2>`;
  }
  if (type === "list") return renderNetherscrollsListBlock(block);
  if (type === "table") return renderNetherscrollsTableBlock(block);
  if (type === "html") return getNetherscrollsHtmlValue(block?.html);
  return "";
}

function renderNetherscrollsListBlock(block) {
  const items = Array.isArray(block?.items) ? block.items : [];
  if (!items.length) return "";
  const tag = block?.ordered ? "ol" : "ul";
  const html = items
    .map((item) => {
      const paragraphs = Array.isArray(item?.paragraphs) ? item.paragraphs : [item?.text ?? item?.title ?? item];
      const content = paragraphs
        .map((paragraph) => escapeHtml(String(paragraph ?? "")))
        .filter(Boolean)
        .join("<br>");
      return content ? `<li>${content}</li>` : "";
    })
    .filter(Boolean)
    .join("");
  return html ? `<${tag}>${html}</${tag}>` : "";
}

function renderNetherscrollsTableBlock(block) {
  const columns = Array.isArray(block?.columns) ? block.columns : [];
  const headerRows = Array.isArray(block?.header) ? block.header : [];
  const rows = Array.isArray(block?.rows) ? block.rows : [];
  if (!columns.length && !headerRows.length && !rows.length) return "";

  const headerSource = headerRows.length ? headerRows : columns.length ? [columns] : [];
  const header = headerSource.length
    ? `<thead>${headerSource.map((row) => `<tr>${renderNetherscrollsTableCells(row, "th")}</tr>`).join("")}</thead>`
    : "";
  const body = rows.length
    ? `<tbody>${rows.map((row) => `<tr>${renderNetherscrollsTableCells(row, "td")}</tr>`).join("")}</tbody>`
    : "";
  return `<table>${header}${body}</table>`;
}

function renderNetherscrollsTableCells(row, tag) {
  const cells = Array.isArray(row) ? row : [row];
  return cells.map((cell) => `<${tag}>${escapeHtml(formatNetherscrollsProgressionCell(cell))}</${tag}>`).join("");
}

function getNetherscrollsBlocksText(blocks) {
  if (!Array.isArray(blocks)) return "";
  return blocks.map(getNetherscrollsBlockText).filter(Boolean).join(" ");
}

function getNetherscrollsBlockText(block) {
  const type = toTrimmedStringOrNull(block?.type)?.toLowerCase();
  if (["heading", "h1", "h2", "h3", "h4"].includes(type)) {
    return toTrimmedStringOrNull(block?.text ?? block?.title ?? block?.name) ?? "";
  }
  if (type === "html") return stripNetherscrollsHtmlTags(block?.html);
  if (Array.isArray(block?.paragraphs)) return block.paragraphs.map((paragraph) => String(paragraph ?? "")).join(" ");
  if (type === "list" && Array.isArray(block?.items)) {
    return block.items
      .map((item) => (Array.isArray(item?.paragraphs) ? item.paragraphs : [item?.text ?? item?.title ?? item]))
      .flat()
      .map((paragraph) => String(paragraph ?? ""))
      .join(" ");
  }
  if (type === "table") {
    return [block?.columns, block?.header, block?.rows]
      .flat(3)
      .map((cell) => String(cell ?? ""))
      .join(" ");
  }
  return "";
}

function extractNetherscrollsFirstHtmlHeadingTitle(value) {
  const html = getNetherscrollsHtmlValue(value);
  if (!html) return null;
  const match = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i.exec(html);
  return match ? normalizeNetherscrollsInferredFeatureTitle(stripNetherscrollsHtmlTags(match[1])) : null;
}

function stripNetherscrollsHtmlTags(value) {
  const raw = toTrimmedStringOrNull(value);
  if (!raw) return "";
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  // Some API rows carry the image alongside the Foundry payload. Prefer either
  // supplied image, then use the Netherscrolls default when neither is present.
  source.img = normalizeNetherscrollsImportImagePath(source.img, source.image, item?.img, item?.image);
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
  const portableEffects = buildNetherscrollsPortableActiveEffects(source);
  if (portableEffects.length) {
    const existingEffects = Array.isArray(documentData.effects) ? documentData.effects : [];
    documentData.effects = [...existingEffects, ...portableEffects];
  }

  if (!netherscrollsId) return;
  documentData.flags = documentData.flags ?? {};
  documentData.flags.netherscrolls = {
    ...(documentData.flags.netherscrolls ?? {}),
    id: netherscrollsId,
  };
  documentData.flags[MODULE_ID] = {
    ...(documentData.flags[MODULE_ID] ?? {}),
  };

  const lastRev = normalizeNetherscrollsReferenceValue(source?.lastRev);
  if (lastRev) documentData.flags[MODULE_ID].lastRev = lastRev;
  if (Array.isArray(source?.tags)) documentData.flags[MODULE_ID].tags = source.tags;
  if (Array.isArray(source?.ability)) documentData.flags[MODULE_ID].ability = source.ability;
  if (Array.isArray(source?.classes)) documentData.flags[MODULE_ID].classes = source.classes;
  if (source?.demifeat != null) documentData.flags[MODULE_ID].demifeat = Boolean(source.demifeat);
  if (source?.isHomebrew != null) documentData.flags[MODULE_ID].isHomebrew = Boolean(source.isHomebrew);
}

function buildNetherscrollsPortableActiveEffects(source) {
  if (!source || typeof source !== "object") return [];
  const entries = [source.activeBonuses, source.activeEffects, source.effects]
    .filter(Array.isArray)
    .flat();
  const seen = new Set();
  const effects = [];
  for (const entry of entries) {
    const stat = toTrimmedStringOrNull(entry?.stat);
    const bonus = toTrimmedStringOrNull(entry?.bonus);
    if (!stat || bonus == null) continue;
    const key = toTrimmedStringOrNull(entry?._id) ?? `${stat}:${bonus}:${entry?.source ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const changes = buildNetherscrollsPortableActiveEffectChanges(stat, bonus);
    if (!changes.length) continue;
    effects.push({
      name: toTrimmedStringOrNull(entry?.source) ?? `Netherscrolls: ${stat}`,
      disabled: entry?.active === false,
      changes,
      flags: {
        [MODULE_ID]: {
          effectKey: `active-bonus:${key}`,
          portableActiveEffect: true,
          sourceStat: stat,
        },
      },
    });
  }
  return effects;
}

function buildNetherscrollsPortableActiveEffectChanges(stat, bonus) {
  const isOverride = stat.endsWith(".totalOverride");
  const target = isOverride ? stat.slice(0, -".totalOverride".length) : stat;
  const mode = isOverride ? 5 : 2; // Foundry ActiveEffect OVERRIDE / ADD.
  const change = (key) => ({ key, mode, value: bonus });

  if (target === "proficiencyBonus") return [change("system.attributes.prof")];
  if (target === "armorClass") return [change("system.attributes.ac.flat")];
  if (/^abilities\.(str|dex|con|int|wis|cha)(?:\.score)?$/.test(target)) {
    return [change(`system.${target.replace(/\.score$/, ".value")}`)];
  }
  if (/^savingThrows\.(str|dex|con|int|wis|cha)(?:\.(prof|misc|bonus))?$/.test(target)) {
    const [, ability, part] = /^savingThrows\.(str|dex|con|int|wis|cha)(?:\.(prof|misc|bonus))?$/.exec(target);
    return [change(part === "prof" ? `system.abilities.${ability}.proficient` : `system.abilities.${ability}.bonuses.save`)];
  }
  if (target === "savingThrows.all") {
    return ABILITY_KEYS.map((ability) => change(`system.abilities.${ability}.bonuses.save`));
  }
  if (target.startsWith("skills.")) {
    const [, sourceSkill, part] = /^skills\.([^.]+)(?:\.(prof|misc|bonus))?$/.exec(target) ?? [];
    const skillKey = getNetherscrollsFoundrySkillKey(sourceSkill);
    if (!skillKey) return [];
    return [change(part === "prof" ? `system.skills.${skillKey}.value` : `system.skills.${skillKey}.bonuses.check`)];
  }
  if (/^hp\.(current|max|temp)$/.test(target)) return [change(`system.attributes.${target}`)];
  if (/^currency\.(pp|gp|sp|cp)$/.test(target)) return [change(`system.${target}`)];
  const slotMatch = /^spellSlots\.(current|max)\.lvl([1-9])$/.exec(target);
  if (slotMatch) return [change(`system.spells.spell${slotMatch[2]}.${slotMatch[1] === "current" ? "value" : "max"}`)];
  return [];
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
  if (sourceItem) itemData.system.sourceItem = sourceItem;
  itemData.system.method = normalizeNetherscrollsSpellMethod(source);
  itemData.system.prepared = getNetherscrollsSpellPreparedState(source);

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
  source.system.level = getNetherscrollsSpellLevel(spell);
  source.system.identifier ??=
    netherscrollsId ? `netherscrolls-${netherscrollsId}` : slugifyNetherscrollsIdentifier(source.name);
  const schoolKey = getNetherscrollsSpellSchoolSystemKey(getNetherscrollsSpellSchool(source));
  if (schoolKey) source.system.school = schoolKey;
  source.system.ability ??= normalizeNetherscrollsSaveAbility(spell?.system?.ability ?? spell?.ability) ?? "";
  source.system.actionType ??= toTrimmedStringOrNull(spell?.system?.actionType ?? spell?.actionType) ?? "";
  source.system.method = normalizeNetherscrollsSpellMethod(spell, source);
  source.system.prepared = getNetherscrollsSpellPreparedState(spell, source);
  delete source.system.preparation;
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
  if (sourceItem) source.system.sourceItem = sourceItem;
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
}

async function ensureNetherscrollsSubclassFolderTree(pack, folderCache) {
  await findOrCreatePackFolder(pack, {
    cache: folderCache,
    name: "Subclasses",
    type: "Item",
    parent: null,
    sort: 1000,
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
    sort: 1000,
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

  if (descriptor.scope === "class" || (descriptor.scope === "choice" && !descriptor.subclassSource)) {
    return ensureNetherscrollsMainClassFeatureFolder(pack, classFolder, folderCache);
  }

  return findOrCreatePackFolder(pack, {
    cache: folderCache,
    name: toTrimmedStringOrNull(descriptor.subclassSource?.name) ?? "Subclass Features",
    type: "Item",
    parent: classFolder,
    sort: 2000,
  });
}

async function ensureNetherscrollsMainClassFeatureFolder(pack, classFolder, folderCache) {
  await pack.getIndex({ fields: ["folder", "name", "type"] }).catch(() => null);

  const existing = findPackFolder(pack, {
    name: NETHERSCROLLS_MAIN_CLASS_FEATURE_FOLDER_NAME,
    type: "Item",
    parent: classFolder,
  });
  const legacy = findPackFolder(pack, {
    name: NETHERSCROLLS_LEGACY_CLASS_FEATURE_FOLDER_NAME,
    type: "Item",
    parent: classFolder,
  });

  if (existing) {
    await updatePackFolderSort(existing, pack, 1000);
    if (legacy && getDocumentId(legacy) !== getDocumentId(existing)) {
      await movePackFolderDocuments(pack, legacy, existing);
      await deletePackFolderIfEmpty(pack, legacy);
    }
    return existing;
  }

  if (legacy) {
    if (typeof legacy.update === "function") {
      await legacy.update(
        {
          name: NETHERSCROLLS_MAIN_CLASS_FEATURE_FOLDER_NAME,
          sorting: "m",
          sort: 1000,
        },
        { pack: pack.collection }
      );
      folderCache?.set(
        getPackFolderCacheKey({
          name: NETHERSCROLLS_MAIN_CLASS_FEATURE_FOLDER_NAME,
          type: "Item",
          parent: classFolder,
        }),
        legacy
      );
      return legacy;
    }

    await updatePackFolderSort(legacy, pack, 1000);
    return legacy;
  }

  return findOrCreatePackFolder(pack, {
    cache: folderCache,
    name: NETHERSCROLLS_MAIN_CLASS_FEATURE_FOLDER_NAME,
    type: "Item",
    parent: classFolder,
    sort: 1000,
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
  const cacheKey = getPackFolderCacheKey({ name, type, parent });
  if (cache?.has(cacheKey)) return cache.get(cacheKey);

  await pack.getIndex({ fields: ["folder", "name", "type"] }).catch(() => null);
  const existing = findPackFolder(pack, { name, type, parent });

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

function getPackFolderCacheKey({ name, type, parent }) {
  const parentId = getDocumentId(parent);
  return `${parentId ?? "root"}:${type}:${name}`;
}

function findPackFolder(pack, { name, type, parent }) {
  const parentId = getDocumentId(parent);
  return getPackFolders(pack).find((folder) => {
    const folderParentId = getDocumentId(folder.folder);
    return folder.name === name && folder.type === type && folderParentId === parentId;
  });
}

async function cleanupNetherscrollsLegacyClassFeatureFolders(pack) {
  await pack.getIndex({ fields: ["folder", "name", "type"] }).catch(() => null);
  for (const folder of getPackFolders(pack)) {
    if (folder?.name !== NETHERSCROLLS_LEGACY_CLASS_FEATURE_FOLDER_NAME) continue;
    if (folder?.type !== "Item") continue;
    const target = findPackFolder(pack, {
      name: NETHERSCROLLS_MAIN_CLASS_FEATURE_FOLDER_NAME,
      type: "Item",
      parent: folder.folder,
    });
    if (target) await movePackFolderDocuments(pack, folder, target);
    await deletePackFolderIfEmpty(pack, folder);
  }
}

async function movePackFolderDocuments(pack, fromFolder, toFolder) {
  const fromFolderId = getDocumentId(fromFolder);
  const toFolderId = getDocumentId(toFolder);
  if (!fromFolderId || !toFolderId || fromFolderId === toFolderId) return 0;

  await pack.getIndex({ fields: ["folder"] }).catch(() => null);
  const entries = getPackIndexEntries(pack).filter((entry) => getDocumentId(entry.folder) === fromFolderId);
  const updates = entries
    .map((entry) => getDocumentId(entry))
    .filter(Boolean)
    .map((id) => ({
      _id: id,
      folder: toFolderId,
    }));
  if (!updates.length) return 0;

  const DocumentClass = getPackDocumentClass(pack);
  if (typeof DocumentClass?.updateDocuments !== "function") return 0;

  await DocumentClass.updateDocuments(updates, { pack: pack.collection });
  for (const entry of entries) {
    entry.folder = toFolderId;
  }
  return updates.length;
}

function getPackDocumentClass(pack) {
  const documentName = pack?.documentName ?? pack?.metadata?.type ?? "Item";
  const DocumentClass = globalThis?.[documentName];
  return DocumentClass?.implementation ?? DocumentClass ?? null;
}

async function deletePackFolderIfEmpty(pack, folder) {
  const folderId = getDocumentId(folder);
  if (!folderId || typeof folder?.delete !== "function") return false;

  await pack.getIndex({ fields: ["folder"] }).catch(() => null);
  const hasChildFolder = getPackFolders(pack).some((candidate) => getDocumentId(candidate.folder) === folderId);
  if (hasChildFolder) return false;

  const hasDocuments = getPackIndexEntries(pack).some((entry) => getDocumentId(entry.folder) === folderId);
  if (hasDocuments) return false;

  await folder.delete({ pack: pack.collection });
  return true;
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

function getPackIndexEntries(packOrIndex) {
  const index = packOrIndex?.index ?? packOrIndex;
  if (!index) return [];
  if (Array.isArray(index)) return index;
  if (Array.isArray(index.contents)) return index.contents;
  if (typeof index.values === "function") return Array.from(index.values());
  if (typeof index[Symbol.iterator] === "function") return Array.from(index);
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
  const foundryItem = getNetherscrollsFoundryItemPayload(spellData);
  const value =
    spellData?.system?.level ??
    spellData?.level ??
    spellData?.spellLevel ??
    spellData?.data?.level ??
    foundryItem?.system?.level ??
    foundryItem?.level;
  const level = Number(value);
  if (!Number.isFinite(level)) return 0;
  return Math.max(0, Math.min(NETHERSCROLLS_MAX_SPELL_LEVEL, Math.trunc(level)));
}

function normalizeNetherscrollsSpellMethod(source, fallbackSource = null) {
  const candidates = [
    source?.system?.method,
    source?.method,
    source?.system?.preparation?.mode,
    source?.preparation?.mode,
    fallbackSource?.system?.method,
    fallbackSource?.method,
    fallbackSource?.system?.preparation?.mode,
    fallbackSource?.preparation?.mode,
  ];
  const raw = candidates.map(toTrimmedStringOrNull).find(Boolean)?.toLowerCase();
  if (!raw) return "spell";

  const normalized = raw.replace(/[\s_-]+/g, "");
  if (["spell", "prepared", "always", "alwaysprepared"].includes(normalized)) return "spell";
  if (["pact", "pactmagic"].includes(normalized)) return "pact";
  if (["atwill", "innate", "ritual"].includes(normalized)) return normalized;
  // D&D5e groups unknown or blank methods under Innate Spellcasting. Invalid
  // service values must therefore fall back to ordinary leveled spellcasting.
  return "spell";
}

function getNetherscrollsSpellPreparedState(source, fallbackSource = null) {
  const method = [
    source?.system?.preparation?.mode,
    source?.preparation?.mode,
    fallbackSource?.system?.preparation?.mode,
    fallbackSource?.preparation?.mode,
  ].map(toTrimmedStringOrNull).find(Boolean)?.toLowerCase();
  if (method === "always") return 2;

  const candidates = [
    source?.system?.prepared,
    source?.prepared,
    source?.system?.preparation?.prepared,
    source?.preparation?.prepared,
    fallbackSource?.system?.prepared,
    fallbackSource?.prepared,
    fallbackSource?.system?.preparation?.prepared,
    fallbackSource?.preparation?.prepared,
  ];
  for (const value of candidates) {
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "boolean") return Number(value);
    const prepared = Number(value);
    if (Number.isFinite(prepared)) return Math.max(0, Math.min(2, Math.trunc(prepared)));
  }
  return 0;
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
    const content = `<p><strong>${safeTitle}</strong></p>${renderFoundryTransferPayload(data)}`;
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

function injectFoundryExportButtonV1(app, html) {
  if (!isFoundryExportButtonEnabled()) return;
  if (!isActorSheetApp(app)) return;
  if (!html?.closest) return;

  const appElement = html.closest(".app");
  if (!appElement?.find) return;

  const actor = getActorFromApp(app);
  if (!actor || actor.type !== "character") return;

  const header = appElement.find(".window-header");
  if (!header.length) return;
  if (header.find(".netherscrolls-export-button, .netherscrolls-import-button").length) return;

  const exportButton = $(
    `<a class="header-button netherscrolls-export-button" title="Foundry Export">
      <i class="fas fa-cloud-upload-alt"></i>Foundry Export
    </a>`
  );
  const importButton = $(
    `<a class="header-button netherscrolls-import-button" title="Foundry Import">
      <i class="fas fa-cloud-download-alt"></i>Foundry Import
    </a>`
  );

  exportButton.on("click", () => {
    exportActorToNetherscrolls(actor).catch((err) => {
      console.error(`${MODULE_ID} | Foundry Export could not be completed.`, err);
    });
  });
  importButton.on("click", () => {
    importActorFromNetherscrolls(actor).catch(() => {});
  });

  const modeSlider = header.find(".mode-slider");
  const title = header.find(".window-title");
  if (modeSlider.length) {
    modeSlider.last().after(exportButton);
  } else if (title.length) {
    title.first().before(exportButton);
  } else {
    header.prepend(exportButton);
  }
  exportButton.after(importButton);
}

function injectFoundryExportButtonV2(app, element) {
  if (!isFoundryExportButtonEnabled()) return;
  if (!isActorSheetApp(app)) return;
  if (!element?.querySelector) return;

  const actor = getActorFromApp(app);
  if (!actor || actor.type !== "character") return;

  const header =
    element.querySelector("header.window-header") ||
    element.querySelector(".window-header");
  if (!header) return;
  if (header.querySelector(".netherscrolls-export-button, .netherscrolls-import-button")) return;

  const exportButton = document.createElement("button");
  exportButton.type = "button";
  exportButton.classList.add("header-control", "netherscrolls-export-button");
  exportButton.title = "Foundry Export";
  exportButton.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><span>Foundry Export</span>';
  exportButton.addEventListener("click", () => {
    exportActorToNetherscrolls(actor).catch((err) => {
      console.error(`${MODULE_ID} | Foundry Export could not be completed.`, err);
    });
  });
  const importButton = document.createElement("button");
  importButton.type = "button";
  importButton.classList.add("header-control", "netherscrolls-import-button");
  importButton.title = "Foundry Import";
  importButton.innerHTML = '<i class="fas fa-cloud-download-alt"></i><span>Foundry Import</span>';
  importButton.addEventListener("click", () => {
    importActorFromNetherscrolls(actor).catch(() => {});
  });

  const modeSlider = header.querySelector(".mode-slider");
  const title = header.querySelector(".window-title");
  if (modeSlider) {
    modeSlider.insertAdjacentElement("afterend", exportButton);
  } else if (title) {
    title.insertAdjacentElement("beforebegin", exportButton);
  } else {
    header.prepend(exportButton);
  }
  exportButton.insertAdjacentElement("afterend", importButton);
}

async function exportActorToNetherscrolls(actor) {
  if (!actor) return;
  const actorName = toTrimmedStringOrNull(actor.name) ?? "your character";
  ui?.notifications?.info?.(`Sending ${actorName} through the Netherscrolls...`);
  try {
    const repairResult = await repairNetherscrollsActorClassFeatures(actor, { notify: false });
    if (repairResult.created > 0) {
      ui?.notifications?.info?.(`Netherscrolls added ${repairResult.created} missing class feature${repairResult.created === 1 ? "" : "s"}.`);
    }
  } catch (err) {
    console.warn(`${MODULE_ID} | Unable to repair class features before Foundry Export.`, err);
  }

  const exportPayload = buildFoundryExportPayload(actor);
  const imageJobs = collectNetherscrollsFoundryExportImageJobs(exportPayload);
  if (imageJobs.length) {
    ui?.notifications?.info?.(`${actorName}: ${imageJobs.length} image${imageJobs.length === 1 ? "" : "s"} to move to Netherscrolls.`);
  } else {
    ui?.notifications?.info?.(`${actorName}'s artwork is already ready. Sending the character sheet...`);
  }

  let preparedImageCount = 0;
  let payload;
  try {
    payload = await prepareNetherscrollsFoundryExportImages(actor, exportPayload, {
      onImageProgress: ({ label }) => {
        preparedImageCount += 1;
        ui?.notifications?.info?.(`${actorName}: moving image ${preparedImageCount} of ${imageJobs.length} (${label})...`);
      },
    });
    if (imageJobs.length) {
      ui?.notifications?.info?.(`${actorName}'s artwork is ready. Sending the character sheet...`);
    }
  } catch (err) {
    console.error(`${MODULE_ID} | Foundry Export could not prepare its images.`, err);
    ui?.notifications?.error?.(`Foundry Export could not prepare its images: ${err?.message ?? err}`);
    throw err;
  }
  if (isDebugEnabled()) {
    try {
      const content = renderFoundryTransferPayload(payload);
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content,
      });
    } catch (err) {
      console.warn(`${MODULE_ID} | Unable to post Foundry Export debug payload.`, err);
    }
  }
  return sendFoundryActorExport(actor, payload);
}

async function importActorFromNetherscrolls(actor) {
  const characterId = getActorCharacterId(actor);
  if (!characterId) {
    ui?.notifications?.warn?.("This Actor is not linked to a Netherscrolls character.");
    return null;
  }
  if (!getNetherscrollsApiKey()) {
    ui?.notifications?.warn?.("Netherscrolls API Key is missing. Set it in Module Settings.");
    return null;
  }

  try {
    ui?.notifications?.info?.(`Foundry Import: locating ${actor.name ?? "character"}...`);
    const resolved = await findNetherscrollsCampaignCharacterById(characterId);
    const importedCharacter = await hydrateNetherscrollsImportedCharacter(
      resolved.character,
      resolved.campaignId
    );
    const folder = await findOrCreateNetherscrollsCharacterFolder();
    if (!folder?.id) throw new Error("Foundry could not create the NS-Character Actor folder.");
    const result = await importNetherscrollsCampaignCharacter(importedCharacter, folder, {
      onProgress: (stage) => console.info(`${MODULE_ID} | Foundry Import | ${actor.name ?? "Character"} — ${stage}`),
    });
    ui?.notifications?.info?.(`Foundry Import succeeded: ${importedCharacter.name ?? actor.name ?? "character"}`);
    return result;
  } catch (err) {
    console.error(`${MODULE_ID} | Foundry Import failed.`, err);
    ui?.notifications?.error?.(`Foundry Import failed: ${err?.message ?? err}`);
    throw err;
  }
}

async function findNetherscrollsCampaignCharacterById(characterId) {
  const canonicalCharacterId = normalizeNetherscrollsReferenceValue(characterId);
  if (!canonicalCharacterId) throw new Error("A Netherscrolls character id is required for Foundry Import.");

  const campaigns = await fetchNetherscrollsCampaigns();
  for (const campaign of campaigns) {
    const characters = await fetchNetherscrollsCampaignCharacters(campaign.id);
    const character = characters.find((entry) => entry.id === canonicalCharacterId);
    if (character) return { campaignId: campaign.id, character };
  }
  throw new Error("The linked Netherscrolls character is not available in any campaign accessible to this API key.");
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
  const pack = await getNetherscrollsImportPack(
    item?.type === "subclass" ? "subclasses" : "classes"
  );
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
  if (key === "netherscrollsId") return document?.flags?.netherscrolls?.id ?? null;
  try {
    return document?.getFlag?.(MODULE_ID, key) ?? document?.flags?.[MODULE_ID]?.[key] ?? null;
  } catch {
    return document?.flags?.[MODULE_ID]?.[key] ?? null;
  }
}

function renderFoundryTransferPayload(payload) {
  const json = JSON.stringify(payload, null, 2);
  const escaped = escapeHtml(json);
  return `<pre class="ns-foundry-transfer-data">${escaped}</pre>`;
}

function buildFoundryExportPayload(actor) {
  if (!actor || typeof actor.toObject !== "function") {
    throw new Error("A Foundry Actor document is required for Foundry Export.");
  }

  const sourceActor = actor.toObject();
  // Class/subclass features are recreated by Netherscrolls from the selected
  // class level and subclass. They are Foundry Items of type `feat`, but are
  // not character feats and must not be exported as such.
  if (Array.isArray(sourceActor.items)) {
    sourceActor.items = sourceActor.items.filter(
      (item) => !isNetherscrollsClassFeatureForExport(item)
    );
  }
  const preparedActor = actor.toObject(false);
  return {
    schemaVersion: 2,
    systemVersion: String(game?.system?.version ?? ""),
    actor: sourceActor,
    preparedActor: {
      // Netherscrolls applies Active Effects itself. Send only the base Actor system here so effects (including race effects) are never baked into stats.
      system: duplicateNetherscrollsData(sourceActor?.system ?? {}),
      prototypeToken: preparedActor?.prototypeToken ?? {},
    },
  };
}

async function buildNetherscrollsImageReadyFoundryExportPayload(actor, options = {}) {
  const payload = buildFoundryExportPayload(actor);
  return prepareNetherscrollsFoundryExportImages(actor, payload, options);
}

async function prepareNetherscrollsFoundryExportImages(
  actor,
  payload,
  { apiKey = getNetherscrollsApiKey(), cache = new Map(), onImageProgress = null } = {}
) {
  const actorData = payload?.actor;
  if (!actorData || typeof actorData !== "object") return payload;

  const actorImage = toTrimmedStringOrNull(actorData.img);
  await replaceNetherscrollsExportImage(actor, actorData, {
    apiKey,
    cache,
    label: `${actorData.name ?? actor?.name ?? "character"} portrait`,
    isCharacter: true,
    onImageProgress,
  });
  if (actorImage && actorImage !== actorData.img) {
    replaceNetherscrollsExportTokenImage(payload?.preparedActor, actorImage, actorData.img);
  }
  await replaceNetherscrollsExportActorTokenImage(actor, actorData, payload?.preparedActor, {
    apiKey,
    cache,
    label: `${actorData.name ?? actor?.name ?? "character"} token`,
    onImageProgress,
  });

  const itemsById = new Map(
    Array.from(actor?.items ?? []).map((item) => [String(item?.id ?? item?._id ?? ""), item])
  );
  for (const itemData of Array.isArray(actorData.items) ? actorData.items : []) {
    if (!itemData || typeof itemData !== "object") continue;
    const foundryId = String(itemData._id ?? itemData.id ?? "");
    await replaceNetherscrollsExportImage(itemsById.get(foundryId) ?? null, itemData, {
      apiKey,
      cache,
      label: itemData.name ?? itemData.type ?? "item",
      onImageProgress,
    });
  }

  return payload;
}

function collectNetherscrollsFoundryExportImageJobs(payload) {
  const jobs = [];
  const seen = new Set();
  const add = (image, module, label) => {
    if (!isNetherscrollsFoundryExportUploadCandidate(image)) return;
    const key = `${module}:${image}`;
    if (seen.has(key)) return;
    seen.add(key);
    jobs.push({ image, module, label });
  };

  const actorData = payload?.actor;
  if (!actorData || typeof actorData !== "object") return jobs;
  const actorName = actorData.name ?? "character";
  add(actorData.img, "characters", `${actorName} portrait`);
  add(actorData?.prototypeToken?.texture?.src, "characters", `${actorName} token`);
  for (const itemData of Array.isArray(actorData.items) ? actorData.items : []) {
    if (!itemData || typeof itemData !== "object") continue;
    add(itemData.img, getNetherscrollsExportImageModule(itemData, false), itemData.name ?? itemData.type ?? "item");
  }
  return jobs;
}

function isNetherscrollsFoundryExportUploadCandidate(value) {
  const image = toTrimmedStringOrNull(value);
  return Boolean(
    image &&
    image !== NETHERSCROLLS_DEFAULT_IMAGE &&
    !isNetherscrollsExportSvg(image) &&
    !isNetherscrollsExportImageReference(image) &&
    isFoundryServerImageReference(image)
  );
}
async function replaceNetherscrollsExportImage(document, data, { apiKey, cache, label, isCharacter = false, onImageProgress = null }) {
  const image = toTrimmedStringOrNull(data?.img);
  if (!image || image === NETHERSCROLLS_DEFAULT_IMAGE || isNetherscrollsExportSvg(image)) return;

  const cachedSource = toTrimmedStringOrNull(data?.flags?.[MODULE_ID]?.exportedImageSource);
  const cachedKey = toTrimmedStringOrNull(data?.flags?.[MODULE_ID]?.exportedImageKey);
  const cachedUrl = toTrimmedStringOrNull(data?.flags?.[MODULE_ID]?.exportedImageUrl);
  const cachedImage = cachedKey && (cachedSource === image || cachedUrl === image)
    ? { key: cachedKey, url: cachedUrl }
    : null;
  if (!cachedImage && !isNetherscrollsFoundryExportUploadCandidate(image)) return;
  const module = getNetherscrollsExportImageModule(data, isCharacter);
  const cacheKey = `${module}:${image}`;
  const cachedUpload = cachedImage || cache.get(cacheKey);
  if (!cachedUpload) onImageProgress?.({ label, module });
  const uploadedImage = cachedUpload || await uploadNetherscrollsExportImage(image, { apiKey, label, module });
  cache.set(cacheKey, uploadedImage);

  data.img = uploadedImage.url;
  replaceNetherscrollsExportTokenImage(data, image, uploadedImage.url);
  await cacheNetherscrollsExportImage(document, image, uploadedImage, { isCharacter });
}

async function replaceNetherscrollsExportActorTokenImage(actor, actorData, preparedActor, { apiKey, cache, label, onImageProgress = null }) {
  const image = toTrimmedStringOrNull(actorData?.prototypeToken?.texture?.src);
  if (!isNetherscrollsFoundryExportUploadCandidate(image)) return;

  const cacheKey = `characters:${image}`;
  const cachedUpload = cache.get(cacheKey);
  if (!cachedUpload) onImageProgress?.({ label, module: "characters" });
  const uploadedImage = cachedUpload || await uploadNetherscrollsExportImage(image, {
    apiKey,
    label,
    module: "characters",
  });
  cache.set(cacheKey, uploadedImage);

  actorData.prototypeToken.texture.src = uploadedImage.url;
  replaceNetherscrollsExportTokenImage(preparedActor, image, uploadedImage.url);
  await cacheNetherscrollsExportActorTokenImage(actor, image, uploadedImage);
}

async function cacheNetherscrollsExportActorTokenImage(actor, source, uploadedImage) {
  if (!actor?.update) return;
  try {
    const flags = duplicateNetherscrollsData(actor.flags ?? {});
    flags[MODULE_ID] = {
      ...(flags[MODULE_ID] ?? {}),
      exportedTokenImageSource: source,
      exportedTokenImageKey: uploadedImage.key,
      exportedTokenImageUrl: uploadedImage.url ?? "",
      exportedTokenImageSha256: uploadedImage.sha256 ?? "",
    };
    await actor.update({ flags, "prototypeToken.texture.src": uploadedImage.url });
  } catch (err) {
    console.warn(`${MODULE_ID} | Unable to cache the Netherscrolls token image export reference.`, err);
    throw err;
  }
}

function replaceNetherscrollsExportTokenImage(data, source, url) {
  const tokenImage = toTrimmedStringOrNull(data?.prototypeToken?.texture?.src);
  if (!url || !tokenImage || tokenImage !== source) return;
  data.prototypeToken.texture.src = url;
}

function isNetherscrollsExportImageReference(value) {
  const image = toTrimmedStringOrNull(value);
  if (!image || image === NETHERSCROLLS_DEFAULT_IMAGE || /^image\//i.test(image)) return true;
  try {
    const hostname = new URL(image, globalThis.location?.origin ?? "http://foundry.local").hostname.toLowerCase();
    return hostname === "netherscrolls.ca" || hostname.endsWith(".netherscrolls.ca");
  } catch {
    return false;
  }
}

function isFoundryServerImageReference(value) {
  const image = toTrimmedStringOrNull(value);
  if (!image || /^(?:data|blob):/i.test(image)) return false;
  try {
    const origin = globalThis.location?.origin ?? "http://foundry.local";
    return new URL(image, origin).origin === new URL(origin).origin;
  } catch {
    return false;
  }
}

function isNetherscrollsExportSvg(value) {
  const image = toTrimmedStringOrNull(value);
  if (!image) return false;
  try {
    return /\.svg$/i.test(new URL(image, globalThis.location?.origin ?? "http://foundry.local").pathname);
  } catch {
    return /\.svg(?:[?#]|$)/i.test(image);
  }
}
function getNetherscrollsExportImageModule(data, isCharacter) {
  if (isCharacter) return "characters";
  const type = toTrimmedStringOrNull(data?.type)?.toLowerCase();
  if (["feats", "races", "backgrounds", "classes", "subclasses", "spells"].includes(type)) return type;
  const moduleByType = {
    feat: "feats",
    race: "races",
    background: "backgrounds",
    class: "classes",
    subclass: "subclasses",
    spell: "spells",
  };
  if (moduleByType[type]) return moduleByType[type];
  return "items";
}


async function uploadNetherscrollsExportImage(image, { apiKey, label, module }) {
  if (!apiKey) throw new Error("Netherscrolls API Key is missing. Set it in Module Settings.");
  const imageResponse = await fetch(image);
  if (!imageResponse?.ok) {
    throw new Error(`Could not read the image for ${label ?? "this export"} before uploading it to Netherscrolls.`);
  }
  const blob = await imageResponse.blob();
  const sha256 = await getNetherscrollsImageSha256(blob);
  const formData = new FormData();
  formData.append("image", blob, getNetherscrollsExportImageFilename(image, blob?.type));
  formData.append("module", module);
  formData.append("sha256", sha256);

  const response = await fetch(NETHERSCROLLS_MEDIA_IMAGE_ENDPOINT, {
    method: "POST",
    headers: { Accept: "application/json", "x-api-key": apiKey },
    body: formData,
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      result?.error?.message ?? result?.message ?? `Netherscrolls image upload failed for ${label ?? "this export"}.`
    );
  }
  const key = toTrimmedStringOrNull(result?.data?.key ?? result?.key);
  if (!key) throw new Error(`Netherscrolls did not return an image key for ${label ?? "this export"}.`);
  const url = toTrimmedStringOrNull(result?.data?.url ?? result?.url);
  if (!url) throw new Error(`Netherscrolls did not return an image URL for ${label ?? "this export"}.`);
  return { key, url, sha256 };
}

async function getNetherscrollsImageSha256(blob) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("This Foundry browser does not support SHA-256 image hashing.");
  const digest = await subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getNetherscrollsExportImageFilename(image, contentType) {
  try {
    const pathname = new URL(image, globalThis.location?.origin ?? "http://foundry.local").pathname;
    const filename = pathname.split("/").pop();
    if (filename && /\.[a-z0-9]{2,5}$/i.test(filename)) return filename;
  } catch {
    // Use a safe generated filename below.
  }
  const extension = String(contentType ?? "").split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "png";
  return `netherscrolls-export.${extension}`;
}

async function cacheNetherscrollsExportImage(document, source, uploadedImage, { isCharacter = false } = {}) {
  if (!document?.update) return;
  try {
    const flags = duplicateNetherscrollsData(document.flags ?? {});
    flags[MODULE_ID] = {
      ...(flags[MODULE_ID] ?? {}),
      exportedImageSource: source,
      exportedImageKey: uploadedImage.key,
      exportedImageUrl: uploadedImage.url ?? "",
      exportedImageSha256: uploadedImage.sha256 ?? "",
    };
    const changes = {
      flags,
      ...(uploadedImage.url ? { img: uploadedImage.url } : {}),
    };
    const tokenImage = toTrimmedStringOrNull(document?.prototypeToken?.texture?.src);
    if (isCharacter && uploadedImage.url && tokenImage === source) {
      changes["prototypeToken.texture.src"] = uploadedImage.url;
    }
    await document.update(changes);
  } catch (err) {
    console.warn(`${MODULE_ID} | Unable to cache the Netherscrolls image export reference.`, err);
    if (isCharacter) throw err;
  }
}

function toTrimmedStringOrNull(value) {
  if (value == null) return null;
  const str = String(value).trim();
  return str ? str : null;
}

function normalizeNetherscrollsName(name) {
  if (!name) return "";
  return String(name)
    .replace(/\s*\(Legacy\)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getItemNetherId(item) {
  return normalizeNetherscrollsReferenceValue(item?.flags?.netherscrolls?.id);
}

async function setItemNetherId(item, id) {
  return setNetherscrollsItemIdentifiers(item, { id });
}

async function setNetherscrollsItemIdentifiers(item, { id = null, classId = null } = {}) {
  try {
    if (!item?.update) return;
    const canonicalId = normalizeNetherscrollsReferenceValue(id);
    const canonicalClassId = normalizeNetherscrollsReferenceValue(classId);
    const currentId = normalizeNetherscrollsReferenceValue(item?.flags?.netherscrolls?.id);
    const currentClassId = normalizeNetherscrollsReferenceValue(
      item?.flags?.netherscrolls?.classId
    );
    const needsId = Boolean(canonicalId && currentId !== canonicalId);
    const needsClassId = Boolean(
      canonicalClassId &&
      item?.type === "subclass" &&
      currentClassId !== canonicalClassId
    );
    if (!needsId && !needsClassId) return;

    const flags = duplicateNetherscrollsData(item?.flags ?? {});
    flags.netherscrolls = {
      ...(flags.netherscrolls ?? {}),
      ...(needsId ? { id: canonicalId } : {}),
      ...(needsClassId ? { classId: canonicalClassId } : {}),
    };
    await item.update({ flags });
  } catch (err) {
    console.warn(`${MODULE_ID} | Unable to write canonical Netherscrolls Item flags.`, err);
    throw err;
  }
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
  return normalizeNetherscrollsReferenceValue(actor?.flags?.netherscrolls?.characterId);
}

async function setActorCharacterId(actor, characterId) {
  try {
    const canonicalId = normalizeNetherscrollsReferenceValue(characterId);
    if (!actor?.update || !canonicalId) return;
    const current = normalizeNetherscrollsReferenceValue(
      actor?.flags?.netherscrolls?.characterId
    );
    if (current === canonicalId) return;
    const flags = duplicateNetherscrollsData(actor?.flags ?? {});
    flags.netherscrolls = {
      ...(flags.netherscrolls ?? {}),
      characterId: canonicalId,
    };
    await actor.update({ flags });
  } catch (err) {
    console.warn(`${MODULE_ID} | Unable to set actor flags.netherscrolls.characterId.`, err);
    throw err;
  }
}

async function sendFoundryActorExport(actor, payload = buildFoundryExportPayload(actor)) {
  const apiKey = getNetherscrollsApiKey();
  if (!apiKey) {
    ui?.notifications?.warn?.(
      "Netherscrolls API Key is missing. Set it in Module Settings."
    );
    throw new Error("Netherscrolls API Key is missing.");
  }

  try {
    const data = await requestNetherscrollsJson(NETHERSCROLLS_EXPORT_ENDPOINT, {
      method: "POST",
      apiKey,
      body: payload,
      operation: "Foundry Export",
    });

    if (data && isDebugEnabled()) {
      const responseContent = renderFoundryTransferPayload(data);
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: responseContent,
      });
    }
    await applyFoundryExportCanonicalIds(actor, data);
    const name = data?.data?.name ?? actor?.name ?? "actor";
    ui?.notifications?.info?.(`${name} has arrived safely in Netherscrolls!`);
    return data;
  } catch (err) {
    console.error(`${MODULE_ID} | Foundry Export failed.`, err);
    ui?.notifications?.error?.(`Foundry Export failed: ${err?.message ?? err}`);
    throw err;
  }
}

async function exportNetherscrollsCampaignActors(campaignId, actors, { retryFailedOnce = true } = {}) {
  const canonicalCampaignId = normalizeNetherscrollsReferenceValue(campaignId);
  if (!canonicalCampaignId) throw new Error("A Netherscrolls campaign id is required for batch Foundry Export.");
  const apiKey = getNetherscrollsApiKey();
  if (!apiKey) throw new Error("Netherscrolls API Key is missing. Set it in Module Settings.");

  let pending = Array.from(actors ?? [])
    .filter((actor) => actor?.type === "character")
    .map((actor, originalIndex) => ({ actor, originalIndex }));
  if (!pending.length) throw new Error("No Foundry character Actors were selected for Export.");
  if (pending.length > 100) throw new Error("Foundry Export supports at most 100 characters per campaign batch.");

  const succeeded = [];
  let failed = [];
  const imageUploadCache = new Map();
  const maximumAttempts = retryFailedOnce ? 2 : 1;
  for (let attempt = 1; attempt <= maximumAttempts && pending.length; attempt += 1) {
    const endpoint = `${NETHERSCROLLS_CAMPAIGNS_ENDPOINT}/${encodeURIComponent(canonicalCampaignId)}/characters/export`;
    const requestPayload = {
      characters: await Promise.all(
        pending.map(async (entry) => {
          entry.payload ??= await buildNetherscrollsImageReadyFoundryExportPayload(entry.actor, {
            apiKey,
            cache: imageUploadCache,
          });
          return entry.payload;
        })
      ),
    };
    const { data: responseBody, status } = await requestNetherscrollsJson(endpoint, {
      method: "POST",
      apiKey,
      body: requestPayload,
      operation: "Campaign Foundry Export",
      includeStatus: true,
    });
    if (status !== 200 && status !== 207) {
      throw new Error(`Campaign Foundry Export returned unexpected HTTP ${status}.`);
    }

    const entries = Array.isArray(responseBody?.data) ? responseBody.data : [];
    const resultsByIndex = new Map(entries.map((entry) => [Number(entry?.index), entry]));
    failed = [];
    for (const [requestIndex, pendingEntry] of pending.entries()) {
      const result = resultsByIndex.get(requestIndex);
      const ok = status === 200 ? result?.ok !== false : result?.ok === true;
      if (!result || !ok) {
        failed.push({
          ...pendingEntry,
          error: result?.error ?? {
            status,
            code: "FOUNDRY_EXPORT_RESULT_MISSING",
            message: "The API did not return a successful result for this entry.",
          },
        });
        continue;
      }
      await applyFoundryExportCanonicalIds(pendingEntry.actor, result);
      succeeded.push({
        actor: pendingEntry.actor,
        originalIndex: pendingEntry.originalIndex,
        result,
      });
    }

    if (status === 200 && failed.length) {
      throw new Error("A 200 campaign Foundry Export response contained a failed or missing entry.");
    }
    pending = failed.map(({ actor, originalIndex }) => ({ actor, originalIndex }));
  }

  return {
    succeeded,
    failed,
  };
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

async function applyFoundryExportCanonicalIds(actor, response) {
  if (!actor || !response) return;
  const characterId = normalizeNetherscrollsReferenceValue(response?.data?.characterId);
  if (characterId) await setActorCharacterId(actor, characterId);

  const repairs = [
    ...collectFoundryExportItemRepairs(response?.linked),
    ...collectFoundryExportItemRepairs(response?.resolved),
  ];
  const appliedKeys = new Set();
  for (const repair of repairs) {
    const canonicalId = normalizeNetherscrollsReferenceValue(repair.id);
    if (!canonicalId) continue;
    const item = findFoundryExportRepairItem(actor, repair);
    if (!item) {
      console.warn(`${MODULE_ID} | Foundry Export returned an id that could not be matched to an embedded Item.`, repair);
      continue;
    }
    const repairKey = `${item.id ?? item._id}:${canonicalId}:${repair.classId ?? ""}`;
    if (appliedKeys.has(repairKey)) continue;
    appliedKeys.add(repairKey);
    await setNetherscrollsItemIdentifiers(item, {
      id: canonicalId,
      classId: repair.classId,
    });
  }
}

function collectFoundryExportItemRepairs(container) {
  if (!container || typeof container !== "object") return [];
  const repairs = [];
  const append = (value, type = null, classId = null) => {
    for (const row of Array.isArray(value) ? value : value ? [value] : []) {
      if (!row || typeof row !== "object") continue;
      repairs.push({
        id: row.id ?? row.netherscrollsId,
        foundryId: row.foundryId,
        name: row.name,
        type: row.type ?? row.foundryType ?? type,
        classId: row.classId ?? classId,
      });
    }
  };

  append(container.race, "race");
  append(container.background, "background");
  append(container.items);
  append(container.spells, "spell");
  append(container.feats, "feat");
  append(container.subclasses, "subclass");
  for (const classLink of Array.isArray(container.classes) ? container.classes : []) {
    append(classLink, "class");
    append(classLink?.subclass, "subclass", classLink?.id ?? classLink?.netherscrollsId);
    append(classLink?.subclasses, "subclass", classLink?.id ?? classLink?.netherscrollsId);
  }
  return repairs;
}

function findFoundryExportRepairItem(actor, repair) {
  const actorItems = Array.from(actor?.items ?? []);
  const foundryId = toTrimmedStringOrNull(repair?.foundryId);
  if (foundryId) {
    const exact = actor?.items?.get?.(foundryId) ??
      actorItems.find((item) => String(item?.id ?? item?._id ?? "") === foundryId);
    if (exact) return exact;
  }

  const type = toTrimmedStringOrNull(repair?.type)?.toLowerCase() ?? null;
  const name = normalizeNetherscrollsName(repair?.name).toLowerCase();
  const candidates = actorItems.filter((item) => {
    if (type && String(item?.type ?? "").toLowerCase() !== type) return false;
    if (name && normalizeNetherscrollsName(item?.name).toLowerCase() !== name) return false;
    return Boolean(type || name);
  });
  return candidates.length === 1 ? candidates[0] : null;
}
