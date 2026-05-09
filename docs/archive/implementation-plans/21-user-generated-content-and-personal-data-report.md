# Implementation Report: 21 — User-Generated Content & Personal Data

> Source plan:
> [`21-user-generated-content-and-personal-data-plan.md`](./21-user-generated-content-and-personal-data-plan.md)

This report records the artifacts created and updated when applying
the plan. All eight Critical Fixes and the System Improvements were
landed; `npm run all` and `npm test` both pass.

## 1. New architecture docs

- [`docs/architecture/data-inventory.md`](../../architecture/data-inventory.md) —
  per-field inventory table; sensitivity tiers; wipe-scope policy;
  crash-dump redaction baseline; future social-state and analytics
  policy rows.
- [`docs/architecture/persistence.md`](../../architecture/persistence.md) —
  per-slice IndexedDB mapping; `localStorage` and cookie ban; FS-Access
  policy; token & secret storage rule; analytics rule.
- [`docs/architecture/permissions.md`](../../architecture/permissions.md) —
  closed allowlist of OS / browser APIs; permission-request policy;
  crash-reporting cross-link; CI enforcement.
- [`docs/architecture/ugc-safety.md`](../../architecture/ugc-safety.md) —
  External URL Ban; CSP Baseline; Text Sanitization Contract; ICU
  Locks; Binary Asset Validators; Capability Enforcement;
  Localization Keys.

## 2. New schemas + canonical examples

- [`content-schema/schemas/content-report.schema.json`](../../../content-schema/schemas/content-report.schema.json) +
  [`canonical.content-report.json`](../../../content-schema/examples/content-report/canonical.content-report.json).
- [`content-schema/schemas/privacy-options.schema.json`](../../../content-schema/schemas/privacy-options.schema.json) +
  [`canonical.privacy-options.json`](../../../content-schema/examples/privacy-options/canonical.privacy-options.json).
- New canonical example
  [`canonical.asset-index.json`](../../../content-schema/examples/asset-index/canonical.asset-index.json)
  for the tightened path scheme.

## 3. Schema edits

- `asset-index.schema.json` — closed `pathScheme: "pack-relative"`
  const; closed extension allowlist (`png`, `webp`, `ogg`, `mp3`,
  `json`); regex forbids absolute schemes, leading slashes, and
  parent-directory escapes.
- `manifest.schema.json` — additive `aiProvenance` block (with
  `present`, `providerId`, `modelHint`, `modelVersion`,
  `generatedAt`, `promptHash`, `tokenCount`, `playerInspectable`,
  `promptExcerpt`); `capabilities` now declares
  `default: ["scripts.none"]`.
- `localization.schema.json` — per-key `interpolation` block
  (`mode: literal | named | icu`, `allowedTokens[]`).
- `generated-faction.schema.json` — `notes.playerInspectable`,
  `notes.modelVersion`.
- `save.schema.json` — additive `metadata.displayNameMode`,
  `metadata.playerName`, `metadata.playerHash`,
  `metadata.playerLabel`.
- Updated existing pack examples
  ([`emberwild-faction/assets/index.json`](../../../content-schema/examples/packs/emberwild-faction/assets/index.json),
  [`minimal-pack/assets/index.json`](../../../content-schema/examples/packs/minimal-pack/assets/index.json))
  to include `pathScheme: "pack-relative"`.

## 4. New screen packages (73, 74, 75)

Plan 20 had already claimed screens 70, 71, 72; diagnostics owns
66–69. The new packages were numbered 73–75 and registered in
[`docs/architecture/wiki/screens/index.json`](../../architecture/wiki/screens/index.json)
under `system-dialogs`.

- [`73-ugc-publish-disclaimer/`](../../architecture/wiki/screens/73-ugc-publish-disclaimer/)
  — five-file package; per-pack content-policy ack; routes from
  Map Editor "Publish…" or AI Stage 6.
- [`74-ai-provenance-detail/`](../../architecture/wiki/screens/74-ai-provenance-detail/)
  — five-file package; surfaces `manifest.aiProvenance`;
  routes to screen 75 for "Report this content".
