/**
 * Upload Foundry-local artwork before sending portable export payloads.
 * Cache successful uploads so repeated exports reuse hosted references instead of uploading again.
 */
import {
  buildNetherscrollsApiError,
  buildNetherscrollsApiHeaders,
  getNetherscrollsRequestGuildId,
} from "../api/client.js";
import {
  MODULE_ID,
  NETHERSCROLLS_DEFAULT_IMAGE,
  NETHERSCROLLS_MEDIA_IMAGE_ENDPOINT,
} from "../core/constants.js";
import { getNetherscrollsApiKey } from "../core/settings.js";
import {
  duplicateNetherscrollsData,
  reportNetherscrollsTransferItemError,
  toTrimmedStringOrNull,
  yieldNetherscrollsMainThread,
} from "../core/utils.js";
import { buildFoundryExportPayload } from "./payload.js";

/** Handle refresh export references. */
async function refreshNetherscrollsExportReferences(actor, payload) {
  // Canonical material artwork now arrives in the authorized export response.
  const nativePortrait = actor.flags?.[MODULE_ID]?.nativeCharacter?.ns_ImageLink;
  if (/^https?:\/\//i.test(nativePortrait ?? "")) {
    payload.actor.img = nativePortrait;
    try {
      await actor.update({ img: nativePortrait }, { render: false, netherscrollsTransfer: true });
    } catch (error) {
      reportNetherscrollsTransferItemError("Portrait", error);
    }
  }
}

/** Build image ready foundry export payload. */
async function buildNetherscrollsImageReadyFoundryExportPayload(actor, options = {}) {
  await yieldNetherscrollsMainThread();
  const payload = buildFoundryExportPayload(actor);
  await yieldNetherscrollsMainThread();
  return prepareNetherscrollsFoundryExportImages(actor, payload, options);
}

/** Resolve portable image URLs before transfer while sharing uploads across repeated references. */
async function prepareNetherscrollsFoundryExportImages(
  actor,
  payload,
  {
    apiKey = getNetherscrollsApiKey(),
    cache = new Map(),
    onImageProgress = null,
    guildId = undefined,
  } = {}
) {
  const actorData = payload?.actor;
  if (!actorData || typeof actorData !== "object") return payload;
  await refreshNetherscrollsExportReferences(actor, payload);

  const actorImage = toTrimmedStringOrNull(actorData.img);
  try {
    await replaceNetherscrollsExportImage(actor, actorData, {
      apiKey,
      guildId,
      cache,
      label: `${actorData.name ?? actor?.name ?? "character"} portrait`,
      isCharacter: true,
      onImageProgress,
    });
    if (actorImage && actorImage !== actorData.img) {
      replaceNetherscrollsExportTokenImage(payload?.preparedActor, actorImage, actorData.img);
    }
    await replaceNetherscrollsExportActorTokenImage(actor, actorData, payload?.preparedActor, {
      apiKey,
      guildId,
      cache,
      label: `${actorData.name ?? actor?.name ?? "character"} token`,
      onImageProgress,
    });
  } catch (error) {
    reportNetherscrollsTransferItemError("Character artwork", error);
  }

  const itemsById = new Map(
    Array.from(actor?.items ?? []).map(
      /** Transform each entry while prepare foundry export images. */ (item) => [
        String(item?.id ?? item?._id ?? ""),
        item,
      ]
    )
  );
  for (const itemData of Array.isArray(actorData.items) ? actorData.items : []) {
    if (!itemData || typeof itemData !== "object") continue;
    const foundryId = String(itemData._id ?? itemData.id ?? "");
    try {
      await replaceNetherscrollsExportImage(itemsById.get(foundryId) ?? null, itemData, {
        apiKey,
        guildId,
        cache,
        label: itemData.name ?? itemData.type ?? "item",
        onImageProgress,
      });
    } catch (error) {
      reportNetherscrollsTransferItemError(itemData.name ?? itemData.type, error);
    }
    await yieldNetherscrollsMainThread();
  }

  return payload;
}

