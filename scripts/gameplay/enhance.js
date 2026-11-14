/**
 * Enhance selected dice while retaining each roll's terms, modifiers, and message privacy.
 * Recompute only changed dice so unrelated rolls and already-resolved modifiers remain intact.
 */
import { MODULE_ID } from "../core/constants.js";
import { isDebugEnabled, isEnhancedDamageEnabled } from "../core/settings.js";
import {
  escapeHtml,
  renderFoundryTransferPayload,
  toNumber,
  toTrimmedStringOrNull,
} from "../core/utils.js";
import {
  extractDamageTypeTagsFromFormula,
  getItemDamageTypeByRollIndex,
  normalizeDamageTypeLabel,
  resolveMessageActor,
} from "./roll-context.js";
import { isEnhanceCountsObject, promptEnhanceRerollCounts } from "../ui/enhance-dialog.js";

/** Determine whether chat context application. */
function isChatContextApplication(app) {
  if (!app) return false;
  const name = String(app?.constructor?.name ?? "");
  if (/ChatLog|ChatPopout/i.test(name)) return true;
  const tabName = String(app?.tabName ?? "");
  return tabName === "chat";
}

/** Register enhance context option. */
function registerEnhanceContextOption(options) {
  if (!Array.isArray(options)) return;
  if (
    options.some(
      /** Check whether any entry matches while register enhance context option. */ (option) =>
        option?.name === "Enhance"
    )
  )
    return;

  options.push({
    name: "Enhance",
    icon: '<i class="fas fa-magic"></i>',
    condition: /** Handle condition. */ (li) => {
      if (!isEnhancedDamageEnabled()) return false;
      const message = getContextMenuMessage(li);
      return canEnhanceMessage(message);
    },
    callback: /** Handle callback. */ async (li) => {
      const message = getContextMenuMessage(li);
      if (!canEnhanceMessage(message)) return;
      await runEnhanceFlow(message);
    },
  });
}

/** Retrieve context menu message. */
function getContextMenuMessage(li) {
  const target =
    li?.[0] ??
    (typeof li?.get === "function" ? li.get(0) : null) ??
    (li instanceof HTMLElement ? li : null);
  const entry =
    target?.closest?.("[data-message-id], [data-document-id], [data-entry-id]") ?? target;

  const messageId =
    li?.data?.("messageId") ??
    li?.data?.("documentId") ??
    li?.data?.("entryId") ??
    li?.attr?.("data-message-id") ??
    li?.attr?.("data-document-id") ??
    li?.attr?.("data-entry-id") ??
    entry?.dataset?.messageId ??
    entry?.dataset?.documentId ??
    entry?.dataset?.entryId ??
    null;
  if (!messageId) return null;
  return game?.messages?.get(messageId) ?? null;
}

/** Determine whether enhance message. */
function canEnhanceMessage(message) {
  // Hidden rolls stay hidden: the dialog would otherwise reveal blind and whispered dice.
  if (!message?.isContentVisible) return false;
  return getEnhanceRolls(message).some(
    /** Check whether any entry matches while determine whether enhance message. */ (roll) =>
      getEnhanceDiceTerms(roll).some(
        /** Check whether any entry matches while determine whether enhance message. */ (term) =>
          term.results.some(isEnhanceableResult)
      )
  );
}

/** Determine whether enhanceable result. */
function isEnhanceableResult(result) {
  return (
    result?.active !== false &&
    result?.discarded !== true &&
    Number.isFinite(Number(result?.result))
  );
}

/** Retrieve enhance rolls. */
function getEnhanceRolls(message) {
  const messageRolls = Array.isArray(message?.rolls) ? message.rolls : [];
  const inlineRolls = parseEnhanceInlineRolls(message?.content).entries.map(
    /** Transform each entry while retrieve enhance rolls. */ (entry) => entry.roll
  );
  return [...messageRolls, ...inlineRolls];
}

// Results of [[1d6]] style rolls live in the message HTML rather than in message.rolls.
function parseEnhanceInlineRolls(content) {
  const html = String(content ?? "");
  const container = document.createElement("div");
  if (html.includes("inline-result")) container.innerHTML = html;

  const entries = [];
  for (const anchor of container.querySelectorAll("a.inline-roll.inline-result[data-roll]")) {
    try {
      entries.push({ anchor, roll: Roll.fromData(JSON.parse(unescape(anchor.dataset.roll))) });
    } catch (err) {
      console.warn(`${MODULE_ID} | Skipping unreadable inline roll.`, err);
    }
  }
  return { container, entries };
}

