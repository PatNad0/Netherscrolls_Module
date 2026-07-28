const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

const MODULE_ID = "netherscrolls-module";
const clone = (value) => JSON.parse(JSON.stringify(value ?? {}));
const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);
const merge = (base, override) => {
  if (!isObject(base) || !isObject(override)) return clone(override);
  const result = clone(base);
  for (const [key, value] of Object.entries(override)) {
    result[key] = isObject(value) && isObject(result[key])
      ? merge(result[key], value)
      : clone(value);
  }
  return result;
};

function makeDocument(data) {
  const raw = clone(data);
  const id = raw._id ?? raw.id;
  return {
    ...raw,
    id,
    getFlag: (scope, key) => raw.flags?.[scope]?.[key],
    toObject: () => clone(raw),
  };
}

function makePack(collection, documents = []) {
  let documentLoads = 0;
  return {
    collection,
    documents,
    folders: [],
    locked: false,
    documentName: "Item",
    index: { size: documents.length, contents: documents },
    get documentLoads() {
      return documentLoads;
    },
    async getDocuments() {
      documentLoads += 1;
      return this.documents;
    },
    async getIndex() {
      this.index.size = this.documents.length;
      this.index.contents = this.documents;
      return this.index;
    },
  };
}

function createHarness() {
  const logs = { info: [], debug: [], warn: [], error: [] };
  const context = {
    URL,
    FormData: globalThis.FormData,
    setTimeout,
    clearTimeout,
    console: {
      info: (...args) => logs.info.push(args),
      debug: (...args) => logs.debug.push(args),
      warn: (...args) => logs.warn.push(args),
      error: (...args) => logs.error.push(args),
      log: () => {},
    },
    Hooks: { once: () => {}, on: () => {}, off: () => {} },
    FormApplication: class {},
    foundry: {
      utils: {
        deepClone: clone,
        mergeObject: (base, override) => merge(base, override),
        stripHTML: (value) => String(value ?? "").replace(/<[^>]*>/g, " "),
        escapeHTML: String,
      },
    },
    CONFIG: {
      DND5E: {
        actorSizes: {
          tiny: "Tiny",
          sm: "Small",
          med: "Medium",
          lg: "Large",
          huge: "Huge",
          grg: "Gargantuan",
        },
      },
    },
    ui: {
      notifications: { info: () => {}, warn: () => {}, error: () => {} },
      windows: {},
    },
    game: {
      settings: {
        get: (_module, key) => {
          if (key === "nsApiKey") return "test-key";
          if (key === "debugMode") return true;
          return false;
        },
      },
      actors: [],
      folders: [],
      packs: new Map(),
      user: { id: "gm", isGM: true },
      ready: false,
    },
  };
  context.globalThis = context;

  context.Item = {
    implementation: {
      async createDocuments(rows, options) {
        const pack = context.game.packs.get(options.pack);
        const created = rows.map((row, index) => makeDocument({
          ...clone(row),
          _id: row._id ?? `item-${pack.documents.length + index + 1}`,
        }));
        pack.documents.push(...created);
        pack.index.size = pack.documents.length;
        pack.index.contents = pack.documents;
        return created;
      },
      async updateDocuments(rows, options) {
        const pack = context.game.packs.get(options.pack);
        for (const row of rows) {
          const index = pack.documents.findIndex((entry) => entry.id === row._id);
          if (index >= 0) {
            pack.documents[index] = makeDocument(
              merge(pack.documents[index].toObject(), row)
            );
          }
        }
        pack.index.contents = pack.documents;
        return rows;
      },
      async deleteDocuments(ids, options) {
        const pack = context.game.packs.get(options.pack);
        const idSet = new Set(ids);
        pack.documents.splice(
          0,
          pack.documents.length,
          ...pack.documents.filter((entry) => !idSet.has(entry.id))
        );
        pack.index.size = pack.documents.length;
        pack.index.contents = pack.documents;
        return ids;
      },
    },
  };
  context.Folder = {
    implementation: {
      async create(data, options) {
        const pack = context.game.packs.get(options.pack);
        const folder = {
          ...clone(data),
          id: `folder-${pack.folders.length + 1}`,
          async update(changes) {
            Object.assign(this, changes);
          },
          async delete() {
            const index = pack.folders.indexOf(this);
            if (index >= 0) pack.folders.splice(index, 1);
          },
        };
        pack.folders.push(folder);
        return folder;
      },
    },
  };

  vm.createContext(context);
  const source = fs.readFileSync("index.js", "utf8");
  vm.runInContext(`${source}
globalThis.__test = {
  NETHERSCROLLS_WORLD_IMPORT_PACKS,
  normalizeNetherscrollsCharacterActorCreationData,
  buildNetherscrollsPortableActiveEffects,
  getNetherscrollsCharacterSourceId,
  collectNetherscrollsCharacterItemSources,
  normalizeNetherscrollsSpellData,
  prepareNetherscrollsCharacterActorItemData,
  resolveNetherscrollsCharacterItemSources,
  resolveNetherscrollsCharacterItemSource,
  syncNetherscrollsCharacterActorItems,
  syncNetherscrollsCharacterActorEffects,
  getNetherscrollsCompendiumDocumentsById,
  applyNetherscrollsImportResponse,
  repairNetherscrollsActorClassFeatures,
  importNetherscrollsCampaignCharacter,
  hydrateNetherscrollsExportedCharacter,
  findNetherscrollsActorByCharacterId
};`, context, { filename: "index.js" });

  return { context, importer: context.__test, logs };
}

