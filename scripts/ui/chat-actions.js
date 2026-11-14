/**
 * Offer contextual number actions for selected chat text.
 * Keep toolbar selection and listeners local to this feature across repeated renders.
 */
import { MODULE_ID } from "../core/constants.js";
import { toNumber, toTrimmedStringOrNull } from "../core/utils.js";

let chatNumberActionHandlersBound = false;

let chatNumberActionToolbar = null;

/** Install document-level selection handlers once and reuse the toolbar for subsequent chat selections. */
function initChatNumberActionHandlers() {
  if (chatNumberActionHandlersBound) return;
  if (typeof document?.addEventListener !== "function") return;

  ensureChatNumberActionToolbar();
  document.addEventListener("selectionchange", onChatNumberSelectionChange);
  document.addEventListener("mousedown", onChatNumberDocumentMouseDown, true);
  document.addEventListener("keydown", onChatNumberDocumentKeydown, true);
  if (typeof window?.addEventListener === "function") {
    window.addEventListener("resize", hideChatNumberActionToolbar);
    window.addEventListener("scroll", hideChatNumberActionToolbar, true);
  }
  chatNumberActionHandlersBound = true;
}

/** Ensure chat number action toolbar. */
function ensureChatNumberActionToolbar() {
  if (chatNumberActionToolbar?.isConnected) return chatNumberActionToolbar;
  if (!document?.body) return null;

  const toolbar = document.createElement("div");
  toolbar.classList.add("ns-chat-number-toolbar");
  toolbar.hidden = true;
  toolbar.innerHTML = `
    <button type="button" class="ns-chat-number-action" data-hp-action="add">Add maximum hp</button>
    <button
      type="button"
      class="ns-chat-number-action is-remove"
      data-hp-action="remove"
    >Remove maximum hp</button>
  `;
  toolbar.addEventListener(
    "mousedown",
    /** Handle the user event while ensure chat number action toolbar. */ (event) =>
      event.preventDefault()
  );
  toolbar.addEventListener("click", onChatNumberActionClick);
  document.body.append(toolbar);
  chatNumberActionToolbar = toolbar;
  return toolbar;
}

/** Handle chat number selection change. */
function onChatNumberSelectionChange() {
  refreshChatNumberActionToolbar();
}

/** Handle chat number document mouse down. */
function onChatNumberDocumentMouseDown(event) {
  if (event?.target?.closest?.(".ns-chat-number-toolbar")) return;
  if (!event?.target?.closest?.(".chat-message, #chat-log, .chat-log, .chat-popout")) {
    hideChatNumberActionToolbar();
  }
}

/** Handle chat number document keydown. */
function onChatNumberDocumentKeydown(event) {
  if (event?.key === "Escape") hideChatNumberActionToolbar();
}

/** Handle refresh chat number action toolbar. */
function refreshChatNumberActionToolbar() {
  const selectionData = getSelectedChatNumberData();
  if (!selectionData) {
    hideChatNumberActionToolbar();
    return;
  }
  showChatNumberActionToolbar(selectionData);
}

/** Retrieve selected chat number data. */
function getSelectedChatNumberData() {
  const selection = window?.getSelection?.();
  if (!selection || selection.rangeCount < 1 || selection.isCollapsed) return null;

  const range = selection.getRangeAt(0);
  if (!range) return null;
  if (!isNodeWithinChatLog(range.startContainer) || !isNodeWithinChatLog(range.endContainer)) {
    return null;
  }

  const amount = parseSelectedChatNumber(selection.toString());
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const rect = getSelectionClientRect(range);
  if (!rect) return null;

  return { amount, rect };
}

/** Determine whether node within chat log. */
function isNodeWithinChatLog(node) {
  const element = node instanceof Element ? node : (node?.parentElement ?? null);
  return Boolean(element?.closest?.(".chat-message, #chat-log, .chat-log, .chat-popout"));
}

/** Parse selected chat number. */
function parseSelectedChatNumber(text) {
  const normalized = toTrimmedStringOrNull(String(text ?? "").replace(/\u2212/g, "-"));
  if (!normalized) return null;

  const matches = normalized.match(/[+-]?\d[\d,]*(?:\.\d+)?/g) ?? [];
  if (matches.length !== 1) return null;

  const parsed = Number(matches[0].replace(/,/g, ""));
  if (!Number.isFinite(parsed)) return null;

  return Math.floor(Math.abs(parsed));
}

/** Retrieve selection client rect. */
function getSelectionClientRect(range) {
  if (!range?.getClientRects || !range?.getBoundingClientRect) return null;

  const rects = Array.from(range.getClientRects()).filter(
    /** Keep entries that satisfy the condition while retrieve selection client rect. */
    (rect) => Number(rect?.width) > 0 || Number(rect?.height) > 0
  );
  const rect = rects[rects.length - 1] ?? range.getBoundingClientRect();
  if (!rect || (Number(rect.width) <= 0 && Number(rect.height) <= 0)) return null;
  return rect;
}

