/**
 * Stage and validate library responses before replacing managed compendium content.
 * The replacement guard is released even when fetching, deleting, or importing fails.
 */
import {
  buildNetherscrollsApiError,
  buildNetherscrollsApiHeaders,
  getNetherscrollsRequestGuildId,
} from "../api/client.js";
import { prepareNetherscrollsImportSourceNames } from "../api/sources.js";
import {
  MODULE_ID,
  NETHERSCROLLS_COMPENDIUM_WRITE_BATCH_SIZE,
  NETHERSCROLLS_DEFAULT_IMAGE,
  NETHERSCROLLS_IMPORT_ENDPOINTS,
  NETHERSCROLLS_SOURCE_IMPORT_ENDPOINT,
  NETHERSCROLLS_WORLD_IMPORT_PACKS,
  getNetherscrollsImportPackCollection,
} from "../core/constants.js";
import { getDocumentId } from "../core/utils.js";
import {
  NETHERSCROLLS_FEAT_FOLDERS,
  NETHERSCROLLS_ITEM_FOLDERS,
  NETHERSCROLLS_SPELL_LEVEL_FOLDERS,
  NETHERSCROLLS_SPELL_SCHOOLS,
} from "../data/catalogs.js";
import { sanitizeNetherscrollsImportResponseImages } from "../data/images.js";
import {
  getNetherscrollsImportTypeLabel,
  getNetherscrollsResponseDataset,
} from "../data/references.js";
import {
  getPackDocumentClass,
  getPackFolders,
  getPackIndexEntries,
} from "../foundry/collections.js";
import { invalidateNetherscrollsCompendiumDocumentIdCache } from "../foundry/compendium-index.js";
import { ensureNetherscrollsImportPackWritable } from "../foundry/compendiums.js";
import {
  importNetherscrollsClasses,
  importNetherscrollsFeats,
  importNetherscrollsGenericFoundryItems,
  importNetherscrollsItems,
  importNetherscrollsSpells,
} from "./datasets.js";
import { importNetherscrollsMonsters } from "./monsters.js";
import {
  netherscrollsCharacterImportLocks,
  netherscrollsLibraryReplacementState,
  netherscrollsQueuePollState,
} from "./transfer-state.js";

/** Fetch and validate the full selection before any managed library document is deleted. */
async function replaceNetherscrollsLibrary(requests) {
  if (!requests.length) return [];
  if (!game?.user?.isGM) throw new Error("Only a GM can replace the Netherscrolls library.");
  if (netherscrollsLibraryReplacementState.active)
    throw new Error("A Netherscrolls library import is already running.");
  if (netherscrollsCharacterImportLocks.size || netherscrollsQueuePollState.running) {
    throw new Error(
      "Wait for the current character transfer to finish before replacing the library."
    );
  }
  netherscrollsLibraryReplacementState.active = true;
  try {
    const staged = [];
    // No destructive work until every requested endpoint returned a valid dataset.
    for (const request of requests) {
      const response = await sendNetherscrollsImportRequest(request);
      for (const typeKey of request.typeKeys ?? [request.typeKey]) {
        if (!Array.isArray(getNetherscrollsResponseDataset(response, typeKey, request.typeKey))) {
          throw new Error(
            `The ${typeKey} library response is incomplete; the existing library was not cleared.`
          );
        }
      }
      await prepareNetherscrollsImportSourceNames(response);
      await sanitizeNetherscrollsImportResponseImages(response);
      staged.push({ request, response });
    }
    await clearNetherscrollsLibrary(
      requests.flatMap(
        /** Collect every requested dataset key. */ (request) =>
          request.typeKeys ?? [request.typeKey]
      )
    );
    const imported = [];
    for (const { request, response } of staged) {
      const result = await applyNetherscrollsImportResponse(
        response,
        request.typeKey,
        request.typeKeys
      );
      imported.push({ request, result });
    }
    return imported;
  } finally {
    netherscrollsLibraryReplacementState.active = false;
  }
}

