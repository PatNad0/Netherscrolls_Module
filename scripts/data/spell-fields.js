/**
 * Normalize spell methods, preparation, formulas, and damage parts in one place.
 * The same rules are used when importing catalogue spells and preparing owned copies.
 */
import { toNetherscrollsNumber, toNumber, toTrimmedStringOrNull } from "../core/utils.js";
import {
  NETHERSCROLLS_MAX_SPELL_LEVEL,
  NETHERSCROLLS_SPELL_SCHOOLS,
  NETHERSCROLLS_UNKNOWN_SPELL_SCHOOL,
} from "./catalogs.js";
import {
  getNetherscrollsFoundryItemPayload,
  getNetherscrollsFoundrySourceValue,
} from "./references.js";
import { getNetherscrollsSourceDisplayName } from "./sources.js";

/** Build spell source. */
function buildNetherscrollsSpellSource(sourceName, source = {}) {
  const foundrySource = getNetherscrollsFoundrySourceValue(source);
  const foundrySourceBook = typeof foundrySource === "object" ? foundrySource?.book : foundrySource;
  const book = getNetherscrollsSourceDisplayName(sourceName ?? foundrySourceBook) ?? "";
  const custom =
    getNetherscrollsSourceDisplayName(source?.customSource ?? foundrySource?.custom) ?? "";
  return {
    book,
    page: String(source?.page ?? source?.sourcePage ?? foundrySource?.page ?? ""),
    custom,
    license: String(source?.license ?? foundrySource?.license ?? ""),
    revision: toNumber(source?.revision ?? foundrySource?.revision, 1),
    rules: String(source?.rules ?? foundrySource?.rules ?? "2024"),
  };
}

/** Parse range text. */
function parseNetherscrollsRangeText(value) {
  const raw = toTrimmedStringOrNull(value);
  if (!raw) return null;
  const text = raw.toLowerCase();
  if (/\bself\b/.test(text)) return { value: "", units: "self", special: "" };
  if (/\btouch\b/.test(text)) return { value: "", units: "touch", special: "" };
  if (/\bsight\b/.test(text)) return { value: "", units: "sight", special: "" };
  if (/\bunlimited\b/.test(text)) return { value: "", units: "any", special: "" };

  const match =
    /(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:-| )?(feet|foot|ft|mile|miles)\b/i.exec(
      raw
    );
  if (!match) return null;
  return {
    value: String(toNetherscrollsNumber(match[1]) ?? match[1]),
    units: /^mile/i.test(match[2]) ? "mi" : "ft",
    special: "",
  };
}

/** Parse formula from unknown. */
function parseNetherscrollsFormulaFromUnknown(value) {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number") {
    return toTrimmedStringOrNull(value);
  }
  if (Array.isArray(value)) {
    return parseNetherscrollsFormulaFromUnknown(value[0]);
  }
  return toTrimmedStringOrNull(value.formula ?? value.value ?? value.damage ?? value.healing);
}

