# Screen 50: Creature Info
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Detailed creature information panel for army stacks, dwellings, combat stacks, rewards, and tooltip drill-down.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Hover ability | `creatureInfo.hoverAbility` | local-ui | Current screen | `SHOW_CREATURE_ABILITY_DETAIL` | Updates local detail tooltip. | Creature portrait idles, ability icons glow on hover, modified stats pulse when sourced from buffs, and the panel fades back to caller. |
| Open upgrade | `creatureInfo.openUpgrade` | navigation | `13-hill-fort` or `25-building-recruitment-dialog` | `OPEN_CREATURE_UPGRADE_SOURCE` | Routes only when caller supports upgrades. | Creature portrait idles, ability icons glow on hover, modified stats pulse when sourced from buffs, and the panel fades back to caller. |
| Close | `creatureInfo.close` | navigation | Previous screen | `CLOSE_CREATURE_INFO` | Returns to caller. | Creature portrait idles, ability icons glow on hover, modified stats pulse when sourced from buffs, and the panel fades back to caller. |

### State Changes
- `state.ui.creatureInfo.creatureId` refreshes `creatureId` after the owning reducer or local UI draft changes.
- `state.ui.creatureInfo.stackContext` refreshes `stackContext` after the owning reducer or local UI draft changes.
- `registries.creatures.byId[creatureId].stats` refreshes `baseStats` after the owning reducer or local UI draft changes.
- `selectors.creatures.stackStatModifiers` refreshes `modifiers` after the owning reducer or local UI draft changes.
- `registries.creatures.byId[creatureId].abilities` refreshes `abilities` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Open upgrade can route to `13-hill-fort` or `25-building-recruitment-dialog` after guard approval and exit animation.
- Close can route to Previous screen after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.
- Errors are produced by `formatUserError(err, locale)` declared in [`docs/architecture/error-formatter.md`](../../../error-formatter.md); never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