function makeActor(context, payload = {}) {
  const state = clone(payload);
  const actor = {
    id: state._id ?? `actor-${context.game.actors.length + 1}`,
    name: state.name,
    type: state.type,
    folder: state.folder,
    system: state.system ?? {},
    flags: state.flags ?? {},
    prototypeToken: state.prototypeToken,
    items: [],
    effects: [],
    documentName: "Actor",
    getFlag(scope, key) {
      return this.flags?.[scope]?.[key];
    },
    async setFlag(scope, key, value) {
      this.flags[scope] ??= {};
      this.flags[scope][key] = value;
    },
    async update(changes) {
      const updated = merge({
        name: this.name,
        type: this.type,
        folder: this.folder,
        system: this.system,
        flags: this.flags,
        prototypeToken: this.prototypeToken,
      }, changes);
      Object.assign(this, updated);
    },
    async createEmbeddedDocuments(type, rows) {
      const target = type === "Item" ? this.items : this.effects;
      const created = rows.map((row, index) => makeDocument({
        ...clone(row),
        _id: row._id ?? `${type.toLowerCase()}-${target.length + index + 1}`,
      }));
      target.push(...created);
      return created;
    },
    async updateEmbeddedDocuments(type, rows) {
      const target = type === "Item" ? this.items : this.effects;
      for (const row of rows) {
        const index = target.findIndex((entry) => entry.id === row._id);
        if (index >= 0) {
          target[index] = makeDocument(merge(target[index].toObject(), row));
        }
      }
      return rows;
    },
    async deleteEmbeddedDocuments(type, ids) {
      const target = type === "Item" ? this.items : this.effects;
      const idSet = new Set(ids);
      target.splice(0, target.length, ...target.filter((entry) => !idSet.has(entry.id)));
      return ids;
    },
    canUserModify: () => true,
  };
  return actor;
}

test("normalizes token, size, and complete structured armor class", () => {
  const { importer } = createHarness();
  const actor = {
    name: "Hero",
    token: { disposition: 1 },
    system: {
      traits: { size: "Medium" },
      attributes: { hp: { value: 0, max: 86 }, ac: { value: 12 } },
      details: { xp: { value: 1 } },
    },
  };

  importer.normalizeNetherscrollsCharacterActorCreationData(actor, {
    armorClass: { value: 10, misc: 2, bonus: 1 },
    xp: 17200,
  });

  assert.equal(actor.system.traits.size, "med");
  assert.equal(actor.system.attributes.ac.flat, 13);
  assert.equal(actor.system.attributes.ac.calc, "flat");
  assert.equal("value" in actor.system.attributes.ac, false);
  assert.equal(actor.system.attributes.hp.value, 86);
  assert.equal(actor.system.attributes.hp.max, 86);
  assert.equal(actor.system.details.xp.value, 17200);
  assert.deepEqual(actor.prototypeToken, { disposition: 1 });
  assert.equal("token" in actor, false);
});

