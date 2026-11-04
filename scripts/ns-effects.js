/* Native Netherscrolls numeric effects. No JavaScript evaluation of API formulas.
 *
 * Ownership model shared with ns-effects-foundry.js:
 * - Passive modifiers (library features, Netherscrolls character effects, Foundry item and
 *   permanent effects) are calculated here with Netherscrolls rules and exported to Netherscrolls.
 * - Active modifiers (temporary Foundry effects, activity-applied buffs) keep their Foundry
 *   lifecycle. Their numeric changes are read here so every total is counted exactly once,
 *   and they are never exported.
 * - Foundry keys without a Netherscrolls stat (resistances, movement, global check bonuses,
 *   flags, ...) remain applied by D&D5e itself.
 */
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
  const SKILL_BY_FOUNDRY = Object.fromEntries(Object.entries(SKILLS).map(([key, [foundry]]) => [foundry, key]));
  const TOOL_BY_FOUNDRY = Object.fromEntries(Object.entries(TOOLS).map(([key, [foundry]]) => [foundry, key]));
  const FILTERS = { spellClasses: "spellClass", featureTags: "featureTags", rollTypes: "rollType",
    attackKinds: "attackKind", damageTypes: "damageType", weaponIds: "weaponId" };
  // Formula functions and their [minimum, maximum] argument counts (docs: feature formulas).
  const FUNCTIONS = { max: [2, 10], min: [2, 10], floor: [1, 1], ceil: [1, 1], dice: [2, 2] };
  const FEATURE_REFERENCE = /^(?:class\.level|classes\.([a-z][a-z0-9]*)\.level|level\.total|attunement\.count)$/i;
  // Foundry ActiveEffect change modes, by numeric value.
  const FOUNDRY_MODES = ["custom", "multiply", "add", "downgrade", "upgrade", "override"];
  const ORDERED_MODES = new Set(["multiply", "downgrade", "upgrade"]);
  const ABILITY = "(str|dex|con|int|wis|cha)";

  const clone = value => JSON.parse(JSON.stringify(value ?? {}));
  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const get = (value, path) => path.split(".").reduce((v, key) => v?.[key], value);
  const list = value => Array.isArray(value) ? value : value?.contents ?? (typeof value?.values === "function" ? [...value.values()] : value && typeof value === "object" ? Object.values(value) : []);
  const safeKey = key => /^[a-z][a-z0-9]*$/i.test(key) && !["constructor", "prototype", "__proto__"].includes(key);
  const safeStatKey = key => /^[a-z][a-z0-9_-]*$/i.test(key) && !["constructor", "prototype", "__proto__"].includes(key);
  const slug = value => String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

  // ---------------------------------------------------------------- formula language

  function tokenize(input) {
    const tokens = [];
    let offset = 0, diceCount = 0, diceTerms = 0;
    while (offset < input.length) {
      const rest = input.slice(offset);
      const whitespace = /^\s+/.exec(rest);
      if (whitespace) { offset += whitespace[0].length; continue; }
      const match = /^(?:(\d*)[dD](\d+)(?![a-zA-Z0-9.])|(\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)|([a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9]+)*)|([+*/(),\-]))/.exec(rest);
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
    return { tokens, diceTerms };
  }

  function parseFormula(value) {
    if (value && typeof value === "object" && value.ast) return value;
    const input = typeof value === "number" ? String(value) : String(value ?? "").trim() || "0";
    if (input.length > 256) throw new Error("Invalid NS formula length");
    const { tokens, diceTerms } = tokenize(input);
    let cursor = 0, diceCalls = 0;
    const references = [];
    const atom = depth => {
      if (depth > 24) throw new Error("NS formula nesting limit exceeded");
      const token = tokens[cursor++];
      if (!token) throw new Error("Incomplete NS formula");
      if (token.type === "reference" && tokens[cursor]?.type === "(") {
        const name = token.value.toLowerCase();
        if (!FUNCTIONS[name]) throw new Error(`Unknown NS formula function "${token.value}"`);
        cursor++;
        const args = [];
        if (tokens[cursor]?.type !== ")") {
          do { args.push(expression(depth + 1)); } while (tokens[cursor]?.type === "," && ++cursor);
        }
        if (tokens[cursor++]?.type !== ")") throw new Error(`Unclosed NS formula function "${name}"`);
        const [minimum, maximum] = FUNCTIONS[name];
        if (args.length < minimum || args.length > maximum) throw new Error(`${name} takes ${minimum === maximum ? minimum : `${minimum} to ${maximum}`} argument${maximum === 1 ? "" : "s"}`);
        if (name === "dice") diceCalls++;
        return { type: "call", name, args };
      }
      if (token.type === "reference") { references.push(token.value); return token; }
      if (["number", "dice"].includes(token.type)) return token;
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
    if (diceTerms + diceCalls > 16) throw new Error("NS dice limit exceeded");
    return { ast, dice: diceTerms + diceCalls > 0, references };
  }

  const constant = value => ({ value: number(value), formula: String(number(value)), dice: false });
  const plus = (a, b) => ({ value: a.value + b.value, formula: `(${a.formula}) + (${b.formula})`, dice: a.dice || b.dice });

  // Evaluates a formula. `resolve(reference)` returns a number or a {value} result.
  // Dice contribute 0 to the fixed value and are kept in `formula` for roll time.
  function formulaValue(formula, resolve) {
    const parsed = parseFormula(formula);
    const walk = node => {
      if (node.type === "number") return constant(node.value);
      if (node.type === "reference") {
        const resolved = resolve(node.value);
        const value = Number(resolved && typeof resolved === "object" ? resolved.value : resolved);
        if (!Number.isFinite(value)) throw new Error(`Unresolved NS formula reference: ${node.value}`);
        return constant(value);
      }
      if (node.type === "dice") return { value: 0, formula: node.value, dice: true };
      if (node.type === "unary") {
        const child = walk(node.child);
        return { value: node.op === "-" ? -child.value : child.value, formula: `${node.op}(${child.formula})`, dice: child.dice };
      }
      if (node.type === "call") {
        const args = node.args.map(walk);
        if (args.some(arg => arg.dice)) throw new Error(`${node.name}() arguments cannot contain dice`);
        const values = args.map(arg => arg.value);
        if (node.name === "dice") {
          const [count, sides] = values;
          if (!Number.isInteger(count) || count < 0 || count > 100 || !Number.isInteger(sides) || sides < 2 || sides > 1000) {
            throw new Error("dice() needs a whole count from 0 to 100 and sides from 2 to 1000");
          }
          return count === 0 ? constant(0) : { value: 0, formula: `${count}d${sides}`, dice: true };
        }
        const value = node.name === "max" ? Math.max(...values) : node.name === "min" ? Math.min(...values) :
          node.name === "floor" ? Math.floor(values[0]) : Math.ceil(values[0]);
        return constant(value);
      }
      const a = walk(node.left), b = walk(node.right);
      if (node.op === "/" && b.value === 0) throw new Error("Division by zero in NS formula");
      const value = node.op === "+" ? a.value + b.value : node.op === "-" ? a.value - b.value : node.op === "*" ? a.value * b.value : a.value / b.value;
      if (!Number.isFinite(value)) throw new Error("Non-finite NS formula result");
      return { value, formula: `(${a.formula}) ${node.op} (${b.formula})`, dice: a.dice || b.dice };
    };
    return walk(parsed.ast);
  }

  // Serializes a parsed formula. `ref` maps each reference (throwing when it cannot);
  // `dice(count, sides)` renders a dice() call.
  function serialize(node, { ref, dice }, nested = false) {
    const wrap = text => nested ? `(${text})` : text;
    switch (node.type) {
      case "number": return node.value < 0 ? `(${node.value})` : String(node.value);
      case "dice": return node.value;
      case "reference": {
        const mapped = ref(node.value);
        if (mapped == null) throw new Error(`Unmapped reference ${node.value}`);
        return typeof mapped === "number" ? (mapped < 0 ? `(${mapped})` : String(mapped)) : String(mapped);
      }
      case "unary": {
        const child = serialize(node.child, { ref, dice }, true);
        return node.op === "-" ? `-${child}` : child;
      }
      case "call": {
        const args = node.args.map(arg => serialize(arg, { ref, dice }));
        return node.name === "dice" ? dice(args[0], args[1]) : `${node.name}(${args.join(", ")})`;
      }
      default: return wrap(`${serialize(node.left, { ref, dice }, true)} ${node.op} ${serialize(node.right, { ref, dice }, true)}`);
    }
  }

  // Feature references (class.level, classes.<slug>.level, level.total, attunement.count).
  function featureReference(reference, scope = {}) {
    const match = FEATURE_REFERENCE.exec(String(reference ?? ""));
    if (!match) return null;
    const lower = reference.toLowerCase();
    if (lower === "class.level") return number(scope.classLevel ?? scope.total);
    if (lower === "level.total") return number(scope.total);
    if (lower === "attunement.count") return number(scope.attunement);
    return number(scope.classes?.[match[1].toLowerCase()]);
  }
  const hasFeatureReference = formula => {
    try { return parseFormula(formula).references.some(reference => FEATURE_REFERENCE.test(reference)); } catch { return false; }
  };
  // Freezes feature references to numbers, as the API does when an effect is activated.
  function bindFeatureReferences(formula, scope = {}) {
    const parsed = parseFormula(formula);
    if (!parsed.references.some(reference => FEATURE_REFERENCE.test(reference))) return typeof formula === "number" ? String(formula) : String(formula ?? "0");
    return serialize(parsed.ast, { ref: reference => featureReference(reference, scope) ?? reference, dice: (count, sides) => `dice(${count}, ${sides})` });
  }

  // ---------------------------------------------------------------- stat targets

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
  const hasFilters = entry => Object.keys(entry?.filters ?? {}).length > 0;

  // ---------------------------------------------------------------- resolver

  function resolve(character, effects = [], context = {}) {
    const nodes = new Map(), modifiers = new Map(), cache = new Map(), visiting = new Set(), errors = [], applied = {};
    const levels = character._nsLevels ?? {};
    const add = (key, evaluator) => nodes.set(key, evaluator);
    const scalar = (key, value = 0) => add(key, read => {
      if (parseFormula(value ?? 0).dice && !diceAllowed(key)) throw new Error(`Dice are not permitted on ${key}`);
      return formulaValue(value ?? 0, reference => read(reference));
    });
    const component = (key, value) => scalar(key, value ?? 0);
    const block = (key, base = 0) => {
      const entry = get(character, key);
      component(`${key}.misc`, entry?.misc); component(`${key}.bonus`, entry?.bonus);
      add(key, read => plus(plus(typeof base === "function" ? base(read) : constant(base), read(`${key}.misc`, true)), read(`${key}.bonus`, true)));
    };
    const proficiency = character.proficiencyBonus;
    block("proficiencyBonus", proficiency && typeof proficiency === "object" ? proficiency.value ?? 0 : proficiency ?? 0);
    scalar("xp", character.xp ?? 0); scalar("exhaustion", character.exhaustion ?? 0);
    for (const ability of ABILITIES) {
      block(`abilities.${ability}`, character.abilities?.[ability]?.score ?? character.abilities?.[ability] ?? 10);
      add(`abilities.${ability}.mod`, read => constant(Math.floor((read(`abilities.${ability}`, true).value - 10) / 2)));
    }
    for (const family of ["skills", "tools", "savingThrows"]) {
      const defaults = family === "skills" ? SKILLS : family === "tools" ? TOOLS : Object.fromEntries(ABILITIES.map(k => [k, [k, k]]));
      const keys = new Set([...(family === "tools" ? [] : Object.keys(defaults)), ...Object.keys(character[family] ?? {})]);
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
    // Netherscrolls AC: base (armor or armorClass.value) + DEX (capped by armor or
    // maxDexBonus) + shield + misc + bonus + effects. A Foundry AC calculation such as
    // Mage Armor supplies the base including DEX (`_nsAcBase`).
    block("armorClass", read => {
      const raw = character.armorClass;
      const ac = raw && typeof raw === "object" ? raw : { value: raw ?? 10 };
      const gear = character._nsArmor ?? {};
      const dexMod = read("abilities.dex.mod", true).value;
      const capped = limit => {
        if (limit == null || limit === "") return dexMod;
        const cap = Math.max(0, Math.trunc(number(limit)));
        return cap === 0 ? 0 : Math.min(dexMod, cap);
      };
      let base;
      if (character._nsAcBase != null) base = number(character._nsAcBase);
      else if (gear.armor) base = number(gear.armor.value) + capped(gear.armor.dex);
      else base = number(ac.value ?? 10) + capped(ac.maxDexBonus);
      return constant(base + number(gear.shield));
    });
    block("initiative", read => plus(read(`abilities.${character.initiative?.ability ?? "dex"}.mod`, true), constant(
      Math.floor(number(character.initiative?.prof) * read("proficiencyBonus", true).value)
    )));
    for (const stat of ["ToHitStr", "ToHitDext", "ToHitMagic", "SaveDC"]) block(stat, read => {
      const ability = stat === "ToHitStr" ? "str" : stat === "ToHitDext" ? "dex" : character.advanced?.spellcastingAbility || "int";
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
        if (parsed.dice && ORDERED_MODES.has(effect.mode)) throw new Error(`Dice cannot be used with ${effect.mode}`);
        let targets = [canonicalTarget(effect.stat)];
        if (/^savingThrows\.all(?:\.(?:bonus|misc|prof))?$/.test(targets[0])) targets = ABILITIES.map(k => targets[0].replace(".all", `.${k}`));
        if (/^Ressources\.(CurrentQty|TotalQty)$/.test(targets[0])) targets = (character.Ressources ?? []).map(r => `Ressources.${r.Name}.${targets[0].split(".")[1]}`);
        for (const target of targets) {
          if (!nodes.has(target)) throw new Error(`Unsupported NS stat: ${effect.stat}`);
          const entries = modifiers.get(target) ?? [];
          entries.push(effect); modifiers.set(target, entries);
        }
      } catch (error) { errors.push({ effect, message: `${effect.source ? `${effect.source}: ` : ""}${error.message}` }); }
    }
    const isOverride = effect => effect.stat.endsWith(".totalOverride") || effect.mode === "override";
    function read(key, exact = false) {
      const target = exact ? key : referenceTarget(key);
      if (cache.has(target)) return cache.get(target);
      if (!nodes.has(target)) throw new Error(`Unknown NS formula reference: ${key}`);
      if (visiting.has(target)) throw new Error(`FORMULA_CYCLE: ${[...visiting, target].join(" -> ")}`);
      visiting.add(target);
      try {
        const entries = modifiers.get(target) ?? [];
        const evaluate = effect => formulaValue(effect.bonus, reference => {
          const feature = featureReference(reference, { ...levels, ...effect._nsScope });
          return feature ?? read(reference);
        });
        const attempt = (effect, apply) => {
          try { apply(evaluate(effect)); }
          catch (error) {
            if (String(error.message).startsWith("FORMULA_CYCLE")) throw error;
            errors.push({ effect, message: `${effect.source ? `${effect.source}: ` : ""}${error.message}` });
          }
        };
        const note = (effect, value, changed = true) => { if (effect._nsKey) applied[effect._nsKey] = { target, value, changed }; };
        let result;
        const override = entries.filter(isOverride).at(-1);
        if (override) attempt(override, value => { result = { ...value }; note(override, value.value); });
        if (!result) {
          result = nodes.get(target)(read);
          // Foundry order: multiply, add, downgrade, upgrade (override handled above).
          for (const effect of entries.filter(entry => entry.mode === "multiply")) attempt(effect, value => {
            result = { value: result.value * value.value, formula: `(${result.formula}) * (${value.formula})`, dice: result.dice };
            note(effect, value.value);
          });
          for (const effect of entries.filter(entry => !isOverride(entry) && !ORDERED_MODES.has(entry.mode))) attempt(effect, value => {
            result = plus(result, value); note(effect, value.value);
          });
          for (const mode of ["downgrade", "upgrade"]) for (const effect of entries.filter(entry => entry.mode === mode)) attempt(effect, value => {
            const better = mode === "upgrade" ? value.value > result.value : value.value < result.value;
            note(effect, value.value, better);
            if (!better) return;
            const delta = value.value - result.value;
            result = result.dice ? { value: value.value, formula: `(${result.formula}) + (${delta})`, dice: true } : constant(value.value);
          });
        }
        if (target === "armorClass" && result.value < 0) result = constant(0);
        cache.set(target, result);
        return result;
      } finally { visiting.delete(target); }
    }
    for (const key of nodes.keys()) {
      try { read(key, true); } catch (error) { errors.push({ stat: key, message: error.message }); }
    }
    return { values: Object.fromEntries([...cache].map(([key, value]) => [key, value.value])),
      formulas: Object.fromEntries([...cache].filter(([, value]) => value.dice).map(([key, value]) => [key, value.formula])), errors, applied };
  }

  // ---------------------------------------------------------------- Foundry <-> NS translation

  function foundryMode(change) {
    const raw = change?.mode ?? change?.type;
    if (typeof raw === "number") return FOUNDRY_MODES[raw] ?? "custom";
    const name = String(raw ?? "add").toLowerCase();
    return FOUNDRY_MODES.includes(name) ? name : "custom";
  }
  function foundryReference(path) {
    let match;
    if (path === "prof" || path === "attributes.prof") return "proficiencyBonus.total";
    if ((match = new RegExp(`^abilities\\.${ABILITY}\\.mod$`).exec(path))) return `abilities.${match[1]}.mod`;
    if ((match = new RegExp(`^abilities\\.${ABILITY}\\.(?:value|total)$`).exec(path))) return `abilities.${match[1]}.total`;
    if (path === "details.level") return "level.total";
    if ((match = /^classes\.([a-z][\w-]*)\.levels$/i.exec(path))) return `classes.${slug(match[1])}.level`;
    if (path === "attributes.ac.value") return "armorClass.total";
    if (path === "attributes.hp.max") return "hp.max.total";
    if (path === "attributes.init.total") return "initiative.total";
    return null;
  }
  // Converts a Foundry change value to an NS formula, or null when it cannot be read.
  function foundryFormula(value) {
    if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
    if (typeof value === "boolean") return value ? "1" : "0";
    let text = String(value ?? "").trim();
    if (/^true$/i.test(text)) return "1";
    if (/^false$/i.test(text)) return "0";
    if (!text) return null;
    let failed = false;
    text = text.replace(/@([A-Za-z0-9_.-]+)/g, (_, path) => {
      const mapped = foundryReference(path);
      if (mapped == null) failed = true;
      return mapped ?? "0";
    });
    if (failed) return null;
    try { parseFormula(text); return text; } catch { return null; }
  }
  // Foundry keys that Netherscrolls owns. Every other key stays applied by D&D5e.
  function foundryTargets(key) {
    let match;
    if ((match = new RegExp(`^system\\.abilities\\.${ABILITY}\\.value$`).exec(key))) return [{ stat: `abilities.${match[1]}.score` }];
    if ((match = new RegExp(`^system\\.abilities\\.${ABILITY}\\.proficient$`).exec(key))) return [{ stat: `savingThrows.${match[1]}.prof` }];
    if ((match = new RegExp(`^system\\.abilities\\.${ABILITY}\\.bonuses\\.save$`).exec(key))) return [{ stat: `savingThrows.${match[1]}.bonus` }];
    if ((match = /^system\.(skills|tools)\.([a-z0-9]+)\.(value|bonuses\.check)$/i.exec(key))) {
      const family = match[1].toLowerCase();
      const nsKey = (family === "skills" ? SKILL_BY_FOUNDRY : TOOL_BY_FOUNDRY)[match[2]] ?? (safeKey(match[2]) ? match[2] : null);
      return nsKey ? [{ stat: `${family}.${nsKey}.${match[3] === "value" ? "prof" : "bonus"}` }] : null;
    }
    if ((match = /^system\.currency\.(pp|gp|sp|cp)$/.exec(key))) return [{ stat: `currency.${match[1]}` }];
    if ((match = /^system\.spells\.spell([1-9])\.override$/.exec(key))) return [{ stat: `spellSlots.max.lvl${match[1]}`, absolute: true }];
    const fixed = {
      "system.attributes.ac.bonus": [{ stat: "armorClass.bonus" }],
      "system.attributes.init.bonus": [{ stat: "initiative.bonus" }],
      "system.attributes.prof": [{ stat: "proficiencyBonus" }],
      "system.bonuses.mwak.attack": [{ stat: "ToHitStr.bonus" }],
      "system.bonuses.rwak.attack": [{ stat: "ToHitDext.bonus" }],
      "system.bonuses.msak.attack": [{ stat: "ToHitMagic.bonus", group: "spellAttack" }],
      "system.bonuses.rsak.attack": [{ stat: "ToHitMagic.bonus", group: "spellAttack" }],
      "system.bonuses.spell.dc": [{ stat: "SaveDC.bonus" }],
      "system.attributes.hp.bonuses.overall": [{ stat: "hp.max" }],
      "system.attributes.hp.bonuses.level": [{ stat: "hp.max", perLevel: true }],
      "system.attributes.hp.max": [{ stat: "hp.max" }],
      "system.attributes.hp.temp": [{ stat: "hp.temp" }],
      "system.attributes.exhaustion": [{ stat: "exhaustion" }],
      "system.details.xp.value": [{ stat: "xp" }],
    };
    return fixed[key] ?? null;
  }
  // Returns null for a Foundry-owned key; otherwise {entries, acCalc?, warning?}.
  function fromFoundryChange(change) {
    const key = String(change?.key ?? "").trim();
    if (/^system\.attributes\.ac\.(?:calc|formula|flat)$/.test(key)) return { acCalc: true, entries: [] };
    const targets = foundryTargets(key);
    if (!targets) return null;
    const mode = foundryMode(change);
    if (mode === "custom") return { entries: [], warning: `custom change on ${key} is not translated` };
    const formula = foundryFormula(change.value);
    if (formula == null) return { entries: [], warning: `"${change.value}" on ${key} is not a Netherscrolls formula` };
    return { entries: targets.map(target => {
      const override = mode === "override" || (target.absolute && mode !== "add");
      const entry = { stat: override ? `${target.stat}.totalOverride` : target.stat,
        bonus: target.perLevel ? `(${formula}) * level.total` : formula };
      if (ORDERED_MODES.has(mode) && !override) entry.mode = mode;
      if (target.group) entry._nsGroup = target.group;
      return entry;
    }) };
  }

  function nsReferenceToFoundry(reference, scope = {}) {
    let match;
    if (/^class\.level$/i.test(reference)) return scope.classIdentifier ? `@classes.${scope.classIdentifier}.levels` : "@details.level";
    if (/^level\.total$/i.test(reference)) return "@details.level";
    if ((match = /^classes\.([a-z][a-z0-9]*)\.level$/i.exec(reference))) return `@classes.${match[1].toLowerCase()}.levels`;
    if ((match = new RegExp(`^abilities\\.${ABILITY}\\.mod$`).exec(reference))) return `@abilities.${match[1]}.mod`;
    const target = reference.replace(/\.total$/, "");
    if ((match = new RegExp(`^abilities\\.${ABILITY}(?:\\.score)?$`).exec(target))) return `@abilities.${match[1]}.value`;
    if (target === "proficiencyBonus") return "@prof";
    return null;
  }
  // Real Foundry changes for an unconditional NS effect, so D&D5e applies it to any actor
  // (an NPC target of an activity, an actor without a Netherscrolls character). On
  // Netherscrolls actors the runtime recalculates these fields, so they never count twice.
  function toFoundryChanges(entry, scope = {}) {
    if (!entry?.stat || hasFilters(entry)) return [];
    let parsed;
    try { parsed = parseFormula(entry.bonus); } catch { return []; }
    if (parsed.dice && !diceAllowed(entry.stat)) return [];
    let value;
    try {
      value = serialize(parsed.ast, { ref: reference => nsReferenceToFoundry(reference, scope), dice: (count, sides) => `(${count})d(${sides})` });
    } catch { return []; }
    const override = entry.stat.endsWith(".totalOverride");
    const stat = entry.stat.replace(/\.totalOverride$/, "");
    const add = key => ({ key, mode: 2, value });
    const set = key => ({ key, mode: 5, value });
    let match;
    if ((match = new RegExp(`^abilities\\.${ABILITY}(?:\\.(score|misc|bonus))?$`).exec(stat))) {
      if (override && match[2] && match[2] !== "score") return [];
      return [(override ? set : add)(`system.abilities.${match[1]}.value`)];
    }
    if ((match = new RegExp(`^savingThrows\\.(${ABILITY.slice(1, -1)}|all)\\.prof$`).exec(stat))) {
      const abilities = match[1] === "all" ? ABILITIES : [match[1]];
      return abilities.map(ability => (override ? set : add)(`system.abilities.${ability}.proficient`));
    }
    if ((match = new RegExp(`^savingThrows\\.(${ABILITY.slice(1, -1)}|all)(?:\\.(misc|bonus))?$`).exec(stat))) {
      if (override) return [];
      return (match[1] === "all" ? ABILITIES : [match[1]]).map(ability => add(`system.abilities.${ability}.bonuses.save`));
    }
    if ((match = /^(skills|tools)\.([^.]+)(?:\.(prof|misc|bonus))?$/.exec(stat))) {
      const foundryKey = (match[1] === "skills" ? SKILLS : TOOLS)[match[2]]?.[0];
      if (!foundryKey) return [];
      if (match[3] === "prof") return [(override ? set : add)(`system.${match[1]}.${foundryKey}.value`)];
      return override ? [] : [add(`system.${match[1]}.${foundryKey}.bonuses.check`)];
    }
    if ((match = /^armorClass(?:\.(misc|bonus))?$/.exec(stat))) {
      if (!override) return [add("system.attributes.ac.bonus")];
      return match[1] ? [] : [{ key: "system.attributes.ac.calc", mode: 5, value: "flat" }, set("system.attributes.ac.flat")];
    }
    if (/^initiative(?:\.(misc|bonus))?$/.test(stat)) return override ? [] : [add("system.attributes.init.bonus")];
    if ((match = /^proficiencyBonus(?:\.(misc|bonus))?$/.exec(stat))) return override && match[1] ? [] : [(override ? set : add)("system.attributes.prof")];
    const attacks = { ToHitStr: ["mwak"], ToHitDext: ["rwak"], ToHitMagic: ["msak", "rsak"] };
    if ((match = /^(ToHitStr|ToHitDext|ToHitMagic)(?:\.(misc|bonus))?$/.exec(stat))) return override ? [] : attacks[match[1]].map(kind => add(`system.bonuses.${kind}.attack`));
    if (/^SaveDC(?:\.(misc|bonus))?$/.test(stat)) return override ? [] : [add("system.bonuses.spell.dc")];
    if (stat === "hp.max") return [override ? set("system.attributes.hp.max") : add("system.attributes.hp.bonuses.overall")];
    if (stat === "exhaustion") return [(override ? set : add)("system.attributes.exhaustion")];
    return [];
  }

  // ---------------------------------------------------------------- library item translation

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
  function createEffect(entry, { sourceId = "", featureId = "", application = { mode: "passive" }, projection, name, actor = false, scope = {} } = {}) {
    const identity = `${sourceId}:${featureId}:${entry._id ?? entry.id ?? `${entry.stat}:${entry.source ?? ""}:${entry.bonus}`}`;
    const data = clone(projection ?? {});
    data._id ??= stableId(identity);
    data.name = name ?? entry.source ?? `NS: ${entry.stat}`;
    data.disabled = entry.active === false;
    data.transfer = !actor && application.mode !== "activated";
    // Unconditional effects carry real D&D5e changes so Foundry applies them to any actor.
    // On a Netherscrolls actor the runtime recalculates the same fields from the native
    // definition below, so the bonus is never applied twice.
    data.changes = toFoundryChanges(entry, scope);
    if (Array.isArray(data.system?.changes)) data.system.changes = clone(data.changes);
    data.duration = durationData(entry.duration ?? application.duration);
    data.flags ??= {};
    data.flags.netherscrolls = { ...data.flags.netherscrolls, generatedFeatureEffect: !actor,
      sourceId, featureId, nativeEffect: clone(entry), effectApplication: clone(application) };
    data.flags[MODULE] = { ...data.flags[MODULE], nsRuntimeEffect: true, effectKey: `ns-effect:${identity}`,
      sourceStat: entry.stat, nativeActiveBonus: clone(entry), portableActiveEffect: actor };
    const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    const unmapped = !data.changes.length && !hasFilters(entry) ? "<p><em>Calculated by Netherscrolls on Netherscrolls characters only.</em></p>" : "";
    const conditional = hasFilters(entry) ? "<p><em>Conditional: applied by Netherscrolls at roll time.</em></p>" : "";
    data.description = `<p>${escape(entry.stat)}: ${escape(entry.bonus)}</p>${entry.note ? `<p>${escape(entry.note)}</p>` : ""}${conditional}${unmapped}`;
    return data;
  }
  function translateItem(document, source, sourceId) {
    const original = list(document.effects);
    const activities = Object.values(document.system?.activities ?? {});
    const linked = new Set(activities.flatMap(a => list(a.effects).map(e => e._id ?? e.id ?? e)));
    const isNative = effect => effect.flags?.netherscrolls?.nativeEffect || effect.flags?.[MODULE]?.nsRuntimeEffect;
    const features = ["class", "subclass"].includes(document.type) ? [] : list(source.features);
    const owners = [source, ...features];
    const projections = [...original, ...list(source.foundryEffects), ...features.flatMap(f => list(f.foundryEffects))];
    const ownerEntries = owner => list(owner.effects).length || Array.isArray(owner.effects) ? list(owner.effects) : list(owner.activeBonuses ?? owner.activeEffects);
    const hasNativeDefinitions = owners.some(owner => ownerEntries(owner).some(entry => entry?.stat)) ||
      projections.some(projection => projection.flags?.netherscrolls?.nativeEffect);
    // Foundry-authored effects are kept. Passive ones are dropped only when native
    // definitions exist, because the API projects those definitions as Foundry effects too.
    const retained = original.filter(e => !isNative(e) && (e.transfer === false || linked.has(e._id) || !hasNativeDefinitions))
      .map(e => ({ ...clone(e), transfer: e.transfer === false || linked.has(e._id) ? false : e.transfer ?? true }));
    const translated = new Map();
    for (const owner of owners) {
      for (const entry of ownerEntries(owner)) {
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

  globalThis.NetherscrollsEffects = { MODULE, ABILITIES, SKILLS, TOOLS, FILTERS, FUNCTIONS, parseFormula, formulaValue,
    serialize, featureReference, hasFeatureReference, bindFeatureReferences, canonicalTarget, referenceTarget, diceAllowed,
    matchesFilters, hasFilters, resolve, clone, get, list, number, slug, stableId, foundryMode, foundryFormula, foundryTargets,
    fromFoundryChange, toFoundryChanges, createEffect, translateItem, eligible };
})();
