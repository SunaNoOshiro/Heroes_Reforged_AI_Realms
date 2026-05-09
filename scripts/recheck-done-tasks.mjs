// recheck-done-tasks — CI gate that closes the "fake the ledger" cheat path.
//
// validate:status-ledger checks the ledger's INTEGRITY (real SHA, matching
// hash, implementation-log line) but does NOT actually re-execute the
// per-task verifyCommands. An agent willing to forge all three integrity
// signals — make a real commit, append to implementation-log, compute the
// correct sha256 — can fake "done" without ever running mutation/coverage.
//
// This script closes that gap: for every task newly transitioned to
// `status: "done"` between the base ref's tasks/task-status.json and HEAD's,
// it re-runs the task's deriveVerifyCommands list on a fresh checkout.
// If any command fails, the gate fails — the cheat is exposed.
//
// Globals (npm run validate, npm test, npm run test:coverage,
// npm run test:mutation:changed) are deduplicated; per-task commands
// (validate:mutation-score, validate:coverage-floor, verify-ui-smoke)
// run once per task because each carries its own --task arg.
//
// Legacy ledger entries (legacy: true) are skipped — those tasks were
// done before the gate existed and have no verifyCommandsHash.
//
// Usage: node scripts/recheck-done-tasks.mjs [--base <ref>]

import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { repoRoot, readUtf8, pathExists } from "./lib/repo-utils.mjs";
import { deriveVerifyCommands } from "./lib/derive-verify-commands.mjs";
import { parseBaseFlag, pickBaseRef } from "./lib/base-ref.mjs";

function loadJsonAtRef(ref, relPath) {
  const r = spawnSync("git", ["show", `${ref}:${relPath}`], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (r.status !== 0) return null;
  try {
    return JSON.parse(r.stdout);
  } catch {
    return null;
  }
}

async function loadHeadJson(relPath) {
  const p = path.join(repoRoot, relPath);
  if (!(await pathExists(p))) return null;
  return JSON.parse(await readUtf8(p));
}

// Pure: takes two ledger objects, returns the list of task IDs that
// transitioned TO done in HEAD that were NOT done at base. Only true
// `done` entries are eligible for re-verification — `revalidate` and
// other statuses lack a verifyCommandsHash anchor, so there's nothing
// to re-run against. The retired `legacy: true` field would also be
// rejected by the gate; no special-case here.
export function findNewlyDone(baseLedger, headLedger) {
  const newlyDone = [];
  const baseTasks = baseLedger?.tasks || {};
  const headTasks = headLedger?.tasks || {};
  for (const [taskId, headEntry] of Object.entries(headTasks)) {
    if (headEntry.status !== "done") continue;
    const baseEntry = baseTasks[taskId];
    if (baseEntry?.status === "done") continue;
    newlyDone.push(taskId);
  }
  return newlyDone.sort();
}

// Pure: takes an array of newly-done task IDs and a registry, returns
// an ordered queue of { cmd, taskId, sharedWith, missingTask? } items
// where each command appears at most once. `taskId` is the first
// task that needed the command (canonical "blame" id); `sharedWith`
// is the full list of every task that depends on the same command,
// so the failure log can attribute accurately when multiple tasks
// share a global like `npm run validate` or `npm test`.
export function dedupeCommands(taskIds, registry) {
  const seen = new Map();   // cmd → entry (so we can mutate sharedWith)
  const ordered = [];
  for (const id of taskIds) {
    const task = (registry.tasks || []).find((t) => t.id === id);
    if (!task) {
      ordered.push({ cmd: null, taskId: id, missingTask: true });
      continue;
    }
    for (const cmd of deriveVerifyCommands(task)) {
      const existing = seen.get(cmd);
      if (existing) {
        existing.sharedWith.push(id);
      } else {
        const entry = { cmd, taskId: id, sharedWith: [id] };
        seen.set(cmd, entry);
        ordered.push(entry);
      }
    }
  }
  return ordered;
}

async function main() {
  const baseRef = pickBaseRef(parseBaseFlag(process.argv), null);
  if (!baseRef) {
    console.log("recheck-done-tasks: no base ref (origin/main / main) — nothing to compare. Exit 0.");
    return;
  }
  console.log(`recheck-done-tasks: base ref = ${baseRef}`);

  const baseLedger = loadJsonAtRef(baseRef, "tasks/task-status.json");
  const headLedger = await loadHeadJson("tasks/task-status.json");
  if (!headLedger) {
    console.error("recheck-done-tasks: HEAD has no tasks/task-status.json.");
    process.exitCode = 1;
    return;
  }

  const newlyDone = findNewlyDone(baseLedger, headLedger);
  if (newlyDone.length === 0) {
    console.log("recheck-done-tasks: no newly-done (non-legacy) tasks in this PR.");
    return;
  }
  console.log(`\nNewly-done tasks (${newlyDone.length}):`);
  for (const id of newlyDone) console.log(`  - ${id}`);

  const registry = await loadHeadJson("tasks/task-registry.json");
  if (!registry) {
    console.error("recheck-done-tasks: tasks/task-registry.json missing — run `npm run generate:task-registry`.");
    process.exitCode = 1;
    return;
  }

  const queue = dedupeCommands(newlyDone, registry);
  const failures = [];

  for (const { cmd, taskId, missingTask, sharedWith } of queue) {
    if (missingTask) {
      failures.push(`task '${taskId}' is done in ledger but not present in registry`);
      continue;
    }
    const blameLabel = sharedWith && sharedWith.length > 1
      ? `shared by ${sharedWith.join(", ")}`
      : `for ${taskId}`;
    console.log(`\n[${blameLabel}] $ ${cmd}`);
    const r = spawnSync(cmd, { shell: true, stdio: "inherit", cwd: repoRoot });
    if (r.status !== 0) {
      failures.push(`'${cmd}' failed (${blameLabel})`);
    }
  }

  if (failures.length > 0) {
    console.error("\nrecheck-done-tasks FAILED:");
    for (const f of failures) console.error(`  - ${f}`);
    console.error(
      "\nA task is marked 'done' in the ledger but its verifyCommands don't pass\n" +
      "on a fresh re-run. The most likely cause: an agent edited the ledger\n" +
      "manually (faking SHA + implementation-log + hash) without actually running\n" +
      "the gate. Fix: run `npm run tasks:done -- <id>` properly so the gate runs.",
    );
    process.exitCode = 1;
    return;
  }

  console.log("\nOK: all newly-done tasks pass their verifyCommands on fresh re-run.");
}

function isDirectRun() {
  return process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

if (isDirectRun()) {
  main().catch((err) => {
    console.error("recheck-done-tasks crashed:", err);
    process.exitCode = 1;
  });
}
