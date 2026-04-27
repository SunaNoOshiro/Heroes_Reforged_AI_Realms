# Roadmap

## Milestones

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

## Delivery Order

1. `M0`
   Establish deterministic engine and schema/runtime boundaries first.
2. `M1`
   Reach a first internal playable loop on the adventure layer with one
   reference faction and auto-resolve.
3. `M2`
   Replace proxy combat with real tactical battles.
4. `M3–M4`
   Add game depth, creator tooling, and robust mod/runtime support.
5. `M5–M7`
   Layer multiplayer, AI generation, advanced AI, and late polish.

## Critical Path

1. engine foundation
2. schemas and validation
3. asset + content loading
4. first faction and ruleset
5. map and adventure loop
6. minimal renderer and UI
7. persistence and scenario bootstrap
8. tactical combat
9. heuristic AI

## Solo-Build Guidance

The default operating mode for this repo is "one solo developer with
AI assistance". For that mode:

- Finish `M0` completely before building gameplay features.
- `06-visual-fidelity` now lives in `tasks/phase-2/` (moved from
  `mvp/06b` on 2026-04-22); pull it back only after a plain but
  playable loop exists.
- Favor one end-to-end vertical slice over parallel unfinished systems.
- Use [solo-build-lane.md](solo-build-lane.md) as the practical
  execution order; use this roadmap for milestone meaning.

## Out of Scope For Early Milestones

- dedicated servers
- mobile native app
- 3D rendering
- large first-party content volume before the pipeline is proven
