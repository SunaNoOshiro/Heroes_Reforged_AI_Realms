---
id: "30-onboarding-consent"
title: "Onboarding & Consent Flow"
category: "lifecycle"
short: "30. Onboarding & Consent"
---

First-run onboarding captures consent before any network, AI, telemetry,
or crash-report surface becomes reachable. Per
[`onboarding.md`](../onboarding.md) and screen
[`76-onboarding-consent`](../wiki/screens/76-onboarding-consent/).

```mermaid
flowchart TD
    A[App boot] --> B{consent.storage.state}
    B -->|unset| C[Route to 76-onboarding-consent]
    B -->|granted| Z[Main menu]
    C --> D[Step 1: Age gate]
    D --> E{ageGate}
    E -->|under13| F[Force-deny optional scopes<br/>per age-gate.md matrix]
    E -->|over13| G[Step 2: Required tier]
    F --> G
    G --> H[Step 3: Optional tier rows]
    H --> I{Continue}
    I --> J[GRANT_CONSENT per accepted scope]
    J --> K[RECORD_CONSENT_AUDIT per transition]
    K --> L[Write consent.schema.json + consent-audit-log.schema.json]
    L --> Z
    Z --> M{Reach gated surface}
    M -->|granted & policyVersion match| N[Allowed]
    M -->|unset OR stale policy OR revoked| O[REQUEST_CONSENT_PROMPT]
    O --> C
```

## Re-Prompt Triggers

| Trigger                                          | Outcome                                       |
|--------------------------------------------------|-----------------------------------------------|
| `consent.<scope>.state === 'unset'`              | route through `76-onboarding-consent`        |
| `consent.<scope>.policyVersion < onboarding`     | invalidate `granted`; re-prompt the scope     |
| user revoked from Privacy tab                    | gated surface re-prompts on next entry        |
| save import with `ConsentSnapshot`               | `method: 'import'` re-prompt per scope        |

## Save / Replay Determinism

Consent state is **profile-side**, not gameplay-side:

- Never enters the engine command log.
- Never enters `stateHash` or `canonicalContentHash`.
- Save export embeds `ConsentSnapshot`; import dispatches
  `IMPORT_CONSENT_SNAPSHOT`, which routes through onboarding.
