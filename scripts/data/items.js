/**
 * Translate equipment, weapons, and consumables into Foundry item payloads.
 * Normalize aliases and missing fields before document creation so imported items remain usable.
 */
import { ABILITY_KEYS } from "../core/constants.js";
import { duplicateNetherscrollsData, toNumber, toTrimmedStringOrNull } from "../core/utils.js";
import {
  NETHERSCROLLS_ABILITY_LABELS,
  NETHERSCROLLS_ARMOR_BASE_DATA_BY_NAME,
  NETHERSCROLLS_ITEM_PROPERTY_ALIASES,
  NETHERSCROLLS_ITEM_RARITIES,
  NETHERSCROLLS_ITEM_TYPES,
  NETHERSCROLLS_ITEM_VALID_PROPERTIES,
  NETHERSCROLLS_WEAPON_BASE_DATA_BY_NAME,
  NETHERSCROLLS_WEAPON_TYPE_BY_NAME,
} from "./catalogs.js";
import { normalizeNetherscrollsFeatType } from "./feats.js";
import { normalizeNetherscrollsImportImagePath } from "./images.js";
import {
  applyNetherscrollsImportFlags,
  buildNetherscrollsItemSource,
  normalizeNetherscrollsActivities,
  normalizeNetherscrollsItemUses,
} from "./item-fields.js";
import { getNetherscrollsFoundryItemPayload, getNetherscrollsSourceId } from "./references.js";
import {
  mergeNetherscrollsDefaults,
  normalizeNetherscrollsDamageType,
  normalizeNetherscrollsNullableNumber,
  normalizeNetherscrollsSaveAbility,
  slugifyNetherscrollsIdentifier,
} from "./rules.js";
import {
  buildNetherscrollsActivityPart,
  parseNetherscrollsDicePart,
  parseNetherscrollsFormulaFromUnknown,
  parseNetherscrollsRangeText,
  sanitizeNetherscrollsBonusFormula,
} from "./spell-fields.js";

/** Convert native equipment fields into a complete item payload before any Foundry document is written. */
function normalizeNetherscrollsItemData(item) {
  if (getNetherscrollsFoundryItemPayload(item)) {
    return normalizeNetherscrollsFoundryItemData(item);
  }

  const source = duplicateNetherscrollsData(item);
  const netherscrollsId = getNetherscrollsSourceId(item);
  const itemType = normalizeNetherscrollsItemDocumentType(source);
  const descriptionHtml = toTrimmedStringOrNull(
    item?.descriptionHtml ?? item?.description ?? source.descriptionHtml ?? source.description
  );
  const sourceName = toTrimmedStringOrNull(source.source);
  const itemData = {
    name: toTrimmedStringOrNull(source.name) ?? "Netherscrolls Item",
    type: itemType,
    img: normalizeNetherscrollsImportImagePath(source.img, source.image),
    sort: 0,
    ownership: {
      default: 0,
    },
    system: buildNetherscrollsItemSystem(source, {
      itemType,
      descriptionHtml,
      netherscrollsId,
      sourceName,
    }),
    effects: [],
  };

  applyNetherscrollsItemAttackModifiers(itemData, source);
  applyNetherscrollsImportFlags(itemData, source, netherscrollsId);
  resolveNetherscrollsActivityAbilityModifiers(itemData);
  return itemData;
}

/** Reuse authoritative Foundry fields while normalizing missing or incompatible item mechanics. */
function normalizeNetherscrollsFoundryItemData(item) {
  const source = duplicateNetherscrollsData(getNetherscrollsFoundryItemPayload(item));
  const netherscrollsId = getNetherscrollsSourceId(item);
  source.name = toTrimmedStringOrNull(source.name) ?? "Netherscrolls Item";
  source.type = normalizeNetherscrollsItemDocumentType({
    ...item,
    type: source.type,
    system: source.system,
  });
  // Some API rows carry the image alongside the Foundry payload. Prefer either
  // supplied image, then use the Netherscrolls default when neither is present.
  source.img = normalizeNetherscrollsImportImagePath(
    item?.img,
    item?.image,
    source.img,
    source.image
  );
  source.sort ??= 0;
  source.ownership ??= { default: 0 };
  source.effects ??= [];

  const descriptionHtml = toTrimmedStringOrNull(
    source.system?.description?.value ?? item?.descriptionHtml ?? item?.description
  );
  const sourceName = toTrimmedStringOrNull(item?.source ?? source?.system?.source?.book);
  const defaults = buildNetherscrollsItemSystem(
    {
      ...item,
      system: source.system,
      type: source.type,
      properties: item?.properties ?? source.system?.properties,
    },
    {
      itemType: source.type,
      descriptionHtml,
      netherscrollsId,
      sourceName,
    }
  );
  source.system = mergeNetherscrollsDefaults(defaults, source.system ?? {});
  source.system.identifier ??= netherscrollsId
    ? `netherscrolls-${netherscrollsId}`
    : slugifyNetherscrollsIdentifier(source.name);
  source.system.source = buildNetherscrollsItemSource(sourceName, {
    ...item,
    system: {
      ...(item?.system ?? {}),
      source: source.system.source,
    },
  });

  applyNetherscrollsItemAttackModifiers(source, {
    ...item,
    system: getNetherscrollsFoundryItemPayload(item)?.system,
  });
  applyNetherscrollsImportFlags(source, item, netherscrollsId);
  resolveNetherscrollsActivityAbilityModifiers(source);
  return source;
}

