# Screen 24: Town Screen
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Town management panorama with clickable building hotspots, town and
visiting-hero army rows, daily-build state, service entry points
(build / recruit / mage / tavern / market), resources, and exit back
to the adventure map.

### Actions
| UI Element | Action ID | Type | Next Screen | Token | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select building hotspot | `town.selectBuilding` | local-ui | (current) | `SELECT_TOWN_BUILDING` (local-ui) | Sets selected hotspot; `BuildStatePlaque` and status line refresh. | Hotspot `slotHot` glow on hover; click plays `audio.ui.click`. |
| Open build tree | `town.build` | navigation | `30-build-tree` | `OPEN_BUILD_TREE` (navigation) | Routes with the selected town context. `BUILD_BUILDING` is dispatched on screen 30, not here. | Service-button hover glow; exit fades the panorama frame. |
| Recruit creatures | `town.recruit` | navigation | `25-building-recruitment-dialog` | `OPEN_RECRUITMENT_DIALOG` (navigation) | Routes with selected dwelling context. `RECRUIT_UNITS` is dispatched on screen 25. | Service-button hover glow; recruit counts tick after return. |
| Open mage guild | `town.mage` | navigation | `29-mage-guild` | `OPEN_MAGE_GUILD` (navigation) | Routes with `state.adventure.visitingHeroId` for spell eligibility. `LEARN_SPELL` is dispatched on screen 29. | Service-button hover glow; guild door transition handled on 29. |
| Visit tavern | `town.tavern` | navigation | `28-tavern` | `OPEN_TAVERN` (navigation) | Routes with the town context. `HIRE_TAVERN_HERO` is dispatched on screen 28. | Service-button hover glow. |
| Open marketplace | `town.market` | navigation | `26-marketplace` | `OPEN_MARKETPLACE` (navigation) | Routes with the town context. Marketplace trades are dispatched on screen 26. | Service-button hover glow. |
| Transfer army stack | `town.transferArmy` | command | (current) | `TRANSFER_TOWN_ARMY_STACK` | Moves a stack between `garrison` and `visitingHero` after ownership / capacity checks. | Drag ghost snaps between legal slots; reject snaps back. |
| Exit town | `town.exit` | navigation | `07-adventure-map` | `CLOSE_TOWN_SCREEN` (navigation) | Returns to adventure-map focus on the source hex. | Town screen fades out; `audio.ui.click`. |

### State Changes
Owning reducer or local UI draft writes propagate to the selectors
bound in `spec.md` § State Bindings:

- `state.towns.selectedTownId` → `town.id`.
- `state.towns.byId[selected].buildings` → `town.buildings`
  (controls hotspots and service-button availability).
- `state.towns.byId[selected].builtToday` → `dailyBuild` (disables
  Build for the rest of the day).
- `state.towns.byId[selected].garrison` → `garrison`.
- `state.adventure.visitingHeroId` → `visitingHero` (portrait, army
  row, mage-guild eligibility).

UI-only hover, focus, selected building, target cursor, drag ghost,
and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
Each navigation action above routes to its `Next Screen` after the
route guard accepts the click and the exit animation completes. The
graph edge is owned by
[`docs/architecture/screen-transition-graph.json`](../../../screen-transition-graph.json);
see `## ⚠ Issues` for the registered-edge gap.

### Disabled And Error Cases
- Disable a service button when its target screen's precondition
  fails: Build when `dailyBuild === true` or no buildable structure
  exists; Recruit when no dwelling has stock; Mage when no visiting
  hero is present **and** the open-as-anonymous policy is off;
  Tavern / Market when the corresponding building is not built.
- Disable a transfer slot when ownership, garrison capacity, or
  phase guards fail.
- Missing presentation assets may use the resolver fallback per
  [`asset-policy.md`](../../../asset-policy.md). Missing gameplay
  records, invalid content IDs, or rejected commands fail loudly
  per [`fail-loud.md`](../../../fail-loud.md).
- On rejection: keep the current screen open, preserve the local
  draft when useful, show localized error text, play failure
  feedback.
