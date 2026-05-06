#!/usr/bin/env node
// Regenerate
// `content-schema/examples/balance-constraints/canonical.balance-constraints.json`
// from `content-schema/balance/corridor.json` so the tier-corridor
// numbers cannot drift between the two files.
//
// Run after editing `corridor.json`; commit the diff in the same
// change. CI gate: `npm run validate:balance-corridor-parity`.

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

// Hard caps live in the example fixture only; the corridor file
// pins per-tier ranges, not absolute caps. These caps mirror the
// previous canonical fixture.
const HARD_CAPS = {
  schemaVersion: 1,
  maxHp: 500,
  maxAtk: 50,
  maxDef: 50,
  maxAbilitiesPerUnit: 5
};

async function readJson(p) {
  return JSON.parse(await fs.readFile(p, "utf8"));
}

async function main() {
  const corridor = await readJson(CORRIDOR_PATH);
  const tierCorridors = corridor.tiers.map((t) => ({
    tier: t.tier,
    hp: t.hp,
    attack: t.attack,
    defense: t.defense,
    damageMin: t.damageMin,
    damageMax: t.damageMax,
    speed: t.speed
  }));

  const out = {
    $schema: "heroes-reforged/balance-constraints.schema.json",
    ...HARD_CAPS,
    tierCorridors
  };

  await fs.writeFile(EXAMPLE_PATH, `${JSON.stringify(out, null, 2)}\n`);
  process.stdout.write(
    `Wrote ${path.relative(repoRoot, EXAMPLE_PATH)} from ${path.relative(repoRoot, CORRIDOR_PATH)}.\n`
  );
}

await main();
