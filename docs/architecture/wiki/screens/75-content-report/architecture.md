# Screen 75 Architecture: Content Report

System: system
Screen ID: content-report
Visual Archetype: system-form-modal
Curation Status: curated-pass-1

## Purpose
Player-facing intake for content-targeting reports. Distinct from
`REPORT_PEER` (chat-safety / Plan 19) which targets behavior; this
screen targets content.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Content Report"]
  C0["Header"]
  Root --> C0
  C1["Target identity"]
  Root --> C1
  C2["Reason picker"]
  Root --> C2
  C3["Notes textarea"]
  Root --> C3
  C4["Screenshot attach"]
  Root --> C4
  C5["Queue count"]
  Root --> C5
  C6["Action footer"]
  Root --> C6
```

## Submit Flow
```mermaid
sequenceDiagram
  actor User
  participant UI as ContentReport
  participant Schema as content-report.schema.json
  participant Q as Outbound Queue (IDB)

  User->>UI: Submit
  UI->>Schema: validate envelope
  Schema-->>UI: ok
  UI->>Q: append record
  Q-->>UI: persisted
  UI-->>User: ack, modal closes
```

## State Inputs
- target -> state.ui.contentReport.target
- reason -> state.ui.contentReport.reason
- notes -> state.ui.contentReport.notes
- screenshotAssetId -> state.ui.contentReport.screenshotAssetId
- queue -> selectors.privacy.outboundReportQueue

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Content Report"]
  Current --> T0["Caller info-card"]
  Current --> T1["71-pack-manager"]
  Current --> T2["74-ai-provenance-detail"]
```

## Implementation Contract
- No network call at v1. The local queue is the dequeue point that
  Plan 30 (moderation backend) will consume.
- Notes are sanitized via `safeUserText(1000)` per
  [`ugc-safety.md` § Text Sanitization Contract](../../../ugc-safety.md#3-text-sanitization-contract).
- Schema validation precedes the IndexedDB write; a validation
  failure surfaces a modal error and preserves the form draft so
  the user can retry.
- All copy follows
  [`ugc-safety.md` § Localization Keys](../../../ugc-safety.md#7-localization-keys).
