/**
 * Collect the number of dice to enhance through the available Foundry dialog API.
 * Validate counts at the UI boundary before gameplay code changes a roll.
 */
import { escapeHtml, toNumber, toTrimmedStringOrNull } from "../core/utils.js";

let enhanceDialogInputHandlersBound = false;

/** Initialize enhance dialog input handlers. */
function initEnhanceDialogInputHandlers() {
  if (enhanceDialogInputHandlersBound) return;
  if (typeof document?.addEventListener !== "function") return;

  document.addEventListener("click", onEnhanceDialogControlClick);
  document.addEventListener("input", onEnhanceDialogInputEvent);
  document.addEventListener("change", onEnhanceDialogInputEvent);
  enhanceDialogInputHandlersBound = true;
}

/** Handle enhance dialog control click. */
function onEnhanceDialogControlClick(event) {
  const button = event?.target?.closest?.(".ns-enhance-step");
  if (!button) return;

  const bucket = toTrimmedStringOrNull(button.dataset?.enhanceBucket);
  if (!bucket) return;

  const root = button.closest(".ns-enhance-damage") ?? document;
  const input = root?.querySelector?.(`[data-enhance-input="${bucket}"]`);
  if (!input) return;

  const step = Number(button.dataset?.enhanceStep ?? 0);
  if (!Number.isFinite(step) || step === 0) return;

  adjustEnhanceDialogInput(input, step > 0 ? 1 : -1);
  event.preventDefault();
}

/** Handle enhance dialog input event. */
function onEnhanceDialogInputEvent(event) {
  const input = event?.target;
  if (!(input instanceof HTMLInputElement)) return;
  if (!input.matches?.("[data-enhance-input]")) return;
  clampEnhanceDialogInputValue(input);
}

