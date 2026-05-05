# Module: Build Pipeline & Supply-Chain Hygiene (Phase 2)

Source plan:
[`docs/implementation-plans/30-dependencies-and-build-pipeline-plan.md`](../../docs/implementation-plans/30-dependencies-and-build-pipeline-plan.md).

The supply-chain perimeter for the repo. Lands the today-relevant
guardrails (version pinning, action SHA-pinning, workflow-permission
checks, no-postinstall default) before the first runtime PR
introduces a real dep. Release signing, SBOM emission, and audit
nightly sweeps are deferred until a bundler and a first artifact
exist.

The single source of truth is
[`docs/architecture/dependency-policy.md`](../../docs/architecture/dependency-policy.md)
(deps) and
[`docs/architecture/build-policy.md`](../../docs/architecture/build-policy.md)
(workflows).

**Milestone**: Phase 2 — supply-chain foundation
**Total Estimate**: ~3 hours
**Exit Criteria**: Action SHA-pinning, workflow-permission
enforcement, and version-pinning are committed and CI-enforced.

---

## Task Files

- [01-dependency-policy-and-audit-pipeline.md](13-build-pipeline/01-dependency-policy-and-audit-pipeline.md)
  📦 Version pinning + action SHA-pinning + workflow hygiene
  checks (~3h)
