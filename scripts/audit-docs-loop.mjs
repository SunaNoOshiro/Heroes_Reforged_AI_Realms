// audit-docs-loop — drive the doc-audit skill across a folder.
//
// For each markdown file in the target folder, spawn a fresh
// headless `claude -p` session that invokes the doc-audit skill on
// that file. Sessions run sequentially by default; one finishes,
// the next starts. Progress is tracked in a JSON ledger so re-runs
// skip files already audited (unless the file has changed since).
//
// Screen-folder mode (auto-detected):
//   Files under `docs/architecture/wiki/screens/<NN>-<slug>/` are
//   batched. The orchestrator opens ONE session per screen folder
//   that audits all four package markdown files together
//   (architecture.md, data-contracts.md, interactions.md, spec.md),
//   with `mockup.html` provided as read-only reference. The session
//   reads every target + the mockup first, reconciles cross-file
//   mismatches, then rewrites every target in a single pass. Each
//   target keeps its own `## 🔍 Sync Check` and `## ⚠ Issues`
//   trailer. The ledger entry is keyed by folder path and tracks
//   per-file hashes.
//
//   Folder sessions do more work than per-file sessions; if you see
//   timeouts, raise `--timeout` (default 1800s).
//
// Usage:
//   node scripts/audit-docs-loop.mjs [options]
//
// Options:
//   --dir <path>                       folder to audit (default: docs/architecture)
//   --recursive                        descend into subfolders (default: top-level only)
//   --include <regex>                  only audit files matching this regex (basename)
//   --exclude <regex>                  skip files matching this regex (basename)
//   --exclude-path <regex>             skip files matching this regex (repo-relative posix path)
//   --max <n>                          cap number of work items audited this run
//                                      (a screen folder counts as 1 item, not 4)
//   --concurrency <n>                  parallel sessions (default: 1 — strictly serial)
//   --timeout <s>                      per-item timeout in seconds (default: 1800)
//   --permission-mode <m>              claude permission mode (default: bypassPermissions)
//   --model <id>                       claude model id/alias (default: inherit)
//   --ledger <path>                    ledger location (default: reports/audit-docs-loop/ledger.json)
//   --reset                            clear the ledger before starting
//   --retry-failed                     re-attempt entries previously marked failed
//   --max-consecutive-failures <n>     abort after N back-to-back non-successes (default: 3)
//   --dry-run                          list the queue and exit
//   --quiet                            suppress per-file progress lines
//
// Per-item status (in the ledger):
//   success        exit 0; every target file rewritten or already
//                  carrying the Sync Check trailer
//   no_change      exit 0 but at least one target was not modified
//                  AND had no trailer — likely a no-op session;
//                  auto re-queued on next run
//   rate_limited   stdout/stderr matched a known Anthropic usage-limit
//                  sentinel; auto re-queued on next run
//   failed         non-zero exit, timeout, or spawn error
//
// Only `success` is treated as durable. `no_change` and `rate_limited`
// are always re-queued; `failed` is re-queued only with --retry-failed.
//
// Exit codes:
//   0  every queued item finished with status=success
//   1  one or more items failed, were rate-limited, or were aborted by
//      the consecutive-failures circuit breaker
//   2  invocation error (bad flag, missing claude CLI, etc.)
//
// Per-item logs: reports/audit-docs-loop/logs/<sanitized-relpath>.log
//
// IMPORTANT: default --permission-mode is `bypassPermissions` because the
// doc-audit skill needs Bash for cross-checks (grep, link verification,
// schema reads). If you want a stricter mode you'll need to allowlist
// Bash, Read, Grep, Edit, and Write for the session. The script never
// passes --dangerously-skip-permissions itself; the permission mode is
// the only knob that affects authorization.

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { repoRoot, repoRelative } from "./lib/repo-utils.mjs";

const DEFAULT_DIR = "docs/architecture";
const DEFAULT_LEDGER = "reports/audit-docs-loop/ledger.json";
const DEFAULT_TIMEOUT_SECONDS = 1800;
const DEFAULT_PERMISSION_MODE = "bypassPermissions";
const DEFAULT_MAX_CONSECUTIVE_FAILURES = 3;
const LEDGER_SCHEMA_VERSION = 1;

// Screen packages live at docs/architecture/wiki/screens/<NN>-<slug>/
// and (per repo audit at the time this mode was added) all 78 of
// them contain exactly these four markdown files plus mockup.html.
// When the orchestrator encounters one, it batches the whole folder
// into a single Claude session.
export const SCREEN_FOLDER_PATTERN =
  /^docs\/architecture\/wiki\/screens\/\d{2}-[^/]+$/;
