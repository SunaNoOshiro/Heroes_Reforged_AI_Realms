# Screen 52: Artifact Combine Dialog

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Combination artifact confirmation showing required pieces, resulting artifact, blocked slots, and equip/backpack outcome.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-5`.
- Z-Layer: 1000 per [`docs/architecture/ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
- Forge-style modal with component artifacts orbiting the center, resulting artifact card, missing piece indicators, and Combine/Cancel controls.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- ArtifactCombineDialog
  - ComponentArtifactRing
  - ResultArtifactCard
  - MissingPieceList
  - DestinationSlotPreview
  - CombineButtons

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| recipeId | state.ui.artifactCombine.recipeId | Combination recipe being evaluated. |
| components | selectors.artifacts.combineComponents | Required pieces and ownership state. |
| resultArtifact | registries.artifacts.byId[resultId] | Result artifact record. |
| destination | selectors.artifacts.combineDestination | Equip slot or backpack target. |
| combineGuard | selectors.artifacts.combineGuard | Eligibility and disabled reason. |

### Mechanics Mapping
- Combine validates all required component artifact IDs, ownership, locked/equipped state, destination slot legality, backpack space, and combination recipe rules.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Owned pieces orbit and fuse, missing pieces remain dark, resulting artifact flares, and components vanish only after reducer success.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `artifact-combine-dialog`; system group: `hero`; curation marker: `curated-pass-5`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
