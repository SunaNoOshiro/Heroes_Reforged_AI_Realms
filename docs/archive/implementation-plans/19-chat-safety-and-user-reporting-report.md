# Implementation Report: 19 — Chat Safety & User Reporting

> Plan: [`19-chat-safety-and-user-reporting-plan.md`](./19-chat-safety-and-user-reporting-plan.md).
> Audit: [`docs/archive/readiness-audit/19-chat-safety-and-user-reporting.md`](../readiness-audit/19-chat-safety-and-user-reporting.md).

## Summary

Lobby chat now has a single source of truth
([`docs/architecture/chat-safety.md`](../../architecture/chat-safety.md)),
two new schemas
([`chat-message`](../../../content-schema/schemas/chat-message.schema.json),
[`report-bundle`](../../../content-schema/schemas/report-bundle.schema.json))
with canonical examples, a dedicated `chat` DataChannel reservation
on Task 02 (`id: 2`, `ordered: true`, `maxRetransmits: 3`,
`negotiated: true`), three new task files (17 / 18 / 19) carrying
the envelope+rate-limit, mute/block+trust-banner, and
report-bundle+export surfaces, and a fully-extended
[`64-network-lobby`](../../architecture/wiki/screens/64-network-lobby/)
screen package with the new components, bindings, commands,
diagrams, and error-UX overrides.

The `chat-safety.md` doc owns the channel reservation table,
envelope contract, NFKC + control + bidi normalization rule list
(with the exact code-point ranges), plain-text-only rendering
contract, per-peer token-bucket rate limit (capacity 5, refill
1/s, 10 s soft-mute, 3-strikes session-mute), mute / block command
shape and persistence policy, report flow + bundle schema, the
in-memory + on-disk retention rules with the "forget me" hook for
Plan 21, the trust-model disclosure banner copy and dismiss
binding, and the reserved-additive `sig` (Plan 24) and
`deviceCapture` (Plan 22) hooks. Sibling plans (07, 18, 21, 22,
23, 24, 29) are referenced but not edited, per the plan's
boundary rules.

## Updated files

- [`tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md`](../../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md)
  — pinned the `chat` DataChannel as `id: 2`, `ordered: true`,
  `maxRetransmits: 3`, `negotiated: true`; added the 1 KiB
  application-side cap; added an Owned Paths (shared) entry
  declaring Task 17 as the envelope-contract owner; added the
  cross-channel-rejection acceptance clause.
- [`tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md`](../../../tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md)
  — added the chat-safety surface bindings: `MUTE_PEER`,
  `BLOCK_PEER`, `REPORT_PEER`, `EXPORT_CHAT_LOG`,
  `ACKNOWLEDGE_CHAT_TRUST_BANNER`, `MutedBadge`,
  `ChatTrustBanner`, `ChatPanelOverflowMenu`, `ReportPeerDialog`.
- [`docs/architecture/wiki/screens/64-network-lobby/spec.md`](../../architecture/wiki/screens/64-network-lobby/spec.md)
  — added `MutedBadge`, `ChatTrustBanner`, `ChatPanelOverflowMenu`,
  `ReportPeerDialog` to the component tree; added the
  Rendering Safety subsection; added `muted`, `blocked`, and
  `chatTrustBannerDismissed` to State Bindings.
- [`docs/architecture/wiki/screens/64-network-lobby/interactions.md`](../../architecture/wiki/screens/64-network-lobby/interactions.md)
  — pinned the send-side normalization + rate-limit pre-flight
  on `Send chat`; rewrote `MUTE_PEER` / `REPORT_PEER` rows with
  the new arg shape and chat-safety hooks; added `BLOCK_PEER`,
  `EXPORT_CHAT_LOG`, `ACKNOWLEDGE_CHAT_TRUST_BANNER`; updated the
  state-changes block; extended the error-surfaces table with
  `BLOCK_PEER`, `EXPORT_CHAT_LOG`, `ACKNOWLEDGE_CHAT_TRUST_BANNER`
  overrides.
