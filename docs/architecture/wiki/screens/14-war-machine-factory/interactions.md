# Screen 14: War Machine Factory
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Adventure-map service modal for buying war machines (ballista, ammo
cart, first-aid tent, catapult) for gold and equipping them into
hero rack slots. One of the three controls dispatches a schema-
backed engine command; the other two are UI-local by prefix.

### Actions
| UI Element | Action ID | Type | Next Screen | Token | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Click machine bay (`data-item="Ballista" \| "Ammo" \| "Tent" \| "Catapult"`) | `warFactory.selectMachine` | local-ui | Current screen | `SELECT_WAR_MACHINE` | Writes `state.ui.warMachineFactory.selectedMachineId`; refreshes `price` via selector; updates the status-strip slot preview. | Hovered bay picks up `slotHot` + `glow`; selected bay holds the glow; `audio.ui.hover` on enter, `audio.ui.click` on select. |
| Buy | `warFactory.buy` | command | Current screen | `BUY_WAR_MACHINE` | Spends `price` gold, writes the bought machine into the matching `state.heroes.byId[selected].warMachines` slot, and decrements `state.mapObjects.byId[factoryId].warMachineStock` when the factory is limited. | Bought bay stamps `SOLD`; gold counter ticks down; the acquired machine slides into the `HeroMachineRack` slot; `audio.adventure.*` confirmation cue. |
| Close | `warFactory.close` | navigation | `07-adventure-map` | `CLOSE_WAR_MACHINE_FACTORY` | Clears `state.ui.warMachineFactory.selectedMachineId`; returns to the visited factory tile with no camera move. | Reverse `modalIn` (panel fade-out); `audio.ui.click`. |

Token classification:
- `BUY_WAR_MACHINE` is a **schema-backed command** defined in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json)
  (`$defs.buyWarMachine`, required: `heroId`, `factoryId`,
  `warMachineId`, `metadata`); the reducer is owned by
  [`phase-2.01-spells-artifacts.11-buy-war-machine-command`](../../../../../tasks/phase-2/01-spells-artifacts/11-buy-war-machine-command.md).
- `SELECT_WAR_MACHINE` and `CLOSE_WAR_MACHINE_FACTORY` are
  **UI-local** by prefix (`SELECT_`, `CLOSE_` listed in
  `localUiPrefixes` of
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)),
  so neither requires a row in `command.schema.json`.

### State Changes
- `state.mapObjects.byId[factoryId].warMachineStock` refreshes
  `shopStock` after the purchase reducer commits.
- `state.heroes.byId[selected].warMachines` refreshes `heroMachines`
  after the purchase reducer commits.
- `state.ui.warMachineFactory.selectedMachineId` refreshes
  `selectedMachine` on `warFactory.selectMachine` and is cleared on
  `warFactory.close`.
- `selectors.economy.selectedWarMachinePrice` refreshes `price`
  whenever `selectedMachine` or the visited factory's stock changes.
- `state.players.active.resources.gold` refreshes `resources` after
  the purchase reducer deducts cost.
- UI-only hover, focus, drag ghost, and animation-frame state stay
  outside deterministic gameplay state.

### Navigation Outcomes
- `warFactory.close` routes to `07-adventure-map` after the close
  animation. `warFactory.buy` keeps the modal open so the player
  can chain purchases until stock or gold is exhausted.

### Disabled And Error Cases
- `BUY` is disabled when `selectedMachine` is `null`, when the
  matching `heroMachines` slot is already occupied (exclusive slot),
  when `resources.gold` is less than `price`, when the factory has
  no stock for the selected machine, when the hero does not own the
  factory visit, or when any other Gate 2 check fails (see
  [`command-schema.md`](../../../command-schema.md)).
- Missing presentation assets use resolver fallback per
  [`fail-loud.md`](../../../fail-loud.md). Missing gameplay records
  (unknown `warMachineId`, unresolved factory capability) fail
  loudly before controls become enabled, per the same doc.
- On rejection, keep the modal open, preserve `selectedMachine`
  when useful, show localized error text, and play failure feedback.
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
| Buy (`BUY_WAR_MACHINE`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |

---

## 🔍 Sync Check

- **UI: ✔** — Mockup `data-action` attributes (`warFactory.buy`,
  `warFactory.close`) map one-to-one to the BUY and CLOSE rows;
  machine selection is driven by `data-item="Ballista" | "Ammo" |
  "Tent" | "Catapult"` slot clicks (Workshop panel). Status-strip
  copy ("Selected <machine> — price <gold> gold — slot <state>")
  matches the `selectedMachine` / `price` bindings. Sibling
  [`spec.md`](./spec.md) component tree aligned (`MachineBayGrid`,
  `HeroMachineRack`, `PriceLedger`, `BuyButton`, `CloseButton`).
- **Schema: ✔** — `BUY_WAR_MACHINE` is present in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json)
  (`$defs.buyWarMachine`); `SELECT_WAR_MACHINE` and
  `CLOSE_WAR_MACHINE_FACTORY` clear via the `SELECT_` / `CLOSE_`
  UI-local prefix policy in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  (checked by `npm run validate:commands`).
- **Tasks: ✔** — Engine reducer owner
  [`phase-2.01-spells-artifacts.11-buy-war-machine-command`](../../../../../tasks/phase-2/01-spells-artifacts/11-buy-war-machine-command.md)
  reads this file first; UI owner
  [`phase-2.07-ui-screen-backlog.14-war-machine-factory-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/14-war-machine-factory-screen.md)
  reads this file first and lists task 11 as a Dependency.

## ⚠ Issues

- **`state.ui.warMachineFactory.selectedMachineId` not registered
  in `data-inventory.md`.** Already flagged from sibling
  [`spec.md`](./spec.md) — transient UI slice, no row required.
  Skill did not edit `data-inventory.md` (Hard Prohibition D).
