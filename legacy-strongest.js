// ---------------------------------------------------------------------
// DO NOT TOUCH CODE BELLOW, IT WORKS FOR BUTTON INSPIRES YOURSELF FROM IT
// ---------------------------------------------------------------------
const MODULE_ID = "netherscrolls-module";
const MODULE_TITLE = "Netherscrolls Module";
const REQUIRED_API_KEY = "MYAPIKEY";

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
  if (!actor?.name) return;
  postChatMessage(`${actor.name} IS THE STRONGEST`);
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
