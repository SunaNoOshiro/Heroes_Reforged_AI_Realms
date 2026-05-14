# Pack Lifecycle (cache, GC, disk quota)

How AI-generated and sandboxed packs are cached, evicted, and GCed
on user disks.

Companion docs:

- [`pack-contract.md`](./pack-contract.md) — pack shape, sandbox
  flag, sandbox-enforcement consumers.
- [`ai-generation-pipeline.md`](./ai-generation-pipeline.md) — Stage
  6 pack materialize and the cross-link to this file.
- [`provider-response-cache-entry.schema.json`](../../content-schema/schemas/provider-response-cache-entry.schema.json)
  — on-disk cache-entry shape (`schemaVersion`, `key`, `payload`,
  `createdAt`, `lastReadAt`).
- [`generation-config.schema.json`](../../content-schema/schemas/generation-config.schema.json)
  — `manifest.generation` (`orchestratorVersion`,
  `promptTemplateHash`, `rulesetHash`); presence of this block
  marks a pack as AI-generated for GC scoping.

Pre-this-file, pack identity collisions were caught at Stage 6
(byte-identical packs are rejected), but the rest of the lifecycle
was undefined: no provider-response cache (so a regenerate re-paid
the API cost), no disk-quota policy, no GC rule, no owner. This
file pins the four policies below; the launcher and generator UI
implement them.

## 1. Provider-Response Cache

The launcher owns an on-disk cache of provider responses, keyed by
`(promptHash, seed, providerId, modelHint)`. Each entry conforms to
[`provider-response-cache-entry.schema.json`](../../content-schema/schemas/provider-response-cache-entry.schema.json).

- **TTL**: 30 days from `createdAt`. Entries past TTL are evicted
  by the GC pass (§ 3).
- **Force-regenerate bypass**: the generator UI exposes a
  "Regenerate" affordance that bypasses the cache and writes a
  fresh entry on success. The launcher never regenerates entries
  silently.
- **Hit policy**: a cache hit updates `lastReadAt`. The field is
  the LRU key for cache-entry eviction (per the schema description
  of `lastReadAt`).

## 2. Disk-Quota Policy (Sandboxed Packs)