// "@mod" is the attack's ability modifier. Name the ability wherever the activity or the weapon
// fixes it, so the formula resolves the same for any actor and in compendium previews. Spellcasting
// and finesse attacks choose their ability at roll time and keep "@mod".
function resolveNetherscrollsActivityAbilityModifiers(item) {
  const abilities = Object.keys(NETHERSCROLLS_ABILITY_LABELS);
  const properties = Array.from(item?.system?.properties ?? []);
  const weaponDefault =
    item?.type !== "weapon" || properties.includes("fin")
      ? null
      : /R$/.test(String(item.system?.type?.value ?? ""))
        ? "dex"
        : "str";
  for (const activity of Object.values(item?.system?.activities ?? {})) {
    if (activity?.type !== "attack") continue;
    const explicit = toTrimmedStringOrNull(activity.attack?.ability);
    const ability = explicit ? (abilities.includes(explicit) ? explicit : null) : weaponDefault;
    if (!ability) continue;
    const resolve = /** Resolve. */ (value) =>
      typeof value === "string" ? value.replace(/@mod\b/g, `@abilities.${ability}.mod`) : value;
    for (const part of [
      ...(activity.damage?.parts ?? []),
      ...(activity.healing ? [activity.healing] : []),
    ]) {
      if (!part || typeof part !== "object") continue;
      part.bonus = resolve(part.bonus);
      if (part.custom) part.custom.formula = resolve(part.custom.formula);
    }
  }
}

/** Build item system. */
function buildNetherscrollsItemSystem(
  source,
  { itemType, descriptionHtml, netherscrollsId, sourceName }
) {
  const system = {
    activities: normalizeNetherscrollsActivities(source),
    description: {
      value: descriptionHtml ?? "",
      chat: "",
    },
    identifier:
      toTrimmedStringOrNull(source?.system?.identifier ?? source?.identifier) ??
      (netherscrollsId
        ? `netherscrolls-${netherscrollsId}`
        : slugifyNetherscrollsIdentifier(source?.name)),
    source: buildNetherscrollsItemSource(sourceName, source),
    identified: Boolean(source?.system?.identified ?? source?.identified ?? true),
    unidentified: normalizeNetherscrollsUnidentifiedData(source),
    container: source?.system?.container ?? source?.container ?? null,
    quantity: normalizeNetherscrollsItemQuantity(source),
    uses: normalizeNetherscrollsItemUses(source),
    weight: normalizeNetherscrollsItemWeight(source),
    price: normalizeNetherscrollsItemPrice(source),
    rarity: normalizeNetherscrollsItemRarity(source?.system?.rarity ?? source?.rarity),
    properties: normalizeNetherscrollsItemProperties(source, itemType),
  };

  if (isNetherscrollsEquippableItemType(itemType)) {
    system.attunement = normalizeNetherscrollsItemAttunement(
      source?.system?.attunement ?? source?.attunement
    );
    system.attuned = Boolean(source?.system?.attuned ?? source?.attuned ?? false);
    system.equipped = Boolean(source?.system?.equipped ?? source?.equipped ?? false);
  }

  applyNetherscrollsItemTypeSystem(system, source, itemType);
  applyNetherscrollsMountableItemFields(system, source);
  return system;
}

/** Normalize unidentified data. */
function normalizeNetherscrollsUnidentifiedData(source) {
  const unidentified = source?.system?.unidentified ?? source?.unidentified ?? {};
  return {
    name: toTrimmedStringOrNull(unidentified?.name) ?? "",
    description: toTrimmedStringOrNull(unidentified?.description) ?? "",
  };
}