/** Normalize formula. */
function normalizeNetherscrollsFormula(value) {
  const raw = toTrimmedStringOrNull(value);
  if (!raw) return null;
  return (
    raw
      .replace(/your spellcasting ability modifier/gi, "@mod")
      .replace(/your \w+ modifier/gi, "@mod")
      // The API writes "2d8 + spellcasting modifier" in `damage`.
      .replace(/\bspellcasting (?:ability )?modifier\b/gi, "@mod")
      .replace(/\s+plus\s+/gi, " + ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** Sanitize formula. */
function sanitizeNetherscrollsFormula(value) {
  const normalized = normalizeNetherscrollsFormula(value);
  if (!normalized) return null;

  const firstPart = normalized.split(",")[0]?.trim() ?? "";
  const match = /^(\d+d\d+(?:\s*[+\-]\s*(?:@mod|\d+))?|\d+|@mod)$/i.exec(firstPart);
  if (match) return match[1];

  return /(\d+d\d+(?:\s*[+\-]\s*(?:@mod|\d+))?|\d+|@mod)/i.exec(firstPart)?.[1] ?? null;
}

/** Sanitize bonus formula. */
function sanitizeNetherscrollsBonusFormula(value) {
  const normalized = normalizeNetherscrollsFormula(value);
  if (!normalized) return "";

  const firstPart = normalized.split(",")[0]?.trim() ?? "";
  const safeRollFormula = /^[-+]?(?:\d+|@mod|\d+d\d+)(?:\s*[+\-*/]\s*(?:\d+|@mod|\d+d\d+))*$/i;
  return safeRollFormula.test(firstPart) ? firstPart : "";
}

/** Parse dice part. */
function parseNetherscrollsDicePart(formula, type) {
  const normalized = sanitizeNetherscrollsFormula(formula);
  const dice = /^(\d+)d(\d+)(?:\s*([+-])\s*(.+))?$/i.exec(normalized ?? "");
  if (dice) {
    const bonusValue = sanitizeNetherscrollsBonusFormula(dice[4]);
    const bonusSign = dice[3] === "-" && !bonusValue.startsWith("-") ? "-" : "";
    return {
      number: Number(dice[1]),
      denomination: Number(dice[2]),
      bonus: bonusValue ? `${bonusSign}${bonusValue}` : "",
      types: [type],
      custom: {
        enabled: false,
        formula: "",
      },
    };
  }

  return {
    number: null,
    denomination: 0,
    bonus: sanitizeNetherscrollsBonusFormula(normalized),
    types: [type],
    custom: {
      enabled: false,
      formula: "",
    },
  };
}

/** Build activity part. */
function buildNetherscrollsActivityPart(part) {
  return {
    number: part?.number ?? null,
    denomination: part?.denomination ?? 0,
    bonus: part?.bonus ?? "",
    types: part?.types ?? [],
    custom: part?.custom ?? {
      enabled: false,
      formula: "",
    },
    scaling: part?.scaling ?? {
      mode: "whole",
      number: null,
      formula: "",
    },
  };
}

/** Retrieve spell level. */
function getNetherscrollsSpellLevel(spellData) {
  const foundryItem = getNetherscrollsFoundryItemPayload(spellData);
  const value =
    spellData?.system?.level ??
    spellData?.level ??
    spellData?.spellLevel ??
    spellData?.data?.level ??
    foundryItem?.system?.level ??
    foundryItem?.level;
  const level = Number(value);
  if (!Number.isFinite(level)) return 0;
  return Math.max(0, Math.min(NETHERSCROLLS_MAX_SPELL_LEVEL, Math.trunc(level)));
}

/** Normalize spell method. */
function normalizeNetherscrollsSpellMethod(source, fallbackSource = null) {
  const candidates = [
    source?.system?.method,
    source?.method,
    source?.system?.preparation?.mode,
    source?.preparation?.mode,
    fallbackSource?.system?.method,
    fallbackSource?.method,
    fallbackSource?.system?.preparation?.mode,
    fallbackSource?.preparation?.mode,
  ];
  const raw = candidates.map(toTrimmedStringOrNull).find(Boolean)?.toLowerCase();
  if (!raw) return "spell";

  const normalized = raw.replace(/[\s_-]+/g, "");
  if (["spell", "prepared", "always", "alwaysprepared"].includes(normalized)) return "spell";
  if (["pact", "pactmagic"].includes(normalized)) return "pact";
  if (["atwill", "innate", "ritual"].includes(normalized)) return normalized;
  // D&D5e groups unknown or blank methods under Innate Spellcasting. Invalid
  // service values must therefore fall back to ordinary leveled spellcasting.
  return "spell";
}

/** Retrieve spell prepared state. */
function getNetherscrollsSpellPreparedState(source, fallbackSource = null) {
  const method = [
    source?.system?.preparation?.mode,
    source?.preparation?.mode,
    fallbackSource?.system?.preparation?.mode,
    fallbackSource?.preparation?.mode,
  ]
    .map(toTrimmedStringOrNull)
    .find(Boolean)
    ?.toLowerCase();
  if (method === "always") return 2;

  const candidates = [
    source?.system?.prepared,
    source?.prepared,
    source?.system?.preparation?.prepared,
    source?.preparation?.prepared,
    fallbackSource?.system?.prepared,
    fallbackSource?.prepared,
    fallbackSource?.system?.preparation?.prepared,
    fallbackSource?.preparation?.prepared,
  ];
  for (const value of candidates) {
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "boolean") return Number(value);
    const prepared = Number(value);
    if (Number.isFinite(prepared)) return Math.max(0, Math.min(2, Math.trunc(prepared)));
  }
  return 0;
}

/** Retrieve spell school. */
function getNetherscrollsSpellSchool(spellData) {
  const rawSchool = toTrimmedStringOrNull(
    spellData?.system?.school ?? spellData?.school ?? spellData?.magicSchool
  );
  if (!rawSchool) return NETHERSCROLLS_UNKNOWN_SPELL_SCHOOL;

  const normalized = rawSchool.toLowerCase();
  return (
    NETHERSCROLLS_SPELL_SCHOOLS.find(
      /** Find the matching entry while retrieve spell school. */
      (school) =>
        school.key === normalized ||
        school.label.toLowerCase() === normalized ||
        school.aliases.includes(normalized)
    ) ?? NETHERSCROLLS_UNKNOWN_SPELL_SCHOOL
  );
}

/** Retrieve spell school system key. */
function getNetherscrollsSpellSchoolSystemKey(school) {
  if (!school || school.key === NETHERSCROLLS_UNKNOWN_SPELL_SCHOOL.key) return null;
  return school.key;
}

export {
  buildNetherscrollsActivityPart,
  buildNetherscrollsSpellSource,
  getNetherscrollsSpellLevel,
  getNetherscrollsSpellPreparedState,
  getNetherscrollsSpellSchool,
  getNetherscrollsSpellSchoolSystemKey,
  normalizeNetherscrollsFormula,
  normalizeNetherscrollsSpellMethod,
  parseNetherscrollsDicePart,
  parseNetherscrollsFormulaFromUnknown,
  parseNetherscrollsRangeText,
  sanitizeNetherscrollsBonusFormula,
};
