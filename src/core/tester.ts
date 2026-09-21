import type { OpenApiDocument, OperationResult } from './types.js';
import { sample, validateSchema } from './schema.js';

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];

export interface TestOptions {
  path?: string;
  method?: string;
  timeoutMs?: number;
  negative?: boolean;
  cases?: number;
  seed?: number;
}

function resolve(doc: OpenApiDocument, schema: any): any {
  if (schema?.$ref?.startsWith('#/components/schemas/')) {
    const name = schema.$ref.slice('#/components/schemas/'.length).replace(/~1/g, '/').replace(/~0/g, '~');
    return doc.components?.schemas?.[name];
  }
  return schema;
}

function sampleFromDoc(doc: OpenApiDocument, schema: any, seen = new Set<string>()): any {
  if (!schema?.$ref) return sample(schema);
  if (!schema.$ref.startsWith('#/components/schemas/')) return sample(schema);
  if (seen.has(schema.$ref)) return {};
  const resolved = resolve(doc, schema);
  return sampleFromDoc(doc, resolved, new Set([...seen, schema.$ref]));
}

function schemaFromDoc(doc: OpenApiDocument, schema: any, seen = new Set<string>()): any {
  if (!schema?.$ref) return schema;
  if (!schema.$ref.startsWith('#/components/schemas/') || seen.has(schema.$ref)) return schema;
  const resolved = resolve(doc, schema);
  return schemaFromDoc(doc, resolved, new Set([...seen, schema.$ref]));
}

function expectedStatus(op: any): number | undefined {
  return Object.keys(op.responses ?? {}).filter((key) => /^\d{3}$/.test(key)).map(Number).sort((a, b) => a - b)[0];
}

function parametersFor(item: any, op: any): any[] {
  const byKey = new Map<string, any>();
  for (const parameter of [...(item?.parameters ?? []), ...(op?.parameters ?? [])]) byKey.set(parameter.in + ':' + parameter.name, parameter);
  return [...byKey.values()];
}

function replacePathParams(path: string, parameters: any[], doc: OpenApiDocument, overrides = new Map<string, any>()): string {
  return path.replace(/\{([^}]+)\}/g, (_, name) => {
    const parameter = parameters.find((item) => item.in === 'path' && item.name === name);
    const value = overrides.has('path:' + name) ? overrides.get('path:' + name) : sampleFromDoc(doc, parameter?.schema ?? { type: 'string' });
    return encodeURIComponent(String(value));
  });
}

function addQueryAndHeaders(url: URL, parameters: any[], headers: Record<string, string>, doc: OpenApiDocument, overrides = new Map<string, any>()) {
  for (const parameter of parameters) {
    const key = parameter.in + ':' + parameter.name;
    const value = overrides.has(key) ? overrides.get(key) : sampleFromDoc(doc, parameter.schema ?? { type: 'string' });
    if (value === undefined) continue;
    if (parameter.in === 'query') url.searchParams.set(parameter.name, String(value));
    if (parameter.in === 'header') headers[parameter.name] = String(value);
  }
}

function firstJsonSchema(content: any): any {
  if (!content || typeof content !== 'object') return undefined;
  const json = content['application/json'] ?? content[Object.keys(content)[0]];
  return json?.schema;
}

function invalidValue(schema: any, valid: any, variant: number): any {
  const type = Array.isArray(schema?.type) ? schema.type.find((t: string) => t !== 'null') : schema?.type;
  if (variant % 4 === 0) {
    if (type === 'string') return 12345;
    if (type === 'integer' || type === 'number') return 'not-a-number';
    if (type === 'boolean') return 'not-a-boolean';
    if (type === 'array') return {};
    if (type === 'object') return 'not-an-object';
  }
  if (schema?.enum?.length) return '__guardian_invalid_enum__';
  if (schema?.minLength !== undefined) return '';
  if (schema?.minimum !== undefined) return schema.minimum - 1;
  if (schema?.exclusiveMinimum !== undefined && typeof schema.exclusiveMinimum === 'number') return schema.exclusiveMinimum;
  if (schema?.maxLength !== undefined) return 'x'.repeat(Number(schema.maxLength) + 1);
  if (schema?.maximum !== undefined) return schema.maximum + 1;
  if (schema?.exclusiveMaximum !== undefined && typeof schema.exclusiveMaximum === 'number') return schema.exclusiveMaximum;
  if (type === 'array') return [];
  return valid;
}

function negativeBody(doc: OpenApiDocument, schema: any, variant: number): any {
  const resolved = schemaFromDoc(doc, schema);
  if (!resolved) return undefined;
  if (resolved.type === 'object' || resolved.properties) {
    const out = sampleFromDoc(doc, resolved);
    const required = [...(resolved.required ?? [])];
    if (variant % 2 === 0 && required.length) {
      delete out[required[0]];
      return out;
    }
    const keys = Object.keys(resolved.properties ?? {});
    if (keys.length) {
      const key = keys[variant % keys.length];
      out[key] = invalidValue(schemaFromDoc(doc, resolved.properties[key]) ?? {}, out[key], variant);
    }
    return out;
  }
  return invalidValue(resolved, sampleFromDoc(doc, resolved), variant);
}

function negativeParameterValue(doc: OpenApiDocument, parameter: any, variant: number): any {
  const schema = schemaFromDoc(doc, parameter.schema ?? { type: 'string' });
  if (variant % 2 === 0 && parameter.required) return undefined;
  return invalidValue(schema, sampleFromDoc(doc, schema), variant);
}



function hashSeed(seed: number, value: number): number {
  let x = (seed ^ value) >>> 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  return x >>> 0;
}

