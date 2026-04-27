# Screen 05: Intro / Outro Cinematics

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Presentation-only cinematic playback shell for intro, outro, credits, victory, defeat, and campaign story clips.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-6`.
- Letterboxed playback viewport with subtitle strip, small skip glyph, timeline beads, and no gameplay controls.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- CinematicPlayer
  - FrameViewport
  - SubtitleStrip
  - TimelineBeads
  - SkipButton
  - CompletionRouter

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| cinematicId | state.ui.cinematic.cinematicId | Manifest ID for the clip. |
| playbackState | state.ui.cinematic.playback | Client playback progress. |
| subtitles | localization.cinematics[cinematicId] | Subtitle cues. |
| skipAllowed | config.ui.allowSkipCinematics | Skip availability. |
| destination | state.ui.cinematic.returnRoute | Route after playback/skip. |

### Mechanics Mapping
- Resolves cinematic manifest, localization subtitles, audio cue, playback progress, and skip policy. It never mutates deterministic gameplay except route completion events.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Video/painted frames crossfade, subtitles type or fade by cue, timeline bead advances, and skip fades to the configured destination.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `intro-cinematic`; system group: `menus`; curation marker: `curated-pass-6`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
