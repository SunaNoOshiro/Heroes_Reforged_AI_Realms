# Module: Asset Pipeline & Content Pack Architecture (M0/M1)

Everything a faction or world needs to be fully playable — JSON data,
sprites, animations, sounds, UI art, town screens, terrain art, biome
definitions — lives in self-contained packs. The engine never hardcodes
asset paths. Adding a new race or world should mean adding a pack, not
editing engine code.

**Milestone**: M0/M1 (architecture defined before any faction content is authored)
**Total Estimate**: ~28 hours
**Exit Criteria**: A new faction can be added by creating one folder
with no engine code changes. A faction can be removed with no engine
errors.

---

## Self-Contained Brief

- **Purpose**: Pack manifest, dependency resolution, asset index,
  and atlas pipeline. The single boundary that turns "files on
  disk" into "logical IDs the engine can resolve".
- **Public surface**: [`src/contracts/pack-registry.ts`](../../src/contracts/pack-registry.ts),
  [`src/contracts/asset-loader.ts`](../../src/contracts/asset-loader.ts).
- **Side effects**: row "src/content-runtime/" in
  [`docs/architecture/side-effect-matrix.md`](../../docs/architecture/side-effect-matrix.md).
  Hot-reload procedure pinned in
  [`docs/architecture/hot-reload-flow.md`](../../docs/architecture/hot-reload-flow.md);
  no-raw-paths rule in
  [`docs/architecture/asset-path-resolution.md`](../../docs/architecture/asset-path-resolution.md).
- **NFR**: NFR-PERF-05, NFR-START-04 in
  [`docs/architecture/non-functional-requirements.md`](../../docs/architecture/non-functional-requirements.md).
- **Exit criteria**: see header.

---

## Platform Pack Layers

The runtime supports multiple pack kinds, not only faction packs. The
`kind` field in the manifest selects which record types are allowed:

- `ruleset-pack` — formulas and constants
- `library-pack` — shared abilities, spells, artifacts, terrain, and
  map objects
- `faction-pack` — towns, units, heroes, buildings, and faction theme
  assets
- `world-pack` — biomes, terrain palettes, ambient audio, and
  generator presets
- `scenario-pack` — authored maps, objectives, and pinned dependency
  versions
- `asset-pack` — pure image, audio, animation, or UI bundles

Hard rule: gameplay records reference logical asset IDs. Raw file paths
belong in `assets/index.json` (or equivalent asset manifests), not
sprinkled through unit/building/spell JSON.

## Canonical Folder Structure

The canonical pack layout, manifest rules, and archive rules live in
[`docs/architecture/pack-contract.md`](../../docs/architecture/pack-contract.md).
The canonical reference pack is
[`content-schema/examples/packs/emberwild-faction/`](../../content-schema/examples/packs/emberwild-faction/).

Do not duplicate the layout tree here. If you need to revise it, revise
the pack contract and let this module inherit.

---

## Task Files

- [01-manifest-format-plus-pack-registry.md](02b-asset-pipeline/01-manifest-format-plus-pack-registry.md)
  🤖 Task 1: Manifest format + pack registry (~3h)
- [02-animation-definition-json-format.md](02b-asset-pipeline/02-animation-definition-json-format.md)
  🤖 Task 2: Animation definition JSON format (~3h)
- [03-sound-manifest-format.md](02b-asset-pipeline/03-sound-manifest-format.md)
  🤖 Task 3: Sound manifest format (~2h)
- [04-asset-registry-id-based-resolution-no-hardcoded-paths.md](02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md)
  🧠⚠️ Task 4: Asset registry — ID-based resolution, no hardcoded paths (~4h)
- [05-async-asset-loader-with-caching.md](02b-asset-pipeline/05-async-asset-loader-with-caching.md)
  🤖 Task 5: Async asset loader with caching (~4h)
- [06-pack-completeness-validator-all-required-assets-present.md](02b-asset-pipeline/06-pack-completeness-validator-all-required-assets-present.md)
  🧠 Task 6: Pack completeness validator — all required assets present (~3h)
- [07-dev-hot-reload-watch-folder-reload-without-restart.md](02b-asset-pipeline/07-dev-hot-reload-watch-folder-reload-without-restart.md)
  🤖 Task 7: Dev hot-reload — watch folder, reload without restart (~3h)
- [08-new-faction-scaffold-script.md](02b-asset-pipeline/08-new-faction-scaffold-script.md)
  🤖 Task 8: New faction scaffold script (~2h)
- [09-adding-a-faction-guide-faction-guide-md.md](02b-asset-pipeline/09-adding-a-faction-guide-faction-guide-md.md)
  🤖 Task 9: Adding-a-faction guide (FACTION_GUIDE.md) (~2h)
- [10-migrate-emberwild-pack-to-this-structure.md](02b-asset-pipeline/10-migrate-emberwild-pack-to-this-structure.md)
  🤖 Task 10: Migrate Emberwild pack to canonical structure (~2h)
- [11-content-system-policy-doc.md](02b-asset-pipeline/11-content-system-policy-doc.md)
  🤖 Task 11: Content-system policy doc (~2h)
- [12-pack-resolver-algorithm.md](02b-asset-pipeline/12-pack-resolver-algorithm.md)
  🧠 Task 12: Pack resolver algorithm (~5h)
- [13-per-asset-integrity-and-build-script.md](02b-asset-pipeline/13-per-asset-integrity-and-build-script.md)
  🧠 Task 13: Per-asset integrity + build-asset-index script (~4h)
- [14-per-pack-localization-and-merge.md](02b-asset-pipeline/14-per-pack-localization-and-merge.md)
  🤖 Task 14: Per-pack localization layout + merge (~3h)
- [15-balance-corridor-validator.md](02b-asset-pipeline/15-balance-corridor-validator.md)
  🧠 Task 15: Balance-corridor validator (~4h)
- [16-pack-error-code-catalog.md](02b-asset-pipeline/16-pack-error-code-catalog.md)
  🤖 Task 16: Pack error-code catalog + lint (~3h)
