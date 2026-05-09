---
paths:
  - "src/ui/**"
  - "src/renderer/**"
  - "src/editor/**"
  - "docs/architecture/wiki/screens/**"
---

# UI, renderer, editor, screen packages

These modules form the presentation boundary. UI redesigns are
allowed by updating the relevant screen package first, while
preserving deterministic gameplay, stable IDs, and save/replay
contracts. See
[`docs/architecture/wiki/README.md`](../../docs/architecture/wiki/README.md#ui-evolution-policy).

## Screen packages

Each numbered screen package under
[`docs/architecture/wiki/screens/`](../../docs/architecture/wiki/screens/)
contains five sibling files. **Read all five together** when
implementing a screen:

| File | Purpose |
|---|---|
| `mockup.html` | Visual reference |
| `spec.md` | Components, bindings |
| `interactions.md` | Per-control behavior |
| `data-contracts.md` | Schemas, config, localization, assets |
| `architecture.md` | Screen logic diagrams |

`index.json` assigns each package to one UI group; package numbers
follow that group order, and the wiki sidebar renders those groups
directly.

## Hard rules

- React lives in `src/ui/` only.
- Never use `dangerouslySetInnerHTML`. Lints in
  [`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs)
  refuse it anywhere under `src/`.
- Untrusted strings are sanitized at the schema-validation boundary
  via [`src/ui/sanitize.ts`](../../src/ui/sanitize.ts) per
  [`docs/architecture/untrusted-strings.md`](../../docs/architecture/untrusted-strings.md).
- The DOM ↔ canvas seam is owned by
  [`docs/architecture/ui-renderer-seam.md`](../../docs/architecture/ui-renderer-seam.md).
- Input arbitration: a single emit per gesture, Esc precedence ladder,
  animation gates — see
  [`docs/architecture/ui-input-arbitration.md`](../../docs/architecture/ui-input-arbitration.md).
- Hotkey registry, focus order, tab-trap — see
  [`docs/architecture/ui-hotkeys.md`](../../docs/architecture/ui-hotkeys.md).

## Mutation gate

Module class **ui / renderer**: mutation-score floor **65 %** (lower
than engine because mutation is noisier on presentation code), line
coverage 70 %, branch coverage 60 %. UI tasks also run the smoke gate
via [`scripts/verify-ui-smoke.mjs`](../../scripts/verify-ui-smoke.mjs).

## Common after-edit commands

```
npm run validate:ui-components   # screen-component coverage
npm run test:ui-smoke            # vitest browser smoke
npm test
```
