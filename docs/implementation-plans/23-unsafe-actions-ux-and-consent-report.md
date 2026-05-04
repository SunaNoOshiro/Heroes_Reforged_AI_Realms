# Implementation Report: 23 — Unsafe Actions UX & Consent

> Source plan:
> [`23-unsafe-actions-ux-and-consent-plan.md`](./23-unsafe-actions-ux-and-consent-plan.md)

This report records the artifacts created and updated when applying
the plan. All four Critical Fixes plus the System Improvements were
landed. `npm run all` and `npm test` both pass.

## 1. New schemas + canonical examples

- [`consent.schema.json`](../../content-schema/schemas/consent.schema.json) —
  per-scope consent record (`storage`, `multiplayer`, `aiGeneration`,
  `telemetry`, `crashReports`, `analytics`, `unsignedPacks`); closed
  `state`, `tier`, `method` enums; embedded `ConsentSnapshot`
  definition for save-import re-prompt.
- [`consent-audit-log.schema.json`](../../content-schema/schemas/consent-audit-log.schema.json) —
  capped (default 256) ring buffer of per-scope consent transitions;
  GDPR Art. 7(1) record-keeping surface.
- [`peer-allowlist.schema.json`](../../content-schema/schemas/peer-allowlist.schema.json) —
  LRU ring of known peers backing the lobby `trustLevel` badge.
- Canonical examples under
  [`content-schema/examples/consent/`](../../content-schema/examples/consent/),
  [`content-schema/examples/consent-audit-log/`](../../content-schema/examples/consent-audit-log/),
  [`content-schema/examples/peer-allowlist/`](../../content-schema/examples/peer-allowlist/).
- All three schemas registered in
  [`schema-matrix.md`](../architecture/schema-matrix.md) and
  [`content-schema/README.md`](../../content-schema/README.md).
- Suffix mapping rows added to
  [`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs)
  for `.consent.json`, `.consent-audit-log.json`,
  `.peer-allowlist.json`.

## 2. Schema extensions

- [`generated-faction.schema.json`](../../content-schema/schemas/generated-faction.schema.json):
  added optional `moderation` block (closed
  `status: pending|passed|failed|skipped`, optional
  `flaggedReasons[]`, `reviewedBy`, `reviewedAt`).
- [`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json):
  added `contentRating.overallRating` enum (`everyone | teen | mature`,
  default `everyone`) consumed by the age-gate filter.

## 3. New architecture docs

- [`docs/architecture/onboarding.md`](../architecture/onboarding.md) —
  policy version, consent scopes, onboarding flow, re-prompt
  triggers, save-import behavior.
- [`docs/architecture/age-gate.md`](../architecture/age-gate.md) —
  `config.player.ageGate`, minor-strict feature matrix,
  `selectFeatureAvailability` selector, pack filter rules.
- [`docs/architecture/undo-policy.md`](../architecture/undo-policy.md) —
  `state.ui.lastDestructive`, `UNDO_LAST_DESTRUCTIVE`,
  `EXPIRE_LAST_DESTRUCTIVE`, 5 s tombstone TTL.
- [`docs/architecture/url-routing.md`](../architecture/url-routing.md) —
  closed query-param list, fragment discipline,
  confirmation-routing rules.
- [`docs/architecture/autoplay-policy.md`](../architecture/autoplay-policy.md) —
  first-gesture unlock, muted-by-default, reduced-motion gate.
- [`docs/architecture/new-install-defaults.md`](../architecture/new-install-defaults.md) —
  inventory of safe defaults for every optional feature.
- [`docs/architecture/developer-mode.md`](../architecture/developer-mode.md) —
  `config.dev.*` keys, chord-unlock, double-confirm, persistent banner.
- [`docs/architecture/peer-trust.md`](../architecture/peer-trust.md) —
  `state.profile.knownPeers` ring buffer, `trustLevel` derivation,
  per-row context menu.
- [`docs/architecture/ai-moderation-contract.md`](../architecture/ai-moderation-contract.md) —
  `moderation.status` carrier and "AI content not yet reviewed" banner.
- [`docs/architecture/storage-contract.md`](../architecture/storage-contract.md) —
  IndexedDB / OPFS pinning + closed file-picker rules.

## 4. New diagram

- [`docs/architecture/diagrams/30-onboarding-consent.md`](../architecture/diagrams/30-onboarding-consent.md) —
  end-to-end onboarding & re-prompt flow; registered under the
  `lifecycle` group in [`diagrams/index.json`](../architecture/diagrams/index.json).

## 5. New screen package

