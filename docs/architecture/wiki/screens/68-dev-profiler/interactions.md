# Screen 68: Dev Profiler
## Interaction Map

### Source Files
- Mockup: [`mockup.html`](./mockup.html)
- Spec: [`spec.md`](./spec.md)
- Data Contracts: [`data-contracts.md`](./data-contracts.md)
- Architecture Diagrams: [`architecture.md`](./architecture.md)

### Purpose

Developer-only profiling overlay. Read-only; owns its toggle
visibility only — never dispatches gameplay commands.

### Actions

| UI element | Action ID | Type | Next screen | Command / event | Data updated | Animation / audio |
| --- | --- | --- | --- | --- | --- | --- |
| Toggle overlay (`Ctrl+Shift+P`) | `devProfiler.toggleVisibility` | local-ui | Current screen | none | `state.perf.overlayVisible := !state.perf.overlayVisible` | None. |

The same action handles show and hide; pressing the hotkey while the
overlay is visible writes `state.perf.overlayVisible = false`.

### State Changes

Every binding under `state.perf.*` is read-only from the overlay. The
reducer never writes these slices from a profiler call; they are
populated by their producers below.

| Slice | Producer | Cadence |
| --- | --- | --- |
| `state.perf.fps`, `state.perf.frameMs` | sliding-window frame-time measurement | 1 Hz |
| `state.perf.cpuPerSystem` | per-system instrumentation hooks (presentation-only; never in the canonical state hash) | per frame |
| `state.perf.allocPerFrame` | `--expose-gc` sampler — populated only when available (dev / Node CI / `?dev_profiler=1` plus the relevant Chromium switch); otherwise `null` | per frame |
| `state.perf.heap` | `performance.measureUserAgentSpecificMemory()` / DevTools heap API | 1 Hz |
| `state.perf.aiCompute` | AI worker move-result message ([`mvp.10-heuristic-ai.06-run-ai-in-web-worker`](../../../../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md)) | per AI move |
| `state.perf.pools` | pool occupancy selectors ([`mvp.00-perf.05-object-pools`](../../../../../tasks/mvp/00-perf/05-object-pools.md)) | per frame |
| `state.perf.animations` | renderer animation count | per frame |
| `state.perf.overlayVisible` | this action | on hotkey toggle |

### Navigation Outcomes

- None. The overlay never routes. Hiding it returns input control to
  the layer below without a route change.

### Disabled And Error Cases

- **PROD without `?dev_profiler=1`.** The screen is not rendered and
  the hotkey is unbound (tree-shaken per
  [`ui-technology-choice.md` § Build Flags](../../../ui-technology-choice.md#build-flags)).
- **`--expose-gc` unavailable.** `state.perf.allocPerFrame === null`;
  `AllocPanel` renders "n/a".
- **No AI move yet.** `state.perf.aiCompute === null` until the first
  move-result message; `AiComputePanel` renders "—".
- **Pool growth past cap.** The offending `PoolOccupancyPanel` row is
  drawn with the warn colour and an asterisk, and the bench harness
  fails per
  [`performance.md` § Allocation Policy](../../../performance.md#allocation-policy).

### Error Formatter

- The overlay never raises user-facing errors. Any thrown `Error` in
  this screen's call paths (e.g. hotkey-registration failure on
  mount) routes through `formatUserError(err, locale)` in
  [`error-formatter.md`](../../../error-formatter.md). Never
  construct error toast text inline.

### AI Implementation Notes

- This file owns behaviour and timing; [`spec.md`](./spec.md) owns
  the component / binding contract.
- Hotkey registration goes through the central registry in
  [`ui-hotkeys.md`](../../../ui-hotkeys.md); registration MUST be
  cleaned up on unmount to avoid the leak class caught by Scenario D
  in [`tasks/mvp/00-perf/03-memory-regression-gate.md`](../../../../../tasks/mvp/00-perf/03-memory-regression-gate.md).
- `devProfiler.toggleVisibility` is a screen-local action id
  (camelCase), classified `local-ui` per
  [`command-schema.md`](../../../command-schema.md) ("screen
  interaction tokens … UI-local"). The `Command / event` column for
  this row is `none`, so the uppercase-token scanner in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  has nothing to track here.

---

## 🔍 Sync Check

- **UI: ⚠** — Action ID, cadence, and toggle target match sibling
  [`spec.md`](./spec.md) § State Bindings,
  [`data-contracts.md`](./data-contracts.md) § Runtime State
  Selectors, and [`architecture.md`](./architecture.md) §
  Subscription Cadence. The
  [`ui-hotkeys.md` § Per-screen Hotkey Column](../../../ui-hotkeys.md#per-screen-hotkey-column)
  mandate that every Actions table carry a `Hotkey` column is not
  yet satisfied here — gap is shared across every screen package and
  is owned by the contract sweep (see Issues).
- **Schema: ✔** — `state.perf.overlayVisible`, `aiCompute`, `pools`,
  `animations`, and the upstream task IDs match the contracts in
  [`data-contracts.md`](./data-contracts.md); `formatUserError`
  reference resolves to
  [`error-formatter.md` § 1 API](../../../error-formatter.md#1-api).
- **Tasks: ✔** — Producers cited above
  ([`mvp.10-heuristic-ai.06-run-ai-in-web-worker`](../../../../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md),
  [`mvp.00-perf.05-object-pools`](../../../../../tasks/mvp/00-perf/05-object-pools.md))
  are listed as dependencies of the owning task
  [`mvp.00-perf.04-profiling-overlay`](../../../../../tasks/mvp/00-perf/04-profiling-overlay.md).
  Memory-leak guard reference resolves to
  [`mvp.00-perf.03-memory-regression-gate`](../../../../../tasks/mvp/00-perf/03-memory-regression-gate.md)
  Scenario D.

## ⚠ Issues

- **`Hotkey` column not present on this Actions table.**
  [`ui-hotkeys.md` § Per-screen Hotkey Column](../../../ui-hotkeys.md#per-screen-hotkey-column)
  mandates a `Hotkey` column on every `interactions.md` Actions
  table referencing an entry id in the registry. No registry entry
  exists yet for the dev-profiler toggle (the action id
  `devProfiler.toggleVisibility` is a camelCase screen-local token,
  not a hotkey registry id; the registry id pattern is
  `^(global|screen)\.[a-z0-9-]+(\.[a-z0-9-]+)*$`). Owners:
  [`mvp.07-ui-shell.13-screen-package-contract-sweep`](../../../../../tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md)
  (the column) and
  [`mvp.07-ui-shell.18-hotkey-registry`](../../../../../tasks/mvp/07-ui-shell/18-hotkey-registry.md)
  (the entry — suggested id `screen.dev-profiler.toggle-overlay`,
  `defaultBinding: "Control+Shift+KeyP"`). Skill did not silently
  add the column or invent the registry entry (Hard Prohibition B).
- **`state.perf.overlayVisible` is the one slice this overlay writes,
  but it is not registered in
  [`data-inventory.md`](../../../data-inventory.md).** Mirrors the
  gap flagged from sibling
  [`architecture.md`](./architecture.md#⚠-issues),
  [`data-contracts.md`](./data-contracts.md#⚠-issues), and
  [`spec.md`](./spec.md#⚠-issues): the entire `state.perf.*` slice
  (including the only writable field `overlayVisible`) needs a
  single in-memory / session row. Per CLAUDE.md root contract.
  Owner: [`mvp.00-perf.04-profiling-overlay`](../../../../../tasks/mvp/00-perf/04-profiling-overlay.md).
