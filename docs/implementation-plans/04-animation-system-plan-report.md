# Implementation Report: 04 — Animation System

> Source plan: [`04-animation-system-plan.md`](./04-animation-system-plan.md)
>
> All 11 issues from the plan landed. Validation status:
> `npm run validate` ✅ pass · `npm test` ✅ 32/32 pass.

---

## 1. Updated Files

### `docs/architecture/diagrams/11-attack-anim.md`
Rewrote the Mermaid sequence so the engine resolves damage and emits
`UNIT_ATTACKED { damage, eventFrame, animId }` synchronously; the
renderer is a pure consumer that surfaces the floating "47" at
`eventFrame` for cosmetic effect. Added explicit anti-pattern
callout linking to `renderer-technology-choice.md`.

### `docs/architecture/diagrams/12-spell-anim.md`
Same DAMAGE_FRAME doctrine applied: engine resolves spell damage per
affected stack, emits one `SPELL_CAST` event plus per-target
`UNIT_ATTACKED` and `STATUS_APPLIED` events, then the renderer plays
the cast pose, projectile, impact VFX, and per-unit hurt anims.

### `docs/architecture/diagrams/13-death-victory.md`
Tightened the flow so death and victory are engine-emitted; the
renderer's death animation is purely cosmetic and cannot block the
grid-removal step.

### `docs/architecture/diagrams/06-town-animations.md`
Added the `Demolishing` state to the building state machine
(parallel to `Idle`/`Active`/`Damaged`) and a section pinning
mid-loop destruction rules to `animation-contract.md`.

### `docs/architecture/diagrams/21-creature-states.md`
Added a "Conflict Resolution" footnote linking to the priority table
in `animation-contract.md`.

### `docs/architecture/renderer-technology-choice.md`
Added: per-animation budget table (sprite frames, VFX particles,
atlas size, draw calls); new "DON'T let an animation timeline call
back into deterministic rules" anti-pattern bullet; cross-link to
`animation-contract.md` from Related Files.

### `docs/architecture/state-flow.md`
Cross-link from Related docs to `animation-contract.md` for the
gameplay-vs-visual state table.

### `docs/architecture/pack-contract.md`
New § "Asset Fallback And Placeholders" section with the 7-row
asset-class fallback matrix, dev-mode placeholder rules, and
multi-page atlas manifest rules.

### `docs/architecture/schema-matrix.md`
Updated `AnimationSet` row (multi-track + multi-event + sprite-sheet
metadata, links to all four animation example fixtures), updated
`VfxSet` row (closed phase set, fallback rule), added new `Easing`
row.

### `docs/architecture/wiki/screens/56-options/data-contracts.md`
Added `config.dev.placeholderSprites` and
`config.dev.enableDebugOverlay` config keys with their defaults and
the production-build override.

### `docs/architecture/wiki/screens/index.json`
Registered `67-animation-debug-overlay` in the `diagnostics` group.

### `docs/architecture/screen-command-coverage.json`
Added `PAUSE_PRESENTATION`, `STEP_PRESENTATION_BACK`,
`STEP_PRESENTATION_FORWARD`, `SCRUB_PRESENTATION_TO_INDEX` to
`localUiTokens` (presentation-only, never enter the deterministic
command log).

### `content-schema/schemas/animation.schema.json`
Closed schema (`additionalProperties: false`). Added: optional
`spriteSheetAssetIds[]` for multi-page atlases, optional `frames[]`
explicit per-frame metadata (page/x/y/w/h/anchor/trim/rotated),
`frameOrder` enum, optional `tracks.{status|fx}` sibling tracks,
per-sequence `events[]` (multi-event) with kinds
`damage|sound|vfx|status`, optional `channel` override, and optional
`easing` reference.

### `content-schema/schemas/vfx.schema.json`
Closed schema (`additionalProperties: false`). Phases limited to
`cast | projectile | impact`; phase shape is now
`{ particleSystemIds?, screenShake?, lightFlash?, durationMs?, easing? }`.