export const SCREEN_TARGET_FILES = [
  "architecture.md",
  "data-contracts.md",
  "interactions.md",
  "spec.md",
];
export const SCREEN_REFERENCE_FILES = ["mockup.html"];

// Phrases that indicate the Claude CLI hit a usage / rate limit. Kept
// strict on purpose: an audited doc may legitimately mention "rate
// limit" or "retry" (CSP, networking, AI gateway), and the agent's
// summary line could echo such phrases. Only canonical Anthropic CLI
// error wording matches here. If Anthropic changes the CLI message,
// add the new wording — do not loosen the existing ones.
const RATE_LIMIT_SENTINELS = [
  /Claude usage limit reached/i,
  /you'?ve reached your usage limit/i,
  /approaching usage limit/i,
  /usage limit (exceeded|exhausted)/i,
  /API rate limit (exceeded|hit)/i,
];

// Marker the doc-audit skill must emit at the end of every audit. If
// the file ends up without it, something interrupted the rewrite.
const TRAILER_MARKER = "## 🔍 Sync Check";

// Cap the in-memory tail kept for sentinel detection. Limit avoids
// retaining entire long agent transcripts in RAM.
const TAIL_BYTES = 64 * 1024;

function parseArgs(argv) {
  const opts = {
    dir: DEFAULT_DIR,
    recursive: false,
    include: null,
    exclude: null,
    excludePath: null,
    max: null,
    concurrency: 1,
    timeoutSeconds: DEFAULT_TIMEOUT_SECONDS,
    permissionMode: DEFAULT_PERMISSION_MODE,
    model: null,
    ledger: DEFAULT_LEDGER,
    reset: false,
    retryFailed: false,
    maxConsecutiveFailures: DEFAULT_MAX_CONSECUTIVE_FAILURES,
    dryRun: false,
    quiet: false,
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
      case "--include": opts.include = new RegExp(next()); break;
      case "--exclude": opts.exclude = new RegExp(next()); break;
      case "--exclude-path": opts.excludePath = new RegExp(next()); break;
      case "--max": opts.max = Number.parseInt(next(), 10); break;
      case "--concurrency": opts.concurrency = Number.parseInt(next(), 10); break;
      case "--timeout": opts.timeoutSeconds = Number.parseInt(next(), 10); break;
      case "--permission-mode": opts.permissionMode = next(); break;
      case "--model": opts.model = next(); break;
      case "--ledger": opts.ledger = next(); break;
      case "--reset": opts.reset = true; break;
      case "--retry-failed": opts.retryFailed = true; break;
      case "--max-consecutive-failures":
        opts.maxConsecutiveFailures = Number.parseInt(next(), 10);
        break;
      case "--dry-run": opts.dryRun = true; break;
      case "--quiet": opts.quiet = true; break;
      case "--help":
      case "-h":
        printUsageAndExit(0);
        break;
      default:
        throw new Error(`Unknown flag: ${arg}`);
    }
  }
  if (!Number.isFinite(opts.concurrency) || opts.concurrency < 1) {
    throw new Error(`--concurrency must be a positive integer`);
  }
  if (!Number.isFinite(opts.timeoutSeconds) || opts.timeoutSeconds < 60) {
    throw new Error(`--timeout must be >= 60 seconds`);
  }
  if (opts.max !== null && (!Number.isFinite(opts.max) || opts.max < 1)) {
    throw new Error(`--max must be a positive integer`);
  }
  if (
    !Number.isFinite(opts.maxConsecutiveFailures) ||
    opts.maxConsecutiveFailures < 1
  ) {
    throw new Error(`--max-consecutive-failures must be a positive integer`);
  }
  return opts;
}

