// Task-status ledger: single source of truth for task statuses.
//
// Replaces the per-.md `Status:` field. Only `tasks:start`,
// `tasks:done`, and `tasks:blocked` write here; any other writer is
// a cheat. `validate:status-ledger` enforces the integrity invariants.
//
// Schema:
//   {
//     "lastUpdated": "<ISO-8601>",
//     "tasks": {
//       "<taskId>": {
//         "status": "planned" | "in-progress" | "done" | "blocked",
//         "updatedAt": "<ISO-8601>",
//         "completedAt": "<ISO-8601>"?,         // done only
//         "completedAtSha": "<git short sha>"?, // done only
//         "verifyCommandsHash": "sha256:<hex>"?,// done only
//         "blockedReason": "<string>"?,         // blocked only
//         "legacy": true?                       // pre-migration done
//       }
//     }
//   }

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathExists, readUtf8, repoRoot } from "./repo-utils.mjs";

export const VALID_STATUSES = ["planned", "in-progress", "done", "blocked"];
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
      "legacy",
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
    entry.completedAtSha = gitShortSha();
    if (options.verifyCommands !== undefined) {
      entry.verifyCommandsHash = hashVerifyCommands(options.verifyCommands);
    }
  } else if (newStatus === "blocked" && options.blockedReason) {
    entry.blockedReason = options.blockedReason;
  }

  // Preserve legacy marker on already-legacy entries to keep audit history.
  if (prior.legacy && newStatus === "done") {
    entry.legacy = prior.legacy;
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