### `content-schema/schemas/town-presentation.schema.json`
Added optional `presentation.flybyCameraEasing` referencing
`easing.schema.json`.

### `content-schema/examples/records/animations/ash-hound.animation.json`
Updated `attack.eventFrame` from `12` (out-of-range under the new
sequence-relative semantics) to `2`. See Assumptions below.

### `content-schema/examples/ui-component-registry.example.json`
Inserted 12 new component entries for the animation debug overlay
package (alphabetically merged).

### `tasks/mvp/02-content-schemas/09-animation-vfx-sound-townpresentation-schemas.md`
Added `easing.schema.json` and `src/content-schema/easing.ts` to
Outputs and Owned Paths.

### `package.json`
Added `validate:animation-budgets` script and chained it into
`npm run validate`.

---

## 2. New Files

### `docs/architecture/animation-contract.md`
Canonical contract doc with sections:
- Two-Clock Model (`deltaTime` source, per-frame clamp,
  `effectiveDelta` formula, replay anchor, reduced-motion)
- DAMAGE_FRAME Ownership (positive + negative examples,
  `eventFrame` cosmetic visuals enumeration)
- Gameplay Vs. Visual State (12-row table)
- Conflict Resolution (per-channel policy, body-channel priority
  table, killed-mid-`hurt` and retaliation-mid-`attacking`
  examples)
- Mid-Anim Destruction (body-track, status-icon, projectile-orphan,
  building-demolition, camera-follow, summon-timer rules)
- Easing (purity contract, link to schema)
- Degradation (4-tier table aligned with renderer frame-time tiers)
- Asset Fallback (cross-link to `pack-contract.md`)

### `content-schema/schemas/easing.schema.json`
Closed enumeration: `linear`, four quad/cubic in/out/inOut variants,
`easeInOutSine`, `bezier`, plus the explicit Bezier shape
`{ kind: "bezier", control: [{x,y}, {x,y}] }`.

### `content-schema/examples/records/animations/dual-strike.animation.json`
Two-hit attack fixture with `events[]` carrying two `kind: "damage"`
plus per-frame sound and vfx cues.

### `content-schema/examples/records/animations/burning-status.animation.json`
Status-channel fixture under `tracks.status.sequences`, demonstrating
a looping overlay and a fade-in with `easing: "easeOutCubic"`.

### `content-schema/examples/records/animations/multi-page-attack.animation.json`
Multi-page atlas fixture with `spriteSheetAssetIds[]`, per-frame
explicit `frames[]` metadata, per-frame anchors, and `trim` /
`rotated` flags.

### `content-schema/examples/records/animations/budget-buster.animation.json`
Intentionally exceeds the per-sequence frame cap (40 > 32). The
budget validator skips this file by default
(`id` includes `budget_buster_test`). The dedicated
`scripts/__tests__/animation-budget-validator.test.mjs` exercises
the validator with `skipBusters: false` to confirm it is rejected.

### `scripts/validate-animation-budgets.mjs`
Per-animation perf-budget validator. Caps:
- ≤ 32 sprite frames per sequence
- ≤ 8 particle systems per VFX phase (proxy for ≤ 200 concurrent
  particles)
- forbids `eventFrame` + `events[]` together
- forbids `events[].kind === "damage"` outside the body channel
- forbids `eventFrame` / `events[].frame` outside the sequence
  frames index range
- forbids `spriteSheetAssetId` + `spriteSheetAssetIds` together
- forbids `frameSize` + `frames[]` together

Wired into `npm run validate` via the new `validate:animation-budgets`
script. Direct invocation supported.

### `scripts/__tests__/animation-budget-validator.test.mjs`
7 tests covering the budget validator's success path, the rejection
of `budget-buster.animation.json`, and each of the per-fixture
guard rules (out-of-range eventFrame, both events forms, damage on
non-body, both sheet ids, both frame-mode declarations).

### `scripts/__tests__/animation-event-frame-ordering.test.mjs`
5 tests covering the null renderer:
- priority table matches the contract
- timelines play in event-log order
- missing animId / sequence flagged as warnings
- DAMAGE_FRAME never fires from the renderer side (rule 3.A-2)
- sound + vfx + status refs resolve via injected registries

