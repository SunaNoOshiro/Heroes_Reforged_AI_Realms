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
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |
| `ruleset.schema.json` | Deterministic constants and guard rules consumed by caller commands (the dialog itself owns no ruleset entries). | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `pendingAction` | `state.ui.confirmation.pendingAction` | Caller command/event awaiting confirmation. |
| `promptKey` | `state.ui.confirmation.promptKey` | Localized prompt key. |
| `callerRoute` | `state.ui.confirmation.callerRoute` | Screen to return to on cancel. |
| `confirmPayload` | `state.ui.confirmation.payload` | Stable IDs / scalars passed through on confirm. |
| `severity` | `state.ui.confirmation.severity` | Closed enum `info` / `warning` / `critical`. Drives both styling and the input-gate predicate per [`spec.md` § Click-Through Resistance](./spec.md#click-through-resistance). |
| `openedAt` | `state.ui.confirmation.openedAt` | Wall-clock at mount; never persisted to saves or replays. |
| `confirmDelayMs` | `state.ui.confirmation.confirmDelayMs` | Optional ms delay; defaults to the per-severity table when omitted. |
| `requireType` | `state.ui.confirmation.requireType` | Optional literal text the user must type before `Confirm` enables. |
| `typedConfirmText` | `state.ui.confirmation.typedConfirmText` | Live `RequireTypeChallenge` input; cleared on close. |
| `popInComplete` | `state.ui.confirmation.popInComplete` | Pop-in animation end-frame flag. |
| `selectConfirmEnabled` | `selectors.ui.confirmation.confirmEnabled` | Pure selector implementing the [`ConfirmEnabled` predicate](./interactions.md#confirmenabled-predicate). |

### `REQUEST_CONFIRMATION` Payload Schema
Callers dispatch `REQUEST_CONFIRMATION` with this closed shape. The
dispatcher (single builder under `src/ui/confirmation/`) validates the
payload and applies the per-severity defaults from
[`spec.md` § Click-Through Resistance](./spec.md#click-through-resistance)
when the optional fields are omitted:

```typescript
{
  kind: "REQUEST_CONFIRMATION",
  pendingAction: Command,                       // any closed-enum command
  promptKey: string,                            // localization key
  severity: "info" | "warning" | "critical",    // load-bearing input gate
  callerRoute: ScreenId,
  payload?: Record<string, string | number | boolean>,
  confirmDelayMs?: number,                      // optional override
  requireType?: string                          // critical-only opt-in
}
```

### Commands And Events
- `CONFIRM_PENDING_ACTION` from `confirm.accept` — dispatches the
  caller-provided command/event. Gated by the
  [`ConfirmEnabled`](./interactions.md#confirmenabled-predicate)
  predicate.
- `CANCEL_PENDING_CONFIRMATION` from `confirm.cancel` — clears the
  pending action without mutation.
- `SET_CONFIRM_TYPED_TEXT` from `confirm.typeChallenge` — updates
  `state.ui.confirmation.typedConfirmText` while
  `RequireTypeChallenge` is mounted. Local-ui only; never enters
  saves or replays.

All four (`REQUEST_CONFIRMATION` plus the three above) are catalogued
in [`command-schema.md` § Consent, Onboarding & Destructive-UX Commands](../../../command-schema.md#consent-onboarding--destructive-ux-commands).

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
- `error.dispatcher.rejected.body` — see [`interactions.md` § Error surfaces](./interactions.md#error-surfaces)

### Asset, Sound, And VFX IDs
- `ui.confirmation-dialog.background`
- `ui.confirmation-dialog.frame`
- `ui.confirmation-dialog.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.system.*`
- `vfx.confirmation-dialog.*`

### Save And Replay Fields
- The dialog persists no state of its own. All `state.ui.confirmation.*`
  selectors are presentation-only; `openedAt` is wall-clock and is
  explicitly excluded from saves, replays, and the canonical state
  hash.
- Persisted gameplay state is owned by the caller command that
  `pendingAction` resolves to.
- Replays carry stable IDs and scalar command inputs only — never raw
  paths, localized labels, rendered positions, or wall-clock
  timestamps.

### Validation And Fallback
- The dialog executes only the pending command supplied by the
  caller; it owns no gameplay logic beyond confirm/cancel routing.
- Missing presentation may fall back through the asset resolver.
- Missing gameplay records, invalid commands, and unresolved content
  IDs fail loudly before controls become enabled, per
  [`fail-loud.md`](../../../fail-loud.md).

---

## 🔍 Sync Check

- **UI: ✔** — Selector table covers every binding in sibling [`spec.md` § State Bindings](./spec.md#state-bindings) plus the `selectConfirmEnabled` pure selector behind the [`ConfirmEnabled`](./interactions.md#confirmenabled-predicate) predicate; localization, asset, and VFX prefix sets match the patterns in `mockup.html`.
- **Schema: ✔** — `REQUEST_CONFIRMATION` payload shape and the three command/event tokens match [`command-schema.md` § Consent, Onboarding & Destructive-UX Commands](../../../command-schema.md#consent-onboarding--destructive-ux-commands); referenced schemas (`asset-index`, `localization`, `ruleset`) exist under `content-schema/schemas/`.
- **Tasks: ✔** — Owning task [`phase-2.07-ui-screen-backlog.60-confirmation-dialog-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/60-confirmation-dialog-screen.md) reads this file; hardening task [`mvp.07-ui-shell.28-confirmation-dialog-hardening`](../../../../../tasks/mvp/07-ui-shell/28-confirmation-dialog-hardening.md) `Acceptance Criteria` enumerates every selector listed above (`severity`, `openedAt`, `confirmDelayMs`, `requireType`, `typedConfirmText`, `popInComplete`).

## ⚠ Issues

- **No `state.ui.confirmation.*` row in `data-inventory.md`.** Verified absence by grep. Not a CI gap: every selector in this file is presentation-only (transient UI state, wall-clock timestamp, ephemeral typed text). Per [CLAUDE.md](../../../../../CLAUDE.md) the inventory requirement covers *persisted* fields, and the Save And Replay section above asserts none of these persist. Leaving as-is; flag here so future audits can confirm the transient classification still holds.