- Errors are produced by `formatUserError(err, locale)` per
  [`docs/architecture/error-formatter.md`](../../../error-formatter.md);
  never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams mirror these interactions; they must
  not introduce hidden behavior.

## Error surfaces

Per [`error-ux.md`](../../../error-ux.md) § 5, this screen inherits
the default code → surface mapping from § 2. The only engine
command dispatched on this screen is `TRANSFER_TOWN_ARMY_STACK`;
its row below pins the default for the `DISPATCHER_*` prefix. A
row whose Notes column reads `override` replaces the § 2 default;
otherwise the default applies. Specific error codes (e.g.
`DISPATCHER_<token>`, `STORAGE_<token>`) land alongside the engine
reducer that owns each command and trigger the gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing for them.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Transfer army (`TRANSFER_TOWN_ARMY_STACK`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 `DISPATCHER_*`; disabled drop slot + tooltip on rejection. |

---

## 🔍 Sync Check

- **UI: ✔** — Six service buttons match `mockup.html` (`town.build`,
  `town.recruit`, `town.mage`, `town.tavern`, `town.market`,
  `town.exit`) and the `ServiceButtons` row listed in sibling
  `spec.md` § Component Tree.
- **Schema: ⚠** — Only `TRANSFER_TOWN_ARMY_STACK` is a closed
  `Command.kind` in
  [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json)
  (line 1490). `BUILD_BUILDING`, `RECRUIT_UNITS`, `LEARN_SPELL`,
  `HIRE_TAVERN_HERO` are dispatched on the destination screens. The
  `OPEN_*` / `SELECT_TOWN_BUILDING` / `CLOSE_TOWN_SCREEN` tokens are
  screen-local navigation / UI; per `command-schema.md`, these must
  be registered in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  for `npm run validate:commands` to pass. Detail in `## ⚠ Issues`.
- **Tasks: ✔** — Owning task
  [`tasks/mvp/07-ui-shell/04-town-screen-modal.md`](../../../../../tasks/mvp/07-ui-shell/04-town-screen-modal.md)
  Reads First this file and depends on
  `mvp.05-adventure-map.18-transfer-stack-commands` (which owns
  `TRANSFER_TOWN_ARMY_STACK`).

## ⚠ Issues

- **Screen-local tokens absent from `screen-command-coverage.json`.**
  The seven non-engine tokens emitted by this screen
  (`SELECT_TOWN_BUILDING`, `OPEN_BUILD_TREE`,
  `OPEN_RECRUITMENT_DIALOG`, `OPEN_MAGE_GUILD`, `OPEN_TAVERN`,
  `OPEN_MARKETPLACE`, `CLOSE_TOWN_SCREEN`) need an entry classifying
  them as `local-ui` or `navigation` (with an owning task). Per
  [`command-schema.md`](../../../command-schema.md) ("A token must
  be a schema command, an alias to one, UI-local, or explicitly out
  of scope with an owning task"), the gate
  [`scripts/check-command-coverage.mjs`](../../../../../scripts/check-command-coverage.mjs)
  fires otherwise. Owner:
  [`tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md`](../../../../../tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md).
  Suggested values: `local-ui` for `SELECT_TOWN_BUILDING`;
  `navigation → <slug>` for the five `OPEN_*` and `CLOSE_TOWN_SCREEN`
  tokens.
- **Outgoing screen-transition-graph rows missing.**
  [`docs/architecture/screen-transition-graph.json`](../../../screen-transition-graph.json)
  registers only the inbound `07-adventure-map → 24-town-screen`
  edge. The six outgoing edges (`24 → 30/25/29/28/26/07`) named in
  the Actions table above are not registered. Same owner; flagged
  rather than rewritten because the JSON is generated.
- **`error-formatter.md` link may be stale.** The "AI Implementation
  Notes" of the original interactions cited
  `docs/architecture/error-formatter.md`; the file exists at that
  path. No fix required — recorded so a future audit does not
  silently break the link.
