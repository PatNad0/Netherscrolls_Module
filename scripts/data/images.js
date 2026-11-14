/**
 * Keep persistent image references usable across repeated imports.
 * Validate hosted assets in bounded parallel work and replace dead references with the fallback.
 */
import {
  MODULE_ID,
  NETHERSCROLLS_DEFAULT_IMAGE,
  NETHERSCROLLS_IMAGE_VALIDATION_CONCURRENCY,
  NETHERSCROLLS_IMAGE_VALIDATION_TIMEOUT_MS,
  NETHERSCROLLS_IMPORT_IMAGE,
} from "../core/constants.js";
import { toTrimmedStringOrNull } from "../core/utils.js";

const netherscrollsValidImageReferences = new Set();

const netherscrollsDeadImageReferences = new Set();

const netherscrollsPendingImageValidations = new Map();

/** Normalize image path. */
function normalizeNetherscrollsImagePath(...values) {
  return normalizeNetherscrollsPersistentImageValues(values, NETHERSCROLLS_DEFAULT_IMAGE);
}

/** Normalize import image path. */
function normalizeNetherscrollsImportImagePath(...values) {
  return normalizeNetherscrollsPersistentImageValues(values, NETHERSCROLLS_IMPORT_IMAGE);
}

/** Determine whether placeholder image. */
function isNetherscrollsPlaceholderImage(value) {
  const image = toTrimmedStringOrNull(value);
  return (
    !image ||
    image === NETHERSCROLLS_DEFAULT_IMAGE ||
    image === NETHERSCROLLS_IMPORT_IMAGE ||
    /^icons\/svg\//i.test(image) ||
    isNetherscrollsUnresolvedImageKey(image) ||
    netherscrollsDeadImageReferences.has(image)
  );
}

/** Normalize persistent image values. */
function normalizeNetherscrollsPersistentImageValues(values, fallback) {
  const usable = values.map(toTrimmedStringOrNull).filter(Boolean);
  const image = usable.find(
    /** Find the matching entry while normalize persistent image values. */ (value) =>
      !isNetherscrollsPlaceholderImage(value)
  );
  return normalizeNetherscrollsPersistentImagePath(image ?? usable[0], fallback);
}

