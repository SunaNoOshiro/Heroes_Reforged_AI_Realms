# UI Component Resolver

**Status:** Approved for MVP
**Date:** 2026-05-02

The screen packages under [`wiki/screens/`](./wiki/screens/) annotate
DOM regions with `data-component="X"` and list a `### Component Tree`
in each `spec.md`. This doc pins how those names resolve to runtime
component constructors, the reuse policy, and the missing-component
fallback.

**Companion docs.**
[`ui-technology-choice.md`](./ui-technology-choice.md) (framework,
z-stack, build flags),
[`ui-renderer-seam.md`](./ui-renderer-seam.md) (DOM ↔ canvas seam),
[`wiki/README.md`](./wiki/README.md) (screen-package authoring),
[diagram 27 — Component Resolution](./diagrams/27-component-resolution.md).

---

## 1. Inputs

- **Schema:**
  [`content-schema/schemas/ui-component-registry.schema.json`](../../content-schema/schemas/ui-component-registry.schema.json)
  — registered in [`schema-matrix.md`](./schema-matrix.md) as
  `UIComponentRegistry`.
- **Canonical example:**
  [`content-schema/examples/ui-component-registry.example.json`](../../content-schema/examples/ui-component-registry.example.json).
- **Validator:**
  [`scripts/validate-screen-component-coverage.mjs`](../../scripts/validate-screen-component-coverage.mjs),
  wired into `npm run validate`.

---

## 2. Resolver API

```ts
type ComponentId = string;

type ResolveResult =
  | { kind: "found"; ctor: ComponentCtor; singleton: boolean; tags: string[] }
  | { kind: "missing"; componentId: ComponentId };

interface ComponentResolver {
  resolveComponent(id: ComponentId): ResolveResult;
}
```

- `resolveComponent` is **synchronous**. Module loading happens at
  registry-build time: top-level static imports for first-party
  components, dynamic imports collected at boot for pack-supplied
  components.
- The resolver is constructed once per app boot from the merged
  registry. Hot-reload during dev reconstructs it; production never
  rebuilds it.

Registry-entry shape (`componentId`, `module`, `exportName`,
`singleton`, `requiredProps`, `owner`, `tags`) is owned by
[`ui-component-registry.schema.json`](../../content-schema/schemas/ui-component-registry.schema.json);
the resolver normalizes each entry into a `ResolveResult` and exposes
only the fields above.

---

## 3. Reuse Policy

- Exactly **one runtime constructor** per `componentId`. No screen
  may fork a component into a private copy at the resolver level. If
  two screens need different visuals, author distinct `componentId`s.
- Default mount behaviour is **per mount point**: each
  `<ResolvedComponent id="…">` instantiates its own component state.
- `singleton: true` on a registry entry returns the same React
  element instance across every mount point. Use sparingly — typical
  uses are global tooltips and the debug overlay.

Example non-singletons: `StatusLine`, `ResourceDateBar`, `MiniMap` —
each screen mounts its own copy with screen-specific props, all
sharing one constructor (no visual drift).

---

## 4. Missing-Component Fallback

| Build flag | Behaviour |
|---|---|
| `import.meta.env.DEV` | Red placeholder `<div>` with the missing component ID; `console.warn("missing component", id)`; counter increments in the debug overlay. |
| `import.meta.env.PROD` | `<div data-missing-component="X" />` (zero-size, invisible); telemetry counter increments; no console output. |

Both modes return `{ kind: "missing", componentId }` from the
resolver. The host site decides whether to render the placeholder;
it MUST never throw and MUST never block the screen.

The validator (§ 5) is the canonical guard against missing
components before runtime; the dev placeholder catches gaps that
slip in between validations (e.g. mid-edit).

---

## 5. Coverage Validation

[`scripts/validate-screen-component-coverage.mjs`](../../scripts/validate-screen-component-coverage.mjs)
fails the build (and `npm run validate`) when any of:

- A `data-component="X"` value in any `wiki/screens/*/mockup.html`
  is not present in the registry example.
- A `### Component Tree` entry in any `wiki/screens/*/spec.md` is
  not present in the registry example.
- A `componentId` in the registry is not referenced by any screen
  package (mockup or spec).
- The same `componentId` appears more than once in the registry with
  a conflicting `module` or `exportName`.
