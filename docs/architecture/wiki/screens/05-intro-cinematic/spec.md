# Screen 05: Intro / Outro Cinematics

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Presentation-only playback shell for intro, outro, credits, victory,
defeat, and campaign story clips. No gameplay state mutates here
beyond route completion events.

### Visual Direction
Original internal UI contract. Do not use third-party captures,
copied franchise art, or external product pixels as implementation
input.

### Visual Contract
- Curation status: `curated-pass-6`.
- Fixed 800x600 frame, ornate gold border, black letterbox bars top
  and bottom, dark playback viewport, small skip glyph at the
  bottom-right, three timeline beads at the bottom centre.
- Subtitle cue strip sits on the lower letterbox bar; no HUD,
  resource bar, or gameplay controls.
- `mockup.html` carries visible SVG geometry only. Logic, transitions,
  and timing live in the Markdown sibling files.

### Component Tree
- CinematicPlayer
  - FrameViewport — letterboxed playback surface
  - SubtitleStrip — per-cue caption renderer
  - TimelineBeads — discrete progress indicator
  - SkipButton — `cinematic.skip` action surface
  - CompletionRouter — fires `cinematic.complete` at the final cue

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `cinematicId` | `state.ui.cinematic.cinematicId` | Manifest ID for the clip. |
| `playbackState` | `state.ui.cinematic.playback` | Client playback progress. |
| `subtitles` | `localization.cinematics[cinematicId]` | Subtitle cues. |
| `skipAllowed` | `config.ui.allowSkipCinematics` | Skip availability. |
| `destination` | `state.ui.cinematic.returnRoute` | Route after playback or skip. |

### Mechanics Mapping
- Resolves the cinematic manifest, localization subtitles, audio
  cue, playback progress, and skip policy. The screen never mutates
  deterministic gameplay state — only emits the route completion
  event named in `interactions.md`.
- UI previews stay local until a listed command or route guard
  accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and
  map objects resolve through registries and content schemas, not
  hardcoded view logic.

### Animation Contract
- Video or painted frames crossfade frame-to-frame.
- Subtitles type in or fade by cue.
- The active timeline bead advances on each cue boundary.
- Skip and completion fade the viewport to the configured destination.
- Animation consumes reducer or route results; it never decides
  gameplay outcomes.
- `prefers-reduced-motion` collapses crossfades to instant cuts and
  static highlights; localized cue text still surfaces.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions covers every primary control, next screen, state
  update, animation, disabled case, and error path.
- Architecture file carries screen-specific diagrams, not copied
  archetype diagrams.
- Data contracts identify schema, config, localization, asset,
  audio, VFX, save, and replay fields required to implement the
  screen.

### AI Implementation Notes
- Screen slug: `intro-cinematic`; system group: `menus`; curation
  marker: `curated-pass-6`.
- Build runtime components from the package contract, not from
  third-party captures or external product pixels.
- Runtime resolves presentation through asset IDs and manifests;
  deterministic gameplay commands use stable IDs and scalar values.

---

## 🔍 Sync Check

- **UI: ⚠** — Components, bindings, and animation rules align with
  [`mockup.html`](./mockup.html) and the sibling
  [`interactions.md`](./interactions.md) /
  [`architecture.md`](./architecture.md). The mockup renders only the
  `cinematic.skip` surface; `cinematic.complete` and
  `cinematic.subtitles` have no visible mockup affordance. The
  click-to-play card required by
  [`autoplay-policy.md`](../../../autoplay-policy.md) is not
  represented in this spec.
- **Schema: ✔** — `asset-index`, `localization`, `ruleset`, and
  `scenario` schemas are registered in
  [`schema-matrix.md`](../../../schema-matrix.md) and present under
  [`content-schema/schemas/`](../../../../../content-schema/schemas/).
- **Tasks: ✔** — Owning task
  [`phase-2.07-ui-screen-backlog.05-intro-cinematic-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/05-intro-cinematic-screen.md)
  reads this file first. Runtime state belongs to
  [`phase-2.08-meta-systems.03-cinematic-playback-engine`](../../../../../tasks/phase-2/08-meta-systems/03-cinematic-playback-engine.md).
  Both are `planned`.

## ⚠ Issues

- **Missing click-to-play card / autoplay unlock surface.**
  [`autoplay-policy.md` § 2](../../../autoplay-policy.md) states the
  intro cinematic must show a click-to-play card pre-unlock and that
  the package is the canonical source of the asset and unlock
  spec. Neither this spec nor `interactions.md` /
  `data-contracts.md` defines the `ClickToPlayCard` component, the
  `intro.unlockAndPlay` action, or the `UNLOCK_MEDIA_AUTOPLAY`
  command. Per CLAUDE.md ("missing gameplay requirements must fail
  loudly") and `.agents/rules/ui.md` ("read all five together"), the
  screen owner of
  [`05-intro-cinematic-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/05-intro-cinematic-screen.md)
  must add the component to the Component Tree, the binding for
  `state.runtime.media.unlocked`, and the action row. Doc-audit did
  not invent it (anti-cheat rule B).
- **Z-Layer reference missing.** Sibling
  [`42-victory-defeat-cinematic/spec.md`](../42-victory-defeat-cinematic/spec.md)
  cites Z-Layer 1000 from
  [`ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
  This spec does not. Non-blocking — the screen owner should pick
  the appropriate layer when implementing. Doc-audit did not invent
  a value.
- **`state.ui.cinematic.*` not in data-inventory.** None of
  `state.ui.cinematic.cinematicId`, `state.ui.cinematic.playback`, or
  `state.ui.cinematic.returnRoute` appear in
  [`data-inventory.md`](../../../data-inventory.md). The slice is
  transient UI runtime state owned by
  `phase-2.08-meta-systems.03-cinematic-playback-engine`; if any
  field becomes persisted (e.g. "intro already played"), that task
  must add a row. Suggested values: domain=`ui`, owner=
  `phase-2.08-meta-systems.03-cinematic-playback-engine`,
  persistence=`session` or `transient`.
