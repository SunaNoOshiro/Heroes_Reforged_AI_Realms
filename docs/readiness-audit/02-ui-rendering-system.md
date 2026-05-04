# 2. UI RENDERING SYSTEM

> Audit pass over the questions originally listed in this file. Each
> question is preserved verbatim and answered against the current repo
> state (planning + contracts; the only renderer code today is empty
> README files in `src/renderer/` and `src/ui/`).

---

### Q: 25. Is UI rendered via DOM, Canvas2D, WebGL, WebGPU, or a hybrid stack?

**Status:** ⚠ Partial

**Answer:**
**Hybrid by intent, only the map half is pinned.** The map/battle
viewport is **WebGL2** (decided in
`renderer-technology-choice.md`). The UI shell (HUD, town screens,
panels, dialogs) lives in a separate `src/ui/` directory and is
authored as **HTML mockups** (`mockup.html` per screen) annotated
with `data-component` / `data-state` / `data-action` / `data-i18n`
attributes — strongly implying a **DOM** runtime renderer for
non-map UI, but no doc explicitly says "the UI shell uses DOM".
Canvas 2D is explicitly rejected for the map; WebGPU is a Phase 3
option. So the runtime stack is: WebGL2 (map/battle) + presumed DOM
(UI shell), with a documented Canvas 2D fallback path for older
browsers.

