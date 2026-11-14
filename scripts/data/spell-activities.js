/**
 * Build Foundry activities from inferred spell mechanics.
 * Separate secondary outcomes so damage, healing, and save behavior retain their own context.
 */
import { hashNetherscrollsString, toTrimmedStringOrNull } from "../core/utils.js";
import { NETHERSCROLLS_ABILITY_LABELS, NETHERSCROLLS_DAMAGE_TYPES } from "./catalogs.js";
import { normalizeNetherscrollsSaveAbility } from "./rules.js";
import {
  buildNetherscrollsActivityPart,
  parseNetherscrollsDicePart,
  parseNetherscrollsFormulaFromUnknown,
} from "./spell-fields.js";
import { parseNetherscrollsDamageFormula } from "./spell-inference.js";

/** Build spell activity. */
function buildNetherscrollsSpellActivity(source, inferred) {
  // A spell with no roll still needs an activity: casting it spends the slot and starts
  // concentration, which D&D5e only does through an activity.
  const type = getNetherscrollsActivityType(source, inferred) ?? "utility";

  const activity = buildNetherscrollsBaseActivity(source, type, inferred);
  if (type === "attack") {
    activity.attack = {
      ability: "spellcasting",
      bonus: "",
      critical: {},
      flat: false,
      type: {
        value: inferred.attack ?? "ranged",
        classification: "spell",
      },
    };
    if (inferred.damage) activity.damage = buildNetherscrollsActivityDamage(inferred.damage);
  } else if (type === "save") {
    activity.save = {
      ability: [inferred.saveAbility],
      dc: {
        formula: "",
        calculation: "spellcasting",
      },
    };
    activity.damage = buildNetherscrollsSaveActivityDamage(inferred.damage, inferred.text);
  } else if (type === "heal") {
    activity.healing = buildNetherscrollsActivityPart(inferred.healing);
  } else if (type === "damage") {
    activity.damage = buildNetherscrollsActivityDamage(inferred.damage);
  }

  return activity;
}

