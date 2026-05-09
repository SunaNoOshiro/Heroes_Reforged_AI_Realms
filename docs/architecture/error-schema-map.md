# Error Schema Map

The repo carries eight error-shaped artifacts. Their names overlap
semantically (`*-error`, `error-*`, `*-failure`) which invites
confusion at consumer-import time. This page is the **source of
truth** for "which error schema does which layer emit, and who
consumes it."

The schemas themselves are not renamed; renaming would invalidate
every canonical example and downstream task. Each schema instead
carries a top-of-file pointer back to this map.

---

## Map

| Schema | Layer | When emitted | Consumer |
|---|---|---|---|
| [`validation-error.schema.json`](../../content-schema/schemas/validation-error.schema.json) | CI / runtime record validators (Zod, AJV) | A schema-bound record fails JSON-Schema / Zod parse against `content-schema/schemas/*` | CI repo-contract checker, IDE integrations, Phase-3 AI generation feedback loop |
| [`dispatcher-validation-error.schema.json`](../../content-schema/schemas/dispatcher-validation-error.schema.json) | Engine command dispatcher | A `Command` is rejected pre-dispatch (Gate 0–3) or post-dispatch (single-flight) | Engine, telemetry, single-player UI error-toast layer |
| [`signaling-error.schema.json`](../../content-schema/schemas/signaling-error.schema.json) | Signaling-server WebSocket | The signaling server rejects a peer message; wire surface is intentionally three-coarse | Multiplayer client, signaling-server logs (richer reason in `OwnerNotice` only) |
| [`signature-error.schema.json`](../../content-schema/schemas/signature-error.schema.json) | Pack-signature verifier | Pack signature verification fails or is disabled (collapses every failure to `INVALID_SIGNATURE`) | Pack-load surface, mod-manager UI, telemetry |
| [`storage-error.schema.json`](../../content-schema/schemas/storage-error.schema.json) | IndexedDB wrapper boundary | Any persistent write fails (quota, parse, integrity, schema-version) | Save / load surface, settings persistence, profile / consent stores |
| [`error-envelope.schema.json`](../../content-schema/schemas/error-envelope.schema.json) | Public service surfaces (HTTP / WebSocket) | A public endpoint returns a generic error response | HTTP / WebSocket clients, signaling client, AI gateway client |
| [`provider-failure.schema.json`](../../content-schema/schemas/provider-failure.schema.json) | AI generation pipeline (provider transport) | The upstream provider returns transport / auth / quota / content-policy failure | Generation UI (per-class recovery action), provider gateway |
| [`pack-error-codes.md`](./pack-error-codes.md) | Pack-load runtime | Any pack-load failure emits a code from this catalog | Pack-load surface, mod-manager UI, telemetry, localizers |

---

## Disambiguation rules of thumb

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

## Why no rename?

Renaming any of these schemas would invalidate every canonical
example under `content-schema/examples/*/`, every owning task's
`Owned Paths`, and every downstream `import` site. This map is the
cheaper, equivalent-value fix. Future authors needing a *new* error
shape: read this map first; if the new error fits an existing schema
additively, extend it; only author a new schema when the layer is
genuinely new.

---

## Related

- [`error-taxonomy.md`](./error-taxonomy.md) — error codes,
  severities, and the schema for error records.
- [`error-ux.md`](./error-ux.md) — surface decision matrix and
  code → surface mapping.
- [`crypto-rules.md`](./crypto-rules.md) — failure-collapse rule
  for `signature-error`.
- [`fail-loud.md`](./fail-loud.md) — when to throw vs. return.
