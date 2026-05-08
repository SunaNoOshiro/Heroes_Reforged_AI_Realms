// Tests for deriveVerifyCommands — the auto-applied verify gate that
// closes the per-task .md Verify-section cheat path. The canonical
// definition lives in scripts/lib/derive-verify-commands.mjs and is
// imported by scripts/tasks.mjs and scripts/recheck-done-tasks.mjs.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  deriveVerifyCommands,
  ownsCodePath,
  ownsUiSurface,
} from "../lib/derive-verify-commands.mjs";

// -- Single-source-of-truth invariant ------------------------------
// If anyone re-introduces an inline copy of deriveVerifyCommands in
// tasks.mjs, this test fires. The whole point of the lib extraction
// is that the function must NOT be duplicated.

const here = path.dirname(fileURLToPath(import.meta.url));
const tasksPath = path.resolve(here, "..", "tasks.mjs");
const tasksSrc = readFileSync(tasksPath, "utf8");

test("INVARIANT: tasks.mjs imports deriveVerifyCommands from lib (no inline redefinition)", () => {
  assert.match(
    tasksSrc,
    /import\s*\{[^}]*deriveVerifyCommands[^}]*\}\s*from\s*["']\.\/lib\/derive-verify-commands\.mjs["']/,
    "tasks.mjs must import deriveVerifyCommands from ./lib/derive-verify-commands.mjs",
  );
  // Must not redeclare the function locally — only the imported binding.
  const bodyDecl = tasksSrc.match(/function\s+deriveVerifyCommands\b/g);
  assert.equal(
    bodyDecl,
    null,
    "tasks.mjs must not redeclare deriveVerifyCommands; use the lib import",
  );
});

// -- Lib also exports the predicates (used by recheck-done-tasks.mjs)

test("lib exports ownsCodePath and ownsUiSurface", () => {
  assert.equal(typeof ownsCodePath, "function");
  assert.equal(typeof ownsUiSurface, "function");
  assert.equal(ownsCodePath({ ownedPaths: ["src/engine/x.ts"] }), true);
  assert.equal(ownsCodePath({ ownedPaths: ["docs/x.md"] }), false);
  assert.equal(ownsUiSurface({ ownedPaths: ["src/ui/x.ts"] }), true);
  assert.equal(ownsUiSurface({ ownedPaths: ["src/engine/x.ts"] }), false);
});

// -- Behavioral tests --------------------------------------------

test("docs-only task gets exactly validate + npm test", () => {
  const task = { id: "doc-only", ownedPaths: ["docs/foo.md"] };
  assert.deepEqual(
    deriveVerifyCommands(task),
    ["npm run validate", "npm test"],
  );
});

test("src/ TS file triggers full code gate (6 commands, in order)", () => {
  const task = { id: "code-task", ownedPaths: ["src/engine/combat.ts"] };
  assert.deepEqual(deriveVerifyCommands(task), [
    "npm run validate",
    "npm test",
    "npm run test:coverage",
    "npm run test:mutation:changed",
    "npm run validate:mutation-score -- --task code-task --changed-only",
    "npm run validate:coverage-floor -- --task code-task",
  ]);
});

test("services/ TS file triggers code gate", () => {
  const task = { id: "y", ownedPaths: ["services/signaling/router.ts"] };
  const cmds = deriveVerifyCommands(task);
  assert.ok(cmds.includes("npm run test:mutation:changed"));
  assert.ok(cmds.includes("npm run validate:mutation-score -- --task y --changed-only"));
});

test("src/ui/ file triggers BOTH code AND ui gates (7 commands)", () => {
  const task = { id: "ui-task", ownedPaths: ["src/ui/components/Hero.tsx"] };
  const cmds = deriveVerifyCommands(task);
  assert.equal(cmds.length, 7);
  assert.ok(cmds.includes("npm run test:mutation:changed"), "code gate should fire");
  assert.ok(cmds.includes('node scripts/verify-ui-smoke.mjs "ui-task"'), "ui gate should fire");
});

