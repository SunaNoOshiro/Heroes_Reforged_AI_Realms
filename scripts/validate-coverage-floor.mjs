// validate:coverage-floor — anti-cheat counterpart to mutation-score.
//
// A surviving mutant on line X is "killed" by deleting line X just as
// surely as by adding an assertion — and the deletion costs less effort.
// Mutation score alone cannot tell the two apart. This gate makes the
// deletion path fail by checking, for every source file in the task's
// ownedPaths:
//
//   1. line/branch coverage meets the module-class floor (catches
//      "no tests at all" — mutation-score on zero mutants would
//      otherwise vacuously pass);
//   2. neither line count nor covered-line count regressed vs. the
//      stored baseline at reports/coverage/.baseline.json (catches
//      "I deleted the line that had a surviving mutant").
//
// The baseline is updated automatically when this gate passes, so the
// first pass for a file establishes its baseline and subsequent runs
// enforce no-regression.
//
// Floors mirror .claude/skills/mutation-test/SKILL.md and are deliberately
// LOWER than the mutation-score floors (line/branch coverage is a weaker
// signal than mutation score, by design — mutation is the primary gate).
//
// Usage:  node scripts/validate-coverage-floor.mjs --task <task-id>

import fs from "node:fs/promises";
import path from "node:path";
import { pathExists, readUtf8, repoRoot } from "./lib/repo-utils.mjs";
import { isSourceTs, ownedPathMatchers } from "./lib/owned-path-matchers.mjs";
import { classifyPath } from "./lib/module-classes.mjs";

function floorFor(filePath) {
  const cls = classifyPath(filePath);
  return { lines: cls.coverage.lines, branches: cls.coverage.branches, label: cls.label };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--task") args.task = argv[++i];
    else if (a.startsWith("--task=")) args.task = a.slice("--task=".length);
  }
  return args;
}

async function loadJson(p, label) {
  if (!(await pathExists(p))) {
    throw new Error(`${label} missing at ${path.relative(repoRoot, p)}`);
  }
  return JSON.parse(await readUtf8(p));
}

function relFromRepo(absOrRel) {
  const abs = path.isAbsolute(absOrRel) ? absOrRel : path.join(repoRoot, absOrRel);
  return path.relative(repoRoot, abs).split(path.sep).join("/");
}

async function loadBaseline() {
  const p = path.join(repoRoot, "reports", "coverage", ".baseline.json");
  if (!(await pathExists(p))) return {};
  return JSON.parse(await readUtf8(p));
}

async function writeBaseline(baseline) {
  const dir = path.join(repoRoot, "reports", "coverage");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, ".baseline.json"),
    JSON.stringify(baseline, null, 2) + "\n",
  );
}

