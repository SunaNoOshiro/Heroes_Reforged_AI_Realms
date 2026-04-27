# Screen 31: Grail Building

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Town grail construction ceremony after a hero brings the grail to a valid town.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-4`.
- Town panorama is darkened for a ceremonial build panel: grail relic at center, selected town banner, faction wonder preview, and permanent bonus summary.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- GrailBuildingDialog
  - RelicPedestal
  - WonderPreview
  - TownBonusList
  - ConfirmBuildButton
  - CeremonyVfx

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| townId | state.towns.selectedTownId | Town receiving the grail. |
| deliveringHero | state.adventure.visitingHeroId | Hero carrying grail artifact/state. |
| grailRecord | state.scenario.grail | Grail discovered and delivered state. |
| wonderDefinition | selectors.towns.factionGrailBuilding | Faction-specific grail building and bonuses. |
| bonusPreview | selectors.towns.grailBonusPreview | Income, growth, spell, or faction-specific bonuses. |

### Mechanics Mapping
- Consumes the grail delivery state, validates town ownership and no existing grail building, creates the faction-specific grail structure, and updates town/player bonuses.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Relic rises from the hero slot, town wonder beam flashes over the panorama, bonus plaques illuminate, and the built hotspot remains glowing afterward.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `grail-building`; system group: `town`; curation marker: `curated-pass-4`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
