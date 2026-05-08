// Stryker mutation-test configuration.
//
// Owned by the repo, NOT by any task. Per
// .claude/skills/mutation-test/SKILL.md anti-cheat rule D, no task's
// `ownedPaths` may include this file. Threshold or scope changes go
// through a separate PR with human review.
//
// Notes:
// - Test runner: Vitest. The repo's existing `node --test` files are
//   excluded from Vitest pickup (see vitest.config.ts) and continue to
//   run via `npm test`.
// - Mutation pattern: src/**/*.ts EXCEPT contracts (pure types),
//   constants, and tests. Per-PR scoping uses
//   `npm run test:mutation:changed` (drives Stryker against the git
//   diff). Task-scoped runs use `--mutate <glob>` ad-hoc; the gate
//   contract lives in scripts/lib/derive-verify-commands.mjs.
// - Thresholds match the SKILL.md module-class table.

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  packageManager: "npm",
  testRunner: "vitest",
  reporters: ["html", "json", "clear-text", "progress"],
  coverageAnalysis: "perTest",
  htmlReporter: {
    fileName: "reports/mutation/mutation.html",
  },
  jsonReporter: {
    fileName: "reports/mutation/mutation.json",
  },
  // The mutate-target rule is encoded in three coordinated places.
  // Keep these aligned when adding a new module (e.g. `src/audio/`):
  //   - this `mutate` array (Stryker's own picker)
  //   - `scripts/mutation-changed-files.mjs` `isMutationCandidate`
  //     (the git-diff filter for per-PR mutation runs)
  //   - `scripts/lib/owned-path-matchers.mjs` `isSourceTs` (the
  //     extension-only filter used by both validators)
  mutate: [
    "src/**/*.ts",
    "!src/**/*.spec.ts",
    "!src/**/*.test.ts",
    "!src/**/__tests__/**",
    "!src/**/fixtures/**",
    "!src/contracts/**",
    "!src/**/*.d.ts",
    "!src/**/constants.ts",
  ],
  checkers: ["typescript"],
  tsconfigFile: "tsconfig.base.json",
  incremental: false,
  incrementalFile: "reports/mutation/.stryker-incremental.json",
  // Module-class floors — any single-file score below these fails
  // validate:mutation-score. The aggregate Stryker thresholds below
  // are the project-wide floor; per-module gating happens in
  // scripts/validate-mutation-score.mjs.
  thresholds: {
    high: 80,
    low: 65,
    break: 60,
  },
  timeoutMS: 60000,
};
