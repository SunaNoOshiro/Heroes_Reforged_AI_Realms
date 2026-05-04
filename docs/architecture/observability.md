# Observability

> Source plan:
> [`docs/implementation-plans/17-final-critical-questions-plan.md`](../implementation-plans/17-final-critical-questions-plan.md)
> (Q298, Q291). Sister docs:
> [`error-taxonomy.md`](./error-taxonomy.md) (severities, codes),
> [`error-ux.md`](./error-ux.md) (player-facing surfacing),
> [`non-functional-requirements.md`](./non-functional-requirements.md)
> (rate / payload NFRs).

This file is the single declaration of the observability seam:
**logging** (developer-side records of runtime events), **metrics**
(numeric counters / histograms / gauges), and the **per-match
anonymous-stats** event schema. Every later module reads this file
when it needs to emit a new event, instead of re-inventing a logger.

The interfaces are pure and environment-agnostic. The dev backend is
the console. Production backends are pluggable; no provider is locked
in at this stage (deployment is owned by
[`DEF-013`](../planning/deferred.md)).

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
  (`pack.load.failed`, `desync.detected`). Match the same identifier
  used by metric counters to keep dashboards and log queries on the
  same vocabulary.
- `fields` are key/value pairs; values must be primitives. Nested
  objects, arrays, and PII (see §5) are forbidden.
- Loggers are *injected*, never imported as a module-level singleton
  ([`testing-conventions.md`](./testing-conventions.md) DI rule).
  The deterministic engine receives a `Logger` only through the
  factory contract in
  [`multi-engine-harness.md`](./multi-engine-harness.md), and never
  reads from it during reducer execution — logging is a side effect
  permitted by [`side-effect-matrix.md`](./side-effect-matrix.md)
  only at boundary modules.

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
- `labels` cardinality is bounded — names like `factionId`,
  `difficulty`, `engineHash` are fine; anything per-user (e.g.
  `userId`, peer ID) is forbidden.

## 3. Per-match anonymous-stats schema

The canonical wire shape for the per-match emission is
[`content-schema/schemas/telemetry-event.schema.json`](../../content-schema/schemas/telemetry-event.schema.json).
Two canonical examples ship under
[`content-schema/examples/telemetry/`](../../content-schema/examples/telemetry/).

A producer of telemetry MUST validate every event against this schema
before emitting. CI enforces shape via the existing
`check-repo-contracts.mjs` example-record gate.

## 4. Required emissions catalogue

Each module owns the catalogue of events / metrics it MUST emit. The
catalogue lives in this section so the per-module spec stays compact.
Tasks in those modules MUST extend their Acceptance Criteria with a
"emits the events listed in observability.md §4 row M" check.

| Module | Event / metric kind | When |
|---|---|---|
| `src/net/` (multiplayer) | `desync.detected` (event), `desync.detected.count` (counter) | Per-turn hash mismatch surfaces. |
| `src/net/` | `host.migrated` (event) | After a heartbeat-driven host election. |
| `src/net/` | `webrtc.connect.attempt.duration_ms` (histogram) | Each connection attempt. |
| `src/content-runtime/` | `pack.load.failed` (event with `code`) | Manifest, dependency, asset, or signature failure. |
| `src/content-runtime/` | `pack.load.duration_ms` (histogram) | Successful loads. |
| `src/ai/` | `ai.provider.error` (event with `provider`, `code`) | Provider call returns non-2xx or schema-invalid output. |
| `src/ai/` | `ai.tick.duration_ms` (histogram) | Each AI tick (worker side). |
| `src/persistence/` | `save.corrupt` (event with `code`) | Quarantine path invoked. |
| `src/persistence/` | `save.write.duration_ms` (histogram) | Each save write. |
| `src/renderer/` | `renderer.frame.drop.count` (counter) | Per-second frame-time outlier. |
| `src/renderer/` | `renderer.context.lost` (event) | WebGL context-loss event. |
| `src/ui/` | `error.shown` (event with `code`, `surface`) | Whenever an error surface (toast / modal / inline) renders — keyed in [`error-ux.md`](./error-ux.md). |

A module that adds a new event MUST extend the table above in the
same change.

## 5. Privacy & redaction

Privacy contract — the producer MUST NOT include any of:

- IP addresses, MAC addresses, or other network identifiers.
- WebRTC peer IDs, signaling-server session tokens.
- User account IDs, display names, email, locale-derived locale
  strings finer than ISO `xx-XX`.
- Save names, scenario titles authored by the user, free-form chat
  text.
- Pack file paths or pack manifest names — only digests
  (`sha256:…`).

The producer MAY include:

- `engineHash`, `packHashes` (digests only).
- `factionId`, `difficulty`, `scenarioId` (only for first-party
  content; UGC scenario IDs are redacted to `redacted`).
- Aggregate counters (turn number, attempt count, duration in ms).
- Error `code` values from
  [`error-taxonomy.md`](./error-taxonomy.md).

The retention model for the wire payload is owned by
[`docs/implementation-plans/22-privacy-retention-and-error-leaks-plan.md`](../implementation-plans/22-privacy-retention-and-error-leaks-plan.md);
the redaction rules above MUST be applied before any payload reaches
the wire.

## 6. Backends

| Mode | Logger | MetricsSink |
|---|---|---|
| `dev` | `console.{info,warn,error}` formatted as a single JSON object. | In-memory map; dumped to console on `process.exit`. |
| `test` | Capture-and-assert helper from the shared fakes catalogue ([`testing-conventions.md`](./testing-conventions.md)). | Same. |
| `prod` | Pluggable sink (no provider locked in; planned by [`DEF-013`](../planning/deferred.md)). | Pluggable. |

The capture-and-assert helper is the canonical way for unit tests to
prove a module *does* emit the events §4 requires of it.

## 7. NFR

The observability surface contributes one NFR row each in
[`non-functional-requirements.md`](./non-functional-requirements.md):

- Per-client telemetry payload size budget (sum of all emits per
  match).
- Per-emit latency budget (max time the producer may spend formatting
  a single event before yielding).

These rows live in NFR with concrete numbers; this doc names that
they exist.