- [`docs/architecture/wiki/screens/76-onboarding-consent/`](../architecture/wiki/screens/76-onboarding-consent/) —
  five-file standard (`mockup.html`, `spec.md`, `interactions.md`,
  `data-contracts.md`, `architecture.md`). Registered in
  [`screens/index.json`](../architecture/wiki/screens/index.json)
  under `system-dialogs`. ⚠️ Renamed from the plan's `61b-` prefix
  because the validator regex requires `[0-9]{2}-` (see Assumptions).

## 6. Screen package extensions

- [`60-confirmation-dialog`](../architecture/wiki/screens/60-confirmation-dialog/):
  promoted `severity` to a load-bearing input gate; added
  `confirmDelayMs`, `requireType`, `typedConfirmText`, `popInComplete`,
  `openedAt` state; documented the per-severity defaults (`info → 0`,
  `warning → 750`, `critical → 1500`) and the `ConfirmEnabled`
  predicate; added `RequireTypeChallenge` component and
  `SET_CONFIRM_TYPED_TEXT` command; added `REQUEST_CONFIRMATION`
  payload schema.
- [`56-options`](../architecture/wiki/screens/56-options/): added
  `Privacy` tab with `ConsentRowList`, `AgeGateRow`,
  `ConsentHistoryPanel`; `Cancel` routes through
  `60-confirmation-dialog (severity: info)` when dirty; added the
  `SET_AGE_GATE` / `REVOKE_CONSENT` / `REQUEST_CONSENT_PROMPT` /
  `OPEN_CONSENT_HISTORY` actions.
- [`55-save-load`](../architecture/wiki/screens/55-save-load/): added
  the soft-delete + undo flow per `undo-policy.md`; new
  `lastDestructive` selector; `DELETE_SAVE_SLOT`,
  `OVERWRITE_SAVE_SLOT`, `UNDO_LAST_DESTRUCTIVE`,
  `EXPIRE_LAST_DESTRUCTIVE` documented.
- [`62-multiplayer-setup`](../architecture/wiki/screens/62-multiplayer-setup/):
  `Host` / `Join` gated by `MultiplayerConsentGate`; IP-exposure
  disclosure pinned to `consent.multiplayer.ipDisclosure`; runtime
  forbidden from instantiating `RTCPeerConnection` until consent is
  granted.
- [`64-network-lobby`](../architecture/wiki/screens/64-network-lobby/):
  `Leave` now routes through `60-confirmation-dialog` with severity by
  phase; `PlayerSlotList` renders a `trustLevel` badge derived from
  `state.profile.knownPeers`; casual lobby gates `Launch` behind
  per-peer unsigned-pack ack; new
  `ADD_PEER_TO_ALLOWLIST` / `REMOVE_PEER_FROM_ALLOWLIST` /
  `RECORD_PEER_CONTACT` / `LEAVE_NETWORK_LOBBY_CONFIRMED` /
  `ACK_UNSIGNED_PACKS_SESSION` commands.
- [`71-pack-manager`](../architecture/wiki/screens/71-pack-manager/):
  `Remove pack` extended with `severity: 'critical'`,
  `confirmDelayMs: 1500`, `requireType: 'UNINSTALL'`.

## 7. Permissions, persistence & data-inventory updates

- [`docs/architecture/permissions.md`](../architecture/permissions.md):
  added the JIT pre-prompt rule, the rationale-copy convention
  (`permission.<scope>.{prompt,rationale,deniedFallback}`), and the
  degradation matrix.
- [`docs/architecture/persistence.md`](../architecture/persistence.md):
  added `hr-profile.consent`, `hr-profile.audit`,
  `hr-profile.knownPeers` stores.
- [`docs/architecture/data-inventory.md`](../architecture/data-inventory.md):
  registered consent records, consent audit log, age gate, and
  known-peers slices.

## 8. Command-schema additions

- [`command-schema.md`](../architecture/command-schema.md): new
  "Consent, Onboarding & Destructive-UX Commands" section listing
  `REQUEST_CONFIRMATION`, `CONFIRM_PENDING_ACTION`,
  `CANCEL_PENDING_CONFIRMATION`, `SET_CONFIRM_TYPED_TEXT`,
  `GRANT_CONSENT`, `REVOKE_CONSENT`, `RECORD_CONSENT_AUDIT`,
  `REQUEST_CONSENT_PROMPT`, `IMPORT_CONSENT_SNAPSHOT`,
  `CANCEL_CONSENT_PROMPT`, `SET_AGE_GATE_DRAFT`, `SET_CONSENT_DRAFT`,
  `SET_AGE_GATE`, `OPEN_CONSENT_HISTORY`,
  `LEAVE_NETWORK_LOBBY_CONFIRMED`, `CANCEL_OPTIONS_CONFIRMED`,
  `UNDO_LAST_DESTRUCTIVE`, `EXPIRE_LAST_DESTRUCTIVE`,
  `ADD_PEER_TO_ALLOWLIST`, `REMOVE_PEER_FROM_ALLOWLIST`,
  `RECORD_PEER_CONTACT`, `ACK_UNSIGNED_PACKS_SESSION`,
  `UNLOCK_MEDIA_AUTOPLAY`, `REVEAL_DEVELOPER_TAB`,
  `REQUEST_PERMISSION_RATIONALE`.
