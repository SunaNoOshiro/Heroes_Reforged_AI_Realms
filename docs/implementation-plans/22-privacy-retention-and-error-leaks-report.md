# Implementation Report: 22 — Privacy, Data Retention & Error-Message Information Leaks

> Source plan:
> [`22-privacy-retention-and-error-leaks-plan.md`](./22-privacy-retention-and-error-leaks-plan.md)

This report records the artifacts created and updated when applying
the plan. All four Critical Fixes and the System Improvements were
landed. `npm run all` and `npm test` both pass.

## 1. New architecture docs

- [`docs/architecture/error-formatter.md`](../architecture/error-formatter.md) —
  `formatUserError` / `formatDevError` API, redaction allowlist
  (paths, IPs, base64 ≥ 32, `redact: true`), `errorId` UUID v4 rule,
  prod/dev branching, schema-validation classifier, banned-pattern
  lint rule (`no-raw-error-message-in-ui`).
- [`docs/architecture/production-build.md`](../architecture/production-build.md) —
  five rules the build pipeline must satisfy: `__DEV__` constant
  fold, source-map strip, formatter as the only UI sink, console
  sinks via `formatDevError`, bundle-size CI on dev-only constants.
- [`docs/architecture/crypto-rules.md`](../architecture/crypto-rules.md) —
  Compare / Throw / Log rules; constant-time `timingSafeEqual`;
  `redact: true` tag; surface table covering pack signature, save
  MAC, TURN credential, future auth.
- [`docs/architecture/privacy.md`](../architecture/privacy.md) —
  versioned `policyVersion: 1`; data inventory cross-link; per-surface
  retention TTL matrix; scrubbing rules; processor link;
  compliance posture link; erasure pathway; telemetry posture
  (off by default); versioning + state slice rule.
- [`docs/architecture/error-codes.md`](../architecture/error-codes.md) —
  cross-service index; closed wire / UI key mapping for signaling
  and AI gateway.
- [`docs/architecture/desync-redaction.md`](../architecture/desync-redaction.md) —
  closed visibility enum, four-bucket length-class labels, pipeline
  placement, worked-example table, replay-export reuse.

## 2. New legal docs

- [`docs/legal/compliance.md`](../legal/compliance.md) — GDPR / CCPA /
  COPPA scope, GDPR Art. 6 lawful basis matrix, data-subject rights
  mapping, breach response.
- [`docs/legal/processors.md`](../legal/processors.md) — empty active
  list at v1; reserved categories for hosting / AI provider / crash /
  analytics / CDN; procurement gate.
- [`docs/legal/dpa-checklist.md`](../legal/dpa-checklist.md) — vendor
  rubric: contractual baseline, technical & organizational measures,
  data scope, AI-specific, hosting-specific, crash / APM-specific,
  analytics-specific.
- [`docs/legal/erasure-process.md`](../legal/erasure-process.md) —
  manual fallback (email + 30-day SLA) until backend lands; scope
  statement.

## 3. New service docs

- [`services/signaling/observability.md`](../../services/signaling/observability.md)
- [`services/signaling/error-codes.md`](../../services/signaling/error-codes.md)
- [`services/ai-gateway/retention.md`](../../services/ai-gateway/retention.md)
- [`services/ai-gateway/error-codes.md`](../../services/ai-gateway/error-codes.md)

Both `services/*/README.md` files were updated to link the new docs
under an "Operational contracts" header.

## 4. New schemas + canonical examples

- [`signaling-error.schema.json`](../../content-schema/schemas/signaling-error.schema.json) —
  closed three-value wire enum + closed `OwnerNotice` reason enum.
  Examples: `canonical-wire`, `canonical-rate-limited`,
  `canonical-owner-notice`.
- [`signature-error.schema.json`](../../content-schema/schemas/signature-error.schema.json) —
  closed `INVALID_SIGNATURE | SIGNATURE_DISABLED` enum.
- [`audit-log-entry.schema.json`](../../content-schema/schemas/audit-log-entry.schema.json) —
  closed type enum (`ERASURE`, `REPLAY_EXPORT`, `POLICY_ACCEPTED`,
  `OPT_IN_TOGGLED`); examples for each type.
- [`erasure-receipt.schema.json`](../../content-schema/schemas/erasure-receipt.schema.json) —
  user-facing receipt with `erasureRequestId`, `scope[]`,
  `performedAt`, `contentHash`, `policyVersion`.
- All four schemas registered in
  [`schema-matrix.md`](../architecture/schema-matrix.md) and
  [`content-schema/README.md`](../../content-schema/README.md).
