# Screen 15: Underground Layer Toggle
## Interaction Map

### Source Files
- [`mockup.html`](./mockup.html) — visual reference.
- [`spec.md`](./spec.md) — components and state bindings.
- [`data-contracts.md`](./data-contracts.md) — schemas, selectors, localization, assets.
- [`architecture.md`](./architecture.md) — screen diagrams.

### Purpose
Adventure-map view-layer switcher. All four controls are UI-local
by prefix; no schema-backed command leaves this screen. Hero
relocation between layers still requires walking onto a valid
subterranean gate or monolith, owned by
[`mvp.03-map-system.10-underground-layer-support`](../../../../../tasks/mvp/03-map-system/10-underground-layer-support.md).

### Actions
| UI Element | Action ID | Type | Next Screen | Token | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Switch to surface (`data-action="layer.surface"`) | `layer.surface` | local-ui | `07-adventure-map` | `SET_ADVENTURE_LAYER` | Writes `state.adventure.activeLayer = "surface"`; recenters `state.adventure.camera` on the last surface focus or the active hero. | Vertical wipe down to the surface plate; minimap palette swaps to warm greens; `audio.ui.click`. |
| Switch to underground (`data-action="layer.underground"`) | `layer.underground` | local-ui | `07-adventure-map` | `SET_ADVENTURE_LAYER` | Writes `state.adventure.activeLayer = "underground"` when `hasUnderground` is `true`; recenters `state.adventure.camera` on the matching subterranean coordinate. | Vertical wipe up to the underground plate; minimap palette swaps to cold stone; `audio.ui.click`. When `hasUnderground` is `false` the button is disabled and emits a `clank` cue (`audio.ui.click` muted variant). |
| Focus gate (gate marker click) | `layer.focusGate` | local-ui | `07-adventure-map` | `FOCUS_SUBTERRANEAN_GATE` | Writes `state.ui.layerToggle.selectedGateId`; recenters `state.adventure.camera` on the selected gate's tile on the currently active layer. | Hovered gate marker picks up the `pulse` animation; selected marker holds the glow; `audio.ui.hover` on enter, `audio.ui.click` on select. |
| Close (`data-action="layer.close"`) | `layer.close` | local-ui | `07-adventure-map` | `CLOSE_LAYER_TOGGLE` | Clears `state.ui.layerToggle.selectedGateId`; `state.adventure.activeLayer` is **unchanged** from when the modal opened. | Reverse `modalIn` (panel fade-out); `audio.ui.click`. |

Token classification:
- All four tokens are **UI-local** by prefix. `SET_`, `FOCUS_`, and
  `CLOSE_` are listed in `localUiPrefixes` of
  [`screen-command-coverage.json`](../../../screen-command-coverage.json),
  so none requires a row in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json).
- View-layer switches do not enter the deterministic command log
  per
  [`mvp.03-map-system.10-underground-layer-support`](../../../../../tasks/mvp/03-map-system/10-underground-layer-support.md)
  ("Screen 15 and 16 selectors can switch view layer without
  mutating gameplay state").

### State Changes
- `state.adventure.activeLayer` is rewritten by `layer.surface` and
  `layer.underground`; it refreshes the `activeLayer` binding for
  this screen and for sibling
  [`16-view-world`](../16-view-world/data-contracts.md).
- `state.ui.layerToggle.selectedGateId` refreshes `selectedGate` on
  `layer.focusGate` and is cleared on `layer.close`.
- `state.adventure.camera` refreshes `cameraFocus` after every
  layer switch and after `layer.focusGate`.
- `state.scenario.layers.underground.enabled` and
  `selectors.adventure.knownSubterraneanGates` are **read-only**
  here; they refresh on scenario load and on engine-owned gate
  discovery, respectively.
- UI-only hover, focus, drag ghost, and animation-frame state stay
  outside deterministic gameplay state.

### Navigation Outcomes
- `layer.surface`, `layer.underground`, `layer.focusGate`, and
  `layer.close` all return control to `07-adventure-map` once the
  exit animation completes. The modal is non-blocking: closing it
  without picking a layer leaves the prior view-layer intact.

### Disabled And Error Cases
- `UNDER` is disabled when `hasUnderground` is `false` (scenario
  has no underground); tooltip cites the localized
  `ui.underground-toggle.errors.no-underground` key.
- Gate markers render disabled when `selectors.adventure.knownSubterraneanGates`
  is empty for the player on the inactive layer; tooltip cites
  `ui.underground-toggle.errors.no-known-gates`.
- Missing presentation assets use resolver fallback per
  [`fail-loud.md`](../../../fail-loud.md). Missing gameplay records
  (unknown gate ID, malformed scenario layer config) fail loudly
  before controls become enabled, per the same doc.
- On rejection, keep the modal open, preserve `selectedGate` when
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
each **schema-backed command** to its default surface for this
screen's dominant error domain. Specific error codes
(e.g. `DISPATCHER_<token>`, `STORAGE_<token>`) land alongside the
engine reducer that owns each command and trigger the gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing for them.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |

_None._ All four control tokens are UI-local by prefix and never
reach the dispatcher. Disabled-button states (`UNDER`, gate
markers) render their reason inline via the localization keys
listed under **Disabled And Error Cases** above.

---

## 🔍 Sync Check

- **UI: ✔** — Mockup `data-action` attributes (`layer.surface`,
  `layer.underground`, `layer.close`) map one-to-one to the SURFACE,
  UNDER, and CLOSE rows; the gate-marker click handler drives
  `layer.focusGate`. Modal regions (`Surface` preview, `Underground`
  preview, central lever, three buttons) match
  [`mockup.html`](./mockup.html) exactly. Sibling [`spec.md`](./spec.md)
  component tree aligned (`SurfacePreview`, `UndergroundPreview`,
  `GateMarkerList`, `LayerLever`, `CloseButton`).
- **Schema: ✔** — All four tokens (`SET_ADVENTURE_LAYER`,
  `FOCUS_SUBTERRANEAN_GATE`, `CLOSE_LAYER_TOGGLE`) clear via the
  `SET_` / `FOCUS_` / `CLOSE_` UI-local prefix policy in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  (checked by `npm run validate:commands`); none requires a row in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json).
  `hasUnderground` is sourced from
  [`scenario.schema.json`](../../../../../content-schema/schemas/scenario.schema.json).
- **Tasks: ✔** — Engine owner
  [`mvp.03-map-system.10-underground-layer-support`](../../../../../tasks/mvp/03-map-system/10-underground-layer-support.md)
  reads this file first; UI owner
  [`phase-2.07-ui-screen-backlog.15-underground-toggle-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/15-underground-toggle-screen.md)
  reads this file first and lists task 10 as a Dependency.

## ⚠ Issues

- **Reclassified `SET_ADVENTURE_LAYER` from `command` to
  `local-ui`.** The previous revision listed it as `Type: command`
  with a `DISPATCHER_REJECTED` error-surface row, which contradicts
  the `SET_` UI-local prefix policy in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  and the engine owner's view-layer contract
  ([`mvp.03-map-system.10-underground-layer-support`](../../../../../tasks/mvp/03-map-system/10-underground-layer-support.md)).
  Rewrote the row and removed the dispatcher error-surface entries.
  Already flagged from sibling [`spec.md`](./spec.md). No code
  change implied.
