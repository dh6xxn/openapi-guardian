import test from 'node:test';
import assert from 'node:assert/strict';
import { sample, validateSchema } from '../dist/core/schema.js';
import { diffSpecs } from '../dist/core/diff.js';
import { loadSpec, resolveLocalRef, validateBasicSpec } from '../dist/core/spec.js';

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