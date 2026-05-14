# Screen 05: Intro / Outro Cinematics
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |
| `ruleset.schema.json` | Deterministic constants, formulas, and guard rules consumed by commands. | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |
| `scenario.schema.json` | Scenario setup, starting state, victory/loss conditions, save/load metadata. | [`content-schema/schemas/scenario.schema.json`](../../../../../content-schema/schemas/scenario.schema.json) |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

All four schemas are registered in
[`schema-matrix.md`](../../../schema-matrix.md).

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `cinematicId` | `state.ui.cinematic.cinematicId` | Manifest ID for the clip. |
| `playbackState` | `state.ui.cinematic.playback` | Client playback progress. |
| `subtitles` | `localization.cinematics[cinematicId]` | Subtitle cues. |
| `skipAllowed` | `config.ui.allowSkipCinematics` | Skip availability. |
| `destination` | `state.ui.cinematic.returnRoute` | Route after playback or skip. |

The `state.ui.cinematic.*` slice is transient UI runtime state
owned by
[`phase-2.08-meta-systems.03-cinematic-playback-engine`](../../../../../tasks/phase-2/08-meta-systems/03-cinematic-playback-engine.md).

### Commands And Events
- `SKIP_CINEMATIC` (from `cinematic.skip`) — Completes the
  presentation route only. Matches the `SKIP_` `localUiPrefixes`
  list in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json).
- `COMPLETE_CINEMATIC` (from `cinematic.complete`) — Routes after
  the final cue. Listed `outOfScope` in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  with owner
  [`phase-2.08-meta-systems.03-cinematic-playback-engine`](../../../../../tasks/phase-2/08-meta-systems/03-cinematic-playback-engine.md);
  renders disabled with a localized reason while that task is
  `planned`.
- `TOGGLE_CINEMATIC_SUBTITLES` (from `cinematic.subtitles`) —
  Updates local presentation setting. Matches the `TOGGLE_`
  `localUiPrefixes` list.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.ui.allowSkipCinematics`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.intro-cinematic.title`
- `ui.intro-cinematic.actions.*`
- `ui.intro-cinematic.status.*`
- `ui.intro-cinematic.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`,
  `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.intro-cinematic.background`
- `ui.intro-cinematic.frame`
- `ui.intro-cinematic.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.menus.*`
- `vfx.intro-cinematic.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content
  hashes, command inputs, and explicit draft records only when
  named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor
  blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs — never raw
  paths, localized labels, rendered positions, or wall-clock
  timestamps.

### Validation And Fallback
- The screen resolves the cinematic manifest, localization
  subtitles, audio cue, playback progress, and skip policy. It
  never mutates deterministic gameplay except via the route
  completion events named in
  [`interactions.md`](./interactions.md).
- Missing presentation may fall back through the asset resolver per
  [`asset-loading.md`](../../../asset-loading.md).
- Missing gameplay records, invalid commands, and unresolved
  content IDs fail loudly per
  [`fail-loud.md`](../../../fail-loud.md) before controls become
  enabled.

---

## 🔍 Sync Check

- **UI: ✔** — Selector table matches
  [`spec.md`](./spec.md) and
  [`interactions.md`](./interactions.md). Command IDs match the
  Actions table in `interactions.md`.
- **Schema: ✔** — All four listed schemas exist at their canonical
  paths and are registered in
  [`schema-matrix.md`](../../../schema-matrix.md). Command kinds
  classified per
  [`screen-command-coverage.json`](../../../screen-command-coverage.json).
- **Tasks: ✔** — Selector ownership routed to
  [`phase-2.08-meta-systems.03-cinematic-playback-engine`](../../../../../tasks/phase-2/08-meta-systems/03-cinematic-playback-engine.md).
  UI surface owned by
  [`phase-2.07-ui-screen-backlog.05-intro-cinematic-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/05-intro-cinematic-screen.md).
  Both `planned`.

## ⚠ Issues

- **`state.ui.cinematic.*` not in data-inventory.** None of
  `state.ui.cinematic.cinematicId`, `state.ui.cinematic.playback`,
  or `state.ui.cinematic.returnRoute` appear in
  [`data-inventory.md`](../../../data-inventory.md). If any field
  becomes persisted (intro-already-played flag, last-watched
  campaign cue), the CLAUDE.md root contract ("every persisted
  field is registered in data-inventory.md") requires
  [`phase-2.08-meta-systems.03-cinematic-playback-engine`](../../../../../tasks/phase-2/08-meta-systems/03-cinematic-playback-engine.md)
  to add a row. Suggested values: domain=`ui`, owner=
  `phase-2.08-meta-systems.03-cinematic-playback-engine`,
  persistence=`session` or `transient`. Doc-audit did not add the
  row itself (anti-cheat rule D).
- **Autoplay binding missing.**
  [`autoplay-policy.md` § 2](../../../autoplay-policy.md) cites
  `state.runtime.media.unlocked` as the unlock flag for the intro
  cinematic. This data-contracts file lists no selector or
  command for that gate. Per CLAUDE.md fail-loud contract, the
  screen owner of
  [`05-intro-cinematic-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/05-intro-cinematic-screen.md)
  must add the selector and the `UNLOCK_MEDIA_AUTOPLAY` command.
  Doc-audit did not invent it (anti-cheat rule B).
