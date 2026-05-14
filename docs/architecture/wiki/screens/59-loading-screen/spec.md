# Screen 59: Loading Screen

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Progress screen shown while content packs, scenario data, save
files, random map generation, and renderer assets resolve. Holds
the route until every required content ID validates, then hands
off to the destination screen.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as
  implementation input.

### Visual Contract
- Curation status: `curated-pass-6`.
- Screen slug: `loading-screen`. System group: `system`.
- Z-Layer: `9700` per
  [`docs/architecture/ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
  The loading plate covers everything below it; the fatal error
  boundary at `10000` is the only thing that may sit above.
- Fixed `800 x 600` plate: ornate gold frame, red/brown/stone
  panels, a large title, a single animated crest, one progress
  bar, one status line, and the optional `RecoverableErrorPanel`
  on recoverable failure.
- `mockup.html` is visible UI only. Logic, transitions, and
  implementation notes live in this package's Markdown files.

### Component Tree
- `LoadingScreen`
  - `LoadingArtwork` — illustrated background plate.
  - `ProgressBar` — bound to `state.ui.loading.progress` (`0..1`).
  - `StepText` — localized one-line status for the current phase.
  - `AnimatedCrest` — pulsing crest; honors reduced-motion.
  - `RecoverableErrorPanel` — mounts only when
    `state.ui.loading.errors.length > 0`; carries `Cancel` and
    `Retry`. Hidden on the happy path (matches the mockup).

### State Bindings
| Element | Bound to | Notes |
| --- | --- | --- |
| `loadingTask` | `state.ui.loading.taskId` | Scenario generation, save load, asset warmup, or pure route. |
| `progress` | `state.ui.loading.progress` | `0..1`; reducer-driven sum of phase weights (see `architecture.md` § Phases). |
| `destination` | `state.ui.loading.destinationRoute` | Route taken after `COMPLETE_LOADING_TASK`. |
| `errors` | `state.ui.loading.errors` | Array of `{ phase, code, recoverable, retry }` per `architecture.md` § Failure Routing. |
| `contentHashes` | `state.ui.loading.contentHashes` | Pack/hash data feeding deterministic load. |

`state.ui.loading.*` is presentation state — in-memory, session-
scoped, never written to IndexedDB and never serialized into
saves or replays (see `data-contracts.md` § Save And Replay
Fields).

### Mechanics Mapping
- Coordinates async presentation and content work; deterministic
  game state creation stays explicit and seed/hash based.
- UI previews stay local until a listed command or route guard
  accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and
  map objects resolve through registries and content schemas,
  not view-side constants.

### Animation Contract
- `ProgressBar` fills as reducers accept each phase's progress
  command; `AnimatedCrest` rotates/pulses; background torch
  glow flickers; successful completion fades to the destination
  route.
- Animation consumes reducer or route results; it never decides
  gameplay outcomes.
- Reduced-motion mode (`config.ui.reducedMotion`) freezes the
  crest and torch, swaps the bar fill for an instantaneous step,
  and keeps every visible state change and localized status
  string intact.

### Acceptance Criteria
- Mockup is visually distinct from other screens and matches the
  internal visual direction.
- Spec lists every visible region and its authoritative state
  binding.
- Interactions cover every primary control, next screen, state
  update, animation, disabled case, and error path.
- Architecture file holds screen-specific diagrams, not copied
  archetype diagrams.
- Data contracts identify the schema, config, localization,
  asset, sound, VFX, save, and replay fields the screen needs.

### AI Implementation Notes
- Runtime code resolves presentation through asset IDs and
  manifests; deterministic gameplay commands use stable IDs and
  scalar values.
- Canvas lifecycle and warmup phase order are pinned in
  [`architecture.md` § Canvas Lifecycle And Warmup Orchestration](architecture.md#canvas-lifecycle-and-warmup-orchestration)
  and [diagram 28 — loading orchestration](../../../diagrams/28-loading-orchestration.md).
- Build runtime components from this package, not from
  third-party captures or external product pixels.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree, bindings, and copy-strings match `mockup.html`, sibling `interactions.md`, and `architecture.md`. The `RecoverableErrorPanel` is the only home for the `Cancel`/`Retry` controls listed in `interactions.md`, matching the mockup's happy path with no visible cancel/retry button.
- **Schema: ✔** — `state.ui.loading.*` is presentation-only and stays out of [`data-inventory.md`](../../../data-inventory.md); the persistent rule ("every persisted field is registered in `data-inventory.md`") does not apply because nothing here is persisted. Persistence-exclusion stance is consistent with sibling `data-contracts.md` § Save And Replay Fields.
- **Tasks: ✔** — Owning task [`mvp.07-ui-shell.09-loading-screen`](../../../../../tasks/mvp/07-ui-shell/09-loading-screen.md) Reads-First this file, declares `src/ui/screens/LoadingScreen.tsx` as the sole owned path, and lists the matching acceptance criteria.

## ⚠ Issues

_None._
