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

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
