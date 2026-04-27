# src/content-runtime

This module is reserved for pack-loading runtime behavior:

- manifest loading
- dependency graph resolution
- override precedence
- capability checks
- asset indirection
- content registry assembly

It sits between the canonical JSON contracts in `content-schema/` and
the simulation or renderer code in `src/`.
