# Screen 74: AI Provenance Detail
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Surface `manifest.aiProvenance` to the player. Read-only; no
mutation. Triggered by the `[AI]` badge on info-cards or by
`OPEN_AI_PROVENANCE` from the pack-manager (screen 71).

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Open provenance | `aiProvenance.open` | navigation | Current screen | `OPEN_AI_PROVENANCE` | Mounts the modal with the target pack's provenance block. | Modal drops in over dimmed caller. |
| Close | `aiProvenance.close` | local-ui | Caller | `CLOSE_AI_PROVENANCE` | Drops the modal. | Modal fades. |
| Open content report | `aiProvenance.report` | navigation | `75-content-report` | `OPEN_CONTENT_REPORT` | Routes to screen 75 with `targetType = ai-faction` and `targetId = pack.id` pre-filled. | Modal crossfades. |

All three tokens are local-ui via the `OPEN_` / `CLOSE_` prefix
list in
[`screen-command-coverage.json`](../../../screen-command-coverage.json);
none enter the deterministic engine command log. Catalogued in
[`command-schema.md` § UGC, Privacy & Content-Report Commands](../../../command-schema.md#ugc-privacy--content-report-commands).

### State Changes
- No deterministic state is mutated.
- UI-only hover, focus, scroll, and animation frame stay outside
  deterministic gameplay state.

### Navigation Outcomes
- Close routes back to the caller (info-card, pack-manager).
- Report routes to screen 75 (content-report).

### Disabled And Error Cases
- `aiProvenance.present === false` → screen does not mount; the
  `[AI]` badge is not rendered upstream.
- `aiProvenance.playerInspectable === false` → body collapses to a
  single line `ui.ai-provenance.details-unavailable`; detail rows
  are hidden; the close affordance remains.

### Error Formatter
- Errors are produced by `formatUserError(err, locale)` declared in
  [`docs/architecture/error-formatter.md`](../../../error-formatter.md);
  never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather
  than inventing new behavior.
- All copy follows
  [`ugc-safety.md` § 7 Localization Keys](../../../ugc-safety.md#7-localization-keys).

---

## 🔍 Sync Check

- **UI: ✔** — Action IDs (`aiProvenance.open|close|report`) and
  command tokens match sibling
  [`data-contracts.md`](./data-contracts.md) Commands And Events;
  state references match [`spec.md`](./spec.md) State Bindings and
  [`architecture.md`](./architecture.md) § 5 State Inputs. Screen-75
  routing payload matches sibling
  [`75-content-report/data-contracts.md`](../75-content-report/data-contracts.md)
  (`target = { targetType, targetId, contentHash? }`).
- **Schema: ✔** — `aiProvenance.present` and
  `aiProvenance.playerInspectable` semantics match
  [`manifest.schema.json`](../../../../../content-schema/schemas/manifest.schema.json)
  lines 119–135. `targetType: "ai-faction"` is a closed enum value
  in
  [`content-report.schema.json`](../../../../../content-schema/schemas/content-report.schema.json).
- **Tasks: ✔** — `OPEN_AI_PROVENANCE` and `CLOSE_AI_PROVENANCE` are
  owned by
  [`phase-2.05-mod-system.13-ai-provenance-detail-screen`](../../../../../tasks/phase-2/05-mod-system/13-ai-provenance-detail-screen.md);
  `OPEN_CONTENT_REPORT` is owned by
  [`phase-2.05-mod-system.12-content-report-intake-and-local-queue`](../../../../../tasks/phase-2/05-mod-system/12-content-report-intake-and-local-queue.md)
  per
  [`command-schema.md` § UGC, Privacy & Content-Report Commands](../../../command-schema.md#ugc-privacy--content-report-commands).

## ⚠ Issues

_None._
