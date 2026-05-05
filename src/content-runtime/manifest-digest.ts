// Plan 26 — Critical Fix 2 / packManifestDigest.
//
// Stub for the canonical-JSON xxh64 over manifest.json. Owning task:
// tasks/phase-3/01-multiplayer/10-match-handshake-protocol.md.
// Doctrine: docs/architecture/match-handshake.md § 7.

export type ManifestDigest = string; // 16 lower-case hex chars

export const MANIFEST_DIGEST_VERSION = "v1";