function printUsageAndExit(code) {
  const banner = [
    "audit-docs-loop — drive the /doc-audit skill across a folder.",
    "",
    "Usage: node scripts/audit-docs-loop.mjs [options]",
    "",
    "  --dir <path>          folder to audit (default: docs/architecture)",
    "  --recursive           descend into subfolders",
    "  --include <regex>     only audit files matching regex (basename)",
    "  --exclude <regex>     skip files matching regex (basename)",
    "  --exclude-path <re>   skip files matching regex (repo-relative posix path)",
    "  --max <n>             cap work items audited this run (screen folder = 1 item)",
    "  --concurrency <n>     parallel sessions (default: 1)",
    "  --timeout <s>         per-item timeout (default: 1800)",
    "  --permission-mode <m> claude permission mode (default: bypassPermissions)",
    "  --model <id>          override claude model",
    "  --ledger <path>       ledger file (default: reports/audit-docs-loop/ledger.json)",
    "  --reset               clear the ledger before starting",
    "  --retry-failed        re-attempt entries previously marked failed",
    "  --max-consecutive-failures <n>  abort after N back-to-back non-successes (default: 3)",
    "  --dry-run             list queue and exit",
    "  --quiet               suppress per-file progress",
    "",
    "Screen folders (docs/architecture/wiki/screens/<NN>-<slug>/) are",
    "audited as a single group of four .md files per Claude session.",
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
      if (entry.isFile() && entry.name.endsWith(".md")) {
        out.push(full);
      }
    }
  }
  await walk(rootDir);
  return out.sort();
}

async function sha256(filePath) {
  const buf = await fs.readFile(filePath);
  return createHash("sha256").update(buf).digest("hex");
}

async function loadLedger(ledgerPath) {
  try {
    const text = await fs.readFile(ledgerPath, "utf8");
    const parsed = JSON.parse(text);
    if (parsed.schemaVersion !== LEDGER_SCHEMA_VERSION) {
      throw new Error(
        `Ledger schema mismatch (expected ${LEDGER_SCHEMA_VERSION}, got ${parsed.schemaVersion}). ` +
          `Delete or migrate ${ledgerPath}.`,
      );
    }
    return parsed;
  } catch (error) {
    if (error.code === "ENOENT") {
      return { schemaVersion: LEDGER_SCHEMA_VERSION, entries: {} };
    }
    throw error;
  }
}

