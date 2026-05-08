# AI Player View Projection — `aiPlayerView`

Module: [Heuristic AI (M2)](../10-heuristic-ai.md)

Description:
Implement the per-player projection that the AI worker consumes
in place of raw `AdventureState`. By default the AI sees what the
player sees: fog-of-war is enforced, opponent hero internals
(inventory, spell book, planned path) are stripped, and hidden
map objects do not appear. Higher cheat tiers are an explicit
opt-in via the `cheats` parameter.

Locks the worker input contract for
[`06-run-ai-in-web-worker.md`](./06-run-ai-in-web-worker.md) — the
worker boundary calls `aiPlayerView(state, playerId, cheats)`
before dispatching `COMPUTE_MOVE`. Without this projection, the
default M2 heuristic would silently read full-map information,
making the Knight 80 % vs random quality gate unreviewable and
breaking multiplayer parity.

Read First:
- [`docs/architecture/ai-contract.md`](../../../docs/architecture/ai-contract.md) § 1 Input View
- [`docs/architecture/state-shape.md`](../../../docs/architecture/state-shape.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- `AdventureState` from `mvp.05-adventure-map.01-strategic-game-state-model`
- Visibility / fog-of-war system from `mvp.05-adventure-map`
- `PlayerId` and per-player visibility map

Outputs:
- `src/engine/ai/aiPlayerView.ts`
- `aiPlayerView(state: AdventureState, playerId: PlayerId, cheats?: AiCheats): AdventureView`
- `AdventureView` type (closed; structurally a subset of
  `AdventureState` with private fields stripped)
- `AiCheats` type:
  ```ts
  type AiCheats = {
    seeFog?: boolean;
    resourceBonus?: number;
  };
  ```

Stripping rules (applied when the corresponding cheat is not set):

- `seeFog !== true`:
  - tiles outside the player's current visibility map are absent
  - opponent hero `inventory`, `spellBook`, `path`, equipped
    artifacts not yet revealed are absent
  - opponent town garrison composition, build queue, and gold
    reserves are absent
  - map objects on hidden tiles are absent
- Self-owned entities are unchanged.
- Public scenario metadata (`turn`, `day`, `weather`, scenario id)
  is unchanged.

Owned Paths:
- `src/engine/ai/aiPlayerView.ts`

Dependencies:
- mvp.05-adventure-map.01-strategic-game-state-model

Acceptance Criteria:
- `aiPlayerView` is a pure function: no I/O, no `Math.random()`,
  no time-of-day sampling.
- Default `cheats = {}` strips fog-hidden tiles, opponent hero
  internals, and hidden map objects.
- `cheats.seeFog === true` returns the full `AdventureState`
  shape unchanged for the projected player slot.
- The projection commutes with serialization: round-tripping
  through canonical JSON yields the same view structure.
- A projection-leak smoke test (extending
  [`tasks/mvp/05-adventure-map/08-7-day-playable-smoke-test.md`](../05-adventure-map/08-7-day-playable-smoke-test.md))
  asserts that the worker's read trace contains no `AdventureState`
  field absent from the projection (instrumented via a `Proxy` in
  test mode).
- The dispatcher remains the source of truth for command
  legality. `MOVE_HERO` / `INITIATE_BATTLE` are validated against
  full state at dispatch time, not the projected view. See
  [`docs/architecture/command-schema.md` § Validation Framework](../../../docs/architecture/command-schema.md#validation-framework).

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
