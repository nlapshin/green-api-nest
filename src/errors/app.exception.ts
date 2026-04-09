import type { ErrorCode } from './error-codes';

export class AppException extends Error {
  readonly code: ErrorCode;
  readonly details?: unknown[];
  readonly httpStatus: number;
  readonly exposeMessage: string;
  readonly internalCause?: unknown;

  constructor(params: {
    code: ErrorCode;
    httpStatus: number;
    message: string;
    exposeMessage?: string;
    details?: unknown[];
    cause?: unknown;
  }) {
    super(params.message);
    this.name = 'AppException';
    this.code = params.code;
    this.httpStatus = params.httpStatus;
    this.exposeMessage = params.exposeMessage ?? params.message;
    this.details = params.details;
    this.internalCause = params.cause;
  }
}
