# Implementation Plan: 02 — UI Rendering System

> Source audit: [docs/readiness-audit/02-ui-rendering-system.md](../readiness-audit/02-ui-rendering-system.md)
>
> This plan converts the audit's ❌ UNKNOWN, ⚠ Partial, Missing Logic,
> and Risk items into concrete documentation, schema, and tooling work.
> Nothing here invents gameplay or visual design. Every change formalizes
> a contract that is already implied by `renderer-technology-choice.md`,
> the wiki screen packages, and the existing M1 task set, but is not yet
> pinned down at the architecture level.

---

## 1. Overview

**Scope.** Close the ten gaps the UI-rendering audit flagged as blocking
cross-screen consistency, tablet/hi-DPI delivery, multiplayer (M5)
lockstep alignment, and AI-agent screen-implementation tasks:

1. UI-shell technology choice — framework, diffing, templating (Q25, Q32)
2. Renderer ↔ UI-shell interface — canvas/DOM seam (Q26, Q44)
3. `data-component` → runtime resolver, reuse policy, missing-component
   fallback (Q27, Q28, Q29)
4. State-binding mechanism — subscription primitive + invalidation cadence
   (Q30, Q31)
5. Resolution & scaling rules — 800×600 vs. 16:9, off-aspect, hi-DPI,
   pixel-art vs. smooth-UI sampling (Q33, Q34, Q35, Q36, Q43)
6. Font technology selection (Q37)
7. Localization runtime call-site & RTL contract (Q38)
8. Layered UI policy — modals, tooltips, popups, debug overlay z-stack
   and portals (Q39, Q40)
9. Loading-screen orchestration & canvas lifecycle (Q41)
10. Debug overlay + production build-flag policy (Q42)
11. UI frame-lag contract & lockstep alignment (Q45)

**Readiness state today.** AI-Readiness scored **3.5 / 10**. The
WebGL2 viewport (map / battle) is fully pinned by
[`renderer-technology-choice.md`](../architecture/renderer-technology-choice.md);
the DOM-side UI shell is documented at the *spec* level (per-screen
mockups, component trees, state bindings, interactions) but has no
architectural counterpart. The M1 task set (`tasks/mvp/07-ui-shell/`)
hints at React 18 + Zustand, but the choice is not lifted into a
canonical architecture doc, leaving the resolver, scaling, z-stack,
input-bus, font, debug overlay, and frame-lag contracts unwritten.

**Out of scope.** Authoring runtime UI code, choosing visual styling,
re-curating screen packages, building Phase 3 WebGPU paths. This plan
only formalizes the contracts those layers must satisfy and produces
the docs/schemas needed before
[`tasks/mvp/07-ui-shell/`](../../tasks/mvp/07-ui-shell/) and
[`tasks/mvp/06-renderer/`](../../tasks/mvp/06-renderer/) can implement
deterministically.

---

## 2. Critical Fixes (Must Do First)

These must land before any UI-shell implementation task starts. They are
ordered by risk: each one, if left open, will either fragment screens
across the codebase or leak non-determinism through the WebGL/DOM seam.

1. **UI-shell technology choice (Issue 3.A-1)** — every screen task
   needs a single answer for framework + state binding. Without it, each
   screen task picks its own primitives and the wiki spec contract drifts
   from runtime.
2. **`data-component` runtime resolver (Issue 3.B-1)** — the
   `mockup.html` annotation system is the canonical visual contract; if
   the resolver isn't pinned, screens cannot be implemented from their
   specs.
3. **UI frame-lag contract (Issue 3.G-1)** — required before M5 lockstep
   transport begins; retroactive addition forces a command-log replay
   change.
4. **Z-stack contract (Issue 3.D-1)** — with ~60 numbered screen
   packages (modals, tooltips, popups, the in-canvas UI layer), the
   first integration sprint without a global ordering will produce
   visibility bugs that are expensive to back-fix.
5. **Resolution & scaling rules (Issue 3.C-1)** — the 800×600 vs. 16:9
   contradiction must be reconciled before the renderer task wires the
   canvas into the DOM.

---

## 3. System Improvements

### Architecture

#### Issue 3.A-1: UI-shell technology choice

**Source:** Q25 (⚠ Partial), Q32 (❌ UNKNOWN), Missing Logic bullet 1

