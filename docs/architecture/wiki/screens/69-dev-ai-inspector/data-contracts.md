# Screen 69: Dev AI Inspector
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry                  | Used For                                                       | Canonical Source                                                |
| ---------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------- |
| `ui-component-registry.schema.json` | Resolves the overlay's own component tree.                     | `content-schema/schemas/ui-component-registry.schema.json`      |
| `command.schema.json`              | Renders the chosen `Command` and validates exported JSON.      | `content-schema/schemas/command.schema.json`                    |
| `worker-message.schema.json`       | Wire envelope for `AI_TRACE_REQUEST` / `AI_TRACE_RESULT`.      | `content-schema/schemas/worker-message.schema.json`             |

### Runtime State Selectors
| UI Element         | Selector                                          | Notes                                                                                                                                                  |
| ------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `currentEntry`     | `state.ai.inspector.currentEntry`                 | `AiDecisionLogEntry` at `bufferIndex`.                                                                                                                  |
| `viewSnapshotHash` | `state.ai.inspector.currentEntry.view`            | xxh64 hex of canonical-JSON of the projected view.                                                                                                      |
| `wants`            | `state.ai.inspector.currentEntry.wants`           | Ordered `Want[]`.                                                                                                                                       |
| `scored`           | `state.ai.inspector.currentEntry.scored`          | Ordered `ScoredAction[]`.                                                                                                                               |
| `chosen`           | `state.ai.inspector.currentEntry.chosen`          | The `Command` the AI emitted.                                                                                                                           |
| `reasoning`        | `state.ai.inspector.currentEntry.reasoning`       | Free-text reasoning.                                                                                                                                    |
| `bufferIndex`      | `state.ai.inspector.bufferIndex`                  | `0` = newest; ring buffer N = 64 per [`09-ai-decision-log-channel.md`](../../../../../tasks/mvp/10-heuristic-ai/09-ai-decision-log-channel.md).         |
| `replayInFlight`   | `state.ai.inspector.replayInFlight`               | `true` while `AI_TRACE_REQUEST` is in flight.                                                                                                           |
| `lastReplay`       | `state.ai.inspector.lastReplay`                   | Last `AI_TRACE_RESULT` payload; drives the warn-mismatch banner.                                                                                        |
| `overlayVisible`   | `state.ai.inspector.overlayVisible`               | Toggled by `Ctrl+Shift+A` or by the PROD URL escape hatch.                                                                                              |

