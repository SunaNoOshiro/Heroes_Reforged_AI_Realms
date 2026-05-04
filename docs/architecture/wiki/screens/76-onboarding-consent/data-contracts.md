# Screen 61b: Onboarding & Consent
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `consent.schema.json` | Per-scope consent record persisted under `state.profile.consent[scope]`. | `content-schema/schemas/consent.schema.json` |
| `consent-audit-log.schema.json` | Append-only ring buffer of consent transitions persisted under `state.profile.consentAuditLog`. | `content-schema/schemas/consent-audit-log.schema.json` |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages, scope rationales, and disclosures. | `content-schema/schemas/localization.schema.json` |
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | `content-schema/schemas/asset-index.schema.json` |
| `ruleset.schema.json` | Deterministic constants, formulas, and guard rules consumed by commands. | `content-schema/schemas/ruleset.schema.json` |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `ageGateDraft` | `state.ui.onboarding.ageGateDraft` | `'unknown' \| 'under13' \| 'over13'`. |
| `consentDraft` | `state.ui.onboarding.consentDraft` | `Record<ConsentScope, ConsentRecord>` local draft. |
| `policyVersion` | `selectors.onboarding.policyVersion` | Mirrors `policyVersion` constant in [`onboarding.md`](../../../onboarding.md). |
| `pendingScope` | `state.ui.onboarding.pendingScope` | `null` for first-run; one of `ConsentScope` for targeted re-prompts. |
| `importedSnapshot` | `state.ui.onboarding.importedSnapshot` | Optional `ConsentSnapshot` carried by `IMPORT_CONSENT_SNAPSHOT`. |
| `featureAvailability` | `selectors.onboarding.featureAvailability` | Closed selector consumed by every gated surface; combines age gate and consent state. |

### Commands And Events
- `SET_AGE_GATE_DRAFT` from `onboarding.ageGate`: Updates the age-gate draft.
- `SET_CONSENT_DRAFT` from `onboarding.toggleScope`: Updates the per-scope draft.
- `GRANT_CONSENT` from `onboarding.continue`: Writes a `state: 'granted'` record into `state.profile.consent[scope]` and emits a `RECORD_CONSENT_AUDIT` row. Payload: `{ scope, method }`.
- `REVOKE_CONSENT` from `onboarding.decline` (and from the Privacy tab in `56-options`): Writes `state: 'revoked'` and emits an audit row. Payload: `{ scope, method }`.
- `RECORD_CONSENT_AUDIT` from any consent transition: appends a `ConsentAuditLogEntry` to `state.profile.consentAuditLog.entries`. Payload: `{ scope, fromState, toState, policyVersion, method }`.
- `REQUEST_CONSENT_PROMPT` from any guarded surface: routes to this screen with `pendingScope` set. Payload: `{ scope }`.
- `IMPORT_CONSENT_SNAPSHOT` from the save-import flow: routes to this screen with `importedSnapshot` set. Payload: `{ snapshot: ConsentSnapshot }`.
- `CANCEL_CONSENT_PROMPT` from `onboarding.cancel`: closes the screen without granting; the originating gated action is **not** retried.
- `OPEN_PRIVACY_POLICY` from `onboarding.openPrivacyPolicy`: opens the privacy-policy modal; does not enter the deterministic command log.

### Config Keys
- `config.player.ageGate` — `'unknown' \| 'under13' \| 'over13'`. Default `'unknown'`, treated as `under13` until the user picks.
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`

### Localization Keys
- `consent.<scope>.title`
- `consent.<scope>.body`
- `consent.<scope>.acceptCta`
- `consent.<scope>.declineCta`
- `consent.<scope>.requiredBadge`
- `consent.<scope>.optionalBadge`
- `consent.<scope>.revokeCta`
- `consent.multiplayer.ipDisclosure`
- `consent.aiGeneration.offDeviceDisclosure`
- `consent.telemetry.offByDefault`
- `consent.crashReports.offByDefault`
- `consent.unsignedPacks.sessionAck`
- `ui.onboarding.title`
- `ui.onboarding.continue`
- `ui.onboarding.cancel`
- `ui.onboarding.requiredHeader`
- `ui.onboarding.optionalHeader`
- `ui.onboarding.policyVersionLabel`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.onboarding.background`
- `ui.onboarding.frame`
- `ui.onboarding.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.system.*`
- `vfx.onboarding.*`

### Save And Replay Fields
- `state.profile.consent[*]` and `state.profile.consentAuditLog` are
  **profile-side**, not gameplay-side; they never enter the engine
  command log, `stateHash`, or `canonicalContentHash`.
- Exported saves embed `ConsentSnapshot` (per
  [`consent.schema.json`](../../../../../content-schema/schemas/consent.schema.json));
  imports route through `IMPORT_CONSENT_SNAPSHOT` with `method: 'import'`.

### Validation And Fallback
- Captures consent before gated surfaces activate; never mutates
  deterministic gameplay state.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content
  IDs fail loudly before controls become enabled.
