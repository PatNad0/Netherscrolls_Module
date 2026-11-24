/**
 * Own the import/export window, guild step, and library form interactions.
 * Delegate requests and document changes so rendering remains separate from transfer mechanics.
 */
import {
  describeNetherscrollsGuildAccess,
  getNetherscrollsGuildAccess,
  getNetherscrollsLibraryImportDate,
  getNetherscrollsSelectedGuildId,
  isNetherscrollsGuildUsable,
  rememberNetherscrollsLibraryImportDate,
  resolveNetherscrollsGuild,
  setNetherscrollsSelectedGuild,
} from "../api/client.js";
import { getNetherscrollsImportSourceContext } from "../api/sources.js";
import {
  IMPORT_TYPES,
  MODULE_ID,
  NETHERSCROLLS_IMPORT_ENDPOINTS,
  NETHERSCROLLS_OPTIONAL_IMPORT_TYPES,
} from "../core/constants.js";
import { getNetherscrollsApiKey, isDebugEnabled } from "../core/settings.js";
import { toTrimmedStringOrNull } from "../core/utils.js";
import {
  buildNetherscrollsImportDestinationPlan,
  buildNetherscrollsImportRequests,
  formatNetherscrollsImportResult,
  formatNetherscrollsSourceImportResult,
  getNetherscrollsCompendiumReadiness,
  replaceNetherscrollsLibrary,
  sanitizeNetherscrollsImportRequest,
} from "../import/library.js";
import {
  activateNetherscrollsCharacterImportListeners,
  describeNetherscrollsCompendiumState,
  getNetherscrollsCharacterImportState,
  loadNetherscrollsCampaignsIntoForm,
  refreshNetherscrollsCharacterImportAvailability,
  setNetherscrollsCharacterImportMessage,
} from "./characters.js";

const NetherscrollsImportSettings = createNetherscrollsImportSettingsClass();

/** Create import settings class. */
function createNetherscrollsImportSettingsClass() {
  const applicationApi = globalThis.foundry?.applications?.api;
  const ApplicationV2 = applicationApi?.ApplicationV2;
  const HandlebarsApplicationMixin = applicationApi?.HandlebarsApplicationMixin;

  if (ApplicationV2 && HandlebarsApplicationMixin) {
    const HandlebarsApplication = HandlebarsApplicationMixin(ApplicationV2);

    return class NetherscrollsImportSettingsV2 extends HandlebarsApplication {
      static DEFAULT_OPTIONS = {
        id: "netherscrolls-import-settings",
        classes: ["netherscrolls-import-window"],
        window: {
          title: "Netherscrolls import / export",
          icon: "fa-solid fa-right-left",
        },
        position: {
          width: 680,
          height: "auto",
        },
      };

      static PARTS = {
        form: {
          template: `modules/${MODULE_ID}/templates/import-from-netherscroll.hbs`,
        },
      };

      /** Prepare context. */
      async _prepareContext(options) {
        const context = await super._prepareContext(options);
        return getNetherscrollsImportSettingsContext(context);
      }

      /** Handle render. */
      async _onRender(context, options) {
        await super._onRender(context, options);
        activateNetherscrollsImportSettingsListeners(
          this.element,
          handleNetherscrollsImportSettingsSubmitEvent
        );
      }
    };
  }

  if (ApplicationV2) {
    return class NetherscrollsImportSettingsV2 extends ApplicationV2 {
      static DEFAULT_OPTIONS = {
        id: "netherscrolls-import-settings",
        classes: ["netherscrolls-import-window"],
        window: {
          title: "Netherscrolls import / export",
          icon: "fa-solid fa-right-left",
        },
        position: {
          width: 680,
          height: "auto",
        },
      };

      /** Prepare context. */
      async _prepareContext(options) {
        const context = await super._prepareContext(options);
        return getNetherscrollsImportSettingsContext(context);
      }

      /** Render html. */
      async _renderHTML(context, _options) {
        const html = await renderTemplate(
          `modules/${MODULE_ID}/templates/import-from-netherscroll.hbs`,
          context
        );
        const template = document.createElement("template");
        template.innerHTML = String(html ?? "").trim();
        return template.content;
      }

      /** Replace html. */
      _replaceHTML(result, content, _options) {
        content.replaceChildren(result);
      }

      /** Handle render. */
      async _onRender(context, options) {
        await super._onRender(context, options);
        activateNetherscrollsImportSettingsListeners(
          this.element,
          handleNetherscrollsImportSettingsSubmitEvent
        );
      }
    };
  }

  const FormApplicationClass =
    globalThis.FormApplication ?? globalThis.foundry?.appv1?.api?.FormApplication;

  return class NetherscrollsImportSettingsV1 extends FormApplicationClass {
    /** Handle default options. */
    static get defaultOptions() {
      const options = {
        id: "netherscrolls-import-settings",
        title: "Netherscrolls import / export",
        template: `modules/${MODULE_ID}/templates/import-from-netherscroll.hbs`,
        classes: ["netherscrolls-import-window"],
        width: 680,
        height: "auto",
        submitOnChange: false,
        closeOnSubmit: false,
      };
      return foundry?.utils?.mergeObject
        ? foundry.utils.mergeObject(super.defaultOptions, options)
        : { ...(super.defaultOptions ?? {}), ...options };
    }

    /** Retrieve data. */
    async getData(options) {
      const context = (await super.getData(options)) ?? {};
      return getNetherscrollsImportSettingsContext(context);
    }

    /** Handle activate listeners. */
    activateListeners(html) {
      super.activateListeners(html);
      activateNetherscrollsImportSettingsListeners(html);
    }

    /** Update object. */
    async _updateObject(_event, formData) {
      await submitNetherscrollsImportSettings(formData);
    }
  };
}