async function saveLedger(ledgerPath, ledger) {
  await fs.mkdir(path.dirname(ledgerPath), { recursive: true });
  ledger.updatedAt = new Date().toISOString();
  await fs.writeFile(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
}

// Return the screen-folder relpath that owns this markdown file, or
// null. Input is the posix relpath of a .md file.
export function parseScreenFolder(relPath) {
  const parent = path.posix.dirname(relPath);
  return SCREEN_FOLDER_PATTERN.test(parent) ? parent : null;
}

function buildPrompt(relPath) {
  // Prompt structure follows Anthropic's prompting best-practices:
  // named XML tags for each content type, action stated up front,
  // context explaining why this is one-shot, positive directives
  // ("read in full", "fan out reads in parallel") rather than
  // negative ones, and an explicit reply contract at the end.
  return [
    "<task>",
    `Audit the markdown file at <target_path> using the /doc-audit skill. Rewrite it in place, append the skill's \`## 🔍 Sync Check\` and \`## ⚠ Issues\` trailer, then reply with a short summary.`,
    "</task>",
    "",
    `<target_path>${relPath}</target_path>`,
    "",
    "<context>",
    "This session is fully headless and autonomous: there is no",
    "follow-up turn after this one, and no human is watching. The",
    "orchestrator (`scripts/audit-docs-loop.mjs`) is iterating every",
    "markdown file in the folder and recording per-file outcomes in a",
    "ledger. Make this single file fully audited end-to-end before",
    "exiting; do not stop early or wait for clarification.",
    "</context>",
    "",
    "<execution_notes>",
    "- Read the target in full before any cross-check or rewrite.",
    "  Never speculate about content you have not opened.",
    "- Issue independent cross-check reads in parallel — single",
    "  message, multiple Bash/Read/Grep calls — for the UI specs,",
    "  schemas, sibling arch docs, tasks, data-inventory, and",
    "  command-schema entries the skill prescribes for this file's",
    "  class.",
    "- Edit only the target file. Surface mismatches with other",
    "  files in `## ⚠ Issues` rather than silently rewriting claims",
    "  that point to structural invariants (data-inventory rows,",
    "  schema-matrix rows, command-schema entries).",
    "- Honor every hard prohibition in the skill (A–H), in",
    "  particular: never invent features, never break existing",
    "  links, never strip companion-docs / schema cross-refs, never",
    "  edit restricted files, never rename or move the target.",
    "- Before replying, run the skill's § 12 self-check; fix any",
    "  failing item, or surface the reason in `## ⚠ Issues` if a fix",
    "  would require editing another file.",
    "</execution_notes>",
    "",
    "<reply_format>",
    "Reply with one short paragraph (≤ 4 sentences) covering:",
    "1. what you tightened in the rewrite,",
    "2. what you flagged in `## ⚠ Issues` (or write `no findings`),",
    "3. the cross-checked files (paths only, comma-separated).",
    "Do not echo the rewritten markdown — it is on disk and the",
    "orchestrator captures the diff from git.",
    "</reply_format>",
  ].join("\n");
}

function buildScreenFolderPrompt(folderRelPath) {
  const targets = SCREEN_TARGET_FILES.map(
    (name) => `${folderRelPath}/${name}`,
  );
  const references = SCREEN_REFERENCE_FILES.map(
    (name) => `${folderRelPath}/${name}`,
  );
  return [
    "<task>",
    "Audit the four markdown files of the screen package at",
    "<screen_folder> AS A GROUP, using the /doc-audit skill.",
    "Understand all four files plus the HTML mockup together, then",
    "rewrite every target file in this same session. Each target",
    "keeps its own `## 🔍 Sync Check` and `## ⚠ Issues` trailer.",
    "</task>",
    "",
    `<screen_folder>${folderRelPath}</screen_folder>`,
    "",
    "<target_paths>",
    ...targets,
    "</target_paths>",
    "",
    "<reference_paths>",
    ...references,
    "</reference_paths>",
    "",
    "<context>",
    "This session is fully headless and autonomous. The orchestrator",
    "(`scripts/audit-docs-loop.mjs`) is iterating screen folders one",
    "at a time. The unit of work is THIS FOLDER — every target must",
    "be rewritten in this single session.",
    "",
    "Per the doc-audit skill (§ 2), screen-package files cross-check",
    "each other. Auditing them in one pass lets you reconcile",
    "mismatches between siblings (a command in `interactions.md` not",
    "in `data-contracts.md`; a state binding in `spec.md` not",
    "described in `architecture.md`) instead of leaving the",
    "mismatch for separate sessions.",
    "</context>",
    "",
    "<execution_notes>",
    "- Step 1 (understand): read all four targets AND the mockup in",
    "  parallel — single message, multiple Read calls. Build a",
    "  coherent mental model of the screen as a whole before any",
    "  edit.",
    "- Step 2 (cross-check): in parallel, run the cross-checks the",
    "  skill prescribes for the screen-package class — the task that",
    "  owns the screen, schemas referenced by `data-contracts.md`,",
    "  sibling arch docs linked from `architecture.md`,",
    "  `command-schema.md`, and `data-inventory.md`.",
    "- Step 3 (reconcile): list internal inconsistencies between the",
    "  four targets. Plan a single coherent rewrite that resolves",
    "  them.",
    "- Step 4 (rewrite): edit every target file. Trailers may",
    "  reference siblings (\"see sibling `spec.md` § 2 — aligned\").",
    "- Step 5 (self-check): run the skill's § 12 self-check for each",
    "  target before replying.",
    "",
    "- Never edit `mockup.html` — reference only.",
    "- Never edit files outside this screen folder. If a sibling",
    "  arch doc or schema needs a fix, raise it in",
    "  `## ⚠ Issues` of the relevant target.",
    "- Honor every hard prohibition in the doc-audit skill (A–H).",
    "</execution_notes>",
    "",
    "<reply_format>",
    "Reply with one short paragraph per target file (≤ 3 sentences",
    "each), each prefixed with the filename. End with a",
    "comma-separated list of cross-checked external files. Do not",
    "echo the rewritten markdown.",
    "</reply_format>",
  ].join("\n");
}

function sanitizeForFilename(relPath) {
  return relPath.replace(/[\\/]/g, "__");
}

function isStillValid(entry, currentHash) {
  return (
    entry?.kind !== "screenFolder" &&
    entry?.status === "success" &&
    entry.contentHashAfter === currentHash
  );
}

function isScreenFolderEntryStillValid(entry, files) {
  if (entry?.kind !== "screenFolder") return false;
  if (entry.status !== "success") return false;
  for (const f of files) {
    const recorded = entry.files?.[f.name]?.contentHashAfter;
    if (recorded !== f.contentHashBefore) return false;
  }
  return true;
}

function detectRateLimit(text) {
  return RATE_LIMIT_SENTINELS.some((re) => re.test(text));
}

async function fileContainsTrailer(absPath) {
  try {
    const text = await fs.readFile(absPath, "utf8");
    return text.includes(TRAILER_MARKER);
  } catch {
    return false;
  }
}

// Decide the final per-file status from the raw session result plus
// the post-run on-disk state. Only place where `success` can be
// downgraded to `no_change` or `rate_limited`.
async function deriveFinalStatus(rawResult, absPath, contentHashBefore, contentHashAfter) {
  if (rawResult.rateLimited) return "rate_limited";
  if (rawResult.status !== "success") return rawResult.status;
  if (contentHashBefore === contentHashAfter) {
    const hasTrailer = await fileContainsTrailer(absPath);
    if (!hasTrailer) return "no_change";
  }
  return "success";
}

// Same downgrade logic, applied folder-wide. If any target is
// unchanged AND has no trailer, the folder is `no_change` (the
// session evidently did not finish its work for that file).
export async function deriveScreenFolderFinalStatus(rawResult, filesAfter) {
  if (rawResult.rateLimited) return "rate_limited";
  if (rawResult.status !== "success") return rawResult.status;
  for (const f of filesAfter) {
    if (f.contentHashBefore === f.contentHashAfter) {
      const absPath = path.join(repoRoot, f.relPath);
      const hasTrailer = await fileContainsTrailer(absPath);
      if (!hasTrailer) return "no_change";
    }
  }
  return "success";
}

async function spawnClaudeSession({ promptText, opts, logPath, sessionLabel }) {
  const args = ["-p", promptText, "--permission-mode", opts.permissionMode];
  if (opts.model) args.push("--model", opts.model);

  await fs.mkdir(path.dirname(logPath), { recursive: true });
  const logFd = await fs.open(logPath, "w");
  const startedAt = new Date();
  const startedAtIso = startedAt.toISOString();
  await logFd.write(
    `# audit-docs-loop\nsession: ${sessionLabel}\nstartedAt: ${startedAtIso}\nargs: ${JSON.stringify(args)}\n\n---\n`,
  );

  return await new Promise((resolve) => {
    const child = spawn("claude", args, {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 5000).unref();
    }, opts.timeoutSeconds * 1000);
    timer.unref();

    // Rolling tail buffer used for rate-limit sentinel detection.
    // Bounded so a chatty agent transcript can't bloat the loop.
    let tail = "";
    const appendTail = (chunk) => {
      tail += chunk.toString("utf8");
      if (tail.length > TAIL_BYTES) {
        tail = tail.slice(tail.length - TAIL_BYTES);
      }
    };

    child.on("error", async (error) => {
      clearTimeout(timer);
      await logFd.write(`\n[spawn error] ${error.message}\n`);
      await logFd.close();
      resolve({
        status: "failed",
        exitCode: null,
        signal: null,
        startedAt: startedAtIso,
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt.getTime(),
        error: error.message,
        rateLimited: false,
      });
    });

    child.stdout.on("data", (chunk) => {
      logFd.write(chunk).catch(() => {});
      appendTail(chunk);
    });
    child.stderr.on("data", (chunk) => {
      logFd.write(chunk).catch(() => {});
      appendTail(chunk);
    });

    child.on("close", async (code, signal) => {
      clearTimeout(timer);
      const finishedAt = new Date();
      const finishedAtIso = finishedAt.toISOString();
      const rateLimited = detectRateLimit(tail);
      await logFd.write(
        `\n---\nfinishedAt: ${finishedAtIso}\nexitCode: ${code}\nsignal: ${signal}\nrateLimited: ${rateLimited}\n`,
      );
      await logFd.close();
      const status = code === 0 && !timedOut ? "success" : "failed";
      resolve({
        status,
        exitCode: code,
        signal: signal ?? null,
        startedAt: startedAtIso,
        finishedAt: finishedAtIso,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        timedOut,
        rateLimited,
      });
    });
  });
}

