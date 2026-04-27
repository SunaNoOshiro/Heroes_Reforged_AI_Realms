# Screen 01: Main Menu

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Boot shell menu with full-bleed fantasy painting, title treatment, icon-backed menu buttons, and no gameplay state loaded.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `anchor-v1`.
- Full-screen illustrated backdrop, ornate gold border, oversized game title at upper-left, and vertical icon-backed command buttons on the right.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- MainMenuShell
  - BackdropPainting
  - LogoTitle
  - CommandStack
  - VersionLabel
  - RouteFadeOverlay

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| menu.commands | state.shell.availableCommands | Controls enabled by shell mode and platform capabilities. |
| lastSaveAvailable | state.persistence.hasLoadableSave | Load button is disabled when no compatible save manifest exists. |
| quitGuard | state.shell.quitRequiresConfirmation | Quit opens confirmation instead of closing immediately when required. |

### Mechanics Mapping
- Routes only into setup, save/load, high scores, credits/options, or quit confirmation. No deterministic gameplay state is created until New Game completes setup.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Storm/cloud shimmer, title glint, hovered command icon glow, pressed command depresses, and route fade after guard approval.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `main-menu`; system group: `menus`; curation marker: `anchor-v1`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
