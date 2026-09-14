import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import YAML from 'yaml';
import type { OpenApiDocument } from './types.js';

export async function loadSpec(file: string): Promise<OpenApiDocument> {
  const raw = await readFile(file, 'utf8');
  const extension = extname(file).toLowerCase();
  if (!['.json', '.yaml', '.yml'].includes(extension)) {
    throw new Error('OpenAPI specs must use .json, .yaml, or .yml.');
  }

  let doc: unknown;
  try {
    doc = extension === '.json' ? JSON.parse(raw) : YAML.parse(raw);
  } catch (error) {
    throw new Error(`Unable to parse OpenAPI document: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    throw new Error('Specification must be an object.');
  }
  return doc as OpenApiDocument;
}

const METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace']);

export function operationCount(doc: OpenApiDocument): number {
  return Object.values(doc.paths ?? {}).reduce(
    (n: number, item: any) => n + Object.keys(item ?? {}).filter((k) => METHODS.has(k)).length,
    0,
  );
}

export function resolveLocalRef(doc: OpenApiDocument, value: any): any {
  if (!value?.$ref || !value.$ref.startsWith('#/')) return value;
  const parts = value.$ref.slice(2).split('/').map((part: string) => part.replace(/~1/g, '/').replace(/~0/g, '~'));
  let current: any = doc;
  for (const part of parts) current = current?.[part];
  if (current === undefined) throw new Error(`Unresolved local reference: ${value.$ref}`);
  return current;
}

export function validateBasicSpec(doc: OpenApiDocument): string[] {
  const errors: string[] = [];
  if (!/^3\.(0|1)(\.\d+)?$/.test(String(doc.openapi ?? ''))) {
    errors.push('`openapi` must be an OpenAPI 3.0.x or 3.1.x version.');
  }
  if (!doc.info?.title) errors.push('Missing `info.title`.');
  if (!doc.info?.version) errors.push('Missing `info.version`.');
  if (!doc.paths || typeof doc.paths !== 'object') errors.push('Missing `paths`.');

  for (const [path, item] of Object.entries(doc.paths ?? {})) {
    if (!path.startsWith('/')) errors.push(`Invalid path '${path}': paths must start with '/'.`);
    if (!item || typeof item !== 'object') errors.push(`Invalid path item '${path}'.`);
    for (const method of Object.keys((item as any) ?? {})) {
      if (method !== '$ref' && !METHODS.has(method)) continue;
      if (method !== '$ref' && !(item as any)[method]) errors.push(`Empty operation '${method.toUpperCase()} ${path}'.`);
    }
  }
  return errors;
}
