# Command dispatcher

Module: [Engine Core (M0)](../01-engine-core.md)

Description:
The command dispatcher is the only path through which sim state is mutated. It:
1. Receives a typed `Command` (discriminated union)
2. Validates it against current state (returns `ValidationError` if invalid)
3. Applies it via the matching reducer
4. Returns typed `Event` objects in `Result.events`; events are appended to a per-dispatch in-memory event log that consumers read on their own clock. There is no subscriber list, no callback registration, and no veto. See [`event-system.md`](../../../docs/architecture/event-system.md).
5. Appends the command to the command log

No code outside the dispatcher may call state mutators directly.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- [`docs/architecture/event-system.md`](../../../docs/architecture/event-system.md)
- [`docs/architecture/event-schema.md`](../../../docs/architecture/event-schema.md)

Inputs:
- `GameState` (to be defined in `src/engine`)
- `Command` union type
- `content-schema/schemas/command.schema.json`

Outputs:
- `src/engine/dispatcher.ts`
- `dispatch(state: GameState, cmd: Command): Result<{state: GameState, events: Event[]}, ValidationError>`
- `GameState` is immutable (use `structuredClone` or Immer-style produce)
- Command log appended automatically

Owned Paths:
- `src/engine/dispatcher.ts`

Dependencies:
- mvp.01-engine-core.03-implement-pcg32-prng-with-named-sub-streams
- mvp.01-engine-core.04-implement-fixed-point-math-library

Acceptance Criteria:
- Dispatching an invalid command returns an error and does NOT mutate state
- Dispatching a valid command returns new state + event list
- Emitted `Event` objects validate against `content-schema/schemas/event.schema.json`; an event with an unknown `kind` or extra payload property is a `ValidationError` and the dispatch is rolled back
- The dispatcher does NOT retain events globally; the per-dispatch `events: Event[]` is the canonical mechanism (see [`event-system.md`](../../../docs/architecture/event-system.md))
- Sub-command chains (follow-up commands emitted by a command handler at the outer reducer level) are bounded by `MAX_COMMAND_CHAIN_DEPTH = 8` per outer command; a deeper chain raises `ValidationError` and rolls back the outer command
- State object is never mutated in place (referential equality check in tests)
- 100% TypeScript coverage (no `any`, no `as unknown`)
- Command discriminants match `content-schema/schemas/command.schema.json`
- `npm run validate:commands` passes so screen interaction tokens are
  schema-backed, aliased, UI-local, or explicitly out of scope
- **Gate 0 (current-actor) check (Q205).** A command with
  `metadata.playerId !== state.currentPlayerId` returns
  `Result.err({ code: 'NOT_CURRENT_ACTOR' })` *before* any per-command
  validator runs. Unit test: dispatch `MOVE_HERO` with `playerId=0`
  while `currentPlayerId=1` → error returned, state unchanged, no
  command appended to log. Exempt commands (none in MVP) are listed
  in [`command-schema.md` § Validation Framework](../../../docs/architecture/command-schema.md#validation-framework).
- **Validation error taxonomy (Q206).** Every rejection returns a
  structured error matching
  `content-schema/schemas/dispatcher-validation-error.schema.json`.
  Each existence-check failure returns `code: 'ENTITY_NOT_FOUND'`
  with `details.{ entityKind, id, lastKnownState? }`. The closed
  enum and per-code shape are owned by
  [`docs/architecture/command-schema.md` § ValidationError taxonomy](../../../docs/architecture/command-schema.md#validationerror-taxonomy)
  and [`docs/architecture/edge-cases-policy.md` § 11](../../../docs/architecture/edge-cases-policy.md#11-validation-error-taxonomy).
- **Single-flight gate (Q207).** Dispatching the same `END_DAY`,
  `END_BATTLE_TURN`, or `START_BATTLE` twice within one logical
  tick returns `code: 'DUPLICATE_INTENT'` on the second call;
  state unchanged. Single-flight is keyed by `(playerId, kind)`
  and resets at tick boundary. See
  [`docs/architecture/command-schema.md` § Single-flight commands](../../../docs/architecture/command-schema.md#single-flight-commands).
- **State-shape invariants (Q211).** Post-dispatch state passes
  the canonical state-shape invariant assertion (every
  `resources[k] ≥ 0`, every `unit.count ≥ 0`). A reducer producing
  a negative balance raises `InvariantViolation` in dev / clamps
  to 0 in prod and records a warn-level telemetry counter. See
  [`docs/architecture/determinism.md` § State-shape invariants](../../../docs/architecture/determinism.md#state-shape-invariants).
- **`mapVersion` and `zocVersion` invariants** (consumed by the
  pathfinder cache in
  `mvp.03-map-system.11-pathfinder-cache`):
  - Reducers for terrain-mutating commands (terraform-effect,
    bridge-built) increment `state.mapVersion` by exactly 1 per
    accepted command.
  - Reducers for hero-tile-occupancy commands (hero-move,
    hero-spawn, hero-defeat) increment `state.zocVersion` by
    exactly 1 per accepted command.
  - No-op commands (validation rejected, idempotent dedup hit)
    do NOT bump either counter.
  - The increments are deterministic on a fixture command
    sequence — verified by a unit test that asserts the exact
    `(mapVersion, zocVersion)` pair after each step.

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