The launcher enforces a per-user soft and hard cap on the disk
footprint of packs with `manifest.sandboxed === true` (see
[`pack-contract.md` § Sandbox enforcement](./pack-contract.md#sandbox-enforcement)).

| Cap | Default | Effect on reach |
|---|---|---|
| **Soft** | 2 GB | Generator UI shows a notice ("Sandbox content using 2 GB; consider clearing unused packs"). Launcher does **not** auto-delete. |
| **Hard** | 5 GB | Launcher blocks new pack materialize until the user runs GC or deletes packs via "Manage AI content". |

- **Eviction order**: LRU by the pack's last-loaded timestamp
  (most-recently-loaded last to evict). Tie-break by `contentHash`
  to keep eviction deterministic.

These caps are operational defaults; production tuning lives in
launcher config, not in this contract.

## 3. GC Rule

GC runs in two contexts:

- **On launch**: the launcher walks the sandboxed pack store,
  drops cache entries past the 30-day TTL (§ 1), and reports the
  freed bytes in the generator UI status bar. GC NEVER deletes a
  pack whose `manifest.sandboxedReason` is not `ai-generated`;
  `user-edited` and `unsigned` packs require explicit user action.
- **On explicit "Manage AI content" action**: the user reviews and
  bulk-deletes sandboxed packs from a launcher screen.

A pack is in scope for the launcher's automated lifecycle layer
iff its manifest declares a `generation` block (see
[`generation-config.schema.json`](../../content-schema/schemas/generation-config.schema.json));
all other packs require explicit user action.

`sandboxedReason` is the closed enum
(`ai-generated | user-edited | unsigned`) on
[`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json);
the value is set to `ai-generated` by AI-pipeline Stage 6.

## 4. Lifecycle Ownership

- **Launcher** owns the provider-response cache and the GC pass.
  It is the only writer of cache entries on disk.
- **Generator UI** owns the "Force regenerate" override (bypasses
  § 1) and the "Manage AI content" surface (drives the explicit
  GC pass in § 3).
- **Engine and content runtime** never touch the cache directly;
  they consume validated `GeneratedFaction` records loaded from a
  materialized pack.

---

## 🔍 Sync Check

- **UI: ⚠** — The "Force regenerate" affordance is owned by
  [`tasks/phase-3/02-ai-generation/07-generation-ui-prompt-preview-download.md`](../../tasks/phase-3/02-ai-generation/07-generation-ui-prompt-preview-download.md)
  acceptance bullet #8, which cross-links back to this file. The
  "Manage AI content" surface (§§ 2–3) has no task owner and no
  screen package under
  [`wiki/screens/`](./wiki/screens/) — see `## ⚠ Issues`.
- **Schema: ✔** — Cache-entry key tuple
  `(promptHash, seed, providerId, modelHint)`, `createdAt`,
  `lastReadAt`, and `payload` match
  [`provider-response-cache-entry.schema.json`](../../content-schema/schemas/provider-response-cache-entry.schema.json)
  and its canonical example. The `sandboxedReason` enum
  (`ai-generated | user-edited | unsigned`) and `generation` block
  match [`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json).
  Schema-matrix row for `ProviderResponseCacheEntry` exists at
  [`schema-matrix.md`](./schema-matrix.md).
- **Tasks: ✔** — Owning task
  [`tasks/phase-3/02-ai-generation/09-pack-lifecycle-cache-and-gc.md`](../../tasks/phase-3/02-ai-generation/09-pack-lifecycle-cache-and-gc.md)
  lists this file under Owned Paths; `task-registry.json` carries
  the matching entry. The Lifecycle subsection in
  [`ai-generation-pipeline.md`](./ai-generation-pipeline.md) and
  the single-line cross-reference in
  [`pack-contract.md` § Sandbox enforcement](./pack-contract.md#sandbox-enforcement)
  both resolve.

## ⚠ Issues

- **Missing `data-inventory.md` row for the provider-response
  cache.** § 1 declares a launcher-managed on-disk cache with
  schema
  [`provider-response-cache-entry.schema.json`](../../content-schema/schemas/provider-response-cache-entry.schema.json)
  and a 30-day TTL. Per CLAUDE.md root contract ("every persisted
  field is registered in `data-inventory.md`"),
  [`data-inventory.md`](./data-inventory.md) should carry a row
  for it. The owning task is
  [`tasks/phase-3/02-ai-generation/09-pack-lifecycle-cache-and-gc.md`](../../tasks/phase-3/02-ai-generation/09-pack-lifecycle-cache-and-gc.md).
  Suggested values: domain = `ai-generation`, medium = on-disk
  launcher store, sensitivity = medium (carries `promptHash` +
  provider metadata), retention = rolling 30 d, wipe scope =
  `WIPE_LOCAL_DATA scope=profile|all`. The audit did not add the
  row itself (Hard Prohibition D — never edit cross-checked
  files). This finding mirrors the one already in
  [`ai-generation-pipeline.md` § ⚠ Issues](./ai-generation-pipeline.md);
  the two issues will close together when the data-inventory row
  lands.
- **"Manage AI content" surface has no UI owner.** §§ 2–3 and § 4
  refer to a launcher screen that drives the explicit GC pass.
  There is no screen package under
  [`wiki/screens/`](./wiki/screens/) for it, and no task in the
  AI-generation module (only
  [`07-generation-ui-prompt-preview-download.md`](../../tasks/phase-3/02-ai-generation/07-generation-ui-prompt-preview-download.md)
  references this file, and only for the "Force regenerate"
  affordance). Not CI-blocking — this file's scope is the policy,
  not the surface — but the surface owner needs a real task before
  the lifecycle layer ships. Suggested: extend the AI-generation
  task module with a "Manage AI content surface" task whose Read
  First includes this file, or add a numbered screen package
  under `wiki/screens/` and reference it here.
