# Screen 42: Victory / Defeat Cinematic
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Letterboxed campaign/scenario outcome screen with victory or defeat art, score summary, narration text, skip/continue controls, and next-route decision.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Continue | `outcome.continue` | navigation | `57-high-scores` or `01-main-menu` | `CONTINUE_FROM_OUTCOME` | Routes according to finalized outcome. | Outcome art slowly pans, narration types in, score medallions appear one by one, continue cross-fades to destination. |
| Skip narration | `outcome.skip` | local-ui | Current screen | `SKIP_OUTCOME_NARRATION` | Completes text and pan animation. | Outcome art slowly pans, narration types in, score medallions appear one by one, continue cross-fades to destination. |
| Replay battle | `outcome.replay` | navigation | `38-combat-screen` | `REQUEST_BATTLE_REPLAY_VIEW` | Opens replay presentation when available. | Outcome art slowly pans, narration types in, score medallions appear one by one, continue cross-fades to destination. |

### State Changes
- `state.scenario.outcome` refreshes `outcome` after the owning reducer or local UI draft changes.
- `state.scenario.finalScore` refreshes `score` after the owning reducer or local UI draft changes.
- `state.campaign.carryoverDraft` refreshes `carryover` after the owning reducer or local UI draft changes.
- `state.scenario.outcomeRoute` refreshes `nextRoute` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Continue can route to `57-high-scores` or `01-main-menu` after guard approval and exit animation.
- Replay battle can route to `38-combat-screen` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.
- Errors are produced by `formatUserError(err, locale)` declared in [`docs/architecture/error-formatter.md`](../../../error-formatter.md); never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