/** Collect foundry export image jobs. */
function collectNetherscrollsFoundryExportImageJobs(payload) {
  const jobs = [];
  const seen = new Set();
  const add = /** Add. */ (image, module, label) => {
    if (!isNetherscrollsFoundryExportUploadCandidate(image)) return;
    const key = `${module}:${image}`;
    if (seen.has(key)) return;
    seen.add(key);
    jobs.push({ image, module, label });
  };

  const actorData = payload?.actor;
  if (!actorData || typeof actorData !== "object") return jobs;
  const actorName = actorData.name ?? "character";
  add(actorData.img, "characters", `${actorName} portrait`);
  add(actorData?.prototypeToken?.texture?.src, "characters", `${actorName} token`);
  for (const itemData of Array.isArray(actorData.items) ? actorData.items : []) {
    if (!itemData || typeof itemData !== "object") continue;
    add(
      itemData.img,
      getNetherscrollsExportImageModule(itemData, false),
      itemData.name ?? itemData.type ?? "item"
    );
  }
  return jobs;
}

/** Determine whether foundry export upload candidate. */
function isNetherscrollsFoundryExportUploadCandidate(value) {
  const image = toTrimmedStringOrNull(value);
  return Boolean(
    image &&
    image !== NETHERSCROLLS_DEFAULT_IMAGE &&
    !isNetherscrollsExportSvg(image) &&
    !isNetherscrollsExportImageReference(image) &&
    isFoundryServerImageReference(image)
  );
}

/** Replace export image. */
async function replaceNetherscrollsExportImage(
  document,
  data,
  { apiKey, guildId = undefined, cache, label, isCharacter = false, onImageProgress = null }
) {
  const image = toTrimmedStringOrNull(data?.img);
  if (!image || image === NETHERSCROLLS_DEFAULT_IMAGE || isNetherscrollsExportSvg(image)) return;

  const cachedSource = toTrimmedStringOrNull(data?.flags?.[MODULE_ID]?.exportedImageSource);
  const cachedKey = toTrimmedStringOrNull(data?.flags?.[MODULE_ID]?.exportedImageKey);
  const cachedUrl = toTrimmedStringOrNull(data?.flags?.[MODULE_ID]?.exportedImageUrl);
  const cachedImage =
    cachedKey && (cachedSource === image || cachedUrl === image)
      ? { key: cachedKey, url: cachedUrl }
      : null;
  if (!cachedImage && !isNetherscrollsFoundryExportUploadCandidate(image)) return;
  const module = getNetherscrollsExportImageModule(data, isCharacter);
  const cacheKey = `${module}:${image}`;
  const cachedUpload = cachedImage || cache.get(cacheKey);
  if (!cachedUpload) onImageProgress?.({ label, module });
  const uploadedImage =
    cachedUpload ||
    (await uploadNetherscrollsExportImage(image, { apiKey, guildId, label, module }));
  cache.set(cacheKey, uploadedImage);

  data.img = uploadedImage.url;
  replaceNetherscrollsExportTokenImage(data, image, uploadedImage.url);
  await cacheNetherscrollsExportImage(document, image, uploadedImage, { isCharacter });
}

/** Replace export actor token image. */
async function replaceNetherscrollsExportActorTokenImage(
  actor,
  actorData,
  preparedActor,
  { apiKey, guildId = undefined, cache, label, onImageProgress = null }
) {
  const image = toTrimmedStringOrNull(actorData?.prototypeToken?.texture?.src);
  if (!isNetherscrollsFoundryExportUploadCandidate(image)) return;

  const cacheKey = `characters:${image}`;
  const cachedUpload = cache.get(cacheKey);
  if (!cachedUpload) onImageProgress?.({ label, module: "characters" });
  const uploadedImage =
    cachedUpload ||
    (await uploadNetherscrollsExportImage(image, {
      apiKey,
      guildId,
      label,
      module: "characters",
    }));
  cache.set(cacheKey, uploadedImage);

  actorData.prototypeToken.texture.src = uploadedImage.url;
  replaceNetherscrollsExportTokenImage(preparedActor, image, uploadedImage.url);
  await cacheNetherscrollsExportActorTokenImage(actor, image, uploadedImage);
}

