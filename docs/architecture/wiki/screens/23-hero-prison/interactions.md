# Screen 23: Hero Prison
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Adventure prison dialog. Releases an imprisoned hero into the visiting
player's roster when capacity, ownership, and spawn-tile rules pass.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Release hero | `prison.release` | command | `07-adventure-map` | `RELEASE_PRISON_HERO` | Adds hero to active player roster, marks prison visited, spawns hero on `selectors.mapObjects.prisonReleaseTile`. | Cell bars lift, prisoner portrait brightens, roster slot glows, released hero appears beside the prison, prison object marks visited. |
| Inspect hero | `prison.inspectHero` | navigation | `46-hero-screen` | `OPEN_IMPRISONED_HERO_PREVIEW` | Opens read-only hero sheet for the imprisoned hero. | Dialog cross-fade into hero sheet preview; UI click sound. |
| Leave | `prison.leave` | navigation | `07-adventure-map` | `CLOSE_HERO_PRISON` | Closes the dialog without changes; prison object stays unresolved. | Dialog close; UI click sound. |

### State Changes
- `prisonId`, `imprisonedHero`, `rosterSlots`, `releaseGuard`, and
  `spawnTile` re-resolve from their selectors after any reducer write
  or local UI draft change.
- UI-only hover, focus, selected row, target cursor, drag ghost, and
  animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- `prison.release` routes to `07-adventure-map` after the release
  guard accepts and the reducer applies.
- `prison.inspectHero` routes to `46-hero-screen` for a read-only
  preview; the prison dialog remains the underlying context.
- `prison.leave` routes to `07-adventure-map` without applying any
  reducer.

### Disabled And Error Cases
- Disable Release when `selectors.heroes.prisonReleaseGuard` returns
  `notEligible` (roster full, hero already owned, scenario rule
  blocked, spawn tile unavailable, or owning phase mismatch). Show the
  guard's reason in the disabled-control tooltip.
- Missing presentation assets may use resolver fallback. Missing
  gameplay records, invalid content IDs, or rejected commands fail
  loudly per [`fail-loud.md`](../../../fail-loud.md).
- On rejection, keep the prison dialog open, preserve the local draft
  where useful, render localized error text, and play failure
  feedback.
- Errors are produced by `formatUserError(err, locale)` declared in
  [`docs/architecture/error-formatter.md`](../../../error-formatter.md);
  never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather
  than inventing new behavior.

## Error surfaces

Per [`error-ux.md`](../../../error-ux.md) § 5, this screen inherits
the default code → surface mapping from § 2. The table below maps
each action whose `Type` column is `command` to its default surface
for this screen's dominant error domain. A row whose Notes column
reads `override` replaces the § 2 default for that action; otherwise
the default applies. Specific error codes (e.g.
`DISPATCHER_<token>`, `STORAGE_<token>`) land alongside the engine
reducer that owns each command and trigger the gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing for them.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Release hero (`RELEASE_PRISON_HERO`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 `DISPATCHER_*`; disabled control + tooltip on rejection. |

---

## 🔍 Sync Check

- **UI: ⚠** — Release and Leave rows align with
  [`mockup.html`](./mockup.html). The Inspect row has no visible
  control in the mockup; flagged in sibling
  [`spec.md`](./spec.md) Issues.
- **Schema: ⚠** — `RELEASE_PRISON_HERO` is owned by
  [`mvp.05-adventure-map.12-release-prison-hero-command`](../../../../../tasks/mvp/05-adventure-map/12-release-prison-hero-command.md)
  per [`command-schema.md`](../../../command-schema.md) ("prison
  rescue" reducer). `OPEN_IMPRISONED_HERO_PREVIEW` and
  `CLOSE_HERO_PRISON` are not defined in `command-schema.md`;
  flagged in Issues.
- **Tasks: ✔** — Owned by
  [`phase-2.07-ui-screen-backlog.23-hero-prison-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/23-hero-prison-screen.md);
  release reducer owned by
  [`mvp.05-adventure-map.12-release-prison-hero-command`](../../../../../tasks/mvp/05-adventure-map/12-release-prison-hero-command.md).

## ⚠ Issues

- **Animation column previously duplicated across rows.** Pre-audit,
  Inspect and Leave both carried the Release animation string. The
  rewrite reassigns each row a transition matching its `Type`
  (navigation only). No new behaviour was invented — the Release
  string remains the authoritative animation per sibling
  [`spec.md`](./spec.md) Animation Contract.
- **`OPEN_IMPRISONED_HERO_PREVIEW` and `CLOSE_HERO_PRISON` not in
  `command-schema.md`.** Both are listed here as routing
  commands. If they are UI-local navigation tokens they should be
  marked `local-ui` per
  [`command-schema.md`](../../../command-schema.md) so the
  screen-command coverage gate
  [`docs/architecture/screen-command-coverage.json`](../../../screen-command-coverage.json)
  classifies them correctly; if they are reducer-backed they need
  schema entries. The screen-owning task
  [`phase-2.07-ui-screen-backlog.23-hero-prison-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/23-hero-prison-screen.md)
  must reconcile via the coverage map. Suggested: classify both as
  `local-ui` since neither writes deterministic state.
- **Inspect-hero control absent in mockup.** See sibling
  [`spec.md`](./spec.md) Issues for the canonical statement of this
  mismatch.