/** Handle show chat number action toolbar. */
function showChatNumberActionToolbar(selectionData) {
  const toolbar = ensureChatNumberActionToolbar();
  if (!toolbar) return;

  toolbar.dataset.amount = String(selectionData.amount);
  toolbar.hidden = false;
  toolbar.style.left = "-9999px";
  toolbar.style.top = "-9999px";

  const toolbarWidth = toolbar.offsetWidth || 0;
  const toolbarHeight = toolbar.offsetHeight || 0;
  const margin = 8;
  const rect = selectionData.rect;

  let left = rect.left + rect.width / 2 - toolbarWidth / 2;
  const maxLeft = Math.max(margin, window.innerWidth - toolbarWidth - margin);
  left = Math.min(Math.max(margin, left), maxLeft);

  let top = rect.top - toolbarHeight - margin;
  if (top < margin) top = rect.bottom + margin;

  toolbar.style.left = `${Math.round(left)}px`;
  toolbar.style.top = `${Math.round(top)}px`;
}

/** Handle hide chat number action toolbar. */
function hideChatNumberActionToolbar() {
  if (!chatNumberActionToolbar) return;
  chatNumberActionToolbar.hidden = true;
  delete chatNumberActionToolbar.dataset.amount;
}

/** Handle chat number action click. */
async function onChatNumberActionClick(event) {
  const button = event?.target?.closest?.(".ns-chat-number-action");
  if (!button || !chatNumberActionToolbar) return;

  const amount = Math.max(0, Math.floor(toNumber(chatNumberActionToolbar.dataset?.amount, 0)));
  if (amount <= 0) {
    ui?.notifications?.warn?.("Select exactly one positive number in chat first.");
    hideChatNumberActionToolbar();
    return;
  }

  const action = String(button.dataset?.hpAction ?? "");
  const delta = action === "remove" ? -amount : amount;
  if (delta === 0) return;

  const buttons = Array.from(chatNumberActionToolbar.querySelectorAll(".ns-chat-number-action"));
  for (const entry of buttons) entry.disabled = true;

  try {
    await applySelectedMaxHpToControlledActors(delta, amount);
  } finally {
    for (const entry of buttons) entry.disabled = false;
    clearCurrentTextSelection();
    hideChatNumberActionToolbar();
  }
}

/** Clear current text selection. */
function clearCurrentTextSelection() {
  try {
    window?.getSelection?.()?.removeAllRanges?.();
  } catch {
    // Ignore selection clearing failures.
  }
}

/** Apply selected max hp to controlled actors. */
async function applySelectedMaxHpToControlledActors(delta, amount) {
  const actors = getControlledTokenActors();
  if (!actors.length) {
    ui?.notifications?.warn?.("Control at least one token before changing maximum HP.");
    return;
  }

  const failed = [];
  let updated = 0;

  for (const actor of actors) {
    try {
      const changed = await applyActorMaximumHpChange(actor, delta);
      if (changed) updated += 1;
    } catch (err) {
      failed.push(actor?.name ?? "Unknown Actor");
      console.warn(
        `${MODULE_ID} | Unable to change maximum HP for ${actor?.name ?? "actor"}.`,
        err
      );
    }
  }

  if (updated > 0) {
    const verb = delta > 0 ? "Added" : "Removed";
    const prep = delta > 0 ? "to" : "from";
    const noun = updated === 1 ? "actor" : "actors";
    ui?.notifications?.info?.(
      `${verb} ${amount} maximum HP ${prep} ${updated} controlled ${noun}.`
    );
  }

  if (failed.length) {
    ui?.notifications?.warn?.(`Maximum HP change failed for: ${failed.join(", ")}`);
  }
}

/** Retrieve controlled token actors. */
function getControlledTokenActors() {
  const controlled = Array.isArray(canvas?.tokens?.controlled) ? canvas.tokens.controlled : [];
  const actors = [];
  const seen = new Set();

  for (const token of controlled) {
    const actor = token?.actor;
    if (!actor?.update || actor?.isOwner === false) continue;

    const key = toTrimmedStringOrNull(
      actor?.uuid ?? actor?.id ?? token?.document?.uuid ?? token?.id
    );
    if (!key || seen.has(key)) continue;
    seen.add(key);
    actors.push(actor);
  }

  return actors;
}

/** Apply actor maximum hp change. */
async function applyActorMaximumHpChange(actor, delta) {
  if (!actor?.update || !delta) return false;

  const hp = actor.system?.attributes?.hp ?? {};
  const currentValue = Math.max(0, toNumber(hp.value, 0));
  const baseMax = Math.max(0, toNumber(hp.max, 0));
  const hasTempMax = Object.prototype.hasOwnProperty.call(hp, "tempmax") || hp?.tempmax != null;

  // Prefer tempmax so temporary maximum HP changes do not overwrite the actor's base max HP.
  if (hasTempMax) {
    const currentTempMax = toNumber(hp.tempmax, 0);
    const nextTempMax = Math.max(-baseMax, currentTempMax + delta);
    const nextValue = Math.min(currentValue, Math.max(0, baseMax + nextTempMax));
    const updateData = {
      "system.attributes.hp.tempmax": nextTempMax,
    };
    if (nextValue !== currentValue) updateData["system.attributes.hp.value"] = nextValue;
    await actor.update(updateData);
    return true;
  }

  const nextMax = Math.max(0, baseMax + delta);
  const nextValue = Math.min(currentValue, nextMax);
  const updateData = {
    "system.attributes.hp.max": nextMax,
  };
  if (nextValue !== currentValue) updateData["system.attributes.hp.value"] = nextValue;
  await actor.update(updateData);
  return true;
}

export { initChatNumberActionHandlers };
