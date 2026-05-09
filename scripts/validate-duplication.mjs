// validate:duplication — runs jscpd over src/ + services/ and fails
// when project-wide duplication exceeds the configured ratio OR any
// single clone is large enough that it should have been a shared
// helper.
//
// Why this gate exists:
//   AI agents that don't see an existing helper reach for copy-paste
//   first. This gate makes that visible at PR time, before the
//   mutation gate runs (cheap structural check before expensive
//   behavior check).
//
// Tests, fixtures, generated contracts, and migration templates are
// excluded in .jscpd.json — duplication there is intentional.
//
// jscpd's own --threshold gate is intentionally disabled (set to 100
// in .jscpd.json) so this script can read the JSON report and apply
// repo-specific thresholds. The same JSON is also useful for IDE
// inspection.

import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { pathExists, readUtf8 } from "./lib/repo-utils.mjs";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleDir, "..");

// Project-wide duplication ratio (% of token-comparable lines that
// belong to a clone group). Tuned for the current source size; revisit
// when src/ grows past ~10k LOC.
const PROJECT_THRESHOLD_PERCENT = 1.5;

// A single clone group above this many tokens is "egregious" and
// should have been a shared helper, even if the global ratio is fine.
// 200 tokens ≈ 20–30 lines of typical TS.
const EGREGIOUS_CLONE_TOKENS = 200;

const REPORT_PATH = path.join(repoRoot, "reports", "jscpd", "jscpd-report.json");

function runJscpd(scope) {
  return new Promise((resolve, reject) => {
    const args = [
      "jscpd",
      ...scope,
      "--config",
      path.join(repoRoot, ".jscpd.json"),
      "--silent",
    ];
    const child = spawn("npx", args, { cwd: repoRoot, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 0));
  });
}

async function main() {
  const scope = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const paths = scope.length > 0 ? scope : ["src", "services"];

  const exitCode = await runJscpd(paths);

  if (!(await pathExists(REPORT_PATH))) {
    console.error(
      `validate:duplication: jscpd produced no report at ` +
      `${path.relative(repoRoot, REPORT_PATH)} (jscpd exit ${exitCode}).`,
    );
    process.exitCode = 1;
    return;
  }

  const report = JSON.parse(await readUtf8(REPORT_PATH));
  const stats = report.statistics?.total || {};
  const dupPercent = Number(stats.percentage || 0);
  const clones = report.duplicates || [];

  console.log(`validate:duplication scope: ${paths.join(", ")}`);
  console.log(
    `  duplicated: ${stats.duplicatedLines || 0} / ${stats.lines || 0} lines ` +
    `(${dupPercent.toFixed(2)}%)`,
  );
  console.log(`  clone groups: ${clones.length}`);

  const failures = [];

  if (dupPercent > PROJECT_THRESHOLD_PERCENT) {
    failures.push(
      `project duplication ${dupPercent.toFixed(2)}% > threshold ` +
      `${PROJECT_THRESHOLD_PERCENT}%`,
    );
  }

  for (const clone of clones) {
    const tokens = Number(clone.tokens || 0);
    if (tokens >= EGREGIOUS_CLONE_TOKENS) {
      const a = clone.firstFile || {};
      const b = clone.secondFile || {};
      failures.push(
        `egregious clone (${tokens} tokens, ${clone.lines || "?"} lines): ` +
        `${a.name}:${a.start}–${a.end} ↔ ${b.name}:${b.start}–${b.end}`,
      );
    }
  }

  if (failures.length > 0) {
    console.error("\nFAILED — duplication detected:");
    for (const f of failures) console.error(`  - ${f}`);
    console.error(
      "\n┌─ Right fix ──────────────────────────────────────────────────────",
    );
    console.error(
      "│ Extract the duplicated body into a shared helper. Both call sites",
    );
    console.error(
      "│ import the helper. Pick a home in src/shared/, src/<module>/util.ts,",
    );
    console.error(
      "│ or wherever the existing module surface lives.",
    );
    console.error(
      "├─ Wrong fixes (treated as cheats per structural-checks SKILL.md) ─",
    );
    console.error(
      "│ × Delete one of the clones to make the gate pass.",
    );
    console.error(
      "│ × Rename variables, reorder lines, or split a clone to defeat the",
    );
    console.error(
      "│   token matcher without changing semantics.",
    );
    console.error(
      "│ × Lower minTokens / minLines / threshold in .jscpd.json.",
    );
    console.error(
      "│ × Add the file to .jscpd.json#ignore.",
    );
    console.error(
      "└──────────────────────────────────────────────────────────────────",
    );
    console.error(
      `\nFull report: ${path.relative(repoRoot, REPORT_PATH)}`,
    );
    console.error(
      "Doctrine:    .agents/skills/structural-checks/SKILL.md § duplication",
    );
    process.exitCode = 1;
    return;
  }

  console.log("OK: duplication under threshold.");
}

function isDirectRun() {
  return process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

if (isDirectRun()) {
  await main();
}
