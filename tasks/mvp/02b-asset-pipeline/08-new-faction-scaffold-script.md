# New Faction Scaffold Script

Module: [Asset Pipeline & Content Pack Architecture (M0/M1)](../02b-asset-pipeline.md)

Description:
A CLI script that generates the full skeleton for a new faction pack — all required JSON stubs and empty asset placeholders. Running it saves ~2 hours of manual file creation per faction.

Read First:
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)

Inputs:
- Faction ID and name as CLI arguments

Outputs:
- `scripts/scaffold-faction.ts`
- Usage: `npm run scaffold-faction -- --id undead-pirates --name "Undead Pirates"`
- Generates:
  - `resources/packs/undead-pirates/manifest.json` (pre-filled)
  - `resources/packs/undead-pirates/faction.json` (stub with 14 unit ID placeholders)
  - `resources/packs/undead-pirates/units/unit-1-base.json` × 7 (pre-filled with default tier stats)
  - `resources/packs/undead-pirates/units/unit-1-upgrade.json` × 7
  - `resources/packs/undead-pirates/heroes/hero-1.json` × 3 (stubs)
  - `resources/packs/undead-pirates/buildings/` — all standard building stubs
  - `resources/packs/undead-pirates/animations/` — 70 `.anim.json` stubs (5 × 14 units)
  - `resources/packs/undead-pirates/sounds/sounds.json` — empty event map
  - `resources/packs/undead-pirates/assets/` — folder structure with `PLACEHOLDER.md` in each

Owned Paths:
- `scripts/scaffold-faction.ts`
- `resources/packs/undead-pirates/manifest.json`
- `resources/packs/undead-pirates/faction.json`
- `resources/packs/undead-pirates/units/unit-1-base.json`
- `resources/packs/undead-pirates/units/unit-1-upgrade.json`
- `resources/packs/undead-pirates/heroes/hero-1.json`
- `resources/packs/undead-pirates/buildings/`
- `resources/packs/undead-pirates/animations/`
- `resources/packs/undead-pirates/sounds/sounds.json`
- `resources/packs/undead-pirates/assets/`
- `resources/packs/undead-pirates/assets/PLACEHOLDER.md`

Dependencies:
- mvp.02b-asset-pipeline.01-manifest-format-plus-pack-registry
- mvp.02b-asset-pipeline.02-animation-definition-json-format
- mvp.02b-asset-pipeline.03-sound-manifest-format

Acceptance Criteria:
- Running the script produces a pack that passes `validatePackAssets` with only warnings (no errors) — all required JSONs exist, asset files are missing (expected at this stage)
- Generated faction loads in the game without crashing (renders placeholder sprites)
- Script idempotent: running twice doesn't overwrite existing files
- Generated `assets/index.json` includes a deterministic `sha256`
  placeholder for every stub asset; running
  `npm run generate:asset-index` after authors add real files rewrites
  the placeholder with the on-disk digest. Per-asset integrity rules
  in [`content-system-policy.md` § 4](../../../docs/architecture/content-system-policy.md#4-asset-integrity).

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
