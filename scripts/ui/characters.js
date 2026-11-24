/**
 * Present campaign characters and their transfer progress in the import/export window.
 * Keep per-window state isolated so refreshing one form cannot overwrite another form's selection.
 */
import {
  getPersistedNetherscrollsImportQueueCampaignIds,
  rememberNetherscrollsImportQueueCampaignId,
} from "../api/campaign-selection.js";
import {
  fetchNetherscrollsCampaignCharacters,
  fetchNetherscrollsCampaigns,
} from "../api/campaigns.js";
import { formatNetherscrollsApiError, getNetherscrollsGuildName } from "../api/client.js";
import { MODULE_ID } from "../core/constants.js";
import { debugNetherscrollsCharacterImport, getNetherscrollsApiKey } from "../core/settings.js";
import { toNumber, toNumberOrNull } from "../core/utils.js";
import { normalizeNetherscrollsReferenceValue } from "../data/references.js";
import { exportNetherscrollsCampaignActors } from "../export/transfer.js";
import { findNetherscrollsActorByCharacterId } from "../foundry/actors.js";
import {
  findOrCreateNetherscrollsCharacterFolder,
  hydrateNetherscrollsImportedCharacter,
  importNetherscrollsCampaignCharacter,
} from "../import/character.js";
import { formatNetherscrollsCompanionImportResult } from "../import/companions.js";
import { getNetherscrollsCompendiumReadiness } from "../import/library.js";
import { openNetherscrollsCharacterImportProgress } from "./import-progress.js";

const netherscrollsCharacterImportState = new WeakMap();

/** Describe compendium state. */
function describeNetherscrollsCompendiumState(state) {
  return state?.ready
    ? `${state.documentCount} Netherscrolls documents are in this world's compendiums. Character imports fetch anything missing on their own.`
    : "The world has no Netherscrolls compendium content yet. Character imports fetch what they need on their own; import the library to browse it.";
}

