/**
 * Prepare companion NPC Actors and calculate them like characters (docs/api/38-companions.md).
 * The API converts each companion and binds the owner values it supports. The module calculates the
 * companion with the same Netherscrolls calculator as a character, reading `character.` references
 * from the owner's calculated sheet, and fills in what the API left for review. The native formulas
 * stay on their flags, so exports and later imports keep working from the originals.
 */
import { MODULE_ID, NETHERSCROLLS_MONSTER_FALLBACK_IMAGE } from "../core/constants.js";
import { duplicateNetherscrollsData, escapeHtml, toTrimmedStringOrNull } from "../core/utils.js";
import {
  isNetherscrollsPlaceholderImage,
  isNetherscrollsUnresolvedImageKey,
  normalizeNetherscrollsPersistentImagePath,
} from "./images.js";
import { normalizeNetherscrollsReferenceValue } from "./references.js";

// Top-level Actor fields the API omits and that the importing world decides.
const NETHERSCROLLS_COMPANION_WORLD_FIELDS = [
  "_id",
  "id",
  "folder",
  "ownership",
  "permission",
  "pack",
  "sort",
  "_stats",
];

// `character.<reference>` reads the owning character's final sheet.
const NETHERSCROLLS_CHARACTER_REFERENCE = /^character\.(.+)$/i;

// A companion has no classes: its own feature references are 0, as on the API.
const NETHERSCROLLS_COMPANION_FEATURE_SCOPE = Object.freeze({
  total: 0,
  classLevel: 0,
  classes: Object.freeze({}),
  attunement: 0,
});

// Calculated values apply after the API's own changes to the same fields.
const NETHERSCROLLS_COMPANION_CHANGE_PRIORITY = 100;

const NETHERSCROLLS_COMPANION_HIT_DICE = ["d4", "d6", "d8", "d10", "d12", "d20"];

/** The owner's final sheet: its calculated Netherscrolls totals and class levels, or null. */
function getNetherscrollsCompanionOwnerSheet(ownerActor) {
  const NS = globalThis.NetherscrollsEffects;
  if (!ownerActor || !NS) return null;
  let values = ownerActor.system?.netherscrolls?.totals;
  if ((!values || typeof values !== "object") && NS.foundry?.hasNative?.(ownerActor)) {
    try {
      values = NS.foundry.collectState(ownerActor).result.values;
    } catch (error) {
      console.warn(`${MODULE_ID} | The companion owner's sheet could not be calculated.`, error);
      values = null;
    }
  }
  if (!values || typeof values !== "object") return null;
  return {
    name: toTrimmedStringOrNull(ownerActor.name) ?? "its character",
    values,
    levels: NS.foundry?.levelsOf?.(ownerActor) ?? { total: 0, classes: {}, attunement: 0 },
  };
}

/** One value of the owner's sheet; only the two level references are feature references here. */
function getNetherscrollsCompanionOwnerValue(reference, owner) {
  const NS = globalThis.NetherscrollsEffects;
  if (/^(?:level\.total|classes\.[^.]+\.level)$/i.test(reference))
    return Number(NS.featureReference(reference, owner.levels) ?? 0);
  const value = Number(owner.values?.[NS.referenceTarget(reference)]);
  if (!Number.isFinite(value))
    throw new Error(`character.${reference} is not on ${owner.name}'s sheet`);
  return value;
}

/** Replace each `character.` reference with the owner's final value; other references stay. */
function bindNetherscrollsCompanionFormula(formula, owner) {
  const source = typeof formula === "number" ? String(formula) : String(formula ?? "").trim();
  if (!/character\./i.test(source)) return source;
  const NS = globalThis.NetherscrollsEffects;
  const parsed = NS.parseFormula(source);
  if (
    !parsed.references.some(
      /** Find a character reference. */ (reference) =>
        NETHERSCROLLS_CHARACTER_REFERENCE.test(reference)
    )
  )
    return source;
  if (!owner) throw new Error("its character's sheet is not available");
  return NS.serialize(parsed.ast, {
    ref: /** Bind character references only. */ (reference) => {
      const match = NETHERSCROLLS_CHARACTER_REFERENCE.exec(reference);
      return match ? getNetherscrollsCompanionOwnerValue(match[1], owner) : reference;
    },
    dice: /** Keep dice calls. */ (count, sides) => `dice(${count}, ${sides})`,
  });
}

