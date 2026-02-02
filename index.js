const MODULE_ID = "netherscrolls-module";
const HIGH_SLOT_LEVELS = [10, 11, 12, 13, 14, 15];
const CHAT_SCROLL_THRESHOLD = 10;
const CHAT_SCROLL_USER_GRACE_MS = 250;
const PLACEHOLDER_CHARACTER_ID = "697412a366e5e9513cbadf6f";
const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];

const SETTINGS = {
  rerollInit: "rerollInitEachRound",
  npcDeathSave: "npcDeathSaveEachTurn",
  lockChatScroll: "lockChatAutoScroll",
  apiKey: "nsApiKey",
  syncButton: "showSyncButton",
  powerButton: "showPowerButton",
};
//something something
Hooks.once("init", () => {
  if (isDnd5eSystem()) {
    extendDnd5eSpellLevels();
  }

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

  game.settings.register(MODULE_ID, SETTINGS.lockChatScroll, {
    name: "Lock chat auto-scroll",
    hint: "When scrolled up, stop chat from auto-scrolling to new messages.",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: (value) => toggleChatScrollLock(Boolean(value)),
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

  game.settings.register(MODULE_ID, SETTINGS.powerButton, {
    name: "Show POWER button",
    hint: "Show a SHOW POWER button on actor sheets (posts to chat).",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => rerenderActorSheets(),
  });
});

Hooks.once("ready", () => {
  if (isDnd5eSystem()) {
    ensureHighSlotsOnAllActors();
  }
  toggleRerollInitHook(game.settings.get(MODULE_ID, SETTINGS.rerollInit) === true);
  toggleNpcDeathSaveHook(game.settings.get(MODULE_ID, SETTINGS.npcDeathSave) === true);
  toggleChatScrollLock(game.settings.get(MODULE_ID, SETTINGS.lockChatScroll) === true);
});

Hooks.on("createActor", (actor) => {
  if (!isDnd5eSystem()) return;
  ensureHighSlotsOnActor(actor);
});

Hooks.on("renderApplicationV1", (app, html) => {
  injectSyncButtonV1(app, html);
  injectPowerButtonV1(app, html);
});

Hooks.on("renderApplicationV2", (app, html) => {
  injectSyncButtonV2(app, html);
  injectPowerButtonV2(app, html);
});

Hooks.on("renderActorSheet", (app, html) => {
  injectSyncButtonV1(app, html);
  injectPowerButtonV1(app, html);
});

Hooks.on("renderActorSheetV2", (app, html) => {
  injectSyncButtonV2(app, html);
  injectPowerButtonV2(app, html);
});

Hooks.on("getHeaderControlsActorSheet", (app, controls) => {
  if (!isSyncButtonEnabled()) return;
  const actor = getActorFromApp(app);
  if (!actor) return;
  if (controls?.some?.((control) => control.action === "netherscrolls.syncActor")) {
    return;
  }
  controls.unshift({
    action: "netherscrolls.syncActor",
    icon: "fa-solid fa-cloud-upload-alt",
    label: "sync",
    onClick: () => postActorSyncMessage(actor),
  });
});

Hooks.on("getHeaderControlsActorSheetV2", (app, controls) => {
  if (!isSyncButtonEnabled()) return;
  const actor = getActorFromApp(app);
  if (!actor) return;
  if (controls?.some?.((control) => control.action === "netherscrolls.syncActor")) {
    return;
  }
  controls.unshift({
    action: "netherscrolls.syncActor",
    icon: "fa-solid fa-cloud-upload-alt",
    label: "sync",
    ownership: "OBSERVER",
    onClick: () => postActorSyncMessage(actor),
  });
});

Hooks.on("getHeaderControlsActorSheetV2", (app, controls) => {
  if (!isSyncButtonEnabled()) return;
  const actor = getActorFromApp(app);
  if (!actor) return;
  if (controls?.some?.((control) => control.action === "netherscrolls.syncActor")) {
    return;
  }
  controls.unshift({
    action: "netherscrolls.syncActor",
    icon: "fa-solid fa-cloud-upload-alt",
    label: "sync",
    ownership: "OBSERVER",
    onClick: () => postActorSyncMessage(actor),
  });
});

function isDnd5eSystem() {
  return game?.system?.id === "dnd5e";
}

let rerollInitHandler = null;
let npcDeathSaveHandler = null;
let npcDeathCleanupHandler = null;
let chatScrollPatch = null;
let chatScrollRenderHook = null;
let chatMessageRenderHook = null;
const chatLogState = new Map();

function rerenderActorSheets() {
  const apps = Object.values(ui?.windows ?? {});
  for (const app of apps) {
    if (app?.actor || app?.document?.documentName === "Actor") {
      app.render(false);
    }
  }
}

function injectSyncButtonV1(app, html) {
  if (!isSyncButtonEnabled()) return;
  if (!isActorSheetApp(app)) return;

  const root = html?.length ? html : app?.element;
  if (!root?.length) return;

  const actor = getActorFromApp(app);
  if (!actor) return;

  let header = root.find(".window-header");
  if (!header?.length && app?.element?.find) {
    header = app.element.find(".window-header");
  }
  if (header?.length && !header.find(".netherscrolls-sync-button").length) {
    const button = $(
      `<a class="header-button netherscrolls-sync-button">
        <i class="fas fa-cloud-upload-alt"></i>
        <span>sync</span>
      </a>`
    );
    button.attr("data-action", "netherscrolls.syncActor");
    button.on("click", () => postActorSyncMessage(actor));
    header.append(button);
  }

  let content = root.find(".window-content");
  if (!content?.length && app?.element?.find) {
    content = app.element.find(".window-content");
  }
  if (content?.length && !content.find(".netherscrolls-sync-row").length) {
    const row = $(
      `<div class="netherscrolls-sync-row">
        <button type="button" class="netherscrolls-sync-fallback">
          <i class="fas fa-cloud-upload-alt"></i>
          <span>sync</span>
        </button>
      </div>`
    );
    row.find("button").on("click", () => postActorSyncMessage(actor));
    content.prepend(row);
  }
}

function injectSyncButtonV2(app, html) {
  if (!isSyncButtonEnabled()) return;
  if (!isActorSheetApp(app)) return;

  const root = getRootElement(app, html);
  const windowEl = getWindowElement(app, root);
  if (!windowEl) return;

  const actor = getActorFromApp(app);
  if (!actor) return;

  const header = windowEl.querySelector(".window-header");
  if (header && !header.querySelector(".netherscrolls-sync-button")) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "header-control netherscrolls-sync-button";
    button.dataset.action = "netherscrolls.syncActor";
    button.innerHTML =
      '<i class="fa-solid fa-cloud-upload-alt"></i><span>sync</span>';
    button.addEventListener("click", () => postActorSyncMessage(actor));

    const controls = header.querySelector(".window-controls") || header;
    controls.appendChild(button);
  }

  const content = windowEl.querySelector(".window-content");
  if (content && !content.querySelector(".netherscrolls-sync-row")) {
    const row = document.createElement("div");
    row.className = "netherscrolls-sync-row";
    row.innerHTML =
      '<button type="button" class="netherscrolls-sync-fallback">' +
      '<i class="fa-solid fa-cloud-upload-alt"></i>' +
      "<span>sync</span>" +
      "</button>";
    row.querySelector("button")?.addEventListener("click", () =>
      postActorSyncMessage(actor)
    );
    content.prepend(row);
  }
}

function isSyncButtonEnabled() {
  return Boolean(game?.settings?.get(MODULE_ID, SETTINGS.syncButton));
}

function isPowerButtonEnabled() {
  return Boolean(game?.settings?.get(MODULE_ID, SETTINGS.powerButton));
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

function getRootElement(app, html) {
  if (html?.[0]) return html[0];
  if (html?.nodeType === 1) return html;
  if (html?.nodeType === 11 && html.firstElementChild) {
    return html.firstElementChild;
  }
  if (app?.element?.[0]) return app.element[0];
  if (app?.element?.nodeType === 1) return app.element;
  if (app?.element?.nodeType === 11 && app.element.firstElementChild) {
    return app.element.firstElementChild;
  }
  return null;
}

function getWindowElement(app, root) {
  if (app?.element?.[0]) return app.element[0];
  if (app?.element?.nodeType === 1) return app.element;
  if (root?.classList?.contains?.("window-app")) return root;
  return root?.closest?.(".window-app") || root;
}

function injectPowerButtonV1(app, html) {
  if (!isSyncButtonEnabled()) return;
  if (!isActorSheetApp(app)) return;

  const root = html?.length ? html : app?.element;
  if (!root?.length) return;

  const actor = getActorFromApp(app);
  if (!actor) return;

  let header = root.find(".window-header");
  if (!header?.length && app?.element?.find) {
    header = app.element.find(".window-header");
  }
  if (!header?.length) return;
  if (header.find(".netherscrolls-sync-button").length) return;

  const button = $(
    `<a class="header-button netherscrolls-sync-button">
      <i class="fas fa-cloud-upload-alt"></i>
      <span>sync</span>
    </a>`
  );
  button.attr("data-action", "netherscrolls.syncActor");
  button.on("click", () => postActorSyncMessage(actor));
  header.append(button);
}

function injectPowerButtonV2(app, html) {
  if (!isSyncButtonEnabled()) return;
  if (!isActorSheetApp(app)) return;

  const root = getRootElement(app, html);
  const windowEl = getWindowElement(app, root);
  if (!windowEl) return;

  const actor = getActorFromApp(app);
  if (!actor) return;

  const header = windowEl.querySelector(".window-header");
  if (!header || header.querySelector(".netherscrolls-sync-button")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "header-control netherscrolls-sync-button";
  button.dataset.action = "netherscrolls.syncActor";
  button.innerHTML =
    '<i class="fa-solid fa-cloud-upload-alt"></i><span>sync</span>';
  button.addEventListener("click", () => postActorSyncMessage(actor));

  const controls = header.querySelector(".window-controls") || header;
  controls.appendChild(button);
}

function announcePower(actor) {
  if (!actor) return;
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `${actor.name} IS THE STRONGEST`,
  });
}

function postActorSyncMessage(actor) {
  if (!actor) return;
  const payload = buildActorSyncPayload(actor);
  const content = renderSyncPayload(payload);
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
  });
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
    const prof = toNumber(data?.proficient ?? data?.prof);
    let bonus = data?.save ?? data?.save?.value ?? data?.saveBonus;
    if (bonus == null) {
      const mod = toNumber(data?.mod);
      const extra = toNumber(data?.bonuses?.save);
      bonus = mod + toNumber(profBonus) * prof + extra;
    }
    result[key] = {
      prof,
      bonus: toNumber(bonus),
    };
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

