export const HTTP_CLIENT_DISPATCHER = Symbol('HTTP_CLIENT_DISPATCHER');

/** Normalized result of an outbound HTTP call (JSON-friendly body preserved as unknown). */
export type HttpClientPayload = unknown;

export interface HttpClientCallResult {
  readonly statusCode: number;
  readonly payload: HttpClientPayload;
  readonly contentType: string | null;
}

export interface HttpClientExecuteParams {
  readonly url: string;
  /** Redacted or safe URL for logs */
  readonly safeUrlForLog: string;
  readonly method: 'GET' | 'POST';
  readonly jsonBody?: Record<string, string>;
  readonly timeoutMs: number;
  /** Prefix for pino messages, e.g. `GREEN-API` */
  readonly logScope: string;
  /** Extra structured fields for logs (pathMethod, idInstance, …) */
  readonly logContext: Record<string, unknown>;
  /** Client-facing message on non-2xx (default: generic upstream error) */
  readonly exposeUpstreamError?: string;
}
