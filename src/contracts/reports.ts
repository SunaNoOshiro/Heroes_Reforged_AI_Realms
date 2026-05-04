// Generated from these schemas (re-run scripts/generate-contracts-from-schemas.mjs
// after a schema change; hand-edits will be overwritten):
// - content-schema/schemas/validation-report.schema.json
// - content-schema/schemas/coherence-report.schema.json
// - content-schema/schemas/balance-report.schema.json
// - content-schema/schemas/report-base.schema.json (shared findings/severity shape)

export type ReportSeverity = "info" | "warn" | "error" | "fatal";
export type ReportVerdict = "pass" | "fail" | "warn";

export interface ReportFinding {
  readonly code: string;
  readonly severity: ReportSeverity;
  readonly message: string;
  readonly path?: string;
  readonly context?: Readonly<Record<string, unknown>>;
}

export interface ValidationReport {
  readonly stage: "validate";
  readonly inputId: string;
  readonly verdict: ReportVerdict;
  readonly findings: readonly ReportFinding[];
  readonly metrics?: Readonly<Record<string, number>>;
}

export interface CoherenceReport {
  readonly stage: "coherence";
  readonly inputId: string;
  readonly verdict: ReportVerdict;
  readonly findings: readonly ReportFinding[];
  readonly metrics?: Readonly<Record<string, number>>;
}

export interface BalanceReportMetrics {
  readonly matches: number;
  readonly winRatePermille: number;
  readonly ciLowPermille: number;
  readonly ciHighPermille: number;
  readonly powerScore?: number;
  readonly corridorLowPermille?: number;
  readonly corridorHighPermille?: number;
  readonly [extra: string]: number | undefined;
}

export interface BalanceReport {
  readonly stage: "balance";
  readonly inputId: string;
  readonly verdict: ReportVerdict;
  readonly findings: readonly ReportFinding[];
  readonly metrics: BalanceReportMetrics;
}

export type AnyReport = ValidationReport | CoherenceReport | BalanceReport;
