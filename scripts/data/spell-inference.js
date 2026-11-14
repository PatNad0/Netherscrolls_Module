/**
 * Infer missing spell mechanics from service fields and description text.
 * Conservative parsing avoids turning unrelated prose into attacks, healing, or damage.
 */
import {
  getNetherscrollsMetadataLine,
  toNetherscrollsNumber,
  toNumber,
  toTrimmedStringOrNull,
} from "../core/utils.js";
import { NETHERSCROLLS_ABILITY_LABELS, NETHERSCROLLS_DAMAGE_TYPES } from "./catalogs.js";
import { sanitizeNetherscrollsFormulaCount } from "./item-fields.js";
import { normalizeNetherscrollsDamageType, normalizeNetherscrollsSaveAbility } from "./rules.js";
import {
  getNetherscrollsSpellLevel,
  normalizeNetherscrollsFormula,
  parseNetherscrollsDicePart,
  parseNetherscrollsFormulaFromUnknown,
  parseNetherscrollsRangeText,
} from "./spell-fields.js";

/** Normalize spell text. */
function normalizeNetherscrollsSpellText(value) {
  const raw = toTrimmedStringOrNull(value);
  if (!raw) return "";
  const stripped = foundry?.utils?.stripHTML?.(raw) ?? String(raw).replace(/<[^>]*>/g, " ");
  return stripped
    .replace(/\[\[\/save\s+([a-z]{3})[^\]]*\]\]/gi, "$1 saving throw")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Retrieve primary spell text. */
function getNetherscrollsPrimarySpellText(text) {
  const primary = String(text ?? "").split(/\bat higher levels?\b/i)[0];
  // A summoned creature's stat block describes the creature's actions, not the spell's.
  const statBlock = /\bArmor Class\s+\d+[\s\S]{0,200}?\bHit Points\s+\d+/i.exec(primary);
  return (statBlock ? primary.slice(0, statBlock.index) : primary).trim();
}

/** Infer spell activation. */
function inferNetherscrollsSpellActivation(source, text) {
  const explicit = source?.system?.activation ?? source?.activation;
  if (explicit && typeof explicit === "object") {
    return {
      type: toTrimmedStringOrNull(explicit.type) ?? "action",
      value: toNumber(explicit.value ?? 1, 1),
      condition: toTrimmedStringOrNull(explicit.condition) ?? "",
    };
  }

  const raw =
    toTrimmedStringOrNull(source?.castingTime) ??
    toTrimmedStringOrNull(source?.casting_time) ??
    getNetherscrollsMetadataLine(text, "Casting Time") ??
    "";
  const activation = parseNetherscrollsActivationText(raw || text);
  return activation ?? { type: "action", value: 1, condition: "" };
}

/** Parse activation text. */
function parseNetherscrollsActivationText(value) {
  const text = String(value ?? "").toLowerCase();
  if (!text) return null;
  const valueMatch = /\b(\d+)\b/.exec(text);
  const count = valueMatch ? Number(valueMatch[1]) : 1;
  const condition = toTrimmedStringOrNull(String(value).split(",").slice(1).join(","));

  if (/\breaction\b/.test(text))
    return { type: "reaction", value: count, condition: condition ?? "" };
  if (/\bbonus action\b/.test(text)) return { type: "bonus", value: count, condition: "" };
  if (/\baction\b/.test(text)) return { type: "action", value: count, condition: "" };
  if (/\bminute\b/.test(text)) return { type: "minute", value: count, condition: "" };
  if (/\bhour\b/.test(text)) return { type: "hour", value: count, condition: "" };
  if (/\bday\b/.test(text)) return { type: "day", value: count, condition: "" };
  return null;
}

/** Infer spell duration. */
function inferNetherscrollsSpellDuration(source, text) {
  const explicit = source?.system?.duration ?? source?.foundryDuration ?? source?.duration;
  if (explicit && typeof explicit === "object") {
    return {
      value: String(explicit.value ?? ""),
      units: toTrimmedStringOrNull(explicit.units ?? explicit.unit) ?? "inst",
      special: String(explicit.special ?? ""),
    };
  }

  const raw =
    toTrimmedStringOrNull(source?.duration) ??
    getNetherscrollsMetadataLine(text, "Duration") ??
    inferNetherscrollsDurationPhrase(text);
  return parseNetherscrollsDurationText(raw) ?? { value: "0", units: "inst", special: "" };
}

