# Changelog

All notable changes to OpenAPI Guardian are documented here.

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
- Local `$ref` resolution.
- Request generation.
- Live API contract testing.
- Semantic contract diffing and breaking-change detection.
- JSON output and CI-friendly exit codes.
