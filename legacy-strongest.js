// ---------------------------------------------------------------------
// DO NOT TOUCH CODE BELLOW, IT WORKS FOR BUTTON INSPIRES YOURSELF FROM IT
// ---------------------------------------------------------------------
const MODULE_ID = "netherscrolls-module";
const MODULE_TITLE = "Netherscrolls Module";
const REQUIRED_API_KEY = "MYAPIKEY";
const PLACEHOLDER_CHARACTER_ID = "PLACEHOLDER";
const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];

const SETTINGS = {
  helo: "sayHeloBack",
  banana: "sayBananaBack",
  strongest: "imTheStrongest",
  apiKey: "apiKey",
};
//something something
Hooks.once("init", () => {
  game.settings.register(MODULE_ID, SETTINGS.helo, {
    name: "Say helo back",
    hint: "When someone says helo, reply with helo you [actor name].",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(MODULE_ID, SETTINGS.banana, {
    name: "Say banana back",
    hint: "When someone says banana, reply with banana !",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(MODULE_ID, SETTINGS.strongest, {
    name: "I'm the strongest",
    hint: "Adds a SHOW POWER button to every Actor sheet.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(MODULE_ID, SETTINGS.apiKey, {
    name: "API KEY",
    hint: "Enter MYAPIKEY to enable all module features.",
    scope: "world",
    config: true,
    type: String,
    default: "",
  });
});

Hooks.on("chatMessage", (_chatLog, message, chatData) => {
  if (!game?.ready || !hasValidKey()) return true;

  const text = String(message ?? "").trim();
  if (!text || text.startsWith("/")) return true;

  const normalized = text.toLowerCase();
  if (isFeatureEnabled(SETTINGS.helo) && /\bhelo\b/.test(normalized)) {
    postChatMessage(`helo you ${getSpeakerName(chatData)}`);
  }

  if (isFeatureEnabled(SETTINGS.banana) && /\bbanana\b/.test(normalized)) {
    postChatMessage("banana !");
  }

  return true;
});

Hooks.on("renderApplicationV1", (app, html) => {
  injectShowPowerButtonV1(app, html);
});

Hooks.on("renderApplicationV2", (app, element) => {
  injectShowPowerButtonV2(app, element);
});

Hooks.on("renderActorSheet", (app, html) => {
  injectShowPowerButtonV1(app, html);
});

function hasValidKey() {
  try {
    return game.settings.get(MODULE_ID, SETTINGS.apiKey) === REQUIRED_API_KEY;
  } catch (error) {
    console.warn(`${MODULE_ID} | Unable to read API key setting.`, error);
    return false;
  }
}

function isFeatureEnabled(settingKey) {
  if (!game?.ready || !hasValidKey()) return false;
  if (!settingKey) return true;
  return game.settings.get(MODULE_ID, settingKey) === true;
}

function getSpeakerName(chatData) {
  const alias = chatData?.speaker?.alias;
  if (alias) return alias;
  const user = chatData?.user ? game.users?.get(chatData.user) : null;
  return user?.name ?? "someone";
}

function getActorFromApp(app) {
  return app?.document ?? app?.actor ?? null;
}

function isActorSheet(app) {
  const actor = getActorFromApp(app);
  return actor?.documentName === "Actor";
}

function injectShowPowerButtonV1(app, html) {
  if (!isFeatureEnabled(SETTINGS.strongest)) return;
  if (!isActorSheet(app)) return;
  if (!html?.closest) return;

  const appElement = html.closest(".app");
  if (!appElement?.find) return;

  const header = appElement.find(".window-header");
  if (!header.length) return;
  if (header.find(".netherscrolls-show-power").length) return;

  const button = $(
    `<a class="header-button netherscrolls-show-power" title="sync">
      <i class="fas fa-bolt"></i>sync
    </a>`
  );

  button.on("click", () => announceStrongest(getActorFromApp(app)));
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

function injectShowPowerButtonV2(app, element) {
  if (!isFeatureEnabled(SETTINGS.strongest)) return;
  if (!isActorSheet(app)) return;
  if (!element?.querySelector) return;

  const header =
    element.querySelector("header.window-header") ||
    element.querySelector(".window-header");
  if (!header) return;
  if (header.querySelector(".netherscrolls-show-power")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.classList.add("header-control", "netherscrolls-show-power");
  button.innerHTML = '<i class="fas fa-bolt"></i><span>sync</span>';
  button.addEventListener("click", () => announceStrongest(getActorFromApp(app)));
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

function announceStrongest(actor) {
  if (!isFeatureEnabled(SETTINGS.strongest)) return;
  if (!actor) return;
  postActorSyncMessage(actor);
}

function postActorSyncMessage(actor) {
  const payload = buildActorSyncPayload(actor);
  const content = renderSyncPayload(payload);
  postChatMessage(content);
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

  return {
    characterId: PLACEHOLDER_CHARACTER_ID,
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
    let bonus = data?.save ?? data?.save?.value ?? data?.saveBonus;
    const misc = toNumber(data?.bonuses?.save);
    if (bonus == null) {
      const mod = toNumber(data?.mod);
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
    const mx = toNumber(slot.max);
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
      const die = normalizeHitDie(data.hitDice);
      if (!die) continue;
      const levels = toNumber(data.levels);
      if (levels <= 0) continue;
      const used = toNumber(data.hitDiceUsed);
      const available = Math.max(0, levels - used);
      current[die] = (current[die] ?? 0) + available;
      max[die] = (max[die] ?? 0) + levels;
    }
    return { current, max };
  }

  const hd = actor?.system?.attributes?.hd;
  const die = normalizeHitDie(hd?.denomination ?? hd?.hitDice ?? hd?.value ?? hd);
  if (!die) return { current, max };

  const cur = toNumber(hd?.value ?? hd?.current);
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
      feats.push(name);
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
  return toNumber(abilities?.dex?.mod);
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

function postChatMessage(content) {
  if (!content) return;
  ChatMessage.create({
    content,
    speaker: ChatMessage.getSpeaker({ alias: MODULE_TITLE }),
    flags: {
      [MODULE_ID]: {
        response: true,
      },
    },
  });
}
