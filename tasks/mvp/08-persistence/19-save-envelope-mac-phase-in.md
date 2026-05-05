# Save-Envelope MAC Phase-In (M5)

Status: planned

Module: [Persistence (M1)](../08-persistence.md)

Description:
Implement HMAC-SHA-256 over canonical-JSON of the save envelope
under a per-installation `deviceKey`, with re-key on cloud-sync
opt-in. The schema seam is in place from
[`tasks/mvp/08-persistence/18-save-envelope-and-intent.md`](./18-save-envelope-and-intent.md);
this task ships the M5 implementation and the cross-installation
re-key flow that cloud sync depends on. Plan 27 § Improvement —
deferred from MVP. Plan 27 § Improvement: Save-Envelope MAC
Phase-In.

Read First:
- [`docs/architecture/save-envelope-mac.md`](../../../docs/architecture/save-envelope-mac.md)
- [`docs/architecture/save-migration.md`](../../../docs/architecture/save-migration.md)
- [`docs/architecture/crypto-rules.md`](../../../docs/architecture/crypto-rules.md)
- [`docs/architecture/persistence.md`](../../../docs/architecture/persistence.md)
- [`docs/architecture/data-inventory.md`](../../../docs/architecture/data-inventory.md)

Inputs:
- Save envelope from
  [`tasks/mvp/08-persistence/18-save-envelope-and-intent.md`](./18-save-envelope-and-intent.md).
- Per-installation `userInstallationSeed` from IndexedDB
  `hr-profile.keys`.
- (M5 cloud-sync only) per-account credential.

Outputs:
- `src/persistence/mac.ts` — `signEnvelope(envelope, deviceKey)` and
  `verifyEnvelope(envelope, deviceKey) → { ok | reason }`.
- `src/persistence/keys.ts` — `getOrCreateInstallationSeed()` plus
  `deriveDeviceKey()` and (M5+) `deriveAccountKey()`.
- (M5+) the cloud-sync re-key flow that converts a `deviceKey`-MAC'd
  envelope to an `accountKey`-MAC'd envelope.

Owned Paths:
- `src/persistence/mac.ts`
- `src/persistence/keys.ts`

Dependencies:
- mvp.08-persistence.18-save-envelope-and-intent
- mvp.08-persistence.16-parser-hardening

Acceptance Criteria:
- `userInstallationSeed` is generated once via
  `crypto.getRandomValues(32)` and stored under
  `hr-profile.keys` record id `save-envelope-mac.v1.seed` per
  [`data-inventory.md`](../../../docs/architecture/data-inventory.md).
- The seed is wiped by `WIPE_LOCAL_DATA scope=profile|all`.
- HMAC-SHA-256 input is canonical-JSON of
  `{ envelopeVersion, intent, saveVersion, engineHash, contentPackHashes, body }`
  (the `mac` field itself is excluded when computing).
- Comparison is constant-time per
  [`crypto-rules.md`](../../../docs/architecture/crypto-rules.md).
- A tampered `saveVersion` invalidates the MAC; loader refuses
  with `MAC_MISMATCH`; there is no override path.
- A save MAC'd on installation A cannot load on installation B
  (different `deviceKey`); the cloud-sync re-key flow is the
  only sanctioned cross-installation path.
- The toggle is runtime-config-driven, not schema-driven; the
  schema keeps `mac` optional indefinitely.

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
