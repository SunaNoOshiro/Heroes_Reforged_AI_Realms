# Screen 61b: Onboarding & Consent
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
First-run capture of the age gate and tiered consent before any
network, AI, telemetry, or crash-report surface becomes reachable.
Re-prompts on policy bumps, revocations, and save imports.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Set age gate | `onboarding.ageGate` | local-ui | Current screen | `SET_AGE_GATE_DRAFT` | Updates `state.ui.onboarding.ageGateDraft`. Drives optional-tier visibility per [`age-gate.md`](../../../age-gate.md). | Row highlight; minor-strict rows fade if `under13`. |
| Toggle scope | `onboarding.toggleScope` | local-ui | Current screen | `SET_CONSENT_DRAFT` | Updates `state.ui.onboarding.consentDraft[scope].state`. | Toggle flip; disclosure callout fades in. |
| Continue | `onboarding.continue` | command | Caller (or `01-main-menu`) | `GRANT_CONSENT` (per accepted scope) → `RECORD_CONSENT_AUDIT` (per transition) | Persists `config.player.ageGate` + every `state.profile.consent[scope]` row + audit-log rows. | Frame seal stamps, screen routes back. |
| Decline optional | `onboarding.decline` | command | Caller (or `01-main-menu`) | `REVOKE_CONSENT` / `RECORD_CONSENT_AUDIT` (`unset → denied`) | Records explicit decline so the runtime can distinguish "didn't read" from "read and declined". | Toggle flip + audit chime. |
| Cancel re-prompt | `onboarding.cancel` | navigation | Caller screen | `CANCEL_CONSENT_PROMPT` | Closes the screen without granting; the originating gated action is **not** retried. | Modal slide-out. |
| Open privacy policy | `onboarding.openPrivacyPolicy` | local-ui | _(modal)_ | `OPEN_PRIVACY_POLICY` | Opens an in-app modal rendering [`docs/architecture/privacy.md`](../../../privacy.md). | Modal fade-in. |

### State Changes
- `state.ui.onboarding.ageGateDraft` refreshes after `SET_AGE_GATE_DRAFT`.
- `state.ui.onboarding.consentDraft[scope]` refreshes after `SET_CONSENT_DRAFT`.
- `state.profile.consent[scope]` is written only at `Continue` (or per-scope on `REVOKE_CONSENT` / `GRANT_CONSENT`).
- `state.profile.consentAuditLog.entries[]` is appended for every state transition; the ring buffer drops the oldest entry when over capacity.
- `state.ui.onboarding.pendingScope` is read-only; set by `REQUEST_CONSENT_PROMPT(scope)` and cleared on close.
- `state.ui.onboarding.importedSnapshot` is read-only; set by `IMPORT_CONSENT_SNAPSHOT(snapshot)`.
- UI-only hover, focus, selected row, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Tiered Flow
1. **Age gate** (`AgeGateRow`) — required first. Stored under
   `config.player.ageGate`, not under consent.
2. **Required tier** — `storage` row, pre-accepted with rationale.
3. **Optional tier** — one row per optional scope, default OFF.
   `under13` profiles force every optional-tier row to `denied` per
   the matrix in [`age-gate.md`](../../../age-gate.md).

### IP-Exposure Disclosure
The `multiplayer` row carries the IP-exposure disclosure required
before any peer-to-peer connection. Localization key
`consent.multiplayer.ipDisclosure`. Until the user accepts, the
runtime refuses to open `RTCPeerConnection` per
[`62-multiplayer-setup`](../62-multiplayer-setup/interactions.md).

### Off-Device AI Disclosure
The `aiGeneration` row carries the off-device prompt-transmission
disclosure. Localization key
`consent.aiGeneration.offDeviceDisclosure`. Until the user accepts,
the runtime refuses to call the AI gateway per
[`02-new-game-setup`](../02-new-game-setup/interactions.md).

### Re-Prompt Cases
- **`unset`** — first reachable gated action routes here.
- **Stale `policyVersion`** — every `granted` scope with
  `policyVersion < onboarding.policyVersion` is invalidated; the user
  re-confirms or re-declines.
- **Revoked from Privacy tab** — the next entry to the gated surface
  re-prompts.
- **Save import** — `IMPORT_CONSENT_SNAPSHOT` enters here with
  `method: 'import'`; rows are pre-filled but not auto-granted.

### Disabled And Error Cases
- `Continue` is disabled until the age gate is set.
- The `storage` row is **non-revocable** in this screen; explanatory
  text says revocation requires a wipe of the install.
- Missing presentation assets may use resolver fallback. Missing
  gameplay records, invalid commands, and unresolved content IDs fail
  loudly before controls become enabled.
- Errors are produced by `formatUserError(err, locale)` declared in
  [`docs/architecture/error-formatter.md`](../../../error-formatter.md);
  never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather
  than inventing new behavior.

## Error surfaces

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Continue (`GRANT_CONSENT`) | STORAGE_REJECTED | inline | `error.storage.rejected.body` | Default per `error-ux.md` § 2 STORAGE_*; persistence failure keeps the user on this screen. |
| Decline optional (`REVOKE_CONSENT`) | STORAGE_REJECTED | inline | `error.storage.rejected.body` | Default per `error-ux.md` § 2 STORAGE_*. |
