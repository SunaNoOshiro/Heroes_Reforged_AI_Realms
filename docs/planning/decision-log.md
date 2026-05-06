# Decision Log

Append-only register of locked decisions that materially shape the
canonical sources. Every entry has:

- `ID` — stable `DEC-NNN` identifier.
- `Date` — date the decision was ratified into canonical sources
  (ISO-8601).
- `Decision` — one short sentence stating what was locked.
- `Value` — the concrete value (number, formula, choice).
- `Rationale` — why this option was picked.
- `Canonical sources patched` — the files that now carry the locked
  value. Future agents must read these, not the audit summary.
- `Provenance check` — the canonical token the provenance gate
  matches against (typically the value verbatim).

A decision-log entry exists so that any historical claim made in
[`docs/archive/AUDIT-*`](../archive/) (e.g. "DEFEND was locked at
250 permille") resolves to a value that is *also* present in the
canonical sources. The provenance gate
[`scripts/check-decision-provenance.mjs`](../../scripts/check-decision-provenance.mjs)
enforces this: every archive `Locked` claim must either be reflected
verbatim in canonical sources or carry a `DEC-NNN` reference here.

Entries are ordered chronologically; do not reorder. If a decision is
revised, append a new entry that supersedes the prior one and update
the prior entry with `Superseded by: DEC-NNN`.

---

## DEC-001 — DEFEND damage-reduction formula

- **Date:** 2026-04-25
- **Decision:** DEFEND command reduces incoming damage by a fixed
  ratio that does not scale with the defender's DEF stat.
- **Value:** `defendDamageReductionPermille = 250` (25 % reduction).
  The fixed-point formula is
  `damageAfterDefend = damage × (1000 - 250) // 1000 = damage × 750 // 1000`.
- **Rationale:** A flat ratio is closed-form, replay-stable, and
  trivially testable. A DEF-scaled variant adds a parameter without
  meaningfully changing balance at the early-game numbers where
  DEFEND is most often used. A future ruleset that wants a scaled
  variant lands as a separate constant; it does not edit
  `defendDamageReductionPermille`.
- **Canonical sources patched:**
  - [`docs/architecture/command-schema.md`](../architecture/command-schema.md)
    (`BATTLE_DEFEND` Effects section).
  - [`tasks/mvp/09-tactical-combat/02a-defend-damage-reduction.md`](../../tasks/mvp/09-tactical-combat/02a-defend-damage-reduction.md).
- **Provenance check:** archive claim "DEFEND = 25% reduction" /
  "250 permille" resolves here.

## DEC-002 — IP-neutralization rename log (rolling)

- **Date:** 2026-05-04 (initial entry; this is a rolling log).
- **Decision:** Repository text and content references must remain
  IP-neutral. Specific renames and drops applied during the IP-neutral
  pass are kept here so a future contributor questioning a rename
  finds a stable record without re-deriving the rationale from commit
  history.
- **Value:** see entries below; expand as further renames land.
- **Rationale:** Without a single record, every reviewer who notices
  an unusual rename re-derives the answer from `git log` and risks
  reverting a rename. The decision-log replaces re-derivation with a
  reference.
- **Canonical sources patched:**
  - [`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs)
    forbidden-source patterns.
  - [`research/deep-research-report.md`](../../research/deep-research-report.md)
    (corridor-only language).
- **Provenance check:** archive references to renamed mechanics
  resolve here when the rename predates the canonical patch.

### DEC-002 entries

- *Generic strategy-game vocabulary preferred over branded mechanics
  names.* The repo refers to "tactical combat", "adventure map",
  "town building loop", "auto-resolve", and similar generic terms
  rather than reusing trademarked product mechanics names.
- *Numeric ranges replace branded balance tables.* Damage corridors,
  growth ranges, and cost ranges live in
  [`research/deep-research-report.md`](../../research/deep-research-report.md)
  expressed as inclusive bounds, not as references to any external
  product's tables.
- *Asset names use descriptive role tokens, not character or
  faction names from any prior art.* When this register
  needs to record a specific rename, append a sub-bullet here with
  `<old> → <new>` and a one-line rationale.

---

## How to Add A New Entry

1. Pick the next `DEC-NNN`.
2. Fill the template above. Keep `Value` machine-grep-able (the
   provenance gate looks for the value substring inside the canonical
   sources you list).
3. Run `npm run validate:provenance` (wired into `npm run validate`).
4. If you patched a canonical source, also update its inline
   reference back to this log so readers reach the rationale in one
   hop.

---

## Module-Name Aliases

Plan authors repeatedly named folders that don't exist in the repo
(`tasks/mvp/01-foundations/`, `tasks/mvp/02-rules-engine/`,
`tasks/mvp/00-foundation/`, `tasks/phase-1/<schema>/`). The implementer
of each plan reverse-engineered the closest existing folder. This
table pins the canonical mapping so future plan authors see the
target folder before naming new work. Closes Plan 32 § PI-2.

| Aspirational | Canonical | Rationale |
|---|---|---|
| `tasks/mvp/01-foundations/` | [`tasks/mvp/00-core-architecture/`](../../tasks/mvp/00-core-architecture/) | Foundations / engine-core contracts (state shape, command queue, RNG streams, ID allocator) live in `00-core-architecture` per [`docs/architecture/state-flow.md`](../architecture/state-flow.md). |
| `tasks/mvp/02-rules-engine/` | [`tasks/mvp/02-content-schemas/`](../../tasks/mvp/02-content-schemas/) | Rules / formulas land as schemas + Zod validators inside `02-content-schemas`; there is no separate "rules-engine" task module. |
| `tasks/mvp/00-foundation/` | [`tasks/mvp/00-core-architecture/`](../../tasks/mvp/00-core-architecture/) | Same target as `01-foundations`; the canonical singular form is `00-core-architecture`. |
| `tasks/phase-1/<schema>/` | [`tasks/mvp/02-content-schemas/`](../../tasks/mvp/02-content-schemas/) | The repo collapses Phase-1 schema work into the MVP `02-content-schemas` module; there is no `phase-1` directory. |
| `services/multiplayer/` | `src/net/webrtc/` (runtime, reserved) + [`services/signaling/`](../../services/signaling/) (server) | Multiplayer runtime code lives under the reserved `src/net/webrtc/` path (folder created when M5 runtime work lands); the optional signaling server adapter lives under `services/signaling/`. The legacy `services/multiplayer/` folder holds only operational config (e.g. TURN). |

Plan authors: read this table before adding `Owned Paths` entries
that name a new folder. Append rows here when a new aspirational
name surfaces; do not retroactively rename existing tasks.
