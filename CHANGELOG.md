# Changelog

All notable changes to OpenAPI Guardian are documented here.

## [0.4.0] - 2026-09-18

### Added

- JSON Schema Draft 2020-12 response validation via Ajv 8.
- Support for oneOf, anyOf, allOf, tuple prefixes, and richer schema sampling.
- Nested local component reference support during schema validation.
- JUnit test output for CI systems.
- Path and method filtering for targeted API runs.
- Per-request timeout controls.
- Regression coverage for the expanded schema behavior.

### Improved

- Schema validation now reports all matching validation errors instead of stopping at the first simple mismatch.
- Request generation follows local component schema references more consistently.
- CLI help and version output updated to 0.4.0.

## [0.3.0] - 2026-09-18

### Added

- Expanded live API testing across all documented OpenAPI operations.
- Path-level and operation-level parameter handling.
- Automatic query parameter generation from OpenAPI schemas.
- Automatic header parameter generation from OpenAPI schemas.
- Request-body generation from the first documented media type.
- Response schema selection for documented response content types.
- Numeric sorting for expected response status selection.
- CLI help/version text updated to 0.3.0.

### Improved

- API tests now cover path, query, header, and request-body inputs described by the contract.
- Response validation uses the response definition matching the actual HTTP status when available.

## [0.2.0] - 2026-09-14

- First public release.
- OpenAPI 3.x JSON/YAML support.
- Local $ref resolution.
- Request generation.
- Live API contract testing.
- Semantic contract diffing and breaking-change detection.
- JSON output and CI-friendly exit codes.