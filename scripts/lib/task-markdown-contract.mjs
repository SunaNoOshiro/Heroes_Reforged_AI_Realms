export const TASK_SECTION_NAMES = [
  "Description",
  "Read First",
  "Inputs",
  "Outputs",
  "Owned Paths",
  "Owned Paths (shared)",
  "Dependencies",
  "Acceptance Criteria",
  "Verify",
  "Estimated Time"
];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const TASK_SECTION_HEADER_PATTERN = TASK_SECTION_NAMES
  .map(escapeRegex)
  .join("|");

export function taskSectionHeaderRegex(flags = "gm") {
  return new RegExp(`^(${TASK_SECTION_HEADER_PATTERN}):\\s*$`, flags);
}
