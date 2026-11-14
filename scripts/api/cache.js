/**
 * Share the caches that must be invalidated together when credentials or guild change.
 * Pending results remain scoped so one guild cannot populate another guild's selection.
 */

const netherscrollsCharacterSelectionRefreshes = new Map();

const netherscrollsCampaignCache = {
  scope: null,
  campaigns: null,
  expiresAt: 0,
  pending: null,
};

export { netherscrollsCampaignCache, netherscrollsCharacterSelectionRefreshes };
