/**
 * Recover item, actor, activity, and damage context from Foundry chat messages.
 * Compatibility fallbacks keep older message shapes usable without changing roll results.
 */
import { toTrimmedStringOrNull } from "../core/utils.js";

/** Retrieve item damage type by roll index. */
function getItemDamageTypeByRollIndex(message, rollIndex) {
  const item = resolveMessageItem(message);
  const parts = resolveMessageDamageParts(message, item);
  if (!parts.length) return null;

  const types = parts
    .map(
      /** Transform each entry while retrieve item damage type by roll index. */ (part) =>
        normalizeDamageTypeLabel(part?.[1])
    )
    .filter(
      /** Keep entries that satisfy the condition while retrieve item damage type by roll index. */ (
        value
      ) => Boolean(value)
    );
  if (!types.length) return null;

  return types[rollIndex] ?? (types.length === 1 ? types[0] : null);
}

/** Resolve message item. */
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

/** Resolve item by uuid. */
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

/** Resolve message actor. */
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
    game?.scenes?.get?.(sceneId) ?? (canvas?.scene?.id === sceneId ? canvas.scene : null);
  const token = scene?.tokens?.get?.(tokenId);
  return token?.actor ?? null;
}

/** Parse actor item ids from uuid. */
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

/** Resolve message damage parts. */
function resolveMessageDamageParts(message, item) {
  const flags = message?.flags?.dnd5e ?? {};
  const rollFlag = flags?.roll ?? {};
  const flaggedRolls = Array.isArray(flags?.rolls) ? flags.rolls : [];

  const candidateParts = [
    rollFlag?.parts,
    rollFlag?.damage?.parts,
    flags?.parts,
    flags?.damage?.parts,
    ...flaggedRolls.map(
      /** Transform each entry while resolve message damage parts. */ (entry) => entry?.parts
    ),
    ...flaggedRolls.map(
      /** Transform each entry while resolve message damage parts. */ (entry) =>
        entry?.damage?.parts
    ),
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

/** Resolve message activity. */
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
      const found = activities.find(
        /** Find the matching entry while resolve message activity. */ (entry) =>
          String(entry?.id ?? "") === activityId
      );
      if (found) return found;
    } else if (typeof activities === "object") {
      if (activities[activityId]) return activities[activityId];
      const found = Object.values(activities).find(
        /** Find the matching entry while resolve message activity. */
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

/** Normalize damage parts. */
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
        part?.formula ?? part?.number ?? part?.roll ?? part?.value ?? part?.base ?? null;
      const type =
        part?.damageType ?? part?.type ?? part?.types ?? part?.damageTypes ?? part?.damage ?? null;
      out.push([formula, type]);
    }
  }
  return out;
}

/** Extract damage type tags from formula. */
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

/** Normalize damage type label. */
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

/** Collect damage type labels. */
function collectDamageTypeLabels(value, out) {
  if (value == null) return;

  if (typeof value === "string") {
    const str = toTrimmedStringOrNull(value);
    if (!str) return;
    const parts = str
      .split(/[,/|]/)
      .map(
        /** Transform each entry while collect damage type labels. */ (part) =>
          toTrimmedStringOrNull(part)
      )
      .filter(Boolean);
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
      .filter(
        /** Keep entries that satisfy the condition while collect damage type labels. */ ([
          ,
          flag,
        ]) => flag === true
      )
      .map(/** Transform each entry while collect damage type labels. */ ([key]) => key);
    if (trueKeys.length) {
      for (const key of trueKeys) collectDamageTypeLabels(key, out);
      return;
    }
  }
}

/** Handle map damage type label. */
function mapDamageTypeLabel(raw) {
  const value = toTrimmedStringOrNull(raw);
  if (!value) return null;

  const known = getKnownDamageTypeMap();
  const cleaned = value
    .replace(/[[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

/** Retrieve known damage type map. */
function getKnownDamageTypeMap() {
  const map = new Map();
  const cfg = CONFIG?.DND5E?.damageTypes ?? {};

  const add = /** Add. */ (key, label) => {
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

/** Handle localize damage type entry. */
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

export {
  extractDamageTypeTagsFromFormula,
  getItemDamageTypeByRollIndex,
  normalizeDamageTypeLabel,
  resolveMessageActor,
};
