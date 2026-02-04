const MODULE_ID = "netherscrolls-module";
const PLACEHOLDER_CHARACTER_ID = "PLACEHOLDER";
const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];
const SYNC_ENDPOINT = "https://api.netherscrolls.ca/api/foundry/sync";

const SETTINGS = {
  rerollInit: "rerollInitEachRound",
  npcDeathSave: "npcDeathSaveEachTurn",
  apiKey: "nsApiKey",
  syncButton: "showSyncButton",
  debug: "debugMode",
};

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, SETTINGS.rerollInit, {
    name: "Reroll initiative each round",
    hint: "When a new combat round starts, reset and reroll all initiatives.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: (value) => toggleRerollInitHook(Boolean(value)),
  });

  game.settings.register(MODULE_ID, SETTINGS.npcDeathSave, {
    name: "NPC death save each turn",
    hint: "When an NPC at 0 HP starts its turn, roll a death save (with CON save).",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: (value) => toggleNpcDeathSaveHook(Boolean(value)),
  });

  game.settings.register(MODULE_ID, SETTINGS.apiKey, {
    name: "Netherscrolls API Key",
    hint: "Paste your API key here. This is stored in the world settings and only editable by GMs.",
    scope: "world",
    config: true,
    restricted: true,
    type: String,
    default: "",
  });

  game.settings.register(MODULE_ID, SETTINGS.syncButton, {
    name: "Sync button",
    hint: "Show the sync button on actor sheets.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => rerenderActorSheets(),
  });

  game.settings.register(MODULE_ID, SETTINGS.debug, {
    name: "Debug mode",
    hint: "Show sync request/response payloads in chat.",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
  });
});

Hooks.once("ready", () => {
  toggleRerollInitHook(game.settings.get(MODULE_ID, SETTINGS.rerollInit) === true);
  toggleNpcDeathSaveHook(game.settings.get(MODULE_ID, SETTINGS.npcDeathSave) === true);
});

Hooks.on("renderApplicationV1", (app, html) => {
  injectSyncButtonV1(app, html);
});

Hooks.on("renderApplicationV2", (app, element) => {
  injectSyncButtonV2(app, element);
});

Hooks.on("renderActorSheet", (app, html) => {
  injectSyncButtonV1(app, html);
});

Hooks.on("renderActorSheetV2", (app, html) => {
  injectSyncButtonV2(app, html);
});

let rerollInitHandler = null;
let npcDeathSaveHandler = null;

function rerenderActorSheets() {
  const apps = Object.values(ui?.windows ?? {});
  for (const app of apps) {
    if (app?.actor || app?.document?.documentName === "Actor") {
      app.render(false);
    }
  }
}

function isSyncButtonEnabled() {
  return Boolean(game?.settings?.get(MODULE_ID, SETTINGS.syncButton));
}

function isDebugEnabled() {
  return Boolean(game?.settings?.get(MODULE_ID, SETTINGS.debug));
}

function isActorSheetApp(app) {
  if (!app) return false;
  if (getActorFromApp(app)) return true;
  const name = app?.constructor?.name ?? "";
  return name.includes("ActorSheet");
}

function getActorFromApp(app) {
  if (app?.actor) return app.actor;
  if (app?.document?.documentName === "Actor") return app.document;
  if (app?.object?.documentName === "Actor") return app.object;
  if (app?.object?.actor) return app.object.actor;
  return null;
}

function injectSyncButtonV1(app, html) {
  if (!isSyncButtonEnabled()) return;
  if (!isActorSheetApp(app)) return;
  if (!html?.closest) return;

  const appElement = html.closest(".app");
  if (!appElement?.find) return;

  const actor = getActorFromApp(app);
  if (!actor) return;

  const header = appElement.find(".window-header");
  if (!header.length) return;
  if (header.find(".netherscrolls-sync-button").length) return;

  const button = $(
    `<a class="header-button netherscrolls-sync-button" title="sync">
      <i class="fas fa-cloud-upload-alt"></i>sync
    </a>`
  );

  button.on("click", () => postActorSyncMessage(actor));

  const modeSlider = header.find(".mode-slider");
  const title = header.find(".window-title");
  if (modeSlider.length) {
    modeSlider.last().after(button);
  } else if (title.length) {
    title.first().before(button);
  } else {
    header.prepend(button);
  }
}

