# Screen 19: Status Bar
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Adventure status line and message-history drawer. Reads hover
descriptions, reducer-emitted events, and resource deltas; offers
expand / pin / clear / collapse affordances. All actions are
local-UI — none mutate gameplay state.

### Actions
All four tokens are UI-local (matched by `EXPAND_/PIN_/CLEAR_/COLLAPSE_`
prefixes in `screen-command-coverage.json`). Next screen is always
the current screen.

| UI Element | Action ID | Token | State Mutated |
| --- | --- | --- | --- |
| Status strip click / hotkey | `status.expand` | `EXPAND_STATUS_HISTORY` | `state.ui.statusBar.drawerOpen = true`. |
| Message row pin affordance | `status.pinMessage` | `PIN_STATUS_MESSAGE` | `state.ui.statusBar.pinnedMessageId = <id>`. |
| Drawer CLEAR button | `status.clear` | `CLEAR_STATUS_HISTORY` | `state.ui.messages.history = []`; pin cleared if pinned row was in history. |
| Drawer CLOSE button | `status.collapse` | `COLLAPSE_STATUS_HISTORY` | `state.ui.statusBar.drawerOpen = false`. |

### Animation And Audio
Shared by every action above; reduced-motion mode collapses to
static state changes only.

- New ticker messages slide in from the left
  (`vfx.status-bar.message-slide-in`).
- Drawer expand/collapse folds open/closed
  (`vfx.status-bar.drawer-fold`); the underlying map layout does
  not reflow.
- Resource delta badges glow on update
  (`vfx.status-bar.delta-glow`).
- Pinned message receives a wax-seal flourish
  (`vfx.status-bar.pin-wax-seal`).
- `audio.ui.hover` on hover, `audio.ui.click` on every button
  press.

### State Reads (inbound)
- `state.ui.adventure.hoverContext` — current hover/focus
  description.
- `state.ui.messages.latest` — most recent reducer-emitted status
  event (movement, capture, error, ...).
- `state.ui.messages.history` — client-side ring buffer.
- `selectors.economy.lastVisibleDeltas` — recent command-result
  resource deltas.
- `state.ui.statusBar.drawerOpen`,
  `state.ui.statusBar.pinnedMessageId` — local-UI toggles.
- `selectors.session.moddedIndicator` — modded-content badge.

UI-only hover, focus, drag ghost, scroll position, and animation
frame stay outside deterministic gameplay state per
[`side-effect-matrix.md`](../../../side-effect-matrix.md).

### Navigation Outcomes
None. Every action keeps the user on the current screen. The
status bar is rendered as a sibling of the adventure-map root and
does not participate in screen transitions.

### Disabled And Error Cases
- `status.expand` is disabled when `state.ui.messages.history` is
  empty (nothing to show); show `ui.status-bar.errors.empty`
  tooltip on hover.
- `status.pinMessage` is disabled when no row is selected.
- `status.clear` is disabled when `state.ui.messages.history` is
  empty.
- `status.collapse` is always enabled when the drawer is open.
- Missing presentation assets fall back through the asset
  resolver.
- Missing localization keys surface the raw key loudly; never a
  silent blank. See
  [`untrusted-strings.md`](../../../untrusted-strings.md).
- Error text for reducer-rejected gameplay actions arrives through
  `state.ui.messages.latest` already formatted by
  `formatUserError(err, locale)` from
  [`error-formatter.md`](../../../error-formatter.md); this screen
  never constructs error text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `data-contracts.md` owns schemas, selectors, and asset/VFX IDs.
- `architecture.md` diagrams must mirror these interactions, not
  introduce new behavior.

## 🔍 Sync Check
- Sibling `spec.md` § State Bindings — aligned; `pinnedMessageId`
  reference matches `data-contracts.md`.
- Sibling `data-contracts.md` § Commands And Events — token,
  action ID, and effect descriptions match.
- Sibling `architecture.md` § Animation Sequence — aligned; user
  branches never route through the reducer.
- `mockup.html` — CLEAR (`status.clear`) and CLOSE
  (`status.collapse`) buttons are present in the expanded drawer
  panel; expand/pin trigger from the collapsed strip and message
  rows respectively.
- `screen-command-coverage.json` — all four tokens are covered by
  `localUiPrefixes`; no schema entry required.
- `error-formatter.md`, `untrusted-strings.md`,
  `side-effect-matrix.md` — exist at the linked paths.

## ⚠ Issues
- The mockup shows only CLEAR + CLOSE buttons; the expand and pin
  affordances are implied (collapsed-strip click, per-row
  hit-target). When the implementing task lands, the runtime
  component must surface visible affordances for both, or this
  screen package needs a mockup revision to show them.
