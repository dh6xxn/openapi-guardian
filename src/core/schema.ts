import Ajv2020 from 'ajv/dist/2020.js';

export function sample(schema: any): any {
  if (!schema) return undefined;
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0];
  if (Array.isArray(schema.type)) {
    const preferred = schema.type.find((t: string) => t !== 'null') ?? schema.type[0];
    return sample({ ...schema, type: preferred });
  }
  if (schema.const !== undefined) return schema.const;
  if (schema.oneOf?.length) return sample(schema.oneOf[0]);
  if (schema.anyOf?.length) return sample(schema.anyOf[0]);
  if (schema.allOf?.length) return Object.assign({}, ...schema.allOf.map((part: any) => sample(part)));
  if (schema.type === 'object' || schema.properties) {
    const out: Record<string, any> = {};
    for (const [key, value] of Object.entries(schema.properties ?? {})) {
      const sampled = sample(value);
      if (sampled !== undefined) out[key] = sampled;
    }
    return out;
  }
  if (schema.type === 'array') {
    if (schema.prefixItems?.length) return schema.prefixItems.map((item: any) => sample(item));
    return [sample(schema.items ?? { type: 'string' })];
  }
  if (schema.type === 'integer' || schema.type === 'number') {
    if (schema.minimum !== undefined) return schema.minimum;
    if (schema.exclusiveMinimum !== undefined && typeof schema.exclusiveMinimum === 'number') return schema.exclusiveMinimum + 1;
    return 1;
  }
  if (schema.type === 'boolean') return true;
  return 'guardian-test';
}

function normalizeSchema(schema: any): any {
  if (!schema || typeof schema !== 'object') return schema;
  if (Array.isArray(schema)) return schema.map(normalizeSchema);
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === '$ref' && typeof value === 'string' && value.startsWith('#/components/schemas/')) {
      const name = value.slice('#/components/schemas/'.length).replace(/~1/g, '/').replace(/~0/g, '~');
      out.$ref = '#/$defs/' + name;
    } else {
      out[key] = normalizeSchema(value);
    }
  }
  return out;
}

export function validateSchema(value: any, schema: any, location = 'response', doc?: any): string[] {
  if (!schema) return [];
  try {
    const normalized = normalizeSchema(schema);
    const defs = Object.fromEntries(Object.entries(doc?.components?.schemas ?? {}).map(([name, definition]) => [name, normalizeSchema(definition)]));
    const root = { ...normalized, $defs: defs };
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    const validate = ajv.compile(root);
    if (validate(value)) return [];
    return (validate.errors ?? []).map((error) => {
      const path = error.instancePath ? location + error.instancePath.replaceAll('/', '.') : location;
      return path + ': ' + (error.message ?? 'schema validation failed') + '.';
    });
  } catch (error) {
    return [location + ': unable to compile schema (' + (error instanceof Error ? error.message : String(error)) + ').'];
  }
}