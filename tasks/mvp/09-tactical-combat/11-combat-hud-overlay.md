# Combat HUD Overlay

Module: [Tactical Combat (M2)](../09-tactical-combat.md)

Description:
Implement the tactical combat overlay: active stack panel, action bar,
spell button, wait/defend controls, battle log, and turn queue. The
renderer paints the field; this task supplies the player controls and
state feedback.

Read First:
- `docs/architecture/wiki/screens/38-combat-screen/spec.md`
- `docs/architecture/wiki/screens/38-combat-screen/interactions.md`
- `docs/architecture/wiki/screens/38-combat-screen/data-contracts.md`
- `docs/architecture/wiki/screens/38-combat-screen/architecture.md`
- `docs/architecture/wiki/screens/38-combat-screen/mockup.html`
- [`docs/architecture/diagrams/09-battle-init.md`](../../../docs/architecture/diagrams/09-battle-init.md)
- [`docs/architecture/diagrams/10-turn-order.md`](../../../docs/architecture/diagrams/10-turn-order.md)

Inputs:
- Screen package `docs/architecture/wiki/screens/38-combat-screen/`
- Battle state from Tasks 1 and 2
- Battle renderer from `mvp.06-renderer.05-1115-tactical-battlefield-renderer`
- UI dispatch hook from `mvp.07-ui-shell.06-command-hook-ui-dispatch-re-render`

Outputs:
- `src/ui/components/CombatHUD.tsx`
- Action handlers for attack, wait, defend, spell targeting, retreat,
  and auto-combat
- Battle log projection from deterministic battle events

Owned Paths:
- `src/ui/components/CombatHUD.tsx`

Dependencies:
- mvp.09-tactical-combat.01-battlestate-init-army-placement-plus-speed-order
- mvp.09-tactical-combat.02-initiative-queue-speed-order-wait-defend-morale
- mvp.06-renderer.05-1115-tactical-battlefield-renderer
- mvp.07-ui-shell.06-command-hook-ui-dispatch-re-render

Acceptance Criteria:
- Layout, bindings, and commands match `docs/architecture/wiki/screens/38-combat-screen/mockup.html`, `docs/architecture/wiki/screens/38-combat-screen/interactions.md`, and `docs/architecture/wiki/screens/38-combat-screen/data-contracts.md`
- Wait and defend buttons dispatch their command variants and update the
  initiative queue
- Spell button opens combat spell targeting only when a valid caster and
  spell are available
- Battle log is derived from deterministic battle events, not ad-hoc UI
  strings
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