function toggleChatScrollLock(enabled) {
  if (!game?.ready) return;
  const shouldEnable = Boolean(enabled);

  if (shouldEnable && !chatScrollPatch) {
    chatScrollPatch = patchChatScrollBottom();
    if (!chatScrollPatch) {
      ui?.notifications?.warn?.("Chat auto-scroll lock unavailable.");
      return;
    }

    chatScrollRenderHook = handleChatLogRender;
    Hooks.on("renderChatLog", chatScrollRenderHook);
    chatMessageRenderHook = handleChatMessageRender;
    Hooks.on("renderChatMessage", chatMessageRenderHook);
    handleChatLogRender(ui?.chat, ui?.chat?.element);
    ui?.notifications?.info?.("Chat auto-scroll lock: ON");
  } else if (!shouldEnable && chatScrollPatch) {
    if (chatScrollRenderHook) {
      Hooks.off("renderChatLog", chatScrollRenderHook);
      chatScrollRenderHook = null;
    }
    if (chatMessageRenderHook) {
      Hooks.off("renderChatMessage", chatMessageRenderHook);
      chatMessageRenderHook = null;
    }
    chatScrollPatch.restore();
    chatScrollPatch = null;
    untrackAllChatLogs();
    ui?.notifications?.info?.("Chat auto-scroll lock: OFF");
  }
}

