# Screen 19: Status Bar

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Adventure status line plus an expandable message-history drawer.
Surfaces hover descriptions, reducer-emitted events, resource
deltas, and disabled reasons. Pure presentation — no reducer
commands originate here.

### Visual Direction
Original internal UI contract. Do not use third-party captures or
external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-3`.
- Fixed 800×600 layout, ornate gold frame, red/brown/stone panels,
  compact icon slots, right-click detail affordances.
- The bottom status strip expands into a scrollable
  `MessageHistoryDrawer` while the map remains visible above and
  the resource/date chrome stays locked in place.
- Drawer footer carries CLEAR and CLOSE buttons; the right side
  shows the currently pinned message and its latest resource
  delta.
- `mockup.html` contains visible UI only. Logic, transitions, and
  implementation notes live in this package's Markdown files.

### Component Tree
- AdventureStatusBar
  - MessageTicker
  - MessageHistoryDrawer
  - PinnedMessage
  - ResourceDeltaBadges

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `hoverContext` | `state.ui.adventure.hoverContext` | Localized hover/focus description. |
| `latestMessage` | `state.ui.messages.latest` | Most recent reducer-emitted status event. |
| `messageHistory` | `state.ui.messages.history` | Client-side ring buffer; not replay-authoritative. |
| `resourceDeltas` | `selectors.economy.lastVisibleDeltas` | Recent command-result deltas, keyed by `resource-id`. |
| `drawerOpen` | `state.ui.statusBar.drawerOpen` | Local expanded/collapsed state. |
| `pinnedMessageId` | `state.ui.statusBar.pinnedMessageId` | Local pin selection; session-scoped. |
| `moddedIndicator` | `selectors.session.moddedIndicator` | `off \| trusted \| sandboxed \| mixed` per [`pack-trust.md` § Modded Indicator](../../../pack-trust.md#6-modded-indicator). Always visible when not `off`; no dismiss control. Replays inherit the badge from `packHashes`. |

### Mechanics Mapping
- Status messages are presentation derived from hover context and
  reducer-emitted events. They never feed back into the reducer or
  alter replay state.
- Resource-delta badges resolve through `resource-id.schema.json`;
  IDs come from the reducer result, never hardcoded.
- Error text arrives pre-formatted by `formatUserError`; this
  screen renders it but does not construct it.

### Animation Contract
- New messages slide in from the left.
- Drawer expand/collapse folds open/closed without reflowing the
  map.
- Resource-delta badges glow on update.
- Pinned messages receive a wax-seal flourish.
- Reduced-motion mode preserves visible state changes with static
  highlights and localized feedback per
  [`animation-contract.md`](../../../animation-contract.md).

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- Spec lists every visible region and authoritative state binding.
- Interactions file covers each control, its UI-local token, state
  mutation, animation, disabled cases, and error path.
- Architecture file contains screen-specific diagrams that mirror
  the interactions and bindings.
- Data contracts identify schemas, config, localization, assets,
  audio, VFX, and the explicit "no persisted fields" stance for
  save/replay.

### AI Implementation Notes
- Screen slug: `status-bar`; system group: `adventure`; curation
  marker: `curated-pass-3`.
- Build runtime components from this package's contract — not from
  third-party captures or external product pixels.
- Runtime code resolves presentation through asset IDs and the
  pack manifest; deterministic gameplay commands originate
  elsewhere.

## 🔍 Sync Check
- Sibling `interactions.md` § Actions — every action ID matches a
  binding here; `pinnedMessageId` covers the pin control.
- Sibling `data-contracts.md` § Runtime State Selectors — same
  seven bindings (six selectors + `pinnedMessageId`).
- Sibling `architecture.md` § State Inputs — aligned, including
  `moddedIndicator`.
- `mockup.html` — `MapViewport`, `RightCommandPanel`,
  `ResourceDateBar`, status strip, and drawer modal all present;
  CLEAR/CLOSE buttons match the actions table.
- `pack-trust.md` § 6 — selector path and enum values correct.
- `animation-contract.md` — referenced for reduced-motion fallback.

## ⚠ Issues
- None.
