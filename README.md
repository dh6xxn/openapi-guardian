# OpenAPI Guardian

<div align="center">

**Contract-test your API. Catch breaking changes before they ship.**

A TypeScript-first CLI for validating OpenAPI contracts, testing live API implementations, and detecting semantic compatibility changes.

[![CI](https://github.com/dh6xxn/openapi-guardian/actions/workflows/ci.yml/badge.svg)](https://github.com/dh6xxn/openapi-guardian/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Version](https://img.shields.io/badge/version-0.5.0-blue.svg)](package.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

</div>

---

## The problem

An OpenAPI document is a promise between an API and its consumers. In real projects, implementations drift from that promise and apparently harmless contract edits can break clients.

Guardian turns that contract into executable developer checks:

```text
                         OpenAPI contract
                                │
                 ┌──────────────┴──────────────┐
                 │                             │
                 ▼                             ▼
            Running API                    New API spec
                 │                             │
                 ▼                             ▼
         Contract testing                Semantic diff
                 │                             │
                 └──────────────┬──────────────┘
                                ▼
                    PASS  ·  WARN  ·  FAIL
```

**Guardian is not a Postman clone.** The OpenAPI contract drives the checks.

## What works today

- 🔎 OpenAPI 3.0.x / 3.1.x JSON and YAML loading
- 🧩 Local `$ref` resolution using JSON Pointer
- 🧪 Representative request generation from schemas
- 🧭 Parameter-aware request generation for path, query, and header parameters
- 📦 Request-body generation from documented media types
- 🌐 Live API contract testing
- ✅ Response status and JSON schema checks
- 🔀 Semantic contract diffs
- 🚨 Breaking-change detection for endpoints, required fields, types, bounds, and enum removals
- 📦 JSON and JUnit output for automation
- 🎯 Path/method filtering for targeted test runs
- ⏱️ Per-request timeout controls
- 🧨 Negative and boundary input generation
- 🎲 Deterministic multi-case runs with seeds
- 🚦 CI-friendly exit codes
- 🧱 Small TypeScript core that can evolve into a reusable library

> **Status: early-stage, functional developer tool · v0.5.0.** Guardian now uses JSON Schema 2020-12 validation for response contracts and supports CI-oriented reporting and targeted test execution. It is still not positioned as a replacement for mature API testing/fuzzing platforms.

---

## Quick start

### Requirements

- Node.js 20+
- An OpenAPI 3.0.x or 3.1.x document in JSON, YAML, or YML

### Install from source

```bash
npm install
npm run build
```

### Validate a contract

```bash
node dist/cli.js validate examples/sample.yaml
```

```text
✔ Valid OpenAPI 3.0.3
  Guardian YAML Fixture v1.0.0
  1 operation
```

### Test a running API

```bash
node dist/cli.js test openapi.yaml --base-url http://localhost:3000

# Generate negative/boundary cases
node dist/cli.js test openapi.yaml --base-url http://localhost:3000 --negative --cases 25 --seed 42
```

Guardian discovers the documented operations, derives representative requests from their parameters and request bodies, sends them to the running API, checks the documented response status, and validates JSON responses with JSON Schema 2020-12 semantics when schemas are present.

### Detect breaking changes

```bash
node dist/cli.js diff old.json new.json --fail-on breaking
```

Example:

```text
API Contract Diff

✖ POST /users request.phone
    New required property 'phone' was added.
✖ GET /users/{id} response.email
    Property 'email' was removed.

2 breaking, 0 non-breaking, 1 warning
```

A breaking result returns a non-zero exit code, making the command suitable as a CI gate.

### Machine-readable output

```bash
node dist/cli.js diff old.json new.json --format json
node dist/cli.js test openapi.yaml --base-url http://localhost:3000 --format json
```

---

## CLI

| Command | Purpose |
| --- | --- |
| `guardian validate <spec>` | Validate the OpenAPI document structure |
| `guardian test <spec> --base-url <url>` | Test documented API operations against a live implementation |
| `guardian diff <old> <new>` | Compare two contracts semantically |

### Exit codes

| Code | Meaning |
| ---: | --- |
| `0` | Success |
| `1` | Contract/test failure or configured breaking change |
| `2` | Invalid command usage |
| `3` | Invalid specification or runtime error |

---

## Why the architecture matters

The CLI is intentionally thin. Core behavior lives under `src/core`, so the same contract engine can eventually power the CLI, a GitHub Action, or a reusable npm API.

```text
src/
├── cli.ts
└── core/
    ├── spec.ts       # loading, validation, local refs
    ├── schema.ts     # sampling + response validation
    ├── tester.ts     # live HTTP execution
    ├── diff.ts       # compatibility analysis
    └── types.ts      # shared result types
```

The current implementation keeps its dependency surface deliberately small: `yaml` handles YAML parsing and Ajv provides standards-aligned JSON Schema validation.

---

## Testing philosophy

Guardian is tested in layers:

1. **Unit tests** for schema sampling, validation, references, parameter handling, and compatibility rules.
2. **Integration tests** against deterministic local HTTP fixtures.
3. **Representative OpenAPI fixtures** in both JSON and YAML.
4. **Live API smoke testing** against a public OpenAPI-described API in GitHub Actions.
5. **Real-world compatibility fixtures** as the parser and schema engine mature.
6. **Differential testing** against established OpenAPI tooling before claiming broad compatibility.

The current CI suite verifies typechecking, unit tests, OpenAPI validation, semantic diff behavior, and a live JSONPlaceholder contract test. We explicitly prefer a conservative failure over silently producing a misleading contract result.

---

## Roadmap

### v0.2 — OpenAPI foundations

- [x] JSON and YAML support
- [x] Local `$ref` resolution
- [x] Basic OpenAPI 3.0 / 3.1 validation
- [x] Schema-based request generation
- [x] Expanded compatibility rules

### v0.3 — Expanded contract testing

- [x] Path parameter handling
- [x] Query parameter handling
- [x] Header parameter handling
- [x] Request-body generation from documented media types
- [x] Response status matching
- [x] Live API smoke test in CI
- [x] Regression coverage for the expanded request surface

### v0.4 — CI-grade contract testing

- [x] JSON Schema 2020-12 response validation via Ajv
- [x] Nested local component reference support during schema validation
- [x] JUnit test reports
- [x] Path/method filtering
- [x] Per-request timeouts
- [x] Expanded schema sampling (`oneOf`, `anyOf`, `allOf`, tuple prefixes)
- [ ] Dedicated GitHub Action
- [ ] Parallel execution
- [ ] Configuration file

### v0.5 — Advanced API testing

- [x] Negative contract tests
- [x] Boundary and invalid-input generation
- [x] Deterministic multi-case generation with seeds
- [ ] Property-based / fuzz testing
- [ ] Stateful API workflows
- [ ] Authentication/security schemes

---

## How Guardian fits in

Guardian is deliberately focused. **Schemathesis** provides powerful property-based and fuzz testing for APIs, while **Dredd** focuses on validating API implementations against API descriptions. Guardian's current goal is a clean, TypeScript-first workflow around **contract validation, live implementation checks, and semantic breaking-change detection**.

That comparison is intentional. The project should earn its place through developer experience and compatibility analysis, not by pretending the existing ecosystem does not exist.

---

## Development

```bash
npm run typecheck
npm run build
npm test
```

Pull requests should include a reproducible fixture and a focused regression test for compatibility behavior.

## License

MIT © 2026 dh6xxn
