# Screen 07: Adventure Map
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Primary strategic map with terrain viewport, fog of war, object interaction, hero path preview, minimap, army/hero sidebars, resources, and date.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select hero | `adventure.selectHero` | local-ui | Current screen | `SELECT_ADVENTURE_HERO` | Updates selected hero draft and side panel. | Dotted path marches, hero steps tile-by-tile after reducer acceptance, fog peels from revealed tiles, minimap box tracks viewport, status messages scroll. |
| Preview path | `adventure.previewPath` | local-ui | Current screen | `PREVIEW_HERO_PATH` | Computes visible route without spending movement. | Dotted path marches, hero steps tile-by-tile after reducer acceptance, fog peels from revealed tiles, minimap box tracks viewport, status messages scroll. |
| Move hero | `adventure.moveHero` | command | Current screen or object dialog | `MOVE_HERO_ALONG_PATH` | Consumes movement, reveals fog, may trigger object visit. | Dotted path marches, hero steps tile-by-tile after reducer acceptance, fog peels from revealed tiles, minimap box tracks viewport, status messages scroll. |
| Open town | `adventure.openTown` | navigation | `24-town-screen` | `OPEN_TOWN_SCREEN` | Routes if selected town is owned/visible. | Dotted path marches, hero steps tile-by-tile after reducer acceptance, fog peels from revealed tiles, minimap box tracks viewport, status messages scroll. |
| Cast adventure spell | `adventure.castSpell` | navigation | `17-adventure-spell-targeting` | `OPEN_ADVENTURE_SPELL_TARGETING` | Creates spell targeting UI draft. | Dotted path marches, hero steps tile-by-tile after reducer acceptance, fog peels from revealed tiles, minimap box tracks viewport, status messages scroll. |
| End turn | `adventure.endTurn` | command | Current screen or AI turn indicator | `END_PLAYER_TURN` | Commits turn transition and calendar updates. | Dotted path marches, hero steps tile-by-tile after reducer acceptance, fog peels from revealed tiles, minimap box tracks viewport, status messages scroll. |

### State Changes
- `state.adventure.visibleTiles` refreshes `map.tiles` after the owning reducer or local UI draft changes.
- `state.adventure.selectedHeroId` refreshes `selectedHero` after the owning reducer or local UI draft changes.
- `state.ui.adventure.pathPreview` refreshes `pathPreview` after the owning reducer or local UI draft changes.
- `state.players.active.resources` refreshes `resources` after the owning reducer or local UI draft changes.
- `state.calendar.currentDate` refreshes `date` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Move hero can route to Current screen or object dialog after guard approval and exit animation.
- Open town can route to `24-town-screen` after guard approval and exit animation.
- Cast adventure spell can route to `17-adventure-spell-targeting` after guard approval and exit animation.
- End turn can route to Current screen or AI turn indicator after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.
- **End-day debounce.** End turn buttons and hotkeys are debounced 250 ms (trailing edge). Dispatcher single-flight on `(playerId, END_DAY)` is the safety net; the second arrival within the same tick returns `DUPLICATE_INTENT`. See [`docs/architecture/command-schema.md` § Single-flight commands](../../../command-schema.md#single-flight-commands).

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.

## Error surfaces

Per [`error-ux.md`](../../../error-ux.md) § 5, this screen inherits
the default code → surface mapping from § 2. The table below
maps each action whose `Type` column is `command` to its default
surface for this screen's dominant error domain. A row whose Notes
column reads `override` replaces the § 2 default for that action;
otherwise the default applies. Specific error codes (e.g.
`DISPATCHER_<token>`, `STORAGE_<token>`) land alongside the engine
reducer that owns each command and trigger the gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing for them.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Move hero (`MOVE_HERO_ALONG_PATH`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
| End turn (`END_PLAYER_TURN`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