- [`docs/architecture/wiki/screens/64-network-lobby/data-contracts.md`](../../architecture/wiki/screens/64-network-lobby/data-contracts.md)
  — added `chat-message.schema.json` and `report-bundle.schema.json`
  to the schema table; pinned `state.net.lobby.chat` to the
  envelope schema; added `muted`, `blocked`, `chatRateBucket`
  selectors; added the new commands and the new localization
  keys; declared retention exclusions for the new slices and the
  user-owned-files notice.
- [`docs/architecture/wiki/screens/64-network-lobby/architecture.md`](../../architecture/wiki/screens/64-network-lobby/architecture.md)
  — extended the Moderation Flow with `BLOCK_PEER`, `MUTE_PEER`,
  `REPORT_PEER` outcomes; added the Chat Receive Pipeline
  diagram (channel cap → normalize → schema → senderId rewrite →
  bucket → muted/blocked filter → render); listed the new state
  inputs.
- [`docs/architecture/wiki/screens/64-network-lobby/mockup.html`](../../architecture/wiki/screens/64-network-lobby/mockup.html)
  — added `MutedBadge` data-component anchor; added
  `network.mutePeer` / `network.blockPeer` / `network.reportPeer`
  data-action targets next to the roster row; added the
  `ChatTrustBanner` strip with `network.dismissChatTrustBanner`;
  added the `network.exportChatLog` overflow handle.
- [`docs/architecture/schema-matrix.md`](../../architecture/schema-matrix.md)
  — added `ChatMessage` and `ReportBundle` rows.
- [`content-schema/README.md`](../../../content-schema/README.md)
  — listed chat-message and report-bundle in the current scope
  block.
- [`docs/architecture/screen-command-coverage.json`](../../architecture/screen-command-coverage.json)
  — updated `MUTE_PEER` and `REPORT_PEER` ownership to point at
  the new tasks; registered `BLOCK_PEER`, `EXPORT_CHAT_LOG`,
  `ACKNOWLEDGE_CHAT_TRUST_BANNER`.
- [`docs/architecture/README.md`](../../architecture/README.md)
  — added the `chat-safety.md` listing under the architecture
  index.
- [`docs/architecture/wiki/README.md`](../../architecture/wiki/README.md)
  — added a UI-evolution note pointing chat-related screen edits
  at `chat-safety.md` first.
- [`content-schema/examples/ui-component-registry.example.json`](../../../content-schema/examples/ui-component-registry.example.json)
  — registered `ChatPanelOverflowMenu`, `ChatTrustBanner`,
  `MutedBadge`, `ReportPeerDialog`.
- [`scripts/check-repo-contracts.mjs`](../../../scripts/check-repo-contracts.mjs)
  — added `.chat-message.json` and `.report-bundle.json` suffix
  mappings to `schemaForFile`; added a `__rejected__` directory
  skip in `collectExampleRecordViolations` so negative test
  fixtures can live alongside canonical examples without failing
  the schema-shape gate.

## New files

- [`content-schema/schemas/chat-message.schema.json`](../../../content-schema/schemas/chat-message.schema.json)
  — lobby chat envelope: `v`, `scope` (`lobby`, with `ingame`
  reserved), `senderId` (rewritten by the receiver), `t`,
  `nonce`, `text` (≤ 240, plain-text), and reserved-additive
  `sig` for the Plan-24 signing upgrade.
- [`content-schema/schemas/report-bundle.schema.json`](../../../content-schema/schemas/report-bundle.schema.json)
  — peer-behavior / AI-UGC bundle: `v`, `kind`, `createdAt`,
  `reporter`, `subject` (closed reason set), `evidence`
  (chat excerpt referencing `chat-message.schema.json`,
  `saveHash`, `scenarioId`, `rulesetHash`,
  `sessionStartedAt`), reserved-empty `deviceCapture`.
- [`content-schema/examples/chat-message/canonical.chat-message.json`](../../../content-schema/examples/chat-message/canonical.chat-message.json)
- [`content-schema/examples/chat-message/__rejected__/oversized.chat-message.json`](../../../content-schema/examples/chat-message/__rejected__/oversized.chat-message.json)
  — negative test fixture (text > 240 chars). Lives in
  `__rejected__/` so the schema-shape gate skips it; consumed by
  the validator unit tests in Task 17.
