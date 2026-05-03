# Screen 69: Dev AI Inspector
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `ui-component-registry.schema.json` | Resolves the overlay's own component tree. | `content-schema/schemas/ui-component-registry.schema.json` |
| `command.schema.json` | Renders the chosen command and validates exported JSON. | `content-schema/schemas/command.schema.json` |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `currentEntry` | `state.ai.inspector.currentEntry` | The `AiDecisionLogEntry` at `bufferIndex`. |
| `viewSnapshotHash` | `state.ai.inspector.currentEntry.view` | xxh64 hex of canonical-JSON of projected view. |
| `wants` | `state.ai.inspector.currentEntry.wants` | Ordered `Want[]`. |
| `scored` | `state.ai.inspector.currentEntry.scored` | Ordered `ScoredAction[]`. |
| `chosen` | `state.ai.inspector.currentEntry.chosen` | The `Command` the AI emitted. |
| `reasoning` | `state.ai.inspector.currentEntry.reasoning` | Free-text. |
| `bufferIndex` | `state.ai.inspector.bufferIndex` | 0 = newest. |
| `replayInFlight` | `state.ai.inspector.replayInFlight` | True while `AI_TRACE_REQUEST` pending. |
| `lastReplay` | `state.ai.inspector.lastReplay` | Last `AI_TRACE_RESULT` payload. |

### Commands And Events
- The overlay does **not** dispatch gameplay commands. It sends
  `AI_TRACE_REQUEST` to the AI worker and receives
  `AI_TRACE_RESULT`. These messages are pinned in
  [`ai-contract.md` § 3 Worker Protocol](../../../ai-contract.md#3-worker-protocol).
- `EXPORT JSON` writes through the `Engine.config.aiDecisionLogPath`
  sink (a side-effect path). It never feeds back into engine state.

### Config Keys
- `config.devAiInspector.hotkey` — default `Ctrl+Shift+A`.
- `config.devAiInspector.urlParameter` — name of the production
  escape-hatch URL parameter; default `dev_ai_inspector`.
- `Engine.config.aiDecisionLog` — boolean; default `false`. When
  `false` the ring buffer is empty.
- `Engine.config.aiDecisionLogPath` — optional path; gates the
  EXPORT JSON sink.

### Localization Keys
- `ui.dev-ai-inspector.header.title`
- `ui.dev-ai-inspector.view.title`
- `ui.dev-ai-inspector.wants.title`
- `ui.dev-ai-inspector.scored.title`
- `ui.dev-ai-inspector.chosen.title`
- `ui.dev-ai-inspector.reasoning.title`
- `ui.dev-ai-inspector.replay.warn-mismatch`

### Asset, Sound, And VFX IDs
- None. The overlay uses CSS-only styling.

### Save And Replay Fields
- The overlay writes nothing to save state. The `aiDecisionLog`
  ring buffer is non-replayed and non-hashed per
  [`ai-contract.md` § 7 Decision Log](../../../ai-contract.md#7-decision-log).
- `EXPORT JSON` writes outside save state; the engine does not
  consume exported files.

### Validation And Fallback
- Build-flag gate: `import.meta.env.DEV === true`. PROD bundles
  must tree-shake the screen unless `?dev_ai_inspector=1` is
  present on the URL (see
  [`ui-technology-choice.md` § Build Flags](../../../ui-technology-choice.md#build-flags)).
- Resolver miss for any component listed here surfaces in
  `state.debug.missingComponentCount` and is caught by
  `scripts/validate-screen-component-coverage.mjs`.
- A trace replay that diverges from the recorded entry is a
  determinism bug; the warn-mismatch banner renders and the
  divergence is captured for QA.