**Problem:**
[`renderer-technology-choice.md`](../architecture/renderer-technology-choice.md)
locks WebGL2 for the map/battle viewport but
explicitly carves the UI shell *out* of that decision
(`src/ui/` — UI shell (separate from renderer, no WebGL)`). No doc
selects a framework, diffing strategy, templating pipeline, or build
toolchain for the DOM-side shell. The M1 task set
([`tasks/mvp/07-ui-shell/01-react-18-app-shell-with-canvas-overlay.md`](../../tasks/mvp/07-ui-shell/01-react-18-app-shell-with-canvas-overlay.md),
[`02-zustand-store.md`](../../tasks/mvp/07-ui-shell/02-zustand-store.md))
implies React 18 + Zustand, but the architecture layer has no canonical
record of that decision, no evaluation table, and no anti-patterns list.

**Impact:**
- Screen tasks invent their own bindings; the wiki `spec.md` contract
  drifts from runtime within the first 2–3 implementations.
- The `data-component` resolver (Issue 3.B-1) cannot be specified
  without knowing the framework's component-registration model.
- State-binding primitive (Issue 3.A-2) cannot be chosen without the
  framework picking it for us.
- Schema for component IDs, props, and slots cannot land until the
  framework decides what those concepts even mean.

**Solution:**
Lift the implied React 18 + Zustand decision into a canonical
`docs/architecture/ui-technology-choice.md`, mirroring the structure of
[`renderer-technology-choice.md`](../architecture/renderer-technology-choice.md):
explicit decision header, candidate table (React, Preact, Solid,
Svelte, raw DOM, htmx), anti-patterns, scope split vs. the WebGL
viewport, and a related-files table. Pin diffing strategy (React's
fiber + signals via Zustand selectors), templating (TSX, no JSX-runtime
swaps), and CSS approach (CSS Modules vs. styled-components — pick
one).

**Files to Update:**
- [docs/architecture/overview.md](../architecture/overview.md) — add
  link in the architecture index
- [CLAUDE.md](../../CLAUDE.md) — add to the read-first list under
  architecture docs
- [docs/architecture/wiki/README.md](../architecture/wiki/README.md) —
  reference the new doc from the screen-package authoring rules

**New Files:**
- `docs/architecture/ui-technology-choice.md`

**Implementation Steps:**
1. Audit current task assumptions across
   [`tasks/mvp/07-ui-shell/`](../../tasks/mvp/07-ui-shell/) to confirm
   React 18 + Zustand is the implied stack everywhere.
2. Draft `ui-technology-choice.md` with sections matching
   `renderer-technology-choice.md`: Decision, Goals & Non-Goals,
   Candidate Comparison, Layered Pipeline (component tree → store
   selectors → DOM), Anti-Patterns, Related Files.
3. Pin: framework = React 18, store = Zustand, selector subscription
   model, TSX templating, CSS approach, build = Vite (confirm against
   existing `package.json` if present).
4. Add anti-patterns: no direct sim-state reads from components, no
   side effects in render, no `useEffect` for state derivation, no
   imperative DOM outside the canvas overlay.
5. Add the Phase 3 / future swap-out path (Solid signals, view
   transitions API).
6. Cross-link from `overview.md`, `CLAUDE.md`, and `wiki/README.md`.
7. Run `npm run validate` to confirm cross-link integrity.

**Dependencies:** none (this is a precondition for everything else in
this plan).

**Complexity:** S

---

#### Issue 3.A-2: State-binding primitive & invalidation cadence

**Source:** Q30 (⚠ Partial), Q31 (❌ UNKNOWN), Missing Logic bullet 4

**Problem:**
[`state-flow.md:53-58`](../architecture/state-flow.md#L53-L58) says the
renderer "subscribes to state; never mutates", and each screen
`spec.md` lists explicit `State Bindings` (e.g.
`MapViewport → state.adventure.visibleTiles`). What is **not** pinned:
the subscription primitive (Zustand selector? RxJS-style observable?
manual diff?), the per-frame vs. event-driven re-render cadence, and
how the WebGL2 60 FPS render loop is reconciled with the DOM-side
event-driven re-render.

**Impact:**
- Screen authors don't know whether to call `useStore(selector)` or
  `subscribe()`, and selector memoization rules will diverge per screen.
- WebGL viewport may render every frame while panels never wake up, or
  vice-versa, causing dropped state or wasted CPU.
- Without an invalidation policy, command-driven gameplay will appear
  to "lag" because no doc guarantees a re-render after dispatch.

**Solution:**
Add a `## State Binding` section to `ui-technology-choice.md` (Issue
3.A-1) defining:
- DOM components subscribe via Zustand selectors with shallow equality
  by default; deep selectors require an explicit equality fn.
- WebGL viewport reads state once per `requestAnimationFrame`, never
  through React.
- Commands dispatched from the UI cause an explicit store update; React
  re-render is then driven by Zustand subscription, not by `rAF`.
- Selectors must be pure and side-effect-free (lint rule).

**Files to Update:**
- `docs/architecture/ui-technology-choice.md` (created in 3.A-1)
- [docs/architecture/state-flow.md](../architecture/state-flow.md) —
  add the renderer/UI subscription appendix

**New Files:** none.

**Implementation Steps:**
1. Add `## State Binding` to `ui-technology-choice.md`.
2. Document the rule: DOM = selector-driven, WebGL = rAF-driven, both
   read from the same Zustand store.
3. Add a Mermaid diagram in `state-flow.md` showing the dual cadence.
4. Add a lint check or doc rule forbidding component-side mutation of
   store state outside reducers.

**Dependencies:** Issue 3.A-1.

**Complexity:** S

---

#### Issue 3.A-3: Renderer ↔ UI-shell interface

**Source:** Q26 (⚠ Partial), Q44 (⚠ Partial), Missing Logic bullet 2,
Risk: input ambiguity at the WebGL/DOM seam

