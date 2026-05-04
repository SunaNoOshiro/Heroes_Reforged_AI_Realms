# Screen 72 Architecture: Pack Trust Prompt

System: system
Screen ID: pack-trust-prompt
Visual Archetype: system-trust-dialog
Curation Status: curated-pass-1

## Purpose
Per-pack trust review with signature-tier ribbon, capability
disclosure, transitive consent, and persistence-scope picker.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Pack Trust Prompt"]
  C0["Identity header"]
  Root --> C0
  C1["Tier ribbon"]
  Root --> C1
  C2["Capability list"]
  Root --> C2
  C3["Transitive rows"]
  Root --> C3
  C4["Scope picker"]
  Root --> C4
  C5["Action footer"]
  Root --> C5
```

## Tier Selection
```mermaid
flowchart LR
  Sig{"manifest.signature?"} -- absent --> Unsigned["tier = unsigned"]
  Sig -- present --> Vf{"signature verifies?"}
  Vf -- no --> Failed["tier = signature-failed (terminal)"]
  Vf -- yes --> Reg{"keyId in publisher registry?"}
  Reg -- yes --> Known["tier = signed-known"]
  Reg -- no --> Unknown["tier = signed-unknown"]
```

## Trust-Decision Write
```mermaid
sequenceDiagram
  actor User
  participant UI as PackTrustPrompt
  participant Anchors as Trust Anchors
  participant TS as Trust Store

  User->>UI: Trust this pack (scope=session)
  UI->>Anchors: revoked? deny? known? prior?
  Anchors-->>UI: prompt user (no prior decision)
  UI->>TS: write entry
  TS-->>UI: ok
  UI-->>User: ribbon updates, modal closes
```

## State Inputs
- pack -> selectors.packs.pendingTrustRequest
- tier -> selectors.packs.signatureTier
- transitive -> selectors.packs.pendingTransitive
- scope -> state.ui.packTrust.scope
- trustStore -> selectors.packs.trustStore

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Pack Trust Prompt"]
  Current --> T0["70-save-import"]
  Current --> T1["71-pack-manager"]
```

## Implementation Contract
- `signature-failed` is terminal — the install/trust control is
  removed entirely.
- Per-transitive consent is required; there is no `Trust all`
  control.
- Decisions are keyed on `(packId, contentHash)`; a content change
  re-prompts.
- All copy follows
  [`pack-trust.md` § Trust & Safety Phrasing](../../../pack-trust.md#7-trust--safety-phrasing).
