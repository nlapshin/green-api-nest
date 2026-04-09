import type { IncomingHttpHeaders } from 'node:http';
import type { FastifyRequest } from 'fastify';

type FastifyRequestWithId = FastifyRequest & { id?: string };

export function readRequestIdFromHeaders(
  headers: IncomingHttpHeaders,
): string | undefined {
  const h = headers['x-request-id'] ?? headers['x-correlation-id'];
  if (typeof h === 'string' && h.length > 0) {
    return h;
  }
  if (Array.isArray(h) && h[0]) {
    return h[0];
  }
  return undefined;
}

export function getRequestIdForMeta(req: FastifyRequest): string {
  return (
    readRequestIdFromHeaders(req.headers) ??
    (req as FastifyRequestWithId).id ??
    'unknown'
  );
}

export function getOrCreateRequestId(
  headers: IncomingHttpHeaders,
  create: () => string,
): string {
  return readRequestIdFromHeaders(headers) ?? create();
}

export function createInboundAbortSignal(req: FastifyRequest): AbortSignal {
  const controller = new AbortController();
  const raw = req.raw;
  const abort = () => controller.abort();
  raw.on('aborted', abort);
  raw.on('close', () => {
    if (!raw.complete) {
      abort();
    }
  });
  return controller.signal;
}