/** Preflight every managed destination before deleting documents, then remove nested folders deepest first. */
async function clearNetherscrollsLibrary(requestedTypeKeys = []) {
  const requested = new Set(requestedTypeKeys);
  const plans = [];
  // Exact managed world pack IDs, never world actors/items or arbitrary
  // compendiums that happen to be placed in the same sidebar folder. Item packs
  // are always rebuilt; the monster Actor pack only when monsters are imported.
  for (const [typeKey, definition] of Object.entries(NETHERSCROLLS_WORLD_IMPORT_PACKS)) {
    if (definition.type !== "Item" && !requested.has(typeKey)) continue;
    const collection = getNetherscrollsImportPackCollection(typeKey);
    const pack = game?.packs?.get?.(collection);
    if (!pack) continue;
    if (
      pack.collection !== collection ||
      (pack.documentName ?? pack.metadata?.type ?? "Item") !== definition.type
    ) {
      throw new Error(`Unexpected library destination: ${collection}`);
    }
    await ensureNetherscrollsImportPackWritable(pack);
    const ids = getPackIndexEntries(await pack.getIndex())
      .map(getDocumentId)
      .filter(Boolean);
    const DocumentClass = getPackDocumentClass(pack);
    const folders = getPackFolders(pack);
    if (ids.length && typeof DocumentClass?.deleteDocuments !== "function")
      throw new Error(`Cannot clear ${collection}: deletion API unavailable.`);
    if (
      folders.some(
        /** Check whether any entry matches while clear library. */ (folder) =>
          typeof folder.delete !== "function"
      )
    )
      throw new Error(`Cannot clear folders in ${collection}.`);
    const byId = new Map(
      folders.map(
        /** Transform each entry while clear library. */ (folder) => [getDocumentId(folder), folder]
      )
    );
    const depth = /** Handle depth. */ (folder) => {
      const seen = new Set();
      while (folder) {
        const id = getDocumentId(folder);
        if (seen.has(id)) throw new Error(`Cyclic library folders in ${collection}.`);
        seen.add(id);
        folder = byId.get(getDocumentId(folder.folder));
      }
      return seen.size;
    };
    const orderedFolders = folders
      .map(
        /** Transform each entry while clear library. */ (folder) => ({
          folder,
          depth: depth(folder),
        })
      )
      .sort(/** Order the entries while clear library. */ (a, b) => b.depth - a.depth);
    plans.push({ typeKey, pack, DocumentClass, ids, orderedFolders });
  }
  for (const { typeKey, pack, DocumentClass, ids, orderedFolders } of plans) {
    // Invalidate even when a partial deletion fails.
    invalidateNetherscrollsCompendiumDocumentIdCache(typeKey);
    for (let offset = 0; offset < ids.length; offset += NETHERSCROLLS_COMPENDIUM_WRITE_BATCH_SIZE) {
      await DocumentClass.deleteDocuments(
        ids.slice(offset, offset + NETHERSCROLLS_COMPENDIUM_WRITE_BATCH_SIZE),
        { pack: pack.collection, render: false, netherscrollsTransfer: true }
      );
    }
    if (getPackIndexEntries(await pack.getIndex()).length)
      throw new Error(`The ${pack.collection} library could not be fully cleared.`);
    for (const { folder } of orderedFolders) {
      await folder.delete({ pack: pack.collection, render: false, netherscrollsTransfer: true });
    }
  }
}

/** Retrieve compendium readiness. */
async function getNetherscrollsCompendiumReadiness() {
  let documentCount = 0;
  for (const typeKey of Object.keys(NETHERSCROLLS_WORLD_IMPORT_PACKS)) {
    if (typeKey === "monsters") continue;
    const pack = game?.packs?.get?.(getNetherscrollsImportPackCollection(typeKey));
    if (!pack) continue;

    try {
      const index = await pack.getIndex?.({
        fields: ["flags.netherscrolls.id"],
      });
      const entries = index?.contents ?? (index ? Array.from(index) : []);
      const imported = entries.filter(
        /** Keep entries that satisfy the condition while retrieve compendium readiness. */ (
          entry
        ) => Boolean(entry?.flags?.netherscrolls?.id)
      );
      documentCount += imported.length;
    } catch (err) {
      console.warn(`${MODULE_ID} | Unable to read Netherscrolls compendium index.`, err);
    }
  }
  return { ready: documentCount > 0, documentCount };
}

