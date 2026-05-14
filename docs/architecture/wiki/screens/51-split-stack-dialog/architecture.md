# Screen 51 Architecture: Split Stack Dialog

System: hero
Screen ID: split-stack-dialog
Modal id: `51-split-stack-dialog` (per
[`modal-entry.schema.json` §`modalId`](../../../../../content-schema/schemas/modal-entry.schema.json))
Visual Archetype: curated-split-stack
Curation Status: curated-pass-5

## Purpose
Army stack split dialog used by the hero screen, town garrison, hero
meeting, and garrison structures. Opens as a modal frame on
`state.ui.modalStack`, takes a quantity from the player, dispatches
`SPLIT_ARMY_STACK` on OK (or discards on CANCEL), and refocuses the
caller route on close.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

## Visual Composition
```mermaid
flowchart TD
  Root["Split Stack Dialog"]
  C0["SourceStackPreview"]
  Root --> C0
  C1["QuantitySlider"]
  Root --> C1
  C2["AmountStepper (ONE / MAX)"]
  Root --> C2
  C3["DestinationPreview"]
  Root --> C3
  C4["ConfirmCancelButtons (OK / CANCEL)"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Caller pushes modal frame"] --> L1
  L1["Seed state.ui.splitStack.*"] --> L2
  L2["Resolve source army + destination slot"] --> L3
  L3["Compute selectors.armies.splitStackGuard"] --> L4
  L4["Render Split Stack Dialog"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Drag / ONE / MAX / type"] --> I1
  I1["SET_SPLIT_STACK_* updates draft"] --> I2
  I2["splitStackGuard recomputes; OK enabled/disabled"] --> I3
  I3{"User action"}
  I3 -->|OK| I4["SPLIT_ARMY_STACK reducer"]
  I3 -->|CANCEL| I5["Discard draft"]
  I4 --> I6["Army slots mutate; modal pops"]
  I5 --> I6
  I6 --> I7["Refocus caller route"]
```

## Animation Flow
```mermaid
sequenceDiagram
  participant UI
  participant Draft as state.ui.splitStack
  participant Guard as selectors.armies.splitStackGuard
  participant Reducer
  participant VFX
  UI->>Draft: drag / ONE / MAX / type
  Draft->>Guard: recompute
  Guard-->>UI: enable / disable OK, preview counts
  UI->>VFX: knob tick + count preview
  UI->>Reducer: SPLIT_ARMY_STACK on OK
  Reducer-->>UI: accepted result (army slot mutation) or rejection
  UI->>VFX: sliding badges on success, snap-back on CANCEL
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Split Stack Dialog"]
  Current -->|"OK → SPLIT_ARMY_STACK accepted"| Caller["Caller route (state.ui.splitStack.returnScreen)"]
  Current -->|"CANCEL → discard draft"| Caller
```

## State Inputs
- `sourceStack` → `state.ui.splitStack.sourceStackRef`
- `destinationSlot` → `state.ui.splitStack.destinationSlotRef`
- `quantity` → `state.ui.splitStack.quantity`
- `splitGuard` → `selectors.armies.splitStackGuard`
- `caller` → `state.ui.splitStack.returnScreen` (mirrors
  `modalStack[top].callerRoute`)

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component / state contract.
- Interactions define controls, timing, command routing, disabled
  states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio,
  VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and
  must not introduce hidden behavior.

---

## 🔍 Sync Check

- **UI: ✔** — Components and outgoing transitions agree with sibling
  `spec.md` § Component Tree and `interactions.md` § Navigation
  Outcomes; modal-stack caller-route handling matches
  [`ui-routing.md` § Modal Stack](../../../ui-routing.md#modal-stack).
- **Schema: ✔** — `SPLIT_ARMY_STACK` payload pinned in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json);
  modal id `51-split-stack-dialog` in
  [`modal-entry.schema.json` §`modalId`](../../../../../content-schema/schemas/modal-entry.schema.json).
- **Tasks: ✔** — Reducer task
  [`mvp.05-adventure-map.17-split-army-stack-command`](../../../../../tasks/mvp/05-adventure-map/17-split-army-stack-command.md)
  and UI task
  [`phase-2.07-ui-screen-backlog.51-split-stack-dialog-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/51-split-stack-dialog-screen.md)
  both reference this screen package; no orphan or inverse task drift.

## ⚠ Issues

_None._