// Every die in a roll, including those nested in (...), {...} and math functions. Dice that decide
// how many dice or faces another term has, as in (1d4)d6, are left out: changing them would leave
// that term's results out of step with its formula.
function getEnhanceDiceTerms(roll) {
  const diceTerms = [];
  for (const term of Array.isArray(roll?.terms) ? roll.terms : []) {
    if (Array.isArray(term?.results) && Number(term?.faces) > 0) diceTerms.push(term);
    if (term?.roll) diceTerms.push(...getEnhanceDiceTerms(term.roll));
    if (Array.isArray(term?.rolls)) {
      for (const inner of term.rolls) diceTerms.push(...getEnhanceDiceTerms(inner));
    }
  }
  return diceTerms;
}

/** Retrieve enhance die label. */
function getEnhanceDieLabel(term) {
  const denomination = toTrimmedStringOrNull(term?.constructor?.DENOMINATION);
  return denomination && denomination !== "d" ? `d${denomination}` : `d${Number(term?.faces)}`;
}

/** Retrieve enhance roll label. */
function getEnhanceRollLabel(message, roll) {
  const candidates = [roll?.options?.flavor, message?.flavor, message?.flags?.dnd5e?.roll?.type];
  for (const candidate of candidates) {
    const raw = toTrimmedStringOrNull(candidate);
    if (!raw) continue;
    const text = toTrimmedStringOrNull(
      foundry?.utils?.stripHTML?.(raw) ?? raw.replace(/<[^>]*>/g, " ")
    );
    if (text) return text;
  }
  return "Roll";
}

/** Run enhance flow. */
async function runEnhanceFlow(message) {
  const typeResolution = [];
  const buckets = collectEnhanceBuckets(message, typeResolution);
  if (isDebugEnabled()) {
    await postEnhanceDebugMessage(
      message,
      "Enhance | Parsed Damage Data",
      buildEnhanceDebugSnapshot(message, buckets, typeResolution)
    );
  }
  if (!buckets.length) {
    ui?.notifications?.warn?.("Enhance: no dice were found in this message.");
    return;
  }

  let selectedCounts = await promptEnhanceRerollCounts(buckets);
  if (selectedCounts == null) return;
  if (!isEnhanceCountsObject(selectedCounts)) return;
  if (getSelectedEnhanceCountTotal(selectedCounts) <= 0) return;

  if (isDebugEnabled()) {
    await postEnhanceDebugMessage(message, "Enhance | Selected Counts", {
      selectedCounts,
      requested: getSelectedEnhanceCountTotal(selectedCounts),
    });
  }

  const result = await repostEnhancedMessage(message, buckets, selectedCounts);
  if (isDebugEnabled()) {
    await postEnhanceDebugMessage(message, "Enhance | Repost Result", result ?? null);
  }
}