/** Handle cache export actor token image. */
async function cacheNetherscrollsExportActorTokenImage(actor, source, uploadedImage) {
  if (!actor?.update) return;
  try {
    const flags = duplicateNetherscrollsData(actor.flags ?? {});
    flags[MODULE_ID] = {
      ...(flags[MODULE_ID] ?? {}),
      exportedTokenImageSource: source,
      exportedTokenImageKey: uploadedImage.key,
      exportedTokenImageUrl: uploadedImage.url ?? "",
      exportedTokenImageSha256: uploadedImage.sha256 ?? "",
    };
    await actor.update(
      { flags, "prototypeToken.texture.src": uploadedImage.url },
      { render: false, netherscrollsTransfer: true }
    );
  } catch (err) {
    console.warn(
      `${MODULE_ID} | Unable to cache the Netherscrolls token image export reference.`,
      err
    );
    throw err;
  }
}

/** Replace export token image. */
function replaceNetherscrollsExportTokenImage(data, source, url) {
  const tokenImage = toTrimmedStringOrNull(data?.prototypeToken?.texture?.src);
  if (!url || !tokenImage || tokenImage !== source) return;
  data.prototypeToken.texture.src = url;
}

/** Determine whether export image reference. */
function isNetherscrollsExportImageReference(value) {
  const image = toTrimmedStringOrNull(value);
  if (!image || image === NETHERSCROLLS_DEFAULT_IMAGE || /^image\//i.test(image)) return true;
  try {
    const hostname = new URL(
      image,
      globalThis.location?.origin ?? "http://foundry.local"
    ).hostname.toLowerCase();
    return hostname === "netherscrolls.ca" || hostname.endsWith(".netherscrolls.ca");
  } catch {
    return false;
  }
}

/** Determine whether foundry server image reference. */
function isFoundryServerImageReference(value) {
  const image = toTrimmedStringOrNull(value);
  if (!image || /^(?:data|blob):/i.test(image)) return false;
  try {
    const origin = globalThis.location?.origin ?? "http://foundry.local";
    return new URL(image, origin).origin === new URL(origin).origin;
  } catch {
    return false;
  }
}

/** Determine whether export svg. */
function isNetherscrollsExportSvg(value) {
  const image = toTrimmedStringOrNull(value);
  if (!image) return false;
  try {
    return /\.svg$/i.test(
      new URL(image, globalThis.location?.origin ?? "http://foundry.local").pathname
    );
  } catch {
    return /\.svg(?:[?#]|$)/i.test(image);
  }
}

/** Retrieve export image module. */
function getNetherscrollsExportImageModule(data, isCharacter) {
  if (isCharacter) return "characters";
  const type = toTrimmedStringOrNull(data?.type)?.toLowerCase();
  if (["feats", "races", "backgrounds", "classes", "subclasses", "spells"].includes(type))
    return type;
  const moduleByType = {
    feat: "feats",
    race: "races",
    background: "backgrounds",
    class: "classes",
    subclass: "subclasses",
    spell: "spells",
  };
  if (moduleByType[type]) return moduleByType[type];
  return "items";
}

/** Upload artwork in the export's guild and retain structured API failures for the transfer workflow. */
async function uploadNetherscrollsExportImage(
  image,
  { apiKey, label, module, guildId = undefined }
) {
  if (!apiKey) throw new Error("Netherscrolls API Key is missing. Set it in Module Settings.");
  const imageResponse = await fetch(image);
  if (!imageResponse?.ok) {
    throw new Error(
      `Could not read the image for ${label ?? "this export"} before uploading it to Netherscrolls.`
    );
  }
  const blob = await imageResponse.blob();
  const sha256 = await getNetherscrollsImageSha256(blob);
  const formData = new FormData();
  formData.append("image", blob, getNetherscrollsExportImageFilename(image, blob?.type));
  formData.append("module", module);
  formData.append("sha256", sha256);
  formData.append("sourceRef", image);

  // Images belong to a guild: upload in the same guild as the export that uses them.
  // No Content-Type header: the browser adds the multipart boundary.
  const requestGuildId = getNetherscrollsRequestGuildId(guildId);
  const response = await fetch(NETHERSCROLLS_MEDIA_IMAGE_ENDPOINT, {
    method: "POST",
    headers: buildNetherscrollsApiHeaders({ apiKey, guildId: requestGuildId }),
    body: formData,
  });
  const result = await response
    .json()
    .catch(/** Handle the operation failure while upload export image. */ () => null);
  if (!response.ok) {
    throw await buildNetherscrollsApiError(
      response,
      result,
      `Image upload for ${label ?? "this export"}`,
      requestGuildId
    );
  }
  const key = toTrimmedStringOrNull(result?.data?.key ?? result?.key);
  if (!key)
    throw new Error(`Netherscrolls did not return an image key for ${label ?? "this export"}.`);
  const url = toTrimmedStringOrNull(result?.data?.url ?? result?.url);
  if (!url)
    throw new Error(`Netherscrolls did not return an image URL for ${label ?? "this export"}.`);
  return { key, url, sha256 };
}

/** Retrieve image sha256. */
async function getNetherscrollsImageSha256(blob) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("This Foundry browser does not support SHA-256 image hashing.");
  const digest = await subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(
    new Uint8Array(digest),
    /** Perform the callback while retrieve image sha256. */ (byte) =>
      byte.toString(16).padStart(2, "0")
  ).join("");
}

/** Retrieve export image filename. */
function getNetherscrollsExportImageFilename(image, contentType) {
  try {
    const pathname = new URL(image, globalThis.location?.origin ?? "http://foundry.local").pathname;
    const filename = pathname.split("/").pop();
    if (filename && /\.[a-z0-9]{2,5}$/i.test(filename)) return filename;
  } catch {
    // Use a safe generated filename below.
  }
  const extension =
    String(contentType ?? "")
      .split("/")[1]
      ?.replace(/[^a-z0-9]/gi, "") || "png";
  return `netherscrolls-export.${extension}`;
}

/** Handle cache export image. */
async function cacheNetherscrollsExportImage(
  document,
  source,
  uploadedImage,
  { isCharacter = false } = {}
) {
  if (!document?.update) return;
  try {
    const flags = duplicateNetherscrollsData(document.flags ?? {});
    flags[MODULE_ID] = {
      ...(flags[MODULE_ID] ?? {}),
      exportedImageSource: source,
      exportedImageKey: uploadedImage.key,
      exportedImageUrl: uploadedImage.url ?? "",
      exportedImageSha256: uploadedImage.sha256 ?? "",
    };
    const changes = {
      flags,
      ...(uploadedImage.url ? { img: uploadedImage.url } : {}),
    };
    const tokenImage = toTrimmedStringOrNull(document?.prototypeToken?.texture?.src);
    if (isCharacter && uploadedImage.url && tokenImage === source) {
      changes["prototypeToken.texture.src"] = uploadedImage.url;
    }
    await document.update(changes, { render: false, netherscrollsTransfer: true });
  } catch (err) {
    console.warn(`${MODULE_ID} | Unable to cache the Netherscrolls image export reference.`, err);
    if (isCharacter) throw err;
  }
}

export {
  buildNetherscrollsImageReadyFoundryExportPayload,
  collectNetherscrollsFoundryExportImageJobs,
  prepareNetherscrollsFoundryExportImages,
};
