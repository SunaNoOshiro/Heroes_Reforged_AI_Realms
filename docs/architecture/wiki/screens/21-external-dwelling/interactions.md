# Screen 21: External Dwelling
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Adventure-map dialog for recruiting creatures from a dwelling that
sits outside any town. Opens when the active hero visits the
dwelling; closes back to `07-adventure-map`.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Change quantity | `dwelling.quantity` | local-ui | Current screen | `SET_EXTERNAL_DWELLING_QUANTITY` | Updates draft quantity; refreshes cost and destination preview. | Stepper tick, cost number rolls. |
| Max | `dwelling.max` | local-ui | Current screen | `SET_EXTERNAL_DWELLING_MAX` | Snaps `selectedQuantity` to the legal maximum (stock ∧ affordable ∧ capacity). | Slider fills, cost number rolls. |
| Recruit | `dwelling.recruit` | command | Current screen | `RECRUIT_EXTERNAL_DWELLING_UNITS` | Spends resources, decrements stock, merges or appends the stack on the hero army. | Portrait breathes, stock counter ticks down, recruited stack slides into the destination slot; empty dwelling greys out. |
| Close | `dwelling.close` | navigation | `07-adventure-map` | `CLOSE_EXTERNAL_DWELLING` | Drops the local draft; returns to map. | Modal fade-out. |

### State Changes
- `state.ui.adventure.pendingDwellingId` → `dwellingId`. Set when the
  map dialog opens; cleared by `dwelling.close`.
- `state.mapObjects.byId[dwellingId].stock` → `dwellingStock`.
  Reducer-owned; decrements after a successful
  `RECRUIT_EXTERNAL_DWELLING_UNITS`.
- `state.ui.externalDwelling.quantity` → `selectedQuantity`. Local UI
  draft, updated by `dwelling.quantity` / `dwelling.max`.
- `state.heroes.byId[selected].army` → `destinationArmy`. Reducer-
  owned; updated when the recruit command succeeds.
- `selectors.economy.externalDwellingCost` → `costPreview`. Derived
  selector over `dwellingStock`, `selectedQuantity`, and resources.
- UI-only hover, focus, drag ghost, and animation frame stay outside
  deterministic gameplay state.

### Navigation Outcomes
- `dwelling.close` routes to `07-adventure-map` after guard approval
  and the close animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records,
  resource costs, target legality, ownership, phase, or route guards
  fail.
- Missing presentation assets may use resolver fallback. Missing
  gameplay records, invalid content IDs, or rejected commands fail
  loudly.
- On rejection, keep the dialog open, preserve the local draft when
  useful, show localized error text, and play failure feedback.
- Error strings are produced by `formatUserError(err, locale)`
  declared in
  [`docs/architecture/error-formatter.md`](../../../error-formatter.md);
  never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams mirror these interactions; they must not
  introduce new behavior.

## Error surfaces

Per [`error-ux.md`](../../../error-ux.md) § 5, this screen inherits
the default code → surface mapping from § 2. The table below maps
each action whose `Type` column is `command` to its default surface
for this screen's dominant error domain. A row whose Notes column
reads `override` replaces the § 2 default for that action; otherwise
the default applies. Specific error codes (e.g.
`DISPATCHER_<token>`, `STORAGE_<token>`) land alongside the engine
reducer that owns each command and trigger the gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing for them.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Recruit (`RECRUIT_EXTERNAL_DWELLING_UNITS`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |

---

## 🔍 Sync Check

- **UI: ✔** — Four actions match the `data-action` buttons in `mockup.html` (`dwelling.max`, `dwelling.recruit`, `dwelling.close`) plus the implicit `dwelling.quantity` stepper; component names align with sibling `spec.md` § Component Tree.
- **Schema: ✔** — `RECRUIT_EXTERNAL_DWELLING_UNITS` is the only schema-backed action and is defined in [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json); the other three tokens are correctly typed `local-ui` / `navigation` and intentionally absent from the schema.
- **Tasks: ✔** — Engine command task `mvp.05-adventure-map.13-recruit-external-dwelling-command` reads this file from its Read First; owning UI task `phase-2.07-ui-screen-backlog.21-external-dwelling-screen` ties every action token to the screen-command coverage map.

## ⚠ Issues

_None._
