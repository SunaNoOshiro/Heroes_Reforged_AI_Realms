# Decision Log

Register of **cross-cutting** locked decisions that don't have a single
canonical source to live in. Decisions that own one canonical source
(a task spec, a lint config, a schema docstring) belong **inside that
source**, not here. Inline beats centralized for almost everything.

Add an entry here only when the decision genuinely cuts across
multiple files with no obvious single owner. The historical record of
the prior centralized entries (DEC-001 through DEC-005) was inlined
into their canonical sources on 2026-05-09; see git history for the
original centralized form.

## Entry format

Every entry has:

- `ID` — stable `DEC-NNN` identifier.
- `Date` — date the decision was ratified (ISO-8601).
- `Decision` — one short sentence stating what was locked.
- `Value` — the concrete value (number, formula, choice).
- `Rationale` — why this option was picked.
- `Canonical sources patched` — files that now carry the locked
  value. Future readers must follow these, not chat history.

**Append-only.** Entries are ordered chronologically; do not reorder.
If a decision is revised, append a new entry that supersedes the
prior one and add `Superseded by: DEC-NNN` (or
`Partially superseded by: DEC-NNN (clause)`) to the prior entry.

---

## (No current entries.)

New entries go below this line.

---

## How to add a new entry

1. Confirm the decision is genuinely cross-cutting (no single canonical
   source that should hold it inline). If it owns one file, put it
   there instead.
2. Pick the next `DEC-NNN`.
3. Fill the template above. Keep `Value` machine-grep-able.
4. Add an inline reference back to this log from each canonical source
   you patched, so readers reach the rationale in one hop.