/** Infer duration phrase. */
function inferNetherscrollsDurationPhrase(text) {
  const source = String(text ?? "");
  const untilTurn = /\buntil the (?:start|end) of (?:your|the target'?s|its) next turn\b/i.exec(
    source
  );
  if (untilTurn) return "1 round";
  const lastsFor =
    /\b(?:lasts?|remain|remains|persists?) for (?:up to )?(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(round|minute|hour|day|month|year)s?\b/i.exec(
      source
    );
  if (lastsFor) return `${lastsFor[1]} ${lastsFor[2]}`;
  if (/\binstantaneous\b/i.test(source)) return "instantaneous";
  if (/\buntil dispelled\b/i.test(source)) return "until dispelled";
  return null;
}

/** Parse duration text. */
function parseNetherscrollsDurationText(value) {
  const raw = toTrimmedStringOrNull(value);
  if (!raw) return null;
  const text = raw.toLowerCase();
  if (/\binstantaneous\b/.test(text)) return { value: "0", units: "inst", special: "" };
  if (/\buntil dispelled\b/.test(text)) return { value: "", units: "disp", special: "" };
  if (/\bpermanent\b/.test(text)) return { value: "", units: "perm", special: "" };

  const match =
    /(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(turn|round|minute|hour|day|month|year)s?\b/i.exec(
      raw
    );
  if (!match) return null;
  return {
    value: String(toNetherscrollsNumber(match[1]) ?? match[1]),
    units: match[2].toLowerCase(),
    special: "",
  };
}

/** Infer spell properties. */
function inferNetherscrollsSpellProperties(source, text) {
  const properties = new Set();
  const explicit = source?.system?.properties ?? source?.properties;
  if (Array.isArray(explicit)) {
    explicit.forEach(
      /** Process each entry while infer spell properties. */ (property) =>
        addNetherscrollsSpellProperty(properties, property)
    );
  }

  const componentTypes = source?.componentTypes ?? source?.components ?? source?.component_types;
  collectNetherscrollsComponents(componentTypes, properties);
  const metadataComponents = getNetherscrollsMetadataLine(text, "Components");
  collectNetherscrollsComponents(metadataComponents, properties);
  const durationText =
    toTrimmedStringOrNull(source?.duration) ?? getNetherscrollsMetadataLine(text, "Duration");

  if (source?.concentration === true || /\bconcentration\b/i.test(String(durationText ?? ""))) {
    properties.add("concentration");
  }
  if (source?.ritual === true || source?.isRitual === true) properties.add("ritual");

  return Array.from(properties);
}

/** Collect components. */
function collectNetherscrollsComponents(value, properties) {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach(
      /** Process each entry while collect components. */ (component) =>
        collectNetherscrollsComponents(component, properties)
    );
    return;
  }
  if (typeof value === "object") {
    for (const [key, enabled] of Object.entries(value)) {
      if (enabled) addNetherscrollsSpellProperty(properties, key);
    }
    return;
  }

  const text = String(value);
  if (/\bV\b|vocal|verbal/i.test(text)) properties.add("vocal");
  if (/\bS\b|somatic/i.test(text)) properties.add("somatic");
  if (/\bM\b|material/i.test(text)) properties.add("material");
}

/** Add spell property. */
function addNetherscrollsSpellProperty(properties, value) {
  const key = String(value ?? "").toLowerCase();
  if (key === "v" || key === "verbal" || key === "vocal") properties.add("vocal");
  if (key === "s" || key === "somatic") properties.add("somatic");
  if (key === "m" || key === "material") properties.add("material");
  if (key === "concentration") properties.add("concentration");
  if (key === "ritual") properties.add("ritual");
}

/** Infer spell materials. */
function inferNetherscrollsSpellMaterials(source, text) {
  const explicit = source?.system?.materials ?? source?.materials;
  if (explicit && typeof explicit === "object") {
    return {
      value: String(explicit.value ?? ""),
      consumed: Boolean(explicit.consumed),
      cost: toNumber(explicit.cost, 0),
      supply: toNumber(explicit.supply, 0),
    };
  }

  const value =
    toTrimmedStringOrNull(source?.componentMaterial) ??
    toTrimmedStringOrNull(source?.material) ??
    toTrimmedStringOrNull(source?.component_material) ??
    parseNetherscrollsMaterialText(text);
  return {
    value: value ?? "",
    consumed: /\bconsume[ds]?\b/i.test(value ?? ""),
    cost: 0,
    supply: 0,
  };
}

/** Parse material text. */
function parseNetherscrollsMaterialText(text) {
  const components = getNetherscrollsMetadataLine(text, "Components");
  const match = /\bM\b\s*\(([^)]+)\)/i.exec(components ?? "");
  return toTrimmedStringOrNull(match?.[1]);
}

