/**
 * Let deep document-write loops report progress to whichever transfer is listening, without
 * threading a callback through every importer. Without a listener, reporting does nothing.
 */
import { MODULE_ID } from "./constants.js";

let netherscrollsProgressListener = null;

/** Route write progress to `listener` until the returned release function runs. */
function listenToNetherscrollsProgress(listener) {
  netherscrollsProgressListener = listener;
  return /** Stop listening, unless another transfer replaced the listener since. */ () => {
    if (netherscrollsProgressListener === listener) netherscrollsProgressListener = null;
  };
}

/** Report `{ planned }` once a write loop knows its size, then `{ written }` after each batch. */
function reportNetherscrollsProgress(event) {
  if (!netherscrollsProgressListener) return;
  try {
    netherscrollsProgressListener(event);
  } catch (err) {
    // A broken progress display must never fail the import itself.
    console.warn(`${MODULE_ID} | A progress listener failed.`, err);
  }
}

export { listenToNetherscrollsProgress, reportNetherscrollsProgress };
