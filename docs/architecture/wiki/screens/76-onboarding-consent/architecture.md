# Screen 76 Architecture: Onboarding & Consent

System: system
Screen ID: onboarding-consent
Visual Archetype: curated-tiered-list
Curation Status: curated-pass-1

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md` _(this file)_

### Companion Docs
- [`docs/architecture/onboarding.md`](../../../onboarding.md) —
  canonical flow, policy version, re-prompt rules.
- [`docs/architecture/age-gate.md`](../../../age-gate.md) —
  `config.player.ageGate` lifecycle and feature matrix.
- [`docs/architecture/diagrams/30-onboarding-consent.md`](../../../diagrams/30-onboarding-consent.md)
  — repo-wide onboarding diagram (these screen-local diagrams are
  the runtime view of the same flow).

## Purpose
First-run onboarding screen that captures the age gate and tiered
consent before any network, AI, telemetry, or crash-report surface
becomes reachable. Re-prompts on policy bumps, revocations, and save
imports.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

## Visual Composition
```mermaid
flowchart TD
  Root["Onboarding & Consent Screen"]
  Root --> A["AgeGateRow"]
  Root --> B["RequiredTierGroup"]
  B --> B0["ConsentRow (storage)"]
  Root --> C["OptionalTierGroup"]
  C --> C0["ConsentRow (multiplayer)"]
  C --> C1["ConsentRow (aiGeneration)"]
  C --> C2["ConsentRow (telemetry)"]
  C --> C3["ConsentRow (crashReports)"]
  C --> C4["ConsentRow (analytics)"]
  Root --> D["DisclosureCallouts"]
  Root --> E["ContinueButton"]
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["App boot"] --> L1["Read state.profile.consent.storage.state"]
  L1 -->|"unset"| L2["Mount onboarding"]
  L1 -->|"granted"| L3["Skip"]
  L2 --> L4["Read selectors.onboarding.policyVersion"]
  L4 --> L5["Compose draft from importedSnapshot or defaults"]
  L5 --> L6["Render"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["User toggles rows"] --> I1["SET_CONSENT_DRAFT"]
  I1 --> I2["Continue"]
  I2 --> I3["SET_AGE_GATE"]
  I3 --> I4["Per scope: GRANT_CONSENT / REVOKE_CONSENT"]
  I4 --> I5["RECORD_CONSENT_AUDIT (per transition)"]
  I5 --> I6["Persist state.profile.consent + consentAuditLog"]
  I6 --> I7["Route to caller / 01-main-menu"]
```

## Animation Flow
```mermaid
sequenceDiagram
  participant UI
  participant Draft as UI Draft
  participant Reducer
  participant Persist
  UI->>Draft: toggle scope row
  Draft->>UI: ConsentRow flip
  UI->>Reducer: Continue
  Reducer->>Persist: write consent + audit log
  Persist-->>UI: complete
  UI->>UI: route to caller
```

## Re-Prompt Flow
```mermaid
flowchart TD
  R0["Gated surface entered"] --> R1{"selectFeatureAvailability"}
  R1 -->|"granted"| R2["Allowed"]
  R1 -->|"unset / stale / revoked"| R3["REQUEST_CONSENT_PROMPT"]
  R3 --> R4["Onboarding: pendingScope set"]
  R4 --> R5["User accepts / declines"]
  R5 --> R6["GRANT_CONSENT or REVOKE_CONSENT"]
  R6 --> R7["Caller decides whether to retry"]
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Onboarding & Consent"]
  Current --> T0["Caller screen / 01-main-menu"]
  Current --> T1["Privacy policy modal"]
```

## State Inputs
| UI binding | Source |
| --- | --- |
| `ageGateDraft` | `state.ui.onboarding.ageGateDraft` |
| `consentDraft` | `state.ui.onboarding.consentDraft` |
| `policyVersion` | `selectors.onboarding.policyVersion` |
| `pendingScope` | `state.ui.onboarding.pendingScope` |
| `importedSnapshot` | `state.ui.onboarding.importedSnapshot` |
| `featureAvailability` | `selectors.onboarding.featureAvailability` |

Full state-binding contract lives in `spec.md`; payload contracts in
`data-contracts.md`; action timing in `interactions.md`.

## Implementation Contract
- `mockup.html` carries visual regions only.
- `spec.md` owns components and state bindings.
- `interactions.md` owns controls, timing, command routing,
  disabled states, and error behavior.
- `data-contracts.md` owns schemas, config, localization, asset,
  audio, VFX, save, and replay references.
- Diagrams in this file are screen-specific summaries of the
  contracts above and must not introduce hidden behavior.

---

## 🔍 Sync Check

- **UI: ✔** — Component composition matches sibling `spec.md`
  (component tree) and `mockup.html` (visible rows). The Main
  Interaction Flow diagram mirrors `interactions.md` § Actions
  (`SET_AGE_GATE_DRAFT` → `SET_CONSENT_DRAFT` → `SET_AGE_GATE` →
  per-scope `GRANT_CONSENT` / `REVOKE_CONSENT` → `RECORD_CONSENT_AUDIT`).
- **Schema: ✔** — Diagrams reference only commands defined in
  [`command-schema.md` § Consent, Onboarding & Destructive-UX Commands](../../../command-schema.md#consent-onboarding--destructive-ux-commands)
  and state paths registered in
  [`data-inventory.md`](../../../data-inventory.md). No
  schema-level mismatches.
- **Tasks: ✔** — Owning runtime task
  [`mvp.07-ui-shell.27-onboarding-consent-screen`](../../../../../tasks/mvp/07-ui-shell/27-onboarding-consent-screen.md)
  reads this file under *Read First* and lists every diagrammed
  transition under its acceptance criteria.

## ⚠ Issues

- **Main Interaction Flow now includes the `SET_AGE_GATE` step that
  was previously implicit.** The prior diagram jumped from
  `Continue` straight to `GRANT_CONSENT`, leaving the
  `config.player.ageGate` write unrepresented; the rewrite makes
  it explicit so the diagram matches `interactions.md` and
  [`age-gate.md` § 1](../../../age-gate.md#1-stored-value). No
  behavior change.
- **Re-Prompt Flow's `unset / stale / revoked` branch dispatches
  `REVOKE_CONSENT` for the decline path, which writes `'revoked'`
  rather than the `'denied'` state the audit log claims for
  explicit decline.** Already tracked in
  [`onboarding.md` § ⚠ Issues](../../../onboarding.md) and
  sibling `interactions.md` / `spec.md`; surfaced here so the
  diagram and the textual contract drift together when the gap
  closes.