/** Build import requests. */
async function buildNetherscrollsImportRequests({
  apiKey,
  selectedTypes,
  sinceDate,
  selectedSources = [],
  guildId = undefined,
}) {
  if (selectedSources.length) {
    return selectedTypes
      .filter(
        /** Keep entries that satisfy the condition while build import requests. */ (type) =>
          NETHERSCROLLS_IMPORT_ENDPOINTS[type.key]
      )
      .map(
        /** Transform each entry while build import requests. */ (type) =>
          buildNetherscrollsSourceImportRequest({
            apiKey,
            typeKey: type.key,
            selectedSources,
            sinceDate,
            guildId,
          })
      )
      .filter(Boolean);
  }

  return selectedTypes
    .map(
      /** Transform each entry while build import requests. */ (type) =>
        buildNetherscrollsImportRequest({
          apiKey,
          typeKey: type.key,
          sinceDate,
          guildId,
        })
    )
    .filter(Boolean);
}

/** Build source import request. */
function buildNetherscrollsSourceImportRequest({
  apiKey,
  typeKey,
  selectedSources,
  sinceDate,
  guildId = undefined,
}) {
  const url = new URL(NETHERSCROLLS_SOURCE_IMPORT_ENDPOINT);
  for (const source of selectedSources) {
    url.searchParams.append("sources", source);
  }
  url.searchParams.set("dataset", getNetherscrollsSourceImportDataset(typeKey));
  if (sinceDate) url.searchParams.set("since", sinceDate);

  return {
    typeKey,
    typeKeys: [typeKey],
    sourceFiltered: true,
    guildId: getNetherscrollsRequestGuildId(guildId),
    url: url.toString(),
    options: {
      method: "GET",
      headers: buildNetherscrollsApiHeaders({ apiKey, guildId }),
    },
    payload: {
      dataset: typeKey,
      sourceDataset: getNetherscrollsSourceImportDataset(typeKey),
      sources: selectedSources,
      since: sinceDate || null,
    },
  };
}

/** Retrieve source import dataset. */
function getNetherscrollsSourceImportDataset(typeKey) {
  const datasets = {
    classes: "class",
    feats: "feat",
    items: "item",
    spells: "spell",
    backgrounds: "background",
    races: "race",
  };
  return datasets[typeKey] ?? typeKey;
}

/** Build import request. */
function buildNetherscrollsImportRequest({ apiKey, typeKey, sinceDate, guildId = undefined }) {
  const endpoint = NETHERSCROLLS_IMPORT_ENDPOINTS[typeKey];
  if (!endpoint) return null;

  const url = new URL(endpoint);
  if (sinceDate) url.searchParams.set("since", sinceDate);

  return {
    typeKey,
    guildId: getNetherscrollsRequestGuildId(guildId),
    url: url.toString(),
    options: {
      method: "GET",
      headers: buildNetherscrollsApiHeaders({ apiKey, guildId }),
    },
    payload: {
      dataset: typeKey,
      since: sinceDate || null,
    },
  };
}

/** Sanitize import request. */
function sanitizeNetherscrollsImportRequest(request) {
  return {
    ...request,
    options: {
      ...request.options,
      headers: {
        ...request.options?.headers,
        "x-api-key": request.options?.headers?.["x-api-key"] ? "<redacted>" : "",
      },
    },
  };
}

