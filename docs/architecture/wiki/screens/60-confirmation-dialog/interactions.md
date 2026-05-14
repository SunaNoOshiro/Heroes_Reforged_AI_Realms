# Screen 60: Confirmation Dialog
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Reusable confirmation modal for destructive, irreversible, or
route-changing actions. Behaviour and timing live here;
sibling [`spec.md`](./spec.md) owns regions and bindings,
[`data-contracts.md`](./data-contracts.md) owns the payload schema.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Confirm | `confirm.accept` | command | Pending destination | `CONFIRM_PENDING_ACTION` | Dispatches the caller-provided command/event. Disabled until [`ConfirmEnabled`](#confirmenabled-predicate) holds. | Modal pop-in, warning icon pulse, `Confirm` depresses, then the caller-provided transition animation plays. |
| Cancel | `confirm.cancel` | navigation | Caller screen | `CANCEL_PENDING_CONFIRMATION` | Clears the pending action without mutation. | Modal pop-out, no caller transition. |
| Type challenge | `confirm.typeChallenge` | local-ui | Current screen | `SET_CONFIRM_TYPED_TEXT` | Updates `state.ui.confirmation.typedConfirmText` from the `RequireTypeChallenge` field. Mounted only when `requireType != null`. | Inline echo on the input. |

### State Changes
- `state.ui.confirmation.pendingAction`, `.promptKey`, `.callerRoute`,
  `.payload`, `.severity` — written once by `REQUEST_CONFIRMATION` and
  read-only thereafter; cleared on close.
- `state.ui.confirmation.openedAt` — written once at mount; read-only
  thereafter.
- `state.ui.confirmation.confirmDelayMs` — set from the caller payload
  or, when omitted, from the per-severity default in
  [`spec.md` § Click-Through Resistance](./spec.md#click-through-resistance).
- `state.ui.confirmation.requireType` — set from the caller payload
  (optional). When non-null, `RequireTypeChallenge` mounts.
- `state.ui.confirmation.typedConfirmText` — refreshes after every
  keystroke in `RequireTypeChallenge`; cleared on close.
- `state.ui.confirmation.popInComplete` — flips to `true` on the
  pop-in animation end-frame; cleared on close.
- UI-only hover, focus, selected row, open tab, target cursor, drag
  ghost, and animation-frame state stay outside deterministic
  gameplay state.

### `ConfirmEnabled` Predicate
Closed predicate driving the `Confirm` button's `disabled` attribute:

```text
ConfirmEnabled =
     pendingAction != null
  && now() - openedAt >= confirmDelayMs
  && popInComplete === true
  && (requireType == null || typedConfirmText === requireType)
```

While the predicate is `false`:
- the button stays `disabled` and shows the disabled cursor
  affordance,
- `audio.ui.click` is suppressed on the button hitbox,
- `Enter` / `Space` keyboard activation is blocked per
  [`ui-hotkeys.md`](../../../ui-hotkeys.md) (`global.confirm`).

`Escape` on the modal always routes to `CANCEL_PENDING_CONFIRMATION`
regardless of the predicate, per the Esc precedence ladder in
[`ui-input-arbitration.md`](../../../ui-input-arbitration.md).

### Navigation Outcomes
- `Confirm` routes to the pending destination after guard approval
  and exit animation.
- `Cancel` routes to the caller screen after exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records,
  resource costs, target legality, ownership, phase, or route guards
  fail.
- Missing presentation assets may use resolver fallback. Missing
  gameplay records, invalid content IDs, or rejected commands fail
  loudly.
- On rejection, keep the dialog open, preserve local draft when
  useful, show localized error text, and play failure feedback.
- Error strings are produced by `formatUserError(err, locale)` per
  [`error-formatter.md`](../../../error-formatter.md); never
  construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather
  than introduce new behavior.

## Error surfaces

Per [`error-ux.md`](../../../error-ux.md) § 5, this screen inherits
the default code → surface mapping from § 2. The table below maps each
`command`-typed action to its default surface for this screen's
dominant error domain. A row whose Notes column reads `override`
replaces the § 2 default; otherwise the default applies. Specific
codes (e.g. `DISPATCHER_<token>`, `STORAGE_<token>`) land alongside
the engine reducer that owns each command and trigger the gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing for them.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Confirm (`CONFIRM_PENDING_ACTION`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per [`error-ux.md` § 2 `DISPATCHER_*`](../../../error-ux.md#2-code--surface-mapping); disabled control + tooltip on rejection. |

---

## 🔍 Sync Check

- **UI: ✔** — Action IDs (`confirm.accept`, `confirm.cancel`, `confirm.typeChallenge`) and `Confirm`/`Cancel` button hitboxes match `mockup.html`'s `data-action` attributes; component names and selector paths match sibling [`spec.md` § State Bindings](./spec.md#state-bindings).
- **Schema: ✔** — All three dispatched commands are defined in [`command-schema.md` § Consent, Onboarding & Destructive-UX Commands](../../../command-schema.md#consent-onboarding--destructive-ux-commands); `SET_CONFIRM_TYPED_TEXT` is correctly marked local-ui and never enters the engine command log.
- **Tasks: ✔** — `DISPATCHER_REJECTED` row uses the § 2 default surface per [`error-ux.md`](../../../error-ux.md); owning task [`phase-2.07-ui-screen-backlog.60-confirmation-dialog-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/60-confirmation-dialog-screen.md) and gate-enforcer [`mvp.07-ui-shell.28-confirmation-dialog-hardening`](../../../../../tasks/mvp/07-ui-shell/28-confirmation-dialog-hardening.md) both Read First this file.

## ⚠ Issues

- **Cancel-row animation cell rewritten.** The previous revision repeated the Confirm animation text verbatim ("`Confirm` button depresses, accepted action plays caller-provided transition animation") in the Cancel row, which contradicts the Animation Contract in sibling [`spec.md` § Animation Contract](./spec.md#animation-contract) — Cancel never depresses `Confirm` and has no accepted action. Rewrote the Cancel cell to the modal-pop-out behaviour implied by the contract. No code or contract change implied.
