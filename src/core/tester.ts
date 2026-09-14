import type { OpenApiDocument, OperationResult } from './types.js';
import { sample, validateSchema } from './schema.js';

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];

function resolve(doc: OpenApiDocument, schema: any): any {
  if (schema?.$ref?.startsWith('#/components/schemas/')) {
    return doc.components?.schemas?.[schema.$ref.split('/').pop()!];
  }
  return schema;
}

function expectedStatus(op: any): number | undefined {
  const statuses = Object.keys(op.responses ?? {})
    .filter((k) => /^\d{3}$/.test(k))
    .map(Number)
    .sort();
  return statuses[0];
}

function replaceParams(path: string, op: any): string {
  return path.replace(/\{([^}]+)\}/g, (_, name) => {
    const p = (op.parameters ?? []).find((x: any) => x.in === 'path' && x.name === name);
    return encodeURIComponent(String(sample(p?.schema ?? { type: 'string' })));
  });
}

export async function testSpec(doc: OpenApiDocument, baseUrl: string): Promise<OperationResult[]> {
  const results: OperationResult[] = [];
  for (const [path, item] of Object.entries(doc.paths ?? {})) {
    for (const method of METHODS) {
      const op: any = (item as any)?.[method];
      if (!op) continue;

      const target = new URL(replaceParams(path, op), baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
      const headers: Record<string, string> = { accept: 'application/json' };
      const init: RequestInit = { method: method.toUpperCase(), headers };
      const bodySchema = resolve(doc, op.requestBody?.content?.['application/json']?.schema);

      if (bodySchema && !['GET', 'HEAD'].includes(method.toUpperCase())) {
        headers['content-type'] = 'application/json';
        init.body = JSON.stringify(sample(bodySchema));
      }

      const errors: string[] = [];
      const expected = expectedStatus(op);
      try {
        const response = await fetch(target, init);
        if (expected && response.status !== expected) {
          errors.push(`Expected status ${expected}, received ${response.status}.`);
        }

        const responseDef = op.responses?.[String(response.status)] ?? op.responses?.default;
        const responseSchema = resolve(doc, responseDef?.content?.['application/json']?.schema);
        if (responseSchema && response.status >= 200 && response.status < 300) {
          const text = await response.text();
          let body: any;
          try {
            body = text ? JSON.parse(text) : undefined;
          } catch {
            errors.push('Response body is not valid JSON.');
          }
          if (body !== undefined) errors.push(...validateSchema(body, responseSchema));
        }

        results.push({
          method: method.toUpperCase(),
          path,
          status: errors.length ? 'failed' : 'passed',
          statusCode: response.status,
          expectedStatus: expected,
          errors,
        });
      } catch (e) {
        results.push({
          method: method.toUpperCase(),
          path,
          status: 'failed',
          expectedStatus: expected,
          errors: [e instanceof Error ? e.message : String(e)],
        });
      }
    }
  }
  return results;
}
