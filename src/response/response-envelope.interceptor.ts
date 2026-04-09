import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { getRequestIdForMeta } from '../logging/request-id';
import { successEnvelope } from './api-response';

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const requestId = getRequestIdForMeta(req);

    return next.handle().pipe(
      map((data) => successEnvelope(data, requestId)),
    );
  }
}
