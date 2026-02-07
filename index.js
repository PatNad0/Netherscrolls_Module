const MODULE_ID = "netherscrolls-module";
const PLACEHOLDER_CHARACTER_ID = "PLACEHOLDER";
const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];
const SKILL_KEY_TO_NAME = {
  acr: "acrobatics",
  ani: "animalHandling",
  arc: "arcana",
  ath: "athletics",
  dec: "deception",
  his: "history",
  ins: "insight",
  itm: "intimidation",
  inv: "investigation",
  med: "medicine",
  nat: "nature",
  prc: "perception",
  prf: "performance",
  per: "persuasion",
  rel: "religion",
  slt: "sleightOfHand",
  ste: "stealth",
  sur: "survival",
};
const SYNC_ENDPOINT = "https://api.netherscrolls.ca/api/foundry/sync";

const SETTINGS = {
  rerollInit: "rerollInitEachRound",
  npcDeathSave: "npcDeathSaveEachTurn",
  apiKey: "nsApiKey",
  syncButton: "showSyncButton",
  debug: "debugMode",
  devEnhancedDamage: "devEnhancedDamage",
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

  game.settings.register(MODULE_ID, SETTINGS.devEnhancedDamage, {
    name: "[DEV] enhanced damage",
    hint: "Developer toggle for enhanced damage behavior.",
    scope: "world",
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

Hooks.on("getChatLogEntryContext", (_html, options) => {
  registerEnhancedDamageContextOption(options);
});
Hooks.on("getChatMessageContextOptions", (_app, options) => {
  registerEnhancedDamageContextOption(options);
});
Hooks.on("getDocumentContextOptions", (app, options) => {
  if (!isChatContextApplication(app)) return;
  registerEnhancedDamageContextOption(options);
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

function isEnhancedDamageEnabled() {
  return Boolean(game?.settings?.get(MODULE_ID, SETTINGS.devEnhancedDamage));
}

function isChatContextApplication(app) {
  if (!app) return false;
  const name = String(app?.constructor?.name ?? "");
  if (/ChatLog|ChatPopout/i.test(name)) return true;
  const tabName = String(app?.tabName ?? "");
  return tabName === "chat";
}

function registerEnhancedDamageContextOption(options) {
  if (!Array.isArray(options)) return;
  if (options.some((option) => option?.name === "Enhance")) return;

  options.push({
    name: "Enhance",
    icon: '<i class="fas fa-magic"></i>',
    condition: (li) => {
      if (!isEnhancedDamageEnabled()) return false;
      const message = getContextMenuMessage(li);
      return canEnhanceDamageMessage(message);
    },
    callback: async (li) => {
      const message = getContextMenuMessage(li);
      if (!canEnhanceDamageMessage(message)) return;
      await runEnhanceDamageFlow(message);
    },
  });
}

function getContextMenuMessage(li) {
  const target =
    li?.[0] ??
    (typeof li?.get === "function" ? li.get(0) : null) ??
    (li instanceof HTMLElement ? li : null);
  const entry =
    target?.closest?.("[data-message-id], [data-document-id], [data-entry-id]") ?? target;

  const messageId =
    li?.data?.("messageId") ??
    li?.data?.("documentId") ??
    li?.data?.("entryId") ??
    li?.attr?.("data-message-id") ??
    li?.attr?.("data-document-id") ??
    li?.attr?.("data-entry-id") ??
    entry?.dataset?.messageId ??
    entry?.dataset?.documentId ??
    entry?.dataset?.entryId ??
    null;
  if (!messageId) return null;
  return game?.messages?.get(messageId) ?? null;
}

function canEnhanceDamageMessage(message) {
  if (!message) return false;

  const canCreate =
    game?.user?.isGM === true ||
    (typeof game?.user?.can === "function"
      ? game.user.can("MESSAGE_CREATE") || game.user.can("CHAT_MESSAGE_CREATE")
      : true);
  if (!canCreate) return false;

  const type = String(message?.flags?.dnd5e?.roll?.type ?? "");
  if (/(damage|healing)/i.test(type)) return true;

  const flaggedRolls = message?.flags?.dnd5e?.rolls;
  if (
    Array.isArray(flaggedRolls) &&
    flaggedRolls.some((entry) => /(damage|healing)/i.test(String(entry?.type ?? "")))
  ) {
    return true;
  }

  const messageRolls = Array.isArray(message?.rolls) ? message.rolls : [];
  return messageRolls.some((roll) => {
    const rollName = String(roll?.constructor?.name ?? "");
    const rollType = String(roll?.options?.type ?? "");
    return /damage/i.test(rollName) || /(damage|healing)/i.test(rollType);
  });
}

async function runEnhanceDamageFlow(message) {
  const buckets = collectEnhanceBuckets(message);
  if (!buckets.length) {
    ui?.notifications?.warn?.("Enhance: no damage dice were found in this message.");
    return;
  }

  const selectedCounts = await promptEnhanceRerollCounts(buckets);
  if (!selectedCounts) return;

  await repostDamageMessage(message, buckets, selectedCounts);
}

function collectEnhanceBuckets(message) {
  const buckets = new Map();
  const messageRolls = Array.isArray(message?.rolls) ? message.rolls : [];

  for (let rollIndex = 0; rollIndex < messageRolls.length; rollIndex += 1) {
    const roll = messageRolls[rollIndex];
    if (!isDamageLikeRoll(message, roll, rollIndex)) continue;

    const damageType = getRollDamageType(message, roll, rollIndex);
    const terms = Array.isArray(roll?.terms) ? roll.terms : [];

    for (let termIndex = 0; termIndex < terms.length; termIndex += 1) {
      const term = terms[termIndex];
      const faces = Number(term?.faces);
      const results = Array.isArray(term?.results) ? term.results : null;
      if (!Number.isFinite(faces) || faces <= 0 || !results?.length) continue;

      const key = `${damageType}\u0000${faces}`;
      const bucket =
        buckets.get(key) ??
        {
          key,
          damageType,
          faces,
          dice: [],
        };
      buckets.set(key, bucket);

      for (let resultIndex = 0; resultIndex < results.length; resultIndex += 1) {
        const result = results[resultIndex];
        if (result?.active === false || result?.discarded === true) continue;
        const value = Number(result?.result);
        if (!Number.isFinite(value)) continue;

        bucket.dice.push({
          value,
          rollIndex,
          termIndex,
          resultIndex,
          faces,
        });
      }
    }
  }

  const list = Array.from(buckets.values()).filter((bucket) => bucket.dice.length > 0);
  for (const bucket of list) {
    bucket.dice.sort(
      (a, b) =>
        a.value - b.value ||
        a.rollIndex - b.rollIndex ||
        a.termIndex - b.termIndex ||
        a.resultIndex - b.resultIndex
    );
  }

  list.sort((a, b) => {
    const byType = String(a.damageType).localeCompare(String(b.damageType));
    return byType || a.faces - b.faces;
  });

  return list;
}

function isDamageLikeRoll(message, roll, rollIndex) {
  const rollType = String(roll?.options?.type ?? "").toLowerCase();
  if (/(damage|healing)/.test(rollType)) return true;

  const rollName = String(roll?.constructor?.name ?? "");
  if (/damage/i.test(rollName)) return true;

  const entry = getDnd5eFlaggedRollEntry(message, rollIndex);
  const entryType = String(entry?.type ?? "").toLowerCase();
  if (/(damage|healing)/.test(entryType)) return true;

  if ((Array.isArray(message?.rolls) ? message.rolls.length : 0) === 1) {
    const messageType = String(message?.flags?.dnd5e?.roll?.type ?? "").toLowerCase();
    if (/(damage|healing)/.test(messageType)) return true;
  }

  return false;
}

function getDnd5eFlaggedRollEntry(message, rollIndex) {
  const flagged = message?.flags?.dnd5e?.rolls;
  if (!Array.isArray(flagged)) return null;
  return flagged[rollIndex] ?? null;
}

function getRollDamageType(message, roll, rollIndex) {
  const entry = getDnd5eFlaggedRollEntry(message, rollIndex);
  const single = message?.flags?.dnd5e?.roll ?? {};
  const options = roll?.options ?? {};

  const candidates = [
    options.damageType,
    Array.isArray(options.damageTypes) ? options.damageTypes.join(", ") : null,
    entry?.damageType,
    Array.isArray(entry?.damageTypes) ? entry.damageTypes.join(", ") : null,
    single?.damageType,
    Array.isArray(single?.damageTypes) ? single.damageTypes.join(", ") : null,
    options.flavor,
  ];

  for (const candidate of candidates) {
    const value = toTrimmedStringOrNull(candidate);
    if (value) return value;
  }

  const kind = String(options.type ?? entry?.type ?? single?.type ?? "").toLowerCase();
  if (kind === "healing") return "healing";
  return "damage";
}

function renderEnhanceDialogContent(buckets) {
  const rows = buckets
    .map((bucket, index) => {
      const damageType = escapeHtml(String(bucket.damageType ?? "damage"));
      const diceText = escapeHtml(bucket.dice.map((die) => die.value).join(", "));
      return `
        <tr>
          <td>${damageType}</td>
          <td>d${bucket.faces}</td>
          <td>${diceText}</td>
          <td>
            <input
              type="number"
              min="0"
              max="${bucket.dice.length}"
              value="0"
              step="1"
              name="enhance-bucket-${index}"
              data-enhance-bucket="${index}"
              style="width: 5em;"
            />
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <div class="ns-enhance-damage">
      <p>Set how many of the lowest dice to reroll for each damage bucket.</p>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="text-align: left;">Damage Type</th>
            <th style="text-align: left;">Die</th>
            <th style="text-align: left;">Rolled Dice</th>
            <th style="text-align: left;">Reroll Count</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function readEnhanceDialogCounts(html, buckets) {
  const counts = {};
  for (let index = 0; index < buckets.length; index += 1) {
    const bucket = buckets[index];
    const input =
      html?.find?.(`[data-enhance-bucket="${index}"]`)?.first?.() ??
      html?.find?.(`[data-enhance-bucket="${index}"]`);
    const raw = typeof input?.val === "function" ? input.val() : input?.value;
    const amount = Math.floor(toNumber(raw, 0));
    counts[bucket.key] = Math.max(0, Math.min(bucket.dice.length, amount));
  }
  return counts;
}

function readEnhanceDialogCountsFromForm(form, buckets) {
  const counts = {};
  for (let index = 0; index < buckets.length; index += 1) {
    const bucket = buckets[index];
    const input =
      form?.elements?.namedItem?.(`enhance-bucket-${index}`) ??
      form?.querySelector?.(`[data-enhance-bucket="${index}"]`);
    const raw = input?.value;
    const amount = Math.floor(toNumber(raw, 0));
    counts[bucket.key] = Math.max(0, Math.min(bucket.dice.length, amount));
  }
  return counts;
}

async function promptEnhanceRerollCountsFallback(buckets) {
  const counts = {};

  for (const bucket of buckets) {
    const damageType = String(bucket.damageType ?? "damage");
    const diceValues = bucket.dice.map((die) => die.value).join(", ");
    const response = window.prompt(
      `Enhance Damage\n${damageType} d${bucket.faces}\nRolled: ${diceValues}\nHow many lowest dice to reroll? (0-${bucket.dice.length})`,
      "0"
    );
    if (response == null) return null;

    const amount = Math.floor(toNumber(response, 0));
    counts[bucket.key] = Math.max(0, Math.min(bucket.dice.length, amount));
  }

  return counts;
}

async function promptEnhanceRerollCounts(buckets) {
  const content = renderEnhanceDialogContent(buckets);
  const dialogV2 = foundry?.applications?.api?.DialogV2;

  if (dialogV2?.prompt) {
    try {
      return await dialogV2.prompt({
        window: { title: "Enhance Damage" },
        content,
        modal: true,
        rejectClose: false,
        ok: {
          label: "Reroll",
          icon: '<i class="fas fa-check"></i>',
          callback: (_event, button) => readEnhanceDialogCountsFromForm(button?.form, buckets),
        },
      });
    } catch {
      return null;
    }
  }

  if (typeof Dialog === "function") {
    return new Promise((resolve) => {
      let settled = false;
      const done = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      const dialog = new Dialog({
        title: "Enhance Damage",
        content,
        buttons: {
          apply: {
            icon: '<i class="fas fa-check"></i>',
            label: "Reroll",
            callback: (html) => done(readEnhanceDialogCounts(html, buckets)),
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => done(null),
          },
        },
        default: "apply",
        close: () => done(null),
      });

      dialog.render(true);
    });
  }

  const fallback = {};
  if (typeof window?.prompt === "function") {
    return promptEnhanceRerollCountsFallback(buckets);
  }
  for (const bucket of buckets) fallback[bucket.key] = 0;
  return fallback;
}

function randomDieResult(faces) {
  const sides = Math.max(1, Math.floor(toNumber(faces, 0)));
  const uniform =
    typeof CONFIG?.Dice?.randomUniform === "function" ? CONFIG.Dice.randomUniform() : Math.random();
  return Math.floor(uniform * sides) + 1;
}

function recomputeRollData(rollData) {
  if (!rollData || typeof rollData !== "object") return rollData;
  try {
    if (typeof Roll?.fromData === "function") {
      const roll = Roll.fromData(rollData);
      if (typeof roll?._evaluateTotal === "function") {
        roll._total = roll._evaluateTotal();
      } else if (Number.isFinite(Number(roll?.total))) {
        roll._total = Number(roll.total);
      }
      return typeof roll?.toJSON === "function" ? roll.toJSON() : rollData;
    }
  } catch (err) {
    console.warn(`${MODULE_ID} | Unable to recompute enhanced roll total.`, err);
  }

  const fallbackTotal = computeSimpleRollTotal(rollData?.terms);
  if (Number.isFinite(fallbackTotal)) {
    rollData.total = fallbackTotal;
    rollData._total = fallbackTotal;
    rollData.result = String(fallbackTotal);
  }
  return rollData;
}

function computeSimpleRollTotal(terms) {
  if (!Array.isArray(terms) || !terms.length) return null;

  let total = 0;
  let hasValue = false;
  let operator = "+";

  for (const term of terms) {
    const op = String(term?.operator ?? "");
    if (["+", "-", "*", "/"].includes(op)) {
      operator = op;
      continue;
    }

    const value = getSimpleTermTotal(term);
    if (!Number.isFinite(value)) continue;
    hasValue = true;

    if (operator === "+") total += value;
    else if (operator === "-") total -= value;
    else if (operator === "*") total *= value;
    else if (operator === "/") total = value === 0 ? total : total / value;
    operator = "+";
  }

  return hasValue ? total : null;
}

function getSimpleTermTotal(term) {
  if (!term || typeof term !== "object") return null;

  const results = Array.isArray(term?.results) ? term.results : null;
  if (results?.length) {
    return results.reduce((sum, result) => {
      if (result?.active === false || result?.discarded === true) return sum;
      const value = Number(result?.result);
      return Number.isFinite(value) ? sum + value : sum;
    }, 0);
  }

  const number = Number(term?.number);
  if (Number.isFinite(number)) return number;

  const total = Number(term?.total);
  if (Number.isFinite(total)) return total;

  return null;
}

function applyEnhanceRerolls(source, buckets, selectedCounts) {
  const rolls = Array.isArray(source?.rolls) ? source.rolls : [];
  const changedRollIndices = new Set();

  for (const bucket of buckets) {
    const rawCount = selectedCounts?.[bucket.key] ?? 0;
    const count = Math.max(0, Math.min(bucket.dice.length, Math.floor(toNumber(rawCount, 0))));
    if (count <= 0) continue;

    for (const die of bucket.dice.slice(0, count)) {
      const result =
        rolls?.[die.rollIndex]?.terms?.[die.termIndex]?.results?.[die.resultIndex] ?? null;
      if (!result) continue;
      result.result = randomDieResult(die.faces);
      changedRollIndices.add(die.rollIndex);
    }
  }

  for (const rollIndex of changedRollIndices) {
    const rollData = rolls[rollIndex];
    if (!rollData) continue;
    rolls[rollIndex] = recomputeRollData(rollData);
  }
}

async function repostDamageMessage(message, buckets = null, selectedCounts = null) {
  try {
    const source = foundry?.utils?.deepClone?.(message.toObject()) ?? message.toObject();
    if (Array.isArray(buckets) && selectedCounts) {
      applyEnhanceRerolls(source, buckets, selectedCounts);
    }
    delete source._id;
    delete source._stats;
    source.user = game?.user?.id ?? source.user;
    source.timestamp = Date.now();
    await ChatMessage.create(source);
  } catch (err) {
    console.error(`${MODULE_ID} | Enhance damage failed.`, err);
    ui?.notifications?.error?.("Enhance damage failed. Check console for details.");
  }
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
    skills: buildSkills(actor, system.skills, abilities, system.bonuses, attributes.prof),
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

function buildSkills(actor, skills, abilities, bonuses, profBonus) {
  const result = {};
  if (!skills || typeof skills !== "object") return result;

  const pb = toNumber(profBonus);
  const rollData = typeof actor?.getRollData === "function" ? actor.getRollData() : null;
  const global = bonuses?.abilities ?? {};

  for (const [key, skill] of Object.entries(skills)) {
    if (!skill || typeof skill !== "object") continue;

    const outKey = SKILL_KEY_TO_NAME[key] ?? key;
    const abilityKey = skill?.ability ?? null;
    const prof = toNumber(skill?.value ?? skill?.proficient ?? skill?.prof);
    const ability = abilityKey ? abilities?.[abilityKey] ?? {} : {};

    const abilityMod = getAbilityMod(ability);
    const base = abilityMod + getProficiencyContribution(pb, prof);
    const total = getSkillTotalBonus(skill, base, rollData, {
      skillCheck: skill?.bonuses?.check,
      abilityCheck: ability?.bonuses?.check,
      globalAbilityCheck: global?.check,
      globalSkill: global?.skill,
    });

    result[outKey] = {
      ability: abilityKey,
      prof,
      misc: toNumber(total - base),
    };
  }

  return result;
}

function getProficiencyContribution(proficiencyBonus, prof) {
  const pb = toNumber(proficiencyBonus);
  const p = toNumber(prof);
  if (!pb || !p) return 0;
  // Match 5e / dnd5e rounding rules for half-proficiency.
  return Math.floor(pb * p);
}

function getSkillTotalBonus(skill, base, rollData, bonusFormulas) {
  const direct =
    toNumberOrNull(skill?.total) ??
    toNumberOrNull(skill?.mod) ??
    toNumberOrNull(skill?.bonus) ??
    toNumberOrNull(skill?.check?.total) ??
    toNumberOrNull(skill?.check?.bonus);
  if (direct != null) return direct;

  const misc =
    evalDeterministicFormula(bonusFormulas?.skillCheck, rollData) +
    evalDeterministicFormula(bonusFormulas?.abilityCheck, rollData) +
    evalDeterministicFormula(bonusFormulas?.globalAbilityCheck, rollData) +
    evalDeterministicFormula(bonusFormulas?.globalSkill, rollData);
  return base + misc;
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
  const name = normalizeNetherscrollsName(item?.name);
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
    return { netherscrollsId, name };
  }

  return compactObject({
    name,
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
  const name = normalizeNetherscrollsName(item?.name);
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
    return { netherscrollsId, name };
  }

  return compactObject({
    name,
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
  const name = normalizeNetherscrollsName(item?.name);
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
    return { netherscrollsId, name };
  }

  return compactObject({
    name,
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

function toTrimmedStringOrNull(value) {
  if (value == null) return null;
  const str = String(value).trim();
  return str ? str : null;
}

function evalDeterministicFormula(formula, rollData) {
  const raw = toTrimmedStringOrNull(formula);
  if (!raw) return 0;

  // Avoid randomness; these should be flat numeric bonuses (sometimes with @data references).
  if (/\d+d\d+/i.test(raw)) return 0;

  // Roll formulas like "+1" are not always valid standalone; prefix with 0.
  const expr = /^[+-]/.test(raw) ? `0 ${raw}` : raw;

  try {
    if (typeof Roll === "function") {
      const roll = new Roll(expr, rollData ?? {});
      const evaluated = roll.evaluate?.({ async: false });
      const total = Number((evaluated ?? roll)?.total);
      return Number.isFinite(total) ? total : 0;
    }
  } catch {
    // Fall back to a plain numeric parse.
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeNetherscrollsName(name) {
  if (!name) return "";
  return String(name)
    .replace(/\s*\(Legacy\)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
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
    if (!item?.setFlag || !id) return;
    const current = item?.getFlag?.(MODULE_ID, "netherscrollsId") ?? null;
    if (current === id) return;
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

function toNumberOrNull(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
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
    if (!actor?.setFlag || !characterId) return;
    const current = actor?.getFlag?.(MODULE_ID, "characterId") ?? null;
    if (current === characterId) return;
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
    const round = Number(changed.round);
    if (!Number.isFinite(round)) return;
    if (lastByCombat[combat.id] === round) return;
    lastByCombat[combat.id] = round;

    // Foundry startCombat() begins at round 1, so keep the initial initiative roll.
    if (round <= 1) return;

    setTimeout(async () => {
      try {
        await combat.resetAll({ updateTurn: false });
        await combat.rollAll({
          updateTurn: false,
          messageOptions: { create: false },
        });
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
    const key = `${item.type}:${normalizeNetherscrollsName(item.name).toLowerCase()}`;
    const bucket = byName.get(key);
    if (bucket) bucket.push(item);
    else byName.set(key, [item]);
  }

  const apply = async (links, type) => {
    for (const link of links) {
      const id = link?.id;
      const name = link?.name;
      if (!id || !name) continue;
      const key = `${type}:${normalizeNetherscrollsName(name).toLowerCase()}`;
      const items = byName.get(key);
      if (!items) continue;
      for (const item of items) {
        await setItemNetherId(item, id);
      }
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