/** Collect enhance buckets. */
function collectEnhanceBuckets(message, typeResolutionLog = null) {
  const buckets = new Map();
  const rolls = getEnhanceRolls(message);

  for (let rollIndex = 0; rollIndex < rolls.length; rollIndex += 1) {
    const roll = rolls[rollIndex];
    const isDamage = isDamageLikeRoll(message, roll, rollIndex);
    const rollLabel = isDamage
      ? getRollDamageType(message, roll, rollIndex, typeResolutionLog)
      : getEnhanceRollLabel(message, roll);
    const diceTerms = getEnhanceDiceTerms(roll);

    for (let termIndex = 0; termIndex < diceTerms.length; termIndex += 1) {
      const term = diceTerms[termIndex];
      const label = isDamage
        ? rollLabel
        : (toTrimmedStringOrNull(term?.flavor ?? term?.options?.flavor) ?? rollLabel);
      const dieLabel = getEnhanceDieLabel(term);
      const faces = Number(term.faces);

      const key = buildEnhanceBucketKey(label, dieLabel);
      const bucket = buckets.get(key) ?? { key, label, dieLabel, faces, dice: [] };
      buckets.set(key, bucket);

      for (let resultIndex = 0; resultIndex < term.results.length; resultIndex += 1) {
        const result = term.results[resultIndex];
        if (!isEnhanceableResult(result)) continue;

        bucket.dice.push({
          value: Number(result.result),
          rollIndex,
          termIndex,
          resultIndex,
          faces,
        });
      }
    }
  }

  const list = Array.from(buckets.values()).filter(
    /** Keep entries that satisfy the condition while collect enhance buckets. */ (bucket) =>
      bucket.dice.length > 0
  );
  for (const bucket of list) {
    bucket.dice.sort(
      /** Order the entries while collect enhance buckets. */
      (a, b) =>
        a.value - b.value ||
        a.rollIndex - b.rollIndex ||
        a.termIndex - b.termIndex ||
        a.resultIndex - b.resultIndex
    );
  }

  list.sort(
    /** Order the entries while collect enhance buckets. */ (a, b) => {
      const byLabel = String(a.label).localeCompare(String(b.label));
      return byLabel || a.faces - b.faces;
    }
  );

  return list;
}

/** Handle post enhance debug message. */
async function postEnhanceDebugMessage(message, title, data) {
  if (!isDebugEnabled()) return;
  try {
    const actor = resolveMessageActor(message);
    const speaker = actor
      ? ChatMessage.getSpeaker({ actor })
      : (message?.speaker ?? ChatMessage.getSpeaker());
    const safeTitle = escapeHtml(String(title ?? "Enhance Debug"));
    const content = `<p><strong>${safeTitle}</strong></p>${renderFoundryTransferPayload(data)}`;
    await ChatMessage.create({ speaker, content });
  } catch (err) {
    console.warn(`${MODULE_ID} | Failed to post enhance debug message.`, err);
  }
}

/** Build enhance debug snapshot. */
function buildEnhanceDebugSnapshot(message, buckets, typeResolutionLog) {
  const messageRolls = getEnhanceRolls(message);
  return {
    messageId: message?.id ?? null,
    messageSpeaker: sanitizeDebugValue(message?.speaker ?? null, 2),
    dnd5eFlags: sanitizeDebugValue(message?.flags?.dnd5e ?? null, 3),
    rolls: messageRolls.map(
      /** Transform each entry while build enhance debug snapshot. */ (roll, rollIndex) =>
        summarizeRollForDebug(roll, rollIndex)
    ),
    typeResolution: sanitizeDebugValue(typeResolutionLog ?? [], 4),
    buckets: summarizeEnhanceBuckets(buckets),
  };
}

/** Handle summarize roll for debug. */
function summarizeRollForDebug(roll, rollIndex) {
  const diceTerms = getEnhanceDiceTerms(roll).map(
    /** Transform each entry while handle summarize roll for debug. */ (term, termIndex) => ({
      termIndex,
      die: getEnhanceDieLabel(term),
      results: term.results
        .filter(isEnhanceableResult)
        .map(
          /** Transform each entry while handle summarize roll for debug. */ (result) =>
            Number(result.result)
        ),
      flavor: toTrimmedStringOrNull(term?.flavor ?? term?.options?.flavor),
    })
  );

  return {
    rollIndex,
    formula: toTrimmedStringOrNull(roll?.formula ?? roll?._formula),
    options: sanitizeDebugValue(roll?.options ?? null, 3),
    diceTerms,
  };
}

/** Handle summarize enhance buckets. */
function summarizeEnhanceBuckets(buckets) {
  if (!Array.isArray(buckets)) return [];
  return buckets.map(
    /** Transform each entry while handle summarize enhance buckets. */ (bucket) => ({
      key: bucket?.key ?? null,
      label: bucket?.label ?? null,
      die: bucket?.dieLabel ?? null,
      diceCount: Array.isArray(bucket?.dice) ? bucket.dice.length : 0,
      diceResults: Array.isArray(bucket?.dice)
        ? bucket.dice.map(
            /** Transform each entry while handle summarize enhance buckets. */ (die) => die?.value
          )
        : [],
    })
  );
}

