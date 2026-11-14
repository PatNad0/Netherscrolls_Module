/**
 * Coordinate periodic campaign imports, acknowledgements, and exports.
 * One active GM polls; generation checks prevent stopped or superseded timers from restarting.
 */
import {
  getPersistedNetherscrollsImportQueueCampaignIds,
  persistNetherscrollsImportQueueCampaignIds,
} from "../api/campaign-selection.js";
import {
  acknowledgeNetherscrollsCampaignImport,
  fetchNetherscrollsCampaignExports,
  fetchNetherscrollsCampaignImports,
  fetchNetherscrollsCampaigns,
} from "../api/campaigns.js";
import {
  getActorNetherscrollsGuildId,
  getNetherscrollsGuildAccess,
  getNetherscrollsRequestGuildId,
  getNetherscrollsSelectedGuildId,
  getNetherscrollsSelectedGuildName,
  resolveNetherscrollsGuild,
} from "../api/client.js";
import {
  MODULE_ID,
  NETHERSCROLLS_IMPORT_QUEUE_IDLE_POLL_INTERVAL_MS,
  NETHERSCROLLS_IMPORT_QUEUE_POLL_INTERVAL_MS,
  SETTINGS,
} from "../core/constants.js";
import { getNetherscrollsApiKey } from "../core/settings.js";
import { getActorCharacterId, normalizeNetherscrollsReferenceValue } from "../data/references.js";
import { exportNetherscrollsCampaignActors } from "../export/transfer.js";
import { findNetherscrollsActorByCharacterId } from "../foundry/actors.js";
import { getWorldActors } from "../foundry/collections.js";
import {
  findOrCreateNetherscrollsCharacterFolder,
  importNetherscrollsCampaignCharacter,
} from "./character.js";
import {
  netherscrollsLibraryReplacementState,
  netherscrollsQueuePollState,
} from "./transfer-state.js";

const netherscrollsPendingImportAcknowledgements = new Set();

// Campaigns of the world's Netherscrolls actors that belong to this guild.
function getNetherscrollsActorCampaignIds(guildId = undefined) {
  const guild = getNetherscrollsRequestGuildId(guildId);
  const ids = [];
  for (const actor of getWorldActors()) {
    const actorGuild = getActorNetherscrollsGuildId(actor);
    if (guild && actorGuild && actorGuild !== guild) continue;
    const nativeCharacter =
      actor?.getFlag?.(MODULE_ID, "nativeCharacter") ?? actor?.flags?.[MODULE_ID]?.nativeCharacter;
    const id = normalizeNetherscrollsReferenceValue(nativeCharacter?.campaignId);
    if (id) ids.push(id);
  }
  return Array.from(new Set(ids));
}

/** Choose an unambiguous saved or actor-linked campaign instead of polling every accessible campaign. */
async function getNetherscrollsImportQueueCampaignIds(
  apiKey = getNetherscrollsApiKey(),
  guildId = undefined
) {
  const persisted = getPersistedNetherscrollsImportQueueCampaignIds(apiKey, guildId);
  if (persisted.length === 1) return persisted;

  const actorCampaignIds = getNetherscrollsActorCampaignIds(guildId);
  if (actorCampaignIds.length === 1) {
    await persistNetherscrollsImportQueueCampaignIds(actorCampaignIds, apiKey, guildId);
    return actorCampaignIds;
  }
  if (persisted.length > 1 && actorCampaignIds.length) {
    const matchingActorCampaignIds = actorCampaignIds.filter(
      /** Keep entries that satisfy the condition while retrieve import queue campaign ids. */ (
        id
      ) => persisted.includes(id)
    );
    if (matchingActorCampaignIds.length === 1) {
      await persistNetherscrollsImportQueueCampaignIds(matchingActorCampaignIds, apiKey, guildId);
      return matchingActorCampaignIds;
    }
  }

  const campaigns = await fetchNetherscrollsCampaigns({ guildId });
  if (campaigns.length === 1) {
    await persistNetherscrollsImportQueueCampaignIds([campaigns[0].id], apiKey, guildId);
    return [campaigns[0].id];
  }
  if (campaigns.length > 1) {
    console.warn(
      `${MODULE_ID} | Foundry sync queue polling needs one campaign. ` +
        "Select the campaign once in Netherscrolls import / export; it will then be remembered."
    );
  }
  return [];
}

