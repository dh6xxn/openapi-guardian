import test from 'node:test';
import assert from 'node:assert/strict';
import { sample, validateSchema } from '../dist/core/schema.js';
import { diffSpecs } from '../dist/core/diff.js';
import { loadSpec, resolveLocalRef, validateBasicSpec } from '../dist/core/spec.js';
import { testSpec } from '../dist/core/tester.js';
import { createServer } from 'node:http';

const base = { openapi: '3.0.3', info: { title: 'Test API', version: '1.0.0' }, paths: {} };

test('samples required object properties', () => {
  assert.deepEqual(sample({ type: 'object', properties: { id: { type: 'integer' }, active: { type: 'boolean' } } }), { id: 1, active: true });
});

test('validates JSON Schema required properties and primitive types', () => {
  const errors = validateSchema({ id: 1 }, { type: 'object', required: ['id', 'name'], properties: { id: { type: 'integer' }, name: { type: 'string' } } });
  assert.equal(errors.some((error) => error.includes("must have required property 'name'")), true);
});

test('supports JSON Schema 2020-12 unions and tuple validation', () => {
  assert.deepEqual(validateSchema('guardian', { oneOf: [{ type: 'integer' }, { type: 'string', minLength: 5 }] }), []);
  assert.deepEqual(validateSchema([1, 'ok'], { type: 'array', prefixItems: [{ type: 'integer' }, { type: 'string' }] }), []);
});

test('validates component references through the OpenAPI document', () => {
  const doc = { ...base, components: { schemas: { User: { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } } } } };
  assert.deepEqual(validateSchema({ id: 1 }, { $ref: '#/components/schemas/User' }, 'response', doc), []);
  assert.ok(validateSchema({ id: 'wrong' }, { $ref: '#/components/schemas/User' }, 'response', doc).length > 0);
});

test('detects a new required request property as breaking', () => {
  const oldDoc = structuredClone(base);
  const newDoc = structuredClone(base);
  oldDoc.paths['/users'] = { post: { requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } } } } } } };
  newDoc.paths['/users'] = { post: { requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['name', 'email'], properties: { name: { type: 'string' }, email: { type: 'string' } } } } } } } };
  const changes = diffSpecs(oldDoc, newDoc);
  assert.equal(changes.some((change) => change.type === 'breaking' && change.message.includes("'email'")), true);
});

test('resolves JSON Pointer local references', () => {
  const doc = { ...base, components: { schemas: { User: { type: 'object', properties: { id: { type: 'integer' } } } } } };
  assert.deepEqual(resolveLocalRef(doc, { $ref: '#/components/schemas/User' }), doc.components.schemas.User);
});

test('rejects unsupported OpenAPI versions', () => {
  assert.deepEqual(validateBasicSpec({ ...base, openapi: '2.0.0' }), ['`openapi` must be an OpenAPI 3.0.x or 3.1.x version.']);
});

test('loads YAML OpenAPI documents', async () => {
  const spec = await loadSpec('examples/sample.yaml');
  assert.equal(spec.openapi, '3.0.3');
  assert.equal(spec.info.title, 'Guardian YAML Fixture');
});

test('negative tests generate invalid inputs and require 4xx responses', async () => {
  const server = createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/users') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        try {
          const value = JSON.parse(body || '{}');
          if (typeof value.name !== 'string' || value.name.length < 3 || value.age < 1) {
            res.writeHead(400, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ error: 'invalid request' }));
          } else {
            res.writeHead(201, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ id: 1, name: value.name, age: value.age }));
          }
        } catch {
          res.writeHead(400);
          res.end();
        }
      });
      return;
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const doc = {
    ...base,
    paths: {
      '/users': {
        post: {
          requestBody: { content: { 'application/json': { schema: {
            type: 'object',
            required: ['name', 'age'],
            properties: { name: { type: 'string', minLength: 3 }, age: { type: 'integer', minimum: 1 } }
          } } } },
          responses: {
            '201': { content: { 'application/json': { schema: { type: 'object' } } } }
          }
        }
      }
    }
  };
  try {
    const results = await testSpec(doc, 'http://127.0.0.1:' + port, { negative: true, cases: 4, seed: 42, timeoutMs: 2000 });
    assert.equal(results.length, 4);
    assert.equal(results.every((result) => result.status === 'passed'), true);
    assert.equal(results.every((result) => result.statusCode === 400), true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
