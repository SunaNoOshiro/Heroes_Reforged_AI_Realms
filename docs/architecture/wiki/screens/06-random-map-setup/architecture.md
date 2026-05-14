# Screen 06: Random Map Generator Settings — Architecture

System: `menus` · Screen ID: `random-map-setup` · Visual Archetype:
`curated-rmg-setup` · Curation Status: `curated-pass-6`

## Companion Files
- [`mockup.html`](./mockup.html) — visual reference.
- [`spec.md`](./spec.md) — components, bindings.
- [`interactions.md`](./interactions.md) — per-control behavior.
- [`data-contracts.md`](./data-contracts.md) — schemas, config, localization.

## 1. Purpose
Random map generator setup for template, size, player / team matrix,
water, monster strength, seed, and victory options. State bindings,
selectors, and authoritative paths live in
[`spec.md` § 5 State Bindings](./spec.md#5-state-bindings); per-control
behavior and command routing live in
[`interactions.md` § 2 Actions](./interactions.md#2-actions). This file
owns the **screen-specific diagrams** only.

## 2. Visual Direction
Original internal UI contract. Do not use third-party captures, copied
franchise art, or external product pixels as implementation input.

## 3. Visual Composition
```mermaid
flowchart TD
  Root["RandomMapSetup (800 × 600)"]
  Root --> C0["TemplateList"]
  Root --> C1["SizeDifficultyControls"]
  Root --> C2["PlayerTeamMatrix"]
  Root --> C3["SeedField"]
  Root --> C4["ZonePreview"]
  Root --> C5["GenerateBackButtons"]
```

## 4. Screen Load & Data Resolution
```mermaid
flowchart LR
  L0["RMG templates (random-map-template.schema.json)"] --> L1["Pack constraints (faction / world / ruleset)"]
  L1 --> L2["Ruleset (ruleset.schema.json)"]
  L2 --> L3["RMG draft (state.ui.rmg.*)"]
  L3 --> L4["Zone preview (selectors.rmg.templateZonePreview)"]
```

## 5. Main Interaction Flow
```mermaid
flowchart TD
  I0["Template / option / seed input"] --> I1["Local draft validation"]
  I1 --> I2["GENERATE_RANDOM_MAP dispatch"]
  I2 --> I3["Scenario record built (scenario.schema.json)"]
  I3 --> I4["Route to 59-loading-screen"]
```

## 6. Animation Flow
```mermaid
sequenceDiagram
  participant UI
  participant Draft as UI Draft
  participant Guard
  participant Reducer
  participant VFX
  UI->>Draft: SELECT_RMG_TEMPLATE / settings edit
  Draft->>VFX: slider notch, template redraw, zone-preview pulse
  UI->>Guard: ROLL_RMG_SEED / GENERATE_RANDOM_MAP
  Guard->>Reducer: accepted command (schema-backed)
  Reducer-->>UI: authoritative result (seed pinned, scenario built)
  UI->>VFX: Generate fade → 59-loading-screen
```

## 7. Outgoing Transitions
```mermaid
flowchart LR
  Current["06-random-map-setup"]
  Current -->|"GENERATE_RANDOM_MAP accepted"| T0["59-loading-screen"]
  Current -->|"CLOSE_RANDOM_MAP_SETUP (local-ui)"| T1["02-new-game-setup"]
```

## 8. Implementation Contract
- [`mockup.html`](./mockup.html) defines visible regions and data hooks
  only.
- [`spec.md`](./spec.md) defines the component / state contract.
- [`interactions.md`](./interactions.md) defines controls, timing,
  command routing, disabled states, and error behavior.
- [`data-contracts.md`](./data-contracts.md) defines schemas, config,
  localization, asset, audio, VFX, save, and replay references.
- Diagrams in this file are screen-specific summaries of the same
  contract; they must not introduce hidden behavior.

---

## 🔍 Sync Check

- **UI: ✔** — § 3 Visual Composition mirrors the component tree in sibling [`spec.md` § 4 Component Tree](./spec.md#4-component-tree) and the visible regions in [`mockup.html`](./mockup.html) (`data-screen="06-random-map-setup"`, `data-archetype="curated-rmg-setup"`, `data-curation="curated-pass-6"`).
- **Schema: ✔** — § 4 Screen Load and § 5 Main Interaction Flow reference only schemas listed in sibling [`data-contracts.md` § 1 Content Schemas & Registries](./data-contracts.md#1-content-schemas--registries) (`random-map-template`, `ruleset`, `scenario`). No closed-enum claims made here.
- **Tasks: ✔** — Owning task [`phase-2.07-ui-screen-backlog.06-random-map-setup-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/06-random-map-setup-screen.md) reads this file; runtime owner for `ROLL_RMG_SEED` / `GENERATE_RANDOM_MAP` is `mvp.03-map-system.09-random-map-generator-deterministic-runner`.

## ⚠ Issues

- **State-binding duplication demoted to one-line reference.** The previous version of this file carried a § State Inputs block that duplicated the table in sibling [`spec.md` § 5 State Bindings](./spec.md#5-state-bindings). Per [doc-audit § 7](../../../../../.claude/skills/doc-audit/SKILL.md) (no duplicated logic across docs), the canonical statement remains in `spec.md` and this file now only references it in § 1. Meaning preserved; demotion is the only change.
