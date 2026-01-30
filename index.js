const MODULE_ID = "netherscrolls-module";
const MODULE_TITLE = "Netherscrolls Module";
const REQUIRED_API_KEY = "MYAPIKEY";
const HIGH_SLOT_LEVELS = [10, 11, 12, 13, 14, 15];

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
  injectHighSlotsV1(app, html);
});

Hooks.on("renderApplicationV2", (app, element) => {
  injectShowPowerButtonV2(app, element);
  injectHighSlotsV2(app, element);
});

Hooks.on("renderActorSheet", (app, html) => {
  injectShowPowerButtonV1(app, html);
  injectHighSlotsV1(app, html);
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
    `<a class="header-button netherscrolls-show-power" title="SHOW POWER">
      <i class="fas fa-bolt"></i>SHOW POWER
    </a>`
  );

  button.on("click", () => announceStrongest(getActorFromApp(app)));
  header.append(button);
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

  const controls = header.querySelector(".header-controls") || header;
  const button = document.createElement("button");
  button.type = "button";
  button.classList.add("header-control", "netherscrolls-show-power");
  button.innerHTML = '<i class="fas fa-bolt"></i><span>SHOW POWER</span>';
  button.addEventListener("click", () => announceStrongest(getActorFromApp(app)));
  controls.appendChild(button);
}

function injectHighSlotsV1(app, html) {
  if (!isActorSheet(app)) return;
  const actor = getActorFromApp(app);
  if (!actor) return;
  if (!html?.find) return;

  ensureHighSlotStyles();

  const spellsTab = html.find(".tab.spells");
  if (!spellsTab.length) return;
  if (spellsTab.find(".netherscrolls-high-slots").length) return;

  const section = $(buildHighSlotsSection(actor));
  section.on("change", "input", () => {
    updateHighSlotsFromContainer(actor, section.get(0));
  });

  spellsTab.append(section);
}

function injectHighSlotsV2(app, element) {
  if (!isActorSheet(app)) return;
  const actor = getActorFromApp(app);
  if (!actor) return;
  if (!element?.querySelector) return;

  ensureHighSlotStyles();

  const spellsTab = element.querySelector(".tab.spells");
  if (!spellsTab) return;
  if (spellsTab.querySelector(".netherscrolls-high-slots")) return;

  const template = document.createElement("template");
  template.innerHTML = buildHighSlotsSection(actor).trim();
  const section = template.content.firstElementChild;
  if (!section) return;

  section.addEventListener("change", () => {
    updateHighSlotsFromContainer(actor, section);
  });

  spellsTab.appendChild(section);
}

function announceStrongest(actor) {
  if (!isFeatureEnabled(SETTINGS.strongest)) return;
  if (!actor?.name) return;
  postChatMessage(`${actor.name} IS THE STRONGEST`);
}

function buildHighSlotsSection(actor) {
  const slotData = getHighSlotData(actor);
  const rows = HIGH_SLOT_LEVELS.map((level) => {
    const value = slotData[level]?.value ?? 0;
    const max = slotData[level]?.max ?? 0;
    return `
      <div class="netherscrolls-high-slot" data-level="${level}">
        <label>${level}th</label>
        <input type="number" min="0" step="1" data-kind="value" value="${value}">
        <span>/</span>
        <input type="number" min="0" step="1" data-kind="max" value="${max}">
      </div>
    `;
  }).join("");

  return `
    <section class="netherscrolls-high-slots">
      <h3>High-Level Slots</h3>
      <div class="netherscrolls-high-slot-grid">
        ${rows}
      </div>
    </section>
  `;
}

function getHighSlotData(actor) {
  const stored = actor?.getFlag?.(MODULE_ID, "highSlots") ?? {};
  const result = {};
  for (const level of HIGH_SLOT_LEVELS) {
    const entry = stored?.[level] ?? stored?.[String(level)] ?? {};
    const value = Number.isFinite(entry?.value) ? entry.value : Number(entry?.value) || 0;
    const max = Number.isFinite(entry?.max) ? entry.max : Number(entry?.max) || 0;
    result[level] = { value, max };
  }
  return result;
}

function updateHighSlotsFromContainer(actor, container) {
  if (!actor || !container?.querySelectorAll) return;
  const entries = container.querySelectorAll(".netherscrolls-high-slot");
  const next = {};

  entries.forEach((entry) => {
    const level = entry.dataset.level;
    const valueInput = entry.querySelector('input[data-kind="value"]');
    const maxInput = entry.querySelector('input[data-kind="max"]');
    const value = toNonNegativeInt(valueInput?.value);
    const max = toNonNegativeInt(maxInput?.value);
    next[level] = { value, max };
  });

  actor.setFlag(MODULE_ID, "highSlots", next);
}

function toNonNegativeInt(value) {
  const parsed = Number.parseInt(value ?? "0", 10);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return parsed;
}

function ensureHighSlotStyles() {
  if (document.getElementById(`${MODULE_ID}-high-slots-style`)) return;
  const style = document.createElement("style");
  style.id = `${MODULE_ID}-high-slots-style`;
  style.textContent = `
    .netherscrolls-high-slots {
      border-top: 1px solid var(--color-border-light-tertiary, #b5b3a4);
      margin-top: 0.5rem;
      padding-top: 0.5rem;
    }
    .netherscrolls-high-slots h3 {
      margin: 0 0 0.35rem;
      font-size: 0.95rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .netherscrolls-high-slot-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 0.35rem 0.75rem;
    }
    .netherscrolls-high-slot {
      display: grid;
      grid-template-columns: auto 1fr auto 1fr;
      align-items: center;
      gap: 0.35rem;
    }
    .netherscrolls-high-slot input {
      width: 3.5rem;
      text-align: center;
    }
  `;
  document.head.appendChild(style);
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
