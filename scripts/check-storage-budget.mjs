#!/usr/bin/env node
// Storage-budget validator.
//
// Parses the per-store soft caps from
// `docs/architecture/storage-policy.md` § Per-Store Byte Budgets,
// sums the numeric caps, and asserts the total is ≤
// (RR-05 floor × HEADROOM_MULTIPLIER).
//
// RR-05 floor is the IndexedDB-quota minimum declared in
// `docs/architecture/runtime-requirements.md` (today: 50 MB).
//
// The headroom multiplier documents the slack we expect from real
// browser quotas vs the floor. The default (8.0) keeps today's
// policy green while still failing on a clearly-runaway addition
// like a fake 1 GB store. Plan 32 § PI-7 Risk Notes calls this
// number a placeholder — tighten once the first runtime
// persistence work surfaces real overhead numbers.
//
// Wired into `npm run validate` via `validate:storage-budget`.

import fs from "node:fs/promises";
import path from "node:path";
import { repoRoot } from "./lib/repo-utils.mjs";

const STORAGE_POLICY_PATH = path.join(
  repoRoot,
  "docs",
  "architecture",
  "storage-policy.md"
);
const RUNTIME_REQUIREMENTS_PATH = path.join(
  repoRoot,
  "docs",
  "architecture",
  "runtime-requirements.md"
);

const HEADROOM_MULTIPLIER = 8.0;

function parseSizeToMb(raw) {
  const value = String(raw).trim();
  if (/^unbounded$/i.test(value) || value === "—" || value === "-") return null;
  const match = /^(\d+(?:\.\d+)?)\s*(KB|MB|GB|TB)$/i.exec(value);
  if (!match) return null;
  const n = Number(match[1]);
  const unit = match[2].toUpperCase();
  switch (unit) {
    case "KB":
      return n / 1024;
    case "MB":
      return n;
    case "GB":
      return n * 1024;
    case "TB":
      return n * 1024 * 1024;
    default:
      return null;
  }
}

function parseStorageBudgetTable(text) {
  // Find the "## Per-Store Byte Budgets" section then the markdown
  // table inside it.
  const sectionMatch = /##\s+Per-Store Byte Budgets\s*\n([\s\S]*?)(?:\n##\s+|$)/.exec(text);
  if (!sectionMatch) {
    throw new Error("storage-policy.md: missing '## Per-Store Byte Budgets' section");
  }
  const block = sectionMatch[1];
  const rows = [];
  for (const line of block.split("\n")) {
    if (!line.startsWith("|")) continue;
    if (/^\|\s*-+/.test(line)) continue;
    if (/^\|\s*Store\s*\|/i.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 2) continue;
    rows.push({ store: cells[0].replace(/`/g, ""), softCap: cells[1] });
  }
  return rows;
}

function parseRR05FloorMb(text) {
  // Match the RR-05 line "**at least N MB**" or fall back to a
  // looser "RR-05" → "MB" scan.
  const match = /RR-05[\s\S]*?at\s+least[\s\S]*?(\d+(?:\.\d+)?)\s*MB/i.exec(text);
  if (!match) {
    throw new Error("runtime-requirements.md: cannot find RR-05 floor in MB");
  }
  return Number(match[1]);
}

async function main() {
  const policy = await fs.readFile(STORAGE_POLICY_PATH, "utf8");
  const reqs = await fs.readFile(RUNTIME_REQUIREMENTS_PATH, "utf8");

  const rows = parseStorageBudgetTable(policy);
  const floorMb = parseRR05FloorMb(reqs);
  const ceilingMb = floorMb * HEADROOM_MULTIPLIER;

  let totalMb = 0;
  const counted = [];
  const skipped = [];
  for (const row of rows) {
    const mb = parseSizeToMb(row.softCap);
    if (mb === null) {
      skipped.push(row);
    } else {
      totalMb += mb;
      counted.push({ ...row, mb });
    }
  }

  const lines = [];
  lines.push(`check-storage-budget: floor (RR-05) = ${floorMb} MB`);
  lines.push(
    `check-storage-budget: headroom multiplier = ${HEADROOM_MULTIPLIER.toFixed(1)}× → ceiling = ${ceilingMb} MB`
  );
  lines.push(
    `check-storage-budget: counted ${counted.length} store(s), summed ${totalMb.toFixed(1)} MB`
  );
  if (skipped.length > 0) {
    lines.push(
      `check-storage-budget: skipped ${skipped.length} unbounded/non-numeric store(s): ${skipped.map((r) => r.store).join(", ")}`
    );
  }

  if (totalMb > ceilingMb) {
    process.stderr.write(`${lines.join("\n")}\n`);
    process.stderr.write(
      `check-storage-budget: FAIL — summed soft caps (${totalMb.toFixed(1)} MB) exceed ceiling (${ceilingMb} MB).\n`
    );
    process.exit(1);
  }

  process.stdout.write(`${lines.join("\n")}\n`);
}

await main();
