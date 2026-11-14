/**
 * Define the native stat vocabulary, accepted aliases, and primitive helpers.
 * Each rules runtime receives its own tables rather than depending on Foundry globals.
 */

/** Create effect definitions. */
function createEffectDefinitions() {
  const MODULE = "netherscrolls-module";

  const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];

  const SKILLS = {
    acrobatics: ["acr", "dex"],
    animalHandling: ["ani", "wis"],
    arcana: ["arc", "int"],
    athletics: ["ath", "str"],
    deception: ["dec", "cha"],
    history: ["his", "int"],
    insight: ["ins", "wis"],
    intimidation: ["itm", "cha"],
    investigation: ["inv", "int"],
    medicine: ["med", "wis"],
    nature: ["nat", "int"],
    perception: ["prc", "wis"],
    performance: ["prf", "cha"],
    persuasion: ["per", "cha"],
    religion: ["rel", "int"],
    sleightOfHand: ["slt", "dex"],
    stealth: ["ste", "dex"],
    survival: ["sur", "wis"],
  };

  const TOOLS = {
    alchemistsSupplies: ["alchemist", "int"],
    brewersSupplies: ["brewer", "int"],
    calligraphersSupplies: ["calligrapher", "dex"],
    carpentersTools: ["carpenter", "str"],
    cartographersTools: ["cartographer", "wis"],
    cobblersTools: ["cobbler", "dex"],
    cooksUtensils: ["cook", "wis"],
    glassblowersTools: ["glassblower", "int"],
    jewelersTools: ["jeweler", "int"],
    leatherworkersTools: ["leatherworker", "dex"],
    masonsTools: ["mason", "str"],
    paintersSupplies: ["painter", "wis"],
    pottersTools: ["potter", "wis"],
    smithsTools: ["smith", "str"],
    tinkersTools: ["tinker", "dex"],
    weaversTools: ["weaver", "dex"],
    woodcarversTools: ["woodcarver", "dex"],
    disguiseKit: ["disg", "cha"],
    forgeryKit: ["forg", "dex"],
    herbalismKit: ["herb", "int"],
    navigatorsTools: ["navg", "wis"],
    poisonersKit: ["pois", "int"],
    thievesTools: ["thief", "dex"],
    diceSet: ["dice", "wis"],
    dragonchessSet: ["chess", "wis"],
    playingCardSet: ["card", "wis"],
    threeDragonAnteSet: ["dragon", "wis"],
    bagpipes: ["bagpipes", "cha"],
    drum: ["drum", "cha"],
    dulcimer: ["dulcimer", "cha"],
    flute: ["flute", "cha"],
    horn: ["horn", "cha"],
    lute: ["lute", "cha"],
    lyre: ["lyre", "cha"],
    panFlute: ["panflute", "cha"],
    shawm: ["shawm", "cha"],
    viol: ["viol", "cha"],
  };

  const SKILL_BY_FOUNDRY = Object.fromEntries(
    Object.entries(SKILLS).map(
      /** Transform each entry while create effect definitions. */ ([key, [foundry]]) => [
        foundry,
        key,
      ]
    )
  );

  const TOOL_BY_FOUNDRY = Object.fromEntries(
    Object.entries(TOOLS).map(
      /** Transform each entry while create effect definitions. */ ([key, [foundry]]) => [
        foundry,
        key,
      ]
    )
  );

  const FILTERS = {
    spellClasses: "spellClass",
    featureTags: "featureTags",
    rollTypes: "rollType",
    attackKinds: "attackKind",
    damageTypes: "damageType",
    weaponIds: "weaponId",
    against: "against",
  };

  // Formula functions and their [minimum, maximum] argument counts (docs: feature formulas).
  const FUNCTIONS = { max: [2, 10], min: [2, 10], floor: [1, 1], ceil: [1, 1], dice: [2, 2] };

  const FEATURE_REFERENCE =
    /^(?:class\.level|classes\.([a-z][a-z0-9]*)\.level|level\.total|attunement\.count)$/i;

  // Foundry ActiveEffect change modes, by numeric value.
  const FOUNDRY_MODES = ["custom", "multiply", "add", "downgrade", "upgrade", "override"];

  const ORDERED_MODES = new Set(["multiply", "downgrade", "upgrade"]);

  const ABILITY = "(str|dex|con|int|wis|cha)";

  // Grant stats (docs: characters, grant stats): sets and roll modes, `grant` instead of `bonus`.
  // Set grants and the D&D5e trait each one adds to.
  const TRAIT_GRANTS = {
    "resistances.damage": "dr.value",
    "immunities.damage": "di.value",
    "vulnerabilities.damage": "dv.value",
    "immunities.condition": "ci.value",
    "resistances.damageBypasses": "dr.bypasses",
    languages: "languages.value",
    "proficiencies.weapon": "weaponProf.value",
    "proficiencies.armor": "armorProf.value",
  };

  const DAMAGE_TYPES = new Set([
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
  ]);

  const CONDITIONS = new Set([
    "blinded",
    "charmed",
    "deafened",
    "diseased",
    "exhaustion",
    "frightened",
    "grappled",
    "incapacitated",
    "invisible",
    "paralyzed",
    "petrified",
    "poisoned",
    "prone",
    "restrained",
    "stunned",
    "unconscious",
  ]);

  const ABILITY_NAMES = {
    strength: "str",
    dexterity: "dex",
    constitution: "con",
    intelligence: "int",
    wisdom: "wis",
    charisma: "cha",
  };

  const ROLL_MODE_STAT = new RegExp(
    `^(?:initiative|(?:skills|tools)\\.[^.]+|savingThrows\\.(?:${ABILITY.slice(1, -1)}|all))\\.rollMode$|^abilities\\.${ABILITY}\\.checkRollMode$`
  );

  const TOOL_ABILITY_STAT = /^tools\.([^.]+)\.ability$/;

  // Mode stats (docs: characters, mode stats): numbers whose effects may set a Foundry-style mode.
  const MOVEMENT = ["walk", "fly", "swim", "climb", "burrow"];

  const SENSES = ["darkvision", "blindsight", "tremorsense", "truesight"];

  const MODE_STAT = new RegExp(
    `^(?:speed\\.(?:${MOVEMENT.join("|")})|senses\\.(?:${SENSES.join("|")})|abilities\\.${ABILITY}\\.max)$`
  );

  // Additive check and damage bonuses with no stored base value.
  const BONUS_STAT = new RegExp(
    `^(?:checks\\.(?:all|${ABILITY.slice(1, -1)})|Damage(?:Str|Dext|Magic))\\.bonus$`
  );

  const clone = /** Handle clone. */ (value) => JSON.parse(JSON.stringify(value ?? {}));

  const number = /** Handle number. */ (value) =>
    Number.isFinite(Number(value)) ? Number(value) : 0;

  const get = /** Retrieve. */ (value, path) =>
    path
      .split(".")
      .reduce(
        /** Combine entries into a result while create effect definitions. */ (v, key) => v?.[key],
        value
      );

  const list = /** Handle list. */ (value) =>
    Array.isArray(value)
      ? value
      : (value?.contents ??
        (typeof value?.values === "function"
          ? [...value.values()]
          : value && typeof value === "object"
            ? Object.values(value)
            : []));

  const safeKey = /** Handle safe key. */ (key) =>
    /^[a-z][a-z0-9]*$/i.test(key) && !["constructor", "prototype", "__proto__"].includes(key);

  const safeStatKey = /** Handle safe stat key. */ (key) =>
    /^[a-z][a-z0-9_-]*$/i.test(key) && !["constructor", "prototype", "__proto__"].includes(key);

  const slug = /** Handle slug. */ (value) =>
    String(value ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  return {
    ABILITIES,
    ABILITY,
    ABILITY_NAMES,
    BONUS_STAT,
    CONDITIONS,
    DAMAGE_TYPES,
    FEATURE_REFERENCE,
    FILTERS,
    FOUNDRY_MODES,
    FUNCTIONS,
    MODE_STAT,
    MODULE,
    MOVEMENT,
    ORDERED_MODES,
    ROLL_MODE_STAT,
    SENSES,
    SKILLS,
    SKILL_BY_FOUNDRY,
    TOOLS,
    TOOL_ABILITY_STAT,
    TOOL_BY_FOUNDRY,
    TRAIT_GRANTS,
    clone,
    get,
    list,
    number,
    safeKey,
    safeStatKey,
    slug,
  };
}

export { createEffectDefinitions };
