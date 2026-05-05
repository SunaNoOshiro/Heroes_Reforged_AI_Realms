// Plan 30 — Critical Fix "Actions tag-pinned, not SHA-pinned".
//
// Walks every `.github/workflows/*.yml` and rejects any `uses:` line
// that does not pin the action by 40-char commit SHA followed by a
// trailing `# vX.Y.Z` (or similar) comment. The trailing comment is
// the human-readable lookup; the SHA is the integrity anchor.
//
// Local actions (uses: ./.github/actions/foo) and Docker action
// references (uses: docker://image@sha256:...) are exempt — those
// have their own pinning shape, validated by check-dockerfile-pinning
// for the docker form and treated as repo-internal for the local form.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleDir, "..");
const workflowsDir = path.join(repoRoot, ".github", "workflows");

const SHA_PINNED = /^uses:\s+([^@\s]+)@([a-f0-9]{40})\s+#\s+\S+/;
const ANY_USES = /^uses:\s+(\S+)/;
const LOCAL_ACTION = /^\.\.?\//;
const DOCKER_ACTION = /^docker:\/\//;

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

export async function collectActionPinningViolations() {
  const violations = [];
  const files = await listWorkflowFiles();
  for (const file of files) {
    const text = await fs.readFile(file, "utf8");
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trimStart();
      const usesMatch = trimmed.match(ANY_USES);
      if (!usesMatch) continue;
      const target = usesMatch[1];
      if (LOCAL_ACTION.test(target)) continue;
      if (DOCKER_ACTION.test(target)) continue;

      if (!SHA_PINNED.test(trimmed)) {
        violations.push(
          `${path.relative(repoRoot, file)}:${i + 1}: action "${target}" is not pinned by 40-char SHA with trailing version comment (e.g. \`@<sha> # v4.1.7\`)`
        );
      }
    }
  }
  return violations;
}

async function main() {
  const violations = await collectActionPinningViolations();
  if (violations.length === 0) {
    console.log("validate:action-pinning OK");
    return;
  }
  for (const v of violations) console.error(v);
  console.error(
    "\nPin every action by commit SHA. Resolve via:\n" +
    "  git ls-remote https://github.com/<owner>/<repo> refs/tags/<tag>\n" +
    "Format: `uses: owner/repo@<40-char-sha> # <tag>`"
  );
  process.exitCode = 1;
}

if (isDirectRun()) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
