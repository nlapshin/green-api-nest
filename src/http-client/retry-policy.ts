import {
  HttpNetworkException,
  HttpTimeoutException,
  HttpUpstreamException,
} from './http-client.errors';

export function shouldRetryOutboundError(
  err: unknown,
  attempt: number,
  maxAttempts: number,
  retryOn429: boolean,
): boolean {
  if (attempt >= maxAttempts) {
    return false;
  }
  if (err instanceof HttpUpstreamException) {
    const s = err.upstreamHttpStatus;
    if (s >= 500) {
      return true;
    }
    if (s === 429 && retryOn429) {
      return true;
    }
    return false;
  }
  if (err instanceof HttpTimeoutException || err instanceof HttpNetworkException) {
    return true;
  }
  return false;
}

export function computeBackoffMs(params: {
  attemptIndex: number;
  initialMs: number;
  maxMs: number;
  jitterRatio: number;
}): number {
  const cap = Math.min(
    params.maxMs,
    params.initialMs * 2 ** params.attemptIndex,
  );
  const jitter = cap * params.jitterRatio * Math.random();
  return Math.min(params.maxMs, Math.round(cap * (1 - params.jitterRatio) + jitter));
}