/** Whether a native feature rolls a formula that reads the character. */
function hasNetherscrollsCompanionCharacterRoll(feature) {
  return [
    feature?.attackBonus,
    feature?.dc,
    feature?.formula,
    ...(Array.isArray(feature?.attackDamage) ? feature.attackDamage : []).map(
      /** Read the damage formula. */ (part) => part?.formula
    ),
    ...(Array.isArray(feature?.damage) ? feature.damage : []).map(
      /** Read the damage formula. */ (part) => part?.formula
    ),
  ].some(/** Find a character reference. */ (value) => /character\./i.test(String(value ?? "")));
}

/** A native feature with its roll formulas bound to the owner. */
function bindNetherscrollsCompanionFeature(feature, owner) {
  const bound = duplicateNetherscrollsData(feature);
  for (const field of ["attackBonus", "dc", "formula"])
    if (bound[field] != null) bound[field] = bindNetherscrollsCompanionFormula(bound[field], owner);
  for (const field of ["attackDamage", "damage"])
    if (Array.isArray(bound[field]))
      bound[field] = bound[field].map(
        /** Bind one damage part. */ (part) => ({
          ...part,
          formula: bindNetherscrollsCompanionFormula(part?.formula, owner),
        })
      );
  return bound;
}

/** Every effect of the Actor data that keeps its native definition, with its conversion state. */
function collectNetherscrollsCompanionEffects(data, owner) {
  const entries = [];
  const now = Date.now();
  const visit = /** Record one effect with its native definition. */ (effect, item) => {
    const flags = effect?.flags?.netherscrolls;
    const native = flags?.nativeEffect;
    if (!native?.stat) return;
    // Effects of activated features apply when used, not on the sheet.
    if (item && effect.transfer === false) return;
    const review = Array.isArray(flags.manualReview) ? flags.manualReview.filter(Boolean) : [];
    const entry = {
      effect,
      item,
      native,
      converted: review.length === 0,
      review,
      key: `${item?._id ?? "actor"}:${effect._id ?? native._id}`,
    };
    entry.active =
      native.active !== false &&
      !(native.expiresAt && Date.parse(native.expiresAt) <= now) &&
      (!entry.converted || effect.disabled !== true);
    // D&D5e adds HP bonuses to characters only: on an NPC such a change does nothing.
    const changes = Array.isArray(effect.changes) ? effect.changes : effect.system?.changes;
    if (
      entry.converted &&
      data.type === "npc" &&
      Array.isArray(changes) &&
      changes.length &&
      changes.every(
        /** An HP bonus. */ (change) =>
          /^system\.attributes\.hp\.bonuses\./.test(String(change?.key ?? ""))
      )
    ) {
      entry.converted = false;
      entry.review = ["HP bonuses do not apply to an NPC"];
    }
    try {
      entry.bound = {
        ...duplicateNetherscrollsData(native),
        ...(native.bonus === undefined
          ? {}
          : { bonus: bindNetherscrollsCompanionFormula(native.bonus, owner) }),
        _nsKey: entry.key,
      };
    } catch (error) {
      entry.unresolved = error?.message ?? String(error);
    }
    entries.push(entry);
  };
  for (const effect of data.effects ?? []) visit(effect, null);
  for (const item of data.items ?? []) for (const effect of item.effects ?? []) visit(effect, item);
  return entries;
}

/** Calculate a companion sheet with the character calculator (it has no classes). */
function resolveNetherscrollsCompanionSheet(companion, effects) {
  const character = duplicateNetherscrollsData(companion ?? {});
  delete character.activeBonuses;
  delete character.effects;
  character._nsLevels = { total: 0, classes: {}, attunement: 0 };
  return globalThis.NetherscrollsEffects.resolve(character, effects);
}