function patchChatScrollBottom() {
  const proto = ChatLog?.prototype;
  if (!proto?.scrollBottom) return null;

  const original = proto.scrollBottom;
  const wrapped = function (...args) {
    if (!isChatAutoScrollAllowed(this)) return;
    return original.apply(this, args);
  };

  proto.scrollBottom = wrapped;

  return {
    restore: () => {
      proto.scrollBottom = original;
    },
  };
}

function handleChatLogRender(app, html) {
  const log = getChatLogElement(html ?? app);
  if (log) {
    trackChatLog(log);
  }
}

function getChatLogElement(context) {
  if (context?.find) {
    const byId = context.find("#chat-log");
    if (byId?.length) return byId.get(0);
    const byClass = context.find(".chat-log");
    if (byClass?.length) return byClass.get(0);
  }

  const root =
    context?.element?.[0] ??
    context?.element ??
    (context?.querySelector ? context : null) ??
    document;

  return (
    root?.querySelector?.("#chat-log") ||
    root?.querySelector?.(".chat-log") ||
    document.querySelector("#chat-log") ||
    document.querySelector(".chat-log")
  );
}

function trackChatLog(log) {
  if (!log || chatLogState.has(log)) return;
  const state = {
    atBottom: true,
    lastScrollTop: 0,
    userScrollActiveUntil: 0,
    restoring: false,
    pendingRestore: false,
    locked: false,
    handler: null,
    inputHandler: null,
    keyHandler: null,
    jumpHandler: null,
    jumpButton: null,
  };

  const handler = () => handleChatScroll(log, state);

  state.handler = handler;
  chatLogState.set(log, state);
  log.addEventListener("scroll", handler);
  bindChatUserInput(log, state);
  ensureJumpButton(log, state);
  initializeChatState(log, state);
}

