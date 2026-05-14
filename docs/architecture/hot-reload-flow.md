# Hot-Reload Flow (Dev)

> Sister docs:
> [`pack-resolver.md`](./pack-resolver.md),
> [`pack-lifecycle.md`](./pack-lifecycle.md),
> [`asset-path-resolution.md`](./asset-path-resolution.md).

This file pins the **exact, ordered** re-validation pipeline the dev
runner runs when a pack file changes on disk. The order is canonical
because reordering it (e.g. rebuilding the registry before schema
validation) leaves the runtime in a state the multi-engine harness
catches but the dev loop does not.

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

A change in any of these paths fires the pipeline below, debounced
into one batch per **100 ms** window.

---

## 2. Re-validation order

Each step is gated on the previous step's success. On any failure the
runtime keeps the **previous** registry, surfaces the error per
[`error-taxonomy.md`](./error-taxonomy.md) (full code catalog in
[`pack-error-codes.md`](./pack-error-codes.md)), and emits an
`info`-level log when a later batch succeeds.

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
   └─ in-flight commands drain against the OLD registry before the
      NEW registry takes over (one full reducer tick of quiesce time)
   └─ replay log re-pins to the new contentHash; saves taken before
      the reload remain compatible iff the new pack matches the
      version-policy matrix
```

---

## 3. Why the order is fixed

- **Manifest first.** The manifest names the records and the asset
  index; later steps cannot know which files to look at without it.
- **Asset index before records.** Records reference assets by
  logical ID; resolution needs the asset-index hash table.
- **Schema-validate before registry rebuild.** A record that fails
  validation must never enter the registry — otherwise the engine
  reads an invalid record and either crashes or silently diverges.
- **Registry rebuild before engine reload.** The engine consumes the
  registry through its contract; reloading earlier means the engine
  sees a stale handle.
- **Engine reload last.** This step recomputes `contentHash` and may
  invalidate replays in flight; running it after every other check
  guarantees a reload-and-rollback never occurs.

---

## 4. NFR target

Gated by NFR-START-04 in
[`non-functional-requirements.md`](./non-functional-requirements.md):

> Pack hot-reload settle time ≤ 500 ms in dev; ≤ 1 s with a large
> pack (≥ 100 records).

**Settle time** = file-system event firing → engine's first dispatched
tick on the new registry.

---

## 5. Verified by

- **Integration tests.** The pipeline is exercised by
  [`tasks/mvp/02b-asset-pipeline`](../../tasks/mvp/02b-asset-pipeline.md)
  (specifically
  [`07-dev-hot-reload-watch-folder-reload-without-restart`](../../tasks/mvp/02b-asset-pipeline/07-dev-hot-reload-watch-folder-reload-without-restart.md)).
- **Per-frame budget regressions during reload** are caught by the
  bench harness
  ([`mvp.00-perf.02-bench-baseline-and-ci-gate`](../../tasks/mvp/00-perf/02-bench-baseline-and-ci-gate.md)).
- **Placeholder-marker drift** in this file is grep-checked by
  [`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs).

---

## 🔍 Sync Check

- **UI: ✔** — Hot-reload is a dev-only runtime flow; no end-user UI surface to align (the dev toast lives in `src/renderer/hot-reload.ts` per the owning task).
- **Schema: ✔** — `manifest.schema.json` and `asset-index.schema.json` both exist and have canonical rows in [`schema-matrix.md`](./schema-matrix.md); record-suffix → schema mapping is unchanged.
- **Tasks: ⚠** — Owning task `mvp.02b-asset-pipeline.07-dev-hot-reload-...` exists and matches the flow, but does **not** list `hot-reload-flow.md` in its `Read First`; bench task `mvp.00-perf.02-bench-baseline-and-ci-gate` exists and aligns with NFR-START-04.

## ⚠ Issues

- **Pack error-code shorthand vs canonical catalog.** This doc names `PACK_MANIFEST_*`, `PACK_ASSET_*`, and `VALIDATION_*` as the failure codes for steps 1–3, but the canonical catalog in [`pack-error-codes.md`](./pack-error-codes.md) uses dotted form (`pack.error.manifest.*`, `pack.error.asset.*`, `pack.error.<area>.schema`); [`error-taxonomy.md` § 2](./error-taxonomy.md#2-error-categories) lists only the single `PACK_*` prefix. Per Hard Prohibition A the code shorthand was preserved verbatim. Suggested values: either (a) update this doc's step labels to match `pack.error.manifest.*` / `pack.error.asset.*` once `mvp.02b-asset-pipeline.16-pack-error-code-catalog` lands the runtime mirror, or (b) add `PACK_MANIFEST_*` / `PACK_ASSET_*` as recognised aliases in `pack-error-codes.md`. Owning task: `mvp.02b-asset-pipeline.16-pack-error-code-catalog`.
- **Reciprocal `Read First` gap on owning task.** [`tasks/mvp/02b-asset-pipeline/07-dev-hot-reload-watch-folder-reload-without-restart.md`](../../tasks/mvp/02b-asset-pipeline/07-dev-hot-reload-watch-folder-reload-without-restart.md) lists only `content-platform.md` under `Read First`. This arch doc is its canonical contract and should be added. Per [`.agents/rules/tasks.md`](../../.agents/rules/tasks.md) the task `.md` is the implementer's entry point. Skill did not edit the task file (Hard Prohibition D — never edit cross-checked files). Suggested fix: add `docs/architecture/hot-reload-flow.md` to that task's `Read First`.