/** Retrieve import settings context. */
async function getNetherscrollsImportSettingsContext(context = {}) {
  const apiKey = getNetherscrollsApiKey();
  const compendiumState = await getNetherscrollsCompendiumReadiness();

  return {
    ...context,
    hasApiKey: Boolean(apiKey),
    importTypes: IMPORT_TYPES,
    defaultSinceDate: getNetherscrollsDefaultSinceDate(),
    libraryStatus: describeNetherscrollsCompendiumState(compendiumState),
  };
}

// The "only what changed since" date: the guild's last library import, else today.
function getNetherscrollsDefaultSinceDate(guildId = getNetherscrollsSelectedGuildId()) {
  const last = getNetherscrollsLibraryImportDate(guildId);
  const date = last ? new Date(last) : new Date();
  return Number.isNaN(date.getTime())
    ? new Date().toISOString().slice(0, 10)
    : date.toISOString().slice(0, 10);
}

/** Bind one transfer window to its own form state and route actions to the corresponding workflow. */
function activateNetherscrollsImportSettingsListeners(html, submitHandler = null) {
  const root = html?.[0] ?? html;
  const form = root?.matches?.("form") ? root : root?.querySelector?.("form");
  const listenerRoot = form ?? root;
  if (!listenerRoot?.querySelector || listenerRoot.dataset?.netherscrollsTransferBound === "1")
    return;
  listenerRoot.dataset.netherscrollsTransferBound = "1";

  // Tabs.
  for (const tab of listenerRoot.querySelectorAll("[data-ns-tab]")) {
    tab.addEventListener(
      "click",
      /** Handle the user event while handle activate import settings listeners. */ () =>
        showNetherscrollsTransferTab(listenerRoot, tab.dataset.nsTab)
    );
  }

  // "Only what changed since" enables its date.
  const sinceCheckbox = listenerRoot.querySelector('[name="sinceEnabled"]');
  const sinceDate = listenerRoot.querySelector('[name="sinceDate"]');
  sinceCheckbox?.addEventListener(
    "change",
    /** Handle the user event while handle activate import settings listeners. */ () => {
      if (sinceDate) sinceDate.disabled = !sinceCheckbox.checked;
    }
  );

  // Sources summary ("all" or "2 selected").
  listenerRoot
    .querySelector(".ns-import-source-list")
    ?.addEventListener(
      "change",
      /** Handle the user event while handle activate import settings listeners. */ () =>
        updateNetherscrollsSourceSummary(listenerRoot)
    );

  listenerRoot.querySelector('[data-ns-action="retry"]')?.addEventListener(
    "click",
    /** Handle the user event while handle activate import settings listeners. */ () => {
      initializeNetherscrollsTransferWindow(listenerRoot, { force: true });
    }
  );
  listenerRoot.querySelector('[data-ns-action="change-guild"]')?.addEventListener(
    "click",
    /** Handle the user event while handle activate import settings listeners. */ async () => {
      try {
        const state = await resolveNetherscrollsGuild({ force: true, notify: false });
        renderNetherscrollsGuildStep(listenerRoot, state);
      } catch (err) {
        showNetherscrollsTransferStatus(
          listenerRoot,
          `Guilds unavailable: ${err?.message ?? err}`,
          { error: true, retry: true }
        );
      }
    }
  );

  activateNetherscrollsCharacterImportListeners(listenerRoot);
  initializeNetherscrollsTransferWindow(listenerRoot);

  if (!submitHandler || !form || form.dataset.netherscrollsImportSubmitBound === "1") {
    return;
  }

  form.dataset.netherscrollsImportSubmitBound = "1";
  form.addEventListener("submit", submitHandler);
}

