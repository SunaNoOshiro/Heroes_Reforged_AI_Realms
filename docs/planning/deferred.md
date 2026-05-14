# Deferred Items Register

> Single register of items deliberately **not** in current scope.
> Roadmap, design notes, and tasks may *reference* a row; they must
> not duplicate the rationale.

Each row has a stable `DEF-NNN` ID. The CI gate
[`scripts/check-deferred-coverage.mjs`](../../scripts/check-deferred-coverage.mjs)
(wired as `npm run validate:deferred`) scans `docs/architecture/`,
`docs/planning/`, `docs/operations/`, and `tasks/` for `DEF-NNN`
references and reports any that are not declared in this file.
Informational by default; set `HR_DEFERRED_STRICT=1` to fail.

## 1. Status lifecycle

| Status | Meaning |
|---|---|
| `phase-2` | Scheduled for Phase 2 (`tasks/phase-2/`). |
| `phase-3` | Scheduled for Phase 3 (`tasks/phase-3/`). |
| `v2` | Out of scope for the 1.x line; reconsidered post-1.0. |
| `out-of-scope` | Not planned. Re-opening requires a new plan and a `DEC-NNN` decision-log entry. |

---

## 2. Register

| ID | Title | Status | Origin | Rationale |
|---|---|---|---|---|
| DEF-001 | Per-record content versioning | v2 | versioning policy | Pack-level version + content hash is sufficient for save/replay determinism in 1.x. Per-record versions add migration cost without unblocking any 1.x scenario. |
| DEF-002 | Spectator slots | v2 | multiplayer scope | Lockstep multiplayer ships as 1v1; spectator/multi-watch needs a separate read-only transport budget that is not on the 1.x critical path. |
| DEF-003 | Streamer mode | v2 | multiplayer scope | Hides personal info from overlay; UI surface only; safe to ship after 1.0 once the multiplayer UI is stable. |
| DEF-004 | Replay sharing (URL / social embed) | v2 | replay scope | Replay format is locked, but a hosted sharing surface needs a backend service and moderation; out of 1.x scope. |
| DEF-005 | Public mod marketplace | v2 | implied by [`pack-contract.md`](../architecture/pack-contract.md) | Pack signing + revocation infrastructure ships in 1.x; the public marketplace surface (browse / install / rate UI + service backend) is post-1.0. |
| DEF-006 | Dedicated-server / authoritative-server mode | out-of-scope | [`roadmap.md`](./roadmap.md) "Out of Scope For Early Milestones" | The 1.x model is peer-to-peer lockstep with optional TURN. An authoritative-server rewrite changes too many contracts to justify before competitive demand exists. |
| DEF-007 | Mobile native app | out-of-scope | [`roadmap.md`](./roadmap.md) "Out of Scope For Early Milestones" | Web build is the canonical target; native packaging adds platform-specific build pipelines without changing gameplay. |
| DEF-008 | 3D rendering | out-of-scope | [`roadmap.md`](./roadmap.md) "Out of Scope For Early Milestones" | The art direction is 2D. A 3D mode is a parallel renderer track, not a 1.x extension. |
| DEF-009 | Cross-school spell interaction (meta-magic) | v2 | [`spells-and-mage-guild.md`](../architecture/spells-and-mage-guild.md) § 7 | Not designed; explicitly out of scope until a ruleset pack adds capabilities. |
| DEF-010 | Faction-defined spell schools | v2 | [`spells-and-mage-guild.md`](../architecture/spells-and-mage-guild.md) § 7 | Schools are a closed enum in the spell schema; adding a new school requires a library pack and a schema-version bump. |
| DEF-011 | Spell creation / custom spell editor | phase-2 | [`spells-and-mage-guild.md`](../architecture/spells-and-mage-guild.md) § 7 | Editor for new spells lands in the Phase-2 content-editor module ([`tasks/phase-2/04-content-editor/`](../../tasks/phase-2/04-content-editor/)). |
| DEF-012 | Tournament-quality polish & advanced AI | phase-3 | [`roadmap.md`](./roadmap.md) M7 | Polish and stronger AI ride the post-multiplayer track; not a 1.x blocker. |
| DEF-013 | Per-match anonymous-stats emission against a real backend | phase-3 | [`observability.md`](../architecture/observability.md) | Interfaces and event schema land in Phase 2; a hosted backend is a Phase-3 deployment item. |
| DEF-014 | Public revocation-list service deployment | phase-3 | [`rollback-playbook.md`](../operations/rollback-playbook.md) | The signed revocation-list contract is in 1.x; the hosted service deployment is a Phase-3 ops item. |
| DEF-015 | Cross-engine Playwright parity for Safari + Firefox | phase-3 | cross-engine CI policy | Chromium parity is the 1.x gate; Safari and Firefox are gated behind an env flag until the M0 cross-env CI job is stable. |
| DEF-016 | Dedicated lobby browser / friend list | phase-3 | [`signaling-rate-limits.md`](../architecture/signaling-rate-limits.md) | The 1.x multiplayer entry point is invite-link only; a discoverable lobby is Phase-3. |
| DEF-017 | Hosted AI gateway runtime | phase-3 | [`services/ai-gateway/README.md`](../../services/ai-gateway/README.md), [`ai-integration.md`](../architecture/ai-integration.md) | The gateway is **optional infrastructure**, not a 1.x feature. The 1.x AI-generation path is **BYO-key**: the player supplies their own provider API key, the browser calls the provider directly, no project-side secret exists. The hosted gateway lands only if/when the project pays for a shared key — Phase-3 ops item. Today: contracts + retention rules only; no runtime. |

