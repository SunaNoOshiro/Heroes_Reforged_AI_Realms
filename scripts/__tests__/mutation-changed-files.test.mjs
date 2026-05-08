// Unit tests for mutation-changed-files.mjs filtering logic.
//
// We test the candidate-filter (isMutationCandidate) directly because
// it encodes the policy: which paths are mutation targets when they
// appear in a git diff. The runStryker / listChangedFiles paths are
// integration concerns and would require a real git repo + Stryker
// install to exercise — out of scope for unit tests.

import assert from "node:assert/strict";
import test from "node:test";
import { isMutationCandidate } from "../mutation-changed-files.mjs";

// -------------------------------------------------------------------
// Positive cases: legitimate mutation targets
// -------------------------------------------------------------------

test("INCLUDES: src/ TypeScript file", () => {
  assert.equal(isMutationCandidate("src/engine/combat.ts"), true);
});

test("INCLUDES: services/ TypeScript file", () => {
  assert.equal(isMutationCandidate("services/signaling/router.ts"), true);
});

test("INCLUDES: src/ TSX file", () => {
  assert.equal(isMutationCandidate("src/ui/components/Hero.tsx"), true);
});

test("INCLUDES: deeply nested src/ file", () => {
  assert.equal(isMutationCandidate("src/engine/sim/turn/processor.ts"), true);
});

// -------------------------------------------------------------------
// Negative cases: paths that must be excluded
// -------------------------------------------------------------------

test("EXCLUDES: docs path", () => {
  assert.equal(isMutationCandidate("docs/architecture/foo.md"), false);
});

test("EXCLUDES: tests directory file", () => {
  assert.equal(isMutationCandidate("tests/lint/no-raw-error.ts"), false);
});

test("EXCLUDES: scripts directory (non-mutation)", () => {
  assert.equal(isMutationCandidate("scripts/check-status-ledger.mjs"), false);
});

test("EXCLUDES: .test.ts files (mutation can't run on tests themselves)", () => {
  assert.equal(isMutationCandidate("src/engine/__tests__/combat.test.ts"), false);
});

test("EXCLUDES: .spec.ts files", () => {
  assert.equal(isMutationCandidate("src/engine/combat.spec.ts"), false);
});

test("EXCLUDES: .d.ts type-declaration files", () => {
  assert.equal(isMutationCandidate("src/engine/types.d.ts"), false);
});

test("EXCLUDES: __tests__ directory contents", () => {
  assert.equal(isMutationCandidate("src/engine/__tests__/helpers.ts"), false);
});

test("EXCLUDES: fixtures directory contents", () => {
  assert.equal(isMutationCandidate("src/engine/fixtures/sample.ts"), false);
});

test("EXCLUDES: src/contracts/ (pure types, no behavior)", () => {
  assert.equal(isMutationCandidate("src/contracts/command-bus.ts"), false);
});

test("EXCLUDES: constants.ts files (literal constants)", () => {
  assert.equal(isMutationCandidate("src/engine/constants.ts"), false);
});

test("EXCLUDES: JSON file in src/", () => {
  assert.equal(isMutationCandidate("src/engine/data.json"), false);
});

test("EXCLUDES: package.json", () => {
  assert.equal(isMutationCandidate("package.json"), false);
});

test("EXCLUDES: file outside src/ or services/", () => {
  assert.equal(isMutationCandidate("content-schema/schemas/hero.schema.json"), false);
});

// -------------------------------------------------------------------
// Cheat-relevant scenarios
// -------------------------------------------------------------------

test("CHEAT: drive-by edit to src/shared/utils.ts is a candidate even if no task owns it", () => {
  // Even if the agent's "current task" claims docs-only ownedPaths,
  // editing this file in the same PR makes it a mutation target —
  // that's the whole point of the changed-files gate.
  assert.equal(isMutationCandidate("src/shared/utils.ts"), true);
});

test("CHEAT: agent renaming a .ts to .test.ts to dodge mutation testing is caught by the rename rule (.test.ts excluded)", () => {
  // The cheat: rename combat.ts -> combat.test.ts so it's excluded.
  // The exclusion is correct (you can't mutate a test file), but the
  // ORIGINAL combat.ts deletion would still appear in `git diff`.
  // The rename leaves a renamed entry in `--diff-filter=AMR`. We
  // don't unit-test the diff-filter side here, but we do confirm
  // the predicate excludes the renamed file deterministically.
  assert.equal(isMutationCandidate("src/engine/combat.test.ts"), false);
});
