# Error Schema Map

This doc is the **source of truth** for "which error schema does
which layer emit, and who consumes it." The repo carries **eight
error-shaped artifacts** whose names overlap semantically
(`*-error`, `error-*`, `*-failure`), which invites confusion at
import time.

Schemas are not renamed: every renaming would invalidate every
canonical example, every downstream task `Owned Paths`, and every
`import` site. Each schema instead carries a top-of-file pointer
back to this map.

---

## 1. Map

| Schema | Layer | When emitted | Consumer |
|---|---|---|---|
| [`validation-error.schema.json`](../../content-schema/schemas/validation-error.schema.json) | CI / runtime record validators (Zod, AJV) | A schema-bound record fails JSON-Schema / Zod parse against `content-schema/schemas/*` | CI repo-contract checker, IDE integrations, Phase-3 AI generation feedback loop |
| [`dispatcher-validation-error.schema.json`](../../content-schema/schemas/dispatcher-validation-error.schema.json) | Engine command dispatcher | A `Command` is rejected pre-dispatch (Gate 0–3) or post-dispatch (single-flight) | Engine, telemetry, single-player UI error-toast layer |
| [`signaling-error.schema.json`](../../content-schema/schemas/signaling-error.schema.json) | Signaling-server WebSocket | The signaling server rejects a peer message; joiner-visible wire enum is intentionally three values (`JOIN_FAILED` / `RATE_LIMITED` / `SERVER_ERROR`) | Multiplayer client, signaling-server logs (richer reason in `ownerNotice` only) |
| [`signature-error.schema.json`](../../content-schema/schemas/signature-error.schema.json) | Pack-signature verifier | Pack signature verification fails (collapses every failure mode to `INVALID_SIGNATURE`) or feature is off (`SIGNATURE_DISABLED`) | Pack-load surface, mod-manager UI, telemetry |
| [`storage-error.schema.json`](../../content-schema/schemas/storage-error.schema.json) | IndexedDB wrapper boundary | Any persistent write fails (quota, parse, integrity, schema-version) | Save / load surface, settings persistence, profile / consent stores |
| [`error-envelope.schema.json`](../../content-schema/schemas/error-envelope.schema.json) | Public service surfaces (HTTP / WebSocket) | A public endpoint returns a generic error response | HTTP / WebSocket clients, signaling client, AI gateway client |
| [`provider-failure.schema.json`](../../content-schema/schemas/provider-failure.schema.json) | AI generation pipeline (provider transport) | Upstream provider returns transport / auth / quota / content-policy failure | Generation UI (per-class recovery action), provider gateway |
| [`pack-error-codes.md`](./pack-error-codes.md) | Pack-load runtime | Any pack-load failure emits a code from this catalog | Pack-load surface, mod-manager UI, telemetry, localizers |

---

## 2. Disambiguation rules of thumb

- **Record-shaped data fails parse** → emit
  [`validation-error.schema.json`](../../content-schema/schemas/validation-error.schema.json).
- **A `Command` is rejected** → emit
  [`dispatcher-validation-error.schema.json`](../../content-schema/schemas/dispatcher-validation-error.schema.json).
- **A peer-network frame is malformed or unauthorized** → emit
  [`signaling-error.schema.json`](../../content-schema/schemas/signaling-error.schema.json).
- **A pack signature does not verify** → emit
  [`signature-error.schema.json`](../../content-schema/schemas/signature-error.schema.json)
  (collapsed to `INVALID_SIGNATURE` per
  [`crypto-rules.md`](./crypto-rules.md)).
- **A persistent store write fails** → emit
  [`storage-error.schema.json`](../../content-schema/schemas/storage-error.schema.json).
- **A public service endpoint returns an error** → emit
  [`error-envelope.schema.json`](../../content-schema/schemas/error-envelope.schema.json).
- **An AI generation provider returns a transport-layer failure** →
  emit
  [`provider-failure.schema.json`](../../content-schema/schemas/provider-failure.schema.json).
- **A pack fails to load** → look up the code in
  [`pack-error-codes.md`](./pack-error-codes.md).

---

## 3. Why no rename?

Renaming any schema would invalidate every canonical example under
`content-schema/examples/*/`, every owning task's `Owned Paths`, and
every downstream `import` site. This map is the cheaper,
equivalent-value fix. A new error shape: read this map first; if it
fits an existing schema additively, extend that one; only author a
new schema when the layer is genuinely new.

