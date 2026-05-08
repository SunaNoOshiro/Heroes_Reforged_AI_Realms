// mutation-changed-files — local PR-diff mutation gate.
//
// Runs Stryker against every source file that has been added or
// modified in the working tree relative to `main`, regardless of
// which task claims to own it. Closes the cheat path where an agent
// makes a "drive-by" change to a file outside the current task's
// `ownedPaths` and the per-task mutation gate never sees it.
//
// Strategy:
//   1. Compute changed source files: union of
//      `git diff main...HEAD --name-only --diff-filter=AM`
//      and `git diff --name-only` (working tree).
//   2. Filter to src/**/*.ts and services/**/*.ts (exclude
//      *.test.ts, *.spec.ts, *.d.ts, contracts/, constants).
//   3. If empty list → exit 0 (no source change → no gate to run).
//   4. Run Stryker scoped to those files using the project's
//      stryker.conf.mjs as the base config. Stryker's own
//      `thresholds.break` (in stryker.conf.mjs) is the global
//      fail-floor.
//   5. Per-module floors (engine 80%, ui 65%, etc., per
//      .claude/skills/mutation-test/SKILL.md) are NOT applied by
//      this script — they live in validate-mutation-score.mjs and
//      are invoked separately per-task at tasks:done. This script's
//      job is "every changed source file ran the mutation suite and
//      met the global break threshold." Per-module enforcement is a
//      defense-in-depth follow-up.
//
// This gate is intended for the developer loop and (optionally) CI.
// It is identity-independent only when CI runs it; locally it is
// honor-system, like all other npm-script gates.
//
// Usage:  node scripts/mutation-changed-files.mjs [--base <ref>]

import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { repoRoot } from "./lib/repo-utils.mjs";
import { parseBaseFlag, pickBaseRef } from "./lib/base-ref.mjs";

function listChangedFiles(baseRef) {
  const merged = new Set();

  const diffVsBase = spawnSync(
    "git",
    ["diff", `${baseRef}...HEAD`, "--name-only", "--diff-filter=AMR"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  if (diffVsBase.status === 0) {
    for (const line of diffVsBase.stdout.split("\n")) {
      const f = line.trim();
      if (f) merged.add(f);
    }
  }

  const workTree = spawnSync(
    "git",
    ["diff", "--name-only", "--diff-filter=AMR"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  if (workTree.status === 0) {
    for (const line of workTree.stdout.split("\n")) {
      const f = line.trim();
      if (f) merged.add(f);
    }
  }

  const staged = spawnSync(
    "git",
    ["diff", "--name-only", "--diff-filter=AMR", "--cached"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  if (staged.status === 0) {
    for (const line of staged.stdout.split("\n")) {
      const f = line.trim();
      if (f) merged.add(f);
    }
  }

  return [...merged];
}

// The "what counts as a mutation target" rule lives in three
// coordinated places — keep them aligned when adding a new module
// (e.g. `src/audio/`):
//   - `stryker.conf.mjs` `mutate` array (Stryker's own picker)
//   - this function (the git-diff filter for per-PR mutation runs)
//   - `scripts/lib/owned-path-matchers.mjs` `isSourceTs` (the
//     extension-only filter used by both validators)
export function isMutationCandidate(filePath) {
  const p = filePath.split(path.sep).join("/");
  if (!p.startsWith("src/") && !p.startsWith("services/")) return false;
  if (!p.endsWith(".ts") && !p.endsWith(".tsx")) return false;
  if (p.endsWith(".d.ts")) return false;
  if (p.endsWith(".test.ts") || p.endsWith(".spec.ts")) return false;
  if (p.includes("/__tests__/")) return false;
  if (p.includes("/fixtures/")) return false;
  if (p.startsWith("src/contracts/")) return false;
  if (p.endsWith("/constants.ts")) return false;
  return true;
}

function runStryker(files) {
  const args = ["stryker", "run", "--mutate", files.join(","), "--incremental"];
  console.log(`\n$ npx ${args.join(" ")}\n`);
  const r = spawnSync("npx", args, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: false,
  });
  return r.status === 0;
}

async function main() {
  const baseRef = pickBaseRef(parseBaseFlag(process.argv), "HEAD~1");
  console.log(`mutation-changed-files: comparing against base ref '${baseRef}'`);

  const allChanged = listChangedFiles(baseRef);
  const candidates = allChanged.filter(isMutationCandidate);

  if (candidates.length === 0) {
    console.log(
      "\nNo changed source files under src/ or services/ — mutation gate has nothing to check. Exit 0.",
    );
    return;
  }

  console.log(`\nChanged source files (${candidates.length}):`);
  for (const f of candidates) console.log(`  - ${f}`);

  if (!runStryker(candidates)) {
    console.error(
      "\nStryker exited non-zero (fell below thresholds.break in stryker.conf.mjs).\n" +
      "Per .claude/skills/mutation-test/SKILL.md: kill surviving mutants by ADDING test assertions.",
    );
    process.exitCode = 1;
    return;
  }

  console.log("\nOK: every changed source file met the global break threshold.");
}

function isDirectRun() {
  return process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

if (isDirectRun()) {
  main().catch((err) => {
    console.error("mutation-changed-files crashed:", err);
    process.exitCode = 1;
  });
}
