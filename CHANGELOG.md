# Changelog

All notable changes to OpenAPI Guardian are documented here.

## [0.6.0] - 2026-09-21

### Added

- Schema-guided API fuzzing.
- Dedicated `guardian fuzz` CLI command.
- Deterministic fuzz runs using `--seed`.
- Multi-case fuzz execution using `--cases`.
- Schema mutations for primitive types, enums, numeric boundaries, string lengths, arrays, objects, and required properties.
- Regression coverage proving identical seeds produce identical test outcomes.

### Improved

- Negative request generation now uses schema-guided mutations for request bodies.
- README documents the fuzzing model and reproducible workflow.

## [0.5.0] - 2026-09-19

### Added

- Negative API contract testing with deliberately invalid request inputs.
- Boundary-value generation for string lengths and numeric constraints.
- Invalid enum and primitive-type cases.
- Deterministic multi-case runs with `--cases` and `--seed`.
- CLI controls for negative testing.
- Regression coverage using a local HTTP fixture that verifies invalid requests are rejected with 4xx responses.

## [0.4.0] - 2026-09-18

### Added

- JSON Schema Draft 2020-12 response validation via Ajv 8.
- Support for oneOf, anyOf, allOf, tuple prefixes, and richer schema sampling.
- Nested local component reference support during schema validation.
- JUnit test reports.
- Path/method filtering.
- Per-request timeouts.
