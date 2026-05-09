# Screen-Router FSM + Aggregated Transition Graph

Module: [UI Shell (M1)](../07-ui-shell.md)

Description:
Land the cross-screen routing contract: a closed `ScreenRoute` enum,
the `RouterState = { active, modalStack }` shape, transition rules,
group invariants, and a generated transition graph. Today every
screen package's `interactions.md` lists a "Next Screen" column, but
no document aggregates the transitions; AI agents cannot validate
that a navigation they add is reachable or reversible from the main
menu. The generator emits
`docs/architecture/screen-transition-graph.json` and a Mermaid render
inside `ui-routing.md` so reachability is machine-checkable. The
modal stack and dismissal policy are sub-contracts of this router
and live in the same host doc; their schema and per-screen sweep are
owned by [`14-modal-stack.md`](./14-modal-stack.md).

Read First:
- [`docs/architecture/wiki/README.md`](../../../docs/architecture/wiki/README.md)
- [`docs/architecture/wiki/screens/01-main-menu/interactions.md`](../../../docs/architecture/wiki/screens/01-main-menu/interactions.md)
- [`docs/architecture/wiki/screens/07-adventure-map/interactions.md`](../../../docs/architecture/wiki/screens/07-adventure-map/interactions.md)
- [`docs/architecture/wiki/screens/24-town-screen/interactions.md`](../../../docs/architecture/wiki/screens/24-town-screen/interactions.md)
- [`docs/architecture/wiki/screens/38-combat-screen/interactions.md`](../../../docs/architecture/wiki/screens/38-combat-screen/interactions.md)
- [`docs/architecture/wiki/screens/54-system-menu/interactions.md`](../../../docs/architecture/wiki/screens/54-system-menu/interactions.md)
- [`docs/architecture/wiki/screens/60-confirmation-dialog/interactions.md`](../../../docs/architecture/wiki/screens/60-confirmation-dialog/interactions.md)
- [`docs/architecture/wiki/screens/65-map-editor/interactions.md`](../../../docs/architecture/wiki/screens/65-map-editor/interactions.md)

Inputs:
- Each screen package's `interactions.md` "Next Screen" column under
  [`docs/architecture/wiki/screens/`](../../../docs/architecture/wiki/screens/)
- [`docs/architecture/wiki/screens/index.json`](../../../docs/architecture/wiki/screens/index.json)
  for the closed `ScreenRoute` enum

Outputs:
- `docs/architecture/ui-routing.md`
- `docs/architecture/screen-transition-graph.json` (generated)
- `scripts/generate-screen-transition-graph.mjs`
- `package.json` script entry `generate:screen-transition-graph` and
  validate-time orphan / dangling-reference checks

Owned Paths:
- `docs/architecture/ui-routing.md`
- `docs/architecture/screen-transition-graph.json`
- `scripts/generate-screen-transition-graph.mjs`

Dependencies:
- None

Acceptance Criteria:
- `ScreenRoute` is a closed enum mirroring
  [`docs/architecture/wiki/screens/index.json`](../../../docs/architecture/wiki/screens/index.json).
- `scripts/generate-screen-transition-graph.mjs` parses every screen
  package's `interactions.md` "Next Screen" column and emits
  `docs/architecture/screen-transition-graph.json` plus a Mermaid
  block injected into `ui-routing.md`.
- `npm run validate` rejects: a screen package with zero inbound
  transitions (orphan, excluding `01-main-menu`); a `Next Screen`
  cell that does not resolve to an `index.json` package id; a
  transition `guard` referencing an unknown selector path.
- `package.json` includes a `generate:screen-transition-graph`
  script wired into `npm run validate`.
- The Modal Stack and Dismissal Policy sections in `ui-routing.md`
  point at [`14-modal-stack.md`](./14-modal-stack.md) for the
  schema and per-screen sweep.

Verify:
- npm run generate:screen-transition-graph
- npm run validate:contracts
- npm run validate:tasks
- npm run validate

Estimated Time:
- 6 hours
