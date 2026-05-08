# Content-Loader Performance Profiling

Module: [Polish (M7)](../04-polish.md)

Description:
Profile content validation, manifest loading, pack dependency
resolution, override application, and mod-pack install paths after the
content schemas, asset pipeline, and mod system are implemented.

Read First:
- [`docs/architecture/overview.md`](../../../docs/architecture/overview.md)
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)

Inputs:
- Content schema validators
- Asset pipeline and pack manifest loading
- Phase-2 mod-system pack install and sandbox flow

Outputs:
- Content-loader performance report appended to `docs/planning/perf-baseline.md`
- Fixes for the top content-loading bottleneck found by profiling
- Before/after load-time, validation-time, and content-hash timings

Owned Paths (shared):
- `src/content-runtime/` (no exclusive output — additive profiling-driven tweaks only; runtime contracts owned by `mvp.02-content-schemas.*` and `mvp.02b-asset-pipeline.*`)
- `src/content-schema/` (additive only; schema contracts owned by `mvp.02-content-schemas.*`)
- `resources/packs/` (asset/manifest tuning only; pack contracts owned by `mvp.02b-asset-pipeline.*` and `phase-2.05-mod-system.*`)
- `docs/planning/perf-baseline.md` (append-only profiling log shared with the other 05* profiling tasks)

Dependencies:
- module:mvp.02-content-schemas
- module:mvp.02b-asset-pipeline
- module:phase-2.05-mod-system

Acceptance Criteria:
- Profiles cold pack load, content hash calculation, dependency
  resolution, override application, and zip/mod import with
  representative first-party and generated pack fixtures
- Fix is additive to schema/runtime contracts and must not rewrite
  contracts owned by the primary owner tasks for content schemas, asset
  pipeline, or mod system
- Missing gameplay requirements still fail loudly; only missing
  presentation assets may fall back through resolvers
- Stable IDs and content hashes are unchanged by caching or batching
  improvements
- Before/after load-time, validation-time, and hash timings are recorded
  in `docs/planning/perf-baseline.md`

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
