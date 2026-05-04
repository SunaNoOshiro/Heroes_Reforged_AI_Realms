# Screen 60 Architecture: Confirmation Dialog

System: system
Screen ID: confirmation-dialog
Visual Archetype: curated-confirmation-dialog
Curation Status: curated-pass-6

## Purpose
Reusable confirmation dialog for destructive, irreversible, or route-changing actions.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Confirmation Dialog"]
  C0["DimmedCaller"]
  Root --> C0
  C1["WarningIcon"]
  Root --> C1
  C2["PromptText"]
  Root --> C2
  C3["ConfirmCancelButtons"]
  Root --> C3
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Caller request"] --> L1
  L1["Prompt localization"] --> L2
  L2["Pending payload"] --> L3
  L3["Severity"] --> L4
  L4["Dialog"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Confirm/cancel input"] --> I1
  I1["Pending action guard"] --> I2
  I2["Dispatch or clear"] --> I3
  I3["Destination/caller route"] --> I4
  I4["Caller refresh"]
```

## Animation Flow
```mermaid
sequenceDiagram
  participant UI
  participant Draft as UI Draft
  participant Guard
  participant Reducer
  participant VFX
  UI->>Draft: hover/select/preview
  Draft->>VFX: Modal pop
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Caller transition
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Confirmation Dialog"]
  Current --> T0["Pending destination"]
  Current --> T1["Caller screen"]
```

## State Inputs
- pendingAction -> state.ui.confirmation.pendingAction
- promptKey -> state.ui.confirmation.promptKey
- callerRoute -> state.ui.confirmation.callerRoute
- confirmPayload -> state.ui.confirmation.payload
- severity -> state.ui.confirmation.severity
- openedAt -> state.ui.confirmation.openedAt
- confirmDelayMs -> state.ui.confirmation.confirmDelayMs
- requireType -> state.ui.confirmation.requireType
- typedConfirmText -> state.ui.confirmation.typedConfirmText
- popInComplete -> state.ui.confirmation.popInComplete

## Click-Through Resistance Flow
```mermaid
flowchart LR
  R0["REQUEST_CONFIRMATION"] --> R1["Apply severity defaults"]
  R1 --> R2["Mount modal at openedAt = now()"]
  R2 --> R3["popIn animation"]
  R3 -->|"end-frame"| R4["popInComplete = true"]
  R2 --> R5["delay timer<br/>(confirmDelayMs)"]
  R5 -->|"elapsed"| R6["delay satisfied"]
  R2 --> R7{"requireType?"}
  R7 -->|"yes"| R8["RequireTypeChallenge"]
  R8 -->|"text == requireType"| R9["challenge satisfied"]
  R4 & R6 & R9 --> R10["ConfirmEnabled = true"]
```

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
