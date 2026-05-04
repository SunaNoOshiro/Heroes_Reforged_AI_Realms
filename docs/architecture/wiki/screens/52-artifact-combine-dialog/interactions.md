# Screen 52: Artifact Combine Dialog
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Combination artifact confirmation showing required pieces, resulting artifact, blocked slots, and equip/backpack outcome.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Inspect component | `artifactCombine.inspectComponent` | local-ui | Current screen | `SELECT_COMBINE_COMPONENT` | Updates component detail focus. | Owned pieces orbit and fuse, missing pieces remain dark, resulting artifact flares, and components vanish only after reducer success. |
| Combine | `artifactCombine.confirm` | command | `46-hero-screen` | `COMBINE_ARTIFACTS` | Removes components and adds/equips result artifact. | Owned pieces orbit and fuse, missing pieces remain dark, resulting artifact flares, and components vanish only after reducer success. |
| Cancel | `artifactCombine.cancel` | navigation | `46-hero-screen` | `CANCEL_ARTIFACT_COMBINE` | Leaves artifacts unchanged. | Owned pieces orbit and fuse, missing pieces remain dark, resulting artifact flares, and components vanish only after reducer success. |

### State Changes
- `state.ui.artifactCombine.recipeId` refreshes `recipeId` after the owning reducer or local UI draft changes.
- `selectors.artifacts.combineComponents` refreshes `components` after the owning reducer or local UI draft changes.
- `registries.artifacts.byId[resultId]` refreshes `resultArtifact` after the owning reducer or local UI draft changes.
- `selectors.artifacts.combineDestination` refreshes `destination` after the owning reducer or local UI draft changes.
- `selectors.artifacts.combineGuard` refreshes `combineGuard` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Combine can route to `46-hero-screen` after guard approval and exit animation.
- Cancel can route to `46-hero-screen` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.
- Errors are produced by `formatUserError(err, locale)` declared in [`docs/architecture/error-formatter.md`](../../../error-formatter.md); never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.

## Error surfaces

Per [`error-ux.md`](../../../error-ux.md) § 5, this screen inherits
the default code → surface mapping from § 2. The table below
maps each action whose `Type` column is `command` to its default
surface for this screen's dominant error domain. A row whose Notes
column reads `override` replaces the § 2 default for that action;
otherwise the default applies. Specific error codes (e.g.
`DISPATCHER_<token>`, `STORAGE_<token>`) land alongside the engine
reducer that owns each command and trigger the gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing for them.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Combine (`COMBINE_ARTIFACTS`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