/** Handle show transfer tab. */
function showNetherscrollsTransferTab(root, name) {
  for (const tab of root.querySelectorAll("[data-ns-tab]")) {
    const active = tab.dataset.nsTab === name;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  }
  for (const panel of root.querySelectorAll("[data-ns-panel]")) {
    panel.hidden = panel.dataset.nsPanel !== name;
  }
}

/** Handle show transfer status. */
function showNetherscrollsTransferStatus(
  root,
  message,
  { busy = false, error = false, retry = false } = {}
) {
  const status = root.querySelector("[data-ns-status]");
  if (!status) return;
  status.hidden = false;
  status.classList.toggle("is-error", Boolean(error));
  const icon = status.querySelector("[data-ns-status-icon]");
  if (icon) {
    icon.className = busy
      ? "fa-solid fa-circle-notch fa-spin"
      : error
        ? "fa-solid fa-triangle-exclamation"
        : "fa-solid fa-circle-info";
  }
  const text = status.querySelector("[data-ns-status-text]");
  if (text) text.textContent = message;
  const retryButton = status.querySelector('[data-ns-action="retry"]');
  if (retryButton) retryButton.hidden = !retry;
  root.querySelector("[data-ns-guild-step]")?.setAttribute("hidden", "");
  root.querySelector("[data-ns-workspace]")?.setAttribute("hidden", "");
}

// Step 0: key check and guild resolution. One guild (or a server without guilds)
// goes straight to the workspace; several guilds without a valid choice ask first.
async function initializeNetherscrollsTransferWindow(root, { force = false } = {}) {
  if (!getNetherscrollsApiKey()) {
    showNetherscrollsTransferStatus(
      root,
      "Add your Netherscrolls API key in Module Settings first."
    );
    return;
  }
  showNetherscrollsTransferStatus(root, "Connecting to Netherscrolls…", { busy: true });
  let state;
  try {
    state = await resolveNetherscrollsGuild({ force });
  } catch (err) {
    console.error(`${MODULE_ID} | Unable to load the Netherscrolls guilds.`, err);
    showNetherscrollsTransferStatus(root, `Netherscrolls is unavailable: ${err?.message ?? err}`, {
      error: true,
      retry: true,
    });
    return;
  }
  if (state.guildMode && !state.guilds.length) {
    showNetherscrollsTransferStatus(
      root,
      "This Netherscrolls account is not a member of any guild. Ask a guild admin to add you.",
      { error: true, retry: true }
    );
    return;
  }
  if (state.needsChoice) {
    renderNetherscrollsGuildStep(root, state);
    return;
  }
  showNetherscrollsWorkspace(root, state);
}

