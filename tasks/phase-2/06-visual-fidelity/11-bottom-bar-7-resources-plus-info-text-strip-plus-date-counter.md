# Bottom Bar — 7 Resources + Info Text Strip + Date Counter

Status: planned

Module: [Visual Fidelity — Overland Strategy Look & Feel (M1/M2)](../06-visual-fidelity.md)

Description:
The full-width bottom bar has three elements: the 7 resource counters (left), an info text strip (center), and the date counter (right).

Visual direction: wood/ore/mercury/sulfur/crystal/gem/gold counters, a central status message strip, and a month/week/day counter.

Read First:
- `docs/architecture/wiki/screens/07-adventure-map/spec.md`
- `docs/architecture/wiki/screens/07-adventure-map/interactions.md`
- `docs/architecture/wiki/screens/07-adventure-map/data-contracts.md`
- `docs/architecture/wiki/screens/07-adventure-map/architecture.md`
- `docs/architecture/wiki/screens/07-adventure-map/mockup.html`
- `docs/architecture/wiki/screens/19-status-bar/spec.md`
- `docs/architecture/wiki/screens/19-status-bar/interactions.md`
- `docs/architecture/wiki/screens/19-status-bar/data-contracts.md`
- `docs/architecture/wiki/screens/19-status-bar/architecture.md`
- `docs/architecture/wiki/screens/19-status-bar/mockup.html`

Inputs:
- Player resource state from Zustand
- Info message system (last hover/event message)
- Screen package `docs/architecture/wiki/screens/07-adventure-map/`
- Screen package `docs/architecture/wiki/screens/19-status-bar/`

Outputs:
- `src/ui/components/BottomBar.tsx`

Resource section (left):
- 7 resource icons in a row: 🪵 Wood, ⛏️ Ore, 🧪 Mercury, 🔥 Sulfur, 💎 Crystal, 💚 Gem, 💰 Gold
- Each: icon + numeric count, styled in the baseline overland resource-bar style
- Hover over resource icon: tooltip showing daily income (e.g., "+3/day")

Info strip (center):
- Shows context-sensitive messages:
  - Hovering a map tile: terrain name
  - Hovering a unit: unit name + stats summary
  - After an event: "Captured Gold Mine (+1000/day)"
  - Default: player name or turn status

Date counter (right):
- "Month: 1, Week: 1, Day: 1" format
- Updates daily
- Background: styled panel matching right side of bottom bar

Owned Paths:
- `src/ui/components/BottomBar.tsx`

Dependencies:
- phase-2.06-visual-fidelity.06-ornate-ui-frame-full-screen-medieval-border-chrome
- mvp.07-ui-shell.02-zustand-store
- mvp.07-ui-shell.03-hud-resource-bar-end-turn-button-mini-map-stub

Acceptance Criteria:
- All 7 resources show correct values at all times
- Info strip shows meaningful messages for all hover/event states
- Date counter updates on every `DAY_START` event
- Resource hover tooltip shows daily income correctly
- Layout, bindings, and commands match `docs/architecture/wiki/screens/07-adventure-map/mockup.html`, `docs/architecture/wiki/screens/07-adventure-map/interactions.md`, and `docs/architecture/wiki/screens/07-adventure-map/data-contracts.md`.
- Layout, bindings, and commands match `docs/architecture/wiki/screens/19-status-bar/mockup.html`, `docs/architecture/wiki/screens/19-status-bar/interactions.md`, and `docs/architecture/wiki/screens/19-status-bar/data-contracts.md`.
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
