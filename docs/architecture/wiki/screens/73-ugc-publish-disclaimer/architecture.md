# Screen 73 Architecture: UGC Publish Disclaimer

System: system
Screen ID: ugc-publish-disclaimer
Visual Archetype: system-disclosure-modal
Curation Status: curated-pass-1

## Purpose
Per-pack content-policy ack before any local `.hrmod` export. Records
the ack inside the archive itself so an out-of-band redistribution
still carries the policy acceptance.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["UGC Publish Disclaimer"]
  C0["Header"]
  Root --> C0
  C1["Policy bullets"]
  Root --> C1
  C2["Rights ack row"]
  Root --> C2
  C3["Policy ack row"]
  Root --> C3
  C4["Local-only notice"]
  Root --> C4
  C5["Action footer"]
  Root --> C5
```

## Acceptance + Export Sequence
```mermaid
sequenceDiagram
  actor User
  participant UI as PublishDisclaimer
  participant Pack as PackBuilder
  participant FS as FileSystem

  User->>UI: Toggle rights ack
  User->>UI: Toggle policy ack
  UI-->>User: Export button enabled
  User->>UI: Accept and export
  UI->>Pack: write signed-acks/<contentHash>.json
  Pack->>Pack: zip archive
  Pack->>FS: prompt OS file-picker
  FS-->>UI: destination resolved
  UI-->>User: export complete
```

## State Inputs
- pack -> selectors.publish.candidatePack
- policyVersion -> selectors.publish.policyVersion
- acks -> state.ui.publish.acks
- destination -> state.ui.publish.destination

## Outgoing Transitions
```mermaid
flowchart LR
  Current["UGC Publish Disclaimer"]
  Current --> T0["65-map-editor"]
  Current --> T1["AI Stage 6 caller"]
```

## Implementation Contract
- Both ack checkboxes MUST be true before export enables.
- The ack file lives inside the exported archive — not in the trust
  store, not in any save.
- No network upload at v1. (moderation backend) consumes the
  ack format when authored.
- All copy follows
  [`ugc-safety.md` § Localization Keys](../../../ugc-safety.md#7-localization-keys).
