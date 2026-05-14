# Screen 56: Options
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Options screen for audio, animation speed, combat settings, autosave,
language, accessibility, renderer scale, privacy, consent, and age
gate. Edits a local draft and persists it on Apply; dirty Cancel and
consent revoke route through [`60-confirmation-dialog`](../60-confirmation-dialog/);
re-grant routes through [`76-onboarding-consent`](../76-onboarding-consent/).

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Change tab | `options.tab` | local-ui | Current screen | `SET_OPTIONS_TAB` | Changes visible category. | Tab page slides. |
| Adjust slider / toggle / segmented row | `options.slider` | local-ui | Current screen | `SET_OPTIONS_DRAFT_VALUE` | Updates draft value. | Slider knobs tick, toggles flip. |
| Apply | `options.apply` | command | Current screen | `APPLY_OPTIONS` | Persists allowed settings. | Apply seal glows. |
| Cancel | `options.cancel` | navigation | Caller screen (or `60-confirmation-dialog` if dirty) | `CANCEL_OPTIONS` (clean) or `REQUEST_CONFIRMATION` → `CANCEL_OPTIONS_CONFIRMED` (dirty) | When `selectors.options.hasUnsavedChanges === true`, routes through `60-confirmation-dialog` with `severity: 'info'` (no delay) and the localization keys `options.cancel.confirmTitle` / `options.cancel.confirmBody`. Clean drafts proceed directly. | Cancel restores previous values. |
| Toggle hashed display name | `options.toggleHashedDisplayName` | command | Current screen | `TOGGLE_HASHED_DISPLAY_NAME` | Flips `state.privacy.options.displayNameMode` between `hashed` and `clear`. | Toggle flips; salt-fingerprint row updates. |
| Toggle analytics opt-in | `options.toggleAnalyticsOptIn` | command | Current screen | `TOGGLE_ANALYTICS_OPT_IN` | Flips `state.privacy.options.analyticsOptIn`. v1 loads no SDK; toggle declares the default. | Toggle flips. |
| Toggle mature-content gate | `options.toggleMatureContentGate` | command | Current screen | `TOGGLE_MATURE_CONTENT_GATE` | Flips `state.privacy.options.allowMatureContent`. Binds the same key as the `contentRating` gate. | Toggle flips; pack-trust prompts re-evaluate. |
| Reset analytics ID | `options.resetAnalyticsId` | command | Current screen | `RESET_ANALYTICS_ID` | Regenerates `state.privacy.options.analyticsClientId` if present (no-op until a future analytics integration lands). | Row text replaces with new fingerprint. |
| Forget me on this device | `options.forgetMe` | navigation | `60-confirmation-dialog` | `WIPE_LOCAL_DATA` | Routes through `60-confirmation-dialog` (entry-point row in [`54-system-menu`](../54-system-menu/)) per [`data-inventory.md` § 3 Wipe-Scope Policy](../../../data-inventory.md#3-wipe-scope-policy). On confirm, dispatches `WIPE_LOCAL_DATA scope=all confirmed=true`. | Confirmation modal mounts. |
| Acknowledge privacy disclosure | `options.acknowledgePrivacyDisclosure` | local-ui | Current screen | `ACKNOWLEDGE_PRIVACY_DISCLOSURE` | Sets `state.privacy.disclosureSeenVersion = state.privacy.currentDisclosureVersion`; closes the modal; appends a `POLICY_ACCEPTED` audit-log entry. | Modal fade-out. |
| Open privacy policy | `options.openPrivacyPolicy` | local-ui | _(modal)_ | `OPEN_PRIVACY_POLICY` | Opens an in-app modal rendering [`privacy.md`](../../../privacy.md). Reused affordance from screen 01 footer. | Modal fade-in. |
| Set age gate | `options.privacy.setAgeGate` | command | Current screen | `SET_AGE_GATE` | Updates `config.player.ageGate`; cascades to `selectFeatureAvailability`. Switching to `under13` force-denies every optional-tier consent per [`age-gate.md`](../../../age-gate.md). | `AgeGateRow` flip; minor-strict rows fade. |
| Revoke consent | `options.privacy.revoke` | command | `60-confirmation-dialog` | `REVOKE_CONSENT` | Routes through `60-confirmation-dialog` with `severity: 'critical'` and `requireType: 'REVOKE'`. On confirm, `REVOKE_CONSENT(scope)` is dispatched and, if any data exists for the scope, `REQUEST_DATA_ERASURE(scope)` follows (reuses the existing erasure pipeline). Disabled for `tier: required` rows; tooltip cites `consent.<scope>.revokeRequiresWipe`. | `ConsentRow` fades to `revoked`; audit row appended. |
| Re-grant consent | `options.privacy.regrant` | navigation | `76-onboarding-consent` | `REQUEST_CONSENT_PROMPT` | Routes through onboarding for the targeted scope; entered when the user picks `Re-grant` on a `revoked` row. | Modal pop. |
| View consent history | `options.privacy.viewHistory` | local-ui | Current screen | `OPEN_CONSENT_HISTORY` | Toggles `ConsentHistoryPanel` visibility; reads from `state.profile.consentAuditLog.entries`. | Panel slide-in. |

### State Changes
- `state.ui.options.draft` refreshes `optionsDraft` after every draft mutation.
- `config.audio`, `config.ui`, `config.dev.*`, `config.player.ageGate`, and `state.privacy.options` are written by the corresponding command on Apply or toggle dispatch.
- `selectors.options.gameplayConfigLocks` refreshes `gameplayLocks` whenever phase / setup boundaries change.
- `selectors.options.hasUnsavedChanges` refreshes `dirty` after every draft mutation.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Apply → Caller screen after persistence completes.
- Cancel (clean) → Caller screen directly.
- Cancel (dirty) → `60-confirmation-dialog` → on confirm, `CANCEL_OPTIONS_CONFIRMED` → Caller screen.
- Forget me → `60-confirmation-dialog` → on confirm, `WIPE_LOCAL_DATA`.
- Revoke consent → `60-confirmation-dialog` → on confirm, `REVOKE_CONSENT` (+ `REQUEST_DATA_ERASURE` when data exists).
- Re-grant consent → `76-onboarding-consent` for the targeted scope.
- Open privacy policy → in-place privacy-policy modal.

### Disabled And Error Cases
- Apply stays disabled while `selectors.options.hasUnsavedChanges === false` or when required selectors / registry records fail.
- Settings under `selectors.options.gameplayConfigLocks` are disabled during an active game; tooltip cites the lock reason.
- Revoke is disabled for `tier: required` consent rows; tooltip cites `consent.<scope>.revokeRequiresWipe`.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.
- Errors are produced by `formatUserError(err, locale)` declared in [`error-formatter.md`](../../../error-formatter.md); never construct error toast text inline.

### Privacy Disclosure Modal
- `PrivacyDisclosureModal` opens automatically when
  `state.privacy.disclosureSeenVersion < state.privacy.currentDisclosureVersion`.
- The modal lists every row of [`data-inventory.md`](../../../data-inventory.md)
  (medium, sensitivity tier, retention, wipe coverage) and links to
  [`privacy.md`](../../../privacy.md).
- No analytics SDK loads while
  `state.privacy.options.analyticsOptIn === false`; this is the
  build-mode rule from [`production-build.md` rule 3](../../../production-build.md#3-formatusererror-is-the-only-ui-error-sink).
- Acknowledging the modal records a
  [`POLICY_ACCEPTED`](../../../../../content-schema/schemas/audit-log-entry.schema.json)
  audit-log entry with `policyVersion`.

### Locale Swap
- Switching `language` is **presentation-only** — never a deterministic command, never a command-log entry.
- Apply triggers a `LOCALE_CHANGED` UI event on a side-channel observable; all subscribed selectors re-render.
- Open transient surfaces (tooltips, popovers, hover cards) are dismissed; modals that require a player choice re-render in-place with new strings.
- The `<body>` `dir` attribute toggles for RTL locales; layout uses logical CSS properties (`margin-inline-start` etc.) so no renderer reset is required.
- Save metadata captures `localeAtSave`; loading under a different locale shows no warning (display strings re-resolve normally). See [`edge-cases-policy.md` § 10](../../../edge-cases-policy.md#10-locale-swap-mid-game-q214).

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `data-contracts.md` owns schemas, config keys, localization keys, and audit-log schemas.
- `architecture.md` diagrams mirror these interactions; they do not invent new behavior.

## Error Surfaces

Per [`error-ux.md` § 5](../../../error-ux.md), this screen inherits
the default code → surface mapping from § 2. The table below maps each
action whose `Type` column is `command` to its default surface for
this screen's dominant error domain. A row whose Notes column reads
`override` replaces the § 2 default for that action; otherwise the
default applies. Specific error codes (e.g. `DISPATCHER_<token>`,
`STORAGE_<token>`) land alongside the engine reducer that owns each
command and trigger the gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Apply (`APPLY_OPTIONS`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 `DISPATCHER_*`; disabled control + tooltip on rejection. |

---

## 🔍 Sync Check

- **UI: ✔** — Action / Next Screen / Command columns match sibling [`spec.md`](./spec.md) and [`data-contracts.md`](./data-contracts.md). Forget-me now routes through `60-confirmation-dialog` (entry point in [`54-system-menu`](../54-system-menu/)), resolving the prior narrative drift between this file and [`data-contracts.md`](./data-contracts.md).
- **Schema: ✔** — `state.privacy.options` fields (`displayNameMode`, `analyticsOptIn`, `allowMatureContent`, `saltFingerprint`, optional `analyticsClientId`) match [`privacy-options.schema.json`](../../../../../content-schema/schemas/privacy-options.schema.json); `ConsentScope` and `tier` values match [`consent.schema.json`](../../../../../content-schema/schemas/consent.schema.json); `POLICY_ACCEPTED` matches [`audit-log-entry.schema.json`](../../../../../content-schema/schemas/audit-log-entry.schema.json).
- **Tasks: ✔** — Owning task [`tasks/mvp/07-ui-shell/22-privacy-pane-in-options.md`](../../../../../tasks/mvp/07-ui-shell/22-privacy-pane-in-options.md) Reads this file; downstream tokens (`REVOKE_CONSENT`, `WIPE_LOCAL_DATA`, `OPEN_PRIVACY_POLICY`, `POLICY_ACCEPTED`, `CANCEL_OPTIONS_CONFIRMED`) are registered in [`command-schema.md`](../../../command-schema.md).

## ⚠ Issues

- **`REVEAL_DEVELOPER_TAB` chord-unlock is not surfaced as an action row.** [`command-schema.md`](../../../command-schema.md) registers `REVEAL_DEVELOPER_TAB` as a `56-options` token (chord-unlock per [`developer-mode.md`](../../../developer-mode.md)), but no action row in this table describes the chord. Sibling [`data-contracts.md`](./data-contracts.md) lists `config.dev.placeholderSprites` / `config.dev.enableDebugOverlay`, implying a Developer-tab edit surface exists. Per Hard Prohibition B (do not invent features), the row is not added in this audit. Owner of the developer-mode chord-unlock surface task should add the row and the matching tab to [`spec.md`](./spec.md) § State Bindings.