/** Handle disable legacy import queue polling. */
async function disableLegacyNetherscrollsImportQueuePolling() {
  if (game?.settings?.get(MODULE_ID, SETTINGS.importQueuePollingSafetyReset) === true) return;
  try {
    await game.settings.set(MODULE_ID, SETTINGS.importQueuePolling, false);
    await game.settings.set(MODULE_ID, SETTINGS.importQueuePollingSafetyReset, true);
  } catch (err) {
    console.error(`${MODULE_ID} | Unable to disable legacy Foundry Import queue polling.`, err);
  }
}

/** Invalidate the previous timer generation when polling stops so an in-flight request cannot revive it. */
function toggleNetherscrollsImportQueuePolling(enabled) {
  const generation = ++netherscrollsImportQueuePollGeneration;
  if (netherscrollsImportQueuePollTimer) {
    clearTimeout(netherscrollsImportQueuePollTimer);
    netherscrollsImportQueuePollTimer = null;
  }
  if (!enabled || !game?.ready || !isPrimaryNetherscrollsQueuePoller()) return;

  const run = /** Run. */ async () => {
    if (generation !== netherscrollsImportQueuePollGeneration) return;
    let nextPollDelay = NETHERSCROLLS_IMPORT_QUEUE_IDLE_POLL_INTERVAL_MS;
    try {
      const result = await pollNetherscrollsImportQueues();
      if ((result?.imported ?? 0) > 0 || (result?.exported ?? 0) > 0) {
        nextPollDelay = NETHERSCROLLS_IMPORT_QUEUE_POLL_INTERVAL_MS;
      }
    } catch (err) {
      console.error(`${MODULE_ID} | Foundry sync queue poll failed.`, err);
    } finally {
      if (
        generation === netherscrollsImportQueuePollGeneration &&
        game?.settings?.get(MODULE_ID, SETTINGS.importQueuePolling) === true &&
        isPrimaryNetherscrollsQueuePoller()
      ) {
        netherscrollsImportQueuePollTimer = setTimeout(run, nextPollDelay);
      }
    }
  };
  run();
}

