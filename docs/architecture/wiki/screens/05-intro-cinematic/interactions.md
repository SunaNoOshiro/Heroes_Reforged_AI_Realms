# Screen 05: Intro / Outro Cinematics
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Presentation-only cinematic playback shell for intro, outro, credits, victory, defeat, and campaign story clips.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Skip | `cinematic.skip` | navigation | Configured destination | `SKIP_CINEMATIC` | Completes presentation route only. | Video/painted frames crossfade, subtitles type or fade by cue, timeline bead advances, and skip fades to the configured destination. |
| Playback complete | `cinematic.complete` | navigation | Configured destination | `COMPLETE_CINEMATIC` | Routes after final cue. | Video/painted frames crossfade, subtitles type or fade by cue, timeline bead advances, and skip fades to the configured destination. |
| Toggle subtitles | `cinematic.subtitles` | local-ui | Current screen | `TOGGLE_CINEMATIC_SUBTITLES` | Updates local presentation setting. | Video/painted frames crossfade, subtitles type or fade by cue, timeline bead advances, and skip fades to the configured destination. |

### State Changes
- `state.ui.cinematic.cinematicId` refreshes `cinematicId` after the owning reducer or local UI draft changes.
- `state.ui.cinematic.playback` refreshes `playbackState` after the owning reducer or local UI draft changes.
- `localization.cinematics[cinematicId]` refreshes `subtitles` after the owning reducer or local UI draft changes.
- `config.ui.allowSkipCinematics` refreshes `skipAllowed` after the owning reducer or local UI draft changes.
- `state.ui.cinematic.returnRoute` refreshes `destination` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Skip can route to Configured destination after guard approval and exit animation.
- Playback complete can route to Configured destination after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.
- Errors are produced by `formatUserError(err, locale)` declared in [`docs/architecture/error-formatter.md`](../../../error-formatter.md); never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