/** Apply mountable item fields. */
function applyNetherscrollsMountableItemFields(system, source) {
  const cover = source?.system?.cover ?? source?.cover;
  if (cover !== undefined) system.cover = normalizeNetherscrollsNullableNumber(cover);

  const crew = source?.system?.crew ?? source?.crew;
  if (crew && typeof crew === "object") {
    system.crew = {
      max: normalizeNetherscrollsNullableNumber(crew.max),
      value: Array.isArray(crew.value) ? crew.value : [],
    };
  }

  const hp = source?.system?.hp ?? source?.hp;
  if (hp && typeof hp === "object") {
    system.hp = {
      value: normalizeNetherscrollsNullableNumber(hp.value),
      max: normalizeNetherscrollsNullableNumber(hp.max),
      dt: normalizeNetherscrollsNullableNumber(hp.dt),
      conditions: toTrimmedStringOrNull(hp.conditions) ?? "",
    };
  }

  const speed = source?.system?.speed ?? source?.speed;
  if (speed && typeof speed === "object") {
    system.speed = {
      value: normalizeNetherscrollsNullableNumber(speed.value),
      units: toTrimmedStringOrNull(speed.units ?? speed.unit) ?? "ft",
      conditions: toTrimmedStringOrNull(speed.conditions) ?? "",
    };
  }
}

/** Apply item type system. */
function applyNetherscrollsItemTypeSystem(system, source, itemType) {
  if (itemType === "weapon") {
    const baseData = getNetherscrollsWeaponBaseData(source);
    const damageType = getNetherscrollsItemDamageType(source) ?? baseData?.damageType ?? null;
    const baseDamage = getNetherscrollsFirstItemValue(
      source?.system?.damage?.base,
      source?.damage?.base,
      source?.damage,
      baseData?.damage
    );
    const versatileDamage = getNetherscrollsFirstItemValue(
      source?.system?.damage?.versatile,
      source?.damage?.versatile,
      source?.versatileDamage,
      baseData?.versatileDamage
    );
    system.activities = normalizeNetherscrollsActivities(source);
    system.ammunition = normalizeNetherscrollsWeaponAmmunition(source);
    system.damage = {
      base: normalizeNetherscrollsItemDamagePart(baseDamage, damageType),
      versatile: normalizeNetherscrollsItemDamagePart(
        versatileDamage,
        versatileDamage == null ? null : damageType
      ),
    };
    system.mastery = toTrimmedStringOrNull(source?.system?.mastery ?? source?.mastery) ?? "";
    system.proficient = normalizeNetherscrollsNullableNumber(
      source?.system?.proficient ?? source?.proficient
    );
    system.range = normalizeNetherscrollsWeaponRange(source, baseData);
    system.type = normalizeNetherscrollsItemSubtype(source, "weapon");
    return;
  }

  if (itemType === "equipment") {
    const baseData = getNetherscrollsArmorBaseData(source);
    system.activities = normalizeNetherscrollsActivities(source);
    system.armor = normalizeNetherscrollsEquipmentArmor(source, baseData);
    system.proficient = normalizeNetherscrollsNullableNumber(
      source?.system?.proficient ?? source?.proficient
    );
    system.strength = normalizeNetherscrollsNullableNumber(
      getNetherscrollsFirstItemValue(
        source?.system?.strength,
        source?.armor?.strength,
        source?.strength,
        baseData?.strength
      )
    );
    system.type = normalizeNetherscrollsItemSubtype(source, "equipment");
    return;
  }

  if (itemType === "consumable") {
    system.activities = normalizeNetherscrollsActivities(source);
    system.damage = {
      base: normalizeNetherscrollsItemDamagePart(
        source?.system?.damage?.base ?? source?.damage?.base ?? source?.damage,
        getNetherscrollsItemDamageType(source)
      ),
      replace: Boolean(source?.system?.damage?.replace ?? source?.damage?.replace ?? false),
    };
    system.type = normalizeNetherscrollsItemSubtype(source, "consumable");
    system.uses = normalizeNetherscrollsItemUses(source);
    return;
  }

  if (itemType === "tool") {
    system.activities = normalizeNetherscrollsActivities(source);
    system.ability =
      normalizeNetherscrollsSaveAbility(source?.system?.ability ?? source?.ability) ?? "";
    system.bonus = sanitizeNetherscrollsBonusFormula(source?.system?.bonus ?? source?.bonus);
    system.chatFlavor =
      toTrimmedStringOrNull(source?.system?.chatFlavor ?? source?.chatFlavor) ?? "";
    system.proficient = normalizeNetherscrollsNullableNumber(
      source?.system?.proficient ?? source?.proficient
    );
    system.type = normalizeNetherscrollsItemSubtype(source, "tool");
    return;
  }

  if (itemType === "container") {
    system.capacity = normalizeNetherscrollsItemCapacity(source);
    system.quantity = 1;
    return;
  }

  system.type = normalizeNetherscrollsItemSubtype(source, "loot");
}