/** Run imports and exports under one poll guard; remember applied imports until their acknowledgements succeed. */
async function pollNetherscrollsImportQueues() {
  if (
    netherscrollsLibraryReplacementState.active ||
    netherscrollsQueuePollState.running ||
    !isPrimaryNetherscrollsQueuePoller()
  )
    return {
      imported: 0,
      exported: 0,
      failed: 0,
    };
  const apiKey = getNetherscrollsApiKey();
  if (!apiKey) return { imported: 0, exported: 0, failed: 0 };

  netherscrollsQueuePollState.running = true;
  let imported = 0;
  let exported = 0;
  let failed = 0;
  try {
    // Queues live in one guild's database: poll the world's guild only. If the guild
    // list cannot be read, keep polling the saved guild; queue errors still surface.
    let guildState;
    try {
      guildState = await resolveNetherscrollsGuild({ notify: false });
    } catch (err) {
      console.warn(
        `${MODULE_ID} | Foundry sync queue polling could not refresh the Netherscrolls guilds; using the saved guild.`,
        err
      );
      const savedGuildId = getNetherscrollsSelectedGuildId();
      guildState = {
        guildMode: Boolean(savedGuildId),
        guilds: [],
        guild: savedGuildId
          ? {
              id: savedGuildId,
              name: getNetherscrollsSelectedGuildName(),
              modules: { library: true, campaigns: true },
              apikey: { import: true, export: true },
            }
          : null,
      };
    }
    if (guildState.guildMode && !guildState.guild) {
      console.warn(
        `${MODULE_ID} | Foundry sync queue polling waits until a guild is chosen in Netherscrolls import / export.`
      );
      return { imported, exported, failed };
    }
    const guildId = guildState.guild?.id ?? "";
    const access = getNetherscrollsGuildAccess(guildState.guild);
    if (!access.importCharacters && !access.exportCharacters) return { imported, exported, failed };

    const campaignIds = await getNetherscrollsImportQueueCampaignIds(apiKey, guildId);
    if (!campaignIds.length) return { imported, exported, failed };
    const validCampaignIds = new Set(campaignIds);
    let folder = null;

    for (const campaignId of campaignIds) {
      let queuedImports = [];
      let importCampaignAccessRejected = !access.importCharacters;
      if (access.importCharacters) {
        try {
          queuedImports = await fetchNetherscrollsCampaignImports(campaignId, { guildId });
        } catch (err) {
          if (err?.status === 403 || err?.status === 404) {
            importCampaignAccessRejected = true;
          }
          console.warn(`${MODULE_ID} | Unable to read a Foundry Import campaign queue.`, {
            campaignId,
            error: err,
          });
        }
      }

      let queuedExports = [];
      let exportCampaignAccessRejected = !access.exportCharacters;
      if (access.exportCharacters) {
        try {
          queuedExports = await fetchNetherscrollsCampaignExports(campaignId, { guildId });
        } catch (err) {
          if (err?.status === 403 || err?.status === 404) {
            exportCampaignAccessRejected = true;
          }
          console.warn(`${MODULE_ID} | Unable to read a Foundry Export campaign queue.`, {
            campaignId,
            error: err,
          });
        }
      }
      if (importCampaignAccessRejected && exportCampaignAccessRejected) {
        validCampaignIds.delete(campaignId);
        await persistNetherscrollsImportQueueCampaignIds(
          Array.from(validCampaignIds),
          apiKey,
          guildId
        );
        continue;
      }
      if (queuedImports.length && queuedExports.length) {
        const exportCharacterIds = new Set(
          queuedExports
            .map(/** Transform each entry while poll import queues. */ (entry) => entry.id)
            .filter(Boolean)
        );
        queuedImports = queuedImports.filter(
          /** Keep entries that satisfy the condition while poll import queues. */ (entry) =>
            !exportCharacterIds.has(entry.id)
        );
      }

      if (queuedImports.length && !folder) {
        folder = await findOrCreateNetherscrollsCharacterFolder();
        if (!folder?.id) throw new Error("Foundry could not create the NS-Character Actor folder.");
      }
      for (const importedCharacter of queuedImports) {
        const acknowledgementKey = getNetherscrollsImportAcknowledgementKey(
          campaignId,
          importedCharacter
        );
        if (netherscrollsPendingImportAcknowledgements.has(acknowledgementKey)) {
          try {
            await acknowledgeNetherscrollsCampaignImport(campaignId, importedCharacter.id, {
              guildId,
            });
            netherscrollsPendingImportAcknowledgements.delete(acknowledgementKey);
          } catch (err) {
            failed += 1;
            console.error(
              `${MODULE_ID} | Foundry Import was applied, but queue acknowledgement still failed.`,
              {
                campaignId,
                characterId: importedCharacter.id,
                error: err,
              }
            );
          }
          continue;
        }

        try {
          await importNetherscrollsCampaignCharacter(importedCharacter, folder);
        } catch (err) {
          failed += 1;
          console.error(
            `${MODULE_ID} | Foundry Import queue entry remains queued after a failed apply.`,
            {
              campaignId,
              characterId: importedCharacter.id,
              error: err,
            }
          );
          continue;
        }

        netherscrollsPendingImportAcknowledgements.add(acknowledgementKey);
        try {
          await acknowledgeNetherscrollsCampaignImport(campaignId, importedCharacter.id, {
            guildId,
          });
          netherscrollsPendingImportAcknowledgements.delete(acknowledgementKey);
          imported += 1;
        } catch (err) {
          failed += 1;
          console.error(
            `${MODULE_ID} | Foundry Import completed, but its queue acknowledgement failed.`,
            {
              campaignId,
              characterId: importedCharacter.id,
              error: err,
            }
          );
        }
      }

      const exportEntries = [];
      for (const queuedExport of queuedExports) {
        const syncToken = normalizeNetherscrollsReferenceValue(queuedExport?.raw?.queue?.syncToken);
        const actor = findNetherscrollsActorForQueuedExport(queuedExport, guildId);
        if (!syncToken || !actor) {
          failed += 1;
          console.error(
            `${MODULE_ID} | Foundry Export queue entry remains queued because its Actor or sync token is unavailable.`,
            {
              campaignId,
              characterId: queuedExport?.id,
              actorFound: Boolean(actor),
              syncTokenFound: Boolean(syncToken),
            }
          );
          continue;
        }
        exportEntries.push({ actor, syncToken, characterId: queuedExport.id });
      }
      for (let offset = 0; offset < exportEntries.length; offset += 100) {
        const chunk = exportEntries.slice(offset, offset + 100);
        let result;
        try {
          result = await exportNetherscrollsCampaignActors(campaignId, chunk, {
            retryFailedOnce: true,
            guildId,
          });
        } catch (err) {
          failed += chunk.length;
          console.error(
            `${MODULE_ID} | Foundry Export queue batch remains queued after a failed request.`,
            {
              campaignId,
              characterIds: chunk
                .map(
                  /** Transform each entry while poll import queues. */ (entry) =>
                    getActorCharacterId(entry.actor)
                )
                .filter(Boolean),
              error: err,
            }
          );
          continue;
        }
        exported += result.succeeded.length;
        failed += result.failed.length;
        for (const entry of result.failed) {
          const stale = entry?.error?.code === "FOUNDRY_EXPORT_SYNC_STALE";
          const details = {
            campaignId,
            characterId: getActorCharacterId(entry.actor),
            stale,
            error: entry.error,
          };
          if (stale) {
            console.warn(
              `${MODULE_ID} | Foundry Export queue entry was replaced before it could be applied.`,
              details
            );
          } else {
            console.error(`${MODULE_ID} | Foundry Export queue entry was not applied.`, details);
          }
        }
      }
    }
    if (imported) {
      ui?.notifications?.info?.(
        `Foundry Import queue: ${imported} character${imported === 1 ? "" : "s"} applied.`
      );
    }
    if (exported) {
      ui?.notifications?.info?.(
        `Foundry Export queue: ${exported} character${exported === 1 ? "" : "s"} sent.`
      );
    }
    return { imported, exported, failed };
  } finally {
    netherscrollsQueuePollState.running = false;
  }
}

