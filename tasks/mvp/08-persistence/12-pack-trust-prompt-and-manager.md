# Pack Trust Prompt + Manager + Safe Mode

Module: [Persistence (M1)](../08-persistence.md)

Description:
Implement screens 71 (pack manager) and 72 (pack trust prompt), the
trust-store IndexedDB object store, the publisher-registry and
revocation-list loaders, the signature-verification path
(Web Crypto API), the safe-mode toggle, and the modded-indicator
selector.

Read First:
- [`docs/architecture/wiki/screens/71-pack-manager/spec.md`](../../../docs/architecture/wiki/screens/71-pack-manager/spec.md)
- [`docs/architecture/wiki/screens/71-pack-manager/interactions.md`](../../../docs/architecture/wiki/screens/71-pack-manager/interactions.md)
- [`docs/architecture/wiki/screens/71-pack-manager/data-contracts.md`](../../../docs/architecture/wiki/screens/71-pack-manager/data-contracts.md)
- [`docs/architecture/wiki/screens/72-pack-trust-prompt/spec.md`](../../../docs/architecture/wiki/screens/72-pack-trust-prompt/spec.md)
- [`docs/architecture/wiki/screens/72-pack-trust-prompt/interactions.md`](../../../docs/architecture/wiki/screens/72-pack-trust-prompt/interactions.md)
- [`docs/architecture/wiki/screens/72-pack-trust-prompt/data-contracts.md`](../../../docs/architecture/wiki/screens/72-pack-trust-prompt/data-contracts.md)
- [`docs/architecture/pack-trust.md`](../../../docs/architecture/pack-trust.md)

Inputs:
- Trust-store schema (Task
  [`mvp.02-content-schemas.31-trust-store-schema`](../02-content-schemas/31-trust-store-schema.md))
- Publisher registry schema (Task
  [`mvp.02-content-schemas.29-publisher-registry-schema`](../02-content-schemas/29-publisher-registry-schema.md))
- Pack revocation list schema (Task
  [`mvp.02-content-schemas.30-pack-revocation-list-schema`](../02-content-schemas/30-pack-revocation-list-schema.md))

Outputs:
- `src/ui/screens/pack-manager-screen.tsx`
- `src/ui/screens/pack-trust-prompt-screen.tsx`
- `src/persistence/trust-store.ts` — IndexedDB object store + reader/writer.
- `src/content-runtime/trust-anchors.ts` — lookup precedence
  (revocation deny > trust-store deny > registry > trust-store allow > prompt).
- `src/content-runtime/signature.ts` — Web Crypto ed25519 verify with
  `signature-failed` mapping.
- Selectors: `selectors.packs.installed`, `selectors.packs.trustStore`,
  `selectors.packs.pendingTrustRequest`,
  `selectors.packs.signatureTier`, `selectors.session.moddedIndicator`.

Owned Paths:
- `src/ui/screens/pack-manager-screen.tsx`
- `src/ui/screens/pack-trust-prompt-screen.tsx`
- `src/persistence/trust-store.ts`
- `src/content-runtime/trust-anchors.ts`
- `src/content-runtime/signature.ts`

Dependencies:
- mvp.02-content-schemas.29-publisher-registry-schema
- mvp.02-content-schemas.30-pack-revocation-list-schema
- mvp.02-content-schemas.31-trust-store-schema

Acceptance Criteria:
- Layout, bindings, and commands match
  [`docs/architecture/wiki/screens/71-pack-manager/spec.md`](../../../docs/architecture/wiki/screens/71-pack-manager/spec.md),
  [`docs/architecture/wiki/screens/71-pack-manager/interactions.md`](../../../docs/architecture/wiki/screens/71-pack-manager/interactions.md),
  [`docs/architecture/wiki/screens/72-pack-trust-prompt/spec.md`](../../../docs/architecture/wiki/screens/72-pack-trust-prompt/spec.md),
  and
  [`docs/architecture/wiki/screens/72-pack-trust-prompt/interactions.md`](../../../docs/architecture/wiki/screens/72-pack-trust-prompt/interactions.md).
- Trust-store entries key on `(packId, contentHash)`; a content-hash
  change re-prompts.
- `tier=signature-failed` removes the trust button entirely; only
  Cancel and Deny remain enabled.
- Revocation list entries with `reason in [malware, tampered]`
  block `GRANT_PACK_TRUST` and force `REMOVE_PACK` only.
- `ENTER_SAFE_MODE` unmounts non-canonical packs at the next session
  start without clearing the trust store; `EXIT_SAFE_MODE` re-arms.
- `selectors.session.moddedIndicator` returns `off | trusted |
  sandboxed | mixed` and drives the status-bar badge in screen 19.
- Per-transitive consent is enforced — there is no `Trust all` path.
- ZIP path-traversal sanitizer rejects the entire pack on the first
  unsafe entry per
  [`pack-trust.md` § Resource Limits](../../../docs/architecture/pack-trust.md#1-resource-limits).

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
