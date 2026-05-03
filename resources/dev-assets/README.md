# Dev Assets

Placeholder assets used by the renderer when `config.dev.placeholderSprites === true`
or when an optional asset is missing in development. Production builds
do not ship these (the renderer falls loud on missing required assets
per [`docs/architecture/pack-contract.md` § Asset Fallback And Placeholders](../../docs/architecture/pack-contract.md#asset-fallback-and-placeholders)).

| File | Purpose |
|---|---|
| `placeholder-sprite.png` | 64×64 magenta + black checker. Substituted for any sprite-sheet that fails to decode in dev mode. |
| `status-unknown.png` | 32×32 generic status icon. Used when a status-icon asset id resolves to no asset. |

These PNGs are generated, not hand-painted. Regenerate them with the
inline script in [`docs/architecture/pack-contract.md` § Asset Fallback And Placeholders](../../docs/architecture/pack-contract.md#asset-fallback-and-placeholders)
if they ever drift.
