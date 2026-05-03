# Line of Sight (Tactical Combat)

The deterministic algorithm that decides whether a ranged
shooter→target line is blocked by an obstacle hex (wall, fortification
hex, generic battlefield obstacle, friendly stack — see §4).

## 1. Algorithm: cube interpolation

The line is computed via integer-only **cube-coordinate
interpolation**:

```
N = hexDistance(src, dst)              // integer
for t in 0..N:
    cube_t = lerpCube(srcCube, dstCube, t / N)
    hex_t  = roundCube(cube_t)
    test hex_t for blockers
```

`lerpCube` is implemented over rational numerators/denominators (no
floats) so the line is byte-equal across engines:

```
lerpCube(a, b, num, den) =
    {
      x: (a.x*(den-num) + b.x*num) / den,   // exact, integer divide
      y: (a.y*(den-num) + b.y*num) / den,
      z: (a.z*(den-num) + b.z*num) / den
    }
```

`roundCube` is the standard cube-rounding operation: round each
component to the nearest integer, then re-balance by zeroing whichever
component changed the most so the cube-coord constraint
(`x + y + z == 0`) is preserved.

## 2. Edge tie-rule

When the rational interpolation lands exactly on a cube edge midway
between two hexes, the rounding rule above resolves it; the
deterministic preference is **prefer the hex with lower `q`, then
lower `r`** (axial ordering). This is the same tie-break used by the
adventure pathfinder (see
[`tasks/mvp/05-adventure-map/03-hero-movement.md`](../../tasks/mvp/05-adventure-map/03-hero-movement.md#L112)).

## 3. Blocker membership

For each interpolated hex, the runtime asks the battlefield:

- **wall segment** with `hp > 0` → blocks
- **destroyed wall segment** (`hp == 0`) → does not block
- **gate** (`open == false`) → blocks; opened gate → not block
- **generic obstacle hex** (terrain flag `los: blocking`) → blocks
- **moat hex** → does not block (just damage on entry)
- **friendly / enemy stack** → see §4

The very first hex (the shooter's own hex) and the very last hex (the
target's hex) are never tested for self-occlusion; only the interior
points block.

## 4. Stack occlusion

Default policy: **stacks do NOT occlude shots passing through their
hex.** This keeps line-of-sight purely a function of the static
battlefield geometry and prevents emergent griefing where allied
units accidentally block your own shots.

This default may be overridden per stack via the ability flag
`occludes_los: boolean` (e.g. an immobile fortified unit). Flying
stacks default to `occludes_los: false` regardless — they are
considered to be at altitude.

## 5. Termination

If the algorithm encounters a blocker before reaching the target hex,
the shot is blocked and the ranged attack returns `BLOCKED`. The
caller must surface this through the `BATTLE_ATTACK` validator (no
silent miss).

## 6. Implementation contract

- All math is integer.
- Output is a `boolean` (clear / blocked) plus, on `blocked`, the
  coordinate of the first blocker (for animation cues).
- The function is pure: same `(field, src, dst)` → same output.
- The runtime function lives in `src/engine/line-of-sight.ts`,
  exported as
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

Algorithm test integration lives with
[`tasks/mvp/09-tactical-combat/04-ranged-attack-obstacle-check-range-limit.md`](../../tasks/mvp/09-tactical-combat/04-ranged-attack-obstacle-check-range-limit.md).
The tactical pathfinder
([`04a-tactical-pathfinder.md`](../../tasks/mvp/09-tactical-combat/04a-tactical-pathfinder.md))
also consumes `castLineOfSight` for the wall-segment / flying check.
