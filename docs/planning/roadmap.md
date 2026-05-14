# Roadmap

Milestone meaning and delivery order for the project. For the
smallest execution path, use
[`solo-build-lane.md`](./solo-build-lane.md). For the deferred
register cited by the Out-of-Scope list, see
[`deferred.md`](./deferred.md).

## 1. Milestones

| Milestone | Goal | Exit |
|---|---|---|
| `M0` | deterministic skeleton | replay fuzz test passes |
| `M1` | strategic vertical slice | solo adventure game loop playable |
| `M2` | tactical combat | two factions can fight in real battles |
| `M3` | depth | spells, artifacts, skills, stronger AI |
| `M4` | platform authoring | packs and editor workflows usable |
| `M5` | multiplayer | two-machine lockstep match works |
| `M6` | AI generation | generate and play new content |
| `M7` | polish | advanced AI, rendering, tournament quality |

Phase buckets (used in [`master-plan.md`](../architecture/master-plan.md)):

- `M0–M2` — playable deterministic game slice.
- `M3–M4` — depth plus creator-platform foundation.
- `M5–M7` — multiplayer, AI generation, polish.

## 2. Delivery Order

1. `M0` — establish the deterministic engine and the
   schema/runtime boundary first.
2. `M1` — reach a first internal playable loop on the adventure
   layer, with one reference faction and auto-resolve standing in
   for tactical combat.
3. `M2` — replace proxy combat with the real tactical battle
   layer.
4. `M3–M4` — add gameplay depth, creator tooling, and a robust
   mod/runtime surface.
5. `M5–M7` — layer multiplayer, AI generation, advanced AI, and
   late polish.

## 3. Critical Path

1. engine foundation
2. schemas and validation
3. asset + content loading
4. first faction and ruleset
5. map and adventure loop
6. minimal renderer and UI
7. persistence and scenario bootstrap
8. tactical combat
9. heuristic AI

The task-level expansion of this chain lives in
[`tasks/README.md`](../../tasks/README.md) § Recommended Order.

## 4. Solo-Build Guidance

The default operating mode for this repo is one solo developer with
AI assistance. For that mode:

- Finish `M0` completely before building gameplay features.
- Treat [`solo-build-lane.md`](./solo-build-lane.md) as the
  practical execution order; use this roadmap for milestone
  meaning.
- Favor one end-to-end vertical slice over multiple unfinished
  systems.
- `06-visual-fidelity` now lives in
  [`tasks/phase-2/06-visual-fidelity.md`](../../tasks/phase-2/06-visual-fidelity.md)
  (moved from `mvp/06b` on 2026-04-22). Pull it back only after a
  plain but playable loop exists.

## 5. Out of Scope For Early Milestones

Each row is registered in [`deferred.md`](./deferred.md); see the
register for full rationale.

- dedicated servers (`DEF-006`, `out-of-scope`)
- mobile native app (`DEF-007`, `out-of-scope`)
- 3D rendering (`DEF-008`, `out-of-scope`)
- large first-party content volume before the pipeline is proven

---

## 🔍 Sync Check

- **UI: ✔** — Roadmap is a planning doc; no UI surfaces are asserted, so there is no [`wiki/screens/`](../architecture/wiki/screens/) cross-check to run.
- **Schema: ✔** — No schema claims; milestone IDs `M0–M7` are doc-only labels, not schema enums, so no [`schema-matrix.md`](../architecture/schema-matrix.md) row applies.
- **Tasks: ✔** — Critical Path mirrors `tasks/README.md` § Recommended Order (with map+adventure and renderer+UI bundled). `06-visual-fidelity` move to [`tasks/phase-2/06-visual-fidelity.md`](../../tasks/phase-2/06-visual-fidelity.md) is consistent with `solo-build-lane.md` § Explicit Defers and `tasks/README.md` § Solo-Build Defers. Out-of-Scope rows match [`deferred.md`](./deferred.md) entries DEF-006 / DEF-007 / DEF-008, which cite this doc's "Out of Scope For Early Milestones" heading by name (heading preserved verbatim).

## ⚠ Issues

- **Roadmap heading wording vs. deferred-register status.** `DEF-006` / `DEF-007` / `DEF-008` carry status `out-of-scope` ("Not planned. Re-opening requires a new plan and a `DEC-NNN` decision-log entry") in [`deferred.md`](./deferred.md), but cite this roadmap's heading "Out of Scope **For Early Milestones**", which is softer ("not now" vs. "not planned"). The rewrite preserves the existing heading verbatim per Hard Prohibition A (never change meaning) and adds the explicit `DEF-NNN` citations so the two surfaces are at least linked. If owners want the two phrasings to agree, the resolution lives in either [`deferred.md`](./deferred.md) (downgrade status to `v2`) or this roadmap (rename the heading to "Out of Scope"); decision is out of scope for this audit per Hard Prohibition D.
- **`M7` mechanic-inventory citation.** [`deferred.md`](./deferred.md) `DEF-012` cites "roadmap.md M7" as the origin for "Tournament-quality polish & advanced AI", which matches this doc's `M7` exit ("polish — advanced AI, rendering, tournament quality"). No drift; noted here only because future edits to `M7`'s wording should keep "tournament" and "advanced AI" tokens to avoid breaking the `DEF-012` origin string.