test("CHEAT: agent declares only docs/ ownedPaths to skip code gate", () => {
  // The function trusts ownedPaths. The agent COULD declare a docs-only
  // ownedPaths and edit src/ in the same PR. The defense is structural:
  // the local `npm run test:mutation:changed` script (mutation-changed-files.mjs)
  // scans the git diff regardless of which task owns the files, so the
  // edit is caught at the next code-task verification OR by the local
  // pre-commit loop. This test documents the limit of the .md-driven gate.
  const task = { id: "lie", ownedPaths: ["docs/fake.md"] };
  const cmds = deriveVerifyCommands(task);
  assert.ok(!cmds.includes("npm run test:mutation:changed"));
});

test("CHEAT: extras in task.verifyCommands cannot REMOVE mandatory commands", () => {
  // The agent might try to override the mandatory list by passing only
  // a subset in their own verifyCommands. Our merge ALWAYS prepends the
  // mandatory commands first, so the agent can only ADD, never REMOVE.
  const task = {
    id: "code-task",
    ownedPaths: ["src/engine/foo.ts"],
    verifyCommands: ["echo bypass"],
  };
  const cmds = deriveVerifyCommands(task);
  assert.ok(cmds.includes("npm run test:mutation:changed"), "mandatory still present");
  assert.ok(cmds.includes("npm run validate:mutation-score -- --task code-task --changed-only"));
  assert.ok(cmds.includes("echo bypass"), "extras still appended");
});

test("CHEAT: duplicate mandatory commands in extras are de-duped (no order shuffle)", () => {
  const task = {
    id: "x",
    ownedPaths: ["docs/foo.md"],
    verifyCommands: ["npm run validate", "npm test", "npm run custom"],
  };
  const cmds = deriveVerifyCommands(task);
  // npm run validate appears once
  assert.equal(cmds.filter((c) => c === "npm run validate").length, 1);
  assert.equal(cmds.filter((c) => c === "npm test").length, 1);
  assert.ok(cmds.includes("npm run custom"));
});

test("CHEAT: empty ownedPaths array means no code/ui gate (docs-only behavior)", () => {
  const task = { id: "z", ownedPaths: [] };
  assert.deepEqual(deriveVerifyCommands(task), ["npm run validate", "npm test"]);
});

test("CHEAT: missing ownedPaths (undefined) means no code/ui gate", () => {
  const task = { id: "z" };
  assert.deepEqual(deriveVerifyCommands(task), ["npm run validate", "npm test"]);
});

test("CHEAT: src/contracts/foo.ts (pure types) still triggers code gate by file extension", () => {
  // The mutation-changed-files candidate filter excludes src/contracts/,
  // so even though THIS function fires the code gate for src/contracts/*.ts,
  // mutation:changed itself will skip those files. validate:mutation-score
  // with --changed-only will pass vacuously. That is the correct layered
  // behavior: gate fires (no special-casing here), filtering happens at
  // the mutation step. This test pins the layering so a future "fix" doesn't
  // accidentally weaken the gate by special-casing src/contracts/ here.
  const task = { id: "c", ownedPaths: ["src/contracts/foo.ts"] };
  const cmds = deriveVerifyCommands(task);
  assert.ok(cmds.includes("npm run test:mutation:changed"));
});

test("CHEAT: src/foo.json or src/foo.md in ownedPaths does NOT trigger code gate", () => {
  // .json and .md are explicitly excluded; the agent cannot list a JSON
  // schema as ownedPaths and have the function skip the code gate by accident.
  const taskJson = { id: "j", ownedPaths: ["src/engine/data.json"] };
  const taskMd = { id: "m", ownedPaths: ["src/engine/notes.md"] };
  assert.ok(!deriveVerifyCommands(taskJson).includes("npm run test:mutation:changed"));
  assert.ok(!deriveVerifyCommands(taskMd).includes("npm run test:mutation:changed"));
});

test("task.id is interpolated verbatim into --task arg", () => {
  // Defensive: ensure the id appears as written; no quoting that would
  // break shell parsing. (Task ids are constrained to [a-z0-9.-]+ by the
  // registry generator, so this is safe.)
  const task = { id: "mvp.01-engine.combat", ownedPaths: ["src/engine/c.ts"] };
  const cmds = deriveVerifyCommands(task);
  assert.ok(
    cmds.includes("npm run validate:mutation-score -- --task mvp.01-engine.combat --changed-only"),
  );
  assert.ok(cmds.includes("npm run validate:coverage-floor -- --task mvp.01-engine.combat"));
});