function injectSyncButtonV2(app, element) {
  if (!isSyncButtonEnabled()) return;
  if (!isActorSheetApp(app)) return;
  if (!element?.querySelector) return;

  const actor = getActorFromApp(app);
  if (!actor) return;

  const header =
    element.querySelector("header.window-header") ||
    element.querySelector(".window-header");
  if (!header) return;
  if (header.querySelector(".netherscrolls-sync-button")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.classList.add("header-control", "netherscrolls-sync-button");
  button.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><span>sync</span>';
  button.addEventListener("click", () => postActorSyncMessage(actor));

  const modeSlider = header.querySelector(".mode-slider");
  const title = header.querySelector(".window-title");
  if (modeSlider) {
    modeSlider.insertAdjacentElement("afterend", button);
  } else if (title) {
    title.insertAdjacentElement("beforebegin", button);
  } else {
    header.prepend(button);
  }
}

function postActorSyncMessage(actor) {
  if (!actor) return;
  const payload = buildActorSyncPayload(actor);
  if (isDebugEnabled()) {
    const content = renderSyncPayload(payload);
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
    });
  }
  syncActorToApi(actor, payload);
}

function renderSyncPayload(payload) {
  const json = JSON.stringify(payload, null, 2);
  const escaped = escapeHtml(json);
  return `<pre class="ns-sync-data">${escaped}</pre>`;
}

function buildActorSyncPayload(actor) {
  const system = actor?.system ?? {};
  const attributes = system.attributes ?? {};
  const abilities = system.abilities ?? {};
  const { items, spells, feats } = splitActorItems(actor);
  const characterId = getActorCharacterId(actor);
  const payload = {
    characterName: actor?.name ?? "",
    proficiencyBonus: toNumber(attributes.prof),
    initiative: getInitiativeValue(attributes, abilities),
    hp: {
      current: toNumber(attributes.hp?.value),
      max: toNumber(attributes.hp?.max),
      temp: toNumber(attributes.hp?.temp),
    },
    hitDice: buildHitDice(actor),
    spellSlots: buildSpellSlots(system.spells),
    abilities: buildAbilities(abilities),
    savingThrows: buildSavingThrows(abilities, attributes.prof),
    items,
    spells,
    feats,
  };
  if (characterId) payload.characterId = characterId;
  return payload;
}

function buildAbilities(abilities) {
  const result = {};
  for (const key of ABILITY_KEYS) {
    result[key] = toNumber(abilities?.[key]?.value);
  }
  return result;
}

function buildSavingThrows(abilities, profBonus) {
  const result = {};
  for (const key of ABILITY_KEYS) {
    const data = abilities?.[key] ?? {};
    const proficient = toNumber(data?.proficient ?? data?.prof);
    let bonus =
      data?.save ??
      data?.save?.value ??
      data?.save?.total ??
      data?.saveBonus;
    const misc = toNumber(data?.bonuses?.save);
    if (bonus == null) {
      const mod = getAbilityMod(data);
      bonus = mod + toNumber(profBonus) * proficient + misc;
    }
    const entry = {
      proficient,
      bonus: toNumber(bonus),
    };
    if (misc) entry.misc = misc;
    result[key] = entry;
  }
  return result;
}

function buildSpellSlots(spells) {
  const current = {};
  const max = {};
  if (!spells) return { current, max };

  for (let level = 1; level <= 9; level += 1) {
    const slot = spells[`spell${level}`];
    if (!slot) continue;
    const cur = toNumber(slot.value);
    const mx = toNumber(slot.max ?? slot.override);
    if (cur <= 0 && mx <= 0) continue;
    current[`lvl${level}`] = cur;
    max[`lvl${level}`] = mx;
  }

  return { current, max };
}