test("imports skill training, expertise, abilities, and manual bonuses", () => {
  const { importer } = createHarness();
  const actor = {
    name: "Hero",
    system: {
      traits: { size: "med" },
      attributes: {},
    },
  };

  importer.normalizeNetherscrollsCharacterActorCreationData(actor, {
    skills: {
      intimidation: { ability: "cha", prof: 1, misc: 2, bonus: 1 },
      stealth: { ability: "dex", expertise: true, misc: 0 },
      "animal handling": { ability: "wis", prof: "half" },
    },
  });

  assert.equal(actor.system.skills.itm.ability, "cha");
  assert.equal(actor.system.skills.itm.value, 1);
  assert.equal(actor.system.skills.itm.bonuses.check, "3");
  assert.equal(actor.system.skills.ste.ability, "dex");
  assert.equal(actor.system.skills.ste.value, 2);
  assert.equal(actor.system.skills.ste.bonuses.check, "");
  assert.equal(actor.system.skills.ani.ability, "wis");
  assert.equal(actor.system.skills.ani.value, 0.5);
  assert.equal(actor.system.skills.ani.bonuses.check, "");
});

test("converts portable active effects into D&D5e skill and save effects", () => {
  const { importer } = createHarness();
  const effects = importer.buildNetherscrollsPortableActiveEffects({
    activeBonuses: [
      { _id: "intimidation-4", active: true, stat: "skills.intimidation", bonus: "+4", source: "Character Effect" },
      { _id: "save-1", active: true, stat: "savingThrows.all", bonus: "+1", source: "Aura" },
      { _id: "inactive", active: false, stat: "skills.persuasion.misc", bonus: "+2", source: "Disabled" },
    ],
  });

  assert.equal(effects.length, 3);
  assert.equal(effects[0].changes[0].key, "system.skills.itm.bonuses.check");
  assert.equal(effects[0].changes[0].mode, 2);
  assert.equal(effects[0].changes[0].value, "+4");
  assert.equal(effects[1].changes.length, 6);
  assert.equal(effects[1].changes[0].key, "system.abilities.str.bonuses.save");
  assert.equal(effects[2].disabled, true);
  assert.equal(effects[2].changes[0].key, "system.skills.per.bonuses.check");
});

test("uses real website reference shapes without treating Foundry _id as identity", () => {
  const { importer } = createHarness();
  assert.equal(
    importer.getNetherscrollsCharacterSourceId({
      _id: "foundry-local",
      type: "loot",
      system: {},
    }),
    null
  );

  const sources = importer.collectNetherscrollsCharacterItemSources({
    foundryActor: {
      items: [{
        _id: "foundry-local",
        name: "Canonical Item",
        type: "loot",
        system: { quantity: 3 },
        flags: { [MODULE_ID]: { netherscrollsId: "item-1" } },
      }],
    },
    character: {
      items: [{ id: "item-1", name: "Canonical Item" }],
      spells: [{ id: "spell-1", name: "Spell" }],
      feats: [{ id: "feat-1", name: "Feat" }],
      classes: [{
        classId: "class-1",
        level: 7,
        subclass: { subclassId: "subclass-1" },
      }],
      raceId: "race-1",
      backgroundId: "background-1",
    },
  });

  const byDataset = Object.fromEntries(
    sources.map((entry) => [entry.dataset, entry])
  );
  assert.equal(sources.length, 7);
  assert.equal(
    sources.filter((entry) => entry.netherscrollsId === "item-1").length,
    1
  );
  assert.equal(
    sources.find((entry) => entry.netherscrollsId === "item-1").source.system.quantity,
    3
  );
  assert.equal(byDataset.classes.netherscrollsId, "class-1");
  assert.equal(byDataset.classes.source.level, 7);
  assert.equal(byDataset.subclasses.netherscrollsId, "subclass-1");
  assert.equal(byDataset.races.netherscrollsId, "race-1");
  assert.equal(byDataset.backgrounds.netherscrollsId, "background-1");
});

