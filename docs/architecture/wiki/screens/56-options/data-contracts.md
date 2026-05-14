# Screen 56: Options
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | `content-schema/schemas/asset-index.schema.json` |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | `content-schema/schemas/localization.schema.json` |
| `privacy-options.schema.json` | Privacy pane state slice (`displayNameMode`, `analyticsOptIn`, `allowMatureContent`, `saltFingerprint`, future `analyticsClientId`). | `content-schema/schemas/privacy-options.schema.json` |
| `consent.schema.json` | Per-scope consent record rendered as `ConsentRowList`. | `content-schema/schemas/consent.schema.json` |
| `consent-audit-log.schema.json` | Ring buffer rendered by `ConsentHistoryPanel`. | `content-schema/schemas/consent-audit-log.schema.json` |
| `audit-log-entry.schema.json` | `POLICY_ACCEPTED` row appended on disclosure ack. | `content-schema/schemas/audit-log-entry.schema.json` |
| `ruleset.schema.json` | Deterministic constants, formulas, and guard rules consumed by commands. | `content-schema/schemas/ruleset.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `optionsDraft` | `state.ui.options.draft` | Local editable settings copy. |
| `audioConfig` | `config.audio` | Music/SFX/voice values. |
| `uiConfig` | `config.ui` | Locale, animation speed, reduced motion, scale. |
| `gameplayLocks` | `selectors.options.gameplayConfigLocks` | Settings locked during active game. |
| `dirty` | `selectors.options.hasUnsavedChanges` | Apply enabled state. |
| `privacyOptions` | `state.privacy.options` | Per [`privacy-options.schema.json`](../../../../../content-schema/schemas/privacy-options.schema.json). |
| `saltFingerprint` | `selectors.privacy.saltFingerprint` | First 4 hex chars of the local salt; verifies that `WIPE_LOCAL_DATA` rotated it. |
| `disclosureSeen` | `state.privacy.disclosureSeenVersion` | Acknowledged disclosure version; gates `PrivacyDisclosureModal`. |
| `currentDisclosure` | `state.privacy.currentDisclosureVersion` | Compile-time disclosure version, mirrored from [`privacy.md`](../../../privacy.md). |
| `consentRecords` | `state.profile.consent` | One [`consent.schema.json`](../../../../../content-schema/schemas/consent.schema.json) record per `ConsentScope`. Surfaced as the `Privacy` tab `ConsentRowList`. |
| `consentAuditLog` | `state.profile.consentAuditLog` | [`consent-audit-log.schema.json`](../../../../../content-schema/schemas/consent-audit-log.schema.json) ring buffer rendered by `ConsentHistoryPanel`. |
| `ageGate` | `config.player.ageGate` | `'unknown' \| 'under13' \| 'over13'`. Driven by `AgeGateRow`. |
| `featureAvailability` | `selectors.onboarding.featureAvailability` | Closed selector merging age gate and consent state per [`onboarding.md`](../../../onboarding.md). |

### Commands And Events

Every token below is registered in
[`command-schema.md`](../../../command-schema.md). Routing-only tokens
(`REQUEST_CONFIRMATION`, `REQUEST_CONSENT_PROMPT`) do not enter the
deterministic engine command log.

| Action | Token | Routing |
| --- | --- | --- |
| Change tab | `SET_OPTIONS_TAB` from `options.tab` | local-ui |
| Adjust draft | `SET_OPTIONS_DRAFT_VALUE` from `options.slider` (and toggle / segmented rows) | local-ui |
| Apply | `APPLY_OPTIONS` from `options.apply` | persists allowed settings |
| Cancel (clean) | `CANCEL_OPTIONS` from `options.cancel` | discards draft |
| Cancel (dirty) | `REQUEST_CONFIRMATION` → `CANCEL_OPTIONS_CONFIRMED` | routes through `60-confirmation-dialog` with `severity: 'info'` |
| Toggle hashed display name | `TOGGLE_HASHED_DISPLAY_NAME` from `options.toggleHashedDisplayName` | flips `state.privacy.options.displayNameMode` |
| Toggle analytics opt-in | `TOGGLE_ANALYTICS_OPT_IN` from `options.toggleAnalyticsOptIn` | flips `state.privacy.options.analyticsOptIn` |
| Toggle mature-content gate | `TOGGLE_MATURE_CONTENT_GATE` from `options.toggleMatureContentGate` | flips `state.privacy.options.allowMatureContent` |
| Reset analytics ID | `RESET_ANALYTICS_ID` from `options.resetAnalyticsId` | regenerates analytics client id (no-op until a future analytics integration lands) |
| Forget me on this device | `WIPE_LOCAL_DATA` from `options.forgetMe` | routes through `60-confirmation-dialog` per [`data-inventory.md` § 3 Wipe-Scope Policy](../../../data-inventory.md#3-wipe-scope-policy) |
| Acknowledge disclosure | `ACKNOWLEDGE_PRIVACY_DISCLOSURE` from `options.acknowledgePrivacyDisclosure` | sets `state.privacy.disclosureSeenVersion = state.privacy.currentDisclosureVersion`; appends `POLICY_ACCEPTED` to the privacy audit log |
| Open privacy policy | `OPEN_PRIVACY_POLICY` from `options.openPrivacyPolicy` | in-app modal rendering [`privacy.md`](../../../privacy.md); local-ui only |
| Set age gate | `SET_AGE_GATE` from `options.privacy.setAgeGate` | writes `config.player.ageGate`; cascades through [`age-gate.md`](../../../age-gate.md) into the consent matrix |
| Revoke consent | `REVOKE_CONSENT` from `options.privacy.revoke` | routes through `60-confirmation-dialog` (`severity: 'critical'`, `requireType: 'REVOKE'`); chains to `REQUEST_DATA_ERASURE(scope)` when applicable |
| Re-grant consent | `REQUEST_CONSENT_PROMPT` from `options.privacy.regrant` | routes through `76-onboarding-consent` for the targeted scope |
| View consent history | `OPEN_CONSENT_HISTORY` from `options.privacy.viewHistory` | toggles `ConsentHistoryPanel`; local-ui only |

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`
- `config.dev.placeholderSprites` — boolean, default `false`. When
  `true`, the renderer substitutes the magenta-checker placeholder
  for any sprite-sheet that fails to decode. Production builds force
  `false` regardless of user value. See
  [`pack-contract.md` § Asset Fallback And Placeholders](../../../pack-contract.md#asset-fallback-and-placeholders).
- `config.dev.enableDebugOverlay` — boolean, default `false`. Gates
  screens 66 (debug overlay) and 67 (animation debug overlay).
  Production builds tree-shake those screens; this flag is the
  runtime safeguard for dev builds.
- `config.persistence.autosaveEnabled` — boolean, default `true`.
  Controls the autosave cadence at every End-Day local turn boundary.
  **Binary on/off only at MVP — there is no user-tunable interval.**
  When `true`, three rotating slots (`auto-1`, `auto-2`, `auto-3`)
  are written non-blockingly per
  [`tasks/mvp/08-persistence/06-autosave.md`](../../../../../tasks/mvp/08-persistence/06-autosave.md).
  During a multiplayer match, this setting is honored only on the
  host machine; peers do not autosave regardless of value.

### Localization Keys
- `ui.options.title`
- `ui.options.actions.*`
- `ui.options.status.*`
- `ui.options.errors.*`
- `options.cancel.confirmTitle`, `options.cancel.confirmBody`
- `ui.privacy.tab.title`
- `ui.privacy.display-name-mode.label`
- `ui.privacy.display-name-mode.hashed`
- `ui.privacy.display-name-mode.clear`
- `ui.privacy.analytics-opt-in.label`
- `ui.privacy.mature-content.label`
- `ui.privacy.salt-fingerprint.label`
- `ui.privacy.reset-analytics-id.label`
- `ui.privacy.forget-me.label`
- `ui.privacy.local-storage-warning`
- `ui.privacy.disclosure.title`
- `ui.privacy.disclosure.body`
- `ui.privacy.disclosure.acknowledge`
- `ui.privacy.disclosure.openPolicy`
- `ui.privacy.consent.tab.title`
- `ui.privacy.consent.row.acceptedAtLabel`
- `ui.privacy.consent.row.policyVersionLabel`
- `ui.privacy.consent.row.revokeCta`
- `ui.privacy.consent.row.regrantCta`
- `ui.privacy.consent.history.openCta`
- `ui.privacy.consent.history.title`
- `ui.privacy.consent.history.empty`
- `consent.<scope>.title`
- `consent.<scope>.body`
- `consent.<scope>.acceptCta`
- `consent.<scope>.declineCta`
- `consent.<scope>.requiredBadge`
- `consent.<scope>.optionalBadge`
- `consent.<scope>.revokeCta`
- `consent.<scope>.revokeRequiresWipe`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.options.background`
- `ui.options.frame`
- `ui.options.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.system.*`
- `vfx.options.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content
  hashes, command inputs, and explicit draft records only when named
  by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor
  blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths,
  localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Apply validates config values, persists presentation settings, and
  only changes gameplay-affecting options at allowed setup boundaries.
- Missing presentation may fall back through the asset resolver.
- Missing gameplay records, invalid commands, and unresolved content
  IDs fail loudly before controls become enabled.

---

## 🔍 Sync Check

- **UI: ✔** — Commands, surfaces, and copy keys match sibling [`interactions.md`](./interactions.md) and [`spec.md`](./spec.md); Cancel-dirty / Revoke / Forget-me all route through [`60-confirmation-dialog`](../60-confirmation-dialog/).
- **Schema: ✔** — Every schema in the Content Schemas And Registries table exists under [`content-schema/schemas/`](../../../../../content-schema/schemas/); enums on `privacy-options.schema.json` (`displayNameMode` `hashed|clear`), `consent.schema.json` (`state`, `tier`, `method`, `ConsentScope`), and `consent-audit-log.schema.json` (capped ring buffer) are reflected verbatim in this file. The `audit-log-entry.schema.json` reference closes the gap previously left by the `POLICY_ACCEPTED` row.
- **Tasks: ✔** — Owning task [`tasks/mvp/07-ui-shell/22-privacy-pane-in-options.md`](../../../../../tasks/mvp/07-ui-shell/22-privacy-pane-in-options.md) lists `privacy-options.schema.json` under Inputs and reads this file; consent / age-gate / disclosure commands are routed to the screens and tasks named in [`command-schema.md`](../../../command-schema.md) (`mvp.07-ui-shell.26-privacy-disclosure-modal`, `mvp.07-ui-shell.27-onboarding-consent-screen`, `mvp.08-persistence.13-wipe-local-data-handler`).

## ⚠ Issues

_None._
