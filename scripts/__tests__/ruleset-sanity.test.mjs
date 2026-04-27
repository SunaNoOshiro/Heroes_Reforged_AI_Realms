import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { repoRoot } from "../lib/repo-utils.mjs";

const rulesetPath = path.join(
  repoRoot,
  "content-schema",
  "examples",
  "records",
  "rulesets",
  "baseline.ruleset.json"
);

// Rational-aware evaluator for the formula AST. Every intermediate
// result is a {num, den} pair with integer components. This mirrors
// the fixed-point integer-only contract documented in
// content-schema/schemas/formula.schema.json.
function rat(num, den = 1) {
  if (!Number.isInteger(num) || !Number.isInteger(den)) {
    throw new Error(`non-integer rational ${num}/${den}`);
  }
  return { num, den };
}

function toInt(r) {
  if (r.den === 1) return r.num;
  return Math.trunc(r.num / r.den);
}

function add(a, b) {
  return rat(a.num * b.den + b.num * a.den, a.den * b.den);
}
function sub(a, b) {
  return rat(a.num * b.den - b.num * a.den, a.den * b.den);
}
function mul(a, b) {
  return rat(a.num * b.num, a.den * b.den);
}

function evaluate(node, scope) {
  switch (node.op) {
    case "const":
      return rat(node.value);
    case "var": {
      const parts = node.path.split(".");
      let current = scope;
      for (const part of parts) {
        if (current === undefined || current === null) {
          throw new Error(`var path ${node.path} missing at ${part}`);
        }
        current = current[part];
      }
      if (typeof current !== "number" || !Number.isInteger(current)) {
        throw new Error(`var ${node.path} did not resolve to an integer (got ${current})`);
      }
      return rat(current);
    }
    case "add":
      return node.args.map((arg) => evaluate(arg, scope)).reduce(add);
    case "sub": {
      const values = node.args.map((arg) => evaluate(arg, scope));
      return values.slice(1).reduce(sub, values[0]);
    }
    case "mul":
      return node.args.map((arg) => evaluate(arg, scope)).reduce(mul);
    case "divFloor": {
      const [numR, denR] = node.args.map((arg) => evaluate(arg, scope));
      const num = toInt(numR);
      const den = toInt(denR);
      if (den === 0) throw new Error("divFloor by zero");
      return rat(Math.trunc(num / den));
    }
    case "ratio": {
      const [numR, denR] = node.args.map((arg) => evaluate(arg, scope));
      return rat(toInt(numR), toInt(denR));
    }
    case "min":
      return node.args
        .map((arg) => toInt(evaluate(arg, scope)))
        .reduce((a, b) => rat(Math.min(a, b)));
    case "max":
      return node.args
        .map((arg) => toInt(evaluate(arg, scope)))
        .reduce((a, b) => rat(Math.max(a, b)));
    case "clamp": {
      const [value, lo, hi] = node.args.map((arg) => toInt(evaluate(arg, scope)));
      return rat(Math.max(lo, Math.min(hi, value)));
    }
    case "neg":
      return rat(-toInt(evaluate(node.args[0], scope)));
    case "abs":
      return rat(Math.abs(toInt(evaluate(node.args[0], scope))));
    default:
      throw new Error(`unknown op ${node.op}`);
  }
}

function permille(formula, ruleset, attacker, defender) {
  const scope = { ruleset, attacker, defender };
  const result = evaluate(formula, scope);
  return Math.trunc((result.num * 1000) / result.den);
}

test("baseline ruleset: constants match the point-based cap semantics", async () => {
  const ruleset = JSON.parse(await readFile(rulesetPath, "utf8"));
  const c = ruleset.constants;
  assert.equal(c.atkBonusPerPointNum, 1);
  assert.equal(c.atkBonusPerPointDen, 20);
  assert.equal(c.defReductionPerPointNum, 1);
  assert.equal(c.defReductionPerPointDen, 20);
  assert.equal(c.atkBonusCap, 60, "cap is in stat-differential points, not percent");
  assert.equal(c.defReductionCap, 60, "cap is in stat-differential points, not percent");
  assert.equal(c.fixedPointBasis, 1000);
  assert.equal(c.moraleExtraTurnProbNum, 1);
  assert.equal(c.moraleExtraTurnProbDen, 24);
  assert.equal(c.moralePenaltyMissProbNum, 1, "negative-morale miss prob must exist end-to-end");
  assert.equal(c.moralePenaltyMissProbDen, 24);
  assert.equal(c.luckDoubleProbNum, 1);
  assert.equal(c.luckDoubleProbDen, 24);
  assert.equal(c.moraleMax, 3);
  assert.equal(c.luckMax, 3);
});

test("baseline ruleset: attackBonus permille = 500 at ATK-DEF=10", async () => {
  const ruleset = JSON.parse(await readFile(rulesetPath, "utf8"));
  assert.equal(
    permille(ruleset.formulas.attackBonus, ruleset.constants, { attack: 10 }, { defense: 0 }),
    500,
    "ATK-DEF=10 must produce permille 500 (×1.5 attacker-side)"
  );
});

test("baseline ruleset: defenseMitigation permille = 500 at DEF-ATK=10", async () => {
  const ruleset = JSON.parse(await readFile(rulesetPath, "utf8"));
  assert.equal(
    permille(ruleset.formulas.defenseMitigation, ruleset.constants, { attack: 0 }, { defense: 10 }),
    500,
    "DEF-ATK=10 must produce permille 500 (×0.667 defender-side)"
  );
});

test("baseline ruleset: attackBonus clamps at cap for ATK-DEF=80", async () => {
  const ruleset = JSON.parse(await readFile(rulesetPath, "utf8"));
  assert.equal(
    permille(ruleset.formulas.attackBonus, ruleset.constants, { attack: 80 }, { defense: 0 }),
    3000,
    "cap=60 × (1/20) scaled to permille = 3000 (+300 %)"
  );
});

test("baseline ruleset: zero differential produces zero bonus", async () => {
  const ruleset = JSON.parse(await readFile(rulesetPath, "utf8"));
  assert.equal(
    permille(ruleset.formulas.attackBonus, ruleset.constants, { attack: 5 }, { defense: 5 }),
    0
  );
  assert.equal(
    permille(ruleset.formulas.defenseMitigation, ruleset.constants, { attack: 5 }, { defense: 5 }),
    0
  );
});