/** Sanitize debug value. */
function sanitizeDebugValue(value, depth = 2) {
  if (depth <= 0) {
    if (Array.isArray(value)) return `[Array(${value.length})]`;
    if (value && typeof value === "object") return "[Object]";
    return value;
  }

  if (value == null) return value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    const limited = value.slice(0, 20);
    return limited.map(
      /** Transform each entry while sanitize debug value. */ (entry) =>
        sanitizeDebugValue(entry, depth - 1)
    );
  }

  if (typeof value === "object") {
    const out = {};
    const entries = Object.entries(value).slice(0, 40);
    for (const [key, entry] of entries) {
      out[key] = sanitizeDebugValue(entry, depth - 1);
    }
    return out;
  }

  return String(value);
}

/** Determine whether damage like roll. */
function isDamageLikeRoll(message, roll, rollIndex) {
  const rollType = String(roll?.options?.type ?? "").toLowerCase();
  if (/(damage|healing)/.test(rollType)) return true;

  const rollName = String(roll?.constructor?.name ?? "");
  if (/damage/i.test(rollName)) return true;

  const entry = getDnd5eFlaggedRollEntry(message, rollIndex);
  const entryType = String(entry?.type ?? "").toLowerCase();
  if (/(damage|healing)/.test(entryType)) return true;

  if ((Array.isArray(message?.rolls) ? message.rolls.length : 0) === 1) {
    const messageType = String(message?.flags?.dnd5e?.roll?.type ?? "").toLowerCase();
    if (/(damage|healing)/.test(messageType)) return true;
  }

  return false;
}

/** Retrieve dnd5e flagged roll entry. */
function getDnd5eFlaggedRollEntry(message, rollIndex) {
  const flagged = message?.flags?.dnd5e?.rolls;
  if (!Array.isArray(flagged)) return null;
  return flagged[rollIndex] ?? null;
}

