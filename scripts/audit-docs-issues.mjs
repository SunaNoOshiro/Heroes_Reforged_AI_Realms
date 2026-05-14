// audit-docs-issues — aggregate the doc-audit `## ⚠ Issues` and
// `## 🔍 Sync Check` trailers across a folder into one backlog
// report.
//
// The doc-audit skill writes a Sync Check + Issues block at the end
// of every audited file. Each Issue states which task ID owns the
// gap. This script walks the folder, parses each trailer, and emits
// a markdown report grouped by task ID and severity.
//
// Usage:
//   node scripts/audit-docs-issues.mjs [options]
//
// Options:
//   --dir <path>      folder to scan (default: docs/architecture)
//   --recursive       descend into subfolders (default: top-level only)
//   --out <path>      write report to file instead of stdout
//   --severity <s>    filter findings: blocking | non-blocking | all (default: all)
//   --task <id>       show only findings for the named task ID
//   --json            emit JSON instead of markdown (mutually exclusive with --out unless path ends .json)
//   --no-clean-list   suppress the "clean files" section
//   --no-coverage     suppress the audit-coverage summary
//
// Exit codes:
//   0  report generated; no CI-blocking (❌) findings (or none after filters)
//   1  report generated; ≥1 ❌ finding remains (intended for CI gating)
//   2  invocation error

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { repoRoot, repoRelative } from "./lib/repo-utils.mjs";

const DEFAULT_DIR = "docs/architecture";
const SYNC_CHECK_HEADING = "## 🔍 Sync Check";
const ISSUES_HEADING = "## ⚠ Issues";
const NONE_MARKER = "_None._";

// Task IDs look like `mvp.00-core-architecture.22-01-error-formatter-contract`.
// Phase is `mvp` or `phase-N`; module and task segments are kebab-case.
const TASK_ID_REGEX = /\b((?:mvp|phase-\d+)\.[a-z0-9-]+\.[a-z0-9-]+)\b/g;

// Verdict markers. Order matters for severity ranking.
const VERDICT_BLOCKING = "❌";
const VERDICT_WARNING = "⚠";
const VERDICT_CLEAN = "✔";

function parseArgs(argv) {
  const opts = {
    dir: DEFAULT_DIR,
    recursive: false,
    out: null,
    severity: "all",
    taskFilter: null,
    json: false,
    showCleanList: true,
    showCoverage: true,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const v = argv[i + 1];
      if (v === undefined) throw new Error(`Missing value for ${arg}`);
      i += 1;
      return v;
    };
    switch (arg) {
      case "--dir": opts.dir = next(); break;
      case "--recursive": opts.recursive = true; break;
      case "--out": opts.out = next(); break;
      case "--severity": {
        const v = next();
        if (!["blocking", "non-blocking", "all"].includes(v)) {
          throw new Error(`--severity must be blocking | non-blocking | all`);
        }
        opts.severity = v;
        break;
      }
      case "--task": opts.taskFilter = next(); break;
      case "--json": opts.json = true; break;
      case "--no-clean-list": opts.showCleanList = false; break;
      case "--no-coverage": opts.showCoverage = false; break;
      case "--help":
      case "-h":
        printUsageAndExit(0);
        break;
      default:
        throw new Error(`Unknown flag: ${arg}`);
    }
  }
  return opts;
}

function printUsageAndExit(code) {
  const banner = [
    "audit-docs-issues — aggregate doc-audit Sync Check / Issues trailers.",
    "",
    "Usage: node scripts/audit-docs-issues.mjs [options]",
    "",
    "  --dir <path>      folder to scan (default: docs/architecture)",
    "  --recursive       descend into subfolders",
    "  --out <path>      write report to file (else stdout)",
    "  --severity <s>    blocking | non-blocking | all (default: all)",
    "  --task <id>       show only findings for one task ID",
    "  --json            emit JSON instead of markdown",
    "  --no-clean-list   suppress 'clean files' section",
    "  --no-coverage     suppress audit-coverage summary",
  ].join("\n");
  process.stdout.write(`${banner}\n`);
  process.exit(code);
}

async function listMarkdownFiles(rootDir, recursive) {
  const out = [];
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (recursive) await walk(full);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".md")) out.push(full);
    }
  }
  await walk(rootDir);
  return out.sort();
}

