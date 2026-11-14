/**
 * Parse and evaluate the supported formula language without executing JavaScript.
 * Preserve symbolic dice while resolving deterministic references and feature levels.
 */

/** Create effect formula language. */
function createEffectFormulaLanguage({ FEATURE_REFERENCE, FUNCTIONS, number, safeKey }) {
  // ---------------------------------------------------------------- formula language
  /** Reject unsupported tokens and bound dice complexity before building a formula tree. */
  function tokenize(input) {
    const tokens = [];
    let offset = 0,
      diceCount = 0,
      diceTerms = 0;
    while (offset < input.length) {
      const rest = input.slice(offset);
      const whitespace = /^\s+/.exec(rest);
      if (whitespace) {
        offset += whitespace[0].length;
        continue;
      }
      const match =
        /^(?:(\d*)[dD](\d+)(?![a-zA-Z0-9.])|(\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)|([a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9]+)*)|([+*/(),\-]))/.exec(
          rest
        );
      if (!match) throw new Error(`Invalid NS formula near ${rest.slice(0, 24)}`);
      offset += match[0].length;
      if (match[2]) {
        const count = Number(match[1] || 1),
          sides = Number(match[2]);
        diceCount += count;
        diceTerms++;
        if (count < 1 || sides < 1 || sides > 1000 || diceCount > 100 || diceTerms > 16)
          throw new Error("NS dice limit exceeded");
        tokens.push({ type: "dice", value: `${count}d${sides}` });
      } else if (match[3]) {
        const numeric = Number(match[3]);
        if (!Number.isFinite(numeric)) throw new Error("Non-finite NS number");
        tokens.push({ type: "number", value: numeric });
      } else if (match[4]) {
        if (
          match[4]
            .split(".")
            .some(
              /** Check whether any entry matches while handle tokenize. */ (key) => !safeKey(key)
            )
        )
          throw new Error("Unsafe NS reference");
        tokens.push({ type: "reference", value: match[4] });
      } else tokens.push({ type: match[5] });
      if (tokens.length > 128) throw new Error("NS formula token limit exceeded");
    }
    return { tokens, diceTerms };
  }

  /** Accept only the native arithmetic grammar; API formulas must never be evaluated as JavaScript. */
  function parseFormula(value) {
    if (value && typeof value === "object" && value.ast) return value;
    const input = typeof value === "number" ? String(value) : String(value ?? "").trim() || "0";
    if (input.length > 256) throw new Error("Invalid NS formula length");
    const { tokens, diceTerms } = tokenize(input);
    let cursor = 0,
      diceCalls = 0;
    const references = [];
    const atom = /** Handle atom. */ (depth) => {
      if (depth > 24) throw new Error("NS formula nesting limit exceeded");
      const token = tokens[cursor++];
      if (!token) throw new Error("Incomplete NS formula");
      if (token.type === "reference" && tokens[cursor]?.type === "(") {
        const name = token.value.toLowerCase();
        if (!FUNCTIONS[name]) throw new Error(`Unknown NS formula function "${token.value}"`);
        cursor++;
        const args = [];
        if (tokens[cursor]?.type !== ")") {
          do {
            args.push(expression(depth + 1));
          } while (tokens[cursor]?.type === "," && ++cursor);
        }
        if (tokens[cursor++]?.type !== ")")
          throw new Error(`Unclosed NS formula function "${name}"`);
        const [minimum, maximum] = FUNCTIONS[name];
        if (args.length < minimum || args.length > maximum)
          throw new Error(
            `${name} takes ${minimum === maximum ? minimum : `${minimum} to ${maximum}`} argument${maximum === 1 ? "" : "s"}`
          );
        if (name === "dice") diceCalls++;
        return { type: "call", name, args };
      }
      if (token.type === "reference") {
        references.push(token.value);
        return token;
      }
      if (["number", "dice"].includes(token.type)) return token;
      if (["+", "-"].includes(token.type))
        return { type: "unary", op: token.type, child: atom(depth + 1) };
      if (token.type === "(") {
        const node = expression(depth + 1);
        if (tokens[cursor++]?.type !== ")") throw new Error("Unclosed NS formula");
        return node;
      }
      throw new Error("Invalid NS formula term");
    };
    const product = /** Handle product. */ (depth) => {
      let node = atom(depth);
      while (["*", "/"].includes(tokens[cursor]?.type))
        node = { type: "binary", op: tokens[cursor++].type, left: node, right: atom(depth) };
      return node;
    };
    const expression = /** Handle expression. */ (depth) => {
      let node = product(depth);
      while (["+", "-"].includes(tokens[cursor]?.type))
        node = { type: "binary", op: tokens[cursor++].type, left: node, right: product(depth) };
      return node;
    };
    const ast = expression(0);
    if (cursor !== tokens.length) throw new Error("Unexpected NS formula token");
    if (diceTerms + diceCalls > 16) throw new Error("NS dice limit exceeded");
    return { ast, dice: diceTerms + diceCalls > 0, references };
  }

  const constant = /** Handle constant. */ (value) => ({
    value: number(value),
    formula: String(number(value)),
    dice: false,
  });

  const plus = /** Handle plus. */ (a, b) => ({
    value: a.value + b.value,
    formula: `(${a.formula}) + (${b.formula})`,
    dice: a.dice || b.dice,
  });

  // Evaluates a formula. `resolve(reference)` returns a number or a {value} result.
  // Dice contribute 0 to the fixed value and are kept in `formula` for roll time.
  /** Resolve deterministic references while retaining dice expressions for the eventual roll. */
  function formulaValue(formula, resolve) {
    const parsed = parseFormula(formula);
    const walk = /** Handle walk. */ (node) => {
      if (node.type === "number") return constant(node.value);
      if (node.type === "reference") {
        const resolved = resolve(node.value);
        const value = Number(resolved && typeof resolved === "object" ? resolved.value : resolved);
        if (!Number.isFinite(value))
          throw new Error(`Unresolved NS formula reference: ${node.value}`);
        return constant(value);
      }
      if (node.type === "dice") return { value: 0, formula: node.value, dice: true };
      if (node.type === "unary") {
        const child = walk(node.child);
        return {
          value: node.op === "-" ? -child.value : child.value,
          formula: `${node.op}(${child.formula})`,
          dice: child.dice,
        };
      }
      if (node.type === "call") {
        const args = node.args.map(walk);
        if (
          args.some(
            /** Check whether any entry matches while handle formula value. */ (arg) => arg.dice
          )
        )
          throw new Error(`${node.name}() arguments cannot contain dice`);
        const values = args.map(
          /** Transform each entry while handle formula value. */ (arg) => arg.value
        );
        if (node.name === "dice") {
          const [count, sides] = values;
          if (
            !Number.isInteger(count) ||
            count < 0 ||
            count > 100 ||
            !Number.isInteger(sides) ||
            sides < 2 ||
            sides > 1000
          ) {
            throw new Error("dice() needs a whole count from 0 to 100 and sides from 2 to 1000");
          }
          return count === 0 ? constant(0) : { value: 0, formula: `${count}d${sides}`, dice: true };
        }
        const value =
          node.name === "max"
            ? Math.max(...values)
            : node.name === "min"
              ? Math.min(...values)
              : node.name === "floor"
                ? Math.floor(values[0])
                : Math.ceil(values[0]);
        return constant(value);
      }
      const a = walk(node.left),
        b = walk(node.right);
      if (node.op === "/" && b.value === 0) throw new Error("Division by zero in NS formula");
      const value =
        node.op === "+"
          ? a.value + b.value
          : node.op === "-"
            ? a.value - b.value
            : node.op === "*"
              ? a.value * b.value
              : a.value / b.value;
      if (!Number.isFinite(value)) throw new Error("Non-finite NS formula result");
      return { value, formula: `(${a.formula}) ${node.op} (${b.formula})`, dice: a.dice || b.dice };
    };
    return walk(parsed.ast);
  }

  // Serializes a parsed formula. `ref` maps each reference (throwing when it cannot);
  // `dice(count, sides)` renders a dice() call.
  /** Render a validated formula tree through explicit reference and dice mappings. */
  function serialize(node, { ref, dice }, nested = false) {
    const wrap = /** Handle wrap. */ (text) => (nested ? `(${text})` : text);
    switch (node.type) {
      case "number":
        return node.value < 0 ? `(${node.value})` : String(node.value);
      case "dice":
        return node.value;
      case "reference": {
        const mapped = ref(node.value);
        if (mapped == null) throw new Error(`Unmapped reference ${node.value}`);
        return typeof mapped === "number"
          ? mapped < 0
            ? `(${mapped})`
            : String(mapped)
          : String(mapped);
      }
      case "unary": {
        const child = serialize(node.child, { ref, dice }, true);
        return node.op === "-" ? `-${child}` : child;
      }
      case "call": {
        const args = node.args.map(
          /** Transform each entry while serialize. */ (arg) => serialize(arg, { ref, dice })
        );
        return node.name === "dice" ? dice(args[0], args[1]) : `${node.name}(${args.join(", ")})`;
      }
      default:
        return wrap(
          `${serialize(node.left, { ref, dice }, true)} ${node.op} ${serialize(node.right, { ref, dice }, true)}`
        );
    }
  }

  // Feature references (class.level, classes.<slug>.level, level.total, attunement.count).
  function featureReference(reference, scope = {}) {
    const match = FEATURE_REFERENCE.exec(String(reference ?? ""));
    if (!match) return null;
    const lower = reference.toLowerCase();
    if (lower === "class.level") return number(scope.classLevel ?? scope.total);
    if (lower === "level.total") return number(scope.total);
    if (lower === "attunement.count") return number(scope.attunement);
    return number(scope.classes?.[match[1].toLowerCase()]);
  }

  const hasFeatureReference = /** Determine whether feature reference. */ (formula) => {
    try {
      return parseFormula(formula).references.some(
        /** Check whether any entry matches while create effect formula language. */ (reference) =>
          FEATURE_REFERENCE.test(reference)
      );
    } catch {
      return false;
    }
  };

  // Freezes feature references to numbers, as the API does when an effect is activated.
  /** Freeze caster and class level references when a reusable definition becomes an activated effect. */
  function bindFeatureReferences(formula, scope = {}) {
    const parsed = parseFormula(formula);
    if (
      !parsed.references.some(
        /** Check whether any entry matches while bind feature references. */ (reference) =>
          FEATURE_REFERENCE.test(reference)
      )
    )
      return typeof formula === "number" ? String(formula) : String(formula ?? "0");
    return serialize(parsed.ast, {
      ref: /** Handle ref. */ (reference) => featureReference(reference, scope) ?? reference,
      dice: /** Handle dice. */ (count, sides) => `dice(${count}, ${sides})`,
    });
  }

  return {
    bindFeatureReferences,
    constant,
    featureReference,
    formulaValue,
    hasFeatureReference,
    parseFormula,
    plus,
    serialize,
  };
}

export { createEffectFormulaLanguage };
