# UI Technology Choice — React 18 + Zustand

**Decision:** DOM-side UI shell built on React 18 with a Zustand store.
**Date:** 2026-05-02
**Status:** Approved for MVP

---

## Context

The renderer (WebGL2) is locked in
[`renderer-technology-choice.md`](./renderer-technology-choice.md) and
explicitly carves the UI shell out of WebGL. The DOM-side shell owns:

- screen routing (numbered packages under [`wiki/screens/`](./wiki/screens/))
- HUD, panels, modals, tooltips, popups, toasts, loading, debug overlay
- input dispatch and command emission to the engine
- subscription to gameplay state (read-only) and to local UI draft state
- localization, scaling, hi-DPI, and z-stack policy

This doc pins the framework, store, templating, build, and the contracts
each screen package depends on at runtime.

## Goals & Non-Goals

### Goals
- One canonical answer for every screen task in
  [`tasks/mvp/07-ui-shell/`](../../tasks/mvp/07-ui-shell/).
- A small, auditable subscription model that does not race the WebGL
  loop.
- An explicit seam between DOM and the WebGL viewport — see
  [`ui-renderer-seam.md`](./ui-renderer-seam.md).
- Stable contracts for `data-component`, `data-i18n`, and z-layer
  values used in every `mockup.html`.
- A swap-out path (Solid signals, view-transitions API) without
  rewriting screen packages.

### Non-Goals
- Choosing visual style. The screen packages own visuals.
- Rebuilding screen packages or curating new ones.
- Phase 3 WebGPU paths, gamepad support, accessibility audits.

---

## Candidate Comparison

| Tech | Pros | Cons | Verdict |
|---|---|---|---|
| **React 18 + Zustand** | Mature, fiber concurrency, small store with selector subscription, broad tooling | Hooks discipline required; useEffect overuse risk | ✅ **CHOSEN** |
| Preact + Signals | Smaller bundle, signal subscriptions | Smaller ecosystem, no concurrent features yet | ❌ Deferred |
| Solid | Fine-grained reactivity, no virtual DOM | Smaller hiring pool, JSX dialect drift | ❌ Phase 3 swap path |
| Svelte | Compiler-driven, very small | Build pipeline divergence from Vite/React in tasks | ❌ Deferred |
| Raw DOM | No framework | Re-implements diffing, eventing, accessibility | ❌ Not suitable |
| htmx + server fragments | Simple | Requires server; mismatch with client-only deterministic engine | ❌ Not suitable |

---

## Decision Rationale

### 1. Selector Subscription, Not Re-Render Storm
Zustand selectors with shallow equality let DOM components subscribe to
slices of state. The WebGL viewport reads its own snapshot inside the
animation timeline; React re-renders are driven by store updates, not
by `requestAnimationFrame`.

### 2. Deterministic Engine Is Untouched
React + Zustand stays on the DOM side. Reducers remain pure under
`src/engine/`. UI dispatches commands via the shared command hook; it
never mutates gameplay state.

