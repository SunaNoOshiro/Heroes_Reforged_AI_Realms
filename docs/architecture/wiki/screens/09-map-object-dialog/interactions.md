# Screen 09: Map Object Dialog
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Generic adventure object visit dialog for shrines, events, guarded rewards, signs, one-shot pickups, and choice prompts.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Accept | `mapObject.accept` | command | `07-adventure-map` | `VISIT_MAP_OBJECT` | Applies reward, visit flag, teleport, quest, or event result. | Dialog pops from the object position, portrait glows, reward icons sparkle on accepted visits, and rejected visits shake the message parchment. |
| Decline | `mapObject.decline` | navigation | `07-adventure-map` | `CANCEL_MAP_OBJECT_VISIT` | Closes without mutating gameplay. | Dialog pops from the object position, portrait glows, reward icons sparkle on accepted visits, and rejected visits shake the message parchment. |
| Right-click portrait | `mapObject.details` | navigation | `18-map-object-tooltip` | `OPEN_OBJECT_TOOLTIP` | Shows public object details. | Dialog pops from the object position, portrait glows, reward icons sparkle on accepted visits, and rejected visits shake the message parchment. |
| Open quest source | `mapObject.quest` | navigation | `11-quest-log` | `OPEN_RELATED_QUEST` | Focuses related quest entry when the object is a quest source. | Dialog pops from the object position, portrait glows, reward icons sparkle on accepted visits, and rejected visits shake the message parchment. |

### State Changes
- `state.ui.adventure.pendingObjectVisit.objectId` refreshes `objectId` after the owning reducer or local UI draft changes.
- `state.adventure.selectedHeroId` refreshes `heroId` after the owning reducer or local UI draft changes.
- `state.mapObjects.byId[objectId]` refreshes `visitRecord` after the owning reducer or local UI draft changes.
- `selectors.mapObjects.previewVisitReward` refreshes `rewardPreview` after the owning reducer or local UI draft changes.
- `selectors.mapObjects.visitGuard` refreshes `guardResult` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Accept can route to `07-adventure-map` after guard approval and exit animation.
- Decline can route to `07-adventure-map` after guard approval and exit animation.
- Right-click portrait can route to `18-map-object-tooltip` after guard approval and exit animation.
- Open quest source can route to `11-quest-log` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

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
| Accept (`VISIT_MAP_OBJECT`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
