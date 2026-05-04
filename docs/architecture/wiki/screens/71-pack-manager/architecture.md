# Screen 71 Architecture: Pack Manager

System: system
Screen ID: pack-manager
Visual Archetype: system-list-dialog
Curation Status: curated-pass-1

## Purpose
Audit installed packs and surface trust / sandbox / revoke / remove
controls. All decisions write to the trust store per
[`pack-trust.md` § Trust Anchors](../../../pack-trust.md#4-trust-anchors).

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Pack Manager"]
  C0["Filter row"]
  Root --> C0
  C1["Installed-pack table"]
  Root --> C1
  C2["Action footer"]
  Root --> C2
```

## Trust-Decision Flow
```mermaid
flowchart LR
  U["User action"] --> A{"Decision kind?"}
  A -- trust --> P["screen 72 prompt"]
  P --> W["GRANT_PACK_TRUST"]
  A -- sandboxed --> S["RUN_PACK_SANDBOXED"]
  A -- revoke --> R["REVOKE_PACK_TRUST"]
  A -- remove --> Rm["REMOVE_PACK"]
  W --> TS["trust-store IndexedDB"]
  S --> TS
  R --> TS
  Rm --> Reg["pack registry"]
  Rm --> TS
```

## State Inputs
- installed -> selectors.packs.installed
- trustStore -> selectors.packs.trustStore
- filter -> state.ui.packManager.filter
- selectedPackId -> state.ui.packManager.selectedPackId
- modeIndicator -> selectors.session.moddedIndicator

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Pack Manager"]
  Current --> T0["72-pack-trust-prompt"]
  Current --> T1["60-confirmation-dialog"]
  Current --> T2["54-system-menu"]
```

## Implementation Contract
- Every install path runs the traversal sanitizer first, then opens
  screen 72 for trust review.
- Trust decisions are keyed on `(packId, contentHash)`; a content
  change re-prompts.
- Safe mode bypasses trust decisions but keeps the manager visible
  for `REMOVE_PACK`.
