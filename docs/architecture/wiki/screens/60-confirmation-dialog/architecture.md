# Screen 60 Architecture: Confirmation Dialog

System: system
Screen ID: confirmation-dialog
Visual Archetype: curated-confirmation-dialog
Curation Status: curated-pass-6

## Purpose
Reusable confirmation dialog for destructive, irreversible, or
route-changing actions. Diagrams here mirror the behaviour in
sibling [`interactions.md`](./interactions.md) and the bindings in
sibling [`spec.md`](./spec.md); they introduce no new behaviour.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

## Visual Composition
```mermaid
flowchart TD
  Root["ConfirmationDialog"]
  C0["DimmedCaller"]
  Root --> C0
  C1["WarningIcon"]
  Root --> C1
  C2["PromptText"]
  Root --> C2
  C3["RequireTypeChallenge<br/>(requireType != null)"]
  Root --> C3
  C4["ConfirmCancelButtons"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Caller dispatches<br/>REQUEST_CONFIRMATION"] --> L1
  L1["Apply per-severity defaults<br/>(confirmDelayMs, requireType)"] --> L2
  L2["Mount modal<br/>openedAt = now()"] --> L3
  L3["Resolve promptKey<br/>via localization"] --> L4
  L4["Dialog visible"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Confirm / Cancel / Esc input"] --> I1
  I1{"ConfirmEnabled?"}
  I1 -->|"confirm + true"| I2["Dispatch pendingAction"]
  I1 -->|"confirm + false"| I0
  I0 -->|"cancel / Esc"| I3["CANCEL_PENDING_CONFIRMATION"]
  I2 --> I4["Caller reducer resolves<br/>then route to pending destination"]
  I3 --> I5["Route to callerRoute"]
```

## Animation Flow
```mermaid
sequenceDiagram
  participant UI
  participant Draft as UI Draft
  participant Guard as ConfirmEnabled
  participant Reducer
  participant VFX
  UI->>Draft: hover / typedConfirmText input
  Draft->>VFX: Modal pop-in (sets popInComplete on end-frame)
  UI->>Guard: confirm.accept
  Guard->>Reducer: pendingAction (if predicate holds)
  Reducer-->>UI: authoritative result
  UI->>VFX: Caller transition animation
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Confirmation Dialog"]
  Current --> T0["Pending destination<br/>(after confirm)"]
  Current --> T1["Caller screen<br/>(after cancel / Esc)"]
```

## State Inputs
- `pendingAction` → `state.ui.confirmation.pendingAction`
- `promptKey` → `state.ui.confirmation.promptKey`
- `callerRoute` → `state.ui.confirmation.callerRoute`
- `confirmPayload` → `state.ui.confirmation.payload`
- `severity` → `state.ui.confirmation.severity`
- `openedAt` → `state.ui.confirmation.openedAt`
- `confirmDelayMs` → `state.ui.confirmation.confirmDelayMs`
- `requireType` → `state.ui.confirmation.requireType`
- `typedConfirmText` → `state.ui.confirmation.typedConfirmText`
- `popInComplete` → `state.ui.confirmation.popInComplete`

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
- `mockup.html` defines visual regions and data hooks only.
- `spec.md` defines the component / state contract.
- `interactions.md` defines controls, timing, command routing,
  disabled states, and error behaviour.
- `data-contracts.md` defines schemas, config, localization, asset,
  audio, VFX, save, and replay references.
- Diagrams in this file are screen-specific summaries of those same
  contracts and MUST NOT introduce hidden behaviour.

---

## 🔍 Sync Check

- **UI: ✔** — Visual Composition tree now matches sibling [`spec.md` § Component Tree](./spec.md#component-tree) (added the `RequireTypeChallenge` node that the prior revision omitted); Z-layer / styling claims live in `spec.md` per the package convention.
- **Schema: ✔** — `REQUEST_CONFIRMATION` and the click-through flow match the payload and per-severity defaults in [`command-schema.md` § Consent, Onboarding & Destructive-UX Commands](../../../command-schema.md#consent-onboarding--destructive-ux-commands) and sibling [`spec.md` § Click-Through Resistance](./spec.md#click-through-resistance).
- **Tasks: ✔** — Diagrams reflect the `ConfirmEnabled` predicate enforced by [`mvp.07-ui-shell.28-confirmation-dialog-hardening`](../../../../../tasks/mvp/07-ui-shell/28-confirmation-dialog-hardening.md); owning screen task [`phase-2.07-ui-screen-backlog.60-confirmation-dialog-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/60-confirmation-dialog-screen.md) Reads First this file.

## ⚠ Issues

- **Visual Composition reconciled with sibling `spec.md`.** The previous revision's `Visual Composition` Mermaid tree listed only four child nodes (`DimmedCaller`, `WarningIcon`, `PromptText`, `ConfirmCancelButtons`) and omitted `RequireTypeChallenge`, which sibling [`spec.md` § Component Tree](./spec.md#component-tree) and [`data-contracts.md` § Runtime State Selectors](./data-contracts.md#runtime-state-selectors) both require for the `requireType != null` flow. Added the node with its mount condition labelled inline. No code or contract change implied — the component already exists in the spec.
