/**
 * Translate native effect entries and Foundry changes at one compatibility boundary.
 * Retain mode and condition semantics so round trips do not widen an effect's scope.
 */

/** Create effect translation. */
function createEffectTranslation({
  ABILITIES,
  ABILITY,
  FOUNDRY_MODES,
  MOVEMENT,
  ORDERED_MODES,
  SENSES,
  SKILLS,
  SKILL_BY_FOUNDRY,
  TOOLS,
  TOOL_ABILITY_STAT,
  TOOL_BY_FOUNDRY,
  TRAIT_GRANTS,
  clone,
  diceAllowed,
  grantValue,
  hasFilters,
  isGrantStat,
  isModeStat,
  parseFormula,
  safeKey,
  serialize,
  slug,
}) {
  // ---------------------------------------------------------------- Foundry <-> NS translation
  function foundryMode(change) {
    // Foundry 14 names modes by string `type`; reading its numeric `mode` logs a deprecation.
    const raw = change?.type ?? change?.mode;
    if (typeof raw === "number") return FOUNDRY_MODES[raw] ?? "custom";
    const name = String(raw ?? "add").toLowerCase();
    return FOUNDRY_MODES.includes(name) ? name : "custom";
  }

  /** Handle foundry reference. */
  function foundryReference(path) {
    let match;
    if (path === "prof" || path === "attributes.prof") return "proficiencyBonus.total";
    if ((match = new RegExp(`^abilities\\.${ABILITY}\\.mod$`).exec(path)))
      return `abilities.${match[1]}.mod`;
    if ((match = new RegExp(`^abilities\\.${ABILITY}\\.(?:value|total)$`).exec(path)))
      return `abilities.${match[1]}.total`;
    if (path === "details.level") return "level.total";
    if ((match = /^classes\.([a-z][\w-]*)\.levels$/i.exec(path)))
      return `classes.${slug(match[1])}.level`;
    if (path === "attributes.ac.value") return "armorClass.total";
    if (path === "attributes.hp.max") return "hp.max.total";
    if (path === "attributes.init.total") return "initiative.total";
    if (path === "attributes.spelldc" || path === "attributes.spell.dc") return "SaveDC.total";
    // D&D5e 3.x exposes a save as a number, 4.x as an object with .value.
    if ((match = new RegExp(`^abilities\\.${ABILITY}\\.save(?:\\.value)?$`).exec(path)))
      return `savingThrows.${match[1]}.total`;
    if ((match = /^(skills|tools)\.([a-z0-9]+)\.total$/i.exec(path))) {
      const family = match[1].toLowerCase();
      const nsKey = (family === "skills" ? SKILL_BY_FOUNDRY : TOOL_BY_FOUNDRY)[match[2]];
      return nsKey ? `${family}.${nsKey}.total` : null;
    }
    if ((match = new RegExp(`^attributes\\.movement\\.(${MOVEMENT.join("|")})$`).exec(path)))
      return `speed.${match[1]}`;
    if (
      (match = new RegExp(`^attributes\\.senses\\.(?:ranges\\.)?(${SENSES.join("|")})$`).exec(path))
    )
      return `senses.${match[1]}`;
    if ((match = new RegExp(`^abilities\\.${ABILITY}\\.max$`).exec(path)))
      return `abilities.${match[1]}.max`;
    return null;
  }

  // Converts a Foundry change value to an NS formula, or null when it cannot be read.
  function foundryFormula(value) {
    if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
    if (typeof value === "boolean") return value ? "1" : "0";
    let text = String(value ?? "").trim();
    if (/^true$/i.test(text)) return "1";
    if (/^false$/i.test(text)) return "0";
    if (!text) return null;
    let failed = false;
    text = text.replace(
      /@([A-Za-z0-9_.-]+)/g,
      /** Perform the callback while handle foundry formula. */ (_, path) => {
        const mapped = foundryReference(path);
        if (mapped == null) failed = true;
        return mapped ?? "0";
      }
    );
    if (failed) return null;
    try {
      parseFormula(text);
      return text;
    } catch {
      return null;
    }
  }

  // Foundry keys that Netherscrolls owns. Every other key stays applied by D&D5e.
  function foundryTargets(key) {
    let match;
    if ((match = new RegExp(`^system\\.abilities\\.${ABILITY}\\.value$`).exec(key)))
      return [{ stat: `abilities.${match[1]}.score` }];
    if ((match = new RegExp(`^system\\.abilities\\.${ABILITY}\\.proficient$`).exec(key)))
      return [{ stat: `savingThrows.${match[1]}.prof` }];
    if ((match = new RegExp(`^system\\.abilities\\.${ABILITY}\\.bonuses\\.save$`).exec(key)))
      return [{ stat: `savingThrows.${match[1]}.bonus` }];
    if ((match = /^system\.(skills|tools)\.([a-z0-9]+)\.(value|bonuses\.check)$/i.exec(key))) {
      const family = match[1].toLowerCase();
      const nsKey =
        (family === "skills" ? SKILL_BY_FOUNDRY : TOOL_BY_FOUNDRY)[match[2]] ??
        (safeKey(match[2]) ? match[2] : null);
      return nsKey
        ? [{ stat: `${family}.${nsKey}.${match[3] === "value" ? "prof" : "bonus"}` }]
        : null;
    }
    if ((match = /^system\.currency\.(pp|gp|sp|cp)$/.exec(key)))
      return [{ stat: `currency.${match[1]}` }];
    if ((match = /^system\.spells\.spell([1-9])\.override$/.exec(key)))
      return [{ stat: `spellSlots.max.lvl${match[1]}`, absolute: true }];
    // Grant stats: each value of the change becomes one grant.
    if ((match = /^system\.traits\.([A-Za-z]+\.(?:value|bypasses))$/.exec(key))) {
      const stat = Object.keys(TRAIT_GRANTS).find(
        /** Find the matching entry while handle foundry targets. */ (name) =>
          TRAIT_GRANTS[name] === match[1]
      );
      return stat ? [{ stat, grant: "set" }] : null;
    }
    if (key === "system.attributes.init.roll.mode")
      return [{ stat: "initiative.rollMode", grant: "rollMode" }];
    if (
      (match = new RegExp(`^system\\.abilities\\.${ABILITY}\\.(save|check)\\.roll\\.mode$`).exec(
        key
      ))
    ) {
      return [
        {
          stat:
            match[2] === "save"
              ? `savingThrows.${match[1]}.rollMode`
              : `abilities.${match[1]}.checkRollMode`,
          grant: "rollMode",
        },
      ];
    }
    if ((match = /^system\.(skills|tools)\.([a-z0-9]+)\.(roll\.mode|ability)$/i.exec(key))) {
      const family = match[1].toLowerCase();
      if (family === "skills" && match[3] === "ability") return null;
      const nsKey =
        (family === "skills" ? SKILL_BY_FOUNDRY : TOOL_BY_FOUNDRY)[match[2]] ??
        (safeKey(match[2]) ? match[2] : null);
      if (!nsKey) return null;
      return [
        match[3] === "ability"
          ? { stat: `tools.${nsKey}.ability`, grant: "ability" }
          : { stat: `${family}.${nsKey}.rollMode`, grant: "rollMode" },
      ];
    }
    // Mode stats keep the change's mode.
    if (
      (match = new RegExp(`^system\\.attributes\\.movement\\.(${MOVEMENT.join("|")})$`).exec(key))
    )
      return [{ stat: `speed.${match[1]}`, modeStat: true }];
    if (
      (match = new RegExp(
        `^system\\.attributes\\.senses\\.(?:ranges\\.)?(${SENSES.join("|")})$`
      ).exec(key))
    )
      return [{ stat: `senses.${match[1]}`, modeStat: true }];
    if ((match = new RegExp(`^system\\.abilities\\.${ABILITY}\\.max$`).exec(key)))
      return [{ stat: `abilities.${match[1]}.max`, modeStat: true }];
    if ((match = new RegExp(`^system\\.abilities\\.${ABILITY}\\.bonuses\\.check$`).exec(key)))
      return [{ stat: `checks.${match[1]}.bonus` }];
    // D&D5e splits weapon bonuses by melee/ranged, Netherscrolls by attack ability: a
    // mwak/rwak change is both the STR and the DEX bonus for that kind of attack.
    const split = /** Handle split. */ (kind, part, attackKind) =>
      ["Str", "Dext"].map(
        /** Transform each entry while handle foundry targets. */ (ability) => ({
          stat: `${part === "attack" ? "ToHit" : "Damage"}${ability}.bonus`,
          filters: { attackKinds: [attackKind] },
          split: true,
        })
      );
    const fixed = {
      "system.attributes.ac.bonus": [{ stat: "armorClass.bonus" }],
      "system.attributes.init.bonus": [{ stat: "initiative.bonus" }],
      "system.attributes.prof": [{ stat: "proficiencyBonus" }],
      "system.bonuses.mwak.attack": split("mwak", "attack", "melee"),
      "system.bonuses.rwak.attack": split("rwak", "attack", "ranged"),
      "system.bonuses.msak.attack": [
        { stat: "ToHitMagic.bonus", filters: { attackKinds: ["melee"] } },
      ],
      "system.bonuses.rsak.attack": [
        { stat: "ToHitMagic.bonus", filters: { attackKinds: ["ranged"] } },
      ],
      "system.bonuses.mwak.damage": split("mwak", "damage", "melee"),
      "system.bonuses.rwak.damage": split("rwak", "damage", "ranged"),
      "system.bonuses.msak.damage": [
        { stat: "DamageMagic.bonus", filters: { attackKinds: ["melee"] } },
      ],
      "system.bonuses.rsak.damage": [
        { stat: "DamageMagic.bonus", filters: { attackKinds: ["ranged"] } },
      ],
      "system.bonuses.abilities.check": [{ stat: "checks.all.bonus" }],
      "system.bonuses.spell.dc": [{ stat: "SaveDC.bonus" }],
      "system.bonuses.abilities.save": [{ stat: "savingThrows.all.bonus" }],
      "system.attributes.hp.bonuses.overall": [{ stat: "hp.max" }],
      "system.attributes.hp.bonuses.level": [{ stat: "hp.max", perLevel: true }],
      "system.attributes.hp.max": [{ stat: "hp.max" }],
      "system.attributes.hp.temp": [{ stat: "hp.temp" }],
      "system.attributes.exhaustion": [{ stat: "exhaustion" }],
      "system.details.xp.value": [{ stat: "xp" }],
    };
    return fixed[key] ?? null;
  }

  // Returns null for a Foundry-owned key; otherwise {entries, acCalc?, warning?}.
  // "+N, to a maximum of the cap" written as a Foundry override of the score:
  // min(@abilities.X.max, @abilities.X.value + N), or the fixed-cap form
  // @abilities.X.value + N > 20 ? 20 : @abilities.X.value + N (20 is the default maximum).
  function cappedScoreChange(key, value) {
    const ability = new RegExp(`^system\\.abilities\\.${ABILITY}\\.value$`).exec(key)?.[1];
    if (!ability) return null;
    const text = String(value ?? "").replace(/\s+/g, "");
    const score = `@abilities\\.${ability}\\.value`,
      cap = `@abilities\\.${ability}\\.max`,
      amount = "(\\d+(?:\\.\\d+)?)";
    const match =
      new RegExp(`^min\\(${cap},${score}\\+${amount}\\)$`).exec(text) ??
      new RegExp(`^min\\(${score}\\+${amount},${cap}\\)$`).exec(text);
    if (match)
      return { stat: `abilities.${ability}.score`, bonus: `+${Number(match[1])}`, upToMax: true };
    const fixed = new RegExp(`^${score}\\+${amount}>20\\?20:${score}\\+${amount}$`).exec(text);
    if (fixed && fixed[1] === fixed[2])
      return { stat: `abilities.${ability}.score`, bonus: `+${Number(fixed[1])}`, upToMax: true };
    return null;
  }

  // The grant values of a Foundry change on a grant key: a set member list, a roll-mode
  // sign or an ability. Returns {values, invalid} or null when the change is not a grant.
  function foundryGrantValues(target, change, mode) {
    if (target.grant === "set") {
      // D&D5e traits are added with ADD; older items use CUSTOM with the same value.
      if (!["add", "custom"].includes(mode)) return null;
      const raw = Array.isArray(change.value)
        ? change.value
        : String(change.value ?? "").split(/[,;]/);
      const values = raw
        .map(
          /** Transform each entry while handle foundry grant values. */ (value) =>
            String(value).trim().toLowerCase()
        )
        .filter(Boolean);
      return {
        values: values
          .map(
            /** Transform each entry while handle foundry grant values. */ (value) =>
              grantValue(target.stat, value)
          )
          .filter(Boolean),
        invalid: values.filter(
          /** Keep entries that satisfy the condition while handle foundry grant values. */ (
            value
          ) => grantValue(target.stat, value) == null
        ),
      };
    }
    if (target.grant === "rollMode") {
      if (!["add", "override"].includes(mode)) return null;
      const sign = Math.sign(Number(change.value));
      if (!Number.isFinite(sign)) return { values: [], invalid: [String(change.value)] };
      return { values: sign > 0 ? ["advantage"] : sign < 0 ? ["disadvantage"] : [], invalid: [] };
    }
    // A tool ability is only replaced by an override; D&D5e ignores CUSTOM here.
    if (mode !== "override") return null;
    const value = grantValue(target.stat, change.value);
    return value
      ? { values: [value], invalid: [] }
      : { values: [], invalid: [String(change.value)] };
  }

  /** Preserve the scope and mode of a Foundry change, or report why it cannot be represented natively. */
  function fromFoundryChange(change) {
    const key = String(change?.key ?? "").trim();
    if (/^system\.attributes\.ac\.(?:calc|formula|flat)$/.test(key))
      return { acCalc: true, entries: [] };
    const targets = foundryTargets(key);
    if (!targets) return null;
    const mode = foundryMode(change);
    if (targets[0].grant) {
      const grant = foundryGrantValues(targets[0], change, mode);
      if (!grant)
        return mode === "custom"
          ? null
          : { entries: [], warning: `${mode} change on ${key} is not translated` };
      return {
        entries: grant.values.map(
          /** Transform each entry while convert from foundry change. */ (value) => ({
            stat: targets[0].stat,
            grant: value,
          })
        ),
        ...(grant.invalid.length
          ? {
              warning: `"${grant.invalid.join(", ")}" on ${key} is not a Netherscrolls ${targets[0].stat} value`,
            }
          : {}),
      };
    }
    if (["override", "custom"].includes(mode)) {
      const capped = cappedScoreChange(key, change.value);
      if (capped) return { entries: [capped] };
    }
    if (mode === "custom")
      return { entries: [], warning: `custom change on ${key} is not translated` };
    const formula = foundryFormula(change.value);
    if (formula == null)
      return { entries: [], warning: `"${change.value}" on ${key} is not a Netherscrolls formula` };
    if (targets[0].modeStat) {
      // Netherscrolls mode stats take the Foundry mode as is ("add" is the default).
      const entry = { stat: targets[0].stat, bonus: formula };
      if (mode !== "add") entry.mode = mode;
      return { entries: [entry] };
    }
    return {
      entries: targets.map(
        /** Transform each entry while convert from foundry change. */ (target) => {
          const override = mode === "override" || (target.absolute && mode !== "add");
          const entry = {
            stat: override ? `${target.stat}.totalOverride` : target.stat,
            bonus: target.perLevel ? `(${formula}) * level.total` : formula,
          };
          if (target.filters) entry.filters = clone(target.filters);
          if (ORDERED_MODES.has(mode) && !override) entry.mode = mode;
          if (target.group) entry._nsGroup = target.group;
          return entry;
        }
      ),
    };
  }

  /** Handle ns reference to foundry. */
  function nsReferenceToFoundry(reference, scope = {}, derived = true) {
    let match;
    if (/^class\.level$/i.test(reference))
      return scope.classIdentifier ? `@classes.${scope.classIdentifier}.levels` : "@details.level";
    if (/^level\.total$/i.test(reference)) return "@details.level";
    if ((match = /^classes\.([a-z][a-z0-9]*)\.level$/i.exec(reference)))
      return `@classes.${match[1].toLowerCase()}.levels`;
    if ((match = new RegExp(`^abilities\\.${ABILITY}\\.mod$`).exec(reference)))
      return `@abilities.${match[1]}.mod`;
    const target = reference.replace(/\.total$/, "");
    if ((match = new RegExp(`^abilities\\.${ABILITY}(?:\\.score)?$`).exec(target)))
      return `@abilities.${match[1]}.value`;
    if (target === "proficiencyBonus") return "@prof";
    // Mode-stat references are stored actor fields, readable during preparation.
    if ((match = new RegExp(`^speed\\.(${MOVEMENT.join("|")})$`).exec(target)))
      return `@attributes.movement.${match[1]}`;
    if ((match = new RegExp(`^senses\\.(${SENSES.join("|")})$`).exec(target)))
      return `@attributes.senses.ranges.${match[1]}`;
    if ((match = new RegExp(`^abilities\\.${ABILITY}\\.max$`).exec(target)))
      return `@abilities.${match[1]}.max`;
    // Derived D&D5e totals (5.x roll-data paths). D&D5e computes these after applying
    // effects, so they are only offered to fields it evaluates at roll time (ROLL_TIME_KEY).
    if (!derived) return null;
    if (target === "SaveDC") return "@attributes.spell.dc";
    if ((match = new RegExp(`^savingThrows\\.${ABILITY}$`).exec(target)))
      return `@abilities.${match[1]}.save.value`;
    if ((match = /^(skills|tools)\.([^.]+)$/.exec(target))) {
      const foundryKey = (match[1] === "skills" ? SKILLS : TOOLS)[match[2]]?.[0];
      return foundryKey ? `@${match[1]}.${foundryKey}.total` : null;
    }
    return null;
  }

  // Real Foundry changes for an unconditional NS effect, so D&D5e applies it to any actor
  // (an NPC target of an activity, an actor without a Netherscrolls character). On
  // Netherscrolls actors the runtime recalculates these fields, so they never count twice.
  // D&D5e bonus fields passed to the roll as formulas and evaluated with full roll data.
  // Every other field is resolved during preparation, before derived totals exist.
  const ROLL_TIME_KEY =
    /^system\.(?:abilities\.[a-z]+\.bonuses\.save|(?:skills|tools)\.[^.]+\.bonuses\.check|bonuses\.[mr][ws]ak\.attack)$/;

  /** Convert to foundry changes. */
  function toFoundryChanges(entry, scope = {}) {
    // All or nothing: changes such as ac.calc + ac.flat only make sense together.
    const changes = projectChanges(entry, scope);
    return changes.every(
      /** Check whether all entries match while convert to foundry changes. */ (change) =>
        change.value != null
    )
      ? changes
      : [];
  }

  // A grant becomes ADD changes (D&D5e sums roll modes and cancels advantage against disadvantage).
  function grantChanges(entry) {
    const value = grantValue(entry.stat, entry.grant);
    if (value == null) return [];
    if (Object.hasOwn(TRAIT_GRANTS, entry.stat))
      return [{ key: `system.traits.${TRAIT_GRANTS[entry.stat]}`, mode: 2, value }];
    let match;
    if ((match = TOOL_ABILITY_STAT.exec(entry.stat))) {
      const foundryKey = TOOLS[match[1]]?.[0];
      return foundryKey ? [{ key: `system.tools.${foundryKey}.ability`, mode: 5, value }] : [];
    }
    const sign = value === "advantage" ? "1" : "-1";
    const roll = /** Handle roll. */ (key) => ({ key, mode: 2, value: sign });
    if (entry.stat === "initiative.rollMode") return [roll("system.attributes.init.roll.mode")];
    if (
      (match = new RegExp(`^savingThrows\\.(${ABILITY.slice(1, -1)}|all)\\.rollMode$`).exec(
        entry.stat
      ))
    ) {
      return (match[1] === "all" ? ABILITIES : [match[1]]).map(
        /** Transform each entry while handle grant changes. */ (ability) =>
          roll(`system.abilities.${ability}.save.roll.mode`)
      );
    }
    if ((match = new RegExp(`^abilities\\.${ABILITY}\\.checkRollMode$`).exec(entry.stat)))
      return [roll(`system.abilities.${match[1]}.check.roll.mode`)];
    if ((match = /^(skills|tools)\.([^.]+)\.rollMode$/.exec(entry.stat))) {
      const foundryKey = (match[1] === "skills" ? SKILLS : TOOLS)[match[2]]?.[0];
      return foundryKey ? [roll(`system.${match[1]}.${foundryKey}.roll.mode`)] : [];
    }
    return [];
  }

  /** Project only mechanics Foundry can apply with the same scope; leave roll-time-only bonuses to the adapter. */
  function projectChanges(entry, scope) {
    if (!entry?.stat) return [];
    const scopedSpellAttack =
      /^(?:ToHitMagic(?:\.(?:misc|bonus))?|DamageMagic\.bonus)$/.test(entry.stat) &&
      Object.keys(entry.filters ?? {}).every(
        /** Check whether all entries match while project changes. */ (key) => key === "attackKinds"
      ) &&
      Array.isArray(entry.filters?.attackKinds) &&
      entry.filters.attackKinds.length > 0 &&
      entry.filters.attackKinds.every(
        /** Check whether all entries match while project changes. */ (kind) =>
          ["melee", "ranged"].includes(kind)
      );
    if (hasFilters(entry) && !scopedSpellAttack) return [];
    if (isGrantStat(entry.stat)) return grantChanges(entry);
    let parsed;
    try {
      parsed = parseFormula(entry.bonus);
    } catch {
      return [];
    }
    if (parsed.dice && !diceAllowed(entry.stat)) return [];
    const render = /** Render. */ (derived) => {
      try {
        return serialize(parsed.ast, {
          ref: /** Handle ref. */ (reference) => nsReferenceToFoundry(reference, scope, derived),
          dice: /** Handle dice. */ (count, sides) => `(${count})d(${sides})`,
        });
      } catch {
        return null;
      }
    };
    const value = render(true),
      early = render(false);
    if (value == null) return [];
    const override = entry.stat.endsWith(".totalOverride");
    const stat = entry.stat.replace(/\.totalOverride$/, "");
    const valueFor = /** Handle value for. */ (key) => (ROLL_TIME_KEY.test(key) ? value : early);
    const add = /** Add. */ (key) => ({ key, mode: 2, value: valueFor(key) });
    const set = /** Update. */ (key) => ({ key, mode: 5, value: valueFor(key) });
    let match;
    // Mode stats keep their mode as the D&D5e change mode; they take no .totalOverride.
    if (isModeStat(stat)) {
      if (override) return [];
      const mode = { multiply: 1, add: 2, downgrade: 3, upgrade: 4, override: 5 }[
        entry.mode ?? "add"
      ];
      if (!mode) return [];
      const [family, name] = stat.split(".");
      const key =
        family === "speed"
          ? `system.attributes.movement.${name}`
          : family === "senses"
            ? `system.attributes.senses.ranges.${name}`
            : `system.abilities.${name}.max`;
      return [{ key, mode, value: early }];
    }
    if ((match = new RegExp(`^abilities\\.${ABILITY}(?:\\.(score|misc|bonus))?$`).exec(stat))) {
      if (override && match[2] && match[2] !== "score") return [];
      // "+N, to a maximum of the cap" (as the API projects it).
      if (entry.upToMax && !override) {
        return early == null
          ? []
          : [
              {
                key: `system.abilities.${match[1]}.value`,
                mode: 5,
                value: `min(@abilities.${match[1]}.max, @abilities.${match[1]}.value + (${early}))`,
              },
            ];
      }
      return [(override ? set : add)(`system.abilities.${match[1]}.value`)];
    }
    if ((match = new RegExp(`^checks\\.(all|${ABILITY.slice(1, -1)})\\.bonus$`).exec(stat))) {
      if (override) return [];
      return [
        add(
          match[1] === "all"
            ? "system.bonuses.abilities.check"
            : `system.abilities.${match[1]}.bonuses.check`
        ),
      ];
    }
    if ((match = new RegExp(`^savingThrows\\.(${ABILITY.slice(1, -1)}|all)\\.prof$`).exec(stat))) {
      const abilities = match[1] === "all" ? ABILITIES : [match[1]];
      return abilities.map(
        /** Transform each entry while project changes. */ (ability) =>
          (override ? set : add)(`system.abilities.${ability}.proficient`)
      );
    }
    if (
      (match = new RegExp(
        `^savingThrows\\.(${ABILITY.slice(1, -1)}|all)(?:\\.(misc|bonus))?$`
      ).exec(stat))
    ) {
      if (override) return [];
      return (match[1] === "all" ? ABILITIES : [match[1]]).map(
        /** Transform each entry while project changes. */ (ability) =>
          add(`system.abilities.${ability}.bonuses.save`)
      );
    }
    if ((match = /^(skills|tools)\.([^.]+)(?:\.(prof|misc|bonus))?$/.exec(stat))) {
      const foundryKey = (match[1] === "skills" ? SKILLS : TOOLS)[match[2]]?.[0];
      if (!foundryKey) return [];
      if (match[3] === "prof")
        return [(override ? set : add)(`system.${match[1]}.${foundryKey}.value`)];
      return override ? [] : [add(`system.${match[1]}.${foundryKey}.bonuses.check`)];
    }
    if ((match = /^armorClass(?:\.(misc|bonus))?$/.exec(stat))) {
      if (!override) return [add("system.attributes.ac.bonus")];
      return match[1]
        ? []
        : [
            { key: "system.attributes.ac.calc", mode: 5, value: "flat" },
            set("system.attributes.ac.flat"),
          ];
    }
    if (/^initiative(?:\.(misc|bonus))?$/.test(stat))
      return override ? [] : [add("system.attributes.init.bonus")];
    if ((match = /^proficiencyBonus(?:\.(misc|bonus))?$/.exec(stat)))
      return override && match[1] ? [] : [(override ? set : add)("system.attributes.prof")];
    // Physical attack bonuses are ability-based, not melee/ranged. Apply at roll time.
    const attacks = {
      ToHitStr: [],
      ToHitDext: [],
      ToHitMagic: scopedSpellAttack
        ? [...new Set(entry.filters.attackKinds)].map(
            /** Transform each entry while project changes. */ (kind) =>
              kind === "melee" ? "msak" : "rsak"
          )
        : ["msak", "rsak"],
    };
    if ((match = /^(ToHitStr|ToHitDext|ToHitMagic)(?:\.(misc|bonus))?$/.exec(stat)))
      return override
        ? []
        : attacks[match[1]].map(
            /** Transform each entry while project changes. */ (kind) =>
              add(`system.bonuses.${kind}.attack`)
          );
    // Damage bonuses: spell attacks map to msak/rsak; STR/DEX damage is added at roll time.
    if (stat === "DamageMagic.bonus")
      return override
        ? []
        : attacks.ToHitMagic.map(
            /** Transform each entry while project changes. */ (kind) =>
              add(`system.bonuses.${kind}.damage`)
          );
    if (/^Damage(?:Str|Dext)\.bonus$/.test(stat)) return [];
    if (/^SaveDC(?:\.(misc|bonus))?$/.test(stat))
      return override ? [] : [add("system.bonuses.spell.dc")];
    // These require system preparation adapters: HP differs by actor/calculation mode,
    // and D&D5e rebuilds exhaustion from its condition before preparing consequences.
    if (stat === "hp.max" || stat === "exhaustion") return [];
    return [];
  }

  return { foundryFormula, foundryMode, foundryTargets, fromFoundryChange, toFoundryChanges };
}

export { createEffectTranslation };