/** Render guild step. */
function renderNetherscrollsGuildStep(root, state) {
  const step = root.querySelector("[data-ns-guild-step]");
  const list = root.querySelector("[data-ns-guild-list]");
  if (!step || !list) return;
  root.querySelector("[data-ns-status]")?.setAttribute("hidden", "");
  root.querySelector("[data-ns-workspace]")?.setAttribute("hidden", "");
  step.hidden = false;
  list.replaceChildren();
  const current = getNetherscrollsSelectedGuildId();
  for (const guild of state.guilds) {
    const usable = isNetherscrollsGuildUsable(guild);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ns-guild-card";
    button.setAttribute("role", "listitem");
    button.disabled = !usable;
    button.classList.toggle("is-current", guild.id === current);
    const name = document.createElement("strong");
    name.textContent = guild.name;
    const access = document.createElement("span");
    access.className = "ns-guild-card-access";
    access.textContent = describeNetherscrollsGuildAccess(guild);
    button.append(name, access);
    if (guild.isDefault) {
      const badge = document.createElement("span");
      badge.className = "ns-guild-card-badge";
      badge.textContent = "Default";
      button.append(badge);
    }
    button.addEventListener(
      "click",
      /** Handle the user event while render guild step. */ async () => {
        button.disabled = true;
        const chosen = await setNetherscrollsSelectedGuild(guild);
        showNetherscrollsWorkspace(root, { ...state, guild: chosen, needsChoice: false });
      }
    );
    list.appendChild(button);
  }
}

// Step 1: the chosen guild's characters and library.
function showNetherscrollsWorkspace(root, state) {
  const workspace = root.querySelector("[data-ns-workspace]");
  if (!workspace) return;
  root.querySelector("[data-ns-status]")?.setAttribute("hidden", "");
  root.querySelector("[data-ns-guild-step]")?.setAttribute("hidden", "");
  workspace.hidden = false;

  const guild = state.guild ?? null;
  const guildId = guild?.id ?? "";
  const bar = root.querySelector("[data-ns-guild-bar]");
  if (bar) bar.hidden = !state.guildMode;
  const name = root.querySelector("[data-ns-guild-name]");
  if (name) name.textContent = guild?.name ?? "";
  const access = root.querySelector("[data-ns-guild-access]");
  if (access) access.textContent = describeNetherscrollsGuildAccess(guild);
  const changeGuild = root.querySelector('[data-ns-action="change-guild"]');
  if (changeGuild) changeGuild.hidden = !(state.guildMode && state.guilds.length > 1);

  // Grey out what this key cannot do in this guild, with the reason as a tooltip.
  const rights = getNetherscrollsGuildAccess(guild);
  const guildLabel = guild?.name ? ` in ${guild.name}` : "";
  const setAllowed = /** Update allowed. */ (selector, allowed, reason) => {
    const button = root.querySelector(selector);
    if (!button) return;
    button.disabled = !allowed;
    button.title = allowed ? "" : reason;
  };
  setAllowed(
    '[data-ns-character-action="import-selected"]',
    rights.importCharacters,
    guild && !guild.modules.campaigns
      ? `Campaigns are turned off${guildLabel}.`
      : `This key has no apikey.import${guildLabel}.`
  );
  setAllowed(
    '[data-ns-character-action="export-selected"]',
    rights.exportCharacters,
    guild && !guild.modules.campaigns
      ? `Campaigns are turned off${guildLabel}.`
      : `This key has no apikey.export${guildLabel}.`
  );
  setAllowed(
    '[data-ns-import-action="library"]',
    rights.importLibrary,
    guild && !guild.modules.library
      ? `The library is turned off${guildLabel}.`
      : `This key has no apikey.import${guildLabel}.`
  );

  const sinceDate = root.querySelector('[name="sinceDate"]');
  if (sinceDate) sinceDate.value = getNetherscrollsDefaultSinceDate(guildId);

  const characterState = getNetherscrollsCharacterImportState(root);
  const changed = characterState.guildId !== guildId || !characterState.initialized;
  characterState.guildId = guildId;
  characterState.initialized = true;
  characterState.access = rights;
  if (changed) {
    characterState.campaigns = [];
    characterState.charactersById.clear();
    characterState.sourcesToken = (characterState.sourcesToken ?? 0) + 1;
    root.querySelector("[data-ns-character-list]")?.replaceChildren();
  }

  if (!state.guildMode || guild?.modules?.campaigns !== false) {
    loadNetherscrollsCampaignsIntoForm(root, { force: changed });
  } else {
    setNetherscrollsCharacterImportMessage(root, `Campaigns are turned off${guildLabel}.`, {
      error: true,
    });
    const select = root.querySelector("[data-ns-campaign-select]");
    if (select) {
      select.replaceChildren(new Option("Campaigns are turned off", ""));
      select.disabled = true;
    }
  }
  if (rights.importLibrary) {
    loadNetherscrollsImportSourcesIntoForm(root, getNetherscrollsApiKey(), { guildId });
  } else {
    const message = root.querySelector(".ns-import-source-message");
    if (message)
      message.textContent =
        guild && !guild.modules.library
          ? `The library is turned off${guildLabel}.`
          : `This key cannot import${guildLabel}.`;
  }
}