/** Build import destination plan. */
function buildNetherscrollsImportDestinationPlan(selectedTypes) {
  const destinations = {};
  for (const type of selectedTypes) {
    destinations[type.key] = {
      pack: getNetherscrollsImportPackCollection(type.key),
      defaultImage: NETHERSCROLLS_DEFAULT_IMAGE,
    };
  }

  if (destinations.spells) {
    destinations.spells.folderRule = "Spells / Level{level} / {school}";
    destinations.spells.levels = NETHERSCROLLS_SPELL_LEVEL_FOLDERS.map(
      /** Transform each entry while build import destination plan. */ (level) => level.label
    );
    destinations.spells.schools = NETHERSCROLLS_SPELL_SCHOOLS.map(
      /** Transform each entry while build import destination plan. */ (school) => school.label
    );
  }

  if (destinations.items) {
    destinations.items.folderRule = "Items / {type}";
    destinations.items.types = NETHERSCROLLS_ITEM_FOLDERS.map(
      /** Transform each entry while build import destination plan. */ (folder) => folder.label
    );
  }

  if (destinations.feats) {
    destinations.feats.folderRule = "Feats / {feat|demifeat}";
    destinations.feats.types = NETHERSCROLLS_FEAT_FOLDERS.map(
      /** Transform each entry while build import destination plan. */ (folder) => folder.label
    );
  }

  if (destinations.classes) {
    destinations.classes.folderRule = "Classes / {class|subclass}";
    destinations.classes.subclassPack = getNetherscrollsImportPackCollection("subclasses");
    destinations.classes.featurePack = getNetherscrollsImportPackCollection("classFeatures");
    destinations.classes.featureFolderRule = "Class Features / {class} / {feature|subclass}";
  }

  return destinations;
}

/** Format import result. */
function formatNetherscrollsImportResult(typeKey, result) {
  const label = getNetherscrollsImportTypeLabel(typeKey);
  const imported = result?.[typeKey]?.created ?? 0;
  const updated = result?.[typeKey]?.updated ?? 0;
  const removed = result?.[typeKey]?.deleted ?? 0;
  if (typeKey === "classes" && result?.classes?.features) {
    const features = result.classes.features;
    const subclasses = result.classes.subclasses ?? {};
    return `Netherscrolls ${label} imported: ${imported} created, ${updated} updated, ${removed} removed. Subclasses: ${subclasses.created ?? 0} created, ${subclasses.updated ?? 0} updated, ${subclasses.deleted ?? 0} removed. Class features: ${features.created ?? 0} created, ${features.updated ?? 0} updated, ${features.deleted ?? 0} removed.`;
  }
  return `Netherscrolls ${label} imported: ${imported} created, ${updated} updated, ${removed} removed.${formatNetherscrollsMonsterImportNotes(result?.[typeKey])}`;
}

/** Mention monsters that failed or need a review (details are in the console). */
function formatNetherscrollsMonsterImportNotes(counts) {
  const notes = [];
  if (counts?.failed) notes.push(`${counts.failed} could not be imported`);
  if (counts?.review) notes.push(`${counts.review} have conversion warnings to review`);
  return notes.length ? ` ${notes.join("; ")} (see the browser console).` : "";
}

/** Format source import result. */
function formatNetherscrollsSourceImportResult(result, typeKeys = []) {
  const labels = (Array.isArray(typeKeys) ? typeKeys : [])
    .filter(
      /** Keep entries that satisfy the condition while format source import result. */ (typeKey) =>
        result?.[typeKey]
    )
    .map(
      /** Transform each entry while format source import result. */ (typeKey) => {
        const counts = result[typeKey] ?? {};
        return `${getNetherscrollsImportTypeLabel(typeKey)}: ${counts.created ?? 0} created, ${counts.updated ?? 0} updated, ${counts.deleted ?? 0} removed${formatNetherscrollsMonsterImportNotes(counts).replace(/\.$/, "")}`;
      }
    );

  return labels.length
    ? `Netherscrolls source import complete. ${labels.join("; ")}.`
    : "Netherscrolls source import complete. No selected dataset returned importable data.";
}

/** Send import request. */
async function sendNetherscrollsImportRequest(importRequest) {
  const response = await fetch(importRequest.url, importRequest.options);
  const data = await response
    .json()
    .catch(/** Handle the operation failure while send import request. */ () => null);
  if (!response.ok) {
    throw await buildNetherscrollsApiError(response, data, "Import", importRequest.guildId ?? "");
  }

  return data;
}

