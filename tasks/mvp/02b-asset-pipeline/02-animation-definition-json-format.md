# Animation Definition JSON Format

Module: [Asset Pipeline & Content Pack Architecture (M0/M1)](../02b-asset-pipeline.md)

Description:
Define the `.anim.json` format that describes every animation a unit can play. The renderer reads this file to know which sprite sheet frames to show and in what order.

Read First:
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)

Inputs:
- Sprite sheet layout conventions

Outputs:
- `src/content-schema/animation.ts` — `AnimationSchema` (Zod)

Owned Paths (shared):
- `src/content-schema/animation.ts` (no exclusive output — this task contributes the Zod schema to the shared content-schema module owned by the schema-pipeline tasks)

Format:
```json
{
  "id": "pikeman-attack",
  "spriteSheet": "sprites/pikeman.png",
  "frameWidth": 64,
  "frameHeight": 64,
  "sequences": {
    "idle":   { "frames": [0,1,2,3],       "fps": 4,  "loop": true  },
    "walk":   { "frames": [4,5,6,7,8,9],   "fps": 8,  "loop": true  },
    "attack": { "frames": [10,11,12,13,14], "fps": 12, "loop": false },
    "hit":    { "frames": [15,16],          "fps": 10, "loop": false },
    "death":  { "frames": [17,18,19,20,21], "fps": 8,  "loop": false },
    "defend": { "frames": [22,23],          "fps": 4,  "loop": true  }
  },
  "hitFrame": 12,        ← frame index when damage actually lands (for sync with sounds)
  "anchor": { "x": 0.5, "y": 0.9 },   ← sprite origin relative to hex center
  "facingRight": true    ← base facing direction; renderer mirrors for left-facing
}
```

Required sequences for every unit: `idle`, `walk`, `attack`, `hit`, `death`
Optional: `defend`, `special` (for unique ability animations)

Dependencies:
- mvp.02b-asset-pipeline.01-manifest-format-plus-pack-registry

Acceptance Criteria:
- `AnimationSchema` validates a correct `.anim.json` without errors
- Missing required sequence (`idle`) → validation error
- `hitFrame` must be within the `attack.frames` range → validated
- Hero adventure-map animations only need: `idle`, `walk`
- Shared path work is additive only: add animation validation rules
  without rewriting the primary content-schema runtime contract owned by
  `mvp.02-content-schemas.09-animation-vfx-sound-townpresentation-schemas`

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
