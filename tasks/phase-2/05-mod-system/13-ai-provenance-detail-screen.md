# AI Provenance Detail Screen Wiring

Status: planned

Module: [Mod System (Phase 2)](../05-mod-system.md)

Description:
Wire screen
[`74-ai-provenance-detail`](../../../docs/architecture/wiki/screens/74-ai-provenance-detail/)
to read `manifest.aiProvenance` and render the player-facing detail
view. Implements the `OPEN_AI_PROVENANCE` and
`CLOSE_AI_PROVENANCE` command handlers; routes to screen 75 when
the player chooses "Report this content".

Read First:
- [`docs/architecture/wiki/screens/74-ai-provenance-detail/`](../../../docs/architecture/wiki/screens/74-ai-provenance-detail/)
- [`docs/architecture/ai-generation-pipeline.md`](../../../docs/architecture/ai-generation-pipeline.md)
- [`docs/architecture/ugc-safety.md`](../../../docs/architecture/ugc-safety.md)

Inputs:
- `manifest.aiProvenance` block per pack.
- Truncated prompt excerpt sanitized via `safeUserText(280)`.

Outputs:
- `src/content-runtime/ai-provenance.ts`
- `src/content-runtime/__tests__/ai-provenance.test.ts`
- `src/ui/screens/ai-provenance-detail-screen.tsx`

Owned Paths:
- `src/content-runtime/ai-provenance.ts`
- `src/content-runtime/__tests__/ai-provenance.test.ts`
- `src/ui/screens/ai-provenance-detail-screen.tsx`

Dependencies:
- mvp.02-content-schemas.38-manifest-ai-provenance-and-capabilities-default
- mvp.02-content-schemas.39-generated-faction-player-inspectable
- mvp.07-ui-shell.24-ai-content-badge-on-info-cards

Acceptance Criteria:
- `OPEN_AI_PROVENANCE { packId }` mounts
  `docs/architecture/wiki/screens/74-ai-provenance-detail/` with
  the pack's provenance block.
- When `aiProvenance.playerInspectable === false`, the body
  collapses to `ui.ai-provenance.details-unavailable`.
- The "Report this content" affordance routes to
  `docs/architecture/wiki/screens/75-content-report/` with
  `targetType = ai-faction` and `targetId = packId` pre-filled.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