/** Dispatch only datasets allowed by this request so a response cannot import unselected library types. */
async function applyNetherscrollsImportResponse(
  data,
  requestTypeKey = null,
  allowedTypeKeys = null
) {
  await prepareNetherscrollsImportSourceNames(data);
  await sanitizeNetherscrollsImportResponseImages(data);
  const result = {};
  const allowedTypes = Array.isArray(allowedTypeKeys) ? new Set(allowedTypeKeys) : null;
  const shouldImportType = /** Determine whether import type. */ (typeKey) =>
    !allowedTypes || allowedTypes.has(typeKey);

  const classes = shouldImportType("classes")
    ? getNetherscrollsResponseDataset(data, "classes", requestTypeKey)
    : null;
  if (Array.isArray(classes)) {
    result.classes = await importNetherscrollsClasses(classes);
    invalidateNetherscrollsCompendiumDocumentIdCache("classes");
    invalidateNetherscrollsCompendiumDocumentIdCache("subclasses");
    invalidateNetherscrollsCompendiumDocumentIdCache("classFeatures");
  }

  const subclasses = shouldImportType("subclasses")
    ? getNetherscrollsResponseDataset(data, "subclasses", requestTypeKey)
    : null;
  if (Array.isArray(subclasses)) {
    result.subclasses = await importNetherscrollsGenericFoundryItems(subclasses, "subclasses");
    invalidateNetherscrollsCompendiumDocumentIdCache("subclasses");
  }

  const items = shouldImportType("items")
    ? getNetherscrollsResponseDataset(data, "items", requestTypeKey)
    : null;
  if (Array.isArray(items)) {
    result.items = await importNetherscrollsItems(items);
    invalidateNetherscrollsCompendiumDocumentIdCache("items");
  }

  const feats = shouldImportType("feats")
    ? getNetherscrollsResponseDataset(data, "feats", requestTypeKey)
    : null;
  if (Array.isArray(feats)) {
    result.feats = await importNetherscrollsFeats(feats);
    invalidateNetherscrollsCompendiumDocumentIdCache("feats");
  }

  const spells = shouldImportType("spells")
    ? getNetherscrollsResponseDataset(data, "spells", requestTypeKey)
    : null;
  if (Array.isArray(spells)) {
    result.spells = await importNetherscrollsSpells(spells);
    invalidateNetherscrollsCompendiumDocumentIdCache("spells");
  }

  const backgrounds = shouldImportType("backgrounds")
    ? getNetherscrollsResponseDataset(data, "backgrounds", requestTypeKey)
    : null;
  if (Array.isArray(backgrounds)) {
    result.backgrounds = await importNetherscrollsGenericFoundryItems(backgrounds, "backgrounds");
    invalidateNetherscrollsCompendiumDocumentIdCache("backgrounds");
  }

  const races = shouldImportType("races")
    ? getNetherscrollsResponseDataset(data, "races", requestTypeKey)
    : null;
  if (Array.isArray(races)) {
    result.races = await importNetherscrollsGenericFoundryItems(races, "races");
    invalidateNetherscrollsCompendiumDocumentIdCache("races");
  }

  // Only when asked for: monsters never arrive as a side effect of another dataset.
  const monsters =
    allowedTypes?.has("monsters") || requestTypeKey === "monsters"
      ? getNetherscrollsResponseDataset(data, "monsters", requestTypeKey)
      : null;
  if (Array.isArray(monsters)) {
    result.monsters = await importNetherscrollsMonsters(monsters);
  }

  return result;
}

export {
  applyNetherscrollsImportResponse,
  buildNetherscrollsImportDestinationPlan,
  buildNetherscrollsImportRequests,
  formatNetherscrollsImportResult,
  formatNetherscrollsSourceImportResult,
  getNetherscrollsCompendiumReadiness,
  replaceNetherscrollsLibrary,
  sanitizeNetherscrollsImportRequest,
};
