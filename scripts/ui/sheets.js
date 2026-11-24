/**
 * Integrate transfer controls and spellbook ordering with supported actor sheets.
 * Repeated render hooks must reuse controls and avoid wrapping a sheet prototype twice.
 */
import { MODULE_ID } from "../core/constants.js";
import { isFoundryExportButtonEnabled } from "../core/settings.js";
import { toNumber } from "../core/utils.js";
import { getActorNetherscrollsGuildId } from "../api/client.js";
import { getActorCompanionOwnerId } from "../data/references.js";
import { exportNetherscrollsCompanionActor } from "../export/companions.js";
import { exportActorToNetherscrolls, importActorFromNetherscrolls } from "../export/transfer.js";
import { findNetherscrollsActorByCharacterId } from "../foundry/actors.js";

const netherscrollsSpellbookPatchedClasses = new WeakSet();

/** Wrap each supported sheet prototype once so repeated renders cannot stack sorting wrappers. */
function installNetherscrollsSpellbookSectionOrdering() {
  const characterSheets = globalThis.CONFIG?.Actor?.sheetClasses?.character ?? {};
  for (const registration of Object.values(characterSheets)) {
    const SheetClass = registration?.cls;
    const prototype = SheetClass?.prototype;
    if (
      typeof SheetClass !== "function" ||
      typeof prototype?._prepareSpellbook !== "function" ||
      netherscrollsSpellbookPatchedClasses.has(SheetClass)
    ) {
      continue;
    }

    const prepareSpellbook = prototype._prepareSpellbook;
    Object.defineProperty(prototype, "_prepareSpellbook", {
      configurable: true,
      writable: true,
      value: /** Handle value. */ function prepareOrderedNetherscrollsSpellbook(...args) {
        return sortNetherscrollsSpellbookSections(prepareSpellbook.apply(this, args));
      },
    });
    netherscrollsSpellbookPatchedClasses.add(SheetClass);
  }
}

/** Sort spellbook sections. */
function sortNetherscrollsSpellbookSections(spellbook) {
  if (!spellbook || typeof spellbook !== "object" || Array.isArray(spellbook)) return spellbook;
  return Object.fromEntries(
    Object.entries(spellbook).sort(
      /** Order the entries while sort spellbook sections. */ (
        [leftKey, left],
        [rightKey, right]
      ) => {
        const orderDifference = toNumber(left?.order, 1000) - toNumber(right?.order, 1000);
        if (orderDifference) return orderDifference;

        const levelDifference =
          getNetherscrollsSpellbookSectionLevel(leftKey, left) -
          getNetherscrollsSpellbookSectionLevel(rightKey, right);
        if (levelDifference) return levelDifference;

        return String(left?.label ?? leftKey).localeCompare(
          String(right?.label ?? rightKey),
          game?.i18n?.lang
        );
      }
    )
  );
}

/** Retrieve spellbook section level. */
function getNetherscrollsSpellbookSectionLevel(key, section) {
  const datasetLevel = Number(section?.dataset?.level);
  if (Number.isFinite(datasetLevel)) return datasetLevel;
  const keyLevel = /^spell(\d+)$/i.exec(String(key ?? ""));
  return keyLevel ? Number(keyLevel[1]) : Number.POSITIVE_INFINITY;
}

/** Handle rerender actor sheets. */
function rerenderActorSheets() {
  const apps = Object.values(ui?.windows ?? {});
  for (const app of apps) {
    if (app?.actor || app?.document?.documentName === "Actor") {
      app.render(false);
    }
  }
}

/** Determine whether actor sheet app. */
function isActorSheetApp(app) {
  if (!app) return false;
  if (getActorFromApp(app)) return true;
  const name = app?.constructor?.name ?? "";
  return name.includes("ActorSheet");
}

/** Retrieve actor from app. */
function getActorFromApp(app) {
  if (app?.actor) return app.actor;
  if (app?.document?.documentName === "Actor") return app.document;
  if (app?.object?.documentName === "Actor") return app.object;
  if (app?.object?.actor) return app.object.actor;
  return null;
}

/** Character sheets and Netherscrolls companion sheets get the transfer buttons. */
function hasNetherscrollsTransferButtons(actor) {
  return actor?.type === "character" || Boolean(getActorCompanionOwnerId(actor));
}

/** Export from a sheet: a companion sends only its own runtime values. */
function exportNetherscrollsSheetActor(actor) {
  return getActorCompanionOwnerId(actor)
    ? exportNetherscrollsCompanionActor(actor)
    : exportActorToNetherscrolls(actor);
}

/**
 * The Actor an import button refreshes. A companion is calculated from its character, so it
 * is refreshed with the character (null, with a warning, when that is not in this world).
 */
