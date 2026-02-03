const MODULE_ID = "netherscrolls-module";
const PLACEHOLDER_CHARACTER_ID = "PLACEHOLDER";
const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];
const SYNC_ENDPOINT = "https://api.netherscrolls.ca/api/foundry/sync";

const SETTINGS = {
  rerollInit: "rerollInitEachRound",
  npcDeathSave: "npcDeathSaveEachTurn",
  apiKey: "nsApiKey",
  syncButton: "showSyncButton",
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
  const content = renderSyncPayload(payload);
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
  });
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
    const name = item?.name;
    if (!name) continue;
    if (item.type === "spell") {
      spells.push(name);
    } else if (item.type === "feat") {
      const featType = item?.system?.type?.value ?? item?.system?.type;
      if (featType === "feat") {
        feats.push(name);
      }
    } else if (!ignoreTypes.has(item.type)) {
      items.push(name);
    }
  }

  return { items, spells, feats };
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
        data?.message ??
        data?.error ??
        `Sync failed (${response.status} ${response.statusText}).`;
      ui?.notifications?.warn?.(message);
      if (data) {
        const errorContent = renderSyncPayload(data);
        ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor }),
          content: errorContent,
        });
      }
      return;
    }

    const responseContent = renderSyncPayload(data);
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: responseContent,
    });
    const characterId = data?.data?.characterId;
    if (characterId) {
      await setActorCharacterId(actor, characterId);
    }
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
