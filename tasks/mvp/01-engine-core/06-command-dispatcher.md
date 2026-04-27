# Command dispatcher

Status: planned

Module: [Engine Core (M0)](../01-engine-core.md)

Description:
The command dispatcher is the only path through which sim state is mutated. It:
1. Receives a typed `Command` (discriminated union)
2. Validates it against current state (returns `ValidationError` if invalid)
3. Applies it via the matching reducer
4. Emits typed `Event` objects to a subscriber list
5. Appends the command to the command log

No code outside the dispatcher may call state mutators directly.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)

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
- State object is never mutated in place (referential equality check in tests)
- 100% TypeScript coverage (no `any`, no `as unknown`)
- Command discriminants match `content-schema/schemas/command.schema.json`
- `npm run validate:commands` passes so screen interaction tokens are
  schema-backed, aliased, UI-local, or explicitly out of scope

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
