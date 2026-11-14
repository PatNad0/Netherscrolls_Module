/**
 * Resolve character item references against the managed library.
 * Missing or stale definitions are refreshed before owned actor copies are constructed.
 */
import { netherscrollsCharacterSelectionRefreshes } from "../api/cache.js";
import { getNetherscrollsRequestGuildId, requestNetherscrollsJson } from "../api/client.js";
import {
  MODULE_ID,
  NETHERSCROLLS_CHARACTER_SELECTION_CACHE_TTL_MS,
  NETHERSCROLLS_DEFAULT_IMAGE,
  NETHERSCROLLS_IMPORT_IMAGE,
  NETHERSCROLLS_IMPORT_SELECTION_ENDPOINT,
} from "../core/constants.js";
import { debugNetherscrollsCharacterImport, getNetherscrollsApiKey } from "../core/settings.js";
import {
  duplicateNetherscrollsData,
  escapeHtml,
  reportNetherscrollsTransferItemError,
  toTrimmedStringOrNull,
} from "../core/utils.js";
import {
  getNetherscrollsCharacterItemDataset,
  getNetherscrollsCharacterSourceId,
  prepareNetherscrollsCharacterActorItemData,
} from "../data/character-items.js";
import { isNetherscrollsUnresolvedImageKey } from "../data/images.js";
import {
  getNetherscrollsFoundryItemPayload,
  getNetherscrollsResponseDataset,
  getNetherscrollsSourceId,
  normalizeNetherscrollsReferenceValue,
} from "../data/references.js";
import {
  getNetherscrollsCompendiumDocumentsById,
  invalidateNetherscrollsCompendiumDocumentIdCache,
} from "../foundry/compendium-index.js";
import { getNetherscrollsImportPack } from "../foundry/compendiums.js";
import { applyNetherscrollsImportResponse } from "./library.js";

/** Finish resolving the character's library dependencies before constructing owned item data. */
async function resolveNetherscrollsCharacterItemSources(
  sources,
  { onProgress = null, guildId = undefined } = {}
) {
  const items = [];
  const failures = [];
  let fetched = 0;
  try {
    fetched = await importMissingNetherscrollsCharacterDocuments(sources, { guildId });
  } catch (error) {
    if ([401, 403].includes(error?.status) || error?.netherscrollsWriteFailure) throw error;
    reportNetherscrollsTransferItemError("Library lookup", error);
  }
  // Resolve non-embedded class-feature references first. A targeted feature
  // import can refresh its parent class/subclass feature UUIDs before those
  // class documents are copied into the Actor.
  const orderedSources = [
    ...sources.filter(
      /** Keep entries that satisfy the condition while resolve character item sources. */ (
        descriptor
      ) => descriptor.dataset === "classFeatures"
    ),
    ...sources.filter(
      /** Keep entries that satisfy the condition while resolve character item sources. */ (
        descriptor
      ) => descriptor.dataset !== "classFeatures"
    ),
  ];
  for (const [index, descriptor] of orderedSources.entries()) {
    onProgress?.(index + 1, sources.length);
    try {
      const resolved = await resolveNetherscrollsCharacterItemSource(
        descriptor.source,
        descriptor.dataset,
        {
          netherscrollsId: descriptor.netherscrollsId,
          required: descriptor.embed !== false,
        }
      );
      if (resolved?.item && descriptor.embed !== false) items.push(resolved.item);
    } catch (error) {
      reportNetherscrollsTransferItemError(
        descriptor.source?.name ?? descriptor.netherscrollsId ?? "Item",
        error
      );
      if (descriptor.embed !== false) failures.push(error);
    }
  }
  if (failures.length)
    throw new AggregateError(
      failures,
      `Netherscrolls import is incomplete: ${failures.length} required document(s) could not be resolved. The sync remains queued.`
    );
  return { items, fetched };
}