/** Handle activate character import listeners. */
function activateNetherscrollsCharacterImportListeners(root) {
  const panel = root?.querySelector?.("[data-ns-character-import-panel]");
  if (!panel || panel.dataset.netherscrollsCharacterImportBound === "1") return;
  panel.dataset.netherscrollsCharacterImportBound = "1";

  const state = getNetherscrollsCharacterImportState(root);
  const campaignSelect = panel.querySelector("[data-ns-campaign-select]");
  panel.querySelector('[data-ns-character-action="refresh-campaigns"]')?.addEventListener(
    "click",
    /** Handle the user event while handle activate character import listeners. */ () => {
      loadNetherscrollsCampaignsIntoForm(root, { force: true });
    }
  );
  campaignSelect?.addEventListener(
    "change",
    /** Handle the user event while handle activate character import listeners. */ () => {
      rememberNetherscrollsImportQueueCampaignId(campaignSelect.value);
      loadNetherscrollsCampaignCharactersIntoForm(root, campaignSelect.value);
    }
  );
  // Select-all lives in the rendered table header.
  panel.addEventListener(
    "change",
    /** Handle the user event while handle activate character import listeners. */ (event) => {
      if (event.target?.matches?.("[data-ns-select-all]")) {
        panel.querySelectorAll('[name="characterIds"]:not(:disabled)').forEach(
          /** Process each entry while handle activate character import listeners. */ (input) => {
            input.checked = event.target.checked;
          }
        );
      }
    }
  );
  root?.querySelector?.('[data-ns-character-action="import-selected"]')?.addEventListener(
    "click",
    /** Handle the user event while handle activate character import listeners. */ async (
      event
    ) => {
      const selectedIds = Array.from(panel.querySelectorAll('[name="characterIds"]:checked')).map(
        /** Transform each entry while handle activate character import listeners. */
        (input) => input.value
      );
      const selected = selectedIds
        .map(
          /** Transform each entry while handle activate character import listeners. */ (id) =>
            state.charactersById.get(id)
        )
        .filter(Boolean);
      if (!selected.length) {
        ui?.notifications?.warn?.("Select at least one character to import.");
        return;
      }

      const button = event.currentTarget;
      const originalHtml = button.innerHTML;
      button.disabled = true;
      button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Importing…';
      const progress = openNetherscrollsCharacterImportProgress(selected);
      try {
        await importNetherscrollsSelectedCampaignCharacters(root, selected, { progress });
      } catch (err) {
        console.error(`${MODULE_ID} | Character import failed.`, err);
        progress.fail(err);
        ui?.notifications?.error?.(`Foundry Import failed: ${err?.message ?? err}`);
        setNetherscrollsCharacterImportMessage(root, `Import failed: ${err?.message ?? err}`, {
          error: true,
        });
      } finally {
        button.disabled = state.access?.importCharacters === false;
        button.innerHTML = originalHtml;
      }
    }
  );
  root?.querySelector?.('[data-ns-character-action="export-selected"]')?.addEventListener(
    "click",
    /** Handle the user event while handle activate character import listeners. */ async (
      event
    ) => {
      const campaignId = normalizeNetherscrollsReferenceValue(campaignSelect?.value);
      const selectedIds = Array.from(panel.querySelectorAll('[name="characterIds"]:checked')).map(
        /** Transform each entry while handle activate character import listeners. */
        (input) => input.value
      );
      if (!campaignId) {
        ui?.notifications?.warn?.("Choose a campaign first.");
        return;
      }
      if (!selectedIds.length) {
        ui?.notifications?.warn?.("Select at least one character to send.");
        return;
      }
      const actors = selectedIds
        .map(
          /** Transform each entry while handle activate character import listeners. */ (
            characterId
          ) => ({
            actor: findNetherscrollsActorByCharacterId(
              characterId,
              state.charactersById.get(characterId)?.name,
              { guildId: state.guildId }
            ),
            characterId,
          })
        )
        .filter(
          /** Keep entries that satisfy the condition while handle activate character import listeners. */ (
            entry
          ) => entry.actor
        );
      if (!actors.length) {
        ui?.notifications?.warn?.(
          "None of the selected characters are in Foundry yet. Import them first."
        );
        return;
      }

      const button = event.currentTarget;
      const originalHtml = button.innerHTML;
      button.disabled = true;
      button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending…';
      try {
        const result = await exportNetherscrollsCampaignActors(campaignId, actors, {
          guildId: state.guildId,
        });
        const list = root.querySelector("[data-ns-character-list]");
        if (list)
          renderNetherscrollsCampaignCharacterList(
            list,
            Array.from(state.charactersById.values()),
            { guildId: state.guildId }
          );
        const skipped = selectedIds.length - actors.length;
        const summary = [
          `Sent to Netherscrolls: ${result.succeeded.length}`,
          result.failed.length ? `failed: ${result.failed.length}` : null,
          skipped ? `not in Foundry: ${skipped}` : null,
        ]
          .filter(Boolean)
          .join(" · ");
        const failureMessages = result.failed.map(
          /** Transform each entry while handle activate character import listeners. */
          (entry) =>
            `${entry.actor?.name ?? "Character"}: ${formatNetherscrollsApiError(entry.error)}`
        );
        const message = [summary, ...failureMessages].join("\n");
        setNetherscrollsCharacterImportMessage(root, message, {
          error: Boolean(result.failed.length),
        });
        if (result.failed.length) ui?.notifications?.warn?.(message);
        else ui?.notifications?.info?.(message);
      } catch (err) {
        console.error(`${MODULE_ID} | Campaign Foundry Export failed.`, err);
        ui?.notifications?.error?.(`Campaign Foundry Export failed: ${err?.message ?? err}`);
        setNetherscrollsCharacterImportMessage(root, `Sending failed: ${err?.message ?? err}`, {
          error: true,
        });
      } finally {
        button.disabled = state.access?.exportCharacters === false;
        button.innerHTML = originalHtml;
      }
    }
  );

  // Campaigns load once the guild is known (initializeNetherscrollsTransferWindow).
}

/** Retrieve character import state. */
function getNetherscrollsCharacterImportState(root) {
  let state = netherscrollsCharacterImportState.get(root);
  if (state) return state;
  state = {
    campaigns: [],
    charactersById: new Map(),
    guildId: "",
    initialized: false,
    campaignToken: 0,
    charactersToken: 0,
    sourcesToken: 0,
  };
  netherscrollsCharacterImportState.set(root, state);
  return state;
}

/** Handle refresh character import availability. */
async function refreshNetherscrollsCharacterImportAvailability(root) {
  const message = root?.querySelector?.("[data-ns-library-message]");
  if (!message) return;
  message.classList.remove("is-error");
  message.textContent = describeNetherscrollsCompendiumState(
    await getNetherscrollsCompendiumReadiness()
  );
}

