/**
 * Attach native feature definitions to stable item activity records.
 * Reuse matching activities so repeated translation preserves identity and player usage.
 */

/** Create native feature translation. */
function createNativeFeatureTranslation({ MODULE, NS, build, clone, uses }) {
  /** Reuse authoritative native definitions and reconcile their generated projections with existing item data. */
  function translateItem(item, source) {
    if (!item.system) return;
    const features = Array.isArray(source.features)
      ? source.features
      : source.title || source.featureType
        ? [source]
        : [];
    item.system.activities ??= {};
    features.forEach(
      /** Process each entry while translate item. */ (feature, index) => {
        if (!feature.featureType && !feature.usage && !feature.consumption) return;
        const featureId = feature._id ?? feature.id;
        const existing = Object.values(item.system.activities).find(
          /** Find the matching entry while translate item. */ (a) => {
            const flags = a.flags?.netherscrolls;
            return (
              flags &&
              ((featureId &&
                (flags.nativeFeatureId === featureId || flags.featureEffects?.id === featureId)) ||
                (flags.itemFeature && flags.featureIndex === index))
            );
          }
        );
        let id =
          existing?._id ??
          NS.stableId(`native-feature:${source._id ?? source.id}:${featureId ?? index}`);
        while (!existing && item.system.activities[id]) id = NS.stableId(`${id}:next`);
        const native = Object.fromEntries(
          [
            "_id",
            "id",
            "name",
            "title",
            "description",
            "featureType",
            "formula",
            "attackModifier",
            "attackBonus",
            "attackDamage",
            "dc",
            "saveAbility",
            "damage",
            "onSave",
            "usage",
            "consumption",
            "effectApplication",
            "action",
            "level",
            "eligibility",
          ]
            .filter(
              /** Keep entries that satisfy the condition while translate item. */ (k) =>
                feature[k] !== undefined
            )
            .map(/** Transform each entry while translate item. */ (k) => [k, clone(feature[k])])
        );
        if (!featureId) native.sourcePath = `features.${index}`;
        try {
          const activity = build(native, existing, {
            total: feature.level ?? 1,
            classLevel: feature.level ?? 1,
          });
          activity._id = id;
          activity.flags.netherscrolls = {
            ...activity.flags.netherscrolls,
            itemFeature: true,
            featureIndex: index,
            nativeFeatureId: featureId,
          };
          activity.flags[MODULE] = { ...activity.flags[MODULE], nativeFeature: native };
          item.system.activities[id] = activity;
          if (feature.usage?.pool)
            item.system.uses = uses(feature.usage, { classLevel: feature.level ?? 1 });
        } catch (error) {
          if (existing) existing.flags.netherscrolls.conversionWarning = error.message;
          else throw error;
        }
      }
    );
  }

  return { translateItem };
}

export { createNativeFeatureTranslation };
