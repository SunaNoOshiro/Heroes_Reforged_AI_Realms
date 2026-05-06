# Security Policy

## Reporting a Vulnerability

Please report security issues **privately**, not via public GitHub
issues.

- **Email**: `program.master.pero@gmail.com`
- Or use GitHub's private vulnerability reporting (the "Report a
  vulnerability" button under the repo's **Security** tab).

When reporting, please include:

1. A short summary.
2. Steps to reproduce.
3. The smallest proof-of-concept that demonstrates impact.
4. Build / browser / OS / network constraints, if any.

Please do not test against any production deployment — reproduce
against a local checkout.

## What to Expect

- We acknowledge S0-class reports (production secret leak,
  pack-signing-key compromise, RCE, auth bypass) within **4 hours**.
- We acknowledge other reports within **7 days**.
- We coordinate disclosure with the reporter; the default public
  write-up window is **14 days** after remediation, with credit
  (or anonymous on request).

The pack-signing-key recovery procedure lives in
[`docs/operations/pack-signing-key.md`](docs/operations/pack-signing-key.md) § 6.

## GDPR

If a leak involves personal data, GDPR Article 33 requires
notifying the supervisory authority within **72 hours**. The
containment runbook for that path is
[`docs/operations/services-runtime-rules.md`](docs/operations/services-runtime-rules.md) § 7
("Mass-PII leak").

## Cross-references

- [`docs/architecture/trust-boundaries.md`](docs/architecture/trust-boundaries.md) — single trust contract.
- [`docs/operations/services-runtime-rules.md`](docs/operations/services-runtime-rules.md) — when services run, this is the single rules doc (logger, channels, sampling, SLOs, containment runbooks).
