/**
 * Plan shared resource providers and prepare native feature activities.
 * Keep pool identity stable across preparations, then persist only the source fields Foundry owns.
 */

/** Create native feature resources. */
function createNativeFeatureResources({ MODULE, NS, build, clone, definition, list, number }) {
  /** Give related activities the same resource identity while keeping different class and item sources distinct. */
  function identity(item, feature) {
    const meta = item.flags?.[MODULE] ?? {},
      ns = item.flags?.netherscrolls ?? {};
    const type = meta.parentSubclassNetherscrollsId
      ? "subclass"
      : meta.parentClassNetherscrollsId
        ? "class"
        : ["feat", "race", "background"].includes(item.type)
          ? item.type
          : "item";
    const source =
      meta.parentSubclassNetherscrollsId || meta.parentClassNetherscrollsId || ns.itemId || ns.id;
    if (feature.consumption?.target === "item") return `${type}:${source}:item`;
    if (feature.usage?.pool === "channel-divinity") return "character:pool:channel-divinity";
    if (feature.usage?.pool)
      return `class:${meta.parentClassNetherscrollsId || source}:pool:${feature.usage.pool}`;
    return `${type}:${source}:${feature._id ?? feature.id}`;
  }

  // Apply leaves in place: consumption targets and damage parts are DataModels.
  /** Update DataModel leaves in place and preserve Set containers expected by Foundry. */
  function assign(target, data) {
    for (const [key, value] of Object.entries(data)) {
      if (target[key] instanceof Set && Array.isArray(value)) {
        target[key].clear();
        for (const entry of value) target[key].add(entry);
      } else if (
        value &&
        typeof value === "object" &&
        target[key] &&
        typeof target[key] === "object"
      ) {
        if (
          Array.isArray(value) &&
          Array.isArray(target[key]) &&
          value.length !== target[key].length
        )
          target[key] = clone(value);
        else assign(target[key], value);
      } else target[key] = clone(value);
    }
  }

  /** Choose a stable provider for each shared pool so spending it cannot move its ownership on the next preparation. */
  function plan(actor, state, seed) {
    const rows = [],
      pools = new Map(),
      levels = NS.foundry.levelsOf(actor);
    for (const item of list(actor.items))
      for (const activity of list(item.system?.activities)) {
        const feature = definition(activity);
        if (!feature) continue;
        const scope = { ...levels, ...NS.foundry.ownerScope(item, levels) };
        const original = activity.toObject ? activity.toObject() : clone(activity);
        const prepared = build(feature, original, scope, state.result);
        prepared.flags[MODULE] = { ...prepared.flags[MODULE], nativeFeature: clone(feature) };
        const key = identity(item, feature),
          row = { item, activity, feature, prepared, key, scope };
        rows.push(row);
        if (!feature.usage && feature.consumption?.target !== "item") continue;
        if (seed) prepared.uses.spent = number(seed.get(key));
        if (
          feature.usage?.unlimitedFromLevel &&
          scope.classLevel >= feature.usage.unlimitedFromLevel
        ) {
          prepared.consumption.targets[0].value = "0";
          prepared.consumption.targets[0].scaling = { mode: "", formula: "" };
          prepared.consumption.scaling.allowed = false;
        }
        if (feature.usage?.pool || feature.consumption?.target === "item") {
          const group = pools.get(key) ?? [];
          group.push(row);
          pools.set(key, group);
        }
      }
    for (const [key, group] of pools) {
      // Keep the same provider across preparations, including after the pool is spent.
      const provider =
        group.find(
          /** Find the matching entry while handle plan. */ (r) =>
            r.item.flags?.[MODULE]?.nativePoolKey === key
        ) ??
        [...group].sort(
          /** Order the entries while handle plan. */ (a, b) =>
            String(a.item.id ?? a.item._id).localeCompare(String(b.item.id ?? b.item._id))
        )[0];
      const itemPool = provider.feature.consumption?.target === "item";
      const data = itemPool
        ? clone(provider.item.system.uses)
        : clone(
            group.reduce(
              /** Combine entries into a result while handle plan. */ (a, b) =>
                a.prepared.uses.max >= b.prepared.uses.max ? a : b
            ).prepared.uses
          );
      data.spent = seed
        ? number(seed.get(key))
        : number(provider.item._source?.system?.uses?.spent ?? provider.item.system.uses?.spent);
      data.value = Math.max(0, number(data.max) - data.spent);
      provider.pool = data;
      for (const row of group) {
        row.prepared.uses = { spent: 0, max: "", recovery: [] };
        row.prepared.consumption.targets[0].target = provider.item.id ?? provider.item._id;
        row.prepared.consumption.scaling.max = String(
          Math.max(1, data.value - number(row.feature.consumption?.amount ?? 1) + 1)
        );
      }
    }
    for (const row of rows)
      if (row.prepared.uses.max !== "")
        row.prepared.uses.value = Math.max(
          0,
          number(row.prepared.uses.max) - row.prepared.uses.spent
        );
    return rows;
  }

  /** Prepare actor. */
  function prepareActor(actor, state) {
    const rows = plan(actor, state),
      providers = new Set(
        rows
          .filter(
            /** Keep entries that satisfy the condition while prepare actor. */ (row) => row.pool
          )
          .map(/** Transform each entry while prepare actor. */ (row) => row.item)
      );
    for (const row of rows) {
      for (const key of ["roll", "attack", "save", "damage", "healing", "uses", "consumption"])
        if (row.prepared[key]) assign((row.activity[key] ??= {}), row.prepared[key]);
      if (row.pool) assign(row.item.system.uses, row.pool);
      else if (row.feature.usage?.pool && !providers.has(row.item))
        assign(row.item.system.uses, { max: "", spent: 0, value: 0, recovery: [] });
    }
  }

  /** Handle source activity. */
  function sourceActivity(prepared) {
    const data = clone(prepared);
    delete data.uses.value;
    if (data.save?.dc) delete data.save.dc.value;
    data.uses.max = String(data.uses.max);
    return data;
  }

  /** Prepare ephemeral item clones as well as their source so scaling cannot restore stale formulas. */
  function prepareActivity(activity, state) {
    const actor = activity.actor,
      id = activity.id ?? activity._id;
    const row = plan(actor, state).find(
      /** Find the matching entry while prepare activity. */
      (row) =>
        (row.item.id ?? row.item._id) === (activity.item.id ?? activity.item._id) &&
        (row.activity.id ?? row.activity._id) === id
    );
    if (!row) return;
    // dnd5e rolls an ephemeral Item clone and may re-prepare it when scaling.
    // Bind the clone's source too, so that re-preparation cannot restore stale rolls.
    if (activity.item !== row.item)
      activity.item.updateSource?.({ [`system.activities.${id}`]: sourceActivity(row.prepared) });
    const targets = new Set([activity, activity.item.system.activities.get?.(id)]);
    for (const target of targets)
      if (target) {
        for (const key of ["roll", "attack", "save", "damage", "healing", "uses", "consumption"])
          if (row.prepared[key]) assign((target[key] ??= {}), row.prepared[key]);
      }
  }

  /** Seed persisted feature usage after import using the same pool identity plan as runtime preparation. */
  async function initializeActor(actor, character) {
    for (const item of list(actor.items))
      for (const activity of list(item.system?.activities)) {
        const feature = definition(activity);
        if (!feature || feature.id || feature._id) continue;
        const sourceId = item.flags?.netherscrolls?.itemId ?? item.flags?.netherscrolls?.id;
        const bytes = new TextEncoder().encode(`${sourceId}:${feature.sourcePath}`);
        const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
        feature.id = Array.from(
          new Uint8Array(digest),
          /** Perform the callback while initialize actor. */ (byte) =>
            byte.toString(16).padStart(2, "0")
        )
          .join("")
          .slice(0, 24);
      }
    const state = NS.foundry.collectState(actor);
    const seed = new Map(
      (character.featureUsage ?? []).map(
        /** Transform each entry while initialize actor. */ (row) => [row.key, row.spent]
      )
    );
    const updates = new Map();
    for (const row of plan(actor, state, seed)) {
      const id = row.item.id ?? row.item._id,
        update = updates.get(id) ?? { _id: id };
      const activity = sourceActivity(row.prepared);
      update[`system.activities.${row.activity.id ?? row.activity._id}`] = activity;
      if (row.pool) {
        update["system.uses"] = { ...row.pool, max: String(row.pool.max) };
        delete update["system.uses"].value;
        update[`flags.${MODULE}.nativePoolKey`] = row.key;
      } else if (row.feature.usage?.pool && !update["system.uses"])
        update["system.uses"] = { spent: 0, max: "", recovery: [] };
      updates.set(id, update);
    }
    if (updates.size)
      await actor.updateEmbeddedDocuments("Item", [...updates.values()], { render: false });
  }

  return { identity, initializeActor, plan, prepareActivity, prepareActor };
}

export { createNativeFeatureResources };
