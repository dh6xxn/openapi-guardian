export type OpenApiDocument = Record<string, any>;
export type ChangeType = 'breaking' | 'non-breaking' | 'warning';

export interface DiffChange {
  path: string;
  method?: string;
  type: ChangeType;
  message: string;
}

export interface OperationResult {
  method: string;
  path: string;
  status: 'passed' | 'failed';
  statusCode?: number;
  expectedStatus?: number;
  errors: string[];
}
