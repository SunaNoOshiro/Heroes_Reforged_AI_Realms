# Error Taxonomy

> Companion docs:
> [`error-schema-map.md`](./error-schema-map.md) (which error
> schema each layer emits and consumes),
> [`error-ux.md`](./error-ux.md) (surface decision matrix
> + code → surface mapping),
> [`error-codes.md`](./error-codes.md) (wire-visible cross-service
> codes),
> [`error-formatter.md`](./error-formatter.md) (`formatUserError`),
> [`pack-error-codes.md`](./pack-error-codes.md) (pack-loader
> catalog),
> [`storage-policy.md`](./storage-policy.md) (storage codes,
> eviction order),
> [`edge-cases-policy.md`](./edge-cases-policy.md) (cross-cutting
> fail-loud vs degrade-quietly policy).

This file is the canonical taxonomy for **how the runtime classifies
internal error records**: severities, code prefixes, and the record
shape that schemas, UI surfaces, logs, and AI agents writing new
error sites must agree on. Wire-visible vocabularies (signaling, AI
gateway HTTP, pack signature) are the separate concern owned by
[`error-codes.md`](./error-codes.md).

---

## 1. Severities

| Severity | Meaning | UI surface | Telemetry |
|---|---|---|---|
| `fatal` | Runtime cannot continue (corrupt save, missing required pack, schema-validation failure on a record the engine must consume). | Full-screen blocking modal; user reloads or picks another save. | Error log + crash report. |
| `error` | A user-facing operation failed but the runtime continues (invalid command, save quota exceeded, network desync). | Toast or inline error; user can retry. | Error log. |
| `warn` | Non-blocking but user-visible (asset fallback used, locale missing key, optimistic-UI rollback). | Subtle banner or transient toast. | Warning log. |
| `info` | Diagnostic-only (successful pack hot-reload, autosave succeeded after retry). | Optional. | Info log only. |
| `debug` | Developer-only; never surfaced to end users. | None. | Debug log (gated by build flag). |

`fatal` and `error` are mandatory for the categories below; `warn`,
`info`, and `debug` are optional and used at the module's
discretion.

---

## 2. Error categories

