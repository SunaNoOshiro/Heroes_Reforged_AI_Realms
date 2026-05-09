// Tests for the pure logic in recheck-done-tasks.mjs.
//
// findNewlyDone and dedupeCommands are exposed for testing because
// they encode the policy: which tasks need re-verification, and which
// commands actually need to run. The git/spawn/main path is integration
// concern — tested manually by running the script.

import assert from "node:assert/strict";
import test from "node:test";
import { findNewlyDone, dedupeCommands } from "../recheck-done-tasks.mjs";

// -- findNewlyDone --------------------------------------------------

test("findNewlyDone: planned -> done is newly-done", () => {
  const base = { tasks: { x: { status: "planned" } } };
  const head = { tasks: { x: { status: "done" } } };
  assert.deepEqual(findNewlyDone(base, head), ["x"]);
});

test("findNewlyDone: done -> done is NOT newly-done", () => {
  const base = { tasks: { x: { status: "done" } } };
  const head = { tasks: { x: { status: "done" } } };
  assert.deepEqual(findNewlyDone(base, head), []);
});

test("findNewlyDone: only-in-head + done is newly-done", () => {
  const base = { tasks: {} };
  const head = { tasks: { x: { status: "done" } } };
  assert.deepEqual(findNewlyDone(base, head), ["x"]);
});

test("findNewlyDone: revalidate entries are NOT newly-done", () => {
  const base = { tasks: {} };
  const head = { tasks: { x: { status: "revalidate" } } };
  // Revalidate entries lack the modern verifyCommandsHash anchor,
  // so re-running them would have nothing to compare against. They
  // are promoted to real done via tasks:revalidate, not via the
  // CI re-check path. The retired legacy:true field is rejected by
  // validate:status-ledger before this code ever runs.
  assert.deepEqual(findNewlyDone(base, head), []);
});

test("findNewlyDone: in-progress is NOT newly-done", () => {
  const base = { tasks: {} };
  const head = { tasks: { x: { status: "in-progress" } } };
  assert.deepEqual(findNewlyDone(base, head), []);
});

test("findNewlyDone: blocked is NOT newly-done", () => {
  const base = { tasks: {} };
  const head = { tasks: { x: { status: "blocked", blockedReason: "..." } } };
  assert.deepEqual(findNewlyDone(base, head), []);
});

test("findNewlyDone: handles null baseLedger (first commit / no base)", () => {
  const head = { tasks: { x: { status: "done" }, y: { status: "done" } } };
  assert.deepEqual(findNewlyDone(null, head), ["x", "y"]);
});

test("findNewlyDone: blocked -> done is newly-done", () => {
  const base = { tasks: { x: { status: "blocked" } } };
  const head = { tasks: { x: { status: "done" } } };
  assert.deepEqual(findNewlyDone(base, head), ["x"]);
});

test("findNewlyDone: result is sorted (deterministic CI output)", () => {
  const base = { tasks: {} };
  const head = {
    tasks: {
      "z-task": { status: "done" },
      "a-task": { status: "done" },
      "m-task": { status: "done" },
    },
  };
  assert.deepEqual(findNewlyDone(base, head), ["a-task", "m-task", "z-task"]);
});

test("CHEAT: agent removes a done entry from base→head — not flagged here", () => {
  // Reverting a done is a separate cheat path (caught by check-status-ledger
  // missing-entry rule). This script ONLY checks newly-done; it doesn't
  // assert the absence of regression. Document the limit.
  const base = { tasks: { x: { status: "done" } } };
  const head = { tasks: {} };
  assert.deepEqual(findNewlyDone(base, head), []);
});

// -- dedupeCommands -------------------------------------------------

test("dedupeCommands: globals are run once across multiple tasks", () => {
  const registry = {
    tasks: [
      { id: "a", ownedPaths: ["docs/a.md"] },
      { id: "b", ownedPaths: ["docs/b.md"] },
    ],
  };
  const queue = dedupeCommands(["a", "b"], registry);
  // Both tasks expand to ["npm run validate", "npm test"]; dedupe → 2.
  assert.equal(queue.length, 2);
  assert.deepEqual(
    queue.map((q) => q.cmd),
    ["npm run validate", "npm test"],
  );
});