/** Normalize item document type. */
function normalizeNetherscrollsItemDocumentType(source) {
  const raw = toTrimmedStringOrNull(
    source?.type ?? source?.itemType ?? source?.documentType ?? source?.system?.documentType
  )?.toLowerCase();
  const label = raw?.replace(/[_-]+/g, " ").trim();
  if (NETHERSCROLLS_ITEM_TYPES.has(raw)) return raw;
  if (raw === "armor" || raw === "shield") return "equipment";
  if (
    [
      "magic item",
      "wondrous",
      "wondrous item",
      "wondrousitem",
      "ring",
      "rod",
      "wand",
      "staff",
      "focus",
      "clothing",
      "trinket",
    ].includes(label)
  ) {
    return "equipment";
  }
  if (raw === "backpack" || raw === "bag") return "container";
  if (raw === "ammunition" || raw === "ammo" || raw === "potion" || raw === "scroll")
    return "consumable";
  if (raw === "art" || raw === "gem" || raw === "treasure" || raw === "trade") return "loot";
  if (getNetherscrollsWeaponBaseData(source)) return "weapon";
  if (getNetherscrollsArmorBaseData(source)) return "equipment";
  if (source?.armor && Object.keys(source.armor).length) return "equipment";
  return "loot";
}

/** Normalize item subtype. */
function normalizeNetherscrollsItemSubtype(source, itemType) {
  const explicit = source?.system?.type ?? source?.foundryType;
  if (explicit && typeof explicit === "object") {
    const value = normalizeNetherscrollsItemSubtypeValue(
      explicit.value ?? explicit.type ?? source?.subtype,
      itemType,
      source
    );
    return buildNetherscrollsItemTypeObject(itemType, value, {
      subtype: explicit.subtype,
      baseItem: getNetherscrollsFirstItemValue(
        explicit.baseItem,
        getNetherscrollsItemBaseItem(source, itemType)
      ),
    });
  }

  const value = normalizeNetherscrollsItemSubtypeValue(
    source?.subtype ??
      source?.itemSubtype ??
      source?.weaponType ??
      source?.equipmentType ??
      source?.consumableType ??
      source?.toolType ??
      source?.lootType ??
      source?.foundryType ??
      source?.armor?.type ??
      source?.type,
    itemType,
    source
  );
  return buildNetherscrollsItemTypeObject(itemType, value, {
    baseItem: getNetherscrollsItemBaseItem(source, itemType),
  });
}

/** Build item type object. */
function buildNetherscrollsItemTypeObject(itemType, value, source = {}) {
  const type = {
    value: value ?? "",
  };
  if (itemType === "consumable" || itemType === "loot") {
    type.subtype = toTrimmedStringOrNull(source.subtype) ?? "";
  } else {
    type.baseItem = toTrimmedStringOrNull(source.baseItem) ?? "";
  }
  return type;
}

/** Normalize item subtype value. */
function normalizeNetherscrollsItemSubtypeValue(value, itemType, source = {}) {
  const raw = toTrimmedStringOrNull(value)?.toLowerCase();
  const label = raw?.replace(/[_-]+/g, " ").trim();
  if (itemType === "weapon") {
    if (["simplem", "simple melee", "simple melee weapon"].includes(label)) return "simpleM";
    if (["simpler", "simple ranged", "simple ranged weapon"].includes(label)) return "simpleR";
    if (["martialm", "martial melee", "martial melee weapon"].includes(label)) return "martialM";
    if (["martialr", "martial ranged", "martial ranged weapon"].includes(label)) return "martialR";
    if (["natural", "improv", "improvised", "siege"].includes(label)) {
      return label === "improvised" ? "improv" : label;
    }
    const baseData = getNetherscrollsWeaponBaseData(source);
    if (baseData?.type) return baseData.type;
    const nameType =
      NETHERSCROLLS_WEAPON_TYPE_BY_NAME[normalizeNetherscrollsItemNameKey(source?.name)];
    return nameType ?? "simpleM";
  }

  if (itemType === "equipment") {
    if (
      ["light", "medium", "heavy", "natural", "shield", "clothing", "focus", "trinket"].includes(
        label
      )
    ) {
      return label;
    }
    if (label === "light armor") return "light";
    if (label === "medium armor") return "medium";
    if (label === "heavy armor") return "heavy";
    const baseData = getNetherscrollsArmorBaseData(source);
    if (baseData?.type) return baseData.type;
    if (/\bshield\b/i.test(String(source?.name ?? ""))) return "shield";
    return source?.armor && Object.keys(source.armor).length ? "light" : "trinket";
  }

  if (itemType === "consumable") {
    if (["ammo", "ammunition"].includes(label)) return "ammo";
    if (["potion", "poison", "food", "scroll", "wand", "rod", "trinket"].includes(label))
      return label;
    if (/\b(potion|elixir)\b/i.test(String(source?.name ?? ""))) return "potion";
    if (/\bscroll\b/i.test(String(source?.name ?? ""))) return "scroll";
    if (normalizeNetherscrollsItemProperties(source, "consumable").includes("amm")) return "ammo";
    return "trinket";
  }

  if (itemType === "loot") {
    if (
      ["art", "gear", "gem", "junk", "material", "resource", "trade", "treasure"].includes(label)
    ) {
      return label;
    }
    return "gear";
  }

  return raw ?? itemType;
}