/** Resolve character item source. */
async function resolveNetherscrollsCharacterItemSource(
  source,
  fallbackDataset = null,
  { netherscrollsId: suppliedNetherscrollsId = null, required = true } = {}
) {
  const dataset = getNetherscrollsCharacterItemDataset(source, fallbackDataset);
  const netherscrollsId =
    normalizeNetherscrollsReferenceValue(suppliedNetherscrollsId) ??
    getNetherscrollsCharacterSourceId(source);
  const direct = getNetherscrollsFoundryItemPayload(source) ?? source;
  if (source?.kind === "personal") {
    return {
      item: {
        name: source.name,
        type: "loot",
        img: NETHERSCROLLS_DEFAULT_IMAGE,
        system: {
          description: { value: escapeHtml(source.description ?? "") },
          quantity: source.quantity ?? 1,
          weight: duplicateNetherscrollsData(source.weight ?? { value: 0, units: "lb" }),
          ...(source.goldValue == null
            ? {}
            : { price: { value: source.goldValue, denomination: "gp" } }),
        },
        flags: { netherscrolls: { kind: "personal", inventoryId: source.id } },
      },
    };
  }
  const document = netherscrollsId
    ? await findNetherscrollsCompendiumDocumentById(dataset, netherscrollsId)
    : null;
  debugNetherscrollsCharacterImport(
    document
      ? "Matched character content to an imported compendium document."
      : "No imported compendium document matched character content after targeted fetch.",
    {
      dataset,
      netherscrollsId,
      documentId: document?.id ?? null,
      documentName: document?.name ?? null,
    }
  );
  const hasCompleteFoundryItem =
    direct &&
    typeof direct === "object" &&
    toTrimmedStringOrNull(direct.type) &&
    direct.system &&
    typeof direct.system === "object";
  if (!document && !hasCompleteFoundryItem) {
    if (source.spellContext && source.spellContext.casting?.available !== true) {
      return {
        item: prepareNetherscrollsCharacterActorItemData(
          null,
          {
            name:
              source.spellContext.casting?.spellName ?? `Unavailable spell (${netherscrollsId})`,
            type: "spell",
            system: { level: source.spellContext.casting?.spellLevel ?? 0, activities: {} },
          },
          source,
          netherscrollsId,
          "spells"
        ),
      };
    }
    const message = `Could not resolve required Netherscrolls ${dataset} ${netherscrollsId ?? "reference"} through Foundry Import selection.`;
    if (required) throw new Error(message);
    console.warn(`${MODULE_ID} | ${message}`);
    return { item: null };
  }
  const item = prepareNetherscrollsCharacterActorItemData(
    document,
    direct,
    source,
    netherscrollsId,
    dataset
  );
  return { item };
}

/** Coalesce duplicate selection refreshes within the same guild scope to avoid redundant library requests. */
async function fetchNetherscrollsCharacterSelection(selection, { guildId = undefined } = {}) {
  const entries = Object.entries(selection).flatMap(
    /** Perform the callback while fetch character selection. */ ([dataset, ids]) =>
      [...new Set(ids)].map(
        /** Transform each entry while fetch character selection. */ (id) => ({ dataset, id })
      )
  );
  const result = { data: {} };
  const read = /** Read. */ async (entries) => {
    const body = {};
    for (const { dataset, id } of entries) (body[dataset] ??= []).push(id);
    try {
      const response = await requestNetherscrollsJson(NETHERSCROLLS_IMPORT_SELECTION_ENDPOINT, {
        method: "POST",
        apiKey: getNetherscrollsApiKey(),
        guildId,
        body,
        operation: "Character material lookup",
      });
      for (const dataset of Object.keys(body))
        (result.data[dataset] ??= []).push(
          ...(getNetherscrollsResponseDataset(response, dataset) ?? [])
        );
    } catch (error) {
      if ([401, 403].includes(error?.status)) throw error;
      if (error?.status === 400 && entries.length > 1) {
        for (const entry of entries) await read([entry]);
      } else
        reportNetherscrollsTransferItemError(
          entries
            .map(/** Transform each entry while fetch character selection. */ (entry) => entry.id)
            .join(", "),
          error
        );
    }
  };
  for (let offset = 0; offset < entries.length; offset += 100)
    await read(entries.slice(offset, offset + 100));
  return result;
}