test("keeps compendium data canonical while preserving mutable character state", () => {
  const { importer } = createHarness();
  const canonical = makeDocument({
    _id: "foundry-class",
    name: "Canonical Fighter",
    type: "class",
    sort: 0,
    system: {
      levels: 1,
      description: { value: "canonical" },
      advancement: { canonical: true },
      equipped: false,
      uses: { spent: 0, max: 3 },
      hd: { denomination: "", spent: 4 },
    },
    flags: { [MODULE_ID]: { netherscrollsId: "class-1" } },
  });

  const prepared = importer.prepareNetherscrollsCharacterActorItemData(
    canonical,
    {
      name: "Stale Fighter",
      type: "class",
      sort: 42,
      diceType: "d10",
      system: {
        levels: 3,
        description: { value: "stale" },
        equipped: true,
        uses: { spent: 2, max: 99 },
        hd: { denomination: "", spent: 3 },
      },
    },
    { classId: "class-1", level: 7 },
    "class-1"
  );

  assert.equal(prepared.name, "Canonical Fighter");
  assert.equal(prepared.system.description.value, "canonical");
  assert.deepEqual(prepared.system.advancement, { canonical: true });
  assert.equal(prepared.system.levels, 7);
  assert.equal(prepared.system.equipped, true);
  assert.equal(prepared.system.uses.spent, 2);
  assert.equal(prepared.system.uses.max, 3);
  assert.equal(prepared.system.hd.denomination, "d10");
  assert.equal(prepared.system.hd.spent, 0);
  assert.equal(prepared.sort, 42);
});

test("normalizes library spells for leveled Actor spellbook sections", () => {
  const { importer } = createHarness();
  const normalized = importer.normalizeNetherscrollsSpellData({
    id: "spell-1",
    name: "Counterspell",
    level: 3,
    method: "",
    classes: ["Rogue", "Sorcerer", "Warlock", "Wizard"],
    foundryItem: {
      name: "Counterspell",
      type: "spell",
      system: {
        level: 0,
        method: "",
        prepared: 0,
        sourceItem: "",
      },
    },
  });

  assert.equal(normalized.system.level, 3);
  assert.equal(normalized.system.method, "spell");
  assert.equal(normalized.system.sourceItem, "");

  const repairedActorSpell = importer.prepareNetherscrollsCharacterActorItemData(
    makeDocument({
      _id: "foundry-spell",
      name: "Counterspell",
      type: "spell",
      system: {
        level: 3,
        method: "",
        prepared: 0,
        sourceItem: "class:rogue",
      },
      flags: { [MODULE_ID]: { netherscrollsId: "spell-1" } },
    }),
    {
      name: "Counterspell",
      type: "spell",
      system: { prepared: 1 },
    },
    { id: "spell-1", name: "Counterspell" },
    "spell-1"
  );

  assert.equal(repairedActorSpell.system.level, 3);
  assert.equal(repairedActorSpell.sort, 300000);
  assert.equal(repairedActorSpell.system.method, "spell");
  assert.equal(repairedActorSpell.system.prepared, 1);
  assert.equal(repairedActorSpell.system.sourceItem, "");
});

test("repairs stale spell methods and levels during an idempotent library update", async () => {
  const { context, importer } = createHarness();
  const spellPack = makePack("world.netherscrolls-spells", [
    makeDocument({
      _id: "foundry-spell",
      name: "Counterspell",
      type: "spell",
      system: {
        level: 0,
        method: "",
        prepared: 0,
        sourceItem: "class:rogue",
      },
      flags: { [MODULE_ID]: { netherscrollsId: "spell-1" } },
    }),
  ]);
  context.game.packs.set(spellPack.collection, spellPack);

  const result = await importer.applyNetherscrollsImportResponse(
    {
      data: [{
        id: "spell-1",
        name: "Counterspell",
        level: 3,
        method: "",
        classes: ["Rogue", "Sorcerer", "Warlock", "Wizard"],
        foundryItem: {
          name: "Counterspell",
          type: "spell",
          system: {
            level: 0,
            method: "",
            prepared: 0,
            sourceItem: "",
          },
        },
      }],
      meta: { dataKey: "spells", count: 1 },
    },
    "spells"
  );

  assert.equal(result.spells.created, 0);
  assert.equal(result.spells.updated, 1);
  assert.equal(spellPack.documents.length, 1);
  assert.equal(spellPack.documents[0].system.level, 3);
  assert.equal(spellPack.documents[0].system.method, "spell");
  assert.equal(spellPack.documents[0].system.sourceItem, "");
});

