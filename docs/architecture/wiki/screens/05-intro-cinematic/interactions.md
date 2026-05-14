# Screen 05: Intro / Outro Cinematics
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Presentation-only cinematic playback shell for intro, outro,
credits, victory, defeat, and campaign story clips.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Skip | `cinematic.skip` | navigation | Configured destination | `SKIP_CINEMATIC` | Completes presentation route only. | Frames crossfade, subtitles type or fade by cue, timeline bead advances, then the viewport fades to the configured destination. |
| Playback complete | `cinematic.complete` | navigation | Configured destination | `COMPLETE_CINEMATIC` | Routes after the final cue. | Frames crossfade, subtitles type or fade by cue, timeline bead advances, then the viewport fades to the configured destination. |
| Toggle subtitles | `cinematic.subtitles` | local-ui | Current screen | `TOGGLE_CINEMATIC_SUBTITLES` | Updates the local presentation setting. | Frames crossfade, subtitles type or fade by cue, timeline bead advances, then the viewport fades to the configured destination. |

Per
[`screen-command-coverage.json`](../../../screen-command-coverage.json):
`COMPLETE_CINEMATIC` is `outOfScope` until
[`phase-2.08-meta-systems.03-cinematic-playback-engine`](../../../../../tasks/phase-2/08-meta-systems/03-cinematic-playback-engine.md)
is `done`; `SKIP_CINEMATIC` and `TOGGLE_CINEMATIC_SUBTITLES` match
the `SKIP_` and `TOGGLE_` `localUiPrefixes` and stay in route or
draft state until the playback engine task surfaces them.

### State Changes
All five selectors refresh from the owning reducer (or local UI
draft, where the binding is local) as the cinematic advances:

- `state.ui.cinematic.cinematicId` → `cinematicId`
- `state.ui.cinematic.playback` → `playbackState`
- `localization.cinematics[cinematicId]` → `subtitles`
- `config.ui.allowSkipCinematics` → `skipAllowed`
- `state.ui.cinematic.returnRoute` → `destination`

UI-only hover, focus, selected row, open tab, target cursor, drag
ghost, and animation frame stay outside deterministic gameplay
state.

### Navigation Outcomes
- `cinematic.skip` routes to the configured destination after route
  guard approval and exit fade.
- `cinematic.complete` routes to the configured destination after
  route guard approval and exit fade.
- `cinematic.subtitles` stays on the current screen.

### Disabled And Error Cases
- Disable controls when required selectors, registry records,
  resource costs, target legality, ownership, phase, or route guards
  fail.
- Missing presentation assets may use resolver fallback per
  [`asset-loading.md`](../../../asset-loading.md). Missing gameplay
  records, invalid content IDs, or rejected commands fail loudly per
  [`fail-loud.md`](../../../fail-loud.md).
- On rejection, keep the current screen open, preserve local draft
  where useful, show localized error text, and play failure
  feedback.
- Errors render via `formatUserError(err, locale)` declared in
  [`error-formatter.md`](../../../error-formatter.md); never
  construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather
  than inventing new behavior.

---

## 🔍 Sync Check

- **UI: ⚠** — Action IDs, types, and command kinds align with
  [`spec.md`](./spec.md), [`data-contracts.md`](./data-contracts.md),
  and [`architecture.md`](./architecture.md). The mockup renders
  only the `cinematic.skip` SVG button; `cinematic.complete` is
  timer-driven and `cinematic.subtitles` has no visible affordance
  yet. The `intro.unlockAndPlay` action required by
  [`autoplay-policy.md`](../../../autoplay-policy.md) is not present.
- **Schema: ✔** — `COMPLETE_CINEMATIC` listed in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  `outOfScope` with the correct owning task; `SKIP_CINEMATIC` and
  `TOGGLE_CINEMATIC_SUBTITLES` covered by `SKIP_` / `TOGGLE_`
  `localUiPrefixes`. No row needed in `command-schema.md` until the
  playback engine task lands.
- **Tasks: ✔** — Owning UI task
  [`phase-2.07-ui-screen-backlog.05-intro-cinematic-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/05-intro-cinematic-screen.md)
  reads this file first. Engine task
  [`phase-2.08-meta-systems.03-cinematic-playback-engine`](../../../../../tasks/phase-2/08-meta-systems/03-cinematic-playback-engine.md)
  reads this file as its first source of truth. Both `planned`.

## ⚠ Issues

- **Autoplay unlock action missing from Actions table.**
  [`autoplay-policy.md` § 2](../../../autoplay-policy.md) requires
  the intro cinematic to expose a `ClickToPlayCard` and an
  `intro.unlockAndPlay` action that dispatches
  `UNLOCK_MEDIA_AUTOPLAY` and flips
  `state.runtime.media.unlocked`. This Actions table covers only
  skip, complete, and subtitle toggle. Per CLAUDE.md fail-loud
  contract, the screen owner of
  [`05-intro-cinematic-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/05-intro-cinematic-screen.md)
  must add the row before runtime ships. Doc-audit did not invent
  it (anti-cheat rule B).
- **`cinematic.skip` action type vs. local-ui prefix.** The table
  marks `cinematic.skip` as `navigation`, but its command kind
  `SKIP_CINEMATIC` matches the `SKIP_` `localUiPrefixes` set in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json).
  The intent matches sibling
  [`42-victory-defeat-cinematic/interactions.md`](../42-victory-defeat-cinematic/interactions.md)
  where `outcome.skip` is `local-ui`. The screen owner should
  confirm whether `cinematic.skip` should be reclassified as
  `local-ui` (skip completes locally, then `COMPLETE_CINEMATIC`
  fires the gameplay route). Non-blocking — current wording is
  defensible.
