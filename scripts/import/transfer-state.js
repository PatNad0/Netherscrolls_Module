/**
 * Coordinate workflows that share the character library.
 * A library replacement cannot overlap character transfers or an active queue poll.
 */

const netherscrollsCharacterImportLocks = new Map();

const netherscrollsLibraryReplacementState = { active: false };

const netherscrollsQueuePollState = { running: false };

export {
  netherscrollsCharacterImportLocks,
  netherscrollsLibraryReplacementState,
  netherscrollsQueuePollState,
};
