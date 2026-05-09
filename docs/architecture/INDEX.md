# Architecture index

Read this file when you need to navigate the architecture corpus.
Entries are clustered by concern; intra-cluster numbering is stable
so new entries append within a cluster rather than renumbering the
whole list.

## Determinism core (1–4)

1. [README.md](../../README.md)
2. [overview.md](overview.md)
3. [determinism.md](determinism.md)
4. [edge-cases-policy.md](edge-cases-policy.md) — invalid commands, current-actor gate, stale references, conflicts, zero-resource transactions, overflow & saturation, save gating, mid-combat disconnect, asset-load failure, wall-clock readers, tab backgrounding, storage quota.

## Content platform (5–10)

5. [content-platform.md](content-platform.md)
6. [pack-contract.md](pack-contract.md)
7. [content-system-policy.md](content-system-policy.md) — namespace pattern, dependency resolution, override precedence, asset integrity, locale merge, balance corridor, error codes.
8. [schema-matrix.md](schema-matrix.md)
9. [effect-registry.md](effect-registry.md)
10. [glossary.md](glossary.md)

## UI surface (11–28)

11. [ui-technology-choice.md](ui-technology-choice.md)
12. [ui-renderer-seam.md](ui-renderer-seam.md) — DOM ↔ canvas seam, hit-test API, resize protocol.
13. [screen-scaling.md](screen-scaling.md)
14. [ui-component-resolver.md](ui-component-resolver.md)
15. [ui-frame-lag-contract.md](ui-frame-lag-contract.md) — single-player lag, optimistic UI, M5 lockstep, context loss, replay.
16. [ui-state-contract.md](ui-state-contract.md) — component-state matrix, selector purity, tooltip lifecycle, undo/redo (map editor).
17. [ui-routing.md](ui-routing.md)
18. [ui-input-arbitration.md](ui-input-arbitration.md) — single-emit per gesture, Esc precedence ladder, animation gates.
19. [ui-gestures.md](ui-gestures.md)
20. [ui-hotkeys.md](ui-hotkeys.md)
21. [ui-input-modalities.md](ui-input-modalities.md)
22. [mechanics-coverage.md](mechanics-coverage.md) — mechanic scope SSOT.
23. [performance.md](performance.md) — hardware tiers, per-frame CPU budget, GC budget, memory budget, AI compute budget.
24. [atlas-pipeline.md](atlas-pipeline.md)
25. [ai-contract.md](ai-contract.md) — gameplay-AI runtime contract: input view projection, worker protocol, per-turn budget table, BotProvider, cheats.
26. [../planning/implementation-log.md](../planning/implementation-log.md)
27. [diagrams/](diagrams/) — per-scenario Mermaid flows.
28. [wiki/screens/](wiki/screens/) — numbered per-screen UI packages (mockup + spec + interactions + data-contracts + architecture).

## Engine support (29–34)

29. [side-effect-matrix.md](side-effect-matrix.md) — per-`src/<module>` ledger.
30. [non-functional-requirements.md](non-functional-requirements.md) — global NFR matrix.
31. [testing-conventions.md](testing-conventions.md) — DI convention, fake catalogue, mock policy, fuzz/property targets.
32. [error-taxonomy.md](error-taxonomy.md)
33. [hot-reload-flow.md](hot-reload-flow.md)
34. [asset-path-resolution.md](asset-path-resolution.md) — editor-time string lookups vs runtime registry resolution.

## Operations (35–38)

35. [runtime-requirements.md](runtime-requirements.md) — UI shell, WebGL2 floor, Web Workers, Web Crypto, IndexedDB quota, time source, browser engine floor.
36. [observability.md](observability.md) — Logger / MetricsSink interfaces, anonymous-stats schema, redaction rules.
37. [error-ux.md](error-ux.md) — toast / inline / modal / log-only matrix, code → surface mapping, `error.shown` telemetry.
38. [../operations/rollback-playbook.md](../operations/rollback-playbook.md) — content / engine / save rollback, kill-switch, hot-fix migration, RACI.

## Decision and policy registers (39–47)

39. [../planning/decision-log.md](../planning/decision-log.md) — append-only locked decisions.
40. [../planning/deferred.md](../planning/deferred.md) — deferred / out-of-scope items (`DEF-NNN`).
41. [data-inventory.md](data-inventory.md) — every persisted field (medium, sensitivity tier, retention, wipe scope). The `WIPE_LOCAL_DATA` handler iterates this document.
42. [persistence.md](persistence.md) — closed allowlist of storage media; `localStorage` / cookie ban.
43. [permissions.md](permissions.md) — closed allowlist of OS / browser APIs.
44. [ugc-safety.md](ugc-safety.md) — text / binary / capability sanitization for UGC and AI-generated payloads.
45. [security-model.md](security-model.md) — symmetric input-only lockstep threat model; product gating for ranked / tournament / spectator modes.
46. [trust-boundaries.md](trust-boundaries.md) — "client is fully untrusted" axiom, trusted-core declaration, per-component matrix, worker-boundary detail. Companions: [authority.md](authority.md), [untrusted-strings.md](untrusted-strings.md), [fail-loud.md](fail-loud.md), [desktop-sandboxing.md](desktop-sandboxing.md).
47. [../../SECURITY.md](../../SECURITY.md) — disclosure surface + GDPR 72-hour breach trigger. Operational machinery in [services-runtime-rules.md](../operations/services-runtime-rules.md).

## Browseable view

For a single read-only view of architecture docs, general flow
diagrams, and numbered UI screen packages, open
[architecture-wiki.html](architecture-wiki.html). It is regenerated
by `npm run generate:wiki`. The screen package files remain the
canonical artifacts; the wiki is a viewer.