async function runOneAudit({ relPath, opts, logPath }) {
  return spawnClaudeSession({
    promptText: buildPrompt(relPath),
    opts,
    logPath,
    sessionLabel: `file:${relPath}`,
  });
}

async function runOneScreenFolderAudit({ folderRelPath, opts, logPath }) {
  return spawnClaudeSession({
    promptText: buildScreenFolderPrompt(folderRelPath),
    opts,
    logPath,
    sessionLabel: `screenFolder:${folderRelPath}`,
  });
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s - m * 60;
  return `${m}m${rem.toString().padStart(2, "0")}s`;
}

function describeNonSuccess(status, result) {
  if (status === "rate_limited") return "RATE LIMIT";
  if (status === "no_change") return "no_change";
  if (result.timedOut) return "timeout";
  if (result.signal) return `signal=${result.signal}`;
  return `exit=${result.exitCode}`;
}

function itemLabel(item) {
  return item.kind === "screenFolder"
    ? `${item.folderRelPath} (screen)`
    : item.relPath;
}

function itemLogKey(item) {
  return item.kind === "screenFolder" ? item.folderRelPath : item.relPath;
}

async function processItem(item, opts, logsDir) {
  const logPath = path.join(
    logsDir,
    `${sanitizeForFilename(itemLogKey(item))}.log`,
  );
  if (item.kind === "screenFolder") {
    const rawResult = await runOneScreenFolderAudit({
      folderRelPath: item.folderRelPath,
      opts,
      logPath,
    });
    const filesAfter = await Promise.all(
      item.files.map(async (f) => {
        let contentHashAfter = f.contentHashBefore;
        try {
          contentHashAfter = await sha256(path.join(repoRoot, f.relPath));
        } catch {
          // file deleted by audit (should not happen) — keep prior hash
        }
        return { ...f, contentHashAfter };
      }),
    );
    const finalStatus = await deriveScreenFolderFinalStatus(
      rawResult,
      filesAfter,
    );
    const filesMap = Object.fromEntries(
      filesAfter.map((f) => [
        f.name,
        {
          contentHashBefore: f.contentHashBefore,
          contentHashAfter: f.contentHashAfter,
        },
      ]),
    );
    const entry = {
      kind: "screenFolder",
      status: finalStatus,
      files: filesMap,
      exitCode: rawResult.exitCode,
      signal: rawResult.signal,
      startedAt: rawResult.startedAt,
      finishedAt: rawResult.finishedAt,
      durationMs: rawResult.durationMs,
      logPath: repoRelative(logPath),
      ...(rawResult.error ? { error: rawResult.error } : {}),
      ...(rawResult.timedOut ? { timedOut: true } : {}),
      ...(rawResult.rateLimited ? { rateLimited: true } : {}),
    };
    return { entryKey: item.folderRelPath, entry, finalStatus, rawResult, logPath };
  }

  const { relPath, contentHashBefore } = item;
  const absPath = path.join(repoRoot, relPath);
  const rawResult = await runOneAudit({ relPath, opts, logPath });
  let contentHashAfter = contentHashBefore;
  try {
    contentHashAfter = await sha256(absPath);
  } catch {
    // file deleted by audit (should not happen) — keep prior hash
  }
  const finalStatus = await deriveFinalStatus(
    rawResult,
    absPath,
    contentHashBefore,
    contentHashAfter,
  );
  const entry = {
    status: finalStatus,
    contentHashBefore,
    contentHashAfter,
    exitCode: rawResult.exitCode,
    signal: rawResult.signal,
    startedAt: rawResult.startedAt,
    finishedAt: rawResult.finishedAt,
    durationMs: rawResult.durationMs,
    logPath: repoRelative(logPath),
    ...(rawResult.error ? { error: rawResult.error } : {}),
    ...(rawResult.timedOut ? { timedOut: true } : {}),
    ...(rawResult.rateLimited ? { rateLimited: true } : {}),
  };
  return { entryKey: relPath, entry, finalStatus, rawResult, logPath };
}

