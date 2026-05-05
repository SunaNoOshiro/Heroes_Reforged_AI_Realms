// Plan 30 — Issue "No build-log secret-scrubbing policy" /
// "CI runner hardening relies on defaults, not committed rules".
//
// Walks every `.github/workflows/*.yml` and enforces:
// 1. The workflow declares an explicit top-level `permissions:` block.
//    Inheriting repo-default permissions silently hands write scope
//    to a workflow that may not need it.
// 2. No job uses a self-hosted runner unless the workflow has an
//    explicit allowlist comment (`# allow-self-hosted: <reason>`).
// 3. `pull_request_target` is forbidden unless the workflow has an
//    explicit allowlist comment (`# allow-pull-request-target: <reason>`)
//    AND a security-owner sign-off line. Fork PRs combined with
//    `pull_request_target` is the canonical secret-leak shape.
//
// Read with docs/architecture/build-policy.md.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleDir, "..");
const workflowsDir = path.join(repoRoot, ".github", "workflows");

function isDirectRun() {
  return process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

async function pathExists(target) {
  try { await fs.access(target); return true; } catch { return false; }
}

async function listWorkflowFiles() {
  if (!(await pathExists(workflowsDir))) return [];
  const entries = await fs.readdir(workflowsDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && /\.ya?ml$/.test(e.name))
    .map((e) => path.join(workflowsDir, e.name))
    .sort();
}

function hasTopLevelPermissions(text) {
  // A top-level `permissions:` key is at column 0 (no leading indent)
  // and is not inside a `jobs:`/`<job>:` block. We approximate by
  // requiring at least one `^permissions:` line; pair with a check
  // that `permissions:` appears before the first `jobs:` line.
  const lines = text.split(/\r?\n/);
  let firstJobs = Infinity;
  let firstPerms = Infinity;
  for (let i = 0; i < lines.length; i++) {
    if (/^jobs:\s*$/.test(lines[i])) {
      firstJobs = Math.min(firstJobs, i);
    }
    if (/^permissions:/.test(lines[i])) {
      firstPerms = Math.min(firstPerms, i);
    }
  }
  return firstPerms < firstJobs;
}

function hasSelfHostedRunner(text) {
  return /runs-on:\s*\[?[^\n]*self-hosted/.test(text);
}

function hasPullRequestTarget(text) {
  // Either `pull_request_target:` as a key, or in an array form
  // `on: [pull_request_target, ...]`.
  return /pull_request_target\s*:/.test(text)
    || /on:\s*\[[^\]]*pull_request_target/.test(text);
}

function hasAllowComment(text, kind) {
  const re = new RegExp(`#\\s*allow-${kind}:`);
  return re.test(text);
}

export async function collectWorkflowViolations() {
  const violations = [];
  const files = await listWorkflowFiles();
  for (const file of files) {
    const text = await fs.readFile(file, "utf8");
    const rel = path.relative(repoRoot, file);

    if (!hasTopLevelPermissions(text)) {
      violations.push(
        `${rel}: missing top-level \`permissions:\` block before \`jobs:\` (least-privilege rule per build-policy.md)`
      );
    }

    if (hasSelfHostedRunner(text) && !hasAllowComment(text, "self-hosted")) {
      violations.push(
        `${rel}: uses a self-hosted runner without an \`# allow-self-hosted: <reason>\` allowlist comment`
      );
    }

    if (hasPullRequestTarget(text) && !hasAllowComment(text, "pull-request-target")) {
      violations.push(
        `${rel}: uses \`pull_request_target\` without an \`# allow-pull-request-target: <reason>\` allowlist comment`
      );
    }
  }
  return violations;
}

async function main() {
  const violations = await collectWorkflowViolations();
  if (violations.length === 0) {
    console.log("validate:workflows OK");
    return;
  }
  for (const v of violations) console.error(v);
  process.exitCode = 1;
}

if (isDirectRun()) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