- [`75-content-report/`](../../architecture/wiki/screens/75-content-report/)
  — five-file package; intake form for content-target reports;
  validates against `content-report.schema.json` and persists to
  the local outbound queue.

## 5. Edits to existing screens

- [`54-system-menu`](../../architecture/wiki/screens/54-system-menu/)
  — added `system.forgetMe` action routing through
  `60-confirmation-dialog`; new `WIPE_LOCAL_DATA` command binding;
  new localization keys `ui.privacy.forget-me.*`.
- [`56-options`](../../architecture/wiki/screens/56-options/) —
  added Privacy pane (display-name mode, analytics opt-in,
  mature-content gate, "Reset analytics ID", "Forget me",
  salt-fingerprint read-out); new state binding
  `state.privacy.options`; five new commands
  (`TOGGLE_HASHED_DISPLAY_NAME`, `TOGGLE_ANALYTICS_OPT_IN`,
  `TOGGLE_MATURE_CONTENT_GATE`, `RESET_ANALYTICS_ID`,
  `WIPE_LOCAL_DATA`).
- [`57-high-scores`](../../architecture/wiki/screens/57-high-scores/)
  — display-name policy note; rows render `playerLabel` when
  `displayNameMode === "hashed"` (default).
- [`65-map-editor`](../../architecture/wiki/screens/65-map-editor/)
  — added `editor.publish` action routing through screen 73;
  new `OPEN_PUBLISH_DISCLAIMER` command binding.

## 6. Cross-cutting doc edits

- [`pack-contract.md`](../../architecture/pack-contract.md) — new
  § Capability Enforcement, § Asset Path Scheme, § Override
  Precedence (cross-links to `ugc-safety.md`).
- [`command-schema.md`](../../architecture/command-schema.md) —
  registered 13 new commands under § "UGC, Privacy &
  Content-Report Commands".
- [`schema-matrix.md`](../../architecture/schema-matrix.md) — added
  `ContentReport` and `PrivacyOptions` rows; tightened
  `AssetIndex` row.
- [`content-schema/README.md`](../../../content-schema/README.md) —
  listed the two new schemas.
- [`diagrams/24-save-flow.md`](../../architecture/diagrams/24-save-flow.md)
  — added "Compose metadata" step (displayNameMode →
  playerHash / playerName + playerLabel) and named the IndexedDB
  store (`hr-saves.slots`).
- [`ai-generation-pipeline.md`](../../architecture/ai-generation-pipeline.md)
  — Stage 6 now emits `aiProvenance` and may route through
  screen 73 for "Save and share".
- [`pack-error-codes.md`](../../architecture/pack-error-codes.md) —
  registered `pack.error.asset.external-url`.
- [`screen-command-coverage.json`](../../architecture/screen-command-coverage.json)
  — added `outOfScope` entries for `WIPE_LOCAL_DATA`,
  `ACCEPT_PUBLISH_DISCLAIMER`, `EXPORT_SCENARIO_AS_PACK`,
  `SUBMIT_CONTENT_REPORT`, `ATTACH_CONTENT_REPORT_SCREENSHOT`.
- [`CLAUDE.md`](../../../CLAUDE.md) — appended four read-first doc
  references (data-inventory, persistence, permissions,
  ugc-safety) and three "Protect These Rules" entries
  (inventory registration, permissions allowlist, IndexedDB
  storage).
- [`ui-component-registry.example.json`](../../../content-schema/examples/ui-component-registry.example.json)
  — registered `ForgetMeButton`, `PrivacyPane`, `PublishButton`.
- [`scripts/check-repo-contracts.mjs`](../../../scripts/check-repo-contracts.mjs)
  — added schema-mapping suffixes for the three new example
  filename patterns (`*.content-report.json`,
  `*.privacy-options.json`, `*.asset-index.json`).

## 7. New tasks (16 total)

