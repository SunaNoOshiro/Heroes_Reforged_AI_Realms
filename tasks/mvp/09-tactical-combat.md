# Module: Tactical Combat (M2)

The hex-based battle system. This replaces auto-resolve from M1 and is
the core gameplay loop. Every formula is defined in the ruleset pack as
a structured integer AST — no per-formula TypeScript constants.

**Milestone**: M2 — Tactical Combat
**Total Estimate**: ~46 hours
**Exit Criteria**: Two Emberwild armies fight a real 11×15 hex battle
with correct damage, initiative, morale, retaliation, and unit
abilities. Replay of a 20-round battle produces identical hashes across
three independent runs with the same seed.

---

## Task Files

- [01-battlestate-init-army-placement-plus-speed-order.md](09-tactical-combat/01-battlestate-init-army-placement-plus-speed-order.md)
  🧠⚠️ Task 1: BattleState init — army placement + speed order (~4h)
- [02-initiative-queue-speed-order-wait-defend-morale.md](09-tactical-combat/02-initiative-queue-speed-order-wait-defend-morale.md)
  🧠⚠️ Task 2: Initiative queue — speed order, wait, defend, morale (~4h)
- [02a-defend-damage-reduction.md](09-tactical-combat/02a-defend-damage-reduction.md)
  🤖 Task 2a: DEFEND damage reduction — fixed-point formula (~2h)
- [03-damage-formula.md](09-tactical-combat/03-damage-formula.md)
  🧠⚠️ Task 3: Damage formula — integer AST against baseline ruleset (~4h)
- [04-ranged-attack-obstacle-check-range-limit.md](09-tactical-combat/04-ranged-attack-obstacle-check-range-limit.md)
  🧠 Task 4: Ranged attack — obstacle check, range limit (~3h)
- [05-retaliation-once-per-round-nullification.md](09-tactical-combat/05-retaliation-once-per-round-nullification.md)
  🧠 Task 5: Retaliation — once per round, nullification (~3h)
- [06-morale-and-luck-rolls.md](09-tactical-combat/06-morale-and-luck-rolls.md)
  🧠 Task 6: Morale and luck rolls (~3h)
- [07-unit-abilities-flying-double-strike-breath-no-retaliation.md](09-tactical-combat/07-unit-abilities-flying-double-strike-breath-no-retaliation.md)
  🧠 Task 7: Unit abilities — Flying, Double Strike, Breath, No Retaliation (~4h)
- [08-battle-end-condition.md](09-tactical-combat/08-battle-end-condition.md)
  🤖 Task 8: Battle end condition (~2h)
- [09-replace-auto-resolve-with-real-battle.md](09-tactical-combat/09-replace-auto-resolve-with-real-battle.md)
  🤖 Task 9: Replace auto-resolve with real battle (~2h)
- [10-replay-smoke-test-20-round-battle.md](09-tactical-combat/10-replay-smoke-test-20-round-battle.md)
  🤖 Task 10: Replay smoke test — 20-round battle (~3h)
- [11-combat-hud-overlay.md](09-tactical-combat/11-combat-hud-overlay.md)
  🧠 Task 11: Combat HUD overlay (~4h)
- [12-tactics-phase-engine.md](09-tactical-combat/12-tactics-phase-engine.md)
  🧠 Task 12: Tactics phase engine (~4h)
- [13-retreat-and-surrender-commands.md](09-tactical-combat/13-retreat-and-surrender-commands.md)
  🧠 Task 13: Retreat and surrender commands (~4h)
