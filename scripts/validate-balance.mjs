import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  pathExists,
  readUtf8,
  repoRelative,
  repoRoot,
  walkFiles
} from "./lib/repo-utils.mjs";

const corridorPath = path.join(
  repoRoot,
  "content-schema",
  "balance",
  "corridor.json"
);

function isDirectRun() {
  return process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

async function loadCorridor() {
  const raw = JSON.parse(await readUtf8(corridorPath));
  const tiers = new Map();
  for (const entry of raw.tiers) tiers.set(entry.tier, entry);
  return { raw, tiers };
}

function effectiveBand(stat, range, tolerance) {
  const factor = tolerance[stat];
  return {
    lo: range.lo * factor.loFactor,
    hi: range.hi * factor.hiFactor
  };
}

const STAT_NAMES = ["hp", "attack", "defense", "damageMin", "damageMax", "speed"];

function classifyManifest(manifest) {
  if (manifest && manifest.sandboxed === true) return "sandbox";
  return "first-party";
}

function unitSkewAgainstTier(unit, tier) {
  const stats = unit.data.stats || {};
  let total = 0;
  let counted = 0;
  for (const stat of STAT_NAMES) {
    const value = stats[stat];
    if (value === undefined || value === null) continue;
    const range = tier[stat];
    const halfRange = (range.hi - range.lo) / 2;
    if (halfRange === 0) continue;
    const mid = (range.hi + range.lo) / 2;
    total += (value - mid) / halfRange;
    counted += 1;
  }
  if (counted === 0) return null;
  return total / counted;
}

function packSkewReport(units, corridor) {
  const budget = corridor.raw.factionBudget;
  if (!budget) return null;
  if (units.length < budget.minUnits) return null;

  const perUnit = [];
  for (const unit of units) {
    const tier = corridor.tiers.get(unit.data.tier);
    if (!tier) continue;
    const skew = unitSkewAgainstTier(unit, tier);
    if (skew === null) continue;
    perUnit.push({ unit, skew });
  }
  if (perUnit.length < budget.minUnits) return null;

  const sum = perUnit.reduce((acc, entry) => acc + entry.skew, 0);
  const average = sum / perUnit.length;
  if (Math.abs(average) <= budget.skewThreshold) return null;

  const direction = average > 0 ? "above" : "below";
  return {
    code: "pack.error.balance.factionImbalance",
    average,
    threshold: budget.skewThreshold,
    direction,
    perUnit,
    message: `pack-wide unit skew = ${average.toFixed(3)} (${direction} tier average); allowed ±${budget.skewThreshold}. Compensate by lowering or raising other units.`
  };
}

async function readJsonSafe(filePath) {
  try {
    const raw = await readUtf8(filePath);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function packsUnderRoot(root) {
  if (!(await pathExists(root))) return [];

  const entries = await fs.readdir(root, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const packDir = path.join(root, entry.name);
    const manifestPath = path.join(packDir, "manifest.json");
    if (!(await pathExists(manifestPath))) continue;
    result.push({ packDir, manifestPath });
  }
  return result;
}

async function loadUnitsForPack(packDir) {
  const files = await walkFiles(packDir, (p) => p.endsWith(".unit.json"));
  const units = [];
  for (const filePath of files) {
    const data = await readJsonSafe(filePath);
    if (data && Number.isInteger(data.tier) && data.stats) {
      units.push({ filePath, data });
    }
  }
  return units;
}

function checkUnitAgainstCorridor(unit, corridor) {
  const tier = corridor.tiers.get(unit.data.tier);
  if (!tier) {
    return [
      {
        code: "pack.error.balance.outOfCorridor",
        stat: "tier",
        message: `tier ${unit.data.tier} is not in the corridor table`
      }
    ];
  }

  const violations = [];
  for (const stat of STAT_NAMES) {
    const value = unit.data.stats?.[stat];
    if (value === undefined || value === null) continue;
    const band = effectiveBand(stat, tier[stat], corridor.raw.tolerance);
    if (value < band.lo || value > band.hi) {
      violations.push({
        code: "pack.error.balance.outOfCorridor",
        stat,
        value,
        band,
        message: `${stat}=${value} outside tier ${unit.data.tier} band [${band.lo}, ${band.hi}]`
      });
    }
  }
  return violations;
}

export async function collectBalanceViolations({ packs } = {}) {
  const corridor = await loadCorridor();
  const sources = packs && packs.length > 0
    ? packs
    : [
        path.join(repoRoot, "resources", "packs"),
        path.join(repoRoot, "content-schema", "examples", "packs")
      ];

  const reports = [];
  for (const root of sources) {
    for (const { packDir, manifestPath } of await packsUnderRoot(root)) {
      const manifest = await readJsonSafe(manifestPath);
      const severity = classifyManifest(manifest) === "sandbox" ? "warn" : "fatal";
      const units = await loadUnitsForPack(packDir);
      for (const unit of units) {
        for (const violation of checkUnitAgainstCorridor(unit, corridor)) {
          reports.push({
            ...violation,
            severity,
            pack: repoRelative(packDir),
            unit: unit.data.id ?? path.basename(unit.filePath),
            file: repoRelative(unit.filePath)
          });
        }
      }
      const packReport = packSkewReport(units, corridor);
      if (packReport) {
        reports.push({
          code: packReport.code,
          severity,
          pack: repoRelative(packDir),
          unit: packReport.perUnit
            .map((entry) => `${entry.unit.data.id ?? path.basename(entry.unit.filePath)}=${entry.skew.toFixed(2)}`)
            .join(", "),
          file: repoRelative(packDir),
          message: packReport.message
        });
      }
    }
  }
  return reports;
}

export async function runFromCli() {
  const reports = await collectBalanceViolations();
  if (reports.length === 0) {
    console.log("Balance corridor: 0 violations.");
    return 0;
  }

  const fatal = reports.filter((r) => r.severity === "fatal");
  const warn = reports.filter((r) => r.severity === "warn");

  for (const report of fatal) {
    console.error(
      `[FATAL] ${report.code} ${report.file} unit=${report.unit} ${report.message}`
    );
  }
  for (const report of warn) {
    console.warn(
      `[WARN]  ${report.code} ${report.file} unit=${report.unit} ${report.message}`
    );
  }

  if (fatal.length > 0) {
    console.error(
      `\nBalance corridor failed: ${fatal.length} fatal, ${warn.length} warn.`
    );
    return 1;
  }
  return 0;
}

if (isDirectRun()) {
  process.exitCode = await runFromCli();
}
