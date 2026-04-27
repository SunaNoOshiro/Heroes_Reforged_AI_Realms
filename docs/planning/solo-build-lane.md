# Solo Build Lane

Default execution path for one developer using AI assistance.

This is the smallest sensible route from today's design-first repo to a
first playable build without dragging late-phase complexity forward.

## Principles

- finish deterministic foundations before gameplay features
- prove one end-to-end slice before expanding content volume
- defer presentation polish until the loop is already playable
- keep task picks inside the existing module order whenever possible
- prefer "playable with placeholder visuals" over "beautiful but not
  interactive"

## Lane 1: Foundation

Do these modules in full before moving on:

1. [`tasks/mvp/01-engine-core.md`](../../tasks/mvp/01-engine-core.md)
2. [`tasks/mvp/02-content-schemas.md`](../../tasks/mvp/02-content-schemas.md)
3. [`tasks/mvp/02b-asset-pipeline.md`](../../tasks/mvp/02b-asset-pipeline.md)

Outcome:

- deterministic state + replay foundation exists
- schemas, examples, validators, and migrations are wired
- packs and assets can be described through IDs and manifests

## Lane 2: First Playable Adventure Slice

Build the smallest loop that lets a human start a scenario, move a
hero, capture economy objects, and finish turns:

1. [`tasks/mvp/04-faction-emberwild.md`](../../tasks/mvp/04-faction-emberwild.md)
2. [`tasks/mvp/03-map-system.md`](../../tasks/mvp/03-map-system.md)
3. [`tasks/mvp/05-adventure-map.md`](../../tasks/mvp/05-adventure-map.md)
4. [`tasks/mvp/06-renderer.md`](../../tasks/mvp/06-renderer.md)
   Stop after the plain WebGL2/read-only rendering tasks if needed.
5. [`tasks/mvp/07-ui-shell.md`](../../tasks/mvp/07-ui-shell.md)

Outcome:

- one faction pack loads end-to-end
- adventure map state is visible and interactive
- auto-resolve can stand in for tactical combat temporarily

## Lane 3: Persistence And Scenarios

Next, make the slice restartable and reproducible:

1. [`tasks/mvp/08-persistence.md`](../../tasks/mvp/08-persistence.md)

Outcome:

- scenario bootstrap exists
- log-only saves and replayable restores exist
- internal smoke tests can run from fixed scenario seeds

## Lane 4: Combat Replacement

Once the adventure slice is stable, replace proxy combat with the real
battle layer:

1. [`tasks/mvp/09-tactical-combat.md`](../../tasks/mvp/09-tactical-combat.md)
2. [`tasks/mvp/10-heuristic-ai.md`](../../tasks/mvp/10-heuristic-ai.md)

Outcome:

- tactical combat replaces auto-resolve for real battles
- AI can play inside the proven battle/adventure rules

## Explicit Defers

Delay these until the first playable loop is already working:

- all of `phase-2/` — includes
  [`tasks/phase-2/06-visual-fidelity.md`](../../tasks/phase-2/06-visual-fidelity.md)
  (moved from `mvp/06b-visual-fidelity` on 2026-04-22, audit I5)
- all of `phase-3/`

The only reason to pull them earlier is if a current task explicitly
depends on them.

## Exit Gates

- Internal playable:
  engine + schemas + Emberwild + map + adventure loop + plain renderer
  + UI + scenarios
- Strict `M1`:
  internal playable plus stable persistence and at least baseline AI
- Strict `M2`:
  tactical combat replaces auto-resolve for normal battles

## Working Rule

If two candidate tasks are both valid, choose the one that reduces the
number of mocked or placeholder systems in the current playable slice.
