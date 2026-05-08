// Shared owned-path matching for the mutation-score and coverage-floor
// gates. Both gates expand a task's ownedPaths (with prefix/glob/exact
// semantics) and then filter the on-disk report file list. Keeping a
// single canonical matcher prevents the two gates from silently
// drifting (a real risk: both consumer scripts are in the anti-cheat
// deny list, so any local fix has to be made in two restricted files
// in lockstep).

// `isSourceTs` is the file-extension-only filter (no path-prefix
// exclusions). Two related "what counts as a mutation target" rules
// live elsewhere and intentionally encode different concerns:
//   - `stryker.conf.mjs` `mutate` array: full glob list applied by
//     Stryker to decide which files to mutate.
//   - `scripts/mutation-changed-files.mjs` `isMutationCandidate`: the
//     git-diff filter that decides which changed files to feed to
//     Stryker per PR.
// All three should stay aligned when adding a new module (e.g.
// `src/audio/`); update each in lockstep.
export function isSourceTs(p) {
  return (p.endsWith(".ts") || p.endsWith(".tsx"))
    && !p.endsWith(".d.ts")
    && !p.endsWith(".test.ts")
    && !p.endsWith(".spec.ts");
}

export function ownedPathMatchers(ownedPaths) {
  const exact = new Set();
  const prefixes = [];
  const globs = [];
  for (const owned of ownedPaths) {
    if (owned.includes("*")) {
      const re = "^" + owned
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\\\*\\\*/g, ".*")
        .replace(/\\\*/g, "[^/]*") + "$";
      globs.push(new RegExp(re));
    } else if (owned.endsWith("/")) {
      prefixes.push(owned);
    } else {
      exact.add(owned);
      prefixes.push(owned + "/");
    }
  }
  return (filePath) => {
    if (exact.has(filePath)) return true;
    for (const pref of prefixes) if (filePath.startsWith(pref)) return true;
    for (const re of globs) if (re.test(filePath)) return true;
    return false;
  };
}
