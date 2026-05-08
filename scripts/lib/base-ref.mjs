// Shared base-ref resolution for diff-against-base scripts
// (mutation-changed-files, recheck-done-tasks). Both scripts accept
// `--base <ref>`, fall back to `origin/main` then `main`, and want a
// commit-ish that exists in this clone.

import { spawnSync } from "node:child_process";
import { repoRoot } from "./repo-utils.mjs";

const DEFAULT_BASE_REFS = ["origin/main", "main"];

export function parseBaseFlag(argv) {
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--base") return argv[i + 1] ?? null;
    if (a.startsWith("--base=")) return a.slice("--base=".length);
  }
  return null;
}

// `fallback` is what to return when no DEFAULT_BASE_REFS resolves.
// mutation-changed-files passes "HEAD~1" (always something to diff).
// recheck-done-tasks passes null (no base = nothing to compare).
export function pickBaseRef(explicit, fallback = null) {
  if (explicit) return explicit;
  for (const ref of DEFAULT_BASE_REFS) {
    const r = spawnSync("git", ["rev-parse", "--verify", `${ref}^{commit}`], {
      cwd: repoRoot,
      stdio: "ignore",
    });
    if (r.status === 0) return ref;
  }
  return fallback;
}
