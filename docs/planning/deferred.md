# Deferred Items Register

> Source plan:
> [`docs/implementation-plans/17-final-critical-questions-plan.md`](../implementation-plans/17-final-critical-questions-plan.md)
> (Q296). This file is the single register of items that are
> deliberately *not* in the current scope. Roadmap, design notes, and
> tasks may *reference* this register; they should not duplicate the
> deferral rationale.

Each row carries a stable `DEF-NNN` ID. The CI gate
[`scripts/check-deferred-coverage.mjs`](../../scripts/check-deferred-coverage.mjs)
warns when a canonical source mentions "v2" / "deferred" without
citing a `DEF-NNN`.

## Status lifecycle

| Status | Meaning |
|---|---|
| `phase-2` | Scheduled for Phase 2 (`tasks/phase-2/`). |
| `phase-3` | Scheduled for Phase 3 (`tasks/phase-3/`). |
| `v2` | Out of scope for the 1.x line; reconsidered post-1.0. |
| `out-of-scope` | Not planned. Re-opening requires a new plan and a `DEC-NNN` decision-log entry. |

---

## Register

| ID | Title | Status | Origin / Audit ref | Rationale |
|---|---|---|---|---|
| DEF-001 | Per-record content versioning | v2 | Q220 | The pack-level version + content hash is sufficient for save/replay determinism in 1.x. Per-record versions add migration cost without unblocking any 1.x scenario. |
| DEF-002 | Spectator slots | v2 | Audit #18 | Lockstep multiplayer ships first as 1v1; spectator/multi-watch requires a separate read-only transport budget that is not on the 1.x critical path. |
| DEF-003 | Streamer mode | v2 | Audit #18 | Hides personal info from overlay; UI surface only; safe to ship after 1.0 once the multiplayer UI is stable. |
| DEF-004 | Replay sharing (URL/social embed) | v2 | Audit #19 | Replay format is locked, but a hosted sharing surface needs a backend service and moderation; out of 1.x scope. |
| DEF-005 | Public mod marketplace | v2 | implied by `pack-contract.md` | Pack signing + revocation infrastructure ships in 1.x; the public marketplace surface (browse/install/rate UI + service backend) is post-1.0. |
| DEF-006 | Dedicated-server / authoritative-server mode | out-of-scope | [`roadmap.md`](./roadmap.md) "Out of Scope" | The 1.x model is peer-to-peer lockstep with optional TURN. An authoritative-server rewrite changes too many contracts to justify before competitive demand exists. |
| DEF-007 | Mobile native app | out-of-scope | [`roadmap.md`](./roadmap.md) "Out of Scope" | Web build is the canonical target; native packaging adds platform-specific build pipelines without changing gameplay. |
| DEF-008 | 3D rendering | out-of-scope | [`roadmap.md`](./roadmap.md) "Out of Scope" | The art direction is 2D. A 3D mode is a parallel renderer track, not a 1.x extension. |
| DEF-009 | Cross-school spell interaction (meta-magic) | v2 | [`spells-and-mage-guild.md`](../architecture/spells-and-mage-guild.md) §7 | Not designed; explicitly out of scope until a ruleset pack adds capabilities. |
| DEF-010 | Faction-defined spell schools | v2 | [`spells-and-mage-guild.md`](../architecture/spells-and-mage-guild.md) §7 | Schools are a closed enum in the spell schema; adding a new school requires a library pack and a schema-version bump. |
| DEF-011 | Spell creation / custom spell editor | phase-2 | [`spells-and-mage-guild.md`](../architecture/spells-and-mage-guild.md) §7 | Editor for new spells lands in the Phase-2 content-editor module. |
| DEF-012 | Tournament-quality polish & advanced AI | phase-3 | [`roadmap.md`](./roadmap.md) M7 | Polish and stronger AI ride the post-multiplayer track; not a 1.x blocker. |
| DEF-013 | Per-match anonymous-stats emission against a real backend | phase-3 | [`observability.md`](../architecture/observability.md) | The interfaces and event schema land in Phase 2; a hosted backend is a Phase 3 deployment item. |
| DEF-014 | Public revocation-list service deployment | phase-3 | [`rollback-playbook.md`](../operations/rollback-playbook.md) | The signed revocation-list contract is in 1.x; the hosted service deployment is a Phase-3 ops item. |
| DEF-015 | Cross-engine Playwright parity for Safari + Firefox | phase-3 | plan 17 §5 Group D | Chromium parity is the 1.x gate; Safari and Firefox are gated behind an env flag until the M0 cross-env CI job is stable. |
| DEF-016 | Dedicated lobby browser / friend list | phase-3 | [`docs/implementation-plans/18-room-codes-and-lobby-discovery-plan.md`](../implementation-plans/18-room-codes-and-lobby-discovery-plan.md) | The 1.x multiplayer entry-point is invite-link only; a discoverable lobby is Phase-3. |
| DEF-017 | Hosted AI gateway runtime | phase-3 | [`services/ai-gateway/README.md`](../../services/ai-gateway/README.md), [`ai-integration.md`](../architecture/ai-integration.md) | The gateway is **optional infrastructure**, not a 1.x feature. The 1.x AI-generation path is **BYO-key** per [plan 29](../implementation-plans/29-rate-limiting-and-secret-management-plan.md): the player supplies their own provider API key, the browser calls the provider directly, no project-side secret exists. The hosted gateway lands only if/when the project pays for a shared key — Phase-3 ops item. Today: contracts + retention rules only; no runtime. |

---

## Adding A New Entry

1. Pick the next `DEF-NNN`.
2. Add a row above with status, the audit / planning reference, and a
   one-sentence rationale.
3. Replace any inline "v2"/"deferred" mention in canonical sources
   with a link to this row.
4. Run `npm run validate:deferred`.
