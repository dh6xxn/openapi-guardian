import type { OpenApiDocument, OperationResult } from './types.js';
import { sample, validateSchema } from './schema.js';

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];

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

function expectedStatus(op: any): number | undefined {
  return Object.keys(op.responses ?? {})
    .filter((key) => /^\\d{3}$/.test(key))
    .map(Number)
    .sort((a, b) => a - b)[0];
}

function parametersFor(item: any, op: any): any[] {
  const byKey = new Map<string, any>();
  for (const parameter of [...(item?.parameters ?? []), ...(op?.parameters ?? [])]) byKey.set(parameter.in + ':' + parameter.name, parameter);
  return [...byKey.values()];
}

function replacePathParams(path: string, parameters: any[], doc: OpenApiDocument): string {
  return path.replace(/\{([^}]+)\}/g, (_, name) => {
    const parameter = parameters.find((item) => item.in === 'path' && item.name === name);
    return encodeURIComponent(String(sampleFromDoc(doc, parameter?.schema ?? { type: 'string' })));
  });
}

function addQueryAndHeaders(url: URL, parameters: any[], headers: Record<string, string>, doc: OpenApiDocument) {
  for (const parameter of parameters) {
    const value = sampleFromDoc(doc, parameter.schema ?? { type: 'string' });
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

export async function testSpec(doc: OpenApiDocument, baseUrl: string, options: { path?: string; method?: string; timeoutMs?: number } = {}): Promise<OperationResult[]> {
  const results: OperationResult[] = [];
  const methodFilter = options.method?.toLowerCase();
  for (const [path, item] of Object.entries(doc.paths ?? {})) {
    if (options.path && path !== options.path) continue;
    for (const method of METHODS) {
      if (methodFilter && method !== methodFilter) continue;
      const op: any = (item as any)?.[method];
      if (!op) continue;
      const parameters = parametersFor(item, op);
      const target = new URL(replacePathParams(path, parameters, doc), baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
      const headers: Record<string, string> = { accept: 'application/json' };
      addQueryAndHeaders(target, parameters, headers, doc);
      const init: RequestInit = { method: method.toUpperCase(), headers, signal: options.timeoutMs ? AbortSignal.timeout(options.timeoutMs) : undefined };
      const bodySchema = firstJsonSchema(op.requestBody?.content);
      if (bodySchema && !['GET', 'HEAD'].includes(method.toUpperCase())) {
        headers['content-type'] = 'application/json';
        init.body = JSON.stringify(sampleFromDoc(doc, bodySchema));
      }
      const errors: string[] = [];
      const expected = expectedStatus(op);
      try {
        const response = await fetch(target, init);
        if (expected && response.status !== expected) errors.push('Expected status ' + expected + ', received ' + response.status + '.');
        const responseDef = op.responses?.[String(response.status)] ?? op.responses?.default;
        const responseSchema = firstJsonSchema(responseDef?.content);
        if (responseSchema && response.status >= 200 && response.status < 300) {
          const text = await response.text();
          let body: any;
          try { body = text ? JSON.parse(text) : undefined; } catch { errors.push('Response body is not valid JSON.'); }
          if (body !== undefined) errors.push(...validateSchema(body, responseSchema, 'response', doc));
        }
        results.push({ method: method.toUpperCase(), path, status: errors.length ? 'failed' : 'passed', statusCode: response.status, expectedStatus: expected, errors });
      } catch (e) {
        results.push({ method: method.toUpperCase(), path, status: 'failed', expectedStatus: expected, errors: [e instanceof Error ? e.message : String(e)] });
      }
    }
  }
  return results;
}