/** Normalize item name key. */
function normalizeNetherscrollsItemNameKey(name) {
  return String(name ?? "")
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Retrieve weapon base data. */
function getNetherscrollsWeaponBaseData(source) {
  return getNetherscrollsBaseDataByName(source, NETHERSCROLLS_WEAPON_BASE_DATA_BY_NAME);
}

/** Retrieve armor base data. */
function getNetherscrollsArmorBaseData(source) {
  return getNetherscrollsBaseDataByName(source, NETHERSCROLLS_ARMOR_BASE_DATA_BY_NAME);
}

/** Retrieve base data by name. */
function getNetherscrollsBaseDataByName(source, lookup) {
  const key = normalizeNetherscrollsItemNameKey(source?.name);
  if (!key) return null;
  return lookup[key] ?? lookup[key.replace(/\s+(?:armor|weapon)$/i, "")] ?? null;
}

/** Retrieve item base item. */
function getNetherscrollsItemBaseItem(source, itemType) {
  const baseData = getNetherscrollsItemBaseData(source, itemType);
  return toTrimmedStringOrNull(baseData?.baseItem);
}

/** Retrieve item base data. */
function getNetherscrollsItemBaseData(source, itemType) {
  if (itemType === "weapon") return getNetherscrollsWeaponBaseData(source);
  if (itemType === "equipment") return getNetherscrollsArmorBaseData(source);
  return null;
}

/** Retrieve first item value. */
function getNetherscrollsFirstItemValue(...values) {
  for (const value of values) {
    if (value == null) continue;
    if (typeof value === "string" && !value.trim()) continue;
    if (Array.isArray(value) && !value.length) continue;
    if (typeof value === "object" && !Array.isArray(value) && !Object.keys(value).length) continue;
    return value;
  }
  return undefined;
}

/** Normalize item quantity. */
function normalizeNetherscrollsItemQuantity(source) {
  const value = normalizeNetherscrollsNullableNumber(source?.system?.quantity ?? source?.quantity);
  return Math.max(1, Math.trunc(value ?? 1));
}

/** Normalize item weight. */
function normalizeNetherscrollsItemWeight(source) {
  const weight = source?.system?.weight ?? source?.weight;
  if (weight && typeof weight === "object") {
    return {
      value: Math.max(0, toNumber(weight.value ?? weight.lb ?? weight.lbs ?? weight.pounds ?? 0)),
      units: normalizeNetherscrollsWeightUnit(
        weight.units ?? weight.unit ?? (weight.kg != null ? "kg" : "lb")
      ),
    };
  }
  return {
    value: Math.max(0, toNumber(weight, 0)),
    units: "lb",
  };
}

/** Normalize weight unit. */
function normalizeNetherscrollsWeightUnit(value) {
  const unit = toTrimmedStringOrNull(value)?.toLowerCase();
  if (unit === "kg" || unit === "kilogram" || unit === "kilograms") return "kg";
  if (unit === "ton" || unit === "tons") return "ton";
  return "lb";
}

/** Normalize item price. */
function normalizeNetherscrollsItemPrice(source) {
  const price = source?.system?.price ?? source?.price;
  if (price && typeof price === "object") {
    const directValue = normalizeNetherscrollsNullableNumber(price.value ?? price.amount);
    if (directValue != null) {
      return {
        value: Math.max(0, directValue),
        denomination: normalizeNetherscrollsCurrencyDenomination(
          price.denomination ?? price.currency
        ),
      };
    }

    for (const denomination of ["pp", "gp", "ep", "sp", "cp"]) {
      const value = normalizeNetherscrollsNullableNumber(price[denomination]);
      if (value != null) {
        return {
          value: Math.max(0, value),
          denomination,
        };
      }
    }
  }
  return {
    value: Math.max(0, toNumber(price, 0)),
    denomination: "gp",
  };
}

/** Normalize currency denomination. */
function normalizeNetherscrollsCurrencyDenomination(value) {
  const denomination = toTrimmedStringOrNull(value)?.toLowerCase();
  return ["pp", "gp", "ep", "sp", "cp"].includes(denomination) ? denomination : "gp";
}

/** Normalize item rarity. */
function normalizeNetherscrollsItemRarity(value) {
  const raw = toTrimmedStringOrNull(value);
  if (!raw) return "";
  const normalized = raw.toLowerCase().replace(/[_-]+/g, " ").trim();
  if (normalized === "mundane" || normalized === "none") return "";
  if (normalized === "very rare") return "veryRare";
  if (NETHERSCROLLS_ITEM_RARITIES.has(normalized)) return normalized;
  return "";
}

/** Normalize item attunement. */
function normalizeNetherscrollsItemAttunement(value) {
  if (value === 1 || value === 2 || value === true) return "required";
  const normalized = toTrimmedStringOrNull(value)?.toLowerCase();
  if (!normalized || normalized === "0" || normalized === "false" || normalized === "none")
    return "";
  if (normalized === "required" || normalized.includes("requires attunement")) return "required";
  if (normalized === "optional") return "optional";
  return "";
}

/** Normalize item properties. */
function normalizeNetherscrollsItemProperties(source, itemType) {
  const values = [
    ...(Array.isArray(source?.system?.properties) ? source.system.properties : []),
    ...(Array.isArray(source?.properties) ? source.properties : []),
    ...(Array.isArray(source?.tags) ? source.tags : []),
  ];
  if (typeof source?.system?.properties === "string") values.push(source.system.properties);
  if (typeof source?.properties === "string") values.push(source.properties);
  if (typeof source?.tags === "string") values.push(source.tags);
  if (source?.system?.properties instanceof Set) values.push(...source.system.properties);
  if (source?.properties instanceof Set) values.push(...source.properties);
  if (
    source?.system?.properties &&
    typeof source.system.properties === "object" &&
    !Array.isArray(source.system.properties)
  ) {
    values.push(
      ...Object.keys(source.system.properties).filter(
        /** Keep entries that satisfy the condition while normalize item properties. */ (key) =>
          source.system.properties[key]
      )
    );
  }
  if (
    source?.properties &&
    typeof source.properties === "object" &&
    !Array.isArray(source.properties)
  ) {
    values.push(
      ...Object.keys(source.properties).filter(
        /** Keep entries that satisfy the condition while normalize item properties. */ (key) =>
          source.properties[key]
      )
    );
  }

  const properties = new Set();
  for (const value of values) {
    const property = normalizeNetherscrollsItemProperty(value);
    if (property) properties.add(property);
  }
  const baseData = getNetherscrollsItemBaseData(source, itemType);
  for (const property of baseData?.properties ?? []) {
    const normalized = normalizeNetherscrollsItemProperty(property);
    if (normalized) properties.add(normalized);
  }

  const rarity = normalizeNetherscrollsItemRarity(source?.system?.rarity ?? source?.rarity);
  const attunement = normalizeNetherscrollsItemAttunement(
    source?.system?.attunement ?? source?.attunement
  );
  if (
    source?.magical === true ||
    source?.isMagic === true ||
    attunement ||
    (rarity && rarity !== "common")
  ) {
    properties.add("mgc");
  }

  const valid = NETHERSCROLLS_ITEM_VALID_PROPERTIES[itemType] ?? null;
  return Array.from(properties).filter(
    /** Keep entries that satisfy the condition while normalize item properties. */ (property) =>
      !valid || valid.has(property)
  );
}

/** Normalize item property. */
function normalizeNetherscrollsItemProperty(value) {
  const raw = toTrimmedStringOrNull(value);
  if (!raw) return null;
  const key = raw.toLowerCase().replace(/[_]+/g, " ").trim();
  return NETHERSCROLLS_ITEM_PROPERTY_ALIASES[key] ?? raw;
}

/** Determine whether equippable item type. */
function isNetherscrollsEquippableItemType(itemType) {
  return ["weapon", "equipment", "consumable", "tool", "container"].includes(itemType);
}

/** Normalize weapon ammunition. */
function normalizeNetherscrollsWeaponAmmunition(source) {
  const ammunition = source?.system?.ammunition ?? source?.ammunition;
  if (ammunition && typeof ammunition === "object") {
    return {
      type: toTrimmedStringOrNull(ammunition.type) ?? "",
    };
  }
  return {
    type: toTrimmedStringOrNull(ammunition) ?? "",
  };
}

/** Normalize item damage part. */
function normalizeNetherscrollsItemDamagePart(value, fallbackType = null) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if ("number" in value || "denomination" in value || "custom" in value) {
      return buildNetherscrollsActivityPart({
        ...value,
        types: normalizeNetherscrollsItemDamageTypes(
          value.types ?? value.type ?? value.damageType,
          fallbackType
        ),
      });
    }
    if (Array.isArray(value.parts) && value.parts.length) {
      return normalizeNetherscrollsItemDamagePart(value.parts[0], fallbackType);
    }
  }

  if (Array.isArray(value)) {
    const formula = toTrimmedStringOrNull(value[0]);
    const type = normalizeNetherscrollsDamageType(value[1]) ?? fallbackType;
    return formula
      ? removeBlankNetherscrollsDamageTypes(parseNetherscrollsDicePart(formula, type ?? ""))
      : buildNetherscrollsEmptyDamagePart(type);
  }

  const formula = parseNetherscrollsFormulaFromUnknown(value);
  if (!formula) return buildNetherscrollsEmptyDamagePart(fallbackType);
  return removeBlankNetherscrollsDamageTypes(
    parseNetherscrollsDicePart(formula, fallbackType ?? "")
  );
}