test("dedupeCommands: per-task commands are NOT deduped (different task-id)", () => {
  const registry = {
    tasks: [
      { id: "a", ownedPaths: ["src/engine/a.ts"] },
      { id: "b", ownedPaths: ["src/engine/b.ts"] },
    ],
  };
  const queue = dedupeCommands(["a", "b"], registry);
  // Globals (validate, test, validate:duplication, validate:smells,
  // validate:dead-code, test:coverage, mutation:changed) deduped → 7.
  // Per-task (validate:mutation-score, validate:coverage-floor) × 2 → 4.
  assert.equal(queue.length, 11);
  const cmds = queue.map((q) => q.cmd);
  assert.equal(cmds.filter((c) => c === "npm run validate").length, 1);
  assert.equal(cmds.filter((c) => c === "npm run test:mutation:changed").length, 1);
  assert.equal(
    cmds.filter((c) => c.startsWith("npm run validate:mutation-score")).length,
    2,
  );
  assert.equal(
    cmds.filter((c) => c.startsWith("npm run validate:coverage-floor")).length,
    2,
  );
});

test("dedupeCommands: missing task in registry is flagged not skipped", () => {
  const registry = { tasks: [] };
  const queue = dedupeCommands(["ghost"], registry);
  assert.equal(queue.length, 1);
  assert.equal(queue[0].missingTask, true);
  assert.equal(queue[0].taskId, "ghost");
  assert.equal(queue[0].cmd, null);
});

test("dedupeCommands: attributes globals to the FIRST task and tracks sharedWith", () => {
  // For blame-on-failure clarity: the first task that needs 'npm run
  // validate' is the canonical 'taskId', and sharedWith lists every
  // task that depends on that command.
  const registry = {
    tasks: [
      { id: "first-task", ownedPaths: ["docs/a.md"] },
      { id: "second-task", ownedPaths: ["docs/b.md"] },
    ],
  };
  const queue = dedupeCommands(["first-task", "second-task"], registry);
  const validateEntry = queue.find((q) => q.cmd === "npm run validate");
  assert.equal(validateEntry.taskId, "first-task");
  assert.deepEqual(validateEntry.sharedWith, ["first-task", "second-task"]);
});

test("dedupeCommands: sharedWith captures every task that needs a global", () => {
  // Patch K invariant: when 3+ tasks all need the same global command
  // (e.g. `npm run validate`), `sharedWith` lists ALL of them so the
  // failure log can blame accurately, not just the first task.
  const registry = {
    tasks: [
      { id: "a", ownedPaths: ["src/engine/a.ts"] },
      { id: "b", ownedPaths: ["docs/b.md"] },
      { id: "c", ownedPaths: ["src/ui/c.tsx"] },
    ],
  };
  const queue = dedupeCommands(["a", "b", "c"], registry);
  const validate = queue.find((q) => q.cmd === "npm run validate");
  assert.equal(validate.taskId, "a", "first-task wins as canonical taskId");
  assert.deepEqual(validate.sharedWith, ["a", "b", "c"]);
  // npm test is also a global — same expectation.
  const npmTest = queue.find((q) => q.cmd === "npm test");
  assert.deepEqual(npmTest.sharedWith, ["a", "b", "c"]);
});

test("dedupeCommands: ui-task gets ui smoke per task", () => {
  const registry = {
    tasks: [
      { id: "ui-a", ownedPaths: ["src/ui/a.tsx"] },
      { id: "ui-b", ownedPaths: ["src/ui/b.tsx"] },
    ],
  };
  const queue = dedupeCommands(["ui-a", "ui-b"], registry);
  const cmds = queue.map((q) => q.cmd);
  assert.equal(
    cmds.filter((c) => c && c.includes("verify-ui-smoke")).length,
    2,
  );
});

test("CHEAT: empty newlyDone array → empty queue", () => {
  const queue = dedupeCommands([], { tasks: [] });
  assert.deepEqual(queue, []);
});
