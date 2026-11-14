// Run with: node --experimental-vm-modules scripts/check-module-structure.cjs
// Use actual ESM scopes to detect missing imports that a shared-script harness cannot see.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const clone = /** Handle clone. */ (value) => JSON.parse(JSON.stringify(value));

/** Handle merge. */
function merge(target, source) {
  for (const [key, value] of Object.entries(source ?? {})) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== "object") target[key] = {};
      merge(target[key], value);
    } else target[key] = value;
  }
  return target;
}

/** Load the shipped entry in one isolated Foundry-like realm, preserving native ESM bindings. */
async function loadModuleRuntime() {
  if (typeof vm.SourceTextModule !== "function") {
    throw new Error("Run with --experimental-vm-modules to validate production ES module scopes.");
  }
  const once = new Map();
  const on = new Map();
  const settings = new Map();
  const values = new Map();
  const timers = new Map();
  let nextTimer = 0;
  const addHook = /** Add hook. */ (map, name, callback) => {
    if (!map.has(name)) map.set(name, []);
    map.get(name).push(callback);
    return callback;
  };
  class ApplicationV2 {}
  const context = vm.createContext({
    console: {
      /** Log. */ log() {},
      /** Handle info. */ info() {},
      /** Handle debug. */ debug() {},
      /** Handle warn. */ warn() {},
      /** Handle error. */ error() {},
    },
    URL,
    URLSearchParams,
    TextEncoder,
    Blob,
    crypto: require("node:crypto").webcrypto,
    setTimeout: /** Update timeout. */ (callback) => {
      timers.set(++nextTimer, callback);
      return nextTimer;
    },
    clearTimeout: /** Clear timeout. */ (timer) => timers.delete(timer),
    document: {},
    window: {},
    FormApplication: class {},
    Application: class {},
    Hooks: {
      once: /** Handle once. */ (name, callback) => addHook(once, name, callback),
      on: /** Handle. */ (name, callback) => addHook(on, name, callback),
      /** Handle off. */
      off(name, callback) {
        on.set(
          name,
          (on.get(name) ?? []).filter(
            /** Keep entries that satisfy the condition while load module runtime. */ (fn) =>
              fn !== callback
          )
        );
      },
    },
    foundry: {
      utils: {
        deepClone: clone,
        duplicate: clone,
        mergeObject: /** Handle merge object. */ (a, b) => merge(clone(a), b),
        getProperty: /** Retrieve property. */ (object, field) =>
          field
            .split(".")
            .reduce(
              /** Combine entries into a result while load module runtime. */ (value, key) =>
                value?.[key],
              object
            ),
        randomID: /** Handle random id. */ () => "0123456789abcdef",
      },
      applications: {
        api: {
          ApplicationV2,
          HandlebarsApplicationMixin: /** Handle handlebars application mixin. */ (Base) =>
            class extends Base {},
        },
        sidebar: { AbstractSidebarTab: class {} },
      },
    },
    game: {
      settings: {
        get: /** Retrieve. */ (_module, key) => values.get(key),
        set: /** Update. */ async (_module, key, value) => {
          values.set(key, value);
          return value;
        },
        /** Register. */
        register(_module, key, definition) {
          assert.equal(settings.has(key), false, `Duplicate setting: ${key}`);
          settings.set(key, definition);
          if (!values.has(key)) values.set(key, definition.default);
        },
        /** Register menu. */
        registerMenu() {},
      },
      modules: new Map(),
      packs: new Map(),
      actors: [],
      user: { id: "gm", isGM: true },
      users: { activeGM: { id: "gm" } },
      system: { id: "dnd5e", version: "5.3.3" },
    },
    CONFIG: { DND5E: {}, ui: { sidebar: { TABS: { chat: {}, settings: {} } } } },
    ui: {
      notifications: {
        /** Handle warn. */ warn() {},
        /** Handle error. */ error() {},
        /** Handle info. */ info() {},
      },
    },
  });
  const modules = new Map();
  const graph = new Map();
  /** Resolve. */
  function resolve(specifier, parent = path.join(root, "index.js")) {
    assert.ok(specifier.startsWith("."), `Runtime imports must be relative: ${specifier}`);
    const file = path.resolve(path.dirname(parent), specifier);
    const relative = path.relative(root, file);
    assert.ok(
      !relative.startsWith("..") && !path.isAbsolute(relative),
      `Import escapes the module: ${specifier}`
    );
    assert.equal(
      path.extname(file),
      ".js",
      `Only runtime JavaScript may be imported: ${specifier}`
    );
    return file;
  }
  /** Collect. */
  function collect(file) {
    if (modules.has(file)) return modules.get(file);
    const module = new vm.SourceTextModule(fs.readFileSync(file, "utf8"), {
      context,
      identifier: file,
    });
    modules.set(file, module);
    const dependencies = module.dependencySpecifiers.map(
      /** Transform each entry while collect. */ (specifier) => resolve(specifier, file)
    );
    graph.set(file, dependencies);
    for (const dependency of dependencies) collect(dependency);
    return module;
  }
  const entry = collect(path.join(root, "index.js"));
  await entry.link(
    /** Perform the callback while load module runtime. */ (specifier, parent) =>
      modules.get(resolve(specifier, parent.identifier))
  );
  await entry.evaluate();
  return { context, modules, graph, once, on, settings, values, timers };
}

