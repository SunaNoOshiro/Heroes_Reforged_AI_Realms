# Screen 56: Options

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Options screen for audio, animation speed, combat settings, autosave, language, accessibility, and renderer scale.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-6`.
- Tabbed settings parchment with sliders, toggles, segmented buttons, key/action rows, Apply/Cancel defaults, and no gameplay explanation text.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- OptionsScreen
  - OptionsTabs
  - SliderRows
  - ToggleRows
  - SegmentedControls
  - PrivacyPane
  - ApplyCancelButtons

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| optionsDraft | state.ui.options.draft | Local editable settings copy. |
| audioConfig | config.audio | Music/SFX/voice values. |
| uiConfig | config.ui | Locale, animation speed, reduced motion, scale. |
| gameplayLocks | selectors.options.gameplayConfigLocks | Settings locked during active game. |
| dirty | selectors.options.hasUnsavedChanges | Apply enabled state. |
| privacyOptions | state.privacy.options | Per [`privacy-options.schema.json`](../../../../../content-schema/schemas/privacy-options.schema.json): `displayNameMode`, `analyticsOptIn`, `allowMatureContent`, `saltFingerprint`. |
| saltFingerprint | selectors.privacy.saltFingerprint | First 4 hex chars of the local salt; user-visible verification. |

### Mechanics Mapping
- Edits a settings draft. Apply validates config values, persists presentation settings, and only changes gameplay-affecting options at allowed setup boundaries.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Tab pages slide, slider knobs tick, toggles flip, Apply seal glows, and Cancel restores previous values.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `options`; system group: `system`; curation marker: `curated-pass-6`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
