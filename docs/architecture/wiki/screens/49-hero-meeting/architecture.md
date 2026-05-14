# Screen 49 Architecture: Hero Meeting

- System: `hero`
- Screen ID: `hero-meeting`
- Visual Archetype: `curated-hero-meeting`
- Curation Status: `curated-pass-5`

Companion files:
[`spec.md`](./spec.md),
[`interactions.md`](./interactions.md),
[`data-contracts.md`](./data-contracts.md),
[`mockup.html`](./mockup.html).

## Purpose

Adventure-map meeting modal between two friendly heroes on the same
or adjacent tile. Used to exchange army stacks and artifacts.

## Visual Direction

Original internal UI contract. Do not use third-party captures,
copied franchise art, or external product pixels as implementation
input.

## 1. Visual Composition

```mermaid
flowchart TD
  Root["HeroMeetingScreen"]
  Root --> C0["LeftHeroPanel"]
  Root --> C1["RightHeroPanel"]
  Root --> C2["ArmyTransferRows"]
  Root --> C3["ArtifactTransferStrips"]
  Root --> C4["DragLayer"]
  Root --> C5["CloseButton"]
```

## 2. Screen Load And Data Resolution

```mermaid
flowchart LR
  L0["Meeting trigger"] --> L1["Left hero"]
  L1 --> L2["Right hero"]
  L2 --> L3["Transfer rules"]
  L3 --> L4["Meeting view"]
```

## 3. Main Interaction Flow

```mermaid
flowchart TD
  I0["Drag/drop input"] --> I1["Ownership/capacity guard"]
  I1 --> I2["Transfer command"]
  I2 --> I3["Hero records update"]
  I3 --> I4["Slot feedback"]
```

## 4. Animation Flow

```mermaid
sequenceDiagram
  participant UI
  participant Draft as UI Draft
  participant Guard
  participant Reducer
  participant VFX
  UI->>Draft: hover/select/preview
  Draft->>VFX: Drag ghost
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Snap back
```

## 5. Outgoing Transitions

```mermaid
flowchart LR
  Current["Hero Meeting"]
  Current --> T0["07-adventure-map"]
```

## 6. State Inputs

| Binding | Source | Notes |
| --- | --- | --- |
| `leftHero` | `state.ui.heroMeeting.leftHeroId` | First friendly hero. |
| `rightHero` | `state.ui.heroMeeting.rightHeroId` | Second friendly hero. |
| `leftArmy` | `state.heroes.byId[left].army` | Left hero stacks. |
| `rightArmy` | `state.heroes.byId[right].army` | Right hero stacks. |
| `dragDraft` | `state.ui.heroMeeting.dragDraft` | Local transfer draft. |

Canonical binding definitions live in
[`spec.md` § State Bindings](./spec.md#state-bindings) and
[`data-contracts.md` § Runtime State Selectors](./data-contracts.md#runtime-state-selectors).

## 7. Implementation Contract

- [`mockup.html`](./mockup.html) defines visual regions and data
  hooks only.
- [`spec.md`](./spec.md) owns components and state bindings.
- [`interactions.md`](./interactions.md) owns controls, timing,
  command routing, disabled states, and error surfaces.
- [`data-contracts.md`](./data-contracts.md) owns schemas, config,
  localization, asset, audio, VFX, save, and replay references.
- Diagrams in this file are screen-specific summaries of those
  contracts and must not introduce hidden behavior.

---

## 🔍 Sync Check

- **UI: ✔** — Components (`LeftHeroPanel`, `RightHeroPanel`, `ArmyTransferRows`, `ArtifactTransferStrips`, `DragLayer`, `CloseButton`) match [`spec.md` § Component Tree](./spec.md#component-tree) and the modal regions in [`mockup.html`](./mockup.html) (two hero panels, two army rows, exchange arrow, `CLOSE` button).
- **Schema: ✔** — `TRANSFER_HERO_ARMY_STACK` and `TRANSFER_HERO_ARTIFACT` defined in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) (lines 1516, 1611); UI-local tokens (`START_HERO_MEETING_DRAG`, `CLOSE_HERO_MEETING`) match the `START_` / `CLOSE_` prefixes in [`screen-command-coverage.json`](../../../screen-command-coverage.json) `localUiPrefixes`.
- **Tasks: ✔** — Owning UI task [`phase-2.07-ui-screen-backlog.49-hero-meeting-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/49-hero-meeting-screen.md) Reads First all four sibling files; owning reducer tasks [`mvp.05-adventure-map.18-transfer-stack-commands`](../../../../../tasks/mvp/05-adventure-map/18-transfer-stack-commands.md) and [`phase-2.01-spells-artifacts.05b-transfer-hero-artifact-command`](../../../../../tasks/phase-2/01-spells-artifacts/05b-transfer-hero-artifact-command.md) name the two write commands in their Outputs.

## ⚠ Issues

_None — sibling `spec.md` carries one trailer issue (Visual Contract demotion of "split/swap controls"); see [`spec.md` § ⚠ Issues](./spec.md#-issues)._
