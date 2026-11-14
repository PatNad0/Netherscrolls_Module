/**
 * Own adapter caches, diagnostics, and source-reading primitives for one runtime.
 * Factories receive these exact references so prepared actor state and warning suppression remain shared.
 */

/** Create foundry effect support. */
function createFoundryEffectSupport() {
  const NS = globalThis.NetherscrollsEffects;

  const { MODULE, ABILITIES, SKILLS, TOOLS, clone, list, number, resolve } = NS;

  const states = new WeakMap(),
    preparing = new WeakSet(),
    warnings = new Set(),
    exhaustionBases = new WeakMap();

  const FOREIGN_NOTE = "[Foundry]";

  const report = /** Report. */ (actor, error) => {
    const message = `${actor?.name ?? "Netherscrolls"}: ${error?.message ?? error}`;
    if (warnings.has(message)) return;
    warnings.add(message);
    console.warn(`${MODULE} | NS effects | ${message}`);
    globalThis.ui?.notifications?.warn?.(message);
  };

  /** Update. */
  function set(object, path, value) {
    const parts = path.split(".");
    let target = object;
    for (const part of parts.slice(0, -1)) target = target[part] ??= {};
    target[parts.at(-1)] = value;
  }

  const nativeFlags = /** Handle native flags. */ (actor) =>
    actor?.flags?.[MODULE]?.nativeCharacter;

  const hasNative = /** Determine whether native. */ (actor) => Boolean(nativeFlags(actor));

  // A deterministic Foundry bonus as a number (dice and @references count as 0, like fixed totals).
  const numeric = /** Handle numeric. */ (value) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const parsed = Number(String(value ?? "").replace(/\s+/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const changesOf = /** Handle changes of. */ (effect) =>
    list(effect?.system?.changes).length ? list(effect.system.changes) : list(effect?.changes);

  const effectId = /** Handle effect id. */ (effect) => effect?.id ?? effect?._id;

  return {
    ABILITIES,
    FOREIGN_NOTE,
    MODULE,
    NS,
    SKILLS,
    TOOLS,
    changesOf,
    clone,
    effectId,
    exhaustionBases,
    hasNative,
    list,
    nativeFlags,
    number,
    numeric,
    preparing,
    report,
    resolve,
    states,
  };
}

export { createFoundryEffectSupport };
