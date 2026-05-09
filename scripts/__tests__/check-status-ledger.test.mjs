// Cheat-scenario tests for `validate:status-ledger`.
//
// Each test enumerates a specific cheat path an AI agent might try,
// constructs a synthetic ledger / registry / implementation-log
// representing the post-cheat state, runs the validator, and asserts
// the validator catches it (or, for the legitimate scenarios, that
// it passes).
//
// The validator's pure entry point `runLedgerChecks` accepts injected
// `gitCommitExists` / `gitCommitTouchesPath` so tests run without
// shelling out to git. This keeps tests fast and deterministic.

import assert from "node:assert/strict";
import test from "node:test";
import {
  runLedgerChecks,
  LEGACY_DONE_ALLOWLIST,
} from "../check-status-ledger.mjs";
import { hashVerifyCommands } from "../lib/task-status-ledger.mjs";

const REAL_SHA = "abc1234";
const FORGED_SHA = "deadbeef";
const TASK_PATH = "tasks/mvp/01-engine-core/03-implement-pcg32-prng-with-named-sub-streams.md";
const TASK_ID = "mvp.01-engine-core.03-implement-pcg32-prng-with-named-sub-streams";
const VERIFY_COMMANDS = ["npm test", "npm run validate"];
const VERIFY_HASH = hashVerifyCommands(VERIFY_COMMANDS);

function makeRegistry(overrides = {}) {
  return {
    tasks: [
      {
        id: TASK_ID,
        path: TASK_PATH,
        verifyCommands: VERIFY_COMMANDS,
        ...overrides,
      },
    ],
  };
}

function makeLedger(entry) {
  return {
    tasks: { [TASK_ID]: entry },
  };
}

function realGit() {
  return {
    gitCommitExists: (sha) => sha === REAL_SHA,
    gitCommitTouchesPath: (sha, p) => sha === REAL_SHA && p === TASK_PATH,
  };
}

const IMPL_LOG_WITH_TASK = `- 2026-05-07  ${TASK_ID}  (@${REAL_SHA})  — PCG32 PRNG\n`;
const IMPL_LOG_EMPTY = "- 2026-04-01  some-other-task  (@xxxxxx)  — Other\n";

// -------------------------------------------------------------------
// Positive scenarios: legitimate state should pass.
// -------------------------------------------------------------------

test("PASS: legitimate done entry produced by tasks:done", () => {
  const ledger = makeLedger({
    status: "done",
    updatedAt: "2026-05-07T12:00:00Z",
    completedAt: "2026-05-07T12:00:00Z",
    completedAtSha: REAL_SHA,
    verifyCommandsHash: VERIFY_HASH,
  });
  const { failures } = runLedgerChecks({
    ledger,
    registry: makeRegistry(),
    implLog: IMPL_LOG_WITH_TASK,
    ...realGit(),
  });
  assert.deepEqual(failures, [], `expected no failures, got: ${failures.join(" | ")}`);
});

test("PASS: planned entry has no integrity requirements", () => {
  const ledger = makeLedger({ status: "planned", updatedAt: "2026-05-07T12:00:00Z" });
  const { failures } = runLedgerChecks({
    ledger,
    registry: makeRegistry(),
    implLog: "",
    ...realGit(),
  });
  assert.deepEqual(failures, []);
});

test("PASS: revalidate status has no integrity requirements", () => {
  // Pre-gate work flips to status:revalidate (not done). The gate
  // accepts it without completedAtSha / verifyCommandsHash; promotion
  // to a real done happens via `tasks:revalidate`.
  const ledger = makeLedger({
    status: "revalidate",
    updatedAt: "2026-05-09T12:00:00Z",
  });
  const { failures } = runLedgerChecks({
    ledger,
    registry: makeRegistry(),
    implLog: "",
    ...realGit(),
  });
  assert.deepEqual(failures, [], `expected no failures for revalidate, got: ${failures.join(" | ")}`);
});

// -------------------------------------------------------------------
// Cheat scenarios: each must be caught by the validator.
// -------------------------------------------------------------------

test("CHEAT 1: hand-edit `Status:` in a task .md", () => {
  const { failures } = runLedgerChecks({
    ledger: { tasks: {} },
    registry: makeRegistry(),
    implLog: "",
    taskMdStatusViolations: [TASK_PATH],
    ...realGit(),
  });
  assert.ok(
    failures.some((f) => f.includes(TASK_PATH) && f.includes("Status:")),
    `expected Status: violation for ${TASK_PATH}, got: ${failures.join(" | ")}`,
  );
});

test("CHEAT 2: done entry with no completedAtSha", () => {
  const ledger = makeLedger({
    status: "done",
    updatedAt: "2026-05-07T12:00:00Z",
    // missing completedAtSha
    verifyCommandsHash: VERIFY_HASH,
  });
  const { failures } = runLedgerChecks({
    ledger,
    registry: makeRegistry(),
    implLog: IMPL_LOG_WITH_TASK,
    ...realGit(),
  });
  assert.ok(
    failures.some((f) => f.includes("no completedAtSha")),
    `expected 'no completedAtSha' failure, got: ${failures.join(" | ")}`,
  );
});