function untrackAllChatLogs() {
  for (const [log, state] of chatLogState.entries()) {
    log.removeEventListener("scroll", state.handler);
    unbindChatUserInput(log, state);
    detachJumpButton(state);
  }
  chatLogState.clear();
}

function isChatAutoScrollAllowed(app) {
  const log = getChatLogElement(app);
  if (!log) return true;
  trackChatLog(log);
  return !(chatLogState.get(log)?.locked ?? false);
}

function handleChatScroll(log, state) {
  if (state.restoring) {
    state.restoring = false;
    return;
  }

  ensureJumpButton(log, state);
  const now = Date.now();
  const userActive = now <= state.userScrollActiveUntil;
  const atBottomNow = isChatAtBottom(log);

  if (userActive) {
    state.lastScrollTop = log.scrollTop;
    state.atBottom = atBottomNow;
    state.locked = !atBottomNow;
    return;
  }

  if (state.locked) {
    if (Math.abs(log.scrollTop - state.lastScrollTop) > 1) {
      state.restoring = true;
      log.scrollTop = state.lastScrollTop;
    }
    return;
  }

  state.lastScrollTop = log.scrollTop;
}

function scheduleChatScrollRestore(log, state) {
  if (state.pendingRestore) return;
  state.pendingRestore = true;

  const restore = () => {
    state.pendingRestore = false;
    ensureJumpButton(log, state);
    if (Date.now() <= state.userScrollActiveUntil) return;
    if (!state.locked) return;
    const target = state.lastScrollTop ?? log.scrollTop;
    if (Math.abs(log.scrollTop - target) > 1) {
      state.restoring = true;
      log.scrollTop = target;
    }
  };

  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(restore);
  } else {
    setTimeout(restore, 0);
  }
}

function handleChatMessageRender() {
  const log = getChatLogElement(ui?.chat);
  if (!log) return;
  trackChatLog(log);

  const state = chatLogState.get(log);
  if (!state || !state.locked) return;
  scheduleChatScrollRestore(log, state);
}

function bindChatUserInput(log, state) {
  const inputHandler = () => markUserScrollActive(state);
  state.inputHandler = inputHandler;

  log.addEventListener("wheel", inputHandler, { passive: true });
  log.addEventListener("touchstart", inputHandler, { passive: true });
  log.addEventListener("touchmove", inputHandler, { passive: true });
  log.addEventListener("pointerdown", inputHandler);

  const keyHandler = (event) => {
    const key = event?.key;
    if (!key) return;
    if (
      key === "PageUp" ||
      key === "PageDown" ||
      key === "Home" ||
      key === "End" ||
      key === "ArrowUp" ||
      key === "ArrowDown" ||
      key === " "
    ) {
      markUserScrollActive(state);
    }
  };
  state.keyHandler = keyHandler;
  log.addEventListener("keydown", keyHandler);
}