- [`content-schema/examples/report-bundle/canonical-peer-behavior.report-bundle.json`](../../../content-schema/examples/report-bundle/canonical-peer-behavior.report-bundle.json)
- [`content-schema/examples/report-bundle/canonical-ai-ugc.report-bundle.json`](../../../content-schema/examples/report-bundle/canonical-ai-ugc.report-bundle.json)
- [`docs/architecture/chat-safety.md`](../../architecture/chat-safety.md)
  — the canonical chat-safety contract (11 sections per the
  plan): scope, channel reservation, envelope, normalization,
  sanitization, rate limit, mute / block, report, retention,
  trust-model disclosure, reserved-additive cross-plan hooks.
- [`tasks/phase-3/01-multiplayer/17-chat-envelope-channel-and-rate-limit.md`](../../../tasks/phase-3/01-multiplayer/17-chat-envelope-channel-and-rate-limit.md)
  — owns the schema, `normalizeChatText`, the receive-side
  validator, the per-peer token bucket, and the chat-channel
  reducer ingress.
- [`tasks/phase-3/01-multiplayer/18-mute-block-and-trust-banner.md`](../../../tasks/phase-3/01-multiplayer/18-mute-block-and-trust-banner.md)
  — owns `MUTE_PEER`, `BLOCK_PEER`, the `muted` / `blocked`
  slices, `MutedBadge`, and `ChatTrustBanner`.
- [`tasks/phase-3/01-multiplayer/19-report-bundle-and-export.md`](../../../tasks/phase-3/01-multiplayer/19-report-bundle-and-export.md)
  — owns `report-bundle.schema.json`, `REPORT_PEER`,
  `EXPORT_CHAT_LOG`, `ReportPeerDialog`, and the local-download
  blob-URL pipeline.

## Assumptions

- ⚠️ Assumption: the plan called the three new task files
  09 / 10 / 11 under `tasks/phase-3/01-multiplayer/`, but those
  numeric slots are already occupied by
  `09-snapshot-resync-fallback.md`,
  `10-turn-fallback-and-credentials.md`, and
  `11-network-chaos-test-matrix.md`. The new tasks landed at
  17 / 18 / 19, the next free numbers in the directory; the
  `phase-3.01-multiplayer.17-…` / `…18-…` / `…19-…` task ids
  are referenced from `chat-safety.md`, the screen-command
  coverage map, and the dependency arcs in Task 02 / Task 08.
- ⚠️ Assumption: the plan's
  `content-schema/examples/chat-message/oversized-rejected.json`
  file is a deliberately-invalid fixture for unit tests, not a
  canonical example. The schema-shape validator
  (`scripts/check-repo-contracts.mjs`) walks every `.json` under
  `content-schema/examples/` and would reject the oversize text.
  The fixture lives at
  `content-schema/examples/chat-message/__rejected__/oversized.chat-message.json`;
  the validator skips files in any `__rejected__/` segment via a
  one-line guard added in this change. Task 17's validator tests
  consume the fixture by path.
- ⚠️ Assumption: the chat-message schema's `$id` follows the
  existing repo convention (`heroes-reforged/<name>.schema.json`)
  rather than the `https://heroes-reforged/...` form used in the
  plan's JSONC sample, to match every other schema's `$id`
  shape.
- ⚠️ Assumption: per the plan's "Files to Update" item under
  "No single chat safety doc", `CLAUDE.md` was left untouched —
  the plan's default ("no edit, since CLAUDE.md is curated") was
  followed.

## Blockers

None.

## Verify

- `npm run all` — passes (`validate:links`,
  `validate:contracts`, `validate:contracts-ts`,
  `validate:cross-refs`, `validate:commands`, `validate:tasks`,
  `validate:arch`, `validate:ui-components`, `validate:enums`,
  `validate:balance`, `validate:error-codes`,
  `validate:provenance`, `validate:runtime-requirements`,
  `validate:deferred`, `validate:diagram-task-parity`,
  `validate:error-ux`, `generate:asset-index --check`,
  `generate:wiki`, `generate:task-system-report`).
- `npm test` — 32/32 tests pass.