function mutateValue(schema: any, valid: any, seed: number): any {
  const type = Array.isArray(schema?.type) ? schema.type.find((t: string) => t !== 'null') : schema?.type;
  const mode = hashSeed(seed, 17) % 8;
  if (schema?.enum?.length) return '__guardian_invalid_enum__';
  if (mode === 0) {
    if (type === 'string') return 12345;
    if (type === 'integer' || type === 'number') return 'guardian-invalid-number';
    if (type === 'boolean') return 'guardian-invalid-boolean';
    if (type === 'array') return {};
    if (type === 'object') return 'guardian-invalid-object';
  }
  if (mode === 1 && schema?.minimum !== undefined) return schema.minimum - 1;
  if (mode === 2 && schema?.maximum !== undefined) return schema.maximum + 1;
  if (mode === 3 && schema?.minLength !== undefined) return '';
  if (mode === 4 && schema?.maxLength !== undefined) return 'x'.repeat(Number(schema.maxLength) + 1);
  if (type === 'string') return String(valid ?? '') + '\u0000';
  if (type === 'integer' || type === 'number') return typeof valid === 'number' ? valid + 1.5 : 'guardian-invalid-number';
  if (type === 'boolean') return !valid;
  if (type === 'array') return 'guardian-invalid-array';
  return valid;
}

function fuzzBody(doc: OpenApiDocument, schema: any, seed: number): any {
  const resolved = schemaFromDoc(doc, schema);
  if (!resolved) return undefined;
  if (resolved.type === 'object' || resolved.properties) {
    const out = sampleFromDoc(doc, resolved);
    const keys = Object.keys(resolved.properties ?? {});
    if (!keys.length) return 'guardian-invalid-object';
    const key = keys[hashSeed(seed, 23) % keys.length];
    out[key] = mutateValue(schemaFromDoc(doc, resolved.properties[key]) ?? {}, out[key], seed);
    if (seed % 5 === 0 && Array.isArray(resolved.required) && resolved.required.length) delete out[resolved.required[0]];
    return out;
  }
  return mutateValue(resolved, sampleFromDoc(doc, resolved), seed);
}

function acceptedErrorStatus(status: number): boolean {
  return status >= 400 && status < 500;
}

async function execute(doc: OpenApiDocument, path: string, method: string, op: any, baseUrl: string, options: TestOptions, variant = 0, negative = false): Promise<OperationResult> {
  const parameters = parametersFor({ parameters: op.__pathParameters ?? [] }, op);
  const overrides = new Map<string, any>();
  if (negative && parameters.length) {
    const parameter = parameters[variant % parameters.length];
    overrides.set(parameter.in + ':' + parameter.name, negativeParameterValue(doc, parameter, variant));
  }
  const target = new URL(replacePathParams(path, parameters, doc, overrides), baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
  const headers: Record<string, string> = { accept: 'application/json' };
  addQueryAndHeaders(target, parameters, headers, doc, overrides);
  const init: RequestInit = { method: method.toUpperCase(), headers, signal: options.timeoutMs ? AbortSignal.timeout(options.timeoutMs) : undefined };
  const bodySchema = firstJsonSchema(op.requestBody?.content);
  if (bodySchema && !['GET', 'HEAD'].includes(method.toUpperCase())) {
    headers['content-type'] = 'application/json';
    init.body = JSON.stringify(negative ? fuzzBody(doc, bodySchema, variant) : sampleFromDoc(doc, bodySchema));
  }
  const errors: string[] = [];
  try {
    const response = await fetch(target, init);
    if (negative) {
      if (!acceptedErrorStatus(response.status)) errors.push('Negative test expected a 4xx response, received ' + response.status + '.');
    } else {
      const expected = expectedStatus(op);
      if (expected && response.status !== expected) errors.push('Expected status ' + expected + ', received ' + response.status + '.');
      const responseDef = op.responses?.[String(response.status)] ?? op.responses?.default;
      const responseSchema = firstJsonSchema(responseDef?.content);
      if (responseSchema && response.status >= 200 && response.status < 300) {
        const text = await response.text();
        let body: any;
        try { body = text ? JSON.parse(text) : undefined; } catch { errors.push('Response body is not valid JSON.'); }
        if (body !== undefined) errors.push(...validateSchema(body, responseSchema, 'response', doc));
      }
      return { method: method.toUpperCase(), path, status: errors.length ? 'failed' : 'passed', statusCode: response.status, expectedStatus: expected, errors };
    }
    return { method: method.toUpperCase(), path, status: errors.length ? 'failed' : 'passed', statusCode: response.status, expectedStatus: undefined, errors };
  } catch (e) {
    return { method: method.toUpperCase(), path, status: 'failed', errors: [e instanceof Error ? e.message : String(e)] };
  }
}

export async function testSpec(doc: OpenApiDocument, baseUrl: string, options: TestOptions = {}): Promise<OperationResult[]> {
  const results: OperationResult[] = [];
  const methodFilter = options.method?.toLowerCase();
  const caseCount = Math.max(1, Math.min(options.cases ?? 1, 1000));
  let variant = options.seed ?? 0;
  for (const [path, item] of Object.entries(doc.paths ?? {})) {
    if (options.path && path !== options.path) continue;
    for (const method of METHODS) {
      if (methodFilter && method !== methodFilter) continue;
      const originalOp: any = (item as any)?.[method];
      if (!originalOp) continue;
      const op = { ...originalOp, __pathParameters: (item as any)?.parameters ?? [] };
      const count = options.negative ? caseCount : 1;
      for (let i = 0; i < count; i++) results.push(await execute(doc, path, method, op, baseUrl, options, variant++, Boolean(options.negative)));
    }
  }
  return results;
}
