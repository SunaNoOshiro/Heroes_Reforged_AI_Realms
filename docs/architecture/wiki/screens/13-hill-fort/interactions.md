# Screen 13: Hill Fort
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Adventure-map service modal for upgrading hero army stacks. Two of
the four controls dispatch schema-backed engine commands; the other
two are UI-local by prefix.

### Actions
| UI Element | Action ID | Type | Next Screen | Token | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select stack (click `Current` slot) | `hillFort.selectStack` | local-ui | Current screen | `SELECT_HILL_FORT_STACK` | Writes `state.ui.hillFort.selectedStackIndex`; refreshes `costPreview` via selector. | Selected slot picks up `slotHot` + `glow`; matching upgrade-target slot pulses; the arrow between them activates the `pulse` keyframe; `audio.ui.click`. |
| Upgrade selected | `hillFort.upgradeSelected` | command | Current screen | `UPGRADE_ARMY_STACK` | Spends `costPreview`, replaces the stack's creature ID, preserves count. | Upgraded portrait flashes and resource ledger ticks down after the reducer returns; arrow holds the `pulse` until VFX completes; `audio.adventure.*` confirmation cue. |
| Upgrade all | `hillFort.upgradeAll` | command | Current screen | `UPGRADE_ALL_ELIGIBLE_STACKS` | Applies every legal upgrade in stable slot order; spends the summed cost atomically. | Each upgraded portrait flashes in slot order; resource ledger ticks once per applied upgrade; `audio.adventure.*` per upgrade. |
| Close | `hillFort.close` | navigation | `07-adventure-map` | `CLOSE_HILL_FORT` | Clears `state.ui.hillFort.selectedStackIndex`; returns to the visited fort tile with no camera move. | Reverse `modalIn` (panel fade-out); `audio.ui.click`. |

Token classification:
- `UPGRADE_ARMY_STACK` and `UPGRADE_ALL_ELIGIBLE_STACKS` are
  schema-backed commands defined in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json);
  the reducer is owned by
  [`mvp.05-adventure-map.20-upgrade-army-stack-command`](../../../../../tasks/mvp/05-adventure-map/20-upgrade-army-stack-command.md).
- `SELECT_HILL_FORT_STACK` and `CLOSE_HILL_FORT` are UI-local by
  prefix (`SELECT_`, `CLOSE_` listed in `localUiPrefixes` of
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)),
  so neither requires a row in `command.schema.json`.

### State Changes
- `state.heroes.byId[selected].army` refreshes `heroArmy` after the
  upgrade reducer returns.
- `selectors.creatures.availableHillFortUpgrades` refreshes
  `upgradeTargets` whenever `heroArmy` or the visited fort's
  capability changes.
- `state.ui.hillFort.selectedStackIndex` refreshes `selectedStack`
  on `hillFort.selectStack` and is cleared on `hillFort.close`.
- `selectors.economy.upgradeCostPreview` refreshes `costPreview`
  whenever `selectedStack` or `resources` changes.
- `state.players.active.resources` refreshes `resources` after the
  upgrade reducer deducts cost.
- UI-only hover, focus, drag ghost, and animation-frame state stay
  outside deterministic gameplay state.

### Navigation Outcomes
- `hillFort.close` routes to `07-adventure-map` after the close
  animation. No upgrade action navigates; both `UPGRADE` and `ALL`
  keep the modal open so the player can chain upgrades.

### Disabled And Error Cases
- `UPGRADE` is disabled when `selectedStack` is `null`, when the
  selected slot has no upgrade target in `upgradeTargets`, when
  `resources` is insufficient for `costPreview`, when the hero does
  not own the stack, or when the destination army would exceed
  capacity (Gate 2 of [`command-schema.md`](../../../command-schema.md)).
- `ALL` is disabled when no eligible stack passes the same checks.
- Missing presentation assets use resolver fallback per
  [`fail-loud.md`](../../../fail-loud.md). Missing gameplay records
  (unknown upgrade path, unresolved creature ID) fail loudly before
  controls become enabled, per the same doc.
- On rejection, keep the modal open, preserve `selectedStack` when
  useful, show localized error text, and play failure feedback.
- Errors render via `formatUserError(err, locale)` declared in
  [`docs/architecture/error-formatter.md`](../../../error-formatter.md);
  never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- [`spec.md`](./spec.md) owns static regions and state bindings.
- [`architecture.md`](./architecture.md) diagrams must mirror these
  interactions rather than inventing new behavior.
- [`data-contracts.md`](./data-contracts.md) owns the schema /
  localization / asset surface.

## Error surfaces

Per [`error-ux.md`](../../../error-ux.md) § 5, this screen inherits
the default code → surface mapping from § 2. The table below maps
each schema-backed command to its default surface for this screen's
dominant error domain. Specific error codes (e.g.
`DISPATCHER_<token>`, `STORAGE_<token>`) land alongside the engine
reducer that owns each command and trigger the gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing for them.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Upgrade selected (`UPGRADE_ARMY_STACK`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
| Upgrade all (`UPGRADE_ALL_ELIGIBLE_STACKS`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |

---

## 🔍 Sync Check

- **UI: ✔** — All four `data-action` attributes in `mockup.html`
  (`hillFort.upgradeSelected`, `hillFort.upgradeAll`,
  `hillFort.close`, plus per-slot `data-item` selection) map
  one-to-one to the Actions table. Button labels `UPGRADE` / `ALL` /
  `CLOSE` match. Sibling [`spec.md`](./spec.md) component tree
  aligned (`UpgradeButtons`, `CloseButton`).
- **Schema: ✔** — `UPGRADE_ARMY_STACK` and
  `UPGRADE_ALL_ELIGIBLE_STACKS` are present in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json);
  `SELECT_HILL_FORT_STACK` and `CLOSE_HILL_FORT` clear via the
  `SELECT_` / `CLOSE_` UI-local prefix list in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  (checked by `npm run validate:commands`).
- **Tasks: ✔** — Engine reducer owner
  [`mvp.05-adventure-map.20-upgrade-army-stack-command`](../../../../../tasks/mvp/05-adventure-map/20-upgrade-army-stack-command.md)
  reads this file first; UI owner
  [`phase-2.07-ui-screen-backlog.13-hill-fort-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/13-hill-fort-screen.md)
  reads this file first and lists task 20 as a Dependency.

## ⚠ Issues

_None._
