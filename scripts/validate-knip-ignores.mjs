// validate:knip-ignores — anti-cheat for `validate:dead-code`.
//
// knip.json#ignore / #ignoreDependencies / #ignoreBinaries is the
// escape hatch for "knip can't trace this dynamic usage / this file
// is intentional scaffolding". The escape hatch is fine — adding a
// path or dep there without explaining *why* is not. This gate
// requires every non-glob entry to have a corresponding entry in
// knip.ignore-reasons.json with a substantive one-line reason.
//
// What counts as "non-glob": entries without `*` characters. Glob
// entries like `**/node_modules/**` or `src/contracts/**` are kept
// in the reasons file as-is (the literal glob is the key) so that
// adding a *new* glob also forces a justification.

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { repoRoot, readUtf8, pathExists } from "./lib/repo-utils.mjs";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

const KNIP_PATH = path.join(repoRoot, "knip.json");
const REASONS_PATH = path.join(repoRoot, "knip.ignore-reasons.json");

const WEAK_REASONS = [
  /^todo\b/i,
  /^fixme\b/i,
  /^placeholder\b/i,
  /^needed\b/i,
  /^trust me\b/i,
  /^see (?:above|below)$/i,
  /^\.{0,5}$/,
];

function isWeakReason(text) {
  if (typeof text !== "string") return true;
  const trimmed = text.trim();
  if (trimmed.length < 12) return true;
  return WEAK_REASONS.some((re) => re.test(trimmed));
}

async function loadJson(p, label) {
  if (!(await pathExists(p))) {
    throw new Error(`${label} missing at ${path.relative(repoRoot, p)}`);
  }
  return JSON.parse(await readUtf8(p));
}

function collectMissing(group, ignoreList, reasons) {
  const missing = [];
  const weak = [];
  for (const entry of ignoreList) {
    if (!Object.prototype.hasOwnProperty.call(reasons, entry)) {
      missing.push(entry);
      continue;
    }
    if (isWeakReason(reasons[entry])) {
      weak.push({ entry, reason: reasons[entry] });
    }
  }
  return { group, missing, weak };
}

async function main() {
  const knip = await loadJson(KNIP_PATH, "knip.json");
  const reasons = await loadJson(REASONS_PATH, "knip.ignore-reasons.json");

  const checks = [
    { group: "files", list: knip.ignore || [], reasons: reasons.files || {} },
    { group: "dependencies", list: knip.ignoreDependencies || [], reasons: reasons.dependencies || {} },
    { group: "binaries", list: knip.ignoreBinaries || [], reasons: reasons.binaries || {} },
  ];

  // Auto-skipped patterns — these are "it's not a project file" globs
  // that don't need a reason because they describe the universe of
  // out-of-scope paths, not orphans.
  const AUTOSKIP_FILE = new Set([
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/coverage/**",
    "**/reports/**",
    "**/.stryker-tmp/**",
  ]);

  const results = checks.map(({ group, list, reasons }) => {
    const filtered = group === "files"
      ? list.filter((entry) => !AUTOSKIP_FILE.has(entry))
      : list;
    return collectMissing(group, filtered, reasons);
  });

  const totalMissing = results.reduce((n, r) => n + r.missing.length, 0);
  const totalWeak = results.reduce((n, r) => n + r.weak.length, 0);

  for (const r of results) {
    if (r.missing.length === 0 && r.weak.length === 0) continue;
    console.error(`validate:knip-ignores [${r.group}]:`);
    for (const e of r.missing) {
      console.error(`  - ${e}: NO entry in knip.ignore-reasons.json#${r.group}`);
    }
    for (const w of r.weak) {
      console.error(`  - ${w.entry}: weak reason "${w.reason}"`);
    }
  }

  if (totalMissing + totalWeak === 0) {
    console.log("validate:knip-ignores: OK");
    return;
  }

  console.error(
    `\nFAIL — ${totalMissing} missing reason(s), ${totalWeak} weak reason(s).`,
  );
  console.error(
    "\n┌─ Right fix ──────────────────────────────────────────────────────",
  );
  console.error(
    "│ For each entry, add a substantive one-line reason to",
  );
  console.error(
    "│ knip.ignore-reasons.json under the correct group (files /",
  );
  console.error(
    "│ dependencies / binaries). Examples of good reasons:",
  );
  console.error(
    "│   \"Generated from <schema>; consumer is <task-id>.\"",
  );
  console.error(
    "│   \"Plugin loaded by <config> at runtime, not statically imported.\"",
  );
  console.error(
    "│ Forbidden weak reasons: TODO, FIXME, placeholder, needed, trust me,",
  );
  console.error(
    "│ \"see above\", or anything under 12 chars.",
  );
  console.error(
    "└──────────────────────────────────────────────────────────────────",
  );
  console.error(
    "\nDoctrine: .agents/skills/structural-checks/SKILL.md § dead-code, rule C",
  );
  process.exitCode = 1;
}

function isDirectRun() {
  return process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

if (isDirectRun()) {
  await main();
}