async function processSerially(queue, opts, ledger, ledgerPath, logsDir) {
  const summary = { succeeded: 0, failed: 0, rateLimited: 0, noChange: 0 };
  let consecutive = 0;
  let aborted = false;
  for (let i = 0; i < queue.length; i += 1) {
    const item = queue[i];
    if (!opts.quiet) {
      const idx = `[${i + 1}/${queue.length}]`;
      process.stdout.write(`${idx} ${itemLabel(item)} … `);
    }
    const { entryKey, entry, finalStatus, rawResult, logPath } =
      await processItem(item, opts, logsDir);
    ledger.entries[entryKey] = entry;
    await saveLedger(ledgerPath, ledger);
    if (finalStatus === "success") {
      summary.succeeded += 1;
      consecutive = 0;
      if (!opts.quiet) {
        process.stdout.write(`ok (${formatDuration(rawResult.durationMs)})\n`);
      }
    } else {
      if (finalStatus === "rate_limited") summary.rateLimited += 1;
      else if (finalStatus === "no_change") summary.noChange += 1;
      else summary.failed += 1;
      consecutive += 1;
      if (!opts.quiet) {
        const reason = describeNonSuccess(finalStatus, rawResult);
        process.stdout.write(`FAILED (${reason}, log: ${repoRelative(logPath)})\n`);
      }
      if (consecutive >= opts.maxConsecutiveFailures) {
        aborted = true;
        process.stderr.write(
          `audit-docs-loop: aborted after ${consecutive} consecutive non-successes ` +
            `(threshold ${opts.maxConsecutiveFailures}). ` +
            `Likely cause: Anthropic usage limit reached, or a systematic prompt/skill failure. ` +
            `Re-run after the cap window resets, or use --retry-failed.\n`,
        );
        break;
      }
    }
  }
  return { ...summary, aborted };
}

