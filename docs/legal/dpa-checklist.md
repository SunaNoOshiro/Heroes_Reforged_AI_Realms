# DPA Checklist

The rubric every third-party processor must satisfy before it
appears as a row in [`processors.md`](./processors.md). A vendor
PR that skips any item below is rejected on review.

Tick every item. "n/a" is acceptable only when the row's "Reason
to waive" column carries a one-sentence justification.

## 1. Contractual baseline

- [ ] Signed Data Processing Agreement (DPA) referencing GDPR Art. 28.
- [ ] Sub-processor list disclosed; vendor commits to notifying us
      30 days before adding a sub-processor.
- [ ] Standard Contractual Clauses (SCCs) attached for any non-EEA
      transfer.
- [ ] Termination clause: vendor returns or deletes all data within
      30 days of contract end.
- [ ] Liability cap appropriate for data category (medium / high tier
      per [`data-inventory.md`](../architecture/data-inventory.md)).

## 2. Technical & organizational measures

- [ ] Encryption in transit (TLS 1.2+).
- [ ] Encryption at rest for any tier ≥ medium.
- [ ] Access logs retained ≤ 90 days.
- [ ] Documented breach detection + 24 h notification SLA.
- [ ] Pen-test summary or SOC 2 Type II report available on request.
- [ ] Bug-bounty or coordinated-disclosure channel published.

## 3. Data scope

- [ ] Data inventory row authored in
      [`data-inventory.md`](../architecture/data-inventory.md) for
      every new persisted field.
- [ ] Retention TTL added to the table in
      [`privacy.md` § 2](../architecture/privacy.md#2-retention-ttl-matrix).
- [ ] No `localStorage` / cookie usage by the vendor's SDK
      (per [`persistence.md`](../architecture/persistence.md)).
- [ ] No clandestine telemetry: vendor confirms "no usage of
      telemetry beyond what we configure."

## 4. AI-provider-specific

(Only when the candidate is an AI generation or moderation provider.)

- [ ] Prompt content opt-out from training datasets confirmed.
- [ ] Prompt logging on the provider side documented; default
      retention ≤ our published TTL or shorter.
- [ ] Per-region endpoint or data-residency option available.
- [ ] Moderation result schema compatible with
      [`image-moderation-report.schema.json`](../../content-schema/schemas/image-moderation-report.schema.json) /
      relevant counterpart.

## 5. Hosting / signaling-platform-specific

(Only when the candidate hosts the signaling, gateway, or AI service.)

- [ ] Log retention configurable to ≤ 24 h
      (per [`services/signaling/observability.md`](../../services/signaling/observability.md)).
- [ ] IP-address scrubbing or proxy-header removal supported.
- [ ] TLS termination at the edge.
- [ ] Region pinning available (EU vs. US).

## 6. Crash / APM-specific

- [ ] No automatic upload supported; user-initiated send only.
- [ ] Payload schema acceptance: vendor accepts
      `formatDevError`-shaped payloads (errorId + redacted
      single-line stack).
- [ ] Configurable retention ≤ 30 days.
- [ ] PII scrubbing on by default.

## 7. Analytics-specific

- [ ] No analytics SDK loads at first paint
      (per [`production-build.md` rule 3](../architecture/production-build.md#3-formatusererror-is-the-only-ui-error-sink)).
- [ ] IP truncation on by default.
- [ ] No cross-site tracking; no advertising surfaces.
- [ ] Event schema published; we control which events fire.

## 8. Procurement gate

After every applicable section above is ticked, run through the
four steps in [`processors.md` § 3](./processors.md#3-procurement-gate)
to land the row in the active processors table and re-record
consent in screen
[`56-options`](../architecture/wiki/screens/56-options/).

## 9. Cross-references

- [`docs/legal/processors.md`](./processors.md) — third-party processor list.
- [`docs/legal/compliance.md`](./compliance.md) — regulatory scope.
- [`docs/architecture/privacy.md`](../architecture/privacy.md) — privacy artifact.
- [`docs/architecture/data-inventory.md`](../architecture/data-inventory.md) — per-field inventory.
