#!/usr/bin/env node
import { loadSpec, operationCount, validateBasicSpec } from './core/spec.js';
import { diffSpecs } from './core/diff.js';
import { testSpec } from './core/tester.js';

const NL = String.fromCharCode(10);

function help() {
  console.log([
    'OpenAPI Guardian v0.4.0',
    '',
    'Commands:',
    '  guardian validate <spec.json|spec.yaml>',
    '  guardian test <spec.json|spec.yaml> --base-url <url> [--path /users] [--method get] [--timeout 10000] [--format terminal|json|junit]',
    '  guardian diff <old.json> <new.json> [--format terminal|json] [--fail-on breaking|any]',
  ].join(NL));
}

function arg(name: string, fallback?: string) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function junit(results: any[]): string {
  const failures = results.filter((r) => r.status === 'failed');
  const cases = results.map((r) => {
    const name = r.method + ' ' + r.path;
    return r.status === 'failed'
      ? '  <testcase name="' + escapeXml(name) + '"><failure message="' + escapeXml(r.errors.join(' | ')) + '"/></testcase>'
      : '  <testcase name="' + escapeXml(name) + '"/>';
  }).join(NL);
  return ['<?xml version="1.0" encoding="UTF-8"?>', '<testsuite name="OpenAPI Guardian" tests="' + results.length + '" failures="' + failures.length + '">', cases, '</testsuite>'].join(NL) + NL;
}

const [command, ...positional] = process.argv.slice(2);
if (!command || command === '--help' || command === '-h') { help(); process.exit(0); }

try {
  if (command === 'validate') {
    const doc = await loadSpec(positional[0]);
    const errors = validateBasicSpec(doc);
    if (errors.length) {
      console.error('✖ Invalid OpenAPI specification');
      errors.forEach((error) => console.error('  • ' + error));
      process.exitCode = 3;
    } else {
      console.log(['✔ Valid OpenAPI ' + doc.openapi, '  ' + doc.info.title + ' v' + doc.info.version, '  ' + operationCount(doc) + ' operations'].join(NL));
    }
  } else if (command === 'test') {
    const doc = await loadSpec(positional[0]);
    const base = arg('--base-url');
    if (!base) throw new Error('--base-url is required.');
    const results = await testSpec(doc, base, { path: arg('--path'), method: arg('--method'), timeoutMs: Number(arg('--timeout', '10000')) });
    const format = arg('--format');
    if (format === 'json') console.log(JSON.stringify({ results }, null, 2));
    else if (format === 'junit') console.log(junit(results));
    else {
      console.log('OpenAPI Guardian' + NL);
      for (const result of results) console.log((result.status === 'passed' ? '✔' : '✖') + ' ' + result.method.padEnd(7) + ' ' + result.path + (result.statusCode ? ' (' + result.statusCode + ')' : '') + (result.errors.length ? NL + '    ' + result.errors.join(NL + '    ') : ''));
      const failed = results.filter((result) => result.status === 'failed').length;
      console.log(NL + results.length + ' operations tested: ' + (results.length - failed) + ' passed, ' + failed + ' failed');
    }
    if (results.some((result) => result.status === 'failed')) process.exitCode = 1;
  } else if (command === 'diff') {
    const changes = diffSpecs(await loadSpec(positional[0]), await loadSpec(positional[1]));
    if (arg('--format') === 'json') console.log(JSON.stringify({ changes }, null, 2));
    else {
      console.log('API Contract Diff' + NL);
      if (!changes.length) console.log('✔ No contract changes detected.');
      for (const change of changes) console.log((change.type === 'breaking' ? '✖' : change.type === 'warning' ? '⚠' : '+') + ' ' + (change.method ? change.method.toUpperCase() + ' ' : '') + change.path + NL + '    ' + change.message);
      const breaking = changes.filter((change) => change.type === 'breaking').length;
      const nonBreaking = changes.filter((change) => change.type === 'non-breaking').length;
      const warnings = changes.filter((change) => change.type === 'warning').length;
      console.log(NL + breaking + ' breaking, ' + nonBreaking + ' non-breaking, ' + warnings + ' warning');
      const failOn = arg('--fail-on', 'breaking');
      if ((failOn === 'any' && changes.length) || (failOn === 'breaking' && breaking)) process.exitCode = 1;
    }
  } else { help(); process.exitCode = 2; }
} catch (error) {
  console.error('✖ ' + (error instanceof Error ? error.message : String(error)));
  process.exitCode = 3;
}