test("reuses compendium indexes and one broad API response per dataset", async () => {
  const { context, importer } = createHarness();
  const cachePack = makePack("world.cache", [
    makeDocument({
      _id: "cache-doc",
      flags: { [MODULE_ID]: { netherscrollsId: "cache-id" } },
    }),
  ]);
  const first = await importer.getNetherscrollsCompendiumDocumentsById(cachePack);
  const second = await importer.getNetherscrollsCompendiumDocumentsById(cachePack);
  assert.equal(cachePack.documentLoads, 1);
  assert.equal(first, second);

  const backgrounds = makePack("world.netherscrolls-backgrounds");
  context.game.packs.set(backgrounds.collection, backgrounds);
  let fetches = 0;
  context.fetch = async () => {
    fetches += 1;
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({
        data: [
          { _id: "bg-1", foundryItem: { name: "One", type: "background", system: {} } },
          { _id: "bg-2", foundryItem: { name: "Two", type: "background", system: {} } },
          { _id: "unrelated", foundryItem: { name: "Other", type: "background", system: {} } },
        ],
        meta: { dataKey: "backgrounds", count: 3 },
      }),
    };
  };

  const resolved = await importer.resolveNetherscrollsCharacterItemSources([
    {
      source: { id: "bg-1", name: "One" },
      dataset: "backgrounds",
      netherscrollsId: "bg-1",
      embed: true,
    },
    {
      source: { id: "bg-2", name: "Two" },
      dataset: "backgrounds",
      netherscrollsId: "bg-2",
      embed: true,
    },
  ]);

  assert.equal(fetches, 1);
  assert.deepEqual(
    backgrounds.documents.map((document) => document.getFlag(MODULE_ID, "netherscrollsId")).sort(),
    ["bg-1", "bg-2"]
  );
  assert.deepEqual(Array.from(resolved.items, (item) => item.name).sort(), ["One", "Two"]);

  await importer.resolveNetherscrollsCharacterItemSources([
    {
      source: { id: "bg-1", name: "One" },
      dataset: "backgrounds",
      netherscrollsId: "bg-1",
      embed: true,
    },
  ]);
  assert.equal(fetches, 1);

  const items = makePack("world.netherscrolls-items");
  context.game.packs.set(items.collection, items);
  const direct = await importer.resolveNetherscrollsCharacterItemSource(
    {
      netherscrollsId: "missing-direct",
      name: "Direct",
      type: "loot",
      system: { quantity: 2 },
    },
    "items"
  );
  assert.equal(direct.item.name, "Direct");
  assert.equal(direct.item.type, "loot");
  const skipped = await importer.resolveNetherscrollsCharacterItemSource(
    { netherscrollsId: "missing-incomplete" },
    "items"
  );
  assert.equal(skipped.item, null);
});

test("deduplicates embedded items and effects on first import and re-import", async () => {
  const { context, importer } = createHarness();
  const actor = makeActor(context, { name: "Hero" });
  const item = {
    name: "Potion",
    type: "consumable",
    system: { quantity: 1 },
    flags: { [MODULE_ID]: { netherscrollsId: "potion-1" } },
  };

  const first = await importer.syncNetherscrollsCharacterActorItems(
    actor,
    [clone(item), clone(item)],
    "char-1"
  );
  assert.equal(first.created, 1);
  assert.equal(actor.items.length, 1);

  const changed = clone(item);
  changed.system.quantity = 4;
  const second = await importer.syncNetherscrollsCharacterActorItems(
    actor,
    [changed],
    "char-1"
  );
  assert.equal(second.updated, 1);
  assert.equal(actor.items.length, 1);
  assert.equal(actor.items[0].system.quantity, 4);

  actor.items.push(makeDocument({
    ...clone(changed),
    _id: "duplicate-imported",
    flags: {
      [MODULE_ID]: {
        ...changed.flags[MODULE_ID],
        characterId: "char-1",
        importedCharacterItem: true,
      },
    },
  }));
  const cleanup = await importer.syncNetherscrollsCharacterActorItems(
    actor,
    [changed],
    "char-1"
  );
  assert.equal(cleanup.deletedDuplicates, 1);
  assert.equal(actor.items.length, 1);

  const effect = {
    netherscrollsId: "effect-1",
    name: "Blessed",
    changes: [{ key: "x", value: "1" }],
  };
  const effectsFirst = await importer.syncNetherscrollsCharacterActorEffects(
    actor,
    [clone(effect), clone(effect)],
    "char-1"
  );
  assert.equal(effectsFirst.created, 1);
  assert.equal(actor.effects.length, 1);

  effect.changes[0].value = "2";
  const effectsSecond = await importer.syncNetherscrollsCharacterActorEffects(
    actor,
    [effect],
    "char-1"
  );
  assert.equal(effectsSecond.updated, 1);
  assert.equal(actor.effects.length, 1);
});

