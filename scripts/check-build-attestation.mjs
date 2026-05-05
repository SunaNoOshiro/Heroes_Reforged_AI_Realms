// Plan 26 — Improvement / validate:build-attestation
//
// CI gate that schema-shape-checks the build-attestation allow-list
// example (services/signaling/config/build-attestation.allow.example.json)
// per docs/architecture/build-attestation.md § 6.
//
// Real-key signature verification is delegated to Task 15's
// production CI hook; this gate enforces shape + placeholder-only
// invariants and refuses any commit that smells like a real key.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleDir, "..");
const ALLOWLIST = path.join(
  repoRoot,
  "services/signaling/config/build-attestation.allow.example.json"
);

const HEX = {
  hex16: /^[0-9a-f]{16}$/,
  hex40: /^[0-9a-f]{40}$/,
  hex64: /^[0-9a-f]{64}$/,
  hex128: /^[0-9a-f]{128}$/
};

function isObject(v) { return v !== null && typeof v === "object" && !Array.isArray(v); }
function isAllZero(s) { return /^0+$/.test(s); }

function checkAllowList(data) {
  const issues = [];
  if (!isObject(data)) return ["payload must be an object"];
  if (data.schemaVersion !== 1) issues.push(`schemaVersion must be 1: ${data.schemaVersion}`);
  if (!Array.isArray(data.trustAnchors)) {
    issues.push("trustAnchors must be an array");
  } else {
    for (const [i, anchor] of data.trustAnchors.entries()) {
      if (!isObject(anchor)) { issues.push(`trustAnchors[${i}]: not an object`); continue; }
      if (!/^[A-Za-z0-9_-]{8,64}$/.test(anchor.keyId || "")) {
        issues.push(`trustAnchors[${i}].keyId: invalid format`);
      }
      if (anchor.scheme !== "ed25519") issues.push(`trustAnchors[${i}].scheme: must be ed25519`);
      if (!HEX.hex64.test(anchor.publicKey || "")) {
        issues.push(`trustAnchors[${i}].publicKey: must be 64 hex chars`);
      } else if (!isAllZero(anchor.publicKey)) {
        issues.push(
          `trustAnchors[${i}].publicKey: example file MUST contain a placeholder (all-zero) key, not a real key`
        );
      }
    }
  }
  if (!Array.isArray(data.bundles)) {
    issues.push("bundles must be an array");
  } else {
    const knownAnchors = new Set((data.trustAnchors || []).map((a) => a.keyId));
    for (const [i, bundle] of data.bundles.entries()) {
      if (!isObject(bundle)) { issues.push(`bundles[${i}]: not an object`); continue; }
      if (!HEX.hex64.test(bundle.bundleSha256 || "")) issues.push(`bundles[${i}].bundleSha256: invalid`);
      if (!HEX.hex16.test(bundle.engineHash || "")) issues.push(`bundles[${i}].engineHash: invalid`);
      if (!HEX.hex40.test(bundle.buildCommitSha || "")) issues.push(`bundles[${i}].buildCommitSha: invalid`);
      if (!HEX.hex128.test(bundle.signature || "")) issues.push(`bundles[${i}].signature: invalid`);
      if (!knownAnchors.has(bundle.signedBy)) {
        issues.push(`bundles[${i}].signedBy: unknown trust anchor "${bundle.signedBy}"`);
      }
      if (typeof bundle.validFrom !== "string" || !/Z$/.test(bundle.validFrom)) {
        issues.push(`bundles[${i}].validFrom: must be ISO-8601 Z-suffixed string`);
      }
      if (typeof bundle.validUntil !== "string" || !/Z$/.test(bundle.validUntil)) {
        issues.push(`bundles[${i}].validUntil: must be ISO-8601 Z-suffixed string`);
      }
      if (bundle.validFrom && bundle.validUntil && bundle.validFrom > bundle.validUntil) {
        issues.push(`bundles[${i}]: validFrom > validUntil`);
      }
    }
  }
  return issues;
}

async function pathExists(target) {
  try { await fs.stat(target); return true; } catch { return false; }
}

export async function collectBuildAttestationViolations() {
  if (!(await pathExists(ALLOWLIST))) {
    return [`build-attestation: example allow-list missing at ${path.relative(repoRoot, ALLOWLIST)}`];
  }
  const data = JSON.parse(await fs.readFile(ALLOWLIST, "utf8"));
  return checkAllowList(data).map((i) => `${path.relative(repoRoot, ALLOWLIST)}: ${i}`);
}

async function main() {
  const violations = await collectBuildAttestationViolations();
  if (violations.length === 0) {
    console.log(`validate:build-attestation OK (${path.relative(repoRoot, ALLOWLIST)})`);
    return;
  }
  for (const v of violations) console.error(v);
  process.exitCode = 1;
}

function isDirectRun() {
  return process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

if (isDirectRun()) {
  await main();
}
