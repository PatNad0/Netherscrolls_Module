// Load the native rules before any Foundry integration registers its hooks.
import "./scripts/ns-effects.js";
import "./scripts/ns-features.js";
import "./scripts/ns-effects-foundry.js";
import { registerNetherscrollsHooks } from "./scripts/core/hooks.js";

// Temporary local-development check: confirms this script was executed, not just served.
globalThis.NETHERSCROLLS_DEV_CHECK = "kiwi12";

registerNetherscrollsHooks();
