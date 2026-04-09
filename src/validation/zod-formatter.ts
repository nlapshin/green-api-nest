import type { ZodError } from 'zod';

export function formatZodError(error: ZodError): Array<{
  field: string;
  message: string;
  code: string;
}> {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '(root)',
    message: issue.message,
    code: issue.code,
  }));
}