/** Retrieve import acknowledgement key. */
function getNetherscrollsImportAcknowledgementKey(campaignId, importedCharacter) {
  const queueIdentity =
    normalizeNetherscrollsReferenceValue(
      importedCharacter?.raw?.queue?.dueAt ?? importedCharacter?.raw?.queue?.id
    ) ?? "queue";
  return `${campaignId}:${importedCharacter?.id}:${queueIdentity}`;
}

/** Restrict background queue ownership to the active GM selected by Foundry. */
function isPrimaryNetherscrollsQueuePoller() {
  if (!game?.user?.isGM) return false;
  const activeGM = game?.users?.activeGM;
  return !activeGM || activeGM.id === game.user.id;
}

/** Find actor for queued export. */
function findNetherscrollsActorForQueuedExport(queuedExport, guildId = undefined) {
  const byCharacterId = findNetherscrollsActorByCharacterId(queuedExport?.id, null, { guildId });
  if (byCharacterId) return byCharacterId;
  const foundryActorId = normalizeNetherscrollsReferenceValue(
    queuedExport?.character?.foundryFlag ?? queuedExport?.raw?.character?.foundryFlag
  );
  const guild = getNetherscrollsRequestGuildId(guildId);
  const byFoundryId = foundryActorId
    ? getWorldActors().find(
        /** Find the matching entry while find actor for queued export. */
        (actor) =>
          actor?.type === "character" &&
          String(actor?.id ?? actor?._id ?? "") === foundryActorId &&
          (!getActorCharacterId(actor) || getActorCharacterId(actor) === queuedExport?.id) &&
          (!guild ||
            !getActorNetherscrollsGuildId(actor) ||
            getActorNetherscrollsGuildId(actor) === guild)
      )
    : null;
  return (
    byFoundryId ??
    findNetherscrollsActorByCharacterId(queuedExport?.id, queuedExport?.name, { guildId })
  );
}

let netherscrollsImportQueuePollTimer = null;

let netherscrollsImportQueuePollGeneration = 0;

export {
  disableLegacyNetherscrollsImportQueuePolling,
  isPrimaryNetherscrollsQueuePoller,
  toggleNetherscrollsImportQueuePolling,
};