async function processConcurrently(queue, opts, ledger, ledgerPath, logsDir) {
  const summary = { succeeded: 0, failed: 0, rateLimited: 0, noChange: 0 };
  let cursor = 0;
  // "Consecutive" with concurrent workers means "completions since the
  // last success." When this hits the threshold, aborted flips and
  // workers stop pulling new items. In-flight items still finish.
  let consecutive = 0;
  let aborted = false;
  const ledgerLock = { current: Promise.resolve() };

  async function worker(workerId) {
    while (cursor < queue.length && !aborted) {
      const i = cursor;
      cursor += 1;
      const item = queue[i];
      if (!item) return;
      if (!opts.quiet) {
        process.stdout.write(
          `[w${workerId} ${i + 1}/${queue.length}] ${itemLabel(item)} starting\n`,
        );
      }
      const { entryKey, entry, finalStatus, rawResult, logPath } =
        await processItem(item, opts, logsDir);
      ledgerLock.current = ledgerLock.current.then(async () => {
        ledger.entries[entryKey] = entry;
        await saveLedger(ledgerPath, ledger);
      });
      await ledgerLock.current;
      if (finalStatus === "success") {
        summary.succeeded += 1;
        consecutive = 0;
        if (!opts.quiet) {
          process.stdout.write(
            `[w${workerId}] ${itemLabel(item)} ok (${formatDuration(rawResult.durationMs)})\n`,
          );
        }
      } else {
        if (finalStatus === "rate_limited") summary.rateLimited += 1;
        else if (finalStatus === "no_change") summary.noChange += 1;
        else summary.failed += 1;
        consecutive += 1;
        if (!opts.quiet) {
          const reason = describeNonSuccess(finalStatus, rawResult);
          process.stdout.write(
            `[w${workerId}] ${itemLabel(item)} FAILED (${reason}, log: ${repoRelative(logPath)})\n`,
          );
        }
        if (consecutive >= opts.maxConsecutiveFailures && !aborted) {
          aborted = true;
          process.stderr.write(
            `audit-docs-loop: aborted after ${consecutive} consecutive non-successes ` +
              `(threshold ${opts.maxConsecutiveFailures}). ` +
              `Likely cause: Anthropic usage limit reached, or a systematic prompt/skill failure. ` +
              `Re-run after the cap window resets, or use --retry-failed.\n`,
          );
        }
      }
    }
  }

  const workers = Array.from({ length: opts.concurrency }, (_, idx) =>
    worker(idx + 1),
  );
  await Promise.all(workers);
  return { ...summary, aborted };
}

async function buildScreenFolderCandidate(folderRelPath, ledger, opts) {
  const files = [];
  for (const name of SCREEN_TARGET_FILES) {
    const relPath = `${folderRelPath}/${name}`;
    const abs = path.join(repoRoot, relPath);
    let contentHashBefore;
    try {
      contentHashBefore = await sha256(abs);
    } catch (error) {
      // A screen folder is missing one of its canonical files. Skip
      // the whole folder rather than partially auditing — surface as
      // a warning so the user notices the drift.
      process.stderr.write(
        `audit-docs-loop: skipping screen folder ${folderRelPath} — missing ${name} (${error.code ?? error.message})\n`,
      );
      return null;
    }
    files.push({ name, relPath, contentHashBefore });
  }
  const prior = ledger.entries[folderRelPath];
  if (isScreenFolderEntryStillValid(prior, files)) return null;
  if (
    prior?.kind === "screenFolder" &&
    prior.status === "failed" &&
    !opts.retryFailed &&
    SCREEN_TARGET_FILES.every(
      (name) =>
        prior.files?.[name]?.contentHashBefore ===
        files.find((f) => f.name === name).contentHashBefore,
    )
  ) {
    return null;
  }
  return { kind: "screenFolder", folderRelPath, files };
}

