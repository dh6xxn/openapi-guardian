import type { DiffChange, OpenApiDocument } from './types.js';
import { resolveLocalRef } from './spec.js';

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];

function schemaDiff(oldS: any, newS: any, location: string): DiffChange[] {
  const out: DiffChange[] = [];
  if (!oldS || !newS) return out;

  if (oldS.type && newS.type && oldS.type !== newS.type) {
    out.push({ path: location, type: 'breaking', message: `Schema type changed from ${oldS.type} to ${newS.type}.` });
  }

  if (oldS.minimum !== undefined && newS.minimum !== undefined && newS.minimum > oldS.minimum) {
    out.push({ path: location, type: 'breaking', message: `Minimum increased from ${oldS.minimum} to ${newS.minimum}.` });
  }
  if (oldS.maximum !== undefined && newS.maximum !== undefined && newS.maximum < oldS.maximum) {
    out.push({ path: location, type: 'breaking', message: `Maximum decreased from ${oldS.maximum} to ${newS.maximum}.` });
  }

  if (Array.isArray(oldS.enum) && Array.isArray(newS.enum)) {
    for (const value of oldS.enum) {
      if (!newS.enum.includes(value)) {
        out.push({ path: location, type: 'breaking', message: `Enum value '${String(value)}' was removed.` });
      }
    }
  }

  const oldReq = new Set(oldS.required ?? []);
  const newReq = new Set(newS.required ?? []);
  for (const key of newReq) {
    if (!oldReq.has(key)) out.push({ path: `${location}.${key}`, type: 'breaking', message: `New required property '${key}' was added.` });
  }
  for (const key of oldReq) {
    if (!newReq.has(key)) out.push({ path: `${location}.${key}`, type: 'warning', message: `Property '${key}' is no longer required.` });
  }

  const oldProperties = oldS.properties ?? {};
  const newProperties = newS.properties ?? {};
  for (const key of Object.keys(oldProperties)) {
    if (!(key in newProperties)) {
      out.push({
        path: `${location}.${key}`,
        type: oldReq.has(key) ? 'breaking' : 'warning',
        message: `Property '${key}' was removed.`,
      });
    } else {
      out.push(...schemaDiff(oldProperties[key], newProperties[key], `${location}.${key}`));
    }
  }

  for (const key of Object.keys(newProperties)) {
    if (!(key in oldProperties) && !newReq.has(key)) {
      out.push({ path: `${location}.${key}`, type: 'non-breaking', message: `Optional property '${key}' was added.` });
    }
  }
  return out;
}

function resolve(doc: OpenApiDocument, schema: any): any {
  return resolveLocalRef(doc, schema);
}

function responseSchema(operation: any, statusCodes: string[], doc: OpenApiDocument): any {
  for (const status of statusCodes) {
    const response = operation.responses?.[status];
    const schema = response?.content?.['application/json']?.schema;
    if (schema) return resolve(doc, schema);
  }
  return undefined;
}

export function diffSpecs(oldDoc: OpenApiDocument, newDoc: OpenApiDocument): DiffChange[] {
  const out: DiffChange[] = [];
  const oldPaths = oldDoc.paths ?? {};
  const newPaths = newDoc.paths ?? {};

  for (const path of Object.keys(oldPaths)) {
    if (!(path in newPaths)) {
      out.push({ path, type: 'breaking', message: 'Endpoint was removed.' });
      continue;
    }

    for (const method of METHODS) {
      const oldOperation: any = oldPaths[path]?.[method];
      const newOperation: any = newPaths[path]?.[method];
      if (oldOperation && !newOperation) {
        out.push({ path, method, type: 'breaking', message: 'Operation was removed.' });
        continue;
      }
      if (!oldOperation || !newOperation) continue;

      const oldParameters = oldOperation.parameters ?? [];
      const newParameters = newOperation.parameters ?? [];
      for (const parameter of newParameters) {
        if (
          parameter.required &&
          !oldParameters.some((x: any) => x.name === parameter.name && x.in === parameter.in && x.required)
        ) {
          out.push({ path, method, type: 'breaking', message: `Parameter '${parameter.name}' became required.` });
        }
      }

      const oldBody = resolve(oldDoc, oldOperation.requestBody?.content?.['application/json']?.schema);
      const newBody = resolve(newDoc, newOperation.requestBody?.content?.['application/json']?.schema);
      out.push(...schemaDiff(oldBody, newBody, `${method.toUpperCase()} ${path} request`));

      const oldResponse = responseSchema(oldOperation, ['200', '201', '202', '204'], oldDoc);
      const newResponse = responseSchema(newOperation, ['200', '201', '202', '204'], newDoc);
      out.push(...schemaDiff(oldResponse, newResponse, `${method.toUpperCase()} ${path} response`));
    }
  }

  for (const path of Object.keys(newPaths)) {
    if (!(path in oldPaths)) {
      out.push({ path, type: 'non-breaking', message: 'New endpoint was added.' });
    } else {
      for (const method of METHODS) {
        if (!oldPaths[path]?.[method] && newPaths[path]?.[method]) {
          out.push({ path, method, type: 'non-breaking', message: 'New operation was added.' });
        }
      }
    }
  }

  return out;
}
