#!/usr/bin/env node
// Balance-corridor parity validator.
//
// `content-schema/balance/corridor.json` is the single source of
// truth for tier numeric bounds (hp / attack / defense / damageMin
// / damageMax / speed per tier). The canonical example
// `content-schema/examples/balance-constraints/canonical.balance-constraints.json`
// duplicates these numbers so the AI-generation entry point
// (`balance-constraints.schema.json`) carries a shape-validatable
// fixture.
//
// This validator asserts the example's `tierCorridors` block is
// numerically identical to `corridor.json`'s `tiers`. CI failure
// here means somebody edited one without regenerating the other —
// run `node scripts/build-balance-constraints.mjs` to bring them
// back into parity.
//
// Wired into `npm run validate` via `validate:balance-corridor-parity`.

import fs from "node:fs/promises";
import path from "node:path";
import { repoRoot } from "./lib/repo-utils.mjs";

const CORRIDOR_PATH = path.join(
  repoRoot,
  "content-schema",
  "balance",
  "corridor.json"
);
const EXAMPLE_PATH = path.join(
  repoRoot,
  "content-schema",
  "examples",
  "balance-constraints",
  "canonical.balance-constraints.json"
);

const STAT_FIELDS = ["hp", "attack", "defense", "damageMin", "damageMax", "speed"];

function rangeEquals(a, b) {
  return a && b && a.lo === b.lo && a.hi === b.hi;
}

async function readJson(p) {
  return JSON.parse(await fs.readFile(p, "utf8"));
}

async function main() {
  const corridor = await readJson(CORRIDOR_PATH);
  const example = await readJson(EXAMPLE_PATH);

  const errors = [];

  if (!Array.isArray(corridor?.tiers)) {
    errors.push(`${path.relative(repoRoot, CORRIDOR_PATH)}: missing tiers[]`);
  }
  if (!Array.isArray(example?.tierCorridors)) {
    errors.push(
      `${path.relative(repoRoot, EXAMPLE_PATH)}: missing tierCorridors[]`
    );
  }
  if (errors.length > 0) {
    for (const e of errors) process.stderr.write(`${e}\n`);
    process.exit(1);
  }

  const corridorTiers = new Map(corridor.tiers.map((t) => [t.tier, t]));
  const exampleTiers = new Map(example.tierCorridors.map((t) => [t.tier, t]));

  for (const [tier, src] of corridorTiers) {
    const dst = exampleTiers.get(tier);
    if (!dst) {
      errors.push(
        `tier ${tier}: missing in canonical.balance-constraints.json`
      );
      continue;
    }
    for (const field of STAT_FIELDS) {
      if (!rangeEquals(src[field], dst[field])) {
        errors.push(
          `tier ${tier}.${field}: corridor.json=${JSON.stringify(src[field])} vs canonical.balance-constraints.json=${JSON.stringify(dst[field])}`
        );
      }
    }
  }

  for (const [tier] of exampleTiers) {
    if (!corridorTiers.has(tier)) {
      errors.push(`tier ${tier}: present in canonical example, missing from corridor.json`);
    }
  }

  if (errors.length > 0) {
    process.stderr.write(
      `check-balance-corridor-parity: corridor.json and canonical.balance-constraints.json have drifted.\n`
    );
    process.stderr.write(
      `Run \`node scripts/build-balance-constraints.mjs\` to regenerate.\n`
    );
    for (const e of errors) process.stderr.write(`  ${e}\n`);
    process.exit(1);
  }

  process.stdout.write(
    `check-balance-corridor-parity: ${corridorTiers.size} tier(s) parity-checked.\n`
  );
}

await main();
