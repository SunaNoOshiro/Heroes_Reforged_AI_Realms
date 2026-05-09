---
paths:
  - "services/**"
---

# Services (signaling, AI gateway, telemetry)

Optional backend adapters. Live-services machinery is consolidated in
[`docs/operations/services-runtime-rules.md`](../../docs/operations/services-runtime-rules.md):
logger pipeline, channel + retention, spike thresholds, SLOs,
containment runbooks, crash-report rules, metrics-endpoint contract.

## Trust boundary

The "client is fully untrusted" axiom from
[`docs/architecture/trust-boundaries.md`](../../docs/architecture/trust-boundaries.md)
applies here in reverse. Services treat every payload from a client
peer browser as adversarial input. Validate at the named gate **before**
crossing into trusted-core code.

## Disclosure surface

[`SECURITY.md`](../../SECURITY.md) is the disclosure surface. Personal data
flowing through services is bound by the GDPR 72-hour breach trigger
documented there.

## Mutation gate

Module class **services**: floor **75 %**, line coverage 80 %, branch
coverage 70 %.

## Common after-edit commands

```
npm test
npm run test:mutation:changed
```