function buildHitDice(actor) {
  const current = {};
  const max = {};
  const classes = actor?.items?.filter((item) => item?.type === "class") ?? [];

  if (classes.length) {
    for (const cls of classes) {
      const data = cls?.system ?? {};
      const die = normalizeHitDie(
        data?.hd?.denomination ??
          data?.hitDice ??
          data?.hitDie ??
          data?.hd?.value ??
          data?.hd?.faces
      );
      if (!die) continue;
      const levels = toNumber(data?.levels);
      if (levels <= 0) continue;
      const spent = toNumber(data?.hd?.spent ?? data?.hitDiceUsed ?? data?.hitDiceSpent);
      const available = Math.max(0, levels - spent);
      current[die] = (current[die] ?? 0) + available;
      max[die] = (max[die] ?? 0) + levels;
    }
    return { current, max };
  }

  const hd = actor?.system?.attributes?.hd;
  const die = normalizeHitDie(hd?.denomination ?? hd?.hitDice ?? hd?.value ?? hd);
  if (!die) return { current, max };

  const cur = toNumber(hd?.value ?? hd?.current ?? hd?.spent);
  const mx = toNumber(hd?.max ?? hd?.value ?? hd?.current);
  current[die] = cur;
  max[die] = mx;
  return { current, max };
}

function normalizeHitDie(hitDice) {
  if (!hitDice) return null;
  if (typeof hitDice === "string") {
    return hitDice.startsWith("d") ? hitDice : `d${hitDice}`;
  }
  if (typeof hitDice === "number") {
    return `d${hitDice}`;
  }
  const denom = hitDice?.denomination ?? hitDice?.faces ?? hitDice?.value;
  if (!denom) return null;
  return `d${denom}`;
}

function splitActorItems(actor) {
  const items = [];
  const spells = [];
  const feats = [];
  const ignoreTypes = new Set(["spell", "feat", "class", "subclass", "background", "race"]);

  for (const item of actor?.items ?? []) {
    if (!item?.name) continue;
    if (item.type === "spell") {
      spells.push(buildSpellExport(item));
    } else if (item.type === "feat") {
      const featType = item?.system?.type?.value ?? item?.system?.type;
      if (featType === "feat") {
        feats.push(buildFeatExport(item));
      }
    } else if (!ignoreTypes.has(item.type)) {
      items.push(buildItemExport(item));
    }
  }

  return { items, spells, feats };
}

function buildFeatExport(item) {
  const description = getDescription(item);
  const source = getSource(item);
  const requirements =
    item?.system?.requirements ??
    item?.system?.requirement ??
    item?.system?.prerequisites ??
    null;
  const ability = getFeatAbilities(item);
  const netherscrollsId = getItemNetherId(item);

  if (netherscrollsId) {
    return { netherscrollsId, name: item?.name ?? null };
  }

  return compactObject({
    name: item?.name ?? null,
    description,
    requirement: requirements || null,
    source,
    demifeat: null,
    ability,
    netherscrollsId: netherscrollsId || null,
  });
}

function buildSpellExport(item) {
  const system = item?.system ?? {};
  const description = getDescription(item);
  const source = getSource(item);
  const components = system.components ?? {};
  const material = system.materials?.value ?? system.material ?? null;
  const netherscrollsId = getItemNetherId(item);
  const damageParts = Array.isArray(system.damage?.parts)
    ? system.damage.parts
    : [];
  const damage = damageParts.length
    ? damageParts.map((part) => String(part?.[0] ?? "")).filter(Boolean).join(" + ")
    : null;
  const damageTypes = damageParts.length
    ? damageParts.map((part) => part?.[1]).filter(Boolean)
    : null;
  const saveAbilities = Array.isArray(system.save?.ability)
    ? system.save.ability
    : system.save?.ability
    ? [system.save.ability]
    : null;
  const componentTypes = Object.entries(components)
    .filter(([, value]) => value)
    .map(([key]) => key.toUpperCase());

  if (netherscrollsId) {
    return { netherscrollsId, name: item?.name ?? null };
  }

  return compactObject({
    name: item?.name ?? null,
    level: system.level ?? null,
    school: system.school ?? null,
    description,
    source,
    classes: null,
    castingTime: formatActivation(system.activation),
    range: formatRange(system.range),
    duration: formatDuration(system.duration),
    concentration: system.duration?.concentration ?? null,
    ritual: system.ritual ?? null,
    actionType: system.actionType ?? null,
    damage,
    summary: null,
    componentTypes: componentTypes.length ? componentTypes : null,
    componentMaterial: material ?? null,
    saveAbilities,
    damageTypes,
    netherscrollsId: netherscrollsId || null,
  });
}

