# Screen 76: Onboarding & Consent
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Companion Docs
- [`docs/architecture/onboarding.md`](../../../onboarding.md) — policy
  version, scope set, canonical flow.
- [`docs/architecture/age-gate.md`](../../../age-gate.md) — `under13`
  force-deny matrix consumed by this screen.
- [`docs/architecture/command-schema.md` § Consent, Onboarding & Destructive-UX Commands](../../../command-schema.md#consent-onboarding--destructive-ux-commands)
  — payload contract for every command this screen dispatches.

### Purpose
First-run capture of the age gate and tiered consent before any
network, AI, telemetry, or crash-report surface becomes reachable.
Re-prompts on policy bumps, revocations, and save imports.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Set age gate | `onboarding.ageGate` | local-ui | Current screen | `SET_AGE_GATE_DRAFT` | Updates `state.ui.onboarding.ageGateDraft`. Drives optional-tier visibility per [`age-gate.md`](../../../age-gate.md). | Row highlight; minor-strict rows fade if `under13`. |
| Toggle scope | `onboarding.toggleScope` | local-ui | Current screen | `SET_CONSENT_DRAFT` | Updates `state.ui.onboarding.consentDraft[scope].state`. | Toggle flip; disclosure callout fades in. |
| Continue | `onboarding.continue` | command | Caller (or `01-main-menu`) | `SET_AGE_GATE`, then per-scope `GRANT_CONSENT` / `REVOKE_CONSENT`, each followed by `RECORD_CONSENT_AUDIT` | Persists `config.player.ageGate` + every `state.profile.consent[scope]` row + audit-log rows. | Frame seal stamps, screen routes back. |
| Decline optional | `onboarding.decline` | command | Current screen | `REVOKE_CONSENT` + `RECORD_CONSENT_AUDIT` (`unset → denied`) | Records explicit decline so the runtime distinguishes "didn't read" from "read and declined". | Toggle flip + audit chime. |
| Cancel re-prompt | `onboarding.cancel` | navigation | Caller screen | `CANCEL_CONSENT_PROMPT` | Closes the screen without granting; the originating gated action is **not** retried. | Modal slide-out. |
| Open privacy policy | `onboarding.openPrivacyPolicy` | local-ui | _(modal)_ | `OPEN_PRIVACY_POLICY` | Opens an in-app modal rendering [`docs/architecture/privacy.md`](../../../privacy.md). | Modal fade-in. |

### State Changes
- `state.ui.onboarding.ageGateDraft` refreshes after
  `SET_AGE_GATE_DRAFT`.
- `state.ui.onboarding.consentDraft[scope]` refreshes after
  `SET_CONSENT_DRAFT`.
- `state.profile.consent[scope]` is written only at `Continue` (or
  per-scope on `REVOKE_CONSENT` / `GRANT_CONSENT` from a re-prompt).
- `state.profile.consentAuditLog.entries[]` is appended for every
  state transition; the ring buffer drops the oldest entry when
  `entries.length > capacity` (default `256` per
  [`consent-audit-log.schema.json`](../../../../../content-schema/schemas/consent-audit-log.schema.json)).
- `state.ui.onboarding.pendingScope` is read-only; set by
  `REQUEST_CONSENT_PROMPT(scope)` and cleared on close.
- `state.ui.onboarding.importedSnapshot` is read-only; set by
  `IMPORT_CONSENT_SNAPSHOT(snapshot)`.
- UI-only hover, focus, selected-row, target cursor, drag ghost, and
  animation frame stay outside deterministic gameplay state.

### Tiered Flow
1. **Age gate** (`AgeGateRow`) — required first. Stored under
   `config.player.ageGate`, **not** under consent (see
   [`age-gate.md` § 1](../../../age-gate.md#1-stored-value)).
2. **Required tier** — `storage` row, pre-accepted with rationale;
   non-revocable from this screen.
3. **Optional tier** — one row per optional scope, default OFF.
   `under13` (and `unknown`, treated as `under13`) force every
   optional-tier row to `state: 'denied'` per the matrix in
   [`age-gate.md` § 2](../../../age-gate.md#2-feature-matrix).

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
| Trigger | Source command / event | `pendingScope` | Pre-fill |
| --- | --- | --- | --- |
| `unset` | first gated action routes here | the requested scope | defaults |
| Stale `policyVersion` | every `granted` scope with `policyVersion < onboarding.policyVersion` is invalidated | first stale scope on entry | prior state, re-confirmation required |
| Revoked from Privacy tab | next entry to the gated surface | the revoked scope | prior state |
| Save import | `IMPORT_CONSENT_SNAPSHOT` | `null` | snapshot rows pre-filled with `method: 'import'`; never auto-granted |

### Out-Of-Scope Scopes
- `unsignedPacks` is `tier: optional`, `method: session` (per-lobby
  ack only — see [`consent.schema.json#/$defs/ConsentScope`](../../../../../content-schema/schemas/consent.schema.json)).
  It is **not** rendered as a row on this screen; the ack is
  dispatched by `ACK_UNSIGNED_PACKS_SESSION` from
  [`64-network-lobby`](../64-network-lobby/) per
  [`command-schema.md`](../../../command-schema.md#consent-onboarding--destructive-ux-commands).

### Disabled And Error Cases
- `Continue` is disabled until the age gate is set
  (`state.ui.onboarding.ageGateDraft !== 'unknown'`).
- The `storage` row is **non-revocable** from this screen; the
  rationale subtitle says revocation requires a wipe of the install
  via `WIPE_LOCAL_DATA scope=profile|all`.
- Missing presentation assets may use resolver fallback. Missing
  gameplay records, invalid commands, and unresolved content IDs
  fail loudly before controls become enabled per
  [`fail-loud.md`](../../../fail-loud.md).
- Errors are produced by `formatUserError(err, locale)` declared in
  [`error-formatter.md`](../../../error-formatter.md); never
  construct error toast text inline.

### Error Surfaces
| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Continue (`GRANT_CONSENT`) | `STORAGE_REJECTED` | inline | `error.storage.rejected.body` | Default per [`error-ux.md` § 2](../../../error-ux.md) `STORAGE_*`; persistence failure keeps the user on this screen. |
| Decline optional (`REVOKE_CONSENT`) | `STORAGE_REJECTED` | inline | `error.storage.rejected.body` | Default per [`error-ux.md` § 2](../../../error-ux.md) `STORAGE_*`. |

### AI Implementation Notes
- This file owns behavior, timing, and command routing.
- `spec.md` owns static regions and state bindings.
- `data-contracts.md` owns schemas, config, localization, and asset
  references.
- `architecture.md` diagrams summarize this contract; they must not
  introduce hidden behavior.

---

## 🔍 Sync Check

- **UI: ✔** — Action IDs, command tokens, and disclosure copy align
  with sibling `spec.md` (component tree), `data-contracts.md`
  (commands & state paths), and `architecture.md` (flow diagrams).
- **Schema: ✔** —
  [`consent.schema.json`](../../../../../content-schema/schemas/consent.schema.json)
  `state` (`unset | granted | revoked | denied`) and `method`
  (`explicit | import | legacy | session`) match the transitions
  listed above; ring-buffer default `256` mirrors
  [`consent-audit-log.schema.json`](../../../../../content-schema/schemas/consent-audit-log.schema.json).
- **Tasks: ✔** — Owning task
  [`mvp.07-ui-shell.27-onboarding-consent-screen`](../../../../../tasks/mvp/07-ui-shell/27-onboarding-consent-screen.md)
  lists this file in *Read First*; every command above is registered
  in
  [`command-schema.md` § Consent, Onboarding & Destructive-UX Commands](../../../command-schema.md#consent-onboarding--destructive-ux-commands)
  and in [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  (`GRANT_CONSENT`, `REVOKE_CONSENT`, `RECORD_CONSENT_AUDIT`,
  `IMPORT_CONSENT_SNAPSHOT`).

## ⚠ Issues

- **`Decline optional` audit transition `unset → denied` cannot
  reach `state.profile.consent[scope].state`.** This row dispatches
  `REVOKE_CONSENT`, which per
  [`command-schema.md`](../../../command-schema.md#consent-onboarding--destructive-ux-commands)
  and
  [`consent.schema.json`](../../../../../content-schema/schemas/consent.schema.json)
  writes `state: 'revoked'`. The schema reserves `'denied'` for
  age-gate or policy-driven default-off; no command writes
  `'denied'` from an explicit decline. Already flagged in
  [`onboarding.md` § ⚠ Issues](../../../onboarding.md); preserved
  here for sibling consistency (Hard Prohibition A — never change
  meaning). Suggested fix: add `DENY_CONSENT { scope, method }` to
  `command-schema.md`, or rewrite onboarding.md § 3 + this row to
  `unset → revoked`. Owning task:
  [`mvp.07-ui-shell.27-onboarding-consent-screen`](../../../../../tasks/mvp/07-ui-shell/27-onboarding-consent-screen.md).
- **`onboarding.continue` was missing the `SET_AGE_GATE` write in
  the prior revision.**
  [`age-gate.md` § 1](../../../age-gate.md#1-stored-value) names
  `SET_AGE_GATE` as the command that persists `config.player.ageGate`;
  the prior interactions table claimed "Persists `config.player.ageGate`"
  on `Continue` but cited only `GRANT_CONSENT`. The rewrite restores
  `SET_AGE_GATE` first in the dispatch sequence; no behavior change,
  only the command name made explicit.