**Problem:**
[`renderer-technology-choice.md:121-122`](../architecture/renderer-technology-choice.md#L121-L122)
explicitly carves UI out of WebGL but does not define the seam. There
is no doc stating:
- whether the WebGL canvas sits behind, in front of, or layered with
  DOM panels;
- how hover/hit-test results from the canvas are reported into DOM
  panel state;
- the priority order between WebGL hit-tests and DOM event handlers
  when a click hits both;
- the canvas resize protocol when DOM layout changes (e.g. a side
  panel opens).

**Impact:**
- Double-fired clicks or dead zones at the canvas/DOM seam.
- Map-tile tooltips and DOM tooltips collide; either both show, or
  neither.
- Tablet touch events (a stated MVP target) have no documented routing.

**Solution:**
Create `docs/architecture/ui-renderer-seam.md` defining:
1. **DOM layering**: canvas mounted as the root layer; DOM shell as
   absolutely-positioned overlay container. Modals/tooltips/popups
   render into a separate React portal mounted above both.
2. **Input routing**: pointer events hit the topmost DOM element first;
   if the target is the canvas root, the renderer's hit-test runs and
   emits a synthetic `MapPointerEvent` consumed by Zustand actions.
3. **Hit-test contract**: a single `pickAt(x, y) → { kind, id }` API
   from renderer → store; UI never queries WebGL state directly.
4. **Resize protocol**: ResizeObserver on the canvas container drives
   `renderer.resize(w, h, dpr)`; UI shell observes the same observable
   for layout-coupled state.
5. **Z-index rules**: canvas at `z-index: 0`; HUD/panels at the layer
   indices defined in the z-stack contract (Issue 3.D-1).

**Files to Update:**
- [docs/architecture/overview.md](../architecture/overview.md) — link
  to the new seam doc
- [docs/architecture/diagrams/08-building-click.md](../architecture/diagrams/08-building-click.md)
  — annotate hit-test step against the new contract
- `docs/architecture/ui-technology-choice.md` — link the seam doc

**New Files:**
- `docs/architecture/ui-renderer-seam.md`

**Implementation Steps:**
1. Draft `ui-renderer-seam.md` with the five sections above.
2. Add a sequence diagram (`docs/architecture/diagrams/26-pointer-event-routing.md`)
   showing browser pointer event → DOM hit → optional canvas pickAt →
   command dispatch.
3. Cross-link from `overview.md`, `state-flow.md`, and the
   building-click diagram.
4. Add to `wiki/README.md` as required reading for screen
   `interactions.md` authors.

**Dependencies:** Issue 3.A-1 (framework choice gates the React-portal
section).

**Complexity:** M

---

### Data Contracts

#### Issue 3.B-1: `data-component` runtime resolver & component registry

**Source:** Q27 (❌ UNKNOWN), Q28 (❌ UNKNOWN), Q29 (❌ UNKNOWN),
Missing Logic bullet 3

**Problem:**
Each `mockup.html` annotates DOM regions with `data-component="X"` and
each `spec.md` lists a Component Tree
([`07-adventure-map/spec.md:23-34`](../architecture/wiki/screens/07-adventure-map/spec.md#L23-L34)).
[`wiki/README.md`](../architecture/wiki/README.md) defines the
authoring rules but no runtime contract. Three concrete things are
missing:
1. **The registry** — how `data-component="MiniMap"` resolves to a
   React component constructor at runtime.
2. **Reuse policy** — whether `StatusLine` on screen 07 and screen 19
   instantiates the same component or independent ones.
3. **Missing-component fallback** — what happens if `data-component="X"`
   has no registered implementation (placeholder? throw? warning
   overlay?).

**Impact:**
- Without (1), screens cannot be implemented from their specs; the
  whole "spec drives runtime" premise of the wiki collapses.
- Without (2), accidental forks of shared components (`StatusLine`,
  `ResourceBar`, `MiniMap`) ship with subtle visual drift.
- Without (3), missing components silently render as empty divs, and
  integration bugs surface late.

**Solution:**
Define the resolver in three artifacts:

1. **Schema** — `content-schema/ui-component-registry.schema.json`
   listing every `componentId` referenced in any screen `spec.md` along
   with `module`, `exportName`, `singleton: bool`, `requiredProps`.
2. **Architecture doc** —
   `docs/architecture/ui-component-resolver.md` defining the resolver
   API (`resolveComponent(id) → ComponentCtor | UnknownComponent`),
   reuse rule (one runtime constructor per `componentId`, instantiated
   per mount point unless `singleton: true`), and missing-component
   fallback (in dev: red placeholder + console warning; in prod:
   empty `<div data-missing-component="X">` + telemetry counter).
3. **Tooling** —
   `scripts/validate-screen-component-coverage.mjs` cross-checking
   that every `data-component=` value in any `mockup.html` appears in
   the registry schema, and that every Component Tree entry in any
   `spec.md` does too. Hook into `npm run validate`.

**Files to Update:**
- [docs/architecture/wiki/README.md](../architecture/wiki/README.md) —
  reference the registry & resolver doc
- [docs/architecture/schema-matrix.md](../architecture/schema-matrix.md)
  — add `UIComponentRegistry`
- [package.json](../../package.json) — wire
  `validate-screen-component-coverage` into the `validate` script
- [docs/architecture/diagrams/](../architecture/diagrams/) — add
  `27-component-resolution.md`

**New Files:**
- `content-schema/ui-component-registry.schema.json`
- `content-schema/examples/ui-component-registry.example.json`
- `docs/architecture/ui-component-resolver.md`
- `scripts/validate-screen-component-coverage.mjs`
- `docs/architecture/diagrams/27-component-resolution.md`

**Implementation Steps:**
1. Walk every `docs/architecture/wiki/screens/*/mockup.html` and
   `spec.md`, extract the union of `data-component` IDs and Component
   Tree entries.
2. Draft `ui-component-registry.schema.json` with the union.
3. Author the canonical registry example with stub `module` /
   `exportName` paths under `src/ui/components/`.
4. Write `ui-component-resolver.md` covering resolver API, reuse
   policy, missing-component fallback (dev vs. prod).
5. Implement `validate-screen-component-coverage.mjs` to cross-check
   mockups, specs, and registry; emit an actionable diff on failure.
6. Add `npm run validate:ui-components` and chain it into `validate`.
7. Add the resolver as a required citation for any
   `tasks/mvp/07-ui-shell/` task that mounts a screen.

**Dependencies:** Issue 3.A-1 (framework choice fixes the constructor
type).

**Complexity:** L

---

#### Issue 3.B-2: Localization runtime call-site & RTL contract

**Source:** Q38 (✔ Defined, with caveats), Risk: determinism leak

**Problem:**
[`diagrams/18-string-resolution.md`](../architecture/diagrams/18-string-resolution.md)
defines string ID resolution and locale-pack structure, and
`mockup.html` uses `data-i18n="some.key"`. What is **not** defined: the
runtime call site (does each `data-i18n` element hot-swap on locale
change? does the renderer cache lookups per frame? are translations
read inside React selectors and thus part of subscription deps?), and
the RTL layout mechanism (the diagram says "RTL handled by UI engine"
but the UI engine was undefined until Issue 3.A-1).

**Impact:**
- Locale changes mid-session may fail to refresh some text or refresh
  too aggressively.
- RTL languages are an MVP-scope blocker if delivery layout is unspec.
- `data-i18n` annotations in mockups have no runtime equivalent and
  drift from spec.

**Solution:**
Add a `## Localization Runtime` section to
`ui-technology-choice.md` defining:
- A `useTranslation()` hook reading from a Zustand `localeSlice` so
  locale changes invalidate every consumer in one tick.
- Translations resolved at render time, not at mount time; no
  imperative `t()` outside the hook.
- RTL: `dir="rtl"` set on `<html>` based on locale-pack metadata; CSS
  uses logical properties (`margin-inline-start`) — no hand-flipped
  layouts.
- `data-i18n` on `mockup.html` lines must match a key in the locale
  pack; validated by an extension to
  `validate-screen-component-coverage.mjs`.

**Files to Update:**
- `docs/architecture/ui-technology-choice.md` (Issue 3.A-1)
- [docs/architecture/diagrams/18-string-resolution.md](../architecture/diagrams/18-string-resolution.md)
  — append a "Runtime call-site" section + diagram
- `scripts/validate-screen-component-coverage.mjs` (Issue 3.B-1) —
  extend to validate `data-i18n` keys

**New Files:** none.

**Complexity:** S

---

### Schemas

#### Issue 3.C-1: Resolution, scaling, hi-DPI, and aspect-ratio policy

**Source:** Q33 (⚠ Partial), Q34 (⚠ Partial), Q35 (❌ UNKNOWN), Q36
(❌ UNKNOWN), Q43 (❌ UNKNOWN), Risk: aspect-ratio breakage on tablets

**Problem:**
Every curated `spec.md` repeats "fixed 800×600 layout"; the renderer
doc guarantees a 16:9 responsive map canvas; "desktop + tablet" is the
delivery target. Three real contradictions follow:
1. **800×600 (4:3) UI vs. 16:9 map canvas** — never reconciled.
2. **Off-aspect handling** — letterbox, pillarbox, or stretch is not
   chosen for portrait or 21:9.
3. **Hi-DPI** — no `devicePixelRatio` rule, no `image-rendering` rule,
   no 2× / 3× sprite atlas pipeline, despite retina iPad support.
4. **Pixel-art vs. smooth-UI sampling** — no `NEAREST` vs. `LINEAR`
   split between tile atlas and UI imagery.

**Impact:**
- First iPad test produces blurry tile art at DPR 2 or unintended
  letterboxing.
- 21:9 ultrawide displays break canvas/DOM alignment.
- Pixel-perfect map art looks blurry once mounted next to anti-aliased
  DOM text.

**Solution:**
Create `docs/architecture/screen-scaling.md` reconciling all four
contradictions:

1. **Virtual coordinate system**: 800×600 is a *virtual* coordinate
   system (CSS pixels). The DOM root is sized to viewport with a CSS
   transform that scales the 800×600 stage to fit, preserving aspect.
2. **Aspect handling**: at off-aspect viewports, the stage is
   letterboxed (vertical bars on 21:9, horizontal bars on 4:3). HUD
   elements anchored to stage edges remain inside the letterbox.
   Document the safe-area inset rules.
3. **Map canvas**: the 16:9 map canvas is a sub-region of the 800×600
   stage; document the precise pixel rectangle (e.g. `(160, 60,
   480, 360)` or whatever the mockups already imply) and the
   responsive-extension rule for ultra-wide.
4. **Hi-DPI**: WebGL canvas backing-store is `cssWidth * dpr`,
   `cssHeight * dpr`; sprite atlases ship in 1× and 2× variants
   indexed by manifest; DOM uses `image-rendering: pixelated` for
   pixel-art assets and default rendering for icons/text.
5. **Filter modes**: tile atlas is `gl.NEAREST`; UI atlas (icons,
   ornaments) is `gl.LINEAR`; document the split and the texture
   atlas naming convention.
6. **Breakpoints**: define minimum supported viewport (e.g. 1024×768
   physical), tablet portrait fallback (orient to landscape with
   informational overlay), and the hard-no breakpoint below which the
   game refuses to start.

**Files to Update:**
- [docs/architecture/renderer-technology-choice.md](../architecture/renderer-technology-choice.md)
  — link the new doc; reconcile the 16:9 statement
- [docs/architecture/wiki/README.md](../architecture/wiki/README.md) —
  reference for screen authors
- [docs/architecture/overview.md](../architecture/overview.md)
- [content-schema/asset-manifest.schema.json](../../content-schema/)
  (if present) — add `dpiVariants[]` to texture manifest entries

**New Files:**
- `docs/architecture/screen-scaling.md`

**Implementation Steps:**
1. Verify whether an asset manifest schema exists; if not, defer
   `dpiVariants[]` to the asset-pipeline task and document the rule
   in `screen-scaling.md` instead.
2. Draft `screen-scaling.md` with the six sections above.
3. Add a Mermaid layout diagram (stage → letterbox → canvas sub-rect).
4. Update `renderer-technology-choice.md` to point at the new doc and
   replace the unqualified 16:9 statement with a link.
5. Add a `screen-scaling-aware` flag to relevant tasks under
   [`tasks/mvp/06-renderer/`](../../tasks/mvp/06-renderer/) and
   [`tasks/mvp/07-ui-shell/`](../../tasks/mvp/07-ui-shell/).
6. Run `npm run validate` to verify cross-links.

**Dependencies:** none, but pairs naturally with Issue 3.A-3.

**Complexity:** M

---

#### Issue 3.C-2: Font technology decision

**Source:** Q37 (❌ UNKNOWN), Missing Logic bullet 6

**Problem:**
No doc selects a font technology. Localization is text-driven and
locale packs ship `strings/ui.json`, but rendering tech (SDF, bitmap
font, vector via DOM) is unselected. SDF is the natural fit for
labels rendered inside the WebGL canvas (unit names, hex coordinates);
DOM/CSS text is the natural fit for the UI shell.

**Impact:**
- Inconsistent text crispness between map labels and panels.
- Custom-font licensing decisions cannot be made.
- Localization sizing tests cannot be written without a chosen renderer.

**Solution:**
Add a `## Fonts` section to either
`renderer-technology-choice.md` (for the WebGL side) and
`ui-technology-choice.md` (for the DOM side):
- DOM shell: web fonts loaded via `@font-face`, primary + fallback
  stack, locale-specific font swap rule.
- WebGL canvas: SDF font atlases generated by
  `scripts/build-sdf-atlas.mjs` (placeholder script reference); one
  atlas per script (Latin, Cyrillic, CJK).
- Anti-pattern: do not render WebGL text via `<canvas2d>`-baked
  textures; do not use DOM-overlay text on the WebGL viewport because
  it cannot follow camera transforms.

**Files to Update:**
- `docs/architecture/ui-technology-choice.md` (Issue 3.A-1)
- [docs/architecture/renderer-technology-choice.md](../architecture/renderer-technology-choice.md)
  — append `## Fonts (WebGL)` section

**New Files:** none (script stub only added when WebGL labels are
actually needed; the architectural rule is enough).

**Complexity:** S

---

### UI / Screens

#### Issue 3.D-1: Global z-stack contract

**Source:** Q39 (❌ UNKNOWN), Q40 (⚠ Partial), Risk: z-stack chaos

**Problem:**
The map/battle WebGL canvas has a documented layer pipeline
(`clear → terrain → fog → object → unit → UI layer → present`) with
a "z-index (not Z-buffer)" note for in-canvas ordering. For the DOM
shell — with separate screen packages for tooltips
(`18-map-object-tooltip`), modals (`09-map-object-dialog`,
`25-building-recruitment-dialog`), and popups (`58-week-month-popup`)
— **no global z-order list exists.** Multiple modals can also overlap
each other.

**Impact:**
- Modals open behind tooltips, or vice-versa.
- The debug overlay (Issue 3.D-3) has no canonical z slot.
- Status toasts and confirmation dialogs collide.

**Solution:**
Add `## Z-Stack Contract` to `ui-technology-choice.md` defining
named layer indices:

| Layer | z-index | Owner |
|---|---|---|
| Map / battle canvas | 0 | renderer |
| HUD (resource bar, end-turn, mini-map) | 100 | UI shell |
| Side panels (hero info, town menu) | 200 | UI shell |
| Modal dialogs | 1000 | UI shell |
| Tooltips | 2000 | UI shell |
| Popups (week/month, end-of-turn) | 2500 | UI shell |
| Toasts / inline notifications | 3000 | UI shell |
| Debug overlay | 9000 | dev-only |
| Loading screen | 9500 | UI shell |
| Error boundary fatal screen | 10000 | UI shell |

Modals in the same layer use a stack-based portal (newest on top).
Tooltips dismiss when a higher-layer element opens.

**Files to Update:**
- `docs/architecture/ui-technology-choice.md` (Issue 3.A-1)
- [docs/architecture/wiki/README.md](../architecture/wiki/README.md) —
  link from screen-package authoring rules
- Each existing modal/tooltip/popup
  `docs/architecture/wiki/screens/*/spec.md` — add a `Z-Layer:` field
  referencing the contract (one-line addition; safe and additive)

**New Files:** none.

**Complexity:** S

---

#### Issue 3.D-2: Loading-screen orchestration & canvas lifecycle

**Source:** Q41 (⚠ Partial), Missing Logic bullet 8

**Problem:**
Screen 59 (`59-loading-screen`) defines the loading UI binding
(`state.ui.loading.{taskId,progress,destinationRoute,errors,contentHashes}`).
Three things are not specified:
1. Is the WebGL canvas torn down during load, hidden, or running idle?
2. Renderer warmup (shader compile, atlas upload) sequencing vs. the
   visible progress bar.
3. Which subsystem advances `state.ui.loading.progress` (engine?
   content-runtime? renderer warmup? UI shell?).

**Impact:**
- First load: progress bar hits 100% before atlases finish uploading,
  causing a stutter on first frame.
- WebGL context teardown/recreate on each load wastes seconds.
- Progress bar ownership is ambiguous, causing missing or
  double-counted steps.

**Solution:**
Update [`docs/architecture/wiki/screens/59-loading-screen/architecture.md`](../architecture/wiki/screens/59-loading-screen/architecture.md)
(or create it) and add a
`docs/architecture/diagrams/28-loading-orchestration.md` Mermaid
sequence diagram defining:
1. Canvas is **persistent** across loads (created once at app boot,
   destroyed only on tab unload). During load: canvas is hidden via
   `display: none`; not destroyed.
2. Warmup phases in order: schema validation → pack load → atlas
   decode → atlas upload → shader compile → first warmup render →
   route transition. Each emits a `LOADING_PROGRESS` reducer command
   contributing a fixed weight.
3. Progress weights are declared in a registry
   (`src/content-runtime/loading-phases.ts` — schema only at this
   stage, contract in the architecture doc).
4. Any phase erroring routes to
   `state.ui.loading.errors[]` and the loading screen surfaces a
   recoverable retry.

**Files to Update:**
- [docs/architecture/wiki/screens/59-loading-screen/spec.md](../architecture/wiki/screens/59-loading-screen/spec.md)
  — link the new diagram
- [docs/architecture/wiki/screens/59-loading-screen/architecture.md](../architecture/wiki/screens/59-loading-screen/architecture.md)
  — flesh out orchestration

**New Files:**
- `docs/architecture/diagrams/28-loading-orchestration.md`

**Complexity:** M

---

#### Issue 3.D-3: Debug overlay design + production build-flag policy

**Source:** Q42 (❌ UNKNOWN), Improvements bullet "debug-overlay screen
package"

**Problem:**
No screen package, no architecture doc, and no build-flag policy
covers a debug overlay. The determinism stack
([`determinism.md:13-15`](../architecture/determinism.md#L13-L15)) ships
a state-hash and replay API — both natural debug hooks — but there is
no UI for them, and no rule about whether overlays ship in production.

**Impact:**
- Replay debugging requires console-only tools; non-engineers can't
  reproduce desyncs.
- A debug overlay added ad-hoc later will likely ship to production
  by accident.

**Solution:**
1. Add a new screen package
   `docs/architecture/wiki/screens/60-debug-overlay/` with the standard
   five files (`mockup.html`, `spec.md`, `interactions.md`,
   `data-contracts.md`, `architecture.md`). Components: FPS counter,
   state-hash readout, command-log tail (last 20), replay scrubber,
   pack-content-hash readout, RNG-substream tick counters.
2. Register it in
   [`docs/architecture/wiki/screens/index.json`](../architecture/wiki/screens/index.json)
   under a new `Diagnostics` group (or extend an existing one).
3. Build-flag policy: gated behind `import.meta.env.DEV` (or
   equivalent) at the bundler level; never bundled into production
   output. Document in `ui-technology-choice.md` under `## Build
   Flags`.
4. Z-layer 9000 (per Issue 3.D-1).
5. Add a stub task entry under
   [`tasks/mvp/07-ui-shell/`](../../tasks/mvp/07-ui-shell/) marking the
   debug overlay as a **post-MVP** task (do not block MVP on it).

**Files to Update:**
- [docs/architecture/wiki/screens/index.json](../architecture/wiki/screens/index.json)
- [docs/architecture/wiki/README.md](../architecture/wiki/README.md) —
  cite the diagnostics group
- `docs/architecture/ui-technology-choice.md` (Issue 3.A-1) — add
  `## Build Flags`
- [tasks/phase-2/](../../tasks/phase-2/) — add a debug-overlay task
  module (or a single task; depends on existing structure)

**New Files:**
- `docs/architecture/wiki/screens/60-debug-overlay/mockup.html`
- `docs/architecture/wiki/screens/60-debug-overlay/spec.md`
- `docs/architecture/wiki/screens/60-debug-overlay/interactions.md`
- `docs/architecture/wiki/screens/60-debug-overlay/data-contracts.md`
- `docs/architecture/wiki/screens/60-debug-overlay/architecture.md`

**Implementation Steps:**
1. Confirm the next available screen number against `index.json`.
2. Author the five package files using the existing screens'
   conventions; bind to `state.debug.{fps, hash, log, replay}`.
3. Add to `index.json` under the appropriate group; `npm run validate`
   to confirm.
4. Wire the build-flag policy in `ui-technology-choice.md`.
5. Add the post-MVP task entry; mark dependencies on the resolver
   (Issue 3.B-1) and z-stack (Issue 3.D-1).
6. Run `npm run generate:wiki` to regenerate the wiki HTML.

**Complexity:** M

---

### Tasks

#### Issue 3.E-1: Wire new docs into the task system

**Source:** every issue above produces a doc the task system must
recognize.

**Problem:**
[`tasks/mvp/06-renderer.md`](../../tasks/mvp/06-renderer.md) and
[`tasks/mvp/07-ui-shell.md`](../../tasks/mvp/07-ui-shell.md) cite
existing architecture docs. Newly added docs
(`ui-technology-choice.md`, `ui-renderer-seam.md`,
`screen-scaling.md`, `ui-component-resolver.md`) must appear as
required-citations in the relevant task files so
`npm run validate:tasks` and the task-system report stay green.

**Impact:**
- Without citations, screen tasks may proceed without reading the new
  contracts; the docs become orphaned.
- `task-system-report.md` will not surface coverage of the new
  contracts.

**Solution:**
For each new doc, add a `Required Reading:` reference (or extend an
existing such field) to the matching tasks:

| New doc | Required by |
|---|---|
| `ui-technology-choice.md` | every task in `tasks/mvp/07-ui-shell/` |
| `ui-renderer-seam.md` | `tasks/mvp/06-renderer/` (canvas mounting), `07-ui-shell/01-react-18-app-shell-with-canvas-overlay.md` |
| `screen-scaling.md` | `06-renderer/` (canvas sizing), `07-ui-shell/01-…` |
| `ui-component-resolver.md` | every task that mounts a numbered screen package |
| `ui-component-registry.schema.json` | same as resolver |
| `screens/60-debug-overlay/` | post-MVP debug-overlay task only |

**Files to Update:**
- relevant task `.md` files under
  [`tasks/mvp/06-renderer/`](../../tasks/mvp/06-renderer/) and
  [`tasks/mvp/07-ui-shell/`](../../tasks/mvp/07-ui-shell/)
- [tasks/task-registry.json](../../tasks/task-registry.json) —
  regenerated, not hand-edited

**Implementation Steps:**
1. After each new doc lands, edit the matching task files to add the
   `Required Reading:` citation.
2. Run `npm run generate:task-registry`.
3. Run `npm run validate:tasks` to confirm no missing citations.
4. Run `npm run generate:task-system-report` so the inventory reflects
   the new coverage.

**Dependencies:** Issues 3.A-1, 3.A-3, 3.B-1, 3.C-1, 3.D-3.

**Complexity:** S

---

### Multiplayer / Persistence / Performance

#### Issue 3.G-1: UI frame-lag contract

**Source:** Q45 (❌ UNKNOWN), Risk: determinism leak through the UI

**Problem:**
The engine is synchronous (`state' = apply(state, command)`), so
in-process play naturally observes a one-frame UI lag. But no doc
specifies this as a *contract*, and no mechanism covers:
- M5 lockstep multiplayer: how UI displays authoritative state vs.
  optimistic local prediction; how divergence is detected.
- Async-confirmation commands (route guards in
  [`07-adventure-map/architecture.md:60-73`](../architecture/wiki/screens/07-adventure-map/architecture.md#L60-L73)):
  the UI keeps a "draft" until the reducer accepts; no doc bounds the
  draft-vs-authoritative window.
- WebGL2 context loss: on recovery, no doc bounds UI lag.

**Impact:**
- Without a contract, an M5 desync between client and server may
  appear as a UI glitch rather than a recoverable error.
- "Optimistic UI" patterns will leak non-determinism by default.
- Replay UX cannot rely on consistent lag bounds.

**Solution:**
Create `docs/architecture/ui-frame-lag-contract.md` defining:
1. **Single-player**: UI lags authoritative state by **at most 1
   render frame** (~16ms at 60FPS). Guaranteed by the synchronous
   reducer + Zustand subscription.
2. **Optimistic UI**: components may render "pending" placeholders
   bound to `state.ui.draft.*`, but never to fork the authoritative
   `state.gameplay.*`. The draft slice is non-replayed and
   non-hashed; cleared whenever the matching command resolves.
3. **M5 lockstep**: UI binds to authoritative state only. A
   `state.net.tick` lag indicator is exposed for telemetry. If lag
   exceeds the M5 lockstep window, the UI shows a dedicated
   "synchronizing" overlay (z-layer 9500, before the loading screen).
4. **Context loss**: WebGL2 context-loss event triggers a render
   freeze; UI continues to function on DOM. Recovery on
   `webglcontextrestored`; UI emits a non-blocking toast.
5. **Replay**: replay UI binds to the same store, fed by replay
   driver instead of live commands; lag bound is identical.

**Files to Update:**
- [docs/architecture/state-flow.md](../architecture/state-flow.md) —
  link the new contract
- [docs/architecture/determinism.md](../architecture/determinism.md) —
  cite the draft-slice rule
- [docs/architecture/wiki/screens/07-adventure-map/architecture.md](../architecture/wiki/screens/07-adventure-map/architecture.md)
  — replace the loose "UI Draft vs. authoritative result" wording with
  a link to the new contract

**New Files:**
- `docs/architecture/ui-frame-lag-contract.md`

**Complexity:** M

---

## 4. Suggested Task Breakdown

Each item below maps 1:1 to an issue above. Ordering follows the
execution order in §5.

- [ ] Author `docs/architecture/ui-technology-choice.md` (Issue 3.A-1)
- [ ] Append `## State Binding` to ui-tech-choice + `state-flow.md`
      appendix (Issue 3.A-2)
- [ ] Author `docs/architecture/ui-renderer-seam.md` + diagram 26
      (Issue 3.A-3)
- [ ] Author `content-schema/ui-component-registry.schema.json` +
      example (Issue 3.B-1)
- [ ] Author `docs/architecture/ui-component-resolver.md` + diagram 27
      (Issue 3.B-1)
- [ ] Implement `scripts/validate-screen-component-coverage.mjs` and
      wire into `npm run validate` (Issue 3.B-1)
- [ ] Append `## Localization Runtime` to ui-tech-choice; extend
      validator for `data-i18n` (Issue 3.B-2)
- [ ] Author `docs/architecture/screen-scaling.md`; reconcile
      `renderer-technology-choice.md` (Issue 3.C-1)
- [ ] Append `## Fonts` sections to renderer + ui-tech-choice (Issue
      3.C-2)
- [ ] Append `## Z-Stack Contract` to ui-tech-choice; add `Z-Layer:`
      to existing modal/tooltip/popup specs (Issue 3.D-1)
- [ ] Flesh out
      `docs/architecture/wiki/screens/59-loading-screen/architecture.md`
      + diagram 28 (Issue 3.D-2)
- [ ] Author screen package `60-debug-overlay/` + register in
      `index.json`; add post-MVP task (Issue 3.D-3)
- [ ] Author `docs/architecture/ui-frame-lag-contract.md`; back-link
      from state-flow / determinism / adventure-map architecture
      (Issue 3.G-1)
- [ ] Update task-citations across
      `tasks/mvp/06-renderer/` and `tasks/mvp/07-ui-shell/`; regenerate
      registry + report (Issue 3.E-1)
- [ ] Run `npm run validate` and `npm run generate:wiki` to confirm
      all cross-links and the architecture-wiki HTML are clean

---

## 5. Execution Order

Strict ordering — later items depend on earlier docs being citable.

1. **Issue 3.A-1** — `ui-technology-choice.md` lands first; everything
   below cites it.
2. **Issue 3.A-2** — state-binding appendix (small, lives in 3.A-1's
   doc).
3. **Issue 3.D-1** — z-stack contract (small, lives in 3.A-1's doc;
   needed before debug overlay & loading screen orchestration).
4. **Issue 3.C-1** — `screen-scaling.md` (independent; gates renderer
   canvas mounting).
5. **Issue 3.A-3** — `ui-renderer-seam.md` (depends on 3.A-1 +
   3.C-1).
6. **Issue 3.C-2** — fonts (small append; can ride alongside).
7. **Issue 3.B-1** — component resolver (depends on 3.A-1 framework
   choice; this is the largest single piece).
8. **Issue 3.B-2** — localization runtime (extends 3.B-1's validator).
9. **Issue 3.G-1** — frame-lag contract (depends on 3.A-2 binding
   primitive).
10. **Issue 3.D-2** — loading-screen orchestration (depends on 3.A-3
    seam, 3.C-1 scaling).
11. **Issue 3.D-3** — debug overlay screen package (depends on 3.D-1
    z-stack, 3.B-1 resolver).
12. **Issue 3.E-1** — wire new docs into task citations
    (final consolidation).

Acceptance gate: `npm run validate` and `npm run validate:tasks` both
green; `npm run generate:task-system-report` shows ownership for every
new doc; `npm run generate:wiki` regenerates without errors.

---

## 6. Risks if Not Implemented

- **Spec drift.** Without 3.B-1, every screen task invents its own
  `data-component` interpretation; the wiki spec premise collapses
  within 3 implementations.
- **Tablet release blocker.** Without 3.C-1, the first iPad test
  produces blurry tile art at DPR 2 and unintended letterboxing — a
  release-blocking cosmetic regression that is expensive to back-fix.
- **WebGL/DOM input ambiguity.** Without 3.A-3, double-fired clicks
  and dead zones surface late and intermittently across screens —
  classic "works on my machine" bug class.
- **Determinism leak.** Without 3.G-1, optimistic UI patterns fork
  authoritative state silently; M5 lockstep desyncs are misdiagnosed
  as engine bugs.
- **Z-stack chaos.** With ~60 numbered screen packages, no global
  ordering means the integration sprint produces overlap/visibility
  bugs that cost more than the contract itself.
- **Fragmented diagnostics.** Without 3.D-3, replay debugging is
  console-only; non-engineers cannot reproduce desyncs; debug code
  added ad-hoc later ships to production.
- **Stalled task pipeline.** Without 3.A-1, every task in
  `tasks/mvp/07-ui-shell/` is blocked from `tasks:start` until an
  implementer ad-hoc decides the framework — defeating the autonomous
  MVP execution path.

---

## 7. AI Implementation Readiness

**Before this plan: 3.5 / 10**

**After this plan lands: 8 / 10**

Reason: every contract an AI agent needs to implement a numbered screen
from its spec package will then exist as a citable architecture doc:
framework + state binding (3.A-1, 3.A-2), canvas/DOM seam (3.A-3),
component resolver (3.B-1), scaling (3.C-1), fonts (3.C-2), z-stack
(3.D-1), loading orchestration (3.D-2), debug overlay (3.D-3), and
frame-lag contract (3.G-1). The resolver schema and validator
(3.B-1) close the loop between `mockup.html`/`spec.md` and runtime so
that screen-implementation tasks are self-verifying. The remaining ≤2
points reflect work that is correctly deferred (Phase 3 WebGPU path,
gamepad support, accessibility audit) rather than gaps in the MVP
contract surface.