async function buildQueue(targetDir, opts, ledger) {
  const allFiles = await listMarkdownFiles(targetDir, opts.recursive);
  const visitedFolders = new Set();
  const queue = [];

  for (const abs of allFiles) {
    if (opts.max !== null && queue.length >= opts.max) break;
    const relPath = repoRelative(abs);
    const base = path.basename(abs);
    if (opts.include && !opts.include.test(base)) continue;
    if (opts.exclude && opts.exclude.test(base)) continue;
    if (opts.excludePath && opts.excludePath.test(relPath)) continue;

    const folderRelPath = parseScreenFolder(relPath);
    if (folderRelPath) {
      if (visitedFolders.has(folderRelPath)) continue;
      visitedFolders.add(folderRelPath);
      const item = await buildScreenFolderCandidate(folderRelPath, ledger, opts);
      if (item) queue.push(item);
      continue;
    }

    const contentHashBefore = await sha256(abs);
    const prior = ledger.entries[relPath];
    if (isStillValid(prior, contentHashBefore)) continue;
    if (
      prior?.kind !== "screenFolder" &&
      prior?.status === "failed" &&
      !opts.retryFailed &&
      prior.contentHashBefore === contentHashBefore
    ) {
      continue;
    }
    queue.push({ kind: "file", relPath, contentHashBefore });
  }
  return queue;
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`audit-docs-loop: ${error.message}\n`);
    printUsageAndExit(2);
    return;
  }

  const targetDir = path.isAbsolute(opts.dir) ? opts.dir : path.join(repoRoot, opts.dir);
  try {
    const stat = await fs.stat(targetDir);
    if (!stat.isDirectory()) throw new Error("not a directory");
  } catch (error) {
    process.stderr.write(`audit-docs-loop: --dir not usable (${opts.dir}): ${error.message}\n`);
    process.exit(2);
    return;
  }

  const ledgerPath = path.isAbsolute(opts.ledger)
    ? opts.ledger
    : path.join(repoRoot, opts.ledger);
  const logsDir = path.join(path.dirname(ledgerPath), "logs");

  let ledger = opts.reset
    ? { schemaVersion: LEDGER_SCHEMA_VERSION, entries: {} }
    : await loadLedger(ledgerPath);
  if (opts.reset) await saveLedger(ledgerPath, ledger);

  const queue = await buildQueue(targetDir, opts, ledger);

  if (opts.dryRun) {
    process.stdout.write(`audit-docs-loop dry-run: ${queue.length} item(s) queued\n`);
    for (const item of queue) {
      if (item.kind === "screenFolder") {
        process.stdout.write(`  [screen] ${item.folderRelPath} (${item.files.length} files)\n`);
      } else {
        process.stdout.write(`  ${item.relPath}\n`);
      }
    }
    process.exit(0);
    return;
  }

  if (queue.length === 0) {
    process.stdout.write("audit-docs-loop: nothing to do (ledger up to date)\n");
    process.exit(0);
    return;
  }

  if (!opts.quiet) {
    const screenCount = queue.filter((q) => q.kind === "screenFolder").length;
    const fileCount = queue.length - screenCount;
    process.stdout.write(
      `audit-docs-loop: ${queue.length} item(s) queued ` +
        `(files=${fileCount}, screen-folders=${screenCount}, ` +
        `dir=${opts.dir}, concurrency=${opts.concurrency}, mode=${opts.permissionMode})\n`,
    );
  }

  const summary = opts.concurrency === 1
    ? await processSerially(queue, opts, ledger, ledgerPath, logsDir)
    : await processConcurrently(queue, opts, ledger, ledgerPath, logsDir);

  process.stdout.write(
    `audit-docs-loop: ${summary.aborted ? "aborted" : "done"}. ` +
      `succeeded=${summary.succeeded} failed=${summary.failed} ` +
      `rate_limited=${summary.rateLimited} no_change=${summary.noChange} ` +
      `ledger=${repoRelative(ledgerPath)}\n`,
  );
  const cleanFinish =
    !summary.aborted &&
    summary.failed === 0 &&
    summary.rateLimited === 0 &&
    summary.noChange === 0;
  process.exit(cleanFinish ? 0 : 1);
}

// Allow importing helpers for unit tests without spawning Claude.
const invokedAsScript =
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url.endsWith(process.argv[1] ?? "");

if (invokedAsScript) {
  main().catch((error) => {
    process.stderr.write(`audit-docs-loop: ${error.stack || error.message}\n`);
    process.exit(2);
  });
}
