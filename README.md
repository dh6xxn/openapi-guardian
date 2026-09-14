# OpenAPI Guardian

<div align="center">

**Contract-test your API. Catch breaking changes before they ship.**

A TypeScript CLI that turns an OpenAPI description into executable checks for API implementations and semantic contract diffs for API changes.

[![CI](https://github.com/dh6xxn/openapi-guardian/actions/workflows/ci.yml/badge.svg)](https://github.com/dh6xxn/openapi-guardian/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

</div>

---

## Why Guardian?

OpenAPI is supposed to describe the contract between an API and its consumers. The problem is that documentation can drift from reality, and an apparently small schema change can break clients.

Guardian is built around one idea:

```text
                 OpenAPI contract
                        │
          ┌─────────────┴─────────────┐
          ▼                           ▼
   Running API                  New API spec
          │                           │
          ▼                           ▼
   Contract tests              Semantic diff
          │                           │
          └─────────────┬─────────────┘
                        ▼
                 Developer signal
                 PASS / WARN / FAIL
```

It is intentionally **not** a Postman clone. The OpenAPI document is the source of truth, and Guardian derives checks from it.

## Features

- 🔎 Validate basic OpenAPI 3.0.x / 3.1.x structure
- 🧪 Generate representative requests from OpenAPI schemas
- 🌐 Test a live API from the command line
- 🧩 Validate response bodies against documented schemas
- 🔀 Detect semantic breaking changes between two specs
- 🚦 CI-friendly exit codes
- 📦 JSON output for automation
- 🧱 Small TypeScript core designed to grow into a reusable library

> **Current status:** v0.1 is an intentionally small working prototype. JSON OpenAPI documents are supported today. YAML, full `$ref` graphs, richer request validation, JUnit reporting, a dedicated reusable GitHub Action, and deeper compatibility analysis are planned next.

## Quick start

### Requirements

- Node.js 20+
- An OpenAPI 3.0.x or 3.1.x JSON document

### Run from source

```bash
npm install
npm run build
```

### Validate a contract

```bash
node dist/cli.js validate examples/old.json
```

```text
✔ Valid OpenAPI 3.0.3
  Demo API v1.0.0
  2 operations
```

### Test a running API

```bash
node dist/cli.js test examples/old.json --base-url http://localhost:3000
```

Guardian derives a request from the operation, sends it, checks the status code, and validates a JSON response when a response schema is present.

### Detect breaking changes

```bash
node dist/cli.js diff examples/old.json examples/new.json --fail-on breaking
```

Example output:

```text
API Contract Diff

✖ POST /users request.phone
    New required property 'phone' was added.
✖ GET /users/{id} response.email
    Property 'email' was removed.

2 breaking, 0 non-breaking, 1 warning
```

The non-zero exit code makes the command usable as a CI gate.

### Machine-readable output

```bash
node dist/cli.js diff examples/old.json examples/new.json --format json
node dist/cli.js test examples/old.json --base-url http://localhost:3000 --format json
```

## CLI

| Command | Purpose |
| --- | --- |
| `guardian validate <spec>` | Validate the OpenAPI document structure |
| `guardian test <spec> --base-url <url>` | Test a live API against the contract |
| `guardian diff <old> <new>` | Compare two contracts semantically |

### Exit codes

| Code | Meaning |
| ---: | --- |
| `0` | Success |
| `1` | Contract/test failure or configured breaking change |
| `2` | Invalid command usage |
| `3` | Invalid specification or runtime error |

## Architecture

Guardian keeps the CLI thin and puts behavior in a small core:

```text
openapi-guardian/
├── src/
│   ├── cli.ts                 # CLI entrypoint
│   └── core/
│       ├── spec.ts            # loading + basic spec validation
│       ├── schema.ts          # sample data + response validation
│       ├── tester.ts          # live contract execution
│       ├── diff.ts            # semantic compatibility checks
│       └── types.ts            # shared result types
├── examples/
│   ├── old.json
│   └── new.json
├── tests/
│   └── core.test.js
└── .github/
    └── workflows/
        └── ci.yml
```

The long-term architecture is deliberately centered on a reusable `core` engine so the CLI and future integrations can share the same contract logic.

## Roadmap

### v0.2 — Make the engine real

- [ ] YAML support
- [ ] Robust `$ref` resolution
- [ ] OpenAPI 3.0 / 3.1 schema validation
- [ ] Request parameter and request-body validation
- [ ] More response status-code handling
- [ ] Better `oneOf` / `anyOf` / `allOf` support
- [ ] Expanded unit + integration test suite

### v0.3 — CI-grade tooling

- [ ] JUnit reports
- [ ] Dedicated GitHub Action
- [ ] Config file (`guardian.config.ts`)
- [ ] Parallel test execution
- [ ] PR-friendly annotations
- [ ] Stronger breaking-change rules

### v0.4 — Advanced API testing

- [ ] Negative contract tests
- [ ] Boundary and invalid-input generation
- [ ] Property-based / fuzz testing
- [ ] Stateful API workflows
- [ ] Request authentication schemes

## How Guardian fits in

Guardian is not trying to replace established API testing projects. **Schemathesis** already provides powerful property-based and fuzz testing, while **Dredd** focuses on validating API implementations against API descriptions. Guardian's goal is to provide a focused, TypeScript-first developer tool with a particularly clean workflow around **contract validation + semantic breaking-change detection**.

That comparison is intentional: the project should earn its place through useful developer experience and compatibility analysis, not by pretending the existing ecosystem does not exist.

## Testing philosophy

Guardian is tested in layers:

1. **Unit tests** for schema sampling, validation, and diff rules.
2. **Integration tests** against deterministic local HTTP fixtures.
3. **Real-world fixtures** from public OpenAPI projects as the parser grows.
4. **Differential testing** against established OpenAPI tooling as compatibility coverage improves.

The OpenAPI Initiative is the authoritative reference for the specification; OpenAPI 3.1 documents are JSON or YAML and use JSON Schema-based Schema Objects. Guardian's implementation should therefore be conservative: if a feature is not correctly supported, it should be reported as unsupported rather than silently producing a misleading result.

## Development

```bash
npm run typecheck
npm run build
npm test
```

The project intentionally has a tiny dependency surface in v0.1. That makes the core easy to inspect and keeps the first version suitable for learning, experimentation, and rapid iteration.

## Contributing

Issues and pull requests are welcome. Before adding a feature, prefer a small reproducible fixture and a focused test case. Compatibility behavior should be documented with an example whenever possible.

## License

MIT © 2026 dh6xxn