test("imports classes, subclasses, and features into separate idempotent packs", async () => {
  const { context, importer } = createHarness();
  const classPack = makePack("world.netherscrolls-classes", [
    makeDocument({
      _id: "legacy-subclass-doc",
      name: "Champion",
      type: "subclass",
      flags: { [MODULE_ID]: { netherscrollsId: "subclass-1" } },
    }),
  ]);
  const subclassPack = makePack("world.netherscrolls-subclasses");
  const featurePack = makePack("world.netherscrolls-class-features");
  context.game.packs.set(classPack.collection, classPack);
  context.game.packs.set(subclassPack.collection, subclassPack);
  context.game.packs.set(featurePack.collection, featurePack);

  const classSource = {
    _id: "class-1",
    name: "Fighter",
    diceType: "d10",
    classFeatures: [{
      _id: "feature-1",
      name: "Second Wind",
      level: 1,
    }],
    subclasses: [{
      _id: "subclass-1",
      name: "Champion",
      subclassFeatures: [{
        _id: "sub-feature-1",
        name: "Improved Critical",
        level: 3,
      }],
    }],
  };

  const first = await importer.applyNetherscrollsImportResponse(
    { data: [classSource], meta: { dataKey: "classes" } },
    "classes"
  );
  assert.equal(first.classes.created, 1);
  assert.equal(first.classes.subclasses.created, 1);
  assert.equal(first.classes.subclasses.migrated, 1);
  assert.deepEqual(classPack.documents.map((entry) => entry.type), ["class"]);
  assert.equal(classPack.documents[0].system.hd.denomination, "d10");
  assert.deepEqual(subclassPack.documents.map((entry) => entry.type), ["subclass"]);
  assert.equal(featurePack.documents.length, 2);
  assert.equal(
    classPack.documents[0].getFlag(MODULE_ID, "classFeatureUuids").length,
    1
  );
  assert.equal(
    subclassPack.documents[0].getFlag(MODULE_ID, "parentClassNetherscrollsId"),
    "class-1"
  );
  assert.equal(
    subclassPack.documents[0].getFlag(MODULE_ID, "subclassFeatureUuids").length,
    1
  );

  const second = await importer.applyNetherscrollsImportResponse(
    { data: [classSource], meta: { dataKey: "classes" } },
    "classes"
  );
  assert.equal(second.classes.created, 0);
  assert.equal(second.classes.updated, 1);
  assert.equal(second.classes.subclasses.created, 0);
  assert.equal(second.classes.subclasses.updated, 1);
  assert.equal(classPack.documents.length, 1);
  assert.equal(subclassPack.documents.length, 1);
  assert.equal(featurePack.documents.length, 2);
});

