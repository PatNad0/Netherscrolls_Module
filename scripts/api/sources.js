/**
 * Resolve source catalogue names before building imported library documents.
 * Missing source names can fall back without failing an otherwise usable import.
 */
import { getNetherscrollsGuildScope, requestNetherscrollsJson } from "./client.js";
import { MODULE_ID, NETHERSCROLLS_SOURCES_ENDPOINT } from "../core/constants.js";
import { getNetherscrollsApiKey } from "../core/settings.js";
import {
  createNetherscrollsMainThreadBudget,
  yieldNetherscrollsMainThreadIfNeeded,
} from "../core/utils.js";
import {
  isNetherscrollsSourceObjectId,
  netherscrollsSourceCatalogState,
  netherscrollsSourceNamesById,
  normalizeNetherscrollsImportSources,
  registerNetherscrollsSourceName,
  registerNetherscrollsSourceNames,
  resetNetherscrollsSourceNameCache,
} from "../data/sources.js";

/** Retrieve import source context. */
async function getNetherscrollsImportSourceContext(apiKey, { guildId = undefined } = {}) {
  const scope = getNetherscrollsGuildScope(apiKey, guildId);
  if (netherscrollsSourceCatalogState.scope !== scope) {
    resetNetherscrollsSourceNameCache(scope);
  }
  try {
    const data = await requestNetherscrollsJson(NETHERSCROLLS_SOURCES_ENDPOINT, {
      method: "GET",
      apiKey,
      guildId,
      operation: "Source list",
    });

    registerNetherscrollsSourceNames(data);
    if (scope === netherscrollsSourceCatalogState.scope) {
      netherscrollsSourceCatalogState.loaded = true;
    }

    return {
      sources: normalizeNetherscrollsImportSources(data),
      sourceLoadError: null,
    };
  } catch (err) {
    console.error(`${MODULE_ID} | Unable to load Netherscrolls sources.`, err);
    return {
      sources: [],
      sourceLoadError: err?.message ?? String(err ?? "Unable to load sources."),
    };
  }
}

/** Collect source ids. */
async function collectNetherscrollsSourceIds(value) {
  const ids = new Set();
  const pending = [{ value, parentKey: "" }];
  const budget = createNetherscrollsMainThreadBudget();
  while (pending.length) {
    const current = pending.pop();
    const currentValue = current?.value;
    if (!currentValue || typeof currentValue !== "object") continue;
    if (Array.isArray(currentValue)) {
      for (const entry of currentValue)
        pending.push({ value: entry, parentKey: current.parentKey });
      await yieldNetherscrollsMainThreadIfNeeded(budget);
      continue;
    }

    for (const [key, entry] of Object.entries(currentValue)) {
      const normalizedKey = key.toLowerCase();
      const isSourceField =
        normalizedKey === "source" ||
        ((normalizedKey === "book" || normalizedKey === "custom") &&
          current.parentKey === "source");
      if (isSourceField) {
        if (typeof entry === "string" && isNetherscrollsSourceObjectId(entry)) {
          ids.add(entry.trim().toLowerCase());
        } else if (entry && typeof entry === "object" && !Array.isArray(entry)) {
          registerNetherscrollsSourceName(
            entry._id ?? entry.id ?? entry.netherscrollsId,
            entry.name ?? entry.label ?? entry.key ?? entry.abbreviation
          );
        }
      }
      if (entry && typeof entry === "object") {
        pending.push({ value: entry, parentKey: normalizedKey });
      }
    }
    await yieldNetherscrollsMainThreadIfNeeded(budget);
  }
  return ids;
}

/** Resolve unknown source IDs once per scope while allowing concurrent imports to share the request. */
async function loadNetherscrollsSourceNameCatalog(apiKey, { guildId = undefined } = {}) {
  if (!apiKey) return;
  const scope = getNetherscrollsGuildScope(apiKey, guildId);
  if (netherscrollsSourceCatalogState.scope !== scope) {
    resetNetherscrollsSourceNameCache(scope);
  }
  if (netherscrollsSourceCatalogState.loaded) return;
  if (netherscrollsSourceCatalogState.pending) {
    await netherscrollsSourceCatalogState.pending;
    return;
  }

  netherscrollsSourceCatalogState.pending =
    /** Perform the callback while load source name catalog. */ (/** Perform the callback while load source name catalog. */ async () => {
      const data = await requestNetherscrollsJson(NETHERSCROLLS_SOURCES_ENDPOINT, {
        method: "GET",
        apiKey,
        guildId,
        operation: "Source list",
      });
      registerNetherscrollsSourceNames(data);
      if (netherscrollsSourceCatalogState.scope === scope)
        netherscrollsSourceCatalogState.loaded = true;
    })().finally(
      /** Finish the operation while load source name catalog. */ () => {
        netherscrollsSourceCatalogState.pending = null;
      }
    );
  await netherscrollsSourceCatalogState.pending;
}

/** Prefer readable source labels, but allow an import to continue when the optional catalogue cannot load. */
async function prepareNetherscrollsImportSourceNames(data) {
  registerNetherscrollsSourceNames(data);
  const sourceIds = await collectNetherscrollsSourceIds(data);
  const unresolvedIds = Array.from(sourceIds).filter(
    /** Keep entries that satisfy the condition while prepare import source names. */ (id) =>
      !netherscrollsSourceNamesById.has(id)
  );
  if (!unresolvedIds.length) return data;

  try {
    await loadNetherscrollsSourceNameCatalog(getNetherscrollsApiKey());
  } catch (err) {
    console.warn(`${MODULE_ID} | Unable to translate Netherscrolls source ids.`, err);
  }
  return data;
}

export { getNetherscrollsImportSourceContext, prepareNetherscrollsImportSourceNames };
