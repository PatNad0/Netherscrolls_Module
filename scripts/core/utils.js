/**
 * Share small coercion, escaping, diagnostics, and scheduling primitives.
 * Yielding during long transfers lets Foundry render progress between document batches.
 */
import { MODULE_ID, NETHERSCROLLS_IMPORT_PREPARATION_FRAME_BUDGET_MS } from "./constants.js";
import { NETHERSCROLLS_NUMBER_WORDS } from "../data/catalogs.js";

/** Retrieve api rows. */
function getNetherscrollsApiRows(data) {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.data) ? data.data : [];
}

/** Report transfer item error. */
function reportNetherscrollsTransferItemError(label, error) {
  const message = `${label}: ${error?.message ?? error}. Other character data will continue.`;
  console.warn(`${MODULE_ID} | Character transfer`, message);
  ui?.notifications?.warn?.(message);
}

/** Handle hash string. */
function hashNetherscrollsString(value) {
  let hash = 0;
  const text = String(value ?? "");
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

/** Build stable id. */
function buildNetherscrollsStableId(value) {
  const firstHash = hashNetherscrollsString(value);
  const secondHash = hashNetherscrollsString([...String(value ?? "")].reverse().join(""));
  return `ns${firstHash}${secondHash}`
    .replace(/[^a-zA-Z0-9]/g, "")
    .padEnd(16, "0")
    .slice(0, 16);
}

/** Retrieve metadata line. */
function getNetherscrollsMetadataLine(text, label) {
  const regex = new RegExp(`\\b${label}\\s*:\\s*([^\\n.]+)`, "i");
  return toTrimmedStringOrNull(regex.exec(String(text ?? ""))?.[1]);
}

/** Convert to number. */
function toNetherscrollsNumber(value) {
  const normalized = toTrimmedStringOrNull(value)?.toLowerCase();
  if (!normalized) return null;
  const numeric = Number(normalized);
  if (Number.isFinite(numeric)) return numeric;
  return NETHERSCROLLS_NUMBER_WORDS[normalized] ?? null;
}

/** Duplicate data. */
function duplicateNetherscrollsData(value) {
  if (foundry?.utils?.deepClone) return foundry.utils.deepClone(value ?? {});
  return JSON.parse(JSON.stringify(value ?? {}));
}

/** Yield for main thread. */
function yieldNetherscrollsMainThread() {
  return new Promise(
    /** Perform the callback while yield for main thread. */ (resolve) => setTimeout(resolve, 0)
  );
}

/** Create main thread budget. */
function createNetherscrollsMainThreadBudget(
  maximumWorkMs = NETHERSCROLLS_IMPORT_PREPARATION_FRAME_BUDGET_MS
) {
  return {
    maximumWorkMs,
    startedAt: Date.now(),
  };
}

/** Yield for main thread if needed. */
async function yieldNetherscrollsMainThreadIfNeeded(budget) {
  if (!budget || Date.now() - budget.startedAt < budget.maximumWorkMs) return;
  await yieldNetherscrollsMainThread();
  budget.startedAt = Date.now();
}

/** Retrieve document id. */
function getDocumentId(document) {
  if (!document) return null;
  if (typeof document === "string") return document;
  return document.id ?? document._id ?? null;
}

/** Render foundry transfer payload. */
function renderFoundryTransferPayload(payload) {
  const maximumLength = 50_000;
  const serialized = JSON.stringify(payload, null, 2);
  const json =
    serialized.length > maximumLength
      ? `${serialized.slice(0, maximumLength)}\n\n… debug payload truncated (${serialized.length - maximumLength} characters omitted)`
      : serialized;
  const escaped = escapeHtml(json);
  return `<pre class="ns-foundry-transfer-data">${escaped}</pre>`;
}

/** Convert to trimmed string or null. */
function toTrimmedStringOrNull(value) {
  if (value == null) return null;
  const str = String(value).trim();
  return str ? str : null;
}

/** Normalize name. */
function normalizeNetherscrollsName(name) {
  if (!name) return "";
  return String(name)
    .replace(/\s*\(Legacy\)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Escape html. */
function escapeHtml(value) {
  if (foundry?.utils?.escapeHTML) {
    return foundry.utils.escapeHTML(value);
  }
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Convert to number. */
function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

/** Convert to number or null. */
function toNumberOrNull(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export {
  buildNetherscrollsStableId,
  createNetherscrollsMainThreadBudget,
  duplicateNetherscrollsData,
  escapeHtml,
  getDocumentId,
  getNetherscrollsApiRows,
  getNetherscrollsMetadataLine,
  hashNetherscrollsString,
  normalizeNetherscrollsName,
  renderFoundryTransferPayload,
  reportNetherscrollsTransferItemError,
  toNetherscrollsNumber,
  toNumber,
  toNumberOrNull,
  toTrimmedStringOrNull,
  yieldNetherscrollsMainThread,
  yieldNetherscrollsMainThreadIfNeeded,
};
