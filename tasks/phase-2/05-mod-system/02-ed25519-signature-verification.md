# ed25519 Signature Verification

Module: [Pack Runtime / Mod System (M4)](../05-mod-system.md)

Description:
Verify the digital signature of a mod pack to confirm it hasn't been tampered with. Official packs (including the baseline reference pack) are signed with the project's ed25519 private key. Community packs are unsigned or community-signed — they can still be loaded but are sandboxed.

Read First:
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)

Inputs:
- Mod pack manifest (Task 1)
- Official public key (hardcoded in the engine)

Outputs:
- `src/content-runtime/mod-signature.ts`
- `verifySignature(pack: RawModPack): "official" | "community" | "unsigned"`
- Uses Web Crypto API (`crypto.subtle.verify`)
- "Signed by" field shown in mod manager UI

Why this is risky: Web Crypto is async and the key format must be correct. Test on all target browsers.

Owned Paths:
- `src/content-runtime/mod-signature.ts`

Dependencies:
- phase-2.05-mod-system.01-zip-pack-loader-jszip-plus-manifest-parser

Acceptance Criteria:
- Official pack verifies as "official" when `signature.keyId` matches
  the project key and the signature is valid
- A user-created pack without signature verifies as "unsigned"
- A pack with tampered content but original signature fails verification and returns `Err`
- Works in Chrome, Firefox, Safari

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