/** Infer spell range. */
function inferNetherscrollsSpellRange(source, text) {
  const explicit = source?.system?.range ?? source?.foundryRange ?? source?.range;
  if (explicit && typeof explicit === "object") {
    return normalizeNetherscrollsRangeObject(explicit);
  }

  const raw =
    toTrimmedStringOrNull(source?.range) ??
    getNetherscrollsMetadataLine(text, "Range") ??
    inferNetherscrollsRangePhrase(text);
  return parseNetherscrollsRangeText(raw) ?? { value: "", units: "self", special: "" };
}

/** Normalize range object. */
function normalizeNetherscrollsRangeObject(range) {
  const units = toTrimmedStringOrNull(range.units ?? range.unit) ?? "ft";
  const value = range.value ?? range.distance ?? "";
  return value === "" || value == null
    ? { value: "", units, special: String(range.special ?? "") }
    : { value: String(value), units, special: String(range.special ?? "") };
}

/** Infer range phrase. */
function inferNetherscrollsRangePhrase(text) {
  const source = String(text ?? "");
  const within =
    /\bwithin\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:-| )?(feet|foot|ft|mile|miles)\b/i.exec(
      source
    );
  if (within) return `${within[1]} ${within[2]}`;
  if (/\bmelee spell attack\b/i.test(source) || /\btouch (?:a|one|the)?\s*creature\b/i.test(source))
    return "touch";
  if (/\byou can see\b/i.test(source)) return "sight";
  return null;
}

/** Infer spell target. */
function inferNetherscrollsSpellTarget(source, text) {
  const explicit = source?.system?.target ?? source?.target;
  if (explicit && typeof explicit === "object") return normalizeNetherscrollsTargetObject(explicit);

  const target = {
    affects: {
      count: "",
      type: "",
      choice: false,
      special: "",
    },
    template: {
      count: "",
      contiguous: false,
      stationary: false,
      type: "",
      size: "",
      width: "",
      height: "",
      units: "ft",
    },
  };

  const sourceText = String(text ?? "");
  const countMatch =
    /\b(?:up to\s+)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(creature|object|target)s?\b/i.exec(
      sourceText
    );
  if (countMatch) {
    target.affects.count = String(toNetherscrollsNumber(countMatch[1]) ?? countMatch[1]);
    target.affects.type =
      countMatch[2].toLowerCase() === "target" ? "" : countMatch[2].toLowerCase();
  } else if (/\ba creature\b|\bone creature\b|\bthe target\b/i.test(sourceText)) {
    target.affects.count = "1";
    target.affects.type = "creature";
  }

  const template = inferNetherscrollsTemplateTarget(sourceText);
  if (template) target.template = { ...target.template, ...template };
  return target;
}

/** Normalize target object. */
function normalizeNetherscrollsTargetObject(target) {
  return {
    template: {
      count: sanitizeNetherscrollsFormulaCount(target?.template?.count),
      contiguous: Boolean(target?.template?.contiguous),
      stationary: Boolean(target?.template?.stationary),
      type: String(target?.template?.type ?? ""),
      size: String(target?.template?.size ?? ""),
      width: String(target?.template?.width ?? ""),
      height: String(target?.template?.height ?? ""),
      units: String(target?.template?.units ?? "ft"),
    },
    affects: {
      count: sanitizeNetherscrollsFormulaCount(target?.affects?.count),
      type: String(target?.affects?.type ?? ""),
      choice: Boolean(target?.affects?.choice),
      special: String(target?.affects?.special ?? ""),
    },
  };
}

/** Infer template target. */
function inferNetherscrollsTemplateTarget(text) {
  const source = String(text ?? "");
  const sphere = /(\d+)\s*(?:-| )?foot(?:-| )?radius sphere/i.exec(source);
  if (sphere) return { type: "sphere", size: sphere[1], units: "ft" };
  const cone = /(\d+)\s*(?:-| )?foot cone/i.exec(source);
  if (cone) return { type: "cone", size: cone[1], units: "ft" };
  const cube = /(\d+)\s*(?:-| )?foot cube/i.exec(source);
  if (cube) return { type: "cube", size: cube[1], units: "ft" };
  const line =
    /(\d+)\s*(?:-| )?foot(?:-| )?long(?:,?\s*(\d+)\s*(?:-| )?foot(?:-| )?wide)? line/i.exec(source);
  if (line) return { type: "line", size: line[1], width: line[2] ?? "", units: "ft" };
  return null;
}