- Suffix mapping added to
  [`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs).
- Snapshot regenerated at
  [`content-schema/enums.snapshot.json`](../../content-schema/enums.snapshot.json).

## 5. Schema edits

- [`localization.schema.json`](../../content-schema/schemas/localization.schema.json) —
  closed `errors.*` namespace covering `generic`, `network.*`,
  `peer.*`, `signature.*`, `import.*`, `ai.*`, `desync.*`, `policy.*`.

## 6. Edits to existing screens

- [`01-main-menu`](../architecture/wiki/screens/01-main-menu/) —
  `PrivacyFooter` component; `Privacy · Credits · Version` footer
  row; `OPEN_PRIVACY_POLICY` binding;
  `ui.main-menu.footer.privacy` localization key.
- [`56-options`](../architecture/wiki/screens/56-options/) —
  `PrivacyDisclosureModal` component; `state.privacy.disclosureSeenVersion`
  / `currentDisclosureVersion` selectors;
  `ACKNOWLEDGE_PRIVACY_DISCLOSURE` and `OPEN_PRIVACY_POLICY` actions;
  disclosure-section under "Disabled And Error Cases."
- [`54-system-menu`](../architecture/wiki/screens/54-system-menu/) —
  `ErasureReceiptModal` component; `REQUEST_ERASURE_RECEIPT`,
  `OPEN_PRIVACY_POLICY`, `OPEN_PROCESSOR_LIST` actions; cross-links
  to the audit-log + erasure-receipt schemas and to the manual
  erasure process.
- [`64-network-lobby`](../architecture/wiki/screens/64-network-lobby/) —
  new "Peer-Failure Error Contract" section; closed
  `peerFailureReason` enum; signaling-error schema reference.
- **All 75 screens** received the appended boilerplate sentence
  "Errors are produced by `formatUserError(err, locale)` declared in
  `error-formatter.md`; never construct error toast text inline."
  Verified via `grep -L "formatUserError"
  docs/architecture/wiki/screens/*/interactions.md | wc -l` → `0`.

## 7. UI-component-registry additions

- `PrivacyDisclosureModal` (`src/ui/options/privacy-disclosure-modal.tsx`).
- `PrivacyFooter` (`src/ui/menus/privacy-footer.tsx`).
- `ErasureReceiptModal` (`src/ui/system-menu/erasure-receipt-modal.tsx`).

## 8. Edits to existing architecture docs

- [`command-schema.md`](../architecture/command-schema.md) — three new
  rows under "UGC, Privacy & Content-Report Commands"
  (`OPEN_PRIVACY_POLICY`, `REQUEST_ERASURE_RECEIPT`); new
  "Field Visibility (Desync Redaction)" section with worked-example
  table for seven command kinds.
- [`pack-contract.md`](../architecture/pack-contract.md) — § Trust
  Fields cross-link to `crypto-rules.md` and the closed
  `signatureErrorCode` enum.
- [`state-flow.md`](../architecture/state-flow.md) — "Privacy Slice"
  section declaring `state.privacy.acceptedPolicyVersion`,
  `currentDisclosureVersion`, and `replayShareConsent`;
  "Error Sinks" section pinning the formatter as the only sink.
- [`diagrams/24-save-flow.md`](../architecture/diagrams/24-save-flow.md) —
  "Replay Export Sanitization" section consuming the privacy slice
  and the desync redactor; audit-log row written on export.

## 9. Coverage map updates

- [`screen-command-coverage.json`](../architecture/screen-command-coverage.json) —
  five new `outOfScope` rows (`OWNER_NOTICE`, `NETWORK_ERROR`,
  `PROTOCOL_MISMATCH`, `POLICY_ACCEPTED`).
- [`task-command-token-coverage.json`](../architecture/task-command-token-coverage.json) —
  ten new `documentedNonCommandTokens` rows for the closed wire /
  signature / audit-log / peer-failure tokens.

## 10. New tasks

- `mvp.00-core-architecture.22-01-error-formatter-contract`
- `mvp.00-core-architecture.22-02-production-build-policy`
- `mvp.00-core-architecture.22-03-crypto-rules-and-signature-error`
- `mvp.00-core-architecture.22-06-command-field-visibility-and-desync-redaction`
- `mvp.02-content-schemas.40-privacy-and-legal-docs`
- `mvp.02-content-schemas.41-error-and-audit-schemas`
- `mvp.07-ui-shell.25-privacy-footer-and-disclosure-modal`
- `mvp.07-ui-shell.26-erasure-receipt-modal`
- `phase-3.01-multiplayer.20-signaling-observability-and-error-vocabulary`
- `phase-3.01-multiplayer.21-peer-failure-ui-contract`
- `phase-3.01-multiplayer.22-desync-redaction-acceptance`
- `phase-3.02-ai-generation.10-ai-gateway-retention-and-error-codes`

`tasks/task-registry.json` regenerates with **419 tasks, 31 modules**;
all task lints pass.

## 11. Assumptions

- **Task folder choice.** The plan calls for new tasks under
  `tasks/mvp/01-foundations/` but that folder does not exist; the
  closest existing layer is `tasks/mvp/00-core-architecture/`
  (which already houses architecture-contract tasks). The
  foundation-level tasks (22-01, 22-02, 22-03, 22-06) landed
  there; per-surface tasks landed in their natural homes
  (02-content-schemas, 07-ui-shell, phase-3 multiplayer / ai-gen).
- **Token registry.** The plan does not enumerate every
  ALL_CAPS token used by the new screen edits; closed enum values
  (`PROTOCOL_MISMATCH`, `NETWORK_ERROR`, `POLICY_ACCEPTED`,
  `OWNER_NOTICE`, etc.) were registered as
  `documentedNonCommandTokens` so the existing screen / task lints
  pass without inventing new commands.
- **Lint phrasing.** The lint regex for shared-ownership acceptance
  criteria requires the literal `must not … rewrit(e|ing)`; some
  acceptance bullets use the slightly stilted phrasing "must not
  rewrite anything else" to satisfy the regex while making the
  scope clear.

## 12. Blockers

None.

## 13. Verification

- `npm run all` — passes (validate + wiki regenerate +
  task-system-report regenerate).
- `npm test` — 32 / 32 pass.