function getNetherscrollsTransferActor(actor) {
  const ownerId = getActorCompanionOwnerId(actor);
  if (!ownerId) return actor;
  const owner = findNetherscrollsActorByCharacterId(ownerId, null, {
    guildId: getActorNetherscrollsGuildId(actor) || undefined,
  });
  if (!owner)
    ui?.notifications?.warn?.(
      `${actor.name} is refreshed with its character. Import that character first.`
    );
  return owner;
}

/** Run a transfer on the Actor a sheet button stands for. */
function runNetherscrollsSheetTransfer(actor, transfer) {
  const target = getNetherscrollsTransferActor(actor);
  if (!target) return Promise.resolve(null);
  return transfer(target);
}

/** Handle inject foundry export button v1. */
function injectFoundryExportButtonV1(app, html) {
  if (!isFoundryExportButtonEnabled()) return;
  if (!isActorSheetApp(app)) return;
  if (!html?.closest) return;

  const appElement = html.closest(".app");
  if (!appElement?.find) return;

  const actor = getActorFromApp(app);
  if (!hasNetherscrollsTransferButtons(actor)) return;

  const header = appElement.find(".window-header");
  if (!header.length) return;
  if (header.find(".netherscrolls-export-button, .netherscrolls-import-button").length) return;

  const exportButton = $(
    `<a class="header-button netherscrolls-export-button" title="Foundry Export">
      <i class="fas fa-cloud-upload-alt"></i>Foundry Export
    </a>`
  );
  const importButton = $(
    `<a class="header-button netherscrolls-import-button" title="Foundry Import">
      <i class="fas fa-cloud-download-alt"></i>Foundry Import
    </a>`
  );

  exportButton.on(
    "click",
    /** Handle the registered event while handle inject foundry export button v1. */ () => {
      exportNetherscrollsSheetActor(actor).catch(
        /** Handle the operation failure while handle inject foundry export button v1. */ (err) => {
          console.error(`${MODULE_ID} | Foundry Export could not be completed.`, err);
        }
      );
    }
  );
  importButton.on(
    "click",
    /** Handle the registered event while handle inject foundry export button v1. */ () => {
      runNetherscrollsSheetTransfer(actor, importActorFromNetherscrolls).catch(
        /** Handle the operation failure while handle inject foundry export button v1. */ () => {}
      );
    }
  );

  const modeSlider = header.find(".mode-slider");
  const title = header.find(".window-title");
  if (modeSlider.length) {
    modeSlider.last().after(exportButton);
  } else if (title.length) {
    title.first().before(exportButton);
  } else {
    header.prepend(exportButton);
  }
  exportButton.after(importButton);
}

/** Handle inject foundry export button v2. */
function injectFoundryExportButtonV2(app, element) {
  if (!isFoundryExportButtonEnabled()) return;
  if (!isActorSheetApp(app)) return;
  if (!element?.querySelector) return;

  const actor = getActorFromApp(app);
  if (!hasNetherscrollsTransferButtons(actor)) return;

  const header =
    element.querySelector("header.window-header") || element.querySelector(".window-header");
  if (!header) return;
  if (header.querySelector(".netherscrolls-export-button, .netherscrolls-import-button")) return;

  const exportButton = document.createElement("button");
  exportButton.type = "button";
  exportButton.classList.add("header-control", "netherscrolls-export-button");
  exportButton.title = "Foundry Export";
  exportButton.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><span>Foundry Export</span>';
  exportButton.addEventListener(
    "click",
    /** Handle the user event while handle inject foundry export button v2. */ () => {
      exportNetherscrollsSheetActor(actor).catch(
        /** Handle the operation failure while handle inject foundry export button v2. */ (err) => {
          console.error(`${MODULE_ID} | Foundry Export could not be completed.`, err);
        }
      );
    }
  );
  const importButton = document.createElement("button");
  importButton.type = "button";
  importButton.classList.add("header-control", "netherscrolls-import-button");
  importButton.title = "Foundry Import";
  importButton.innerHTML = '<i class="fas fa-cloud-download-alt"></i><span>Foundry Import</span>';
  importButton.addEventListener(
    "click",
    /** Handle the user event while handle inject foundry export button v2. */ () => {
      runNetherscrollsSheetTransfer(actor, importActorFromNetherscrolls).catch(
        /** Handle the operation failure while handle inject foundry export button v2. */ () => {}
      );
    }
  );

  const modeSlider = header.querySelector(".mode-slider");
  const title = header.querySelector(".window-title");
  if (modeSlider) {
    modeSlider.insertAdjacentElement("afterend", exportButton);
  } else if (title) {
    title.insertAdjacentElement("beforebegin", exportButton);
  } else {
    header.prepend(exportButton);
  }
  exportButton.insertAdjacentElement("afterend", importButton);
}

export {
  injectFoundryExportButtonV1,
  injectFoundryExportButtonV2,
  installNetherscrollsSpellbookSectionOrdering,
  rerenderActorSheets,
};
