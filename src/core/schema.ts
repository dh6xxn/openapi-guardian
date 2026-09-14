export function sample(schema: any): any {
  if (!schema) return undefined;
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0];
  if (schema.type === 'object' || schema.properties) {
    const out: Record<string, any> = {};
    for (const [key, value] of Object.entries(schema.properties ?? {})) out[key] = sample(value);
    return out;
  }
  if (schema.type === 'array') return [sample(schema.items ?? { type: 'string' })];
  if (schema.type === 'integer' || schema.type === 'number') return schema.minimum ?? 1;
  if (schema.type === 'boolean') return true;
  return 'guardian-test';
}

export function validateSchema(value: any, schema: any, location = 'response'): string[] {
  if (!schema) return [];
  if (value === null) return schema.nullable ? [] : [`${location}: expected non-null value.`];
  if (schema.type === 'object' || schema.properties) {
    if (typeof value !== 'object' || Array.isArray(value)) return [`${location}: expected object.`];
    for (const key of schema.required ?? []) {
      if (!(key in value)) return [`${location}: missing required property '${key}'.`];
    }
    return Object.entries(schema.properties ?? {}).flatMap(([key, child]) =>
      key in value ? validateSchema(value[key], child, `${location}.${key}`) : [],
    );
  }
  if (schema.type === 'array') {
    if (!Array.isArray(value)) return [`${location}: expected array.`];
    return value.flatMap((item, i) => validateSchema(item, schema.items, `${location}[${i}]`));
  }
  const actual = typeof value;
  const expected = schema.type === 'integer' ? 'number' : schema.type;
  if (expected && actual !== expected) return [`${location}: expected ${schema.type}, received ${actual}.`];
  if (schema.type === 'integer' && !Number.isInteger(value)) return [`${location}: expected integer, received number.`];
  if (schema.minimum !== undefined && value < schema.minimum) return [`${location}: value is below minimum ${schema.minimum}.`];
  if (schema.maximum !== undefined && value > schema.maximum) return [`${location}: value exceeds maximum ${schema.maximum}.`];
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) return [`${location}: value is not one of the allowed enum values.`];
  return [];
}