function unbindChatUserInput(log, state) {
  if (state.inputHandler) {
    log.removeEventListener("wheel", state.inputHandler);
    log.removeEventListener("touchstart", state.inputHandler);
    log.removeEventListener("touchmove", state.inputHandler);
    log.removeEventListener("pointerdown", state.inputHandler);
  }
  if (state.keyHandler) {
    log.removeEventListener("keydown", state.keyHandler);
  }
}

function markUserScrollActive(state, extraMs = 0) {
  const now = Date.now();
  const until = now + CHAT_SCROLL_USER_GRACE_MS + extraMs;
  if (until > state.userScrollActiveUntil) {
    state.userScrollActiveUntil = until;
  }
}

function ensureJumpButton(log, state) {
  const button = findJumpToBottomButton(log);
  if (!button) {
    if (state.jumpButton && !state.jumpButton.isConnected) {
      detachJumpButton(state);
    }
    return;
  }

  if (state.jumpButton === button) return;
  detachJumpButton(state);

  const handler = () => markUserScrollActive(state, CHAT_SCROLL_USER_GRACE_MS);
  state.jumpButton = button;
  state.jumpHandler = handler;
  button.addEventListener("click", handler);
}

function detachJumpButton(state) {
  if (state.jumpButton && state.jumpHandler) {
    state.jumpButton.removeEventListener("click", state.jumpHandler);
  }
  state.jumpButton = null;
  state.jumpHandler = null;
}

function findJumpToBottomButton(log) {
  const root =
    log?.closest?.("#chat") ||
    log?.closest?.(".sidebar-tab") ||
    document;

  const selectors = [
    ".jump-to-bottom",
    "[data-action='scrollBottom']",
    "[data-control='scrollBottom']",
    "[data-tooltip='Jump to Bottom']",
    "[data-tooltip='CHAT.JumpToBottom']",
    "[aria-label='Jump to Bottom']",
    "[aria-label='CHAT.JumpToBottom']",
    "[title='Jump to Bottom']",
    "[title='CHAT.JumpToBottom']",
  ];

  for (const selector of selectors) {
    const found = root.querySelector(selector);
    if (found) return found;
  }

  const candidates = root.querySelectorAll("button, a, div");
  for (const candidate of candidates) {
    const tooltip =
      candidate.getAttribute("data-tooltip") ||
      candidate.getAttribute("aria-label") ||
      candidate.getAttribute("title");
    if (!tooltip) continue;
    if (/jump to bottom/i.test(tooltip) || /chat\.jumptobottom/i.test(tooltip)) {
      return candidate;
    }
  }

  return null;
}

function initializeChatState(log, state) {
  const atBottom = isChatAtBottom(log);
  state.atBottom = atBottom;
  state.locked = !atBottom;
  state.lastScrollTop = log.scrollTop;
}

function isChatAtBottom(log) {
  const distance = log.scrollHeight - log.scrollTop - log.clientHeight;
  return distance <= CHAT_SCROLL_THRESHOLD;
}

function toggleNpcDeathSaveHook(enabled) {
  if (!game?.ready) return;
  const shouldEnable = Boolean(enabled);

  if (shouldEnable && !npcDeathSaveHandler) {
    npcDeathSaveHandler = buildNpcDeathSaveHandler();
    Hooks.on("updateCombat", npcDeathSaveHandler);
    npcDeathCleanupHandler = buildNpcDeathCleanupHandler();
    Hooks.on("updateActor", npcDeathCleanupHandler);
    ui?.notifications?.info?.("NPC death save each turn: ON");
  } else if (!shouldEnable && npcDeathSaveHandler) {
    Hooks.off("updateCombat", npcDeathSaveHandler);
    npcDeathSaveHandler = null;
    if (npcDeathCleanupHandler) {
      Hooks.off("updateActor", npcDeathCleanupHandler);
      npcDeathCleanupHandler = null;
    }
    ui?.notifications?.info?.("NPC death save each turn: OFF");
  }
}

