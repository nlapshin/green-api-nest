export const HTTP_CLIENT_DISPATCHER = Symbol('HTTP_CLIENT_DISPATCHER');

export type HttpClientPayload = unknown;

export interface HttpClientCallResult {
  readonly statusCode: number;
  readonly payload: HttpClientPayload;
  readonly contentType: string | null;
}

export interface HttpClientExecuteParams {
  readonly url: string;
  readonly safeUrlForLog: string;
  readonly method: 'GET' | 'POST';
  readonly jsonBody?: Record<string, string>;
  readonly timeoutMs: number;
  readonly logScope: string;
  readonly logContext: Record<string, unknown>;
  readonly metricsOperation: string;
  readonly metricsTarget?: string;
  readonly requestId?: string;
  readonly inboundSignal?: AbortSignal;
  readonly exposeUpstreamError?: string;
}