### Commands And Events
- The overlay does **not** dispatch gameplay commands.
- Worker messages: `AI_TRACE_REQUEST` (main → worker) and
  `AI_TRACE_RESULT` (worker → main). Both are dev-only `kind` values
  enumerated in [`ai-contract.md` § 3 Worker Protocol](../../../ai-contract.md#3-worker-protocol)
  and pinned in
  [`worker-message.schema.json`](../../../../../content-schema/schemas/worker-message.schema.json)
  (`AiTraceRequestPayload`, `AiTraceResultPayload`).
- `EXPORT JSON` writes the current `AiDecisionLogEntry` through the
  `Engine.config.aiDecisionLogPath` side-effect sink. It never feeds
  back into engine state.

### Config Keys
| Key                                       | Default          | Purpose                                                                              |
| ----------------------------------------- | ---------------- | ------------------------------------------------------------------------------------ |
| `config.devAiInspector.hotkey`            | `Ctrl+Shift+A`   | Toggle hotkey.                                                                       |
| `config.devAiInspector.urlParameter`      | `dev_ai_inspector` | PROD escape-hatch URL parameter name.                                                |
| `Engine.config.aiDecisionLog`             | `false`          | When `false`, the ring buffer is empty and the overlay panels render `—`.            |
| `Engine.config.aiDecisionLogPath`         | unset            | Optional disk sink path; gates the `EXPORT JSON` button.                              |

### Localization Keys
- `ui.dev-ai-inspector.header.title`
- `ui.dev-ai-inspector.view.title`
- `ui.dev-ai-inspector.wants.title`
- `ui.dev-ai-inspector.scored.title`
- `ui.dev-ai-inspector.chosen.title`
- `ui.dev-ai-inspector.reasoning.title`
- `ui.dev-ai-inspector.replay.warn-mismatch`

### Asset, Sound, And VFX IDs
None. The overlay uses CSS-only styling.

### Save And Replay Fields
- The overlay writes nothing to save state. The `aiDecisionLog`
  ring buffer is non-replayed and non-hashed per
  [`ai-contract.md` § 7 Decision Log](../../../ai-contract.md#7-decision-log)
  (CI asserts save and replay hash parity with the flag on vs off).
- `EXPORT JSON` writes outside save state; the engine never consumes
  exported files.

### Validation And Fallback
- Build-flag gate: `import.meta.env.DEV === true`. PROD bundles
  tree-shake the screen unless `?dev_ai_inspector=1` is on the URL
  (see [`ui-technology-choice.md` § Build Flags](../../../ui-technology-choice.md#build-flags)).
- Resolver miss for any listed component surfaces in
  `state.debug.missingComponentCount` and is caught by
  `scripts/validate-screen-component-coverage.mjs`.
- A trace replay that diverges from the recorded entry is a
  determinism bug: the `ui.dev-ai-inspector.replay.warn-mismatch`
  banner renders and the divergence is captured for QA.

---

## 🔍 Sync Check

- **UI: ✔** — Every selector is read by a panel in `spec.md` / `mockup.html`; `overlayVisible` matches the toggle action in `interactions.md`; localization keys above match the `data-i18n` attributes in `mockup.html`.
- **Schema: ⚠** — [`worker-message.schema.json`](../../../../../content-schema/schemas/worker-message.schema.json) envelope is `{kind, version, correlationId, payload}` with payload-internal `kind`; `AiTraceRequestPayload` is `{kind, requestId, verbosity?}` and `AiTraceResultPayload` is `{kind, requestId, wants, scored, command, reasoning}` (no `view`, no `difficulty`, no `rngSeed`). [`ai-contract.md` § 3](../../../ai-contract.md#3-worker-protocol) pseudocode and the owning task's `Outputs` list those extra fields. Reconciliation is owned by [`tasks/mvp/02-content-schemas/46-worker-message-envelope-reconciliation.md`](../../../../../tasks/mvp/02-content-schemas/46-worker-message-envelope-reconciliation.md); see Issues.
- **Tasks: ✔** — Owning task `mvp.10-heuristic-ai.08-ai-inspector-dev-screen` reads this contract; the ring-buffer producer `09-ai-decision-log-channel` pins `N = 64` and the `Engine.config.aiDecisionLog*` flags consumed above.

## ⚠ Issues

- **`state.ai.inspector.*` slice not registered in `data-inventory.md`.** The slice (`currentEntry`, `bufferIndex`, `replayInFlight`, `lastReplay`, `overlayVisible`) is intentionally in-memory per [`ai-contract.md` § 7](../../../ai-contract.md#7-decision-log), so it does not block CI. But [`data-inventory.md`](../../../data-inventory.md) has no `in-memory` row pinning the no-persist intent the way `lobby chat (transient)` does. Per CLAUDE.md root contract ("every persisted field is registered in `data-inventory.md`"), an explicit row keeps the inventory single-source-of-truth. Owned by [`tasks/mvp/10-heuristic-ai/09-ai-decision-log-channel.md`](../../../../../tasks/mvp/10-heuristic-ai/09-ai-decision-log-channel.md). Suggested row: `state.ai.inspector.*` / in-memory / low / session / n/a / "dev-only inspector buffer; gated by `import.meta.env.DEV` per screen 69".
- **`worker-message.schema.json` field set drifts from `ai-contract.md` § 3 and owning task `Outputs`.** The schema has no `view`, `difficulty`, or `rngSeed` field on `AiTraceRequestPayload`, and no `view` on `AiTraceResultPayload`; the doc pseudocode and the implementing-task `Outputs` list those fields. Reconciliation owner: [`tasks/mvp/02-content-schemas/46-worker-message-envelope-reconciliation.md`](../../../../../tasks/mvp/02-content-schemas/46-worker-message-envelope-reconciliation.md). Per Hard Prohibition D the audit did not edit the schema or the task. Suggested values: lift the missing fields into the schema payloads (`view`: opaque object, `difficulty`: enum, `rngSeed`: string) and pin the difficulty enum (the schema uses `easy|normal|hard|impossible` while the contract uses `Pawn|Knight|Grand Master|Lord|Immortal`).
