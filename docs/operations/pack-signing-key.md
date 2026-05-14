# Pack-Signing Private Key — Custody Doctrine

The Ed25519 key pair used to sign first-party content packs is the
single most load-bearing secret in the project. Compromise lets an
attacker forge an "official" pack, bypass the sandbox flag, and defeat
the entire mod-trust model. Recovery requires a coordinated **client
release** because the public half is hardcoded into the engine.

Companion docs:

- [`SECURITY.md`](../../SECURITY.md) — disclosure inbox.
- [`docs/architecture/pack-signing.md`](../architecture/pack-signing.md)
  — canonical signing protocol, key-rotation flow, schema field names.
- [`src/engine/security/official-public-key.ts`](../../src/engine/security/official-public-key.ts)
  — the embedded public-key constants this doc governs.
- [`tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md`](../../tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md)
  — engine-side verification.
- [`tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md`](../../tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md)
  — bundle-level signing.

---

## 1. Generation

The official Ed25519 key pair is generated **on** a hardware token —
a YubiKey 5 (or HSM-equivalent). The private half **never** leaves the
hardware.

Acceptable on-device generation flows:

- `gpg --card-edit` followed by `keytocard`, only when the key is
  generated **on** the card; an off-card key transferred to the card
  is not acceptable.
- `ssh-keygen -t ed25519-sk` (FIDO/U2F-backed Ed25519, requires
  resident-key support).
- Vendor tooling that documents an on-device key-generation flow
  (e.g., YubiKey Manager, Nitrokey App).

The release manager runs the ceremony on a clean workstation, captures
a written record (date, key fingerprint, witnessing engineer), and
signs it off in the planning area.

## 2. Signing

Signing is a one-shot operation invoked manually on a clean workstation
with the YubiKey attached. Any signing script added later **must**:

- require user interaction (touch on the YubiKey, PIN entry on the HSM);
- never run in CI;
- never read a private key from any path on disk.

CI is **never** issued the signing key. The engine's manifest-
verification path uses only the public bytes; CI verifies, it does
not sign.

## 3. Public Key in Engine

The public bytes are embedded in
[`src/engine/security/official-public-key.ts`](../../src/engine/security/official-public-key.ts)
as the base64-encoded constant
[`OFFICIAL_PUBLIC_KEY_BASE64`](../../src/engine/security/official-public-key.ts);
its SHA-256 fingerprint is pinned alongside as
[`OFFICIAL_PUBLIC_KEY_FINGERPRINT`](../../src/engine/security/official-public-key.ts).
Rotating either constant **requires** a client release: the engine has
no runtime path to learn a new key — deliberately, since a runtime-
rotatable trust anchor is itself a compromise risk.

## 4. Backups

The private key is backed up only as a **second YubiKey** (or HSM
token) generated during the same on-device ceremony. The two tokens
are stored in separate physical locations. **No software backup ever
exists** — not on a disk, not in a vault, not in a password manager.

Losing both tokens has the same consequence as a compromise: ship a
new public key in a client release.

## 5. Rotation

| Trigger    | Cadence   | Action                                                                                                                                  |
| ---------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Scheduled  | Annual    | Drill: generate the next key on a third token, ship a client release with the rotation, retire the old token to "denylist" status.      |
| Compromise | Immediate | Run § 6.                                                                                                                                |

The annual drill is a planned exercise. The cadence is configurable
upward (e.g., 6 months) on attestation that the cost of a client
release is acceptable.

## 6. Compromise Playbook

Trigger: the YubiKey is lost, stolen, or co-located with an attacker;
or an "official"-signed pack appears that you did not sign.

This is the **highest-urgency** path because recovery requires a client
release — the public key is hardcoded in
[`src/engine/security/official-public-key.ts`](../../src/engine/security/official-public-key.ts).

1. Take the suspect token out of service (lock it up). If a software
   key somehow exists, that is itself a § 7 doctrine violation.
2. Generate the replacement on a fresh YubiKey, or activate the backup
   token from the second physical location. The private half never
   leaves the hardware.
3. Ship a client release that updates:
   - [`OFFICIAL_PUBLIC_KEY_BASE64`](../../src/engine/security/official-public-key.ts)
     to the new public bytes;
   - [`OFFICIAL_PUBLIC_KEY_FINGERPRINT`](../../src/engine/security/official-public-key.ts)
     to the new SHA-256 fingerprint;
   - [`DENYLISTED_PUBLIC_KEY_FINGERPRINTS`](../../src/engine/security/official-public-key.ts)
     by appending the retired fingerprint.
4. Re-sign every official pack with the new key. The verifier consumes
   `signature.keyId` from each pack manifest per
   [`pack-signing.md`](../architecture/pack-signing.md); newly-signed
   manifests carry the new fingerprint there.
5. Saves referencing the old fingerprint downgrade to "untrusted" on
   next load — the engine handles this automatically via the denylist.
6. Post-mortem within 14 days (longer than the usual S0 default
   because the client-release coordination dominates the timeline).

Cross-reference:
[`tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md`](../../tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md).

## 7. Forbidden Patterns

- A `.pem` file under `~/.ssh/`, in a developer dotfiles repo, or on
  any shared drive.
- A `PRIVATE_KEY` env variable in the secret manager. The secret
  manager is for runtime secrets; this key has **no runtime consumer**
  in the project.
- A CI job that performs signing. Signing is offline.
- A "convenience" script that exports the private key to a file for
  testing. Test fixtures use a separate, throwaway key pair whose
  public bytes are pinned under `content-schema/examples/`.

---

## 🔍 Sync Check

- **UI: ✔** — Doc names no UI surface; the only adjacent UI consumer is
  the build-attestation banner on
  [`wiki/screens/77-multiplayer-game/spec.md`](../architecture/wiki/screens/77-multiplayer-game/spec.md),
  which reads `signedBy` from
  [`build-attestation.md`](../architecture/build-attestation.md) (a
  separate concept from this key) — no overlap to drift.
- **Schema: ⚠** — Pack-manifest field for the signer key is
  `signature.keyId` per
  [`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json)
  and [`pack-signing.md`](../architecture/pack-signing.md); the prior
  version of this doc called it `manifest.signedBy`. Rewrote § 6 step
  4 to use the canonical name and added `pack-signing.md` as a
  companion. The engine source's docstring carries the same drift —
  flagged below.
- **Tasks: ✔** — Doctrine is referenced by
  [`02-ed25519-signature-verification.md`](../../tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md)
  and
  [`05d-official-pack-signing-and-bundle-verification.md`](../../tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md);
  SECURITY.md § "Reporting a Vulnerability" and
  [`services-runtime-rules.md`](./services-runtime-rules.md) both
  point at § 6 of this file, and those anchors still resolve.

## ⚠ Issues

- **Engine-source comment names a non-existent manifest field.**
  [`src/engine/security/official-public-key.ts`](../../src/engine/security/official-public-key.ts)
  line 27–28 describes `OFFICIAL_PUBLIC_KEY_FINGERPRINT` as "embedded
  in `manifest.signedBy`", but
  [`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json)
  has no `signedBy` field — the canonical field for the signer-key
  identifier is `signature.keyId` (per
  [`pack-signing.md`](../architecture/pack-signing.md) § 7). Per the
  doc-audit Hard Prohibition D, this skill did not edit
  `official-public-key.ts`. The owning task
  [`tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md`](../../tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md)
  should update the docstring to read "embedded as the `signature.keyId`
  on every official pack manifest" (or equivalent) the next time it is
  touched. Suggested patch surface: lines 26–29 of that file.