async function main() {
  const { task } = parseArgs(process.argv);
  if (!task) {
    console.error("validate:coverage-floor: missing --task <id>");
    process.exitCode = 1;
    return;
  }

  const registry = await loadJson(
    path.join(repoRoot, "tasks", "task-registry.json"),
    "tasks/task-registry.json",
  );
  const taskRecord = (registry.tasks || []).find((t) => t.id === task);
  if (!taskRecord) {
    console.error(`validate:coverage-floor: task '${task}' not found.`);
    process.exitCode = 1;
    return;
  }

  const ownedPaths = (taskRecord.ownedPaths || []).map(relFromRepo);
  const sourceOwned = ownedPaths.filter((p) => {
    if (p.endsWith("/") || p.includes("*")) {
      return p.startsWith("src/") || p.startsWith("services/");
    }
    return isSourceTs(p) && (p.startsWith("src/") || p.startsWith("services/"));
  });
  if (sourceOwned.length === 0) {
    console.log(
      `validate:coverage-floor: task '${task}' has no source-code ownedPaths — gate skipped.`,
    );
    return;
  }

  const summary = await loadJson(
    path.join(repoRoot, "reports", "coverage", "coverage-summary.json"),
    "reports/coverage/coverage-summary.json (run `npm run test:coverage` first)",
  );

  const matchOwned = ownedPathMatchers(sourceOwned);
  const matchedFiles = Object.keys(summary)
    .filter((k) => k !== "total")
    .map((k) => ({ key: k, rel: relFromRepo(k) }))
    .filter((e) => isSourceTs(e.rel) && matchOwned(e.rel));

  const baseline = await loadBaseline();
  const failures = [];
  const lines = [];
  const nextBaseline = { ...baseline };

  for (const owned of sourceOwned) {
    const matchOne = ownedPathMatchers([owned]);
    const hits = matchedFiles.filter((e) => matchOne(e.rel));
    if (hits.length === 0) {
      failures.push(
        `ownedPath '${owned}' has no entry in coverage report — file deleted, or never tested?`,
      );
    }
  }

  for (const { key, rel } of matchedFiles) {
    const record = summary[key];
    const linesCov = record.lines || { total: 0, covered: 0, pct: 0 };
    const branchesCov = record.branches || { total: 0, covered: 0, pct: 0 };
    const floor = floorFor(rel);

    const linesPctOk = linesCov.pct >= floor.lines;
    const branchesPctOk = branchesCov.total === 0 || branchesCov.pct >= floor.branches;

    const prior = baseline[rel];
    let regressionMsg = null;
    if (prior) {
      if (linesCov.total < prior.lines.total) {
        regressionMsg =
          `line count dropped from ${prior.lines.total} to ${linesCov.total} ` +
          `(suspicious deletion — see SKILL.md anti-cheat rule A)`;
      } else if (linesCov.covered < prior.lines.covered) {
        regressionMsg =
          `covered lines dropped from ${prior.lines.covered} to ${linesCov.covered} ` +
          `(tests removed or weakened — see SKILL.md anti-cheat rule B)`;
      } else if (branchesCov.covered < prior.branches.covered) {
        regressionMsg =
          `covered branches dropped from ${prior.branches.covered} to ${branchesCov.covered}`;
      }
    }

    const verdictParts = [];
    verdictParts.push(linesPctOk ? "lines OK" : `lines FAIL (${linesCov.pct}% < ${floor.lines}%)`);
    verdictParts.push(branchesPctOk ? "branches OK" : `branches FAIL (${branchesCov.pct}% < ${floor.branches}%)`);
    if (regressionMsg) verdictParts.push(`REGRESSION: ${regressionMsg}`);
    lines.push(
      `  ${rel}: lines ${linesCov.pct}% (${linesCov.covered}/${linesCov.total})  ` +
      `branches ${branchesCov.pct}% (${branchesCov.covered}/${branchesCov.total})  ` +
      `[${floor.label}]  ${verdictParts.join(" | ")}`,
    );

    if (!linesPctOk) {
      failures.push(`${rel}: line coverage ${linesCov.pct}% < floor ${floor.lines}% (${floor.label})`);
    }
    if (!branchesPctOk) {
      failures.push(`${rel}: branch coverage ${branchesCov.pct}% < floor ${floor.branches}% (${floor.label})`);
    }
    if (regressionMsg) {
      failures.push(`${rel}: ${regressionMsg}`);
    }

    nextBaseline[rel] = {
      lines: { total: linesCov.total, covered: linesCov.covered },
      branches: { total: branchesCov.total, covered: branchesCov.covered },
      updatedAt: new Date().toISOString(),
    };
  }

  console.log(`validate:coverage-floor for task '${task}':`);
  for (const l of lines) console.log(l);

  if (failures.length > 0) {
    console.error("\nFAILED:");
    for (const f of failures) console.error(`  - ${f}`);
    console.error(
      "\nIf the regression is intentional (e.g. legitimate refactor that removes",
    );
    console.error(
      "lines), reset the baseline file with prior reviewer approval — do not edit",
    );
    console.error("the baseline silently to make this gate pass.");
    process.exitCode = 1;
    return;
  }

  await writeBaseline(nextBaseline);
  console.log(
    "\nOK: coverage floors met and no per-file regression. Baseline updated.",
  );
}

main().catch((err) => {
  console.error("validate:coverage-floor crashed:", err);
  process.exitCode = 1;
});