/** Normalize item damage types. */
function normalizeNetherscrollsItemDamageTypes(value, fallbackType = null) {
  const values = Array.isArray(value) ? value : [value];
  const types = values.map(normalizeNetherscrollsDamageType).filter(Boolean);
  if (!types.length && fallbackType) types.push(fallbackType);
  return types;
}

/** Build empty damage part. */
function buildNetherscrollsEmptyDamagePart(type = null) {
  return {
    number: null,
    denomination: 0,
    bonus: "",
    types: type ? [type] : [],
    custom: {
      enabled: false,
      formula: "",
    },
    scaling: {
      mode: "whole",
      number: null,
      formula: "",
    },
  };
}

/** Remove blank damage types. */
function removeBlankNetherscrollsDamageTypes(part) {
  return {
    ...part,
    types: Array.isArray(part?.types) ? part.types.filter(Boolean) : [],
  };
}

/** Retrieve item damage type. */
function getNetherscrollsItemDamageType(source) {
  return (
    normalizeNetherscrollsDamageType(
      Array.isArray(source?.damageTypes) ? source.damageTypes[0] : source?.damageType
    ) ??
    normalizeNetherscrollsDamageType(source?.system?.damage?.type) ??
    getNetherscrollsWeaponBaseData(source)?.damageType ??
    null
  );
}

