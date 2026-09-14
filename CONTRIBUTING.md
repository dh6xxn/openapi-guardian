# Contributing to OpenAPI Guardian

Thanks for your interest in contributing! OpenAPI Guardian is an open-source TypeScript project focused on API contract testing and semantic breaking-change detection.

## Before you start

- Read the README and understand the current scope.
- Check existing issues and pull requests before starting a large change.
- For a significant feature, open an issue first so the design can be discussed.

## Development setup

Requirements:

- Node.js 20+
- npm

Clone the repository and install dependencies:

```bash
npm install
```

Run the type checker:

```bash
npm run typecheck
```

Build the project:

```bash
npm run build
```

Run the test suite:

```bash
npm test
```

## Project principles

1. **Correctness over convenience.** Contract compatibility is a correctness problem; don't silently guess when the specification is ambiguous.
2. **Tests for behavior.** New functionality should include regression tests.
3. **Small, focused changes.** Prefer one feature or fix per pull request.
4. **Keep the CLI stable.** Changes to command behavior or exit codes should be intentional and documented.
5. **Don't overclaim support.** If an OpenAPI feature is only partially implemented, document the limitation.

## Branch naming

Use descriptive branch names:

- `feature/schema-validation`
- `feature/openapi-yaml`
- `fix/ref-resolution`
- `docs/contributing-guide`

## Pull requests

A good PR should include:

- A clear description of the problem and solution.
- Tests covering the changed behavior.
- Documentation updates when the public CLI or behavior changes.
- No unrelated formatting or refactoring.

Before opening a PR, run:

```bash
npm run typecheck
npm test
```

GitHub Actions must pass before a change is merged.

## Commit messages

Use concise, imperative commit messages. Conventional Commit-style prefixes are encouraged:

- `feat:` new functionality
- `fix:` bug fix
- `test:` tests
- `docs:` documentation
- `refactor:` internal refactoring
- `ci:` CI/CD changes

Examples:

```text
feat: validate request parameters against schemas
fix: resolve nested local refs
```

## Reporting bugs

When reporting a bug, include:

- OpenAPI version
- Minimal OpenAPI document that reproduces it
- Guardian command used
- Expected behavior
- Actual behavior
- Node.js version

Never include API keys, access tokens, passwords, or private customer data.

## Feature proposals

For larger features, explain:

- The developer problem being solved
- Why it belongs in Guardian
- Proposed CLI/API behavior
- Compatibility implications
- How it could be tested

Thanks for helping make Guardian better.