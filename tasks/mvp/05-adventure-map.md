# Module: Adventure Map (M1)

The strategic game loop: heroes move across the map, capture resources, visit towns, and trigger battles. This module makes the game "playable" for the first time — after this, a human can sit down and play a 7-day session.

**Milestone**: M1 — Strategic Vertical  
**Total Estimate**: ~73 hours
**Exit Criteria**: A human can play a full 7-day solo session against the AI — move heroes, capture mines, build in towns, and trigger auto-resolve combat.

---

## Self-Contained Brief

- **Purpose**: The strategic game loop — heroes, towns, resources,
  daily income, two-hero-per-town protocol, auto-resolve trigger.
- **Public surface**: command kinds in
  [`docs/architecture/command-schema.md`](../../docs/architecture/command-schema.md);
  state shape in [`docs/architecture/state-shape.md`](../../docs/architecture/state-shape.md);
  cross-module dispatch via [`src/contracts/command-bus.ts`](../../src/contracts/command-bus.ts).
- **Side effects**: row "src/engine/" in
  [`docs/architecture/side-effect-matrix.md`](../../docs/architecture/side-effect-matrix.md)
  (pure reducer additions).
- **NFR**: NFR-CAP-02 (≤ 64 heroes), NFR-PERF-01 (frame budget
  on 200×200) in [`docs/architecture/non-functional-requirements.md`](../../docs/architecture/non-functional-requirements.md).
- **Exit criteria**: see header.

---

## Task Files

- [01-strategic-game-state-model.md](05-adventure-map/01-strategic-game-state-model.md)
  🧠 Task 1: Strategic game state model (~4h)
- [02-turn-structure.md](05-adventure-map/02-turn-structure.md)
  🧠 Task 2: Turn structure (~4h)
- [03-hero-movement.md](05-adventure-map/03-hero-movement.md)
  🧠 Task 3: Hero movement (~4h)
- [04-resource-mine-capture-plus-daily-income.md](05-adventure-map/04-resource-mine-capture-plus-daily-income.md)
  🧠 Task 4: Resource mine capture + daily income (~3h)
- [05-town-visit-recruit-build-mage-guild.md](05-adventure-map/05-town-visit-recruit-build-mage-guild.md)
  🧠 Task 5: Town visit (recruit, build, mage guild) (~4h)
- [06-auto-resolve-combat.md](05-adventure-map/06-auto-resolve-combat.md)
  🤖 Task 6: Auto-resolve combat (~3h)
- [07-victory-defeat-conditions.md](05-adventure-map/07-victory-defeat-conditions.md)
  🤖 Task 7: Victory / defeat conditions (~2h)
- [08-7-day-playable-smoke-test.md](05-adventure-map/08-7-day-playable-smoke-test.md)
  🤖 Task 8: 7-day playable smoke test (~2h) (⚠️ — integration test, many dependencies)
- [09-map-object-dialogs.md](05-adventure-map/09-map-object-dialogs.md)
  🧠 Task 9: Map object dialogs (~4h)
- [10-trade-resources-command.md](05-adventure-map/10-trade-resources-command.md)
  🤖 Task 10: Trade resources command (~3h)
- [11-hire-tavern-hero-command.md](05-adventure-map/11-hire-tavern-hero-command.md)
  🧠 Task 11: Hire tavern hero command (~4h)
- [12-release-prison-hero-command.md](05-adventure-map/12-release-prison-hero-command.md)
  🤖 Task 12: Release prison hero command (~3h)
- [13-recruit-external-dwelling-command.md](05-adventure-map/13-recruit-external-dwelling-command.md)
  🧠 Task 13: Recruit external dwelling command (~4h)
- [14-collect-creature-bank-reward-command.md](05-adventure-map/14-collect-creature-bank-reward-command.md)
  🤖 Task 14: Collect creature bank reward command (~3h)
- [15-acknowledge-week-month-event-command.md](05-adventure-map/15-acknowledge-week-month-event-command.md)
  🤖 Task 15: Acknowledge week/month event command (~2h)
- [17-split-army-stack-command.md](05-adventure-map/17-split-army-stack-command.md)
  🤖 Task 17: Split army stack command (~3h)
- [18-transfer-stack-commands.md](05-adventure-map/18-transfer-stack-commands.md)
  🧠 Task 18: Transfer stack commands (~4h)
- [20-upgrade-army-stack-command.md](05-adventure-map/20-upgrade-army-stack-command.md)
  🧠 Task 20: Upgrade army stack command (~4h)
- [21-map-object-visit-and-battle-initiation-commands.md](05-adventure-map/21-map-object-visit-and-battle-initiation-commands.md)
  🧠 Task 21: Map object visit and battle initiation commands (~4h)
- [22-obelisk-visits-and-grail-state.md](05-adventure-map/22-obelisk-visits-and-grail-state.md)
  🧠 Task 22: Obelisk visits and grail state (~4h)
