// validate:status-ledger — integrity check for tasks/task-status.json.
//
// Catches the cheats this ledger exists to prevent:
//   1. Hand-edit of `Status:` in a task .md (no Status: field is
//      allowed in any task .md after migration).
//   2. Append-by-hand to the ledger that doesn't pair with a real
//      git commit + implementation-log line (every non-legacy `done`
//      entry must be reproducible).
//   3. Late weakening of verifyCommands after marking a task done
//      (verifyCommandsHash recorded at completion must still match
//      the task's current verifyCommands list).
//   4. Spurious `legacy: true` flags on entries that didn't exist
//      at migration time (the legacy exemption is a one-shot
//      allowlist; new entries cannot opt out of integrity).
//
// The integrity check (`runLedgerChecks`) is exposed as a pure
// function for unit testing. The CLI entry point is a thin wrapper.
//
// Usage:  node scripts/check-status-ledger.mjs

import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { pathExists, readUtf8, repoRoot, walkFiles } from "./lib/repo-utils.mjs";
import {
  VALID_STATUSES,
  loadLedger,
  hashVerifyCommands,
  LEDGER_PATH,
} from "./lib/task-status-ledger.mjs";

const tasksRoot = path.join(repoRoot, "tasks");
const STATUS_LINE_RE = /^Status:\s*\S+\s*$/m;

// The `legacy: true` exemption was retired on 2026-05-09. The 12
// entries that originally claimed `legacy: true` were migrated to
// the new `revalidate` status — a first-class status meaning "work
// was completed but lacks the modern verify trail." Any new entry
// with `legacy: true` is rejected: the field is no longer a valid
// schema feature.
export const LEGACY_DONE_ALLOWLIST = new Set();

function repoRelative(absPath) {
  return path.relative(repoRoot, absPath).split(path.sep).join("/");
}

function isTaskFile(filePath) {
  if (!filePath.endsWith(".md")) return false;
  const rel = repoRelative(filePath);
  if (!rel.startsWith("tasks/")) return false;
  const depth = rel.split("/").length;
  return depth === 4;
}

function defaultGitCommitExists(sha) {
  if (!sha || sha === "unknown") return false;
  const r = spawnSync("git", ["cat-file", "-e", sha], {
    cwd: repoRoot,
    stdio: "ignore",
  });
  return r.status === 0;
}

function defaultGitCommitTouchesPath(sha, taskPath) {
  const r = spawnSync(
    "git",
    ["log", "-1", "--format=%H", sha, "--", taskPath],
    { cwd: repoRoot, encoding: "utf8" },
  );
  return r.status === 0 && r.stdout.trim().length > 0;
}

// Pure validator: takes ledger / registry / implLog as inputs, returns
// { failures, warnings, taskMdStatusViolations }. Suitable for unit
// testing without filesystem state.
//
// `taskMdStatusViolations` is the list of task .md paths that contain
// a `Status:` line; in tests, callers pass an empty list (the on-disk
// scan is the CLI's job).
//
// `gitCommitExists` and `gitCommitTouchesPath` may be overridden for
// tests; defaults call real git.
export function runLedgerChecks({
  ledger,
  registry,
  implLog,
  taskMdStatusViolations = [],
  gitCommitExists = defaultGitCommitExists,
  gitCommitTouchesPath = defaultGitCommitTouchesPath,
  legacyAllowlist = LEGACY_DONE_ALLOWLIST,
} = {}) {
  const failures = [];
  const warnings = [];

  for (const violationPath of taskMdStatusViolations) {
    failures.push(
      `${violationPath}: contains 'Status:' field — must be removed; status lives in tasks/task-status.json`,
    );
  }

  if (registry) {
    const ledgerIds = new Set(Object.keys(ledger.tasks || {}));
    for (const t of registry.tasks || []) {
      if (!ledgerIds.has(t.id)) {
        failures.push(`tasks/task-status.json: missing entry for task '${t.id}'`);
      }
    }
  }

  for (const [taskId, entry] of Object.entries(ledger.tasks || {})) {
    if (!VALID_STATUSES.includes(entry.status)) {
      failures.push(`tasks/task-status.json: '${taskId}' has invalid status '${entry.status}'`);
      continue;
    }

    // The `legacy: true` field was retired in favor of the explicit
    // `revalidate` status. Any entry still carrying the flag is
    // rejected outright — the schema is closed.
    if (entry.legacy === true && !legacyAllowlist.has(taskId)) {
      failures.push(
        `tasks/task-status.json: '${taskId}' has legacy:true — the legacy field was retired ` +
        `2026-05-09. Migrate to status:"revalidate" (work completed but unverified) and remove ` +
        `the legacy field, or run tasks:revalidate to promote to a real done.`,
      );
      continue;
    }

    // `revalidate` is the documented "work happened but lacks the modern
    // verify trail" status. No completedAtSha or verifyCommandsHash is
    // required (or expected). Promotion to `done` happens via
    // `tasks:revalidate`, which captures both.
    if (entry.status === "revalidate") continue;

    if (entry.status !== "done") continue;

    if (!entry.completedAtSha) {
      failures.push(
        `tasks/task-status.json: '${taskId}' is done but has no completedAtSha — was tasks:done bypassed?`,
      );
      continue;
    }
    if (!gitCommitExists(entry.completedAtSha)) {
      failures.push(
        `tasks/task-status.json: '${taskId}' completedAtSha=${entry.completedAtSha} does not exist in git — forged SHA`,
      );
      continue;
    }

    const taskRecord = (registry?.tasks || []).find((t) => t.id === taskId);
    if (taskRecord && taskRecord.path) {
      if (!gitCommitTouchesPath(entry.completedAtSha, taskRecord.path)) {
        // Lenient: completion commit may live downstream and the .md
        // was untouched at completion time. Warn only.
        warnings.push(
          `tasks/task-status.json: '${taskId}' completedAtSha=${entry.completedAtSha} does not touch ${taskRecord.path}`,
        );
      }
      if (entry.verifyCommandsHash) {
        const expected = hashVerifyCommands(taskRecord.verifyCommands || []);
        if (expected !== entry.verifyCommandsHash) {
          failures.push(
            `tasks/task-status.json: '${taskId}' verifyCommandsHash=${entry.verifyCommandsHash.slice(0, 19)}…  ` +
            `but current verifyCommands hash to ${expected.slice(0, 19)}… — verify list was weakened after marking done`,
          );
        }
      } else {
        failures.push(`tasks/task-status.json: '${taskId}' is done but has no verifyCommandsHash`);
      }
    }

    if (typeof implLog === "string" && implLog.length > 0 && !implLog.includes(taskId)) {
      failures.push(
        `tasks/task-status.json: '${taskId}' is done but has no entry in docs/planning/implementation-log.md — tasks:done was not run`,
      );
    }
  }

  for (const [taskId, entry] of Object.entries(ledger.tasks || {})) {
    if (entry.status === "blocked" && !entry.blockedReason) {
      warnings.push(`tasks/task-status.json: '${taskId}' is blocked but has no blockedReason`);
    }
  }

  return { failures, warnings };
}