/** Sheet totals an effect stat changes. */
function getNetherscrollsCompanionEffectTargets(stat) {
  const NS = globalThis.NetherscrollsEffects;
  const target = NS.referenceTarget(stat);
  return target === "savingThrows.all"
    ? NS.ABILITIES.map(/** Expand to each save. */ (ability) => `savingThrows.${ability}`)
    : [target];
}

/** D&D5e changes that give an NPC one calculated total, or null when an NPC has no such field. */
function projectNetherscrollsCompanionTarget(target, context) {
  const { sheet, difference, spellcasting } = context;
  const value = Number(sheet.values[target]);
  if (!Number.isFinite(value)) return null;
  const set = /** Override a field with the calculated total. */ (key, total = value) => ({
    key,
    mode: 5,
    value: String(total),
    priority: NETHERSCROLLS_COMPANION_CHANGE_PRIORITY,
  });
  const add = /** Add what the uncalculated effects change. */ (key, delta) => ({
    key,
    mode: 2,
    value: String(delta),
    priority: NETHERSCROLLS_COMPANION_CHANGE_PRIORITY,
  });
  let match;
  if (target === "proficiencyBonus") return [set("system.attributes.prof", Math.trunc(value))];
  if (target === "hp.max") return [set("system.attributes.hp.max", Math.max(0, Math.floor(value)))];
  if ((match = /^hitDice\.max\.(d\d+)$/.exec(target))) {
    // The API converted them into the HP formula, which its export checks: keep that.
    if (context.apiHitDice) return [];
    // An NPC has one hit-die size.
    const others = NETHERSCROLLS_COMPANION_HIT_DICE.filter(
      /** Find other sizes in use. */ (die) =>
        die !== match[1] && Number(sheet.values[`hitDice.max.${die}`]) > 0
    );
    if (others.length) return null;
    return [
      set("system.attributes.hd.max", Math.max(0, Math.trunc(value))),
      set("system.attributes.hd.denomination", Number(match[1].slice(1))),
    ];
  }
  if (target === "armorClass")
    return [
      set("system.attributes.ac.calc", "flat"),
      set("system.attributes.ac.flat", Math.trunc(value)),
    ];
  if ((match = /^speed\.(walk|fly|swim|climb|burrow)$/.exec(target)))
    return [set(`system.attributes.movement.${match[1]}`)];
  if ((match = /^senses\.(darkvision|blindsight|tremorsense|truesight)$/.exec(target)))
    return [set(`system.attributes.senses.ranges.${match[1]}`)];
  if ((match = /^abilities\.(str|dex|con|int|wis|cha)$/.exec(target)))
    return [set(`system.abilities.${match[1]}.value`, Math.trunc(value))];

  // D&D5e calculates these from the same abilities and proficiency: add only the difference.
  const delta = difference(target);
  if ((match = /^savingThrows\.(str|dex|con|int|wis|cha)$/.exec(target)))
    return delta ? [add(`system.abilities.${match[1]}.bonuses.save`, delta)] : [];
  if ((match = /^skills\.([^.]+)$/.exec(target))) {
    const foundryKey = globalThis.NetherscrollsEffects.SKILLS?.[match[1]]?.[0];
    if (!foundryKey) return null;
    return delta ? [add(`system.skills.${foundryKey}.bonuses.check`, delta)] : [];
  }
  if (target === "initiative") return delta ? [add("system.attributes.init.bonus", delta)] : [];
  // D&D5e adds spell bonuses only with a spellcasting ability: use the Netherscrolls one.
  const casting = spellcasting ? [set("system.attributes.spellcasting", spellcasting)] : [];
  if (target === "ToHitMagic")
    return [
      ...casting,
      ...(delta
        ? [add("system.bonuses.msak.attack", delta), add("system.bonuses.rsak.attack", delta)]
        : []),
    ];
  if (target === "SaveDC")
    return [...casting, ...(delta ? [add("system.bonuses.spell.dc", delta)] : [])];
  return null;
}

