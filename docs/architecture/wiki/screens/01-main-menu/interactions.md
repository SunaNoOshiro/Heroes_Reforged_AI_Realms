# Screen 01: Main Menu
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Boot shell menu with full-bleed fantasy painting, title treatment, icon-backed menu buttons, and no gameplay state loaded.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| New Game | `mainMenu.newGame` | navigation | `02-new-game-setup` | `OPEN_NEW_GAME_SETUP` | Creates local setup draft only. | Storm/cloud shimmer, title glint, hovered command icon glow, pressed command depresses, and route fade after guard approval. |
| Load Game | `mainMenu.loadGame` | navigation | `55-save-load` | `OPEN_LOAD_GAME` | Reads save manifests; does not load until a slot is confirmed. | Storm/cloud shimmer, title glint, hovered command icon glow, pressed command depresses, and route fade after guard approval. |
| High Score | `mainMenu.highScore` | navigation | `57-high-scores` | `OPEN_HIGH_SCORES` | Reads completed-game score records. | Storm/cloud shimmer, title glint, hovered command icon glow, pressed command depresses, and route fade after guard approval. |
| Credits | `mainMenu.credits` | navigation | `05-intro-cinematic` | `OPEN_CREDITS_OR_INTRO` | Routes to presentation-only cinematic shell. | Storm/cloud shimmer, title glint, hovered command icon glow, pressed command depresses, and route fade after guard approval. |
| Quit | `mainMenu.quit` | navigation | `60-confirmation-dialog` | `REQUEST_QUIT_CONFIRMATION` | No gameplay mutation. | Storm/cloud shimmer, title glint, hovered command icon glow, pressed command depresses, and route fade after guard approval. |

### State Changes
- `state.shell.availableCommands` refreshes `menu.commands` after the owning reducer or local UI draft changes.
- `state.persistence.hasLoadableSave` refreshes `lastSaveAvailable` after the owning reducer or local UI draft changes.
- `state.shell.quitRequiresConfirmation` refreshes `quitGuard` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- New Game can route to `02-new-game-setup` after guard approval and exit animation.
- Load Game can route to `55-save-load` after guard approval and exit animation.
- High Score can route to `57-high-scores` after guard approval and exit animation.
- Credits can route to `05-intro-cinematic` after guard approval and exit animation.
- Quit can route to `60-confirmation-dialog` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