function buildNpcDeathSaveHandler() {
  const lastByCombat = {};

  return async (combat, changed) => {
    if (!game?.user?.isGM) return;
    if (!combat?.isActive) return;
    if (!Object.prototype.hasOwnProperty.call(changed ?? {}, "turn") &&
        !Object.prototype.hasOwnProperty.call(changed ?? {}, "round")) {
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

function buildNpcDeathCleanupHandler() {
  return async (actor, changed) => {
    if (!game?.user?.isGM) return;
    if (!actor) return;
    if (actor.hasPlayerOwner) return;

    if (!shouldUpdateDeathOverlay(changed)) return;
    await applyDeathOverlayFromActor(actor);
  };
}

function shouldUpdateDeathOverlay(changed) {
  if (!changed?.system?.attributes) return false;
  const hpChanged = Object.prototype.hasOwnProperty.call(
    changed.system.attributes,
    "hp"
  );
  const deathChanged = Object.prototype.hasOwnProperty.call(
    changed.system.attributes,
    "death"
  );
  return hpChanged || deathChanged;
}

async function applyDeathOverlayFromActor(actor) {
  const hp = Number(actor.system?.attributes?.hp?.value ?? 0);
  const death = actor.system?.attributes?.death;
  const success = Number(death?.success ?? 0);
  const failure = Number(death?.failure ?? 0);

  const targetStatus = getDeathOverlayTarget({ hp, success, failure });
  await setDeathOverlayState(actor, targetStatus);
}

function getDeathOverlayTarget({ hp, success, failure }) {
  if (Number(hp) > 0) return null;
  if (Number(failure) >= 3) return "dead";
  if (Number(success) >= 3) return "stable";
  return "unconscious";
}

async function setDeathOverlayState(actor, targetStatus) {
  if (!actor?.toggleStatusEffect) return;
  const statuses = actor?.statuses;
  const desired = {
    unconscious: false,
    stable: false,
    dead: false,
  };
  const overlays = {
    unconscious: false,
    stable: false,
    dead: false,
  };

  if (targetStatus === "dead") {
    desired.dead = true;
    overlays.dead = true;
  } else if (targetStatus === "stable") {
    desired.stable = true;
    overlays.stable = true;
    desired.unconscious = true;
    overlays.unconscious = false;
  } else if (targetStatus === "unconscious") {
    desired.unconscious = true;
    overlays.unconscious = true;
  }

  for (const id of Object.keys(desired)) {
    const shouldBeActive = desired[id];
    const overlay = overlays[id] ?? false;
    const state = getStatusEffectState(actor, id);
    const configured = isStatusEffectConfigured(id);

    if (shouldBeActive) {
      if (state.active) {
        await updateStatusEffectOverlay(state.effect, overlay);
        continue;
      }

      if (state.exists && state.effect) {
        await state.effect.update({ disabled: false });
        await updateStatusEffectOverlay(state.effect, overlay);
        continue;
      }

      if (configured) {
        await actor.toggleStatusEffect(id, { active: true, overlay });
      }
      continue;
    }

    if (state.active && state.effect) {
      await state.effect.update({ disabled: true });
      continue;
    }

    if (configured && (statuses?.has?.(id) ?? false)) {
      await actor.toggleStatusEffect(id, { active: false, overlay: false });
    }
  }
}

function getStatusEffectState(actor, statusId) {
  const effects = actor?.effects;
  if (!effects) return { exists: false, active: false, effect: null };

  let found = null;
  for (const effect of effects) {
    const statusIds = effect?.statuses;
    const coreStatusId =
      effect?.getFlag?.("core", "statusId") ?? effect?.flags?.core?.statusId;

    if (statusIds?.has?.(statusId) || coreStatusId === statusId) {
      found = effect;
      break;
    }
  }

  if (!found) {
    return { exists: false, active: false, effect: null };
  }

  const disabled = Boolean(found.disabled);
  return { exists: true, active: !disabled, effect: found };
}

function isStatusEffectConfigured(statusId) {
  const effects = CONFIG?.statusEffects;
  if (!Array.isArray(effects)) return false;
  return effects.some(
    (effect) =>
      effect?.id === statusId ||
      effect?.statusId === statusId ||
      effect?.flags?.core?.statusId === statusId
  );
}

async function updateStatusEffectOverlay(effect, overlay) {
  if (!effect) return;
  const current =
    effect?.getFlag?.("core", "overlay") ?? effect?.flags?.core?.overlay;
  if (current === overlay) return;
  try {
    await effect.update({ "flags.core.overlay": overlay });
  } catch (err) {
    console.warn("Failed to update status effect overlay.", err);
  }
}

function extendDnd5eSpellLevels() {
  const spellLevels = CONFIG?.DND5E?.spellLevels;
  if (!spellLevels) return;

  for (const level of HIGH_SLOT_LEVELS) {
    if (spellLevels[level] == null) {
      spellLevels[level] = `DND5E.SpellLevel${level}`;
    }
  }
}


function ensureHighSlotsOnAllActors() {
  if (!game?.actors?.size) return;
  for (const actor of game.actors) {
    ensureHighSlotsOnActor(actor);
  }
}

function ensureHighSlotsOnActor(actor) {
  if (!actor?.system?.spells) return;
  if (!canUpdateActor(actor)) return;

  const template = buildHighSlotTemplate(actor);
  const updates = {};

  for (const level of HIGH_SLOT_LEVELS) {
    const key = `spell${level}`;
    const existing = actor.system.spells[key];
    const path = `system.spells.${key}`;

    if (!existing || typeof existing !== "object") {
      updates[path] = deepClone(template);
      continue;
    }

    if (existing.value == null) {
      updates[`${path}.value`] = 0;
    }
    if (existing.max == null) {
      updates[`${path}.max`] = 0;
    }
  }

  if (Object.keys(updates).length) {
    actor.update(updates);
  }
}

function buildHighSlotTemplate(actor) {
  const base = actor?.system?.spells?.spell9 ?? { value: 0, max: 0 };
  const template = deepClone(base);
  template.value = 0;
  template.max = 0;
  return template;
}

function deepClone(value) {
  if (foundry?.utils?.deepClone) {
    return foundry.utils.deepClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function canUpdateActor(actor) {
  if (!actor) return false;
  if (game?.user?.isGM) return true;
  return actor.isOwner === true;
}


// ---------------------------------------------------------------------
// DO NOT TOUCH CODE BELLOW, IT WORKS FOR BUTTON INSPIRES YOURSELF FROM IT
// ---------------------------------------------------------------------
// const MODULE_ID = "netherscrolls-module";
// const MODULE_TITLE = "Netherscrolls Module";
// const REQUIRED_API_KEY = "MYAPIKEY";

// const SETTINGS = {
//   helo: "sayHeloBack",
//   banana: "sayBananaBack",
//   strongest: "imTheStrongest",
//   apiKey: "apiKey",
// };
// //something something
// Hooks.once("init", () => {
//   game.settings.register(MODULE_ID, SETTINGS.helo, {
//     name: "Say helo back",
//     hint: "When someone says helo, reply with helo you [actor name].",
//     scope: "world",
//     config: true,
//     type: Boolean,
//     default: true,
//   });

//   game.settings.register(MODULE_ID, SETTINGS.banana, {
//     name: "Say banana back",
//     hint: "When someone says banana, reply with banana !",
//     scope: "world",
//     config: true,
//     type: Boolean,
//     default: true,
//   });

//   game.settings.register(MODULE_ID, SETTINGS.strongest, {
//     name: "I'm the strongest",
//     hint: "Adds a SHOW POWER button to every Actor sheet.",
//     scope: "world",
//     config: true,
//     type: Boolean,
//     default: true,
//   });

//   game.settings.register(MODULE_ID, SETTINGS.apiKey, {
//     name: "API KEY",
//     hint: "Enter MYAPIKEY to enable all module features.",
//     scope: "world",
//     config: true,
//     type: String,
//     default: "",
//   });
// });

// Hooks.on("chatMessage", (_chatLog, message, chatData) => {
//   if (!game?.ready || !hasValidKey()) return true;

//   const text = String(message ?? "").trim();
//   if (!text || text.startsWith("/")) return true;

//   const normalized = text.toLowerCase();
//   if (isFeatureEnabled(SETTINGS.helo) && /\bhelo\b/.test(normalized)) {
//     postChatMessage(`helo you ${getSpeakerName(chatData)}`);
//   }

//   if (isFeatureEnabled(SETTINGS.banana) && /\bbanana\b/.test(normalized)) {
//     postChatMessage("banana !");
//   }

//   return true;
// });

// Hooks.on("renderApplicationV1", (app, html) => {
//   injectShowPowerButtonV1(app, html);
// });

// Hooks.on("renderApplicationV2", (app, element) => {
//   injectShowPowerButtonV2(app, element);
// });

// Hooks.on("renderActorSheet", (app, html) => {
//   injectShowPowerButtonV1(app, html);
// });

// function hasValidKey() {
//   try {
//     return game.settings.get(MODULE_ID, SETTINGS.apiKey) === REQUIRED_API_KEY;
//   } catch (error) {
//     console.warn(`${MODULE_ID} | Unable to read API key setting.`, error);
//     return false;
//   }
// }

// function isFeatureEnabled(settingKey) {
//   if (!game?.ready || !hasValidKey()) return false;
//   if (!settingKey) return true;
//   return game.settings.get(MODULE_ID, settingKey) === true;
// }

// function getSpeakerName(chatData) {
//   const alias = chatData?.speaker?.alias;
//   if (alias) return alias;
//   const user = chatData?.user ? game.users?.get(chatData.user) : null;
//   return user?.name ?? "someone";
// }

// function getActorFromApp(app) {
//   return app?.document ?? app?.actor ?? null;
// }

// function isActorSheet(app) {
//   const actor = getActorFromApp(app);
//   return actor?.documentName === "Actor";
// }

// function injectShowPowerButtonV1(app, html) {
//   if (!isFeatureEnabled(SETTINGS.strongest)) return;
//   if (!isActorSheet(app)) return;
//   if (!html?.closest) return;

//   const appElement = html.closest(".app");
//   if (!appElement?.find) return;

//   const header = appElement.find(".window-header");
//   if (!header.length) return;
//   if (header.find(".netherscrolls-show-power").length) return;

//   const button = $(
//     `<a class="header-button netherscrolls-show-power" title="SHOW POWER">
//       <i class="fas fa-bolt"></i>SHOW POWER
//     </a>`
//   );

//   button.on("click", () => announceStrongest(getActorFromApp(app)));
//   header.append(button);
// }

// function injectShowPowerButtonV2(app, element) {
//   if (!isFeatureEnabled(SETTINGS.strongest)) return;
//   if (!isActorSheet(app)) return;
//   if (!element?.querySelector) return;

//   const header =
//     element.querySelector("header.window-header") ||
//     element.querySelector(".window-header");
//   if (!header) return;
//   if (header.querySelector(".netherscrolls-show-power")) return;

//   const controls = header.querySelector(".header-controls") || header;
//   const button = document.createElement("button");
//   button.type = "button";
//   button.classList.add("header-control", "netherscrolls-show-power");
//   button.innerHTML = '<i class="fas fa-bolt"></i><span>SHOW POWER</span>';
//   button.addEventListener("click", () => announceStrongest(getActorFromApp(app)));
//   controls.appendChild(button);
// }

// function announceStrongest(actor) {
//   if (!isFeatureEnabled(SETTINGS.strongest)) return;
//   if (!actor?.name) return;
//   postChatMessage(`${actor.name} IS THE STRONGEST`);
// }

// function postChatMessage(content) {
//   if (!content) return;
//   ChatMessage.create({
//     content,
//     speaker: ChatMessage.getSpeaker({ alias: MODULE_TITLE }),
//     flags: {
//       [MODULE_ID]: {
//         response: true,
//       },
//     },
//   });
// }