- A `data-i18n="ui.<…>"` value in any mockup does not match the
  validator's key pattern (`^ui\.[a-z0-9-]+(?:\.[a-z0-9_-]+)+$`).
  This is the extension for
  [Localization Runtime](./ui-technology-choice.md#localization-runtime).

The error output is a diff so an AI agent can correct the registry
without re-reading every screen.

---

## 6. Reuse Across Packs

- Pack-supplied registries layer on top of the core registry by
  appending entries with disjoint `componentId` values. Overrides
  are **not** allowed at MVP; conflicting entries fail validation.
- Pack `componentId` values MUST be namespaced
  (`<pack>.<ComponentName>`) to avoid collisions with core ids.
- The resolver merges core and pack entries at boot; a missing pack
  registry does not block core screens.

---

## 7. Anti-Patterns

- ❌ Importing screen-internal components from another screen via
  relative paths. Always go through the resolver.
- ❌ Using `componentId` as a translation key, asset key, or test
  selector. Those are separate ID namespaces.
- ❌ Reading the registry from inside a render function. Resolution
  happens once at mount time.
- ❌ Constructing `componentId` strings dynamically. The validator
  cannot statically check dynamic IDs; every reference MUST be a
  string literal in mockup `data-component` and the spec Component
  Tree.
- ❌ Using `singleton: true` to share gameplay state. Singletons
  share React state; they do not share gameplay state.

---

## Related Files

- [`ui-technology-choice.md`](./ui-technology-choice.md)
- [`ui-renderer-seam.md`](./ui-renderer-seam.md)
- [`schema-matrix.md`](./schema-matrix.md) — `UIComponentRegistry` row
- [`wiki/README.md`](./wiki/README.md) — authoring rules for
  `data-component`
- [diagram 27 — Component Resolution](./diagrams/27-component-resolution.md)
- [`tasks/mvp/07-ui-shell/`](../../tasks/mvp/07-ui-shell/) — every
  screen-mounting task cites this doc

---

## 🔍 Sync Check

- **UI: ✔** — `data-component` and `### Component Tree` contracts match [`wiki/README.md`](./wiki/README.md) and the validator in [`scripts/validate-screen-component-coverage.mjs`](../../scripts/validate-screen-component-coverage.mjs); the [Localization Runtime](./ui-technology-choice.md#localization-runtime) cross-link resolves; diagram 27 mirrors the DEV/PROD fallback branches.
- **Schema: ✔** — [`ui-component-registry.schema.json`](../../content-schema/schemas/ui-component-registry.schema.json) exists with the `componentId` / `module` / `exportName` / `singleton` / `requiredProps` / `owner` / `tags` shape; row `UIComponentRegistry` is present in [`schema-matrix.md`](./schema-matrix.md); canonical example resolves and is what the validator reads.
- **Tasks: ✔** — [`tasks/mvp/07-ui-shell/01-react-18-app-shell-with-canvas-overlay.md`](../../tasks/mvp/07-ui-shell/01-react-18-app-shell-with-canvas-overlay.md) cites this doc in *Read First* and the task is wired into [`tasks/task-registry.json`](../../tasks/task-registry.json) (11 reciprocal references across `07-ui-shell` tasks).

## ⚠ Issues

- **Non-singleton example `ResourceBar` corrected to `ResourceDateBar`.** The prior text named `ResourceBar` alongside `StatusLine` and `MiniMap`, but no `componentId="ResourceBar"` exists in [`ui-component-registry.example.json`](../../content-schema/examples/ui-component-registry.example.json) and no screen mockup or spec references it. The registered HUD resource bar is `ResourceDateBar`; `StatusLine` and `MiniMap` remain valid. Per Option A (target wrong, system consistent), rewrote in place — no code change implied.
- **`i18n` pattern lives in the validator, not the schema.** The previous prose said `data-i18n` keys are checked against "the schema-defined key pattern", but the actual regex (`^ui\.[a-z0-9-]+(?:\.[a-z0-9_-]+)+$`) is defined inside [`scripts/validate-screen-component-coverage.mjs`](../../scripts/validate-screen-component-coverage.mjs), not in any JSON Schema. Rewrote to inline the regex and attribute it to the validator. Meaning preserved; no schema change owed.