`tasks/mvp/02-content-schemas/`:
- [32 — safe-user-text helper + JSX/localStorage lint](../../../tasks/mvp/02-content-schemas/32-safe-user-text-helper-and-jsx-lint.md)
- [33 — data-inventory + wipe-scope policy + CI](../../../tasks/mvp/02-content-schemas/33-data-inventory-and-wipe-scope-policy.md)
- [34 — content-report schema](../../../tasks/mvp/02-content-schemas/34-content-report-schema.md)
- [35 — privacy-options schema](../../../tasks/mvp/02-content-schemas/35-privacy-options-schema.md)
- [36 — asset-index pathScheme + extension allowlist](../../../tasks/mvp/02-content-schemas/36-asset-index-pathscheme-and-extension-allowlist.md)
- [37 — localization interpolation block](../../../tasks/mvp/02-content-schemas/37-localization-interpolation-block.md)
- [38 — manifest aiProvenance + capabilities default-deny](../../../tasks/mvp/02-content-schemas/38-manifest-ai-provenance-and-capabilities-default.md)
- [39 — generated-faction playerInspectable + modelVersion](../../../tasks/mvp/02-content-schemas/39-generated-faction-player-inspectable.md)

`tasks/mvp/02b-asset-pipeline/`:
- [17 — binary-asset validators](../../../tasks/mvp/02b-asset-pipeline/17-binary-asset-validators.md)

`tasks/mvp/07-ui-shell/`:
- [22 — Privacy pane in options](../../../tasks/mvp/07-ui-shell/22-privacy-pane-in-options.md)
- [23 — High scores playerLabel render](../../../tasks/mvp/07-ui-shell/23-high-scores-player-label.md)
- [24 — AI-content badge on info-cards](../../../tasks/mvp/07-ui-shell/24-ai-content-badge-on-info-cards.md)

`tasks/mvp/08-persistence/`:
- [13 — display-name hash + per-installation salt](../../../tasks/mvp/08-persistence/13-display-name-hash-and-salt.md)
- [14 — `WIPE_LOCAL_DATA` handler](../../../tasks/mvp/08-persistence/14-wipe-local-data-handler.md)
- [15 — outbound content-report queue](../../../tasks/mvp/08-persistence/15-content-report-queue.md)

`tasks/phase-2/04-content-editor/`:
- [10 — publish disclaimer flow](../../../tasks/phase-2/04-content-editor/10-publish-disclaimer-flow.md)

`tasks/phase-2/05-mod-system/`:
- [12 — content-report intake + local queue](../../../tasks/phase-2/05-mod-system/12-content-report-intake-and-local-queue.md)
- [13 — AI-provenance detail screen wiring](../../../tasks/phase-2/05-mod-system/13-ai-provenance-detail-screen.md)

## 8. Assumptions

- ⚠️ Assumption: The plan's "additive `overrides[]` field" already
  exists in `manifest.schema.json` with a different (more granular)
  shape (`{ target, kind: "replace"|"patch", reason }`). I treated
  the existing field as satisfying the override-precedence
  requirement and added the precedence rule to
  [`pack-contract.md` § Override Precedence](../../architecture/pack-contract.md#override-precedence)
  rather than introducing a duplicate `overrides` field.
- ⚠️ Assumption: Screen numbering — Plan 20 already landed screens
  70 (save-import), 71 (pack-manager), 72 (pack-trust-prompt) and
  the diagnostics group owns 66–69; the new packages were
  numbered 73, 74, 75 (the next free slots).
- ⚠️ Assumption: The plan's CI registry-scan rule for
  `data-inventory.md` is declared by task 33 but the lint script
  itself (`scripts/check-data-inventory-coverage.mjs`) is left
  for that task to author against real `src/persistence/`
  module sources, which do not yet exist in this repo.

## 9. Blockers

- None. All `npm run all` validators and `npm test` pass.

## 10. Validation results

- `npm run validate` — passed (links, contracts, contracts-ts,
  cross-refs, commands, tasks, arch, ui-components,
  animation-budgets, enums, balance, error-codes, provenance,
  runtime-requirements, deferred, diagram-task-parity,
  error-ux, generate:asset-index --check).
- `npm run all` — passed (validate + generate:wiki +
  generate:task-system-report).
- `npm test` — 32/32 tests passing.