test("does not embed nested high-level or optional features before repair", async () => {
  const { context, importer } = createHarness();
  const classPack = makePack("world.netherscrolls-classes", [
    makeDocument({
      _id: "class-doc",
      name: "Fighter",
      type: "class",
      system: { levels: 1, identifier: "fighter", advancement: {} },
      flags: { [MODULE_ID]: { netherscrollsId: "class-1", identifier: "fighter" } },
    }),
  ]);
  const subclassPack = makePack("world.netherscrolls-subclasses", [
    makeDocument({
      _id: "subclass-doc",
      name: "Champion",
      type: "subclass",
      system: { classIdentifier: "fighter" },
      flags: {
        [MODULE_ID]: {
          netherscrollsId: "subclass-1",
          parentClassIdentifier: "fighter",
        },
      },
    }),
  ]);
  const featurePack = makePack("world.netherscrolls-class-features", [
    makeDocument({
      _id: "feature-low",
      name: "Allowed",
      type: "feat",
      flags: { [MODULE_ID]: { netherscrollsId: "feature-low", level: 1 } },
    }),
    makeDocument({
      _id: "feature-high",
      name: "Too High",
      type: "feat",
      flags: { [MODULE_ID]: { netherscrollsId: "feature-high", level: 8 } },
    }),
    makeDocument({
      _id: "feature-optional",
      name: "Optional",
      type: "feat",
      flags: {
        [MODULE_ID]: {
          netherscrollsId: "feature-optional",
          level: 2,
          optional: true,
        },
      },
    }),
  ]);
  for (const pack of [classPack, subclassPack, featurePack]) {
    context.game.packs.set(pack.collection, pack);
  }

  const sources = importer.collectNetherscrollsCharacterItemSources({
    character: {
      classes: [{
        netherscrollsId: "class-1",
        level: 3,
        classFeatures: [
          { netherscrollsId: "feature-low", type: "feat" },
          { netherscrollsId: "feature-high", type: "feat" },
          { netherscrollsId: "feature-optional", type: "feat" },
        ],
        subclass: { netherscrollsId: "subclass-1" },
      }],
    },
  });
  const resolved = await importer.resolveNetherscrollsCharacterItemSources(sources);

  assert.deepEqual(
    Array.from(
      resolved.items,
      (item) => item.flags[MODULE_ID].netherscrollsId
    ).sort(),
    ["class-1", "subclass-1"]
  );
  assert.equal(classPack.documentLoads, 1);
  assert.equal(subclassPack.documentLoads, 1);
  assert.equal(featurePack.documentLoads, 1);
});

test("class feature repair filters level/optional/owned features and is idempotent", async () => {
  const { context, importer } = createHarness();
  const featureMap = new Map();
  const addFeature = (uuid, id, level, optional = false, scope = "class") => {
    featureMap.set(uuid, makeDocument({
      _id: id,
      name: id,
      type: "feat",
      system: { type: { value: "class" } },
      flags: {
        [MODULE_ID]: {
          netherscrollsId: id,
          level,
          optional,
          featureScope: scope,
          featureKey: id,
          parentClassIdentifier: "fighter",
        },
      },
    }));
  };
  addFeature("Compendium.test.Item.low", "feature-low", 1);
  addFeature("Compendium.test.Item.high", "feature-high", 8);
  addFeature("Compendium.test.Item.optional", "feature-optional", 2, true);
  addFeature("Compendium.test.Item.owned", "feature-owned", 2);
  addFeature("Compendium.test.Item.sub", "feature-sub", 3, false, "subclass");
  context.fromUuid = async (uuid) => featureMap.get(uuid) ?? null;
  context.fromUuidSync = (uuid) => featureMap.get(uuid) ?? null;

  const actor = makeActor(context, { name: "Hero" });
  actor.items.push(
    makeDocument({
      _id: "class",
      name: "Fighter",
      type: "class",
      system: { levels: 3, identifier: "fighter" },
      flags: {
        [MODULE_ID]: {
          identifier: "fighter",
          classFeatureUuids: [
            "Compendium.test.Item.low",
            "Compendium.test.Item.high",
            "Compendium.test.Item.optional",
            "Compendium.test.Item.owned",
          ],
        },
      },
    }),
    makeDocument({
      _id: "subclass",
      name: "Champion",
      type: "subclass",
      system: { classIdentifier: "fighter" },
      flags: {
        [MODULE_ID]: {
          parentClassIdentifier: "fighter",
          subclassFeatureUuids: ["Compendium.test.Item.sub"],
        },
      },
    }),
    makeDocument({
      _id: "owned",
      name: "feature-owned",
      type: "feat",
      system: { type: { value: "class" } },
      flags: {
        [MODULE_ID]: {
          netherscrollsId: "feature-owned",
          featureScope: "class",
        },
      },
    })
  );

  const first = await importer.repairNetherscrollsActorClassFeatures(actor);
  const second = await importer.repairNetherscrollsActorClassFeatures(actor);
  const ids = actor.items
    .map((item) => item.getFlag?.(MODULE_ID, "netherscrollsId"))
    .filter(Boolean);
  assert.equal(first.created, 2);
  assert.equal(second.created, 0);
  assert.equal(ids.includes("feature-low"), true);
  assert.equal(ids.includes("feature-sub"), true);
  assert.equal(ids.includes("feature-high"), false);
  assert.equal(ids.includes("feature-optional"), false);
  assert.equal(ids.filter((id) => id === "feature-owned").length, 1);
});