/** Normalize persistent image path. */
function normalizeNetherscrollsPersistentImagePath(value, fallback = NETHERSCROLLS_DEFAULT_IMAGE) {
  const img = String(value ?? "").trim();
  if (netherscrollsDeadImageReferences.has(img)) return fallback;
  if (/^https?:\/\//i.test(img)) return img;
  if (isNetherscrollsUnresolvedImageKey(img)) {
    console.error(
      `${MODULE_ID} | Netherscrolls returned an unresolved image key. ` +
        "The API requires R2_PUBLIC_BASE_URL.",
      img
    );
    return fallback;
  }
  return img || fallback;
}

/** Determine whether hosted asset image. */
function isNetherscrollsHostedAssetImage(value) {
  const raw = toTrimmedStringOrNull(value);
  if (!raw || !/^https?:\/\//i.test(raw)) return false;
  try {
    const url = new URL(raw);
    return (
      url.hostname.toLowerCase() === "images.netherscrolls.ca" && /^\/assets\//i.test(url.pathname)
    );
  } catch (_err) {
    return false;
  }
}

/** Collect hosted asset images. */
function collectNetherscrollsHostedAssetImages(value, found = new Set()) {
  if (typeof value === "string") {
    if (isNetherscrollsHostedAssetImage(value)) found.add(value.trim());
    return found;
  }
  if (!value || typeof value !== "object") return found;
  if (Array.isArray(value)) {
    for (const entry of value) collectNetherscrollsHostedAssetImages(entry, found);
    return found;
  }
  for (const entry of Object.values(value)) {
    collectNetherscrollsHostedAssetImages(entry, found);
  }
  return found;
}

/** Deduplicate image probes and bound their duration so unavailable artwork cannot stall an import indefinitely. */
function validateNetherscrollsHostedAssetImage(url) {
  if (netherscrollsValidImageReferences.has(url)) return Promise.resolve(true);
  if (netherscrollsDeadImageReferences.has(url)) return Promise.resolve(false);
  const pending = netherscrollsPendingImageValidations.get(url);
  if (pending) return pending;

  const ImageClass = globalThis.Image;
  if (typeof ImageClass !== "function") return Promise.resolve(null);
  const validation = new Promise(
    /** Handle the completed operation while validate hosted asset image. */ (resolve) => {
      const image = new ImageClass();
      let complete = false;
      const finish = /** Handle finish. */ (valid) => {
        if (complete) return;
        complete = true;
        clearTimeout(timeout);
        image.onload = null;
        image.onerror = null;
        resolve(valid);
      };
      const timeout = setTimeout(
        /** Run the deferred operation while validate hosted asset image. */ () => finish(null),
        NETHERSCROLLS_IMAGE_VALIDATION_TIMEOUT_MS
      );
      image.onload = /** Handle the completed operation while validate hosted asset image. */ () =>
        finish(true);
      image.onerror = /** Handle the completed operation while validate hosted asset image. */ () =>
        finish(false);
      image.src = url;
    }
  )
    .then(
      /** Handle the completed operation while validate hosted asset image. */ (valid) => {
        if (valid === true) netherscrollsValidImageReferences.add(url);
        if (valid === false) {
          netherscrollsDeadImageReferences.add(url);
          console.warn(
            `${MODULE_ID} | Replacing an unavailable Netherscrolls image reference.`,
            url
          );
        }
        return valid;
      }
    )
    .finally(
      /** Finish the operation while validate hosted asset image. */ () => {
        netherscrollsPendingImageValidations.delete(url);
      }
    );
  netherscrollsPendingImageValidations.set(url, validation);
  return validation;
}

/** Replace dead image references. */
function replaceDeadNetherscrollsImageReferences(value) {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const entry = value[index];
      if (typeof entry === "string" && netherscrollsDeadImageReferences.has(entry.trim())) {
        value[index] = NETHERSCROLLS_IMPORT_IMAGE;
      } else {
        replaceDeadNetherscrollsImageReferences(entry);
      }
    }
    return value;
  }
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string" && netherscrollsDeadImageReferences.has(entry.trim())) {
      value[key] = NETHERSCROLLS_IMPORT_IMAGE;
    } else {
      replaceDeadNetherscrollsImageReferences(entry);
    }
  }
  return value;
}

/** Validate hosted images before document creation and replace only references known to be dead. */
async function sanitizeNetherscrollsImportResponseImages(data) {
  const urls = Array.from(collectNetherscrollsHostedAssetImages(data));
  if (!urls.length || typeof globalThis.Image !== "function") return data;

  let nextIndex = 0;
  const worker = /** Handle worker. */ async () => {
    while (nextIndex < urls.length) {
      const url = urls[nextIndex];
      nextIndex += 1;
      await validateNetherscrollsHostedAssetImage(url);
    }
  };
  const workerCount = Math.min(NETHERSCROLLS_IMAGE_VALIDATION_CONCURRENCY, urls.length);
  await Promise.all(
    Array.from(
      { length: workerCount },
      /** Perform the callback while sanitize import response images. */ () => worker()
    )
  );
  return replaceDeadNetherscrollsImageReferences(data);
}

/** Determine whether unresolved image key. */
function isNetherscrollsUnresolvedImageKey(value) {
  return /^image\//i.test(String(value ?? "").trim());
}

export {
  isNetherscrollsPlaceholderImage,
  isNetherscrollsUnresolvedImageKey,
  normalizeNetherscrollsImagePath,
  normalizeNetherscrollsImportImagePath,
  normalizeNetherscrollsPersistentImagePath,
  sanitizeNetherscrollsImportResponseImages,
};
