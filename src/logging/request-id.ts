import type { IncomingHttpHeaders } from 'node:http';
import type { FastifyRequest } from 'fastify';

type FastifyRequestWithId = FastifyRequest & { id?: string };

/**
 * Reads `x-request-id` or `x-correlation-id` (string or first array element).
 */
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

/**
 * For JSON envelopes and errors: inbound header id, then Fastify `req.id`, then a fallback.
 */
export function getRequestIdForMeta(req: FastifyRequest): string {
  return (
    readRequestIdFromHeaders(req.headers) ??
    (req as FastifyRequestWithId).id ??
    'unknown'
  );
}

/**
 * For `genReqId`: reuse inbound id or create a new one (e.g. UUID).
 */
export function getOrCreateRequestId(
  headers: IncomingHttpHeaders,
  create: () => string,
): string {
  return readRequestIdFromHeaders(headers) ?? create();
}
