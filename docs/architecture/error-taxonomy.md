# Error Taxonomy

> Source plan:
> [`docs/implementation-plans/16-implementation-readiness-plan.md`](../implementation-plans/16-implementation-readiness-plan.md)
> (T13). Sister docs:
> [`pack-error-codes.md`](./pack-error-codes.md) (pack-loader-specific
> codes), [`storage-policy.md`](./storage-policy.md) (storage-specific
> codes), [`edge-cases-policy.md`](./edge-cases-policy.md) (cross-
> cutting policy for fail-loud vs degrade-quietly decisions).

This file is the canonical taxonomy for **how the runtime classifies
errors**. It exists so that schemas (`validation-error`,
`dispatcher-error`, `storage-error`), UI surfaces (toasts, modals,
inline error states), logs, and AI agents writing new error sites
agree on shape and severity.

---

## 1. Severities

| Severity | Meaning | UI surface | Telemetry |
|---|---|---|---|
| `fatal` | The runtime cannot continue; e.g. corrupt save, missing required pack, schema-validation failure on a record the engine must consume. | Full-screen blocking modal; user must reload or pick another save. | Error log + crash report. |
| `error` | A user-facing operation failed but the runtime can continue; e.g. invalid command, save quota exceeded, network desync. | Toast or inline error; user can retry. | Error log. |
| `warn` | Something non-blocking happened that the user should see; e.g. asset fallback used, locale missing key, optimistic-UI rollback. | Subtle banner or transient toast. | Warning log. |
| `info` | Diagnostic-only; e.g. successful pack hot-reload, autosave succeeded after retry. | Optional. | Info log only. |
| `debug` | Developer-only; never surfaced to end users. | None. | Debug log (gated by build flag). |

`fatal` and `error` are mandatory for the categories below; `warn`,
`info`, `debug` are optional and used at the module's discretion.

---

## 2. Error categories

Every error record carries a stable `code` matching one of:

| Code prefix | Category | Owning schema | Example |
|---|---|---|---|
| `VALIDATION_*` | Schema or runtime input validation failed. | [`validation-error.schema.json`](../../content-schema/schemas/validation-error.schema.json) | `VALIDATION_REQUIRED_FIELD_MISSING` |
| `DISPATCHER_*` | A command was rejected by the dispatcher. | [`dispatcher-validation-error.schema.json`](../../content-schema/schemas/dispatcher-validation-error.schema.json) | `DISPATCHER_NOT_CURRENT_ACTOR` |
| `PACK_*` | Pack loading, dependency resolution, manifest, or asset integrity failure. | [`pack-error-codes.md`](./pack-error-codes.md) | `PACK_DEPENDENCY_MISSING` |
| `STORAGE_*` | Save / replay / persistence failure. | [`storage-error.schema.json`](../../content-schema/schemas/storage-error.schema.json) | `STORAGE_QUOTA_EXCEEDED` |
| `NET_*` | Network / lockstep / signaling failure. | (planned) `net-error.schema.json` (M5) | `NET_TRANSPORT_DISCONNECTED` |
| `AI_*` | AI worker or content-generation provider failure. | [`provider-failure.schema.json`](../../content-schema/schemas/provider-failure.schema.json) | `AI_PROVIDER_TIMEOUT` |
| `ASSET_*` | Asset-load or atlas failure outside pack-load context. | (uses `validation-error` shape with `code: ASSET_*`) | `ASSET_ATLAS_BUILD_FAILED` |
| `UI_*` | UI-side runtime error (e.g. selector threw). | (uses `validation-error` shape with `code: UI_*`) | `UI_SELECTOR_THREW` |

A new error code:

1. Picks a prefix from the table above.
2. Adds a row to the matching schema's `code` enum.
3. Re-runs `npm run generate:enum-snapshot` per
   [`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md).

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
- `severity` — one of the severities above.
- `message` — internal, English, full sentence; never localized at
  this layer.

Optional but recommended:

- `stage` — pipeline stage where the error fired (e.g. `dispatch`,
  `validate`, `pack-load`, `network-step`, `save-write`).
- `context` — structured key/value pairs for reproduction.
- `userFacing` — `true` if the runtime intends to surface this to the
  end user.
- `suggestedAction` — short, internal English suggestion the UI may
  localize before display.

---

## 4. User-facing vs internal

- `userFacing: true` records are translated by the UI through the
  localization pipeline ([`ui-technology-choice.md`](./ui-technology-choice.md)).
  The localization key follows the convention
  `errors.<lowercase code>` (e.g. `errors.dispatcher_not_current_actor`).
- `userFacing: false` records are logged but never surfaced. They
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

- [`content-schema/schemas/validation-error.schema.json`](../../content-schema/schemas/validation-error.schema.json),
  [`content-schema/schemas/dispatcher-validation-error.schema.json`](../../content-schema/schemas/dispatcher-validation-error.schema.json),
  [`content-schema/schemas/storage-error.schema.json`](../../content-schema/schemas/storage-error.schema.json)
  enforce the per-category shape.
- [`content-schema/enums.snapshot.json`](../../content-schema/enums.snapshot.json)
  pins the `code` enum across save / replay / multiplayer surfaces.
- [`scripts/check-pack-error-codes.mjs`](../../scripts/check-pack-error-codes.mjs)
  refuses divergent pack-loader codes.
- [`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs)
  refuses bare placeholder markers in this file.