**Evidence:**
- [docs/architecture/renderer-technology-choice.md:1-5](../architecture/renderer-technology-choice.md#L1-L5) — "WebGL2" decision
- [docs/architecture/renderer-technology-choice.md:21-29](../architecture/renderer-technology-choice.md#L21-L29) — candidate table; Canvas 2D ❌, WebGPU = Phase 3
- [docs/architecture/renderer-technology-choice.md:113-114](../architecture/renderer-technology-choice.md#L113-L114) — Canvas 2D fallback for older browsers
- [docs/architecture/renderer-technology-choice.md:121-122](../architecture/renderer-technology-choice.md#L121-L122) — "`src/ui/` — UI shell (separate from renderer, no WebGL)"
- [docs/architecture/wiki/README.md:32-47](../architecture/wiki/README.md#L32-L47) — `mockup.html` is the canonical visual contract
- ❌ No doc that explicitly names the UI-shell runtime tech (DOM vs. ImGui-on-canvas vs. framework) — *resolved* in
  [`docs/architecture/runtime-requirements.md` § RR-01](../architecture/runtime-requirements.md#rr-01-ui-shell--dom-react-18--zustand)
  and [`docs/architecture/ui-technology-choice.md`](../architecture/ui-technology-choice.md).

---

### Q: 26. If hybrid, what is the precise division of responsibility per layer?

**Status:** ⚠ Partial

**Answer:**
Documented split:

| Layer | Tech (intended) | Owner path | Responsibility |
|---|---|---|---|
| Adventure / battle viewport | **WebGL2** | `src/renderer/` | Hex grid, terrain, fog, units, animations, VFX |
| UI shell (HUD, panels, dialogs, town/hero screens, menus) | **DOM (implied)** | `src/ui/` | Buttons, lists, forms, route guards, command emission |
| Asset resolution | shared | `src/renderer/` (also called out as adapter) | Maps content IDs → asset URLs |
| Localization | shared | localization service (per pack) | UI strings + asset overrides |

The renderer-choice doc explicitly carves the UI **out of WebGL**
("`src/ui/` — UI shell (separate from renderer, no WebGL)").
Beyond that line, no doc defines the **precise interface** between
the two layers (e.g. how the WebGL canvas reports hover/hit-test
results into the DOM-side panel, where `mockup.html` annotations
attach into the DOM tree, or how the UI overlays the WebGL canvas
positionally).

**Evidence:**
- [docs/architecture/renderer-technology-choice.md:54-67](../architecture/renderer-technology-choice.md#L54-L67) — layered render pipeline
- [docs/architecture/renderer-technology-choice.md:118-123](../architecture/renderer-technology-choice.md#L118-L123) — related-files table
- [docs/architecture/diagrams/08-building-click.md:11-34](../architecture/diagrams/08-building-click.md#L11-L34) — building-click flow (Mouse → Town view → CommandDispatcher), implies hit-test in renderer feeding panel state
- ❌ No "renderer ↔ UI shell IPC contract" doc

---

### Q: 27. How does the renderer map spec.md component IDs to runtime components?

**Status:** ❌ UNKNOWN

**Answer:**
**Not documented.** Each `spec.md` lists a Component Tree (e.g.
`AdventureMapScreen → MapViewport / FogMask / PathPreview / …`) and
each `mockup.html` annotates regions with `data-component`. The
authoring rules (`wiki/README.md`) say UI implementation tasks
*reference* the screen package, but no doc defines the binding
mechanism — there is no registry, no naming convention rule, no
build step that wires `data-component="MiniMap"` to a runtime
`MiniMap` component constructor.

**Evidence:**
- [docs/architecture/wiki/screens/07-adventure-map/spec.md:23-34](../architecture/wiki/screens/07-adventure-map/spec.md#L23-L34) — component tree
- [docs/architecture/wiki/README.md:65-84](../architecture/wiki/README.md#L65-L84) — annotation rules; no mention of a runtime resolver
- ❌ No "screen → component → runtime class" mapping doc

---

### Q: 28. Is there a one-to-one mapping between spec components and code, or many-to-one?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** No doc says whether two screens that both list a
`StatusLine` (e.g. screens 07 and 19) share the same runtime
component or instantiate independent ones. The screen packages
suggest reuse is intended (visual contract uses identical wording —
"dense classic fantasy strategy UI: fixed 800x600 layout, ornate
gold frame…" — across many specs), but a reuse policy is never
written.

**Evidence:**
- [docs/architecture/wiki/screens/07-adventure-map/spec.md:35-37](../architecture/wiki/screens/07-adventure-map/spec.md#L35-L37) — `StatusLine`
- ❌ No shared-component registry doc; no reuse rule in `wiki/README.md`

---

### Q: 29. How are unspecified components handled at runtime?

**Status:** ❌ UNKNOWN

**Answer:**
**Not addressed.** The wiki generator validates that every screen
folder is referenced exactly once in `screens/index.json` and that
no screens are missing — but that is **build-time** validation of
the spec set. There is no runtime fallback rule for "component
referenced in `data-component` has no runtime implementation
registered" (render placeholder? throw? skip silently?). No
"missing-component" telemetry, no devtools overlay rule.

**Evidence:**
- [docs/architecture/wiki/README.md:53-89](../architecture/wiki/README.md#L53-L89) — build-time wiki rules only
- ❌ No runtime missing-component policy

---

### Q: 30. Is binding to state push-based, pull-based, or subscription-based?

**Status:** ⚠ Partial

**Answer:**
**Subscription-based, by implication.** The state-flow boundary
table says the renderer "Subscribes to state; never mutates", and
each screen `spec.md` lists explicit `State Bindings` (UI element →
`state.adventure.visibleTiles`, etc.). This matches a subscription
model: each component subscribes to a slice of `GameState` and
re-renders when the slice changes. **Not pinned**: the subscription
mechanism (signals, observable store, manual diff, framework like
Solid/Svelte/Preact) and the per-frame vs. event-driven cadence.

**Evidence:**
- [docs/architecture/state-flow.md:53-58](../architecture/state-flow.md#L53-L58) — "Subscribes to state; never mutates"
- [docs/architecture/wiki/screens/07-adventure-map/spec.md:36-42](../architecture/wiki/screens/07-adventure-map/spec.md#L36-L42) — explicit state bindings
- ❌ No statement on signals vs. observers vs. polling, and no chosen UI framework

---

### Q: 31. Does the UI re-render on every tick, on state diff, or on explicit invalidation?

**Status:** ❌ UNKNOWN

**Answer:**
**Not defined.** There is no "tick" (the engine is command-driven),
the renderer is "frame-driven at 60 FPS" but that target only
covers the WebGL2 viewport. The UI shell's invalidation rule
(redraw on every state mutation? on subscription delta? on explicit
`invalidate()`?) is unspecified anywhere in the architecture docs.

**Evidence:**
- [docs/architecture/renderer-technology-choice.md:81-86](../architecture/renderer-technology-choice.md#L81-L86) — 60 FPS target (map/battle)
- [docs/readiness-audit/01-core-architecture.md:9-26](./01-core-architecture.md#L9-L26) — no tick rate, command-driven
- ❌ No UI invalidation policy

---

### Q: 32. What diffing strategy is used (vdom, signals, dirty flags)?

**Status:** ❌ UNKNOWN

**Answer:**
**Not chosen.** No doc selects a diffing strategy. The renderer-
choice doc focuses entirely on the WebGL2 viewport and explicitly
defers framework choices ("raw WebGL2" beats Three.js). For the
DOM-side UI shell, no equivalent decision exists — VDOM (React /
Preact), signals (Solid / Svelte), or dirty-flag/manual updates
have not been picked.

**Evidence:**
- [docs/architecture/renderer-technology-choice.md:21-29](../architecture/renderer-technology-choice.md#L21-L29)
- ❌ No `ui-technology-choice.md` document

---

### Q: 33. Are layouts pixel-fixed, grid-based, flex-based, or constraint-based?

**Status:** ⚠ Partial

**Answer:**
**Pixel-fixed at the design level: 800×600 canonical layout.**
Every curated screen `spec.md` uses the same line: "fixed 800x600
layout, ornate gold frame, red/brown/stone panels…". The map
viewport additionally maintains a 16:9 aspect ratio (responsive
canvas).

**Not pinned:** how the 800×600 design grid actually scales onto
arbitrary modern displays (CSS transform? letterbox? viewport
meta?), and whether the underlying DOM uses CSS Grid, Flex, or
absolute positioning.

**Evidence:**
- [docs/architecture/wiki/screens/01-main-menu/spec.md:20](../architecture/wiki/screens/01-main-menu/spec.md#L20)
- [docs/architecture/wiki/screens/07-adventure-map/spec.md:20](../architecture/wiki/screens/07-adventure-map/spec.md#L20)
- [docs/architecture/wiki/screens/24-town-screen/spec.md](../architecture/wiki/screens/24-town-screen/spec.md) — same "fixed 800x600 layout" boilerplate
- [docs/architecture/renderer-technology-choice.md:79](../architecture/renderer-technology-choice.md#L79) — 16:9 viewport for the WebGL canvas
- ❌ No layout-engine choice (Grid / Flex / absolute) documented

---

### Q: 34. What is the canonical resolution, and how is non-canonical scaled?

**Status:** ⚠ Partial

**Answer:**
**Canonical resolution: 800×600** (per every curated screen spec).
**Non-canonical scaling: undocumented.** The renderer doc only
guarantees a 16:9 responsive *map canvas* — but the canonical UI is
800×600 (4:3), so the relationship between the 4:3 design surface
and the 16:9 canvas is itself unresolved. No doc states whether
800×600 is a virtual coordinate system rendered at any pixel size,
or a literal pixel layout displayed letterboxed.

**Evidence:**
- [docs/architecture/wiki/screens/01-main-menu/spec.md:20](../architecture/wiki/screens/01-main-menu/spec.md#L20) — fixed 800×600
- [docs/architecture/renderer-technology-choice.md:79](../architecture/renderer-technology-choice.md#L79) — 16:9 viewport (map only)
- ❌ No `screen-scaling.md` doc; no rule for 1080p / 1440p / 4K targets
- ❌ Internal contradiction: 800×600 (4:3) UI vs. 16:9 map viewport — never reconciled

---

### Q: 35. How are aspect ratios outside 16:9 handled?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** The renderer doc says "Maintain 16:9 aspect
ratio (responsive canvas)" for the map viewport but does not say
what happens on 4:3, 21:9, or portrait mobile. Letterboxing,
pillarboxing, viewport stretching, or UI repositioning rules are
all undefined. Tablet support is a hard goal ("desktop + tablet"),
which makes this a real gap, not a hypothetical one.

**Evidence:**
- [docs/architecture/renderer-technology-choice.md:14-16](../architecture/renderer-technology-choice.md#L14-L16) — desktop + tablet target
- [docs/architecture/renderer-technology-choice.md:79](../architecture/renderer-technology-choice.md#L79) — 16:9 only
- ❌ No off-aspect / responsive-breakpoint policy

---

### Q: 36. Is there separate logic for pixel-art crispness vs. smooth UI?

**Status:** ❌ UNKNOWN

**Answer:**
**Not addressed.** Tile assets are documented as a 32×32 hex tile
PNG atlas (pixel-grid friendly), but no doc specifies texture
filtering rules (`NEAREST` vs. `LINEAR`), `image-rendering` CSS,
mipmap policy, or any nearest-neighbor scaling rule for pixel art.
The UI vs. map distinction (smooth UI text/lines vs. crisp tile
art) is not split into separate sampler/filter rules.

**Evidence:**
- [docs/architecture/renderer-technology-choice.md:71-74](../architecture/renderer-technology-choice.md#L71-L74) — atlas / tile size
- ❌ No texture-filtering / `image-rendering` rule

---

### Q: 37. Are fonts bitmap, SDF, or vector?

**Status:** ❌ UNKNOWN

**Answer:**
**Not chosen.** No doc selects a font technology. Localization is
text-driven (string IDs → translated text), and the locale-pack
structure (`strings/ui.json`) implies dynamic strings, but the
runtime rendering technique for those strings is not specified.
SDF (good for WebGL), bitmap fonts (crisp at fixed scales), or
vector text via DOM/CSS are all viable; none is selected.

**Evidence:**
- [docs/architecture/diagrams/18-string-resolution.md:40-53](../architecture/diagrams/18-string-resolution.md#L40-L53) — locale pack string structure
- ❌ No font-technology decision

---

### Q: 38. How is text localization wired into rendering?

**Status:** ✔ Defined

**Answer:**
**Via a localization service that resolves string IDs at render
time.** Diagram 18 spells the flow out: code calls `t('unit.dragon.name')`
→ Localization Service → look up in current locale pack →
fallback to `en-US` if missing → return key name + warn if not
found. Locale packs ship a fixed file structure
(`strings/ui.json`, `units.json`, `spells.json`, `heroes.json`,
`tooltips.json`). All keys are stable across locales; translators
edit values only.

What is **not** specified: the runtime call site (does each DOM
element with `data-i18n="some.key"` get hot-swapped on locale
change? does the renderer cache lookups per frame?), and the
right-to-left layout mechanism (the diagram says "RTL handled by
UI engine" — but the UI engine is undefined).

**Evidence:**
- [docs/architecture/diagrams/18-string-resolution.md:1-56](../architecture/diagrams/18-string-resolution.md#L1-L56)
- [docs/architecture/wiki/README.md:65-68](../architecture/wiki/README.md#L65-L68) — `data-i18n` annotation in `mockup.html`
- [docs/architecture/schema-matrix.md](../architecture/schema-matrix.md) — `Localization` schema
- ⚠ RTL "handled by UI engine" — but no UI engine has been chosen

---

### Q: 39. Are tooltips, modals, and popups in the same render tree as the main UI?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** Tooltips (screen 18 — `18-map-object-tooltip`),
modals (e.g. `09-map-object-dialog`, `25-building-recruitment-dialog`),
and popups (e.g. `58-week-month-popup`) each have their own
numbered screen package, treated as peer-level UI states. Whether
they overlay the same DOM root, mount into a separate portal, or
render through a layered z-stack is not documented.

**Evidence:**
- [docs/architecture/wiki/screens/18-map-object-tooltip/](../architecture/wiki/screens/18-map-object-tooltip/) — tooltip is its own package
- [docs/architecture/wiki/screen-curation-plan.md](../architecture/wiki/screen-curation-plan.md) — lists tooltip / popup / loading-screen as separate packages
- ❌ No portal / layer / z-stack rule

---

### Q: 40. What z-ordering rules govern overlapping UI?

**Status:** ⚠ Partial

**Answer:**
**Layered render pipeline is documented for the map/battle WebGL
canvas only:**
`clear → terrain → fog → object → unit → UI layer → present`.
"Depth: Layer ordering via z-index (not Z-buffer, since this is 2D)"
— this is for the WebGL2 viewport.

For the **UI shell** (panels, modals, tooltips, popups), no
canonical z-order list exists (e.g. "modals z=1000, tooltips
z=2000, status toast z=3000"). With multiple modal screen packages
plus the in-WebGL "UI layer", a global ordering policy is required
and absent.

**Evidence:**
- [docs/architecture/renderer-technology-choice.md:54-67](../architecture/renderer-technology-choice.md#L54-L67) — layer pipeline
- [docs/architecture/renderer-technology-choice.md:74](../architecture/renderer-technology-choice.md#L74) — "z-index (not Z-buffer)"
- ❌ No global z-stack contract for DOM-side UI shell

---

### Q: 41. How is UI rendered during loading screens?

**Status:** ⚠ Partial

**Answer:**
A dedicated **Loading Screen** package exists (screen 59) with
spec, mockup, interactions, and data contracts. It binds to
`state.ui.loading.{taskId,progress,destinationRoute,errors,contentHashes}`,
shows progress bar + animated crest + step text, and fades to the
destination route on completion. So the "what" is defined.

What is **not** defined: whether the loading screen replaces the
WebGL canvas (i.e. is the canvas torn down during load?), or
overlays it; how warmup of the renderer (shader compile, atlas
upload) is sequenced against the visible loading bar; and which
component is responsible for advancing the `loading.progress`
field (engine? content-runtime? renderer warmup? UI shell?).

**Evidence:**
- [docs/architecture/wiki/screens/59-loading-screen/spec.md:1-61](../architecture/wiki/screens/59-loading-screen/spec.md#L1-L61)
- ❌ No renderer-warmup sequence; no canvas-lifecycle rule during load

---

### Q: 42. Is there a separate debug overlay layer, and is it shipped to production?

**Status:** ❌ UNKNOWN

**Answer:**
**Not addressed.** No screen package, no architecture doc, and no
file under `docs/` mentions a debug overlay (FPS counter, state
inspector, command-log tail, hash-diff viewer). The determinism
stack does specify a state-hash and replay API — both *natural*
hooks for a debug overlay — but no overlay UX is documented, and
there is no production / dev build flag policy for stripping it.

**Evidence:**
- [docs/architecture/determinism.md:13-15](../architecture/determinism.md#L13-L15) — state hash / replay API
- ❌ No debug-overlay screen package, no build-flag policy

---

### Q: 43. What is the strategy for hi-DPI / retina displays?

**Status:** ❌ UNKNOWN

**Answer:**
**Not defined.** Tablet support is required, retina iPads are part
of that target, but no doc specifies `devicePixelRatio` handling,
WebGL canvas sizing rules (CSS pixel size vs. backing-store size),
or hi-DPI atlas variants (1×, 2×, 3× sprite atlases). The 32×32
tile atlas is mentioned without a hi-DPI variant.

**Evidence:**
- [docs/architecture/renderer-technology-choice.md:14-16](../architecture/renderer-technology-choice.md#L14-L16) — desktop + tablet target
- [docs/architecture/renderer-technology-choice.md:71-74](../architecture/renderer-technology-choice.md#L71-L74) — single 32×32 tile atlas
- ❌ No `devicePixelRatio` rule; no hi-DPI asset pipeline

---

### Q: 44. Is input event routing handled by the renderer or a separate input bus?

**Status:** ⚠ Partial

**Answer:**
**Implicit hybrid; no input-bus abstraction.** The building-click
flow shows `Mouse → TownView → CommandDispatcher`: hit-test is
performed by the view (within the renderer, presumably), the
result selects a building, and the resulting UI action emits a
command. There is no documented standalone "input bus" layer that
sits between raw browser events and the renderer/UI. Keyboard
shortcut handling, gamepad, touch (tablet target!), and accessibility
focus traversal are mentioned only as gaps in `wiki/missing-states.md`
("keyboard focus traversal for modal-heavy screens").

**Evidence:**
- [docs/architecture/diagrams/08-building-click.md:11-34](../architecture/diagrams/08-building-click.md#L11-L34)
- [docs/architecture/wiki/missing-states.md](../architecture/wiki/missing-states.md) — keyboard focus traversal listed as missing
- ❌ No `input-bus.md` doc; no documented hit-test contract for hex tiles vs. DOM panels overlapping the canvas

---

### Q: 45. What guarantees that UI never falls more than one frame behind state?

**Status:** ❌ UNKNOWN

**Answer:**
**No guarantee documented.** The engine is synchronous and pure —
`state' = apply(state, command)` returns immediately on the same
call stack as the dispatch — so in single-player, in-process play,
a one-frame UI lag is naturally achieved by re-reading state after
dispatch. But no doc states this as a contract, and no mechanism
covers:

- multiplayer lockstep (M5): UI must show authoritative state, not
  optimistic local prediction; how is divergence detected and
  reconciled?
- async-confirmation commands (route guards in interactions.md):
  the UI keeps a "draft" until the reducer accepts; what bounds
  the draft-vs-authoritative window?
- renderer warmup / context loss (WebGL2): on context-loss
  recovery, how long can the UI lag before restoring?

**Evidence:**
- [docs/architecture/state-flow.md:46-58](../architecture/state-flow.md#L46-L58) — synchronous reducer
- [docs/architecture/wiki/screens/07-adventure-map/architecture.md:60-73](../architecture/wiki/screens/07-adventure-map/architecture.md#L60-L73) — UI Draft vs. authoritative result, but no timing bound
- [docs/architecture/renderer-technology-choice.md:91-95](../architecture/renderer-technology-choice.md#L91-L95) — context-loss recovery noted; no UI-lag bound
- ❌ No documented frame-lag contract

---

## 🔍 Summary

### Missing Logic

- **UI-shell technology choice (Q25, Q32):** the WebGL2 viewport is
  decided; the DOM-side UI shell has no equivalent
  `ui-technology-choice.md`. Framework, diffing strategy, and
  template/JSX/HTML pipeline are unselected.
- **Renderer ↔ UI-shell interface (Q26, Q44):** how the WebGL canvas
  reports hover/hit-test results into the DOM, where the canvas
  sits relative to overlay panels, and how input events cross the
  boundary is not pinned.
- **Spec-component → runtime resolver (Q27, Q28, Q29):**
  `data-component="X"` annotations exist in mockups, but no doc
  defines the runtime registry that turns them into components,
  the reuse policy across screens, or fallbacks for missing
  implementations.
- **State-binding mechanism (Q30, Q31):** "subscribes to state" is
  policy; the actual subscription primitive (signals / observables
  / VDOM) and re-render trigger (every state change / batched /
  rAF) are missing.
- **Resolution & scaling rules (Q33–Q36, Q43):** canonical 800×600
  is repeated everywhere, but the 4:3 design vs. 16:9 map canvas
  conflict, off-aspect handling, hi-DPI scaling, and pixel-art-
  vs.-smooth-UI filter rules are all unwritten.
- **Font technology (Q37):** SDF / bitmap / DOM-text not chosen.
- **Layered UI policy (Q39, Q40):** modals / tooltips / popups have
  separate packages but no z-stack contract or portal rule.
- **Loading-screen orchestration (Q41):** progress source(s) and
  canvas lifecycle during load not defined.
- **Debug overlay (Q42):** no overlay design and no production
  build-flag policy.
- **UI-frame-lag contract (Q45):** no documented bound on UI lag
  behind authoritative state, especially for the upcoming M5
  lockstep multiplayer.

### Risks

- **Fragmented UI conventions.** Without a chosen UI framework and
  a `data-component` resolver, every screen task will invent its
  own bindings; the wiki spec contracts will drift from
  implementation, defeating the whole "spec drives runtime"
  premise.
- **Aspect-ratio breakage on tablets.** "Desktop + tablet" is a
  goal, but with no off-aspect or hi-DPI rule, the first iPad test
  will produce either letterboxing the team didn't agree to or
  blurry tile art at 2× DPR.
- **Input ambiguity at the WebGL/DOM seam.** The map canvas and
  DOM panels can both be hit by a click — without a documented
  input-bus / event-priority rule, double-fires and dead-zones
  will surface late and inconsistently.
- **Determinism leak through the UI.** The engine is deterministic,
  but if the UI silently drops or re-orders commands during async
  validation (Q45), single-player replay and lockstep
  multiplayer can desync at the boundary while the engine itself
  is still pure.
- **Z-stack chaos.** With ~60 numbered screen packages, several
  modals/tooltips/popups, and an "in-canvas UI layer", the absence
  of a global z-order policy guarantees overlap/visibility bugs
  during integration.

### Improvements

- Add `docs/architecture/ui-technology-choice.md` selecting a
  framework + state-binding strategy for the DOM UI shell, mirroring
  the existing `renderer-technology-choice.md`.
- Add `docs/architecture/screen-scaling.md` reconciling the
  800×600 design grid with the 16:9 canvas, defining
  off-aspect / portrait / hi-DPI / tablet rules.
- Document the `data-component` resolver: a runtime registry that
  binds spec component IDs to runtime constructors, with a
  documented "missing component" fallback.
- Define a global z-stack contract: layer indices for canvas, HUD,
  modals, tooltips, popups, debug overlay.
- Define an input-bus contract: priority order between WebGL hit-
  test and DOM events, with explicit handling for keyboard,
  touch, and pointer events.
- Specify a UI frame-lag bound and document the validate-then-
  apply round trip explicitly so M5 lockstep can reuse it.
- Add a debug-overlay screen package (FPS, state hash,
  command-log tail, replay scrubber) gated behind a build flag.
- Pick a font technology (SDF for WebGL labels on the map; DOM/CSS
  for UI shell text is the obvious split — but write it down).

### AI-Readiness

Score: **3.5 / 10**

Reason: Only one of the three rendering layers is pinned. The
WebGL2 viewport (map / battle) has a clear decision document, a
layer pipeline, performance targets, and explicit anti-patterns —
that part is implementable. The UI shell is documented at the
*spec* level (mockups, component trees, state bindings,
interactions) but at the *runtime* level it is essentially empty:
no framework, no diffing strategy, no resolver from spec
component IDs to code, no scaling/aspect rules, no input bus, no
z-stack policy, no font choice, no debug overlay, no frame-lag
contract. An AI agent given screen 07 (Adventure Map) today could
write the spec but would have to invent every architectural
decision the renderer doc carefully made for the map canvas. Each
ad-hoc invention threatens cross-screen consistency and, at the
WebGL/DOM seam, even determinism. The path to readiness is one
focused doc — `ui-technology-choice.md` — plus four shorter
contracts (scaling, resolver, z-stack, input bus).
