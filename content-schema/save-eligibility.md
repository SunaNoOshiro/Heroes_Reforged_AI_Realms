# Save Eligibility

The pure predicate that decides when the Save button is enabled.

```typescript
function canSaveNow(state: GameState): { allowed: boolean, reason?: SaveDisabledReason }
```

The predicate is a pure function of `state`; it never reads
wall-clock, network status, or animation timeline directly. It is
re-evaluated on every state change subscribed by the system menu
([screen 54](../docs/architecture/wiki/screens/54-system-menu/))
and the save/load screen
([screen 55](../docs/architecture/wiki/screens/55-save-load/)).

## Disallowed reasons

| Reason ID | Triggered when | UX |
|---|---|---|
| `save.disabled.in_battle` | `state.phase === "battle"` (between `START_BATTLE` and `END_BATTLE`) | Save Game item disabled; tooltip: "Finish the battle to save." |
| `save.disabled.not_your_turn` | `state.currentPlayerId !== state.localPlayerId` (multiplayer turn lock) | Save Game item disabled; tooltip: "Wait for your turn to save." |
| `save.disabled.modal_open` | A modal that requires a player choice is open: `level-up`, `creature-dilemma`, `prompt`. | Save Game item disabled; tooltip: "Resolve the open prompt to save." |
| `save.disabled.animating` | Mid-end-of-day animation: `state.ui.animations.activeTimelineId === "end-of-day"` and the post-animation hook has not fired. | Save Game item disabled; tooltip: "Wait for end-of-day to finish." |

If none of the above apply, `canSaveNow` returns
`{ allowed: true }` and the Save Game item is enabled.

## Animation rehydration on load

Loading a save replays the command log silently to the saved
offset. The animation timeline starts empty after `load()` returns:
re-emitted events execute synchronously and do not enqueue
animation timeline entries. The first *post*-load command schedules
animations normally.

This is what makes saving safe in principle — the save record is
purely logical, so the in-flight animation state is irrelevant on
load. The eligibility predicate above keeps the *user-facing*
moments where saving would feel weird (mid-battle, mid-modal,
mid-animation) gated, even though the deterministic replay would
work.

## Localization

The reason IDs above are localization keys. Translators provide
strings under those keys in every locale pack. Cross-cutting
framing in
[`docs/architecture/edge-cases-policy.md` § 8](../docs/architecture/edge-cases-policy.md#8-save-gating-q212).

## Owning files

- [`tasks/mvp/08-persistence/02-log-only-save-format.md`](../tasks/mvp/08-persistence/02-log-only-save-format.md) — `save()` checks the predicate before writing
- [`tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md`](../tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md) — replay-time animation skip
- [`docs/architecture/wiki/screens/54-system-menu/`](../docs/architecture/wiki/screens/54-system-menu/) — Save Game item disable rules
- [`docs/architecture/wiki/screens/55-save-load/`](../docs/architecture/wiki/screens/55-save-load/) — Save tab disable rules
- [`docs/architecture/state-flow.md` § Save eligibility](../docs/architecture/state-flow.md#save-eligibility) — high-level overview
