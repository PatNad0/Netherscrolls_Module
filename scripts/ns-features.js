/* Native feature rolls and resources. Foundry owns consumption and rest updates. */
(() => {
  "use strict";
  const NS = globalThis.NetherscrollsEffects;
  const { MODULE, clone, list, number } = NS;
  const definition = activity => activity.flags?.[MODULE]?.nativeFeature;
  function pick(value, scope) {
    if (!value || typeof value !== "object") return value ?? 0;
    if (!Array.isArray(value.byLevel) || !value.byLevel.length) throw new Error("Invalid feature level table");
    const rows = [...value.byLevel].sort((a,b) => a.level-b.level);
    return (rows.filter(row => row.level <= (scope.classLevel ?? scope.total ?? 1)).at(-1) ?? rows[0]).value;
  }
  function formula(value, scope = {}, result) {
    value = pick(value, scope);
    if (result) return NS.formulaValue(value, reference => {
      const level = NS.featureReference(reference, scope);
      if (level != null) return level;
      return result.values[NS.referenceTarget(reference)];
    }).formula;
    return NS.serialize(NS.parseFormula(value).ast, {
      ref: reference => {
        const level = NS.featureReference(reference, scope);
        if (level != null) return level;
        if (/^abilities\.(str|dex|con|int|wis|cha)\.(mod|total)$/.test(reference)) return `@${reference.replace(/\.total$/, ".value")}`;
        if (reference === "proficiencyBonus.total") return "@attributes.prof";
        if (reference === "SaveDC.total") return "@attributes.spelldc";
        if (reference === "hp.max.total") return "@attributes.hp.max";
        // Validate unsupported references instead of silently substituting zero.
        throw new Error(`Unmapped feature reference ${reference}`);
      },
      dice: (count, sides) => `(${count})d(${sides})`
    });
  }
  function maximum(usage, scope, result) {
    const scaling = usage.scaling;
    let value = usage.maxCharge;
    if (scaling?.type === "classLevel") value = (scope.classLevel ?? scope.total ?? 1) * number(scaling.multiplier ?? 1);
    else if (scaling?.type === "proficiencyBonus") value = "proficiencyBonus.total";
    else if (scaling?.type === "abilityModifier") value = `max(${number(scaling.minimum)}, abilities.${scaling.ability}.mod + ${number(scaling.offset)})`;
    else if (scaling?.type === "table") value = [...scaling.levels].sort((a,b) => a.level-b.level).filter(row => row.level <= (scope.classLevel ?? 0)).at(-1)?.value ?? usage.maxCharge;
    const bound = formula(value, scope, result);
    if (!result) return `max(0, floor(${bound}))`;
    const evaluated = NS.formulaValue(bound, () => undefined);
    if (evaluated.dice) throw new Error("Feature maximum cannot contain dice");
    return Math.max(scaling?.minimum ?? 0, Math.floor(evaluated.value));
  }
  function uses(usage, scope, result, spent = 0) {
    if (!usage) return { spent, max: "", recovery: [] };
    const max = maximum(usage, scope, result);
    const period = { shortRest: "sr", longRest: "lr", dawn: "dawn", dusk: "dusk" }[
      usage.shortRestFromLevel && scope.classLevel >= usage.shortRestFromLevel ? "shortRest" : usage.rechargeType];
    return { spent, max, ...(result ? { value: Math.max(0, max-spent) } : {}), recovery: period ? [{ period,
      type: usage.rechargeAll ? "recoverAll" : "formula", formula: usage.rechargeAll ? "" : formula(usage.rechargeAmount ?? 1, scope, result) }] : [] };
  }
  const part = (value, type, scope, result) => ({ number: null, denomination: null, bonus: "", types: [String(type).toLowerCase()],
    custom: { enabled: true, formula: formula(value, scope, result) }, scaling: { mode: "", number: 1, formula: "" } });
  function build(feature, original = {}, scope = {}, result) {
    const name = feature.name ?? feature.title ?? original.name ?? "Feature";
    const activity = clone(original);
    activity.name = name;
    activity.activation ??= { type: feature.featureType === "attack" ? "action" : "", value: 1, condition: "" };
    activity.description ??= { chatFlavor: feature.description ?? "", value: feature.description ?? "" };
    activity.effects ??= [];
    activity.range ??= { override: false, units: "", special: "", value: null };
    activity.target ??= { override: false, prompt: true, template: {}, affects: {} };
    activity.duration ??= { concentration: false, override: false, units: "inst", value: null, special: "" };
    activity.uses = uses(feature.usage, scope, result, number(original.uses?.spent));
    activity.consumption = { spellSlot: false, scaling: { allowed: Boolean(feature.consumption?.variable), max: "" },
      targets: feature.usage || feature.consumption ? [{ type: feature.consumption?.target === "item" || feature.usage?.pool ? "itemUses" : "activityUses",
        target: "", value: String(feature.consumption?.amount ?? 1), scaling: { mode: feature.consumption?.variable ? "amount" : "", formula: feature.consumption?.variable ? "1" : "" } }] : [] };
    delete activity.roll; delete activity.save; delete activity.attack; delete activity.healing; delete activity.damage;
    if (feature.featureType === "attack") {
      activity.type = "attack";
      activity.attack = { ability: feature.attackModifier, flat: true, critical: {},
        bonus: `${formula(`abilities.${feature.attackModifier}.mod`, scope, result)} + (${formula(feature.attackBonus, scope, result)})`,
        type: original.attack?.type ?? { value: /ranged|thrown/i.test(name+" "+feature.description) ? "ranged" : "melee", classification: /spell attack/i.test(feature.description) ? "spell" : "weapon" } };
      activity.damage = { critical: { bonus: "" }, includeBase: false, parts: (feature.attackDamage ?? []).map(p => part(p.formula,p.damageType,scope,result)) };
    } else if (feature.featureType === "savingThrow") {
      activity.type = "save";
      activity.save = { ability: feature.saveAbility ? [feature.saveAbility] : [], bonus: "", visible: true,
        dc: { calculation: "", formula: formula(feature.dc,scope,result) } };
      if (result) activity.save.dc.value = NS.formulaValue(activity.save.dc.formula, () => undefined).value;
      activity.damage = { onSave: feature.onSave ?? "half", parts: (feature.damage ?? []).map(p => part(p.formula,p.damageType,scope,result)) };
    } else {
      const healing = /: (healing|hit points|temporary hit points)(?: \(|$)/i.exec(name);
      const damage = /: (acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder) \(/i.exec(name);
      if (feature.action?.type === "layOnHands") {
        activity.type = "heal";
        activity.healing = part(1,"healing",scope,result);
        activity.healing.custom.formula = "@scaling";
        activity.activation.type = "action";
      } else if (feature.formula != null && healing) {
        activity.type = "heal"; activity.healing = part(feature.formula,healing[1].toLowerCase() === "temporary hit points" ? "temphp" : "healing",scope,result);
      } else if (feature.formula != null && damage) {
        activity.type = "damage"; activity.damage = { critical: { allow: false, bonus: "" }, parts: [part(feature.formula,damage[1],scope,result)] };
      } else {
        activity.type = "utility"; activity.roll = { formula: feature.formula == null ? "" : formula(feature.formula,scope,result), name, prompt: false, visible: true };
      }
    }
    activity.flags ??= {}; activity.flags.netherscrolls ??= {};
    delete activity.flags.netherscrolls.conversionWarning;
    delete activity.flags.netherscrolls.unmappedFeature;
    return activity;
  }
  function translateItem(item, source) {
    if (!item.system) return;
    const features = Array.isArray(source.features) ? source.features : source.title || source.featureType ? [source] : [];
    item.system.activities ??= {};
    features.forEach((feature, index) => {
      if (!feature.featureType && !feature.usage && !feature.consumption) return;
      const featureId = feature._id ?? feature.id;
      const existing = Object.values(item.system.activities).find(a => {
        const flags = a.flags?.netherscrolls;
        return flags && (featureId && (flags.nativeFeatureId === featureId || flags.featureEffects?.id === featureId) || flags.itemFeature && flags.featureIndex === index);
      });
      let id = existing?._id ?? NS.stableId(`native-feature:${source._id ?? source.id}:${featureId ?? index}`);
      while (!existing && item.system.activities[id]) id = NS.stableId(`${id}:next`);
      const native = Object.fromEntries(["_id","id","name","title","description","featureType","formula","attackModifier","attackBonus","attackDamage","dc","saveAbility","damage","onSave","usage","consumption","effectApplication","action","level","eligibility"].filter(k => feature[k] !== undefined).map(k => [k,clone(feature[k])]));
      if (!featureId) native.sourcePath = `features.${index}`;
      try {
        const activity = build(native, existing, { total: feature.level ?? 1, classLevel: feature.level ?? 1 });
        activity._id = id;
        activity.flags.netherscrolls = { ...activity.flags.netherscrolls, itemFeature: true, featureIndex: index, nativeFeatureId: featureId };
        activity.flags[MODULE] = { ...activity.flags[MODULE], nativeFeature: native };
        item.system.activities[id] = activity;
        if (feature.usage?.pool) item.system.uses = uses(feature.usage, { classLevel: feature.level ?? 1 });
      } catch (error) {
        if (existing) existing.flags.netherscrolls.conversionWarning = error.message;
        else throw error;
      }
    });
  }
  function identity(item, feature) {
    const meta = item.flags?.[MODULE] ?? {}, ns = item.flags?.netherscrolls ?? {};
    const type = meta.parentSubclassNetherscrollsId ? "subclass" : meta.parentClassNetherscrollsId ? "class" : ["feat","race","background"].includes(item.type) ? item.type : "item";
    const source = meta.parentSubclassNetherscrollsId || meta.parentClassNetherscrollsId || ns.itemId || ns.id;
    if (feature.consumption?.target === "item") return `${type}:${source}:item`;
    if (feature.usage?.pool === "channel-divinity") return "character:pool:channel-divinity";
    if (feature.usage?.pool) return `class:${meta.parentClassNetherscrollsId || source}:pool:${feature.usage.pool}`;
    return `${type}:${source}:${feature._id ?? feature.id}`;
  }
  // Apply leaves in place: consumption targets and damage parts are DataModels.
  function assign(target, data) {
    for (const [key,value] of Object.entries(data)) {
      if (target[key] instanceof Set && Array.isArray(value)) {
        target[key].clear();
        for (const entry of value) target[key].add(entry);
      } else if (value && typeof value === "object" && target[key] && typeof target[key] === "object") {
        if (Array.isArray(value) && Array.isArray(target[key]) && value.length !== target[key].length) target[key] = clone(value);
        else assign(target[key],value);
      } else target[key] = clone(value);
    }
  }
  function plan(actor, state, seed) {
    const rows = [], pools = new Map(), levels = NS.foundry.levelsOf(actor);
    for (const item of list(actor.items)) for (const activity of list(item.system?.activities)) {
      const feature = definition(activity);
      if (!feature) continue;
      const scope = { ...levels, ...NS.foundry.ownerScope(item,levels) };
      const original = activity.toObject ? activity.toObject() : clone(activity);
      const prepared = build(feature, original, scope, state.result);
      prepared.flags[MODULE] = { ...prepared.flags[MODULE], nativeFeature: clone(feature) };
      const key = identity(item,feature), row = { item, activity, feature, prepared, key, scope };
      rows.push(row);
      if (!feature.usage && feature.consumption?.target !== "item") continue;
      if (seed) prepared.uses.spent = number(seed.get(key));
      if (feature.usage?.unlimitedFromLevel && scope.classLevel >= feature.usage.unlimitedFromLevel) {
        prepared.consumption.targets[0].value = "0";
        prepared.consumption.targets[0].scaling = { mode: "", formula: "" };
        prepared.consumption.scaling.allowed = false;
      }
      if (feature.usage?.pool || feature.consumption?.target === "item") {
        const group = pools.get(key) ?? []; group.push(row); pools.set(key,group);
      }
    }
    for (const [key,group] of pools) {
      // Keep the same provider across preparations, including after the pool is spent.
      const provider = group.find(r => r.item.flags?.[MODULE]?.nativePoolKey === key) ??
        [...group].sort((a,b) => String(a.item.id ?? a.item._id).localeCompare(String(b.item.id ?? b.item._id)))[0];
      const itemPool = provider.feature.consumption?.target === "item";
      const data = itemPool ? clone(provider.item.system.uses) : clone(group.reduce((a,b) => a.prepared.uses.max >= b.prepared.uses.max ? a : b).prepared.uses);
      data.spent = seed ? number(seed.get(key)) : number(provider.item._source?.system?.uses?.spent ?? provider.item.system.uses?.spent);
      data.value = Math.max(0, number(data.max)-data.spent);
      provider.pool = data;
      for (const row of group) {
        row.prepared.uses = { spent: 0, max: "", recovery: [] };
        row.prepared.consumption.targets[0].target = provider.item.id ?? provider.item._id;
        row.prepared.consumption.scaling.max = String(Math.max(1,data.value-number(row.feature.consumption?.amount ?? 1)+1));
      }
    }
    for (const row of rows) if (row.prepared.uses.max !== "") row.prepared.uses.value = Math.max(0,number(row.prepared.uses.max)-row.prepared.uses.spent);
    return rows;
  }
  function prepareActor(actor, state) {
    const rows = plan(actor,state), providers = new Set(rows.filter(row => row.pool).map(row => row.item));
    for (const row of rows) {
      for (const key of ["roll","attack","save","damage","healing","uses","consumption"]) if (row.prepared[key]) assign(row.activity[key] ??= {},row.prepared[key]);
      if (row.pool) assign(row.item.system.uses,row.pool);
      else if (row.feature.usage?.pool && !providers.has(row.item)) assign(row.item.system.uses,{max: "", spent: 0, value: 0, recovery: []});
    }
  }
  function sourceActivity(prepared) {
    const data = clone(prepared);
    delete data.uses.value;
    if (data.save?.dc) delete data.save.dc.value;
    data.uses.max = String(data.uses.max);
    return data;
  }
  function prepareActivity(activity, state) {
    const actor = activity.actor, id = activity.id ?? activity._id;
    const row = plan(actor,state).find(row => (row.item.id ?? row.item._id) === (activity.item.id ?? activity.item._id) && (row.activity.id ?? row.activity._id) === id);
    if (!row) return;
    // dnd5e rolls an ephemeral Item clone and may re-prepare it when scaling.
    // Bind the clone's source too, so that re-preparation cannot restore stale rolls.
    if (activity.item !== row.item) activity.item.updateSource?.({ [`system.activities.${id}`]: sourceActivity(row.prepared) });
    const targets = new Set([activity,activity.item.system.activities.get?.(id)]);
    for (const target of targets) if (target) {
      for (const key of ["roll","attack","save","damage","healing","uses","consumption"]) if (row.prepared[key]) assign(target[key] ??= {},row.prepared[key]);
    }
  }
  async function initializeActor(actor, character) {
    for (const item of list(actor.items)) for (const activity of list(item.system?.activities)) {
      const feature = definition(activity);
      if (!feature || feature.id || feature._id) continue;
      const sourceId = item.flags?.netherscrolls?.itemId ?? item.flags?.netherscrolls?.id;
      const bytes = new TextEncoder().encode(`${sourceId}:${feature.sourcePath}`);
      const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
      feature.id = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2,"0")).join("").slice(0,24);
    }
    const state = NS.foundry.collectState(actor);
    const seed = new Map((character.featureUsage ?? []).map(row => [row.key,row.spent]));
    const updates = new Map();
    for (const row of plan(actor,state,seed)) {
      const id = row.item.id ?? row.item._id, update = updates.get(id) ?? { _id: id };
      const activity = sourceActivity(row.prepared);
      update[`system.activities.${row.activity.id ?? row.activity._id}`] = activity;
      if (row.pool) {
        update["system.uses"] = { ...row.pool, max: String(row.pool.max) }; delete update["system.uses"].value;
        update[`flags.${MODULE}.nativePoolKey`] = row.key;
      } else if (row.feature.usage?.pool && !update["system.uses"]) update["system.uses"] = { spent: 0, max: "", recovery: [] };
      updates.set(id,update);
    }
    if (updates.size) await actor.updateEmbeddedDocuments("Item", [...updates.values()], { render: false });
  }
  NS.features = { pick, formula, maximum, uses, build, translateItem, identity, plan, prepareActor, prepareActivity, initializeActor, definition };
})();