/** Update source summary. */
function updateNetherscrollsSourceSummary(root) {
  const summary = root.querySelector("[data-ns-source-summary]");
  if (!summary) return;
  const selected = root.querySelectorAll(
    '.ns-import-source-list input[name="sources"]:checked'
  ).length;
  summary.textContent = selected ? `${selected} selected` : "all";
}

/** Load import sources into form. */
async function loadNetherscrollsImportSourcesIntoForm(root, apiKey, { guildId = undefined } = {}) {
  const sourceList = root?.querySelector?.(".ns-import-source-list");
  const message = root?.querySelector?.(".ns-import-source-message");
  if (!sourceList || !apiKey) return;

  // A guild switch while loading must not show the previous guild's sources.
  const state = getNetherscrollsCharacterImportState(root);
  const token = (state.sourcesToken = (state.sourcesToken ?? 0) + 1);
  sourceList.replaceChildren();
  updateNetherscrollsSourceSummary(root);
  if (message) {
    message.classList.remove("is-error");
    message.textContent = "Loading sources…";
  }

  const sourceContext = await getNetherscrollsImportSourceContext(apiKey, { guildId });
  if (token !== state.sourcesToken) return;

  if (sourceContext.sourceLoadError) {
    if (message) {
      message.classList.add("is-error");
      message.textContent = `Sources unavailable: ${sourceContext.sourceLoadError}`;
    }
    return;
  }

  for (const source of sourceContext.sources) {
    const label = document.createElement("label");
    label.classList.add("ns-import-source-option");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "sources";
    checkbox.value = source.value;

    const text = document.createElement("span");
    text.textContent = source.label;

    label.append(checkbox, text);
    sourceList.appendChild(label);
  }
  updateNetherscrollsSourceSummary(root);

  if (message) {
    message.classList.remove("is-error");
    message.textContent = sourceContext.sources.length
      ? `${sourceContext.sources.length} source${sourceContext.sources.length === 1 ? "" : "s"} available. Leave all unchecked to import everything.`
      : "This guild has no importable sources yet.";
  }
}

