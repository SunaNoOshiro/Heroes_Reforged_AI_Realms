// validate:mutation-score — gate runs as part of `tasks:done`.
//
// Reads the task's ownedPaths from tasks/task-registry.json and the
// Stryker JSON report from reports/mutation/mutation.json, then verifies:
//   1. every source-code file in ownedPaths appears in the report
//      (no silent excludes from stryker.conf.mjs)
//   2. each file's mutation score meets the module-class floor
//
// Module-class floors mirror .claude/skills/mutation-test/SKILL.md
// "The Loop" § step 5.
//
// Usage:  node scripts/validate-mutation-score.mjs --task <task-id>

import path from "node:path";
import { pathExists, readUtf8, repoRoot } from "./lib/repo-utils.mjs";
import { isSourceTs, ownedPathMatchers } from "./lib/owned-path-matchers.mjs";
import { classifyPath } from "./lib/module-classes.mjs";

function floorFor(filePath) {
  const cls = classifyPath(filePath);
  return { floor: cls.mutation, label: cls.label };
}

function parseArgs(argv) {
  const args = { changedOnly: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--task") args.task = argv[++i];
    else if (a.startsWith("--task=")) args.task = a.slice("--task=".length);
    else if (a === "--changed-only") args.changedOnly = true;
  }
  return args;
}

async function loadJson(p, label) {
  if (!(await pathExists(p))) {
    throw new Error(`${label} missing at ${path.relative(repoRoot, p)}`);
  }
  return JSON.parse(await readUtf8(p));
}

function fileScore(fileRecord) {
  const mutants = fileRecord.mutants || [];
  let total = 0;
  let killed = 0;
  for (const m of mutants) {
    if (m.status === "Ignored" || m.status === "CompileError") continue;
    total += 1;
    if (m.status === "Killed" || m.status === "Timeout") killed += 1;
  }
  if (total === 0) return null;
  return { total, killed, score: (killed / total) * 100 };
}

function relPath(p) {
  return p.split(path.sep).join("/").replace(/^\.\//, "");
}

async function main() {
  const { task, changedOnly } = parseArgs(process.argv);
  if (!task) {
    console.error("validate:mutation-score: missing --task <id>");
    process.exitCode = 1;
    return;
  }

  const registry = await loadJson(
    path.join(repoRoot, "tasks", "task-registry.json"),
    "tasks/task-registry.json",
  );
  const taskRecord = (registry.tasks || []).find((t) => t.id === task);
  if (!taskRecord) {
    console.error(`validate:mutation-score: task '${task}' not found.`);
    process.exitCode = 1;
    return;
  }

  const ownedPaths = (taskRecord.ownedPaths || []).map(relPath);
  const sourceOwned = ownedPaths.filter((p) => {
    if (p.endsWith("/") || p.includes("*")) {
      return p.startsWith("src/") || p.startsWith("services/");
    }
    return isSourceTs(p) && (p.startsWith("src/") || p.startsWith("services/"));
  });
  if (sourceOwned.length === 0) {
    console.log(
      `validate:mutation-score: task '${task}' has no source-code ownedPaths — gate skipped.`,
    );
    return;
  }

  const reportPath = path.join(repoRoot, "reports", "mutation", "mutation.json");
  if (changedOnly && !(await pathExists(reportPath))) {
    console.log(
      `validate:mutation-score for task '${task}': no mutation.json on disk ` +
      `(--changed-only; mutation-changed-files found no candidate source ` +
      `files in this PR). Nothing to validate.`,
    );
    return;
  }
  const report = await loadJson(
    reportPath,
    "reports/mutation/mutation.json (run `npm run test:mutation` first)",
  );
  const reportFiles = report.files || {};
  const reportPaths = Object.keys(reportFiles).map(relPath);

  const matchOwned = ownedPathMatchers(sourceOwned);
  const matchedReportPaths = reportPaths.filter(
    (p) => isSourceTs(p) && matchOwned(p),
  );

  const failures = [];
  const lines = [];

  // 1. Every source-code ownedPath entry must produce at least one
  //    file in the report — unless --changed-only is set, in which case
  //    only the files that actually appeared in the mutation run are
  //    checked (mutation:changed only runs on git-diff files, so ownedPaths
  //    entries that weren't touched in this PR won't be in the report).
  if (!changedOnly) {
    for (const owned of sourceOwned) {
      const matchOne = ownedPathMatchers([owned]);
      const hits = reportPaths.filter((p) => isSourceTs(p) && matchOne(p));
      if (hits.length === 0) {
        failures.push(
          `ownedPath '${owned}' has no entry in mutation report — was it excluded from stryker.conf.mjs#mutate or did the file not exist on disk?`,
        );
      }
    }
  }

  if (changedOnly && matchedReportPaths.length === 0) {
    console.log(
      `validate:mutation-score for task '${task}': no ownedPaths files in mutation report (--changed-only; nothing to validate).`,
    );
    return;
  }

  // 2. Every matched file must meet its module-class floor.
  for (const fp of matchedReportPaths) {
    const fileKey = Object.keys(reportFiles).find((k) => relPath(k) === fp);
    const score = fileScore(reportFiles[fileKey]);
    if (!score) {
      lines.push(`  ${fp}: no mutants generated (file may be type-only)`);
      continue;
    }
    const { floor, label } = floorFor(fp);
    const pass = score.score >= floor;
    lines.push(
      `  ${fp}: ${score.killed}/${score.total} killed = ${score.score.toFixed(1)}%   floor ${floor}% [${label}]   ${pass ? "OK" : "FAIL"}`,
    );
    if (!pass) {
      failures.push(
        `${fp}: mutation score ${score.score.toFixed(1)}% < floor ${floor}% (${label})`,
      );
    }
  }

  console.log(`validate:mutation-score for task '${task}':`);
  for (const l of lines) console.log(l);

  if (failures.length > 0) {
    console.error("\nFAILED:");
    for (const f of failures) console.error(`  - ${f}`);
    console.error(
      "\nPer .claude/skills/mutation-test/SKILL.md: kill mutants by ADDING test assertions.",
    );
    console.error(
      "Forbidden 'fixes': deleting source, softening assertions, lowering thresholds,",
    );
    console.error(
      "or `// Stryker disable` without a written equivalence proof.",
    );
    process.exitCode = 1;
    return;
  }

  console.log("\nOK: every ownedPaths source file meets its mutation-score floor.");
}

main().catch((err) => {
  console.error("validate:mutation-score crashed:", err);
  process.exitCode = 1;
});
