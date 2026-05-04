# Module: Observability (Phase 2)

Pure interfaces for the logger, metrics sink, and the per-match
anonymous-stats event schema. The dev backend is the console; the
production backend is pluggable and deferred to Phase 3 deployment
([`DEF-013`](../../docs/planning/deferred.md)).

The single source of truth for the surface, required emissions, and
privacy redaction rules is
[`docs/architecture/observability.md`](../../docs/architecture/observability.md).

**Milestone**: Phase 2 — operability foundation
**Total Estimate**: ~5 hours
**Exit Criteria**: Logger and metrics sink interfaces exist, every
in-scope module's required emissions are declared, and the
telemetry-event schema validates the canonical examples.

---

## Task Files

- [01-logger-and-metrics-sink-interfaces.md](11-observability/01-logger-and-metrics-sink-interfaces.md)
  📊 Logger + MetricsSink interfaces, console backend, capture-and-assert test fake (~3h)
- [02-required-emissions-catalogue.md](11-observability/02-required-emissions-catalogue.md)
  📊 Per-subsystem required emissions catalogue + telemetry-event schema validation (~2h)