Every error record carries a stable `code` from one of eight
prefixes. The prefix is the *logical* category — UI surface mapping
in [`error-ux.md` § 2](./error-ux.md#2-code--surface-mapping) and
the CI gate
[`scripts/check-error-ux-coverage.mjs`](../../scripts/check-error-ux-coverage.mjs)
both key off it.

| Prefix | Category | Owning schema | Example code |
|---|---|---|---|
| `VALIDATION_*` | Schema or runtime input validation failed. | [`validation-error.schema.json`](../../content-schema/schemas/validation-error.schema.json) | `VALIDATION_REQUIRED_FIELD_MISSING` |
| `DISPATCHER_*` | A command was rejected by the dispatcher. | [`dispatcher-validation-error.schema.json`](../../content-schema/schemas/dispatcher-validation-error.schema.json) | `DISPATCHER_NOT_CURRENT_ACTOR` |
| `PACK_*` | Pack loading, dependency resolution, manifest, or asset integrity failure. | [`pack-error-codes.md`](./pack-error-codes.md) | `PACK_DEPENDENCY_MISSING` |
| `STORAGE_*` | Save / replay / persistence failure. | [`storage-error.schema.json`](../../content-schema/schemas/storage-error.schema.json) | `STORAGE_QUOTA_EXCEEDED` |
| `NET_*` | Network / lockstep / signaling failure. | (planned) `net-error.schema.json` (M5) | `NET_TRANSPORT_DISCONNECTED` |
| `AI_*` | AI worker or content-generation provider failure. | [`provider-failure.schema.json`](../../content-schema/schemas/provider-failure.schema.json) | `AI_PROVIDER_TIMEOUT` |
| `ASSET_*` | Asset-load or atlas failure outside pack-load context. | (uses `validation-error` shape with `code: ASSET_*`) | `ASSET_ATLAS_BUILD_FAILED` |
| `UI_*` | UI-side runtime error (e.g. selector threw). | (uses `validation-error` shape with `code: UI_*`) | `UI_SELECTOR_THREW` |

Adding a new code:

1. Pick a prefix from the table above.
2. Add the value to the matching schema's `code` enum.
3. Re-run `npm run generate:enum-snapshot` per
   [`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md).

The presentation-layer companion shape is
[`error-state.schema.json`](../../content-schema/schemas/error-state.schema.json):
the UI ErrorState row that toasts, recoverable-error panels, and
telemetry sinks consume. ErrorState records are state-tree only and
never enter saves, replays, or the canonical state hash.

---

## 3. Error record shape

Every error record satisfies the base shape, which is a subset of
[`validation-error.schema.json`](../../content-schema/schemas/validation-error.schema.json):

```json
{
  "code": "DISPATCHER_NOT_CURRENT_ACTOR",
  "severity": "error",
  "stage": "dispatch",
  "message": "Command rejected: actor 'p1' is not the current actor.",
  "context": {
    "commandKind": "MOVE_HERO",
    "actorId": "p1",
    "currentActorId": "p2",
    "turn": 14
  },
  "userFacing": true,
  "suggestedAction": "Wait for your turn."
}
```

Required:

- `code` — stable enum value.
- `severity` — one of [§ 1](#1-severities).
- `message` — internal English, full sentence; never localized at
  this layer.

Optional:

- `stage` — pipeline stage where the error fired (e.g. `dispatch`,
  `validate`, `pack-load`, `network-step`, `save-write`).
- `context` — structured key/value pairs for reproduction.
- `userFacing` — `true` if the runtime intends to surface this to
  the end user.
- `suggestedAction` — short internal English suggestion the UI may
  localize before display.

---

## 4. User-facing vs internal

- `userFacing: true` records are translated through the
  localization pipeline owned by
  [`ui-technology-choice.md`](./ui-technology-choice.md). Key
  convention: `errors.<lowercase code>` (e.g.
  `errors.dispatcher_not_current_actor`).
- `userFacing: false` records are logged but never surfaced; they
  exist for telemetry and developer diagnosis.
- `severity: fatal` is **always** user-facing.
- `severity: debug` is **never** user-facing.

---

## 5. Examples

```json
{
  "code": "STORAGE_QUOTA_EXCEEDED",
  "severity": "error",
  "stage": "save-write",
  "message": "Save aborted: IndexedDB quota exceeded.",
  "context": { "slot": 3, "estimatedBytes": 6291456 },
  "userFacing": true,
  "suggestedAction": "Delete an old save and retry."
}
```

```json
{
  "code": "PACK_DEPENDENCY_MISSING",
  "severity": "fatal",
  "stage": "pack-load",
  "message": "Pack 'baseline-emberwild' requires 'baseline-ruleset' >= 1.0.0; not found.",
  "context": { "packId": "baseline-emberwild", "missing": "baseline-ruleset@>=1.0.0" },
  "userFacing": true,
  "suggestedAction": "Install the required pack and reload."
}
```

```json
{
  "code": "AI_PROVIDER_TIMEOUT",
  "severity": "warn",
  "stage": "ai-generation",
  "message": "Faction-generation provider timed out after 30s; using cached fallback.",
  "context": { "providerId": "faction-generator-v1", "requestId": "rq-7f2c" },
  "userFacing": false
}
```

---

## 6. Verified by

- [`validation-error.schema.json`](../../content-schema/schemas/validation-error.schema.json),
  [`dispatcher-validation-error.schema.json`](../../content-schema/schemas/dispatcher-validation-error.schema.json),
  [`storage-error.schema.json`](../../content-schema/schemas/storage-error.schema.json),
  [`error-state.schema.json`](../../content-schema/schemas/error-state.schema.json)
  enforce the per-category shape.
- [`content-schema/enums.snapshot.json`](../../content-schema/enums.snapshot.json)
  pins the `code` enum across save / replay / multiplayer surfaces.
- [`scripts/check-pack-error-codes.mjs`](../../scripts/check-pack-error-codes.mjs)
  refuses divergent pack-loader codes against
  [`pack-error-codes.md`](./pack-error-codes.md).
- [`scripts/check-error-ux-coverage.mjs`](../../scripts/check-error-ux-coverage.mjs)
  refuses screen `interactions.md` files that name a prefixed code
  without an `## Error surfaces` block.
- [`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs)
  refuses bare placeholder markers (`TBD` / `TODO` / `FIXME` /
  `???`) in this and every other canonical doc.

---

## 🔍 Sync Check

- **UI: ✔** — Severity tiers and prefix → surface assumptions match [`error-ux.md` §§ 1–2](./error-ux.md); the `DISPATCHER_NOT_CURRENT_ACTOR` worked example here is the same one used in [`error-ux.md` § 6](./error-ux.md#6-worked-example--defend-rejected-because-hero-already-moved).
- **Schema: ❌** — Three CI-blocking gaps: (a) [`dispatcher-validation-error.schema.json`](../../content-schema/schemas/dispatcher-validation-error.schema.json) and [`storage-error.schema.json`](../../content-schema/schemas/storage-error.schema.json) define `code` values *without* the doc's prefixes (e.g. `NOT_CURRENT_ACTOR`, `QUOTA_EXCEEDED`); (b) `validation-error.schema.json` has no `code` field at all (`rule` + `message` only); (c) the `severity` enum in both `validation-error.schema.json` and `error-state.schema.json` lacks `debug` while this doc + [`error-ux.md` § 1](./error-ux.md#1-surface-decision-matrix) name it. Detail in `## ⚠ Issues`.
- **Tasks: ⚠** — Owning task chain resolves: command dispatcher in [`mvp/01-engine-core/06-command-dispatcher.md`](../../tasks/mvp/01-engine-core/06-command-dispatcher.md), pack-error catalog in [`mvp/02b-asset-pipeline/16-pack-error-code-catalog.md`](../../tasks/mvp/02b-asset-pipeline/16-pack-error-code-catalog.md), storage codes in [`mvp/08-persistence/09-quota-handling.md`](../../tasks/mvp/08-persistence/09-quota-handling.md), error formatter in [`mvp/00-core-architecture/22-01-error-formatter-contract.md`](../../tasks/mvp/00-core-architecture/22-01-error-formatter-contract.md), required telemetry emissions in [`phase-2/11-observability/02-required-emissions-catalogue.md`](../../tasks/phase-2/11-observability/02-required-emissions-catalogue.md). The placeholder `(planned) net-error.schema.json (M5)` in § 2 has no Phase-3 task ID anchor; non-blocking but worth pinning when the schema lands.

## ⚠ Issues

- **Code-prefix divergence between this doc and the on-wire schemas.** § 2 names eight prefixes (`VALIDATION_*`, `DISPATCHER_*`, `STORAGE_*`, `PACK_*`, `NET_*`, `AI_*`, `ASSET_*`, `UI_*`); [`error-ux.md` § 2](./error-ux.md#2-code--surface-mapping) and the CI gate [`scripts/check-error-ux-coverage.mjs`](../../scripts/check-error-ux-coverage.mjs) (regex `(DISPATCHER|VALIDATION|STORAGE|PACK|NET|AI|ASSET|UI)_<TOKEN>`) agree. The schemas disagree: [`dispatcher-validation-error.schema.json`](../../content-schema/schemas/dispatcher-validation-error.schema.json) defines `code` constants `MALFORMED_PAYLOAD`, `NOT_CURRENT_ACTOR`, `ENTITY_NOT_FOUND`, `INSUFFICIENT_RESOURCES`, `ILLEGAL_PHASE`, `OWNERSHIP_VIOLATION`, `UNREACHABLE_TARGET`, `DUPLICATE_INTENT` (no `DISPATCHER_*`); [`storage-error.schema.json`](../../content-schema/schemas/storage-error.schema.json) uses `QUOTA_EXCEEDED`, `IDB_VERSION_ERROR`, `IDB_BLOCKED`, `IDB_DATA_CORRUPTION` (no `STORAGE_*`); [`validation-error.schema.json`](../../content-schema/schemas/validation-error.schema.json) carries no `code` field at all (it pins `rule` against a closed set of validator-rule kinds). Per CLAUDE.md ("Stable IDs are public API"), one of the two sides must give. Owners: [`mvp.01-engine-core.06-command-dispatcher`](../../tasks/mvp/01-engine-core/06-command-dispatcher.md) for dispatcher codes and [`mvp.08-persistence.09-quota-handling`](../../tasks/mvp/08-persistence/09-quota-handling.md) for storage codes — they pick whether to (a) add the prefix to each schema's `code` enum (additive, but breaks every canonical example under `content-schema/examples/`) or (b) drop the prefix from this doc + `error-ux.md` + the CI regex. Suggested fix: option (a) — re-issue the schema enums as `DISPATCHER_NOT_CURRENT_ACTOR` etc., regenerate enum-snapshot, fix the canonical examples — because the prefix is what makes the UI-surface mapping in `error-ux.md` automatic. Skill did not edit the schemas (Hard Prohibition D).
- **`validation-error.schema.json` carries `rule`, not `code`.** § 2 row "VALIDATION_*" claims that schema owns the prefix, but it doesn't have a `code` field — its closed enum is `rule: enum | required | additional | type | minimum | …` and it relies on `message` + `messageKey`. The doc's example `VALIDATION_REQUIRED_FIELD_MISSING` therefore cannot be a valid value of any field in that schema today. Either the schema needs an additive `code` (string, prefixed) field or the row should reclassify `VALIDATION_*` as a logical-only label not directly emitted into validation-error records. Owner: [`mvp.00-core-architecture.22-01-error-formatter-contract`](../../tasks/mvp/00-core-architecture/22-01-error-formatter-contract.md), since the formatter is the layer that maps `(schemaId, rule, jsonPointer)` → a prefixed UI code. Suggested values: schema field `code: string, pattern: ^VALIDATION_[A-Z0-9_]+$`, optional, defaulted by the formatter on read.
- **`severity: debug` is in the doc but not the schemas.** § 1 lists five severities; [`validation-error.schema.json`](../../content-schema/schemas/validation-error.schema.json) line 81–85 and [`error-state.schema.json`](../../content-schema/schemas/error-state.schema.json) line 18–22 both pin a four-value enum (`info | warn | error | fatal`). [`error-ux.md` § 1](./error-ux.md#1-surface-decision-matrix) sides with this doc (lists `debug`). Owner: same as the prefix issue above; if `debug` is genuinely a runtime tier, the schema enums need it — which is an additive change, but [`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md) requires the matching `npm run generate:enum-snapshot` regen. Suggested values: extend the two `severity` enums to `["info", "warn", "error", "fatal", "debug"]` (additive at tail; no aliases needed since nothing previously used `debug`).
- **`AI_*` row points at `provider-failure.schema.json`, but that schema has no `code` field.** § 2 claims `provider-failure.schema.json` owns `AI_*`, but the schema's discriminator is `kind: transport | auth | quota | content-policy` (see [`provider-failure.schema.json`](../../content-schema/schemas/provider-failure.schema.json) and [`error-schema-map.md`](./error-schema-map.md) row "AI generation pipeline (provider transport)"). `AI_PROVIDER_TIMEOUT` would land on a `validation-error` / `error-state` record, with `provider-failure` carried in `context.providerFailure` or similar, not as the record itself. Suggest reclassifying the row to `(uses validation-error shape with code: AI_*; provider-transport detail in provider-failure shape)` to mirror the `ASSET_*` and `UI_*` rows. Owner: [`mvp.00-core-architecture.22-01-error-formatter-contract`](../../tasks/mvp/00-core-architecture/22-01-error-formatter-contract.md). Skill did not silently rewrite the row because hardcoding the link target would still leave the underlying mapping mismatch unsurfaced.
- **`dispatcher-validation-error` and `storage-error` not in [`schema-matrix.md`](./schema-matrix.md).** Same finding the [`edge-cases-policy.md`](./edge-cases-policy.md) audit raised; surfaced again because § 2 of this file names both schemas as the canonical owners. The matrix lists `ValidationError`, `ProviderFailure`, `ErrorState`, `SignatureError`, `SignalingError` rows but no `DispatcherValidationError` or `StorageError` row. Per CLAUDE.md root contract on schema registration, the schema-matrix owner must add the rows; without them, agents discovering "what shape is a dispatcher rejection?" find nothing in the index. Suggested values: add `DispatcherValidationError` row pointing at the schema and at this file § 2 + [`edge-cases-policy.md` § 11](./edge-cases-policy.md#11-validation-error-taxonomy); add `StorageError` row pointing at the schema and at this file § 2 + [`storage-policy.md`](./storage-policy.md) + [`edge-cases-policy.md` § 15](./edge-cases-policy.md). Skill did not edit the matrix (Hard Prohibition D).
- **Localization-key convention conflict.** § 4 says `errors.<lowercase code>` (plural `errors`, snake-case code, e.g. `errors.dispatcher_not_current_actor`). [`error-ux.md` § 3](./error-ux.md#3-localization-key-naming) says `error.<domain>.<code>.<part>` (singular `error`, dotted, hyphenated, with `<part>` ∈ `title | body | cta`, e.g. `error.dispatcher.not-current-actor.body`). [`error-codes.md` § 3](./error-codes.md#3-ui-grade-keys) uses `errors.network.joinFailed` style (plural `errors`, dotted, camelCase). Three docs, three conventions; the localization runtime can only honor one. Owner: [`mvp.00-core-architecture.22-01-error-formatter-contract`](../../tasks/mvp/00-core-architecture/22-01-error-formatter-contract.md), since `formatUserError` is the single hop that resolves codes to keys. Suggested values: pick the `error-ux.md` form (`error.<domain>.<code>.<part>`) — it carries the mandatory `body` + optional `title`/`cta` parts the toast/modal renderers already need, and it survives the prefix-divergence issue above by deriving `<domain>` from the lowercase prefix.
