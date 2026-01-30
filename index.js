const MODULE_ID = "netherscrolls-module";
const HIGH_SLOT_LEVELS = [10, 11, 12, 13, 14, 15];
const CHAT_SCROLL_THRESHOLD = 10;
const CHAT_SCROLL_USER_GRACE_MS = 250;

const SETTINGS = {
  rerollInit: "rerollInitEachRound",
  npcDeathSave: "npcDeathSaveEachTurn",
  lockChatScroll: "lockChatAutoScroll",
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

function isDnd5eSystem() {
  return game?.system?.id === "dnd5e";
}

let rerollInitHandler = null;
let npcDeathSaveHandler = null;
let chatScrollPatch = null;
let chatScrollRenderHook = null;
let chatMessageRenderHook = null;
const chatLogState = new Map();

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
  handler();
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
  return chatLogState.get(log)?.atBottom ?? true;
}

function handleChatScroll(log, state) {
  if (state.restoring) {
    state.restoring = false;
    return;
  }

  ensureJumpButton(log, state);
  const now = Date.now();
  const userActive = now <= state.userScrollActiveUntil;
  const atBottomNow = isChatAtBottom(log, state);

  if (userActive) {
    state.lastScrollTop = log.scrollTop;
    state.atBottom = atBottomNow;
    return;
  }

  if (state.atBottom) {
    state.lastScrollTop = log.scrollTop;
    state.atBottom = atBottomNow;
    return;
  }

  if (Math.abs(log.scrollTop - state.lastScrollTop) > 1) {
    state.restoring = true;
    log.scrollTop = state.lastScrollTop;
  }
}

function scheduleChatScrollRestore(log, state) {
  if (state.pendingRestore) return;
  state.pendingRestore = true;

  const restore = () => {
    state.pendingRestore = false;
    ensureJumpButton(log, state);
    if (Date.now() <= state.userScrollActiveUntil) return;
    if (state.atBottom) return;
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
  if (!state || state.atBottom) return;
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

  return (
    root.querySelector(".jump-to-bottom") ||
    root.querySelector("[data-action='scrollBottom']") ||
    root.querySelector("[data-control='scrollBottom']")
  );
}

function isChatAtBottom(log, state) {
  const distance = log.scrollHeight - log.scrollTop - log.clientHeight;
  if (distance <= CHAT_SCROLL_THRESHOLD) {
    return !isJumpButtonVisible(log, state);
  }
  return false;
}

function isJumpButtonVisible(log, state) {
  const button = state?.jumpButton ?? findJumpToBottomButton(log);
  if (!button) return false;
  const style = window.getComputedStyle(button);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
    return false;
  }
  return button.getClientRects().length > 0;
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