/** Load campaigns into form. */
async function loadNetherscrollsCampaignsIntoForm(root, { force = false } = {}) {
  const panel = root?.querySelector?.("[data-ns-character-import-panel]");
  const select = panel?.querySelector?.("[data-ns-campaign-select]");
  if (!panel || !select) return;
  const state = getNetherscrollsCharacterImportState(root);
  if (!force && state.campaigns.length) return;

  // A guild switch while loading must not show the previous guild's campaigns.
  const token = ++state.campaignToken;
  const guildId = state.guildId;
  setNetherscrollsCharacterImportMessage(root, "Loading your campaigns…");
  select.disabled = true;
  try {
    const campaigns = await fetchNetherscrollsCampaigns({ force, guildId });
    if (token !== state.campaignToken) return;
    state.campaigns = campaigns;
    const persisted = getPersistedNetherscrollsImportQueueCampaignIds(
      getNetherscrollsApiKey(),
      guildId
    );
    const previousValue = select.value || (persisted.length === 1 ? persisted[0] : "");
    select.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = campaigns.length ? "Choose a campaign" : "No campaigns";
    select.appendChild(placeholder);
    for (const campaign of campaigns) {
      const option = document.createElement("option");
      option.value = campaign.id;
      option.textContent = campaign.label;
      select.appendChild(option);
    }
    // One campaign, or the remembered one, opens directly.
    const initial =
      campaigns.length === 1
        ? campaigns[0].id
        : campaigns.some(
              /** Check whether any entry matches while load campaigns into form. */ (campaign) =>
                campaign.id === previousValue
            )
          ? previousValue
          : "";
    select.value = initial;
    if (initial) {
      loadNetherscrollsCampaignCharactersIntoForm(root, initial);
    } else {
      const guildName = getNetherscrollsGuildName(guildId);
      setNetherscrollsCharacterImportMessage(
        root,
        campaigns.length
          ? "Choose a campaign to see its characters."
          : `You are not a DM of any active campaign${guildName ? ` in ${guildName}` : ""}.`
      );
    }
  } catch (err) {
    if (token !== state.campaignToken) return;
    console.error(`${MODULE_ID} | Unable to load Netherscrolls campaigns.`, err);
    select.replaceChildren();
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Campaigns unavailable";
    select.appendChild(option);
    setNetherscrollsCharacterImportMessage(root, `Campaigns unavailable: ${err?.message ?? err}`, {
      error: true,
    });
  } finally {
    if (token === state.campaignToken) select.disabled = false;
  }
}

/** Load campaign characters into form. */
async function loadNetherscrollsCampaignCharactersIntoForm(root, campaignId) {
  const panel = root?.querySelector?.("[data-ns-character-import-panel]");
  const list = panel?.querySelector?.("[data-ns-character-list]");
  if (!panel || !list) return;
  const id = normalizeNetherscrollsReferenceValue(campaignId);
  const state = getNetherscrollsCharacterImportState(root);
  const token = ++state.charactersToken;
  state.charactersById.clear();
  list.replaceChildren();
  if (!id) {
    setNetherscrollsCharacterImportMessage(root, "Choose a campaign to see its characters.");
    return;
  }

  setNetherscrollsCharacterImportMessage(root, "Loading characters…");
  try {
    const characters = await fetchNetherscrollsCampaignCharacters(id, { guildId: state.guildId });
    if (token !== state.charactersToken) return;
    for (const character of characters) state.charactersById.set(character.id, character);
    renderNetherscrollsCampaignCharacterList(list, characters, { guildId: state.guildId });
    setNetherscrollsCharacterImportMessage(
      root,
      characters.length
        ? "Tick characters, then import them into Foundry or send their Foundry sheets back to Netherscrolls."
        : "This campaign has no characters yet."
    );
  } catch (err) {
    if (token !== state.charactersToken) return;
    console.error(`${MODULE_ID} | Unable to load Netherscrolls campaign characters.`, err);
    setNetherscrollsCharacterImportMessage(root, `Characters unavailable: ${err?.message ?? err}`, {
      error: true,
    });
  }
}

