# Screen 18: Map Object Tooltip

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Companion Docs
- [`docs/architecture/ui-state-contract.md` § Tooltip Lifecycle](../../../ui-state-contract.md#tooltip-lifecycle) — per-tick re-resolution, auto-dismiss, and the `ruleset.ui.timing` constants (`tooltipHoldDelayMs`, `tooltipFadeInMs`, `tooltipFadeOutMs`) every anchored-tooltip screen consumes.
- [`docs/architecture/ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract) — Z-Layer 2000.
- [`docs/architecture/screen-command-coverage.json`](../../../screen-command-coverage.json) — declares the four tooltip tokens (`OPEN_*`, `PIN_*`, `CLOSE_*`) as local-ui via prefix match.

### Description
Right-click informational tooltip for adventure map objects (heroes, towns, mines, resources, neutral stacks, treasures). Presentation-only: every gesture is local-ui; the tooltip never mutates `AdventureState`.

### Visual Direction
Original internal UI contract. Do not use third-party captures, copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-3`.
- Z-Layer: 2000.
- Fixed 800x600 surface, ornate gold frame, red/brown/stone panels.
- Compact black-and-bronze tooltip floats next to the hovered object with portrait, public name, ownership/guard hints. No command buttons render inside the tooltip; affordances live in the surrounding `RightCommandPanel` once an object becomes the focus.
- `mockup.html` defines visible regions and data hooks only. Logic, transitions, and timing live in the Markdown package files.

### Component Tree
- `MapObjectTooltip`
  - `TooltipAnchor` — screen-space placement near the object hex.
  - `ObjectPortrait` — visibility-filtered portrait or silhouette.
  - `PublicInfoRows` — name, type, owner, public hints; hidden fields render as masked rows.
  - `PinState` — brass-tack indicator when the tooltip is pinned.
  - `CloseHotspot` — invisible dismissal target driven by pointer-leave or Esc.

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `hoverObject` | `state.ui.adventure.hoverObjectId` | Object under pointer or controller focus. UI draft slice; excluded from saves/replays. |
| `publicInfo` | `selectors.mapObjects.publicTooltipInfo` | Name, type, owner, public hints. Re-resolved every reducer tick per [`ui-state-contract.md § Tooltip Lifecycle`](../../../ui-state-contract.md#tooltip-lifecycle). |
| `hiddenGuard` | `selectors.scouting.hiddenTooltipFields` | Fields masked by fog or scouting rules; re-resolved on ownership change. |
| `pinState` | `state.ui.tooltips.pinnedObjectId` | `null` when no tooltip is pinned. Cleared by Esc layer 3 in [`ui-input-arbitration.md` § Esc Precedence Ladder](../../../ui-input-arbitration.md#esc-precedence-ladder). |
| `anchorPosition` | `state.ui.pointer.anchorRect` | Screen-space rect only; never feeds gameplay logic. |

### Mechanics Mapping
- Tooltip data is presentation-only and visibility-filtered: hidden army counts, rewards, and ownership stay masked while fog/scouting rules require it.
- All resolution flows through registries and content schemas (heroes, towns, mines, artifacts, neutral stacks, map objects, resources) — no hardcoded view logic.
- Auto-dismiss on a null `publicTooltipInfo` result and re-render on ownership change are owned by [`ui-state-contract.md § Tooltip Lifecycle`](../../../ui-state-contract.md#tooltip-lifecycle); this screen consumes that contract.

### Animation Contract
- Hold-delay fade-in, anchor tracking, brass-tack pin indicator, and fade-out on close or invalidate. Durations come from `ruleset.ui.timing.tooltipHoldDelayMs | tooltipFadeInMs | tooltipFadeOutMs`; no hard-coded delays in screen code.
- Animation consumes selector results; it never decides gameplay outcomes.
- Reduced-motion mode replaces fades with instant state changes; the tooltip still appears, persists, and dismisses, just without easing.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists every visible region and authoritative state binding.
- `interactions.md` covers every gesture, next screen, state update, animation, and dismissal/error path.
- `architecture.md` diagrams describe this screen specifically and do not introduce hidden behavior not present in the other package files.
- `data-contracts.md` enumerates every schema, config, localization, asset, audio, VFX, save, and replay reference required to implement the screen.

### AI Implementation Notes
- Screen slug: `map-object-tooltip`; system group: `adventure`; curation marker: `curated-pass-3`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Resolve presentation through asset IDs / manifests; resolve gameplay reads through the listed selectors. Never dispatch from this screen into the engine reducer.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree, state bindings, and Z-Layer (2000) match `mockup.html` and the sibling `interactions.md` / `architecture.md`. The "no buttons inside the tooltip" rule matches the mockup body (portrait + label rows only).
- **Schema: ✔** — `ruleset.ui.timing` (`tooltipHoldDelayMs`, `tooltipFadeInMs`, `tooltipFadeOutMs`) is defined in [`ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) at lines 111–113 per `mvp.07-ui-shell.17-tooltip-lifecycle`. `selectors.mapObjects.publicTooltipInfo` and `selectors.scouting.hiddenTooltipFields` are declared in [`ui-state-contract.md § Tooltip Lifecycle`](../../../ui-state-contract.md#tooltip-lifecycle).
- **Tasks: ✔** — Runtime owner `mvp.05-adventure-map.09-map-object-dialogs` ships `MapObjectTooltip.tsx` and lists this package in its Read First; the lifecycle / timing-constants owner `mvp.07-ui-shell.17-tooltip-lifecycle` lists `spec.md` and `interactions.md` in its Read First.

## ⚠ Issues

_None._
