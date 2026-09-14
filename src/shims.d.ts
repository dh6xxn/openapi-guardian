declare const process: any;
declare module 'node:fs/promises' {
  export function readFile(path: string, encoding: string): Promise<string>;
}
declare module 'node:path' {
  export function extname(path: string): string;
}
declare class URL {
  constructor(input: string, base?: string | URL);
  toString(): string;
}
declare function fetch(input: any, init?: any): Promise<any>;
type RequestInit = any;
