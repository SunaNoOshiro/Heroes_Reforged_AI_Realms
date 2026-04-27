# Cinematic Playback Engine

Status: planned

Module: [Campaign, Quest, And Status Meta Systems (P2)](../08-meta-systems.md)

Description:
Implement deterministic cinematic playback state for intro, campaign,
and victory/defeat narrative screens. Playback consumes content IDs,
localization keys, and asset IDs; skipping or completing playback
records explicit state transitions.

Read First:
- `docs/architecture/wiki/screens/05-intro-cinematic/interactions.md`
- `docs/architecture/wiki/screens/42-victory-defeat-cinematic/interactions.md`

Inputs:
- Campaign and scenario narrative slots
- Localization and asset registries
- App shell presentation state

Outputs:
- `src/ui/cinematics/cinematic-player.ts`
- `src/ui/cinematics/cinematic-state.ts`
- `COMPLETE_CINEMATIC` handling through app state boundary

Owned Paths:
- `src/ui/cinematics/cinematic-player.ts`
- `src/ui/cinematics/cinematic-state.ts`

Dependencies:
- phase-2.08-meta-systems.01-campaign-graph-schema
- mvp.07-ui-shell.02-zustand-store

Acceptance Criteria:
- Layout, bindings, and commands match `docs/architecture/wiki/screens/05-intro-cinematic/interactions.md` and `docs/architecture/wiki/screens/42-victory-defeat-cinematic/interactions.md`
- Cinematic playback is driven by content IDs and localization keys
- Skip and complete actions produce replayable app-state events where
  they gate scenario launch or outcome acknowledgement
- Missing presentation assets fall back through the resolver
- Missing narrative content fails before cinematic controls enable
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