/** Import missing character documents. */
async function importMissingNetherscrollsCharacterDocuments(sources, { guildId = undefined } = {}) {
  const guildScope = getNetherscrollsRequestGuildId(guildId);
  const supportedDatasets = new Set([
    "items",
    "feats",
    "spells",
    "classes",
    "subclasses",
    "backgrounds",
    "races",
  ]);
  const refresh = [];
  for (const descriptor of sources) {
    const dataset = descriptor?.dataset;
    const id = normalizeNetherscrollsReferenceValue(descriptor?.netherscrollsId);
    if (!id || !supportedDatasets.has(dataset)) continue;
    // Refresh linked records from the API unless this client just refreshed the
    // same healthy canonical document. This preserves authoritative content
    // while avoiding identical selection requests across adjacent characters.
    refresh.push({ dataset, id });
  }
  if (!refresh.length) return 0;

  const candidates = Array.from(
    new Map(
      refresh.map(
        /** Transform each entry while import missing character documents. */ (entry) => [
          `${entry.dataset}:${entry.id}`,
          entry,
        ]
      )
    ).values()
  );
  const now = Date.now();
  for (const [cacheKey, refreshedAt] of netherscrollsCharacterSelectionRefreshes) {
    if (now - refreshedAt >= NETHERSCROLLS_CHARACTER_SELECTION_CACHE_TTL_MS) {
      netherscrollsCharacterSelectionRefreshes.delete(cacheKey);
    }
  }
  const unique = [];
  for (const entry of candidates) {
    const cacheKey = `${guildScope}:${entry.dataset}:${entry.id}`;
    const refreshedAt = netherscrollsCharacterSelectionRefreshes.get(cacheKey) ?? 0;
    if (now - refreshedAt >= NETHERSCROLLS_CHARACTER_SELECTION_CACHE_TTL_MS) {
      unique.push(entry);
      continue;
    }
    const document = await findNetherscrollsCompendiumDocumentById(entry.dataset, entry.id);
    if (!document || isStaleNetherscrollsCharacterLibraryDocument(document, entry.dataset)) {
      netherscrollsCharacterSelectionRefreshes.delete(cacheKey);
      unique.push(entry);
    }
  }
  if (!unique.length) return 0;

  let importedCount = 0;
  for (let offset = 0; offset < unique.length; offset += 100) {
    const chunk = unique.slice(offset, offset + 100);
    const selection = {};
    for (const { dataset, id } of chunk) {
      selection[dataset] ??= [];
      selection[dataset].push(id);
    }
    const response = await fetchNetherscrollsCharacterSelection(selection, { guildId: guildScope });
    // Apply records independently; a bad record must not remove a working cached definition.
    for (const dataset of Object.keys(selection)) {
      for (const row of getNetherscrollsResponseDataset(response, dataset) ?? []) {
        try {
          await applyNetherscrollsImportResponse({ data: { [dataset]: [row] } }, null, [dataset]);
        } catch (error) {
          reportNetherscrollsTransferItemError(
            row.name ?? getNetherscrollsSourceId(row) ?? dataset,
            error
          );
          if (error?.netherscrollsWriteFailure) throw error;
        }
      }
    }
    for (const entry of chunk) {
      const document = await findNetherscrollsCompendiumDocumentById(entry.dataset, entry.id);
      const cacheKey = `${guildScope}:${entry.dataset}:${entry.id}`;
      if (document && !isStaleNetherscrollsCharacterLibraryDocument(document, entry.dataset)) {
        netherscrollsCharacterSelectionRefreshes.set(cacheKey, Date.now());
      } else {
        netherscrollsCharacterSelectionRefreshes.delete(cacheKey);
      }
    }
    importedCount += Object.values(response?.data ?? {})
      .filter(Array.isArray)
      .reduce(
        /** Combine entries into a result while import missing character documents. */ (
          count,
          rows
        ) => count + rows.length,
        0
      );
  }
  return importedCount;
}

/** Clear character library documents. */
async function clearNetherscrollsCharacterLibraryDocuments(entries) {
  const idsByDataset = new Map();
  for (const entry of entries) {
    const dataset = toTrimmedStringOrNull(entry?.dataset);
    const id = normalizeNetherscrollsReferenceValue(entry?.id);
    if (!dataset || !id) continue;
    const ids = idsByDataset.get(dataset) ?? new Set();
    ids.add(id);
    idsByDataset.set(dataset, ids);
  }

  const ItemClass = Item?.implementation ?? Item;
  if (typeof ItemClass?.deleteDocuments !== "function") return;
  for (const [dataset, netherscrollsIds] of idsByDataset) {
    const pack = await getNetherscrollsImportPack(dataset);
    if (!pack) continue;
    const documentsById = await getNetherscrollsCompendiumDocumentsById(pack);
    const documentIds = Array.from(netherscrollsIds)
      .map(
        /** Transform each entry while clear character library documents. */ (id) =>
          documentsById.get(String(id))?.id
      )
      .filter(Boolean);
    if (documentIds.length) {
      await ItemClass.deleteDocuments(documentIds, { pack: pack.collection, render: false });
    }
    invalidateNetherscrollsCompendiumDocumentIdCache(dataset);
  }
}

/** Determine whether stale character library document. */
function isStaleNetherscrollsCharacterLibraryDocument(document, dataset) {
  const expectedType = {
    backgrounds: "background",
    races: "race",
    classes: "class",
    subclasses: "subclass",
    spells: "spell",
    feats: "feat",
  }[dataset];
  if (expectedType && toTrimmedStringOrNull(document?.type) !== expectedType) return true;
  const img = toTrimmedStringOrNull(document?.img);
  return isNetherscrollsUnresolvedImageKey(img) || img === NETHERSCROLLS_IMPORT_IMAGE;
}

/** Find compendium document by id. */
async function findNetherscrollsCompendiumDocumentById(dataset, netherscrollsId) {
  const pack = await getNetherscrollsImportPack(dataset);
  if (!pack) {
    debugNetherscrollsCharacterImport(
      "No compendium pack is available for character content lookup.",
      {
        dataset,
        netherscrollsId,
      }
    );
    return null;
  }
  const documentsById = await getNetherscrollsCompendiumDocumentsById(pack);
  const document = documentsById.get(String(netherscrollsId)) ?? null;
  debugNetherscrollsCharacterImport(
    "Looked up imported compendium content by Netherscrolls flag.",
    {
      dataset,
      netherscrollsId,
      pack: pack.collection,
      documentCount: documentsById.size,
      matched: Boolean(document),
    }
  );
  return document;
}

export { resolveNetherscrollsCharacterItemSources };
