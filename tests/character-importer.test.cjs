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
const setPath = (target, path, value) => {
  const parts = String(path).split(".");
  let cursor = target;
  for (const part of parts.slice(0, -1)) {
    cursor[part] ??= {};
    cursor = cursor[part];
  }
  cursor[parts.at(-1)] = clone(value);
};

function makeDocument(data) {
  const raw = clone(data);
  const id = raw._id ?? raw.id;
  const document = {
    ...raw,
    id,
    getFlag(scope, key) {
      if (scope === "netherscrolls") throw new Error('Flag scope "netherscrolls" is not valid or not currently active');
      return raw.flags?.[scope]?.[key];
    },
    async setFlag(scope, key, value) {
      if (scope === "netherscrolls") throw new Error('Flag scope "netherscrolls" is not valid or not currently active');
      raw.flags ??= {};
      raw.flags[scope] ??= {};
      raw.flags[scope][key] = value;
      this.flags = raw.flags;
    },
    async update(changes) {
      const updated = merge(raw, changes);
      Object.assign(raw, updated);
      Object.assign(this, updated);
    },
    toObject: () => clone(raw),
  };
  return document;
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
      system: { version: "5.3.3" },
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
  normalizeNetherscrollsImagePath,
  normalizeNetherscrollsImportImagePath,
  sortNetherscrollsSpellbookSections,
  buildNetherscrollsPortableActiveEffects,
  buildNetherscrollsSourceImportRequest,
  getNetherscrollsCharacterSourceId,
  collectNetherscrollsCharacterItemSources,
  normalizeNetherscrollsSpellData,
  prepareNetherscrollsCharacterActorItemData,
  resolveNetherscrollsCharacterItemSources,
  resolveNetherscrollsCharacterItemSource,
  reconcileNetherscrollsCharacterActorItems,
  repairNetherscrollsCharacterActorDocumentLinks,
  reconcileNetherscrollsCharacterActorEffects,
  getNetherscrollsCompendiumDocumentsById,
  applyNetherscrollsImportResponse,
  repairNetherscrollsActorClassFeatures,
  importNetherscrollsCampaignCharacter,
  hydrateNetherscrollsImportedCharacter,
  findNetherscrollsActorByCharacterId,
  buildFoundryExportPayload,
  applyFoundryExportCanonicalIds,
  exportNetherscrollsCampaignActors,
  importMissingNetherscrollsCharacterDocuments,
  pollNetherscrollsImportQueues
};`, context, { filename: "index.js" });

  return { context, importer: context.__test, logs };
}

function makeActor(context, payload = {}) {
  const state = clone(payload);
  const actor = {
    id: state._id ?? `actor-${context.game.actors.length + 1}`,
    name: state.name,
    type: state.type,
    img: state.img,
    folder: state.folder,
    system: state.system ?? {},
    flags: state.flags ?? {},
    prototypeToken: state.prototypeToken,
    items: [],
    effects: [],
    documentName: "Actor",
    toObject() {
      return clone({
        _id: this.id,
        name: this.name,
        type: this.type,
        img: this.img,
        folder: this.folder,
        system: this.system,
        flags: this.flags,
        prototypeToken: this.prototypeToken,
        items: this.items.map((item) => item.toObject?.() ?? clone(item)),
        effects: this.effects.map((effect) => effect.toObject?.() ?? clone(effect)),
      });
    },
    getFlag(scope, key) {
      if (scope === "netherscrolls") throw new Error('Flag scope "netherscrolls" is not valid or not currently active');
      return this.flags?.[scope]?.[key];
    },
    async setFlag(scope, key, value) {
      if (scope === "netherscrolls") throw new Error('Flag scope "netherscrolls" is not valid or not currently active');
      this.flags[scope] ??= {};
      this.flags[scope][key] = value;
    },
    async update(changes) {
      const expandedChanges = {};
      for (const [key, value] of Object.entries(changes)) {
        setPath(expandedChanges, key, value);
      }
      const updated = merge({
        name: this.name,
        type: this.type,
        img: this.img,
        folder: this.folder,
        system: this.system,
        flags: this.flags,
        prototypeToken: this.prototypeToken,
      }, expandedChanges);
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

test("normalizes schema-v2 Actor data without legacy token fallback", () => {
  const { importer } = createHarness();
  const actor = {
    name: "Hero",
    prototypeToken: { disposition: 1 },
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
      persuasion: { ability: "cha", prof: 1, misc: 4, bonus: 0 },
      stealth: { ability: "dex", expertise: true, misc: 0 },
      "animal handling": { ability: "wis", prof: "half" },
    },
  });

  assert.equal(actor.system.skills.itm.ability, "cha");
  assert.equal(actor.system.skills.itm.value, 1);
  assert.equal(actor.system.skills.itm.bonuses.check, "3");
  assert.equal(actor.system.skills.per.ability, "cha");
  assert.equal(actor.system.skills.per.value, 1);
  assert.equal(actor.system.skills.per.bonuses.check, "4");
  assert.equal(actor.system.skills.ste.ability, "dex");
  assert.equal(actor.system.skills.ste.value, 2);
  assert.equal(actor.system.skills.ste.bonuses.check, "");
  assert.equal(actor.system.skills.ani.ability, "wis");
  assert.equal(actor.system.skills.ani.value, 0.5);
  assert.equal(actor.system.skills.ani.bonuses.check, "");
});

test("uses current character ability scores when the Foundry snapshot is stale", () => {
  const { importer } = createHarness();
  const actor = {
    name: "Séléné",
    system: {
      traits: { size: "med" },
      attributes: {},
      abilities: {
        str: { value: 10, proficient: 1 },
        cha: { value: 18, bonuses: { save: "2" } },
      },
    },
  };

  importer.normalizeNetherscrollsCharacterActorCreationData(actor, {
    abilities: {
      str: { score: 12 },
      cha: { score: 28 },
    },
  });

  assert.equal(actor.system.abilities.str.value, 12);
  assert.equal(actor.system.abilities.str.proficient, 1);
  assert.equal(actor.system.abilities.cha.value, 28);
  assert.equal(actor.system.abilities.cha.bonuses.save, "2");
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
        flags: { netherscrolls: { id: "item-1" } },
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
      race: { name: "Partial race label without an id" },
      raceId: "race-1",
      background: { name: "Partial background label without an id" },
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

  const blankOptionalLinks = importer.collectNetherscrollsCharacterItemSources({
    character: {
      raceId: "   ",
      backgroundId: "",
    },
    foundryActor: { items: [] },
  });
  assert.deepEqual(Array.from(blankOptionalLinks), []);
});

test("collects a populated character background reference", () => {
  const { importer } = createHarness();
  const sources = importer.collectNetherscrollsCharacterItemSources({
    character: {
      background: { _id: "background-1", name: "Acolyte" },
    },
    foundryActor: { items: [] },
  });

  assert.equal(sources.length, 1);
  assert.equal(sources[0].dataset, "backgrounds");
  assert.equal(sources[0].netherscrollsId, "background-1");
});

test("uses permanent public Actor images verbatim and rejects unresolved object keys", () => {
  const { importer, logs } = createHarness();
  const publicUrl = "https://assets.example.com/image/S%C3%A9l%C3%A9n%C3%A9.png?rev=2";
  const actor = {
    name: "Séléné",
    img: `  ${publicUrl}  `,
    system: { traits: {}, attributes: {} },
  };

  importer.normalizeNetherscrollsCharacterActorCreationData(actor);
  assert.equal(actor.img, publicUrl);

  actor.img = "image/1770592213931-e2fee0caf4b0-image.png";
  importer.normalizeNetherscrollsCharacterActorCreationData(actor);
  assert.equal(actor.img, "https://i.postimg.cc/wBj0LZyj/image.png");
  assert.match(logs.error.at(-1)[0], /R2_PUBLIC_BASE_URL/);

  assert.equal(
    importer.normalizeNetherscrollsImportImagePath("modules/example/portrait.webp"),
    "modules/example/portrait.webp"
  );

  const item = importer.prepareNetherscrollsCharacterActorItemData(
    null,
    {
      name: "Unresolved Portrait",
      type: "loot",
      img: "image/unresolved-item.png",
      system: {},
    },
    { id: "item-1" },
    "item-1"
  );
  assert.equal(item.img, "https://i.postimg.cc/wBj0LZyj/image.png");
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
    flags: { netherscrolls: { id: "class-1" } },
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

test("enforces the canonical embedded type for background and race datasets", () => {
  const { importer } = createHarness();
  const staleBackground = makeDocument({
    _id: "stale-background",
    name: "Acolyte",
    type: "feat",
    system: {},
    flags: { netherscrolls: { id: "background-1" } },
  });

  const prepared = importer.prepareNetherscrollsCharacterActorItemData(
    staleBackground,
    {},
    { backgroundId: "background-1" },
    "background-1",
    "backgrounds"
  );

  assert.equal(prepared.type, "background");
  assert.equal(prepared.flags.netherscrolls.id, "background-1");
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
      flags: { netherscrolls: { id: "spell-1" } },
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

test("orders D&D5e spellbook sections by method priority and spell level", () => {
  const { importer } = createHarness();
  const spellbook = {
    spell2: { label: "2nd Level", order: 1000, dataset: { level: 2 } },
    spell4: { label: "4th Level", order: 1000, dataset: { level: 4 } },
    spell6: { label: "6th Level", order: 1000, dataset: { level: 6 } },
    spell5: { label: "5th Level", order: 1000, dataset: { level: 5 } },
    innate: { label: "Innate", order: 2000, dataset: { level: null } },
    spell0: { label: "Cantrips", order: 0, dataset: { level: 0 } },
  };

  const ordered = importer.sortNetherscrollsSpellbookSections(spellbook);

  assert.deepEqual(
    Object.keys(ordered),
    ["spell0", "spell2", "spell4", "spell5", "spell6", "innate"]
  );
  assert.equal(ordered.spell5, spellbook.spell5);
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
      flags: { netherscrolls: { id: "spell-1" } },
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

test("resolves targeted Import selections without using an invalid Foundry flag scope", async () => {
  const { context, importer } = createHarness();
  const cachePack = makePack("world.cache", [
    makeDocument({
      _id: "cache-doc",
      flags: { netherscrolls: { id: "cache-id" } },
    }),
  ]);
  const first = await importer.getNetherscrollsCompendiumDocumentsById(cachePack);
  const second = await importer.getNetherscrollsCompendiumDocumentsById(cachePack);
  assert.equal(cachePack.documentLoads, 1);
  assert.equal(first, second);

  const backgrounds = makePack("world.netherscrolls-backgrounds");
  context.game.packs.set(backgrounds.collection, backgrounds);
  let fetches = 0;
  const requests = [];
  context.fetch = async (url, options) => {
    fetches += 1;
    requests.push({ url, options });
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({
        data: {
          backgrounds: [
            {
              _id: "bg-1",
              foundryItem: {
                name: "One",
                type: "background",
                img: "https://assets.example.com/image/bg-1.webp",
                system: {},
              },
            },
            {
              _id: "bg-2",
              foundryItem: {
                name: "Two",
                type: "background",
                img: "https://assets.example.com/image/bg-2.webp",
                system: {},
              },
            },
          ],
        },
        meta: {
          requested: { backgrounds: 2 },
          returned: { backgrounds: 2 },
        },
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
  assert.equal(requests[0].url.endsWith("/api/foundry/import/selection"), true);
  assert.equal(requests[0].options.method, "POST");
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    backgrounds: ["bg-1", "bg-2"],
  });
  assert.deepEqual(
    backgrounds.documents.map((document) => document.flags.netherscrolls.id).sort(),
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
  await assert.rejects(
    importer.resolveNetherscrollsCharacterItemSource(
      { netherscrollsId: "missing-incomplete" },
      "items"
    ),
    /Foundry Import selection/
  );
});

test("deduplicates embedded items and effects on first import and re-import", async () => {
  const { context, importer } = createHarness();
  const actor = makeActor(context, { name: "Hero" });
  const item = {
    name: "Potion",
    type: "consumable",
    system: { quantity: 1 },
    flags: { netherscrolls: { id: "potion-1" } },
  };

  const first = await importer.reconcileNetherscrollsCharacterActorItems(
    actor,
    [clone(item), clone(item)],
    "char-1"
  );
  assert.equal(first.created, 1);
  assert.equal(actor.items.length, 1);
  assert.equal(first.embeddedIds["potion-1"], actor.items[0].id);

  const changed = clone(item);
  changed.system.quantity = 4;
  const second = await importer.reconcileNetherscrollsCharacterActorItems(
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
      netherscrolls: clone(changed.flags.netherscrolls),
      [MODULE_ID]: {
        ...changed.flags[MODULE_ID],
        characterId: "char-1",
        importedCharacterItem: true,
      },
    },
  }));
  const cleanup = await importer.reconcileNetherscrollsCharacterActorItems(
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
  const effectsFirst = await importer.reconcileNetherscrollsCharacterActorEffects(
    actor,
    [clone(effect), clone(effect)],
    "char-1"
  );
  assert.equal(effectsFirst.created, 1);
  assert.equal(actor.effects.length, 1);

  effect.changes[0].value = "2";
  const effectsSecond = await importer.reconcileNetherscrollsCharacterActorEffects(
    actor,
    [effect],
    "char-1"
  );
  assert.equal(effectsSecond.updated, 1);
  assert.equal(actor.effects.length, 1);
});

test("refreshes stale linked library images before embedding character content", async () => {
  const { context, importer } = createHarness();
  const spells = makePack("world.netherscrolls-spells", [
    makeDocument({
      _id: "stale-spell",
      name: "Heal",
      type: "spell",
      img: "https://i.postimg.cc/wBj0LZyj/image.png",
      system: { level: 6, method: "spell" },
      flags: { netherscrolls: { id: "spell-1" } },
    }),
  ]);
  context.game.packs.set(spells.collection, spells);
  let fetches = 0;
  context.fetch = async () => {
    fetches += 1;
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({
        data: {
          spells: [{
            _id: "spell-1",
            name: "Heal",
            level: 6,
            foundryItem: {
              name: "Heal",
              type: "spell",
              img: "https://assets.example.com/image/heal.webp",
              system: { level: 6, method: "spell" },
            },
          }],
        },
      }),
    };
  };

  const resolved = await importer.resolveNetherscrollsCharacterItemSources([{
    source: { spellId: "spell-1" },
    dataset: "spells",
    netherscrollsId: "spell-1",
    embed: true,
  }]);

  assert.equal(fetches, 1);
  assert.equal(resolved.items[0].img, "https://assets.example.com/image/heal.webp");
  assert.equal(spells.documents[0].img, "https://assets.example.com/image/heal.webp");
});

test("replaces a stale embedded background whose Foundry Item type is wrong", async () => {
  const { context, importer } = createHarness();
  const actor = makeActor(context, { name: "Hero", system: { details: {} } });
  actor.items.push(makeDocument({
    _id: "stale-embedded-background",
    name: "Acolyte",
    type: "feat",
    img: "https://i.postimg.cc/wBj0LZyj/image.png",
    system: {},
    flags: {
      netherscrolls: { id: "background-1" },
      [MODULE_ID]: {
        characterId: "character-1",
        importedCharacterItem: true,
      },
    },
  }));

  const result = await importer.reconcileNetherscrollsCharacterActorItems(
    actor,
    [{
      name: "Acolyte",
      type: "background",
      img: "https://assets.example.com/image/acolyte.webp",
      system: {},
      flags: { netherscrolls: { id: "background-1" } },
    }],
    "character-1"
  );

  assert.equal(result.created, 1);
  assert.equal(result.replacedWrongType, 1);
  assert.equal(actor.items.length, 1);
  assert.equal(actor.items[0].type, "background");
  assert.equal(actor.items[0].img, "https://assets.example.com/image/acolyte.webp");
  assert.equal(result.embeddedIds["background-1"], actor.items[0].id);
});

test("repairs D&D5e background, race, and original-class embedded Item links", async () => {
  const { context, importer } = createHarness();
  const actor = makeActor(context, {
    name: "Hero",
    system: { details: {} },
  });
  actor.items.push(
    makeDocument({
      _id: "foundry-background",
      name: "Acolyte",
      type: "background",
      flags: { netherscrolls: { id: "background-1" } },
    }),
    makeDocument({
      _id: "foundry-race",
      name: "Aasimar",
      type: "race",
      flags: { netherscrolls: { id: "race-1" } },
    }),
    makeDocument({
      _id: "foundry-class",
      name: "Cleric",
      type: "class",
      flags: { netherscrolls: { id: "class-1" } },
    })
  );
  let changes = null;
  actor.update = async (update) => {
    changes = update;
  };

  const repaired = await importer.repairNetherscrollsCharacterActorDocumentLinks(
    actor,
    {
      backgroundId: "background-1",
      raceId: "race-1",
      classes: [{ classId: "class-1", level: 12 }],
    }
  );

  const expected = {
    "system.details.background": "foundry-background",
    "system.details.race": "foundry-race",
    "system.details.originalClass": "foundry-class",
  };
  assert.deepEqual(clone(changes), expected);
  assert.deepEqual(clone(repaired), expected);

  await assert.rejects(
    importer.repairNetherscrollsCharacterActorDocumentLinks(
      actor,
      { backgroundId: "missing-background" },
      {}
    ),
    /Could not link the imported background/
  );
});

test("imports classes, subclasses, and features into separate idempotent packs", async () => {
  const { context, importer } = createHarness();
  const classPack = makePack("world.netherscrolls-classes", [
    makeDocument({
      _id: "legacy-subclass-doc",
      name: "Champion",
      type: "subclass",
      flags: { netherscrolls: { id: "subclass-1" } },
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
      flags: {
        netherscrolls: { id: "class-1" },
        [MODULE_ID]: { identifier: "fighter" },
      },
    }),
  ]);
  const subclassPack = makePack("world.netherscrolls-subclasses", [
    makeDocument({
      _id: "subclass-doc",
      name: "Champion",
      type: "subclass",
      system: { classIdentifier: "fighter" },
      flags: {
        netherscrolls: { id: "subclass-1", classId: "class-1" },
        [MODULE_ID]: {
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
      flags: {
        netherscrolls: { id: "feature-low" },
        [MODULE_ID]: { level: 1 },
      },
    }),
    makeDocument({
      _id: "feature-high",
      name: "Too High",
      type: "feat",
      flags: {
        netherscrolls: { id: "feature-high" },
        [MODULE_ID]: { level: 8 },
      },
    }),
    makeDocument({
      _id: "feature-optional",
      name: "Optional",
      type: "feat",
      flags: {
        netherscrolls: { id: "feature-optional" },
        [MODULE_ID]: {
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
      (item) => item.flags.netherscrolls.id
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
        netherscrolls: { id },
        [MODULE_ID]: {
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
        netherscrolls: { id: "feature-owned" },
        [MODULE_ID]: {
          featureScope: "class",
        },
      },
    })
  );

  const first = await importer.repairNetherscrollsActorClassFeatures(actor);
  const second = await importer.repairNetherscrollsActorClassFeatures(actor);
  const ids = actor.items
    .map((item) => item.flags?.netherscrolls?.id)
    .filter(Boolean);
  assert.equal(first.created, 2);
  assert.equal(second.created, 0);
  assert.equal(ids.includes("feature-low"), true);
  assert.equal(ids.includes("feature-sub"), true);
  assert.equal(ids.includes("feature-high"), false);
  assert.equal(ids.includes("feature-optional"), false);
  assert.equal(ids.filter((id) => id === "feature-owned").length, 1);
});

test("creates then updates one Actor with canonical identity and progress feedback", async () => {
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
  const importedCharacter = {
    id: "character-1",
    name: "Hero",
    character: {
      armorClass: { value: 10, misc: 2, bonus: 1 },
      backgroundId: "",
      raceId: "",
    },
    foundryActor: {
      name: "Hero",
      type: "npc",
      prototypeToken: { vision: true },
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
    importedCharacter,
    { id: "ns-character-folder" },
    { onProgress: (stage) => progress.push(stage) }
  );
  const changed = clone(importedCharacter);
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
  assert.equal(actor.flags.netherscrolls.characterId, "character-1");
  assert.equal(actor.system.attributes.hp.value, 20);
  assert.equal(actor.system.attributes.ac.flat, 13);
  assert.equal(progress.includes("repairing class features..."), true);
  assert.equal(progress.includes("complete."), true);
  assert.equal(logs.debug.length > 0, true);
  assert.equal(
    logs.info.some((entry) => String(entry[0]).includes("Foundry Import")),
    true
  );

  const linkedActor = makeActor(context, {
    name: "Linked",
    flags: { netherscrolls: { characterId: "linked-character" } },
  });
  context.game.actors.push(linkedActor);
  assert.equal(
    importer.findNetherscrollsActorByCharacterId("linked-character"),
    linkedActor
  );
});

test("imports a public portrait, background link, and linked document images end to end", async () => {
  const { context, importer } = createHarness();
  const backgrounds = makePack("world.netherscrolls-backgrounds");
  const spells = makePack("world.netherscrolls-spells");
  context.game.packs.set(backgrounds.collection, backgrounds);
  context.game.packs.set(spells.collection, spells);
  context.Actor = {
    implementation: {
      async create(payload) {
        const actor = makeActor(context, payload);
        context.game.actors.push(actor);
        return actor;
      },
    },
  };
  context.fetch = async (_url, options) => {
    const selection = JSON.parse(options.body);
    assert.deepEqual(selection, {
      backgrounds: ["background-1"],
      spells: ["spell-1"],
    });
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({
        data: {
          backgrounds: [{
            _id: "background-1",
            foundryItem: {
              name: "Acolyte",
              type: "background",
              img: "https://assets.example.com/image/acolyte.webp",
              system: {},
            },
          }],
          spells: [{
            _id: "spell-1",
            name: "Heal",
            level: 6,
            foundryItem: {
              name: "Heal",
              type: "spell",
              img: "https://assets.example.com/image/heal.webp",
              system: { level: 6, method: "spell" },
            },
          }],
        },
      }),
    };
  };

  const result = await importer.importNetherscrollsCampaignCharacter(
    {
      id: "character-1",
      name: "Séléné",
      character: {
        backgroundId: "background-1",
        spells: [{ spellId: "spell-1" }],
      },
      foundryActor: {
        name: "Séléné",
        type: "character",
        img: "https://assets.example.com/image/selene.webp",
        system: {
          traits: { size: "Medium" },
          attributes: { hp: { value: 95, max: 95 }, ac: { value: 16 } },
          details: {},
        },
        items: [],
        effects: [],
      },
    },
    { id: "ns-character-folder" }
  );

  const background = result.actor.items.find((item) => item.type === "background");
  const spell = result.actor.items.find((item) => item.type === "spell");
  assert.equal(result.actor.img, "https://assets.example.com/image/selene.webp");
  assert.equal(background.img, "https://assets.example.com/image/acolyte.webp");
  assert.equal(spell.img, "https://assets.example.com/image/heal.webp");
  assert.equal(result.actor.system.details.background, background.id);
});

test("fetches a detailed Foundry Import character at most once", async () => {
  const { context, importer } = createHarness();
  const fullImport = {
    characterId: "character-1",
    character: { _id: "character-1", name: "Hero" },
    foundryActor: {
      name: "Hero",
      type: "character",
      img: "https://assets.example.com/image/hero.png",
    },
  };
  let fetches = 0;
  context.fetch = async () => {
    fetches += 1;
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ data: fullImport }),
    };
  };

  await importer.hydrateNetherscrollsImportedCharacter({
    id: "character-1",
    name: "Hero",
    foundryActor: fullImport.foundryActor,
  }, "campaign-1");
  assert.equal(fetches, 0);

  await importer.hydrateNetherscrollsImportedCharacter({
    id: "character-1",
    name: "Hero",
  }, "campaign-1");
  assert.equal(fetches, 1);

  const refreshed = await importer.hydrateNetherscrollsImportedCharacter({
    id: "character-1",
    name: "Hero",
    foundryActor: {
      name: "Hero",
      type: "character",
      img: "image/old-list-snapshot.png",
    },
  }, "campaign-1");
  assert.equal(fetches, 2);
  assert.equal(refreshed.foundryActor.img, "https://assets.example.com/image/hero.png");
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

test("exposes the Foundry Import material submit action", () => {
  const template = fs.readFileSync("templates/import-from-netherscroll.hbs", "utf8");
  assert.match(template, /<button type="submit" data-ns-import-action="library">/);
  assert.match(template, /Foundry Import Material/);
});

test("builds the exact unpruned schema-v2 Foundry Export envelope", () => {
  const { context, importer } = createHarness();
  const calls = [];
  const sourceActor = {
    _id: "foundry-actor",
    name: "Hero",
    type: "character",
    flags: { netherscrolls: { characterId: "character-1" }, anotherModule: { keep: true } },
    system: { attributes: { hp: { value: 8, max: 10 } } },
    prototypeToken: { disposition: 1 },
    effects: [{ _id: "effect-1" }],
    items: [{ _id: "item-1", flags: { netherscrolls: { id: "canonical-item" } } }],
  };
  const transformedActor = {
    ...clone(sourceActor),
    system: { attributes: { hp: { value: 12, max: 12 } } },
    prototypeToken: { disposition: 1, sight: { enabled: true } },
  };
  const actor = {
    toObject(source = true) {
      calls.push(source);
      return clone(source === false ? transformedActor : sourceActor);
    },
  };

  const payload = importer.buildFoundryExportPayload(actor);
  assert.deepEqual(calls, [true, false]);
  assert.equal(payload.schemaVersion, 2);
  assert.equal(payload.systemVersion, context.game.system.version);
  assert.deepEqual(payload.actor, sourceActor);
  assert.deepEqual(clone(payload.preparedActor), {
    system: transformedActor.system,
    prototypeToken: transformedActor.prototypeToken,
  });
  assert.equal(payload.actor.flags.anotherModule.keep, true);
  assert.equal(payload.actor.effects.length, 1);
  assert.equal(payload.actor.items.length, 1);
});

test("writes canonical Actor, Item, and subclass ids from Foundry Export responses", async () => {
  const { context, importer } = createHarness();
  const actor = makeActor(context, {
    name: "Hero",
    type: "character",
    flags: { netherscrolls: { characterId: "old-character" } },
  });
  await actor.createEmbeddedDocuments("Item", [
    { _id: "class-local", name: "Fighter", type: "class", system: {}, flags: {} },
    { _id: "subclass-local", name: "Champion", type: "subclass", system: {}, flags: {} },
    { _id: "spell-local", name: "Shield", type: "spell", system: {}, flags: {} },
  ]);

  await importer.applyFoundryExportCanonicalIds(actor, {
    data: { characterId: "character-1" },
    linked: {
      classes: [{
        id: "class-1",
        name: "Fighter",
        subclass: { id: "subclass-1", name: "Champion" },
      }],
    },
    resolved: {
      spells: [{ id: "spell-1", name: "Shield", foundryId: "spell-local" }],
      classes: [{
        id: "class-1",
        name: "Fighter",
        foundryId: "class-local",
        subclass: {
          id: "subclass-1",
          name: "Champion",
          foundryId: "subclass-local",
        },
      }],
    },
  });

  assert.equal(actor.flags.netherscrolls.characterId, "character-1");
  assert.equal(actor.items[0].flags.netherscrolls.id, "class-1");
  assert.equal(actor.items[1].flags.netherscrolls.id, "subclass-1");
  assert.equal(actor.items[1].flags.netherscrolls.classId, "class-1");
  assert.equal(actor.items[2].flags.netherscrolls.id, "spell-1");
});

test("retries only failed entries from a 207 campaign Foundry Export", async () => {
  const { context, importer } = createHarness();
  const firstActor = makeActor(context, {
    name: "First",
    type: "character",
    flags: { netherscrolls: { characterId: "character-1" } },
  });
  const secondActor = makeActor(context, {
    name: "Second",
    type: "character",
    flags: { netherscrolls: { characterId: "character-2" } },
  });
  const requestBodies = [];
  let requestNumber = 0;
  context.fetch = async (_url, options) => {
    requestBodies.push(JSON.parse(options.body));
    requestNumber += 1;
    if (requestNumber === 1) {
      return {
        ok: true,
        status: 207,
        statusText: "Multi-Status",
        json: async () => ({
          data: [
            { index: 0, ok: true, data: { characterId: "character-1" }, linked: {}, resolved: {} },
            { index: 1, ok: false, error: { status: 500, code: "TEMPORARY", message: "Retry" } },
          ],
        }),
      };
    }
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({
        data: [
          { index: 0, ok: true, data: { characterId: "character-2" }, linked: {}, resolved: {} },
        ],
      }),
    };
  };

  const result = await importer.exportNetherscrollsCampaignActors(
    "campaign-1",
    [firstActor, secondActor]
  );
  assert.equal(requestBodies.length, 2);
  assert.equal(requestBodies[0].characters.length, 2);
  assert.equal(requestBodies[1].characters.length, 1);
  assert.equal(requestBodies[1].characters[0].actor.name, "Second");
  assert.equal(result.succeeded.length, 2);
  assert.equal(result.failed.length, 0);
});

test("acknowledges Foundry Import queue entries only after a complete apply", async () => {
  const { context, importer } = createHarness();
  const seedPack = makePack("world.netherscrolls-items", [
    makeDocument({
      _id: "seed-local",
      name: "Seed",
      type: "loot",
      system: {},
      flags: { netherscrolls: { id: "seed-1" } },
    }),
  ]);
  context.game.packs.set(seedPack.collection, seedPack);
  context.game.folders.push({ id: "ns-character-folder", name: "NS-Character", type: "Actor" });
  context.Actor = {
    implementation: {
      async create(payload) {
        const actor = makeActor(context, payload);
        context.game.actors.push(actor);
        return actor;
      },
    },
  };

  const methods = [];
  context.fetch = async (url, options) => {
    methods.push({ url, method: options.method });
    if (url.endsWith("/campaigns")) {
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({ data: [{ _id: "campaign-1", name: "Campaign" }] }),
      };
    }
    if (url.endsWith("/campaigns/campaign-1/imports") && options.method === "GET") {
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({
          data: [{
            character: { _id: "character-1", name: "Hero" },
            foundryActor: {
              name: "Hero",
              type: "character",
              flags: { netherscrolls: { characterId: "character-1" } },
              system: { traits: { size: "med" }, attributes: {} },
              prototypeToken: {},
              items: [],
              effects: [],
            },
            queue: { id: "queue-1" },
          }],
        }),
      };
    }
    if (url.endsWith("/campaigns/campaign-1/imports/character-1") && options.method === "DELETE") {
      return {
        ok: true,
        status: 204,
        statusText: "No Content",
        json: async () => null,
      };
    }
    throw new Error(`Unexpected request: ${options.method} ${url}`);
  };

  const result = await importer.pollNetherscrollsImportQueues();
  assert.deepEqual(clone(result), { imported: 1, failed: 0 });
  assert.equal(
    methods.some((entry) => entry.method === "DELETE" && entry.url.endsWith("/imports/character-1")),
    true
  );
  assert.equal(context.game.actors[0].flags.netherscrolls.characterId, "character-1");
});

test("leaves a Foundry Import queued when a required library document is unavailable", async () => {
  const { context, importer } = createHarness();
  const seedPack = makePack("world.netherscrolls-items", [
    makeDocument({
      _id: "seed-local",
      name: "Seed",
      type: "loot",
      system: {},
      flags: { netherscrolls: { id: "seed-1" } },
    }),
  ]);
  context.game.packs.set(seedPack.collection, seedPack);
  context.game.folders.push({ id: "ns-character-folder", name: "NS-Character", type: "Actor" });
  context.Actor = {
    implementation: {
      async create(payload) {
        const actor = makeActor(context, payload);
        context.game.actors.push(actor);
        return actor;
      },
    },
  };

  let acknowledged = false;
  context.fetch = async (url, options) => {
    if (url.endsWith("/campaigns")) {
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({ data: [{ _id: "campaign-1", name: "Campaign" }] }),
      };
    }
    if (url.endsWith("/campaigns/campaign-1/imports") && options.method === "GET") {
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({
          data: [{
            character: {
              _id: "character-1",
              name: "Hero",
              items: [{ id: "missing-item", name: "Unavailable" }],
            },
            foundryActor: {
              name: "Hero",
              type: "character",
              flags: { netherscrolls: { characterId: "character-1" } },
              system: { traits: { size: "med" }, attributes: {} },
              prototypeToken: {},
              items: [],
              effects: [],
            },
            queue: { id: "queue-1" },
          }],
        }),
      };
    }
    if (url.endsWith("/import/selection") && options.method === "POST") {
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({
          data: { items: [] },
          meta: { requested: { items: 1 }, returned: { items: 0 } },
        }),
      };
    }
    if (options.method === "DELETE") {
      acknowledged = true;
      return { ok: true, status: 204, statusText: "No Content", json: async () => null };
    }
    throw new Error(`Unexpected request: ${options.method} ${url}`);
  };

  const result = await importer.pollNetherscrollsImportQueues();
  assert.deepEqual(clone(result), { imported: 0, failed: 1 });
  assert.equal(acknowledged, false);
});
