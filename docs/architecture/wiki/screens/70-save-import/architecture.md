# Screen 70 Architecture: Save Import

System: system
Screen ID: save-import
Visual Archetype: system-import-dialog
Curation Status: curated-pass-1

## Purpose
Quarantined save-import flow. Ensures schema validate, quarantine
staging, pack disclosure, and trust review all complete before any
slot or pack write.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Save Import"]
  C0["Source disclosure"]
  Root --> C0
  C1["Validation seal"]
  Root --> C1
  C2["Pack disclosure list"]
  Root --> C2
  C3["Compatibility seal"]
  Root --> C3
  C4["Target slot picker"]
  Root --> C4
  C5["Action footer"]
  Root --> C5
```

## Import Pipeline
```mermaid
flowchart LR
  A["Source string"] --> B{"size <= 4 MiB?"}
  B -- no --> Rl["reject: too-large"]
  B -- yes --> R{"ratio <= 1:200?"}
  R -- no --> Rb["reject: bomb"]
  R -- yes --> S{"schema valid?"}
  S -- no --> Sb["reject: schema_invalid"]
  S -- yes --> V{"saveVersion in range?"}
  V -- too-new --> Vn["reject: too-new"]
  V -- below-min --> M{"migration available?"}
  V -- in-range --> Q["quarantine staging"]
  M -- no --> Mn["reject: no-migration"]
  M -- yes --> Q
  Q --> P["pack disclosure"]
  P --> T["trust review (screen 72)"]
  T --> C["compatibility seal"]
  C --> O["overwrite + retention"]
```

## State Inputs
- source -> state.ui.saveImport.source
- stagingState -> state.ui.saveImport.stagingState
- stagedSave -> selectors.persistence.import.staging
- compatibility -> selectors.persistence.selectedSaveCompatibility
- referencedPacks -> selectors.packs.referencedFromStaging
- pendingTrust -> selectors.packs.pendingTrustDecisions
- targetSlot -> state.ui.saveImport.targetSlotId
- overwriteRing -> selectors.persistence.recycle.savedSlots

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Save Import"]
  Current --> T0["72-pack-trust-prompt"]
  Current --> T1["60-confirmation-dialog"]
  Current --> T2["55-save-load"]
```

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled
  states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio,
  VFX, save, and replay references.
- Caps, traversal rules, and trust-anchor lookup precedence are
  pinned in [`pack-trust.md`](../../../pack-trust.md). Do not invent
  per-screen thresholds.
