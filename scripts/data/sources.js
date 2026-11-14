/**
 * Keep source-name lookup and response normalization independent of network access.
 * The request layer populates this catalogue; converters only read its display names.
 */
import {
  NETHERSCROLLS_EXCLUDED_IMPORT_SOURCE_IDS,
  NETHERSCROLLS_SOURCE_NAME_FALLBACKS,
} from "../core/constants.js";
import { toTrimmedStringOrNull } from "../core/utils.js";
import { normalizeNetherscrollsReferenceValue } from "./references.js";

const netherscrollsSourceNamesById = new Map(NETHERSCROLLS_SOURCE_NAME_FALLBACKS);

const netherscrollsSourceCatalogState = {
  scope: null,
  loaded: false,
  pending: null,
};

/** Determine whether source object id. */
function isNetherscrollsSourceObjectId(value) {
  return /^[a-f\d]{24}$/i.test(String(value ?? "").trim());
}

/** Reset source name cache. */
function resetNetherscrollsSourceNameCache(scope) {
  netherscrollsSourceNamesById.clear();
  for (const [id, name] of NETHERSCROLLS_SOURCE_NAME_FALLBACKS) {
    netherscrollsSourceNamesById.set(id, name);
  }
  netherscrollsSourceCatalogState.scope = scope;
  netherscrollsSourceCatalogState.loaded = false;
  netherscrollsSourceCatalogState.pending = null;
}

/** Register source name. */
function registerNetherscrollsSourceName(idValue, nameValue) {
  const id = normalizeNetherscrollsReferenceValue(idValue);
  const name = toTrimmedStringOrNull(nameValue);
  if (!id || !name || !isNetherscrollsSourceObjectId(id)) return;
  netherscrollsSourceNamesById.set(id.toLowerCase(), name);
}

/** Retrieve source rows. */
function getNetherscrollsSourceRows(data) {
  if (Array.isArray(data?.data?.sources)) return data.data.sources;
  if (Array.isArray(data?.sources)) return data.sources;
  if (Array.isArray(data)) return data;
  return [];
}

/** Register source names. */
function registerNetherscrollsSourceNames(data) {
  for (const source of getNetherscrollsSourceRows(data)) {
    registerNetherscrollsSourceName(
      source?._id ?? source?.id ?? source?.netherscrollsId,
      source?.name ?? source?.key ?? source?.abbreviation
    );
  }

  const meta = data?.meta;
  for (const source of Array.isArray(meta?.sourceRecords) ? meta.sourceRecords : []) {
    registerNetherscrollsSourceName(
      source?._id ?? source?.id ?? source?.netherscrollsId,
      source?.name ?? source?.key ?? source?.abbreviation
    );
  }

  const requestedSources = Array.isArray(meta?.requestedSources) ? meta.requestedSources : [];
  const displaySources = Array.isArray(meta?.sources) ? meta.sources : [];
  for (
    let index = 0;
    index < Math.min(requestedSources.length, displaySources.length);
    index += 1
  ) {
    registerNetherscrollsSourceName(requestedSources[index], displaySources[index]);
  }
}

/** Retrieve source display name. */
function getNetherscrollsSourceDisplayName(value) {
  if (value && typeof value === "object") {
    const embeddedName = toTrimmedStringOrNull(
      value.name ?? value.label ?? value.key ?? value.abbreviation
    );
    if (embeddedName) return embeddedName;
    value = value._id ?? value.id ?? value.netherscrollsId;
  }
  const normalized = toTrimmedStringOrNull(value);
  if (!normalized) return null;
  return netherscrollsSourceNamesById.get(normalized.toLowerCase()) ?? normalized;
}

/** Normalize import sources. */
function normalizeNetherscrollsImportSources(data) {
  const rows = getNetherscrollsSourceRows(data);

  return rows
    .map(
      /** Transform each entry while normalize import sources. */ (source) => {
        const id = normalizeNetherscrollsReferenceValue(
          source?._id ?? source?.id ?? source?.netherscrollsId
        );
        if (id && NETHERSCROLLS_EXCLUDED_IMPORT_SOURCE_IDS.has(id)) return null;

        const key = toTrimmedStringOrNull(source?.key);
        const abbreviation = toTrimmedStringOrNull(source?.abbreviation);
        const name = toTrimmedStringOrNull(source?.name) ?? key ?? abbreviation ?? id;
        const value = normalizeNetherscrollsReferenceValue(name ?? key ?? abbreviation ?? id);
        if (!value) return null;

        const detailParts = [abbreviation, key].filter(Boolean);
        return {
          value,
          label: detailParts.length ? `${name} (${detailParts.join(" / ")})` : name,
          sortName: String(name).toLowerCase(),
        };
      }
    )
    .filter(Boolean)
    .sort(
      /** Order the entries while normalize import sources. */ (a, b) =>
        a.sortName.localeCompare(b.sortName)
    );
}

export {
  getNetherscrollsSourceDisplayName,
  isNetherscrollsSourceObjectId,
  netherscrollsSourceCatalogState,
  netherscrollsSourceNamesById,
  normalizeNetherscrollsImportSources,
  registerNetherscrollsSourceName,
  registerNetherscrollsSourceNames,
  resetNetherscrollsSourceNameCache,
};