/** Infer spell save ability. */
function inferNetherscrollsSpellSaveAbility(source, text) {
  const explicit =
    source?.saveAbilities ??
    source?.saveAbility ??
    source?.save?.ability ??
    source?.system?.save?.ability;
  const explicitAbility = normalizeNetherscrollsSaveAbility(explicit);
  if (explicitAbility) return explicitAbility;

  const saveCommand = /\b(str|dex|con|int|wis|cha) saving throw\b/i.exec(text);
  if (saveCommand) return saveCommand[1].toLowerCase();

  for (const [ability, aliases] of Object.entries(NETHERSCROLLS_ABILITY_LABELS)) {
    if (
      aliases.some(
        /** Check whether any entry matches while infer spell save ability. */ (alias) =>
          new RegExp(`\\b${alias}\\s+saving throw\\b`, "i").test(text)
      )
    ) {
      return ability;
    }
  }
  return null;
}

/** Infer spell attack. */
function inferNetherscrollsSpellAttack(source, text) {
  const explicit = toTrimmedStringOrNull(source?.actionType ?? source?.attackType);
  const content = `${explicit ?? ""} ${text ?? ""}`;
  // "make up to two melee spell attacks"; a bare plural ("advantage on melee spell attacks") is not one.
  const several = /** Handle several. */ (kind) =>
    new RegExp(
      `\\bmakes?\\s+(?:up to\\s+)?(?:one|two|three|four|\\d+)\\s+${kind} spell attacks\\b`,
      "i"
    );
  if (/\bmelee spell attack\b|\bmsak\b/i.test(content) || several("melee").test(content))
    return "melee";
  if (/\branged spell attack\b|\brsak\b/i.test(content) || several("ranged").test(content))
    return "ranged";
  return null;
}

/** Infer spell healing. */
function inferNetherscrollsSpellHealing(source, text) {
  const explicit = source?.healing ?? source?.heal;
  const explicitFormula = parseNetherscrollsFormulaFromUnknown(explicit);
  const formula = explicitFormula ?? parseNetherscrollsHealingFormula(text) ?? null;
  if (!formula) return null;
  return {
    ...parseNetherscrollsDicePart(formula, "healing"),
    scaling: inferNetherscrollsScaling(text, "healing"),
  };
}

/** Infer spell damage. */
function inferNetherscrollsSpellDamage(source, text, scalingText = text) {
  const explicit = source?.damage;
  const explicitFormula = addNetherscrollsSpellcastingModifierFromText(
    parseNetherscrollsFormulaFromUnknown(explicit),
    text
  );
  const explicitType = normalizeNetherscrollsDamageType(
    Array.isArray(source?.damageTypes) ? source.damageTypes[0] : source?.damageType
  );
  const parsed = explicitFormula
    ? {
        formula: explicitFormula,
        type: explicitType ?? inferNetherscrollsDamageType(text),
      }
    : parseNetherscrollsDamageFormula(text);
  if (!parsed?.formula || !parsed?.type) return null;
  return {
    ...parseNetherscrollsDicePart(parsed.formula, parsed.type),
    // "5d10 radiant or necrotic damage": D&D5e lets the caster pick from the listed types.
    ...(parsed.types?.length > 1 ? { types: parsed.types } : {}),
    scaling: inferNetherscrollsScaling(scalingText, "damage", getNetherscrollsSpellLevel(source)),
  };
}

// The API lists a spell's dice without the modifier ("3d8"). Add it when the text says
// "3d8 plus your spellcasting ability modifier".
function addNetherscrollsSpellcastingModifierFromText(formula, text) {
  const first = toTrimmedStringOrNull(formula)?.split(",")[0].trim();
  if (!first || !/^\d+d\d+$/i.test(first)) return formula;
  const withModifier = new RegExp(
    `\\b${first}\\s*(?:\\+|plus)\\s*your spellcasting ability modifier\\b`,
    "i"
  );
  return withModifier.test(String(text ?? "")) ? `${first} + @mod` : formula;
}

// An amount in spell text: "2d8", "2d8 + 3", "2d8 plus your spellcasting ability modifier", "10".
const NETHERSCROLLS_TEXT_AMOUNT =
  "\\d+d\\d+(?:\\s*(?:\\+|plus)\\s*(?:your spellcasting ability modifier|your \\w+ modifier|@mod|\\d+))?|\\d+";

// Rejects a multiplier: "16 × the number of spell slots" is not 16.
const NETHERSCROLLS_NOT_MULTIPLIED = "\\b(?!\\s*(?:×|\\*|times\\b|x\\b))";

