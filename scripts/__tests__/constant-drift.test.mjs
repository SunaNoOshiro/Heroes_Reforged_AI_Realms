import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { readFile, readdir } from "node:fs/promises";
import { repoRoot } from "../lib/repo-utils.mjs";

/**
 * Cross-doc constant-drift guard.
 *
 * The baseline ruleset JSON is the single source of truth for combat
 * constants. Any Markdown file that names one of these keys with a
 * literal integer (shape: `<key> = 60`, `<key>: 60`, or `<key> (60)`)
 * must agree with the JSON. Shorthand like `1/20` is checked against
 * the num/den pair.
 *
 * This prevents the drift pattern flagged in audit 2026-04-22 from
 * re-introducing itself through canonical architecture and task prose
 * that outpace the JSON. Historical audits, planning notes, and research
 * are not source-of-truth contracts and are intentionally excluded.
 */

const rulesetPath = path.join(
  repoRoot,
  "content-schema",
  "examples",
  "records",
  "rulesets",
  "baseline.ruleset.json"
);

const SCAN_DIRS = [
  path.join("docs", "architecture"),
  "tasks"
];

const CONSTANT_KEYS = [
  "atkBonusPerPointNum",
  "atkBonusPerPointDen",
  "defReductionPerPointNum",
  "defReductionPerPointDen",
  "atkBonusCap",
  "defReductionCap",
  "fixedPointBasis",
  "moraleExtraTurnProbNum",
  "moraleExtraTurnProbDen",
  "moralePenaltyMissProbNum",
  "moralePenaltyMissProbDen",
  "luckDoubleProbNum",
  "luckDoubleProbDen",
  "moraleMax",
  "luckMax"
];

const RATIO_PAIRS = [
  { label: "atkBonusPerPoint", num: "atkBonusPerPointNum", den: "atkBonusPerPointDen" },
  { label: "defReductionPerPoint", num: "defReductionPerPointNum", den: "defReductionPerPointDen" },
  { label: "moraleExtraTurnProb", num: "moraleExtraTurnProbNum", den: "moraleExtraTurnProbDen" },
  { label: "moralePenaltyMissProb", num: "moralePenaltyMissProbNum", den: "moralePenaltyMissProbDen" },
  { label: "luckDoubleProb", num: "luckDoubleProbNum", den: "luckDoubleProbDen" }
];

async function walk(dir, out = []) {
  const abs = path.join(repoRoot, dir);
  const entries = await readdir(abs, { withFileTypes: true });
  for (const entry of entries) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(rel, out);
    } else if (entry.name.endsWith(".md")) {
      out.push(rel);
    }
  }
  return out;
}

function extractIntegerMentions(text, key) {
  // Matches `<key> = 60`, `<key>: 60`, `<key>` = 60` tolerating only
  // backticks and whitespace between the key and the operator. The
  // trailing negative lookahead rejects ratio shapes like `1/20` —
  // those are captured by extractRatioMentions.
  const pattern = new RegExp(
    `\\b${key}\\b\`?\\s*(?:=|:)\\s*\`?([0-9]+)\`?(?!\\s*\\/\\s*[0-9])`,
    "g"
  );
  const hits = [];
  let m;
  while ((m = pattern.exec(text)) !== null) {
    hits.push({ value: Number(m[1]), offset: m.index });
  }
  return hits;
}

function extractRatioMentions(text, label) {
  // Matches `<label> ... 1/20` or `<label>Num / <label>Den\` (default 1/20)`.
  // Accepts up to 60 non-newline chars between the label and the ratio
  // so we catch "default 1/20" without walking into the next sentence.
  const pattern = new RegExp(
    `\\b${label}[A-Za-z]*\\b[^\\n]{0,60}?\\b([0-9]+)\\s*/\\s*([0-9]+)\\b`,
    "g"
  );
  const hits = [];
  let m;
  while ((m = pattern.exec(text)) !== null) {
    hits.push({ num: Number(m[1]), den: Number(m[2]), offset: m.index });
  }
  return hits;
}

function lineOf(text, offset) {
  return text.slice(0, offset).split("\n").length;
}

test("extractor: catches a drifting integer mention", () => {
  const sample = "The `atkBonusCap = 140` is the old percent value.";
  const hits = extractIntegerMentions(sample, "atkBonusCap");
  assert.equal(hits.length, 1);
  assert.equal(hits[0].value, 140);
});

test("extractor: catches a drifting ratio mention", () => {
  const sample = "In prose we said atkBonusPerPoint was 1/40 long ago.";
  const hits = extractRatioMentions(sample, "atkBonusPerPoint");
  assert.equal(hits.length, 1);
  assert.equal(hits[0].num, 1);
  assert.equal(hits[0].den, 40);
});

test("extractor: does not match integer across unrelated key on same line", () => {
  const sample = "`moraleMax`) and the `fixedPointBasis = 1000`.";
  const hits = extractIntegerMentions(sample, "moraleMax");
  assert.equal(hits.length, 0, "moraleMax must not capture 1000 from a sibling key");
});

test("extractor: ignores ratio form for integer-mention pattern", () => {
  const sample = "`atkBonusPerPointDen` (default 1/20)";
  const hits = extractIntegerMentions(sample, "atkBonusPerPointDen");
  assert.equal(hits.length, 0, "ratio 1/20 must be handled by the ratio matcher, not the integer matcher");
});

test("combat-math constants: prose mentions agree with baseline ruleset JSON", async () => {
  const ruleset = JSON.parse(await readFile(rulesetPath, "utf8"));
  const c = ruleset.constants;
  const files = [];
  for (const dir of SCAN_DIRS) {
    await walk(dir, files);
  }

  const errors = [];

  for (const rel of files) {
    const text = await readFile(path.join(repoRoot, rel), "utf8");

    for (const key of CONSTANT_KEYS) {
      for (const hit of extractIntegerMentions(text, key)) {
        if (c[key] !== hit.value) {
          errors.push(
            `${rel}:${lineOf(text, hit.offset)}  ${key} = ${hit.value} but ruleset JSON says ${c[key]}`
          );
        }
      }
    }

    for (const pair of RATIO_PAIRS) {
      for (const hit of extractRatioMentions(text, pair.label)) {
        const expectedNum = c[pair.num];
        const expectedDen = c[pair.den];
        if (hit.num !== expectedNum || hit.den !== expectedDen) {
          errors.push(
            `${rel}:${lineOf(text, hit.offset)}  ${pair.label} ${hit.num}/${hit.den} but ruleset JSON says ${expectedNum}/${expectedDen}`
          );
        }
      }
    }
  }

  assert.equal(
    errors.length,
    0,
    `constant drift detected:\n  - ${errors.join("\n  - ")}\n\nFix the prose or update baseline.ruleset.json (and re-run npm test).`
  );
});
