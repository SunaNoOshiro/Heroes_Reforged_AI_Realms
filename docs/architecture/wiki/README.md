# Architecture Wiki Sources

This folder contains the source files consumed by `npm run generate:wiki`.
The generated wiki is a read-only viewer; the files below are the
canonical implementation contracts.

## Folder Structure

```text
docs/architecture/wiki/
  README.md
  migration-plan.md
  missing-states.md
  screen-curation-plan.md
  screens/
    index.json
    01-main-menu/
      mockup.html
      spec.md
      interactions.md
      data-contracts.md
      architecture.md
    02-new-game-setup/
      mockup.html
      spec.md
      interactions.md
      data-contracts.md
      architecture.md
    ...
```

## Source Of Truth

- Visual state: `docs/architecture/wiki/screens/<nn-screen>/mockup.html`
- Components and state bindings: `docs/architecture/wiki/screens/<nn-screen>/spec.md`
- Per-control behavior: `docs/architecture/wiki/screens/<nn-screen>/interactions.md`
- Schema, config, localization, save/replay, and asset links: `docs/architecture/wiki/screens/<nn-screen>/data-contracts.md`
- Screen data flow and command flow diagrams: `docs/architecture/wiki/screens/<nn-screen>/architecture.md`
- Screen group order: `docs/architecture/wiki/screens/index.json`
- Curation tracker: `docs/architecture/wiki/screen-curation-plan.md`
- General architecture diagrams: `docs/architecture/diagrams/*.md`
- Human browser: `docs/architecture/architecture-wiki.html`, generated only

Each screen package uses the same number and folder name for all five
screen-specific sources. The wiki generator loads those files together
and renders the screen tabs as Mockup, Spec, Interactions, Data
Contracts, and Architecture Diagrams.
The screen index assigns every UI package to one group. Package numbers
follow the same group order, and the wiki sidebar renders those groups
directly so each section reads in natural numeric sequence. General
diagrams stay separate under `docs/architecture/diagrams/`.

## UI Smoke Contract

Every screen package under
[`screens/<nn-screen>/`](./screens/) is paired at runtime with
exactly one `<screen>.smoke.test.ts` under
[`src/ui/__tests__/screens/`](../../../src/ui/__tests__/) per the
contract pinned in
[`testing/ui-smoke-contract.md`](../testing/ui-smoke-contract.md).
A UI task whose `ownedPaths` glob matches `src/ui/**` cannot flip to
`done` if the smoke step fails, because
[`scripts/tasks.mjs`](../../../scripts/tasks.mjs) automatically
prepends `npm run test:ui-smoke` to its verify chain. The harness
itself is owned by
[`tasks/mvp/02-tooling/01-ui-smoke-harness.md`](../../../tasks/mvp/02-tooling/01-ui-smoke-harness.md).

## UI Evolution Policy

UI layout, visual style, panel composition, navigation flow, component
structure, tooltips, modals, and other presentation details may evolve
after implementation. The screen package is the source of truth for
those changes: update the relevant `mockup.html`, `spec.md`,
`interactions.md`, `data-contracts.md`, and `architecture.md` files
before changing runtime UI code.

Runtime UI remains a presentation boundary. It reads gameplay through
selectors, stores transient UI-only state outside deterministic gameplay
state, and emits commands through the shared dispatch path. UI redesigns
must not directly mutate engine state, change command semantics, rename
stable IDs, alter save/replay contracts, or add raw asset paths to
gameplay records. If a better UI needs new gameplay data, add it through
an explicit schema, selector, command, migration, or task-owned contract
change.

Chat-related screen edits (e.g. on
[`screens/64-network-lobby/`](./screens/64-network-lobby/)) MUST
update [`../chat-safety.md`](../chat-safety.md) first when the change
touches channel reservation, envelope shape, normalization,
sanitization, rate limit, mute / block, report flow, retention, or
the trust-model disclosure. The screen package mirrors that contract;
it does not re-author it.

## Required Architecture Reading

Screen-package authors and runtime implementers should read the
DOM-side architecture contracts before authoring or implementing a
package:

- [`../ui-technology-choice.md`](../ui-technology-choice.md) —
  framework, state binding, z-stack, localization, fonts, build flags.
- [`../ui-renderer-seam.md`](../ui-renderer-seam.md) — DOM ↔ canvas
  seam, input routing, hit-test API, resize protocol.
- [`../screen-scaling.md`](../screen-scaling.md) — virtual 800×600
  stage, aspect, hi-DPI, filter modes.
- [`../ui-component-resolver.md`](../ui-component-resolver.md) —
  `data-component` registry, reuse policy, missing-component fallback.
- [`../ui-frame-lag-contract.md`](../ui-frame-lag-contract.md) — UI
  lag bounds, optimistic UI, M5 lockstep, context loss, replay.
- [`../ui-state-contract.md`](../ui-state-contract.md) — component-
  state matrix, selector purity, tooltip lifecycle, command lifecycle,
  undo/redo (map editor).
- [`../ui-routing.md`](../ui-routing.md) — screen-router FSM,
  transition graph, modal stack, dismissal policy.
- [`../ui-input-arbitration.md`](../ui-input-arbitration.md) —
  single-emit per gesture, Esc precedence ladder, animation gates.
