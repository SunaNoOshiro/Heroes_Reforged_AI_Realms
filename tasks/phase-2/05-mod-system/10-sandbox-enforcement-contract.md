# Sandbox Enforcement Contract (predicate + four-consumer matrix)

Status: planned

Module: [Pack Runtime / Mod System (M4)](../05-mod-system.md)

Description:
Every AI-generated pack writes `sandboxed: true`, but today nothing
reads it: there is no rule in
[`pack-contract.md`](../../../docs/architecture/pack-contract.md) or
[`content-platform.md`](../../../docs/architecture/content-platform.md)
saying "ranked matchmaking refuses sandboxed packs," "shared lobbies
gate sandboxed content behind explicit opt-in," or "replay validation
rejects sandboxed packs in canonical replays." Quarantine is a label,
not a fence. This task is the **contract** (not the implementation)
that future matchmaker, lobby, and replay-validator tasks must
satisfy.

The contract pins:

1. A new "Sandbox enforcement" section in
   [`pack-contract.md`](../../../docs/architecture/pack-contract.md)
   with a four-row table (consumer, required behavior, default,
   override mechanism).
2. A new optional `sandboxedReason` string field on
   [`manifest.schema.json`](../../../content-schema/schemas/manifest.schema.json)
   so consumers can render *why* a pack is sandboxed
   (`ai-generated`, `user-edited`, `unsigned`).
3. A single shared `isSandboxAllowed(context, manifest): boolean`
   predicate that every consumer must use as the gate.
4. A single-line cross-reference from
   [`content-platform.md`](../../../docs/architecture/content-platform.md)
   into the new section.

Read First:
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)
- [`content-schema/schemas/manifest.schema.json`](../../../content-schema/schemas/manifest.schema.json)

Inputs:
- The `sandboxed` flag already enforced as auto-set on AI-generated
  packs (see
  [`tasks/phase-2/05-mod-system/03-sandbox-mode-for-ai-generated-packs.md`](./03-sandbox-mode-for-ai-generated-packs.md)
  and
  [`tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md`](../../phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md)).

Outputs:
- A "Sandbox enforcement" section in
  [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)
  with a four-row consumer/behavior/default/override table.
- An additive optional `sandboxedReason` field on
  [`content-schema/schemas/manifest.schema.json`](../../../content-schema/schemas/manifest.schema.json).
- A single-line cross-reference under "Sandbox enforcement" in
  [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md).
- A one-line entry in
  [`docs/planning/implementation-log.md`](../../../docs/planning/implementation-log.md)
  noting that runtime enforcement is now contractual rather than
  discretionary.

Owned Paths:

Owned Paths (shared):
- `content-schema/schemas/manifest.schema.json`

Dependencies:
- phase-2.05-mod-system.03-sandbox-mode-for-ai-generated-packs

Acceptance Criteria:
- The "Sandbox enforcement" section in `pack-contract.md` lists
  exactly four consumers — Ranked matchmaker, Shared lobby, Replay
  validator, Editor — each with required behavior, default, and
  override mechanism.
- `manifest.schema.json` accepts the additive `sandboxedReason`
  string without breaking existing first-party packs.
- `content-platform.md` carries the single-line cross-reference.
- `additionalProperties: false` on the manifest object remains
  intact (the field is added under `properties`).
- The shared-ownership claim on `manifest.schema.json` is purely
  additive — this task must not rewrite existing manifest fields,
  must not change existing field shapes, and must not change
  `manifest.schema.json`'s primary owner. The
  primary contract for `manifest.schema.json` is owned by the
  baseline schema task; this task adds only the optional
  `sandboxedReason` property.

Verify:
- npm run validate

Estimated Time:
- 3 hours