/** Fail with the actual import path if a dependency cycle is introduced later. */
function verifyAcyclicImports(graph) {
  const completed = new Set();
  const visiting = [];
  /** Handle visit. */
  function visit(file) {
    assert.ok(
      !visiting.includes(file),
      `Circular imports: ${[...visiting, file].map(/** Transform each entry while handle visit. */ (f) => path.relative(root, f)).join(" -> ")}`
    );
    if (completed.has(file)) return;
    visiting.push(file);
    for (const dependency of graph.get(file) ?? []) visit(dependency);
    visiting.pop();
    completed.add(file);
  }
  for (const file of graph.keys()) visit(file);
}

/** Keep private runtime extraction compatible with callers of the established global API. */
function verifyEffectApi(context) {
  const native = context.NetherscrollsEffects;
  const keys = /** Handle keys. */ (object) => Object.keys(object).sort();
  assert.deepEqual(
    keys(native).filter(
      /** Keep entries that satisfy the condition while verify effect api. */ (key) =>
        !["features", "foundry"].includes(key)
    ),
    `MODULE ABILITIES SKILLS TOOLS FILTERS FUNCTIONS TRAIT_GRANTS MOVEMENT SENSES
     parseFormula formulaValue serialize featureReference hasFeatureReference bindFeatureReferences
     canonicalTarget referenceTarget diceAllowed isGrantStat isModeStat grantValue rollMode
     matchesFilters hasFilters resolve clone get list number slug stableId foundryMode foundryFormula
     foundryTargets fromFoundryChange toFoundryChanges createEffect translateItem eligible`
      .trim()
      .split(/\s+/)
      .sort()
  );
  assert.deepEqual(
    keys(native.features),
    `pick formula maximum uses build translateItem identity plan prepareActor prepareActivity
     initializeActor definition`
      .trim()
      .split(/\s+/)
      .sort()
  );
  assert.deepEqual(
    keys(native.foundry),
    `prepare sourceCharacter collect collectState contextFor modifyRoll prepareDC install rollNative
     inspect states adjustPool endEffect expireEvent expireTurns hasNative exportState exportEffects
     exportBaseValues isForeignMirror rollHitDie onPreCreateActiveEffect levelsOf ownerScope
     installAttributeAdapters`
      .trim()
      .split(/\s+/)
      .sort()
  );

  return native;
}