function buildItemExport(item) {
  const system = item?.system ?? {};
  const description = getDescription(item);
  const source = getSource(item);
  const netherscrollsId = getItemNetherId(item);
  const priceValue = system.price?.value ?? system.price ?? null;
  const weightValue = system.weight?.value ?? system.weight ?? null;
  const properties = Array.isArray(system.properties)
    ? system.properties
    : system.properties
    ? Object.keys(system.properties).filter((key) => system.properties[key])
    : [];
  const isHomebrew =
    typeof system.source?.custom === "string" && system.source.custom ? true : null;

  if (netherscrollsId) {
    return { netherscrollsId, name: item?.name ?? null };
  }

  return compactObject({
    name: item?.name ?? null,
    description,
    type: item?.type ?? null,
    rarity: system.rarity ?? null,
    attunement: system.attunement ?? null,
    price: priceValue != null ? { gp: priceValue } : null,
    weight: weightValue != null ? { lb: weightValue } : null,
    source,
    properties: properties.length ? properties : null,
    armor: system.armor ?? {},
    tags: null,
    isHomebrew,
    netherscrollsId: netherscrollsId || null,
  });
}

function getFeatAbilities(item) {
  const advances = item?.system?.advancement;
  if (!Array.isArray(advances)) return null;
  const abilities = [];
  for (const adv of advances) {
    if (adv?.type !== "AbilityScoreImprovement") continue;
    const value = adv?.value ?? {};
    const chosen = Object.keys(value).filter((key) => value[key]);
    abilities.push(...chosen);
  }
  return abilities.length ? abilities : null;
}

function getSource(item) {
  const source = item?.system?.source ?? {};
  const value = source.custom || source.book || source.rules || null;
  return value || "Foundry";
}

function getDescription(item) {
  const value = item?.system?.description?.value ?? "";
  if (foundry?.utils?.stripHTML) {
    return foundry.utils.stripHTML(value);
  }
  return String(value).replace(/<[^>]*>/g, "").trim();
}

function formatActivation(activation) {
  if (!activation) return null;
  const type = activation.type ?? "";
  const value = activation.value ?? "";
  if (!type && value === "") return null;
  if (value === "" || value == null) return type || null;
  return `${value} ${type}`.trim();
}

function formatRange(range) {
  if (!range) return null;
  const value = range.value ?? range.distance ?? "";
  const units = range.units ?? range.unit ?? "";
  if (!value && !units) return null;
  return `${value} ${units}`.trim();
}

function formatDuration(duration) {
  if (!duration) return null;
  const value = duration.value ?? "";
  const units = duration.units ?? "";
  if (!value && !units) return null;
  return `${value} ${units}`.trim();
}

function compactObject(value) {
  if (!value || typeof value !== "object") return value;
  const entries = Object.entries(value).filter(([, val]) => val !== null);
  return Object.fromEntries(entries);
}

function getItemNetherId(item) {
  try {
    return item?.getFlag?.(MODULE_ID, "netherscrollsId") ?? null;
  } catch (err) {
    console.warn(`${MODULE_ID} | Unable to read item netherscrollsId flag.`, err);
    return null;
  }
}

async function setItemNetherId(item, id) {
  try {
    if (!item?.setFlag) return;
    await item.setFlag(MODULE_ID, "netherscrollsId", id);
  } catch (err) {
    console.warn(`${MODULE_ID} | Unable to set item netherscrollsId flag.`, err);
  }
}

