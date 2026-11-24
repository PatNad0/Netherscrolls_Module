/**
 * Persist service identifiers on Foundry documents after successful transfers.
 * Keep writes separate from the read-only identity helpers used by converters.
 */
import { getActorNetherscrollsGuildId, normalizeNetherscrollsGuildId } from "../api/client.js";
import { MODULE_ID } from "../core/constants.js";
import { duplicateNetherscrollsData, replaceNetherscrollsDeletionKeys } from "../core/utils.js";
import { normalizeNetherscrollsReferenceValue } from "../data/references.js";

/** Update item nether id. */
async function setItemNetherId(item, id) {
  return setNetherscrollsItemIdentifiers(item, { id });
}

/** Update item identifiers. */
async function setNetherscrollsItemIdentifiers(
  item,
  { id = null, classId = null, inventoryId = null, kind = null, itemId = null } = {}
) {
  try {
    if (!item?.update) return;
    const canonicalId = normalizeNetherscrollsReferenceValue(id);
    const canonicalClassId = normalizeNetherscrollsReferenceValue(classId);
    const currentId = normalizeNetherscrollsReferenceValue(item?.flags?.netherscrolls?.id);
    const currentClassId = normalizeNetherscrollsReferenceValue(
      item?.flags?.netherscrolls?.classId
    );
    const needsId = Boolean(kind !== "personal" && canonicalId && currentId !== canonicalId);
    const needsClassId = Boolean(
      canonicalClassId && item?.type === "subclass" && currentClassId !== canonicalClassId
    );
    const inventoryFlags = inventoryId
      ? {
          inventoryId,
          ...(kind ? { kind } : {}),
          ...(kind === "catalogue" ? { itemId: itemId ?? canonicalId } : {}),
        }
      : {};
    const needsInventory = Object.entries(inventoryFlags).some(
      /** Check whether any entry matches while update item identifiers. */
      ([key, value]) => item.flags?.netherscrolls?.[key] !== value
    );
    if (
      !needsId &&
      !needsClassId &&
      !needsInventory &&
      !(kind === "personal" && (currentId || item.flags?.netherscrolls?.itemId))
    )
      return;

    const flags = duplicateNetherscrollsData(item?.flags ?? {});
    flags.netherscrolls = {
      ...(flags.netherscrolls ?? {}),
      ...(needsId ? { id: canonicalId } : {}),
      ...(needsClassId ? { classId: canonicalClassId } : {}),
      ...inventoryFlags,
    };
    if (kind === "personal") {
      delete flags.netherscrolls.itemId;
      delete flags.netherscrolls.id;
      flags.netherscrolls["-=itemId"] = null;
      flags.netherscrolls["-=id"] = null;
    }
    await item.update(replaceNetherscrollsDeletionKeys({ flags }, { update: true }), {
      render: false,
      netherscrollsTransfer: true,
    });
  } catch (err) {
    console.warn(`${MODULE_ID} | Unable to write canonical Netherscrolls Item flags.`, err);
    throw err;
  }
}

// Links an Actor to its Netherscrolls character and, in guild mode, to the guild
// that character lives in (flags.netherscrolls.guildId, a module-side convention).
async function setActorCharacterId(actor, characterId, { guildId = undefined } = {}) {
  try {
    const canonicalId = normalizeNetherscrollsReferenceValue(characterId);
    if (!actor?.update || !canonicalId) return;
    const canonicalGuildId = guildId === undefined ? "" : normalizeNetherscrollsGuildId(guildId);
    const current = normalizeNetherscrollsReferenceValue(actor?.flags?.netherscrolls?.characterId);
    const currentGuildId = getActorNetherscrollsGuildId(actor);
    if (current === canonicalId && (!canonicalGuildId || currentGuildId === canonicalGuildId))
      return;
    const flags = duplicateNetherscrollsData(actor?.flags ?? {});
    flags.netherscrolls = {
      ...(flags.netherscrolls ?? {}),
      characterId: canonicalId,
      ...(canonicalGuildId ? { guildId: canonicalGuildId } : {}),
    };
    await actor.update({ flags }, { render: false });
  } catch (err) {
    console.warn(`${MODULE_ID} | Unable to set actor flags.netherscrolls.characterId.`, err);
    throw err;
  }
}

export { setActorCharacterId, setNetherscrollsItemIdentifiers };