/** Verify module structure. */
async function verifyModuleStructure() {
  const runtime = await loadModuleRuntime();
  const { context, modules, graph, once, on, settings, values } = runtime;
  const namespace = /** Handle namespace. */ (file) => modules.get(path.join(root, file)).namespace;
  verifyAcyclicImports(graph);

  // Every runtime file must be reachable and the release must discover nested scripts.
  function verifyReachable(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) verifyReachable(file);
      else if (entry.name.endsWith(".js"))
        assert.ok(modules.has(file), `Unreachable runtime file: ${file}`);
    }
  }
  verifyReachable(path.join(root, "scripts"));
  const workflow = fs.readFileSync(path.join(root, ".github/workflows/release.yml"), "utf8");
  assert.match(workflow, /find scripts -type f -name '\*\.js' -print0/);

  const hooks = namespace("scripts/core/hooks.js");
  const before = JSON.stringify(
    [...once].map(
      /** Transform each entry while verify module structure. */ ([event, callbacks]) => [
        event,
        callbacks.length,
      ]
    )
  );
  const beforeOn = JSON.stringify(
    [...on].map(
      /** Transform each entry while verify module structure. */ ([event, callbacks]) => [
        event,
        callbacks.length,
      ]
    )
  );
  hooks.registerNetherscrollsHooks();
  assert.equal(
    JSON.stringify(
      [...once].map(
        /** Transform each entry while verify module structure. */ ([event, callbacks]) => [
          event,
          callbacks.length,
        ]
      )
    ),
    before
  );
  assert.equal(
    JSON.stringify(
      [...on].map(
        /** Transform each entry while verify module structure. */ ([event, callbacks]) => [
          event,
          callbacks.length,
        ]
      )
    ),
    beforeOn
  );
  for (const callback of once.get("init") ?? []) await callback();
  for (const callback of once.get("setup") ?? []) await callback();
  for (const callback of once.get("ready") ?? []) await callback();
  assert.deepEqual(
    [...settings.keys()].sort(),
    [
      "debugMode",
      "devEnhancedDamage",
      "foundryImportQueueCampaignIdsV1",
      "npcDeathSaveEachTurn",
      "nsApiKey",
      "nsGuildId",
      "nsGuildName",
      "nsLibraryImportDatesV1",
      "pollFoundryImportQueue",
      "pollFoundryImportQueueSafetyResetV1",
      "rerollInitEachRound",
      "showFoundryExportButton",
    ].sort()
  );
  assert.deepEqual(Object.keys(context.CONFIG.ui.sidebar.TABS), [
    "chat",
    "netherscrolls-sidebar",
    "settings",
  ]);
  assert.equal(context.NETHERSCROLLS_DEV_CHECK, "kiwi12");

  // Cross-file conversions exercise helper imports that link successfully but are only read on use.
  const id = "a".repeat(24);
  const item = namespace("scripts/data/items.js").normalizeNetherscrollsItemData({
    _id: id,
    name: "Dagger",
    type: "weapon",
  });
  assert.equal(item.type, "weapon");
  assert.equal(item.flags.netherscrolls.id, id);
  const spell = namespace("scripts/data/spells.js").normalizeNetherscrollsSpellData({
    _id: id,
    name: "Flame",
    level: 1,
    description: "Make a ranged spell attack. The target takes 2d6 fire damage.",
  });
  assert.equal(spell.type, "spell");
  assert.ok(Object.keys(spell.system.activities).length);
  const cls = namespace("scripts/data/classes.js").normalizeNetherscrollsClassData(
    {
      _id: id,
      name: "Fighter",
      hitDie: "d10",
      classFeatures: [],
    },
    { featureUuidByKey: new Map() }
  );
  assert.equal(cls.type, "class");
  const actor = { type: "character", name: "Probe", system: {}, flags: {}, prototypeToken: {} };
  namespace("scripts/data/character.js").normalizeNetherscrollsCharacterActorCreationData(actor, {
    _id: id,
    name: "Probe",
    abilities: { str: { score: 14 } },
    hp: { current: 10, max: 10 },
    advanced: { senses: { darkvision: 60 } },
  });
  assert.equal(actor.system.attributes.senses.darkvision, 60);

  const native = verifyEffectApi(context);
  const preparedActor = {
    type: "character",
    name: "Effects probe",
    system: {},
    flags: {},
    prototypeToken: {},
  };
  namespace("scripts/data/character.js").normalizeNetherscrollsCharacterActorCreationData(
    preparedActor,
    { _id: "b".repeat(24), abilities: { str: { score: 14 } }, hp: { current: 10, max: 10 } }
  );
  preparedActor._source = clone(preparedActor);
  preparedActor.items = [];
  preparedActor.effects = [
    native.createEffect({ stat: "abilities.str.score", bonus: 2 }, { actor: true }),
  ];
  native.foundry.prepare(preparedActor);
  assert.equal(preparedActor.system.abilities.str.value, 16);
  native.foundry.prepare(preparedActor);
  assert.equal(
    preparedActor.system.abilities.str.value,
    16,
    "Repeated preparation must not stack bonuses"
  );
  preparedActor.effects = [];
  native.foundry.prepare(preparedActor);
  assert.equal(
    preparedActor.system.abilities.str.value,
    14,
    "Removing an effect restores the source base"
  );

  const featureActivity = native.features.build(
    {
      name: "Probe attack",
      featureType: "attack",
      attackModifier: "str",
      attackBonus: 0,
      attackDamage: [{ formula: "1d6", damageType: "Magical Piercing" }],
      usage: { maxCharge: "class.level", rechargeType: "shortRest", rechargeAll: true },
    },
    { attack: { type: { value: "ranged", classification: "weapon" } } },
    { classLevel: 3 }
  );
  assert.equal(featureActivity.attack.type.value, "ranged");
  assert.equal(featureActivity.damage.parts[0].types[0], "piercing");
  assert.equal(featureActivity.uses.recovery[0].period, "sr");

  const client = namespace("scripts/api/client.js");
  values.set("nsApiKey", "test-key");
  values.set("nsGuildId", id);
  const requests = [];
  context.fetch = /** Perform the callback while verify module structure. */ async (
    url,
    options
  ) => {
    requests.push({ url, options });
    return { ok: true, status: 204 };
  };
  assert.equal(
    await client.requestNetherscrollsJson("https://example.invalid/ack", { method: "POST" }),
    null
  );
  assert.equal(requests[0].options.headers["x-guild-id"], id);
  await client.requestNetherscrollsJson("https://example.invalid/account", { guildId: "" });
  assert.equal(requests[1].options.headers["x-guild-id"], undefined);

  // The shared exclusion state must remain live across independently scoped workflow modules.
  const state = namespace("scripts/import/transfer-state.js");
  const library = namespace("scripts/import/library.js");
  state.netherscrollsQueuePollState.running = true;
  await assert.rejects(
    library.replaceNetherscrollsLibrary([{ typeKey: "items" }]),
    /current character transfer/
  );
  state.netherscrollsQueuePollState.running = false;
  state.netherscrollsLibraryReplacementState.active = true;
  await assert.rejects(
    library.replaceNetherscrollsLibrary([{ typeKey: "items" }]),
    /already running/
  );
  state.netherscrollsLibraryReplacementState.active = false;

  return { modules: modules.size, cycles: 0, settings: settings.size };
}

if (require.main === module) {
  verifyModuleStructure()
    .then(
      /** Handle the completed operation. */ (result) => {
        console.log(
          `ESM checks passed: ${result.modules} runtime files, no import cycles, ${result.settings} settings.`
        );
      }
    )
    .catch(
      /** Handle the operation failure. */ (error) => {
        console.error(error);
        process.exitCode = 1;
      }
    );
}

module.exports = { loadModuleRuntime, verifyAcyclicImports, verifyModuleStructure };
