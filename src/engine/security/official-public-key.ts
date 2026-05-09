/**
 * Heroes Reforged — official pack-signing public key.
 *
 * Doctrine:
 *   docs/operations/pack-signing-key.md
 *
 * The 32-byte Ed25519 public key used by the engine to verify every
 * official pack manifest signature. The bytes are baked at engine
 * build time; rotating this constant is a CLIENT RELEASE event (the
 * engine has no runtime path to learn a new key, deliberately).
 *
 * The matching PRIVATE key lives only on a YubiKey / HSM held by the
 * release manager — never on disk, never in the secret manager.
 *
 * Verification consumers:
 *   - tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md
 *   - tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md
 */

/** Base64-encoded 32-byte Ed25519 public key (placeholder until first
 *  ceremony). Replace via the pack-signing-key compromise/rotation
 *  playbook in docs/operations/pack-signing-key.md § 6. */
export const OFFICIAL_PUBLIC_KEY_BASE64 =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

/** SHA-256 fingerprint of the public key, hex-encoded; embedded in
 *  `manifest.signedBy` and consumed by the denylist on rotation. */
export const OFFICIAL_PUBLIC_KEY_FINGERPRINT =
  "0000000000000000000000000000000000000000000000000000000000000000";

/** Denylist of fingerprints that were once official but have been
 *  rotated out (compromise or scheduled rotation). A pack signed by
 *  any fingerprint in this list verifies as INVALID even if the
 *  signature math checks out. */
export const DENYLISTED_PUBLIC_KEY_FINGERPRINTS: ReadonlyArray<string> =
  Object.freeze([]);