function getInitiativeValue(attributes, abilities) {
  const init = attributes?.init ?? {};
  if (init.total != null) return toNumber(init.total);
  if (init.value != null) return toNumber(init.value);
  if (init.mod != null) return toNumber(init.mod);
  const bonus = toNumber(init.bonus);
  const mod = getAbilityMod(abilities?.dex ?? {});
  return mod + bonus;
}

function getAbilityMod(ability) {
  const mod = ability?.mod;
  if (Number.isFinite(Number(mod))) return Number(mod);
  const value = Number(ability?.value);
  if (Number.isFinite(value)) return Math.floor((value - 10) / 2);
  return 0;
}

function escapeHtml(value) {
  if (foundry?.utils?.escapeHTML) {
    return foundry.utils.escapeHTML(value);
  }
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function getActorCharacterId(actor) {
  try {
    return actor?.getFlag?.(MODULE_ID, "characterId") ?? null;
  } catch (err) {
    console.warn(`${MODULE_ID} | Unable to read actor characterId flag.`, err);
    return null;
  }
}

async function setActorCharacterId(actor, characterId) {
  try {
    if (!actor?.setFlag) return;
    await actor.setFlag(MODULE_ID, "characterId", characterId);
  } catch (err) {
    console.warn(`${MODULE_ID} | Unable to set actor characterId flag.`, err);
  }
}

async function syncActorToApi(actor, payload) {
  const apiKey = String(game?.settings?.get(MODULE_ID, SETTINGS.apiKey) ?? "").trim();
  if (!apiKey) {
    ui?.notifications?.warn?.(
      "Netherscrolls API Key is missing. Set it in Module Settings."
    );
    return;
  }

  try {
    const response = await fetch(SYNC_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        data?.error?.message ??
        data?.message ??
        (typeof data?.error === "string" ? data.error : null) ??
        `Sync failed (${response.status} ${response.statusText}).`;
      ui?.notifications?.warn?.(`Sync failed: ${message}`);
      if (data && isDebugEnabled()) {
        const errorContent = renderSyncPayload(data);
        ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor }),
          content: errorContent,
        });
      }
      return;
    }

    if (data && isDebugEnabled()) {
      const responseContent = renderSyncPayload(data);
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: responseContent,
      });
    }
    const characterId = data?.data?.characterId;
    if (characterId) {
      await setActorCharacterId(actor, characterId);
    }
    await applyLinkedIds(actor, data?.linked);
    const name = data?.data?.name ?? payload?.characterName ?? actor?.name ?? "actor";
    ui?.notifications?.info?.(`Sync success: ${name}`);
  } catch (err) {
    console.error("Netherscrolls sync failed.", err);
    ui?.notifications?.error?.("Sync failed. Check console for details.");
  }
}

function toggleRerollInitHook(enabled) {
  if (!game?.ready) return;
  const shouldEnable = Boolean(enabled);

  if (shouldEnable && !rerollInitHandler) {
    rerollInitHandler = buildRerollInitHandler();
    Hooks.on("updateCombat", rerollInitHandler);
    ui?.notifications?.info?.("Reroll initiative each round: ON");
  } else if (!shouldEnable && rerollInitHandler) {
    Hooks.off("updateCombat", rerollInitHandler);
    rerollInitHandler = null;
    ui?.notifications?.info?.("Reroll initiative each round: OFF");
  }
}

function buildRerollInitHandler() {
  const lastByCombat = {};

  return async (combat, changed) => {
    if (!game?.user?.isGM) return;
    if (!combat?.isActive) return;
    if (!Object.prototype.hasOwnProperty.call(changed ?? {}, "round")) return;
    if (lastByCombat[combat.id] === changed.round) return;
    lastByCombat[combat.id] = changed.round;

    setTimeout(async () => {
      try {
        await combat.resetAll({ updateTurn: false });
        await combat.rollAll({ updateTurn: false });
        await combat.update({ turn: 0 });
      } catch (err) {
        console.error("Reroll each round FAILED:", err);
      }
    }, 0);
  };
}

