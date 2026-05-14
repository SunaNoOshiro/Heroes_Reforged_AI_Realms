# Screen 19 Architecture: Status Bar

System: adventure
Screen ID: status-bar
Visual Archetype: curated-status-bar
Curation Status: curated-pass-3

## Purpose
Adventure status line plus expandable message-history drawer.
Surfaces hover descriptions, command results, resource deltas, and
disabled reasons. Pure presentation — never dispatches reducer
commands.

## Visual Direction
Original internal UI contract. Do not use third-party captures or
external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["AdventureStatusBar"]
  Root --> Ticker["MessageTicker"]
  Root --> Drawer["MessageHistoryDrawer"]
  Root --> Pinned["PinnedMessage"]
  Root --> Deltas["ResourceDeltaBadges"]
```

## Data Resolution
```mermaid
flowchart LR
  Hover["state.ui.adventure.hoverContext"] --> Format
  Latest["state.ui.messages.latest"] --> Format["MessageFormatter (localized)"]
  History["state.ui.messages.history"] --> Drawer
  Deltas["selectors.economy.lastVisibleDeltas"] --> Badges
  Format --> Ticker["MessageTicker"]
  Drawer["MessageHistoryDrawer"] --> View
  Badges["ResourceDeltaBadges"] --> View
  Modded["selectors.session.moddedIndicator"] --> View["StatusBar render"]
```

## Interaction Flow
```mermaid
flowchart TD
  Input["Hover / reducer result / locale change"] --> Format["Format localized message"]
  Format --> Append["Append to state.ui.messages.*"]
  Append --> Render["Ticker + drawer re-render"]
  Click["Drawer / pin / clear / collapse click"] --> Local["Toggle state.ui.statusBar.* (local-ui)"]
  Local --> Render
```

## Animation Sequence
All four actions are local-ui — no reducer involvement.

```mermaid
sequenceDiagram
  participant Reducer
  participant UIState as state.ui.messages
  participant Ticker
  participant Drawer
  participant User
  Reducer-->>UIState: command result / event
  UIState->>Ticker: latest message
  Ticker->>Ticker: Slide-in (VFX)
  User->>Drawer: click expand
  Drawer->>Drawer: Fold open (VFX)
  User->>Drawer: pin / clear / collapse
  Drawer->>UIState: mutate state.ui.statusBar.* only
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Status Bar"] --> Current
```
No navigation. All actions stay on the current screen.

## State Inputs
| Binding | Source |
| --- | --- |
| `hoverContext` | `state.ui.adventure.hoverContext` |
| `latestMessage` | `state.ui.messages.latest` |
| `messageHistory` | `state.ui.messages.history` |
| `resourceDeltas` | `selectors.economy.lastVisibleDeltas` |
| `drawerOpen` | `state.ui.statusBar.drawerOpen` |
| `moddedIndicator` | `selectors.session.moddedIndicator` |

## Implementation Contract
- `mockup.html` defines visual regions and data hooks only.
- `spec.md` defines component tree and state bindings.
- `interactions.md` owns per-control behavior, animation, disabled
  reasons, and error surfacing.
- `data-contracts.md` lists schemas, config, localization, asset,
  audio, VFX, save, and replay references.
- Diagrams here summarize the same contract — they must not invent
  hidden behavior.

## 🔍 Sync Check
- Sibling `spec.md` § Component Tree — aligned (4 children of
  `AdventureStatusBar`).
- Sibling `spec.md` § State Bindings — aligned, includes
  `moddedIndicator`.
- Sibling `interactions.md` § Actions — aligned; all four tokens
  remain local-ui (no reducer routing).
- Sibling `data-contracts.md` § Runtime State Selectors — aligned
  (same six bindings).
- `mockup.html` data-action attributes (`status.clear`,
  `status.collapse`) — present; drawer-expanded form is visible.
- `screen-command-coverage.json` — `EXPAND_/PIN_/CLEAR_/COLLAPSE_`
  prefixes all in `localUiPrefixes`, no schema entry required.
- `pack-trust.md` § 6 Modded Indicator — selector path matches.

## ⚠ Issues
- None blocking. The animation diagram now correctly omits Reducer
  routing for the user-initiated branches; reducer involvement is
  inbound-only (command result → `state.ui.messages.latest`),
  matching the local-ui nature of every listed action.
