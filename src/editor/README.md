# src/editor

Reserved for non-UI editor logic that may be split out of `src/ui/editor/`
as authoring tools grow. By default, content-editor screens, forms, and
preview panels live under `src/ui/editor/` (owned by phase-2 module
`04-content-editor`). Promote logic here only when it ceases to be
React-component glue and becomes engine-shaped (e.g. import/export
pipelines, validators, packfile builders).
