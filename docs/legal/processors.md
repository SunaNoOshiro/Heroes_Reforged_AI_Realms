# Third-Party Processors

The complete list of third-party services that may receive any
data from this product. **Adding a row requires a DPA per
[`dpa-checklist.md`](./dpa-checklist.md) and a `policyVersion`
bump in [`privacy.md`](../architecture/privacy.md).** This is a
hard procurement gate, not an afterthought.

## 1. Active processors at v1

| Processor | Surface | Data flowing | Retention | DPA |
|---|---|---|---|---|
| _(none)_ | _(no provider-backed surface ships at v1)_ | _(none)_ | _(n/a)_ | _(n/a)_ |

The first-party signaling and AI-gateway services
([`services/signaling/`](../../services/signaling/) and
[`services/ai-gateway/`](../../services/ai-gateway/)) are scaffolds;
no production deploy is gated by this plan. When either ships,
the deploy platform (Fly.io, Railway, etc.) becomes a row in the
table above and inherits the row-add gate.

## 2. Reserved categories

Categories below are recognized but have no active row at v1.
Adding a row requires the DPA checklist *plus* the row-specific
constraints listed under each category.

### 2.1 Hosting / signaling deploy platform

- Constraints: log retention ≤ 24 h on the platform side;
  IPs and SDP / ICE bodies excluded per
  [`services/signaling/observability.md`](../../services/signaling/observability.md);
  TLS terminated at the edge.
- Required: signed DPA, named EU/US sub-processors, breach
  notification SLA ≤ 24 h.

### 2.2 AI generation provider

- Constraints: prompts logged only as `promptHash` per
  [`services/ai-gateway/retention.md`](../../services/ai-gateway/retention.md);
  raw bodies never logged; per-user identifiers not transmitted
  because no auth surface exists.
- Required: signed DPA, no model-training opt-out gap (the
  provider's terms must allow content opt-out), per-region
  endpoint pinning if available.

### 2.3 Crash-reporting / APM

- Constraints: no automatic upload; user-initiated only
  (per [`production-build.md` rule 4](../architecture/production-build.md#4-console-sinks-route-through-formatdeverror));
  payloads are produced by `formatDevError` and therefore
  pre-redacted.
- Required: signed DPA, configurable retention ≤ 30 days,
  no PII collection by default.

### 2.4 Analytics

- Constraints: off by default; loads only after
  `state.privacy.allowAnalytics === true`
  (per [`privacy.md` § 7](../architecture/privacy.md#7-telemetry-posture));
  no cross-site tracking; no cookies / `localStorage`.
- Required: signed DPA, IP truncation, anonymized client id
  (UUID v4 minted on opt-in, not earlier).

### 2.5 CDN

- Constraints: serves static assets only; never receives user
  data beyond standard request metadata; access logs disabled
  beyond ≤ 24 h.
- Required: signed DPA, EU/US edge presence, TLS-only.

### 2.6 Marketplace / mod distribution

- Constraints: out of scope at v1; no first-party marketplace
  ships. Future inclusion requires a marketplace-specific
  amendment to this file plus a sub-DPA.

## 3. Procurement gate

Before any vendor selection PR can merge:

1. Run the [DPA checklist](./dpa-checklist.md) against the
   candidate vendor. Every checklist row must resolve to "yes"
   or "explicitly waived with reason."
2. Add a row to the table in § 1 with the four required columns
   and a link to the signed DPA.
3. Bump `policyVersion` in [`privacy.md`](../architecture/privacy.md);
   the disclosure modal in screen
   [`56-options`](../architecture/wiki/screens/56-options/) re-opens
   on next launch and re-records consent.
4. Add a row to the [data inventory](../architecture/data-inventory.md)
   if any new persisted field results.

A vendor PR that skips any of the four steps above is rejected
on review.

## 4. Cross-references

- [`docs/architecture/privacy.md`](../architecture/privacy.md) — privacy artifact.
- [`docs/legal/compliance.md`](./compliance.md) — regulatory scope.
- [`docs/legal/dpa-checklist.md`](./dpa-checklist.md) — DPA rubric.
- [`docs/architecture/data-inventory.md`](../architecture/data-inventory.md) — per-field inventory.
- [`services/signaling/observability.md`](../../services/signaling/observability.md) — signaling-side retention rules.
- [`services/ai-gateway/retention.md`](../../services/ai-gateway/retention.md) — AI-gateway retention rules.