/** Handle adjust enhance dialog input. */
function adjustEnhanceDialogInput(input, delta) {
  if (!(input instanceof HTMLInputElement)) return;

  const { min, max } = getEnhanceDialogInputLimits(input);
  const current = Number(input.value);
  const base = Number.isFinite(current) ? Math.floor(current) : min;
  const next = Math.max(min, Math.min(max, base + delta));
  input.value = String(next);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Handle clamp enhance dialog input value. */
function clampEnhanceDialogInputValue(input) {
  if (!(input instanceof HTMLInputElement)) return;

  const { min, max } = getEnhanceDialogInputLimits(input);
  const current = Number(input.value);
  const next = Number.isFinite(current) ? Math.floor(current) : min;
  const clamped = Math.max(min, Math.min(max, next));
  if (String(clamped) !== String(input.value)) input.value = String(clamped);
}

/** Retrieve enhance dialog input limits. */
function getEnhanceDialogInputLimits(input) {
  const rawMin = Number(input?.min);
  const rawMax = Number(input?.max);
  const min = Number.isFinite(rawMin) ? rawMin : 0;
  const max = Number.isFinite(rawMax) ? rawMax : Number.POSITIVE_INFINITY;
  return {
    min: Math.floor(min),
    max: Math.floor(max),
  };
}

/** Render enhance dialog content. */
function renderEnhanceDialogContent(buckets) {
  const rows = buckets
    .map(
      /** Transform each entry while render enhance dialog content. */ (bucket, index) => {
        const label = escapeHtml(String(bucket.label ?? "Roll"));
        const dieLabel = escapeHtml(String(bucket.dieLabel ?? ""));
        const diceText = escapeHtml(
          bucket.dice
            .map(
              /** Transform each entry while render enhance dialog content. */ (die) => die.value
            )
            .join(", ")
        );
        return `
        <tr>
          <td>${label}</td>
          <td>${dieLabel}</td>
          <td>${diceText}</td>
          <td>
            <div class="ns-enhance-stepper" data-enhance-bucket="${index}">
              <button
                type="button"
                class="ns-enhance-step"
                data-enhance-step="-1"
                data-enhance-bucket="${index}"
                aria-label="Decrease reroll count"
                title="Decrease"
              >&#9660;</button>
              <input
                type="number"
                min="0"
                max="${bucket.dice.length}"
                value="0"
                step="1"
                inputmode="numeric"
                name="enhance-bucket-${index}"
                data-enhance-input="${index}"
                class="ns-enhance-input"
              />
              <button
                type="button"
                class="ns-enhance-step"
                data-enhance-step="1"
                data-enhance-bucket="${index}"
                aria-label="Increase reroll count"
                title="Increase"
              >&#9650;</button>
            </div>
          </td>
        </tr>
      `;
      }
    )
    .join("");

  return `
    <div class="ns-enhance-damage">
      <p>Set how many of the lowest dice to reroll.</p>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="text-align: left;">Roll</th>
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

/** Read enhance dialog counts. */
function readEnhanceDialogCounts(html, buckets) {
  const counts = {};
  for (let index = 0; index < buckets.length; index += 1) {
    const bucket = buckets[index];
    const input =
      html?.find?.(`[data-enhance-input="${index}"]`)?.first?.() ??
      html?.find?.(`[data-enhance-input="${index}"]`);
    const raw = typeof input?.val === "function" ? input.val() : input?.value;
    const amount = Math.floor(toNumber(raw, 0));
    counts[bucket.key] = Math.max(0, Math.min(bucket.dice.length, amount));
  }
  return counts;
}

/** Read enhance dialog counts from form. */
function readEnhanceDialogCountsFromForm(form, buckets) {
  const counts = {};
  for (let index = 0; index < buckets.length; index += 1) {
    const bucket = buckets[index];
    const input =
      form?.elements?.namedItem?.(`enhance-bucket-${index}`) ??
      form?.querySelector?.(`[data-enhance-input="${index}"]`);
    const raw = input?.value;
    const amount = Math.floor(toNumber(raw, 0));
    counts[bucket.key] = Math.max(0, Math.min(bucket.dice.length, amount));
  }
  return counts;
}

/** Determine whether enhance counts object. */
function isEnhanceCountsObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Resolve enhance dialog root. */
function resolveEnhanceDialogRoot(event, button, dialog) {
  const eventTarget = event?.currentTarget ?? event?.target ?? null;
  const fromEvent =
    eventTarget?.closest?.(".window-content, .dialog-content, .app, .application, .dialog") ?? null;
  if (fromEvent?.querySelector) return fromEvent;

  const dialogElement = dialog?.element ?? dialog?.window?.element ?? null;
  const dialogNode = dialogElement?.[0] ?? dialogElement;
  if (dialogNode?.querySelector) return dialogNode;

  const buttonElement = button?.element ?? null;
  const buttonNode = buttonElement?.[0] ?? buttonElement;
  if (buttonNode?.closest) {
    const fromButton =
      buttonNode.closest(".window-content, .dialog-content, .app, .application, .dialog") ?? null;
    if (fromButton?.querySelector) return fromButton;
  }

  return document;
}

/** Handle prompt enhance reroll counts fallback. */
async function promptEnhanceRerollCountsFallback(buckets) {
  const counts = {};

  for (const bucket of buckets) {
    const label = String(bucket.label ?? "Roll");
    const diceValues = bucket.dice
      .map(
        /** Transform each entry while handle prompt enhance reroll counts fallback. */ (die) =>
          die.value
      )
      .join(", ");
    const response = window.prompt(
      `Enhance Roll\n${label} ${bucket.dieLabel}\nRolled: ${diceValues}\nHow many lowest dice to reroll? (0-${bucket.dice.length})`,
      "0"
    );
    if (response == null) return null;

    const amount = Math.floor(toNumber(response, 0));
    counts[bucket.key] = Math.max(0, Math.min(bucket.dice.length, amount));
  }

  return counts;
}

/** Collect bounded counts through the supported dialog API before any roll is mutated. */
async function promptEnhanceRerollCounts(buckets) {
  const content = renderEnhanceDialogContent(buckets);
  const dialogV2 = foundry?.applications?.api?.DialogV2;

  if (dialogV2?.prompt) {
    try {
      const value = await dialogV2.prompt({
        window: { title: "Enhance Roll" },
        content,
        modal: true,
        rejectClose: false,
        ok: {
          label: "Reroll",
          icon: '<i class="fas fa-check"></i>',
          callback: /** Handle callback. */ (event, button, dialog) => {
            const root = resolveEnhanceDialogRoot(event, button, dialog);
            return readEnhanceDialogCountsFromForm(root, buckets);
          },
        },
      });
      if (value == null) return null;
      if (isEnhanceCountsObject(value)) return value;
    } catch {
      // Continue to fallbacks.
    }
  }

  if (typeof Dialog === "function") {
    return new Promise(
      /** Perform the callback while handle prompt enhance reroll counts. */ (resolve) => {
        let settled = false;
        const done = /** Handle done. */ (value) => {
          if (settled) return;
          settled = true;
          resolve(value);
        };

        const dialog = new Dialog({
          title: "Enhance Roll",
          content,
          buttons: {
            apply: {
              icon: '<i class="fas fa-check"></i>',
              label: "Reroll",
              callback: /** Handle callback. */ (html) =>
                done(readEnhanceDialogCounts(html, buckets)),
            },
            cancel: {
              icon: '<i class="fas fa-times"></i>',
              label: "Cancel",
              callback: /** Handle callback. */ () => done(null),
            },
          },
          default: "apply",
          close: /** Handle close. */ () => done(null),
        });

        dialog.render(true);
      }
    );
  }

  const fallback = {};
  if (typeof window?.prompt === "function") {
    return promptEnhanceRerollCountsFallback(buckets);
  }
  for (const bucket of buckets) fallback[bucket.key] = 0;
  return fallback;
}

export { initEnhanceDialogInputHandlers, isEnhanceCountsObject, promptEnhanceRerollCounts };
