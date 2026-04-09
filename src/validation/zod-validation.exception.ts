import type { ZodIssue } from 'zod';
import { AppException } from '../errors/app.exception';
import { ErrorCodes } from '../errors/error-codes';

export class ZodValidationException extends AppException {
  constructor(issues: ZodIssue[]) {
    super({
      code: ErrorCodes.VALIDATION_ERROR,
      httpStatus: 400,
      message: 'Validation failed',
      exposeMessage: 'Validation failed',
      details: issues.map((i) => ({
        path: i.path.join('.') || '(root)',
        message: i.message,
        code: i.code,
      })),
    });
    this.name = 'ZodValidationException';
  }
}