- [`screen-command-coverage.json`](../architecture/screen-command-coverage.json):
  added `outOfScope` rows for the new tokens that surface in
  interactions tables, each pointing at an owning task.

## 9. New tasks

- [`tasks/mvp/02-content-schemas/42-consent-and-peer-allowlist-schemas.md`](../../tasks/mvp/02-content-schemas/42-consent-and-peer-allowlist-schemas.md)
- [`tasks/mvp/07-ui-shell/27-onboarding-consent-screen.md`](../../tasks/mvp/07-ui-shell/27-onboarding-consent-screen.md)
- [`tasks/mvp/07-ui-shell/28-confirmation-dialog-hardening.md`](../../tasks/mvp/07-ui-shell/28-confirmation-dialog-hardening.md)
- [`tasks/mvp/07-ui-shell/29-url-routing-contract.md`](../../tasks/mvp/07-ui-shell/29-url-routing-contract.md)
- [`tasks/mvp/08-persistence/27-undo-soft-delete.md`](../../tasks/mvp/08-persistence/27-undo-soft-delete.md)
- [`tasks/phase-3/01-multiplayer/23-multiplayer-consent-and-trust-display.md`](../../tasks/phase-3/01-multiplayer/23-multiplayer-consent-and-trust-display.md)

## 10. UI component registry

- Added `OnboardingConsentScreen`, `AgeGateRow`, `ConsentRow`,
  `ConsentRowList`, `ConsentHistoryPanel`, `DisclosureCallouts`,
  `OptionalTierGroup`, `RequiredTierGroup`, `RequireTypeChallenge`
  to
  [`content-schema/examples/ui-component-registry.example.json`](../../content-schema/examples/ui-component-registry.example.json).

## 11. Wiki + command-schema cross-links

- [`docs/architecture/wiki/README.md`](../architecture/wiki/README.md):
  required-reading list extended with onboarding, age-gate, undo,
  url-routing, autoplay, new-install-defaults, developer-mode,
  peer-trust, ai-moderation, storage-contract.

## 12. Assumptions

- ⚠️ Assumption: the plan's `61b-onboarding-consent` folder name was
  renamed to `76-onboarding-consent`. The screen-package validator
  regex requires `[0-9]{2}-` prefixes (`scripts/tasks.mjs` and
  `scripts/check-command-coverage.mjs`); a pure numeric prefix is
  the simplest option and matches the existing system-dialogs slot
  range.
- ⚠️ Assumption: the plan's standalone `58-pack-manager` request was
  satisfied by extending the existing `71-pack-manager` screen
  package. The repo already ships that package (per Plan 20); a
  second pack-manager screen would have collided with `58-week-month-popup`.
- ⚠️ Assumption: `manifest.schema.json` already declared
  `contentRating` as a structured advisory object. Rather than
  replacing the field with a flat enum, the plan's enum was added
  as `contentRating.overallRating` — an additive aggregate that the
  age-gate filter reads. Existing manifests remain valid.
- ⚠️ Assumption: localization namespace additions are documented in
  the data-contracts files of the affected screen packages and in
  the plan-cited command-schema entries. The
  [`localization.schema.json`](../../content-schema/schemas/localization.schema.json)
  shape itself is open under `entries`, so no schema change was
  necessary.
- ⚠️ Assumption: CI lint rules called for in the plan
  (`grep`-banning raw `navigator.*`, `<input type="file" webkitdirectory>`,
  undeclared `config.privacy.*` / `config.dev.*` defaults,
  unhardened `severity: critical` confirmations) are referenced by
  the new architecture docs but the lint scripts themselves are
  deferred to the runtime tasks (T-23-A, T-23-Q, T-23-T) that own
  the corresponding code surfaces.

## 13. Verification

- `npm run all` — passes (validate + wiki + task-system report).
- `npm test` — 32 tests, 0 failures.
