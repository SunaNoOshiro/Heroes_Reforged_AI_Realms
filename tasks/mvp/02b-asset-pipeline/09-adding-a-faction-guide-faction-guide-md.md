# Adding-a-Faction Guide (FACTION_GUIDE.md)

Status: planned

Module: [Asset Pipeline & Content Pack Architecture (M0/M1)](../02b-asset-pipeline.md)

Description:
A step-by-step human-readable guide for adding a complete new faction.
Should be clear enough for someone unfamiliar with the codebase to
follow it end-to-end.

Read First:
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)

Inputs:
- All tasks in this module
- Canonical reference pack
  `content-schema/examples/packs/emberwild-faction/`

Outputs:
- `FACTION_GUIDE.md` at repo root

Owned Paths:
- `FACTION_GUIDE.md`

Sections:
1. **Quick start** — run the scaffold script, what you get
2. **Step 1: Define units** — fill in the `units/*.unit.json` files
   (stats as integers, abilities, asset IDs — not raw paths)
3. **Step 2: Define buildings** — fill in the building tree, set
   integer costs and effect-registry effects
4. **Step 3: Define heroes** — 3 minimum, class + starting skills +
   specialty using the typed `kind` discriminator
5. **Step 4: Prepare sprites** — sprite sheet format, recommended
   resolution (64×64 per frame)
6. **Step 5: Write animations** — `.anim.json` for each unit, all 5
   required sequences
7. **Step 6: Add sounds** — fill in `sounds.json`, add `.ogg` files
8. **Step 7: Town screen art** — `town-screen-bg.png` dimensions and
   layering guide
9. **Step 8: Validate** — run `npm run validate-pack -- --id my-faction`
10. **Step 9: Balance check** — run headless games against Emberwild
    (the reference faction); target is a Wilson 95 % lower bound ≥ 35 %
    and upper bound ≤ 65 % over 1 000 battles
11. **Step 10: Package as mod** — zip as `.hrmod` and sign, install via
    the mod manager

Dependencies:
- mvp.02b-asset-pipeline.01-manifest-format-plus-pack-registry
- mvp.02b-asset-pipeline.02-animation-definition-json-format
- mvp.02b-asset-pipeline.03-sound-manifest-format
- mvp.02b-asset-pipeline.04-asset-registry-id-based-resolution-no-hardcoded-paths
- mvp.02b-asset-pipeline.05-async-asset-loader-with-caching
- mvp.02b-asset-pipeline.06-pack-completeness-validator-all-required-assets-present
- mvp.02b-asset-pipeline.07-dev-hot-reload-watch-folder-reload-without-restart
- mvp.02b-asset-pipeline.08-new-faction-scaffold-script

Acceptance Criteria:
- A developer following the guide can add a new faction without asking
  questions
- Guide references exact file paths and script commands
- Includes a "Minimum viable faction" shortcut: only required fields,
  placeholder art allowed

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
