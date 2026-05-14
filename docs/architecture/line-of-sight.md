# Line of Sight (Tactical Combat)

Deterministic algorithm that decides whether a ranged shooter → target
line is blocked by an obstacle hex (wall segment, gate, generic
battlefield obstacle, or — when the per-stack opt-in is set — a
friendly or enemy stack; see § 4).

Companion docs:

- [`determinism.md`](./determinism.md) — engine-wide byte-equality
  contract this algorithm implements.
- [`fail-loud.md`](./fail-loud.md) — why a blocked shot must surface
  through the validator instead of becoming a silent miss.
- [`command-schema.md` § BATTLE_ATTACK](./command-schema.md#battle_attack)
  — the dispatcher entry that consumes the `LosResult`.
- [`error-taxonomy.md`](./error-taxonomy.md) /
  [`edge-cases-policy.md`](./edge-cases-policy.md) — the
  `UNREACHABLE_TARGET` failure surface for range / LoS / pathfinder.

## 1. Algorithm: cube interpolation

The line is computed via integer-only **cube-coordinate
interpolation**:

```
N = hexDistance(src, dst)              // integer
for t in 0..N:
    cube_t = lerpCube(srcCube, dstCube, t, N)
    hex_t  = roundCube(cube_t)
    test hex_t for blockers
```

`lerpCube` runs over rational numerator / denominator pairs (no
floats) so the line is byte-equal across engines:

```
lerpCube(a, b, num, den) =
    {
      x: (a.x*(den-num) + b.x*num) / den,   // exact, integer divide
      y: (a.y*(den-num) + b.y*num) / den,
      z: (a.z*(den-num) + b.z*num) / den
    }
```

`roundCube` is the standard cube-rounding op: round each component to
the nearest integer, then re-balance by adjusting whichever component
changed the most so the cube-coord constraint (`x + y + z == 0`) is
preserved.

## 2. Edge tie-rule

When the rational interpolation lands exactly on a cube edge midway
between two hexes, the rounding above resolves it. The deterministic
preference is **prefer the hex with lower `q`, then lower `r`** —
the same axial tie-break used by the adventure pathfinder (see
[`tasks/mvp/05-adventure-map/03-hero-movement.md`](../../tasks/mvp/05-adventure-map/03-hero-movement.md#L112)).

## 3. Blocker membership

For each interpolated hex, the runtime asks the battlefield:

| Hex contents | Blocks? |
|---|---|
| Wall segment, `hp > 0` | yes |
| Wall segment, `hp == 0` (destroyed) | no |
| Gate, `open == false` | yes |
| Gate, `open == true` | no |
| Generic obstacle hex (terrain flag `los: blocking`) | yes |
| Moat hex | no (entry damage only) |
| Friendly / enemy stack | see § 4 |

The shooter's own hex (first interpolated hex) and the target's hex
(last) are never tested for self-occlusion — only interior hexes can
block.

## 4. Stack occlusion

**Default: stacks do NOT occlude shots passing through their hex.**
This keeps line-of-sight a function of static battlefield geometry
and prevents emergent griefing where allied units block your own
shots.

Per-stack overrides:

- Ability flag `occludes_los: boolean` — set `true` for an immobile
  fortified unit that should occlude.
- Flying stacks default to `occludes_los: false` regardless (treated
  as at altitude).

## 5. Termination

If the algorithm encounters a blocker before reaching the target hex,
the shot is blocked: the `LosResult` is `{ clear: false, blocker:
<hex> }`. The `BATTLE_ATTACK` validator must surface this as a
dispatcher validation error (per
[`fail-loud.md`](./fail-loud.md)) — never as a silent miss. The
canonical wire-level code for range / LoS / pathfinder failures is
`UNREACHABLE_TARGET` ([`command-schema.md` § Standard Validation
Failure Codes](./command-schema.md), [`edge-cases-policy.md`
§ Validation failures](./edge-cases-policy.md)).

## 6. Implementation contract

- All math is integer; no floats anywhere in the call chain.
- Pure function: same `(field, src, dst)` → same output.
- Output type:

  ```
  type LosResult =
    | { clear: true }
    | { clear: false; blocker: Hex }
  ```

  The `blocker` coordinate on a blocked result is for animation cues
  only; it has no gameplay effect beyond gating the shot.
- Runtime location: `src/engine/line-of-sight.ts`, exported as
  `castLineOfSight(field: BattleField, src: Hex, dst: Hex): LosResult`.

## 7. Test plan

- Adjacent shooter / target → cleared (interior set is empty).
- Diagonal line through one wall hex → blocked at the wall.
- Diagonal line touching a wall corner → preferred-axis rule must
  select deterministically; fixture stored alongside the test.
- Friendly stack between shooter and target → cleared (default
  `occludes_los: false`).
- Friendly stack with `occludes_los: true` → blocked.
- Two engines must produce byte-equal `LosResult` for every fixture.

## 8. Owning task

Algorithm + integration with the ranged validator:
[`tasks/mvp/09-tactical-combat/04-ranged-attack-obstacle-check-range-limit.md`](../../tasks/mvp/09-tactical-combat/04-ranged-attack-obstacle-check-range-limit.md).
The tactical pathfinder
([`04a-tactical-pathfinder.md`](../../tasks/mvp/09-tactical-combat/04a-tactical-pathfinder.md))
also consumes `castLineOfSight` for wall-segment / flying checks.

---

## 🔍 Sync Check

- **UI: ✔** — Doc surfaces no UI strings; the consumer surface
  (validator-failure toast) is owned by `error-ux.md` and
  `command-schema.md`, both linked above.
- **Schema: ⚠** — Doc text says the validator returns `BLOCKED`, but
  [`dispatcher-validation-error.schema.json`](../../content-schema/schemas/dispatcher-validation-error.schema.json)
  defines `UNREACHABLE_TARGET` for range / LoS failures (consistent
  with [`command-schema.md` § Standard Validation Failure
  Codes](./command-schema.md) and
  [`edge-cases-policy.md`](./edge-cases-policy.md)). Rewrote § 5 to
  call out the canonical wire code and demote `LosResult.clear =
  false` to a function-level result; the owning task still uses
  `BLOCKED` as an acceptance-criterion shorthand (see Issues).
  `occludes_los` is referenced as an ability flag but is not yet
  enumerated in any stack-ability schema.
- **Tasks: ✔** — Owning task
  [`mvp.09-tactical-combat.04`](../../tasks/mvp/09-tactical-combat/04-ranged-attack-obstacle-check-range-limit.md)
  Reads First → this doc; pathfinder
  [`mvp.09-tactical-combat.04a`](../../tasks/mvp/09-tactical-combat/04a-tactical-pathfinder.md)
  also Reads First → this doc; no orphan tasks reference the doc
  without reciprocal mention.

## ⚠ Issues

- **Validator failure code mismatch (`BLOCKED` vs
  `UNREACHABLE_TARGET`).** This doc and
  [`tasks/mvp/09-tactical-combat/04-ranged-attack-obstacle-check-range-limit.md`](../../tasks/mvp/09-tactical-combat/04-ranged-attack-obstacle-check-range-limit.md)
  (acceptance criterion: "Shot blocked by a wall hex returns
  `BLOCKED`") used `BLOCKED` as the validator-level code, but the
  canonical surfaces — [`command-schema.md` line 1053](./command-schema.md),
  [`edge-cases-policy.md` line 220](./edge-cases-policy.md), and the
  on-wire enum in
  [`dispatcher-validation-error.schema.json`](../../content-schema/schemas/dispatcher-validation-error.schema.json)
  — define `UNREACHABLE_TARGET`. Per CLAUDE.md ("Stable IDs are
  public API"), the schema is canonical. Rewrote § 5 of this doc to
  point at `UNREACHABLE_TARGET` and reserved `BLOCKED` as the
  function-level `LosResult.clear === false` shorthand. Owner of the
  follow-up: `mvp.09-tactical-combat.04` should retitle its
  acceptance criterion to "returns `UNREACHABLE_TARGET`" so the task
  contract matches the schema. Skill did not edit the task file
  (Hard Prohibition D).
- **`occludes_los` ability flag is not enumerated in any schema.**
  This doc references `occludes_los: boolean` as a stack ability flag
  (§ 4); no `content-schema/schemas/*.schema.json` defines it on a
  stack-ability or unit record, so the override is currently
  doc-only. The owning task (`mvp.09-tactical-combat.04`) consumes
  `castLineOfSight` but does not own ability-flag schemas. The
  unit / ability schemas under
  [`content-schema/schemas/`](../../content-schema/schemas/) need an
  additive entry per
  [`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md). Suggested
  location: the `abilities` array on the stack / unit schema.
  Skill did not add the field (Hard Prohibition B — never invent
  features).
- **`BattleField` runtime type not yet declared.** The function
  signature names `BattleField` as the parameter type, but the
  surrounding tasks (`04`, `04a`) use `BattleState`. The static
  geometry slice this algorithm needs is presumably a sub-record of
  `BattleState`. The owning task should either (a) introduce a
  `BattleField` view type when implementing
  `src/engine/line-of-sight.ts`, or (b) accept `BattleState` directly
  and update this doc's signature. Non-blocking until implementation
  starts.
