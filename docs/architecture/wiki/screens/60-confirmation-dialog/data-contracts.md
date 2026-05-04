# Screen 60: Confirmation Dialog
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | `content-schema/schemas/asset-index.schema.json` |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | `content-schema/schemas/localization.schema.json` |
| `ruleset.schema.json` | Deterministic constants, formulas, and guard rules consumed by commands. | `content-schema/schemas/ruleset.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `pendingAction` | `state.ui.confirmation.pendingAction` | Action/event awaiting confirmation. |
| `promptKey` | `state.ui.confirmation.promptKey` | Localized prompt key. |
| `callerRoute` | `state.ui.confirmation.callerRoute` | Screen to return on cancel. |
| `confirmPayload` | `state.ui.confirmation.payload` | Stable IDs/scalars passed on confirm. |
| `severity` | `state.ui.confirmation.severity` | Closed enum `info` / `warning` / `critical`. Drives both styling and the click-through-resistance gate per [`spec.md` § Click-Through Resistance](./spec.md#click-through-resistance). |
| `openedAt` | `state.ui.confirmation.openedAt` | Wall-clock at mount; never persisted to saves or replays. |
| `confirmDelayMs` | `state.ui.confirmation.confirmDelayMs` | Optional ms delay; defaults to the per-severity table when omitted. |
| `requireType` | `state.ui.confirmation.requireType` | Optional literal text the user must type before `Confirm` enables. |
| `typedConfirmText` | `state.ui.confirmation.typedConfirmText` | Live `RequireTypeChallenge` input; cleared on close. |
| `popInComplete` | `state.ui.confirmation.popInComplete` | Pop-in animation end flag. |
| `selectConfirmEnabled` | `selectors.ui.confirmation.confirmEnabled` | Pure selector implementing the [`ConfirmEnabled` predicate](./interactions.md#confirmenabled-predicate). |

### `REQUEST_CONFIRMATION` Payload Schema
Callers dispatch `REQUEST_CONFIRMATION` with the following closed shape;
the dispatcher validates the payload and applies the per-severity
defaults when optional fields are omitted (see
[`spec.md` § Click-Through Resistance](./spec.md#click-through-resistance)):

```typescript
{
  kind: "REQUEST_CONFIRMATION",
  pendingAction: Command,                       // any closed-enum command
  promptKey: string,                            // localization key
  severity: "info" | "warning" | "critical",    // load-bearing
  callerRoute: ScreenId,
  payload?: Record<string, string | number | boolean>,
  confirmDelayMs?: number,                      // optional override
  requireType?: string                          // critical-only opt-in
}
```

### Commands And Events
- `CONFIRM_PENDING_ACTION` from `confirm.accept`: Dispatches caller-provided command/event. Gated by [`ConfirmEnabled`](./interactions.md#confirmenabled-predicate).
- `CANCEL_PENDING_CONFIRMATION` from `confirm.cancel`: Clears pending action without mutation.
- `SET_CONFIRM_TYPED_TEXT` from `confirm.typeChallenge`: Updates `state.ui.confirmation.typedConfirmText` while the `RequireTypeChallenge` is mounted. local-ui only; never enters saves or replays.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.confirmation-dialog.title`
- `ui.confirmation-dialog.actions.*`
- `ui.confirmation-dialog.status.*`
- `ui.confirmation-dialog.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.confirmation-dialog.background`
- `ui.confirmation-dialog.frame`
- `ui.confirmation-dialog.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.system.*`
- `vfx.confirmation-dialog.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Executes only the pending confirmed event supplied by caller. Dialog itself has no gameplay logic beyond confirm/cancel routing.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
