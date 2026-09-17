#!/usr/bin/env node
import { loadSpec, operationCount, validateBasicSpec } from './core/spec.js';
import { diffSpecs } from './core/diff.js';
import { testSpec } from './core/tester.js';

function help() {
  console.log(`OpenAPI Guardian v0.3.0

Commands:
  guardian validate <spec.json|spec.yaml>
  guardian test <spec.json|spec.yaml> --base-url <url> [--format terminal|json]
  guardian diff <old.json> <new.json> [--format terminal|json] [--fail-on breaking|any]`);
}

function arg(name: string, fallback?: string) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const [command, ...positional] = process.argv.slice(2);
if (!command || command === '--help' || command === '-h') {
  help();
  process.exit(0);
}

try {
  if (command === 'validate') {
    const doc = await loadSpec(positional[0]);
    const errors = validateBasicSpec(doc);
    if (errors.length) {
      console.error('✖ Invalid OpenAPI specification');
      errors.forEach((error) => console.error(`  • ${error}`));
      process.exitCode = 3;
    } else {
      console.log(`✔ Valid OpenAPI ${doc.openapi}\n  ${doc.info.title} v${doc.info.version}\n  ${operationCount(doc)} operations`);
    }
  } else if (command === 'test') {
    const doc = await loadSpec(positional[0]);
    const base = arg('--base-url');
    if (!base) throw new Error('--base-url is required.');
    const results = await testSpec(doc, base);

    if (arg('--format') === 'json') {
      console.log(JSON.stringify({ results }, null, 2));
    } else {
      console.log('\nOpenAPI Guardian\n');
      for (const result of results) {
        console.log(`${result.status === 'passed' ? '✔' : '✖'} ${result.method.padEnd(7)} ${result.path}${result.statusCode ? ` (${result.statusCode})` : ''}${result.errors.length ? `\n    ${result.errors.join('\n    ')}` : ''}`);
      }
      const failed = results.filter((result) => result.status === 'failed').length;
      console.log(`\n${results.length} operations tested: ${results.length - failed} passed, ${failed} failed`);
      if (failed) process.exitCode = 1;
    }
  } else if (command === 'diff') {
    const changes = diffSpecs(await loadSpec(positional[0]), await loadSpec(positional[1]));

    if (arg('--format') === 'json') {
      console.log(JSON.stringify({ changes }, null, 2));
    } else {
      console.log('\nAPI Contract Diff\n');
      if (!changes.length) console.log('✔ No contract changes detected.');
      for (const change of changes) {
        console.log(`${change.type === 'breaking' ? '✖' : change.type === 'warning' ? '⚠' : '+'} ${change.method ? change.method.toUpperCase() + ' ' : ''}${change.path}\n    ${change.message}`);
      }
      const breaking = changes.filter((change) => change.type === 'breaking').length;
      const nonBreaking = changes.filter((change) => change.type === 'non-breaking').length;
      const warnings = changes.filter((change) => change.type === 'warning').length;
      console.log(`\n${breaking} breaking, ${nonBreaking} non-breaking, ${warnings} warning`);
      const failOn = arg('--fail-on', 'breaking');
      if ((failOn === 'any' && changes.length) || (failOn === 'breaking' && breaking)) process.exitCode = 1;
    }
  } else {
    help();
    process.exitCode = 2;
  }
} catch (error) {
  console.error(`✖ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 3;
}