/** Rebuild the attack or save the API could not convert because its formula reads the character. */
function calculateNetherscrollsCompanionFeatures(data, owner, calculation) {
  const NS = globalThis.NetherscrollsEffects;
  for (const item of data.items ?? []) {
    const native = item?.flags?.netherscrolls?.nativeFeature;
    if (!native || !hasNetherscrollsCompanionCharacterRoll(native)) continue;
    const activities = item.system?.activities ?? {};
    const [activityId, original] =
      Object.entries(activities).find(
        /** Find the activity left unconverted. */ ([, activity]) =>
          activity?.flags?.netherscrolls?.unmappedFeature ||
          activity?.flags?.netherscrolls?.conversionWarning
      ) ?? [];
    if (!original) continue;
    const name = native.name ?? item.name ?? "Feature";
    try {
      if (typeof NS?.features?.build !== "function")
        throw new Error("the Netherscrolls feature builder is not loaded");
      const rebuilt = NS.features.build(
        bindNetherscrollsCompanionFeature(native, owner),
        original,
        NETHERSCROLLS_COMPANION_FEATURE_SCOPE
      );
      rebuilt._id = activityId;
      // The API's uses and recharge stay; only the roll is calculated.
      rebuilt.uses = duplicateNetherscrollsData(original.uses ?? rebuilt.uses);
      rebuilt.consumption = duplicateNetherscrollsData(original.consumption ?? rebuilt.consumption);
      rebuilt.flags[MODULE_ID] = { ...(rebuilt.flags[MODULE_ID] ?? {}), companionCalculated: true };
      activities[activityId] = rebuilt;
      calculation.features.add(String(native._id ?? item.flags.netherscrolls.companionFeatureId));
      calculation.calculated.push(`${name}: ${rebuilt.type} calculated from ${owner.name}`);
    } catch (error) {
      calculation.review.push(`${name}: roll not calculated (${error?.message ?? error})`);
    }
  }
}