---

## Related

- [`error-taxonomy.md`](./error-taxonomy.md) — error codes,
  severities, and the record shape for internal error classification.
- [`error-ux.md`](./error-ux.md) — surface decision matrix and
  code → surface mapping.
- [`error-codes.md`](./error-codes.md) — wire-visible cross-service
  codes (HTTP / WebSocket / signaling).
- [`error-formatter.md`](./error-formatter.md) — `formatUserError`
  runtime hop from `(schemaId, rule, jsonPointer)` to UI key.
- [`crypto-rules.md`](./crypto-rules.md) — failure-collapse rule
  for `signature-error`.
- [`fail-loud.md`](./fail-loud.md) — when to throw vs. return.

---

## 🔍 Sync Check

- **UI: ✔** — No UI surface owned by this doc; all surface-decision logic correctly delegates to [`error-ux.md`](./error-ux.md) and the per-screen `interactions.md` blocks gated by [`scripts/check-error-ux-coverage.mjs`](../../scripts/check-error-ux-coverage.mjs).
- **Schema: ⚠** — All seven referenced schemas exist on disk with matching `$id`s, descriptions, and the back-pointer to this map. Three of them — `dispatcher-validation-error.schema.json`, `storage-error.schema.json`, and `error-envelope.schema.json` — have no row in [`schema-matrix.md`](./schema-matrix.md); the same gap is independently flagged by the [`error-taxonomy.md`](./error-taxonomy.md) and [`schema-matrix.md`](./schema-matrix.md) audits. Detail in `## ⚠ Issues`.
- **Tasks: ⚠** — No task file under `tasks/` cites `error-schema-map.md` by name in a Read First / Reads First / dependency block (verified by `grep -r "error-schema-map" tasks/`). The map is referenced from the schema descriptions themselves but has no explicit owning task. Non-blocking; surfaced for the next task-registry pass.

## ⚠ Issues

- **Missing schema-matrix rows for `DispatcherValidationError`, `StorageError`, `ErrorEnvelope`.** Row 1 (`validation-error`), row 3 (`signaling-error`), row 4 (`signature-error`), row 7 (`provider-failure`) of this map all carry a row in [`schema-matrix.md`](./schema-matrix.md). Rows 2 (`dispatcher-validation-error`), 5 (`storage-error`), and 6 (`error-envelope`) do not. Per CLAUDE.md root contract on schema registration, the schema-matrix owner must add the rows so agents searching the matrix for "what shape is a dispatcher rejection / storage failure / public-service error?" find them. Suggested column shape mirrors existing error-record rows (e.g. `ValidationError`, `SignatureError`): Gameplay Role `none — validator output only` (or `none — surface error only` for the wire envelopes), Presentation Role pointing at this map and the canonical examples. The same finding is raised in [`error-taxonomy.md`'s audit](./error-taxonomy.md) and inside [`schema-matrix.md`'s own audit](./schema-matrix.md) `## ⚠ Issues`. Skill did not edit the matrix (Hard Prohibition D — never edit cross-checked structural registries silently).
- **Code-prefix divergence is a sibling-doc issue, not a target-doc issue.** [`error-taxonomy.md` § 2](./error-taxonomy.md#2-error-categories) and [`error-ux.md` § 2](./error-ux.md#2-code--surface-mapping) name eight code prefixes (`VALIDATION_*`, `DISPATCHER_*`, `STORAGE_*`, …) and the CI regex [`scripts/check-error-ux-coverage.mjs`](../../scripts/check-error-ux-coverage.mjs) agrees, but the on-disk schemas use bare codes (`NOT_CURRENT_ACTOR`, `QUOTA_EXCEEDED`, …). This map deliberately names the schemas by their `$id`, not by prefixed codes, so it stays consistent with what the schemas actually carry. Surfaced here only so a reader cross-referencing this map against `error-taxonomy.md` can locate the divergence; the resolution belongs to [`mvp.00-core-architecture.22-01-error-formatter-contract`](../../tasks/mvp/00-core-architecture/22-01-error-formatter-contract.md) per the audits in `error-taxonomy.md` and `error-ux.md`. No edit to this map is implied.