- [`../ui-gestures.md`](../ui-gestures.md) — gesture taxonomy and
  drag contract.
- [`../ui-hotkeys.md`](../ui-hotkeys.md) — hotkey registry, focus
  order, tab-trap, focus restoration.
- [`../ui-input-modalities.md`](../ui-input-modalities.md) — mouse /
  touch / keyboard / gamepad bridging.
- [`../onboarding.md`](../onboarding.md) — first-run onboarding,
  consent scopes, policy version, re-prompt rules.
- [`../age-gate.md`](../age-gate.md) — `config.player.ageGate` and
  the minor-strict feature matrix.
- [`../undo-policy.md`](../undo-policy.md) — soft-delete + undo
  contract for save delete / overwrite.
- [`../url-routing.md`](../url-routing.md) — closed query-param list,
  fragment discipline, confirmation routing.
- [`../autoplay-policy.md`](../autoplay-policy.md) — first-gesture
  unlock, muted-by-default, `prefers-reduced-motion`.
- [`../new-install-defaults.md`](../new-install-defaults.md) — safe
  defaults table for every optional feature.
- [`../developer-mode.md`](../developer-mode.md) — `config.dev.*`
  keys, chord-unlock, double-confirm, persistent banner.
- [`../peer-trust.md`](../peer-trust.md) — `state.profile.knownPeers`
  ring buffer and the lobby `trustLevel` badge.
- [`../ai-moderation-contract.md`](../ai-moderation-contract.md) — AI
  moderation status field and banner contract.
- [`../storage-contract.md`](../storage-contract.md) — file-picker
  rules and storage transport pinning.

## Authoring Rules

- Treat `screen-curation-plan.md` as the work queue for replacing
  scaffold-level packages with manually curated, screen-specific
  contracts.
- Add one numbered folder per screen package, e.g.
  `screens/48-level-up-dialog/`.
- Keep the number stable. It controls navigation order and makes task
  references unambiguous.
- Add the screen folder name to exactly one category in
  `screens/index.json`. The generator fails if the index references a
  missing screen, repeats a screen, or omits a screen.
- Put the visual contract in `mockup.html`. Annotate important elements
  with `data-component`, `data-state`, `data-action`, `data-i18n`, and
  `data-asset` where useful. Do not put explanatory specs or behavior
  prose in the HTML.
- Put component tree, state bindings, mechanics mapping, acceptance
  criteria, and AI implementation notes in `spec.md`.
- Put every button, hotkey, route, command, data update, animation,
  sound, disabled case, and error case in `interactions.md`.
- The `interactions.md` Actions table MUST include a `Hotkey` column
  whose values resolve to entries in
  [`../../../content-schema/schemas/hotkey.schema.json`](../../../content-schema/schemas/hotkey.schema.json).
  Mouse-only actions leave the cell empty and document the reason in
  AI Implementation Notes. See
  [`../ui-hotkeys.md`](../ui-hotkeys.md).
- Use canonical gesture names from [`../ui-gestures.md`](../ui-gestures.md)
  (`click`, `double-click`, `right-click`, `long-press`, `drag`,
  `dragstart`, `dragmove`, `dragend`). Ad-hoc gesture vocabulary fails
  validation.
- The `spec.md` Animation Contract MUST enumerate the seven normative
  states (`idle`, `hover`, `pressed`, `disabled`, `focused`, `error`,
  `loading`) per [`../ui-state-contract.md` § Component State Matrix](../ui-state-contract.md#component-state-matrix)
  for every interactive control, or explicitly waive each
  inapplicable state with a one-line justification.
- Modal screens MUST declare an explicit Esc row matching their
  `severity` per
  [`../ui-routing.md` § Dismissal Policy](../ui-routing.md#dismissal-policy)
  and bind `state.ui.modalStack[top]` instead of per-screen
  `callerRoute` fields.
- When a screen renders errors, `data-contracts.md` MUST list
  [`error-state.schema.json`](../../../content-schema/schemas/error-state.schema.json)
  in its **Content Schemas And Registries** table and type
  `errors.*` bindings as `ErrorState[]`.
- Every new screen package MUST declare at least one inbound
  transition in another screen's `interactions.md`. A package with
  zero inbound references is an orphan and fails validation.
- Put content schema, runtime selector, config, localization, asset,
  save/replay, and fallback references in `data-contracts.md`.
- Put small screen-specific Mermaid diagrams in `architecture.md`.
  Prefer separate diagrams for load, binding refresh, important
  interactions, data updates, and route transitions instead of one large
  diagram.
- Use an additional numbered package for a materially different UI state
  only when it needs its own visual, spec, and architecture contract.
- Do not put raw asset paths in gameplay state examples; use IDs.
- UI implementation tasks should list the relevant
  `docs/architecture/wiki/screens/<nn-screen>/` package in their Inputs
  and acceptance criteria.
- Run `npm run generate:wiki` after changing any screen package, general
  diagram, or architecture doc.
- Do not run `scripts/rework-legacy-screen-packages.mjs` for final UI
  work. It is guarded as a scaffold-only migration helper and can only
  run with `--write-scaffold`.