/** Normalize finite item number. */
function normalizeNetherscrollsFiniteItemNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (
    typeof value !== "string" ||
    !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())
  )
    return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/** Determine whether unspecified item modifier. */
function isNetherscrollsUnspecifiedItemModifier(value) {
  return value == null || (typeof value === "string" && !value.trim());
}

/** Apply item attack modifiers. */
function applyNetherscrollsItemAttackModifiers(item, source) {
  item.system ??= {};
  for (const field of ["magicalBonus", "ability"]) {
    const value = Object.prototype.hasOwnProperty.call(source ?? {}, field)
      ? source[field]
      : source?.system?.[field];
    if (field === "magicalBonus") {
      const bonus = normalizeNetherscrollsFiniteItemNumber(value);
      if (bonus !== null) item.system.magicalBonus = bonus;
      else if (isNetherscrollsUnspecifiedItemModifier(value)) delete item.system.magicalBonus;
    } else if (typeof value === "string" && (value === "" || ABILITY_KEYS.includes(value))) {
      item.system.ability = value;
    } else if (value == null) {
      delete item.system.ability;
    }
  }
}

/** Prepare foundry export item. */
function prepareNetherscrollsFoundryExportItem(item) {
  const exported = duplicateNetherscrollsData(item);
  if (exported.type === "feat") {
    exported.system ??= {};
    exported.system.type = normalizeNetherscrollsFeatType(item);
  }
  if (!item?.system || typeof item.system !== "object") return exported;
  // Foundry can serialize an untouched charge counter as null. Native item
  // features accept an omitted counter, but reject null when consuming uses.
  if (
    exported.system.uses &&
    typeof exported.system.uses === "object" &&
    exported.system.uses.spent == null
  ) {
    delete exported.system.uses.spent;
  }
  const bonus = item.system.magicalBonus;
  if (isNetherscrollsUnspecifiedItemModifier(bonus)) {
    delete exported.system.magicalBonus;
  } else {
    const numericBonus = normalizeNetherscrollsFiniteItemNumber(bonus);
    // Let the API report recoverable document errors without blocking the character save.
    if (numericBonus !== null) exported.system.magicalBonus = numericBonus;
  }
  const ability = item.system.ability;
  if (ability == null) delete exported.system.ability;

  return exported;
}

