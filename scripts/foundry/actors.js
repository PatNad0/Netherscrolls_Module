/**
 * Find imported actors by character identity within the request's guild.
 * Name fallback is limited to avoid matching an actor from another guild.
 */
import { getActorNetherscrollsGuildId, getNetherscrollsRequestGuildId } from "../api/client.js";
import { getActorCharacterId, normalizeNetherscrollsReferenceValue } from "../data/references.js";
import { getWorldActors } from "./collections.js";

/** Find actor by character id. */
function findNetherscrollsActorByCharacterId(
  characterId,
  characterName = null,
  { guildId = undefined } = {}
) {
  const id = normalizeNetherscrollsReferenceValue(characterId);
  if (!id) return null;
  // Character ids exist only inside their own guild: an Actor tagged with another
  // guild is never the same character, even with the same id or name.
  const guild = getNetherscrollsRequestGuildId(guildId);
  const actors = getWorldActors().filter(
    /** Keep entries that satisfy the condition while find actor by character id. */ (actor) => {
      const actorGuild = getActorNetherscrollsGuildId(actor);
      return !guild || !actorGuild || actorGuild === guild;
    }
  );
  const linked = actors.find(
    /** Find the matching entry while find actor by character id. */ (actor) =>
      String(getActorCharacterId(actor) ?? "") === id
  );
  if (linked) return linked;
  const normalizeName = /** Normalize name. */ (name) =>
    String(name ?? "")
      .normalize("NFC")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  const name = normalizeName(characterName);
  if (!name) return null;
  const matches = actors.filter(
    /** Keep entries that satisfy the condition while find actor by character id. */
    (actor) => actor.type === "character" && normalizeName(actor.name) === name
  );
  // A name can recover an unlinked Actor, but must never steal an existing
  // character link or pick arbitrarily between duplicate names.
  return matches.length === 1 && !getActorCharacterId(matches[0]) ? matches[0] : null;
}

export { findNetherscrollsActorByCharacterId };
