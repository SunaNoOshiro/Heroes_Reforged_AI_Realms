# UI Component Resolver

**Status:** Approved for MVP
**Date:** 2026-05-02

The screen packages under [`wiki/screens/`](./wiki/screens/) annotate
DOM regions with `data-component="X"` and list a Component Tree in
each `spec.md`. This doc pins how those names resolve to runtime
component constructors at runtime, the reuse policy, and the
missing-component fallback.

---

## Inputs

- **Schema:**
  [`content-schema/schemas/ui-component-registry.schema.json`](../../content-schema/schemas/ui-component-registry.schema.json)
- **Canonical example:**
  [`content-schema/examples/ui-component-registry.example.json`](../../content-schema/examples/ui-component-registry.example.json)
- **Validator:**
  [`scripts/validate-screen-component-coverage.mjs`](../../scripts/validate-screen-component-coverage.mjs)
  — wired into `npm run validate`

---

## Resolver API

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
  registry-build time (top-level static imports for first-party
  components, dynamic imports collected at boot for pack-supplied
  components).
- The resolver is constructed once per app boot from the merged
  registry. Hot-reload during dev reconstructs it; production never
  rebuilds it.

---

## Reuse Policy

- Exactly **one runtime constructor** per `componentId`. No screen may
  fork a component into a private copy at the resolver level. If two
  screens need different visuals, author distinct `componentId`s.
- Default mount behaviour is **per mount point**: each
  `<ResolvedComponent id="…">` mount instantiates its own component
  state.
- Setting `singleton: true` on a registry entry returns the same React
  element instance across every mount point. Use sparingly — typical
  uses are global tooltips and the debug overlay.

`StatusLine`, `ResourceBar`, and `MiniMap` are non-singleton: each
screen can mount its own copy with screen-specific props, and they
share the same constructor (no visual drift).

---

## Missing-Component Fallback

| Build flag | Behaviour |
|---|---|
| `import.meta.env.DEV` | Render a red placeholder div with the missing component ID; emit `console.warn("missing component", id)`; counter increments in the debug overlay. |
| `import.meta.env.PROD` | Render `<div data-missing-component="X" />` (zero-size, invisible); increment a telemetry counter; no console output. |

Both modes return `{ kind: "missing", componentId }` from the
resolver. The host site decides whether to render the placeholder; it
must never throw and must never block the screen.

The validator (next section) is the canonical guard against missing
components before runtime; the dev placeholder catches gaps that slip
in between validations (e.g. mid-edit).

---

## Coverage Validation

[`scripts/validate-screen-component-coverage.mjs`](../../scripts/validate-screen-component-coverage.mjs)
fails the build (and `npm run validate`) when any of:

- A `data-component="X"` value in any `wiki/screens/*/mockup.html` is
  not present in the registry example.
- A Component Tree entry under `### Component Tree` in any
  `wiki/screens/*/spec.md` is not present in the registry example.
- A `componentId` in the registry is not used by any screen package.
- The same `componentId` appears with a different `module` or
  `exportName` between sources (registry duplicates).
- A `data-i18n="ui.<...>"` value in any mockup does not match the
  schema-defined key pattern (extension for
  [Issue 3.B-2 — Localization Runtime](./ui-technology-choice.md#localization-runtime)).

The error output is a diff so an AI agent can correct the registry
without re-reading every screen.

---

## Reuse Across Packs

- Pack-supplied registries layer on top of the core registry by
  appending entries with disjoint `componentId` values. Overrides are
  **not** allowed at MVP; conflicting entries fail validation.
- Pack `componentId` values must be namespaced
  (`<pack>.<ComponentName>`) to avoid collisions with core ids.
- The resolver merges core and pack entries at boot; missing pack
  registries do not block core screens.

---

## Anti-Patterns

- ❌ Importing screen-internal components from another screen via
  relative paths. Always go through the resolver.
- ❌ Using `componentId` as a translation key, asset key, or test
  selector. Those are separate ID namespaces.
- ❌ Reading the registry from inside a render function. Resolution
  happens once at mount time.
- ❌ Constructing `componentId` strings dynamically. The validator
  cannot statically check dynamic IDs; all references must be string
  literals in mockup `data-component` and spec Component Tree.
- ❌ Using `singleton: true` to share gameplay state. Singletons share
  React state; they do not share gameplay state.

---

## Related Files

- [`ui-technology-choice.md`](./ui-technology-choice.md)
- [`ui-renderer-seam.md`](./ui-renderer-seam.md)
- [`schema-matrix.md`](./schema-matrix.md) — registry entry
- [`wiki/README.md`](./wiki/README.md) — authoring rules for
  `data-component`
- [diagram 27 — Component Resolution](./diagrams/27-component-resolution.md)
- [`tasks/mvp/07-ui-shell/`](../../tasks/mvp/07-ui-shell/) — every
  screen-mounting task cites this doc
