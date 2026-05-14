# Observability

> Sister docs:
> [`error-taxonomy.md`](./error-taxonomy.md) (severities, codes),
> [`error-ux.md`](./error-ux.md) (player-facing surfacing),
> [`non-functional-requirements.md`](./non-functional-requirements.md)
> (rate / payload NFRs).

Single source of truth for the observability seam:

- **Logging** — developer-side records of runtime events.
- **Metrics** — numeric counters, histograms, gauges.
- **Telemetry** — the per-match anonymous-stats wire schema.

Every later module that needs to emit reads this file rather than
re-inventing a logger. The interfaces are pure and
environment-agnostic. The dev backend is the console; production
backends are pluggable, and no provider is locked in (deployment is
deferred — [`DEF-013`](../planning/deferred.md)).

---

## 1. Logger interface

```ts
type LogFields = Record<string, string | number | boolean | null>;

interface Logger {
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
}
```

Rules:

- `event` is a stable dotted-domain identifier
  (`pack.load.failed`, `desync.detected`). Use the same identifier
  for matched logger events and metric counters so dashboards and
  log queries share one vocabulary.
- `fields` values must be primitives. Nested objects, arrays, and
  PII (see § 5) are forbidden.
- Loggers are **injected**, never imported as a module-level
  singleton (DI rule from
  [`testing-conventions.md` § 1](./testing-conventions.md#1-dependency-injection)).
  The deterministic engine receives a `Logger` only via constructor
  injection, and never calls into it during reducer execution.
  Logging is a side effect permitted at boundary modules only per
  [`side-effect-matrix.md`](./side-effect-matrix.md).

## 2. Metrics sink interface

```ts
interface MetricsSink {
  counter(name: string, delta?: number, labels?: LogFields): void;
  histogram(name: string, value: number, labels?: LogFields): void;
  gauge(name: string, value: number, labels?: LogFields): void;
}
```

Rules:

- `name` follows the same dotted-domain convention as logger events
  (`save.write.duration_ms`, `desync.detected.count`).
- `labels` cardinality is bounded. Stable keys (`factionId`,
  `difficulty`, `engineHash`) are fine; per-user keys (`userId`,
  peer ID, IP) are forbidden.

## 3. Per-match telemetry schema

The wire shape is
[`content-schema/schemas/telemetry-event.schema.json`](../../content-schema/schemas/telemetry-event.schema.json)
(`TelemetryEvent`, `schemaVersion: 1`). Required fields:
`schemaVersion`, `kind`, `timestamp`, `engineHash`, `fields`.
Optional: `packHashes`, `severity` (`info | warn | error`).

`kind` follows the same dotted-domain pattern as § 1 / § 2 names
(`^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$`).

Canonical examples ship under
[`content-schema/examples/telemetry/`](../../content-schema/examples/telemetry/)
(`desync-detected`, `pack-load-failed`). A producer MUST validate
every event against the schema before emitting; CI enforces shape
via the example-record gate in
[`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs).

## 4. Required emissions catalogue

Each module owns the catalogue of events / metrics it MUST emit.
Tasks in those modules extend their Acceptance Criteria with a
`emits <event-name> per observability.md § 4` line; the canonical
catalogue lives below so per-module specs stay compact.

| # | Module | Event / metric | When |
|---|---|---|---|
| 1 | `src/net/` | `desync.detected` (event), `desync.detected.count` (counter) | Per-turn hash mismatch surfaces. |
| 2 | `src/net/` | `host.migrated` (event) | After a heartbeat-driven host election. |
| 3 | `src/net/` | `webrtc.connect.attempt.duration_ms` (histogram) | Each connection attempt. |
| 4 | `src/content-runtime/` | `pack.load.failed` (event with `code`) | Manifest, dependency, asset, or signature failure. |
| 5 | `src/content-runtime/` | `pack.load.duration_ms` (histogram) | Successful loads. |
| 6 | `src/ai/` | `ai.provider.error` (event with `provider`, `code`) | Provider call returns non-2xx or schema-invalid output. |
| 7 | `src/ai/` | `ai.tick.duration_ms` (histogram) | Each AI tick (worker side). |
| 8 | `src/persistence/` | `save.corrupt` (event with `code`) | Quarantine path invoked. |
| 9 | `src/persistence/` | `save.write.duration_ms` (histogram) | Each save write. |
| 10 | `src/renderer/` | `renderer.frame.drop.count` (counter) | Per-second frame-time outlier. |
| 11 | `src/renderer/` | `renderer.context.lost` (event) | WebGL context-loss event. |
| 12 | `src/ui/` | `error.shown` (event with `code`, `surface`) | Whenever a player-facing error surface (toast, inline, modal, fullscreen) renders, keyed in [`error-ux.md` § 4](./error-ux.md#4-telemetry-tagging). |

Adding a new emission MUST extend the table in the same change.

## 5. Privacy & redaction

The producer MUST NOT include any of:

- IP addresses, MAC addresses, or other network identifiers.
- WebRTC peer IDs, signaling-server session tokens.
- User account IDs, display names, email, locale strings finer
  than ISO `xx-XX`.
- Save names, scenario titles authored by the user, free-form chat
  text.
- Pack file paths or pack manifest names — only digests
  (`sha256:…`).

The producer MAY include:

- `engineHash`, `packHashes` (digests only).
- `factionId`, `difficulty`, `scenarioId` — first-party content
  only; UGC scenario IDs are redacted to `redacted`.
- Aggregate counters (turn number, attempt count, duration in ms).
- Error `code` values from
  [`error-taxonomy.md`](./error-taxonomy.md).

Redaction MUST be applied before any payload reaches the wire.

## 6. Backends

| Mode | Logger | MetricsSink |
|---|---|---|
| `dev` | `console.{info,warn,error}`, one-line JSON per call. | In-memory map; dumped to console on `process.exit`. |
| `test` | Capture-and-assert helper from the shared fakes catalogue ([`testing-conventions.md` § 2](./testing-conventions.md#2-shared-fake-catalogue)). | Same. |
| `prod` | Pluggable sink (no provider locked in; deferred — [`DEF-013`](../planning/deferred.md)). | Pluggable. |

The capture-and-assert helper is the canonical way for unit tests
to prove a module *does* emit the events § 4 requires of it. The
fake throws at capture time when a forbidden field from § 5 is
provided, so violators fail loudly.

## 7. NFR

The observability surface owes two rows in
[`non-functional-requirements.md`](./non-functional-requirements.md):

- Per-client telemetry payload-size budget (sum of all emits per
  match).
- Per-emit latency budget (max time the producer may spend
  formatting one event before yielding).

NFR holds the concrete numbers; this doc names the rows that must
exist.

---

## 🔍 Sync Check

- **UI: ✔** — `error.shown` row aligns with [`error-ux.md` § 4](./error-ux.md#4-telemetry-tagging) (same `code` / `surface` / `screenId` labels, same `error.shown.count` counter).
- **Schema: ⚠** — `telemetry-event.schema.json` matches §§ 1–5 (kind pattern, required fields, severity enum). Examples (`desync-detected`, `pack-load-failed`) parse against the schema. `TelemetryEvent` is **not** registered in [`schema-matrix.md`](./schema-matrix.md) — see Issues.
- **Tasks: ⚠** — Owning tasks [`phase-2.11-observability.01-logger-and-metrics-sink-interfaces`](../../tasks/phase-2/11-observability/01-logger-and-metrics-sink-interfaces.md) and [`phase-2.11-observability.02-required-emissions-catalogue`](../../tasks/phase-2/11-observability/02-required-emissions-catalogue.md) cite §§ 1–5 of this doc. Phase-2 module index [`tasks/phase-2/11-observability.md`](../../tasks/phase-2/11-observability.md) names this file as the source of truth. § 7 NFR rows (telemetry payload size, per-emit latency) do **not** exist in the NFR matrix yet — see Issues.

## ⚠ Issues

- **`TelemetryEvent` missing from `schema-matrix.md`.** The schema lives at [`content-schema/schemas/telemetry-event.schema.json`](../../content-schema/schemas/telemetry-event.schema.json) with canonical examples under [`content-schema/examples/telemetry/`](../../content-schema/examples/telemetry/), but [`schema-matrix.md`](./schema-matrix.md) has no row. Every other schema in `content-schema/schemas/` is registered there, including wire-only (`CommandEnvelope`, `SignalingEnvelope`) and local-only (`AbandonPenaltyRecord`) records. Per the Schema-matrix convention, `phase-2.11-observability.02-required-emissions-catalogue` (which lists `content-schema/schemas/telemetry-event.schema.json` as `Owned Paths (shared)`) should add the row. Suggested values: Record=`TelemetryEvent`, Gameplay role=`none — wire envelope only`, Presentation role=`none — outbound telemetry envelope; never enters saves, replays, or the canonical state hash`, Schema=link, Example=both files under `content-schema/examples/telemetry/`. Skill did not edit `schema-matrix.md` (Hard Prohibition D).
- **§ 7 NFR rows do not exist in `non-functional-requirements.md`.** § 7 asserts the matrix carries one row each for telemetry payload-size budget and per-emit latency budget; the NFR file currently has rows under `PERF`, `MEM`, `LAT`, `CAP`, `START`, `AI`, and `CI` only — no `TELEMETRY` / observability section. Per the root contract that NFR rows are the canonical numeric source of truth, `phase-2.11-observability.02-required-emissions-catalogue` should add an `NFR-TEL-01` (per-match payload size) and `NFR-TEL-02` (per-emit format latency) row, and this doc's § 7 should then cite the IDs. Skill kept § 7 as a forward-looking placeholder (Hard Prohibition B — never invent the IDs here) and flagged the gap. Skill did not edit the NFR matrix (Hard Prohibition D).
- **`Logger` injection contract not pinned in `multi-engine-harness.md`.** The original prose said "the deterministic engine receives a `Logger` only through the factory contract in `multi-engine-harness.md`", but [`multi-engine-harness.md`](./multi-engine-harness.md) does not mention a `Logger` (verified by grep). Rewrote the claim to point at the testing-conventions DI rule and the engine's general "no logging during reducer execution" stance, which are both documented and consistent with the [`side-effect-matrix.md`](./side-effect-matrix.md) engine row (per § 8 Option A: target was wrong about where the contract lives). The substantive rule (engine never logs from inside the reducer) is preserved.
