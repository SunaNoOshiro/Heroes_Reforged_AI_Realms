# Screen 76: Onboarding & Consent
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Companion Docs
- [`docs/architecture/onboarding.md`](../../../onboarding.md) — policy
  version, scope set, storage table.
- [`docs/architecture/age-gate.md`](../../../age-gate.md) —
  `config.player.ageGate` lifecycle.
- [`docs/architecture/data-inventory.md`](../../../data-inventory.md)
  — persisted-field registry.
- [`docs/architecture/command-schema.md` § Consent, Onboarding & Destructive-UX Commands](../../../command-schema.md#consent-onboarding--destructive-ux-commands)
  — command payload contract.

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `consent.schema.json` | Per-scope consent record persisted under `state.profile.consent[scope]`. | [`content-schema/schemas/consent.schema.json`](../../../../../content-schema/schemas/consent.schema.json) |
| `consent-audit-log.schema.json` | Append-only ring buffer (default capacity `256`) of consent transitions persisted under `state.profile.consentAuditLog`. | [`content-schema/schemas/consent-audit-log.schema.json`](../../../../../content-schema/schemas/consent-audit-log.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages, scope rationales, and disclosures. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `ruleset.schema.json` | Deterministic constants and guard rules consumed by commands. | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |

`ConsentScope` enum (closed):
`storage | multiplayer | aiGeneration | telemetry | crashReports | analytics | unsignedPacks`.
`unsignedPacks` is `method: session` and not rendered here — see
`interactions.md` § Out-Of-Scope Scopes.

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `ageGateDraft` | `state.ui.onboarding.ageGateDraft` | `'unknown' \| 'under13' \| 'over13'`. |
| `consentDraft` | `state.ui.onboarding.consentDraft` | `Record<ConsentScope, ConsentRecord>` local draft. |
| `policyVersion` | `selectors.onboarding.policyVersion` | Mirrors the `policyVersion` constant in [`onboarding.md` § 1](../../../onboarding.md#1-policy-version). |
| `pendingScope` | `state.ui.onboarding.pendingScope` | `null` on first-run; one of `ConsentScope` for targeted re-prompts. |
| `importedSnapshot` | `state.ui.onboarding.importedSnapshot` | Optional `ConsentSnapshot` carried by `IMPORT_CONSENT_SNAPSHOT`. |
| `featureAvailability` | `selectors.onboarding.featureAvailability` | Closed selector consumed by every gated surface; combines age-gate matrix and consent state per [`age-gate.md` § 3](../../../age-gate.md#3-canonical-selector). |

### Commands And Events
All commands are dispatched against the persistence/runtime adapter
and **do not** enter the deterministic engine command log per
[`command-schema.md` § Consent, Onboarding & Destructive-UX Commands](../../../command-schema.md#consent-onboarding--destructive-ux-commands).

| Command | Action Source | Payload | Effect |
| --- | --- | --- | --- |
| `SET_AGE_GATE_DRAFT` | `onboarding.ageGate` | `{ value }` | Updates the age-gate draft. |
| `SET_AGE_GATE` | `onboarding.continue` | `{ value }` | Writes `config.player.ageGate`; cascades to `selectFeatureAvailability` per [`age-gate.md`](../../../age-gate.md). |
| `SET_CONSENT_DRAFT` | `onboarding.toggleScope` | `{ scope, state }` | Updates the per-scope draft. |
| `GRANT_CONSENT` | `onboarding.continue` | `{ scope, method }` | Writes `state: 'granted'` into `state.profile.consent[scope]` and emits `RECORD_CONSENT_AUDIT`. |
| `REVOKE_CONSENT` | `onboarding.decline`, Privacy tab in `56-options` | `{ scope, method }` | Writes `state: 'revoked'` and emits `RECORD_CONSENT_AUDIT`. |
| `RECORD_CONSENT_AUDIT` | any consent transition | `{ scope, fromState, toState, policyVersion, method }` | Appends a `ConsentAuditLogEntry` to `state.profile.consentAuditLog.entries`. |
| `REQUEST_CONSENT_PROMPT` | guarded surfaces | `{ scope }` | Routes to this screen with `pendingScope` set. |
| `IMPORT_CONSENT_SNAPSHOT` | save-import flow | `{ snapshot: ConsentSnapshot }` | Routes to this screen with `importedSnapshot` set; never auto-grants. |
| `CANCEL_CONSENT_PROMPT` | `onboarding.cancel` | _(none)_ | Closes the screen without granting; the originating gated action is **not** retried. |
| `OPEN_PRIVACY_POLICY` | `onboarding.openPrivacyPolicy` | _(none)_ | Opens the privacy-policy modal; local-ui only. |

### Config Keys
- `config.player.ageGate` — `'unknown' \| 'under13' \| 'over13'`.
  Default `'unknown'`, treated as `under13` until the user picks
  (per [`age-gate.md` § 1](../../../age-gate.md#1-stored-value)).
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`

### Localization Keys
- Per-scope (one entry per row rendered on this screen):
  - `consent.<scope>.title`
  - `consent.<scope>.body`
  - `consent.<scope>.acceptCta`
  - `consent.<scope>.declineCta`
  - `consent.<scope>.requiredBadge`
  - `consent.<scope>.optionalBadge`
  - `consent.<scope>.revokeCta`
- Specific disclosures:
  - `consent.multiplayer.ipDisclosure`
  - `consent.aiGeneration.offDeviceDisclosure`
  - `consent.telemetry.offByDefault`
  - `consent.crashReports.offByDefault`
  - `consent.unsignedPacks.sessionAck` (rendered by
    [`64-network-lobby`](../64-network-lobby/), **not** this screen).
- Screen chrome:
  - `ui.onboarding.title`
  - `ui.onboarding.continue`
  - `ui.onboarding.cancel`
  - `ui.onboarding.requiredHeader`
  - `ui.onboarding.optionalHeader`
  - `ui.onboarding.policyVersionLabel`
- Common controls:
  - `ui.common.ok`, `ui.common.cancel`, `ui.common.back`,
    `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.onboarding.background`
- `ui.onboarding.frame`
- `ui.onboarding.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.system.*`
- `vfx.onboarding.*`

### Save And Replay Fields
- `state.profile.consent[*]`, `state.profile.consentAuditLog`, and
  `config.player.ageGate` are **profile-side**, not gameplay-side;
  they never enter the engine command log, `stateHash`, or
  `canonicalContentHash`. All three are registered in
  [`data-inventory.md`](../../../data-inventory.md) (`consent
  records`, `consent audit log`, `age gate`).
- Exported saves embed `ConsentSnapshot` per
  [`consent.schema.json#/$defs/ConsentSnapshot`](../../../../../content-schema/schemas/consent.schema.json);
  imports route through `IMPORT_CONSENT_SNAPSHOT` with
  `method: 'import'`.
- `WIPE_LOCAL_DATA scope=profile|all` wipes all three slices per
  [`data-inventory.md` § 3](../../../data-inventory.md#3-wipe-scope-policy).

### Validation And Fallback
- Captures consent before gated surfaces activate; never mutates
  deterministic gameplay state.
- Missing presentation assets may fall back through the asset
  resolver.
- Missing gameplay records, invalid commands, and unresolved content
  IDs fail loudly before controls become enabled per
  [`fail-loud.md`](../../../fail-loud.md).

---

## 🔍 Sync Check

- **UI: ✔** — Command table, state selectors, and localization
  keys align with sibling `spec.md` (state bindings) and
  `interactions.md` (action routing + error surfaces). The
  `unsignedPacks` clarification matches schema and
  `interactions.md` § Out-Of-Scope Scopes.
- **Schema: ✔** —
  [`consent.schema.json`](../../../../../content-schema/schemas/consent.schema.json)
  (`ConsentScope`, `state`, `method`, `tier`, `ConsentSnapshot`) and
  [`consent-audit-log.schema.json`](../../../../../content-schema/schemas/consent-audit-log.schema.json)
  (capacity default `256`) match every claim above. Both rows
  registered in
  [`schema-matrix.md`](../../../schema-matrix.md) (`Consent`,
  `ConsentAuditLog`).
- **Tasks: ✔** —
  [`mvp.07-ui-shell.27-onboarding-consent-screen`](../../../../../tasks/mvp/07-ui-shell/27-onboarding-consent-screen.md)
  is the runtime owner; commands above appear in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  (`GRANT_CONSENT`, `REVOKE_CONSENT`, `RECORD_CONSENT_AUDIT`,
  `IMPORT_CONSENT_SNAPSHOT`) and are defined in
  [`command-schema.md` § Consent, Onboarding & Destructive-UX Commands](../../../command-schema.md#consent-onboarding--destructive-ux-commands).

## ⚠ Issues

- **`SET_CONSENT_DRAFT` payload shape was missing from the prior
  revision.** The previous data-contracts file listed the command
  without payload; the rewrite restores `{ scope, state }` to match
  the state-binding shape (`Record<ConsentScope, ConsentRecord>`)
  and the `onboarding.toggleScope` action in `interactions.md`. No
  contract change.
- **`consent.unsignedPacks.sessionAck` is listed for completeness
  but is rendered elsewhere.** The prior file mixed it with the
  per-row keys without disambiguation; clarified to point at
  [`64-network-lobby`](../64-network-lobby/) per
  [`consent.schema.json`](../../../../../content-schema/schemas/consent.schema.json)
  `ConsentScope` description (`method: session`).
