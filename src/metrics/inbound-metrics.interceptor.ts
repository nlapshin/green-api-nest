import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

function inboundRouteLabel(req: FastifyRequest): string {
  const ro = req.routeOptions as { url?: string } | undefined;
  if (ro?.url) {
    return ro.url;
  }
  const u = req.url ?? '';
  const path = u.split('?')[0] ?? u;
  return path || 'unknown';
}

function shouldSkipMetrics(url: string | undefined): boolean {
  if (!url) {
    return true;
  }
  const path = url.split('?')[0] ?? url;
  return (
    path === '/healthz' ||
    path === '/readyz' ||
    path === '/metrics' ||
    path.startsWith('/static/')
  );
}

@Injectable()
export class InboundMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const url = req.url;
    if (shouldSkipMetrics(url)) {
      return next.handle();
    }

    const method = req.method ?? 'UNKNOWN';
    const route = inboundRouteLabel(req);
    const started = performance.now();

    this.metrics.recordInboundRequest(method, route);

    return next.handle().pipe(
      tap(() => {
        const sec = (performance.now() - started) / 1000;
        this.metrics.observeInboundDuration(method, route, sec);
      }),
      catchError((err) => {
        const sec = (performance.now() - started) / 1000;
        this.metrics.observeInboundDuration(method, route, sec);
        return throwError(() => err);
      }),
    );
  }
}