### 3. TSX, Strict TypeScript, No JSX-Runtime Swaps
Templating is TSX with the React 18 automatic JSX runtime. No alternate
runtimes, no JSX pragmas per file. Strict typing per
[`CLAUDE.md`](../../CLAUDE.md#engineering-guide).

### 4. CSS Modules Over CSS-in-JS
CSS Modules co-located with each component
(`<Component>.tsx` + `<Component>.module.css`). No styled-components,
no Emotion. Reasons: zero runtime cost, predictable cascade, simpler
hi-DPI rules ([`screen-scaling.md`](./screen-scaling.md)).

### 5. Vite Build
Vite for dev server + production bundle. Aligns with
[`tasks/mvp/07-ui-shell/01-react-18-app-shell-with-canvas-overlay.md`](../../tasks/mvp/07-ui-shell/01-react-18-app-shell-with-canvas-overlay.md).
Build flags via `import.meta.env.{DEV,PROD}` (see
[Build Flags](#build-flags)).

---

## Layered Pipeline

```
[user input]
    │
    ▼
[DOM event] ──► [pointer routing] ──► [renderer.pickAt | DOM hit-test]
    │                                     │
    ▼                                     ▼
[command hook] ──► [Zustand store action] ──► [engine reducer]
                                                │
                                                ▼
                                          [Zustand store state']
                                                │
                                ┌───────────────┴───────────────┐
                                ▼                               ▼
                  [DOM components: selector]      [renderer: rAF snapshot]
```

DOM and WebGL both read from the same store. Only the engine reducer
mutates authoritative state. The seam is pinned in
[`ui-renderer-seam.md`](./ui-renderer-seam.md).

---

## State Binding

DOM components bind to authoritative gameplay and to UI-local draft
state through Zustand selectors.

### Subscription Model

- Components call `useStore(selector, equalityFn?)`. Default equality
  is shallow.
- Deep selectors require an explicit equality function. Stale selector
  identity is forbidden — define selectors at module scope or wrap with
  `useCallback` if parameterized.
- Selectors are pure and side-effect-free. No `Math.random`, no
  reading DOM, no fetching, no logging.
- Components MUST NOT mutate store state outside an action. The lint
  rule `no-store-mutation-outside-action` enforces this; it pairs with
  the determinism rule that gameplay records are reducer-owned (see
  [`determinism.md`](./determinism.md)).

### Cadence

- DOM re-render is **event-driven**: a Zustand subscription wakes up
  only the components whose selectors observed a changed slice.
- WebGL viewport runs **rAF-driven**: its render loop reads
  `store.getState()` once per frame; it never subscribes through React.
- Commands dispatched from the UI flow through the command hook into
  the reducer; the resulting store update drives the next React
  re-render. There is no per-frame DOM diff for static screens.

See [`state-flow.md`](./state-flow.md) §"Renderer + UI Subscription
Cadence" for the appendix Mermaid diagram.

### Frame Lag

DOM subscription guarantees one render-frame lag from
`apply(state, command)` to visible DOM. The full contract — including
optimistic UI, M5 lockstep, context loss, and replay — lives in
[`ui-frame-lag-contract.md`](./ui-frame-lag-contract.md).

---

## Localization Runtime

Strings are referenced via stable IDs ([diagram 18](./diagrams/18-string-resolution.md));
locale packs ship under `strings/*.json`. The runtime contract is:

- A `useTranslation()` hook reads the active locale slice
  (`state.ui.locale`). Locale changes invalidate every consumer in one
  Zustand notification — no per-element refresh logic.
- Translations resolve at **render time**, not mount time. No imperative
  `t()` calls outside the hook. Selectors that depend on locale must
  read `state.ui.locale` so the framework re-runs them on locale change.
- `data-i18n="ui.<screen>.<key>"` annotations in `mockup.html` are the
  visual contract. Each must resolve to a key in the locale pack;
  enforced by
  [`scripts/validate-screen-component-coverage.mjs`](../../scripts/validate-screen-component-coverage.mjs).

### Right-To-Left

- The active locale pack declares `direction: "ltr" | "rtl"`.
- `<html dir="…">` is set from that field on locale change.
- CSS uses logical properties (`margin-inline-start`, `padding-inline-end`,
  `text-align: start`). No hand-flipped layouts and no `direction`
  overrides per component.
- Mirrored asset variants (banners with directional text, arrow
  glyphs) ship as locale-specific asset IDs through the asset
  manifest, not as inline transforms.

### Pluralization, Formatting, Numbers

- Pluralization uses the locale pack's `plurals[]` table; the hook
  resolves count → form before returning text.
- Numbers and dates inside gameplay state use the formatters defined
  in [diagram 20](./diagrams/20-number-format.md). UI never formats
  numbers ad hoc.

---

## Z-Stack Contract

Modals, tooltips, popups, toasts, the debug overlay, loading, and the
fatal error boundary all live above the canvas and the HUD. The named
layer indices are canonical. Each modal/tooltip/popup screen `spec.md`
cites a `Z-Layer:` value from this table.

| Layer | z-index | Owner | Notes |
|---|---|---|---|
| Map / battle canvas | 0 | renderer | Single `<canvas>` mounted by the renderer |
| In-canvas UI layer | 50 | renderer | Camera-locked sprites, hex highlights |
| HUD (resource bar, end-turn, mini-map) | 100 | UI shell | Always-on chrome above the canvas |
| Side panels (hero info, town menu, command tablet) | 200 | UI shell | Anchored to stage edges |
| Persistent overlays (turn indicator, AI thinking) | 400 | UI shell | Non-blocking |
| Modal dialogs | 1000 | UI shell | Stack-based portal; newest on top |
| Tooltips | 2000 | UI shell | One at a time; dismissed by higher layer opening |
| Popups (week/month, end-of-turn) | 2500 | UI shell | Modal-equivalent, distinct portal root |
| Toasts / inline notifications | 3000 | UI shell | Top-right stack |
| Debug overlay | 9000 | dev-only | Gated by `import.meta.env.DEV` |
| Synchronizing overlay (M5 lockstep lag) | 9500 | UI shell | Above debug, below loading |
| Loading screen | 9700 | UI shell | Hides everything below it |
| Error boundary fatal screen | 10000 | UI shell | Last-resort layer |

### Stacking Rules

- Modals at the same layer use a **stack-based portal**: open order
  determines paint order. Closing a non-top modal collapses the stack
  in declaration order.
- Tooltips dismiss immediately when any element at a higher layer
  opens.
- Popups can stack (week/month → end-of-turn) but never above modal
  dialogs in the same task flow.
- Toasts stack within their layer with a short auto-dismiss; they
  never block input.
- The debug overlay is non-input-blocking even when visible.
- Only one of {Synchronizing overlay, Loading screen, Error boundary}
  may be visible at a time; the higher z-index wins.

### Portals

Each layer above 1000 mounts into a dedicated React portal root in
`src/ui/portals/`. The portals are children of the app root, not of
individual screens; closing a screen does not unmount its open
modal/tooltip/popup portals.

---

## Fonts

The DOM shell uses web fonts loaded via `@font-face`. A primary stack
covers Latin; locale packs may supply additional `@font-face`
declarations for non-Latin scripts.

- Primary: a serif-classic-fantasy stack for display text and labels.
- Fallback: `Georgia, "Times New Roman", serif` for paragraph copy
  (matches the curated mockups).
- Monospace: `ui-monospace, Menlo, monospace` for hashes, debug text,
  number tickers.
- Locale-specific font swap: a locale pack may set
  `fontStack.<role>: [...family list]`, applied to the matching CSS
  variable on locale change. UI components read `--font-<role>`, not
  hard-coded family lists.

### Anti-Patterns

- Do not bake DOM text into a `<canvas2d>` texture for the WebGL
  viewport. WebGL labels use SDF atlases (see
  [`renderer-technology-choice.md`](./renderer-technology-choice.md#fonts-webgl)).
- Do not overlay DOM text on the WebGL viewport when the text must
  follow camera transforms — that is a renderer responsibility, not a
  DOM one.
- Do not load all locale fonts on boot. Lazy-load via the locale pack
  manifest at locale switch.

---

## Build Flags

UI build flags are owned by Vite and exposed to runtime through
`import.meta.env`. Allowed flags:

| Flag | When true | Effect |
|---|---|---|
| `import.meta.env.DEV` | dev server | Mounts the debug overlay screen package; enables strict-mode warnings; un-minified bundle |
| `import.meta.env.PROD` | production build | Strips debug overlay imports, dev-only console output, and assertion-bodied selectors |
| `import.meta.env.MODE === "test"` | unit tests | Disables animations, freezes timers consumed only by presentation |

### Anti-Patterns

- No `process.env.NODE_ENV` reads in UI code; that is a Node concept.
- No runtime feature flags shipped in production unless declared in a
  pack manifest. Build-time flags are not user-toggleable.
- Debug overlay imports must be tree-shakable: import via
  `if (import.meta.env.DEV) { … dynamic import … }` so the production
  bundle never includes the screen package.

---

## Constraints & Anti-Patterns

### DO
- ✅ Subscribe with selectors; keep selectors pure.
- ✅ Co-locate `<Component>.tsx`, `<Component>.module.css`, and tests.
- ✅ Use the command hook for every gameplay-affecting action.
- ✅ Resolve `data-component` and `data-i18n` through the runtime
  contracts in [`ui-component-resolver.md`](./ui-component-resolver.md)
  and [Localization Runtime](#localization-runtime).
- ✅ Read camera-coupled data through `renderer.pickAt` from the seam,
  never by introspecting WebGL state.

### DON'T
- ❌ Read sim internals directly from a component.
- ❌ Run side effects in render. `useEffect` is for subscribing,
  imperative work, and cleanup — not for derived state.
- ❌ Use `useEffect` to copy props into local state for derivation;
  derive at render time instead.
- ❌ Mutate gameplay state from a component. Mutation is reducer-only.
- ❌ Use imperative DOM (manual `document.querySelector`, etc.) outside
  the canvas mount and the seam-defined ResizeObserver.
- ❌ Add new layer indices outside the [Z-Stack Contract](#z-stack-contract).
- ❌ Read `Math.random()` or wall-clock time inside selectors.

---

## Future Extensibility

### Solid Signals (Phase 3)
A swap to Solid is a non-breaking change for screen packages: the
`data-component` resolver and Zustand-style selectors map cleanly onto
Solid stores and signals. The component registry schema
([`ui-component-registry.schema.json`](../../content-schema/schemas/ui-component-registry.schema.json))
already abstracts the constructor type behind `module` + `exportName`.

### View Transitions API
Route transitions can adopt the View Transitions API once browser
support stabilizes. The current contract (route guard → reducer →
fade) does not bake in any other transition technology.

### Localization Pluggability
Locale packs are content; new locales need no engine changes. The
fonts swap rule, RTL rule, and `data-i18n` validator are independent
of which locales ship.

---

## Related Files

- [`renderer-technology-choice.md`](./renderer-technology-choice.md) — WebGL2 viewport
- [`ui-renderer-seam.md`](./ui-renderer-seam.md) — DOM ↔ canvas seam
- [`ui-component-resolver.md`](./ui-component-resolver.md) — `data-component` registry
- [`screen-scaling.md`](./screen-scaling.md) — viewport, hi-DPI, aspect
- [`ui-frame-lag-contract.md`](./ui-frame-lag-contract.md) — UI lag bounds
- [`state-flow.md`](./state-flow.md) — turn-loop overview
- [`determinism.md`](./determinism.md) — why selectors must be pure
- [`wiki/README.md`](./wiki/README.md) — screen-package authoring rules
- [`tasks/mvp/07-ui-shell/`](../../tasks/mvp/07-ui-shell/) — implementation tasks
- `src/ui/` — implementation directory (planned)
