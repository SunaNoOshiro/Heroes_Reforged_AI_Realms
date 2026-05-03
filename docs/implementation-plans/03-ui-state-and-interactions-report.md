# Implementation Report: 03 — UI State & Interactions

> Source plan: [03-ui-state-and-interactions-plan.md](./03-ui-state-and-interactions-plan.md)
>
> Applied: 2026-05-03. `npm run validate` (links, contracts,
> cross-refs, commands, tasks, arch, ui-components), `npm test`
> (15/15), and `npm run generate:wiki` all pass green. Task registry:
> 308 tasks across 24 modules.

---

## 1. Updated Files

| Path | Change |
|------|--------|
| [`content-schema/schemas/ruleset.schema.json`](../../content-schema/schemas/ruleset.schema.json) | Additively extended with optional `ui.timing` (`tooltipHoldDelayMs`, `tooltipFadeInMs`, `tooltipFadeOutMs`, `doubleClickWindowMs`, `longPressMs`, `dragThresholdPx`, `inputDebounceMs`, `endTurnAnimationMaxMs`) and `ui.editor.maxHistory`. Existing `constants` and `formulas` shape unchanged. |
| [`content-schema/examples/records/rulesets/baseline.ruleset.json`](../../content-schema/examples/records/rulesets/baseline.ruleset.json) | Carries the canonical `ui.timing` and `ui.editor` block. |
| [`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs) | Added `.error-state.json`, `.modal-entry.json`, `.hotkey.json` suffix mappings to `schemaForFile`. |
| [`docs/architecture/overview.md`](../architecture/overview.md) | Linked the six new UI cross-screen docs. |
| [`docs/architecture/schema-matrix.md`](../architecture/schema-matrix.md) | Registered `ErrorState`, `ModalEntry`, `HotkeyRegistry`. |
| [`content-schema/schemas/README.md`](../../content-schema/schemas/README.md) | Added a "UI presentation contracts" family entry. |
| [`docs/architecture/wiki/README.md`](../architecture/wiki/README.md) | Added the seven-state Animation Contract rule, the `Hotkey` column requirement, the canonical-gesture rule, modal Esc-row rule, `ErrorState` typing rule, orphan-screen rule, and links to all six new docs. |
| [`docs/architecture/wiki/missing-states.md`](../architecture/wiki/missing-states.md) | Replaced the prose state acknowledgment with pointers to the canonical contracts. |
| [`docs/architecture/determinism.md`](../architecture/determinism.md) | Added forward links: § UI Selector Purity and § Single-emit Per Input Gesture. |
| [`docs/architecture/state-flow.md`](../architecture/state-flow.md) | Added § Command Lifecycle (UI side) cross-reference. |
| [`docs/architecture/renderer-technology-choice.md`](../architecture/renderer-technology-choice.md) | Linked `ui-input-modalities.md` in Related Files. |
| [`CLAUDE.md`](../../CLAUDE.md) | Appended six new UI docs to the read-first index. |
| [`docs/architecture/diagrams/index.json`](../architecture/diagrams/index.json) | Added a `ui-input` category for `29-input-arbitration`. |
| [`docs/planning/implementation-log.md`](../planning/implementation-log.md) | Logged the 2026-05-03 UI State & Interactions plan implementation pass. |
| [`tasks/mvp/02-content-schemas.md`](../../tasks/mvp/02-content-schemas.md) | Registered task 21 (ErrorState schema). |
| [`tasks/mvp/07-ui-shell.md`](../../tasks/mvp/07-ui-shell.md) | Registered tasks 10–20. |
| [`tasks/phase-2/08-meta-systems.md`](../../tasks/phase-2/08-meta-systems.md) | Registered task 9 (map-editor undo/redo). |

---

## 2. New Files

### Schemas + Examples

| Path | Purpose |
|------|---------|
| [`content-schema/schemas/error-state.schema.json`](../../content-schema/schemas/error-state.schema.json) | Canonical UI error record. |
| [`content-schema/schemas/modal-entry.schema.json`](../../content-schema/schemas/modal-entry.schema.json) | One frame on `state.ui.modalStack`. |
| [`content-schema/schemas/hotkey.schema.json`](../../content-schema/schemas/hotkey.schema.json) | Global hotkey registry. |
| [`content-schema/examples/records/error-state/recoverable-load.error-state.json`](../../content-schema/examples/records/error-state/recoverable-load.error-state.json) | `warn` recoverable scenario-load failure. |
| [`content-schema/examples/records/error-state/invalid-target.error-state.json`](../../content-schema/examples/records/error-state/invalid-target.error-state.json) | `warn` recoverable invalid spell target. |
| [`content-schema/examples/records/error-state/save-failed.error-state.json`](../../content-schema/examples/records/error-state/save-failed.error-state.json) | `error` non-recoverable save failure. |
| [`content-schema/examples/records/modal-entry/system-menu.modal-entry.json`](../../content-schema/examples/records/modal-entry/system-menu.modal-entry.json) | System-menu push. |
| [`content-schema/examples/records/modal-entry/quit-confirmation.modal-entry.json`](../../content-schema/examples/records/modal-entry/quit-confirmation.modal-entry.json) | Destructive quit-confirmation push from system menu. |
| [`content-schema/examples/records/modal-entry/recruitment.modal-entry.json`](../../content-schema/examples/records/modal-entry/recruitment.modal-entry.json) | Recruitment-from-town info push. |
| [`content-schema/examples/records/hotkey/global-default.hotkey.json`](../../content-schema/examples/records/hotkey/global-default.hotkey.json) | Canonical default registry (global, screen-scoped, modal-scoped entries). |

### Architecture Docs

| Path | Purpose |
|------|---------|
| [`docs/architecture/ui-state-contract.md`](../architecture/ui-state-contract.md) | Host doc: component-state matrix, selector purity, tooltip lifecycle, command lifecycle, error state, undo/redo. |
| [`docs/architecture/ui-routing.md`](../architecture/ui-routing.md) | Screen-router FSM, transition graph, modal stack, dismissal policy. |
| [`docs/architecture/ui-input-arbitration.md`](../architecture/ui-input-arbitration.md) | Single-emit per gesture, Esc precedence ladder, animation gates. |
| [`docs/architecture/ui-gestures.md`](../architecture/ui-gestures.md) | Gesture taxonomy and drag contract. |
| [`docs/architecture/ui-hotkeys.md`](../architecture/ui-hotkeys.md) | Hotkey registry, focus order, tab-trap, focus restoration. |
| [`docs/architecture/ui-input-modalities.md`](../architecture/ui-input-modalities.md) | Mouse / touch / keyboard / gamepad bridging. |
| [`docs/architecture/screen-transition-graph.json`](../architecture/screen-transition-graph.json) | Smoke-render baseline of the aggregated transition graph. |
| [`docs/architecture/diagrams/29-input-arbitration.md`](../architecture/diagrams/29-input-arbitration.md) | Click + hotkey race sequence diagram. |
| [`docs/architecture/wiki/_templates/animation-states.md`](../architecture/wiki/_templates/animation-states.md) | Per-screen seven-state sweep template. |
| [`docs/architecture/wiki/_templates/contract-sweep.md`](../architecture/wiki/_templates/contract-sweep.md) | Per-screen four-contract sweep template. |

### Task Records

| Path | Issue |
|------|-------|
| [`tasks/mvp/02-content-schemas/21-error-state-schema.md`](../../tasks/mvp/02-content-schemas/21-error-state-schema.md) | 3.B-1 |
| [`tasks/mvp/07-ui-shell/10-selector-purity-lint.md`](../../tasks/mvp/07-ui-shell/10-selector-purity-lint.md) | 3.A-2 |
| [`tasks/mvp/07-ui-shell/11-screen-router-fsm.md`](../../tasks/mvp/07-ui-shell/11-screen-router-fsm.md) | 3.A-1 |
| [`tasks/mvp/07-ui-shell/12-component-state-matrix.md`](../../tasks/mvp/07-ui-shell/12-component-state-matrix.md) | 3.A-3 (host doc) |
| [`tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md`](../../tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md) | 3.D-1 + 3.D-2 |
| [`tasks/mvp/07-ui-shell/14-modal-stack.md`](../../tasks/mvp/07-ui-shell/14-modal-stack.md) | 3.A-4 + 3.A-5 |
| [`tasks/mvp/07-ui-shell/15-input-arbitration.md`](../../tasks/mvp/07-ui-shell/15-input-arbitration.md) | 3.A-6 |
| [`tasks/mvp/07-ui-shell/16-gesture-taxonomy.md`](../../tasks/mvp/07-ui-shell/16-gesture-taxonomy.md) | 3.A-7 |
| [`tasks/mvp/07-ui-shell/17-tooltip-lifecycle.md`](../../tasks/mvp/07-ui-shell/17-tooltip-lifecycle.md) | 3.A-8 + 3.D-3 |
| [`tasks/mvp/07-ui-shell/18-hotkey-registry.md`](../../tasks/mvp/07-ui-shell/18-hotkey-registry.md) | 3.A-9 + 3.B-3 |
| [`tasks/mvp/07-ui-shell/19-input-modalities.md`](../../tasks/mvp/07-ui-shell/19-input-modalities.md) | 3.A-10 |
| [`tasks/mvp/07-ui-shell/20-command-lifecycle.md`](../../tasks/mvp/07-ui-shell/20-command-lifecycle.md) | 3.A-11 |
| [`tasks/phase-2/08-meta-systems/09-map-editor-undo-redo.md`](../../tasks/phase-2/08-meta-systems/09-map-editor-undo-redo.md) | 3.A-12 |

---

## 3. Assumptions

⚠️ **Diagram numbering.** The plan's nominal slot
`docs/architecture/diagrams/27-input-arbitration.md` collided with
the existing `27-component-resolution.md`. The diagram landed at
`29-input-arbitration.md` (next free numeric slot) to preserve
stable ids.

⚠️ **Error-state task placement.** The plan referenced
`tasks/mvp/08-content-platform/<n>-error-state-schema.md`, but no
`tasks/mvp/08-content-platform/` module exists in this repo. The
ErrorState schema task landed under
`tasks/mvp/02-content-schemas/21-error-state-schema.md`, matching
the existing pattern (rulesets, hero, etc., all live in
`02-content-schemas/`).

⚠️ **Modal hotkey ids.** The plan's hotkey-id naming convention used
`modal.<modal-slug>.<action>` informally, but `hotkey.schema.json`'s
id regex is `^(global|screen)\.…`. Modal-scoped entries are named
with the `screen.` prefix plus `scope: "modal"`, per the schema
doc's "usage convention vs. schema" note.

⚠️ **Example file names.** The plan said example files like
`recoverable-load.json`. The repo's contract validator uses
suffix-based schema mapping, so files are named
`<id>.<schema-name>.json` (e.g. `recoverable-load.error-state.json`)
to match existing examples (`mine-guard-t2.neutral-stack-template.json`,
etc.) and `schemaForFile` was extended accordingly.

⚠️ **Shared-only task ownership.** Task 17 (tooltip-lifecycle) and
Task 20 (command-lifecycle) only extend host docs; they list
`Owned Paths (shared):` and omit `Owned Paths:`. That keeps
`task.ownedPaths` non-empty (lint passes) without triggering the
unsafe-opt-out gate that fires when an opt-out task lists
`content-schema/` paths in Outputs.

⚠️ **Smoke-render transition graph.** The Mermaid block in
`ui-routing.md` and the JSON artifact `screen-transition-graph.json`
are stubs covering the highest-traffic transitions; the real
generator (`scripts/generate-screen-transition-graph.mjs`) and the
full per-screen sweep land in
[`tasks/mvp/07-ui-shell/11-screen-router-fsm.md`](../../tasks/mvp/07-ui-shell/11-screen-router-fsm.md).

---

## 4. Blockers

None.

---

## 5. Verification Summary

```text
$ npm run validate
generate:task-registry  → Wrote 308 tasks and 24 modules
validate:links          → All Markdown links resolve.
validate:contracts      → Repo contract checks passed.
validate:cross-refs     → Cross-reference checks passed.
validate:commands       → Command coverage check passed.
validate:tasks          → Task lint passed: 308 tasks, 0 issues.
validate:arch           → Module-graph check passed.
validate:ui-components  → Screen component coverage check passed.

$ npm test
# tests 15  # pass 15  # fail 0

$ npm run generate:wiki
Loaded 31 architecture docs, 27 general diagrams, 66 UI screen
packages, 9 UI screen groups.
Built: docs/architecture/architecture-wiki.html (1908.1 KB)
```