test("CHEAT 3: forged completedAtSha (does not exist in git)", () => {
  const ledger = makeLedger({
    status: "done",
    updatedAt: "2026-05-07T12:00:00Z",
    completedAtSha: FORGED_SHA,
    verifyCommandsHash: VERIFY_HASH,
  });
  const { failures } = runLedgerChecks({
    ledger,
    registry: makeRegistry(),
    implLog: IMPL_LOG_WITH_TASK,
    ...realGit(),
  });
  assert.ok(
    failures.some((f) => f.includes("forged SHA") || f.includes("does not exist in git")),
    `expected forged-SHA failure, got: ${failures.join(" | ")}`,
  );
});

test("CHEAT 4: done entry with no implementation-log line", () => {
  const ledger = makeLedger({
    status: "done",
    updatedAt: "2026-05-07T12:00:00Z",
    completedAtSha: REAL_SHA,
    verifyCommandsHash: VERIFY_HASH,
  });
  const { failures } = runLedgerChecks({
    ledger,
    registry: makeRegistry(),
    implLog: IMPL_LOG_EMPTY, // does not mention TASK_ID
    ...realGit(),
  });
  assert.ok(
    failures.some((f) => f.includes("no entry in docs/planning/implementation-log.md")),
    `expected impl-log failure, got: ${failures.join(" | ")}`,
  );
});

test("CHEAT 5: late-stage weakening of verifyCommands (hash mismatch)", () => {
  // Agent recorded the hash of a strong verify list at done-time, then
  // later edited the task .md to weaken verifyCommands. The recorded
  // hash no longer matches the registry's current verifyCommands.
  const STALE_HASH = hashVerifyCommands(["npm test", "strong check"]);
  const ledger = makeLedger({
    status: "done",
    updatedAt: "2026-05-07T12:00:00Z",
    completedAtSha: REAL_SHA,
    verifyCommandsHash: STALE_HASH,
  });
  const registry = makeRegistry({ verifyCommands: ["echo ok"] }); // weakened
  const { failures } = runLedgerChecks({
    ledger,
    registry,
    implLog: IMPL_LOG_WITH_TASK,
    ...realGit(),
  });
  assert.ok(
    failures.some((f) => f.includes("verify list was weakened")),
    `expected verify-list-weakened failure, got: ${failures.join(" | ")}`,
  );
});

test("CHEAT 6: done entry with no verifyCommandsHash", () => {
  const ledger = makeLedger({
    status: "done",
    updatedAt: "2026-05-07T12:00:00Z",
    completedAtSha: REAL_SHA,
    // verifyCommandsHash missing
  });
  const { failures } = runLedgerChecks({
    ledger,
    registry: makeRegistry(),
    implLog: IMPL_LOG_WITH_TASK,
    ...realGit(),
  });
  assert.ok(
    failures.some((f) => f.includes("no verifyCommandsHash")),
    `expected no-hash failure, got: ${failures.join(" | ")}`,
  );
});

test("CHEAT 7: legacy:true on any entry (field is retired)", () => {
  // The legacy exemption was retired 2026-05-09 in favor of the
  // explicit `revalidate` status. Any entry still carrying the field
  // is rejected.
  const ledger = makeLedger({
    status: "done",
    updatedAt: "2026-05-07T12:00:00Z",
    legacy: true,
  });
  const { failures } = runLedgerChecks({
    ledger,
    registry: makeRegistry(),
    implLog: "",
    ...realGit(),
  });
  assert.ok(
    failures.some((f) => f.includes("legacy:true") && f.includes("retired")),
    `expected legacy-retired failure, got: ${failures.join(" | ")}`,
  );
});

test("CHEAT 8: invalid status string in ledger", () => {
  const ledger = makeLedger({
    status: "totally-done",
    updatedAt: "2026-05-07T12:00:00Z",
  });
  const { failures } = runLedgerChecks({
    ledger,
    registry: makeRegistry(),
    implLog: "",
    ...realGit(),
  });
  assert.ok(
    failures.some((f) => f.includes("invalid status")),
    `expected invalid-status failure, got: ${failures.join(" | ")}`,
  );
});

test("CHEAT 9: registry has a task with no ledger entry", () => {
  const ledger = { tasks: {} };
  const { failures } = runLedgerChecks({
    ledger,
    registry: makeRegistry(),
    implLog: "",
    ...realGit(),
  });
  assert.ok(
    failures.some((f) => f.includes("missing entry for task")),
    `expected missing-entry failure, got: ${failures.join(" | ")}`,
  );
});

// -------------------------------------------------------------------
// Sanity: the legacy allowlist itself.
// -------------------------------------------------------------------

test("LEGACY_DONE_ALLOWLIST is empty (legacy field retired 2026-05-09)", () => {
  assert.equal(
    LEGACY_DONE_ALLOWLIST.size,
    0,
    "legacy field is retired; allowlist must remain empty. Extending it would " +
    "re-introduce the cheat surface that the revalidate status replaced.",
  );
});

test("hashVerifyCommands is deterministic for the same input", () => {
  const a = hashVerifyCommands(["npm test", "npm run validate"]);
  const b = hashVerifyCommands(["npm test", "npm run validate"]);
  assert.equal(a, b);
  assert.match(a, /^sha256:[0-9a-f]{64}$/);
});

test("hashVerifyCommands changes when the list changes", () => {
  const strong = hashVerifyCommands(["npm test", "npm run test:mutation"]);
  const weak = hashVerifyCommands(["echo ok"]);
  assert.notEqual(strong, weak);
});
