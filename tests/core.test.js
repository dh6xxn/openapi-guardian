import test from 'node:test';
import assert from 'node:assert/strict';
import { sample, validateSchema } from '../dist/core/schema.js';
import { diffSpecs } from '../dist/core/diff.js';

const base = {
  openapi: '3.0.3',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {},
};

test('samples required object properties', () => {
  assert.deepEqual(sample({
    type: 'object',
    properties: { id: { type: 'integer' }, active: { type: 'boolean' } },
  }), { id: 1, active: true });
});

test('validates required response properties and primitive types', () => {
  assert.deepEqual(validateSchema({ id: 1 }, {
    type: 'object',
    required: ['id', 'name'],
    properties: { id: { type: 'integer' }, name: { type: 'string' } },
  }), ["response: missing required property 'name'."]);
});

test('detects a new required request property as breaking', () => {
  const oldDoc = structuredClone(base);
  const newDoc = structuredClone(base);
  oldDoc.paths['/users'] = { post: { requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } } } } } } };
  newDoc.paths['/users'] = { post: { requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['name', 'email'], properties: { name: { type: 'string' }, email: { type: 'string' } } } } } } } };

  const changes = diffSpecs(oldDoc, newDoc);
  assert.equal(changes.some((change) => change.type === 'breaking' && change.message.includes("'email'")), true);
});
