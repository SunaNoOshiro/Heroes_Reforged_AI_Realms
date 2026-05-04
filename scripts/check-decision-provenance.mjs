// Implementation Plan 17 (Q293): every "Locked" claim that lives in
// docs/archive/AUDIT-* must either be reflected verbatim in canonical
// sources, or be recorded as a DEC-NNN entry in
// docs/planning/decision-log.md.
//
// The gate avoids the failure mode that motivates plan 17: a chat-
// thread-only lock (e.g. "DEFEND = 25% reduction" originally locked
// only in the executive-summary archive) silently overrides the
// canonical sources.

import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  pathExists,
  readUtf8,
  repoRoot,
  walkFiles
} from "./lib/repo-utils.mjs";

const archiveDir = path.join(repoRoot, "docs", "archive");
const decisionLogPath = path.join(repoRoot, "docs", "planning", "decision-log.md");

// Keep this list small: canonical sources we're willing to grep
// against. A future audit can extend it, but the cost is wall-clock
// time per validate run, so prefer adding DEC-NNN entries instead.
const canonicalRoots = [
  path.join(repoRoot, "docs", "architecture"),
  path.join(repoRoot, "tasks"),
  path.join(repoRoot, "content-schema"),
  path.join(repoRoot, "docs", "planning")
];

// One row per locked claim that appears in any docs/archive/AUDIT-*
// file. The pattern is a plain substring search (case-insensitive)
// so the gate is robust to small wording differences ("250 permille"
// vs. "permille = 250"). When a claim fails, the fix is either:
//   (a) patch the canonical source so the substring appears there, or
//   (b) add a DEC-NNN entry in decision-log.md listing the substring
//       under the canonical-sources-patched bullet.
const archiveClaims = [
  {
    id: "DEFEND_LOCK",
    archiveFiles: ["AUDIT-EXECUTIVE-SUMMARY.md"],
    archiveSubstrings: ["DEFEND formula unspecified", "DEFEND = 25% reduction", "250 permille"],
    canonicalRequiredOneOf: [
      "defendDamageReductionPermille",
      "250 permille",
      "DEC-001"
    ]
  }
];

function isDirectRun() {
  return process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

async function loadCanonicalCorpus() {
  const files = [];
  for (const root of canonicalRoots) {
    if (!(await pathExists(root))) continue;
    const found = await walkFiles(root, (filePath) =>
      /\.(md|json|mjs|ts|tsx)$/.test(filePath)
    );
    files.push(...found);
  }
  const contents = new Map();
  for (const file of files) {
    contents.set(file, (await readUtf8(file)).toLowerCase());
  }
  return contents;
}

async function loadDecisionLog() {
  if (!(await pathExists(decisionLogPath))) return "";
  return (await readUtf8(decisionLogPath)).toLowerCase();
}

async function loadArchiveSources() {
  if (!(await pathExists(archiveDir))) return new Map();
  const files = await walkFiles(archiveDir, (filePath) => filePath.endsWith(".md"));
  const map = new Map();
  for (const file of files) {
    map.set(path.basename(file), (await readUtf8(file)).toLowerCase());
  }
  return map;
}

export async function collectProvenanceViolations() {
  const violations = [];
  const archive = await loadArchiveSources();
  const canonical = await loadCanonicalCorpus();
  const log = await loadDecisionLog();

  for (const claim of archiveClaims) {
    // Only fire if the archive actually carries the claim — if the
    // archive has been pruned, the gate is silent for that row.
    let archiveHit = false;
    for (const fileName of claim.archiveFiles) {
      const text = archive.get(fileName);
      if (!text) continue;
      if (claim.archiveSubstrings.some((needle) => text.includes(needle.toLowerCase()))) {
        archiveHit = true;
        break;
      }
    }
    if (!archiveHit) continue;

    const needles = claim.canonicalRequiredOneOf.map((value) => value.toLowerCase());
    let resolved = false;
    for (const text of canonical.values()) {
      if (needles.some((needle) => text.includes(needle))) {
        resolved = true;
        break;
      }
    }
    if (!resolved && needles.some((needle) => log.includes(needle))) {
      resolved = true;
    }
    if (!resolved) {
      violations.push(
        `${claim.id}: archive claim is unresolved — patch a canonical source to include one of: ${
          claim.canonicalRequiredOneOf.join(", ")
        }, or add a DEC-NNN entry referencing the same value in docs/planning/decision-log.md`
      );
    }
  }

  return violations;
}

if (isDirectRun()) {
  const violations = await collectProvenanceViolations();
  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(violation);
    }
    process.exitCode = 1;
  } else {
    console.log("Decision-provenance checks passed.");
  }
}
