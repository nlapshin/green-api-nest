import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppException } from '../errors/app.exception';
import { ErrorCodes } from '../errors/error-codes';
import { errorEnvelope } from '../response/api-response';
import { getRequestIdForMeta } from '../logging/request-id';
import { ZodValidationException } from '../validation/zod-validation.exception';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<FastifyReply>();
    const req = ctx.getRequest<FastifyRequest>();
    const requestId = getRequestIdForMeta(req);

    if (exception instanceof ZodValidationException) {
      res.status(exception.httpStatus).send(
        errorEnvelope(requestId, {
          code: exception.code,
          message: exception.exposeMessage,
          details: exception.details ?? [],
        }),
      );
      return;
    }

    if (exception instanceof AppException) {
      if (exception.internalCause && exception.code === ErrorCodes.INTERNAL_ERROR) {
        this.logger.error(
          { err: exception.internalCause, requestId },
          exception.message,
        );
      }
      res.status(exception.httpStatus).send(
        errorEnvelope(requestId, {
          code: exception.code,
          message: exception.exposeMessage,
          ...(exception.details?.length ? { details: exception.details } : {}),
        }),
      );
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === 'string'
          ? body
          : typeof body === 'object' && body && 'message' in body
            ? String((body as { message: unknown }).message)
            : exception.message;

      res.status(status).send(
        errorEnvelope(requestId, {
          code:
            status === HttpStatus.TOO_MANY_REQUESTS
              ? ErrorCodes.INBOUND_RATE_LIMIT
              : 'HTTP_EXCEPTION',
          message,
        }),
      );
      return;
    }

    this.logger.error(
      { err: exception, requestId },
      'Unhandled error',
    );

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(
      errorEnvelope(requestId, {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Internal server error',
      }),
    );
  }
}