/** Retrieve roll damage type. */
function getRollDamageType(message, roll, rollIndex, typeResolutionLog = null) {
  const entry = getDnd5eFlaggedRollEntry(message, rollIndex);
  const single = message?.flags?.dnd5e?.roll ?? {};
  const options = roll?.options ?? {};
  const terms = Array.isArray(roll?.terms) ? roll.terms : [];

  const trace = Array.isArray(typeResolutionLog)
    ? {
        rollIndex,
        formula: toTrimmedStringOrNull(roll?.formula ?? roll?._formula),
        candidates: [],
        fallback: null,
        resolved: null,
      }
    : null;

  const candidates = [];
  pushDamageTypeCandidate(candidates, "roll.options.type", options.type);
  pushDamageTypeCandidate(candidates, "roll.options.types", options.types);
  pushDamageTypeCandidate(candidates, "roll.options.rollType", options.rollType);
  pushDamageTypeCandidate(candidates, "roll.options.damageType", options.damageType);
  pushDamageTypeCandidate(candidates, "roll.options.damageTypes", options.damageTypes);
  pushDamageTypeCandidate(candidates, "roll.options.damage", options.damage);
  pushDamageTypeCandidate(candidates, "roll.options.parts", options.parts);
  pushDamageTypeCandidate(candidates, "roll.options.flavor", options.flavor);
  pushDamageTypeCandidate(candidates, "roll.flavor", roll?.flavor);
  pushDamageTypeCandidate(candidates, "roll.formula", roll?.formula);
  pushDamageTypeCandidate(candidates, "roll._formula", roll?._formula);

  pushDamageTypeCandidate(candidates, "flags.roll.damageType", entry?.damageType);
  pushDamageTypeCandidate(candidates, "flags.roll.damageTypes", entry?.damageTypes);
  pushDamageTypeCandidate(candidates, "flags.roll.damage", entry?.damage);
  pushDamageTypeCandidate(candidates, "flags.roll.parts", entry?.parts);
  pushDamageTypeCandidate(candidates, "flags.roll.options.damageType", entry?.options?.damageType);
  pushDamageTypeCandidate(
    candidates,
    "flags.roll.options.damageTypes",
    entry?.options?.damageTypes
  );
  pushDamageTypeCandidate(candidates, "flags.roll.options.damage", entry?.options?.damage);
  pushDamageTypeCandidate(candidates, "flags.roll.options.parts", entry?.options?.parts);
  pushDamageTypeCandidate(candidates, "flags.roll.options.type", entry?.options?.type);
  pushDamageTypeCandidate(candidates, "flags.roll.options.types", entry?.options?.types);
  pushDamageTypeCandidate(candidates, "flags.roll.options.flavor", entry?.options?.flavor);
  pushDamageTypeCandidate(candidates, "flags.roll.flavor", entry?.flavor);

  pushDamageTypeCandidate(candidates, "flags.single.type", single?.type);
  pushDamageTypeCandidate(candidates, "flags.single.types", single?.types);
  pushDamageTypeCandidate(candidates, "flags.single.damageType", single?.damageType);
  pushDamageTypeCandidate(candidates, "flags.single.damageTypes", single?.damageTypes);
  pushDamageTypeCandidate(candidates, "flags.single.damage", single?.damage);
  pushDamageTypeCandidate(candidates, "flags.single.parts", single?.parts);
  pushDamageTypeCandidate(candidates, "flags.single.options.type", single?.options?.type);
  pushDamageTypeCandidate(candidates, "flags.single.options.types", single?.options?.types);
  pushDamageTypeCandidate(
    candidates,
    "flags.single.options.damageType",
    single?.options?.damageType
  );
  pushDamageTypeCandidate(
    candidates,
    "flags.single.options.damageTypes",
    single?.options?.damageTypes
  );
  pushDamageTypeCandidate(candidates, "flags.single.options.damage", single?.options?.damage);
  pushDamageTypeCandidate(candidates, "flags.single.options.parts", single?.options?.parts);
  pushDamageTypeCandidate(candidates, "flags.single.options.flavor", single?.options?.flavor);
  pushDamageTypeCandidate(candidates, "flags.single.flavor", single?.flavor);

  const formulaTags = [
    ...extractDamageTypeTagsFromFormula(roll?.formula),
    ...extractDamageTypeTagsFromFormula(roll?._formula),
  ];
  for (let index = 0; index < formulaTags.length; index += 1) {
    pushDamageTypeCandidate(candidates, `roll.formulaTag[${index}]`, formulaTags[index]);
  }

  for (let termIndex = 0; termIndex < terms.length; termIndex += 1) {
    const term = terms[termIndex];
    pushDamageTypeCandidate(candidates, `roll.terms[${termIndex}].flavor`, term?.flavor);
    pushDamageTypeCandidate(
      candidates,
      `roll.terms[${termIndex}].options.flavor`,
      term?.options?.flavor
    );
    pushDamageTypeCandidate(
      candidates,
      `roll.terms[${termIndex}].options.damageType`,
      term?.options?.damageType
    );
    pushDamageTypeCandidate(
      candidates,
      `roll.terms[${termIndex}].options.damageTypes`,
      term?.options?.damageTypes
    );
    pushDamageTypeCandidate(
      candidates,
      `roll.terms[${termIndex}].options.damage`,
      term?.options?.damage
    );
    pushDamageTypeCandidate(
      candidates,
      `roll.terms[${termIndex}].options.parts`,
      term?.options?.parts
    );
    pushDamageTypeCandidate(candidates, `roll.terms[${termIndex}].type`, term?.type);
  }

  for (const candidate of candidates) {
    const normalized = normalizeDamageTypeLabel(candidate.value);
    if (trace) {
      trace.candidates.push({
        source: candidate.source,
        raw: sanitizeDebugValue(candidate.value, 3),
        normalized,
      });
    }
    if (normalized && !/^(damage|healing)$/i.test(normalized)) {
      if (trace) {
        trace.resolved = { source: candidate.source, value: normalized };
        typeResolutionLog.push(trace);
      }
      return normalized;
    }
  }

  const contentType = getContentDamageTypeByRollIndex(message, rollIndex);
  if (contentType) {
    if (trace) {
      trace.fallback = "message.content";
      trace.resolved = { source: "message.content", value: contentType };
      typeResolutionLog.push(trace);
    }
    return contentType;
  }

  const itemType = getItemDamageTypeByRollIndex(message, rollIndex);
  if (itemType) {
    if (trace) {
      trace.fallback = "item.damage.parts";
      trace.resolved = { source: "item.damage.parts", value: itemType };
      typeResolutionLog.push(trace);
    }
    return itemType;
  }

  const kind = String(options.type ?? entry?.type ?? single?.type ?? "").toLowerCase();
  if (kind === "healing") {
    if (trace) {
      trace.fallback = "roll.kind";
      trace.resolved = { source: "roll.kind", value: "healing" };
      typeResolutionLog.push(trace);
    }
    return "healing";
  }
  if (trace) {
    trace.fallback = "default";
    trace.resolved = { source: "default", value: "damage" };
    typeResolutionLog.push(trace);
  }
  return "damage";
}

