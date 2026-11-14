// Documentation-based probes, not a running Foundry world. Writes observed failures.
const fs = require("node:fs");
const { load, clone } = require("../tests/ns-harness.cjs");
const c = load(),
  NS = c.NetherscrollsEffects;
const rows = [];
/** Check. */
function check(name, expected, actual) {
  rows.push({ name, expected, actual, pass: JSON.stringify(expected) === JSON.stringify(actual) });
}
const changes = /** Handle changes. */ (stat, bonus = 2) =>
  clone(NS.toFoundryChanges({ stat, bonus }));
for (const [stat, key] of [
  ["abilities.str.score", "system.abilities.str.value"],
  ["savingThrows.dex.bonus", "system.abilities.dex.bonuses.save"],
  ["skills.stealth.bonus", "system.skills.ste.bonuses.check"],
  ["tools.thievesTools.bonus", "system.tools.thief.bonuses.check"],
  ["armorClass", "system.attributes.ac.bonus"],
  ["initiative", "system.attributes.init.bonus"],
  ["proficiencyBonus", "system.attributes.prof"],
  ["SaveDC", "system.bonuses.spell.dc"],
])
  check(stat + " additive key/mode", [{ key, mode: 2, value: "2" }], changes(stat));
check("Ability absolute override", 5, changes("abilities.str.score.totalOverride")[0]?.mode);
check("All-save bonus broadcasts", 6, changes("savingThrows.all.bonus").length);
check(
  "Conditional effect is not made unconditional",
  [],
  clone(NS.toFoundryChanges({ stat: "SaveDC", bonus: 2, filters: { spellClasses: ["wizard"] } }))
);
check(
  "Unsupported stat reference is not silently replaced",
  [],
  changes("armorClass", "skills.stealth.total")
);
check(
  "Supported ability modifier formula",
  "@abilities.int.mod",
  changes("SaveDC", "abilities.int.mod")[0]?.value
);
check("Roll dice preserved", "1d4", changes("savingThrows.dex.bonus", "1d4")[0]?.value);
check("Dice forbidden for AC", [], changes("armorClass", "1d4"));
const native = {
  _id: "probe",
  proficiencyBonus: { value: 3, misc: 0, bonus: 0 },
  abilities: Object.fromEntries(
    NS.ABILITIES.map(/** Transform each entry. */ (k) => [k, { score: 14, misc: 0, bonus: 0 }])
  ),
  armorClass: { value: 10 },
  hp: { current: 20, max: 20, temp: 0 },
  skills: {},
  tools: {},
  savingThrows: {},
  initiative: { ability: "dex" },
  advanced: { spellcastingAbility: "int" },
};
/** Handle actor. */
function actor(effect) {
  const data = {
    type: "character",
    name: "Semantic probe",
    system: {},
    flags: {},
    prototypeToken: {},
  };
  c.normalizeNetherscrollsCharacterActorCreationData(data, clone(native));
  const a = {
    ...clone(data),
    _source: clone(data),
    id: "probe",
    uuid: "Actor.probe",
    documentName: "Actor",
    items: [],
    effects: [NS.createEffect(effect, { actor: true })],
  };
  NS.foundry.prepare(a);
  return a;
}
// D&D5e 5.3.3 attack-data.mjs getAttackData chooses actorBonus by action type,
// independently of the chosen ability. Model that documented input to our hook.
for (const [name, stat, ability, kind, wanted] of [
  ["STR melee receives STR bonus", "ToHitStr", "str", "mwak", 2],
  ["DEX ranged receives DEX bonus", "ToHitDext", "dex", "rwak", 2],
  ["DEX melee receives DEX bonus", "ToHitDext", "dex", "mwak", 2],
  ["DEX melee excludes STR bonus", "ToHitStr", "dex", "mwak", 0],
  ["STR ranged receives STR bonus", "ToHitStr", "str", "rwak", 2],
  ["STR ranged excludes DEX bonus", "ToHitDext", "str", "rwak", 0],
]) {
  const a = actor({ stat, bonus: 2 });
  const subject = {
    actor: a,
    ability,
    item: { type: "weapon", system: {}, flags: {} },
    attack: { type: { value: kind === "mwak" ? "melee" : "ranged", classification: "weapon" } },
  };
  const roll = {
    parts: ["@mod", "@prof", "@actorBonus"],
    data: { mod: 2, prof: 3, actorBonus: Number(a.system.bonuses[kind].attack) },
  };
  NS.foundry.modifyRoll("attack", { subject }, roll);
  const total = roll.parts.reduce(
    /** Combine entries into a result. */ (n, p) =>
      n +
      NS.formulaValue(String(roll.data[p.slice(1)]), /** Perform the callback. */ () => undefined)
        .value,
    0
  );
  check(name, 5 + wanted, total);
}
// Reverse translation cannot widen a melee-only spell attack bonus to ranged too.
const reverse = NS.fromFoundryChange({
  key: "system.bonuses.msak.attack",
  mode: 2,
  value: "2",
}).entries;
check(
  "Melee-only spell attack round trip retains scope",
  ["system.bonuses.msak.attack"],
  reverse.flatMap(
    /** Perform the callback. */ (e) =>
      NS.toFoundryChanges(e).map(/** Transform each entry. */ (x) => x.key)
  )
);
const result = {
  scope: "Module behavior with documented D&D5e 5.3.3 roll inputs; not live engine execution",
  passed: rows.filter(/** Keep entries that satisfy the condition. */ (r) => r.pass).length,
  failed: rows.filter(/** Keep entries that satisfy the condition. */ (r) => !r.pass).length,
  rows,
};
fs.writeFileSync("tmp/ns-audit/bonus-semantics.json", JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
if (result.failed) process.exitCode = 1;