/** Normalize weapon range. */
function normalizeNetherscrollsWeaponRange(
  source,
  baseData = getNetherscrollsWeaponBaseData(source)
) {
  const range = getNetherscrollsFirstItemValue(source?.system?.range, source?.range);
  const baseRange = baseData?.range ?? {};
  if (range && typeof range === "object") {
    return {
      value: normalizeNetherscrollsNullableNumber(
        getNetherscrollsFirstItemValue(range.value, range.distance, baseRange.value)
      ),
      long: normalizeNetherscrollsNullableNumber(
        getNetherscrollsFirstItemValue(range.long, baseRange.long)
      ),
      reach: normalizeNetherscrollsNullableNumber(
        getNetherscrollsFirstItemValue(range.reach, baseRange.reach)
      ),
      units: toTrimmedStringOrNull(range.units ?? range.unit ?? baseRange.units) ?? "ft",
    };
  }

  const weaponRange = parseNetherscrollsWeaponRangeText(range);
  if (weaponRange) {
    return {
      value: normalizeNetherscrollsNullableNumber(weaponRange.value),
      long: normalizeNetherscrollsNullableNumber(weaponRange.long),
      reach: normalizeNetherscrollsNullableNumber(baseRange.reach),
      units: weaponRange.units,
    };
  }

  const parsed = parseNetherscrollsRangeText(range);
  return {
    value: normalizeNetherscrollsNullableNumber(
      getNetherscrollsFirstItemValue(parsed?.value, baseRange.value)
    ),
    long: normalizeNetherscrollsNullableNumber(baseRange.long),
    reach: normalizeNetherscrollsNullableNumber(baseRange.reach),
    units: parsed?.units ?? baseRange.units ?? "ft",
  };
}

/** Parse weapon range text. */
function parseNetherscrollsWeaponRangeText(value) {
  const raw = toTrimmedStringOrNull(value);
  if (!raw) return null;
  const match = /(\d+)\s*(?:\/|-)\s*(\d+)\s*(?:ft|feet|foot)?\b/i.exec(raw);
  if (!match) return null;
  return {
    value: Number(match[1]),
    long: Number(match[2]),
    units: "ft",
  };
}

/** Normalize equipment armor. */
function normalizeNetherscrollsEquipmentArmor(
  source,
  baseData = getNetherscrollsArmorBaseData(source)
) {
  const armor = source?.system?.armor ?? source?.armor ?? {};
  return {
    value: Math.max(
      0,
      toNumber(
        getNetherscrollsFirstItemValue(armor.value, armor.ac, armor.armorClass, baseData?.ac),
        0
      )
    ),
    magicalBonus: sanitizeNetherscrollsBonusFormula(armor.magicalBonus ?? source?.magicalBonus),
    dex: normalizeNetherscrollsNullableNumber(
      getNetherscrollsFirstItemValue(armor.dex, armor.dexterity, baseData?.dex)
    ),
  };
}

/** Normalize item capacity. */
function normalizeNetherscrollsItemCapacity(source) {
  const capacity = source?.system?.capacity ?? source?.capacity ?? {};
  const count = normalizeNetherscrollsNullableNumber(capacity.count ?? capacity.items);
  const result = {
    volume: {
      value: Math.max(0, toNumber(capacity.volume?.value ?? capacity.volume, 0)),
      units: toTrimmedStringOrNull(capacity.volume?.units ?? capacity.volumeUnits) ?? "ft3",
    },
    weight: {
      value: Math.max(0, toNumber(capacity.weight?.value ?? capacity.weight, 0)),
      units: normalizeNetherscrollsWeightUnit(capacity.weight?.units ?? capacity.weightUnits),
    },
  };
  if (count != null) result.count = Math.max(0, Math.trunc(count));
  return result;
}

export {
  normalizeNetherscrollsItemData,
  normalizeNetherscrollsItemDocumentType,
  prepareNetherscrollsFoundryExportItem,
};