// Many spells do more than one thing: a spell attack with a saving throw rider, two lights to
// choose from, damage that also heals the caster. The main activity takes the effect the text
// describes first. Each other explicit effect gets its own activity, which spends no spell slot
// and starts no concentration, because it is part of the same casting.
/** Keep secondary outcomes separate from the primary activity so their roll and save semantics survive. */
function buildNetherscrollsSecondarySpellActivities(source, inferred, primary) {
  const text = String(inferred.text ?? "");
  const abilities = Object.values(NETHERSCROLLS_ABILITY_LABELS).flat().join("|");
  const save = new RegExp(
    `\\b(?:make|makes|succeed on|succeeds on|attempt|attempts)\\s+(?:(?:a|an)\\s+)?(${abilities})\\s+saving throw\\b`,
    "i"
  ).exec(text);
  const attack =
    /\b(?:make|makes)\s+(?:a|an|one|two|three|four|\d+|up to (?:one|two|three|four|\d+))\s+(melee|ranged)\s+spell attacks?\b/i.exec(
      text
    );
  const wantsSave = Boolean(save && primary.type !== "save");
  const wantsAttack = Boolean(attack && primary.type !== "attack");
  const wantsHeal = Boolean(inferred.healing && primary.type !== "heal");
  if (!wantsSave && !wantsAttack && !wantsHeal) return [];

  // Each effect's damage is stated after the phrase that introduces it: up to the next effect,
  // within three sentences ("Make a ranged spell attack. ... On a hit, it takes 4d6 lightning damage.").
  const starts = [save?.index, attack?.index].filter(
    /** Keep entries that satisfy the condition while build secondary spell activities. */ (
      index
    ) => Number.isInteger(index)
  );
  const segment = /** Handle segment. */ (index, sentences = 3) => {
    let end = index;
    for (let sentence = 0; sentence < sentences && end >= 0; sentence += 1)
      end = text.indexOf(". ", end + 1);
    const next = Math.min(
      ...starts.filter(
        /** Keep entries that satisfy the condition while build secondary spell activities. */ (
          start
        ) => start > index
      )
    );
    const stop = Math.min(end < 0 ? text.length : end + 1, next);
    return text.slice(index, stop);
  };
  const explicitDamage = Boolean(parseNetherscrollsFormulaFromUnknown(source?.damage));
  const damageIn = /** Handle damage in. */ (part) => {
    const parsed = parseNetherscrollsDamageFormula(part);
    if (!parsed?.formula || !parsed?.type) return null;
    const result = parseNetherscrollsDicePart(parsed.formula, parsed.type);
    if (parsed.types?.length > 1) result.types = parsed.types;
    return result;
  };

  // A text-inferred main save or attack keeps only the damage stated in its own part of the text,
  // not a later effect's damage. Damage listed by the API is left as it is.
  const primaryStart =
    primary.type === "save" ? save?.index : primary.type === "attack" ? attack?.index : null;
  if (!explicitDamage && Number.isInteger(primaryStart) && primary.damage) {
    const own = damageIn(segment(primaryStart, Infinity));
    const parts = own ? [{ ...own, scaling: inferred.damage?.scaling ?? own.scaling }] : [];
    primary.damage.parts = parts.map(buildNetherscrollsActivityPart);
  }
  const primaryParts = [...(primary.damage?.parts ?? [])];
  const secondaryDamage = /** Handle secondary damage. */ (index) => {
    const part = damageIn(segment(index));
    if (!part) return null;
    // With API-listed damage the main activity may already roll this phrase.
    const repeated =
      explicitDamage &&
      primaryParts.some(
        /** Check whether any entry matches while build secondary spell activities. */
        (existing) =>
          existing.number === part.number &&
          existing.denomination === part.denomination &&
          existing.types?.[0] === part.types[0]
      );
    return repeated ? null : part;
  };
  const secondary = /** Handle secondary. */ (type) => {
    const activity = buildNetherscrollsBaseActivity(source, type, inferred);
    activity.consumption.spellSlot = false;
    activity.duration = { value: "", units: "inst", concentration: false, override: true };
    return activity;
  };

  const activities = [];
  if (wantsSave) {
    const activity = secondary("save");
    activity.save = {
      ability: [normalizeNetherscrollsSaveAbility(save[1])],
      dc: { formula: "", calculation: "spellcasting" },
    };
    activity.damage = buildNetherscrollsSaveActivityDamage(
      secondaryDamage(save.index),
      segment(save.index)
    );
    activities.push(activity);
  }
  if (wantsAttack) {
    const activity = secondary("attack");
    activity.attack = {
      ability: "spellcasting",
      bonus: "",
      critical: {},
      flat: false,
      type: { value: attack[1].toLowerCase(), classification: "spell" },
    };
    activity.damage = buildNetherscrollsActivityDamage(secondaryDamage(attack.index));
    activities.push(activity);
  }
  if (wantsHeal) {
    const activity = secondary("heal");
    activity.healing = buildNetherscrollsActivityPart(inferred.healing);
    activities.push(activity);
  }
  for (const [index, activity] of activities.entries()) activity.sort = (index + 1) * 100000;
  return activities;
}