function toggleNpcDeathSaveHook(enabled) {
  if (!game?.ready) return;
  const shouldEnable = Boolean(enabled);

  if (shouldEnable && !npcDeathSaveHandler) {
    npcDeathSaveHandler = buildNpcDeathSaveHandler();
    Hooks.on("updateCombat", npcDeathSaveHandler);
    ui?.notifications?.info?.("NPC death save each turn: ON");
  } else if (!shouldEnable && npcDeathSaveHandler) {
    Hooks.off("updateCombat", npcDeathSaveHandler);
    npcDeathSaveHandler = null;
    ui?.notifications?.info?.("NPC death save each turn: OFF");
  }
}

function buildNpcDeathSaveHandler() {
  const lastByCombat = {};

  return async (combat, changed) => {
    if (!game?.user?.isGM) return;
    if (!combat?.isActive) return;
    if (
      !Object.prototype.hasOwnProperty.call(changed ?? {}, "turn") &&
      !Object.prototype.hasOwnProperty.call(changed ?? {}, "round")
    ) {
      return;
    }

    const combatant = combat.combatant;
    const actor = combatant?.actor;
    if (!actor) return;
    if (actor.hasPlayerOwner) return;

    const hp = Number(actor.system?.attributes?.hp?.value ?? 0);
    if (hp > 0) return;

    const death = actor.system?.attributes?.death;
    if (!death) return;

    const success = Number(death.success ?? 0);
    const failure = Number(death.failure ?? 0);
    const stable = Boolean(death.stable);
    if (stable || success >= 3 || failure >= 3) return;

    const key = `${combat.round}:${combat.turn}:${actor.id}`;
    if (lastByCombat[combat.id] === key) return;
    lastByCombat[combat.id] = key;

    await rollNpcDeathSave(actor);
  };
}

async function rollNpcDeathSave(actor) {
  const death = actor.system?.attributes?.death;
  if (!death) return;

  const save = actor.system?.abilities?.con?.save;
  const conSave = Number(save?.value ?? save ?? 0);

  const roll = await new Roll("1d20 + @conSave", { conSave }).evaluate({ async: true });

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: "Death Save (+CON save)",
  });

  const die = Number(roll.dice?.[0]?.total ?? 0);
  const total = Number(roll.total ?? 0);

  let success = Number(death.success ?? 0);
  let failure = Number(death.failure ?? 0);

  if (die === 20) {
    await actor.update({
      "system.attributes.hp.value": 1,
      "system.attributes.death.success": 0,
      "system.attributes.death.failure": 0,
      "system.attributes.death.stable": false,
    });
    return;
  }

  if (die === 1) failure += 2;
  else if (total >= 10) success += 1;
  else failure += 1;

  success = Math.min(success, 3);
  failure = Math.min(failure, 3);

  await actor.update({
    "system.attributes.death.success": success,
    "system.attributes.death.failure": failure,
    "system.attributes.death.stable": success >= 3,
  });
}

async function applyLinkedIds(actor, linked) {
  if (!actor || !linked) return;
  const itemLinks = Array.isArray(linked.items) ? linked.items : [];
  const spellLinks = Array.isArray(linked.spells) ? linked.spells : [];
  const featLinks = Array.isArray(linked.feats) ? linked.feats : [];

  if (!itemLinks.length && !spellLinks.length && !featLinks.length) return;

  const byName = new Map();
  for (const item of actor.items ?? []) {
    if (!item?.name) continue;
    byName.set(`${item.type}:${item.name}`, item);
  }

  const apply = async (links, type) => {
    for (const link of links) {
      const id = link?.id;
      const name = link?.name;
      if (!id || !name) continue;
      const item = byName.get(`${type}:${name}`);
      if (!item) continue;
      await setItemNetherId(item, id);
    }
  };

  await apply(itemLinks, "weapon");
  await apply(itemLinks, "equipment");
  await apply(itemLinks, "consumable");
  await apply(itemLinks, "tool");
  await apply(itemLinks, "loot");
  await apply(spellLinks, "spell");
  await apply(featLinks, "feat");
}
