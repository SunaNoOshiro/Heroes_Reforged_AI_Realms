# Pack Resolver

The pack resolver owns the deterministic load order of every loaded
pack, the per-edge version match against `dependencies`, the override
edge evaluation, and the per-locale merge order. It is the single
algorithm referenced by
[`content-system-policy.md`](./content-system-policy.md) §§ 2, 3, 6.

`src/content-runtime/pack-resolver.ts` is the implementation; this doc
is the contract. If they disagree, fix the implementation.

## Inputs

- The set of installed manifests, each parsed from disk and validated
  against [`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json).
- The canonical-packs registry from
  [`resources/canonical-packs.json`](../../resources/canonical-packs.json).

## Outputs

```ts
interface ResolverResult {
  loadedPacks: PackRecord[];          // resolution order, deps first
  overrideMap: Map<RecordId, PackId>; // last writer per target
  resolutionTrace: ResolutionStep[];  // for the mod-manager UI
}
```

## Algorithm

### 1. Build the dependency graph

For every pack `P` with manifest dependencies `D`:

- Each `dep ∈ D` is `{ id: string, version: SemverRange }`. Plain
  string entries from the migration window are wrapped to
  `{ id: dep, version: "*" }` and a deprecation warning is reported.
- Add an edge `P → dep.id`. The edge carries the requested range.

### 2. Range match

For each edge `P → dep.id @ range`, look up the installed manifest at
`dep.id`. If absent → emit `pack.error.dependency.missing` with
`{ packId: P.id, missing: dep.id, range }`. If present, evaluate
`semver.satisfies(installed.version, range)`. Mismatch → emit
`pack.error.dependency.version-conflict` with `{ packId: P.id, depId,
installedVersion, requestedRange }`.

If two distinct packs require non-overlapping ranges of the same dep
(e.g. `>=2.0.0` vs `<2.0.0`) and only one version is installed, the
unsatisfied edge produces `pack.error.dependency.version-conflict`.
There is no silent picking: the user must install a satisfying
version or remove one of the requesters.

### 3. Topological sort

Run Kahn's algorithm over the graph:

- Initialize the ready queue with every node whose in-degree is 0.
- **Tie-break:** when multiple nodes are simultaneously ready, sort
  the queue lexicographically by namespaced manifest `id` (UTF-8
  byte order). This makes the load order byte-deterministic across
  platforms — necessary for `contentHash` equality and multiplayer.
- Pop the first node, append to `loadedPacks`, decrement in-degree of
  successors, push newly-zero successors into the queue.

If any node remains after the queue drains, the residual nodes form
one or more cycles. Emit one `pack.error.dependency.cycle` per cycle
with `{ packs: [...] }` listing every pack on the cycle in
lexicographic order so the message is also deterministic.

### 4. Override evaluation

For every pack `P` in resolution order, for every entry
`O ∈ P.overrides`:

1. Resolve `O.target` to the providing pack `Q` by scanning earlier
   `loadedPacks` whose `provides[*]` contains `O.target`.
2. If `Q` is not in `P`'s transitive dependency closure, emit
   `pack.error.override.unordered` with `{ overrider: P.id, target: O.target }`.
3. Apply the override:
   - `kind: "replace"` → put `(O.target, P.id)` into `overrideMap`,
     replacing any prior writer.
   - `kind: "patch"` → record the JSON-merge-patch (RFC 7396) for
     deferred application by the registry assembly step.

Two packs in unrelated dep subtrees overriding the same target →
`pack.error.override.unordered` (the user must install or author a
compat pack that depends on both and re-overrides explicitly).

A pack's `provides[*]` colliding with a `provides[*]` from an earlier
pack **without** an entry in `P.overrides` is also
`pack.error.override.unordered` — preserving the existing "fail
loudly on duplicate provides" guarantee.

### 5. Locale merge

After steps 1–4 succeed, walk `loadedPacks` in resolution order. For
each pack, load every `<pack>/locales/<locale>.localization.json`,
merge its `entries` into the in-memory locale registry. Per-key
collisions follow the §3 override rules: a later-loaded pack wins
**only** if it transitively depends on the earlier pack; otherwise →
`pack.error.locale.unordered`.

The registry exposes:

```ts
interface LocaleRegistry {
  getString(key: string, locale: string): string | undefined;
  getStringSource(key: string, locale: string): PackId | undefined;
}
```

`getStringSource` lets the localization editor surface "this string
came from pack `X`" in the diff view.

### 6. Resolution trace

`resolutionTrace` records, in order:

```ts
type ResolutionStep =
  | { stage: "topo",     packId: string, position: number }
  | { stage: "override", overrider: string, target: string, kind: "replace" | "patch" }
  | { stage: "locale",   pack: string, locale: string, keys: number };
```

Consumed by the mod manager UI's "Show resolution" panel and by the
`pack:trace` CLI subcommand for offline debugging.

## Determinism Properties

- The resolver is a pure function: same installed-manifests set →
  same `loadedPacks`, `overrideMap`, `resolutionTrace`.
- Tie-break is lexicographic on UTF-8 bytes of `id`. No locale
  collation, no version-string sort.
- Hash inputs (manifest text, `provides`, `dependencies`,
  `overrides`) flow into `contentHash` so two clients with the same
  install set converge on the same registry.

## Error Code Summary

| Stage | Code |
|---|---|
| Range match | `pack.error.dependency.missing` |
| Range match | `pack.error.dependency.version-conflict` |
| Topological sort | `pack.error.dependency.cycle` |
| Override evaluation | `pack.error.override.unordered` |
| Locale merge | `pack.error.locale.unordered` |

Full catalog and severities in
[`pack-error-codes.md`](./pack-error-codes.md).

## Test Fixtures

Resolver fixtures live under
`content-schema/examples/packs/__tests__/resolver/` (linear chain,
diamond, cycle, missing dep, version conflict) and
`content-schema/examples/packs/__tests__/overrides/` (legal replace,
legal patch, override of non-dep, unordered override). Owned by
[`tasks/mvp/02b-asset-pipeline/12-pack-resolver-algorithm.md`](../../tasks/mvp/02b-asset-pipeline/12-pack-resolver-algorithm.md).