/** Calculate the companion and project onto the NPC every value the API left for review. */
function calculateNetherscrollsCompanionActorData(data, companion, owner) {
  const NS = globalThis.NetherscrollsEffects;
  const calculation = {
    calculated: [],
    review: [],
    effects: new Set(),
    features: new Set(),
    proficiency: false,
  };
  if (typeof NS?.resolve !== "function") {
    calculation.review.push("The Netherscrolls calculator is not loaded.");
    return calculation;
  }
  const ownerName = owner?.name ?? "its character";
  const entries = collectNetherscrollsCompanionEffects(data, owner);
  const counted = entries.filter(/** Effects that apply. */ (entry) => entry.active && entry.bound);
  const sheet = resolveNetherscrollsCompanionSheet(
    companion,
    counted.map(/** Native definitions. */ (entry) => entry.bound)
  );
  const spellcasting =
    toTrimmedStringOrNull(companion?.advanced?.spellcastingAbility) ?? "int";
  const context = {
    sheet,
    apiHitDice: Boolean(data.flags?.netherscrolls?.companionHitDice),
    spellcasting:
      toTrimmedStringOrNull(data.system?.attributes?.spellcasting) === spellcasting
        ? null
        : spellcasting,
    // What the effects the API could not convert add to one total.
    difference: /** Difference those effects make. */ (target) => {
      const without = resolveNetherscrollsCompanionSheet(
        companion,
        counted
          .filter(
            /** Drop the pending effects on this total. */ (entry) =>
              entry.converted ||
              !getNetherscrollsCompanionEffectTargets(entry.native.stat).includes(target)
          )
          .map(/** Native definitions. */ (entry) => entry.bound)
      );
      return Number(sheet.values[target]) - Number(without.values[target] ?? 0);
    },
  };

  const changes = new Map();
  const projected = new Map();
  for (const entry of entries.filter(
    /** Active effects the API did not convert. */ (candidate) =>
      !candidate.converted && candidate.active
  )) {
    const label = `${entry.native.source || entry.effect.name || "Effect"} (${entry.native.stat})`;
    if (!entry.bound) {
      calculation.review.push(`${label}: not calculated, ${entry.unresolved}`);
      continue;
    }
    if (NS.hasFilters?.(entry.native) || NS.isGrantStat?.(entry.native.stat)) {
      calculation.review.push(`${label}: ${entry.review.join("; ") || "needs review"}`);
      continue;
    }
    let complete = true;
    for (const target of getNetherscrollsCompanionEffectTargets(entry.native.stat)) {
      if (!projected.has(target)) {
        const projection = projectNetherscrollsCompanionTarget(target, context);
        projected.set(target, projection);
        for (const change of projection ?? []) changes.set(change.key, change);
        if (projection) calculation.calculated.push(`${target} = ${sheet.values[target]}`);
      }
      if (!projected.get(target)) complete = false;
    }
    if (!complete) {
      calculation.review.push(`${label}: an NPC has no equivalent field`);
      continue;
    }
    // The source effect keeps its native definition for export; the generated effect applies it.
    entry.effect.flags[MODULE_ID] = {
      ...(entry.effect.flags[MODULE_ID] ?? {}),
      companionCalculated: true,
    };
    entry.calculated = true;
    calculation.effects.add(String(entry.native._id ?? entry.effect._id));
  }
  // A feature's effect warning is settled once every one of its pending effects is calculated.
  for (const item of data.items ?? []) {
    const featureId = toTrimmedStringOrNull(item?.flags?.netherscrolls?.id);
    const own = entries.filter(
      /** This feature's active effects the API did not convert. */ (entry) =>
        entry.item === item && !entry.converted && entry.active
    );
    if (featureId && own.length && own.every(/** Calculated. */ (entry) => entry.calculated))
      calculation.effects.add(featureId);
  }

  // An NPC's proficiency comes from its challenge rating: keep the Netherscrolls value instead.
  const proficiency = Math.trunc(Number(sheet.values.proficiencyBonus));
  const cr = Number(data.system?.details?.cr);
  const fromCr = Number.isFinite(cr) ? Math.floor((Math.max(cr, 1) + 7) / 4) : null;
  const setsProficiency =
    changes.has("system.attributes.prof") ||
    counted.some(
      /** An applied API effect already sets it. */ (entry) =>
        entry.converted &&
        (entry.effect.changes ?? []).some(
          /** Find a proficiency change. */ (change) => change?.key === "system.attributes.prof"
        )
    );
  if (!setsProficiency && proficiency >= 1 && fromCr !== null && proficiency !== fromCr) {
    changes.set("system.attributes.prof", {
      key: "system.attributes.prof",
      mode: 5,
      value: String(proficiency),
      priority: NETHERSCROLLS_COMPANION_CHANGE_PRIORITY,
    });
    calculation.calculated.push(`proficiencyBonus = ${proficiency}`);
  }
  calculation.proficiency = true;

  for (const error of sheet.errors ?? [])
    calculation.review.push(error?.message ?? String(error));
  calculateNetherscrollsCompanionFeatures(data, owner, calculation);

  if (changes.size) {
    const companionId = data.flags?.netherscrolls?.companionId ?? companion?._id ?? data.name;
    data.effects.push({
      _id: NS.stableId(`netherscrolls-companion-calculation:${companionId}`),
      name: `Calculated from ${ownerName}`,
      img: "icons/svg/aura.svg",
      disabled: false,
      transfer: false,
      changes: Array.from(changes.values()),
      description: `<p>Values Netherscrolls calculated for this companion from ${escapeHtml(ownerName)}'s sheet. They are recalculated on each import.</p>`,
      flags: { [MODULE_ID]: { companionCalculation: true } },
    });
  }
  return calculation;
}

/** API warnings the module's calculation did not settle. */
function getNetherscrollsCompanionRemainingWarnings(warnings, calculation, name) {
  return (Array.isArray(warnings) ? warnings : []).filter(
    /** Keep unsettled warnings. */ (code) => {
      const [kind, subject = ""] = String(code).split(":");
      // An API-side problem the GM cannot fix in Foundry (the next import retries): logged only.
      if (kind === "IMAGE_NOT_PUBLISHED") {
        console.warn(`${MODULE_ID} | Companion "${name}": an image was not published (${code}).`);
        return false;
      }
      if (kind === "EFFECT_REQUIRES_REVIEW" || kind === "NATIVE_EFFECTS_REQUIRE_REVIEW")
        return !calculation.effects.has(subject);
      if (kind === "NATIVE_ROLL_NOT_CONVERTED") return !calculation.features.has(subject);
      if (kind === "OWNER_FORMULA_NOT_CONVERTED")
        return !calculation.features.has(subject.split(".")[0]);
      if (code === "NATIVE_FIELD_REQUIRES_REVIEW:proficiencyBonus") return !calculation.proficiency;
      return true;
    }
  );
}

