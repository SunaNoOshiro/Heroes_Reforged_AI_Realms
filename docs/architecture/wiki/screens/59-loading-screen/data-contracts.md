# Screen 59: Loading Screen
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `asset-index.schema.json` | Background plate, frame, crest, icons, animation manifests. | `content-schema/schemas/asset-index.schema.json` |
| `localization.schema.json` | Title, status text, disabled reasons, error messages (`ui.loading-screen.*`, `errors.*`). | `content-schema/schemas/localization.schema.json` |
| `ruleset.schema.json` | Guard rules consumed by `CANCEL_LOADING_TASK` and `RETRY_LOADING_STEP` (which phases are recoverable, retry budget). | `content-schema/schemas/ruleset.schema.json` |
| `manifest.schema.json` | Pack identity, dependencies, content hashes, and trust metadata resolved during the `pack-load` phase. | `content-schema/schemas/manifest.schema.json` |
| Content/runtime registries | Heroes, towns, spells, artifacts, armies, map objects, and saves referenced by the loaded scenario. | Loaded content-runtime registries. |

### Runtime State Selectors
All selectors live under `state.ui.loading.*` — presentation
state, in-memory and session-scoped (see § Save And Replay
Fields).

| UI element | Selector | Notes |
| --- | --- | --- |
| `loadingTask` | `state.ui.loading.taskId` | Scenario generation, save load, asset warmup, or pure route handoff. |
| `progress` | `state.ui.loading.progress` | `0..1`; reducer-driven sum of phase weights. |
| `destination` | `state.ui.loading.destinationRoute` | Route taken after `COMPLETE_LOADING_TASK`. |
| `errors` | `state.ui.loading.errors` | `Array<{ phase, code, recoverable, retry }>` per `architecture.md` § Failure Routing. |
| `contentHashes` | `state.ui.loading.contentHashes` | Pack/hash data from the `pack-load` phase; feeds deterministic load. |

### Commands And Events
User-triggered (from `RecoverableErrorPanel`):

- `CANCEL_LOADING_TASK` — emitted from `loading.cancel`; routes
  to the caller-configured fallback. Guard: the active phase
  must be `recoverable: true`.
- `RETRY_LOADING_STEP` — emitted from `loading.retry`; replays
  the failed phase named in `state.ui.loading.errors[*].phase`.

Runtime-emitted (no user surface; see `interactions.md` §
Runtime-Emitted Commands and
[diagram 28](../../../diagrams/28-loading-orchestration.md)):

- `BEGIN_LOADING_TASK { taskId, destination }`
- `LOADING_PROGRESS { phase, weight }`
- `LOADING_ERROR { phase, code, recoverable, retry }`
- `COMPLETE_LOADING_TASK` — auto-dispatched once every required
  phase accepts; routes to `state.ui.loading.destinationRoute`.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.loading-screen.title`
- `ui.loading-screen.actions.*` — `cancel`, `retry`.
- `ui.loading-screen.status.*` — one entry per warmup phase
  (`schema-validation`, `pack-load`, `atlas-decode`,
  `atlas-upload`, `shader-compile`, `warmup-render`,
  `route-transition`).
- `ui.loading-screen.errors.*` — recoverable error copy keyed
  by phase + error code.
- `ui.common.{ok,cancel,back,close}`

### Asset, Sound, And VFX IDs
- `ui.loading-screen.background` — illustrated plate.
- `ui.loading-screen.frame` — ornate gold frame.
- `ui.loading-screen.icons.*` — crest art and recovery glyphs.
- `audio.ui.{hover,click}`, `audio.system.*` — non-blocking UI
  feedback.
- `vfx.loading-screen.*` — torch flicker, crest pulse, exit
  fade; all gated by `config.ui.reducedMotion`.

### Save And Replay Fields
- `state.ui.loading.*` is **presentation state**: in-memory,
  session-scoped, never persisted to IndexedDB and never
  serialized into saves or replays.
- Persist reducer-approved gameplay state, setup records,
  content hashes, command inputs, and explicit draft records
  only when named by the owning gameplay system.
- Do not persist hover, focus, tooltip, scroll, drag ghost,
  cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs — never raw
  paths, localized labels, rendered positions, or wall-clock
  timestamps.

### Validation And Fallback
- Async presentation/content work is coordinated here while
  deterministic game state creation stays explicit and
  seed/hash based.
- Missing presentation may fall back through the asset resolver
  per [`docs/architecture/fail-loud.md`](../../../fail-loud.md).
- Missing gameplay records, invalid commands, and unresolved
  content IDs fail loudly **before** any control becomes
  enabled.
- Recoverable failures surface localized recovery actions via
  the `RecoverableErrorPanel`; non-recoverable failures
  escalate to the fatal error boundary (z-layer `10000`).
- All error copy is produced by `formatUserError(err, locale)`
  from
  [`docs/architecture/error-formatter.md`](../../../error-formatter.md);
  never construct error text inline.

---

## 🔍 Sync Check

- **UI: ✔** — Selectors, command IDs, and copy keys match sibling `spec.md` § State Bindings and `interactions.md` § Control Surfaces.
- **Schema: ✔** — `asset-index`, `localization`, `ruleset`, and `manifest` schemas exist under `content-schema/schemas/` and are referenced as declared. `state.ui.loading.*` is correctly excluded from [`data-inventory.md`](../../../data-inventory.md) as transient session UI state — consistent with the persistence rule that only persisted slices need inventory rows.
- **Tasks: ✔** — [`mvp.07-ui-shell.09-loading-screen`](../../../../../tasks/mvp/07-ui-shell/09-loading-screen.md) Reads-First this file. Phase-weight ownership flows from [`mvp.02b-asset-pipeline.05-async-asset-loader-with-caching`](../../../../../tasks/task-registry.json) (declared dependency of the owning task).

## ⚠ Issues

- **`src/content-runtime/loading-phases.ts` is documented as planned but has no explicit owning task.** `architecture.md` § Phases states phase weights live in `src/content-runtime/loading-phases.ts` (planned) and total to `1.0`. The owning task `mvp.07-ui-shell.09-loading-screen` declares only `src/ui/screens/LoadingScreen.tsx` as an owned path; no task currently owns `loading-phases.ts`. Per `.agents/rules/tasks.md` (one task primarily owns each path), the gap should be closed by adding the file to the loading-screen task's `Owned Paths` or by creating a co-task under `mvp/02b-asset-pipeline/`. No fix applied here (Hard Prohibition D — never edit cross-checked files).
