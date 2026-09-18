# Changelog

All notable changes to OpenAPI Guardian are documented here.

## [0.5.0] - 2026-09-19

### Added

- Negative API contract testing with deliberately invalid request inputs.
- Boundary-value generation for string lengths and numeric constraints.
- Invalid enum and primitive-type cases.
- Deterministic multi-case runs with `--cases` and `--seed`.
- CLI controls for negative testing.
- Regression coverage using a local HTTP fixture that verifies invalid requests are rejected with 4xx responses.

### Improved

- Test execution now supports repeated generated cases while retaining the existing positive contract-testing path.
- Negative tests report a failure when the implementation accepts an invalid request with a non-4xx response.

## [0.4.0] - 2026-09-18

### Added

- JSON Schema Draft 2020-12 response validation via Ajv 8.
- Support for oneOf, anyOf, allOf, tuple prefixes, and richer schema sampling.
- Nested local component reference support during schema validation.
- JUnit test output for CI systems.
- Path and method filtering for targeted test runs.
- Per-request timeout controls.
- Regression coverage for the expanded schema behavior.

### Improved

- Schema validation now reports all matching validation errors instead of stopping at the first simple mismatch.
- Request generation follows local component schema references more consistently.
- CLI help and version output updated to 0.4.0.

## [0.3.0] - 2026-09-18

- Expanded live API testing across all documented OpenAPI operations.
- Path, query, header, and request-body generation.
- Response status and schema checks.

## [0.2.0] - 2026-09-14

- First public release.
- OpenAPI 3.x JSON/YAML support.
- Local $ref resolution.
- Request generation.
- Live API contract testing.
- Semantic contract diffing and breaking-change detection.
- JSON output and CI-friendly exit codes.