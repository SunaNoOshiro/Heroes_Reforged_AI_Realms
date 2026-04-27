# Screen 61: AI Turn Indicator
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
AI turn overlay showing active AI color, visible thinking/progress state, optional fast-forward, and turn-result messages.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Change speed | `aiTurn.speed` | local-ui | Current screen | `SET_AI_TURN_SPEED` | Changes presentation speed. | Player crest rotates, progress beads advance per command batch, camera pans to visible AI actions, and turn end fades back to player control. |
| Fast-forward | `aiTurn.fastForward` | local-ui | Current screen | `FAST_FORWARD_AI_TURN_PRESENTATION` | Skips nonessential animation only. | Player crest rotates, progress beads advance per command batch, camera pans to visible AI actions, and turn end fades back to player control. |
| AI turn complete | `aiTurn.complete` | navigation | `07-adventure-map` | `COMPLETE_AI_TURN_PRESENTATION` | Returns to active human player. | Player crest rotates, progress beads advance per command batch, camera pans to visible AI actions, and turn end fades back to player control. |

### State Changes
- `state.turn.activePlayerId` refreshes `aiPlayer` after the owning reducer or local UI draft changes.
- `state.ai.currentPhase` refreshes `aiPhase` after the owning reducer or local UI draft changes.
- `state.ai.visibleCommandBatch` refreshes `commandBatch` after the owning reducer or local UI draft changes.
- `config.ui.aiTurnSpeed` refreshes `speed` after the owning reducer or local UI draft changes.
- `selectors.ai.canFastForwardOrPause` refreshes `interruptGuard` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- AI turn complete can route to `07-adventure-map` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