### `scripts/__tests__/animation-snapshot-fixtures.test.mjs`
4 snapshot tests, one per animation fixture (ash-hound, dual-strike,
burning-status, multi-page-attack). Each pins frame count, fps,
loop, duration, and event frames per sequence.

### `scripts/__tests__/animation-schema-validation.test.mjs`
1 test that re-runs the contract validator and asserts no violations
within `.animation.json` / `.vfx.json` files.

### `src/renderer/null/event-log-consumer.mjs`
Pure-function event-log consumer used by both the null renderer and
the animation debug overlay scrubber. Exports `consumeEventLog`,
`priorityForSequence`, and `PRIORITY_TABLE`. Returns an
`AnimationTrace` of timelines, cues, and warnings; never mutates
engine state.

### `src/renderer/null/null-renderer.mjs`
Tiny factory that wraps the event-log consumer with a play / reset /
getTrace surface. Used by the headless tests; will be reused by
screen 67 (animation debug overlay) for inspector-state derivation.

### `resources/dev-assets/placeholder-sprite.png`
64×64 magenta + black checker. Generated via a Node + zlib script
documented in `resources/dev-assets/README.md`.

### `resources/dev-assets/status-unknown.png`
32×32 generic status icon (amber circle on dark ring). Same
generator.

### `resources/dev-assets/README.md`
Inventory of the two dev placeholder assets with regeneration notes.

### `docs/architecture/wiki/screens/67-animation-debug-overlay/spec.md`
Component tree, state bindings, mechanics mapping, animation
contract, acceptance criteria, AI implementation notes.

### `docs/architecture/wiki/screens/67-animation-debug-overlay/interactions.md`
Action map with 8 actions including the four presentation-only
scrubbing commands; each row notes "Skips presentation only — no
gameplay mutation."

### `docs/architecture/wiki/screens/67-animation-debug-overlay/data-contracts.md`
Schemas + selectors + commands + config keys + localization keys +
save/replay rules + validation rules.

### `docs/architecture/wiki/screens/67-animation-debug-overlay/architecture.md`
Visual composition, build-flag gate, presentation-loop interaction
with event log, scrubbing-flow sequence diagram, implementation
contract.

### `docs/architecture/wiki/screens/67-animation-debug-overlay/mockup.html`
800×600 SVG mockup with all 12 components present in the
`data-component` attributes.

### `tasks/phase-2/08-meta-systems/09-animation-debug-overlay-screen.md`
Owning task for the new screen package. Mirrors task 08
(debug-overlay-screen). 4-hour estimate, depends on the existing
debug-overlay task.

---

## 3. Assumptions

⚠️ **Assumption: tests live under `scripts/__tests__/` not `tests/animation/`.** The
plan specifies `tests/animation/*.test.ts`, but the existing repo
runs `node --test scripts/__tests__/*.test.mjs` and ships no
TypeScript build / runner. Following the existing pattern keeps the
tests discoverable by `npm test` without introducing a new
toolchain. All four test files use the `animation-` prefix to keep
them grouped.

⚠️ **Assumption: null renderer modules use `.mjs`, not `.ts`.** Same
reasoning — there is no TS runner wired into `npm test`. The
modules live at `src/renderer/null/{event-log-consumer,null-renderer}.mjs`.
When the WebGL2 renderer task lands and introduces TypeScript, the
`.mjs` modules can be ported in place; the public surface
(`consumeEventLog`, `createNullRenderer`) stays the same.

⚠️ **Assumption: `eventFrame` in `animation.schema.json` is a sequence-relative
index, not a sprite-sheet index.** The plan's validation rule says
`events[].frame must be within the sequence's frames[] index range`.
The existing `ash-hound.animation.json` fixture had
`attack.eventFrame: 12` against a 4-frame sequence — out of range
under either reading, so the original was buggy. I treated `12` as
"sprite-sheet frame 12" (which is `frames[2]`) and corrected the
fixture to `eventFrame: 2`.