// Find the last occurrence of a heading and return its body up to
// the next H2 (or EOF). Returns null if the heading isn't present.
function extractSection(text, heading) {
  const lines = text.split("\n");
  let lastStart = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i] === heading) lastStart = i;
  }
  if (lastStart === -1) return null;
  let end = lines.length;
  for (let i = lastStart + 1; i < lines.length; i += 1) {
    if (/^## /.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(lastStart + 1, end).join("\n").trim();
}

// Parse a Sync Check section into { ui, schema, tasks } where each
// value is a verdict marker string or null if the row is missing.
export function parseSyncCheck(body) {
  if (body === null) return null;
  const verdicts = { ui: null, schema: null, tasks: null };
  const rowRegex = /^- \*\*(UI|Schema|Tasks): (✔|⚠|❌)\*\*/;
  for (const line of body.split("\n")) {
    const m = rowRegex.exec(line);
    if (!m) continue;
    const key = m[1].toLowerCase();
    if (key in verdicts) verdicts[key] = m[2];
  }
  return verdicts;
}

// Parse an Issues section into a list of { title, body, taskIds }.
// Returns [] for `_None._`, null if the section is missing entirely.
export function parseIssues(body) {
  if (body === null) return null;
  if (body === NONE_MARKER || body === "") return [];
  const issues = [];
  const lines = body.split("\n");
  let current = null;
  for (const line of lines) {
    const m = /^- \*\*([^.]+)\.\*\*\s*(.*)$/.exec(line);
    if (m) {
      if (current) issues.push(finalizeIssue(current));
      current = { title: m[1].trim(), bodyParts: [m[2]] };
    } else if (current) {
      current.bodyParts.push(line);
    }
  }
  if (current) issues.push(finalizeIssue(current));
  return issues;
}

function finalizeIssue(raw) {
  const body = raw.bodyParts.join("\n").trim();
  const taskIds = Array.from(
    new Set([...body.matchAll(TASK_ID_REGEX)].map((m) => m[1])),
  );
  return { title: raw.title, body, taskIds };
}

// Per-file analysis result.
function analyzeFile(relPath, text) {
  const syncBody = extractSection(text, SYNC_CHECK_HEADING);
  const issuesBody = extractSection(text, ISSUES_HEADING);
  const sync = parseSyncCheck(syncBody);
  const issues = parseIssues(issuesBody);
  const audited = sync !== null || issues !== null;
  const hasBlocking = sync
    ? Object.values(sync).includes(VERDICT_BLOCKING)
    : false;
  const hasWarning = sync
    ? Object.values(sync).includes(VERDICT_WARNING)
    : false;
  return {
    relPath,
    audited,
    sync,
    issues: issues ?? [],
    issuesPresent: issues !== null,
    hasBlocking,
    hasWarning,
    isClean: audited && (issues?.length ?? 0) === 0 && !hasBlocking && !hasWarning,
  };
}

// Severity ranking: a finding inherits the worst verdict that
// referenced its issue. We approximate by checking whether the file
// has any ❌ at all (blocking) and treating issues in such a file as
// blocking. Files with only ⚠ verdicts produce non-blocking issues.
function classifyIssue(fileResult) {
  if (fileResult.hasBlocking) return VERDICT_BLOCKING;
  if (fileResult.hasWarning) return VERDICT_WARNING;
  return VERDICT_CLEAN;
}

function groupByTask(perFile) {
  const blocking = new Map();
  const nonBlocking = new Map();
  const untriaged = { blocking: [], nonBlocking: [] };
  for (const file of perFile) {
    const severity = classifyIssue(file);
    for (const issue of file.issues) {
      const bucket = severity === VERDICT_BLOCKING ? blocking : nonBlocking;
      const stash = severity === VERDICT_BLOCKING ? untriaged.blocking : untriaged.nonBlocking;
      const entry = { ...issue, file: file.relPath, severity };
      if (issue.taskIds.length === 0) {
        stash.push(entry);
        continue;
      }
      for (const taskId of issue.taskIds) {
        const list = bucket.get(taskId) ?? [];
        list.push(entry);
        bucket.set(taskId, list);
      }
    }
  }
  return { blocking, nonBlocking, untriaged };
}

function applyFilters(grouped, opts) {
  const out = {
    blocking: new Map(grouped.blocking),
    nonBlocking: new Map(grouped.nonBlocking),
    untriaged: {
      blocking: [...grouped.untriaged.blocking],
      nonBlocking: [...grouped.untriaged.nonBlocking],
    },
  };
  if (opts.severity === "blocking") {
    out.nonBlocking.clear();
    out.untriaged.nonBlocking = [];
  } else if (opts.severity === "non-blocking") {
    out.blocking.clear();
    out.untriaged.blocking = [];
  }
  if (opts.taskFilter) {
    const wanted = opts.taskFilter;
    for (const map of [out.blocking, out.nonBlocking]) {
      for (const key of [...map.keys()]) {
        if (key !== wanted) map.delete(key);
      }
    }
    out.untriaged.blocking = [];
    out.untriaged.nonBlocking = [];
  }
  return out;
}

function renderTaskGroup(map) {
  const sortedKeys = [...map.keys()].sort();
  const lines = [];
  for (const taskId of sortedKeys) {
    lines.push(`### ${taskId}`);
    lines.push("");
    for (const issue of map.get(taskId)) {
      lines.push(`- **${issue.title}.** ${issue.body}`);
      lines.push(`  - source: \`${issue.file}\``);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function renderUntriaged(list, label) {
  if (list.length === 0) return "";
  const lines = [`### ${label}`, ""];
  for (const issue of list) {
    lines.push(`- **${issue.title}.** ${issue.body}`);
    lines.push(`  - source: \`${issue.file}\``);
  }
  lines.push("");
  return lines.join("\n");
}

function renderMarkdown(perFile, filtered, opts) {
  const audited = perFile.filter((f) => f.audited);
  const unaudited = perFile.filter((f) => !f.audited);
  const cleanFiles = perFile.filter((f) => f.isClean);
  const blockingTotal = sumIssues(filtered.blocking) + filtered.untriaged.blocking.length;
  const nonBlockingTotal = sumIssues(filtered.nonBlocking) + filtered.untriaged.nonBlocking.length;

  const out = [];
  out.push(`# Doc-audit issues backlog`);
  out.push("");
  out.push(`_Generated by \`scripts/audit-docs-issues.mjs\` from \`${opts.dir}\`._`);
  out.push("");
  out.push(`## Summary`);
  out.push("");
  out.push(`- Files scanned: **${perFile.length}**`);
  out.push(`- Files audited (have a Sync Check / Issues trailer): **${audited.length}**`);
  out.push(`- Files clean (audited, zero findings): **${cleanFiles.length}**`);
  out.push(`- Files un-audited (no trailer found): **${unaudited.length}**`);
  out.push(`- CI-blocking (❌) findings: **${blockingTotal}**`);
  out.push(`- Non-blocking (⚠) findings: **${nonBlockingTotal}**`);
  out.push("");

  if (filtered.blocking.size > 0 || filtered.untriaged.blocking.length > 0) {
    out.push(`## ❌ CI-blocking findings (by responsible task)`);
    out.push("");
    out.push(renderTaskGroup(filtered.blocking));
    out.push(renderUntriaged(filtered.untriaged.blocking, "_Untriaged (no task ID extracted)_"));
  }
  if (filtered.nonBlocking.size > 0 || filtered.untriaged.nonBlocking.length > 0) {
    out.push(`## ⚠ Non-blocking findings (by responsible task)`);
    out.push("");
    out.push(renderTaskGroup(filtered.nonBlocking));
    out.push(renderUntriaged(filtered.untriaged.nonBlocking, "_Untriaged (no task ID extracted)_"));
  }

  if (opts.showCleanList && cleanFiles.length > 0) {
    out.push(`## ✔ Clean files (audited, no findings)`);
    out.push("");
    for (const f of cleanFiles) out.push(`- \`${f.relPath}\``);
    out.push("");
  }

  if (opts.showCoverage && unaudited.length > 0) {
    out.push(`## Un-audited files`);
    out.push("");
    out.push(`These files have no \`${SYNC_CHECK_HEADING}\` trailer — either the audit hasn't run yet or it failed mid-rewrite. Re-run \`audit-docs-loop\` (with \`--retry-failed\` if relevant).`);
    out.push("");
    for (const f of unaudited) out.push(`- \`${f.relPath}\``);
    out.push("");
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}

function sumIssues(map) {
  let n = 0;
  for (const list of map.values()) n += list.length;
  return n;
}

function renderJson(perFile, filtered) {
  const blocking = {};
  for (const [taskId, list] of filtered.blocking) blocking[taskId] = list;
  const nonBlocking = {};
  for (const [taskId, list] of filtered.nonBlocking) nonBlocking[taskId] = list;
  return JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      files: perFile,
      blocking,
      nonBlocking,
      untriaged: filtered.untriaged,
    },
    null,
    2,
  );
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`audit-docs-issues: ${error.message}\n`);
    printUsageAndExit(2);
    return;
  }

  const targetDir = path.isAbsolute(opts.dir) ? opts.dir : path.join(repoRoot, opts.dir);
  try {
    const stat = await fs.stat(targetDir);
    if (!stat.isDirectory()) throw new Error("not a directory");
  } catch (error) {
    process.stderr.write(`audit-docs-issues: --dir not usable (${opts.dir}): ${error.message}\n`);
    process.exit(2);
    return;
  }

  const files = await listMarkdownFiles(targetDir, opts.recursive);
  const perFile = [];
  for (const abs of files) {
    const text = await fs.readFile(abs, "utf8");
    const relPath = repoRelative(abs);
    perFile.push(analyzeFile(relPath, text));
  }

  const grouped = groupByTask(perFile);
  const filtered = applyFilters(grouped, opts);
  const blockingCount = sumIssues(filtered.blocking) + filtered.untriaged.blocking.length;

  const report = opts.json
    ? renderJson(perFile, filtered)
    : renderMarkdown(perFile, filtered, opts);

  if (opts.out) {
    const outPath = path.isAbsolute(opts.out) ? opts.out : path.join(repoRoot, opts.out);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, report.endsWith("\n") ? report : `${report}\n`);
    process.stderr.write(
      `audit-docs-issues: wrote ${repoRelative(outPath)} ` +
        `(blocking=${blockingCount})\n`,
    );
  } else {
    process.stdout.write(`${report}\n`);
  }

  process.exit(blockingCount > 0 ? 1 : 0);
}

main().catch((error) => {
  process.stderr.write(`audit-docs-issues: ${error.stack || error.message}\n`);
  process.exit(2);
});