---

## 3. Adding a new entry

1. Pick the next `DEF-NNN`.
2. Add a row above with status, audit / planning origin, and a
   one-sentence rationale.
3. Replace any inline "v2" / "deferred" mention in canonical sources
   with a link to this row.
4. Run `npm run validate:deferred`.

---

## 🔍 Sync Check

- **UI: ✔** — No UI surfaces are asserted by this register; rows only point at architecture / planning / ops docs.
- **Schema: ✔** — No schema claims; the `out-of-scope` / `phase-2` / `phase-3` / `v2` labels are internal-doc enums, not schema-matrix rows.
- **Tasks: ✔** — `tasks/phase-2/` and `tasks/phase-3/` directories exist; reciprocal `DEF-NNN` citations confirmed in [`observability.md`](../architecture/observability.md) (DEF-013), [`rollback-playbook.md`](../operations/rollback-playbook.md) (DEF-014), [`ai-integration.md`](../architecture/ai-integration.md) and [`services/ai-gateway/README.md`](../../services/ai-gateway/README.md) (DEF-017), and [`spells-and-mage-guild.md`](../architecture/spells-and-mage-guild.md) § 7 (DEF-009 / 010 / 011 via "Phase 2" callout).

## ⚠ Issues

- **Gate description drifts from script behavior.** The prior text said the gate "warns when a canonical source mentions 'v2' / 'deferred' without citing a `DEF-NNN`". The actual script ([`scripts/check-deferred-coverage.mjs`](../../scripts/check-deferred-coverage.mjs)) performs a **referential-integrity** check: it scans `docs/architecture/`, `docs/planning/`, `docs/operations/`, and `tasks/` for `DEF-NNN` references and reports any that are not declared here. It does **not** today scan for uncited "v2" / "deferred" strings, even though the script's own header comment states that as the intent. The rewrite describes current behavior; closing the intent gap (adding the "v2" / "deferred" inline scan) would require editing the script — out of scope for this audit (Hard Prohibition D).
- **DEF-005 origin is one-way.** The row cites "implied by [`pack-contract.md`](../architecture/pack-contract.md)" as origin, but `pack-contract.md` does not reciprocally link `DEF-005` (it mentions a "signed marketplace listing" without a deferred citation). Per [`scripts/check-deferred-coverage.mjs`](../../scripts/check-deferred-coverage.mjs)'s stated intent, the pack-contract owner could add a `DEF-005` link near the marketplace passage. Suggested location: `pack-contract.md` line ~161 ("ranked matchmaker, signed marketplace listing"). Not CI-blocking under current (referential-only) gate semantics.
- **Roadmap heading citation wording.** DEF-006 / 007 / 008 cite `"Out of Scope"`; the actual heading in [`roadmap.md`](./roadmap.md) is `"Out of Scope For Early Milestones"`. Rewrite now uses the full heading text. Note: the roadmap qualifier ("For Early Milestones") is softer than the register's `out-of-scope` status ("Not planned. Re-opening requires a new plan and a `DEC-NNN`"). The register row's stronger framing is intentional (per the rationale), but if the roadmap owner wants the two surfaces to agree, the resolution is in the roadmap — out of scope for this audit.
