# Screen 60: Confirmation Dialog

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Reusable confirmation dialog for destructive, irreversible, or route-changing actions.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-6`.
- Z-Layer: 1000 per [`docs/architecture/ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
- Small centered red-bronze modal over dimmed caller screen with icon, localized prompt, Confirm/Cancel buttons, and caller-specific warning line.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- ConfirmationDialog
  - DimmedCaller
  - WarningIcon
  - PromptText
  - ConfirmCancelButtons

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| pendingAction | state.ui.confirmation.pendingAction | Action/event awaiting confirmation. |
| promptKey | state.ui.confirmation.promptKey | Localized prompt key. |
| callerRoute | state.ui.confirmation.callerRoute | Screen to return on cancel. |
| confirmPayload | state.ui.confirmation.payload | Stable IDs/scalars passed on confirm. |
| severity | state.ui.confirmation.severity | Warning styling only. |

### Mechanics Mapping
- Executes only the pending confirmed event supplied by caller. Dialog itself has no gameplay logic beyond confirm/cancel routing.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Modal pops in, warning icon pulses, Confirm button depresses, and accepted action plays caller-provided transition animation.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `confirmation-dialog`; system group: `system`; curation marker: `curated-pass-6`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