/** Handle push damage type candidate. */
function pushDamageTypeCandidate(candidates, source, value) {
  if (value == null) return;
  candidates.push({ source, value });
}

/** Build enhance bucket key. */
function buildEnhanceBucketKey(label, dieLabel) {
  return `${String(label ?? "Roll")}::${dieLabel}`;
}

/** Retrieve selected enhance count total. */
function getSelectedEnhanceCountTotal(selectedCounts) {
  if (!selectedCounts || typeof selectedCounts !== "object") return 0;
  return Object.values(selectedCounts).reduce(
    /** Combine entries into a result while retrieve selected enhance count total. */
    (sum, value) => sum + Math.max(0, Math.floor(toNumber(value, 0))),
    0
  );
}

/** Retrieve content damage type by roll index. */
function getContentDamageTypeByRollIndex(message, rollIndex) {
  const content = toTrimmedStringOrNull(message?.content);
  if (!content) return null;

  const matches = [];
  const attrRegexes = [
    /data-damage-type="([^"]+)"/gi,
    /data-type="([^"]+)"/gi,
    /data-damagetype="([^"]+)"/gi,
  ];

  for (const regex of attrRegexes) {
    let match;
    while ((match = regex.exec(content)) !== null) {
      const normalized = normalizeDamageTypeLabel(match[1]);
      if (normalized) matches.push(normalized);
    }
  }

  if (!matches.length) {
    const keys = Object.keys(CONFIG?.DND5E?.damageTypes ?? {});
    if (keys.length) {
      const tokenRegex = new RegExp(`\\b(${keys.map(escapeRegex).join("|")})\\b`, "gi");
      let match;
      while ((match = tokenRegex.exec(content)) !== null) {
        const normalized = normalizeDamageTypeLabel(match[1]);
        if (normalized) matches.push(normalized);
      }
    }
  }

  const unique = [];
  const seen = new Set();
  for (const type of matches) {
    const key = String(type).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(type);
  }

  if (!unique.length) return null;
  return unique[rollIndex] ?? (unique.length === 1 ? unique[0] : null);
}

/** Escape regex. */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const ENHANCE_REAPPLIED_MODIFIERS = new Set([
  "keep",
  "drop",
  "countSuccess",
  "countFailures",
  "countEven",
  "countOdd",
  "deductFailures",
  "subtractFailures",
  "minimum",
  "maximum",
  "call",
]);

// Modifiers whose outcome depends on the values rolled. Reroll and explode modifiers are not listed:
// they add dice, so the dice they already added stay and a new value does not trigger them again.
function getEnhanceModifierSteps(term) {
  const known = term?.constructor?.MODIFIERS ?? {};
  const commands = Object.keys(known)
    .sort(
      /** Order the entries while retrieve enhance modifier steps. */ (a, b) => b.length - a.length
    )
    .map(escapeRegex)
    .join("|");
  const pattern = commands ? new RegExp(`(${commands})[^A-z\\s()+\\-*/]*`, "gi") : null;
  const steps = [];

  for (const entry of Array.isArray(term?.modifiers) ? term.modifiers : []) {
    const sequence = String(entry).toLowerCase();

    // Checked first because a d20 can be restored as a plain Die, which would read "adv" and "dis" as
    // its "d" (drop) modifier. dnd5e's own handler cannot be re-run: it discards its data after rolling.
    if (/^(adv|dis)\d*$/.test(sequence)) {
      steps.push({
        restoresDropped: true,
        apply: /** Apply. */ () => reapplyEnhanceAdvantage(term, sequence),
      });
      continue;
    }
    if (!pattern) continue;

    for (const [modifier, command] of sequence.matchAll(pattern)) {
      const handler = known[command];
      const method = typeof handler === "string" ? handler : handler?.name;
      const fn = typeof handler === "string" ? term[handler] : handler;
      if (!ENHANCE_REAPPLIED_MODIFIERS.has(method) || typeof fn !== "function") continue;
      steps.push({
        restoresDropped: method === "keep" || method === "drop",
        apply: /** Apply. */ () => fn.call(term, modifier),
      });
    }
  }
  return steps;
}