async function loadImplementationLog() {
  const p = path.join(repoRoot, "docs", "planning", "implementation-log.md");
  if (!(await pathExists(p))) return "";
  return readUtf8(p);
}

async function loadRegistry() {
  const p = path.join(repoRoot, "tasks", "task-registry.json");
  if (!(await pathExists(p))) return null;
  return JSON.parse(await readUtf8(p));
}

async function scanTaskMdForStatusLines() {
  const violations = [];
  const allFiles = await walkFiles(tasksRoot, (p) => p.endsWith(".md"));
  for (const filePath of allFiles.filter(isTaskFile)) {
    const md = await readUtf8(filePath);
    // Only scan above the first H2 — by convention `Status:` would
    // appear in the top metadata block, and we don't want to false-
    // positive on quoted/code-block uses lower in the file.
    const cutoff = md.search(/^## /m);
    const head = cutoff === -1 ? md : md.slice(0, cutoff);
    if (STATUS_LINE_RE.test(head)) {
      violations.push(repoRelative(filePath));
    }
  }
  return violations;
}

async function mainCli() {
  if (!(await pathExists(LEDGER_PATH))) {
    console.error("FAIL: tasks/task-status.json missing.");
    console.error(
      "The ledger is the canonical source of task status. If it has been\n" +
      "deleted, restore it from git history (`git checkout main -- tasks/task-status.json`).",
    );
    process.exitCode = 1;
    return;
  }

  const [ledger, registry, implLog, taskMdStatusViolations] = await Promise.all([
    loadLedger(),
    loadRegistry(),
    loadImplementationLog(),
    scanTaskMdForStatusLines(),
  ]);

  const { failures, warnings } = runLedgerChecks({
    ledger,
    registry,
    implLog,
    taskMdStatusViolations,
  });

  if (warnings.length > 0) {
    console.log("validate:status-ledger warnings:");
    for (const w of warnings) console.log(`  ! ${w}`);
    console.log("");
  }

  if (failures.length > 0) {
    console.error("FAILED:");
    for (const f of failures) console.error(`  - ${f}`);
    console.error(
      "\nDo NOT hand-edit `tasks/task-status.json` to make this gate pass.\n" +
      "The realistic cheat path is: agent edits the ledger or the .md to fake `done`.\n" +
      "Correct procedure: run `npm run tasks:done -- <id>` and let it write the ledger.\n" +
      "If verifyCommands fail, fix the underlying issue. Per CLAUDE.md Workflow.",
    );
    process.exitCode = 1;
    return;
  }

  console.log(`validate:status-ledger: ${Object.keys(ledger.tasks).length} entries verified.`);
}

function isDirectRun() {
  return process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

if (isDirectRun()) {
  mainCli().catch((err) => {
    console.error("check-status-ledger crashed:", err);
    process.exitCode = 1;
  });
}