test("creates then updates one Actor with both identity flags and progress feedback", async () => {
  const { context, importer, logs } = createHarness();
  context.Actor = {
    implementation: {
      async create(payload) {
        const actor = makeActor(context, payload);
        context.game.actors.push(actor);
        return actor;
      },
    },
  };
  const progress = [];
  const exported = {
    id: "character-1",
    name: "Hero",
    character: {
      armorClass: { value: 10, misc: 2, bonus: 1 },
    },
    foundryActor: {
      name: "Hero",
      type: "npc",
      token: { vision: true },
      flags: {},
      system: {
        traits: { size: "Medium" },
        attributes: { hp: { value: 20, max: 20 }, ac: { value: 10 } },
        abilities: { str: { value: 16 } },
        skills: { ath: { value: 1 } },
        currency: { gp: 5 },
        spells: { spell1: { value: 1, max: 2 } },
      },
      items: [],
      effects: [],
    },
  };

  const first = await importer.importNetherscrollsCampaignCharacter(
    exported,
    { id: "ns-character-folder" },
    { onProgress: (stage) => progress.push(stage) }
  );
  const changed = clone(exported);
  changed.foundryActor.system.attributes.hp.value = 9;
  const second = await importer.importNetherscrollsCampaignCharacter(
    changed,
    { id: "ns-character-folder" },
    { onProgress: (stage) => progress.push(stage) }
  );

  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(context.game.actors.length, 1);
  const actor = context.game.actors[0];
  assert.equal(actor.type, "character");
  assert.equal(actor.folder, "ns-character-folder");
  assert.equal(actor.flags[MODULE_ID].characterId, "character-1");
  assert.equal(actor.flags.netherscrolls.characterId, "character-1");
  assert.equal(actor.system.attributes.hp.value, 20);
  assert.equal(actor.system.attributes.ac.flat, 13);
  assert.equal(progress.includes("repairing class features..."), true);
  assert.equal(progress.includes("complete."), true);
  assert.equal(logs.debug.length > 0, true);
  assert.equal(
    logs.info.some((entry) => String(entry[0]).includes("Character import")),
    true
  );

  const legacyActor = makeActor(context, {
    name: "Legacy",
    flags: { netherscrolls: { characterId: "legacy-character" } },
  });
  context.game.actors.push(legacyActor);
  assert.equal(
    importer.findNetherscrollsActorByCharacterId("legacy-character"),
    legacyActor
  );
});

test("fetches a character detail export at most once", async () => {
  const { context, importer } = createHarness();
  const fullExport = {
    characterId: "character-1",
    character: { _id: "character-1", name: "Hero" },
    foundryActor: { name: "Hero", type: "character" },
  };
  let fetches = 0;
  context.fetch = async () => {
    fetches += 1;
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ data: fullExport }),
    };
  };

  await importer.hydrateNetherscrollsExportedCharacter({
    id: "character-1",
    name: "Hero",
    foundryActor: fullExport.foundryActor,
  }, "campaign-1");
  assert.equal(fetches, 0);

  await importer.hydrateNetherscrollsExportedCharacter({
    id: "character-1",
    name: "Hero",
  }, "campaign-1");
  assert.equal(fetches, 1);
});

test("declares every intended world compendium", () => {
  const { importer } = createHarness();
  assert.deepEqual(
    Object.keys(importer.NETHERSCROLLS_WORLD_IMPORT_PACKS)
      .filter((key) => key !== "monster")
      .sort(),
    [
      "backgrounds",
      "classFeatures",
      "classes",
      "feats",
      "items",
      "races",
      "spells",
      "subclasses",
    ]
  );
});