⚠️ **Assumption: `budget-buster.animation.json` skip marker is the
substring `budget_buster_test` in the record `id`.** The plan asks
for the buster to live at the canonical fixture path, but
`npm run validate` walks all fixtures by default. The skip marker
keeps `npm run validate` green while the dedicated unit test
(`animation-budget-validator.test.mjs`) passes
`{ skipBusters: false }` to exercise the rejection path.

⚠️ **Assumption: VFX particle-count cap is enforced via a proxy
("≤ 8 particle systems per phase").** Particle counts are runtime
properties of the particle system itself, not authored on the VFX
record. The validator uses systems-per-phase as a static proxy for
the budget table's "≤ 200 concurrent particles per phase" cap.

⚠️ **Assumption: `easing.schema.json` uses `oneOf [string-enum, bezier-shape]`.** The
plan's snippet shows the string enum with `bezier` as one of its
values, then a separate Bezier shape. I encoded it as a `oneOf`
discriminator: a bare string (matching the closed enum) OR an
object with `kind: "bezier"` and two control points.

⚠️ **Assumption: existing `ember-lance.vfx.json` uses
`particleSystemIds` (plural).** The closed `vfx.schema.json` honors
this by listing `particleSystemIds: array<string>` in the phase
shape. The original example validates against the new closed schema
without modification.

---

## 4. Blockers

None. All tracked items in the plan landed. `npm run validate` and
`npm test` both pass.

---

## 5. Validation Status

```text
$ npm run validate
generate:task-registry  → 309 tasks, 24 modules
validate:links          → All Markdown links resolve.
validate:contracts      → Repo contract checks passed.
validate:cross-refs     → Cross-reference checks passed.
validate:commands       → Command coverage check passed.
validate:tasks          → Task lint passed: 309 tasks, 0 issues.
validate:arch           → Module-graph check passed.
validate:ui-components  → Screen component coverage check passed.
validate:animation-budgets → animation-budget validator: ok

$ npm test
# tests 32, pass 32, fail 0
```

---

## 6. Coverage Map

| Plan Issue | Status | Where |
|---|---|---|
| 3.A-1 Two-clock model | ✅ | `animation-contract.md` § Two-Clock Model |
| 3.A-2 DAMAGE_FRAME ownership | ✅ | `animation-contract.md` § DAMAGE_FRAME Ownership; diagrams 11/12/13; `renderer-technology-choice.md` DON'T list |
| 3.A-3 Conflict-resolution policy | ✅ | `animation-contract.md` § Conflict Resolution + Mid-Anim Destruction; building demolishing state |
| 3.A-4 Gameplay vs. cosmetic | ✅ | `animation-contract.md` § Gameplay Vs. Visual State |
| 3.B-1 Multi-track + multi-event schema | ✅ | `animation.schema.json`; dual-strike + burning-status fixtures |
| 3.B-2 Easing-function enum | ✅ | `easing.schema.json`; referenced from animation/vfx/town-presentation |
| 3.B-3 Closed `vfx.schema.json` | ✅ | Closed schema + closed phase enum + `definitions/phase` |
| 3.B-4 Sprite-sheet metadata extension | ✅ | `animation.schema.json` `frames[]` + `spriteSheetAssetIds[]` + `frameOrder`; multi-page-attack fixture |
| 3.C-1 Asset-fallback coverage | ✅ | `pack-contract.md` § Asset Fallback And Placeholders; dev-asset PNGs; `config.dev.placeholderSprites` |
| 3.D-1 Per-animation perf budget + degradation | ✅ | `renderer-technology-choice.md` budget table; `animation-contract.md` § Degradation; `validate-animation-budgets.mjs` |
| 3.E-1 Headless animation test harness | ✅ | `src/renderer/null/`; 4 test files |
| 3.F-1 Animation debug-overlay package | ✅ | screens/67-animation-debug-overlay/; tasks/phase-2/08-meta-systems/09-animation-debug-overlay-screen.md |
