# Pack Resolver

The pack resolver owns the deterministic load order across every
installed pack, the per-edge version match against `dependencies`,
override-edge evaluation, and per-locale merge order. It is the
single algorithm referenced by
[`content-system-policy.md`](./content-system-policy.md) §§ 2, 3, 6.

Companion docs:

- [`content-system-policy.md`](./content-system-policy.md) — policy
  rules these algorithms enforce.
- [`pack-contract.md`](./pack-contract.md) — single-pack layout and
  asset rules consumed by step 5.
- [`pack-error-codes.md`](./pack-error-codes.md) — full catalog and
  severities for every code emitted below.
- [`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json)
  — canonical shape of `dependencies`, `provides`, `overrides`.

`src/content-runtime/pack-resolver.ts` is the implementation; this
doc is the contract. If they disagree, fix the implementation.

## 1. Inputs

`resolvePacks(manifests: Manifest[]): ResolverResult` — the resolver
consumes **only the set of installed manifests**, each parsed from
disk and validated against
[`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json).

The canonical-packs registry at
[`resources/canonical-packs.json`](../../resources/canonical-packs.json)
is **not** a resolver input; it is consumed downstream by the bundle
verifier after resolution succeeds (see
[`content-system-policy.md` § 9](./content-system-policy.md#9-canonical-pack-registry)).

## 2. Outputs

```ts
interface ResolverResult {
  loadedPacks: PackRecord[];          // resolution order, deps first
  overrideMap: Map<RecordId, PackId>; // last writer per target
  resolutionTrace: ResolutionStep[];  // for the mod-manager UI
}
```

## 3. Algorithm

### 3.1 Build the dependency graph

For every pack `P` with manifest dependencies `D`:

- Each `dep ∈ D` is `{ id: string, version: SemverRange }`. Plain
  string entries from the migration window are wrapped to
  `{ id: dep, version: "*" }` and a deprecation warning is reported.
- Add an edge `P → dep.id`. The edge carries the requested range.

### 3.2 Range match

For each edge `P → dep.id @ range`:

- Look up the installed manifest at `dep.id`.
- Absent → emit `pack.error.dependency.missing` with
  `{ packId: P.id, missing: dep.id, range }`.
- Present → evaluate `semver.satisfies(installed.version, range)`.
  Mismatch → emit `pack.error.dependency.version-conflict` with
  `{ packId: P.id, depId, installedVersion, requestedRange }`.

If two distinct packs require non-overlapping ranges of the same dep
(e.g. `>=2.0.0` vs `<2.0.0`) and only one version is installed, the
unsatisfied edge produces `pack.error.dependency.version-conflict`.
There is no silent picking: the user must install a satisfying
version or remove one of the requesters.

### 3.3 Topological sort

Run Kahn's algorithm over the graph:

- Initialize the ready queue with every node whose in-degree is 0.
- **Tie-break:** when multiple nodes are simultaneously ready, sort
  the queue lexicographically by namespaced manifest `id` (UTF-8
  byte order). This makes the load order byte-deterministic across
  platforms — necessary for `contentHash` equality and multiplayer.
- Pop the first node, append to `loadedPacks`, decrement in-degree
  of successors, push newly-zero successors into the queue.

If any node remains after the queue drains, the residual nodes form
one or more cycles. Emit one `pack.error.dependency.cycle` per cycle
with `{ packs: [...] }` listing every pack on the cycle in
lexicographic order so the message is also deterministic.

### 3.4 Override evaluation

For every pack `P` in resolution order, for every entry
`O ∈ P.overrides`:

1. Resolve `O.target` to the providing pack `Q` by scanning earlier
   `loadedPacks` whose `provides[<category>][*]` contains
   `O.target` (per
   [`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json)
   `provides` is `{ [category]: string[] }`).
2. If `Q` is not in `P`'s transitive dependency closure, emit
   `pack.error.override.unordered` with
   `{ overrider: P.id, target: O.target }`.
3. Apply the override:
   - `kind: "replace"` → put `(O.target, P.id)` into `overrideMap`,
     replacing any prior writer.
   - `kind: "patch"` → record the JSON-merge-patch (RFC 7396) for
     deferred application by the registry assembly step.

Two packs in unrelated dep subtrees overriding the same target →
`pack.error.override.unordered` (the user must install or author a
compat pack that depends on both and re-overrides explicitly).

A pack's `provides[<category>][*]` colliding with a `provides`
entry from an earlier pack **without** a matching `P.overrides`
entry is also `pack.error.override.unordered` — preserving the
existing "fail loudly on duplicate provides" guarantee.

### 3.5 Locale merge

After 3.1–3.4 succeed, walk `loadedPacks` in resolution order. For
each pack, load every `<pack>/locales/<locale>.localization.json`
(shape: [`localization.schema.json`](../../content-schema/schemas/localization.schema.json))
and merge its `entries` into the in-memory locale registry.
Per-key collisions follow the § 3.4 override rules: a later-loaded
pack wins **only** if it transitively depends on the earlier pack;
otherwise → `pack.error.locale.unordered`.

The registry exposes:

```ts
interface LocaleRegistry {
  getString(key: string, locale: string): string | undefined;
  getStringSource(key: string, locale: string): PackId | undefined;
}
```

`getStringSource` lets the localization editor surface "this string
came from pack `X`" in the diff view.

### 3.6 Resolution trace

`resolutionTrace` records, in order:

```ts
type ResolutionStep =
  | { stage: "topo",     packId: string, position: number }
  | { stage: "override", overrider: string, target: string, kind: "replace" | "patch" }
  | { stage: "locale",   pack: string, locale: string, keys: number };
```

Consumed by the mod manager UI's "Show resolution" panel and by the
`pack:trace` CLI subcommand for offline debugging.

## 4. Determinism Properties

- The resolver is a pure function: same installed-manifests set →
  same `loadedPacks`, `overrideMap`, `resolutionTrace`.
- Tie-break is lexicographic on UTF-8 bytes of `id`. No locale
  collation, no version-string sort.
- Hash inputs (manifest text, `provides`, `dependencies`,
  `overrides`) flow into `contentHash` so two clients with the same
  install set converge on the same registry.

## 5. Error Code Summary

| Stage | Code |
|---|---|
| Range match | `pack.error.dependency.missing` |
| Range match | `pack.error.dependency.version-conflict` |
| Topological sort | `pack.error.dependency.cycle` |
| Override evaluation | `pack.error.override.unordered` |
| Locale merge | `pack.error.locale.unordered` |

Full catalog and severities in
[`pack-error-codes.md`](./pack-error-codes.md).

## 6. Test Fixtures

Resolver fixtures live under
`content-schema/examples/packs/__tests__/resolver/` (linear chain,
diamond, cycle, missing dep, version conflict) and
`content-schema/examples/packs/__tests__/overrides/` (legal replace,
legal patch, override of non-dep, unordered override). Owned by
[`tasks/mvp/02b-asset-pipeline/12-pack-resolver-algorithm.md`](../../tasks/mvp/02b-asset-pipeline/12-pack-resolver-algorithm.md).

---

## 🔍 Sync Check

- **UI: ✔** — `resolutionTrace`, `overrideMap`, and `getStringSource` align with the mod-manager surfaces named in [`content-system-policy.md` § 3 / § 6](./content-system-policy.md) and consumed by [`tasks/phase-2/05-mod-system/04-mod-manager-ui-install-enable-disable.md`](../../tasks/phase-2/05-mod-system/04-mod-manager-ui-install-enable-disable.md). The mod-manager task derives the "overrider pack" from resolution context (no authored `overrides[].source` field), matching the schema.
- **Schema: ✔** — `dependencies` object form, `overrides` enum (`replace | patch`), and `provides: { [category]: string[] }` all match [`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json). Locale `entries` shape matches [`localization.schema.json`](../../content-schema/schemas/localization.schema.json). `Manifest` row present in [`schema-matrix.md`](./schema-matrix.md).
- **Tasks: ✔** — Algorithm owned by [`mvp.02b-asset-pipeline.12-pack-resolver-algorithm`](../../tasks/mvp/02b-asset-pipeline/12-pack-resolver-algorithm.md); referenced by `mvp.02b-asset-pipeline.{14, 18}`, `phase-2.05-mod-system.{04, 05a, 08, 09}` per [`tasks/task-registry.json`](../../tasks/task-registry.json). No orphan reciprocals.

## ⚠ Issues

- **Resolver input set drifted from owning-task contract.** The previous version of this file listed `resources/canonical-packs.json` as a resolver input, but the algorithm never references it and the owning task [`mvp.02b-asset-pipeline.12-pack-resolver-algorithm`](../../tasks/mvp/02b-asset-pipeline/12-pack-resolver-algorithm.md) declares only `manifest.schema.json` plus resolver fixtures. Per the task's `resolvePacks(manifests: Manifest[]): ResolverResult` signature, the canonical-packs registry is consumed by the downstream bundle verifier (see [`content-system-policy.md` § 9](./content-system-policy.md#9-canonical-pack-registry) and [`phase-2.05-mod-system.09-canonical-packs-registry`](../../tasks/phase-2/05-mod-system/09-canonical-packs-registry.md)), not by the resolver. Rewrote § 1 inline to keep the registry pointer for the reader but mark it explicitly non-resolver. No code change implied.
- **`pack:trace` CLI subcommand has no pinned task owner.** § 3.6 references a `pack:trace` CLI for offline debugging; the string appears only here and in the rendered architecture-wiki HTML (no task, no script under `scripts/`, no command-schema row). If this CLI is in scope, it needs an owning task in `tasks/mvp/02b-asset-pipeline/` and a row added to [`command-schema.md`](./command-schema.md) (or marked `local-ui` / `runtime-only` if not user-dispatched). If it is purely aspirational, the reference should be demoted to "exposed for offline tooling" in a follow-up. Skill did not edit other files (Hard Prohibition D) and did not invent a task ID (Hard Prohibition B); the resolver doc keeps the reference verbatim so the trace contract stays the source of truth.
- **Implementation file not yet on disk.** `src/content-runtime/pack-resolver.ts` is referenced as "is the implementation" but does not exist yet (verified by glob); the owning task is `planned` per [`tasks/task-status.json`](../../tasks/task-status.json). This is expected — the doc is the forward-looking contract — but flagged so a reader pointed at the path is not surprised. No rewrite (the contract stance is correct).
