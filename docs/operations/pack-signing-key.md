# Pack-Signing Private Key — Custody Doctrine

The Ed25519 key pair used to sign first-party content packs is the
single most load-bearing secret in the project. Compromise lets an
attacker forge an "official" pack, bypass the sandbox flag, and
defeat the entire mod-trust model. Recovery requires a coordinated
**client release** because the public half is hardcoded into the
engine.

Companion docs:

- [`SECURITY.md`](../../SECURITY.md) — disclosure inbox.
- [`tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md`](../../tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md)
  — engine-side verification.
- [`tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md`](../../tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md)
  — bundle-level signing.

---

## 1. Generation

The official Ed25519 key pair is generated **on** a hardware token —
a YubiKey 5 (or HSM-equivalent). The private half **never** leaves
the hardware.

Acceptable generation flows:

- `gpg --card-edit` followed by `keytocard` (only when the key is
  generated **on** the card; **never** an off-card key transferred
  to the card).
- `ssh-keygen -t ed25519-sk` (FIDO/U2F-backed Ed25519, requires
  resident-key support).
- Vendor tooling that documents an on-device key-generation flow
  (e.g., YubiKey Manager, Nitrokey App).

The generation ceremony is performed by the release manager on a
clean workstation, captured as a written record (date, key
fingerprint, witnessing engineer), and signed off in the planning
area.

## 2. Signing

Signing is a one-shot operation, invoked manually on a clean
workstation with the YubiKey attached. Required properties whenever
a signing script is added:

- requires user interaction (touch on the YubiKey, PIN entry on the
  HSM);
- never runs in CI;
- never reads a private key from any path on disk.

CI is **never** issued the signing key. The engine's `manifest`
verification path uses only the public bytes; CI only verifies, it
does not sign.

## 3. Public Key in Engine

The public bytes are embedded in
[`src/engine/security/official-public-key.ts`](../../src/engine/security/official-public-key.ts)
as a base64-encoded constant. Rotating the public key **requires**
a client release, because the engine has no way to learn a new key
at runtime (deliberately — a runtime-rotatable key would itself be
a trust-anchor compromise risk).

## 4. Backups

The private key is backed up only as a **second YubiKey** (or HSM
token) generated during the same on-device ceremony. The two tokens
are stored in separate physical locations. **No software backup
ever exists** — not on a disk, not in a vault, not in a password
manager.

If both tokens are lost, the consequence is the same as a
compromise: ship a new public key in a client release.

## 5. Rotation

| Trigger | Cadence | Action |
| --- | --- | --- |
| Scheduled | Annual | Drill: generate the next key on a third token, ship a client release with the rotation, retire the old token to "denylist" status. |
| Compromise | Immediate | Run § 6 below. |

The annual drill is a planned exercise; the cadence is configurable
upward (e.g., 6 months) on attestation that the cost of a client
release is acceptable.

## 6. Compromise Playbook

Trigger: the YubiKey is lost, stolen, or co-located with an
attacker; an "official"-signed pack appears that you didn't sign.

This is the **highest-urgency** path because recovery requires a
client release — the public key is hardcoded in the engine
(`src/engine/security/official-public-key.ts`).

1. Take the suspect token out of service (lock it up; if a software
   key somehow exists, that itself is a doctrine violation — see
   § 5 above).
2. Generate the replacement on a fresh YubiKey (or the backup
   token from the second physical location). The private half
   never leaves the hardware.
3. Ship a client release: new public bytes in
   [`OFFICIAL_PUBLIC_KEY_BASE64`](../../src/engine/security/official-public-key.ts),
   the old fingerprint added to
   [`DENYLISTED_PUBLIC_KEY_FINGERPRINTS`](../../src/engine/security/official-public-key.ts),
   `manifest.signedBy` bumped.
4. Re-sign every official pack with the new key.
5. Saves referencing the old fingerprint downgrade to "untrusted"
   on next load — engine handles this automatically via the
   denylist.
6. Post-mortem within 14 days (longer than the usual S0 default
   because the client-release coordination dominates the timeline).

Cross-references:
[`tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md`](../../tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md).

## 7. Forbidden Patterns

- A `.pem` file under `~/.ssh/`, in a developer dotfiles repo, or
  on any shared drive.
- A `PRIVATE_KEY` env variable in the secret manager. The secret
  manager is for runtime secrets; this key has **no runtime
  consumer** in the project.
- A CI job that performs signing. Signing is offline.
- A "convenience" script that exports the private key to a file
  for testing. Test fixtures use a separate, throwaway key pair
  whose public bytes are pinned under
  `content-schema/examples/`.
