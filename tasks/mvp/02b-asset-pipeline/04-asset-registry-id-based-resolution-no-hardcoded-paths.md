# Asset Registry — ID-Based Resolution, No Hardcoded Paths

Status: planned

Module: [Asset Pipeline & Content Pack Architecture (M0/M1)](../02b-asset-pipeline.md)

Description:
The engine never references a file path directly. All assets are referenced by ID (e.g., `"sprite:emberwild/ash-hound"`, `"portrait:emberwild/hero-kaelis"`). The asset registry resolves IDs to actual URLs at runtime based on which packs are loaded.

This is the most important architectural constraint in the asset system. Violating it makes hot-swap impossible.

Read First:
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)

Inputs:
- `PackRegistry` (Task 1)
- Loaded pack file trees
- `content-schema/schemas/asset-index.schema.json`

Outputs:
- `src/engine/asset-registry.ts`
- `AssetRegistry`:
```typescript
class AssetRegistry {
  // Called when a pack is loaded
  registerPack(packId: string, baseUrl: string, manifest: Manifest): void
  unregisterPack(packId: string): void

  // Resolution (used by renderer and sound system)
  resolveSprite(unitId: string): string        // → URL to sprite sheet PNG
  resolvePortrait(entityId: string): string    // → URL to portrait PNG
  resolveIcon(entityId: string): string        // → URL to icon PNG
  resolveAnimation(unitId: string, sequence: string): AnimationDef
  resolveSound(eventId: string): string | null // → URL to .ogg or null
  resolveTownBg(factionId: string): string
  resolveSiegeBg(factionId: string, fortLevel: number): string
  resolveBattleBg(terrainId: string): string

  // Fallback chain: faction pack → shared pack → placeholder
  resolveWithFallback(id: string, type: AssetType): string
}
```

Why this is risky: If ANY renderer code imports a path directly (e.g., `import spriteUrl from '../assets/emberwild/ash-hound.png'`), hot-swap breaks. Enforce this with an ESLint rule.

Owned Paths:
- `src/engine/asset-registry.ts`

Dependencies:
- mvp.02b-asset-pipeline.01-manifest-format-plus-pack-registry
- mvp.01-engine-core.05-eslint-rule-ban-math-random-and-floats-in-src-engine

Acceptance Criteria:
- `resolveSprite("emberwild/ash-hound")` returns the correct URL after the Emberwild pack is loaded
- Unloading the Emberwild pack → `resolveSprite("emberwild/ash-hound")` returns a shared placeholder
- ESLint rule: no relative asset path imports inside `src/renderer/` or `src/ui/` modules
- All existing renderer and UI code migrated to use `AssetRegistry` (no hardcoded paths)
- **Fallback chain order (Q215).** `locale variant → faction default → generic placeholder`. The generic placeholder is bundled with the app and is never absent.
- **Retry policy.** On `404` / fetch failure, the resolver retries exactly once with 500 ms backoff. Subsequent failures within the same session use the placeholder without further retry.
- **User notification.** A non-modal toast "Some visuals couldn't load" is emitted at most once per session, not per asset.
- **Gameplay vs presentation boundary.** The resolver returns *pixels / audio* only. Frame timing, hitbox geometry, and projectile speed are gameplay records loaded pre-session — never streamed assets. Cross-cutting policy in [`docs/architecture/edge-cases-policy.md` § 12](../../../docs/architecture/edge-cases-policy.md#12-asset-load-failure-q215).

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
