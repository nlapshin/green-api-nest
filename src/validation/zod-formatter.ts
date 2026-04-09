import type { ZodError } from 'zod';

export function formatZodError(error: ZodError): Array<{
  path: string;
  message: string;
  code: string;
}> {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    message: issue.message,
    code: issue.code,
  }));
}
