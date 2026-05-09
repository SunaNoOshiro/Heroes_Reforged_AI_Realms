# Onboarding & Consent Screen

Module: [UI Shell](../07-ui-shell.md)

Description:
Implement screen
[`76-onboarding-consent`](../../../docs/architecture/wiki/screens/76-onboarding-consent/) —
first-run onboarding screen that captures the age gate and tiered
consent before any network, AI, telemetry, or crash-report surface
becomes reachable. Re-prompts on policy bumps, revocations, and save
imports per
[`docs/architecture/onboarding.md`](../../../docs/architecture/onboarding.md).


Read First:
- `docs/architecture/wiki/screens/76-onboarding-consent/spec.md`
- `docs/architecture/wiki/screens/76-onboarding-consent/interactions.md`
- `docs/architecture/wiki/screens/76-onboarding-consent/data-contracts.md`
- `docs/architecture/wiki/screens/76-onboarding-consent/architecture.md`
- `docs/architecture/wiki/screens/76-onboarding-consent/mockup.html`
- [`docs/architecture/onboarding.md`](../../../docs/architecture/onboarding.md)
- [`docs/architecture/age-gate.md`](../../../docs/architecture/age-gate.md)
- [`docs/architecture/diagrams/30-onboarding-consent.md`](../../../docs/architecture/diagrams/30-onboarding-consent.md)

Inputs:
- `consent.schema.json` and `consent-audit-log.schema.json` from
  [`mvp.02-content-schemas.42-consent-and-peer-allowlist-schemas`](../02-content-schemas/42-consent-and-peer-allowlist-schemas.md).
- Localization namespaces `consent.<scope>.*` and `ui.onboarding.*`.
- `policyVersion` constant from
  [`onboarding.md`](../../../docs/architecture/onboarding.md).

Outputs:
- `src/ui/onboarding/onboarding-consent-screen.tsx`
- `src/ui/onboarding/__tests__/onboarding-consent-screen.test.tsx`

Owned Paths:
- `src/ui/onboarding/`

Owned Paths (shared):
- `src/ui/__tests__/screens/76-onboarding-consent.smoke.test.ts`
  (smoke test contract per [`testing/ui-smoke-contract.md`](../../../docs/architecture/testing/ui-smoke-contract.md))

Dependencies:
- mvp.02-content-schemas.42-consent-and-peer-allowlist-schemas
- mvp.07-ui-shell.11-screen-router-fsm
- mvp.07-ui-shell.14-modal-stack

Acceptance Criteria:
- Layout matches `docs/architecture/wiki/screens/76-onboarding-consent/mockup.html`.
- Every action in `docs/architecture/wiki/screens/76-onboarding-consent/interactions.md` has a handler.
- `docs/architecture/wiki/screens/76-onboarding-consent/` is **owned by** this task; subsequent UI redesigns are additive and must not rewrite the consent contract or the `selectFeatureAvailability` selector.
- The shared smoke-test directory `src/ui/__tests__/screens/` change is additive; this task adds only `76-onboarding-consent.smoke.test.ts` and must not rewrite other smoke tests.
- First-run profile (`consent.storage.state === 'unset'`) routes to
  `76-onboarding-consent` from `01-main-menu`.
- Multiplayer / AI / telemetry / crash-report toggles default OFF;
  `Continue` writes only the rows the user accepted.
- `under13` profile force-denies every optional-tier consent per
  [`age-gate.md`](../../../docs/architecture/age-gate.md).
- Each transition appends a row to
  `state.profile.consentAuditLog.entries[]`.
- Re-prompt cases (`unset`, stale `policyVersion`, revoke,
  `IMPORT_CONSENT_SNAPSHOT`) all route here.
- `npm run validate:ui-components` recognizes every component named
  in [`spec.md`](../../../docs/architecture/wiki/screens/76-onboarding-consent/spec.md).

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
