# Solo Build Lane

Smallest sensible execution path for one developer with AI assistance,
from today's design-first repo to a first playable build, without
dragging late-phase complexity forward.

Companion docs:

- [`roadmap.md`](./roadmap.md) — milestone definitions (`M0`–`M7`).
- [`deferred.md`](./deferred.md) — register cited by the Explicit
  Defers list.
- [`../../tasks/README.md`](../../tasks/README.md) — execution board
  and full task index.

## 1. Principles

- Finish deterministic foundations before gameplay features.
- Prove one end-to-end slice before expanding content volume.
- Defer presentation polish until the loop is already playable.
- Keep task picks inside the existing module order whenever
  possible.
- Prefer "playable with placeholder visuals" over "beautiful but
  not interactive".

## 2. Lane 1 — Foundation

Complete these modules in full before moving on:

1. [`tasks/mvp/01-engine-core.md`](../../tasks/mvp/01-engine-core.md)
2. [`tasks/mvp/02-content-schemas.md`](../../tasks/mvp/02-content-schemas.md)
3. [`tasks/mvp/02b-asset-pipeline.md`](../../tasks/mvp/02b-asset-pipeline.md)

Outcome:

- Deterministic state + replay foundation exists.
- Schemas, examples, validators, and migrations are wired.
- Packs and assets can be described through IDs and manifests.

## 3. Lane 2 — First Playable Adventure Slice

Build the smallest loop that lets a human start a scenario, move a
hero, capture economy objects, and finish turns:

1. [`tasks/mvp/04-faction-emberwild.md`](../../tasks/mvp/04-faction-emberwild.md)
2. [`tasks/mvp/03-map-system.md`](../../tasks/mvp/03-map-system.md)
3. [`tasks/mvp/05-adventure-map.md`](../../tasks/mvp/05-adventure-map.md)
4. [`tasks/mvp/06-renderer.md`](../../tasks/mvp/06-renderer.md) —
   stop after the plain WebGL2 / read-only rendering tasks if
   needed.
5. [`tasks/mvp/07-ui-shell.md`](../../tasks/mvp/07-ui-shell.md)

Outcome:

- One faction pack loads end-to-end.
- Adventure map state is visible and interactive.
- Auto-resolve stands in for tactical combat temporarily.

## 4. Lane 3 — Persistence And Scenarios

Make the slice restartable and reproducible:

1. [`tasks/mvp/08-persistence.md`](../../tasks/mvp/08-persistence.md)

Outcome:

- Scenario bootstrap exists.
- Log-only saves and replayable restores exist.
- Internal smoke tests run from fixed scenario seeds.

## 5. Lane 4 — Combat Replacement

Once the adventure slice is stable, replace proxy combat with the
real battle layer:

1. [`tasks/mvp/09-tactical-combat.md`](../../tasks/mvp/09-tactical-combat.md)
2. [`tasks/mvp/10-heuristic-ai.md`](../../tasks/mvp/10-heuristic-ai.md)

Outcome:

- Tactical combat replaces auto-resolve for real battles.
- AI plays inside the proven battle / adventure rules.

## 6. Explicit Defers

Delay these until the first playable loop is already working:

- all of `phase-2/` — includes
  [`tasks/phase-2/06-visual-fidelity.md`](../../tasks/phase-2/06-visual-fidelity.md)
  (moved from `mvp/06b-visual-fidelity` on 2026-04-22, audit I5).
- all of `phase-3/`.

Pull either earlier only if a current task explicitly depends on it.

## 7. Exit Gates

Milestone names map to [`roadmap.md`](./roadmap.md) § 1.

- **Internal playable** — engine + schemas + Emberwild + map +
  adventure loop + plain renderer + UI + scenarios.
- **Strict `M1`** — internal playable plus stable persistence and
  at least baseline AI.
- **Strict `M2`** — tactical combat replaces auto-resolve for
  normal battles.

## 8. Working Rule

When two candidate tasks are both valid, pick the one that reduces
the number of mocked or placeholder systems in the current playable
slice.

---

## 🔍 Sync Check

- **UI: ✔** — Planning doc; no UI surfaces are asserted, so there is no [`wiki/screens/`](../architecture/wiki/screens/) cross-check to run.
- **Schema: ✔** — No schema claims; milestone labels `M1` / `M2` are doc-only references back to [`roadmap.md`](./roadmap.md), not schema enums, so no [`schema-matrix.md`](../architecture/schema-matrix.md) row applies.
- **Tasks: ✔** — All ten linked task files resolve under [`tasks/mvp/`](../../tasks/mvp/) and [`tasks/phase-2/`](../../tasks/phase-2/). The `06-visual-fidelity` move (from `mvp/06b` to `phase-2/06`, 2026-04-22, audit I5) is consistent with [`roadmap.md`](./roadmap.md) § 4 and the original audit row in [`../archive/audit-2026-04-22-full-repo.md`](../archive/audit-2026-04-22-full-repo.md) § I5. Lane order matches [`roadmap.md`](./roadmap.md) § 3 Critical Path.

## ⚠ Issues

_None._
