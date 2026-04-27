# Sound Manifest Format

Status: planned

Module: [Asset Pipeline & Content Pack Architecture (M0/M1)](../02b-asset-pipeline.md)

Description:
Define the `sounds.json` format that maps game event IDs to audio filenames within the pack.

Read First:
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)

Inputs:
- Game event types from `src/engine`

Outputs:
- `src/content-schema/sounds.ts` — `SoundManifestSchema` (Zod)

Owned Paths (shared):
- `src/content-schema/sounds.ts` (no exclusive output — this task contributes the Zod schema to the shared content-schema module owned by the schema-pipeline tasks)

Format:
```json
{
  "packId": "emberwild-faction",
  "events": {
    "unit.ash-hound.attack":    "ash-hound-attack.ogg",
    "unit.ash-hound.death":     "ash-hound-death.ogg",
    "unit.ash-hound.hit":       "ash-hound-hit.ogg",
    "unit.ember-archer.attack": "ember-archer-attack.ogg",
    "unit.ember-archer.death":  "ember-archer-death.ogg",
    "town.emberwild.theme":     "town-theme.ogg",
    "town.emberwild.build":     "construction.ogg",
    "hero.emberwild.move":      "horse-walk.ogg"
  },
  "fallbacks": {
    "unit.*.attack": "shared/generic-attack.ogg",
    "unit.*.death":  "shared/generic-death.ogg"
  }
}
```

Sound event naming convention: `domain.subject.action`
Fallback: if a specific sound is missing, `*` wildcards provide a fallback from the shared pack.

Dependencies:
- mvp.02b-asset-pipeline.01-manifest-format-plus-pack-registry

Acceptance Criteria:
- Sound for `unit.ash-hound.attack` plays when the Ash Hound attacks
- Missing sound with matching wildcard fallback → fallback plays (no error)
- Missing sound with no fallback → silent (warning logged, no crash)
- All audio files referenced in manifest are validated to exist in the pack
- Shared path work is additive only: add sound-manifest validation rules
  without rewriting the primary content-schema runtime contract owned by
  `mvp.02-content-schemas.09-animation-vfx-sound-townpresentation-schemas`

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
