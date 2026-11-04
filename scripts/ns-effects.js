/* Native Netherscrolls numeric effects. No JavaScript evaluation of API formulas. */
(() => {
  "use strict";
  const MODULE = "netherscrolls-module";
  const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];
  const SKILLS = {
    acrobatics: ["acr", "dex"], animalHandling: ["ani", "wis"], arcana: ["arc", "int"],
    athletics: ["ath", "str"], deception: ["dec", "cha"], history: ["his", "int"],
    insight: ["ins", "wis"], intimidation: ["itm", "cha"], investigation: ["inv", "int"],
    medicine: ["med", "wis"], nature: ["nat", "int"], perception: ["prc", "wis"],
    performance: ["prf", "cha"], persuasion: ["per", "cha"], religion: ["rel", "int"],
    sleightOfHand: ["slt", "dex"], stealth: ["ste", "dex"], survival: ["sur", "wis"],
  };
  const TOOLS = {
    alchemistsSupplies: ["alchemist", "int"], brewersSupplies: ["brewer", "int"],
    calligraphersSupplies: ["calligrapher", "dex"], carpentersTools: ["carpenter", "str"],
    cartographersTools: ["cartographer", "wis"], cobblersTools: ["cobbler", "dex"],
    cooksUtensils: ["cook", "wis"], glassblowersTools: ["glassblower", "int"],
    jewelersTools: ["jeweler", "int"], leatherworkersTools: ["leatherworker", "dex"],
    masonsTools: ["mason", "str"], paintersSupplies: ["painter", "wis"],
    pottersTools: ["potter", "wis"], smithsTools: ["smith", "str"], tinkersTools: ["tinker", "dex"],
    weaversTools: ["weaver", "dex"], woodcarversTools: ["woodcarver", "dex"],
    disguiseKit: ["disg", "cha"], forgeryKit: ["forg", "dex"], herbalismKit: ["herb", "int"],
    navigatorsTools: ["navg", "wis"], poisonersKit: ["pois", "int"], thievesTools: ["thief", "dex"],
    diceSet: ["dice", "wis"], dragonchessSet: ["chess", "wis"], playingCardSet: ["card", "wis"],
    threeDragonAnteSet: ["dragon", "wis"], bagpipes: ["bagpipes", "cha"], drum: ["drum", "cha"],
    dulcimer: ["dulcimer", "cha"], flute: ["flute", "cha"], horn: ["horn", "cha"],
    lute: ["lute", "cha"], lyre: ["lyre", "cha"], panFlute: ["panflute", "cha"],
    shawm: ["shawm", "cha"], viol: ["viol", "cha"],
  };
  const FILTERS = { spellClasses: "spellClass", featureTags: "featureTags", rollTypes: "rollType",
    attackKinds: "attackKind", damageTypes: "damageType", weaponIds: "weaponId" };
  const clone = value => JSON.parse(JSON.stringify(value ?? {}));
  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const get = (value, path) => path.split(".").reduce((v, key) => v?.[key], value);
  const list = value => Array.isArray(value) ? value : value?.contents ?? (typeof value?.values === "function" ? [...value.values()] : value && typeof value === "object" ? Object.values(value) : []);
  const safeKey = key => /^[a-z][a-z0-9]*$/i.test(key) && !["constructor", "prototype", "__proto__"].includes(key);
  const safeStatKey = key => /^[a-z][a-z0-9_-]*$/i.test(key) && !["constructor", "prototype", "__proto__"].includes(key);

  function parseFormula(value) {
    const input = String(value ?? 0).trim();
    if (!input || input.length > 256) throw new Error("Invalid NS formula length");
    const tokens = [];
    let offset = 0, diceCount = 0, diceTerms = 0;
    while (offset < input.length) {
      const rest = input.slice(offset);
      const whitespace = /^\s+/.exec(rest);
      if (whitespace) { offset += whitespace[0].length; continue; }
      const match = /^(?:(\d*)[dD](\d+)|(\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)|([a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9]+)*)|([+*/()\-]))/.exec(rest);
      if (!match) throw new Error(`Invalid NS formula near ${rest.slice(0, 24)}`);
      offset += match[0].length;
      if (match[2]) {
        const count = Number(match[1] || 1), sides = Number(match[2]);
        diceCount += count; diceTerms++;
        if (count < 1 || sides < 1 || sides > 1000 || diceCount > 100 || diceTerms > 16) throw new Error("NS dice limit exceeded");
        tokens.push({ type: "dice", value: `${count}d${sides}` });
      } else if (match[3]) {
        const numeric = Number(match[3]);
        if (!Number.isFinite(numeric)) throw new Error("Non-finite NS number");
        tokens.push({ type: "number", value: numeric });
      } else if (match[4]) {
        if (match[4].split(".").some(key => !safeKey(key))) throw new Error("Unsafe NS reference");
        tokens.push({ type: "reference", value: match[4] });
      } else tokens.push({ type: match[5] });
      if (tokens.length > 128) throw new Error("NS formula token limit exceeded");
    }
    let cursor = 0;
    const atom = (depth = 0) => {
      if (depth > 24) throw new Error("NS formula nesting limit exceeded");
      const token = tokens[cursor++];
      if (!token) throw new Error("Incomplete NS formula");
      if (["number", "reference", "dice"].includes(token.type)) return token;
      if (["+", "-"].includes(token.type)) return { type: "unary", op: token.type, child: atom(depth + 1) };
      if (token.type === "(") {
        const node = expression(depth + 1);
        if (tokens[cursor++]?.type !== ")") throw new Error("Unclosed NS formula");
        return node;
      }
      throw new Error("Invalid NS formula term");
    };
    const product = depth => {
      let node = atom(depth);
      while (["*", "/"].includes(tokens[cursor]?.type)) node = { type: "binary", op: tokens[cursor++].type, left: node, right: atom(depth) };
      return node;
    };
    const expression = depth => {
      let node = product(depth);
      while (["+", "-"].includes(tokens[cursor]?.type)) node = { type: "binary", op: tokens[cursor++].type, left: node, right: product(depth) };
      return node;
    };
    const ast = expression(0);
    if (cursor !== tokens.length) throw new Error("Unexpected NS formula token");
    return { ast, dice: diceTerms > 0, references: tokens.filter(t => t.type === "reference").map(t => t.value) };
  }

  function formulaValue(formula, resolve) {
    const parsed = parseFormula(formula);
    const walk = node => {
      if (node.type === "number") return { value: node.value, formula: String(node.value), dice: false };
      if (node.type === "reference") {
        const value = resolve(node.value).value;
        return { value, formula: String(value), dice: false };
      }
      if (node.type === "dice") return { value: 0, formula: node.value, dice: true };
      if (node.type === "unary") {
        const child = walk(node.child);
        return { value: node.op === "-" ? -child.value : child.value, formula: `${node.op}(${child.formula})`, dice: child.dice };
      }
      const a = walk(node.left), b = walk(node.right);
      if (node.op === "/" && b.value === 0) throw new Error("Division by zero in NS formula");
      const value = node.op === "+" ? a.value + b.value : node.op === "-" ? a.value - b.value : node.op === "*" ? a.value * b.value : a.value / b.value;
      if (!Number.isFinite(value)) throw new Error("Non-finite NS formula result");
      return { value, formula: `(${a.formula}) ${node.op} (${b.formula})`, dice: a.dice || b.dice };
    };
    return walk(parsed.ast);
  }
  const constant = value => ({ value: number(value), formula: String(number(value)), dice: false });
  const plus = (a, b) => ({ value: a.value + b.value, formula: `(${a.formula}) + (${b.formula})`, dice: a.dice || b.dice });

  function canonicalTarget(stat) {
    let target = String(stat).replace(/\.totalOverride$/, "").replace(/\.total$/, "");
    if (/^abilities\.[^.]+\.score$/.test(target)) target = target.slice(0, -6);
    return target;
  }
  function referenceTarget(stat) {
    if (/^abilities\.(str|dex|con|int|wis|cha)\.mod$/.test(stat)) return stat;
    return canonicalTarget(stat).replace(/\.(misc|bonus|prof)$/, "");
  }
  function diceAllowed(stat) {
    return !stat.endsWith(".totalOverride") && /^(?:(?:skills|tools)\.[^.]+|savingThrows\.(?:str|dex|con|int|wis|cha|all)|initiative|ToHitStr|ToHitDext|ToHitMagic)\.(?:misc|bonus)$/.test(stat);
  }
  function matchesFilters(filters, context = {}) {
    return Object.entries(filters ?? {}).every(([key, values]) => {
      const contextKey = FILTERS[key];
      if (!contextKey || !Array.isArray(values) || !values.length || context[contextKey] == null) return false;
      const actual = Array.isArray(context[contextKey]) ? context[contextKey] : [context[contextKey]];
      return values.some(value => actual.some(entry => String(entry).toLowerCase() === String(value).toLowerCase()));
    });
  }

  function resolve(character, effects = [], context = {}) {
    const nodes = new Map(), modifiers = new Map(), cache = new Map(), visiting = new Set(), errors = [];
    const add = (key, evaluator) => nodes.set(key, evaluator);
    const scalar = (key, value = 0) => add(key, read => {
      if (parseFormula(value ?? 0).dice && !diceAllowed(key)) throw new Error(`Dice are not permitted on ${key}`);
      return formulaValue(value ?? 0, read);
    });
    const component = (key, value) => scalar(key, value ?? 0);
    const block = (key, base = 0) => {
      const entry = get(character, key);
      component(`${key}.misc`, entry?.misc); component(`${key}.bonus`, entry?.bonus);
      add(key, read => plus(plus(typeof base === "function" ? base(read) : constant(base), read(`${key}.misc`, true)), read(`${key}.bonus`, true)));
    };
    block("proficiencyBonus", character.proficiencyBonus?.value ?? character.proficiencyBonus ?? 0);
    scalar("xp", character.xp ?? 0); scalar("exhaustion", character.exhaustion ?? 0);
    for (const ability of ABILITIES) {
      block(`abilities.${ability}`, character.abilities?.[ability]?.score ?? character.abilities?.[ability] ?? 10);
      add(`abilities.${ability}.mod`, read => constant(Math.floor((read(`abilities.${ability}`, true).value - 10) / 2)));
    }
    for (const family of ["skills", "tools", "savingThrows"]) {
      const defaults = family === "skills" ? SKILLS : family === "tools" ? TOOLS : Object.fromEntries(ABILITIES.map(k => [k, [k, k]]));
      const keys = new Set([...Object.keys(defaults), ...Object.keys(character[family] ?? {})]);
      for (const effect of effects) {
        const match = new RegExp(`^${family}\\.([^.]+)`).exec(effect.stat);
        if (match && match[1] !== "all" && safeStatKey(match[1])) keys.add(match[1]);
      }
      for (const key of keys) {
        if (!safeStatKey(key)) continue;
        const entry = character[family]?.[key] ?? {};
        const ability = entry.ability ?? defaults[key]?.[1] ?? "int";
        const path = `${family}.${key}`;
        component(`${path}.prof`, entry.prof ?? 0);
        block(path, read => plus(read(`abilities.${ability}.mod`, true), constant(
          (entry.proficiencyRounding === "up" ? Math.ceil : Math.floor)(read(`${path}.prof`, true).value * read("proficiencyBonus", true).value)
        )));
      }
    }
    block("armorClass", read => {
      if (!character._nsArmor) return constant(character.armorClass?.value ?? character.armorClass ?? 10);
      const { value, dex, shield } = character._nsArmor;
      return constant(value + Math.min(dex ?? Infinity, read("abilities.dex.mod", true).value) + shield);
    });
    block("initiative", read => plus(read(`abilities.${character.initiative?.ability ?? "dex"}.mod`, true), constant(
      number(character.initiative?.prof) * read("proficiencyBonus", true).value
    )));
    for (const stat of ["ToHitStr", "ToHitDext", "ToHitMagic", "SaveDC"]) block(stat, read => {
      const ability = stat === "ToHitStr" ? "str" : stat === "ToHitDext" ? "dex" : character.advanced?.spellcastingAbility ?? "int";
      return constant((stat === "SaveDC" ? 8 : 0) + read(`abilities.${ability}.mod`, true).value + read("proficiencyBonus", true).value);
    });
    for (const part of ["current", "max", "temp"]) scalar(`hp.${part}`, character.hp?.[part]);
    for (const coin of ["pp", "gp", "sp", "cp", "rations"]) scalar(`currency.${coin}`, character.currency?.[coin]);
    for (const part of ["current", "max"]) {
      for (const die of ["d4", "d6", "d8", "d10", "d12", "d20"]) scalar(`hitDice.${part}.${die}`, character.hitDice?.[part]?.[die]);
      for (let level = 1; level <= 15; level++) scalar(`spellSlots.${part}.lvl${level}`, character.spellSlots?.[part]?.[`lvl${level}`]);
    }
    for (const resource of character.Ressources ?? []) {
      for (const part of ["CurrentQty", "TotalQty"]) scalar(`Ressources.${resource.Name}.${part}`, resource[part]);
    }
    const seen = new Set();
    for (const effect of effects) {
      if (effect.active === false || !matchesFilters(effect.filters, context)) continue;
      const identity = effect._nsKey ?? (effect.origin ? JSON.stringify(effect.origin) : effect._id);
      if (identity && seen.has(identity)) continue;
      if (identity) seen.add(identity);
      try {
        const parsed = parseFormula(effect.bonus);
        if (parsed.dice && !diceAllowed(effect.stat)) throw new Error("Dice are not permitted on this NS stat");
        let targets = [canonicalTarget(effect.stat)];
        if (/^savingThrows\.all(?:\.bonus)?$/.test(targets[0])) targets = ABILITIES.map(k => targets[0].replace(".all", `.${k}`));
        if (/^Ressources\.(CurrentQty|TotalQty)$/.test(targets[0])) targets = (character.Ressources ?? []).map(r => `Ressources.${r.Name}.${targets[0].split(".")[1]}`);
        for (const target of targets) {
          if (!nodes.has(target)) throw new Error(`Unsupported NS stat: ${effect.stat}`);
          const entries = modifiers.get(target) ?? [];
          entries.push(effect); modifiers.set(target, entries);
        }
      } catch (error) { errors.push({ effect, message: error.message }); }
    }
    function read(key, exact = false) {
      const target = exact ? key : referenceTarget(key);
      if (cache.has(target)) return cache.get(target);
      if (!nodes.has(target)) throw new Error(`Unknown NS formula reference: ${key}`);
      if (visiting.has(target)) throw new Error(`FORMULA_CYCLE: ${[...visiting, target].join(" -> ")}`);
      visiting.add(target);
      try {
        const entries = modifiers.get(target) ?? [];
        const override = entries.filter(e => e.stat.endsWith(".totalOverride")).at(-1);
        let result;
        if (override) {
          try { result = formulaValue(override.bonus, read); }
          catch (error) {
            if (error.message.startsWith("FORMULA_CYCLE")) throw error;
            errors.push({ effect: override, message: error.message });
          }
        }
        if (!result) {
          result = nodes.get(target)(read);
          for (const effect of entries.filter(entry => !entry.stat.endsWith(".totalOverride"))) {
            try { result = plus(result, formulaValue(effect.bonus, read)); }
            catch (error) {
              if (error.message.startsWith("FORMULA_CYCLE")) throw error;
              errors.push({ effect, message: error.message });
            }
          }
        }
        cache.set(target, result);
        return result;
      } finally { visiting.delete(target); }
    }
    for (const key of nodes.keys()) {
      try { read(key, true); } catch (error) { errors.push({ stat: key, message: error.message }); }
    }
    return { values: Object.fromEntries([...cache].map(([key, value]) => [key, value.value])),
      formulas: Object.fromEntries([...cache].filter(([, value]) => value.dice).map(([key, value]) => [key, value.formula])), errors };
  }

  function stableId(value) {
    let a = 2166136261, b = 5381;
    for (const char of String(value)) { a = Math.imul(a ^ char.charCodeAt(0), 16777619); b = Math.imul(b, 33) ^ char.charCodeAt(0); }
    return (a >>> 0).toString(16).padStart(8, "0") + (b >>> 0).toString(16).padStart(8, "0");
  }
  function durationData(duration) {
    const unit = duration?.unit;
    if (unit === "round") return { rounds: number(duration.value), seconds: number(duration.value) * 6 };
    if (["minute", "hour", "day"].includes(unit)) return { seconds: number(duration.value) * ({ minute: 60, hour: 3600, day: 86400 })[unit] };
    return {};
  }
  function createEffect(entry, { sourceId = "", featureId = "", application = { mode: "passive" }, projection, name, actor = false } = {}) {
    const identity = `${sourceId}:${featureId}:${entry._id ?? entry.id ?? `${entry.stat}:${entry.source ?? ""}:${entry.bonus}`}`;
    const data = clone(projection ?? {});
    data._id ??= stableId(identity);
    data.name = name ?? entry.source ?? `NS: ${entry.stat}`;
    data.disabled = entry.active === false;
    data.transfer = !actor && application.mode !== "activated";
    // The runtime owns calculation, including final overrides and roll conditions.
    // Empty changes prevent D&D5e from also applying a second copy of the bonus.
    data.changes = [];
    if (data.system?.changes) data.system.changes = [];
    data.duration = durationData(entry.duration ?? application.duration);
    data.flags ??= {};
    data.flags.netherscrolls = { ...data.flags.netherscrolls, generatedFeatureEffect: !actor,
      sourceId, featureId, nativeEffect: clone(entry), effectApplication: clone(application) };
    data.flags[MODULE] = { ...data.flags[MODULE], nsRuntimeEffect: true, effectKey: `ns-effect:${identity}`,
      sourceStat: entry.stat, nativeActiveBonus: clone(entry), portableActiveEffect: actor };
    const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    data.description = `<p>${escape(entry.stat)}: ${escape(entry.bonus)}</p>${entry.note ? `<p>${escape(entry.note)}</p>` : ""}`;
    return data;
  }
  function translateItem(document, source, sourceId) {
    const original = list(document.effects);
    const activities = Object.values(document.system?.activities ?? {});
    const linked = new Set(activities.flatMap(a => list(a.effects).map(e => e._id ?? e.id ?? e)));
    const isNative = effect => effect.flags?.netherscrolls?.nativeEffect || effect.flags?.[MODULE]?.nsRuntimeEffect;
    const retained = original.filter(e => !isNative(e) && (e.transfer === false || linked.has(e._id))).map(e => ({ ...clone(e), transfer: false }));
    const features = ["class", "subclass"].includes(document.type) ? [] : list(source.features);
    const owners = [source, ...features];
    const projections = [...original, ...list(source.foundryEffects), ...features.flatMap(f => list(f.foundryEffects))];
    const translated = new Map();
    for (const owner of owners) {
      const entries = list(owner.effects).length || Array.isArray(owner.effects) ? list(owner.effects) : list(owner.activeBonuses ?? owner.activeEffects);
      for (const entry of entries) {
        if (!entry?.stat) continue;
        const projection = projections.find(e => e.flags?.netherscrolls?.nativeEffect?._id && e.flags.netherscrolls.nativeEffect._id === entry._id);
        const flags = projection?.flags?.netherscrolls;
        const featureId = owner === source ? flags?.featureId ?? "" : owner.id ?? owner._id ?? owner.name ?? owner.title ?? "";
        const application = owner.effectApplication ?? flags?.effectApplication ?? { mode: "passive", requirement: "selected" };
        const effect = createEffect(entry, { sourceId: flags?.sourceId ?? sourceId, featureId, application, projection, name: owner.name ?? owner.title });
        translated.set(effect.flags[MODULE].effectKey, effect);
        if (application.mode === "activated") {
          let activity = activities.find(a => {
            const f = a.flags?.netherscrolls;
            return f?.featureEffects?.id === featureId || f?.featureId === featureId || f?.nativeFeatureId === featureId;
          });
          if (!activity) {
            document.system ??= {}; document.system.activities ??= {};
            const id = stableId(`activity:${sourceId}:${featureId}`);
            activity = document.system.activities[id] ??= { _id: id, type: "utility", name: owner.name ?? owner.title ?? "NS effect",
              activation: { type: "action", value: 1 }, effects: [], flags: { netherscrolls: { nativeFeatureId: featureId } } };
            activities.push(activity);
          }
          activity.effects ??= [];
          if (!activity.effects.some(e => (e._id ?? e.id) === effect._id)) activity.effects.push({ _id: effect._id });
        }
      }
    }
    // Feature-only projections carry native definitions when the outer payload does not.
    if (!Array.isArray(source.features)) for (const projection of projections) {
      const flags = projection.flags?.netherscrolls;
      if (!flags?.nativeEffect) continue;
      if ([...translated.values()].some(e => e.flags.netherscrolls.nativeEffect._id === flags.nativeEffect._id)) continue;
      const effect = createEffect(flags.nativeEffect, { sourceId: flags.sourceId ?? sourceId, featureId: flags.featureId,
        application: flags.effectApplication, projection, name: projection.name });
      translated.set(effect.flags[MODULE].effectKey, effect);
    }
    const result = [...retained, ...translated.values()];
    if (["light", "medium", "heavy", "shield"].includes(document.system?.type?.value) &&
        result.some(e => canonicalTarget(e.flags?.netherscrolls?.nativeEffect?.stat ?? "") === "armorClass")) {
      document.system.armor ??= {}; document.system.armor.magicalBonus = "";
    }
    return result;
  }
  function eligible(application, item) {
    if (!item) return true;
    if (application?.mode === "activated") return false;
    const equipped = item.system?.equipped === true;
    const attuned = item.system?.attuned === true || item.system?.attunement === 2;
    switch (application?.requirement ?? "selected") {
      case "selected": case "owned": return true;
      case "equipped": return equipped;
      case "attuned": return attuned;
      case "equippedAndAttuned": return equipped && attuned;
      default: return false;
    }
  }
  function collect(actor, now = Date.now()) {
    const result = [], keys = new Set();
    const passiveOrigins = new Set();
    const read = (effect, item) => {
      if (!effect.flags?.[MODULE]?.nsRuntimeEffect) return;
      const flags = effect.flags?.netherscrolls;
      const native = flags?.nativeEffect ?? effect.flags?.[MODULE]?.nativeActiveBonus;
      if (!native?.stat || effect.disabled || native.active === false || !eligible(flags?.effectApplication, item)) return;
      if (native.expiresAt && Date.parse(native.expiresAt) <= now) return;
      // Item definitions never expire while eligible. Duration starts on activation.
      if (!item && effect.duration?.remaining != null && effect.duration.remaining <= 0 && effect.duration.type !== "none") return;
      const lifecycle = effect.flags?.[MODULE]?.lifecycle;
      if (!item && lifecycle && effect.duration?.seconds != null &&
          number(globalThis.game?.time?.worldTime) >= lifecycle.startedAt + effect.duration.seconds) return;
      const origin = native.origin;
      const originKey = origin ? [origin.sourceId ?? origin.itemId, origin.featureId, origin.effectId, origin.characterId].join(":") : null;
      if (!item && originKey && passiveOrigins.has(originKey)) return;
      if (item) passiveOrigins.add([flags.sourceId, flags.featureId, native._id,
        actor.flags?.netherscrolls?.characterId ?? actor.flags?.[MODULE]?.nativeCharacter?._id].join(":"));
      const key = originKey ?? `${item?.id ?? lifecycle?.sourceActorId ?? actor.id}:${effect.flags?.[MODULE]?.effectKey ?? effect._id ?? effect.id}`;
      if (keys.has(key)) return;
      keys.add(key); result.push({ ...clone(native), _nsKey: key });
    };
    for (const item of list(actor.items)) for (const effect of list(item.effects)) {
      if (effect.transfer !== false) read(effect, item);
    }
    // A repeated activation refreshes a source; prefer the most recent instance.
    for (const effect of [...list(actor.effects)].reverse()) read(effect, null);
    return result;
  }

  globalThis.NetherscrollsEffects = { MODULE, ABILITIES, SKILLS, TOOLS, FILTERS, parseFormula, formulaValue,
    canonicalTarget, referenceTarget, diceAllowed, matchesFilters, resolve, clone, get, list, number,
    stableId, createEffect, translateItem, eligible, collect };
})();
