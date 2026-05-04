// Per-screen smoke template. Copy this file to
// src/ui/__tests__/screens/<nn-screen>.smoke.test.ts and replace the
// placeholders below. The runner (scripts/verify-ui-smoke.mjs) skips
// any file whose name matches `smoke.template.*`, so this template
// itself never runs.
//
// Contract pinned in:
//   docs/architecture/testing/ui-smoke-contract.md
// Screen package source of truth:
//   docs/architecture/wiki/screens/<nn-screen>/spec.md
//   docs/architecture/wiki/screens/<nn-screen>/interactions.md
//   docs/architecture/wiki/screens/<nn-screen>/data-contracts.md
//
// The template intentionally does not import a test runner: the file
// is loaded as a template only. When you copy it, replace these
// stubs with real `describe` / `it` / `expect` from the test runner
// pinned by mvp.01-engine-core.02-set-up-vite-plus-typescript-strict-mode-per-module.

export const smokeTemplateMarker = "smoke.template" as const;

export interface SmokeTemplateContract {
  // 1. Mount with canonical example data. Replace with the screen's
  //    canonical example record cited in `data-contracts.md`.
  mount: () => unknown;
  // 2. Bindings reachable. Replace with the data-component /
  //    data-state / data-action / data-i18n list from `spec.md`.
  bindings: () => string[];
  // 3. Interactions invokable. Replace with the per-control gesture
  //    list from `interactions.md`.
  interactions: () => Array<{
    control: string;
    gesture: "click" | "hover" | "key";
  }>;
}

export const smokeTemplate: SmokeTemplateContract = {
  mount: () => undefined,
  bindings: () => [],
  interactions: () => []
};
