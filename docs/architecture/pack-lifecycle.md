# Pack Lifecycle (cache, GC, disk quota)

How AI-generated and sandboxed packs are cached, evicted, and GCed
on user disks.

This file is the contract for four lifecycle policies. Today, pack
identity collisions are caught at Stage 6 (byte-identical packs are
rejected), but everything else in pack lifecycle was undefined: no
provider-response cache (so a regenerate re-paid the API cost), no
disk-quota policy on sandboxed packs, no GC rule, no ownership of
the lifecycle layer. This file pins the four policies; the
implementation lives in the launcher and the generator UI.

## 1. Provider-Response Cache

Cached on disk by the launcher, keyed by
`(promptHash, seed, providerId, modelHint)` — see
[`content-schema/schemas/provider-response-cache-entry.schema.json`](../../content-schema/schemas/provider-response-cache-entry.schema.json).

- **TTL**: 30 days from `createdAt`. Entries past TTL are evicted by
  the GC pass.
- **Force-regenerate bypass**: the generator UI exposes a
  "Regenerate" affordance that bypasses the cache and writes a fresh
  entry on success. The launcher does not regenerate cache entries
  silently.
- **Hit policy**: a cache hit updates `lastReadAt` so the LRU
  eviction below sees the freshest first.

## 2. Disk-Quota Policy (Sandboxed Packs)

The launcher enforces a per-user soft and hard cap on the disk
footprint of packs marked `sandboxed: true` (see
[`pack-contract.md` § Sandbox Enforcement`](./pack-contract.md#sandbox-enforcement)).

- **Soft cap**: 2 GB. Reaching the soft cap surfaces a notice in the
  generator UI ("Sandbox content using 2 GB; consider clearing
  unused packs"); the launcher does not auto-delete.
- **Hard cap**: 5 GB. Reaching the hard cap blocks new pack
  materialize until the user runs the GC or deletes packs from the
  "Manage AI content" surface.
- **Eviction order**: LRU by the pack's last loaded timestamp
  (most-recently-loaded last to evict). Tie-break by `contentHash`
  to keep eviction deterministic.

These caps are operational defaults. Production tuning lives in
launcher config, not in this contract.

## 3. GC Rule

GC runs in two contexts:

- **On launch**: the launcher walks the sandboxed pack store, drops
  cache entries past the 30-day TTL, and reports the freed bytes in
  the generator UI's status bar. GC never deletes a sandboxed pack
  whose `sandboxedReason` is not `ai-generated`; user-edited or
  unsigned packs require explicit action.
- **On explicit "Manage AI content" action**: the user can review
  and bulk-delete sandboxed packs from a launcher screen.

Packs whose `manifest.generation` block (see
[`content-schema/schemas/generation-config.schema.json`](../../content-schema/schemas/generation-config.schema.json))
identifies them as AI-generated are the only candidates for the
launcher's automated lifecycle layer.

## 4. Lifecycle Ownership

- **Launcher** owns the cache and the GC. It is the only writer of
  cache entries on disk.
- **Generator UI** owns the "Force regenerate" override and the
  "Manage AI content" surface that drives the explicit GC pass.
- **Engine and content runtime** never touch the cache directly;
  they consume validated `GeneratedFaction` records loaded from a
  materialized pack.

## Why This Matters

Without a documented lifecycle:

- disk usage grows monotonically; a heavy generator session can fill
  several GB of unreferenced sandboxed packs.
- provider cost is paid on every regenerate even if the user just
  wants to retry a downstream stage (moderation, balance) on the
  same provider response.
- a "regenerate the same prompt+seed" reproducibility test is
  expensive when it could be free.

Pinning the four policies above gives the launcher a single source
of truth and gives a future contributor a documented surface to
extend instead of inventing a policy on the fly.