/** Retrieve activity type. */
function getNetherscrollsActivityType(source, inferred) {
  const explicit = toTrimmedStringOrNull(source?.actionType ?? source?.activityType)?.toLowerCase();
  if (
    explicit === "save" ||
    explicit === "attack" ||
    explicit === "heal" ||
    explicit === "damage"
  ) {
    return explicit;
  }
  // Follow the order the text describes: healing after damage, an attack or a save is a rider
  // ("...2d6 necrotic damage, and you regain 1d6 hit points"), and a save described before a
  // spell attack is the main effect. Values with no matching phrase keep the fixed order.
  const text = String(inferred.text ?? "");
  const at = /** Handle at. */ (pattern) => {
    const index = text.search(pattern);
    return index < 0 ? Infinity : index;
  };
  const healAt = at(
    /\b(?:regains?|restore[sd]?)\s+(?:up to\s+)?(?:a number of\s+)?(?:hit points\s+)?(?:equal to\s+)?\d/i
  );
  const attackAt = inferred.attack
    ? at(/\b(?:melee|ranged) spell attacks?\b|\b[mr]sak\b/i)
    : Infinity;
  const saveAt = inferred.saveAbility
    ? at(
        new RegExp(
          `\\b(?:${Object.values(NETHERSCROLLS_ABILITY_LABELS).flat().join("|")})\\s+saving throw\\b`,
          "i"
        )
      )
    : Infinity;
  const damageAt = inferred.damage
    ? at(new RegExp(`\\b(?:${NETHERSCROLLS_DAMAGE_TYPES.join("|")})\\s+damage\\b`, "i"))
    : Infinity;
  const healIsRider = healAt !== Infinity && Math.min(attackAt, saveAt, damageAt) < healAt;
  if (inferred.healing && !healIsRider) return "heal";
  if (inferred.attack && inferred.saveAbility && saveAt < attackAt) return "save";
  if (inferred.attack) return "attack";
  if (inferred.saveAbility) return "save";
  if (inferred.damage) return "damage";
  return null;
}

/** Build base activity. */
function buildNetherscrollsBaseActivity(source, type, inferred) {
  const id = buildNetherscrollsActivityId(source, type);
  const range = inferred.range ?? { units: "self" };
  const duration = inferred.duration ?? { value: "0", units: "inst" };
  return {
    type,
    _id: id,
    sort: 0,
    activation: {
      type: inferred.activation?.type ?? "action",
      override: false,
    },
    consumption: {
      spellSlot: true,
      targets: [],
      scaling: {
        allowed: false,
        max: "",
      },
    },
    description: {
      chatFlavor: inferNetherscrollsChatFlavor(inferred.text),
    },
    duration: {
      value: duration.value ?? "",
      units: duration.units ?? "inst",
      concentration: inferred.properties?.includes("concentration") ?? false,
      override: false,
    },
    effects: [],
    range: {
      ...range,
      override: false,
    },
    target: {
      ...(inferred.target ?? {}),
      override: false,
      prompt: true,
    },
    uses: {
      spent: 0,
      recovery: [],
    },
    flags: {},
    visibility: {
      level: {},
      requireAttunement: false,
      requireIdentification: false,
      requireMagic: false,
    },
  };
}

/** Build activity damage. */
function buildNetherscrollsActivityDamage(damage, text = null) {
  const activityDamage = {
    parts: damage ? [buildNetherscrollsActivityPart(damage)] : [],
    critical: {},
    includeBase: true,
  };
  if (text != null) activityDamage.onSave = inferNetherscrollsOnSave(text);
  return activityDamage;
}

/** Build save activity damage. */
function buildNetherscrollsSaveActivityDamage(damage, text) {
  return {
    parts: damage ? [buildNetherscrollsActivityPart(damage)] : [],
    onSave: inferNetherscrollsOnSave(text),
  };
}

/** Infer on save. */
function inferNetherscrollsOnSave(text) {
  return /\bhalf (?:as much )?damage\b|\btakes? half\b/i.test(String(text ?? "")) ? "half" : "none";
}

/** Infer chat flavor. */
function inferNetherscrollsChatFlavor(text) {
  const match = /\bhas no effect on ([^.]+)\./i.exec(String(text ?? ""));
  return match ? `Restriction: Unaffected: ${match[1]}` : "";
}

/** Build activity id. */
function buildNetherscrollsActivityId(source, type) {
  const base = `${type}${source?.netherscrollsId ?? source?._id ?? source?.id ?? source?.name ?? ""}`;
  const firstHash = hashNetherscrollsString(base);
  const secondHash = hashNetherscrollsString([...base].reverse().join(""));
  const raw = `ns${type}${firstHash}${secondHash}`.replace(/[^a-zA-Z0-9]/g, "");
  return raw.padEnd(16, "0").slice(0, 16);
}

export { buildNetherscrollsSecondarySpellActivities, buildNetherscrollsSpellActivity };
