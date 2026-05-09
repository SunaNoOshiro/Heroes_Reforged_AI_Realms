# Hot-Reload Flow (Dev)

> Sister docs:
> [`pack-resolver.md`](./pack-resolver.md),
> [`pack-lifecycle.md`](./pack-lifecycle.md),
> [`asset-path-resolution.md`](./asset-path-resolution.md).

This file documents the **exact** order of re-validation steps the dev
hot-reload runs when a pack file changes on disk. It exists because
the order matters: revalidating the manifest after the registry rebuilds,
or skipping schema-validation after an asset-index change, leaves the
runtime in a state the multi-engine harness will catch but the dev
loop will not.

Hot-reload is **dev-only**. Production builds embed a frozen content
snapshot built by [`atlas-pipeline.md`](./atlas-pipeline.md) and never
re-validate at runtime.

---

## 1. Trigger sources

The dev runner watches:

- `resources/packs/**/manifest.json`
- `resources/packs/**/*.json` (record files)
- `resources/packs/**/assets/index.json`
- `resources/packs/**/assets/**/*.{png,webp,ogg,mp3,…}`

Any change in these paths fires the hot-reload pipeline below. The
pipeline runs once per debounced batch (default 100 ms).

---

## 2. Re-validation order

The order is canonical. A step's prerequisite is the previous step's
success.

```
1. manifest reload
   └─ parse + validate per content-schema/schemas/manifest.schema.json
   └─ refuse load on PACK_MANIFEST_* error

2. asset-index reload
   └─ parse + validate per content-schema/schemas/asset-index.schema.json
   └─ recompute asset hashes for any changed file
   └─ refuse load on PACK_ASSET_* error

3. schema-validate records
   └─ per-record validation against the schema implied by file suffix
      (.unit.json → unit.schema.json, etc.)
   └─ refuse load on VALIDATION_* error

4. registry rebuild
   └─ src/content-runtime/ rebuilds the in-memory registry
      from the now-validated manifest, asset index, and records
   └─ recomputes contentHash; if changed, the engine sees a new pack id

5. engine reload
   └─ if the pack is loaded into a live engine, the engine
      consumes the new registry handle through the contract surface
      (src/contracts/pack-registry.ts)
   └─ in-flight commands are drained against the OLD registry
      before the NEW registry takes over (one full reducer tick of
      quiesce time)
   └─ replay log re-pins to the new contentHash; saves taken before
      the reload remain compatible iff the new pack matches the
      version-policy matrix
```

If any step fails, the runtime keeps the **previous** registry, surfaces
the error per [`error-taxonomy.md`](./error-taxonomy.md), and emits an
`info`-level log when the developer fixes the file and the next batch
succeeds.

---

## 3. Why each step is mandatory

- **manifest reload first** — the manifest names the records and the
  asset index; without a valid manifest, later steps cannot know which
  files to look at.
- **asset-index reload before record reload** — record files reference
  asset IDs through the registry; the registry needs the asset-index
  hashes to resolve them.
- **schema-validate before registry rebuild** — a record that fails
  schema validation must never enter the registry; otherwise the
  engine reads an invalid record and either crashes or silently
  diverges.
- **registry rebuild before engine reload** — the engine consumes
  the registry through its contract; reloading the engine before the
  registry is ready means the engine sees a stale handle.
- **engine reload last** — reloading the engine recomputes
  `contentHash` and may invalidate replays in flight; this happens
  after every other check has passed, so a reload-and-rollback never
  occurs.

---

## 4. NFR target

This flow is gated by NFR-START-04 in
[`non-functional-requirements.md`](./non-functional-requirements.md):

> Pack hot-reload settle time ≤ 500 ms in dev; ≤ 1 s with a large
> pack (≥ 100 records).

Settle time is measured from the file-system event firing through
the engine's first dispatched tick on the new registry.

---

## 5. Verified by

- The hot-reload pipeline is exercised by
  [`tasks/mvp/02b-asset-pipeline`](../../tasks/mvp/02b-asset-pipeline.md)
  integration tests.
- Per-frame budget regressions during hot-reload are caught by the
  bench harness (`mvp.00-perf.02-bench-baseline-and-ci-gate`).
- This file is grep-checked for placeholder markers by
  [`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs).