/** Handle reapply enhance advantage. */
function reapplyEnhanceAdvantage(term, modifier) {
  const [, mode, extra] = modifier.match(/^(adv|dis)(\d*)$/);
  const setCount = parseInt(extra || "1", 10) + 1;
  const eligible = term.results.filter(
    /** Keep entries that satisfy the condition while handle reapply enhance advantage. */ (
      result
    ) => !(result.rerolled && result.active === false)
  );
  const size = Math.max(1, Math.floor(eligible.length / setCount));

  const sets = [];
  for (let index = 0; index < setCount; index += 1) {
    const results = eligible.slice(index * size, (index + 1) * size);
    if (results.length) {
      sets.push({
        results,
        total: results.reduce(
          /** Combine entries into a result while handle reapply enhance advantage. */ (
            sum,
            result
          ) => sum + result.result,
          0
        ),
      });
    }
  }

  const target = Math[mode === "adv" ? "max" : "min"](
    ...sets.map(
      /** Transform each entry while handle reapply enhance advantage. */ (set) => set.total
    )
  );
  const kept = sets.find(
    /** Find the matching entry while handle reapply enhance advantage. */ (set) =>
      set.total === target
  );
  for (const set of sets) {
    if (set === kept) continue;
    for (const result of set.results) {
      result.discarded = true;
      result.active = false;
    }
  }
}

/** Reapply only supported deterministic modifiers after replacing dice; preserve prior reroll and explosion history. */
async function reapplyEnhanceModifiers(term) {
  const steps = getEnhanceModifierSteps(term);

  if (steps.length) {
    const restoresDropped = steps.some(
      /** Check whether any entry matches while handle reapply enhance modifiers. */ (step) =>
        step.restoresDropped
    );
    for (const result of term.results) {
      if (restoresDropped && result.discarded) {
        result.active = true;
        delete result.discarded;
      }
      delete result.count;
      delete result.success;
      delete result.failure;
      // On a die that still counts this came from min/max. A die replaced by a reroll modifier is inactive.
      if (result.active !== false) delete result.rerolled;
    }
    for (const step of steps) await step.apply();
  }

  // Fate dice flag their success or failure when rolled rather than through a modifier.
  if (term.constructor?.DENOMINATION === "f") {
    for (const result of term.results) {
      delete result.success;
      delete result.failure;
      if (result.result === 1) result.success = true;
      if (result.result === -1) result.failure = true;
    }
  }
}

// Recalculates totals from the changed dice outward, through any pools, functions and parentheses.
/** Re-evaluate changed terms and their totals without rerunning unrelated dice or resolved explosion chains. */
async function recomputeEnhancedRoll(roll, changedTerms) {
  let changed = false;

  for (const term of roll.terms) {
    if (changedTerms.has(term)) {
      await reapplyEnhanceModifiers(term);
      changed = true;
      continue;
    }

    if (term?.roll && (await recomputeEnhancedRoll(term.roll, changedTerms))) changed = true;
    if (!Array.isArray(term?.rolls)) continue;

    let innerChanged = false;
    for (const inner of term.rolls) {
      if (await recomputeEnhancedRoll(inner, changedTerms)) innerChanged = true;
    }
    if (!innerChanged) continue;
    changed = true;

    if (Array.isArray(term.results)) {
      term.rolls.forEach(
        /** Process each entry while handle recompute enhanced roll. */ (inner, index) => {
          if (term.results[index]) term.results[index].result = inner.total;
        }
      );
      await reapplyEnhanceModifiers(term);
    } else {
      const fn = term.function ?? Math[term.fn];
      if (typeof fn === "function") {
        const args = term.rolls.map(
          /** Transform each entry while handle recompute enhanced roll. */ (inner) =>
            inner.product ?? inner.total
        );
        term.result = Number(await fn.apply(term, args));
      }
    }
  }

  if (changed) roll._total = roll._evaluateTotal();
  return changed;
}

