// Central numeric-cap export for the deterministic engine.
//
// Pinned by docs/architecture/determinism.md § Saturation policy and
// docs/architecture/edge-cases-policy.md § 6 (overflow & saturation).
// Schema-side mirrors live in content-schema/schemas/numeric.json.
//
// Saturation policy: clamp at the cap; never wrap.
// - Dev builds raise OverflowError when an intermediate exceeds
//   MAX_INTERMEDIATE.
// - Prod builds saturate to the documented cap and emit a warn-level
//   telemetry counter.

export const MAX_RESOURCE = 2_000_000_000;
export const MAX_UNIT_COUNT = 1_000_000;
// MAX_HERO_STAT is ruleset-pack-driven (default 99 per primary stat);
// its concrete value is loaded from the active ruleset record at engine
// boot. The constant name is fixed; the value is config-driven.
export const MAX_HERO_STAT_DEFAULT = 99;
export const MAX_INTERMEDIATE = Number.MAX_SAFE_INTEGER;
