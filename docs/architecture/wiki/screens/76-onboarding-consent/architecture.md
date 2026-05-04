# Screen 61b Architecture: Onboarding & Consent

System: system
Screen ID: onboarding-consent
Visual Archetype: curated-tiered-list
Curation Status: curated-pass-1

## Purpose
First-run onboarding screen that captures the age gate and tiered
consent before any network, AI, telemetry, or crash-report surface
becomes reachable. Re-prompts on policy bumps, revocations, and save
imports.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

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
  L2 --> L4["Read policyVersion"]
  L4 --> L5["Compose draft from importedSnapshot or defaults"]
  L5 --> L6["Render"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["User toggles rows"] --> I1["SET_CONSENT_DRAFT"]
  I1 --> I2["Continue"]
  I2 --> I3["Per scope: GRANT_CONSENT / REVOKE_CONSENT"]
  I3 --> I4["RECORD_CONSENT_AUDIT"]
  I4 --> I5["Persist state.profile.consent + consentAuditLog"]
  I5 --> I6["Route to caller / 01-main-menu"]
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
- ageGateDraft -> state.ui.onboarding.ageGateDraft
- consentDraft -> state.ui.onboarding.consentDraft
- policyVersion -> selectors.onboarding.policyVersion
- pendingScope -> state.ui.onboarding.pendingScope
- importedSnapshot -> state.ui.onboarding.importedSnapshot
- featureAvailability -> selectors.onboarding.featureAvailability

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled
  states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio,
  VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must
  not introduce hidden behavior.
