# Screen 74 Architecture: AI Provenance Detail

System: system
Screen ID: ai-provenance-detail
Visual Archetype: system-info-modal
Curation Status: curated-pass-1

## Purpose
Player-facing surface for `manifest.aiProvenance`. Read-only.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["AI Provenance Detail"]
  C0["Header"]
  Root --> C0
  C1["Identity section"]
  Root --> C1
  C2["Model section"]
  Root --> C2
  C3["Prompt section"]
  Root --> C3
  C4["Action footer"]
  Root --> C4
```

## Provenance Read
```mermaid
sequenceDiagram
  actor User
  participant Card as Info-card
  participant UI as ProvenanceDetail
  participant Reg as Pack Registry

  User->>Card: Click [AI] badge
  Card->>UI: OPEN_AI_PROVENANCE { packId }
  UI->>Reg: read manifest.aiProvenance
  Reg-->>UI: provenance block
  UI-->>User: render rows (or collapsed if !playerInspectable)
```

## State Inputs
- pack -> selectors.packs.byId(targetPackId)
- provenance -> selectors.packs.aiProvenance(targetPackId)
- inspectable -> selectors.packs.aiProvenance(targetPackId).playerInspectable

## Outgoing Transitions
```mermaid
flowchart LR
  Current["AI Provenance Detail"]
  Current --> T0["Caller info-card"]
  Current --> T1["75-content-report"]
```

## Implementation Contract
- Read-only; never dispatches a gameplay command.
- Truncated prompt excerpt MUST go through the `safeUserText` helper
  per [`ugc-safety.md` § Text Sanitization Contract](../../../ugc-safety.md#3-text-sanitization-contract).
- `playerInspectable === false` collapses the body; `present === false`
  prevents the badge from rendering upstream.
- All copy follows
  [`ugc-safety.md` § Localization Keys](../../../ugc-safety.md#7-localization-keys).
