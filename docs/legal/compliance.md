# Compliance Posture

Names the regulatory regimes the project must satisfy, the per-regime
scope, and where the specific compliance controls live in the repo.
This file is the auditable artifact for legal review; engineering
controls live in [`docs/architecture/privacy.md`](../architecture/privacy.md).

> Source plan:
> [`docs/implementation-plans/22-privacy-retention-and-error-leaks-plan.md`](../implementation-plans/22-privacy-retention-and-error-leaks-plan.md).

## 1. Regulatory scope

| Regime | Scope | Status at v1 |
|---|---|---|
| GDPR (EU) | Players in the EEA who load packs, host or join lobbies, or generate AI content | In scope; Art. 17 erasure satisfied via `WIPE_LOCAL_DATA` + `REQUEST_ERASURE_RECEIPT` |
| CCPA (California) | California residents loading packs, hosting / joining lobbies, or generating AI content | In scope; "Right to Delete" satisfied by the same flow |
| COPPA (US, < 13) | No account system at v1; under-13 self-reported users | No `localStorage` / cookies; no account; no per-user identifier persisted; mature-content gate off by default per [`pack-trust.md`](../architecture/pack-trust.md) |

No cross-border data export is in scope at v1 because no account /
per-user identifier is persisted. When a future feature changes
this, a Data Protection Impact Assessment per
[`dpa-checklist.md`](./dpa-checklist.md) is required before merge.

## 2. Lawful basis (GDPR Art. 6)

| Surface | Lawful basis | Notes |
|---|---|---|
| Local saves and profile | (b) Performance of contract (provide game) | No external recipients |
| Lobby chat (in-memory) | (b) Performance of contract | Cleared on lobby exit |
| AI generation (provider call) | (a) Consent | Explicit "Generate" command initiates the network call |
| Content / peer reports | (f) Legitimate interests (safety) | Local queue only at v1 |
| Telemetry | (a) Consent | Off by default per [`privacy.md` § 7](../architecture/privacy.md#7-telemetry-posture) |

## 3. Data subject rights

Each right below names the satisfying flow.

| Right | Flow |
|---|---|
| Access (Art. 15) | "Export my data" UI in [`54-system-menu`](../architecture/wiki/screens/54-system-menu/) (Plan 21 export). |
| Rectification (Art. 16) | Privacy pane in [`56-options`](../architecture/wiki/screens/56-options/) edits every persisted field. |
| Erasure (Art. 17) | `WIPE_LOCAL_DATA` → `REQUEST_ERASURE_RECEIPT` → receipt rendered in [`54-system-menu`](../architecture/wiki/screens/54-system-menu/). |
| Restriction (Art. 18) | "Pause analytics" toggle (off by default; effectively always-on at v1). |
| Portability (Art. 20) | Save / replay export emits canonical JSON consumable by another installation. |
| Objection (Art. 21) | Same as restriction; no profiling at v1. |
| Automated decision-making (Art. 22) | Out of scope; gameplay is deterministic and AI generation is user-initiated. |

## 4. Children & sensitive categories

- Mature-content gate (`config.player.allowMatureContent`) is **off**
  by default; flips to on only via the privacy pane after the user
  has read the content-rating disclosure.
- The product does not knowingly process under-13 data; the absence
  of an account system removes the COPPA verifiable-parental-consent
  vector. UGC chat carries an `acceptedPublishDisclaimer` ack
  (Plan 21) that names the publication scope; the "publish" step
  refuses without the ack.

## 5. Records of processing (Art. 30)

The minimum record set lives in:

- [`docs/architecture/data-inventory.md`](../architecture/data-inventory.md) — per-field inventory.
- [`docs/architecture/privacy.md`](../architecture/privacy.md) § Retention TTL matrix.
- [`docs/legal/processors.md`](./processors.md) — third-party processors.
- [`docs/legal/dpa-checklist.md`](./dpa-checklist.md) — vendor onboarding gate.

A v1.x release that adds a new processor or expands a retention TTL
re-runs the DPA checklist before merge.

## 6. Breach response

A breach (unauthorized access to a save export, leaked signaling-server
credentials, exposed AI-gateway API key) is handled per
[`docs/operations/rollback-playbook.md`](../operations/rollback-playbook.md)
with the additional 72-hour notification clock under GDPR Art. 33.
The rollback playbook owns the operational steps; this file owns
the compliance clock.

## 7. Cross-references

- [`docs/architecture/privacy.md`](../architecture/privacy.md) — engineering controls.
- [`docs/architecture/data-inventory.md`](../architecture/data-inventory.md) — per-field inventory.
- [`docs/architecture/permissions.md`](../architecture/permissions.md) — OS / browser API allowlist.
- [`docs/legal/processors.md`](./processors.md) — third-party processors.
- [`docs/legal/dpa-checklist.md`](./dpa-checklist.md) — vendor-add rubric.
- [`docs/legal/erasure-process.md`](./erasure-process.md) — manual erasure fallback.