/** Parse healing formula. */
function parseNetherscrollsHealingFormula(text) {
  const source = String(text ?? "");
  const amount = `(${NETHERSCROLLS_TEXT_AMOUNT})${NETHERSCROLLS_NOT_MULTIPLIED}`;
  const match =
    // "regains 2d4 hit points", "regains up to 10 hit points"
    new RegExp(
      `\\bregains?\\s+(?:up to\\s+)?(?:hit points\\s+)?(?:equal to\\s+)?${amount}\\s+hit points\\b`,
      "i"
    ).exec(source) ??
    // "regains (a number of) hit points equal to 1d8 plus your spellcasting ability modifier"
    new RegExp(`\\bregains?\\s+(?:a number of\\s+)?hit points\\s+equal to\\s+${amount}`, "i").exec(
      source
    ) ??
    new RegExp(`\\brestore[sd]?\\s+${amount}\\s+hit points\\b`, "i").exec(source);
  return normalizeNetherscrollsFormula(match?.[1]);
}

/** Parse damage formula. */
function parseNetherscrollsDamageFormula(text) {
  const typePattern = NETHERSCROLLS_DAMAGE_TYPES.join("|");
  const source = String(text ?? "");
  // "2d6 fire damage", "5d10 radiant or necrotic damage"
  const amountFirst = new RegExp(
    `\\b(${NETHERSCROLLS_TEXT_AMOUNT})\\s+(${typePattern})(?:\\s+or\\s+(${typePattern}))?\\s+damage\\b`,
    "i"
  ).exec(source);
  // "takes fire damage equal to 2d8 + your spellcasting ability modifier"
  const typeFirst = new RegExp(
    `\\b(${typePattern})\\s+damage\\s+equal to\\s+(${NETHERSCROLLS_TEXT_AMOUNT})${NETHERSCROLLS_NOT_MULTIPLIED}`,
    "i"
  ).exec(source);
  const match =
    amountFirst && (!typeFirst || amountFirst.index <= typeFirst.index)
      ? { formula: amountFirst[1], types: [amountFirst[2], amountFirst[3]] }
      : typeFirst
        ? { formula: typeFirst[2], types: [typeFirst[1]] }
        : null;
  if (!match) return null;
  const types = match.types.map(normalizeNetherscrollsDamageType).filter(Boolean);
  return {
    formula: normalizeNetherscrollsFormula(match.formula),
    type: types[0] ?? null,
    types,
  };
}

/** Infer damage type. */
function inferNetherscrollsDamageType(text) {
  const source = String(text ?? "").toLowerCase();
  return (
    NETHERSCROLLS_DAMAGE_TYPES.find(
      /** Find the matching entry while infer damage type. */ (type) =>
        source.includes(`${type} damage`)
    ) ?? null
  );
}

/** Infer scaling. */
function inferNetherscrollsScaling(text, kind, spellLevel = null) {
  const source = String(text ?? "");
  // Cantrip steps are supplied by D&D5e from total character level. Store the
  // per-step increase, not a fixed dice total for the Actor's current level.
  const hasCantripThresholds =
    /\b5(?:th)?\b/i.test(source) && /\b11(?:th)?\b/i.test(source) && /\b17(?:th)?\b/i.test(source);
  const cantripIncrease =
    spellLevel === 0 && kind === "damage" && hasCantripThresholds
      ? /\bdamage\s+increases?\s+by\s+(\d+)d(\d+)\b/i.exec(source)
      : null;
  if (cantripIncrease) return { mode: "whole", number: Number(cantripIncrease[1]), formula: "" };
  const scalingText = source
    .split(/\bat higher levels?\b/i)
    .slice(1)
    .join(" ");
  const formulaMatch =
    /\b(?:damage|healing|amount of healing|amount)\s+increases? by\s+(\d+d\d+|\d+)/i.exec(
      scalingText
    ) ?? /\bincreases? by\s+(\d+d\d+|\d+)/i.exec(scalingText);
  const formula = normalizeNetherscrollsFormula(formulaMatch?.[1]);
  const dice = /^(\d+)d(\d+)$/i.exec(formula ?? "");
  if (dice) {
    return {
      mode: "whole",
      number: Number(dice[1]),
      formula: "",
    };
  }
  return {
    mode: "whole",
    number: null,
    formula: formula ?? "",
  };
}

export {
  getNetherscrollsPrimarySpellText,
  inferNetherscrollsSpellActivation,
  inferNetherscrollsSpellAttack,
  inferNetherscrollsSpellDamage,
  inferNetherscrollsSpellDuration,
  inferNetherscrollsSpellHealing,
  inferNetherscrollsSpellMaterials,
  inferNetherscrollsSpellProperties,
  inferNetherscrollsSpellRange,
  inferNetherscrollsSpellSaveAbility,
  inferNetherscrollsSpellTarget,
  normalizeNetherscrollsSpellText,
  parseNetherscrollsDamageFormula,
};
