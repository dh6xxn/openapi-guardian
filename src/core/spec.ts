import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import type { OpenApiDocument } from './types.js';

export async function loadSpec(file: string): Promise<OpenApiDocument> {
  const raw = await readFile(file, 'utf8');
  if (extname(file).toLowerCase() !== '.json') {
    throw new Error('v0.1 currently accepts OpenAPI JSON files. YAML support is planned for v0.2.');
  }
  const doc = JSON.parse(raw);
  if (!doc || typeof doc !== 'object') throw new Error('Specification must be a JSON object.');
  return doc;
}

const METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace']);

export function operationCount(doc: OpenApiDocument): number {
  return Object.values(doc.paths ?? {}).reduce(
    (n: number, item: any) => n + Object.keys(item ?? {}).filter((k) => METHODS.has(k)).length,
    0,
  );
}

export function validateBasicSpec(doc: OpenApiDocument): string[] {
  const errors: string[] = [];
  if (!/^3\.(0|1)(\.\d+)?$/.test(String(doc.openapi ?? ''))) {
    errors.push('`openapi` must be an OpenAPI 3.0.x or 3.1.x version.');
  }
  if (!doc.info?.title) errors.push('Missing `info.title`.');
  if (!doc.info?.version) errors.push('Missing `info.version`.');
  if (!doc.paths || typeof doc.paths !== 'object') errors.push('Missing `paths`.');
  return errors;
}