/** Update enhance inline anchor. */
function updateEnhanceInlineAnchor(anchor, roll) {
  anchor.dataset.roll = escape(JSON.stringify(roll));
  const label = anchor.lastChild;
  if (label?.nodeType === 3) {
    label.textContent = label.textContent.replace(/-?\d+(?:\.\d+)?\s*$/, String(roll.total));
  }
}

/** Replace the chosen lowest dice and recompute affected terms while preserving the rest of the message's rolls. */
async function applyEnhanceRerolls(source, message, buckets, selectedCounts) {
  const messageRolls = Array.isArray(message?.rolls) ? message.rolls : [];
  const inline = parseEnhanceInlineRolls(source?.content);

  const diceByRoll = new Map();
  for (const bucket of buckets) {
    const rawCount = selectedCounts?.[bucket.key] ?? 0;
    const count = Math.max(0, Math.min(bucket.dice.length, Math.floor(toNumber(rawCount, 0))));
    for (const die of bucket.dice.slice(0, count)) {
      if (!diceByRoll.has(die.rollIndex)) diceByRoll.set(die.rollIndex, []);
      diceByRoll.get(die.rollIndex).push(die);
    }
  }

  const rerolled = new Map();
  let inlineChanged = false;
  let changedDiceCount = 0;

  for (const [rollIndex, dice] of diceByRoll) {
    const messageRoll = messageRolls[rollIndex];
    const inlineEntry = inline.entries[rollIndex - messageRolls.length];
    const roll = messageRoll
      ? messageRoll.constructor.fromData(JSON.parse(JSON.stringify(messageRoll)))
      : inlineEntry?.roll;
    if (!roll) continue;

    const diceTerms = getEnhanceDiceTerms(roll);
    const changedTerms = new Set();
    for (const die of dice) {
      const term = diceTerms[die.termIndex];
      const result = term?.results?.[die.resultIndex];
      if (!result) continue;
      // The term rolls its own face so coins, fate dice and custom dice stay in their real range.
      result.result = term.randomFace();
      changedTerms.add(term);
      changedDiceCount += 1;
    }
    if (!changedTerms.size) continue;

    await recomputeEnhancedRoll(roll, changedTerms);
    if (messageRoll) {
      rerolled.set(rollIndex, roll);
    } else {
      updateEnhanceInlineAnchor(inlineEntry.anchor, roll);
      inlineChanged = true;
    }
  }

  source.rolls = messageRolls.map(
    /** Transform each entry while apply enhance rerolls. */ (roll, index) =>
      JSON.stringify(rerolled.get(index) ?? roll)
  );
  if (inlineChanged) source.content = inline.container.innerHTML;

  return changedDiceCount;
}

/** Preserve the original message's visibility and context when publishing the enhanced result. */
async function repostEnhancedMessage(message, buckets = null, selectedCounts = null) {
  try {
    const source = foundry?.utils?.deepClone?.(message.toObject()) ?? message.toObject();
    let changedDiceCount = 0;
    const requested = getSelectedEnhanceCountTotal(selectedCounts);
    if (Array.isArray(buckets) && selectedCounts) {
      changedDiceCount = await applyEnhanceRerolls(source, message, buckets, selectedCounts);
      if (requested > 0 && changedDiceCount === 0) {
        ui?.notifications?.warn?.("Enhance: no dice could be rerolled from this message.");
        return {
          success: false,
          reason: "no-dice-rerolled",
          requested,
          changedDiceCount,
        };
      }
    }
    delete source._id;
    delete source._stats;
    // Non-GMs may only create messages as themselves, even when enhancing someone else's roll.
    source.author = game?.user?.id ?? source.author;
    source.timestamp = Date.now();
    const created = await ChatMessage.create(source);
    return {
      success: true,
      requested,
      changedDiceCount,
      messageId: created?.id ?? null,
    };
  } catch (err) {
    console.error(`${MODULE_ID} | Enhance failed.`, err);
    ui?.notifications?.error?.("Enhance failed. Check console for details.");
    return {
      success: false,
      reason: "exception",
      error: String(err?.message ?? err),
    };
  }
}

export { isChatContextApplication, registerEnhanceContextOption };
