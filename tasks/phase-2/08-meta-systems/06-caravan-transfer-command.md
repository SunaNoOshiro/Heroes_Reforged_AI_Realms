# Caravan Transfer Command

Module: [Campaign, Quest, And Status Meta Systems (P2)](../08-meta-systems.md)

Description:
Implement the `DISPATCH_CARAVAN` engine command so a player can ship
an army stack from a source town to a destination town across multiple
days without an escorting hero. The caravan is a piece of strategic
state owned by the dispatching player: it consumes movement on the
adventure-map graph, can be intercepted by enemy heroes whose path
crosses its tile, and arrives at the destination town's garrison after
the deterministic travel duration elapses.

Caravans are gameplay state, not UI state — every transition is driven
by the command dispatcher and emits typed events.

Read First:
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)
- [`tasks/mvp/05-adventure-map/18-transfer-stack-commands.md`](../../mvp/05-adventure-map/18-transfer-stack-commands.md)

Inputs:
- `AdventureState` from `mvp.05-adventure-map.01-strategic-game-state-model`
- Hex pathfinder from `mvp.03-map-system.04-a-pathfinder-with-terrain-cost-plus-zoc`
- Turn-end hook from `mvp.05-adventure-map.02-turn-structure`
- `command.schema.json` extension for `DISPATCH_CARAVAN` and
  `CARAVAN_ARRIVED` / `CARAVAN_INTERCEPTED` events
- `content-schema/schemas/command.schema.json`

Outputs:
- `src/engine/commands/dispatch-caravan.ts`
- `DISPATCH_CARAVAN` command:
  `{ kind: "DISPATCH_CARAVAN", playerId, sourceTownId, destinationTownId, stack: { unitId, count } }`
- Per-tick reducer that advances active caravans during the daily turn
  step, emits `CARAVAN_INTERCEPTED` if an enemy hero stands on the
  caravan's current hex, and emits `CARAVAN_ARRIVED` plus a garrison
  merge when the caravan reaches its destination
- Schema entries in `content-schema/schemas/command.schema.json` for
  the new command and events

Owned Paths:
- `src/engine/commands/dispatch-caravan.ts`

Owned Paths (shared):
- `content-schema/schemas/command.schema.json`

Dependencies:
- mvp.01-engine-core.06-command-dispatcher
- mvp.05-adventure-map.01-strategic-game-state-model
- mvp.05-adventure-map.02-turn-structure
- mvp.05-adventure-map.05-town-visit-recruit-build-mage-guild
- mvp.03-map-system.04-a-pathfinder-with-terrain-cost-plus-zoc

Acceptance Criteria:
- Dispatching a caravan from town A to town B with a controlled stack
  removes that stack from town A's garrison atomically and registers
  an active caravan record on the player
- Caravan travel time is computed deterministically from the
  pathfinder cost, not from wall-clock time
- The caravan record advances exactly one segment per turn-end tick
  and emits `CARAVAN_ARRIVED` on the turn-end where the path is
  exhausted; the receiving town's garrison gains the stack via the
  same merge helper used by `TRANSFER_GARRISON_STACK`
- An enemy hero whose end-of-turn position equals the caravan's
  current hex triggers `CARAVAN_INTERCEPTED`, removes the caravan
  record, and routes the stack into a battle initiation against the
  intercepting hero
- Dispatching with an empty stack, with units the source town does
  not own, with a destination town the player does not own, or
  between towns with no land path returns `ValidationError` and
  leaves state unchanged
- `command.schema.json` defines the `DISPATCH_CARAVAN` payload and the
  associated events; `npm run validate:commands` passes
- Shared path work is additive only: add the caravan command variant and
  related event payloads without rewriting the primary command schema
  contract owned by `docs/architecture/command-schema.md` and
  `mvp.01-engine-core.06-command-dispatcher`

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
