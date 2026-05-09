// Task-status ledger: single source of truth for task statuses.
//
// Replaces the per-.md `Status:` field. Only `tasks:start`,
// `tasks:done`, and `tasks:blocked` write here; any other writer is
// a cheat. `validate:status-ledger` enforces the integrity invariants.
//
// Why a single ledger (locked 2026-05-07).
// `Status:` embedded in 471 .md files made hand-edits invisible in PR
// diffs and gave every task its own potential cheat surface ("agent
// flips Status: planned → Status: done by hand and skips
// `tasks:done`"). Concentrating status into one structured file makes
// every change a one-line diff in one file, easy to review and easy
// to gate by CI. The `verifyCommandsHash` field further catches the
// late-stage cheat (weakening the verify list after marking done)
// which no per-.md field could detect.
//
// Why a CI status check, not CODEOWNERS (locked 2026-05-07).
// CODEOWNERS was rejected: in a solo repo where the AI agent commits
// using the human owner's GitHub identity, CODEOWNERS adds friction
// without cheat-proofness — the agent satisfies the rule trivially
// by acting as the owner. Only an identity-independent CI status
// check on a fresh GitHub-hosted runner (which the agent has no
// token for) is independent of the agent's identity. The trust
// anchor is the `Validate Repo Contracts` workflow at
// `.github/workflows/validate.yml` re-running `npm run validate` on
// every PR. **Manual prerequisite:** the repo owner must enable
// branch protection on `main` requiring the `validate` check;
// without that toggle the gate is honor-system.
//
// Why `revalidate` instead of `legacy: true` (locked 2026-05-09).
// The original schema had a `legacy: true` flag-on-`done` for the 12
// tasks marked done before this ledger existed. That was honest
// internally but misleading externally — `tasks:status` reported
// legacy entries as plain "done", inflating the gate-verified count
// by 12 and hiding the pre-gate gap from the dashboard. Promoting
// the unverified state to a first-class `revalidate` status surfaces
// the gap, gives a clear promotion path (`tasks:revalidate`), and
// keeps the anti-cheat (no future `legacy: true` allowed) intact via
// the now-empty `LEGACY_DONE_ALLOWLIST` in
// `scripts/check-status-ledger.mjs` that still rejects on sight.
//
// Schema:
//   {
//     "lastUpdated": "<ISO-8601>",
//     "tasks": {
//       "<taskId>": {
//         "status": "planned" | "in-progress" | "done" | "blocked" | "revalidate",
//         "updatedAt": "<ISO-8601>",
//         "completedAt": "<ISO-8601>"?,         // done only
//         "completedAtSha": "<git short sha>"?, // done only
//         "verifyCommandsHash": "sha256:<hex>"?,// done only
//         "blockedReason": "<string>"?,         // blocked only
//       }
//     }
//   }
//
// Status meanings:
// - planned       — default, work not started.
// - in-progress   — an agent set this via `tasks:start`.
// - done          — gate-verified; has completedAtSha + verifyCommandsHash.
// - blocked       — explicit, with blockedReason recorded.
// - revalidate    — work was completed pre-gate (or otherwise lacks the
//                   modern verify trail). Promoted to `done` via
//                   `tasks:revalidate`, which runs the task's
//                   verifyCommands and records the hash + the most
//                   recent commit that touched the task path.

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathExists, readUtf8, repoRoot } from "./repo-utils.mjs";

export const VALID_STATUSES = ["planned", "in-progress", "done", "blocked", "revalidate"];
export const LEDGER_PATH = path.join(repoRoot, "tasks", "task-status.json");

function nowIso() {
  return new Date().toISOString();
}

function gitShortSha() {
  const r = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  return r.status === 0 ? r.stdout.trim() : "unknown";
}

export function hashVerifyCommands(verifyCommands) {
  const list = Array.isArray(verifyCommands) ? verifyCommands : [];
  const canon = list.map((c) => String(c).trim()).join("\n");
  return "sha256:" + crypto.createHash("sha256").update(canon, "utf8").digest("hex");
}

export async function loadLedger() {
  if (!(await pathExists(LEDGER_PATH))) {
    return { lastUpdated: nowIso(), tasks: {} };
  }
  const raw = await readUtf8(LEDGER_PATH);
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `tasks/task-status.json is not valid JSON: ${err.message}. ` +
      `Refusing to overwrite — investigate before re-running.`,
    );
  }
  if (!parsed.tasks || typeof parsed.tasks !== "object") {
    throw new Error("tasks/task-status.json missing required 'tasks' object.");
  }
  return parsed;
}

export async function writeLedger(ledger) {
  ledger.lastUpdated = nowIso();
  // Stable key ordering for deterministic diffs.
  const sortedIds = Object.keys(ledger.tasks).sort();
  const orderedTasks = {};
  for (const id of sortedIds) {
    const entry = ledger.tasks[id];
    const orderedEntry = {};
    const fieldOrder = [
      "status",
      "updatedAt",
      "completedAt",
      "completedAtSha",
      "verifyCommandsHash",
      "blockedReason",
    ];
    const known = new Set(fieldOrder);
    for (const f of fieldOrder) {
      if (entry[f] !== undefined) orderedEntry[f] = entry[f];
    }
    // Append any unknown-but-present fields in alphabetical order so a
    // future field added in setTaskStatus isn't silently dropped on
    // the next write.
    for (const k of Object.keys(entry).sort()) {
      if (!known.has(k) && entry[k] !== undefined) orderedEntry[k] = entry[k];
    }
    orderedTasks[id] = orderedEntry;
  }
  const out = {
    lastUpdated: ledger.lastUpdated,
    tasks: orderedTasks,
  };
  await fs.mkdir(path.dirname(LEDGER_PATH), { recursive: true });
  await fs.writeFile(LEDGER_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
}

export function getStatus(ledger, taskId) {
  const entry = ledger.tasks[taskId];
  return entry ? entry.status : "planned";
}

export function getEntry(ledger, taskId) {
  return ledger.tasks[taskId];
}

export async function setTaskStatus(ledger, taskId, newStatus, options = {}) {
  if (!VALID_STATUSES.includes(newStatus)) {
    throw new Error(
      `Invalid status "${newStatus}". Use: ${VALID_STATUSES.join(", ")}.`,
    );
  }
  const prior = ledger.tasks[taskId] || {};
  const ts = nowIso();
  const entry = { status: newStatus, updatedAt: ts };

  if (newStatus === "done") {
    entry.completedAt = ts;
    // For most flips this is HEAD. The revalidate→done path passes
    // an explicit `completedAtSha` (the most recent commit that touched
    // the task path), which we honor here.
    entry.completedAtSha = options.completedAtSha || gitShortSha();
    if (options.completedAt) entry.completedAt = options.completedAt;
    if (options.verifyCommands !== undefined) {
      entry.verifyCommandsHash = hashVerifyCommands(options.verifyCommands);
    }
  } else if (newStatus === "blocked" && options.blockedReason) {
    entry.blockedReason = options.blockedReason;
  }

  ledger.tasks[taskId] = entry;
  return entry;
}

export async function ensureTaskEntry(ledger, taskId) {
  if (!ledger.tasks[taskId]) {
    ledger.tasks[taskId] = { status: "planned", updatedAt: nowIso() };
  }
  return ledger.tasks[taskId];
}