/** Build the companion's NPC Actor data from one transfer entry, calculated from its owner. */
function prepareNetherscrollsCompanionActorData(
  entry,
  owner,
  { guildId = "", characterId = null } = {}
) {
  const companion = entry?.companion ?? {};
  const source = entry?.foundryActor;
  const companionId = normalizeNetherscrollsReferenceValue(
    source?.flags?.netherscrolls?.companionId ?? companion._id ?? companion.id
  );
  if (!source || typeof source !== "object" || !companionId) return null;

  const data = duplicateNetherscrollsData(source);
  for (const key of NETHERSCROLLS_COMPANION_WORLD_FIELDS) delete data[key];
  data.type = toTrimmedStringOrNull(data.type) ?? "npc";
  data.name =
    toTrimmedStringOrNull(data.name) ??
    toTrimmedStringOrNull(companion.name) ??
    "Netherscrolls Companion";
  data.system ??= {};
  data.items = Array.isArray(data.items) ? data.items : [];
  data.effects = Array.isArray(data.effects) ? data.effects : [];

  // The first real portrait wins; the token image is the monster's and is often the only URL.
  const tokenImage = toTrimmedStringOrNull(data.prototypeToken?.texture?.src);
  const portraits = [
    data.img,
    companion.ns_ImageLink,
    ...(Array.isArray(companion.images) ? companion.images : []),
    tokenImage,
  ].map(toTrimmedStringOrNull);
  const unresolvedImage = portraits.some(isNetherscrollsUnresolvedImageKey);
  data.img = normalizeNetherscrollsPersistentImagePath(
    portraits.find(
      /** A usable portrait. */ (image) => image && !isNetherscrollsPlaceholderImage(image)
    ),
    NETHERSCROLLS_MONSTER_FALLBACK_IMAGE
  );
  // A companion is one creature tied to its character: its token is linked, like a character's.
  data.prototypeToken = { ...(data.prototypeToken ?? {}), name: data.name, actorLink: true };
  data.prototypeToken.texture = {
    ...(data.prototypeToken.texture ?? {}),
    src:
      tokenImage && !isNetherscrollsPlaceholderImage(tokenImage)
        ? normalizeNetherscrollsPersistentImagePath(tokenImage, data.img)
        : data.img,
  };

  data.flags ??= {};
  const ownerId = normalizeNetherscrollsReferenceValue(
    data.flags.netherscrolls?.characterId ?? companion.characterId ?? characterId
  );
  data.flags.netherscrolls = {
    ...(data.flags.netherscrolls ?? {}),
    companionId,
    ...(ownerId ? { characterId: ownerId } : {}),
    ...(guildId ? { guildId } : {}),
  };

  // An API-side problem the GM cannot fix in Foundry: logged, not counted as a review.
  if (unresolvedImage)
    console.warn(
      `${MODULE_ID} | Companion "${data.name}": Netherscrolls sent an unresolved image key instead of a URL; using ${data.img}.`
    );

  const calculation = calculateNetherscrollsCompanionActorData(data, companion, owner);
  const review = [
    ...getNetherscrollsCompanionRemainingWarnings(
      entry.conversionWarnings ?? data.flags.netherscrolls.conversionWarnings,
      calculation,
      data.name
    ),
    ...calculation.review,
  ];
  data.flags[MODULE_ID] = {
    ...(data.flags[MODULE_ID] ?? {}),
    companionMissing: false,
    companion: {
      owner: owner?.name ?? null,
      calculated: calculation.calculated,
      review,
    },
  };
  return { data, companionId, calculation, review };
}

export {
  bindNetherscrollsCompanionFormula,
  getNetherscrollsCompanionOwnerSheet,
  prepareNetherscrollsCompanionActorData,
};