/** Handle import settings submit event. */
async function handleNetherscrollsImportSettingsSubmitEvent(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();

  const form = event?.currentTarget;
  const submitter = event?.submitter;
  const submitButton = submitter?.matches?.('button[type="submit"]')
    ? submitter
    : form?.querySelector?.('button[type="submit"]');

  const originalButtonHtml = submitButton?.innerHTML;
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Importing the library…`;
  }
  const libraryMessage = form?.querySelector?.("[data-ns-library-message]");
  try {
    const result = await submitNetherscrollsImportSettings(getNetherscrollsFormDataObject(form));
    if (result?.importedAny) {
      await refreshNetherscrollsCharacterImportAvailability(form);
    }
  } catch (err) {
    console.error(`${MODULE_ID} | Netherscrolls import form submit failed.`, err);
    ui?.notifications?.error?.(`Library import failed: ${err?.message ?? err}`);
    if (libraryMessage) {
      libraryMessage.textContent = `Library import failed: ${err?.message ?? err}`;
      libraryMessage.classList.add("is-error");
    }
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      if (originalButtonHtml != null) submitButton.innerHTML = originalButtonHtml;
    }
  }
}

/** Validate the selection and update UI progress around the complete library replacement workflow. */
async function submitNetherscrollsImportSettings(formData) {
  const apiKey = getNetherscrollsApiKey();
  if (!apiKey) {
    ui?.notifications?.warn?.("Netherscrolls API Key is missing. Set it in Module Settings.");
    return { importedAny: false };
  }
  // Library content comes from the world's guild.
  const guildState = await resolveNetherscrollsGuild({ notify: false });
  if (guildState.guildMode && !guildState.guild) {
    ui?.notifications?.warn?.("Choose your Netherscrolls guild first.");
    return { importedAny: false };
  }
  const guildId = guildState.guild?.id ?? "";
  if (!getNetherscrollsGuildAccess(guildState.guild).importLibrary) {
    ui?.notifications?.warn?.(
      `This key cannot import the library of ${guildState.guild?.name ?? "this guild"}.`
    );
    return { importedAny: false };
  }
  const startedAt = new Date().toISOString();

  const selectedTypes = IMPORT_TYPES.filter(
    /** Keep entries that satisfy the condition while handle submit import settings. */ (type) =>
      isImportTypeSelected(formData, type.key)
  );
  if (!selectedTypes.length) {
    ui?.notifications?.warn?.("Select at least one Foundry Import content type.");
    return { importedAny: false };
  }

  // Library imports rebuild the selected library, so a delta cannot be used.
  const selectedSources = getSelectedNetherscrollsSourceValues(formData);
  const requests = await buildNetherscrollsImportRequests({
    apiKey,
    selectedTypes,
    sinceDate: null,
    selectedSources,
    guildId,
  });
  const destinationPlan = buildNetherscrollsImportDestinationPlan(selectedTypes);
  if (isDebugEnabled()) {
    console.info(`${MODULE_ID} | Netherscrolls import requests prepared.`, {
      requests: requests.map(sanitizeNetherscrollsImportRequest),
      destinations: destinationPlan,
    });
  }

  const unsupportedTypes = selectedTypes.filter(
    /** Keep entries that satisfy the condition while handle submit import settings. */
    (type) => !NETHERSCROLLS_IMPORT_ENDPOINTS[type.key]
  );
  if (unsupportedTypes.length) {
    const labels = unsupportedTypes
      .map(
        /** Transform each entry while handle submit import settings. */ (type) =>
          type.label.toLowerCase()
      )
      .join(", ");
    ui?.notifications?.warn?.(`Foundry Import endpoint not configured for: ${labels}.`);
  }

  try {
    const imports = await replaceNetherscrollsLibrary(requests);
    for (const { request, result } of imports) {
      ui?.notifications?.info?.(
        request.sourceFiltered
          ? formatNetherscrollsSourceImportResult(result, request.typeKeys)
          : formatNetherscrollsImportResult(request.typeKey, result)
      );
    }
    // Remember a complete, unfiltered import as the next "only what changed since" date.
    const coreTypesSelected = IMPORT_TYPES.every(
      /** Check that every non-optional type was imported. */ (type) =>
        NETHERSCROLLS_OPTIONAL_IMPORT_TYPES.has(type.key) || selectedTypes.includes(type)
    );
    if (imports.length && !selectedSources.length && coreTypesSelected) {
      await rememberNetherscrollsLibraryImportDate(guildId, startedAt);
    }
    return { importedAny: imports.length > 0 };
  } catch (err) {
    console.error(`${MODULE_ID} | Netherscrolls library replacement failed.`, err);
    throw err;
  }
}

/** Retrieve form data object. */
function getNetherscrollsFormDataObject(form, formData) {
  if (formData?.object && typeof formData.object === "object") return formData.object;

  const source = formData instanceof FormData ? formData : new FormData(form);
  const data = Object.fromEntries(source.entries());
  for (const key of new Set(Array.from(source.keys()))) {
    const values = source.getAll(key);
    if (values.length > 1) data[key] = values;
  }
  return data;
}

/** Determine whether import type selected. */
function isImportTypeSelected(formData, key) {
  return Boolean(formData?.[`importTypes.${key}`] ?? formData?.importTypes?.[key]);
}

/** Normalize since date. */
function normalizeNetherscrollsSinceDate(value) {
  const raw = toTrimmedStringOrNull(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Retrieve selected source values. */
function getSelectedNetherscrollsSourceValues(formData) {
  const raw = formData?.sources ?? formData?.source;
  const values = Array.isArray(raw) ? raw : [raw];
  return Array.from(
    new Set(
      values
        .flatMap(
          /** Perform the callback while retrieve selected source values. */ (value) =>
            String(value ?? "").split(",")
        )
        .map(
          /** Transform each entry while retrieve selected source values. */ (value) =>
            toTrimmedStringOrNull(value)
        )
        .filter(Boolean)
    )
  );
}

export { NetherscrollsImportSettings };