/** Render campaign character list. */
function renderNetherscrollsCampaignCharacterList(root, characters, { guildId = undefined } = {}) {
  root.replaceChildren();
  if (!characters.length) return;
  const table = document.createElement("table");
  table.className = "ns-character-table";
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const selectAllCell = document.createElement("th");
  const selectAll = document.createElement("input");
  selectAll.type = "checkbox";
  selectAll.dataset.nsSelectAll = "true";
  selectAll.setAttribute("aria-label", "Select every character");
  selectAll.title = "Select every character";
  selectAllCell.appendChild(selectAll);
  headerRow.appendChild(selectAllCell);
  for (const label of ["Character", "In Foundry"]) {
    const cell = document.createElement("th");
    cell.textContent = label;
    headerRow.appendChild(cell);
  }
  thead.appendChild(headerRow);
  const tbody = document.createElement("tbody");
  for (const importedCharacter of characters) {
    const row = document.createElement("tr");
    const selectCell = document.createElement("td");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "characterIds";
    checkbox.value = importedCharacter.id;
    checkbox.id = `ns-character-${importedCharacter.id}`;
    selectCell.appendChild(checkbox);

    const nameCell = document.createElement("td");
    const name = document.createElement("label");
    name.htmlFor = checkbox.id;
    name.textContent = importedCharacter.name;
    nameCell.appendChild(name);
    const detail = getNetherscrollsCharacterImportDetail(importedCharacter);
    if (detail) {
      const small = document.createElement("small");
      small.textContent = detail;
      nameCell.appendChild(small);
    }
    const statusCell = document.createElement("td");
    const existing = findNetherscrollsActorByCharacterId(
      importedCharacter.id,
      importedCharacter.name,
      { guildId }
    );
    statusCell.className = `ns-character-status ${existing ? "is-existing" : "is-new"}`;
    statusCell.textContent = existing ? "Yes" : "Not yet";
    statusCell.title = existing
      ? `Importing updates the Foundry actor "${existing.name}". Sending writes it back to Netherscrolls.`
      : "Importing creates a new Foundry actor.";
    row.append(selectCell, nameCell, statusCell);
    tbody.appendChild(row);
  }
  table.append(thead, tbody);
  root.appendChild(table);
}

/** Retrieve character import detail. */
function getNetherscrollsCharacterImportDetail(importedCharacter) {
  const source = importedCharacter?.character ?? {};
  // Character envelopes carry class references without names; the total level and
  // class count are what can be shown without extra requests.
  const classes = Array.isArray(source?.classes) ? source.classes : [];
  const level = classes.length
    ? classes.reduce(
        /** Combine entries into a result while retrieve character import detail. */
        (total, entry) => total + Math.max(0, Math.trunc(toNumber(entry?.level, 0))),
        0
      )
    : toNumberOrNull(source?.level ?? source?.characterLevel);
  const parts = [];
  if (level) parts.push(`Level ${level}`);
  if (classes.length > 1) parts.push(`${classes.length} classes`);
  return parts.join(" · ");
}

/** Update character import message. */
function setNetherscrollsCharacterImportMessage(root, message, { error = false } = {}) {
  const element = root?.querySelector?.("[data-ns-character-message]");
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("is-error", Boolean(error));
}

/** Keep character progress and recoverable failures visible while processing the selected rows. */
async function importNetherscrollsSelectedCampaignCharacters(
  root,
  selected,
  { progress = null } = {}
) {
  setNetherscrollsCharacterImportMessage(root, "Preparing character import...");
  debugNetherscrollsCharacterImport("Starting selected-character import.", {
    selectedCount: selected.length,
  });

  const campaignId = normalizeNetherscrollsReferenceValue(
    root?.querySelector?.("[data-ns-campaign-select]")?.value
  );
  if (!campaignId) throw new Error("Select a campaign before importing characters.");

  const folder = await findOrCreateNetherscrollsCharacterFolder();
  if (!folder?.id) throw new Error("Foundry could not create the NS-Character Actor folder.");
  debugNetherscrollsCharacterImport("Resolved character destination folder.", {
    campaignId,
    folderId: folder.id,
    folderName: folder.name,
  });

  const results = [];
  for (const [index, selectedCharacter] of selected.entries()) {
    const progressLabel = `Character ${index + 1} of ${selected.length}: ${selectedCharacter?.name ?? "Unnamed Character"}`;
    progress?.start(index);
    try {
      setNetherscrollsCharacterImportMessage(
        root,
        `${progressLabel} — loading Foundry Import payload...`
      );
      debugNetherscrollsCharacterImport("Hydrating selected Foundry Import character.", {
        campaignId,
        characterId: selectedCharacter?.id,
        name: selectedCharacter?.name,
        hasCharacterPayload: Boolean(selectedCharacter?.character),
      });
      const importedCharacter = await hydrateNetherscrollsImportedCharacter(
        selectedCharacter,
        campaignId
      );
      debugNetherscrollsCharacterImport("Foundry Import character hydrated.", {
        characterId: importedCharacter.id,
        name: importedCharacter.name,
        characterPayloadKeys: Object.keys(importedCharacter.character ?? {}),
      });
      const result = await importNetherscrollsCampaignCharacter(importedCharacter, folder, {
        onProgress: /** Handle progress. */ (stage) => {
          setNetherscrollsCharacterImportMessage(root, `${progressLabel} — ${stage}`);
          progress?.stage(index, stage);
          console.info(`${MODULE_ID} | Foundry Import | ${progressLabel} — ${stage}`);
        },
      });
      debugNetherscrollsCharacterImport("Character import completed.", {
        characterId: importedCharacter.id,
        name: importedCharacter.name,
        created: result.created,
        fetched: result.fetched,
        itemResult: result.items,
        effectResult: result.effects,
        repairedFeatures: result.repairedFeatures,
      });
      results.push({
        ...result,
        characterId: importedCharacter.id,
        name: importedCharacter.name,
        ok: true,
      });
      progress?.done(index, result);
    } catch (err) {
      setNetherscrollsCharacterImportMessage(
        root,
        `${progressLabel} — failed: ${err?.message ?? String(err)}`,
        { error: true }
      );
      debugNetherscrollsCharacterImport("Character import failed.", {
        campaignId,
        characterId: selectedCharacter?.id,
        name: selectedCharacter?.name,
        error: err?.message ?? String(err),
        stack: err?.stack,
      });
      console.error(
        `${MODULE_ID} | Unable to import character ${selectedCharacter?.name ?? ""}.`,
        err
      );
      results.push({
        characterId: selectedCharacter?.id,
        name: selectedCharacter?.name ?? "Unnamed Character",
        ok: false,
        error: err?.message ?? String(err),
      });
      progress?.failed(index, err);
    }
  }

  const created = results.filter(
    /** Keep entries that satisfy the condition while import selected campaign characters. */ (
      result
    ) => result.ok && result.created
  ).length;
  const updated = results.filter(
    /** Keep entries that satisfy the condition while import selected campaign characters. */ (
      result
    ) => result.ok && !result.created
  ).length;
  const failed = results.filter(
    /** Keep entries that satisfy the condition while import selected campaign characters. */ (
      result
    ) => !result.ok
  );
  const fetched = results.reduce(
    /** Combine entries into a result while import selected campaign characters. */ (
      total,
      result
    ) => total + (result.fetched ?? 0),
    0
  );
  const companions = formatNetherscrollsCompanionImportResult(
    results.reduce(
      /** Add up the companions of every imported character. */ (total, result) => {
        if (!result.companions) return total;
        const sum = total ?? { created: 0, updated: 0, failed: [], missing: [], review: [] };
        sum.created += result.companions.created;
        sum.updated += result.companions.updated;
        for (const key of ["failed", "missing", "review"]) sum[key].push(...result.companions[key]);
        return sum;
      },
      null
    )
  );
  const message = [
    `Netherscrolls characters: ${created} created, ${updated} updated`,
    companions,
    fetched ? `${fetched} linked content record${fetched === 1 ? "" : "s"} refreshed` : null,
    failed.length ? `${failed.length} failed` : null,
  ]
    .filter(Boolean)
    .join("; ");
  setNetherscrollsCharacterImportMessage(root, message, { error: Boolean(failed.length) });
  progress?.finish({ failed: failed.length });
  if (failed.length) {
    ui?.notifications?.warn?.(`${message}. See the console for individual failures.`);
  } else {
    ui?.notifications?.info?.(message);
  }
  debugNetherscrollsCharacterImport("Selected-character import finished.", { results, message });

  const list = root?.querySelector?.("[data-ns-character-list]");
  const state = getNetherscrollsCharacterImportState(root);
  if (list) {
    renderNetherscrollsCampaignCharacterList(list, Array.from(state.charactersById.values()), {
      guildId: state.guildId,
    });
    const failedIds = new Set(
      failed.map(
        /** Transform each entry while import selected campaign characters. */ (result) =>
          String(result.characterId ?? "")
      )
    );
    list.querySelectorAll?.('[name="characterIds"]').forEach(
      /** Process each entry while import selected campaign characters. */ (input) => {
        input.checked = failedIds.has(String(input.value));
      }
    );
  }
}

export {
  activateNetherscrollsCharacterImportListeners,
  describeNetherscrollsCompendiumState,
  getNetherscrollsCharacterImportState,
  loadNetherscrollsCampaignsIntoForm,
  refreshNetherscrollsCharacterImportAvailability,
  setNetherscrollsCharacterImportMessage,
};
